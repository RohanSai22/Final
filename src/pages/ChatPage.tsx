import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Map, X, Menu } from "lucide-react"; // Added Menu
// Dialog related imports are removed as the dialog for thinking process is removed
import MindMap from "@/components/ModernMindMap";
import { useSidebar } from "@/contexts/SidebarContext"; // Added
import { toast } from "@/hooks/use-toast";
import ThinkingProcess from "@/components/chat/ThinkingProcess"; // For older 'thinking' steps
import AutonomousThinkingProcess from "@/components/chat/AutonomousThinkingProcess";
// StreamingText is used by MessageBubble
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import {
  aiService,
  type ThinkingStreamData, // Still needed for live thinking stream
  type FinalReport,
  // type Source, // Source is part of ChatMessage, not directly used here
  type MindMapData,
  type AIServiceCallbacks,
} from "@/services/aiService";
import {
  autonomousResearchAgent,
  // type StreamingCallback, // AIServiceCallbacks is used
  type ProcessedFileInput,
} from "@/services/autonomousResearchAgent";
import {
  fileProcessingService,
} from "@/services/fileProcessingService";
import { mindMapService } from "@/services/mindMapService";
import {
  UploadedFileMetadata,
  UploadedFile,
  ChatMessage,
  ThinkingStep,
  ChatSession,
} from "@/types/common";
import ChatHistorySidebar from "@/components/chat/ChatHistorySidebar";

const CHAT_HISTORY_KEY = 'novah_chat_history';
const CHAT_SESSION_KEY = 'chatSession'; // Kept for potential cleanup of old data

const INITIAL_DISPLAY_LEVEL = 3;

const ChatPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSidebarOpen, toggleSidebar, setIsSidebarOpen } = useSidebar(); // Added
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentThinking, setCurrentThinking] = useState<ThinkingStep[]>([]);
  const [currentThinkingStreamData, setCurrentThinkingStreamData] = useState<ThinkingStreamData[]>([]); // For live display during generation
  const [showMindMap, setShowMindMap] = useState(false);
  const [fullMindMapData, setFullMindMapData] = useState<MindMapData | null>(null);
  const [displayedMindMapData, setDisplayedMindMapData] = useState<MindMapData | null>(null);
  // streamingContent was not used, can be removed if not planned for other features
  // const [streamingContent, setStreamingContent] = useState("");
  const [originalQuery, setOriginalQuery] = useState("");
  const [isAutonomousMode, setIsAutonomousMode] = useState(true);

  // Removed viewingThinkingForMessageId and retrievedThinkingStream states

  const [currentSessionId, setCurrentSessionId] = useState<string>(uuidv4());
  const [currentSessionName, setCurrentSessionName] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);

  const saveChatSession = () => {
    if (!currentSessionId) {
      console.error("ChatPage: Cannot save session without a currentSessionId.");
      return;
    }
    try {
      const historyRaw = localStorage.getItem(CHAT_HISTORY_KEY);
      let history: ChatSession[] = historyRaw ? JSON.parse(historyRaw) : [];
      history = history.filter(session => session && typeof session.id !== 'undefined');

      let sessionNameToSave = currentSessionName;
      if (!sessionNameToSave && messages.length > 0 && messages[0].type === 'user' && messages[0].content.trim()) {
        sessionNameToSave = messages[0].content.substring(0, 50);
      } else if (!sessionNameToSave) {
        const firstMessageTimestamp = messages[0]?.timestamp;
        sessionNameToSave = `Session ${new Date(firstMessageTimestamp || Date.now()).toLocaleDateString()} ${new Date(firstMessageTimestamp || Date.now()).toLocaleTimeString()}`;
      }

      const sessionData: ChatSession = {
        id: currentSessionId,
        name: sessionNameToSave,
        originalQuery,
        uploadedFileMetadata: uploadedFiles.map(f => ({ id: f.id, name: f.name, type: f.type, size: f.file?.size || 0, status: "uploaded" })),
        isAutonomousMode,
        messages, // This now includes thinkingStreamData within each AI message
        fullMindMapData,
      };

      const existingSessionIndex = history.findIndex(s => s.id === currentSessionId);
      if (existingSessionIndex !== -1) {
        history[existingSessionIndex] = sessionData;
      } else {
        history.push(sessionData);
      }
      setChatHistory([...history]); // Update state with a new array reference
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error("ChatPage: Error saving chat session to history in localStorage:", error);
      toast({ title: "Session Save Error", description: "Could not save your chat session to history.", variant: "destructive"});
    }
  };

  useEffect(() => {
    if (messages.length > 0 && !isProcessing && currentSessionId) {
      saveChatSession();
    }
  }, [messages, originalQuery, uploadedFiles, isAutonomousMode, fullMindMapData, isProcessing, currentSessionId, currentSessionName]);


  useEffect(() => {
    const historyRaw = localStorage.getItem(CHAT_HISTORY_KEY);
    let loadedSessions: ChatSession[] = [];

    if (historyRaw) {
      try {
        loadedSessions = JSON.parse(historyRaw).filter((s: ChatSession | null) => s && typeof s.id !== 'undefined');
        setChatHistory(loadedSessions);
      } catch (error) {
        console.error("ChatPage: Error parsing chat history from localStorage:", error);
        loadedSessions = [];
        setChatHistory([]);
      }
    }

    const state = location.state as {
      query?: string;
      files?: ProcessedFileInput[];
      deepResearch?: boolean;
      autonomousMode?: boolean;
      sessionIdToLoad?: string;
      startNewChat?: boolean;
    } | null;

    if (state?.sessionIdToLoad) {
      console.log("ChatPage: Loading session from navigation state:", state.sessionIdToLoad);
      // Ensure history is loaded before trying to select a chat
      if (loadedSessions.find(s => s.id === state.sessionIdToLoad)) {
        handleSelectChat(state.sessionIdToLoad);
      } else if (historyRaw) { // If history was just loaded, try again
        const freshlyLoaded = JSON.parse(historyRaw).filter((s: ChatSession | null) => s && typeof s.id !== 'undefined');
        if (freshlyLoaded.find((s: ChatSession) => s.id === state.sessionIdToLoad)) {
          setChatHistory(freshlyLoaded); // Ensure chatHistory state is updated before select
          handleSelectChat(state.sessionIdToLoad);
        } else {
          console.warn(`ChatPage: Session ID ${state.sessionIdToLoad} not found in history.`);
          if (loadedSessions.length > 0) handleSelectChat(loadedSessions[loadedSessions.length - 1].id); else handleNewChat();
        }
      } else { // No history, new chat
         console.warn(`ChatPage: Session ID ${state.sessionIdToLoad} requested but no history. Starting new chat.`);
         handleNewChat();
      }
      navigate(location.pathname, { replace: true, state: {} }); // Clear state
      setIsSidebarOpen(true); // Open sidebar when a chat is selected via this path
    } else if (state?.startNewChat) {
      console.log("ChatPage: Starting new chat from navigation state.");
      handleNewChat();
      navigate(location.pathname, { replace: true, state: {} }); // Clear state
      setIsSidebarOpen(true); // Open sidebar for new chat
    } else if (state?.query) {
        console.log("ChatPage: New research query from navigation state.");
        const newId = uuidv4();
        setCurrentSessionId(newId);
        const { query, files, deepResearch, autonomousMode: navAutonomousMode } = state;
        const newName = query ? query.substring(0, 50) : `New Session ${new Date().toLocaleTimeString()}`;
        setCurrentSessionName(newName);
        setOriginalQuery(query || "");
        setIsAutonomousMode(navAutonomousMode === undefined ? true : navAutonomousMode);
        const initialProcessedFilesFromNav: ProcessedFileInput[] = files || [];
        setUploadedFiles([]);
        setMessages([]);
        setFullMindMapData(null);
        setDisplayedMindMapData(null);
        handleInitialQuery(query, initialProcessedFilesFromNav, deepResearch);
        navigate(location.pathname, { replace: true, state: {} }); // Clear state
        setIsSidebarOpen(true); // Open sidebar for new query
    } else if (loadedSessions.length > 0 && !messages.length) { // Only load most recent if no messages currently (e.g. initial load)
        const mostRecentSession = loadedSessions[loadedSessions.length - 1];
        console.log("ChatPage: Loading most recent session:", mostRecentSession.id);
        handleSelectChat(mostRecentSession.id);
        // setIsSidebarOpen(true); // Optionally open sidebar
    } else if (loadedSessions.length === 0 && !messages.length) { // No history and no current messages
        console.log("ChatPage: No saved history and no navigation state. Starting a fresh session.");
        handleNewChat(); // Start a new chat if no history and no query
    }
    // If there are messages already, or none of the above conditions met, do nothing to preserve current state.
  }, [location.state, navigate]); // Added navigate to dependency array


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Removed handleViewThinking function

  const handleInitialQuery = async (query: string, currentFiles: ProcessedFileInput[], deepResearch: boolean) => {
    const filesForDisplay = currentFiles.map(f => ({ name: f.name, type: f.type || 'unknown', size: 0, id: uuidv4(), status: "uploaded" as "uploaded" }));
    const userMessage: ChatMessage = {
      id: uuidv4(), type: "user", content: query,
      files: filesForDisplay.length > 0 ? filesForDisplay : undefined,
      timestamp: new Date(),
    };
    setMessages([userMessage]); // Set only the user message, AI response will be added later
    await processResearchQuery(query, currentFiles, deepResearch);
  };

  const processResearchQuery = async (query: string, currentFiles: ProcessedFileInput[], deepResearch: boolean) => {
    setIsProcessing(true);
    setCurrentThinking([]);
    const liveThinkingStreamData: ThinkingStreamData[] = []; // This will be populated by callbacks
    setCurrentThinkingStreamData([]); // Clear live display for new query

    // Add thinking message
    const thinkingMessage: ChatMessage = {
      id: uuidv4(),
      type: "thinking",
      content: "Thinking...", // Placeholder content, MessageBubble will handle actual display
      timestamp: new Date()
    };
    setMessages(prev => [...prev, thinkingMessage]);

    const processAndSetMindMapData = (mindMap: MindMapData) => {
      setFullMindMapData(mindMap);
      const initialNodes = mindMap.nodes.filter(node => node.data.level <= INITIAL_DISPLAY_LEVEL);
      const initialNodeIds = new Set(initialNodes.map(node => node.id));
      const initialEdges = mindMap.edges.filter(edge => initialNodeIds.has(edge.source) && initialNodeIds.has(edge.target));
      setDisplayedMindMapData({ nodes: initialNodes, edges: initialEdges });
    };

    try {
      const researchMode = deepResearch ? "Deep" : "Normal";
      const onThinkingDataCallback = (streamData: ThinkingStreamData) => {
        liveThinkingStreamData.push(streamData);
        setCurrentThinkingStreamData([...liveThinkingStreamData]);
      };

      if (isAutonomousMode) {
        await autonomousResearchAgent.conductResearch(query, currentFiles, researchMode, {
            onThinkingData: onThinkingDataCallback,
            onFinalAnswer: async (report) => {
              setMessages(prev => prev.filter(m => m.type !== "thinking")); // Remove thinking message
              const aiMessage: ChatMessage = {
                id: uuidv4(), type: "ai", content: report.content,
                thinkingStreamData: [...liveThinkingStreamData], // Use the accumulated stream for this message
                sources: report.sources, timestamp: new Date(), isAutonomous: true,
              };
              setMessages((prev) => [...prev, aiMessage]);
              // if (mindMapService) {
              //   const mindMap = await mindMapService.generateMindMap(report.content, originalQuery || query, 10);
              //   if (mindMap) processAndSetMindMapData(mindMap);
              // }
              // No more localStorage for thinking_process
              setCurrentThinkingStreamData([]); // Clear global stream data after processing this message
              setIsProcessing(false);
            },
            onError: (error) => {
              setMessages(prev => prev.filter(m => m.type !== "thinking")); // Remove thinking message
              setIsProcessing(false);
              toast({title: "Research Error", description: error.message, variant: "destructive"});
              setCurrentThinkingStreamData([]); // Clear global stream
            },
          }
        );
      } else {
        const aiCallbacks: AIServiceCallbacks = {
          onThinkingUpdate: onThinkingDataCallback, // This will update currentThinkingStreamData for the bubble
          onProgress: (stage, progress) => console.log(`Research progress: ${stage} (${progress}%)`),
          onError: (error) => {
            setMessages(prev => prev.filter(m => m.type !== "thinking")); // Remove thinking message
            setIsProcessing(false);
            toast({title: "Research Error", description: error.message, variant: "destructive"});
            setCurrentThinkingStreamData([]); // Clear global stream
          },
          onComplete: (response) => {
            setMessages(prev => prev.filter(m => m.type !== "thinking")); // Remove thinking message
            const aiMessage: ChatMessage = {
              id: uuidv4(), type: "ai", content: response.finalReport.content,
              thinkingStreamData: [...liveThinkingStreamData, ...(response.thinkingProcess || [])], // Use accumulated stream
              sources: response.finalReport.sources,
              timestamp: new Date(), isAutonomous: false,
            };
            setMessages((prev) => [...prev, aiMessage]);
            // if (response.mindMap) processAndSetMindMapData(response.mindMap);
            // No more localStorage for thinking_process
            setCurrentThinkingStreamData([]); // Clear global stream data
            setIsProcessing(false);
          },
        };
        await aiService.processResearch({ query, files: [], researchMode }, aiCallbacks);
      }
    } catch (error: any) {
      setMessages(prev => prev.filter(m => m.type !== "thinking")); // Remove thinking message on outer error
      setIsProcessing(false);
      toast({title: "Processing Error", description: error.message, variant: "destructive"});
      setCurrentThinkingStreamData([]); // Clear global stream
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && uploadedFiles.length === 0) return;
    const currentQuery = newMessage;
    const currentUiFiles = [...uploadedFiles];

    const processedFilesForAgent: ProcessedFileInput[] = await Promise.all(
      currentUiFiles.map(async (uiFile) => {
        if (uiFile.file) {
          try {
            const content = await fileProcessingService.readFileAsText(uiFile.file);
            return { name: uiFile.name, content, type: uiFile.type };
          } catch (err) {
            toast({title: "File Read Error", description: `Could not read ${uiFile.name}.`, variant: "destructive"});
            return { name: uiFile.name, content: "", type: uiFile.type };
          }
        }
        return { name: uiFile.name, content: uiFile.content || "", type: uiFile.type };
      })
    );

    const filesForDisplay = currentUiFiles.map(f => ({ id: f.id, name: f.name, type: f.type, size: f.file?.size || 0, status: "uploaded" as "uploaded" }));
    const userMessage: ChatMessage = {
      id: uuidv4(), type: "user", content: currentQuery,
      files: filesForDisplay.length > 0 ? filesForDisplay : undefined, timestamp: new Date(),
    };
    // Do not set messages with userMessage yet, will be combined with thinking message
    setNewMessage("");
    setUploadedFiles([]);

    // Add thinking message for follow-up
    const thinkingMessage: ChatMessage = {
      id: uuidv4(),
      type: "thinking",
      content: "Thinking...",
      timestamp: new Date()
    };
    // Add user message and thinking message together
    setMessages((prev) => [...prev, userMessage, thinkingMessage]);
    setIsProcessing(true); // Set isProcessing after user message is shown

    const liveThinkingStreamData: ThinkingStreamData[] = [];
    setCurrentThinkingStreamData([]); // Clear global stream for new follow-up

    try {
      const lastAiMessage = messages.filter((m) => m.type === "ai" && !m.isAutonomous).pop(); // Ensure we get a non-autonomous AI message for context
      if (lastAiMessage && !isAutonomousMode) {
        const contextReport: FinalReport = {
          content: lastAiMessage.content, sources: lastAiMessage.sources || [],
          wordCount: lastAiMessage.content.split(" ").length,
        };
        const followUpCallbacks: AIServiceCallbacks = {
          onThinkingUpdate: (data) => { liveThinkingStreamData.push(data); setCurrentThinkingStreamData([...liveThinkingStreamData]); }, // Updates global stream
          onProgress: (stage, progress) => console.log(`Follow-up progress: ${stage} (${progress}%)`),
          onError: (error) => {
            setMessages(prev => prev.filter(m => m.type !== "thinking")); // Remove thinking message
            setIsProcessing(false);
            toast({title: "Follow-up Error", description: error.message, variant: "destructive"});
            setCurrentThinkingStreamData([]); // Clear global stream
          },
          onComplete: (response) => {
            setMessages(prev => prev.filter(m => m.type !== "thinking")); // Remove thinking message
            const aiMessage: ChatMessage = {
              id: uuidv4(), type: "ai", content: response.finalReport.content,
              thinkingStreamData: [...liveThinkingStreamData, ...(response.thinkingProcess || [])], // Use accumulated stream
              sources: response.finalReport.sources,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
            // if (response.mindMap) processAndSetMindMapData(response.mindMap);
            // No more localStorage for thinking_process
            setCurrentThinkingStreamData([]); // Clear global stream
            setIsProcessing(false);
          },
        };
        await aiService.processFollowUp(currentQuery, contextReport, followUpCallbacks);
      } else {
        // If no last AI message or if in autonomous mode, treat as initial query.
        setMessages(prev => prev.filter(m => m.type !== "thinking")); // Remove thinking message from handleSendMessage
        // processResearchQuery will add its own thinking message and handle setIsProcessing
        await processResearchQuery(currentQuery, processedFilesForAgent, false);
      }
    } catch (error: any) {
      setMessages(prev => prev.filter(m => m.type !== "thinking")); // Remove thinking message on outer error
      setIsProcessing(false);
      toast({title: "Message Sending Error", description: error.message, variant: "destructive"});
      setCurrentThinkingStreamData([]); // Clear global stream
    }
  };

  const handleNewChat = () => {
    const newId = uuidv4();
    setCurrentSessionId(newId);
    setCurrentSessionName(null);
    setMessages([]);
    setOriginalQuery("");
    setUploadedFiles([]);
    setFullMindMapData(null);
    setDisplayedMindMapData(null);
    setCurrentThinking([]);
    setCurrentThinkingStreamData([]);
    setIsProcessing(false);
    setShowMindMap(false);
    toast({ title: "New Chat Started", description: "Ready for a new conversation." });
  };

  const handleChatFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    const fileArray = Array.from(files);
    if (uploadedFiles.length + fileArray.length > 5) {
        toast({ title: "File Limit", description: "Max 5 files.", variant: "destructive" });
        return;
    }
    const newUiFiles: UploadedFile[] = fileArray.map(f => ({
        id: uuidv4(), name: f.name, type: f.type, file: f, content: ""
    }));
    setUploadedFiles(prev => [...prev, ...newUiFiles]);
  };

  const handleSelectChat = (sessionId: string) => {
    const sessionToLoad = chatHistory.find(s => s.id === sessionId);
    if (sessionToLoad) {
      setCurrentSessionId(sessionToLoad.id);
      setCurrentSessionName(sessionToLoad.name || null);
      // Ensure messages have Date objects for timestamps
      setMessages(sessionToLoad.messages.map(msg => ({ ...msg, timestamp: new Date(msg.timestamp) })));
      setOriginalQuery(sessionToLoad.originalQuery || "");

      if (sessionToLoad.uploadedFileMetadata && sessionToLoad.uploadedFileMetadata.length > 0) {
        setUploadedFiles(sessionToLoad.uploadedFileMetadata.map(meta => ({
          id: meta.id || uuidv4(), name: meta.name, type: meta.type,
          size: meta.size, status: meta.status, content: "",
          file: null as any, processed: true,
        })));
      } else {
        setUploadedFiles([]);
      }

      setIsAutonomousMode(sessionToLoad.isAutonomousMode === undefined ? true : sessionToLoad.isAutonomousMode);

      if (sessionToLoad.fullMindMapData) {
        setFullMindMapData(sessionToLoad.fullMindMapData);
        const initialNodes = sessionToLoad.fullMindMapData.nodes.filter(node => node.data.level <= INITIAL_DISPLAY_LEVEL);
        const initialNodeIds = new Set(initialNodes.map(node => node.id));
        const initialEdges = sessionToLoad.fullMindMapData.edges.filter(edge => initialNodeIds.has(edge.source) && initialNodeIds.has(edge.target));
        setDisplayedMindMapData({ nodes: initialNodes, edges: initialEdges });
      } else {
        setFullMindMapData(null);
        setDisplayedMindMapData(null);
      }
      setIsProcessing(false); setCurrentThinking([]); setCurrentThinkingStreamData([]);
      setShowMindMap(false);
      toast({ title: "Chat Loaded", description: `Switched to session: ${sessionToLoad.name || sessionToLoad.id}` });
    } else {
      toast({ title: "Error", description: "Could not load the selected chat session.", variant: "destructive" });
    }
  };

  const handleDeleteChat = (sessionId: string) => {
    const updatedHistory = chatHistory.filter(s => s.id !== sessionId);
    setChatHistory(updatedHistory);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updatedHistory));
    // No more localStorage thinking_process cleanup for deleted session messages
    toast({ title: "Chat Deleted", description: `Session removed.`, variant: "default" });
    if (currentSessionId === sessionId) {
      if (updatedHistory.length > 0) {
        handleSelectChat(updatedHistory[updatedHistory.length - 1].id);
      } else {
        handleNewChat();
      }
    }
  };

  // Removed closeThinkingProcessDialog as the dialog and its state vars are gone
  const generateAndShowMindMap = async () => {
    if (isProcessing || !messages.length) return;
    setIsProcessing(true);
    const lastMessageContent = messages.find(m => m.type === 'ai')?.content || messages[messages.length-1].content; // Prefer AI message
    try {
        const mindMap = await mindMapService.generateMindMap(lastMessageContent, originalQuery || messages[0]?.content || "Chat Topic", 10);
        if (mindMap) {
            setFullMindMapData(mindMap);
            const initialNodes = mindMap.nodes.filter(node => node.data.level <= INITIAL_DISPLAY_LEVEL);
            const initialNodeIds = new Set(initialNodes.map(node => node.id));
            const initialEdges = mindMap.edges.filter(edge => initialNodeIds.has(edge.source) && initialNodeIds.has(edge.target));
            setDisplayedMindMapData({ nodes: initialNodes, edges: initialEdges });
            setShowMindMap(true);
        } else {
          toast({title: "Mind Map Generation", description: "Could not generate a mind map for this content.", variant: "default"});
        }
    } catch (err) {
        toast({title: "Mind Map Error", description: (err as Error).message, variant: "destructive"});
    } finally {
        setIsProcessing(false);
    }
  };

  const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  const handleNodeExpand = (nodeId: string) => { console.log("Expand node:", nodeId); /* Placeholder */ };
  const handleNodeReveal = (node: any) => { console.log("Reveal node:", node); /* Placeholder */ };

  return (
    <div className="flex h-screen overflow-hidden relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className={`transition-all duration-300 ease-in-out flex-shrink-0 bg-slate-850 h-full overflow-y-auto custom-scrollbar ${isSidebarOpen ? "w-72" : "w-0"}`}>
        {isSidebarOpen && (
          <ChatHistorySidebar
            chatHistory={chatHistory}
            currentSessionId={currentSessionId}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
          />
        )}
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-y-hidden">
        <div className="sticky top-0 z-30 bg-slate-800/60 border-b border-slate-700/50 backdrop-blur-md p-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center"> {/* Wrapper for button and title */}
              <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-white hover:text-cyan-400 mr-2">
                <Menu className="h-6 w-6" />
              </Button>
              <h1 className="text-3xl font-extralight bg-gradient-to-r from-red-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate("/")}>
                Novah {currentSessionName && <span className="text-sm text-slate-400 ml-2 font-normal">({currentSessionName})</span>}
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              {(messages.some(m => m.type === 'ai')) && !showMindMap && (
                <Button onClick={generateAndShowMindMap} className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white" disabled={isProcessing} size="sm">
                  <Map className="h-4 w-4 mr-2" />
                {fullMindMapData ? "View Mind Map" : "Generate Mind Map"}
              </Button>
            )}
            {showMindMap && fullMindMapData && (
              <Button onClick={generateAndShowMindMap} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white" disabled={isProcessing} size="sm">
                <Map className="h-4 w-4 mr-2" />
                Regenerate Mind Map
              </Button>
            )}
            {showMindMap && (
              <Button variant="outline" onClick={() => setShowMindMap(false)} className="bg-slate-700/30 border border-slate-600/50 text-white hover:bg-slate-700/50" size="sm">
                <X className="h-4 w-4 mr-2" />
                Hide Map
              </Button>
            )}
          </div>
        </div>

        <div className={`flex flex-1 overflow-y-hidden ${showMindMap ? "flex-row" : "flex-col"}`}>
          <div className={`flex flex-col ${showMindMap ? "w-1/2" : "w-full"} h-full`}>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    currentThinkingStreamData={currentThinkingStreamData}
                    isAutonomousMode={isAutonomousMode}
                    // Removed onViewThinking and hasThinkingData props
                  />
                ))}
                {/* Old thinking indicator block is removed here */}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <ChatInput
              message={newMessage}
              onMessageChange={setNewMessage}
              onSendMessage={handleSendMessage}
              onFileUpload={handleChatFileUpload}
              uploadedFiles={uploadedFiles}
              onRemoveFile={(id) => setUploadedFiles((prev) => prev.filter((f) => f.id !== id))}
              isProcessing={isProcessing}
            />
          </div>

          {showMindMap && displayedMindMapData && (
            <div className="mind-map-container w-1/2 border-l border-slate-700/50 h-full overflow-y-auto custom-scrollbar">
              <div className="flex flex-col bg-slate-800/50 h-full">
                <div className="p-4 border-b border-slate-700/50 flex items-center justify-between sticky top-0 bg-slate-800/70 backdrop-blur-sm z-10">
                  <h3 className="text-white font-medium">Knowledge Map</h3>
                  {/* Consider moving Regenerate button here if preferred */}
                  <Button variant="ghost" size="sm" onClick={() => setShowMindMap(false)} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></Button>
                </div>
                <div className="flex-1">
                  <MindMap
                    mindMapData={displayedMindMapData}
                    onNodeExpand={handleNodeExpand}
                    onNodeDoubleClick={handleNodeReveal}
                    isLoading={isProcessing && !displayedMindMapData}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Dialog for thinking process removed */}
      </div>
    </div>
  );
};

export default ChatPage;
