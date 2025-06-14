// =====================================================================================
// NOVAH AI MIND MAP SERVICE - ADVANCED LAYERED IMPLEMENTATION
// Advanced mind map generation with layered architecture for chat sessions
// =====================================================================================

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import dagre from "dagre";
import { v4 as uuidv4 } from 'uuid';

// =====================================================================================
// NOVAH AI MIND MAP INTERFACES
// =====================================================================================

export interface FileData {
  id: string;
  name: string;
  content: string;
  type: string;
  uploadedAt: string;
  extractedData?: any;
}

export interface QueryData {
  id: string;
  query: string;
  answer?: string;
  thinking?: string;
  timestamp: string;
}

export interface InsightNode {
  id: string;
  type: 'theme' | 'concept' | 'insight' | 'evidence' | 'reasoning' | 'conclusion' | 'connection';
  title: string;
  content: string;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface AnalysisLayer {
  id: string;
  level: number;
  title: string;
  insights: InsightNode[];
  connections: string[]; // IDs of connected nodes
}

export interface NovahMindMapNode {
  id: string;
  position: { x: number; y: number };
  data: {
    label: string;
    level: number;
    nodeType: 'central' | 'branch' | 'file' | 'query' | 'insight' | 'analysis';
    summary?: string;
    content?: string;
    metadata?: Record<string, any>;
    confidence?: number;
    fileId?: string;
    queryId?: string;
    insights?: InsightNode[];
    isExpanded?: boolean;
  };
  type: string;
  style?: Record<string, any>;
}

export interface NovahMindMapEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: 'relation' | 'hierarchy' | 'insight' | 'connection';
  animated?: boolean;
  style?: Record<string, any>;
  labelStyle?: Record<string, any>;
}

export interface NovahMindMapData {
  nodes: NovahMindMapNode[];
  edges: NovahMindMapEdge[];
  metadata: {
    sessionId: string;
    generatedAt: string;
    version: string;
    totalFiles: number;
    totalQueries: number;
    totalInsights: number;
  };
}

export interface SessionData {
  id: string;
  title: string;
  files: FileData[];
  queries: QueryData[];
  mindMapData?: NovahMindMapData;
}

// =====================================================================================
// NOVAH AI MIND MAP SERVICE
// =====================================================================================

class NovahMindMapService {
  private apiKey: string | null = null;
  private googleProvider: any = null;
  private lastRequestTime: number = 0;
  private readonly MIN_DELAY = 1200;

  constructor() {
    this.initializeAI();
  }

  private initializeAI() {
    try {
      this.apiKey = (import.meta.env as any).VITE_GOOGLE_AI_API_KEY;
      if (this.apiKey) {
        console.log("Novah Mind Map Service: Google AI API key loaded successfully.");
        this.googleProvider = createGoogleGenerativeAI({ apiKey: this.apiKey });
        console.log("Novah Mind Map Service: Google AI provider initialized successfully.");
      } else {
        console.error("Novah Mind Map Service: Google AI API key not found. VITE_GOOGLE_AI_API_KEY is not set.");
        this.googleProvider = null;
      }
    } catch (error) {
      console.error("Failed to initialize Novah Mind Map Service:", error);
      this.googleProvider = null;
    }
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_DELAY) {
      await new Promise((resolve) => setTimeout(resolve, this.MIN_DELAY - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  // =====================================================================================
  // MAIN MIND MAP GENERATION
  // =====================================================================================

  public async generateSessionMindMap(sessionData: SessionData): Promise<NovahMindMapData> {
    console.log("NovahMindMapService: Starting session mind map generation");
    
    try {
      // 1. Create central node
      const centralNode = this.createCentralNode(sessionData);
      
      // 2. Create main branches (Files and Questions)
      const filesBranch = this.createFilesBranch();
      const questionsBranch = this.createQuestionsBranch();
      
      // 3. Process files and create file nodes with analysis
      const fileNodes: NovahMindMapNode[] = [];
      const fileEdges: NovahMindMapEdge[] = [];
      
      for (const file of sessionData.files) {
        const fileAnalysis = await this.analyzeFile(file);
        const fileNode = this.createFileNode(file, fileAnalysis);
        const analysisNodes = this.createFileAnalysisNodes(file, fileAnalysis);
        
        fileNodes.push(fileNode, ...analysisNodes);
        fileEdges.push(
          this.createEdge(filesBranch.id, fileNode.id, 'hierarchy'),
          ...this.createAnalysisEdges(fileNode.id, analysisNodes)
        );
      }
      
      // 4. Process queries and create query nodes with reasoning
      const queryNodes: NovahMindMapNode[] = [];
      const queryEdges: NovahMindMapEdge[] = [];
      
      for (const query of sessionData.queries) {
        const queryAnalysis = await this.analyzeQuery(query, sessionData.files);
        const queryNode = this.createQueryNode(query, queryAnalysis);
        const reasoningNodes = this.createQueryReasoningNodes(query, queryAnalysis);
        
        queryNodes.push(queryNode, ...reasoningNodes);
        queryEdges.push(
          this.createEdge(questionsBranch.id, queryNode.id, 'hierarchy'),
          ...this.createReasoningEdges(queryNode.id, reasoningNodes)
        );
      }
      
      // 5. Create cross-connections between files and queries
      const crossConnections = this.createCrossConnections(fileNodes, queryNodes, sessionData);
      
      // 6. Combine all nodes and edges
      const allNodes = [
        centralNode,
        filesBranch,
        questionsBranch,
        ...fileNodes,
        ...queryNodes
      ];
      
      const allEdges = [
        this.createEdge(centralNode.id, filesBranch.id, 'hierarchy'),
        this.createEdge(centralNode.id, questionsBranch.id, 'hierarchy'),
        ...fileEdges,
        ...queryEdges,
        ...crossConnections
      ];
      
      // 7. Apply layout algorithm
      const layoutData = this.applyAdvancedLayout(allNodes, allEdges);
      
      // 8. Create final mind map data
      const mindMapData: NovahMindMapData = {
        nodes: layoutData.nodes,
        edges: layoutData.edges,
        metadata: {
          sessionId: sessionData.id,
          generatedAt: new Date().toISOString(),
          version: '2.0',
          totalFiles: sessionData.files.length,
          totalQueries: sessionData.queries.length,
          totalInsights: this.countTotalInsights(layoutData.nodes)
        }
      };
      
      console.log("NovahMindMapService: Session mind map generated successfully");
      return mindMapData;
      
    } catch (error) {
      console.error("Error generating session mind map:", error);
      return this.createFallbackMindMap(sessionData);
    }
  }

  // =====================================================================================
  // NODE CREATION METHODS
  // =====================================================================================

  private createCentralNode(sessionData: SessionData): NovahMindMapNode {
    return {
      id: 'central',
      position: { x: 0, y: 0 },
      data: {
        label: sessionData.title || 'Session Analysis',
        level: 0,
        nodeType: 'central',
        summary: `Analysis of ${sessionData.files.length} files and ${sessionData.queries.length} queries`,
        metadata: {
          sessionId: sessionData.id,
          createdAt: new Date().toISOString()
        }
      },
      type: 'centralNode',
      style: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: '3px solid #4f46e5',
        borderRadius: '50%',
        width: '120px',
        height: '120px',
        fontSize: '14px',
        fontWeight: 'bold'
      }
    };
  }

  private createFilesBranch(): NovahMindMapNode {
    return {
      id: 'files-branch',
      position: { x: -200, y: 0 },
      data: {
        label: 'Files',
        level: 1,
        nodeType: 'branch',
        summary: 'Uploaded files and their analysis'
      },
      type: 'branchNode',
      style: {
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        color: 'white',
        border: '2px solid #ec4899',
        borderRadius: '15px',
        width: '100px',
        height: '50px',
        fontWeight: 'bold'
      }
    };
  }

  private createQuestionsBranch(): NovahMindMapNode {
    return {
      id: 'questions-branch',
      position: { x: 200, y: 0 },
      data: {
        label: 'Questions',
        level: 1,
        nodeType: 'branch',
        summary: 'User queries and AI responses'
      },
      type: 'branchNode',
      style: {
        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        color: 'white',
        border: '2px solid #0ea5e9',
        borderRadius: '15px',
        width: '100px',
        height: '50px',
        fontWeight: 'bold'
      }
    };
  }

  private createFileNode(file: FileData, analysis: any): NovahMindMapNode {
    return {
      id: `file-${file.id}`,
      position: { x: 0, y: 0 }, // Will be positioned by layout
      data: {
        label: file.name,
        level: 2,
        nodeType: 'file',
        summary: `${file.type} file uploaded ${new Date(file.uploadedAt).toLocaleDateString()}`,
        content: file.content.substring(0, 200) + '...',
        metadata: {
          fileType: file.type,
          uploadedAt: file.uploadedAt,
          size: file.content.length
        },
        fileId: file.id,
        insights: analysis.insights || []
      },
      type: 'fileNode',
      style: {
        background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        color: 'white',
        border: '2px solid #f59e0b',
        borderRadius: '12px',
        width: '140px',
        height: '60px',
        fontWeight: '600'
      }
    };
  }

  private createQueryNode(query: QueryData, analysis: any): NovahMindMapNode {
    return {
      id: `query-${query.id}`,
      position: { x: 0, y: 0 }, // Will be positioned by layout
      data: {
        label: query.query.length > 50 ? query.query.substring(0, 50) + '...' : query.query,
        level: 2,
        nodeType: 'query',
        summary: `Query asked ${new Date(query.timestamp).toLocaleDateString()}`,
        content: query.query,
        metadata: {
          timestamp: query.timestamp,
          hasAnswer: !!query.answer,
          hasThinking: !!query.thinking
        },
        queryId: query.id,
        insights: analysis.insights || []
      },
      type: 'queryNode',
      style: {
        background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        color: '#374151',
        border: '2px solid #06b6d4',
        borderRadius: '12px',
        width: '140px',
        height: '60px',
        fontWeight: '600'
      }
    };
  }

  private createFileAnalysisNodes(file: FileData, analysis: any): NovahMindMapNode[] {
    const nodes: NovahMindMapNode[] = [];
    
    if (analysis.themes && analysis.themes.length > 0) {
      analysis.themes.forEach((theme: any, index: number) => {
        nodes.push({
          id: `file-${file.id}-theme-${index}`,
          position: { x: 0, y: 0 },
          data: {
            label: theme.title,
            level: 3,
            nodeType: 'insight',
            summary: theme.description,
            content: theme.content,
            confidence: theme.confidence || 0.8,
            metadata: { type: 'theme', parentFileId: file.id }
          },
          type: 'insightNode',
          style: {
            background: '#fef3c7',
            color: '#92400e',
            border: '1px solid #d97706',
            borderRadius: '8px',
            width: '120px',
            height: '40px'
          }
        });
      });
    }

    if (analysis.keyPoints && analysis.keyPoints.length > 0) {
      analysis.keyPoints.forEach((point: any, index: number) => {
        nodes.push({
          id: `file-${file.id}-point-${index}`,
          position: { x: 0, y: 0 },
          data: {
            label: point.title || `Key Point ${index + 1}`,
            level: 3,
            nodeType: 'insight',
            summary: point.description,
            content: point.content,
            confidence: point.confidence || 0.7,
            metadata: { type: 'keyPoint', parentFileId: file.id }
          },
          type: 'insightNode',
          style: {
            background: '#ddd6fe',
            color: '#5b21b6',
            border: '1px solid #7c3aed',
            borderRadius: '8px',
            width: '120px',
            height: '40px'
          }
        });
      });
    }

    return nodes;
  }

  private createQueryReasoningNodes(query: QueryData, analysis: any): NovahMindMapNode[] {
    const nodes: NovahMindMapNode[] = [];
    
    if (analysis.reasoning && analysis.reasoning.length > 0) {
      analysis.reasoning.forEach((reason: any, index: number) => {
        nodes.push({
          id: `query-${query.id}-reasoning-${index}`,
          position: { x: 0, y: 0 },
          data: {
            label: reason.title,
            level: 3,
            nodeType: 'analysis',
            summary: reason.description,
            content: reason.content,
            confidence: reason.confidence || 0.8,
            metadata: { type: 'reasoning', parentQueryId: query.id }
          },
          type: 'analysisNode',
          style: {
            background: '#dcfce7',
            color: '#166534',
            border: '1px solid #16a34a',
            borderRadius: '8px',
            width: '120px',
            height: '40px'
          }
        });
      });
    }

    if (analysis.evidence && analysis.evidence.length > 0) {
      analysis.evidence.forEach((evidence: any, index: number) => {
        nodes.push({
          id: `query-${query.id}-evidence-${index}`,
          position: { x: 0, y: 0 },
          data: {
            label: evidence.title || `Evidence ${index + 1}`,
            level: 3,
            nodeType: 'analysis',
            summary: evidence.description,
            content: evidence.content,
            confidence: evidence.confidence || 0.9,
            metadata: { type: 'evidence', parentQueryId: query.id }
          },
          type: 'analysisNode',
          style: {
            background: '#fee2e2',
            color: '#991b1b',
            border: '1px solid #dc2626',
            borderRadius: '8px',
            width: '120px',
            height: '40px'
          }
        });
      });
    }

    return nodes;
  }

  // =====================================================================================
  // EDGE CREATION METHODS
  // =====================================================================================

  private createEdge(
    source: string, 
    target: string, 
    type: 'hierarchy' | 'relation' | 'insight' | 'connection',
    label?: string
  ): NovahMindMapEdge {
    return {
      id: `edge-${source}-${target}`,
      source,
      target,
      type,
      label,
      animated: type === 'connection',
      style: this.getEdgeStyle(type),
      labelStyle: {
        fontSize: '10px',
        fontWeight: '500'
      }
    };
  }

  private getEdgeStyle(type: string): Record<string, any> {
    switch (type) {
      case 'hierarchy':
        return { stroke: '#6b7280', strokeWidth: 2 };
      case 'relation':
        return { stroke: '#3b82f6', strokeWidth: 1.5 };
      case 'insight':
        return { stroke: '#10b981', strokeWidth: 1, strokeDasharray: '5,5' };
      case 'connection':
        return { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '3,3' };
      default:
        return { stroke: '#9ca3af', strokeWidth: 1 };
    }
  }

  private createAnalysisEdges(parentId: string, analysisNodes: NovahMindMapNode[]): NovahMindMapEdge[] {
    return analysisNodes.map(node => this.createEdge(parentId, node.id, 'insight'));
  }

  private createReasoningEdges(parentId: string, reasoningNodes: NovahMindMapNode[]): NovahMindMapEdge[] {
    return reasoningNodes.map(node => this.createEdge(parentId, node.id, 'insight'));
  }

  private createCrossConnections(
    fileNodes: NovahMindMapNode[], 
    queryNodes: NovahMindMapNode[], 
    sessionData: SessionData
  ): NovahMindMapEdge[] {
    const connections: NovahMindMapEdge[] = [];
    
    // Create connections between files and queries based on content relevance
    queryNodes.forEach(queryNode => {
      const query = sessionData.queries.find(q => q.id === queryNode.data.queryId);
      if (query && query.answer) {
        fileNodes.forEach(fileNode => {
          const file = sessionData.files.find(f => f.id === fileNode.data.fileId);
          if (file && this.isContentRelevant(query.query, file.content)) {
            connections.push(this.createEdge(
              fileNode.id, 
              queryNode.id, 
              'connection', 
              'Referenced'
            ));
          }
        });
      }
    });
    
    return connections;
  }

  // =====================================================================================
  // AI ANALYSIS METHODS
  // =====================================================================================

  private async analyzeFile(file: FileData): Promise<any> {
    if (!this.apiKey || !this.googleProvider) {
      return this.createFallbackFileAnalysis(file);
    }

    try {
      await this.enforceRateLimit();
      
      const prompt = `Analyze the following ${file.type} file content and extract:
1. Main themes (3-5 themes max)
2. Key points (5-7 points max)
3. Important concepts
4. Brief summary

Content:
${file.content.substring(0, 3000)}

Respond in JSON format:
{
  "themes": [{"title": "Theme", "description": "Description", "confidence": 0.8}],
  "keyPoints": [{"title": "Point", "description": "Description", "confidence": 0.7}],
  "concepts": ["concept1", "concept2"],
  "summary": "Brief summary"
}`;

      const result = await generateText({
        model: this.googleProvider('gemini-pro'),
        prompt,
        maxTokens: 1000,
        temperature: 0.3
      });

      return JSON.parse(result.text);
    } catch (error) {
      console.error("Error analyzing file:", error);
      return this.createFallbackFileAnalysis(file);
    }
  }

  private async analyzeQuery(query: QueryData, files: FileData[]): Promise<any> {
    if (!this.apiKey || !this.googleProvider) {
      return this.createFallbackQueryAnalysis(query);
    }

    try {
      await this.enforceRateLimit();
      
      const filesContext = files.map(f => `File: ${f.name}\nContent: ${f.content.substring(0, 500)}`).join('\n\n');
      
      const prompt = `Analyze this query in the context of the provided files:

Query: "${query.query}"
${query.answer ? `Answer: "${query.answer.substring(0, 500)}"` : ''}
${query.thinking ? `AI Thinking: "${query.thinking.substring(0, 500)}"` : ''}

Files Context:
${filesContext}

Extract:
1. Reasoning steps (3-5 steps)
2. Evidence from files (2-4 pieces)
3. Key insights
4. Connections to file content

Respond in JSON format:
{
  "reasoning": [{"title": "Step", "description": "Description", "confidence": 0.8}],
  "evidence": [{"title": "Evidence", "description": "Description", "confidence": 0.9}],
  "insights": ["insight1", "insight2"],
  "fileConnections": ["fileId1", "fileId2"]
}`;

      const result = await generateText({
        model: this.googleProvider('gemini-pro'),
        prompt,
        maxTokens: 1000,
        temperature: 0.3
      });

      return JSON.parse(result.text);
    } catch (error) {
      console.error("Error analyzing query:", error);
      return this.createFallbackQueryAnalysis(query);
    }
  }

  // =====================================================================================
  // LAYOUT AND POSITIONING
  // =====================================================================================

  private applyAdvancedLayout(nodes: NovahMindMapNode[], edges: NovahMindMapEdge[]): { nodes: NovahMindMapNode[], edges: NovahMindMapEdge[] } {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ 
      rankdir: 'TB',
      nodesep: 100,
      ranksep: 150,
      marginx: 50,
      marginy: 50
    });
    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes to dagre
    nodes.forEach(node => {
      g.setNode(node.id, { 
        width: Number(node.style?.width) || 120, 
        height: Number(node.style?.height) || 50 
      });
    });

    // Add edges to dagre
    edges.forEach(edge => {
      g.setEdge(edge.source, edge.target);
    });

    // Apply layout
    dagre.layout(g);

    // Update node positions
    const layoutedNodes = nodes.map(node => {
      const nodeWithPosition = g.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - (nodeWithPosition.width / 2),
          y: nodeWithPosition.y - (nodeWithPosition.height / 2)
        }
      };
    });

    return { nodes: layoutedNodes, edges };
  }

  // =====================================================================================
  // UTILITY METHODS
  // =====================================================================================

  private isContentRelevant(query: string, content: string): boolean {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    
    const relevantWords = queryWords.filter(word => 
      word.length > 3 && contentLower.includes(word)
    );
    
    return relevantWords.length >= Math.min(2, queryWords.length * 0.3);
  }

  private countTotalInsights(nodes: NovahMindMapNode[]): number {
    return nodes.filter(node => 
      node.data.nodeType === 'insight' || node.data.nodeType === 'analysis'
    ).length;
  }

  private createFallbackFileAnalysis(file: FileData): any {
    return {
      themes: [
        { title: "Main Content", description: "Primary content of the file", confidence: 0.6 }
      ],
      keyPoints: [
        { title: "File Data", description: `${file.type} file with content`, confidence: 0.7 }
      ],
      concepts: ["document", "content"],
      summary: `${file.type} file uploaded on ${new Date(file.uploadedAt).toLocaleDateString()}`
    };
  }

  private createFallbackQueryAnalysis(query: QueryData): any {
    return {
      reasoning: [
        { title: "User Query", description: "User asked a question", confidence: 0.8 }
      ],
      evidence: query.answer ? [
        { title: "AI Response", description: "AI provided an answer", confidence: 0.9 }
      ] : [],
      insights: ["query", "analysis"],
      fileConnections: []
    };
  }

  private createFallbackMindMap(sessionData: SessionData): NovahMindMapData {
    const centralNode = this.createCentralNode(sessionData);
    const filesBranch = this.createFilesBranch();
    const questionsBranch = this.createQuestionsBranch();
    
    const nodes = [centralNode, filesBranch, questionsBranch];
    const edges = [
      this.createEdge(centralNode.id, filesBranch.id, 'hierarchy'),
      this.createEdge(centralNode.id, questionsBranch.id, 'hierarchy')
    ];
    
    // Add simple file nodes
    sessionData.files.forEach((file, index) => {
      const fileNode = {
        ...this.createFileNode(file, this.createFallbackFileAnalysis(file)),
        position: { x: -200, y: 100 + (index * 80) }
      };
      nodes.push(fileNode);
      edges.push(this.createEdge(filesBranch.id, fileNode.id, 'hierarchy'));
    });
    
    // Add simple query nodes
    sessionData.queries.forEach((query, index) => {
      const queryNode = {
        ...this.createQueryNode(query, this.createFallbackQueryAnalysis(query)),
        position: { x: 200, y: 100 + (index * 80) }
      };
      nodes.push(queryNode);
      edges.push(this.createEdge(questionsBranch.id, queryNode.id, 'hierarchy'));
    });
    
    return {
      nodes,
      edges,
      metadata: {
        sessionId: sessionData.id,
        generatedAt: new Date().toISOString(),
        version: '2.0-fallback',
        totalFiles: sessionData.files.length,
        totalQueries: sessionData.queries.length,
        totalInsights: 0
      }
    };
  }
}

export const novahMindMapService = new NovahMindMapService();
export default novahMindMapService;
