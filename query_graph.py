import json
import sys
from networkx.readwrite import json_graph
import networkx as nx
from pathlib import Path

data = json.loads(Path("graphify-out/graph.json").read_text())
G = json_graph.node_link_graph(data, edges="links")

# Use key concepts from the codebase - look for the most connected nodes (god nodes)
# and extract what this codebase is about from their connections
question = "Devon"
mode = "bfs"
terms = [t.lower() for t in ["devon", "code", "cli", "github", "assistant"]]

# Find best-matching start nodes
scored = []
for nid, ndata in G.nodes(data=True):
    label = ndata.get("label", "").lower()
    score = sum(1 for t in terms if t in label)
    if score > 0:
        scored.append((score, nid))
scored.sort(reverse=True)
start_nodes = [nid for _, nid in scored[:3]]

# If no matches, use top god nodes
if not start_nodes:
    # Get top 5 nodes by degree
    degree_sorted = sorted(G.degree(), key=lambda x: x[1], reverse=True)[:5]
    start_nodes = [n for n, d in degree_sorted]
    print(f"Using god nodes: {[G.nodes[n].get('label', n) for n in start_nodes]}")

subgraph_nodes = set()
subgraph_edges = []

# BFS: explore all neighbors layer by layer up to depth 3.
frontier = set(start_nodes)
subgraph_nodes = set(start_nodes)
for _ in range(3):
    next_frontier = set()
    for n in frontier:
        for neighbor in G.neighbors(n):
            if neighbor not in subgraph_nodes:
                next_frontier.add(neighbor)
                subgraph_edges.append((n, neighbor))
    subgraph_nodes.update(next_frontier)
    frontier = next_frontier


# Score each node by term overlap for ranked output
def relevance(nid):
    label = G.nodes[nid].get("label", "").lower()
    return sum(1 for t in terms if t in label)


ranked_nodes = sorted(subgraph_nodes, key=relevance, reverse=True)

lines = [
    f"Traversal: {mode.upper()} | Start: {[G.nodes[n].get('label', n) for n in start_nodes]} | {len(subgraph_nodes)} nodes"
]
for nid in ranked_nodes[:20]:
    d = G.nodes[nid]
    lines.append(f"  NODE {d.get('label', nid)} [src={d.get('source_file', '')}]")
for u, v in subgraph_edges[:30]:
    if u in subgraph_nodes and v in subgraph_nodes:
        d = G.edges[u, v]
        lines.append(
            f"  EDGE {G.nodes[u].get('label', u)} --{d.get('relation', '')} [{d.get('confidence', '')}]--> {G.nodes[v].get('label', v)}"
        )

output = "\n".join(lines)
print(output)
