// =====================================================================================
// NOVAH AI ENHANCED MIND MAP SERVICE - HIERARCHICAL LAYERED IMPLEMENTATION
// Inspired by sophisticated mind map systems with complete data flow
// =====================================================================================

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import dagre from "dagre";
import { v4 as uuidv4 } from 'uuid';
import type { MindMapData, MindMapNode, MindMapEdge } from '@/services/autonomousResearchAgent';
import type { ChatMessage } from '@/services/chatSessionStorage';

// =====================================================================================
// ENHANCED MIND MAP INTERFACES - HIERARCHICAL STRUCTURE
// =====================================================================================

export interface CentralBrainNode {
  id: 'central-brain';
  type: 'central';
  label: string;
  position: { x: number; y: number };
  data: {
    label: string;
    type: 'central';
    level: 1;
    totalFiles: number;
    totalQueries: number;
    sessionTitle: string;
    summary: string;
    lastUpdated: string;
  };
}

export interface MainBranchNode {
  id: string; // 'files-branch' | 'questions-branch'
  type: 'main-branch';
  label: string;
  position: { x: number; y: number };
  data: {
    label: string;
    type: 'main-branch';
    level: 2;
    category: 'FILES' | 'QUESTIONS';
    count: number;
    summary: string;
  };
}

export interface FileNode {
  id: string;
  type: 'file';
  label: string;
  position: { x: number; y: number };
  data: {
    label: string;
    type: 'file';
    level: 3;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadDate: string;
    summary: string;
    hasChildren: boolean;
  };
}

export interface QueryNode {
  id: string;
  type: 'query';
  label: string;
  position: { x: number; y: number };
  data: {
    label: string;
    type: 'query';
    level: 3;
    query: string;
    timestamp: string;
    isAutonomous: boolean;
    hasChildren: boolean;
    queryIndex: number;
  };
}

export interface FileAnalysisNode {
  id: string;
  type: 'file-analysis';
  label: string;
  position: { x: number; y: number };
  data: {
    label: string;
    type: 'file-analysis';
    level: 4;
    analysisType: 'content' | 'themes' | 'insights' | 'summary' | 'topics';
    content: string;
    parentFileId: string;
  };
}

export interface QueryAnalysisNode {
  id: string;
  type: 'query-analysis';
  label: string;
  position: { x: number; y: number };
  data: {
    label: string;
    type: 'query-analysis';
    level: 4;
    analysisType: 'thinking' | 'reasoning' | 'evidence' | 'conclusions' | 'related';
    content: string;
    parentQueryId: string;
  };
}

export type EnhancedMindMapNode = 
  | CentralBrainNode 
  | MainBranchNode 
  | FileNode 
  | QueryNode 
  | FileAnalysisNode 
  | QueryAnalysisNode;

export interface EnhancedMindMapEdge {
  id: string;
  source: string;
  target: string;
  type: 'hierarchical' | 'related' | 'analysis';
  label?: string;
  animated: boolean;
  style: {
    stroke: string;
    strokeWidth: number;
  };
  markerEnd?: {
    type: string;
    color: string;
  };
}

export interface EnhancedMindMapData {
  nodes: EnhancedMindMapNode[];
  edges: EnhancedMindMapEdge[];
  metadata: {
    sessionId: string;
    generatedAt: string;
    totalLayers: number;
    nodeCount: number;
    edgeCount: number;
  };
}

// =====================================================================================
// ENHANCED MIND MAP SERVICE - SOPHISTICATED ARCHITECTURE
// =====================================================================================

class EnhancedMindMapService {
  private apiKey: string | null = null;
  private googleProvider: any = null;
  private lastRequestTime: number = 0;
  private readonly MIN_DELAY = 1200;

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
      console.error("Enhanced MindMap Service: Failed to initialize AI:", error);
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

  public async generateHierarchicalMindMap(
    messages: ChatMessage[],
    sessionId: string,
    uploadedFiles: any[] = [],
    originalQuery: string = ""
  ): Promise<EnhancedMindMapData> {
    try {
      console.log("🧠 Generating hierarchical mind map...");
      
      // Step 1: Create central brain node
      const centralNode = this.createCentralBrainNode(messages, uploadedFiles, originalQuery);
      
      // Step 2: Create main branch nodes (FILES & QUESTIONS)
      const mainBranches = this.createMainBranchNodes(uploadedFiles, messages);
      
      // Step 3: Create file nodes and their analysis
      const fileNodes = await this.createFileNodes(uploadedFiles);
      const fileAnalysisNodes = await this.createFileAnalysisNodes(fileNodes, uploadedFiles);
      
      // Step 4: Create query nodes and their analysis
      const queryNodes = this.createQueryNodes(messages);
      const queryAnalysisNodes = await this.createQueryAnalysisNodes(queryNodes, messages);
      
      // Step 5: Create edges connecting all layers
      const edges = this.createHierarchicalEdges(
        centralNode,
        mainBranches,
        fileNodes,
        queryNodes,
        fileAnalysisNodes,
        queryAnalysisNodes
      );
      
      // Step 6: Combine all nodes
      const allNodes = [
        centralNode,
        ...mainBranches,
        ...fileNodes,
        ...queryNodes,
        ...fileAnalysisNodes,
        ...queryAnalysisNodes
      ];
      
      // Step 7: Apply intelligent layout
      const layoutedNodes = this.applyIntelligentLayout(allNodes, edges);
      
      const enhancedMindMapData: EnhancedMindMapData = {
        nodes: layoutedNodes,
        edges,
        metadata: {
          sessionId,
          generatedAt: new Date().toISOString(),
          totalLayers: 4,
          nodeCount: allNodes.length,
          edgeCount: edges.length,
        }
      };
      
      console.log(`🎉 Generated hierarchical mind map with ${allNodes.length} nodes and ${edges.length} edges`);
      return enhancedMindMapData;
      
    } catch (error) {
      console.error("Error generating hierarchical mind map:", error);
      return this.createFallbackMindMap(sessionId, originalQuery);
    }
  }

  // =====================================================================================
  // LAYER 1: CENTRAL BRAIN NODE CREATION
  // =====================================================================================

  private createCentralBrainNode(
    messages: ChatMessage[],
    uploadedFiles: any[],
    originalQuery: string
  ): CentralBrainNode {
    const aiMessages = messages.filter(m => m.type === 'ai');
    const userMessages = messages.filter(m => m.type === 'user');
    
    const sessionTitle = originalQuery 
      ? originalQuery.substring(0, 50) + (originalQuery.length > 50 ? '...' : '')
      : 'Chat Session';

    return {
      id: 'central-brain',
      type: 'central',
      label: '🧠 Session Brain',
      position: { x: 0, y: 0 }, // Will be repositioned by layout
      data: {
        label: '🧠 Session Brain',
        type: 'central',
        level: 1,
        totalFiles: uploadedFiles.length,
        totalQueries: userMessages.length,
        sessionTitle,
        summary: `Complete analysis of ${userMessages.length} queries across ${uploadedFiles.length} files`,
        lastUpdated: new Date().toLocaleDateString()
      }
    };
  }

  // =====================================================================================
  // LAYER 2: MAIN BRANCH NODES CREATION
  // =====================================================================================

  private createMainBranchNodes(uploadedFiles: any[], messages: ChatMessage[]): MainBranchNode[] {
    const userMessages = messages.filter(m => m.type === 'user');
    
    const filesBranch: MainBranchNode = {
      id: 'files-branch',
      type: 'main-branch',
      label: '📁 FILES',
      position: { x: 0, y: 0 },
      data: {
        label: '📁 FILES',
        type: 'main-branch',
        level: 2,
        category: 'FILES',
        count: uploadedFiles.length,
        summary: `${uploadedFiles.length} uploaded files for analysis`
      }
    };

    const questionsBranch: MainBranchNode = {
      id: 'questions-branch',
      type: 'main-branch',
      label: '❓ QUESTIONS',
      position: { x: 0, y: 0 },
      data: {
        label: '❓ QUESTIONS',
        type: 'main-branch',
        level: 2,
        category: 'QUESTIONS',
        count: userMessages.length,
        summary: `${userMessages.length} user queries and interactions`
      }
    };

    return [filesBranch, questionsBranch];
  }

  // =====================================================================================
  // LAYER 3: FILE NODES CREATION
  // =====================================================================================

  private async createFileNodes(uploadedFiles: any[]): Promise<FileNode[]> {
    const fileNodes: FileNode[] = [];
    
    uploadedFiles.forEach((file, index) => {
      const fileNode: FileNode = {
        id: `file-${index + 1}`,
        type: 'file',
        label: file.name || `File ${index + 1}`,
        position: { x: 0, y: 0 },
        data: {
          label: file.name || `File ${index + 1}`,
          type: 'file',
          level: 3,
          fileName: file.name || `File ${index + 1}`,
          fileType: file.type || 'unknown',
          fileSize: file.size || 0,
          uploadDate: new Date().toLocaleDateString(),
          summary: `Analysis of ${file.name || 'uploaded file'}`,
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

  private createQueryNodes(messages: ChatMessage[]): QueryNode[] {
    const userMessages = messages.filter(m => m.type === 'user');
    const queryNodes: QueryNode[] = [];
    
    userMessages.forEach((message, index) => {
      const queryLabel = message.content.substring(0, 45) + (message.content.length > 45 ? '...' : '');
      
      const queryNode: QueryNode = {
        id: `query-${index + 1}`,
        type: 'query',
        label: queryLabel,
        position: { x: 0, y: 0 },
        data: {
          label: queryLabel,
          type: 'query',
          level: 3,
          query: message.content,
          timestamp: message.timestamp?.toLocaleDateString() || new Date().toLocaleDateString(),
          isAutonomous: Boolean(message.isAutonomous),
          hasChildren: true,
          queryIndex: index + 1
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
    fileNodes: FileNode[],
    uploadedFiles: any[]
  ): Promise<FileAnalysisNode[]> {
    const analysisNodes: FileAnalysisNode[] = [];
    
    for (let i = 0; i < fileNodes.length; i++) {
      const fileNode = fileNodes[i];
      const file = uploadedFiles[i];
      
      // Create 5 analysis nodes for each file
      const analysisTypes: Array<'content' | 'themes' | 'insights' | 'summary' | 'topics'> = 
        ['content', 'themes', 'insights', 'summary', 'topics'];
      
      for (const analysisType of analysisTypes) {
        const analysisNode: FileAnalysisNode = {
          id: `${fileNode.id}-${analysisType}`,
          type: 'file-analysis',
          label: this.getFileAnalysisLabel(analysisType),
          position: { x: 0, y: 0 },
          data: {
            label: this.getFileAnalysisLabel(analysisType),
            type: 'file-analysis',
            level: 4,
            analysisType,
            content: await this.generateFileAnalysisContent(file, analysisType),
            parentFileId: fileNode.id
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
    queryNodes: QueryNode[],
    messages: ChatMessage[]
  ): Promise<QueryAnalysisNode[]> {
    const analysisNodes: QueryAnalysisNode[] = [];
    const userMessages = messages.filter(m => m.type === 'user');
    const aiMessages = messages.filter(m => m.type === 'ai');
    
    for (let i = 0; i < queryNodes.length; i++) {
      const queryNode = queryNodes[i];
      const userMessage = userMessages[i];
      const correspondingAiMessage = aiMessages[i];
      
      // Create 5 analysis nodes for each query
      const analysisTypes: Array<'thinking' | 'reasoning' | 'evidence' | 'conclusions' | 'related'> = 
        ['thinking', 'reasoning', 'evidence', 'conclusions', 'related'];
      
      for (const analysisType of analysisTypes) {
        const analysisNode: QueryAnalysisNode = {
          id: `${queryNode.id}-${analysisType}`,
          type: 'query-analysis',
          label: this.getQueryAnalysisLabel(analysisType),
          position: { x: 0, y: 0 },
          data: {
            label: this.getQueryAnalysisLabel(analysisType),
            type: 'query-analysis',
            level: 4,
            analysisType,
            content: await this.generateQueryAnalysisContent(
              userMessage,
              correspondingAiMessage,
              analysisType
            ),
            parentQueryId: queryNode.id
          }
        };
        analysisNodes.push(analysisNode);
      }
    }
    
    return analysisNodes;
  }

  // =====================================================================================
  // EDGE CREATION - HIERARCHICAL CONNECTIONS
  // =====================================================================================

  private createHierarchicalEdges(
    centralNode: CentralBrainNode,
    mainBranches: MainBranchNode[],
    fileNodes: FileNode[],
    queryNodes: QueryNode[],
    fileAnalysisNodes: FileAnalysisNode[],
    queryAnalysisNodes: QueryAnalysisNode[]
  ): EnhancedMindMapEdge[] {
    const edges: EnhancedMindMapEdge[] = [];
    
    // Layer 1 to Layer 2: Central to Main Branches
    mainBranches.forEach(branch => {
      edges.push({
        id: `edge-central-${branch.id}`,
        source: centralNode.id,
        target: branch.id,
        type: 'hierarchical',
        label: 'organizes',
        animated: true,
        style: {
          stroke: '#8B5CF6',
          strokeWidth: 3
        },
        markerEnd: {
          type: 'ArrowClosed',
          color: '#8B5CF6'
        }
      });
    });
    
    // Layer 2 to Layer 3: Files Branch to File Nodes
    const filesBranch = mainBranches.find(b => b.id === 'files-branch');
    if (filesBranch) {
      fileNodes.forEach(fileNode => {
        edges.push({
          id: `edge-files-${fileNode.id}`,
          source: filesBranch.id,
          target: fileNode.id,
          type: 'hierarchical',
          label: 'contains',
          animated: true,
          style: {
            stroke: '#3B82F6',
            strokeWidth: 2
          },
          markerEnd: {
            type: 'ArrowClosed',
            color: '#3B82F6'
          }
        });
      });
    }
    
    // Layer 2 to Layer 3: Questions Branch to Query Nodes
    const questionsBranch = mainBranches.find(b => b.id === 'questions-branch');
    if (questionsBranch) {
      queryNodes.forEach(queryNode => {
        edges.push({
          id: `edge-questions-${queryNode.id}`,
          source: questionsBranch.id,
          target: queryNode.id,
          type: 'hierarchical',
          label: 'includes',
          animated: true,
          style: {
            stroke: '#10B981',
            strokeWidth: 2
          },
          markerEnd: {
            type: 'ArrowClosed',
            color: '#10B981'
          }
        });
      });
    }
    
    // Layer 3 to Layer 4: File Nodes to File Analysis
    fileAnalysisNodes.forEach(analysisNode => {
      edges.push({
        id: `edge-${analysisNode.data.parentFileId}-${analysisNode.id}`,
        source: analysisNode.data.parentFileId,
        target: analysisNode.id,
        type: 'analysis',
        label: 'analyzes',
        animated: false,
        style: {
          stroke: '#6366F1',
          strokeWidth: 1.5
        },
        markerEnd: {
          type: 'ArrowClosed',
          color: '#6366F1'
        }
      });
    });
    
    // Layer 3 to Layer 4: Query Nodes to Query Analysis  
    queryAnalysisNodes.forEach(analysisNode => {
      edges.push({
        id: `edge-${analysisNode.data.parentQueryId}-${analysisNode.id}`,
        source: analysisNode.data.parentQueryId,
        target: analysisNode.id,
        type: 'analysis',
        label: 'breaks down',
        animated: false,
        style: {
          stroke: '#EC4899',
          strokeWidth: 1.5
        },
        markerEnd: {
          type: 'ArrowClosed',
          color: '#EC4899'
        }
      });
    });
    
    return edges;
  }

  // =====================================================================================
  // INTELLIGENT LAYOUT SYSTEM
  // =====================================================================================

  private applyIntelligentLayout(
    nodes: EnhancedMindMapNode[],
    edges: EnhancedMindMapEdge[]
  ): EnhancedMindMapNode[] {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    
    // Enhanced layout configuration for hierarchical structure
    dagreGraph.setGraph({
      rankdir: 'TB', // Top to Bottom
      align: 'UL',
      nodesep: 200, // Horizontal spacing
      ranksep: 180, // Vertical spacing between levels
      marginx: 100,
      marginy: 100,
      acyclicer: 'greedy',
      ranker: 'network-simplex'
    });
    
    // Add nodes with level-specific dimensions
    nodes.forEach(node => {
      const { width, height } = this.getNodeDimensions(node);
      dagreGraph.setNode(node.id, { width, height });
    });
    
    // Add edges
    edges.forEach(edge => {
      dagreGraph.setEdge(edge.source, edge.target, {
        minlen: this.getEdgeMinLength(edge),
        weight: this.getEdgeWeight(edge)
      });
    });
    
    // Calculate layout
    dagre.layout(dagreGraph);
    
    // Apply positions with level-specific adjustments
    return nodes.map(node => {
      const nodeWithPosition = dagreGraph.node(node.id);
      const { width, height } = this.getNodeDimensions(node);
      
      // Apply anti-clustering for analysis nodes
      let extraSpacing = this.getExtraSpacing(node, nodes);
      
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
  // HELPER METHODS
  // =====================================================================================

  private getNodeDimensions(node: EnhancedMindMapNode): { width: number; height: number } {
    switch (node.data.level) {
      case 1: return { width: 240, height: 140 }; // Central brain
      case 2: return { width: 200, height: 120 }; // Main branches
      case 3: return { width: 180, height: 100 }; // File/Query nodes
      case 4: return { width: 160, height: 80 };  // Analysis nodes
      default: return { width: 150, height: 70 };
    }
  }

  private getEdgeMinLength(edge: EnhancedMindMapEdge): number {
    return edge.type === 'hierarchical' ? 2 : 1;
  }

  private getEdgeWeight(edge: EnhancedMindMapEdge): number {
    return edge.type === 'hierarchical' ? 2 : 1;
  }

  private getExtraSpacing(node: EnhancedMindMapNode, allNodes: EnhancedMindMapNode[]): { x: number; y: number } {
    if (node.data.level === 4) {
      // Spread analysis nodes to prevent clustering
      const sameParentNodes = allNodes.filter(n => 
        n.type === node.type && 
        'parentFileId' in n.data && 'parentFileId' in node.data &&
        n.data.parentFileId === node.data.parentFileId
      );
      const nodeIndex = sameParentNodes.findIndex(n => n.id === node.id);
      
      return {
        x: (nodeIndex % 3) * 30, // Horizontal stagger
        y: Math.floor(nodeIndex / 3) * 15 // Vertical offset
      };
    }
    return { x: 0, y: 0 };
  }

  private getFileAnalysisLabel(type: string): string {
    const labels = {
      'content': '📊 Content Analysis',
      'themes': '🔍 Key Themes',
      'insights': '💡 Main Insights',
      'summary': '📝 Summary',
      'topics': '🏷️ Topics/Categories'
    };
    return labels[type as keyof typeof labels] || '📋 Analysis';
  }

  private getQueryAnalysisLabel(type: string): string {
    const labels = {
      'thinking': '🧠 AI Thinking Process',
      'reasoning': '💡 Reasoning Steps',
      'evidence': '📚 Evidence & Sources',
      'conclusions': '✅ Conclusions',
      'related': '🔗 Related Concepts'
    };
    return labels[type as keyof typeof labels] || '🔍 Analysis';
  }

  private async generateFileAnalysisContent(file: any, analysisType: string): Promise<string> {
    // Placeholder for AI-generated content analysis
    const placeholders = {
      'content': `Content analysis of ${file.name || 'file'} reveals key patterns and structures.`,
      'themes': `Major themes identified: data processing, analysis methods, key findings.`,
      'insights': `Key insights: significant correlations, important conclusions, actionable items.`,
      'summary': `Comprehensive summary of ${file.name || 'file'} covering main points and conclusions.`,
      'topics': `Topics categorized: technical concepts, methodologies, results, recommendations.`
    };
    return placeholders[analysisType as keyof typeof placeholders] || 'Analysis content';
  }

  private async generateQueryAnalysisContent(
    userMessage: ChatMessage,
    aiMessage: ChatMessage | undefined,
    analysisType: string
  ): Promise<string> {
    const placeholders = {
      'thinking': 'AI thinking process: question analysis, context consideration, approach selection.',
      'reasoning': 'Reasoning steps: logical progression, evidence evaluation, conclusion formation.',
      'evidence': 'Evidence sources: relevant data, supporting materials, verification methods.',
      'conclusions': 'Final conclusions: key findings, recommendations, actionable insights.',
      'related': 'Related concepts: connected topics, broader implications, follow-up areas.'
    };
    return placeholders[analysisType as keyof typeof placeholders] || 'Analysis content';
  }

  // =====================================================================================
  // FALLBACK SYSTEM
  // =====================================================================================

  private createFallbackMindMap(sessionId: string, originalQuery: string): EnhancedMindMapData {
    const centralNode: CentralBrainNode = {
      id: 'central-brain',
      type: 'central',
      label: '🧠 Session Brain',
      position: { x: 0, y: 0 },
      data: {
        label: '🧠 Session Brain',
        type: 'central',
        level: 1,
        totalFiles: 0,
        totalQueries: 0,
        sessionTitle: originalQuery || 'Empty Session',
        summary: 'No data available for analysis',
        lastUpdated: new Date().toLocaleDateString()
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
        edgeCount: 0
      }
    };
  }

  // =====================================================================================
  // CONVERSION TO STANDARD MIND MAP FORMAT
  // =====================================================================================

  public convertToStandardFormat(enhancedData: EnhancedMindMapData): MindMapData {
    const standardNodes: MindMapNode[] = enhancedData.nodes.map(node => ({
      id: node.id,
      position: node.position,
      data: {
        label: node.data.label,
        level: node.data.level,
        nodeType: node.data.type || 'default',
        summary: 'summary' in node.data ? node.data.summary : undefined,
        content: 'content' in node.data ? node.data.content : undefined,
      }
    }));

    const standardEdges: MindMapEdge[] = enhancedData.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label || '',
      animated: edge.animated
    }));

    return {
      nodes: standardNodes,
      edges: standardEdges
    };
  }
}

export const enhancedMindMapService = new EnhancedMindMapService();
export type { EnhancedMindMapData, EnhancedMindMapNode, EnhancedMindMapEdge };
