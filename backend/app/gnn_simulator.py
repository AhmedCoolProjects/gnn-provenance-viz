import random
import math
from typing import List, Dict, Tuple, Optional
from .models import Node, Edge, GraphSnapshot, GNNExplanation


class GNNSimulator:
    """
    Simulates Graph Neural Network inference for anomaly detection.
    In production, this would interface with actual PyTorch/TensorFlow GNN models.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path
        self.feature_weights = self._initialize_weights()

    def _initialize_weights(self) -> Dict:
        """Initialize feature importance weights for simulation."""
        return {
            "process": {
                "entropy": 0.25,
                "path_depth": 0.15,
                "known_good": -0.30,
                "network_activity": 0.20,
                "file_access_pattern": 0.20
            },
            "file": {
                "path_anomaly": 0.30,
                "extension_mismatch": 0.25,
                "hash_reputation": 0.25,
                "access_frequency": 0.20
            },
            "socket": {
                "ip_reputation": 0.35,
                "port_rarity": 0.20,
                "traffic_volume": 0.25,
                "connection_pattern": 0.20
            },
            "registry": {
                "key_sensitivity": 0.40,
                "modification_rate": 0.30,
                "value_entropy": 0.30
            }
        }

    def predict(self, snapshots: List[GraphSnapshot]) -> List[GraphSnapshot]:
        """
        Run GNN inference on graph snapshots.
        Returns snapshots with updated GNN scores and predictions.
        """
        processed_snapshots = []

        for snapshot in snapshots:
            # Compute structural features
            node_degrees = self._compute_degrees(snapshot.nodes, snapshot.edges)
            neighbor_features = self._aggregate_neighbor_features(snapshot.nodes, snapshot.edges)

            # Update node scores
            updated_nodes = []
            for node in snapshot.nodes:
                # Base score from node features
                base_score = self._compute_node_score(node)

                # Structural influence from neighbors
                neighbor_score = neighbor_features.get(node.id, 0.0)

                # Degree-based anomaly (high degree can indicate lateral movement)
                degree_factor = min(node_degrees.get(node.id, 0) / 10.0, 0.2)

                # Combine scores with GNN-like message passing simulation
                final_score = self._sigmoid(
                    base_score * 0.5 +
                    neighbor_score * 0.3 +
                    degree_factor * 0.2
                )

                # Add temporal context - scores increase over time for attack nodes
                if node.is_malicious:
                    final_score = min(final_score + 0.1, 0.99)

                updated_node = node.copy()
                updated_node.gnn_score = round(final_score, 3)
                updated_node.is_malicious = final_score > 0.7 or node.is_malicious

                if updated_node.is_malicious and not node.explanation:
                    updated_node.explanation = self._generate_explanation(updated_node)

                updated_nodes.append(updated_node)

            processed_snapshots.append(GraphSnapshot(
                timestamp=snapshot.timestamp,
                nodes=updated_nodes,
                edges=snapshot.edges,
                attack_stage=snapshot.attack_stage
            ))

        return processed_snapshots

    def explain_prediction(self, node: Node, snapshot: GraphSnapshot) -> GNNExplanation:
        """Generate explanation for why a node was flagged."""
        features = self._extract_top_features(node)

        # Compute neighbor influence
        neighbor_influence = {}
        for edge in snapshot.edges:
            if edge.source == node.id:
                neighbor = next((n for n in snapshot.nodes if n.id == edge.target), None)
                if neighbor:
                    neighbor_influence[neighbor.id] = neighbor.gnn_score
            elif edge.target == node.id:
                neighbor = next((n for n in snapshot.nodes if n.id == edge.source), None)
                if neighbor:
                    neighbor_influence[neighbor.id] = neighbor.gnn_score

        # Calculate attack path probability
        attack_path_prob = self._calculate_attack_path_probability(node, snapshot)

        return GNNExplanation(
            node_id=node.id,
            score=node.gnn_score,
            top_features=features,
            neighbor_influence=neighbor_influence,
            attack_path_probability=attack_path_prob
        )

    def _compute_degrees(self, nodes: List[Node], edges: List[Edge]) -> Dict[str, int]:
        """Compute degree for each node."""
        degrees = {node.id: 0 for node in nodes}
        for edge in edges:
            if edge.source in degrees:
                degrees[edge.source] += 1
            if edge.target in degrees:
                degrees[edge.target] += 1
        return degrees

    def _aggregate_neighbor_features(self, nodes: List[Node], edges: List[Edge]) -> Dict[str, float]:
        """Simulate GNN message passing - aggregate features from neighbors."""
        neighbor_scores = {node.id: 0.0 for node in nodes}

        for edge in edges:
            source_node = next((n for n in nodes if n.id == edge.source), None)
            target_node = next((n for n in nodes if n.id == edge.target), None)

            if source_node and target_node:
                # Message passing: malicious neighbors increase suspicion
                neighbor_scores[target_node.id] += source_node.gnn_score * 0.3
                neighbor_scores[source_node.id] += target_node.gnn_score * 0.2

        return {k: self._sigmoid(v) for k, v in neighbor_scores.items()}

    def _compute_node_score(self, node: Node) -> float:
        """Compute anomaly score based on node features."""
        weights = self.feature_weights.get(node.type.value, {})
        score = 0.0

        # Simulate feature extraction
        features = self._extract_features(node)

        for feature_name, weight in weights.items():
            feature_value = features.get(feature_name, 0.5)
            score += weight * feature_value

        return score

    def _beta_random(self, alpha: float, beta: float) -> float:
        """Generate beta distribution random value using Python's random module."""
        # Use a simple approximation of beta distribution
        # Beta(α, β) can be approximated using gamma distributions
        # For simplicity, we'll use a basic approximation
        u = random.random()
        if alpha == 2 and beta == 5:
            # Skewed towards lower values (benign)
            return u ** 2.5
        elif alpha == 5 and beta == 2:
            # Skewed towards higher values (malicious)
            return 1 - (1 - u) ** 2.5
        else:
            return u

    def _extract_features(self, node: Node) -> Dict[str, float]:
        """Extract simulated features from node properties."""
        features = {}
        props = node.properties

        if node.type.value == "process":
            # Command line entropy (higher = more suspicious)
            cmd_line = props.get("command_line", "")
            features["entropy"] = len(set(cmd_line)) / max(len(cmd_line), 1)

            # Path depth (deeper paths in temp directories are suspicious)
            path = props.get("path", "")
            features["path_depth"] = path.count("\\") / 10.0

            # Known good process
            known_good = ["svchost.exe", "explorer.exe", "chrome.exe"]
            features["known_good"] = 1.0 if node.label in known_good else 0.0

            # Simulate network and file activity
            features["network_activity"] = self._beta_random(2, 5) if not node.is_malicious else self._beta_random(5, 2)
            features["file_access_pattern"] = self._beta_random(2, 5) if not node.is_malicious else self._beta_random(5, 2)

        elif node.type.value == "file":
            # Path anomaly (temp directories, etc.)
            path = props.get("path", "")
            features["path_anomaly"] = 0.8 if "temp" in path.lower() or "\\users\\" in path.lower() else 0.2

            # Extension mismatch (e.g., .pdf.exe)
            name = props.get("name", node.label)
            features["extension_mismatch"] = 0.9 if "." in name and name.endswith(".exe") and ".exe" not in name[:-4] else 0.1

            # Hash reputation
            features["hash_reputation"] = 0.0 if props.get("hash") == "d41d8cd98f00b204e9800998ecf8427e" else 0.5

            # Access frequency
            features["access_frequency"] = self._beta_random(2, 5)

        elif node.type.value == "socket":
            # IP reputation simulation
            ip = props.get("remote_ip", "")
            features["ip_reputation"] = 0.9 if ip.startswith("185.") or ip.startswith("192.168.") else 0.2

            # Port rarity
            port = props.get("remote_port", 80)
            common_ports = [80, 443, 8080, 53]
            features["port_rarity"] = 0.8 if port not in common_ports else 0.2

            # Traffic volume and pattern
            features["traffic_volume"] = self._beta_random(2, 5) if not node.is_malicious else self._beta_random(5, 2)
            features["connection_pattern"] = self._beta_random(2, 5) if not node.is_malicious else self._beta_random(5, 2)

        elif node.type.value == "registry":
            # Key sensitivity
            path = props.get("path", "")
            features["key_sensitivity"] = 0.9 if "run" in path.lower() else 0.3

            # Modification rate and value entropy
            features["modification_rate"] = self._beta_random(2, 5)
            features["value_entropy"] = self._beta_random(2, 5)

        return features

    def _extract_top_features(self, node: Node) -> List[str]:
        """Extract top contributing features for explanation."""
        features = self._extract_features(node)
        weights = self.feature_weights.get(node.type.value, {})

        # Calculate contribution scores
        contributions = {
            name: features.get(name, 0) * weight
            for name, weight in weights.items()
        }

        # Sort by contribution and return top 3
        sorted_features = sorted(contributions.items(), key=lambda x: abs(x[1]), reverse=True)
        return [name.replace("_", " ").title() for name, _ in sorted_features[:3]]

    def _calculate_attack_path_probability(self, node: Node, snapshot: GraphSnapshot) -> float:
        """Calculate the probability that this node is part of an attack path."""
        # Find paths from this node to other malicious nodes
        malicious_neighbors = []
        for edge in snapshot.edges:
            if edge.source == node.id or edge.target == node.id:
                neighbor_id = edge.target if edge.source == node.id else edge.source
                neighbor = next((n for n in snapshot.nodes if n.id == neighbor_id), None)
                if neighbor and neighbor.is_malicious:
                    malicious_neighbors.append(neighbor)

        if not malicious_neighbors:
            return node.gnn_score * 0.5

        # Average score of malicious neighbors
        avg_neighbor_score = sum(n.gnn_score for n in malicious_neighbors) / len(malicious_neighbors)

        # Path probability increases with both node score and neighbor scores
        return (node.gnn_score + avg_neighbor_score) / 2.0

    def _sigmoid(self, x: float) -> float:
        """Sigmoid activation function."""
        return 1 / (1 + math.exp(-x))

    def _generate_explanation(self, node: Node) -> str:
        """Generate human-readable explanation."""
        explanations = {
            "process": [
                "Suspicious process execution pattern detected",
                "Anomalous parent-child relationship",
                "Process spawned from unusual location"
            ],
            "file": [
                "Known malicious file signature",
                "File masquerading as legitimate document",
                "Access to sensitive file detected"
            ],
            "socket": [
                "Connection to suspicious external IP",
                "Unusual network traffic pattern",
                "Possible C2 communication detected"
            ],
            "registry": [
                "Persistence mechanism installation",
                "Registry modification by suspicious process"
            ]
        }

        import random
        base_explanation = random.choice(explanations.get(node.type.value, ["Anomalous behavior detected"]))

        if node.gnn_score > 0.9:
            return f"CRITICAL: {base_explanation} (Score: {node.gnn_score:.2f})"
        elif node.gnn_score > 0.7:
            return f"HIGH: {base_explanation} (Score: {node.gnn_score:.2f})"
        else:
            return f"MEDIUM: {base_explanation} (Score: {node.gnn_score:.2f})"
