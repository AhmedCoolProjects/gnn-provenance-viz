from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Optional
from datetime import datetime
import asyncio

from .models import AttackTimeline, GraphSnapshot, Node, GNNExplanation
from .data_generator import ProvenanceDataGenerator
from .gnn_simulator import GNNSimulator

app = FastAPI(
    title="GNN-Provenance-Viz API",
    description="Forensic dashboard backend for APT attack visualization using GNNs",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
data_generator = ProvenanceDataGenerator(seed=42)
gnn_simulator = GNNSimulator()

# In-memory storage for generated timelines
timelines_cache = {}

@app.get("/")
async def root():
    return {
        "message": "GNN-Provenance-Viz API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "timeline": "/api/timeline",
            "snapshots": "/api/timeline/{timeline_id}/snapshots",
            "snapshot": "/api/timeline/{timeline_id}/snapshot/{timestamp}",
            "explain": "/api/explain/{node_id}"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/api/timeline/generate", response_model=AttackTimeline)
async def generate_timeline(
    duration_minutes: int = Query(default=30, ge=5, le=120),
    attack_type: str = Query(default="apt", enum=["apt", "ransomware", "insider"])
):
    """Generate a new synthetic APT attack timeline with GNN predictions."""
    try:
        # Generate provenance data
        snapshots = data_generator.generate_apt_timeline(duration_minutes)
        
        # Run GNN inference
        processed_snapshots = gnn_simulator.predict(snapshots)
        
        # Calculate statistics
        all_nodes = []
        for snapshot in processed_snapshots:
            all_nodes.extend(snapshot.nodes)
        
        total_nodes = len(set(n.id for n in all_nodes))
        malicious_nodes = len(set(n.id for n in all_nodes if n.is_malicious))
        
        # Create timeline
        timeline = AttackTimeline(
            id=f"timeline_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            name=f"APT Attack Simulation - {attack_type.upper()}",
            description=f"Synthetic {attack_type} attack pattern with {duration_minutes} minute duration",
            start_time=processed_snapshots[0].timestamp,
            end_time=processed_snapshots[-1].timestamp,
            snapshots=processed_snapshots,
            severity="critical" if malicious_nodes > 5 else "high" if malicious_nodes > 3 else "medium",
            total_nodes=total_nodes,
            malicious_nodes=malicious_nodes
        )
        
        # Cache timeline
        timelines_cache[timeline.id] = timeline
        
        return timeline
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating timeline: {str(e)}")

@app.get("/api/timeline/{timeline_id}", response_model=AttackTimeline)
async def get_timeline(timeline_id: str):
    """Retrieve a specific timeline by ID."""
    if timeline_id not in timelines_cache:
        raise HTTPException(status_code=404, detail="Timeline not found")
    return timelines_cache[timeline_id]

@app.get("/api/timeline/{timeline_id}/snapshots")
async def get_snapshots(timeline_id: str):
    """Get all snapshots for a timeline."""
    if timeline_id not in timelines_cache:
        raise HTTPException(status_code=404, detail="Timeline not found")
    
    timeline = timelines_cache[timeline_id]
    return {
        "timeline_id": timeline_id,
        "total_snapshots": len(timeline.snapshots),
        "snapshots": [
            {
                "timestamp": s.timestamp.isoformat(),
                "attack_stage": s.attack_stage,
                "node_count": len(s.nodes),
                "edge_count": len(s.edges),
                "malicious_count": len([n for n in s.nodes if n.is_malicious])
            }
            for s in timeline.snapshots
        ]
    }

@app.get("/api/timeline/{timeline_id}/snapshot/{timestamp}")
async def get_snapshot(timeline_id: str, timestamp: str):
    """Get a specific snapshot by timestamp."""
    if timeline_id not in timelines_cache:
        raise HTTPException(status_code=404, detail="Timeline not found")
    
    timeline = timelines_cache[timeline_id]
    
    # Parse timestamp
    try:
        target_time = datetime.fromisoformat(timestamp)
    except:
        raise HTTPException(status_code=400, detail="Invalid timestamp format")
    
    # Find closest snapshot
    closest_snapshot = None
    min_diff = float('inf')
    
    for snapshot in timeline.snapshots:
        diff = abs((snapshot.timestamp - target_time).total_seconds())
        if diff < min_diff:
            min_diff = diff
            closest_snapshot = snapshot
    
    if not closest_snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    
    return closest_snapshot

@app.get("/api/timeline/{timeline_id}/range")
async def get_snapshot_range(
    timeline_id: str,
    start_time: str,
    end_time: str
):
    """Get snapshots within a time range."""
    if timeline_id not in timelines_cache:
        raise HTTPException(status_code=404, detail="Timeline not found")
    
    timeline = timelines_cache[timeline_id]
    
    try:
        start = datetime.fromisoformat(start_time)
        end = datetime.fromisoformat(end_time)
    except:
        raise HTTPException(status_code=400, detail="Invalid timestamp format")
    
    filtered_snapshots = [
        s for s in timeline.snapshots
        if start <= s.timestamp <= end
    ]
    
    return {
        "timeline_id": timeline_id,
        "start_time": start_time,
        "end_time": end_time,
        "snapshots": filtered_snapshots
    }

@app.post("/api/timeline/{timeline_id}/explain/{node_id}", response_model=GNNExplanation)
async def explain_node(timeline_id: str, node_id: str):
    """Generate GNN explanation for a specific node."""
    if timeline_id not in timelines_cache:
        raise HTTPException(status_code=404, detail="Timeline not found")
    
    timeline = timelines_cache[timeline_id]
    
    # Find node in latest snapshot
    target_node = None
    target_snapshot = None
    
    for snapshot in timeline.snapshots:
        for node in snapshot.nodes:
            if node.id == node_id:
                target_node = node
                target_snapshot = snapshot
                break
        if target_node:
            break
    
    if not target_node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    # Generate explanation
    explanation = gnn_simulator.explain_prediction(target_node, target_snapshot)
    
    return explanation

@app.get("/api/timeline/{timeline_id}/attack-path")
async def get_attack_path(timeline_id: str):
    """Get the complete attack path across all snapshots."""
    if timeline_id not in timelines_cache:
        raise HTTPException(status_code=404, detail="Timeline not found")
    
    timeline = timelines_cache[timeline_id]
    
    # Build attack path from malicious nodes
    attack_nodes = []
    for snapshot in timeline.snapshots:
        for node in snapshot.nodes:
            if node.is_malicious and node.id not in [n.id for n in attack_nodes]:
                attack_nodes.append(node)
    
    # Sort by timestamp
    attack_nodes.sort(key=lambda n: n.timestamp)
    
    return {
        "timeline_id": timeline_id,
        "total_malicious_nodes": len(attack_nodes),
        "attack_path": [
            {
                "id": n.id,
                "type": n.type,
                "label": n.label,
                "timestamp": n.timestamp.isoformat(),
                "gnn_score": n.gnn_score,
                "explanation": n.explanation
            }
            for n in attack_nodes
        ]
    }

@app.get("/api/timelines")
async def list_timelines():
    """List all cached timelines."""
    return {
        "timelines": [
            {
                "id": t.id,
                "name": t.name,
                "description": t.description,
                "start_time": t.start_time.isoformat(),
                "end_time": t.end_time.isoformat(),
                "severity": t.severity,
                "total_nodes": t.total_nodes,
                "malicious_nodes": t.malicious_nodes
            }
            for t in timelines_cache.values()
        ]
    }

@app.delete("/api/timeline/{timeline_id}")
async def delete_timeline(timeline_id: str):
    """Delete a timeline from cache."""
    if timeline_id not in timelines_cache:
        raise HTTPException(status_code=404, detail="Timeline not found")
    
    del timelines_cache[timeline_id]
    return {"message": f"Timeline {timeline_id} deleted successfully"}

# WebSocket endpoint for real-time updates (optional)
from fastapi import WebSocket

@app.websocket("/ws/timeline/{timeline_id}")
async def websocket_timeline(websocket: WebSocket, timeline_id: str):
    """WebSocket endpoint for real-time timeline updates."""
    await websocket.accept()
    
    if timeline_id not in timelines_cache:
        await websocket.send_json({"error": "Timeline not found"})
        await websocket.close()
        return
    
    try:
        timeline = timelines_cache[timeline_id]
        
        # Send initial data
        await websocket.send_json({
            "type": "init",
            "timeline": {
                "id": timeline.id,
                "name": timeline.name,
                "total_snapshots": len(timeline.snapshots)
            }
        })
        
        # Stream snapshots one by one (simulating real-time)
        for i, snapshot in enumerate(timeline.snapshots):
            await websocket.send_json({
                "type": "snapshot",
                "index": i,
                "snapshot": {
                    "timestamp": snapshot.timestamp.isoformat(),
                    "attack_stage": snapshot.attack_stage,
                    "node_count": len(snapshot.nodes),
                    "edge_count": len(snapshot.edges)
                }
            })
            await asyncio.sleep(0.5)  # Simulate delay
        
        await websocket.send_json({"type": "complete"})
        
    except Exception as e:
        await websocket.send_json({"error": str(e)})
    finally:
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
