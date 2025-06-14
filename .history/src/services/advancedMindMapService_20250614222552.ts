// =====================================================================================
// ADVANCED MIND MAP SERVICE - MULTI-LAYERED HIERARCHICAL SYSTEM
// Inspired by the advanced architecture for our chat session + file use case
// Implements deep layered structure: Central → Categories → Items → Analysis
// =====================================================================================

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import dagre from "dagre";
import type { ChatSession, ChatMessage, UploadedFileMetadata } from "./chatSessionStorage";

// =====================================================================================
// ADVANCED MIND MAP SERVICE - MULTI-LAYERED HIERARCHICAL SYSTEM
// Inspired by the advanced architecture for our chat session + file use case
// Implements deep layered structure: Central → Categories → Items → Analysis
// =====================================================================================

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import dagre from "dagre";
import type { ChatSession, ChatMessage, UploadedFileMetadata } from "./chatSessionStorage";

// =====================================================================================
// ENHANCED DATA STRUCTURES FOR OUR USE CASE
// =====================================================================================

export interface LayeredMindMapNode {
  id: string;
  type: 'central' | 'category' | 'item' | 'analysis' | 'detail';
  layer: number; // 1=Central, 2=Categories(Files/Questions), 3=Items, 4+=Analysis
  position: { x: number; y: number };
  data: {
    label: string;
    icon: string;
    count?: number;
    summary?: string;
    fullContent?: string;
    keywords?: string[];
    metadata?: any;
    color?: string;
    size?: { width: number; height: number };
    interactive?: boolean;
    expandable?: boolean;
    expanded?: boolean;
  };
  style?: { [key: string]: string | number };
  parentId?: string;
  childIds?: string[];
}

export interface LayeredMindMapEdge {
  id: string;
  source: string;
  target: string;
  type: 'hierarchy' | 'relation';
  animated: boolean;
  data: {
    relationship: string;
    weight: number;
    layer: number;
  };
  style?: { [key: string]: string | number };
  labelStyle?: { [key: string]: string | number };
}

export interface LayeredMindMapData {
  nodes: LayeredMindMapNode[];
  edges: LayeredMindMapEdge[];
  metadata: {
    sessionId: string;
    totalLayers: number;
    generatedAt: Date;
    performance: {
      analysisTime: number;
      layoutTime: number;
    };
    statistics: {
      totalFiles: number;
      totalQueries: number;
      totalAnalysisNodes: number;
    };
  };
  cache: {
    hash: string;
    topicDistribution: { [key: string]: number };
    fileAnalysis: { [fileId: string]: any };
    queryAnalysis: { [queryId: string]: any };
  };
}

// =====================================================================================
// ANALYSIS INTERFACES
// =====================================================================================

interface FileAnalysisResult {
  id: string;
  fileName: string;
  contentThemes: string[];
  keyInsights: string[];
  summary: string;
  topics: string[];
  metadata: {
    wordCount: number;
    pageCount?: number;
    extractedAt: Date;
  };
  deepAnalysis: {
    mainConcepts: Array<{ concept: string; importance: number; description: string }>;
    relationships: Array<{ from: string; to: string; type: string }>;
    actionableItems: string[];
  };
}

interface QueryAnalysisResult {
  id: string;
  query: string;
  answer: string;
  thinkingProcess: Array<{ step: string; reasoning: string; evidence: string[] }>;
  sources: Array<{ type: string; content: string; relevance: number }>;
  conclusions: string[];
  relatedConcepts: string[];
  deepAnalysis: {
    answerComponents: Array<{ component: string; explanation: string; evidence: string }>;
    reasoningChain: Array<{ premise: string; inference: string; conclusion: string }>;
    evidenceStrength: Array<{ evidence: string; strength: number; source: string }>;
  };
}

// =====================================================================================
// MAIN SERVICE CLASS
// =====================================================================================

class AdvancedMindMapService {
  private apiKey: string | null = null;
  private googleProvider: any = null;
  private readonly MAX_CONVERSATIONS = 30;
  private readonly MIN_DELAY = 1200;
  private lastRequestTime: number = 0;

  constructor() {
    this.initializeAI();
  }

  private initializeAI() {
    try {
      this.apiKey = (import.meta.env as any).VITE_GOOGLE_AI_API_KEY;
      if (this.apiKey) {
        this.googleProvider = createGoogleGenerativeAI({ apiKey: this.apiKey });
        console.log("Advanced Mind Map Service: AI provider initialized");
      } else {
        console.error("Advanced Mind Map Service: API key not found");
        this.googleProvider = null;
      }
    } catch (error) {
      console.error("Failed to initialize Advanced Mind Map Service:", error);
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
  // MAIN GENERATION METHOD
  // =====================================================================================

  public async generateLayeredMindMap(session: ChatSession): Promise<LayeredMindMapData> {
    const startTime = Date.now();
    console.log("Generating layered mind map for session:", session.id);

    try {
      // Calculate data hash for caching
      const dataHash = this.calculateSessionHash(session);
      
      // Check if we have cached results
      const cached = this.getCachedMindMap(session.id, dataHash);
      if (cached) {
        console.log("Using cached mind map data");
        return cached;
      }

      // Step 1: Analyze files and queries
      const fileAnalyses = await this.analyzeFiles(session.uploadedFileMetadata || []);
      const queryAnalyses = await this.analyzeQueries(session.messages);

      // Step 2: Generate the layered structure
      const mindMapData = this.buildLayeredStructure(session, fileAnalyses, queryAnalyses);

      // Step 3: Apply advanced layout
      const layoutedData = this.applyAdvancedLayout(mindMapData);

      // Step 4: Cache and return
      const finalData: LayeredMindMapData = {
        ...layoutedData,
        metadata: {
          ...layoutedData.metadata,
          performance: {
            ...layoutedData.metadata.performance,
            analysisTime: Date.now() - startTime,
          }
        },
        cache: {
          hash: dataHash,
          topicDistribution: this.calculateTopicDistribution(fileAnalyses, queryAnalyses),
          fileAnalysis: fileAnalyses.reduce((acc, f) => ({ ...acc, [f.id]: f }), {}),
          queryAnalysis: queryAnalyses.reduce((acc, q) => ({ ...acc, [q.id]: q }), {}),
        }
      };

      this.cacheMindMap(session.id, dataHash, finalData);
      return finalData;

    } catch (error) {
      console.error("Error generating layered mind map:", error);
      return this.createFallbackMindMap(session);
    }
  }

  // =====================================================================================
  // FILE ANALYSIS METHODS
  // =====================================================================================

  private async analyzeFiles(files: UploadedFileMetadata[]): Promise<FileAnalysisResult[]> {
    if (!files || files.length === 0) return [];

    console.log(`Analyzing ${files.length} files...`);
    const analyses: FileAnalysisResult[] = [];

    for (const file of files) {
      try {
        await this.enforceRateLimit();
        const analysis = await this.performDeepFileAnalysis(file);
        analyses.push(analysis);
      } catch (error) {
        console.error(`Error analyzing file ${file.name}:`, error);
        // Add fallback analysis
        analyses.push(this.createFallbackFileAnalysis(file));
      }
    }

    return analyses;
  }

  private async performDeepFileAnalysis(file: UploadedFileMetadata): Promise<FileAnalysisResult> {
    if (!this.googleProvider) {
      return this.createFallbackFileAnalysis(file);
    }

    const content = file.extractedText || `File: ${file.name} (${file.type})`;
    const prompt = `Analyze this file content in depth and provide a structured analysis.

File: ${file.name}
Content: ${content.slice(0, 2000)}...

Provide a JSON response with the following structure:
{
  "contentThemes": ["theme1", "theme2", "theme3"],
  "keyInsights": ["insight1", "insight2", "insight3"],
  "summary": "Brief summary of the file content",
  "topics": ["topic1", "topic2", "topic3"],
  "mainConcepts": [
    {"concept": "concept name", "importance": 0.9, "description": "what this concept means"}
  ],
  "relationships": [
    {"from": "concept1", "to": "concept2", "type": "relationship type"}
  ],
  "actionableItems": ["actionable item 1", "actionable item 2"]
}

Return ONLY the JSON object, no markdown or additional text.`;

    try {
      const result = await generateText({
        model: this.googleProvider("gemini-2.0-flash-lite"),
        prompt,
        temperature: 0.3,
        maxTokens: 1000
      });

      const cleanResponse = this.cleanAIResponse(result.text);
      const aiAnalysis = JSON.parse(cleanResponse);

      return {
        id: `file_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
        fileName: file.name,
        contentThemes: aiAnalysis.contentThemes || [],
        keyInsights: aiAnalysis.keyInsights || [],
        summary: aiAnalysis.summary || `Analysis of ${file.name}`,
        topics: aiAnalysis.topics || [],
        metadata: {
          wordCount: content.split(' ').length,
          extractedAt: new Date(),
        },
        deepAnalysis: {
          mainConcepts: aiAnalysis.mainConcepts || [],
          relationships: aiAnalysis.relationships || [],
          actionableItems: aiAnalysis.actionableItems || [],
        }
      };
    } catch (error) {
      console.error("AI analysis failed, using fallback:", error);
      return this.createFallbackFileAnalysis(file);
    }
  }

  private createFallbackFileAnalysis(file: UploadedFileMetadata): FileAnalysisResult {
    return {
      id: `file_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
      fileName: file.name,
      contentThemes: ["Document Content", "File Analysis"],
      keyInsights: [`Analysis of ${file.name}`, "File content processing"],
      summary: `Document: ${file.name} (${file.type})`,
      topics: ["File Content"],
      metadata: {
        wordCount: 0,
        extractedAt: new Date(),
      },
      deepAnalysis: {
        mainConcepts: [
          { concept: "Document", importance: 1.0, description: "File content" }
        ],
        relationships: [],
        actionableItems: [`Review ${file.name}`],
      }
    };
  }

  // =====================================================================================
  // QUERY ANALYSIS METHODS
  // =====================================================================================

  private async analyzeQueries(messages: ChatMessage[]): Promise<QueryAnalysisResult[]> {
    // Get user questions and AI responses (limit to recent for performance)
    const conversations = this.extractConversations(messages);
    const recentConversations = conversations.slice(0, this.MAX_CONVERSATIONS);

    console.log(`Analyzing ${recentConversations.length} conversations...`);
    const analyses: QueryAnalysisResult[] = [];

    for (const conv of recentConversations) {
      try {
        await this.enforceRateLimit();
        const analysis = await this.performDeepQueryAnalysis(conv);
        analyses.push(analysis);
      } catch (error) {
        console.error("Error analyzing query:", error);
        analyses.push(this.createFallbackQueryAnalysis(conv));
      }
    }

    return analyses;
  }

  private extractConversations(messages: ChatMessage[]): Array<{id: string, query: string, answer: string, thinking?: any[], sources?: any[]}> {
    const conversations: Array<{id: string, query: string, answer: string, thinking?: any[], sources?: any[]}> = [];
    
    for (let i = 0; i < messages.length - 1; i++) {
      const userMessage = messages[i];
      const aiMessage = messages[i + 1];
      
      if (userMessage.type === 'user' && aiMessage.type === 'ai') {
        conversations.push({
          id: `conv_${userMessage.id}_${aiMessage.id}`,
          query: userMessage.content,
          answer: aiMessage.content,
          thinking: aiMessage.thinking,
          sources: aiMessage.sources
        });
      }
    }
    
    return conversations.reverse(); // Most recent first
  }

  private async performDeepQueryAnalysis(conversation: {id: string, query: string, answer: string, thinking?: any[], sources?: any[]}): Promise<QueryAnalysisResult> {
    if (!this.googleProvider) {
      return this.createFallbackQueryAnalysis(conversation);
    }

    const prompt = `Analyze this conversation in depth and break down the reasoning process.

Query: ${conversation.query}
Answer: ${conversation.answer.slice(0, 1500)}...

Provide a JSON response with this structure:
{
  "thinkingProcess": [
    {"step": "step description", "reasoning": "why this step", "evidence": ["evidence1", "evidence2"]}
  ],
  "conclusions": ["conclusion1", "conclusion2"],
  "relatedConcepts": ["concept1", "concept2", "concept3"],
  "answerComponents": [
    {"component": "main point", "explanation": "detailed explanation", "evidence": "supporting evidence"}
  ],
  "reasoningChain": [
    {"premise": "starting premise", "inference": "logical step", "conclusion": "derived conclusion"}
  ],
  "evidenceStrength": [
    {"evidence": "piece of evidence", "strength": 0.8, "source": "where it came from"}
  ]
}

Return ONLY the JSON object.`;

    try {
      const result = await generateText({
        model: this.googleProvider("gemini-2.0-flash-lite"),
        prompt,
        temperature: 0.3,
        maxTokens: 1200
      });

      const cleanResponse = this.cleanAIResponse(result.text);
      const aiAnalysis = JSON.parse(cleanResponse);

      return {
        id: conversation.id,
        query: conversation.query,
        answer: conversation.answer,
        thinkingProcess: aiAnalysis.thinkingProcess || [],
        sources: conversation.sources || [],
        conclusions: aiAnalysis.conclusions || [],
        relatedConcepts: aiAnalysis.relatedConcepts || [],
        deepAnalysis: {
          answerComponents: aiAnalysis.answerComponents || [],
          reasoningChain: aiAnalysis.reasoningChain || [],
          evidenceStrength: aiAnalysis.evidenceStrength || [],
        }
      };
    } catch (error) {
      console.error("AI query analysis failed, using fallback:", error);
      return this.createFallbackQueryAnalysis(conversation);
    }
  }

  private createFallbackQueryAnalysis(conversation: {id: string, query: string, answer: string}): QueryAnalysisResult {
    return {
      id: conversation.id,
      query: conversation.query,
      answer: conversation.answer,
      thinkingProcess: [
        { step: "Question Analysis", reasoning: "Understanding the query", evidence: [conversation.query] }
      ],
      sources: [],
      conclusions: ["Response provided"],
      relatedConcepts: ["Query Processing"],
      deepAnalysis: {
        answerComponents: [
          { component: "Main Response", explanation: conversation.answer.slice(0, 200), evidence: "AI Analysis" }
        ],
        reasoningChain: [
          { premise: conversation.query, inference: "Analysis performed", conclusion: "Response generated" }
        ],
        evidenceStrength: [
          { evidence: "AI Response", strength: 0.7, source: "System Analysis" }
        ],
      }
    };
  }

  // =====================================================================================
  // STRUCTURE BUILDING METHODS
  // =====================================================================================

  private buildLayeredStructure(
    session: ChatSession, 
    fileAnalyses: FileAnalysisResult[], 
    queryAnalyses: QueryAnalysisResult[]
  ): LayeredMindMapData {
    const nodes: LayeredMindMapNode[] = [];
    const edges: LayeredMindMapEdge[] = [];

    // Layer 1: Central Brain Node
    const centralNode: LayeredMindMapNode = {
      id: 'central_brain',
      type: 'central',
      layer: 1,
      position: { x: 0, y: 0 },
      data: {
        label: session.originalQuery || 'Session Brain',
        icon: '🧠',
        count: fileAnalyses.length + queryAnalyses.length,
        summary: `Analysis of ${fileAnalyses.length} files and ${queryAnalyses.length} conversations`,
        color: 'hsl(263, 70%, 50%)',
        size: { width: 240, height: 160 },
        interactive: true,
      },
      childIds: ['files_category', 'questions_category']
    };
    nodes.push(centralNode);

    // Layer 2: Category Nodes (Files & Questions)
    const filesCategory: LayeredMindMapNode = {
      id: 'files_category',
      type: 'category',
      layer: 2,
      position: { x: 0, y: 0 },
      data: {
        label: 'FILES',
        icon: '📁',
        count: fileAnalyses.length,
        summary: `${fileAnalyses.length} uploaded files with deep analysis`,
        color: 'hsl(200, 70%, 60%)',
        size: { width: 200, height: 140 },
        expandable: true,
        expanded: true,
      },
      parentId: 'central_brain',
      childIds: fileAnalyses.map(f => f.id)
    };

    const questionsCategory: LayeredMindMapNode = {
      id: 'questions_category',
      type: 'category',
      layer: 2,
      position: { x: 0, y: 0 },
      data: {
        label: 'QUESTIONS',
        icon: '❓',
        count: queryAnalyses.length,
        summary: `${queryAnalyses.length} conversations with detailed analysis`,
        color: 'hsl(280, 70%, 60%)',
        size: { width: 200, height: 140 },
        expandable: true,
        expanded: true,
      },
      parentId: 'central_brain',
      childIds: queryAnalyses.map(q => q.id)
    };

    nodes.push(filesCategory, questionsCategory);

    // Create edges from central to categories
    edges.push(
      {
        id: 'edge_central_files',
        source: 'central_brain',
        target: 'files_category',
        type: 'hierarchy',
        animated: true,
        data: { relationship: 'contains', weight: 1, layer: 1 },
        style: { stroke: 'hsl(200, 70%, 60%)', strokeWidth: 3 }
      },
      {
        id: 'edge_central_questions',
        source: 'central_brain',
        target: 'questions_category',
        type: 'hierarchy',
        animated: true,
        data: { relationship: 'contains', weight: 1, layer: 1 },
        style: { stroke: 'hsl(280, 70%, 60%)', strokeWidth: 3 }
      }
    );

    // Layer 3: Individual File Nodes
    fileAnalyses.forEach((file, index) => {
      const fileNode: LayeredMindMapNode = {
        id: file.id,
        type: 'item',
        layer: 3,
        position: { x: 0, y: 0 },
        data: {
          label: file.fileName,
          icon: '📄',
          summary: file.summary,
          keywords: file.topics,
          color: 'hsl(180, 60%, 65%)',
          size: { width: 180, height: 120 },
          expandable: true,
          expanded: false,
        },
        parentId: 'files_category',
        childIds: this.generateFileAnalysisNodeIds(file)
      };
      nodes.push(fileNode);

      // Edge from files category to file
      edges.push({
        id: `edge_files_${file.id}`,
        source: 'files_category',
        target: file.id,
        type: 'hierarchy',
        animated: false,
        data: { relationship: 'contains', weight: 0.8, layer: 2 },
        style: { stroke: 'hsl(180, 60%, 65%)' }
      });

      // Layer 4+: File Analysis Nodes
      this.addFileAnalysisNodes(file, nodes, edges);
    });

    // Layer 3: Individual Query Nodes
    queryAnalyses.forEach((query, index) => {
      const queryNode: LayeredMindMapNode = {
        id: query.id,
        type: 'item',
        layer: 3,
        position: { x: 0, y: 0 },
        data: {
          label: query.query.slice(0, 50) + '...',
          icon: '💬',
          summary: `Query with ${query.deepAnalysis.answerComponents.length} answer components`,
          fullContent: query.query,
          keywords: query.relatedConcepts,
          color: 'hsl(300, 60%, 65%)',
          size: { width: 180, height: 120 },
          expandable: true,
          expanded: false,
        },
        parentId: 'questions_category',
        childIds: this.generateQueryAnalysisNodeIds(query)
      };
      nodes.push(queryNode);

      // Edge from questions category to query
      edges.push({
        id: `edge_questions_${query.id}`,
        source: 'questions_category',
        target: query.id,
        type: 'hierarchy',
        animated: false,
        data: { relationship: 'contains', weight: 0.8, layer: 2 },
        style: { stroke: 'hsl(300, 60%, 65%)' }
      });

      // Layer 4+: Query Analysis Nodes
      this.addQueryAnalysisNodes(query, nodes, edges);
    });

    return {
      nodes,
      edges,
      metadata: {
        sessionId: session.id,
        totalLayers: 6, // Can go deeper based on analysis
        generatedAt: new Date(),
        performance: { analysisTime: 0, layoutTime: 0 },
        statistics: {
          totalFiles: fileAnalyses.length,
          totalQueries: queryAnalyses.length,
          totalAnalysisNodes: nodes.filter(n => n.layer >= 4).length,
        }
      },
      cache: {
        hash: '',
        topicDistribution: {},
        fileAnalysis: {},
        queryAnalysis: {},
      }
    };
  }

  // =====================================================================================
  // DETAILED ANALYSIS NODE GENERATION
  // =====================================================================================

  private generateFileAnalysisNodeIds(file: FileAnalysisResult): string[] {
    return [
      `${file.id}_themes`,
      `${file.id}_insights`,
      `${file.id}_concepts`,
      `${file.id}_actions`,
      `${file.id}_summary`
    ];
  }

  private addFileAnalysisNodes(file: FileAnalysisResult, nodes: LayeredMindMapNode[], edges: LayeredMindMapEdge[]): void {
    // Content Themes Node
    nodes.push({
      id: `${file.id}_themes`,
      type: 'analysis',
      layer: 4,
      position: { x: 0, y: 0 },
      data: {
        label: 'Content Themes',
        icon: '🎨',
        summary: `${file.contentThemes.length} main themes identified`,
        keywords: file.contentThemes,
        color: 'hsl(160, 50%, 70%)',
        size: { width: 160, height: 100 },
      },
      parentId: file.id
    });

    // Key Insights Node
    nodes.push({
      id: `${file.id}_insights`,
      type: 'analysis',
      layer: 4,
      position: { x: 0, y: 0 },
      data: {
        label: 'Key Insights',
        icon: '💡',
        summary: `${file.keyInsights.length} insights extracted`,
        fullContent: file.keyInsights.join('\n'),
        color: 'hsl(170, 50%, 70%)',
        size: { width: 160, height: 100 },
      },
      parentId: file.id
    });

    // Main Concepts Node
    nodes.push({
      id: `${file.id}_concepts`,
      type: 'analysis',
      layer: 4,
      position: { x: 0, y: 0 },
      data: {
        label: 'Main Concepts',
        icon: '🧩',
        summary: `${file.deepAnalysis.mainConcepts.length} key concepts`,
        keywords: file.deepAnalysis.mainConcepts.map(c => c.concept),
        color: 'hsl(180, 50%, 70%)',
        size: { width: 160, height: 100 },
      },
      parentId: file.id
    });

    // Add edges from file to analysis nodes
    [`${file.id}_themes`, `${file.id}_insights`, `${file.id}_concepts`].forEach(nodeId => {
      edges.push({
        id: `edge_${file.id}_${nodeId}`,
        source: file.id,
        target: nodeId,
        type: 'hierarchy',
        animated: false,
        data: { relationship: 'analyzes', weight: 0.6, layer: 3 },
        style: { stroke: 'hsl(160, 50%, 70%)', strokeWidth: 2 }
      });
    });
  }

  private generateQueryAnalysisNodeIds(query: QueryAnalysisResult): string[] {
    return [
      `${query.id}_thinking`,
      `${query.id}_components`,
      `${query.id}_reasoning`,
      `${query.id}_evidence`,
      `${query.id}_conclusions`
    ];
  }

  private addQueryAnalysisNodes(query: QueryAnalysisResult, nodes: LayeredMindMapNode[], edges: LayeredMindMapEdge[]): void {
    // AI Thinking Process Node
    nodes.push({
      id: `${query.id}_thinking`,
      type: 'analysis',
      layer: 4,
      position: { x: 0, y: 0 },
      data: {
        label: 'AI Thinking',
        icon: '🧠',
        summary: `${query.thinkingProcess.length} thinking steps`,
        fullContent: query.thinkingProcess.map(t => `${t.step}: ${t.reasoning}`).join('\n'),
        color: 'hsl(320, 50%, 70%)',
        size: { width: 160, height: 100 },
      },
      parentId: query.id
    });

    // Answer Components Node
    nodes.push({
      id: `${query.id}_components`,
      type: 'analysis',
      layer: 4,
      position: { x: 0, y: 0 },
      data: {
        label: 'Answer Components',
        icon: '🔧',
        summary: `${query.deepAnalysis.answerComponents.length} components`,
        keywords: query.deepAnalysis.answerComponents.map(c => c.component),
        color: 'hsl(330, 50%, 70%)',
        size: { width: 160, height: 100 },
      },
      parentId: query.id
    });

    // Reasoning Chain Node
    nodes.push({
      id: `${query.id}_reasoning`,
      type: 'analysis',
      layer: 4,
      position: { x: 0, y: 0 },
      data: {
        label: 'Reasoning Chain',
        icon: '🔗',
        summary: `${query.deepAnalysis.reasoningChain.length} reasoning steps`,
        fullContent: query.deepAnalysis.reasoningChain.map(r => `${r.premise} → ${r.inference} → ${r.conclusion}`).join('\n'),
        color: 'hsl(340, 50%, 70%)',
        size: { width: 160, height: 100 },
      },
      parentId: query.id
    });

    // Add edges from query to analysis nodes
    [`${query.id}_thinking`, `${query.id}_components`, `${query.id}_reasoning`].forEach(nodeId => {
      edges.push({
        id: `edge_${query.id}_${nodeId}`,
        source: query.id,
        target: nodeId,
        type: 'hierarchy',
        animated: false,
        data: { relationship: 'analyzes', weight: 0.6, layer: 3 },
        style: { stroke: 'hsl(320, 50%, 70%)', strokeWidth: 2 }
      });
    });
  }

  // =====================================================================================
  // LAYOUT SYSTEM (INSPIRED BY ADVANCED DAGRE IMPLEMENTATION)
  // =====================================================================================

  private applyAdvancedLayout(data: LayeredMindMapData): LayeredMindMapData {
    const layoutStartTime = Date.now();
    
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    
    // Enhanced layout configuration inspired by the advanced system
    dagreGraph.setGraph({ 
      rankdir: 'TB',
      align: 'UL',
      nodesep: 200, // Increased spacing for our complex structure
      ranksep: 180,
      marginx: 100,
      marginy: 100,
      acyclicer: 'greedy',
      ranker: 'network-simplex'
    });

    // Add nodes with layer-specific dimensions
    data.nodes.forEach((node) => {
      const size = this.getNodeDimensions(node);
      dagreGraph.setNode(node.id, { width: size.width, height: size.height });
    });

    // Add edges
    data.edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target, {
        minlen: this.getMinEdgeLength(edge),
        weight: edge.data.weight
      });
    });

    // Calculate layout
    dagre.layout(dagreGraph);

    // Apply positions with anti-clustering for analysis nodes
    const layoutedNodes = data.nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      const position = this.calculateFinalPosition(node, nodeWithPosition, data.nodes);
      
      return {
        ...node,
        position
      };
    });

    const layoutTime = Date.now() - layoutStartTime;
    
    return {
      ...data,
      nodes: layoutedNodes,
      metadata: {
        ...data.metadata,
        performance: {
          ...data.metadata.performance,
          layoutTime
        }
      }
    };
  }

  private getNodeDimensions(node: LayeredMindMapNode): { width: number; height: number } {
    if (node.data.size) {
      return node.data.size;
    }
    
    // Default dimensions based on layer and type
    switch (node.layer) {
      case 1: return { width: 240, height: 160 }; // Central
      case 2: return { width: 200, height: 140 }; // Categories
      case 3: return { width: 180, height: 120 }; // Items
      default: return { width: 160, height: 100 }; // Analysis nodes
    }
  }

  private getMinEdgeLength(edge: LayeredMindMapEdge): number {
    // Longer edges for higher-level connections
    switch (edge.data.layer) {
      case 1: return 3; // Central to categories
      case 2: return 2; // Categories to items
      default: return 1; // Items to analysis
    }
  }

  private calculateFinalPosition(
    node: LayeredMindMapNode, 
    dagrePosition: any, 
    allNodes: LayeredMindMapNode[]
  ): { x: number; y: number } {
    let x = dagrePosition.x - (dagrePosition.width / 2);
    let y = dagrePosition.y - (dagrePosition.height / 2);

    // Anti-clustering for analysis nodes (inspired by the advanced system)
    if (node.layer >= 4) {
      const siblingNodes = allNodes.filter(n => 
        n.layer === node.layer && 
        n.parentId === node.parentId
      );
      const nodeIndex = siblingNodes.findIndex(n => n.id === node.id);
      
      // Stagger positions to prevent overlap
      x += (nodeIndex % 3) * 30;
      y += Math.floor(nodeIndex / 3) * 20;
    }

    return { x, y };
  }

  // =====================================================================================
  // UTILITY METHODS
  // =====================================================================================

  private cleanAIResponse(response: string): string {
    let cleaned = response.trim();
    if (cleaned.includes('```json')) {
      cleaned = cleaned.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleaned.includes('```')) {
      cleaned = cleaned.replace(/```\n?/, '').replace(/\n?```$/, '');
    }
    return cleaned;
  }

  private calculateSessionHash(session: ChatSession): string {
    const hashData = {
      messages: session.messages.map(m => ({ id: m.id, content: m.content.slice(0, 100) })),
      files: session.uploadedFileMetadata?.map(f => ({ name: f.name, size: f.size })) || [],
      timestamp: session.lastUpdated
    };
    return JSON.stringify(hashData);
  }

  private calculateTopicDistribution(
    fileAnalyses: FileAnalysisResult[], 
    queryAnalyses: QueryAnalysisResult[]
  ): { [key: string]: number } {
    const distribution: { [key: string]: number } = {};
    
    // Count file topics
    fileAnalyses.forEach(file => {
      file.topics.forEach(topic => {
        distribution[topic] = (distribution[topic] || 0) + 1;
      });
    });
    
    // Count query concepts
    queryAnalyses.forEach(query => {
      query.relatedConcepts.forEach(concept => {
        distribution[concept] = (distribution[concept] || 0) + 1;
      });
    });
    
    return distribution;
  }

  private getCachedMindMap(sessionId: string, hash: string): LayeredMindMapData | null {
    try {
      const cached = localStorage.getItem(`mindmap_cache_${sessionId}`);
      if (cached) {
        const data = JSON.parse(cached);
        if (data.cache.hash === hash) {
          return data;
        }
      }
    } catch (error) {
      console.error("Error reading cached mind map:", error);
    }
    return null;
  }

  private cacheMindMap(sessionId: string, hash: string, data: LayeredMindMapData): void {
    try {
      localStorage.setItem(`mindmap_cache_${sessionId}`, JSON.stringify(data));
    } catch (error) {
      console.error("Error caching mind map:", error);
    }
  }

  private createFallbackMindMap(session: ChatSession): LayeredMindMapData {
    const centralNode: LayeredMindMapNode = {
      id: 'central_fallback',
      type: 'central',
      layer: 1,
      position: { x: 0, y: 0 },
      data: {
        label: session.originalQuery || 'Session',
        icon: '🧠',
        summary: 'Fallback mind map',
        color: 'hsl(0, 0%, 70%)',
        size: { width: 200, height: 120 },
      }
    };

    return {
      nodes: [centralNode],
      edges: [],
      metadata: {
        sessionId: session.id,
        totalLayers: 1,
        generatedAt: new Date(),
        performance: { analysisTime: 0, layoutTime: 0 },
        statistics: { totalFiles: 0, totalQueries: 0, totalAnalysisNodes: 0 }
      },
      cache: { hash: '', topicDistribution: {}, fileAnalysis: {}, queryAnalysis: {} }
    };
  }
}

export const advancedMindMapService = new AdvancedMindMapService();
  };
}

interface MindMapCache {
  hash: string;
  data: AdvancedMindMapData;
  generatedAt: Date;
}

// =====================================================================================
// ADVANCED MIND MAP SERVICE CLASS
// =====================================================================================

class AdvancedMindMapService {
  private apiKey: string | null = null;
  private googleProvider: any = null;
  private lastRequestTime: number = 0;
  private readonly MIN_DELAY = 1200; // Rate limiting
  private readonly MAX_CONVERSATIONS = 30; // Performance optimization
  private mindMapCache = new Map<string, MindMapCache>();

  constructor() {
    this.initializeAI();
  }

  private initializeAI() {
    try {
      this.apiKey = (import.meta.env as any).VITE_GOOGLE_AI_API_KEY;
      if (this.apiKey) {
        console.log("Advanced Mind Map Service: Google AI API key loaded successfully.");
        this.googleProvider = createGoogleGenerativeAI({ apiKey: this.apiKey });
        console.log("Advanced Mind Map Service: Google AI provider initialized successfully.");
      } else {
        console.error("Advanced Mind Map Service: Google AI API key not found. VITE_GOOGLE_AI_API_KEY is not set.");
        this.googleProvider = null;
      }
    } catch (error) {
      console.error("Failed to initialize Advanced Mind Map Service:", error);
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
  // MAIN MIND MAP GENERATION PIPELINE
  // =====================================================================================

  /**
   * Generate complete advanced mind map from chat session
   */
  async generateAdvancedMindMap(session: ChatSession): Promise<AdvancedMindMapData> {
    console.log("🧠 Starting advanced mind map generation for session:", session.id);
    const startTime = Date.now();

    try {
      // Step 1: Convert session to analyzed conversations
      const conversations = this.convertSessionToConversations(session);
      console.log(`📊 Converted ${conversations.length} messages to conversations`);

      // Step 2: Sort and limit conversations for performance
      const limitedConversations = this.sortAndLimitConversations(conversations);
      console.log(`📈 Limited to ${limitedConversations.length} most relevant conversations`);

      // Step 3: Generate AI-powered topic distribution
      const topicDistribution = await this.generateTopicDistributionForMindMap(limitedConversations);
      console.log(`🏷️ Generated ${Object.keys(topicDistribution).length} topics`);

      // Step 4: Build hierarchical mind map structure
      const mindMapData = await this.buildHierarchicalMindMap(
        session, 
        limitedConversations, 
        topicDistribution
      );

      // Step 5: Apply advanced layout
      const layoutedMindMap = this.applyDagreLayout(mindMapData);

      // Step 6: Add performance metadata
      const generationTime = Date.now() - startTime;
      layoutedMindMap.metadata.performance.generationTime = generationTime;

      console.log(`✅ Advanced mind map generated in ${generationTime}ms`);
      return layoutedMindMap;

    } catch (error) {
      console.error("❌ Error generating advanced mind map:", error);
      return this.createFallbackMindMap(session);
    }
  }

  // =====================================================================================
  // DATA INGESTION AND CONVERSATION ANALYSIS
  // =====================================================================================

  private convertSessionToConversations(session: ChatSession): AnalyzedConversation[] {
    const conversations: AnalyzedConversation[] = [];
    
    // Process message pairs (user query + AI response)
    for (let i = 0; i < session.messages.length - 1; i += 2) {
      const userMessage = session.messages[i];
      const aiMessage = session.messages[i + 1];
      
      if (userMessage.type === 'user' && aiMessage?.type === 'ai') {
        const conversation: AnalyzedConversation = {
          id: uuidv4(),
          question: userMessage.content,
          answer: aiMessage.content,
          summary: this.generateQuickSummary(userMessage.content, aiMessage.content),
          keywords: this.extractKeywords(userMessage.content + ' ' + aiMessage.content),
          topics: [], // Will be filled by AI topic analysis
          timestamp: new Date(userMessage.timestamp).toISOString(),
          relevanceScore: this.calculateRelevanceScore(userMessage, aiMessage),
          wordCount: (userMessage.content + aiMessage.content).split(' ').length,
          hasFiles: !!(userMessage.files && userMessage.files.length > 0),
          hasThinking: !!(aiMessage.thinkingStreamData || aiMessage.thinking),
          metadata: {
            sources: aiMessage.sources || [],
            isAutonomous: !!aiMessage.isAutonomous
          }
        };
        conversations.push(conversation);
      }
    }
    
    return conversations;
  }

  private sortAndLimitConversations(conversations: AnalyzedConversation[]): AnalyzedConversation[] {
    // Sort by timestamp (latest first) and relevance score
    const sorted = conversations.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      const timeDiff = dateB - dateA; // Latest first
      
      // If timestamps are close (within 1 hour), sort by relevance
      if (Math.abs(timeDiff) < 3600000) {
        return b.relevanceScore - a.relevanceScore;
      }
      return timeDiff;
    });
    
    // Limit to MAX_CONVERSATIONS for performance
    return sorted.slice(0, this.MAX_CONVERSATIONS);
  }

  private generateQuickSummary(question: string, answer: string): string {
    const combined = question + ' ' + answer;
    const words = combined.split(' ');
    if (words.length <= 20) return combined;
    
    // Extract first few words of question and key phrases from answer
    const questionSummary = question.split(' ').slice(0, 8).join(' ');
    const answerSummary = answer.split(' ').slice(0, 12).join(' ');
    return `${questionSummary}... → ${answerSummary}...`;
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - could be enhanced with NLP
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });
    
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private calculateRelevanceScore(userMessage: ChatMessage, aiMessage: ChatMessage): number {
    let score = 50; // Base score
    
    // Length bonus (more detailed = more relevant)
    score += Math.min(20, Math.floor(userMessage.content.length / 50));
    score += Math.min(20, Math.floor(aiMessage.content.length / 100));
    
    // File attachment bonus
    if (userMessage.files && userMessage.files.length > 0) score += 15;
    
    // Thinking process bonus
    if (aiMessage.thinkingStreamData || aiMessage.thinking) score += 10;
    
    // Sources bonus
    if (aiMessage.sources && aiMessage.sources.length > 0) score += 10;
    
    // Autonomous mode bonus
    if (aiMessage.isAutonomous) score += 10;
    
    return Math.min(100, score);
  }

  // =====================================================================================
  // AI-POWERED TOPIC ANALYSIS
  // =====================================================================================

  private async generateTopicDistributionForMindMap(conversations: AnalyzedConversation[]): Promise<TopicDistribution> {
    try {
      // Extract meaningful content snippets
      const conversationTexts = conversations.map(conv => 
        `Q: ${conv.question.slice(0, 200)} A: ${conv.answer.slice(0, 200)}`
      ).join('\n\n');

      const topicPrompt = `Analyze these ${conversations.length} conversations and categorize them into specific, meaningful topic categories. Create 5-8 descriptive categories based on the actual content.

Conversations:
${conversationTexts}

Return ONLY a JSON object with topic names as keys and conversation counts as values. Use specific, descriptive topic names like "Web Development", "AI & Machine Learning", "Database Design", etc.

Example format: {"Web Development": 8, "AI & Machine Learning": 5, "Database Design": 3}

IMPORTANT: Return ONLY the JSON object, no markdown, no additional text.`;

      await this.enforceRateLimit();
      const aiResponse = await generateText({
        model: this.googleProvider("gemini-2.0-flash-lite"),
        prompt: topicPrompt,
        temperature: 0.3,
        maxTokens: 500
      });
      
      // Clean the AI response to extract pure JSON
      let cleanResponse = aiResponse.text.trim();
      if (cleanResponse.includes('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanResponse.includes('```')) {
        cleanResponse = cleanResponse.replace(/```\n?/, '').replace(/\n?```$/, '');
      }
      
      const aiTopics = JSON.parse(cleanResponse);
      console.log("🤖 AI generated topics:", aiTopics);
      
      // Convert to enhanced topic distribution
      return this.enhanceTopicDistribution(aiTopics, conversations);
      
    } catch (error) {
      console.warn("⚠️ AI topic generation failed, using fallback:", error);
      return this.generateFallbackTopicsForMindMap(conversations);
    }
  }

  private enhanceTopicDistribution(aiTopics: Record<string, number>, conversations: AnalyzedConversation[]): TopicDistribution {
    const distribution: TopicDistribution = {};
    const colors = [
      'hsl(250, 70%, 60%)', 'hsl(280, 60%, 55%)', 'hsl(300, 65%, 50%)',
      'hsl(320, 70%, 55%)', 'hsl(200, 75%, 60%)', 'hsl(180, 70%, 55%)',
      'hsl(160, 65%, 50%)', 'hsl(140, 70%, 55%)'
    ];
    
    let colorIndex = 0;
    Object.entries(aiTopics).forEach(([topicName, count]) => {
      // Assign conversations to topics based on keyword matching
      const topicConversations = this.getConversationsForTopic(topicName, conversations);
      const topicKeywords = this.getKeywordsForTopic(topicName, conversations);
      
      distribution[topicName] = {
        count: topicConversations.length,
        conversations: topicConversations.map(c => c.id),
        keywords: topicKeywords,
        relevanceScore: this.calculateTopicRelevance(topicConversations),
        color: colors[colorIndex % colors.length]
      };
      colorIndex++;
    });
    
    return distribution;
  }

  private generateFallbackTopicsForMindMap(conversations: AnalyzedConversation[]): TopicDistribution {
    console.log("🔄 Using fallback topic generation");
    
    const topicKeywords = {
      'Technical Development': ['code', 'programming', 'software', 'development', 'technical'],
      'AI & Machine Learning': ['ai', 'artificial', 'intelligence', 'machine', 'learning', 'model'],
      'Data & Analytics': ['data', 'analysis', 'database', 'analytics', 'statistics'],
      'Web Technologies': ['web', 'html', 'css', 'javascript', 'react', 'frontend'],
      'Business & Strategy': ['business', 'strategy', 'market', 'revenue', 'growth'],
      'General Discussion': ['question', 'help', 'explain', 'understand', 'general']
    };
    
    const distribution: TopicDistribution = {};
    const colors = [
      'hsl(250, 70%, 60%)', 'hsl(280, 60%, 55%)', 'hsl(300, 65%, 50%)',
      'hsl(320, 70%, 55%)', 'hsl(200, 75%, 60%)', 'hsl(180, 70%, 55%)'
    ];
    
    let colorIndex = 0;
    Object.entries(topicKeywords).forEach(([topicName, keywords]) => {
      const topicConversations = conversations.filter(conv => {
        const text = (conv.question + ' ' + conv.answer).toLowerCase();
        return keywords.some(keyword => text.includes(keyword));
      });
      
      if (topicConversations.length > 0) {
        distribution[topicName] = {
          count: topicConversations.length,
          conversations: topicConversations.map(c => c.id),
          keywords: keywords.slice(0, 3),
          relevanceScore: this.calculateTopicRelevance(topicConversations),
          color: colors[colorIndex % colors.length]
        };
        colorIndex++;
      }
    });
    
    // Ensure we have at least one topic
    if (Object.keys(distribution).length === 0) {
      distribution['General Topics'] = {
        count: conversations.length,
        conversations: conversations.map(c => c.id),
        keywords: ['discussion', 'topics', 'general'],
        relevanceScore: 50,
        color: colors[0]
      };
    }
    
    return distribution;
  }

  private getConversationsForTopic(topicName: string, conversations: AnalyzedConversation[]): AnalyzedConversation[] {
    const topicKeywords = topicName.toLowerCase().split(/[\s&-]+/);
    
    return conversations.filter(conv => {
      const text = (conv.question + ' ' + conv.answer).toLowerCase();
      return topicKeywords.some(keyword => text.includes(keyword)) ||
             conv.keywords.some(k => topicKeywords.includes(k));
    });
  }

  private getKeywordsForTopic(topicName: string, conversations: AnalyzedConversation[]): string[] {
    const topicConversations = this.getConversationsForTopic(topicName, conversations);
    const allKeywords = topicConversations.flatMap(conv => conv.keywords);
    
    const keywordCount = new Map<string, number>();
    allKeywords.forEach(keyword => {
      keywordCount.set(keyword, (keywordCount.get(keyword) || 0) + 1);
    });
    
    return Array.from(keywordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([keyword]) => keyword);
  }

  private calculateTopicRelevance(conversations: AnalyzedConversation[]): number {
    if (conversations.length === 0) return 0;
    
    const avgRelevance = conversations.reduce((sum, conv) => sum + conv.relevanceScore, 0) / conversations.length;
    const sizeBonus = Math.min(20, conversations.length * 2); // Bonus for larger topics
    
    return Math.min(100, avgRelevance + sizeBonus);
  }

  // =====================================================================================
  // HIERARCHICAL MIND MAP STRUCTURE GENERATION
  // =====================================================================================

  private async buildHierarchicalMindMap(
    session: ChatSession,
    conversations: AnalyzedConversation[],
    topicDistribution: TopicDistribution
  ): Promise<AdvancedMindMapData> {
    const nodes: MindMapNodeExtended[] = [];
    const edges: MindMapEdgeExtended[] = [];
    const topics: TopicNode[] = [];
    const conversationNodes: ConversationNode[] = [];

    // 1. CREATE CENTRAL NODE - The brain hub
    const topicNames = Object.keys(topicDistribution);
    const centralNode: CentralNode = {
      id: 'central',
      title: 'Second Brain',
      description: `Complete analysis of ${conversations.length} conversations across ${topicNames.length} specialized areas`,
      overallQuery: session.originalQuery || 'Multi-topic Analysis',
      position: { x: 0, y: 0 },
      metadata: {
        totalTopics: topicNames.length,
        totalConversations: conversations.length,
        createdAt: new Date(),
        lastGenerated: new Date()
      }
    };

    const centralMindMapNode: MindMapNodeExtended = {
      id: 'central',
      type: 'central',
      label: 'Second Brain',
      position: { x: 0, y: 0 },
      data: {
        level: 0,
        nodeType: 'central',
        summary: centralNode.description,
        content: centralNode.overallQuery,
        metadata: centralNode.metadata,
        size: 140,
        interactive: true
      }
    };
    nodes.push(centralMindMapNode);

    // 2. CREATE TOPIC NODES - Category organizers
    Object.entries(topicDistribution).forEach(([topicName, topicData]) => {
      const topicId = `topic-${topicName.replace(/\s+/g, '-').toLowerCase()}`;
      
      const topicNode: TopicNode = {
        id: topicId,
        name: topicName,
        description: `${topicData.count} conversations in ${topicName}`,
        color: topicData.color,
        conversationIds: topicData.conversations,
        centralityScore: topicData.relevanceScore,
        position: { x: 0, y: 0 },
        metadata: {
          totalConversations: topicData.count,
          avgRelevanceScore: topicData.relevanceScore,
          createdAt: new Date(),
          lastUpdated: new Date(),
          keywords: topicData.keywords
        }
      };
      topics.push(topicNode);

      const topicMindMapNode: MindMapNodeExtended = {
        id: topicId,
        type: 'topic',
        label: topicName,
        position: { x: 0, y: 0 },
        data: {
          level: 1,
          nodeType: 'topic',
          summary: topicNode.description,
          content: topicData.keywords.join(', '),
          centralityScore: topicData.relevanceScore,
          metadata: topicNode.metadata,
          color: topicData.color,
          size: 120,
          interactive: true
        }
      };
      nodes.push(topicMindMapNode);

      // Create edge from central to topic
      const centralToTopicEdge: MindMapEdgeExtended = {
        id: `edge-central-${topicId}`,
        source: 'central',
        target: topicId,
        type: 'central-to-topic',
        label: `${topicData.count} conversations`,
        animated: true,
        data: {
          weight: topicData.count,
          relationship: 'contains',
          metadata: { topicName, count: topicData.count }
        },
        style: { stroke: topicData.color, strokeWidth: 3 }
      };
      edges.push(centralToTopicEdge);

      // 3. CREATE CONVERSATION NODES - Individual discussions
      const topicConversations = conversations.filter(conv => 
        topicData.conversations.includes(conv.id)
      );
      
      topicConversations.forEach((conv, index) => {
        const convId = `conv-${conv.id}`;
        
        const conversationNode: ConversationNode = {
          id: convId,
          sessionId: session.id,
          title: conv.question.slice(0, 45) + '...',
          content: conv.answer,
          query: conv.question,
          response: conv.answer,
          timestamp: new Date(conv.timestamp),
          relevanceScore: conv.relevanceScore,
          topicIds: [topicId],
          summary: conv.summary,
          keyInsights: conv.keywords,
          position: { x: 0, y: 0 },
          metadata: {
            wordCount: conv.wordCount,
            hasFiles: conv.hasFiles,
            hasThinking: conv.hasThinking,
            isAutonomous: conv.metadata.isAutonomous,
            sources: conv.metadata.sources
          }
        };
        conversationNodes.push(conversationNode);

        const conversationMindMapNode: MindMapNodeExtended = {
          id: convId,
          type: 'conversation',
          label: conversationNode.title,
          position: { x: 0, y: 0 },
          data: {
            level: 2,
            nodeType: 'conversation',
            summary: conv.summary,
            content: conv.question,
            relevanceScore: conv.relevanceScore,
            metadata: {
              ...conversationNode.metadata,
              timestamp: conv.timestamp,
              keywords: conv.keywords,
              conversationIndex: index + 1
            },
            color: topicData.color,
            size: 100,
            interactive: true
          }
        };
        nodes.push(conversationMindMapNode);

        // Create edge from topic to conversation
        const topicToConvEdge: MindMapEdgeExtended = {
          id: `edge-${topicId}-${convId}`,
          source: topicId,
          target: convId,
          type: 'topic-to-conversation',
          label: `#${index + 1}`,
          animated: false,
          data: {
            weight: conv.relevanceScore,
            relationship: 'includes',
            metadata: { conversationIndex: index + 1 }
          },
          style: { stroke: topicData.color, strokeWidth: 2 }
        };
        edges.push(topicToConvEdge);
      });
    });

    // Create advanced mind map data structure
    const advancedMindMapData: AdvancedMindMapData = {
      central: centralNode,
      topics,
      conversations: conversationNodes,
      nodes,
      edges,
      metadata: {
        version: '2.0',
        generatedAt: new Date(),
        totalNodes: nodes.length,
        totalEdges: edges.length,
        maxConversations: this.MAX_CONVERSATIONS,
        layoutAlgorithm: 'dagre',
        performance: {
          generationTime: 0, // Will be set by caller
          layoutTime: 0 // Will be set by layout function
        }
      },
      cache: {
        topicDistribution: Object.fromEntries(
          Object.entries(topicDistribution).map(([name, data]) => [name, data.count])
        ),
        conversationSortOrder: conversations.map(c => c.id),
        layoutPositions: {},
        lastCacheUpdate: new Date()
      }
    };

    return advancedMindMapData;
  }

  // =====================================================================================
  // ADVANCED LAYOUT SYSTEM
  // =====================================================================================

  private applyDagreLayout(mindMapData: AdvancedMindMapData): AdvancedMindMapData {
    console.log("🎨 Applying Dagre layout with anti-clustering");
    const layoutStartTime = Date.now();

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    
    // Enhanced layout configuration for optimal spacing
    dagreGraph.setGraph({ 
      rankdir: 'TB', // Top to Bottom hierarchy
      align: 'UL', // Upper Left alignment
      nodesep: 180, // 180px horizontal separation between nodes at same level
      ranksep: 160, // 160px vertical separation between different levels
      marginx: 80, // 80px margin for better spacing
      marginy: 80,
      acyclicer: 'greedy', // Better cycle removal algorithm
      ranker: 'network-simplex' // Optimal ranking algorithm
    });

    // Add nodes with precise dimensions
    mindMapData.nodes.forEach((node) => {
      let width, height;
      
      if (node.type === 'central') {
        width = 220; height = 140;
      } else if (node.type === 'topic') {
        width = 180; height = 120;
      } else { // conversation nodes
        width = 160; height = 100;
      }
      
      dagreGraph.setNode(node.id, { width, height });
    });

    // Add edges with spacing constraints
    mindMapData.edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target, {
        minlen: 2, // Minimum edge length for better spacing
        weight: edge.data.weight || 1 // Edge weight for layout optimization
      });
    });

    // Calculate optimal layout
    dagre.layout(dagreGraph);

    // Apply positions with anti-clustering adjustments
    const layoutedNodes = mindMapData.nodes.map((node, index) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      
      // Anti-clustering system for conversation nodes
      let extraSpacingX = 0;
      let extraSpacingY = 0;
      
      if (node.type === 'conversation') {
        const conversationNodes = mindMapData.nodes.filter(n => n.type === 'conversation');
        const nodeIndex = conversationNodes.findIndex(n => n.id === node.id);
        extraSpacingX = (nodeIndex % 3) * 20; // Stagger horizontally
        extraSpacingY = Math.floor(nodeIndex / 3) * 10; // Add vertical offset
      }
      
      const newPosition = {
        x: nodeWithPosition.x - (nodeWithPosition.width / 2) + extraSpacingX,
        y: nodeWithPosition.y - (nodeWithPosition.height / 2) + extraSpacingY,
      };

      return {
        ...node,
        position: newPosition,
      };
    });

    // Update cache with layout positions
    const layoutPositions: { [nodeId: string]: { x: number; y: number } } = {};
    layoutedNodes.forEach(node => {
      layoutPositions[node.id] = node.position;
    });

    const layoutTime = Date.now() - layoutStartTime;
    console.log(`🎨 Layout completed in ${layoutTime}ms`);

    return {
      ...mindMapData,
      nodes: layoutedNodes,
      metadata: {
        ...mindMapData.metadata,
        performance: {
          ...mindMapData.metadata.performance,
          layoutTime
        }
      },
      cache: {
        ...mindMapData.cache,
        layoutPositions,
        lastCacheUpdate: new Date()
      }
    };
  }

  // =====================================================================================
  // FALLBACK AND UTILITY METHODS
  // =====================================================================================

  private createFallbackMindMap(session: ChatSession): AdvancedMindMapData {
    console.log("🔄 Creating fallback mind map");
    
    const centralNode: CentralNode = {
      id: 'central-fallback',
      title: 'Session Overview',
      description: session.originalQuery || 'Chat Session',
      overallQuery: session.originalQuery || 'General Discussion',
      position: { x: 0, y: 0 },
      metadata: {
        totalTopics: 1,
        totalConversations: session.messages.length,
        createdAt: new Date(),
        lastGenerated: new Date()
      }
    };

    const fallbackTopic: TopicNode = {
      id: 'topic-general',
      name: 'General Discussion',
      description: `${session.messages.length} messages in this session`,
      color: 'hsl(250, 70%, 60%)',
      conversationIds: [],
      centralityScore: 50,
      position: { x: 0, y: 150 },
      metadata: {
        totalConversations: session.messages.length,
        avgRelevanceScore: 50,
        createdAt: new Date(),
        lastUpdated: new Date(),
        keywords: ['general', 'discussion']
      }
    };

    const nodes: MindMapNodeExtended[] = [
      {
        id: 'central-fallback',
        type: 'central',
        label: 'Session Overview',
        position: { x: 0, y: 0 },
        data: {
          level: 0,
          nodeType: 'central',
          summary: centralNode.description,
          size: 140,
          interactive: true
        }
      },
      {
        id: 'topic-general',
        type: 'topic',
        label: 'General Discussion',
        position: { x: 0, y: 150 },
        data: {
          level: 1,
          nodeType: 'topic',
          summary: fallbackTopic.description,
          color: fallbackTopic.color,
          size: 120,
          interactive: true
        }
      }
    ];

    const edges: MindMapEdgeExtended[] = [
      {
        id: 'edge-central-general',
        source: 'central-fallback',
        target: 'topic-general',
        type: 'central-to-topic',
        label: 'contains',
        animated: true,
        data: {
          weight: 1,
          relationship: 'contains'
        },
        style: { stroke: 'hsl(250, 70%, 60%)', strokeWidth: 2 }
      }
    ];

    return {
      central: centralNode,
      topics: [fallbackTopic],
      conversations: [],
      nodes,
      edges,
      metadata: {
        version: '2.0',
        generatedAt: new Date(),
        totalNodes: nodes.length,
        totalEdges: edges.length,
        maxConversations: this.MAX_CONVERSATIONS,
        layoutAlgorithm: 'fallback',
        performance: {
          generationTime: 0,
          layoutTime: 0
        }
      },
      cache: {
        topicDistribution: { 'General Discussion': session.messages.length },
        conversationSortOrder: [],
        layoutPositions: {},
        lastCacheUpdate: new Date()
      }
    };
  }

  // Cache management
  private generateCacheKey(sessionId: string, messageCount: number): string {
    return `${sessionId}_${messageCount}`;
  }

  public getCachedMindMap(sessionId: string, messageCount: number): AdvancedMindMapData | null {
    const cacheKey = this.generateCacheKey(sessionId, messageCount);
    const cached = this.mindMapCache.get(cacheKey);
    
    if (cached) {
      // Check if cache is still valid (within 1 hour)
      const cacheAge = Date.now() - cached.generatedAt.getTime();
      if (cacheAge < 3600000) { // 1 hour
        console.log("📦 Using cached mind map");
        return cached.data;
      } else {
        this.mindMapCache.delete(cacheKey);
      }
    }
    
    return null;
  }

  public setCachedMindMap(sessionId: string, messageCount: number, data: AdvancedMindMapData): void {
    const cacheKey = this.generateCacheKey(sessionId, messageCount);
    this.mindMapCache.set(cacheKey, {
      hash: cacheKey,
      data,
      generatedAt: new Date()
    });
    
    // Limit cache size
    if (this.mindMapCache.size > 10) {
      const oldestKey = this.mindMapCache.keys().next().value;
      this.mindMapCache.delete(oldestKey);
    }
  }

  public clearCache(): void {
    this.mindMapCache.clear();
    console.log("🗑️ Mind map cache cleared");
  }
}

// =====================================================================================
// EXPORT SINGLETON INSTANCE
// =====================================================================================

export const advancedMindMapService = new AdvancedMindMapService();
export type { AdvancedMindMapData, ConversationNode, TopicNode, CentralNode };
