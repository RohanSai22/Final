import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Map, X, Menu, XSquare as LucideXSquare, ChevronsUpDown } from "lucide-react"; // Added Menu, XSquare as LucideX (X is already used)
// Dialog related imports are removed as the dialog for thinking process is removed
import MindMap from "@/components/ModernMindMap";
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for sidebar
  const [isThinkingProcessOpen, setIsThinkingProcessOpen] = useState(false);

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

    if (location.state?.loadSessionId) {
        console.log("ChatPage: loadSessionId found in location state:", location.state.loadSessionId);
        handleSelectChat(location.state.loadSessionId);
        // Clear the state to prevent re-triggering on refresh or remount
        navigate(location.pathname, { replace: true, state: {} });
    } else if (location.state?.startNewSession) {
        console.log("ChatPage: startNewSession found in location state.");
        handleNewChat(); // This function already sets up a new session
        // Clear the state
        navigate(location.pathname, { replace: true, state: {} });
    } else if (location.state?.query) { // Check if location.state and query exist
        console.log("ChatPage: New navigation state present (query). Initializing as a new session.");
        const newId = uuidv4();
        setCurrentSessionId(newId);

        const { query, files, deepResearch, autonomousMode: navAutonomousMode } = location.state as any;

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
    } else if (loadedSessions.length > 0) {
        const mostRecentSession = loadedSessions[loadedSessions.length - 1];
        handleSelectChat(mostRecentSession.id); // Use handleSelectChat to load the session
    } else {
        console.log("ChatPage: No saved history and no navigation state. Starting a fresh session.");
        setCurrentSessionId(uuidv4()); // Ensure a new ID for a completely fresh start
        setCurrentSessionName(null);
        setMessages([]);
        setOriginalQuery("");
        setUploadedFiles([]);
        setFullMindMapData(null);
        setDisplayedMindMapData(null);
    }
  }, [location.state, navigate]); // Added navigate to dependency array


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]); // Removed streamingContent as it's not used

  // handleViewThinking function removed

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
    setIsThinkingProcessOpen(true); // Open thinking process view
    setCurrentThinking([]); // For older thinking steps, if any
    const liveThinkingStreamData: ThinkingStreamData[] = [];
    setCurrentThinkingStreamData([]); // Clear live display for new query

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
              const aiMessage: ChatMessage = {
                id: uuidv4(), type: "ai", content: report.content,
                thinkingStreamData: [...liveThinkingStreamData],
                sources: report.sources, timestamp: new Date(), isAutonomous: true,
              };
              setMessages((prev) => [...prev, aiMessage]);
              // No more localStorage for thinking_process
              setCurrentThinkingStreamData([]); setIsProcessing(false); setIsThinkingProcessOpen(false);
            },
            onError: (error) => { setIsProcessing(false); setIsThinkingProcessOpen(false); toast({title: "Research Error", description: error.message, variant: "destructive"})},
          }
        );
      } else {
        const aiCallbacks: AIServiceCallbacks = {
          onThinkingUpdate: onThinkingDataCallback,
          onProgress: (stage, progress) => console.log(`Research progress: ${stage} (${progress}%)`),
          onError: (error) => { setIsProcessing(false); setIsThinkingProcessOpen(false); toast({title: "Research Error", description: error.message, variant: "destructive"})},
          onComplete: (response) => {
            const aiMessage: ChatMessage = {
              id: uuidv4(), type: "ai", content: response.finalReport.content,
              thinkingStreamData: [...liveThinkingStreamData, ...(response.thinkingProcess || [])],
              sources: response.finalReport.sources,
              timestamp: new Date(), isAutonomous: false,
            };
            setMessages((prev) => [...prev, aiMessage]);
            // No more localStorage for thinking_process
            setCurrentThinkingStreamData([]); setIsProcessing(false); setIsThinkingProcessOpen(false);
          },
        };
        await aiService.processResearch({ query, files: [], researchMode }, aiCallbacks);
      }
    } catch (error: any) { setIsProcessing(false); setIsThinkingProcessOpen(false); toast({title: "Processing Error", description: error.message, variant: "destructive"});}
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && uploadedFiles.length === 0) return;

    setShowMindMap(false);

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
    setMessages((prev) => [...prev, userMessage]);
    setNewMessage("");
    setUploadedFiles([]);
    setIsProcessing(true);
    setIsThinkingProcessOpen(true); // Open thinking process view
    const liveThinkingStreamData: ThinkingStreamData[] = []; // For this specific follow-up
    setCurrentThinkingStreamData([]); // Clear live display

    try {
      const lastAiMessage = messages.filter((m) => m.type === "ai").pop();
      if (lastAiMessage && !isAutonomousMode) {
        const contextReport: FinalReport = {
          content: lastAiMessage.content, sources: lastAiMessage.sources || [],
          wordCount: lastAiMessage.content.split(" ").length,
        };
        const followUpCallbacks: AIServiceCallbacks = {
          onThinkingUpdate: (data) => { liveThinkingStreamData.push(data); setCurrentThinkingStreamData([...liveThinkingStreamData]); },
          onProgress: (stage, progress) => console.log(`Follow-up progress: ${stage} (${progress}%)`),
          onError: (error) => { setIsProcessing(false); setIsThinkingProcessOpen(false); toast({title: "Follow-up Error", description: error.message, variant: "destructive"});},
          onComplete: (response) => {
            const aiMessage: ChatMessage = {
              id: uuidv4(), type: "ai", content: response.finalReport.content,
              thinkingStreamData: [...liveThinkingStreamData, ...(response.thinkingProcess || [])],
              sources: response.finalReport.sources,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
            // No more localStorage for thinking_process
            setCurrentThinkingStreamData([]); setIsProcessing(false); setIsThinkingProcessOpen(false);
          },
        };
        await aiService.processFollowUp(currentQuery, contextReport, followUpCallbacks);
      } else {
        // For initial queries within handleSendMessage, processResearchQuery will handle setIsThinkingProcessOpen
        await processResearchQuery(currentQuery, processedFilesForAgent, false); // Changed from handleInitialQuery to processResearchQuery
      }
    } catch (error: any) { setIsProcessing(false); setIsThinkingProcessOpen(false); toast({title: "Message Sending Error", description: error.message, variant: "destructive"});}
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
  navigate('/');
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

    const aiMessages = messages.filter(m => m.type === 'ai');
    const lastAiMessage = aiMessages[aiMessages.length - 1];

    if (!lastAiMessage || !lastAiMessage.content) {
        toast({ title: "Mind Map Generation", description: "No AI message found to generate a mind map from.", variant: "default" });
        setIsProcessing(false); // Release processing state if we bail early
        return;
    }
    setIsProcessing(true); // Set processing only if we proceed

    const lastAiContent = lastAiMessage.content;

    // Determine the topic name: use originalQuery, then first user message, then a default.
    const firstUserMessage = messages.find(m => m.type === 'user');
    const topicName = originalQuery || (firstUserMessage?.content.substring(0,100)) || "Chat Topic";

    let filesContextString = "";
    if (uploadedFiles.length > 0) {
      let fileContentsArray: string[] = [];
      for (const uiFile of uploadedFiles) {
        let fileContentSegment = `File: ${uiFile.name}\n`;
        if (uiFile.content) {
          fileContentSegment += `${uiFile.content}\n\n`;
          fileContentsArray.push(fileContentSegment);
        } else if (uiFile.file) {
          try {
            const content = await fileProcessingService.readFileAsText(uiFile.file);
            fileContentSegment += `${content}\n\n`;
            fileContentsArray.push(fileContentSegment);
          } catch (err) {
            console.warn(`Could not read file ${uiFile.name} for mind map generation:`, err);
            // Optionally add a placeholder or skip this file
            fileContentsArray.push(`File: ${uiFile.name}\n[Content not available or error reading file]\n\n`);
          }
        }
      }
      if (fileContentsArray.length > 0) {
        filesContextString = "Associated File Context:\n" + fileContentsArray.join('');
      }
    }

    const fullInputText = `User Query Context: ${topicName}\n\n${filesContextString}AI Answer to Map:\n${lastAiContent}`;

    try {
        const mindMap = await mindMapService.generateMindMap(fullInputText, topicName, 10); // Max levels can be adjusted
        if (mindMap && mindMap.nodes.length > 0) { // Check if mindMap is not null and has nodes
            setFullMindMapData(mindMap);
            const initialNodes = mindMap.nodes.filter(node => node.data.level <= INITIAL_DISPLAY_LEVEL);
            const initialNodeIds = new Set(initialNodes.map(node => node.id));
            const initialEdges = mindMap.edges.filter(edge => initialNodeIds.has(edge.source) && initialNodeIds.has(edge.target));
            setDisplayedMindMapData({ nodes: initialNodes, edges: initialEdges });
            setShowMindMap(true);
        } else {
          toast({title: "Mind Map Generation", description: "Could not generate a mind map for this content, or the generated map was empty.", variant: "default"});
        }
    } catch (err: any) { // Explicitly type err as any or unknown then check
        console.error("Mind Map Generation Error in ChatPage:", err);
        toast({title: "Mind Map Error", description: err.message || "An unknown error occurred during mind map generation.", variant: "destructive"});
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
      {/* Sidebar */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "w-72" : "w-0"
        } overflow-hidden flex-shrink-0 bg-slate-850 h-full border-r border-slate-700/50 custom-scrollbar`}
      >
        <ChatHistorySidebar
          chatHistory={chatHistory}
          currentSessionId={currentSessionId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
        />
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-y-hidden">
        <div className="sticky top-0 z-30 bg-slate-800/60 border-b border-slate-700/50 backdrop-blur-md p-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center"> {/* Group toggle and title */}
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white hover:bg-slate-700 mr-2">
                {isSidebarOpen ? <LucideXSquare className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
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
            <ScrollArea className="flex-1">
              <div className="max-w-4xl mx-auto space-y-6 p-6">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    // Removed onViewThinking and hasThinkingData props
                  />
                ))}
                {isProcessing && messages.length > 0 && messages[messages.length-1].type === 'user' && (
                  <div className="flex justify-start w-full">
                    <div className="max-w-3xl w-full">
                      {isAutonomousMode ? (
                        <Collapsible open={isThinkingProcessOpen} onOpenChange={setIsThinkingProcessOpen} className="w-full">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full flex justify-center items-center text-sm text-slate-400 hover:text-slate-200">
                              <ChevronsUpDown className="h-4 w-4 mr-2" />
                              AI Thinking Process...
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <AutonomousThinkingProcess streamData={currentThinkingStreamData} isAutonomous={true} isVisible={isThinkingProcessOpen} />
                          </CollapsibleContent>
                        </Collapsible>
                      ) : (
                        // currentThinking is for older, non-streamed thinking steps.
                        // If currentThinking can be represented as ThinkingStreamData[], it could also use AutonomousThinkingProcess.
                        // For now, keeping ThinkingProcess component for it if it's a different structure.
                        currentThinking.length > 0 && <ThinkingProcess steps={currentThinking} isVisible={true} />
                      )}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
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
    </div>
  );
};

export default ChatPage;
