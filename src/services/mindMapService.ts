// =====================================================================================
// MIND MAP SERVICE - COMPLETE IMPLEMENTATION
// Advanced mind map generation with React Flow integration
// =====================================================================================

import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import dagre from "dagre";

export interface MindMapNode {
  id: string;
  position: { x: number; y: number };
  data: {
    label: string;
    level: number;
    summary?: string;
    nodeType?: "concept" | "detail" | "example" | "connection";
  };
  type?: string;
  style?: {
    background?: string;
    color?: string;
    border?: string;
    borderRadius?: string;
    fontSize?: string;
    fontWeight?: string;
    padding?: string;
    width?: string;
    height?: string;
  };
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  animated: boolean;
  style?: {
    stroke?: string;
    strokeWidth?: string;
    strokeDasharray?: string;
  };
  labelStyle?: {
    fill?: string;
    fontWeight?: string;
    fontSize?: string;
  };
}

export interface MindMapData {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

export interface HierarchicalNode {
  id: string;
  label: string;
  relationship: string;
  level: number;
  children: HierarchicalNode[];
  summary?: string;
  nodeType?: "concept" | "detail" | "example" | "connection";
}

class MindMapService {
  private apiKey: string | null = null;
  private lastRequestTime: number = 0;
  private readonly MIN_DELAY = 1200; // 1.2 seconds between requests

  constructor() {
    this.initializeAI();
  }

  private initializeAI() {
    try {
      this.apiKey = (import.meta.env as any).VITE_GOOGLE_AI_API_KEY;
      if (!this.apiKey) {
        console.error("Google AI API key not found for Mind Map Service. Mind map generation will likely fail.");
        throw new Error("Google AI API key not found for Mind Map Service. Ensure VITE_GOOGLE_AI_API_KEY is set in your environment variables.");
      }
      console.log("🗺️ Mind Map Service initialized");
    } catch (error) {
      console.error("Failed to initialize Mind Map Service:", error);
    }
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_DELAY) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.MIN_DELAY - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Generate complete mind map from research content
   */
  async generateMindMap(
    content: string,
    userQuery: string,
    maxLevels: number = 4
  ): Promise<MindMapData> {
    try {
      if (!this.apiKey) {
        return this.createFallbackMindMap(userQuery);
      }

      const chunks = await this.semanticChunking(content);
      const atomicTrees = await Promise.all(
        chunks
          .slice(0, 5)
          .map((chunk) => this.generateAtomicTree(chunk, userQuery))
      );

      const filteredAtomicTrees = atomicTrees.filter(tree => tree !== null && tree.label.trim() !== "") as HierarchicalNode[];

      if (filteredAtomicTrees.length === 0) {
        console.warn("No valid atomic trees generated, returning fallback mind map.");
        return this.createFallbackMindMap(userQuery);
      }

      const masterTree = await this.mergeTrees(filteredAtomicTrees, userQuery);
      const mindMapData = this.convertToReactFlowFormat(masterTree, maxLevels);
      return this.applyDagreLayout(mindMapData);

    } catch (error) {
      console.error("Mind map generation error:", error);
      return this.createFallbackMindMap(userQuery);
    }
  }

  private async semanticChunking(content: string): Promise<string[]> {
    try {
      await this.enforceRateLimit();
      const prompt = `Analyze the following text. Your task is to split it into an array of strings, where each string is a thematically self-contained paragraph or section. The output must be a valid JSON array of strings.

Text:
${content.substring(0, 8000)}`;
      const result = await generateText({
        model: google("gemini-2.0-flash-lite"),
        prompt, maxTokens: 1500, temperature: 0.3,
      });
      try {
        const chunks = JSON.parse(result.text);
        return Array.isArray(chunks) ? chunks.slice(0, 8) : this.fallbackChunking(content);
      } catch { return this.fallbackChunking(content); }
    } catch (error) {
      console.error("Semantic chunking error:", error);
      return this.fallbackChunking(content);
    }
  }

  private fallbackChunking(content: string): string[] {
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 20);
    const chunks: string[] = []; let currentChunk = "";
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > 300 && currentChunk) {
        chunks.push(currentChunk.trim()); currentChunk = sentence;
      } else { currentChunk += sentence + ". "; }
    }
    if (currentChunk) { chunks.push(currentChunk.trim()); }
    return chunks.slice(0, 6);
  }

  private async generateAtomicTree(chunk: string, context: string): Promise<HierarchicalNode> {
    try {
      await this.enforceRateLimit();
      const prompt = `Analyze the following text chunk. Your task is to create a hierarchical summary as a 3-level deep JSON object.
The root of the JSON should be the single, most important concept in the chunk.
Its children should be the primary supporting ideas or components.
Their children should be specific examples, data points, or details.
For EVERY parent-child connection, you MUST define the connection by including a 'relationship' key with a descriptive string like 'is caused by', 'leads to', 'is an example of', 'is composed of', 'has the property of'.
The output format MUST be a single JSON object with the following recursive structure: { "label": "Node Title", "relationship": "...", "children": [ ... ] }. The root node's relationship can be 'is the central topic of'.
Text chunk:
${chunk.substring(0, 1500)}`;
      const result = await generateText({
        model: google("gemini-2.0-flash-lite"),
        prompt, maxTokens: 1200, temperature: 0.4,
      });
      try {
        const tree = JSON.parse(result.text);
        return this.normalizeTree(tree, chunk);
      } catch { return this.createSimpleTree(chunk); }
    } catch (error) {
      console.error("Atomic tree generation error:", error);
      return this.createSimpleTree(chunk);
    }
  }

  private normalizeTree(tree: any, fallbackLabel: string): HierarchicalNode {
    const generateId = () => Math.random().toString(36).substr(2, 9);
    const normalize = (node: any, level: number = 1): HierarchicalNode => ({
      id: generateId(),
      label: (node.label || fallbackLabel), // Keep original label length here, truncate in convertToReactFlowFormat
      relationship: node.relationship || "relates to",
      level,
      nodeType: node.nodeType || "concept",
      children: (node.children || []).slice(0, 4).map((child: any) => normalize(child, level + 1)),
    });
    return normalize(tree);
  }

  private createSimpleTree(content: string): HierarchicalNode {
    const generateId = () => Math.random().toString(36).substr(2, 9);
    return {
      id: generateId(),
      label: content, // Keep original label length here
      relationship: "describes", level: 1, nodeType: "concept", children: [],
    };
  }

  private cloneNode(node: HierarchicalNode): HierarchicalNode {
    return JSON.parse(JSON.stringify(node));
  }

  private reLevelChildren(node: HierarchicalNode, currentLevel: number): void {
    node.level = currentLevel;
    if (node.children) {
      for (const child of node.children) {
        this.reLevelChildren(child, currentLevel + 1);
      }
    }
  }

  private truncateTree(node: HierarchicalNode, maxDepth: number, currentDepth = 0): any {
    if (currentDepth >= maxDepth) {
      return { label: node.label };
    }
    return {
      label: node.label,
      children: node.children.map(child => this.truncateTree(child, maxDepth, currentDepth + 1)),
    };
  }

  private getNodeByPath(tree: HierarchicalNode, path: string): HierarchicalNode | null {
    if (path === "root") return tree;
    const parts = path.replace(/^root\./, "").split(".");
    let currentNode: HierarchicalNode | null = tree;
    for (const part of parts) {
      if (!currentNode) return null;
      const match = part.match(/children\[(\d+)\]/);
      if (match && currentNode.children) {
        const index = parseInt(match[1], 10);
        if (index < currentNode.children.length) {
          currentNode = currentNode.children[index];
        } else { return null; }
      } else { return null; }
    }
    return currentNode;
  }

  private async findAnchorAndGraft(masterTree: HierarchicalNode, partialTree: HierarchicalNode): Promise<HierarchicalNode> {
    await this.enforceRateLimit();
    const masterTreeForPrompt = this.truncateTree(masterTree, 3);
    const partialTreeForPrompt = this.truncateTree(partialTree, 2);

    const prompt = `"You are a knowledge graph architect. Here is a 'Master Tree' and a 'Partial Tree'. Which node in the Master Tree is the most semantically related to the root of the Partial Tree?

Respond ONLY with the JSON path to the best-fit node in the Master Tree (e.g., 'root', 'root.children[0]', 'root.children[0].children[1]'). If there is no good fit, respond with 'ROOT'.

Master Tree:
${JSON.stringify(masterTreeForPrompt, null, 2)}

Partial Tree:
${JSON.stringify(partialTreeForPrompt, null, 2)}"`;

    try {
      const result = await generateText({
        model: google("gemini-2.0-flash-lite"),
        prompt, maxTokens: 200, temperature: 0.3,
      });
      const path = result.text.trim();
      let anchorNode = path === "ROOT" ? masterTree : this.getNodeByPath(masterTree, path);
      if (!anchorNode) { anchorNode = masterTree; }
      if (!anchorNode.children) { anchorNode.children = []; }
      anchorNode.children.push(partialTree);
      this.reLevelChildren(partialTree, anchorNode.level + 1);
    } catch (error) {
      console.error("Error during AI call in findAnchorAndGraft or path parsing:", error);
      if (!masterTree.children) masterTree.children = [];
      masterTree.children.push(partialTree);
      this.reLevelChildren(partialTree, masterTree.level + 1);
    }
    return masterTree;
  }

  private async mergeTrees(atomicTrees: HierarchicalNode[], userQuery: string): Promise<HierarchicalNode> {
    if (atomicTrees.length === 0) {
      return {
        id: "root", label: userQuery, relationship: "is the central topic of",
        level: 0, nodeType: "concept", children: [],
      };
    }
    let masterTree = this.cloneNode(atomicTrees[0]);
    masterTree.id = "root";
    masterTree.label = userQuery; // Keep full userQuery for root label, truncate in convertToReactFlowFormat
    masterTree.relationship = "is the central topic of";
    this.reLevelChildren(masterTree, 0);

    for (let i = 1; i < atomicTrees.length; i++) {
      if (atomicTrees[i]) {
        const partialTree = this.cloneNode(atomicTrees[i]);
        masterTree = await this.findAnchorAndGraft(masterTree, partialTree);
      }
    }
    return masterTree;
  }

  private convertToReactFlowFormat(tree: HierarchicalNode, maxLevels: number): MindMapData {
    const nodes: MindMapNode[] = [];
    const edges: MindMapEdge[] = [];
    const MAX_LABEL_LENGTH = 70;
    const MAX_RELATIONSHIP_LENGTH = 50;

    const traverse = (node: HierarchicalNode, parentId?: string) => {
      if (node.level > maxLevels) return;

      const truncatedLabel = node.label.length > MAX_LABEL_LENGTH
                             ? node.label.substring(0, MAX_LABEL_LENGTH) + '...'
                             : node.label;

      const mindMapNode: MindMapNode = {
        id: node.id,
        position: { x: 0, y: 0 },
        data: {
          label: truncatedLabel,
          level: node.level,
          summary: node.summary,
          nodeType: node.nodeType
        },
        style: this.getNodeStyle(node.level, node.nodeType),
      };
      nodes.push(mindMapNode);

      if (parentId) {
        const truncatedRelationship = node.relationship.length > MAX_RELATIONSHIP_LENGTH
                                      ? node.relationship.substring(0, MAX_RELATIONSHIP_LENGTH) + '...'
                                      : node.relationship;
        const edge: MindMapEdge = {
          id: `edge-${parentId}-${node.id}`,
          source: parentId,
          target: node.id,
          label: truncatedRelationship,
          animated: node.level <= 2,
          style: this.getEdgeStyle(node.level),
          labelStyle: this.getEdgeLabelStyle(node.level),
        };
        edges.push(edge);
      }
      node.children.forEach((child) => traverse(child, node.id));
    };

    traverse(tree);

    // Node Limit Pruning
    const MAX_NODES = 150;
    if (nodes.length > MAX_NODES) {
      const sortedNodesByLevel = nodes.slice().sort((a, b) => b.data.level - a.data.level);
      const nodesToRemove = new Set<string>();
      let numNodesToKeep = nodes.length;

      for (const node of sortedNodesByLevel) {
        if (numNodesToKeep <= MAX_NODES) break;
        if (node.data.level === 0) continue; // Never remove the root node
        nodesToRemove.add(node.id);
        numNodesToKeep--;
      }

      const finalNodes = nodes.filter(node => !nodesToRemove.has(node.id));
      const finalEdges = edges.filter(edge => !nodesToRemove.has(edge.source) && !nodesToRemove.has(edge.target));

      return { nodes: finalNodes, edges: finalEdges };
    }

    return { nodes, edges };
  }

  private getNodeStyle(level: number, nodeType?: string) {
    const baseStyle = { borderRadius: "12px", padding: "12px 16px", fontSize: "14px", fontWeight: "500", border: "2px solid" };
    switch (level) {
      case 0: return { ...baseStyle, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", borderColor: "#4c63d2", fontSize: "16px", fontWeight: "600", padding: "16px 20px" };
      case 1: return { ...baseStyle, background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", color: "white", borderColor: "#e91e63", fontSize: "15px", fontWeight: "600" };
      case 2: return { ...baseStyle, background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", color: "white", borderColor: "#2196f3" };
      case 3: return { ...baseStyle, background: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)", color: "#333", borderColor: "#4dd0e1", fontSize: "13px" };
      default: return { ...baseStyle, background: "rgba(255, 255, 255, 0.9)", color: "#666", borderColor: "#e0e0e0", fontSize: "12px" };
    }
  }

  private getEdgeStyle(level: number) {
    const strokeWidth = Math.max(3 - level * 0.5, 1); const opacity = Math.max(1 - level * 0.1, 0.6);
    return { stroke: level <= 1 ? "#667eea" : level <= 2 ? "#f093fb" : "#4facfe", strokeWidth: `${strokeWidth}px`, opacity: opacity.toString() };
  }

  private getEdgeLabelStyle(level: number) {
    return { fill: "#666", fontWeight: level <= 1 ? "600" : "500", fontSize: level <= 1 ? "12px" : "11px" };
  }

  private applyDagreLayout(mindMapData: MindMapData): MindMapData {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: "TB", nodesep: 100, ranksep: 150, marginx: 50, marginy: 50 });
    mindMapData.nodes.forEach((node) => {
      const width = Math.max(node.data.label.length * 8 + 40, 120); const height = 60; // Approximate width
      dagreGraph.setNode(node.id, { width, height });
    });
    mindMapData.edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));
    dagre.layout(dagreGraph);
    const nodesWithLayout = mindMapData.nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return { ...node, position: { x: nodeWithPosition.x - nodeWithPosition.width / 2, y: nodeWithPosition.y - nodeWithPosition.height / 2 } };
    });
    return { nodes: nodesWithLayout, edges: mindMapData.edges };
  }

  async expandNode(nodeId: string, currentMindMap: MindMapData, context: string): Promise<{ newNodes: MindMapNode[]; newEdges: MindMapEdge[] }> {
    try {
      if (!this.apiKey) return { newNodes: [], newEdges: [] };
      const targetNode = currentMindMap.nodes.find((n) => n.id === nodeId);
      if (!targetNode) return { newNodes: [], newEdges: [] };
      await this.enforceRateLimit();
      const prompt = `Generate 2-4 sub-concepts for the mind map node "${targetNode.data.label}" in the context of "${context}".
Return a JSON array of objects with this structure:
[ { "label": "Sub-concept name (max 40 chars)", "relationship": "relationship to parent", "nodeType": "concept|detail|example" } ]`;
      const result = await generateText({ model: google("gemini-2.0-flash-lite"), prompt, maxTokens: 800, temperature: 0.6 });
      try {
        const expansions = JSON.parse(result.text); const newNodes: MindMapNode[] = []; const newEdges: MindMapEdge[] = [];
        expansions.slice(0, 4).forEach((expansion: any, index: number) => {
          const newNodeId = `${nodeId}-child-${index}`;
          const newNode: MindMapNode = {
            id: newNodeId, position: { x: targetNode.position.x + (index - 1.5) * 200, y: targetNode.position.y + 150 },
            data: { label: expansion.label || `Sub-concept ${index + 1}`, level: targetNode.data.level + 1, nodeType: expansion.nodeType || "concept" },
            style: this.getNodeStyle(targetNode.data.level + 1, expansion.nodeType),
          };
          const newEdge: MindMapEdge = {
            id: `edge-${nodeId}-${newNodeId}`, source: nodeId, target: newNodeId, label: expansion.relationship || "relates to", animated: true,
            style: this.getEdgeStyle(targetNode.data.level + 1), labelStyle: this.getEdgeLabelStyle(targetNode.data.level + 1),
          };
          newNodes.push(newNode); newEdges.push(newEdge);
        });
        return { newNodes, newEdges };
      } catch { return { newNodes: [], newEdges: [] }; }
    } catch (error) {
      console.error("Node expansion error:", error);
      return { newNodes: [], newEdges: [] };
    }
  }

  private createFallbackMindMap(userQuery: string): MindMapData {
    const nodes: MindMapNode[] = [
      { id: "root", position: { x: 0, y: 0 }, data: { label: userQuery.substring(0, 70) + (userQuery.length > 70 ? '...' : ''), level: 0, nodeType: "concept" }, style: this.getNodeStyle(0) },
      { id: "concept1", position: { x: -250, y: 150 }, data: { label: "Key Concepts", level: 1, nodeType: "concept" }, style: this.getNodeStyle(1) },
      { id: "concept2", position: { x: 0, y: 150 }, data: { label: "Main Findings", level: 1, nodeType: "concept" }, style: this.getNodeStyle(1) },
      { id: "concept3", position: { x: 250, y: 150 }, data: { label: "Applications", level: 1, nodeType: "concept" }, style: this.getNodeStyle(1) },
    ];
    const edges: MindMapEdge[] = [
      { id: "edge-root-concept1", source: "root", target: "concept1", label: "explores", animated: true, style: this.getEdgeStyle(1), labelStyle: this.getEdgeLabelStyle(1) },
      { id: "edge-root-concept2", source: "root", target: "concept2", label: "reveals", animated: true, style: this.getEdgeStyle(1), labelStyle: this.getEdgeLabelStyle(1) },
      { id: "edge-root-concept3", source: "root", target: "concept3", label: "leads to", animated: true, style: this.getEdgeStyle(1), labelStyle: this.getEdgeLabelStyle(1) },
    ];
    return { nodes, edges };
  }

  async generateSimpleMindMap(topic: string, concepts: string[]): Promise<MindMapData> {
    const nodes: MindMapNode[] = [{ id: "root", position: { x: 0, y: 0 }, data: { label: topic.substring(0, 70) + (topic.length > 70 ? '...' : ''), level: 0, nodeType: "concept" }, style: this.getNodeStyle(0) }];
    const edges: MindMapEdge[] = [];
    concepts.slice(0, 6).forEach((concept, index) => {
      const angle = index * 60 * (Math.PI / 180); const radius = 200;
      const x = Math.cos(angle) * radius; const y = Math.sin(angle) * radius;
      const nodeId = `concept-${index}`;
      nodes.push({
        id: nodeId, position: { x, y }, data: { label: concept.substring(0, 40) + (concept.length > 40 ? '...' : ''), level: 1, nodeType: "concept" }, style: this.getNodeStyle(1),
      });
      edges.push({
        id: `edge-root-${nodeId}`, source: "root", target: nodeId, label: "includes", animated: true, style: this.getEdgeStyle(1), labelStyle: this.getEdgeLabelStyle(1),
      });
    });
    return { nodes, edges };
  }
}

// =====================================================================================
// EXPORT SINGLETON INSTANCE
// =====================================================================================

export const mindMapService = new MindMapService();
