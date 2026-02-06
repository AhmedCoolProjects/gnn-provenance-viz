from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Literal
from datetime import datetime
from enum import Enum

class NodeType(str, Enum):
    PROCESS = "process"
    FILE = "file"
    SOCKET = "socket"
    REGISTRY = "registry"

class EdgeType(str, Enum):
    FORK = "fork"
    READ = "read"
    WRITE = "write"
    EXECUTE = "execute"
    CONNECT = "connect"
    ACCEPT = "accept"
    LOAD = "load"

class Node(BaseModel):
    id: str
    type: NodeType
    label: str
    timestamp: datetime
    properties: Dict = Field(default_factory=dict)
    gnn_score: float = Field(ge=0.0, le=1.0, default=0.0)
    is_malicious: bool = False
    explanation: Optional[str] = None

class Edge(BaseModel):
    id: str
    source: str
    target: str
    type: EdgeType
    timestamp: datetime
    properties: Dict = Field(default_factory=dict)

class GraphSnapshot(BaseModel):
    timestamp: datetime
    nodes: List[Node]
    edges: List[Edge]
    attack_stage: Optional[str] = None

class AttackTimeline(BaseModel):
    id: str
    name: str
    description: str
    start_time: datetime
    end_time: datetime
    snapshots: List[GraphSnapshot]
    severity: Literal["low", "medium", "high", "critical"]
    total_nodes: int
    malicious_nodes: int

class GNNExplanation(BaseModel):
    node_id: str
    score: float
    top_features: List[str]
    neighbor_influence: Dict[str, float]
    attack_path_probability: float
