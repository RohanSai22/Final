import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Map, X, FilePlus, Loader2, Menu } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import MindMap from "@/components/ModernMindMap";
import { toast } from "@/hooks/use-toast";
import ThinkingProcess from "@/components/chat/ThinkingProcess";
import AutonomousThinkingProcess from "@/components/chat/AutonomousThinkingProcess";
import StreamingText from "@/components/chat/StreamingText";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import { ChatSidebar } from "@/components/ui/ChatSidebar";
import {
  aiService,
  type ThinkingStreamData,
  type FinalReport,
  type Source,
  type MindMapData,
  type AIServiceCallbacks,
} from "@/services/aiService";
import {
  autonomousResearchAgent,
  type StreamingCallback,
  type ProcessedFileInput,
} from "@/services/autonomousResearchAgent";
import { fileProcessingService } from "@/services/fileProcessingService";
import { mindMapService } from "@/services/mindMapService";
import {
  chatSessionStorage,
  type ChatSession,
  type ChatMessage,
  type UploadedFileMetadata,
} from "@/services/chatSessionStorage";

interface UploadedFile {
  // For component state, includes File object
  id: string;
  name: string;
  content: string; // Content might be populated after processing for some types
  type: string;
  file: File; // The actual File object
  processed?: boolean;
  wordCount?: number;
  error?: string;
}

interface ThinkingStep {
  id: number;
  type: string;
  title: string;
  content: string;
  status: "processing" | "complete" | "pending";
}

const INITIAL_DISPLAY_LEVEL = 3;

const ChatPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Session Management
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]); // Holds File objects
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentThinking, setCurrentThinking] = useState<ThinkingStep[]>([]); // For older AI service
  const [currentThinkingStreamData, setCurrentThinkingStreamData] = useState<
    ThinkingStreamData[]
  >([]);
  const [showMindMap, setShowMindMap] = useState(false);
  const [fullMindMapData, setFullMindMapData] = useState<MindMapData | null>(
    null
  );
  const [displayedMindMapData, setDisplayedMindMapData] =
    useState<MindMapData | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [originalQuery, setOriginalQuery] = useState("");
  const [isAutonomousMode, setIsAutonomousMode] = useState(true);
  const [viewingThinkingForMessageId, setViewingThinkingForMessageId] =
    useState<string | null>(null);
  const [retrievedThinkingStream, setRetrievedThinkingStream] = useState<
    ThinkingStreamData[] | null
  >(null);

  const saveChatSession = () => {
    if (!currentSessionId || messages.length === 0) return;

    try {
      const now = new Date();
      const sessionData: ChatSession = {
        id: currentSessionId,
        originalQuery,
        uploadedFileMetadata: uploadedFiles.map((f) => ({
          name: f.name,
          type: f.type,
          size: f.file.size,
        })),
        isAutonomousMode,
        messages,
        fullMindMapData,
        createdAt: now, // This should be set only once when creating
        lastUpdated: now,
      };

      chatSessionStorage.saveSession(sessionData);
      console.log("ChatPage: Session saved to localStorage.");
    } catch (error) {
      console.error(
        "ChatPage: Error saving chat session to localStorage:",
        error
      );
      toast({
        title: "Session Save Error",
        description: "Could not save your chat session. Storage might be full.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Save session whenever key states change, but not on initial empty/loading states.
    if (messages.length > 0 && !isProcessing && currentSessionId) {
      saveChatSession();
    }
  }, [
    messages,
    originalQuery,
    uploadedFiles,
    isAutonomousMode,
    fullMindMapData,
    isProcessing,
    currentSessionId,
  ]);

  useEffect(() => {
    let initialQueryHandled = false;

    if (location.state) {
      // New navigation takes precedence
      console.log(
        "ChatPage: New navigation state present, creating new session and initializing."
      );
      const newSessionId = chatSessionStorage.createNewSession();
      setCurrentSessionId(newSessionId);

      const {
        query,
        files,
        deepResearch,
        autonomousMode: navAutonomousMode,
      } = location.state as any;

      setOriginalQuery(query || "");
      setIsAutonomousMode(
        navAutonomousMode === undefined ? true : navAutonomousMode
      );

      // Files from navigation are now ProcessedFileInput[]
      const initialProcessedFilesFromNav: ProcessedFileInput[] = files || [];

      // Set local UploadedFiles state to empty as these are for in-chat uploads
      setUploadedFiles([]);

      handleInitialQuery(query, initialProcessedFilesFromNav, deepResearch);
      initialQueryHandled = true;
    } else {
      // Try to load current session
      const existingSessionId = chatSessionStorage.getCurrentSessionId();
      if (existingSessionId) {
        const savedSession = chatSessionStorage.loadSession(existingSessionId);
        if (
          savedSession &&
          savedSession.messages &&
          savedSession.messages.length > 0
        ) {
          console.log(
            "ChatPage: Loading session from localStorage:",
            savedSession
          );
          setCurrentSessionId(existingSessionId);
          setOriginalQuery(savedSession.originalQuery || "");

          if (
            savedSession.uploadedFileMetadata &&
            savedSession.uploadedFileMetadata.length > 0
          ) {
            console.log(
              "ChatPage: Restored file metadata:",
              savedSession.uploadedFileMetadata
            );
          }

          setIsAutonomousMode(
            savedSession.isAutonomousMode === undefined
              ? true
              : savedSession.isAutonomousMode
          );
          setMessages(savedSession.messages);

          if (savedSession.fullMindMapData) {
            setFullMindMapData(savedSession.fullMindMapData);
            // Re-initialize displayedMindMapData from fullMindMapData
            const initialNodes = savedSession.fullMindMapData.nodes.filter(
              (node) => node.data.level <= INITIAL_DISPLAY_LEVEL
            );
            const initialNodeIds = new Set(initialNodes.map((node) => node.id));
            const initialEdges = savedSession.fullMindMapData.edges.filter(
              (edge) =>
                initialNodeIds.has(edge.source) &&
                initialNodeIds.has(edge.target)
            );
            setDisplayedMindMapData({
              nodes: initialNodes,
              edges: initialEdges,
            });
          }
          toast({
            title: "Session Restored",
            description: "Your previous chat session has been loaded.",
          });
        } else {
          // Create new session if no valid existing session
          const newSessionId = chatSessionStorage.createNewSession();
          setCurrentSessionId(newSessionId);
        }
      } else {
        // Create new session
        const newSessionId = chatSessionStorage.createNewSession();
        setCurrentSessionId(newSessionId);
      }
    }
  }, []); // Empty dependency array for mount only

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleInitialQuery = async (
    query: string,
    currentFiles: ProcessedFileInput[],
    deepResearch: boolean
  ) => {
    // Adapt filesForDisplay: ProcessedFileInput doesn't have f.file.size. Default size to 0 or omit.
    const filesForDisplay = currentFiles.map((f) => ({
      name: f.name,
      type: f.type || "unknown",
      size: 0,
    }));
    const userMessage: ChatMessage = {
      id: uuidv4(),
      type: "user",
      content: query,
      files: filesForDisplay.length > 0 ? filesForDisplay : undefined,
      timestamp: new Date(),
    };
    setMessages([userMessage]);
    // originalQuery is already set by the caller (mount useEffect or handleSendMessage)
    await processResearchQuery(query, currentFiles, deepResearch); // Pass ProcessedFileInput[]
  };

  const processResearchQuery = async (
    query: string,
    currentFiles: ProcessedFileInput[],
    deepResearch: boolean
  ) => {
    setIsProcessing(true);
    setStreamingContent("");
    setCurrentThinking([]);
    setCurrentThinkingStreamData([]);
    // Do not reset mind map here if we want to build upon it across queries in a session
    // setFullMindMapData(null);
    // setDisplayedMindMapData(null);

    const processAndSetMindMapData = (mindMap: MindMapData) => {
      setFullMindMapData(mindMap);
      const initialNodes = mindMap.nodes.filter(
        (node) => node.data.level <= INITIAL_DISPLAY_LEVEL
      );
      const initialNodeIds = new Set(initialNodes.map((node) => node.id));
      const initialEdges = mindMap.edges.filter(
        (edge) =>
          initialNodeIds.has(edge.source) && initialNodeIds.has(edge.target)
      );
      setDisplayedMindMapData({ nodes: initialNodes, edges: initialEdges });
    };

    try {
      // const fileObjects: File[] = currentFiles.map(f => f.file).filter(Boolean); // This line is no longer needed as currentFiles are ProcessedFileInput[]
      const researchMode = deepResearch ? "Deep" : "Normal";

      if (isAutonomousMode) {
        // Pass currentFiles (ProcessedFileInput[]) directly to conductResearch
        await autonomousResearchAgent.conductResearch(
          query,
          currentFiles,
          researchMode,
          {
            onThinkingData: (streamData) =>
              setCurrentThinkingStreamData((prev) => [...prev, streamData]),
            onFinalAnswer: async (report) => {
              const aiMessageId = uuidv4();
              const thinkingForStorage = [...currentThinkingStreamData]; // Capture current stream
              const aiMessage: ChatMessage = {
                id: aiMessageId,
                type: "ai",
                content: report.content,
                thinkingStreamData: thinkingForStorage, // Store the captured stream with message
                sources: report.sources,
                timestamp: new Date(),
                isAutonomous: true,
              };
              setMessages((prev) => [...prev, aiMessage]);

              // Note: Mind map generation removed - now manual via UI button

              if (thinkingForStorage.length > 0) {
                console.log(
                  "ChatPage: Saving thinking process for autonomous message ID:",
                  aiMessageId,
                  "Data points:",
                  thinkingForStorage.length
                );
                chatSessionStorage.saveThinkingProcess(
                  aiMessageId,
                  thinkingForStorage
                );
              }
              setCurrentThinkingStreamData([]);
              setIsProcessing(false);
              setStreamingContent("");
            },
            onError: (error) => {
              /* ... */ setIsProcessing(false);
            },
          }
        );
      } else {
        // Non-autonomous (AIService)
        const aiCallbacks: AIServiceCallbacks = {
          onThinkingUpdate: (data) =>
            setCurrentThinkingStreamData((prev) => [...prev, data]),
          onProgress: (stage, progress) =>
            console.log(`Research progress: ${stage} (${progress}%)`),
          onError: (error) => {
            /* ... */ setIsProcessing(false);
            setStreamingContent("");
          },
          onComplete: (response) => {
            const aiMessageId = uuidv4();
            const thinkingForStorage = [
              ...currentThinkingStreamData,
              ...(response.thinkingProcess || []),
            ]; // Combine if any stream before structured
            const aiMessage: ChatMessage = {
              id: aiMessageId,
              type: "ai",
              content: response.finalReport.content,
              thinkingStreamData: thinkingForStorage,
              sources: response.finalReport.sources,
              timestamp: new Date(),
              isAutonomous: false,
            };
            setMessages((prev) => [...prev, aiMessage]);
            // Note: Mind map generation removed - now manual via UI button

            if (thinkingForStorage.length > 0) {
              console.log(
                "ChatPage: Saving thinking process for AIService message ID:",
                aiMessageId,
                "Data points:",
                thinkingForStorage.length
              );
              chatSessionStorage.saveThinkingProcess(
                aiMessageId,
                thinkingForStorage
              );
            }
            setCurrentThinking([]);
            setCurrentThinkingStreamData([]);
            setIsProcessing(false);
            setStreamingContent("");
          },
        };
        // If aiService.processResearch is used with files, it would need refactoring
        // to handle ProcessedFileInput[] or a different way to get File objects if essential.
        // For now, focusing on autonomousResearchAgent path.
        await aiService.processResearch(
          { query, files: [], researchMode },
          aiCallbacks
        ); // Passing empty array for files to aiService for now
      }
    } catch (error: any) {
      /* ... */ setIsProcessing(false);
      setStreamingContent("");
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && uploadedFiles.length === 0) return;
    const currentQuery = newMessage; // Capture before reset
    const currentFiles = [...uploadedFiles]; // Capture before reset

    const filesForDisplay = currentFiles.map((f) => ({
      name: f.name,
      type: f.type || "unknown",
      size: f.file.size,
    }));
    const userMessage: ChatMessage = {
      id: uuidv4(),
      type: "user",
      content: currentQuery,
      files: filesForDisplay.length > 0 ? filesForDisplay : undefined,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setNewMessage("");
    setUploadedFiles([]);
    setIsProcessing(true);
    // For follow-ups, originalQuery might be the very first query of the session or this new one.
    // If chat is continuous, originalQuery should persist from the first message.
    // If each follow-up should be "new" for mind map context, then update it:
    // setOriginalQuery(currentQuery);

    try {
      const lastAiMessage = messages.filter((m) => m.type === "ai").pop();
      if (lastAiMessage && !isAutonomousMode) {
        // Only use AIService follow-up if not in autonomous mode
        const contextReport: FinalReport = {
          content: lastAiMessage.content,
          sources: lastAiMessage.sources || [],
          wordCount: lastAiMessage.content.split(" ").length, // Approximate
        };
        const followUpCallbacks: AIServiceCallbacks = {
          onThinkingUpdate: (data) =>
            setCurrentThinkingStreamData((prev) => [...prev, data]),
          onProgress: (stage, progress) =>
            console.log(`Follow-up progress: ${stage} (${progress}%)`),
          onError: (error) => {
            /* ... */ setIsProcessing(false);
          },
          onComplete: (response) => {
            const aiMessageId = uuidv4();
            const thinkingForStorage = [
              ...currentThinkingStreamData,
              ...(response.thinkingProcess || []),
            ];
            const aiMessage: ChatMessage = {
              id: aiMessageId,
              type: "ai",
              content: response.finalReport.content,
              thinkingStreamData: thinkingForStorage,
              sources: response.finalReport.sources,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
            // Note: Mind map generation removed - now manual via UI button

            if (thinkingForStorage.length > 0) {
              console.log(
                "ChatPage: Saving thinking process for follow-up message ID:",
                aiMessageId,
                "Data points:",
                thinkingForStorage.length
              );
              chatSessionStorage.saveThinkingProcess(
                aiMessageId,
                thinkingForStorage
              );
            }
            setCurrentThinking([]);
            setCurrentThinkingStreamData([]);
            setIsProcessing(false);
          },
        };
        await aiService.processFollowUp(
          currentQuery,
          contextReport,
          followUpCallbacks
        );
      } else {
        // If autonomous or no prior AI message, treat as a new research query
        await handleInitialQuery(currentQuery, currentFiles, false); // Default to 'Normal' research for simplicity
      }
    } catch (error: any) {
      /* ... */ setIsProcessing(false);
    }
  };

  // Session Management Functions
  const handleSessionSelect = (sessionId: string) => {
    try {
      const session = chatSessionStorage.loadSession(sessionId);
      if (session) {
        setCurrentSessionId(sessionId);
        setMessages(session.messages);
        setOriginalQuery(session.originalQuery);
        setIsAutonomousMode(session.isAutonomousMode);
        setFullMindMapData(session.fullMindMapData || null);

        // Reset other states
        setUploadedFiles([]);
        setCurrentThinking([]);
        setCurrentThinkingStreamData([]);
        setStreamingContent("");
        setIsProcessing(false);
        setShowMindMap(false);
        setDisplayedMindMapData(null);

        if (session.fullMindMapData) {
          const initialNodes = session.fullMindMapData.nodes.filter(
            (node) => node.data.level <= INITIAL_DISPLAY_LEVEL
          );
          const initialNodeIds = new Set(initialNodes.map((node) => node.id));
          const initialEdges = session.fullMindMapData.edges.filter(
            (edge) =>
              initialNodeIds.has(edge.source) && initialNodeIds.has(edge.target)
          );
          setDisplayedMindMapData({ nodes: initialNodes, edges: initialEdges });
        }
      }
    } catch (error) {
      console.error("Error loading session:", error);
      toast({
        title: "Session Load Error",
        description: "Could not load the selected session",
        variant: "destructive",
      });
    }
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleNewChat = () => {
    // Clear current session data
    if (currentSessionId) {
      // The session is already saved, just need to clear local state
      messages.forEach((msg) => {
        if (msg.type === "ai") {
          // Don't remove thinking processes as they're stored with the session
        }
      });
    }

    // Create new session
    const newSessionId = chatSessionStorage.createNewSession();
    setCurrentSessionId(newSessionId);

    // Reset all state
    setMessages([]);
    setOriginalQuery("");
    setUploadedFiles([]);
    setFullMindMapData(null);
    setDisplayedMindMapData(null);
    setCurrentThinking([]);
    setCurrentThinkingStreamData([]);
    setStreamingContent("");
    setIsProcessing(false);
    setShowMindMap(false);

    toast({
      title: "New Chat Started",
      description: "Previous session saved and new session created.",
    });
  };

  // File upload handler for ChatInput (simplified as it doesn't auto-process here)
  const handleChatFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    const fileArray = Array.from(files);
    // Basic validation, can be expanded
    if (uploadedFiles.length + fileArray.length > 2) {
      toast({
        title: "File Limit",
        description: "Max 2 files for follow-up.",
        variant: "destructive",
      });
      return;
    }
    const newUiFiles: UploadedFile[] = fileArray.map((f) => ({
      id: uuidv4(),
      name: f.name,
      type: f.type,
      file: f,
      content: "", // Content not read here
    }));
    setUploadedFiles((prev) => [...prev, ...newUiFiles]);
  };

  const closeThinkingProcessDialog = () => {
    setViewingThinkingForMessageId(null);
    setRetrievedThinkingStream(null);
  };

  const hasThinkingData = (messageId: string): boolean => {
    return chatSessionStorage.hasThinkingProcess(messageId);
  };

  const handleViewThinking = (messageId: string) => {
    const thinkingData = chatSessionStorage.loadThinkingProcess(messageId);
    if (thinkingData) {
      setRetrievedThinkingStream(thinkingData);
      setViewingThinkingForMessageId(messageId);
    } else {
      toast({
        title: "No Thinking Data",
        description: "No thinking process found for this message",
        variant: "destructive",
      });
    }
  };

  const generateAndShowMindMap = async () => {
    if (fullMindMapData) {
      // If mind map exists, just show it
      setShowMindMap(true);
      return;
    }

    // Generate new mind map from latest AI message
    const lastAiMessage = messages.filter((m) => m.type === "ai").pop();
    if (!lastAiMessage) {
      toast({
        title: "No Content Available",
        description: "No AI response available to generate mind map from.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);

      const mindMap = await mindMapService.generateMindMap(
        lastAiMessage.content,
        originalQuery || "Research Query",
        10 // Max levels for detailed map
      );

      if (mindMap) {
        setFullMindMapData(mindMap);
        // Initialize displayed mind map with first 3 levels
        const initialNodes = mindMap.nodes.filter(
          (node) => node.data.level <= INITIAL_DISPLAY_LEVEL
        );
        const initialNodeIds = new Set(initialNodes.map((node) => node.id));
        const initialEdges = mindMap.edges.filter(
          (edge) =>
            initialNodeIds.has(edge.source) && initialNodeIds.has(edge.target)
        );
        setDisplayedMindMapData({ nodes: initialNodes, edges: initialEdges });
        setShowMindMap(true);

        toast({
          title: "Mind Map Generated",
          description: "Knowledge mind map has been created successfully.",
        });
      } else {
        throw new Error("Failed to generate mind map");
      }
    } catch (error) {
      console.error("Mind map generation error:", error);
      toast({
        title: "Generation Failed",
        description: "Could not generate mind map. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNodeExpand = async (nodeId: string) => {
    if (!fullMindMapData || !displayedMindMapData) return;

    try {
      setIsProcessing(true);

      // Find children of the node in fullMindMapData
      const nodeChildren = fullMindMapData.edges
        .filter((edge) => edge.source === nodeId)
        .map((edge) => edge.target);

      const childNodes = fullMindMapData.nodes.filter((node) =>
        nodeChildren.includes(node.id)
      );

      const childEdges = fullMindMapData.edges.filter(
        (edge) => nodeChildren.includes(edge.target) && edge.source === nodeId
      );

      // Add children to displayed mind map
      const existingNodeIds = new Set(
        displayedMindMapData.nodes.map((n) => n.id)
      );
      const newNodes = childNodes.filter(
        (node) => !existingNodeIds.has(node.id)
      );

      const existingEdgeIds = new Set(
        displayedMindMapData.edges.map((e) => e.id)
      );
      const newEdges = childEdges.filter(
        (edge) => !existingEdgeIds.has(edge.id)
      );

      if (newNodes.length === 0) {
        toast({
          title: "No Children",
          description: "This node has no child nodes to expand.",
        });
        return;
      }

      setDisplayedMindMapData((prev) => {
        if (!prev) return prev;
        return {
          nodes: [...prev.nodes, ...newNodes],
          edges: [...prev.edges, ...newEdges],
        };
      });

      toast({
        title: "Node Expanded",
        description: `Added ${newNodes.length} child nodes.`,
      });
    } catch (error) {
      console.error("Node expansion error:", error);
      toast({
        title: "Expansion Failed",
        description: "Could not expand node. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNodeReveal = async (nodeId: string) => {
    if (!fullMindMapData || !displayedMindMapData) return;

    try {
      setIsProcessing(true);

      // Find the node and its level
      const targetNode = fullMindMapData.nodes.find((n) => n.id === nodeId);
      if (!targetNode) return;

      const nodeLevel = targetNode.data.level;

      // Show all nodes up to this level + 1
      const newMaxLevel = Math.max(nodeLevel + 1, INITIAL_DISPLAY_LEVEL);
      const revealedNodes = fullMindMapData.nodes.filter(
        (node) => node.data.level <= newMaxLevel
      );

      const revealedNodeIds = new Set(revealedNodes.map((node) => node.id));
      const revealedEdges = fullMindMapData.edges.filter(
        (edge) =>
          revealedNodeIds.has(edge.source) && revealedNodeIds.has(edge.target)
      );

      setDisplayedMindMapData({
        nodes: revealedNodes,
        edges: revealedEdges,
      });

      toast({
        title: "Mind Map Revealed",
        description: `Showing all nodes up to level ${newMaxLevel}.`,
      });
    } catch (error) {
      console.error("Node reveal error:", error);
      toast({
        title: "Reveal Failed",
        description: "Could not reveal mind map section.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const regenerateMindMap = async () => {
    const lastAiMessage = messages.filter((m) => m.type === "ai").pop();
    if (!lastAiMessage) return;

    try {
      setIsProcessing(true);
      setFullMindMapData(null);
      setDisplayedMindMapData(null);

      const mindMap = await mindMapService.generateMindMap(
        lastAiMessage.content,
        originalQuery || "Research Query",
        10
      );

      if (mindMap) {
        setFullMindMapData(mindMap);
        const initialNodes = mindMap.nodes.filter(
          (node) => node.data.level <= INITIAL_DISPLAY_LEVEL
        );
        const initialNodeIds = new Set(initialNodes.map((node) => node.id));
        const initialEdges = mindMap.edges.filter(
          (edge) =>
            initialNodeIds.has(edge.source) && initialNodeIds.has(edge.target)
        );
        setDisplayedMindMapData({ nodes: initialNodes, edges: initialEdges });

        toast({
          title: "Mind Map Regenerated",
          description:
            "Knowledge mind map has been recreated with fresh insights.",
        });
      }
    } catch (error) {
      console.error("Mind map regeneration error:", error);
      toast({
        title: "Regeneration Failed",
        description: "Could not regenerate mind map.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  // Existing functions: handleViewThinking, handleNodeExpand, handleNodeReveal, processResearchQuery, etc.
  // These should largely remain the same, but ensure they use the state variables correctly.

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Chat Sidebar */}
      <ChatSidebar
        isOpen={isSidebarOpen}
        onToggle={handleToggleSidebar}
        currentSessionId={currentSessionId || undefined}
        onSessionSelect={handleSessionSelect}
        onNewChat={handleNewChat}
      />

      <div className="sticky top-0 z-40 bg-slate-800/40 border-b border-slate-700/50 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleSidebar}
              className="text-slate-300 hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1
              className="text-3xl font-extralight bg-gradient-to-r from-red-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent cursor-pointer hover:scale-105 transition-transform"
              onClick={() => navigate("/")}
            >
              Novah
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            {" "}
            {/* Reduced space for more buttons */}
            <Button
              onClick={handleNewChat}
              variant="outline"
              size="sm"
              className="text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white"
            >
              <FilePlus className="h-4 w-4 mr-2" /> New Chat
            </Button>
            {messages.some((m) => m.type === "ai") && !showMindMap && (
              <Button
                onClick={generateAndShowMindMap}
                className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white"
                disabled={isProcessing}
                size="sm"
              >
                <Map className="h-4 w-4 mr-2" />
                {fullMindMapData ? "View Mind Map" : "Generate Mind Map"}
              </Button>
            )}
            {showMindMap && (
              <Button
                variant="outline"
                onClick={() => setShowMindMap(false)}
                className="bg-slate-700/30 border border-slate-600/50 text-white hover:bg-slate-700/50"
                size="sm"
              >
                <X className="h-4 w-4 mr-2" />
                Hide Map
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Rest of the JSX (Chat container, MindMap container, Dialog) remains similar */}
      <div className="flex h-[calc(100vh-80px)] relative">
        <div
          className={`chat-container ${
            showMindMap ? "w-1/2" : "w-full"
          } flex flex-col`}
        >
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={{
                    ...message,
                    timestamp:
                      typeof message.timestamp === "string"
                        ? new Date(message.timestamp)
                        : message.timestamp,
                  }}
                  onViewThinking={handleViewThinking}
                  hasThinkingData={hasThinkingData}
                />
              ))}
              {isProcessing &&
                messages.length > 0 &&
                messages[messages.length - 1].type === "user" && (
                  <div className="flex justify-start">
                    <div className="max-w-3xl">
                      {isAutonomousMode ? (
                        <AutonomousThinkingProcess
                          streamData={currentThinkingStreamData}
                          isAutonomous={true}
                          isVisible={true}
                        />
                      ) : (
                        <div className="bg-slate-800/50 text-white border border-slate-700/50 backdrop-blur-sm rounded-lg p-4">
                          <p className="text-slate-300">
                            Processing your request...
                          </p>
                        </div>
                      )}
                      {/* Removed streamingContent display here as it's part of AI message bubble now or handled internally */}
                    </div>
                  </div>
                )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <ChatInput
            message={newMessage}
            onMessageChange={setNewMessage}
            onSendMessage={handleSendMessage}
            onFileUpload={handleChatFileUpload} // Use specific handler for ChatInput uploads
            uploadedFiles={uploadedFiles}
            onRemoveFile={(id) =>
              setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
            }
            isProcessing={isProcessing}
          />
        </div>

        {showMindMap && displayedMindMapData && (
          <div className="mind-map-container w-1/2 border-l border-slate-700/50">
            <div className="h-full flex flex-col bg-slate-800/50">
              <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                <h3 className="text-white font-medium">Research Mind Map</h3>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={regenerateMindMap}
                    disabled={isProcessing}
                    className="text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Regenerate"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMindMap(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1">
                <MindMap
                  mindMapData={displayedMindMapData}
                  onNodeExpand={handleNodeExpand}
                  isLoading={isProcessing && !displayedMindMapData}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={viewingThinkingForMessageId !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) closeThinkingProcessDialog();
        }}
      >
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Retrieved AI Thinking Process</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 rounded-md bg-slate-850 custom-scrollbar">
            {retrievedThinkingStream && retrievedThinkingStream.length > 0 ? (
              // Assuming AutonomousThinkingProcess can also display stored ThinkingStreamData[]
              <AutonomousThinkingProcess
                streamData={retrievedThinkingStream}
                isAutonomous={true}
                isVisible={true}
              />
            ) : (
              <p>No thinking process data to display or data is empty.</p>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={closeThinkingProcessDialog}
              className="border-slate-600 hover:border-slate-500"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
// Helper function to generate unique IDs, if not already available
const uuidv4 = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default ChatPage;
