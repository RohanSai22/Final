import React,
{
  createContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "@/hooks/use-toast";
import {
  ChatMessage,
  ChatSession,
  MindMapData,
  UploadedFileMetadata,
} from "@/types/common";

const CHAT_HISTORY_KEY = "novah_chat_history";

interface ChatContextType {
  chatHistory: ChatSession[];
  currentSessionId: string | null;
  currentSession: ChatSession | null;
  isSidebarOpen: boolean;
  isLoadingHistory: boolean;
  selectChat: (sessionId: string)
    => Promise<ChatSession | null>;
  newChat: (sessionName?: string) => string; // Returns new session ID
  deleteChat: (sessionId: string) => void;
  toggleSidebar: () => void;
  addMessageToSession: (
    sessionId: string,
    message: ChatMessage
  ) => void;
  updateSessionMetadata: (
    sessionId: string,
    metadata: {
      name?: string;
      originalQuery?: string;
      uploadedFileMetadata?: UploadedFileMetadata[];
      isAutonomousMode?: boolean;
    }
  ) => void;
  updateSessionMindMap: (
    sessionId: string,
    mindMapData: MindMapData | null
  ) => void;
  loadChatHistory: () => void;
  getMessagesForSession: (sessionId: string) => ChatMessage[];
}

export const ChatContext = createContext<ChatContextType | undefined>(
  undefined
);

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(
    null
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const loadChatHistory = useCallback(() => {
    setIsLoadingHistory(true);
    try {
      const historyRaw = localStorage.getItem(CHAT_HISTORY_KEY);
      const loadedSessions: ChatSession[] = historyRaw
        ? JSON.parse(historyRaw)
        : [];

      // Ensure all sessions have messages array and other essential fields
      const validatedSessions = loadedSessions.map(session => ({
        ...session,
        messages: session.messages || [],
        uploadedFileMetadata: session.uploadedFileMetadata || [],
        isAutonomousMode: session.isAutonomousMode === undefined ? true : session.isAutonomousMode,
        name: session.name || `Session ${new Date(session.messages?.[0]?.timestamp || Date.now()).toLocaleDateString()}`
      })).filter(s => s.id && typeof s.id === 'string');

      setChatHistory(validatedSessions);

      if (!currentSessionId && validatedSessions.length > 0) {
        // setCurrentSessionId(validatedSessions[validatedSessions.length - 1].id);
      } else if (!currentSessionId) {
        // newChat("New Session"); // Create a new session if history is empty
      }
    } catch (error) {
      console.error("ChatContext: Error loading chat history:", error);
      setChatHistory([]);
      // newChat("New Session"); // Create a new session on error
    } finally {
      setIsLoadingHistory(false);
    }
  }, [currentSessionId]); // Removed newChat from dependency array for now

  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  const saveChatHistory = useCallback((updatedHistory: ChatSession[]) => {
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updatedHistory));
      setChatHistory(updatedHistory);
    } catch (error) {
      console.error("ChatContext: Error saving chat history:", error);
      toast({
        title: "History Save Error",
        description: "Could not save your chat history.",
        variant: "destructive",
      });
    }
  }, []);

  const newChat = useCallback(
    (sessionName?: string): string => {
      const newSessionId = uuidv4();
      const newSession: ChatSession = {
        id: newSessionId,
        name: sessionName || `New Session ${new Date().toLocaleTimeString()}`,
        messages: [],
        originalQuery: "",
        uploadedFileMetadata: [],
        isAutonomousMode: true,
        fullMindMapData: null,
      };
      const updatedHistory = [...chatHistory, newSession];
      saveChatHistory(updatedHistory);
      setCurrentSessionId(newSessionId);
      setIsSidebarOpen(true); // Open sidebar for new chat
      return newSessionId;
    },
    [chatHistory, saveChatHistory]
  );

   // Initialize a new chat if no session ID is set after loading history
   useEffect(() => {
    if (!isLoadingHistory && !currentSessionId && chatHistory.length === 0) {
      newChat();
    } else if (!isLoadingHistory && !currentSessionId && chatHistory.length > 0) {
      // Default to the most recent session if none is selected
      setCurrentSessionId(chatHistory[chatHistory.length - 1].id);
    }
  }, [isLoadingHistory, currentSessionId, chatHistory, newChat]);


  const selectChat = useCallback(
    async (sessionId: string): Promise<ChatSession | null> => {
      const session = chatHistory.find((s) => s.id === sessionId);
      if (session) {
        setCurrentSessionId(sessionId);
        return session;
      }
      toast({
        title: "Error",
        description: "Could not load the selected chat session.",
        variant: "destructive",
      });
      return null;
    },
    [chatHistory]
  );

  const deleteChat = useCallback(
    (sessionId: string) => {
      const updatedHistory = chatHistory.filter((s) => s.id !== sessionId);
      saveChatHistory(updatedHistory);
      if (currentSessionId === sessionId) {
        if (updatedHistory.length > 0) {
          setCurrentSessionId(updatedHistory[updatedHistory.length - 1].id);
        } else {
          newChat(); // Create a new session if all are deleted
        }
      }
      toast({
        title: "Chat Deleted",
        description: `Session removed.`,
        variant: "default",
      });
    },
    [chatHistory, currentSessionId, saveChatHistory, newChat]
  );

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const addMessageToSession = useCallback(
    (sessionId: string, message: ChatMessage) => {
      const updatedHistory = chatHistory.map((session) =>
        session.id === sessionId
          ? { ...session, messages: [...(session.messages || []), message] }
          : session
      );
      saveChatHistory(updatedHistory);
    },
    [chatHistory, saveChatHistory]
  );

  const updateSessionMetadata = useCallback(
    (
      sessionId: string,
      metadata: {
        name?: string;
        originalQuery?: string;
        uploadedFileMetadata?: UploadedFileMetadata[];
        isAutonomousMode?: boolean;
      }
    ) => {
      const updatedHistory = chatHistory.map((session) =>
        session.id === sessionId ? { ...session, ...metadata } : session
      );
      saveChatHistory(updatedHistory);
    },
    [chatHistory, saveChatHistory]
  );

  const updateSessionMindMap = useCallback(
    (sessionId: string, mindMapData: MindMapData | null) => {
      const updatedHistory = chatHistory.map((session) =>
        session.id === sessionId
          ? { ...session, fullMindMapData: mindMapData }
          : session
      );
      saveChatHistory(updatedHistory);
    },
    [chatHistory, saveChatHistory]
  );

  const getMessagesForSession = useCallback(
    (sessionId: string): ChatMessage[] => {
        const session = chatHistory.find(s => s.id === sessionId);
        return session?.messages || [];
    }, [chatHistory]
  );

  const currentSession = chatHistory.find(s => s.id === currentSessionId) || null;


  return (
    <ChatContext.Provider
      value={{
        chatHistory,
        currentSessionId,
        currentSession,
        isSidebarOpen,
        isLoadingHistory,
        selectChat,
        newChat,
        deleteChat,
        toggleSidebar,
        addMessageToSession,
        updateSessionMetadata,
        updateSessionMindMap,
        loadChatHistory,
        getMessagesForSession,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

// Custom hook to use the ChatContext
export const useChat = () => {
  const context = React.useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
