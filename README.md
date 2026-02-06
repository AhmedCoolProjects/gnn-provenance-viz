# GNN-Provenance-Viz

A web-based forensic dashboard for visualizing Advanced Persistent Threat (APT) attacks detected by Graph Neural Networks (GNNs). The application makes "black box" AI predictions explainable by converting raw system logs (processes, files, sockets) into interactive, time-evolving provenance graphs.

## Overview

GNN-Provenance-Viz bridges the gap between complex GNN-based intrusion detection systems and human analysts. It provides:

- **Interactive Graph Visualization**: Time-evolving provenance graphs using Cytoscape.js
- **GNN Explainability**: Clear explanations of why nodes are flagged as suspicious
- **Attack Replay**: Step-through attack progression with the time scrubber
- **Visual Threat Indicators**: Color-coded nodes based on GNN anomaly scores
- **Attack Chain Reconstruction**: Automatic identification of multi-stage attack paths

## Architecture

```
gnn-provenance-viz/
├── backend/           # FastAPI backend
│   ├── app/
│   │   ├── main.py           # FastAPI application entry
│   │   ├── models.py         # Pydantic data models
│   │   ├── gnn_simulator.py  # Mock GNN inference engine
│   │   └── data_generator.py # Synthetic provenance data generator
│   └── requirements.txt
└── frontend/          # Next.js frontend
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx        # Main dashboard
    │   │   └── layout.tsx      # Root layout
    │   ├── components/
    │   │   ├── GraphViewer.tsx # Cytoscape.js graph component
    │   │   ├── TimeScrubber.tsx # Time replay controls
    │   │   ├── NodeDetails.tsx  # Node inspection panel
    │   │   └── StatsPanel.tsx   # Attack statistics
    │   ├── hooks/
    │   │   └── useTimeline.ts   # React hooks for data fetching
    │   ├── lib/
    │   │   └── utils.ts         # Utility functions
    │   └── types/
    │       └── index.ts         # TypeScript definitions
    └── package.json
```

## Prerequisites

- Python 3.8+
- Node.js 18+
- npm or yarn

## Quick Start

### Option 1: Automated Setup

```bash
./setup.sh
```

### Option 2: Manual Setup

#### Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --port 8000
```

The backend API will be available at `http://localhost:8000`.

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`.

## API Endpoints

### Core Endpoints

- `POST /api/timeline/generate` - Generate a new synthetic APT attack timeline
- `GET /api/timeline/{timeline_id}` - Retrieve a specific timeline
- `GET /api/timeline/{timeline_id}/snapshots` - Get all snapshots for a timeline
- `GET /api/timeline/{timeline_id}/attack-path` - Get the reconstructed attack path
- `POST /api/timeline/{timeline_id}/explain/{node_id}` - Get GNN explanation for a node

### WebSocket

- `WS /ws/timeline/{timeline_id}` - Real-time timeline streaming

## Features

### 1. Interactive Provenance Graph

- **Node Types**: Processes (blue), Files (green), Sockets (amber), Registry (purple)
- **Visual Encoding**: Node size and border width correlate with GNN anomaly scores
- **Malicious Highlighting**: High-score nodes (>0.7) glow red and have thicker borders
- **Interactive Selection**: Click nodes to inspect properties and GNN explanations

### 2. Time Scrubber

- **Attack Replay**: Play/pause/step through attack progression
- **Visual Timeline**: Color-coded stages showing attack severity over time
- **Stage Indicators**: See current attack stage (Initial Compromise → Persistence → Privilege Escalation → Lateral Movement → Data Exfiltration)
- **Keyboard Shortcuts**: Space (play/pause), Arrow keys (step), Home/End (jump)

### 3. GNN Explainability

For each flagged node, the system provides:
- **Confidence Score**: 0-100% GNN anomaly probability
- **Key Indicators**: Top contributing features (e.g., "Suspicious parent-child relationship")
- **Attack Path Probability**: Likelihood of being part of an active attack chain
- **Neighbor Influence**: Impact of connected nodes on the score

### 4. Attack Chain Visualization

- Automatically reconstructs multi-stage attack paths
- Shows sequential malicious activities
- Highlights critical pivot points in the attack

## Attack Simulation

The system generates synthetic APT attack timelines simulating:

1. **Initial Compromise** (0-5 min)
   - Phishing/malicious download
   - Malware execution

2. **Persistence** (5-10 min)
   - Registry modifications
   - Auto-start mechanisms

3. **Privilege Escalation** (10-15 min)
   - DLL hijacking
   - Token manipulation

4. **Lateral Movement** (15-25 min)
   - Network reconnaissance
   - Credential dumping

5. **Data Exfiltration** (25-30 min)
   - Sensitive file access
   - C2 communication

## Visual Indicators

### Threat Levels
- **Critical (≥90%)**: Bright red, strong glow
- **High (70-89%)**: Red glow
- **Medium (50-69%)**: Yellow/Orange
- **Low (<50%)**: Green (normal activity)

### Node Size
- Larger nodes = higher GNN anomaly score
- Malicious nodes are 2x larger than benign nodes

### Edge Types
- Fork: Process spawning
- Read/Write: File operations
- Connect/Accept: Network activity
- Execute: Program execution
- Load: Library/DLL loading

## Development

### Backend Development

```bash
cd backend
source venv/bin/activate
pytest tests/
```

### Frontend Development

```bash
cd frontend
npm run lint
npm run typecheck
```

## Future Enhancements

- Integration with real GNN models (PyTorch Geometric, DGL)
- Import from SIEM systems (Splunk, ELK Stack)
- Export capabilities (PDF reports, graph data)
- Multi-timeline comparison
- Real-time streaming from live systems
- Collaborative annotations

## Technologies Used

### Backend
- **FastAPI**: Modern, fast web framework
- **Pydantic**: Data validation
- **NumPy**: Numerical computations

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **Cytoscape.js**: Graph theory library
- **Tailwind CSS**: Utility-first CSS
- **Radix UI**: Accessible UI primitives

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

This project demonstrates how GNN-based security systems can be made interpretable through effective visualization and explainability techniques.
