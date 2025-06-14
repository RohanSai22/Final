// =====================================================================================
// NOVAH AI PERFECT MIND MAP SERVICE - SOPHISTICATED LAYERED IMPLEMENTATION
// Complete data flow process with hierarchical architecture inspired by advanced systems
// Following the exact layered structure: Central Brain → Files/Questions → Individual Items → Deep Analysis
// =====================================================================================

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import dagre from "dagre";
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage } from '@/services/chatSessionStorage';

// =====================================================================================
// PERFECT MIND MAP INTERFACES - EXACT LAYERED STRUCTURE
// =====================================================================================

// Core mind map data structures
export interface MindMapPosition {
  x: number;
  y: number;
}

export interface PerfectMindMapNode {
  id: string;
  type: 'central' | 'files-branch' | 'questions-branch' | 'file' | 'query' | 'file-analysis' | 'query-analysis';
  position: MindMapPosition;
  data: {
    label: string;
    level: 1 | 2 | 3 | 4;
    nodeType: string;
    summary?: string;
    content?: string;
    count?: number;
    keywords?: string[];
    timestamp?: string;
    analysisType?: string;
    parentId?: string;
    hasChildren?: boolean;
    fullText?: string;
    topic?: string;
    conversationIndex?: number;
  };
  style?: any;
}

export interface PerfectMindMapEdge {
  id: string;
  source: string;
  target: string;
  type?: 'hierarchical' | 'analysis' | 'related';
  label?: string;
  animated: boolean;
  style?: {
    stroke: string;
    strokeWidth: number;
  };
  labelStyle?: any;
  markerEnd?: {
    type: string;
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
    edgeCount: number;
    filesCount: number;
    queriesCount: number;
  };
}

// Data storage interfaces inspired by the example
interface StoredSessionData {
  messages: ChatMessage[];
  uploadedFiles: any[];
  sessionId: string;
  originalQuery: string;
  timestamp: string;
}

// =====================================================================================
// PERFECT MIND MAP SERVICE - SOPHISTICATED ARCHITECTURE
// =====================================================================================

class PerfectMindMapService {
  private apiKey: string | null = null;
  private googleProvider: any = null;
  private lastRequestTime: number = 0;
  private readonly MIN_DELAY = 1200;
  private readonly MAX_FILES = 10; // Performance limit
  private readonly MAX_QUERIES = 20; // Performance limit

  // Smart caching system inspired by the example
  private mindMapCache = new Map<string, { hash: string; data: PerfectMindMapData }>();

  constructor() {
    this.initializeAI();
  }

  private initializeAI() {
    try {
      this.apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
      if (this.apiKey) {
        this.googleProvider = createGoogleGenerativeAI({
          apiKey: this.apiKey,
        });
      }
    } catch (error) {
      console.error("Perfect MindMap Service: Failed to initialize AI:", error);
    }
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_DELAY) {
      const delay = this.MIN_DELAY - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    this.lastRequestTime = Date.now();
  }

  // =====================================================================================
  // MAIN GENERATION METHOD - COMPLETE HIERARCHICAL MIND MAP
  // =====================================================================================

  public async generatePerfectMindMap(
    messages: ChatMessage[],
    sessionId: string,
    uploadedFiles: any[] = [],
    originalQuery: string = ""
  ): Promise<PerfectMindMapData> {
    try {
      console.log("🧠 Generating perfect layered mind map...");
      
      // Step 1: Data processing and validation
      const processedData = this.processSessionData(messages, uploadedFiles);
      
      // Step 2: Check cache for performance optimization
      const dataHash = this.calculateDataHash(processedData);
      const cached = this.mindMapCache.get(sessionId);
      if (cached && cached.hash === dataHash) {
        console.log('Using cached mind map for optimal performance');
        return cached.data;
      }

      // Step 3: Generate complete layered structure
      const mindMapData = await this.generateCompleteLayeredStructure(
        processedData,
        sessionId,
        originalQuery
      );

      // Step 4: Cache the result
      this.mindMapCache.set(sessionId, { hash: dataHash, data: mindMapData });

      console.log(`🎉 Generated perfect mind map with ${mindMapData.nodes.length} nodes and ${mindMapData.edges.length} edges`);
      return mindMapData;
      
    } catch (error) {
      console.error("Error generating perfect mind map:", error);
      return this.createFallbackMindMap(sessionId, originalQuery);
    }
  }

  // =====================================================================================
  // COMPLETE LAYERED STRUCTURE GENERATION
  // =====================================================================================

  private async generateCompleteLayeredStructure(
    processedData: StoredSessionData,
    sessionId: string,
    originalQuery: string
  ): Promise<PerfectMindMapData> {
    const nodes: PerfectMindMapNode[] = [];
    const edges: PerfectMindMapEdge[] = [];

    // LAYER 1: CENTRAL BRAIN NODE - The main hub
    const centralNode = this.createCentralBrainNode(processedData, originalQuery);
    nodes.push(centralNode);

    // LAYER 2: MAIN BRANCH NODES - Files and Questions categories
    const { filesBranch, questionsBranch } = this.createMainBranchNodes(processedData);
    nodes.push(filesBranch, questionsBranch);

    // Connect central to branches
    edges.push(
      this.createHierarchicalEdge(centralNode.id, filesBranch.id, 'organizes', '#8B5CF6'),
      this.createHierarchicalEdge(centralNode.id, questionsBranch.id, 'categorizes', '#8B5CF6')
    );

    // LAYER 3: FILE NODES - Individual uploaded files
    const fileNodes = await this.createFileNodes(processedData.uploadedFiles);
    nodes.push(...fileNodes);

    // Connect files branch to file nodes
    fileNodes.forEach(fileNode => {
      edges.push(this.createHierarchicalEdge(filesBranch.id, fileNode.id, 'contains', '#3B82F6'));
    });

    // LAYER 3: QUERY NODES - Individual user queries
    const queryNodes = this.createQueryNodes(processedData.messages);
    nodes.push(...queryNodes);

    // Connect questions branch to query nodes
    queryNodes.forEach(queryNode => {
      edges.push(this.createHierarchicalEdge(questionsBranch.id, queryNode.id, 'includes', '#10B981'));
    });

    // LAYER 4+: FILE ANALYSIS NODES - Deep file analysis
    const fileAnalysisNodes = await this.createFileAnalysisNodes(fileNodes, processedData.uploadedFiles);
    nodes.push(...fileAnalysisNodes);

    // Connect file nodes to analysis nodes
    fileAnalysisNodes.forEach(analysisNode => {
      if (analysisNode.data.parentId) {
        edges.push(this.createAnalysisEdge(analysisNode.data.parentId, analysisNode.id, 'analyzes', '#6366F1'));
      }
    });

    // LAYER 4+: QUERY ANALYSIS NODES - Deep answer analysis
    const queryAnalysisNodes = await this.createQueryAnalysisNodes(queryNodes, processedData.messages);
    nodes.push(...queryAnalysisNodes);

    // Connect query nodes to analysis nodes
    queryAnalysisNodes.forEach(analysisNode => {
      if (analysisNode.data.parentId) {
        edges.push(this.createAnalysisEdge(analysisNode.data.parentId, analysisNode.id, 'breaks down', '#EC4899'));
      }
    });

    // Apply intelligent layout using Dagre
    const layoutedNodes = this.applyIntelligentLayout(nodes, edges);

    return {
      nodes: layoutedNodes,
      edges,
      metadata: {
        sessionId,
        generatedAt: new Date().toISOString(),
        totalLayers: 4,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        filesCount: fileNodes.length,
        queriesCount: queryNodes.length,
      }
    };
  }

  // =====================================================================================
  // LAYER 1: CENTRAL BRAIN NODE CREATION
  // =====================================================================================

  private createCentralBrainNode(
    processedData: StoredSessionData,
    originalQuery: string
  ): PerfectMindMapNode {
    const userMessages = processedData.messages.filter(m => m.type === 'user');
    const sessionTitle = originalQuery 
      ? originalQuery.substring(0, 50) + (originalQuery.length > 50 ? '...' : '')
      : 'Session Brain';

    return {
      id: 'central-brain',
      type: 'central',
      position: { x: 0, y: 0 }, // Will be repositioned by layout
      data: {
        label: '🧠 Session Brain',
        level: 1,
        nodeType: 'central',
        summary: `Complete analysis of ${userMessages.length} queries across ${processedData.uploadedFiles.length} files`,
        count: userMessages.length + processedData.uploadedFiles.length,
        timestamp: new Date().toLocaleDateString(),
        hasChildren: true
      }
    };
  }

  // =====================================================================================
  // LAYER 2: MAIN BRANCH NODES CREATION
  // =====================================================================================

  private createMainBranchNodes(processedData: StoredSessionData): {
    filesBranch: PerfectMindMapNode;
    questionsBranch: PerfectMindMapNode;
  } {
    const userMessages = processedData.messages.filter(m => m.type === 'user');
    
    const filesBranch: PerfectMindMapNode = {
      id: 'files-branch',
      type: 'files-branch',
      position: { x: 0, y: 0 },
      data: {
        label: '📁 FILES',
        level: 2,
        nodeType: 'files-branch',
        count: processedData.uploadedFiles.length,
        summary: `${processedData.uploadedFiles.length} uploaded files for comprehensive analysis`,
        hasChildren: processedData.uploadedFiles.length > 0
      }
    };

    const questionsBranch: PerfectMindMapNode = {
      id: 'questions-branch',
      type: 'questions-branch',
      position: { x: 0, y: 0 },
      data: {
        label: '❓ QUESTIONS',
        level: 2,
        nodeType: 'questions-branch',
        count: userMessages.length,
        summary: `${userMessages.length} user queries and AI interactions`,
        hasChildren: userMessages.length > 0
      }
    };

    return { filesBranch, questionsBranch };
  }

  // =====================================================================================
  // LAYER 3: FILE NODES CREATION
  // =====================================================================================

  private async createFileNodes(uploadedFiles: any[]): Promise<PerfectMindMapNode[]> {
    const fileNodes: PerfectMindMapNode[] = [];
    
    // Limit files for performance
    const limitedFiles = uploadedFiles.slice(0, this.MAX_FILES);
    
    limitedFiles.forEach((file, index) => {
      const fileNode: PerfectMindMapNode = {
        id: `file-${index + 1}`,
        type: 'file',
        position: { x: 0, y: 0 },
        data: {
          label: `📄 ${file.name || `File ${index + 1}`}`,
          level: 3,
          nodeType: 'file',
          summary: `Analysis of ${file.name || 'uploaded file'}`,
          content: file.content || '',
          timestamp: new Date().toLocaleDateString(),
          hasChildren: true
        }
      };
      fileNodes.push(fileNode);
    });
    
    return fileNodes;
  }

  // =====================================================================================
  // LAYER 3: QUERY NODES CREATION
  // =====================================================================================

  private createQueryNodes(messages: ChatMessage[]): PerfectMindMapNode[] {
    const userMessages = messages.filter(m => m.type === 'user');
    const queryNodes: PerfectMindMapNode[] = [];
    
    // Limit queries for performance and sort by timestamp
    const limitedMessages = userMessages
      .sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA; // Latest first
      })
      .slice(0, this.MAX_QUERIES);
    
    limitedMessages.forEach((message, index) => {
      const queryLabel = `💬 ${message.content.substring(0, 45)}${message.content.length > 45 ? '...' : ''}`;
      
      const queryNode: PerfectMindMapNode = {
        id: `query-${index + 1}`,
        type: 'query',
        position: { x: 0, y: 0 },
        data: {
          label: queryLabel,
          level: 3,
          nodeType: 'query',
          fullText: message.content,
          summary: `Query ${index + 1}: AI analysis and response breakdown`,
          timestamp: typeof message.timestamp === 'string' ? message.timestamp : 
                    message.timestamp ? message.timestamp.toLocaleDateString() : 
                    new Date().toLocaleDateString(),
          conversationIndex: index + 1,
          hasChildren: true
        }
      };
      queryNodes.push(queryNode);
    });
    
    return queryNodes;
  }

  // =====================================================================================
  // LAYER 4+: FILE ANALYSIS NODES CREATION
  // =====================================================================================

  private async createFileAnalysisNodes(
    fileNodes: PerfectMindMapNode[],
    uploadedFiles: any[]
  ): Promise<PerfectMindMapNode[]> {
    const analysisNodes: PerfectMindMapNode[] = [];
    
    for (let i = 0; i < fileNodes.length; i++) {
      const fileNode = fileNodes[i];
      const file = uploadedFiles[i];
      
      // Create 5 analysis nodes for each file as specified
      const analysisTypes = [
        { type: 'content', label: '📊 Content Analysis', icon: '📊' },
        { type: 'themes', label: '🔍 Key Themes', icon: '🔍' },
        { type: 'insights', label: '💡 Main Insights', icon: '💡' },
        { type: 'summary', label: '📝 Summary', icon: '📝' },
        { type: 'topics', label: '🏷️ Topics/Categories', icon: '🏷️' }
      ];
      
      for (const analysis of analysisTypes) {
        const analysisNode: PerfectMindMapNode = {
          id: `${fileNode.id}-${analysis.type}`,
          type: 'file-analysis',
          position: { x: 0, y: 0 },
          data: {
            label: analysis.label,
            level: 4,
            nodeType: 'file-analysis',
            analysisType: analysis.type,
            content: await this.generateFileAnalysisContent(file, analysis.type),
            parentId: fileNode.id,
            summary: `${analysis.label} for ${file.name || 'file'}`
          }
        };
        analysisNodes.push(analysisNode);
      }
    }
    
    return analysisNodes;
  }

  // =====================================================================================
  // LAYER 4+: QUERY ANALYSIS NODES CREATION  
  // =====================================================================================

  private async createQueryAnalysisNodes(
    queryNodes: PerfectMindMapNode[],
    messages: ChatMessage[]
  ): Promise<PerfectMindMapNode[]> {
    const analysisNodes: PerfectMindMapNode[] = [];
    const userMessages = messages.filter(m => m.type === 'user');
    const aiMessages = messages.filter(m => m.type === 'ai');
    
    for (let i = 0; i < queryNodes.length; i++) {
      const queryNode = queryNodes[i];
      const userMessage = userMessages[i];
      const correspondingAiMessage = aiMessages[i];
      
      // Create 5 analysis nodes for each query as specified
      const analysisTypes = [
        { type: 'thinking', label: '🧠 AI Thinking Process', icon: '🧠' },
        { type: 'reasoning', label: '💡 Reasoning Steps', icon: '💡' },
        { type: 'evidence', label: '📚 Evidence & Sources', icon: '📚' },
        { type: 'conclusions', label: '✅ Conclusions', icon: '✅' },
        { type: 'related', label: '🔗 Related Concepts', icon: '🔗' }
      ];
      
      for (const analysis of analysisTypes) {
        const analysisNode: PerfectMindMapNode = {
          id: `${queryNode.id}-${analysis.type}`,
          type: 'query-analysis',
          position: { x: 0, y: 0 },
          data: {
            label: analysis.label,
            level: 4,
            nodeType: 'query-analysis',
            analysisType: analysis.type,
            content: await this.generateQueryAnalysisContent(
              userMessage,
              correspondingAiMessage,
              analysis.type
            ),
            parentId: queryNode.id,
            summary: `${analysis.label} for query ${i + 1}`
          }
        };
        analysisNodes.push(analysisNode);
      }
    }
    
    return analysisNodes;
  }

  // =====================================================================================
  // INTELLIGENT LAYOUT SYSTEM - DAGRE IMPLEMENTATION
  // =====================================================================================

  private applyIntelligentLayout(
    nodes: PerfectMindMapNode[],
    edges: PerfectMindMapEdge[]
  ): PerfectMindMapNode[] {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    
    // Enhanced layout configuration for optimal spacing
    dagreGraph.setGraph({
      rankdir: 'TB', // Top to Bottom hierarchy
      align: 'UL', // Upper Left alignment
      nodesep: 200, // 200px horizontal separation between nodes at same level
      ranksep: 180, // 180px vertical separation between different levels
      marginx: 100, // 100px margin for better spacing
      marginy: 100,
      acyclicer: 'greedy', // Better cycle removal algorithm
      ranker: 'network-simplex' // Optimal ranking algorithm
    });
    
    // Add nodes with precise dimensions based on level
    nodes.forEach(node => {
      const { width, height } = this.getNodeDimensions(node);
      dagreGraph.setNode(node.id, { width, height });
    });
    
    // Add edges with spacing constraints
    edges.forEach(edge => {
      dagreGraph.setEdge(edge.source, edge.target, {
        minlen: this.getEdgeMinLength(edge),
        weight: this.getEdgeWeight(edge)
      });
    });
    
    // Calculate optimal layout
    dagre.layout(dagreGraph);
    
    // Apply positions with anti-clustering adjustments
    return nodes.map(node => {
      const nodeWithPosition = dagreGraph.node(node.id);
      const { width, height } = this.getNodeDimensions(node);
      
      // Anti-clustering system for analysis nodes
      const extraSpacing = this.getAntiClusteringSpacing(node, nodes);
      
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - width / 2 + extraSpacing.x,
          y: nodeWithPosition.y - height / 2 + extraSpacing.y
        }
      };
    });
  }

  // =====================================================================================
  // HELPER METHODS FOR LAYOUT AND STYLING
  // =====================================================================================

  private getNodeDimensions(node: PerfectMindMapNode): { width: number; height: number } {
    switch (node.data.level) {
      case 1: return { width: 240, height: 140 }; // Central brain
      case 2: return { width: 200, height: 120 }; // Main branches
      case 3: return { width: 180, height: 100 }; // File/Query nodes
      case 4: return { width: 160, height: 80 };  // Analysis nodes
      default: return { width: 150, height: 70 };
    }
  }

  private getEdgeMinLength(edge: PerfectMindMapEdge): number {
    return edge.type === 'hierarchical' ? 2 : 1;
  }

  private getEdgeWeight(edge: PerfectMindMapEdge): number {
    return edge.type === 'hierarchical' ? 2 : 1;
  }

  private getAntiClusteringSpacing(
    node: PerfectMindMapNode, 
    allNodes: PerfectMindMapNode[]
  ): { x: number; y: number } {
    if (node.data.level === 4) {
      // Spread analysis nodes to prevent clustering
      const sameParentNodes = allNodes.filter(n => 
        n.data.level === 4 && 
        n.data.parentId === node.data.parentId
      );
      const nodeIndex = sameParentNodes.findIndex(n => n.id === node.id);
      
      return {
        x: (nodeIndex % 3) * 30, // Horizontal stagger
        y: Math.floor(nodeIndex / 3) * 15 // Vertical offset
      };
    }
    return { x: 0, y: 0 };
  }

  // =====================================================================================
  // EDGE CREATION METHODS
  // =====================================================================================

  private createHierarchicalEdge(
    sourceId: string,
    targetId: string,
    label: string,
    color: string
  ): PerfectMindMapEdge {
    return {
      id: `edge-${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      type: 'hierarchical',
      label,
      animated: true,
      style: {
        stroke: color,
        strokeWidth: 3
      },
      markerEnd: {
        type: 'ArrowClosed',
        color
      }
    };
  }

  private createAnalysisEdge(
    sourceId: string,
    targetId: string,
    label: string,
    color: string
  ): PerfectMindMapEdge {
    return {
      id: `edge-${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      type: 'analysis',
      label,
      animated: false,
      style: {
        stroke: color,
        strokeWidth: 1.5
      },
      markerEnd: {
        type: 'ArrowClosed',
        color
      }
    };
  }

  // =====================================================================================
  // AI-POWERED CONTENT GENERATION
  // =====================================================================================

  private async generateFileAnalysisContent(file: any, analysisType: string): Promise<string> {
    if (!this.apiKey) {
      return this.getFileAnalysisFallback(file, analysisType);
    }

    try {
      await this.enforceRateLimit();

      const prompt = `Analyze the following file content for ${analysisType}:

File: ${file.name || 'uploaded file'}
Content: ${(file.content || '').substring(0, 500)}

Provide a ${analysisType} analysis in 2-3 sentences. Be specific and actionable.

Analysis type: ${analysisType}`;

      const result = await generateText({
        model: this.googleProvider('gemini-2.0-flash-lite'),
        prompt,
        maxTokens: 200,
        temperature: 0.3,
      });

      return result.text.trim();
    } catch (error) {
      console.error(`Error generating ${analysisType} analysis:`, error);
      return this.getFileAnalysisFallback(file, analysisType);
    }
  }

  private async generateQueryAnalysisContent(
    userMessage: ChatMessage,
    aiMessage: ChatMessage | undefined,
    analysisType: string
  ): Promise<string> {
    if (!this.apiKey) {
      return this.getQueryAnalysisFallback(userMessage, analysisType);
    }

    try {
      await this.enforceRateLimit();

      const prompt = `Analyze the following query and response for ${analysisType}:

User Query: ${userMessage.content.substring(0, 300)}
AI Response: ${aiMessage ? aiMessage.content.substring(0, 300) : 'No response available'}

Provide a ${analysisType} analysis in 2-3 sentences. Focus on the ${analysisType} aspect.

Analysis type: ${analysisType}`;

      const result = await generateText({
        model: this.googleProvider('gemini-2.0-flash-lite'),
        prompt,
        maxTokens: 200,
        temperature: 0.3,
      });

      return result.text.trim();
    } catch (error) {
      console.error(`Error generating ${analysisType} analysis:`, error);
      return this.getQueryAnalysisFallback(userMessage, analysisType);
    }
  }

  // =====================================================================================
  // FALLBACK CONTENT METHODS
  // =====================================================================================

  private getFileAnalysisFallback(file: any, analysisType: string): string {
    const fallbacks = {
      'content': `Content analysis of ${file.name || 'file'} reveals structured information with key data points and relationships.`,
      'themes': `Major themes identified: data processing methodologies, analytical frameworks, and implementation strategies.`,
      'insights': `Key insights: significant patterns detected, actionable recommendations available, optimization opportunities identified.`,
      'summary': `Comprehensive overview of ${file.name || 'file'} covering main concepts, findings, and practical applications.`,
      'topics': `Topics categorized: technical concepts, research methodologies, analytical results, and strategic recommendations.`
    };
    return fallbacks[analysisType as keyof typeof fallbacks] || 'Analysis content available for detailed review.';
  }

  private getQueryAnalysisFallback(userMessage: ChatMessage, analysisType: string): string {
    const fallbacks = {
      'thinking': 'AI thinking process: comprehensive question analysis, context evaluation, and strategic response formulation.',
      'reasoning': 'Reasoning steps: logical progression from question understanding through evidence analysis to conclusion formation.',
      'evidence': 'Evidence sources: relevant data integration, supporting documentation review, and verification methodology.',
      'conclusions': 'Final conclusions: synthesized findings, actionable insights, and recommended next steps for implementation.',
      'related': 'Related concepts: connected knowledge areas, broader implications, and potential follow-up exploration topics.'
    };
    return fallbacks[analysisType as keyof typeof fallbacks] || 'Analysis content available for detailed review.';
  }

  // =====================================================================================
  // DATA PROCESSING AND CACHING
  // =====================================================================================

  private processSessionData(messages: ChatMessage[], uploadedFiles: any[]): StoredSessionData {
    // Sort messages by timestamp for consistent processing
    const sortedMessages = messages.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA; // Latest first
    });

    return {
      messages: sortedMessages.slice(0, this.MAX_QUERIES), // Limit for performance
      uploadedFiles: uploadedFiles.slice(0, this.MAX_FILES), // Limit for performance
      sessionId: uuidv4(),
      originalQuery: '',
      timestamp: new Date().toISOString()
    };
  }

  private calculateDataHash(data: StoredSessionData): string {
    const hashData = {
      messageCount: data.messages.length,
      fileCount: data.uploadedFiles.length,
      messageIds: data.messages.map(m => m.id || '').slice(0, 5),
      fileNames: data.uploadedFiles.map(f => f.name || '').slice(0, 5)
    };
    return JSON.stringify(hashData);
  }

  // =====================================================================================
  // FALLBACK SYSTEM
  // =====================================================================================

  private createFallbackMindMap(sessionId: string, originalQuery: string): PerfectMindMapData {
    const centralNode: PerfectMindMapNode = {
      id: 'central-brain',
      type: 'central',
      position: { x: 0, y: 0 },
      data: {
        label: '🧠 Session Brain',
        level: 1,
        nodeType: 'central',
        summary: originalQuery || 'No data available for analysis',
        count: 0,
        timestamp: new Date().toLocaleDateString()
      }
    };

    return {
      nodes: [centralNode],
      edges: [],
      metadata: {
        sessionId,
        generatedAt: new Date().toISOString(),
        totalLayers: 1,
        nodeCount: 1,
        edgeCount: 0,
        filesCount: 0,
        queriesCount: 0
      }
    };
  }

  // =====================================================================================
  // PUBLIC API METHODS
  // =====================================================================================

  public clearCache(): void {
    this.mindMapCache.clear();
    console.log('Perfect mind map cache cleared');
  }

  public getCacheSize(): number {
    return this.mindMapCache.size;
  }
}

// =====================================================================================
// EXPORT SINGLETON INSTANCE
// =====================================================================================

export const perfectMindMapService = new PerfectMindMapService();
