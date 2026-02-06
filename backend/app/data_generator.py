import random
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
from .models import Node, Edge, NodeType, EdgeType, GraphSnapshot

class ProvenanceDataGenerator:
    """Generate synthetic provenance data simulating APT attack patterns."""
    
    def __init__(self, seed: int = 42):
        random.seed(seed)
        self.node_counters = {t: 0 for t in NodeType}
        
    def generate_apt_timeline(self, duration_minutes: int = 30) -> List[GraphSnapshot]:
        """Generate a complete APT attack timeline with multiple stages."""
        snapshots = []
        base_time = datetime.now() - timedelta(minutes=duration_minutes)
        
        # Stage 1: Initial Compromise (0-5 min)
        stage1_nodes, stage1_edges = self._generate_initial_compromise(base_time)
        snapshots.append(GraphSnapshot(
            timestamp=base_time + timedelta(minutes=2),
            nodes=stage1_nodes,
            edges=stage1_edges,
            attack_stage="Initial Compromise"
        ))
        
        # Stage 2: Persistence (5-10 min)
        stage2_nodes, stage2_edges = self._generate_persistence(
            base_time + timedelta(minutes=5),
            stage1_nodes
        )
        all_nodes = stage1_nodes + stage2_nodes
        all_edges = stage1_edges + stage2_edges
        snapshots.append(GraphSnapshot(
            timestamp=base_time + timedelta(minutes=7),
            nodes=all_nodes.copy(),
            edges=all_edges.copy(),
            attack_stage="Persistence"
        ))
        
        # Stage 3: Privilege Escalation (10-15 min)
        stage3_nodes, stage3_edges = self._generate_privilege_escalation(
            base_time + timedelta(minutes=10),
            all_nodes
        )
        all_nodes.extend(stage3_nodes)
        all_edges.extend(stage3_edges)
        snapshots.append(GraphSnapshot(
            timestamp=base_time + timedelta(minutes=12),
            nodes=all_nodes.copy(),
            edges=all_edges.copy(),
            attack_stage="Privilege Escalation"
        ))
        
        # Stage 4: Lateral Movement (15-25 min)
        stage4_nodes, stage4_edges = self._generate_lateral_movement(
            base_time + timedelta(minutes=15),
            all_nodes
        )
        all_nodes.extend(stage4_nodes)
        all_edges.extend(stage4_edges)
        snapshots.append(GraphSnapshot(
            timestamp=base_time + timedelta(minutes=20),
            nodes=all_nodes.copy(),
            edges=all_edges.copy(),
            attack_stage="Lateral Movement"
        ))
        
        # Stage 5: Data Exfiltration (25-30 min)
        stage5_nodes, stage5_edges = self._generate_exfiltration(
            base_time + timedelta(minutes=25),
            all_nodes
        )
        all_nodes.extend(stage5_nodes)
        all_edges.extend(stage5_edges)
        snapshots.append(GraphSnapshot(
            timestamp=base_time + timedelta(minutes=27),
            nodes=all_nodes.copy(),
            edges=all_edges.copy(),
            attack_stage="Data Exfiltration"
        ))
        
        return snapshots
    
    def _generate_initial_compromise(self, base_time: datetime) -> Tuple[List[Node], List[Edge]]:
        """Simulate initial compromise via phishing/malicious download."""
        nodes = []
        edges = []
        
        # Browser process
        browser = self._create_node(NodeType.PROCESS, "chrome.exe", base_time, {
            "pid": 1234,
            "user": "john.doe",
            "command_line": "chrome.exe --flag-switches-begin"
        })
        nodes.append(browser)
        
        # Malicious download
        malware_file = self._create_node(NodeType.FILE, "invoice.pdf.exe", base_time + timedelta(seconds=30), {
            "path": "C:\\Users\\john.doe\\Downloads\\invoice.pdf.exe",
            "hash": "d41d8cd98f00b204e9800998ecf8427e",
            "size": 2048000
        }, is_malicious=True, gnn_score=0.85)
        nodes.append(malware_file)
        
        # Edge: browser downloads malware
        edges.append(self._create_edge(browser.id, malware_file.id, EdgeType.WRITE, base_time + timedelta(seconds=30)))
        
        # Initial malware process
        malware_proc = self._create_node(NodeType.PROCESS, "invoice.pdf.exe", base_time + timedelta(minutes=1), {
            "pid": 5678,
            "user": "john.doe",
            "command_line": "invoice.pdf.exe",
            "parent_pid": 1234
        }, is_malicious=True, gnn_score=0.92)
        nodes.append(malware_proc)
        
        # Edge: malware file executes
        edges.append(self._create_edge(malware_file.id, malware_proc.id, EdgeType.EXECUTE, base_time + timedelta(minutes=1)))
        edges.append(self._create_edge(browser.id, malware_proc.id, EdgeType.FORK, base_time + timedelta(minutes=1)))
        
        return nodes, edges
    
    def _generate_persistence(self, base_time: datetime, existing_nodes: List[Node]) -> Tuple[List[Node], List[Edge]]:
        """Simulate persistence mechanism (registry modification)."""
        nodes = []
        edges = []
        
        malware_proc = [n for n in existing_nodes if n.is_malicious and n.type == NodeType.PROCESS][0]
        
        # Registry key for persistence
        reg_key = self._create_node(NodeType.REGISTRY, "Run\\Updater", base_time + timedelta(minutes=2), {
            "path": "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Updater",
            "value": "C:\\Users\\john.doe\\AppData\\Roaming\\Updater\\updater.exe"
        }, is_malicious=True, gnn_score=0.88)
        nodes.append(reg_key)
        
        # Edge: malware modifies registry
        edges.append(self._create_edge(malware_proc.id, reg_key.id, EdgeType.WRITE, base_time + timedelta(minutes=2)))
        
        # Updater file
        updater_file = self._create_node(NodeType.FILE, "updater.exe", base_time + timedelta(minutes=3), {
            "path": "C:\\Users\\john.doe\\AppData\\Roaming\\Updater\\updater.exe",
            "hash": "aabbccdd11223344556677889900aabb"
        }, is_malicious=True, gnn_score=0.90)
        nodes.append(updater_file)
        
        # Edge: malware writes updater
        edges.append(self._create_edge(malware_proc.id, updater_file.id, EdgeType.WRITE, base_time + timedelta(minutes=3)))
        
        return nodes, edges
    
    def _generate_privilege_escalation(self, base_time: datetime, existing_nodes: List[Node]) -> Tuple[List[Node], List[Edge]]:
        """Simulate privilege escalation attack."""
        nodes = []
        edges = []
        
        malware_procs = [n for n in existing_nodes if n.is_malicious and n.type == NodeType.PROCESS]
        
        # System process targeted
        system_proc = self._create_node(NodeType.PROCESS, "svchost.exe", base_time, {
            "pid": 800,
            "user": "SYSTEM",
            "command_line": "C:\\Windows\\System32\\svchost.exe -k netsvcs"
        }, gnn_score=0.15)
        nodes.append(system_proc)
        
        # Suspicious DLL load
        malicious_dll = self._create_node(NodeType.FILE, "cryptbase.dll", base_time + timedelta(minutes=2), {
            "path": "C:\\Windows\\Temp\\cryptbase.dll",
            "hash": "badc0ffeebadc0ffeebadc0ffeebadc0"
        }, is_malicious=True, gnn_score=0.95)
        nodes.append(malicious_dll)
        
        # Edge: malware drops DLL
        edges.append(self._create_edge(malware_procs[0].id, malicious_dll.id, EdgeType.WRITE, base_time + timedelta(minutes=2)))
        
        # Edge: system loads malicious DLL (DLL hijacking)
        edges.append(self._create_edge(system_proc.id, malicious_dll.id, EdgeType.LOAD, base_time + timedelta(minutes=3)))
        
        # New elevated process
        elevated_proc = self._create_node(NodeType.PROCESS, "cmd.exe", base_time + timedelta(minutes=4), {
            "pid": 9000,
            "user": "SYSTEM",
            "command_line": "cmd.exe /c whoami",
            "elevated": True
        }, is_malicious=True, gnn_score=0.97)
        nodes.append(elevated_proc)
        
        # Edge: DLL leads to elevated process
        edges.append(self._create_edge(system_proc.id, elevated_proc.id, EdgeType.FORK, base_time + timedelta(minutes=4)))
        
        return nodes, edges
    
    def _generate_lateral_movement(self, base_time: datetime, existing_nodes: List[Node]) -> Tuple[List[Node], List[Edge]]:
        """Simulate lateral movement to another host."""
        nodes = []
        edges = []
        
        malware_procs = [n for n in existing_nodes if n.is_malicious and n.type == NodeType.PROCESS and n.properties.get("elevated")]
        
        if not malware_procs:
            malware_procs = [n for n in existing_nodes if n.is_malicious and n.type == NodeType.PROCESS]
        
        # Target network connection
        target_socket = self._create_node(NodeType.SOCKET, "10.0.1.50:445", base_time + timedelta(minutes=2), {
            "remote_ip": "10.0.1.50",
            "remote_port": 445,
            "local_port": 49152,
            "protocol": "TCP"
        }, is_malicious=True, gnn_score=0.82)
        nodes.append(target_socket)
        
        # Edge: malware connects to target
        edges.append(self._create_edge(malware_procs[0].id, target_socket.id, EdgeType.CONNECT, base_time + timedelta(minutes=2)))
        
        # Credential file access
        cred_file = self._create_node(NodeType.FILE, "lsass.dmp", base_time + timedelta(minutes=3), {
            "path": "C:\\Windows\\Temp\\lsass.dmp",
            "size": 52428800
        }, is_malicious=True, gnn_score=0.93)
        nodes.append(cred_file)
        
        # Edge: malware dumps credentials
        edges.append(self._create_edge(malware_procs[0].id, cred_file.id, EdgeType.WRITE, base_time + timedelta(minutes=3)))
        
        # Another connection with stolen creds
        admin_socket = self._create_node(NodeType.SOCKET, "10.0.1.50:5985", base_time + timedelta(minutes=5), {
            "remote_ip": "10.0.1.50",
            "remote_port": 5985,
            "protocol": "HTTP",
            "auth_type": "NTLM"
        }, is_malicious=True, gnn_score=0.87)
        nodes.append(admin_socket)
        
        edges.append(self._create_edge(malware_procs[0].id, admin_socket.id, EdgeType.CONNECT, base_time + timedelta(minutes=5)))
        
        return nodes, edges
    
    def _generate_exfiltration(self, base_time: datetime, existing_nodes: List[Node]) -> Tuple[List[Node], List[Edge]]:
        """Simulate data exfiltration."""
        nodes = []
        edges = []
        
        malware_procs = [n for n in existing_nodes if n.is_malicious and n.type == NodeType.PROCESS]
        
        # Sensitive files accessed
        sensitive_files = [
            ("customer_db.sql", "C:\\Database\\customer_db.sql", 1073741824),
            ("financial.xlsx", "C:\\Finance\\Q4_Reports.xlsx", 5242880),
            ("credentials.txt", "C:\\Admin\\passwords.txt", 10240)
        ]
        
        for i, (name, path, size) in enumerate(sensitive_files):
            file_node = self._create_node(NodeType.FILE, name, base_time + timedelta(minutes=i), {
                "path": path,
                "size": size,
                "sensitivity": "high"
            }, gnn_score=0.45)
            nodes.append(file_node)
            
            # Edge: malware reads file
            edges.append(self._create_edge(file_node.id, malware_procs[0].id, EdgeType.READ, base_time + timedelta(minutes=i)))
        
        # External C2 server
        c2_socket = self._create_node(NodeType.SOCKET, "185.220.101.42:443", base_time + timedelta(minutes=4), {
            "remote_ip": "185.220.101.42",
            "remote_port": 443,
            "protocol": "HTTPS",
            "sni": "cdn-updates.cloud-flare.workers.dev"
        }, is_malicious=True, gnn_score=0.98)
        nodes.append(c2_socket)
        
        # Edge: malware exfiltrates data
        edges.append(self._create_edge(malware_procs[0].id, c2_socket.id, EdgeType.CONNECT, base_time + timedelta(minutes=4)))
        
        # Compressed archive
        archive = self._create_node(NodeType.FILE, "backup.zip", base_time + timedelta(minutes=3), {
            "path": "C:\\Windows\\Temp\\backup.zip",
            "size": 268435456,
            "compression_ratio": 0.25
        }, is_malicious=True, gnn_score=0.91)
        nodes.append(archive)
        
        edges.append(self._create_edge(malware_procs[0].id, archive.id, EdgeType.WRITE, base_time + timedelta(minutes=3)))
        edges.append(self._create_edge(archive.id, c2_socket.id, EdgeType.WRITE, base_time + timedelta(minutes=4)))
        
        return nodes, edges
    
    def _create_node(self, node_type: NodeType, label: str, timestamp: datetime, 
                     properties: Optional[Dict] = None, is_malicious: bool = False, 
                     gnn_score: float = 0.0) -> Node:
        """Create a new node with unique ID."""
        self.node_counters[node_type] += 1
        node_id = f"{node_type.value}_{self.node_counters[node_type]}"
        
        explanation = None
        if is_malicious:
            explanation = self._generate_explanation(node_type, gnn_score)
        
        return Node(
            id=node_id,
            type=node_type,
            label=label,
            timestamp=timestamp,
            properties=properties or {},
            gnn_score=gnn_score,
            is_malicious=is_malicious,
            explanation=explanation
        )
    
    def _create_edge(self, source: str, target: str, edge_type: EdgeType, timestamp: datetime) -> Edge:
        """Create a new edge."""
        return Edge(
            id=f"edge_{uuid.uuid4().hex[:8]}",
            source=source,
            target=target,
            type=edge_type,
            timestamp=timestamp
        )
    
    def _generate_explanation(self, node_type: NodeType, score: float) -> str:
        """Generate human-readable explanation for GNN detection."""
        explanations = {
            NodeType.PROCESS: [
                "Anomalous parent-child relationship detected",
                "Unusual command-line arguments pattern",
                "Process spawned from suspicious location",
                "Privilege escalation behavior detected"
            ],
            NodeType.FILE: [
                "Known malicious hash signature",
                "File created in suspicious directory",
                "Unusual file access pattern",
                "Masquerading file extension detected"
            ],
            NodeType.SOCKET: [
                "Connection to known malicious IP",
                "Unusual outbound connection pattern",
                "Data exfiltration behavior detected",
                "C2 beaconing pattern identified"
            ],
            NodeType.REGISTRY: [
                "Persistence mechanism detected",
                "Registry modification by suspicious process",
                "Auto-run key modification"
            ]
        }
        
        if score > 0.9:
            return f"Critical: {random.choice(explanations.get(node_type, ['High anomaly score']))}"
        elif score > 0.7:
            return f"High: {random.choice(explanations.get(node_type, ['Suspicious behavior']))}"
        else:
            return f"Medium: {random.choice(explanations.get(node_type, ['Anomalous pattern']))}"
