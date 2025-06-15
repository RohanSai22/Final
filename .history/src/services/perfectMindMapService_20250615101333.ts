// =====================================================================================
// COMBINED PERFECT + DYNAMIC MIND MAP SERVICE
// Layers 1-3: Perfect structured mind map
// Layers 4+: Dynamic AI-generated content
// =====================================================================================

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { v4 as uuidv4 } from "uuid";
import type { ChatMessage } from "@/services/chatSessionStorage";

// Core interfaces
export interface PerfectMindMapNode {
  id: string;
  type: "central" | "branch" | "file" | "query" | "analysis" | "dynamic";
  position: { x: number; y: number };
  data: {
    label: string;
    level: number;
    nodeType: string;
    summary: string;
    content?: string;
    fullText?: string;
    count?: number;
    keywords?: string[];
    timestamp?: string;
    parentId?: string;
    children: string[];
    geminiGenerated: boolean;
    analysisType?: string;
    fileReference?: string;
    qaReference?: string;
  };
}

export interface PerfectMindMapEdge {
  id: string;
  source: string;
  target: string;
  type: "hierarchical" | "related" | "analysis";
  label: string;
  animated: boolean;
  style: {
    stroke: string;
    strokeWidth: number;
  };
  labelStyle?: {
    fill: string;
    fontWeight: string;
  };
  markerEnd?: {
    color: string;
  };
}

export interface PerfectMindMapData {
  nodes: PerfectMindMapNode[];
  edges: PerfectMindMapEdge[];
  metadata: {
    sessionId: string;
    generatedAt: string;
    totalLayers: number;
    nodeCount: number;
    filesCount: number;
    queriesCount: number;
    dynamicLayers: number;
  };
}

interface FileInfo {
  name: string;
  content: string;
  type: string;
  size: number;
}

interface QueryInfo {
  content: string;
  type: "user" | "ai";
  timestamp: string;
}

class PerfectMindMapService {
  private apiKey: string | null = null;
  private googleProvider: any = null;
  private lastRequestTime: number = 0;
  private readonly MIN_DELAY = 1000;
  private readonly MAX_RETRIES = 3;

  constructor() {
    this.initializeAI();
  }

  private initializeAI() {
    try {
      const viteGoogleAIKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;
      const viteGoogleKey = import.meta.env.VITE_GOOGLE_API_KEY;

      this.apiKey = viteGoogleAIKey || viteGoogleKey;

      if (this.apiKey) {
        this.googleProvider = createGoogleGenerativeAI({
          apiKey: this.apiKey,
        });
        console.log(
          "🧠 Perfect Mind Map Service initialized with AI capabilities"
        );
      } else {
        console.warn(
          "⚠️ Perfect Mind Map Service: No API key found, using fallback mode"
        );
      }
    } catch (error) {
      console.error("❌ Perfect Mind Map Service initialization error:", error);
    }
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_DELAY) {
      const delay = this.MIN_DELAY - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    this.lastRequestTime = Date.now();
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retries: number = this.MAX_RETRIES
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        await this.enforceRateLimit();
        return await operation();
      } catch (error: any) {
        lastError = error;
        console.warn(`🔄 Attempt ${attempt + 1} failed:`, error.message);

        if (attempt < retries - 1) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  // Main generation method - combines perfect (layers 1-3) + dynamic (4+)
  public async generatePerfectMindMap(
    messages: ChatMessage[],
    sessionId: string,
    uploadedFiles: any[],
    originalQuery: string
  ): Promise<PerfectMindMapData> {
    console.log("🚀 Generating combined Perfect + Dynamic Mind Map...");

    const nodes: PerfectMindMapNode[] = [];
    const edges: PerfectMindMapEdge[] = [];

    // LAYER 1: Central Brain Node
    const centralNode: PerfectMindMapNode = {
      id: "central-brain",
      type: "central",
      position: { x: 400, y: 300 },
      data: {
        label: "🧠 AI Research Brain",
        level: 1,
        nodeType: "Central Hub",
        summary: "Central intelligence hub for comprehensive research analysis",
        content: originalQuery || "AI-powered research and analysis",
        children: [],
        geminiGenerated: false,
        timestamp: new Date().toLocaleString(),
      },
    };
    nodes.push(centralNode);

    // LAYER 2: Main Category Branches
    const fileBranchId = "files-branch";
    const queryBranchId = "queries-branch";

    if (uploadedFiles.length > 0) {
      const filesBranch: PerfectMindMapNode = {
        id: fileBranchId,
        type: "branch",
        position: { x: 200, y: 150 },
        data: {
          label: "📁 File Analysis",
          level: 2,
          nodeType: "File Branch",
          summary: `Analysis of ${uploadedFiles.length} uploaded files`,
          count: uploadedFiles.length,
          children: [],
          geminiGenerated: false,
        },
      };
      nodes.push(filesBranch);

      edges.push({
        id: "central-to-files",
        source: centralNode.id,
        target: fileBranchId,
        type: "hierarchical",
        label: "analyzes",
        animated: true,
        style: { stroke: "#10B981", strokeWidth: 3 },
        labelStyle: { fill: "#10B981", fontWeight: "600" },
        markerEnd: { color: "#10B981" },
      });
    }

    const userMessages = messages.filter((m) => m.type === "user");
    if (userMessages.length > 0) {
      const queriesBranch: PerfectMindMapNode = {
        id: queryBranchId,
        type: "branch",
        position: { x: 600, y: 150 },
        data: {
          label: "❓ Query Analysis",
          level: 2,
          nodeType: "Query Branch",
          summary: `Analysis of ${userMessages.length} user queries`,
          count: userMessages.length,
          children: [],
          geminiGenerated: false,
        },
      };
      nodes.push(queriesBranch);

      edges.push({
        id: "central-to-queries",
        source: centralNode.id,
        target: queryBranchId,
        type: "hierarchical",
        label: "processes",
        animated: true,
        style: { stroke: "#3B82F6", strokeWidth: 3 },
        labelStyle: { fill: "#3B82F6", fontWeight: "600" },
        markerEnd: { color: "#3B82F6" },
      });
    }

    // LAYER 3: Individual Files and Queries
    let nodeCounter = 0;
    const fileNodeIds: string[] = [];
    const queryNodeIds: string[] = [];

    // Process files (Layer 3)
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const fileNodeId = `file-${i}`;
      fileNodeIds.push(fileNodeId);

      const fileNode: PerfectMindMapNode = {
        id: fileNodeId,
        type: "file",
        position: { x: 100 + i * 200, y: 50 },
        data: {
          label: `📄 ${
            file.name.length > 20
              ? file.name.substring(0, 20) + "..."
              : file.name
          }`,
          level: 3,
          nodeType: "File",
          summary: `Analysis of ${file.name} (${(file.size / 1024).toFixed(
            1
          )}KB)`,
          content: file.content
            ? file.content.substring(0, 200) + "..."
            : "File content analysis",
          fullText: file.name,
          children: [],
          geminiGenerated: false,
          fileReference: file.name,
          timestamp: new Date().toLocaleString(),
        },
      };
      nodes.push(fileNode);

      edges.push({
        id: `files-to-file-${i}`,
        source: fileBranchId,
        target: fileNodeId,
        type: "hierarchical",
        label: "contains",
        animated: false,
        style: { stroke: "#059669", strokeWidth: 2 },
        labelStyle: { fill: "#059669", fontWeight: "500" },
        markerEnd: { color: "#059669" },
      });
    }

    // Process queries (Layer 3)
    for (let i = 0; i < userMessages.length; i++) {
      const message = userMessages[i];
      const queryNodeId = `query-${i}`;
      queryNodeIds.push(queryNodeId);

      const queryNode: PerfectMindMapNode = {
        id: queryNodeId,
        type: "query",
        position: { x: 500 + i * 200, y: 50 },
        data: {
          label: `❓ Query ${i + 1}`,
          level: 3,
          nodeType: "Query",
          summary:
            message.content.length > 50
              ? message.content.substring(0, 50) + "..."
              : message.content,
          content: message.content.substring(0, 200) + "...",
          fullText: message.content,
          children: [],
          geminiGenerated: false,
          qaReference: `query-${i}`,
          timestamp: new Date(message.timestamp || Date.now()).toLocaleString(),
        },
      };
      nodes.push(queryNode);

      edges.push({
        id: `queries-to-query-${i}`,
        source: queryBranchId,
        target: queryNodeId,
        type: "hierarchical",
        label: "includes",
        animated: false,
        style: { stroke: "#2563EB", strokeWidth: 2 },
        labelStyle: { fill: "#2563EB", fontWeight: "500" },
        markerEnd: { color: "#2563EB" },
      });
    }

    // LAYER 4+: Dynamic AI-Generated Content
    let maxDepth = 3;
    let dynamicLayers = 0;

    if (this.apiKey && this.googleProvider) {
      try {
        // Generate dynamic content for files
        for (let i = 0; i < fileNodeIds.length; i++) {
          const fileNodeId = fileNodeIds[i];
          const file = uploadedFiles[i];
          const { dynamicNodes, dynamicEdges, depth } =
            await this.generateDynamicFileAnalysis(fileNodeId, file);
          nodes.push(...dynamicNodes);
          edges.push(...dynamicEdges);
          maxDepth = Math.max(maxDepth, depth);
          dynamicLayers = Math.max(dynamicLayers, depth - 3);
        }

        // Generate dynamic content for queries
        for (let i = 0; i < queryNodeIds.length; i++) {
          const queryNodeId = queryNodeIds[i];
          const message = userMessages[i];
          const aiResponse = messages.find(
            (m) =>
              m.type === "ai" &&
              m.timestamp &&
              message.timestamp &&
              m.timestamp > message.timestamp
          );
          const { dynamicNodes, dynamicEdges, depth } =
            await this.generateDynamicQueryAnalysis(
              queryNodeId,
              message,
              aiResponse
            );
          nodes.push(...dynamicNodes);
          edges.push(...dynamicEdges);
          maxDepth = Math.max(maxDepth, depth);
          dynamicLayers = Math.max(dynamicLayers, depth - 3);
        }
      } catch (error) {
        console.error(
          "⚠️ Error generating dynamic content, using fallback:",
          error
        );
        // Add fallback dynamic content
        const fallbackDynamic = this.generateFallbackDynamicContent(
          fileNodeIds,
          queryNodeIds
        );
        nodes.push(...fallbackDynamic.nodes);
        edges.push(...fallbackDynamic.edges);
        maxDepth = 4;
        dynamicLayers = 1;
      }
    } else {
      // Fallback dynamic content when no AI available
      const fallbackDynamic = this.generateFallbackDynamicContent(
        fileNodeIds,
        queryNodeIds
      );
      nodes.push(...fallbackDynamic.nodes);
      edges.push(...fallbackDynamic.edges);
      maxDepth = 4;
      dynamicLayers = 1;
    }

    // Apply final layout optimization
    const layoutedNodes = this.optimizeLayout(nodes, edges);

    return {
      nodes: layoutedNodes,
      edges,
      metadata: {
        sessionId,
        generatedAt: new Date().toISOString(),
        totalLayers: maxDepth,
        nodeCount: nodes.length,
        filesCount: uploadedFiles.length,
        queriesCount: userMessages.length,
        dynamicLayers,
      },
    };
  }

  // Generate dynamic file analysis (Layer 4+)
  private async generateDynamicFileAnalysis(
    fileNodeId: string,
    file: any
  ): Promise<{
    dynamicNodes: PerfectMindMapNode[];
    dynamicEdges: PerfectMindMapEdge[];
    depth: number;
  }> {
    const nodes: PerfectMindMapNode[] = [];
    const edges: PerfectMindMapEdge[] = [];

    const prompt = `Analyze this file and create 3-4 specific analysis points:

File: ${file.name}
Content: ${(file.content || "").substring(0, 800)}

Create JSON with:
- analyses: Array of 3-4 analysis objects with:
  - topic: short topic name (2-3 words)
  - content: detailed analysis (2-3 sentences)
  - concepts: 2-3 related concepts for deeper analysis

JSON only:`;
    try {
      const result = await this.retryWithBackoff(async () => {
        return await generateText({
          model: this.googleProvider("gemini-2.0-flash-lite"),
          prompt,
          maxTokens: 800,
          temperature: 0.7,
        });
      }); // Clean the response to extract only JSON for file analysis
      let cleanText = result.text.trim();

      // Remove markdown code blocks
      if (cleanText.includes("```json")) {
        const jsonStart = cleanText.indexOf("```json") + 7;
        const jsonEnd = cleanText.indexOf("```", jsonStart);
        cleanText = cleanText.substring(jsonStart, jsonEnd);
      } else if (cleanText.includes("```")) {
        const firstBacktick = cleanText.indexOf("```");
        const secondBacktick = cleanText.indexOf("```", firstBacktick + 3);
        if (secondBacktick > -1) {
          cleanText = cleanText.substring(firstBacktick + 3, secondBacktick);
        }
      }

      // Remove any remaining backticks and clean up
      cleanText = cleanText.replace(/```/g, "").replace(/`/g, "").trim();

      // Find JSON object boundaries
      const jsonStart = cleanText.indexOf("{");
      const jsonEnd = cleanText.lastIndexOf("}");
      if (jsonStart > -1 && jsonEnd > -1) {
        cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
      }

      const analysis = JSON.parse(cleanText);

      // Create analysis nodes (Layer 4)
      for (let i = 0; i < (analysis.analyses || []).length; i++) {
        const analysisItem = analysis.analyses[i];
        const analysisNodeId = `${fileNodeId}-analysis-${i}`;
        const analysisNode: PerfectMindMapNode = {
          id: analysisNodeId,
          type: "analysis",
          position: { x: 0, y: 0 },
          data: {
            label: `🔍 ${analysisItem.topic}`,
            level: 4,
            nodeType: "File Analysis",
            summary: `Analysis: ${analysisItem.topic}`,
            content: `📋 Definition: ${analysisItem.topic} analysis of ${
              file.name
            }
            
📝 Description: ${analysisItem.content}

🔗 Connections: This analysis connects to the parent file through detailed examination of ${analysisItem.topic.toLowerCase()} aspects.

💡 Insights: Key findings include ${(analysisItem.concepts || []).join(", ")}`,
            fullText: analysisItem.content,
            keywords: analysisItem.concepts || [],
            children: [],
            geminiGenerated: true,
            analysisType: analysisItem.topic,
            parentId: fileNodeId,
          },
        };
        nodes.push(analysisNode);

        edges.push({
          id: `${fileNodeId}-to-analysis-${i}`,
          source: fileNodeId,
          target: analysisNodeId,
          type: "analysis",
          label: "analyzes",
          animated: false,
          style: { stroke: "#8B5CF6", strokeWidth: 2 },
          markerEnd: { color: "#8B5CF6" },
        });

        // Create concept nodes (Layer 5)
        for (let j = 0; j < (analysisItem.concepts || []).length; j++) {
          const concept = analysisItem.concepts[j];
          const conceptNodeId = `${analysisNodeId}-concept-${j}`;
          const conceptNode: PerfectMindMapNode = {
            id: conceptNodeId,
            type: "dynamic",
            position: { x: 0, y: 0 },
            data: {
              label: `💡 ${concept}`,
              level: 5,
              nodeType: "Concept",
              summary: `Concept: ${concept}`,
              content: `🎯 Definition: ${concept} is a key concept derived from ${analysisItem.topic} analysis.

📖 Description: This concept represents an important aspect identified in the file analysis.

🔗 Connections: Connected to ${analysisItem.topic} analysis and relates to the broader context of ${file.name}.

💭 Context: This concept helps understand the deeper meanings and relationships within the analyzed content.`,
              fullText: `Related concept: ${concept}`,
              children: [],
              geminiGenerated: true,
              parentId: analysisNodeId,
            },
          };
          nodes.push(conceptNode);

          edges.push({
            id: `${analysisNodeId}-to-concept-${j}`,
            source: analysisNodeId,
            target: conceptNodeId,
            type: "related",
            label: "relates to",
            animated: false,
            style: { stroke: "#EC4899", strokeWidth: 1.5 },
            markerEnd: { color: "#EC4899" },
          });
        }
      }

      return { dynamicNodes: nodes, dynamicEdges: edges, depth: 5 };
    } catch (error) {
      console.error("Error in dynamic file analysis:", error);
      return { dynamicNodes: [], dynamicEdges: [], depth: 3 };
    }
  }

  // Generate dynamic query analysis (Layer 4+)
  private async generateDynamicQueryAnalysis(
    queryNodeId: string,
    userMessage: ChatMessage,
    aiResponse?: ChatMessage
  ): Promise<{
    dynamicNodes: PerfectMindMapNode[];
    dynamicEdges: PerfectMindMapEdge[];
    depth: number;
  }> {
    const nodes: PerfectMindMapNode[] = [];
    const edges: PerfectMindMapEdge[] = [];

    const prompt = `Analyze this Q&A and create 3-4 key insights:

Question: ${userMessage.content.substring(0, 400)}
Answer: ${
      aiResponse
        ? aiResponse.content.substring(0, 400)
        : "No response available"
    }

Create JSON with:
- insights: Array of 3-4 insight objects with:
  - aspect: insight aspect name (2-3 words)
  - explanation: detailed explanation (2-3 sentences)
  - connections: 2-3 connected ideas for deeper exploration

JSON only:`;

    try {
      const result = await this.retryWithBackoff(async () => {
        return await generateText({
          model: this.googleProvider("gemini-2.0-flash-lite"),
          prompt,
          maxTokens: 800,
          temperature: 0.7,
        });
      }); // Clean the response to extract only JSON for query analysis
      let cleanText = result.text.trim();

      // Remove markdown code blocks
      if (cleanText.includes("```json")) {
        const jsonStart = cleanText.indexOf("```json") + 7;
        const jsonEnd = cleanText.indexOf("```", jsonStart);
        cleanText = cleanText.substring(jsonStart, jsonEnd);
      } else if (cleanText.includes("```")) {
        const firstBacktick = cleanText.indexOf("```");
        const secondBacktick = cleanText.indexOf("```", firstBacktick + 3);
        if (secondBacktick > -1) {
          cleanText = cleanText.substring(firstBacktick + 3, secondBacktick);
        }
      }

      // Remove any remaining backticks and clean up
      cleanText = cleanText.replace(/```/g, "").replace(/`/g, "").trim();

      // Find JSON object boundaries
      const jsonStart = cleanText.indexOf("{");
      const jsonEnd = cleanText.lastIndexOf("}");
      if (jsonStart > -1 && jsonEnd > -1) {
        cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
      }

      const analysis = JSON.parse(cleanText);

      // Create insight nodes (Layer 4)
      for (let i = 0; i < (analysis.insights || []).length; i++) {
        const insight = analysis.insights[i];
        const insightNodeId = `${queryNodeId}-insight-${i}`;
        const insightNode: PerfectMindMapNode = {
          id: insightNodeId,
          type: "analysis",
          position: { x: 0, y: 0 },
          data: {
            label: `🧠 ${insight.aspect}`,
            level: 4,
            nodeType: "Query Insight",
            summary: `Insight: ${insight.aspect}`,
            content: `🎯 Definition: ${
              insight.aspect
            } analysis of the user query.

📝 Explanation: ${insight.explanation}

🔗 Connections: This insight connects to the original query through ${insight.aspect.toLowerCase()} examination and relates to user intent understanding.

💡 Key Points: ${(insight.connections || []).join(", ")}`,
            fullText: insight.explanation,
            keywords: insight.connections || [],
            children: [],
            geminiGenerated: true,
            analysisType: insight.aspect,
            parentId: queryNodeId,
          },
        };
        nodes.push(insightNode);

        edges.push({
          id: `${queryNodeId}-to-insight-${i}`,
          source: queryNodeId,
          target: insightNodeId,
          type: "analysis",
          label: "explores",
          animated: false,
          style: { stroke: "#F59E0B", strokeWidth: 2 },
          markerEnd: { color: "#F59E0B" },
        });

        // Create connection nodes (Layer 5)
        for (let j = 0; j < (insight.connections || []).length; j++) {
          const connection = insight.connections[j];
          const connectionNodeId = `${insightNodeId}-connection-${j}`;
          const connectionNode: PerfectMindMapNode = {
            id: connectionNodeId,
            type: "dynamic",
            position: { x: 0, y: 0 },
            data: {
              label: `🔗 ${connection}`,
              level: 5,
              nodeType: "Connection",
              summary: `Connection: ${connection}`,
              content: `🎯 Definition: ${connection} represents a connected idea from the query analysis.

📖 Description: This connection shows how different aspects of the query relate to broader concepts and understanding.

🔗 Relationships: Links ${insight.aspect} to related concepts and extends the analytical depth.

💭 Context: Helps build a comprehensive understanding of the query's implications and connections.`,
              fullText: `Connected idea: ${connection}`,
              children: [],
              geminiGenerated: true,
              parentId: insightNodeId,
            },
          };
          nodes.push(connectionNode);

          edges.push({
            id: `${insightNodeId}-to-connection-${j}`,
            source: insightNodeId,
            target: connectionNodeId,
            type: "related",
            label: "connects to",
            animated: false,
            style: { stroke: "#EF4444", strokeWidth: 1.5 },
            markerEnd: { color: "#EF4444" },
          });
        }
      }

      return { dynamicNodes: nodes, dynamicEdges: edges, depth: 5 };
    } catch (error) {
      console.error("Error in dynamic query analysis:", error);
      return { dynamicNodes: [], dynamicEdges: [], depth: 3 };
    }
  }

  // Fallback dynamic content when AI is not available
  private generateFallbackDynamicContent(
    fileNodeIds: string[],
    queryNodeIds: string[]
  ): { nodes: PerfectMindMapNode[]; edges: PerfectMindMapEdge[] } {
    const nodes: PerfectMindMapNode[] = [];
    const edges: PerfectMindMapEdge[] = [];

    // Basic analysis for files
    fileNodeIds.forEach((fileNodeId, i) => {
      const analysisId = `${fileNodeId}-fallback-analysis`;
      nodes.push({
        id: analysisId,
        type: "analysis",
        position: { x: 0, y: 0 },
        data: {
          label: "🔍 Content Analysis",
          level: 4,
          nodeType: "Basic Analysis",
          summary: "Structural content analysis",
          content:
            "Basic analysis of file structure, content organization, and key elements.",
          children: [],
          geminiGenerated: false,
          parentId: fileNodeId,
        },
      });

      edges.push({
        id: `${fileNodeId}-to-fallback`,
        source: fileNodeId,
        target: analysisId,
        type: "analysis",
        label: "analyzes",
        animated: false,
        style: { stroke: "#6B7280", strokeWidth: 2 },
        markerEnd: { color: "#6B7280" },
      });
    });

    // Basic analysis for queries
    queryNodeIds.forEach((queryNodeId, i) => {
      const analysisId = `${queryNodeId}-fallback-analysis`;
      nodes.push({
        id: analysisId,
        type: "analysis",
        position: { x: 0, y: 0 },
        data: {
          label: "🧠 Response Analysis",
          level: 4,
          nodeType: "Basic Insight",
          summary: "Query response analysis",
          content:
            "Analysis of query intent, response structure, and key information provided.",
          children: [],
          geminiGenerated: false,
          parentId: queryNodeId,
        },
      });

      edges.push({
        id: `${queryNodeId}-to-fallback`,
        source: queryNodeId,
        target: analysisId,
        type: "analysis",
        label: "analyzes",
        animated: false,
        style: { stroke: "#6B7280", strokeWidth: 2 },
        markerEnd: { color: "#6B7280" },
      });
    });

    return { nodes, edges };
  }

  // Optimize layout for better visualization
  private optimizeLayout(
    nodes: PerfectMindMapNode[],
    edges: PerfectMindMapEdge[]
  ): PerfectMindMapNode[] {
    const centralNode = nodes.find((n) => n.id === "central-brain");
    if (!centralNode) return nodes;

    // Group nodes by level
    const levelGroups: { [level: number]: PerfectMindMapNode[] } = {};
    nodes.forEach((node) => {
      if (!levelGroups[node.data.level]) {
        levelGroups[node.data.level] = [];
      }
      levelGroups[node.data.level].push(node);
    });

    // Position nodes in concentric circles
    Object.keys(levelGroups).forEach((levelStr) => {
      const level = parseInt(levelStr);
      if (level === 1) return; // Central node already positioned

      const nodesInLevel = levelGroups[level];
      const radius = level * 180;
      const angleStep = (2 * Math.PI) / Math.max(nodesInLevel.length, 1);

      nodesInLevel.forEach((node, index) => {
        const angle = index * angleStep - Math.PI / 2; // Start from top
        node.position = {
          x: centralNode.position.x + Math.cos(angle) * radius,
          y: centralNode.position.y + Math.sin(angle) * radius,
        };
      });
    });

    return nodes;
  }
}

// Export the service instance
export const perfectMindMapService = new PerfectMindMapService();
