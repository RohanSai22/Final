// =====================================================================================
// ADVANCED MIND MAP SERVICE - SOPHISTICATED AI-DRIVEN VISUALIZATION
// Implements the complete architecture with topic categorization, layout optimization,
// and interactive features as described in the specification
// =====================================================================================

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import dagre from "dagre";
import { v4 as uuidv4 } from 'uuid';
import type {
  AdvancedMindMapData,
  ConversationNode,
  TopicNode,
  CentralNode,
  MindMapNodeExtended,
  MindMapEdgeExtended,
  ChatSession,
  ChatMessage
} from './chatSessionStorage';

// =====================================================================================
// AI-DRIVEN CONVERSATION ANALYSIS INTERFACES
// =====================================================================================

interface AnalyzedConversation {
  id: string;
  question: string;
  answer: string;
  summary: string;
  keywords: string[];
  topics: string[];
  timestamp: string;
  relevanceScore: number;
  wordCount: number;
  hasFiles: boolean;
  hasThinking: boolean;
  metadata: {
    sources: any[];
    isAutonomous: boolean;
  };
}

interface TopicDistribution {
  [topicName: string]: {
    count: number;
    conversations: string[];
    keywords: string[];
    relevanceScore: number;
    color: string;
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
