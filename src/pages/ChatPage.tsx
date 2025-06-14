import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Map, X } from "lucide-react"; // Removed FilePlus as New Chat button is in sidebar
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
// import ChatHistorySidebar from "@/components/chat/ChatHistorySidebar"; // Removed, now part of MainLayout
import { useChat } from "@/contexts/ChatContext"; // Import the context hook

// const CHAT_HISTORY_KEY = 'novah_chat_history'; // Handled by context
// const CHAT_SESSION_KEY = 'chatSession'; // Handled by context

const INITIAL_DISPLAY_LEVEL = 3;

const ChatPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    currentSession,
    currentSessionId: contextSessionId, // Renamed to avoid conflict if any local state uses currentSessionId
    selectChat,
    newChat: newChatFromContext,
    addMessageToSession,
    updateSessionMetadata,
    updateSessionMindMap,
    getMessagesForSession,
    // chatHistory, // Not directly used, sidebar handles it
    // isLoadingHistory, // Sidebar handles this
  } = useChat();


  // Local page states
  const [newMessage, setNewMessage] = useState("");
  // uploadedFiles is for files being composed with the current message, not all session files.
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  // const [currentThinking, setCurrentThinking] = useState<ThinkingStep[]>([]); // Legacy, consider removing if not used
  const [currentThinkingStreamData, setCurrentThinkingStreamData] = useState<ThinkingStreamData[]>([]);
  const [showMindMap, setShowMindMap] = useState(false);
  const [displayedMindMapData, setDisplayedMindMapData] = useState<MindMapData | null>(null);

  // Derived states from context
  const messages = currentSession?.messages || [];
  const originalQuery = currentSession?.originalQuery || "";
  const isAutonomousMode = currentSession?.isAutonomousMode === undefined ? true : currentSession.isAutonomousMode;
  const pageFullMindMapData = currentSession?.fullMindMapData || null; // Use data from context

  // Effect to handle initial query from navigation state (e.g., from HomePage)
  useEffect(() => {
    const locationState = location.state as { query?: string; files?: ProcessedFileInput[]; deepResearch?: boolean; autonomousMode?: boolean } | null;

    if (locationState?.query) {
      const { query, files, deepResearch, autonomousMode: navAutonomousMode } = locationState;
      console.log("ChatPage: New navigation state present with query. Creating and selecting new session.");

      // Create a new session using the context function
      const newSessionName = query.substring(0, 50) || `Session ${new Date().toLocaleTimeString()}`;
      const newId = newChatFromContext(newSessionName); // newChat now should set this as currentSessionId

      // Update this new session with details from location.state
      const fileMetadata: UploadedFileMetadata[] = (files || []).map(f => ({
        id: uuidv4(), // Or a more stable ID if available from file object
        name: f.name,
        type: f.type || 'unknown',
        size: f.content?.length || 0, // Approximate size
        status: 'uploaded'
      }));

      updateSessionMetadata(newId, {
        name: newSessionName,
        originalQuery: query,
        isAutonomousMode: navAutonomousMode === undefined ? true : navAutonomousMode,
        uploadedFileMetadata: fileMetadata,
      });

      // Select the new chat to make it active (if newChat doesn't do it automatically)
      // selectChat(newId); // selectChat might not be needed if newChat sets currentSessionId

      const initialProcessedFilesFromNav: ProcessedFileInput[] = files || [];

      // Ensure handleInitialQuery is called *after* the context has updated and
      // currentSession reflects the newId. This might require a slight delay or another useEffect.
      // For now, assuming newChat + updateSessionMetadata makes the session available synchronously for getMessagesForSession.
      // Or, pass newId directly to handleInitialQuery if it can use it.
      handleInitialQuery(query, initialProcessedFilesFromNav, deepResearch === true, newId);

      navigate(location.pathname, { replace: true, state: {} }); // Clear location state
    }
  }, [location.state, newChatFromContext, updateSessionMetadata, selectChat, navigate]); // Added selectChat

  // Effect to update displayed mind map when fullMindMapData from context changes
  useEffect(() => {
    if (pageFullMindMapData) {
      const initialNodes = pageFullMindMapData.nodes.filter(node => node.data.level <= INITIAL_DISPLAY_LEVEL);
      const initialNodeIds = new Set(initialNodes.map(node => node.id));
      const initialEdges = pageFullMindMapData.edges.filter(edge => initialNodeIds.has(edge.source) && initialNodeIds.has(edge.target));
      setDisplayedMindMapData({ nodes: initialNodes, edges: initialEdges });
    } else {
      setDisplayedMindMapData(null);
    }
  }, [pageFullMindMapData]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInitialQuery = async (
    query: string,
    currentFiles: ProcessedFileInput[],
    deepResearch: boolean,
    sessionId: string // Explicitly pass session ID
  ) => {
    if (!sessionId) {
      toast({ title: "Error", description: "No active session to add message to.", variant: "destructive" });
      return;
    }
    const filesForDisplay = currentFiles.map(f => ({ name: f.name, type: f.type || 'unknown', size: 0, id: uuidv4(), status: "uploaded" as "uploaded" }));
    const userMessage: ChatMessage = {
      id: uuidv4(), type: "user", content: query,
      files: filesForDisplay.length > 0 ? filesForDisplay : undefined,
      timestamp: new Date(),
    };
    addMessageToSession(sessionId, userMessage);
    await processResearchQuery(query, currentFiles, deepResearch, sessionId);
  };

  const processResearchQuery = async (
    query: string,
    currentFiles: ProcessedFileInput[],
    deepResearch: boolean,
    sessionId: string // Explicitly pass session ID
  ) => {
    if (!sessionId) {
      toast({ title: "Error", description: "No active session for research.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    // setCurrentThinking([]); // Legacy
    const liveThinkingStreamData: ThinkingStreamData[] = [];
    setCurrentThinkingStreamData([]);

    try {
      const researchMode = deepResearch ? "Deep" : "Normal";
      const onThinkingDataCallback = (streamData: ThinkingStreamData) => {
        liveThinkingStreamData.push(streamData);
        setCurrentThinkingStreamData([...liveThinkingStreamData]);
      };

      const currentSessionIsAutonomous = currentSession?.isAutonomousMode === undefined ? true : currentSession.isAutonomousMode;

      if (currentSessionIsAutonomous) {
        await autonomousResearchAgent.conductResearch(query, currentFiles, researchMode, {
            onThinkingData: onThinkingDataCallback,
            onFinalAnswer: async (report) => {
              const aiMessage: ChatMessage = {
                id: uuidv4(), type: "ai", content: report.content,
                thinkingStreamData: [...liveThinkingStreamData],
                sources: report.sources, timestamp: new Date(), isAutonomous: true,
              };
              addMessageToSession(sessionId, aiMessage);
              setCurrentThinkingStreamData([]); setIsProcessing(false);
            },
            onError: (error) => { setIsProcessing(false); toast({title: "Research Error", description: error.message, variant: "destructive"})},
          }
        );
      } else { // Non-autonomous mode
        const aiCallbacks: AIServiceCallbacks = {
          onThinkingUpdate: onThinkingDataCallback,
          onProgress: (stage, progress) => console.log(`Research progress: ${stage} (${progress}%)`),
          onError: (error) => { setIsProcessing(false); toast({title: "Research Error", description: error.message, variant: "destructive"})},
          onComplete: (response) => {
            const aiMessage: ChatMessage = {
              id: uuidv4(), type: "ai", content: response.finalReport.content,
              thinkingStreamData: [...liveThinkingStreamData, ...(response.thinkingProcess || [])],
              sources: response.finalReport.sources,
              timestamp: new Date(), isAutonomous: false,
            };
            addMessageToSession(sessionId, aiMessage);
            // Mind map from non-autonomous mode, if any, might need context update:
            // if (response.mindMap) updateSessionMindMap(sessionId, response.mindMap);
            setCurrentThinkingStreamData([]); setIsProcessing(false);
          },
        };
        // Ensure `aiService.processResearch` uses the correct `originalQuery` from the session if needed,
        // or pass it explicitly if its design requires it. Here, `query` is the current turn's query.
        await aiService.processResearch({ query, files: currentFiles, researchMode, originalQuery: currentSession?.originalQuery || query }, aiCallbacks);
      }
    } catch (error: any) { setIsProcessing(false); toast({title: "Processing Error", description: error.message, variant: "destructive"});}
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && uploadedFiles.length === 0) return;
    if (!contextSessionId) {
      toast({ title: "Error", description: "No active session.", variant: "destructive" });
      return;
    }

    const currentQueryText = newMessage;
    const currentUiFiles = [...uploadedFiles];

    const processedFilesForAgent: ProcessedFileInput[] = await Promise.all(
      currentUiFiles.map(async (uiFile) => {
        if (uiFile.file) {
          try {
            const content = await fileProcessingService.readFileAsText(uiFile.file);
            return { name: uiFile.name, content, type: uiFile.type };
          } catch (err) {
            toast({title: "File Read Error", description: `Could not read ${uiFile.name}.`, variant: "destructive"});
            return { name: uiFile.name, content: "", type: uiFile.type }; // Continue with empty content on error
          }
        }
        return { name: uiFile.name, content: uiFile.content || "", type: uiFile.type };
      })
    );

    const filesForDisplay = currentUiFiles.map(f => ({ id: f.id || uuidv4(), name: f.name, type: f.type, size: f.file?.size || 0, status: "uploaded" as "uploaded" }));
    const userMessage: ChatMessage = {
      id: uuidv4(), type: "user", content: currentQueryText,
      files: filesForDisplay.length > 0 ? filesForDisplay : undefined, timestamp: new Date(),
    };
    addMessageToSession(contextSessionId, userMessage);
    setNewMessage("");
    setUploadedFiles([]); // Clear files after sending
    setIsProcessing(true);
    const liveThinkingStreamData: ThinkingStreamData[] = [];
    setCurrentThinkingStreamData([]);

    try {
      // If there are new files, or if it's the first message, it might be treated as an "initial" query for this turn.
      // Otherwise, it's a follow-up. This logic might need refinement based on product requirements.
      const lastAiMessage = (currentSession?.messages || []).filter((m) => m.type === "ai").pop();
      const currentSessionIsAutonomous = currentSession?.isAutonomousMode === undefined ? true : currentSession.isAutonomousMode;

      if (lastAiMessage && !currentSessionIsAutonomous && processedFilesForAgent.length === 0) { // Simple follow-up (no new files, non-autonomous)
        const contextReport: FinalReport = {
          content: lastAiMessage.content, sources: lastAiMessage.sources || [],
          wordCount: lastAiMessage.content.split(" ").length,
        };
        const followUpCallbacks: AIServiceCallbacks = {
          onThinkingUpdate: (data) => { liveThinkingStreamData.push(data); setCurrentThinkingStreamData([...liveThinkingStreamData]); },
          onProgress: (stage, progress) => console.log(`Follow-up progress: ${stage} (${progress}%)`),
          onError: (error) => { setIsProcessing(false); toast({title: "Follow-up Error", description: error.message, variant: "destructive"});},
          onComplete: (response) => {
            const aiMessage: ChatMessage = {
              id: uuidv4(), type: "ai", content: response.finalReport.content,
              thinkingStreamData: [...liveThinkingStreamData, ...(response.thinkingProcess || [])],
              sources: response.finalReport.sources,
              timestamp: new Date(),
            };
            addMessageToSession(contextSessionId, aiMessage);
            // if (response.mindMap) updateSessionMindMap(contextSessionId, response.mindMap);
            setCurrentThinkingStreamData([]); setIsProcessing(false);
          },
        };
        await aiService.processFollowUp(currentQueryText, contextReport, followUpCallbacks);
      } else { // Treat as a new research query cycle (e.g., if files are added, or in autonomous mode, or no prior AI message)
        // For a "new" research cycle triggered by a follow-up message, decide if it's "deep" or "normal".
        // Defaulting to "normal" (false for deepResearch).
        // Also, update originalQuery for the session if this is considered a new line of inquiry.
        // For now, we use existing originalQuery from session.
         if (currentSession && (processedFilesForAgent.length > 0 || currentFiles.length > 0)) {
           const currentFileMetadata = currentSession.uploadedFileMetadata || [];
           const newFileMetadata = processedFilesForAgent.map(f => ({ id: uuidv4(), name: f.name, type: f.type, size: 0, status: "uploaded" as "uploaded"}));
           updateSessionMetadata(contextSessionId, { uploadedFileMetadata: [...currentFileMetadata, ...newFileMetadata]});
        }
        await processResearchQuery(currentQueryText, processedFilesForAgent, false, contextSessionId);
      }
    } catch (error: any) { setIsProcessing(false); toast({title: "Message Sending Error", description: error.message, variant: "destructive"});}
  };

  // handleNewChat is now primarily handled by MainLayout calling context's newChat.
  // This function can be simplified or removed if navigation is handled by sidebar.
  // const localHandleNewChat = () => {
  //   const newId = newChatFromContext();
  //   navigate("/chat"); // Ensure navigation if not already on chat page
  //   setShowMindMap(false);
  //   // Other local state resets for ChatPage view specifically
  //   setDisplayedMindMapData(null);
  //   setCurrentThinkingStreamData([]);
  //   setUploadedFiles([]);
  //   setNewMessage("");
  // };

  const handleChatFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    const fileArray = Array.from(files);
    if (uploadedFiles.length + fileArray.length > 5) { // Keep local constraint for current message composition
        toast({ title: "File Limit", description: "Max 5 files for a single message.", variant: "destructive" });
        return;
    }
    const newUiFiles: UploadedFile[] = fileArray.map(f => ({
        id: uuidv4(), name: f.name, type: f.type, file: f, content: ""
    }));
    setUploadedFiles(prev => [...prev, ...newUiFiles]);
  };

  // handleSelectChat is now handled by MainLayout calling context's selectChat.
  // ChatPage will automatically update based on currentSession from context.

  // handleDeleteChat is now handled by MainLayout calling context's deleteChat.

  const generateAndShowMindMap = async () => {
    if (!contextSessionId) {
      toast({ title: "Error", description: "No active session for MindMap.", variant: "destructive" });
      return;
    }
    if (isProcessing || !messages.some(m => m.type === 'ai')) {
        toast({title: "Mind Map Generation", description: "Not enough context. AI response needed.", variant: "default"});
        return;
    }

    setIsProcessing(true);
    updateSessionMindMap(contextSessionId, null); // Clear old map in context
    setDisplayedMindMapData(null); // Clear local display
    setShowMindMap(true);

    const lastAiMessage = messages.filter((m) => m.type === "ai").pop();
    if (!lastAiMessage) {
        toast({title: "Mind Map Generation", description: "No AI message found.", variant: "default"});
        setIsProcessing(false); return;
    }
    const lastMessageContent = lastAiMessage.content;
    const queryForMindMap = currentSession?.originalQuery || messages.find(m => m.type === 'user')?.content || "Chat Topic";

    try {
        const mindMap = await mindMapService.generateMindMap(lastMessageContent, queryForMindMap, 10);
        if (mindMap && mindMap.nodes.length > 0) {
            updateSessionMindMap(contextSessionId, mindMap);
            // Displayed data will update via useEffect listening to pageFullMindMapData (currentSession.fullMindMapData)
        } else {
          toast({title: "Mind Map Generation", description: "Could not generate a meaningful mind map.", variant: "default"});
          setShowMindMap(false);
        }
    } catch (err) {
        toast({title: "Mind Map Error", description: (err as Error).message, variant: "destructive"});
        setShowMindMap(false);
    } finally {
        setIsProcessing(false);
    }
  };

  const uuidv4 = () => { // Keep for local UI elements if needed, e.g., file IDs before processing
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  const handleNodeExpand = (nodeId: string) => { console.log("Expand node:", nodeId); /* Placeholder */ };
  const handleNodeReveal = (node: any) => { console.log("Reveal node:", node); /* Placeholder */ };

  if (!currentSession) {
    // This can happen briefly while context is loading the first session or creating a new one.
    // Or if navigation to /chat happens without a session selected and context hasn't defaulted yet.
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        Loading session...
      </div>
    );
  }

  return (
    // Main div is now provided by MainLayout, ChatPage is the content part
    // Remove the outermost div flex h-screen ...
    // Remove the ChatHistorySidebar div
    // The header with Novah title and MindMap buttons is now part of ChatPage itself, not MainLayout's header
    // MainLayout's header is just for the sidebar toggle.
    <div className="flex flex-1 flex-col h-screen overflow-y-hidden"> {/* This becomes the main container for ChatPage content */}
      <div className="sticky top-0 z-30 bg-slate-800/60 border-b border-slate-700/50 backdrop-blur-md p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-3xl font-extralight bg-gradient-to-r from-red-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate("/")}>
            Novah {currentSession.name && <span className="text-sm text-slate-400 ml-2 font-normal">({currentSession.name})</span>}
          </h1>
          <div className="flex items-center space-x-2">
            {messages.some(m => m.type === 'ai') && (
              <Button
                onClick={generateAndShowMindMap}
                className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white"
                disabled={isProcessing}
                size="sm"
              >
                <Map className="h-4 w-4 mr-2" />
                {pageFullMindMapData ? "Regenerate Mind Map" : "Generate Mind Map"}
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

      <div className={`flex flex-1 overflow-y-hidden ${showMindMap ? "flex-row" : "flex-col"}`}>
        <div className={`flex flex-col ${showMindMap ? "w-1/2" : "w-full"} h-full`}>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Relocated Thinking Indicator Block START */}
              {isProcessing && messages.length > 0 && messages[messages.length - 1].type === 'user' && (
                <div className="flex justify-start"> {/* This wrapper can be adjusted if needed */}
                  <div className="max-w-3xl"> {/* This wrapper can be adjusted if needed */}
                    {currentThinkingStreamData.length > 0 ? (
                      <AutonomousThinkingProcess
                        streamData={currentThinkingStreamData}
                        isAutonomous={isAutonomousMode}
                        isVisible={true}
                      />
                    ) : (
                      // Show a simple "Processing..." or a more styled placeholder if preferred
                      <div className="p-4 text-slate-400">
                        Novah is thinking...
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Relocated Thinking Indicator Block END */}

              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                />
              ))}
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
                <Button variant="ghost" size="sm" onClick={() => setShowMindMap(false)} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></Button>
              </div>
              <div className="flex-1">
                <MindMap
                  mindMapData={displayedMindMapData}
                  onNodeExpand={handleNodeExpand}
                  onNodeDoubleClick={handleNodeReveal}
                  isLoading={isProcessing && !displayedMindMapData} // Show loading in MindMap if processing and no map data yet for display
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
