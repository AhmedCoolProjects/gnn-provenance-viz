from fastapi.testclient import TestClient
import pytest
from datetime import datetime

from app.main import app, timelines_cache, data_generator, gnn_simulator
from app.models import AttackTimeline, NodeType, EdgeType

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_generate_timeline():
    response = client.post("/api/timeline/generate?duration_minutes=15&attack_type=apt")
    assert response.status_code == 200
    
    data = response.json()
    assert "id" in data
    assert "snapshots" in data
    assert len(data["snapshots"]) > 0
    
    # Check that GNN scores are present
    for snapshot in data["snapshots"]:
        for node in snapshot["nodes"]:
            assert "gnn_score" in node
            assert 0 <= node["gnn_score"] <= 1

def test_get_timeline():
    # First generate a timeline
    generate_response = client.post("/api/timeline/generate")
    timeline_id = generate_response.json()["id"]
    
    # Then retrieve it
    response = client.get(f"/api/timeline/{timeline_id}")
    assert response.status_code == 200
    assert response.json()["id"] == timeline_id

def test_get_snapshots():
    generate_response = client.post("/api/timeline/generate")
    timeline_id = generate_response.json()["id"]
    
    response = client.get(f"//api/timeline/{timeline_id}/snapshots")
    assert response.status_code == 200
    
    data = response.json()
    assert "snapshots" in data
    assert len(data["snapshots"]) > 0

def test_explain_node():
    generate_response = client.post("/api/timeline/generate")
    timeline_id = generate_response.json()["id"]
    
    # Get a malicious node
    timeline_data = generate_response.json()
    malicious_node = None
    for snapshot in timeline_data["snapshots"]:
        for node in snapshot["nodes"]:
            if node.get("is_malicious"):
                malicious_node = node
                break
        if malicious_node:
            break
    
    if malicious_node:
        response = client.post(f"/api/timeline/{timeline_id}/explain/{malicious_node['id']}")
        assert response.status_code == 200
        
        data = response.json()
        assert "score" in data
        assert "top_features" in data
        assert "neighbor_influence" in data

def test_attack_path():
    generate_response = client.post("/api/timeline/generate")
    timeline_id = generate_response.json()["id"]
    
    response = client.get(f"/api/timeline/{timeline_id}/attack-path")
    assert response.status_code == 200
    
    data = response.json()
    assert "attack_path" in data

def test_list_timelines():
    # Generate a couple timelines
    client.post("/api/timeline/generate")
    client.post("/api/timeline/generate")
    
    response = client.get("/api/timelines")
    assert response.status_code == 200
    
    data = response.json()
    assert "timelines" in data
    assert len(data["timelines"]) >= 2

def test_delete_timeline():
    generate_response = client.post("/api/timeline/generate")
    timeline_id = generate_response.json()["id"]
    
    response = client.delete(f"/api/timeline/{timeline_id}")
    assert response.status_code == 200
    
    # Verify it's gone
    response = client.get(f"/api/timeline/{timeline_id}")
    assert response.status_code == 404
