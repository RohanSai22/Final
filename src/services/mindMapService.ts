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
        console.warn("Google AI API key not found for Mind Map Service");
        return;
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

      // Step 1: Semantic chunking
      const chunks = await this.semanticChunking(content);

      // Step 2: Generate atomic trees for each chunk
      const atomicTrees = await Promise.all(
        chunks
          .slice(0, 5)
          .map((chunk) => this.generateAtomicTree(chunk, userQuery))
      );

      // Step 3: Merge trees into master hierarchical structure
      const masterTree = await this.mergeTrees(atomicTrees, userQuery);

      // Step 4: Convert to React Flow format with proper layout
      const mindMapData = this.convertToReactFlowFormat(masterTree, maxLevels);

      // Step 5: Apply automatic layout
      return this.applyDagreLayout(mindMapData);
    } catch (error) {
      console.error("Mind map generation error:", error);
      return this.createFallbackMindMap(userQuery);
    }
  }

  /**
   * Semantic chunking of content
   */
  private async semanticChunking(content: string): Promise<string[]> {
    try {
      await this.enforceRateLimit();

      const prompt = `Analyze the following research content and split it into thematically coherent sections. 
Each section should focus on a single main concept or topic. Return ONLY a JSON array of strings.

Content to analyze:
${content.substring(0, 3000)}`;

      const result = await generateText({
        model: google("gemini-2.0-flash-lite"),
        prompt,
        maxTokens: 1500,
        temperature: 0.3,
      });

      try {
        const chunks = JSON.parse(result.text);
        return Array.isArray(chunks)
          ? chunks.slice(0, 8)
          : this.fallbackChunking(content);
      } catch {
        return this.fallbackChunking(content);
      }
    } catch (error) {
      console.error("Semantic chunking error:", error);
      return this.fallbackChunking(content);
    }
  }

  /**
   * Fallback chunking method
   */
  private fallbackChunking(content: string): string[] {
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 20);
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > 300 && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence + ". ";
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.slice(0, 6);
  }

  /**
   * Generate atomic tree for a content chunk
   */
  private async generateAtomicTree(
    chunk: string,
    context: string
  ): Promise<HierarchicalNode> {
    try {
      await this.enforceRateLimit();

      const prompt = `Create a hierarchical mind map structure for the following content chunk in the context of "${context}".

Generate a JSON object with this exact structure:
{
  "label": "Main concept (max 50 chars)",
  "relationship": "describes|explains|demonstrates|leads to|causes|results in",
  "nodeType": "concept|detail|example",
  "children": [
    {
      "label": "Sub-concept (max 40 chars)",
      "relationship": "relationship phrase",
      "nodeType": "concept|detail|example", 
      "children": [
        {
          "label": "Specific detail (max 30 chars)",
          "relationship": "relationship phrase",
          "nodeType": "detail|example",
          "children": []
        }
      ]
    }
  ]
}

Content chunk:
${chunk.substring(0, 800)}`;

      const result = await generateText({
        model: google("gemini-2.0-flash-lite"),
        prompt,
        maxTokens: 1200,
        temperature: 0.4,
      });

      try {
        const tree = JSON.parse(result.text);
        return this.normalizeTree(tree, chunk);
      } catch {
        return this.createSimpleTree(chunk);
      }
    } catch (error) {
      console.error("Atomic tree generation error:", error);
      return this.createSimpleTree(chunk);
    }
  }

  /**
   * Normalize tree structure
   */
  private normalizeTree(tree: any, fallbackLabel: string): HierarchicalNode {
    const generateId = () => Math.random().toString(36).substr(2, 9);

    const normalize = (node: any, level: number = 1): HierarchicalNode => {
      return {
        id: generateId(),
        label: (node.label || fallbackLabel).substring(0, 50),
        relationship: node.relationship || "relates to",
        level,
        nodeType: node.nodeType || "concept",
        children: (node.children || [])
          .slice(0, 4)
          .map((child: any) => normalize(child, level + 1)),
      };
    };

    return normalize(tree);
  }

  /**
   * Create simple fallback tree
   */
  private createSimpleTree(content: string): HierarchicalNode {
    const generateId = () => Math.random().toString(36).substr(2, 9);

    return {
      id: generateId(),
      label: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
      relationship: "describes",
      level: 1,
      nodeType: "concept",
      children: [],
    };
  }

  /**
   * Merge multiple atomic trees
   */
  private async mergeTrees(
    atomicTrees: HierarchicalNode[],
    userQuery: string
  ): Promise<HierarchicalNode> {
    if (atomicTrees.length === 0) {
      return {
        id: "root",
        label: userQuery,
        relationship: "is the central topic of",
        level: 0,
        nodeType: "concept",
        children: [],
      };
    }

    // Create root node
    const masterTree: HierarchicalNode = {
      id: "root",
      label: userQuery.substring(0, 50),
      relationship: "is the central topic of",
      level: 0,
      nodeType: "concept",
      children: atomicTrees.slice(0, 6).map((tree) => ({
        ...tree,
        level: 1,
      })),
    };

    return masterTree;
  }

  /**
   * Convert hierarchical tree to React Flow format
   */
  private convertToReactFlowFormat(
    tree: HierarchicalNode,
    maxLevels: number
  ): MindMapData {
    const nodes: MindMapNode[] = [];
    const edges: MindMapEdge[] = [];

    const traverse = (node: HierarchicalNode, parentId?: string) => {
      if (node.level > maxLevels) return;

      // Create node
      const mindMapNode: MindMapNode = {
        id: node.id,
        position: { x: 0, y: 0 }, // Will be set by layout algorithm
        data: {
          label: node.label,
          level: node.level,
          summary: node.summary,
          nodeType: node.nodeType,
        },
        style: this.getNodeStyle(node.level, node.nodeType),
      };

      nodes.push(mindMapNode);

      // Create edge if has parent
      if (parentId) {
        const edge: MindMapEdge = {
          id: `edge-${parentId}-${node.id}`,
          source: parentId,
          target: node.id,
          label: node.relationship,
          animated: node.level <= 2,
          style: this.getEdgeStyle(node.level),
          labelStyle: this.getEdgeLabelStyle(node.level),
        };

        edges.push(edge);
      }

      // Process children
      node.children.forEach((child) => {
        traverse(child, node.id);
      });
    };

    traverse(tree);

    return { nodes, edges };
  }

  /**
   * Get node styling based on level and type
   */
  private getNodeStyle(level: number, nodeType?: string) {
    const baseStyle = {
      borderRadius: "12px",
      padding: "12px 16px",
      fontSize: "14px",
      fontWeight: "500",
      border: "2px solid",
    };

    switch (level) {
      case 0: // Root
        return {
          ...baseStyle,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          borderColor: "#4c63d2",
          fontSize: "16px",
          fontWeight: "600",
          padding: "16px 20px",
        };
      case 1: // Primary concepts
        return {
          ...baseStyle,
          background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
          color: "white",
          borderColor: "#e91e63",
          fontSize: "15px",
          fontWeight: "600",
        };
      case 2: // Secondary concepts
        return {
          ...baseStyle,
          background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          color: "white",
          borderColor: "#2196f3",
        };
      case 3: // Details
        return {
          ...baseStyle,
          background: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
          color: "#333",
          borderColor: "#4dd0e1",
          fontSize: "13px",
        };
      default: // Deep details
        return {
          ...baseStyle,
          background: "rgba(255, 255, 255, 0.9)",
          color: "#666",
          borderColor: "#e0e0e0",
          fontSize: "12px",
        };
    }
  }

  /**
   * Get edge styling based on level
   */
  private getEdgeStyle(level: number) {
    const strokeWidth = Math.max(3 - level * 0.5, 1);
    const opacity = Math.max(1 - level * 0.1, 0.6);

    return {
      stroke: level <= 1 ? "#667eea" : level <= 2 ? "#f093fb" : "#4facfe",
      strokeWidth: `${strokeWidth}px`,
      opacity: opacity.toString(),
    };
  }

  /**
   * Get edge label styling
   */
  private getEdgeLabelStyle(level: number) {
    return {
      fill: "#666",
      fontWeight: level <= 1 ? "600" : "500",
      fontSize: level <= 1 ? "12px" : "11px",
    };
  }

  /**
   * Apply Dagre layout algorithm
   */
  private applyDagreLayout(mindMapData: MindMapData): MindMapData {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({
      rankdir: "TB",
      nodesep: 100,
      ranksep: 150,
      marginx: 50,
      marginy: 50,
    });

    // Add nodes to dagre
    mindMapData.nodes.forEach((node) => {
      const width = Math.max(node.data.label.length * 8 + 40, 120);
      const height = 60;
      dagreGraph.setNode(node.id, { width, height });
    });

    // Add edges to dagre
    mindMapData.edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    // Calculate layout
    dagre.layout(dagreGraph);

    // Apply positions to nodes
    const nodesWithLayout = mindMapData.nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - nodeWithPosition.width / 2,
          y: nodeWithPosition.y - nodeWithPosition.height / 2,
        },
      };
    });

    return {
      nodes: nodesWithLayout,
      edges: mindMapData.edges,
    };
  }

  /**
   * Expand mind map node (for progressive disclosure)
   */
  async expandNode(
    nodeId: string,
    currentMindMap: MindMapData,
    context: string
  ): Promise<{ newNodes: MindMapNode[]; newEdges: MindMapEdge[] }> {
    try {
      if (!this.apiKey) {
        return { newNodes: [], newEdges: [] };
      }

      const targetNode = currentMindMap.nodes.find((n) => n.id === nodeId);
      if (!targetNode) {
        return { newNodes: [], newEdges: [] };
      }

      await this.enforceRateLimit();

      const prompt = `Generate 2-4 sub-concepts for the mind map node "${targetNode.data.label}" in the context of "${context}".

Return a JSON array of objects with this structure:
[
  {
    "label": "Sub-concept name (max 40 chars)",
    "relationship": "relationship to parent",
    "nodeType": "concept|detail|example"
  }
]`;

      const result = await generateText({
        model: google("gemini-2.0-flash-lite"),
        prompt,
        maxTokens: 800,
        temperature: 0.6,
      });

      try {
        const expansions = JSON.parse(result.text);
        const newNodes: MindMapNode[] = [];
        const newEdges: MindMapEdge[] = [];

        expansions.slice(0, 4).forEach((expansion: any, index: number) => {
          const newNodeId = `${nodeId}-child-${index}`;

          const newNode: MindMapNode = {
            id: newNodeId,
            position: {
              x: targetNode.position.x + (index - 1.5) * 200,
              y: targetNode.position.y + 150,
            },
            data: {
              label: expansion.label || `Sub-concept ${index + 1}`,
              level: targetNode.data.level + 1,
              nodeType: expansion.nodeType || "concept",
            },
            style: this.getNodeStyle(
              targetNode.data.level + 1,
              expansion.nodeType
            ),
          };

          const newEdge: MindMapEdge = {
            id: `edge-${nodeId}-${newNodeId}`,
            source: nodeId,
            target: newNodeId,
            label: expansion.relationship || "relates to",
            animated: true,
            style: this.getEdgeStyle(targetNode.data.level + 1),
            labelStyle: this.getEdgeLabelStyle(targetNode.data.level + 1),
          };

          newNodes.push(newNode);
          newEdges.push(newEdge);
        });

        return { newNodes, newEdges };
      } catch {
        return { newNodes: [], newEdges: [] };
      }
    } catch (error) {
      console.error("Node expansion error:", error);
      return { newNodes: [], newEdges: [] };
    }
  }

  /**
   * Create fallback mind map when AI generation fails
   */
  private createFallbackMindMap(userQuery: string): MindMapData {
    const nodes: MindMapNode[] = [
      {
        id: "root",
        position: { x: 0, y: 0 },
        data: {
          label: userQuery.substring(0, 50),
          level: 0,
          nodeType: "concept",
        },
        style: this.getNodeStyle(0),
      },
      {
        id: "concept1",
        position: { x: -250, y: 150 },
        data: {
          label: "Key Concepts",
          level: 1,
          nodeType: "concept",
        },
        style: this.getNodeStyle(1),
      },
      {
        id: "concept2",
        position: { x: 0, y: 150 },
        data: {
          label: "Main Findings",
          level: 1,
          nodeType: "concept",
        },
        style: this.getNodeStyle(1),
      },
      {
        id: "concept3",
        position: { x: 250, y: 150 },
        data: {
          label: "Applications",
          level: 1,
          nodeType: "concept",
        },
        style: this.getNodeStyle(1),
      },
    ];

    const edges: MindMapEdge[] = [
      {
        id: "edge-root-concept1",
        source: "root",
        target: "concept1",
        label: "explores",
        animated: true,
        style: this.getEdgeStyle(1),
        labelStyle: this.getEdgeLabelStyle(1),
      },
      {
        id: "edge-root-concept2",
        source: "root",
        target: "concept2",
        label: "reveals",
        animated: true,
        style: this.getEdgeStyle(1),
        labelStyle: this.getEdgeLabelStyle(1),
      },
      {
        id: "edge-root-concept3",
        source: "root",
        target: "concept3",
        label: "leads to",
        animated: true,
        style: this.getEdgeStyle(1),
        labelStyle: this.getEdgeLabelStyle(1),
      },
    ];

    return { nodes, edges };
  }

  /**
   * Generate mind map from simple text input
   */
  async generateSimpleMindMap(
    topic: string,
    concepts: string[]
  ): Promise<MindMapData> {
    const nodes: MindMapNode[] = [
      {
        id: "root",
        position: { x: 0, y: 0 },
        data: {
          label: topic.substring(0, 50),
          level: 0,
          nodeType: "concept",
        },
        style: this.getNodeStyle(0),
      },
    ];

    const edges: MindMapEdge[] = [];

    concepts.slice(0, 6).forEach((concept, index) => {
      const angle = index * 60 * (Math.PI / 180); // 60 degrees apart
      const radius = 200;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      const nodeId = `concept-${index}`;

      nodes.push({
        id: nodeId,
        position: { x, y },
        data: {
          label: concept.substring(0, 40),
          level: 1,
          nodeType: "concept",
        },
        style: this.getNodeStyle(1),
      });

      edges.push({
        id: `edge-root-${nodeId}`,
        source: "root",
        target: nodeId,
        label: "includes",
        animated: true,
        style: this.getEdgeStyle(1),
        labelStyle: this.getEdgeLabelStyle(1),
      });
    });

    return { nodes, edges };
  }
}

// =====================================================================================
// EXPORT SINGLETON INSTANCE
// =====================================================================================

export const mindMapService = new MindMapService();
