// Chat Session Storage Service with Advanced Mind Map Support
import type {
  ThinkingStreamData as AIServiceThinkingStreamData,
  Source,
  MindMapData,
} from "@/services/aiService";

// =====================================================================================
// ADVANCED MIND MAP DATA STRUCTURES
// =====================================================================================

export interface ConversationNode {
  id: string;
  sessionId: string;
  title: string;
  content: string;
  query: string;
  response: string;
  timestamp: Date;
  relevanceScore: number;
  topicIds: string[];
  summary: string;
  keyInsights: string[];
  position?: { x: number; y: number };
  metadata: {
    wordCount: number;
    hasFiles: boolean;
    hasThinking: boolean;
    isAutonomous: boolean;
    sources: Source[];
  };
}

export interface TopicNode {
  id: string;
  name: string;
  description: string;
  color: string;
  conversationIds: string[];
  centralityScore: number;
  position?: { x: number; y: number };
  metadata: {
    totalConversations: number;
    avgRelevanceScore: number;
    createdAt: Date;
    lastUpdated: Date;
    keywords: string[];
  };
}

export interface CentralNode {
  id: string;
  title: string;
  description: string;
  overallQuery: string;
  position?: { x: number; y: number };
  metadata: {
    totalTopics: number;
    totalConversations: number;
    createdAt: Date;
    lastGenerated: Date;
  };
}

export interface MindMapNodeExtended {
  id: string;
  type: 'central' | 'topic' | 'conversation';
  label: string;
  position: { x: number; y: number };
  data: {
    level: number;
    nodeType: 'central' | 'topic' | 'conversation';
    summary?: string;
    content?: string;
    relevanceScore?: number;
    centralityScore?: number;
    metadata?: any;
    color?: string;
    size?: number;
    interactive?: boolean;
  };
  style?: { [key: string]: string | number };
}

export interface MindMapEdgeExtended {
  id: string;
  source: string;
  target: string;
  type: 'central-to-topic' | 'topic-to-conversation' | 'conversation-to-conversation';
  label: string;
  animated: boolean;
  data: {
    weight: number;
    relationship: string;
    metadata?: any;
  };
  style?: { [key: string]: string | number };
  labelStyle?: { [key: string]: string | number };
}

export interface AdvancedMindMapData {
  central: CentralNode;
  topics: TopicNode[];
  conversations: ConversationNode[];
  nodes: MindMapNodeExtended[];
  edges: MindMapEdgeExtended[];
  metadata: {
    version: string;
    generatedAt: Date;
    totalNodes: number;
    totalEdges: number;
    maxConversations: number;
    layoutAlgorithm: string;
    performance: {
      generationTime: number;
      layoutTime: number;
      renderTime?: number;
    };
  };
  cache: {
    topicDistribution: { [topicId: string]: number };
    conversationSortOrder: string[];
    layoutPositions: { [nodeId: string]: { x: number; y: number } };
    lastCacheUpdate: Date;
  };
}

// =====================================================================================
// ENHANCED SESSION INTERFACES
// =====================================================================================

export interface ChatSessionSummary {
  id: string;
  title: string;
  originalQuery: string;
  lastUpdated: Date;
  messageCount: number;
  hasFiles: boolean;
  hasMindMap: boolean;
  hasThinking: boolean;
  isAutonomous: boolean;
  // Enhanced metadata
  topicCount?: number;
  relevanceScore?: number;
  mindMapVersion?: string;
  lastMindMapUpdate?: Date;
}

export interface UploadedFileMetadata {
  name: string;
  type: string;
  size: number;
  extractedText?: string;
  processingTimestamp?: Date;
}

export interface ThinkingStreamData {
  type: string;
  data: any;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  files?: UploadedFileMetadata[];
  thinking?: any[];
  thinkingStreamData?: AIServiceThinkingStreamData[];
  sources?: Source[];
  timestamp: Date | string;
  isAutonomous?: boolean;
  // Enhanced for mind map integration
  relevanceScore?: number;
  topicIds?: string[];
  summary?: string;
  keyInsights?: string[];
}

export interface ChatSession {
  id: string;
  originalQuery: string;
  uploadedFileMetadata?: UploadedFileMetadata[];
  isAutonomousMode: boolean;
  messages: ChatMessage[];
  fullMindMapData?: MindMapData | null;
  // Enhanced mind map data
  advancedMindMapData?: AdvancedMindMapData | null;  createdAt: Date;
  lastUpdated: Date;
  // Enhanced metadata for advanced mind maps
  mindMapSettings: {
    maxConversations: number;
    topicThreshold: number;
    layoutAlgorithm: 'dagre' | 'force' | 'hierarchical';
    autoUpdateEnabled: boolean;
    cacheEnabled: boolean;
  };
}

const CHAT_SESSIONS_KEY = "chatSessions";
const CURRENT_SESSION_KEY = "currentSessionId";

class ChatSessionStorageService {
  // Generate unique session ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate unique node/topic IDs
  private generateTopicId(): string {
    return `topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get all chat sessions
  getAllSessions(): ChatSessionSummary[] {
    try {
      const sessionsData = localStorage.getItem(CHAT_SESSIONS_KEY);
      if (!sessionsData) return [];

      const sessions = JSON.parse(sessionsData) as ChatSessionSummary[];
      return sessions
        .map((session) => ({
          ...session,
          lastUpdated: new Date(session.lastUpdated),
        }))
        .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
    } catch (error) {
      console.error("Error loading chat sessions:", error);
      return [];
    }
  }

  // Save a complete chat session
  saveSession(session: ChatSession): void {
    try {
      // Save the full session data
      localStorage.setItem(
        `chatSession_${session.id}`,
        JSON.stringify(session)
      );

      // Update sessions summary list
      const sessions = this.getAllSessions();
      const existingIndex = sessions.findIndex((s) => s.id === session.id);

      const summary: ChatSessionSummary = {
        id: session.id,
        title:
          session.originalQuery.length > 50
            ? session.originalQuery.substring(0, 50) + "..."
            : session.originalQuery,
        originalQuery: session.originalQuery,
        lastUpdated: new Date(session.lastUpdated),
        messageCount: session.messages.length,
        hasFiles:
          session.uploadedFileMetadata &&
          session.uploadedFileMetadata.length > 0,
        hasMindMap: !!session.fullMindMapData,
        hasThinking: session.messages.some(
          (msg) => msg.type === "ai" && (msg.thinkingStreamData || msg.thinking)
        ),
        isAutonomous: session.isAutonomousMode,
      };

      if (existingIndex >= 0) {
        sessions[existingIndex] = summary;
      } else {
        sessions.unshift(summary);
      }

      localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
      localStorage.setItem(CURRENT_SESSION_KEY, session.id);

      console.log("Chat session saved:", session.id);
    } catch (error) {
      console.error("Error saving chat session:", error);
      throw new Error("Failed to save chat session");
    }
  }

  // Load a specific session
  loadSession(sessionId: string): ChatSession | null {
    try {
      const sessionData = localStorage.getItem(`chatSession_${sessionId}`);
      if (!sessionData) return null;

      const session = JSON.parse(sessionData) as ChatSession;

      // Convert string timestamps back to Date objects
      session.createdAt = new Date(session.createdAt);
      session.lastUpdated = new Date(session.lastUpdated);
      session.messages = session.messages.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));

      return session;
    } catch (error) {
      console.error("Error loading chat session:", error);
      return null;
    }
  }

  // Create a new session
  createNewSession(): string {
    const sessionId = this.generateSessionId();
    localStorage.setItem(CURRENT_SESSION_KEY, sessionId);
    return sessionId;
  }

  // Get current session ID
  getCurrentSessionId(): string | null {
    return localStorage.getItem(CURRENT_SESSION_KEY);
  }

  // Delete a session and all associated data
  deleteSession(sessionId: string): void {
    try {
      // Remove session data
      localStorage.removeItem(`chatSession_${sessionId}`);

      // Remove thinking processes for this session
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (
          key.startsWith(`thinking_process_${sessionId}_`) ||
          (key.startsWith(`thinking_process_`) && key.includes(sessionId))
        ) {
          localStorage.removeItem(key);
        }
      });

      // Update sessions list
      const sessions = this.getAllSessions();
      const filteredSessions = sessions.filter((s) => s.id !== sessionId);
      localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(filteredSessions));

      console.log("Session deleted:", sessionId);
    } catch (error) {
      console.error("Error deleting session:", error);
      throw new Error("Failed to delete session");
    }
  }

  // Clear all sessions
  clearAllSessions(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (
          key.startsWith("chatSession_") ||
          key.startsWith("thinking_process_") ||
          key === CHAT_SESSIONS_KEY ||
          key === CURRENT_SESSION_KEY
        ) {
          localStorage.removeItem(key);
        }
      });
      console.log("All sessions cleared");
    } catch (error) {
      console.error("Error clearing all sessions:", error);
      throw new Error("Failed to clear all sessions");
    }
  }
  // Save thinking process for a specific message
  saveThinkingProcess(
    messageId: string,
    thinkingData: AIServiceThinkingStreamData[]
  ): void {
    try {
      localStorage.setItem(
        `thinking_process_${messageId}`,
        JSON.stringify(thinkingData)
      );
      console.log("Thinking process saved for message:", messageId);
    } catch (error) {
      console.error("Error saving thinking process:", error);
    }
  }

  // Load thinking process for a specific message
  loadThinkingProcess(messageId: string): AIServiceThinkingStreamData[] | null {
    try {
      const data = localStorage.getItem(`thinking_process_${messageId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Error loading thinking process:", error);
      return null;
    }
  }

  // Check if thinking process exists for a message
  hasThinkingProcess(messageId: string): boolean {
    return localStorage.getItem(`thinking_process_${messageId}`) !== null;
  }
}

export const chatSessionStorage = new ChatSessionStorageService();
