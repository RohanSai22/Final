import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Map, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import MindMap from "@/components/ModernMindMap"; // Assuming ModernMindMap is the correct component
import { toast } from "@/hooks/use-toast";
import ThinkingProcess from "@/components/chat/ThinkingProcess";
import AutonomousThinkingProcess from "@/components/chat/AutonomousThinkingProcess";
import StreamingText from "@/components/chat/StreamingText";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import {
  aiService,
  type ThinkingStreamData,
  type FinalReport,
  type Source,
  type MindMapData, // Assuming this is { nodes: MindMapNode[], edges: MindMapEdge[] }
  type AIServiceCallbacks,
} from "@/services/aiService";
import {
  autonomousResearchAgent,
  type StreamingCallback,
} from "@/services/autonomousResearchAgent";
import {
  fileProcessingService,
  type FileProcessingResult,
} from "@/services/fileProcessingService";
import { mindMapService, type MindMapNode as IMindMapNode, type MindMapEdge as IMindMapEdge } from "@/services/mindMapService"; // For stricter typing if needed

interface ChatMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  files?: any[];
  thinking?: ThinkingStep[];
  thinkingStreamData?: ThinkingStreamData[];
  sources?: Source[];
  timestamp: Date;
  isAutonomous?: boolean;
}

interface ThinkingStep {
  id: number;
  type:
    | "planning"
    | "researching"
    | "sources"
    | "analyzing"
    | "replanning"
    | "file_processing";
  title: string;
  content: string;
  status: "processing" | "complete" | "pending";
}

interface UploadedFile {
  id: string;
  name: string;
  content: string;
  type: string;
  file: File;
  processed?: boolean;
  wordCount?: number;
  error?: string;
}

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
  const [currentThinkingStreamData, setCurrentThinkingStreamData] = useState<
    ThinkingStreamData[]
  >([]);
  const [showMindMap, setShowMindMap] = useState(false);
  const [layoutDirection, setLayoutDirection] = useState<"TB" | "LR">("TB"); // New state for layout direction

  // Renamed state for full mind map data
  const [fullMindMapData, setFullMindMapData] = useState<MindMapData | null>(null);
  // New state for displayed mind map data
  const [displayedMindMapData, setDisplayedMindMapData] = useState<MindMapData | null>(null);

  const [streamingContent, setStreamingContent] = useState("");
  const [originalQuery, setOriginalQuery] = useState("");
  const [isAutonomousMode, setIsAutonomousMode] = useState(true);

  // State for viewing historical thinking process
  const [viewingThinkingForMessageId, setViewingThinkingForMessageId] = useState<string | null>(null);
  const [retrievedThinkingStream, setRetrievedThinkingStream] = useState<ThinkingStreamData[] | null>(null);

  useEffect(() => {
    if (location.state) {
      const { query, files, deepResearch, autonomousMode } = location.state;
      setOriginalQuery(query);
      if (autonomousMode !== undefined) {
        setIsAutonomousMode(autonomousMode);
      }
      handleInitialQuery(query, files, deepResearch);
    }
  }, [location.state]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleViewThinking = (messageId: string) => {
    try {
      const storedData = localStorage.getItem(`thinking_process_${messageId}`);
      if (storedData) {
        const parsedData = JSON.parse(storedData) as ThinkingStreamData[]; // Assuming it's ThinkingStreamData[]
        setRetrievedThinkingStream(parsedData);
        setViewingThinkingForMessageId(messageId);
      } else {
        toast({ title: "Not Found", description: "Thinking process data not found for this message.", variant: "default" });
        setRetrievedThinkingStream(null);
        setViewingThinkingForMessageId(null);
      }
    } catch (error) {
      console.error("Failed to retrieve or parse thinking process from localStorage:", error);
      toast({ title: "Error", description: "Could not load thinking process.", variant: "destructive" });
      setRetrievedThinkingStream(null);
      setViewingThinkingForMessageId(null);
    }
  };

  const handleNodeExpand = async (nodeId: string) => {
    if (!fullMindMapData) {
      toast({ title: "Error", description: "Full mind map data not available for expansion.", variant: "destructive" });
      return;
    }
    try {
      console.log("Expanding node via AI:", nodeId);
      setIsProcessing(true); // Indicate background activity

      const expansion = await aiService.expandMindMapNode(
        nodeId,
        fullMindMapData, // Use full map data for AI context
        originalQuery
      );

      if (expansion.newNodes.length > 0 || expansion.newEdges.length > 0) {
        // Merge into fullMindMapData
        setFullMindMapData(prevData => ({
          nodes: [...(prevData?.nodes || []), ...expansion.newNodes],
          edges: [...(prevData?.edges || []), ...expansion.newEdges],
        }));
        // Also merge into displayedMindMapData
        setDisplayedMindMapData(prevData => ({
          nodes: [...(prevData?.nodes || []), ...expansion.newNodes],
          edges: [...(prevData?.edges || []), ...expansion.newEdges],
        }));
        toast({
          title: "Node Expanded by AI",
          description: "New details added to the mind map.",
        });
      } else {
        toast({
          title: "No New Information",
          description: "AI expansion did not yield further details for this node.",
        });
      }
    } catch (error) {
      console.error("Error expanding node with AI:", error);
      toast({
        title: "AI Expansion Failed",
        description: "Failed to expand node using AI. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNodeReveal = (nodeId: string) => {
    if (!fullMindMapData || !displayedMindMapData) return;

    const existingNodeIds = new Set(displayedMindMapData.nodes.map(n => n.id));

    // Find direct children of nodeId from fullMindMapData that are not yet displayed
    const newChildNodes = fullMindMapData.nodes.filter(potentialChild => {
      if (existingNodeIds.has(potentialChild.id)) return false;
      return fullMindMapData.edges.some(edge => edge.source === nodeId && edge.target === potentialChild.id);
    });

    if (newChildNodes.length === 0) {
      // toast({ title: "No more pre-existing children to reveal.", description: "Consider AI expansion for new details." });
      // Optionally, trigger AI expansion if no children to reveal.
      // For now, we do nothing or provide a subtle hint.
      // handleNodeExpand(nodeId); // Example: falling back to AI expansion
      return;
    }

    const newChildNodeIds = new Set(newChildNodes.map(n => n.id));

    // Find edges connecting these new children to the graph (to parent or among themselves)
    const newEdges = fullMindMapData.edges.filter(edge => {
      const sourceIsNew = newChildNodeIds.has(edge.source);
      const targetIsNew = newChildNodeIds.has(edge.target);
      const sourceIsParent = edge.source === nodeId;
      // const targetIsParent = edge.target === nodeId; // Should not happen if it's a child

      // Edge from parent (nodeId) to a new child
      if (sourceIsParent && targetIsNew) return true;
      // Edges among the new children themselves (if any)
      if (sourceIsNew && targetIsNew) return true;
      // Edges from other already displayed nodes to new children (less common for tree expansion)
      if (existingNodeIds.has(edge.source) && targetIsNew) return true;
      if (existingNodeIds.has(edge.target) && sourceIsNew) return true;

      return false;
    });

    const displayedEdgeIds = new Set(displayedMindMapData.edges.map(e => e.id));
    const uniqueNewEdges = newEdges.filter(edge => !displayedEdgeIds.has(edge.id));

    setDisplayedMindMapData(prev => ({
      nodes: [...(prev?.nodes || []), ...newChildNodes],
      edges: [...(prev?.edges || []), ...uniqueNewEdges],
    }));
  };


  const handleInitialQuery = async (
    query: string,
    files: any[],
    deepResearch: boolean
  ) => {
    const filesForDisplay = files && Array.isArray(files)
      ? files.map((f: UploadedFile) => ({ name: f.name, type: f.type || 'unknown' }))
      : [];

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: query,
      files: filesForDisplay.length > 0 ? filesForDisplay : undefined,
      timestamp: new Date(),
    };

    setMessages([userMessage]);
    setOriginalQuery(query); // Save original query for mind map context
    await processResearchQuery(query, files, deepResearch);
  };

  const processResearchQuery = async (
    query: string,
    files: any[],
    deepResearch: boolean
  ) => {
    setIsProcessing(true);
    setStreamingContent("");
    setCurrentThinking([]);
    setCurrentThinkingStreamData([]);
    setFullMindMapData(null); // Reset full map data
    setDisplayedMindMapData(null); // Reset displayed map data

    const processAndSetMindMapData = (mindMap: MindMapData) => {
      setFullMindMapData(mindMap);
      const initialNodes = mindMap.nodes.filter(
        (node) => node.data.level <= INITIAL_DISPLAY_LEVEL
      );
      const initialNodeIds = new Set(initialNodes.map(node => node.id));
      const initialEdges = mindMap.edges.filter(
        (edge) => initialNodeIds.has(edge.source) && initialNodeIds.has(edge.target)
      );
      setDisplayedMindMapData({ nodes: initialNodes, edges: initialEdges });
    };

    try {
      console.log("Starting research process for:", query);
      const fileObjects: File[] = files?.map((f) => f.file).filter(Boolean) || [];
      const researchMode = deepResearch ? "Deep" : "Normal";

      if (isAutonomousMode) {
        await autonomousResearchAgent.conductResearch(
          query, fileObjects, researchMode,
          {
            onThinkingData: (streamData) => setCurrentThinkingStreamData((prev) => [...prev, streamData]),
            onFinalAnswer: async (report) => {
              const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(), type: "ai", content: report.content,
                thinkingStreamData: currentThinkingStreamData, sources: report.sources,
                timestamp: new Date(), isAutonomous: true,
              };
              setMessages((prev) => [...prev, aiMessage]);

              // Generate mind map after final answer
              if (mindMapService && typeof mindMapService.generateMindMap === 'function') {
                const mindMap = await mindMapService.generateMindMap(report.content, query, 10, layoutDirection);
                if (mindMap) processAndSetMindMapData(mindMap);
              } else {
                console.error("mindMapService or generateMindMap method is not available");
                toast({
                  title: "Mind Map Error",
                  description: "Mind map generation may fail due to an initialization issue.",
                  variant: "destructive",
                });
              }

              // Save thinking process to localStorage
              if (aiMessage.id && currentThinkingStreamData && currentThinkingStreamData.length > 0) {
                try {
                  localStorage.setItem(`thinking_process_${aiMessage.id}`, JSON.stringify(currentThinkingStreamData));
                } catch (e) {
                  console.error("Failed to save thinking process to localStorage:", e);
                  toast({ title: "Storage Error", description: "Could not save thinking process.", variant: "destructive" });
                }
              }

              setCurrentThinkingStreamData([]); setIsProcessing(false); setStreamingContent("");
            },
            onError: (error) => {
              console.error("Autonomous research error:", error);
              toast({ title: "Research Error", description: error.message || "Failed to complete research.", variant: "destructive" });
              setIsProcessing(false);
            },
          }
        );
      } else {
        const aiCallbacks: AIServiceCallbacks = {
          onThinkingUpdate: (data) => setCurrentThinkingStreamData((prev) => [...prev, data]),
          onProgress: (stage, progress) => console.log(`Research progress: ${stage} (${progress}%)`),
          onError: (error) => {
            console.error("Research error:", error);
            toast({ title: "Error", description: error.message || "Failed to process research.", variant: "destructive" });
            setIsProcessing(false); setStreamingContent("");
          },
          onComplete: (response) => {
            const aiMessage: ChatMessage = {
              id: (Date.now() + 1).toString(), type: "ai", content: response.finalReport.content,
              thinkingStreamData: response.thinkingProcess, sources: response.finalReport.sources,
              timestamp: new Date(), isAutonomous: false,
            };
            setMessages((prev) => [...prev, aiMessage]);
            if (response.mindMap) processAndSetMindMapData(response.mindMap);

            // Save thinking process to localStorage
            if (aiMessage.id && response.thinkingProcess && response.thinkingProcess.length > 0) {
              try {
                localStorage.setItem(`thinking_process_${aiMessage.id}`, JSON.stringify(response.thinkingProcess));
              } catch (e) {
                console.error("Failed to save thinking process to localStorage:", e);
                toast({ title: "Storage Error", description: "Could not save thinking process for non-autonomous research.", variant: "destructive" });
              }
            }

            setCurrentThinking([]); setCurrentThinkingStreamData([]); setIsProcessing(false); setStreamingContent("");
          },
        };
        await aiService.processResearch({ query, files: fileObjects, researchMode }, aiCallbacks);
      }
      console.log("Research process completed successfully");
    } catch (error: any) {
      console.error("Error processing research:", error);
      toast({ title: "Error", description: error.message || "Failed to process research.", variant: "destructive" });
      setIsProcessing(false); setStreamingContent("");
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && uploadedFiles.length === 0) return;

    const filesForDisplay = uploadedFiles.length > 0
      ? uploadedFiles.map((f: UploadedFile) => ({ name: f.name, type: f.type || 'unknown' }))
      : [];

    const userMessage: ChatMessage = {
      id: Date.now().toString(), type: "user", content: newMessage,
      files: filesForDisplay.length > 0 ? filesForDisplay : undefined, timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);
    setOriginalQuery(newMessage); // Set original query for follow-ups if needed for mind map context

    try {
      const lastAiMessage = messages.filter((m) => m.type === "ai").pop();
      if (lastAiMessage) {
        const contextReport: FinalReport = {
          content: lastAiMessage.content, sources: lastAiMessage.sources || [],
          wordCount: lastAiMessage.content.length,
        };
        const followUpCallbacks: AIServiceCallbacks = {
          onThinkingUpdate: (data) => setCurrentThinkingStreamData((prev) => [...prev, data]),
          onProgress: (stage, progress) => console.log(`Follow-up progress: ${stage} (${progress}%)`),
          onError: (error) => {
            console.error("Follow-up error:", error);
            toast({ title: "Error", description: error.message || "Failed to send message.", variant: "destructive" });
            setIsProcessing(false);
          },
          onComplete: (response) => {
            const aiMessage: ChatMessage = {
              id: (Date.now() + 1).toString(), type: "ai", content: response.finalReport.content,
              thinkingStreamData: response.thinkingProcess, sources: response.finalReport.sources,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
            if (response.mindMap) { // Assuming follow-up can also generate/update mind maps
                setFullMindMapData(response.mindMap); // Update full map
                const initialNodes = response.mindMap.nodes.filter(node => node.data.level <= INITIAL_DISPLAY_LEVEL);
                const initialNodeIds = new Set(initialNodes.map(node => node.id));
                const initialEdges = response.mindMap.edges.filter(edge => initialNodeIds.has(edge.source) && initialNodeIds.has(edge.target));
                setDisplayedMindMapData({ nodes: initialNodes, edges: initialEdges });
            }

            // Save thinking process to localStorage for follow-up
            if (aiMessage.id && response.thinkingProcess && response.thinkingProcess.length > 0) {
              try {
                localStorage.setItem(`thinking_process_${aiMessage.id}`, JSON.stringify(response.thinkingProcess));
              } catch (e) {
                console.error("Failed to save thinking process to localStorage for follow-up:", e);
                // Potentially a different toast or silent fail if preferred for follow-ups
                toast({ title: "Storage Error", description: "Could not save thinking process for this follow-up.", variant: "destructive" });
              }
            }
            setCurrentThinking([]); setCurrentThinkingStreamData([]); setIsProcessing(false);
          },
        };
        await aiService.processFollowUp(newMessage, contextReport, followUpCallbacks);
      } else {
        // If no prior AI message, treat as a new research query
        await processResearchQuery(newMessage, uploadedFiles.map(f => f.file), false); // Assuming 'Normal' mode for follow-ups as new queries
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({ title: "Error", description: error.message || "Failed to send message.", variant: "destructive" });
      setIsProcessing(false);
    }
    setNewMessage(""); setUploadedFiles([]);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files; if (!files) return;
    try {
      const fileArray = Array.from(files);
      const unsupportedFiles = fileArray.filter((file) => !fileProcessingService.isFileTypeSupported(file));
      if (unsupportedFiles.length > 0) {
        toast({ title: "Unsupported Files", description: `${unsupportedFiles.map((f) => f.name).join(", ")} are not supported.`, variant: "destructive" });
        return;
      }
      toast({ title: "Processing Files", description: `Processing ${fileArray.length} file(s)...` });
      const processedFiles = await fileProcessingService.processFiles(fileArray);
      const uiUploadedFiles: UploadedFile[] = processedFiles.map((pFile) => ({
        id: Math.random().toString(36).substr(2, 9), name: pFile.metadata.fileName,
        content: pFile.content, type: pFile.metadata.fileType,
        file: fileArray.find((f) => f.name === pFile.metadata.fileName)!,
        processed: pFile.success, wordCount: pFile.metadata.wordCount, error: pFile.error,
      }));
      setUploadedFiles((prev) => [...prev, ...uiUploadedFiles]);
      const successfulFiles = processedFiles.filter((f) => f.success);
      const failedFiles = processedFiles.filter((f) => !f.success);
      if (successfulFiles.length > 0) toast({ title: "Files Processed", description: `Successfully processed ${successfulFiles.length} file(s).` });
      if (failedFiles.length > 0) toast({ title: "Processing Errors", description: `Failed to process ${failedFiles.length} file(s).`, variant: "destructive" });
    } catch (error: any) {
      console.error("File upload error:", error);
      toast({ title: "Upload Error", description: error.message || "Failed to process files.", variant: "destructive" });
    }
    event.target.value = "";
  };

  const generateAndShowMindMap = async () => {
    // This function is now primarily for toggling visibility or initial generation if needed
    // The mind map data generation is coupled with research completion.
    if (!fullMindMapData) {
       const lastAiMessage = messages.filter((m) => m.type === "ai" && m.isAutonomous).pop();
       if(lastAiMessage && lastAiMessage.content) {
        setIsProcessing(true);
        toast({title: "Generating Mind Map", description: "Please wait..."});
        try {
          if (mindMapService && typeof mindMapService.generateMindMap === 'function') {
            // Pass layoutDirection to generateMindMap
            const mindMap = await mindMapService.generateMindMap(lastAiMessage.content, originalQuery, 10, layoutDirection);
            if (mindMap) {
                setFullMindMapData(mindMap);
                const initialNodes = mindMap.nodes.filter(node => node.data.level <= INITIAL_DISPLAY_LEVEL);
                const initialNodeIds = new Set(initialNodes.map(node => node.id));
                const initialEdges = mindMap.edges.filter(edge => initialNodeIds.has(edge.source) && initialNodeIds.has(edge.target));
                setDisplayedMindMapData({ nodes: initialNodes, edges: initialEdges });
                setShowMindMap(true);
            } else {
                 toast({ title: "Mind Map Error", description: "Could not generate mind map data.", variant: "destructive" });
            }
          } else {
            console.error("mindMapService or generateMindMap method is not available");
            toast({
              title: "Mind Map Error",
              description: "Mind map generation may fail due to an initialization issue. Service not found.",
              variant: "destructive",
            });
          }
        } catch (error: any) {
            toast({ title: "Mind Map Error", description: error.message || "Failed to generate mind map.", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
       } else {
         toast({ title: "No Data", description: "Complete a research query first.", variant: "destructive" });
       }
      return;
    }
    setShowMindMap(true);
  };

  const closeThinkingProcessDialog = () => {
    setViewingThinkingForMessageId(null);
    setRetrievedThinkingStream(null);
  };

  const handleToggleLayout = async () => {
    const newDirection = layoutDirection === "TB" ? "LR" : "TB";
    setLayoutDirection(newDirection);
    if (fullMindMapData) {
      setIsProcessing(true);
      toast({ title: "Re-laying out Mind Map", description: `Switching to ${newDirection === "TB" ? "Vertical" : "Horizontal"} view...`});
      try {
        // Use the last AI message content for re-generating the mind map with the new layout
        const lastAiMessage = messages.filter(m => m.type === 'ai' && m.content).pop();
        if (lastAiMessage && lastAiMessage.content && originalQuery) {
            const mindMap = await mindMapService.generateMindMap(lastAiMessage.content, originalQuery, 10, newDirection);
            if (mindMap) {
                setFullMindMapData(mindMap); // Update full map
                const initialNodes = mindMap.nodes.filter(node => node.data.level <= INITIAL_DISPLAY_LEVEL);
                const initialNodeIds = new Set(initialNodes.map(node => node.id));
                const initialEdges = mindMap.edges.filter(edge => initialNodeIds.has(edge.source) && initialNodeIds.has(edge.target));
                setDisplayedMindMapData({ nodes: initialNodes, edges: initialEdges });
            }
        } else {
            toast({ title: "Error", description: "Cannot re-layout without AI content or original query.", variant: "destructive" });
        }
      } catch (error: any) {
        toast({ title: "Layout Error", description: error.message || "Failed to re-layout mind map.", variant: "destructive" });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="sticky top-0 z-40 bg-slate-800/40 border-b border-slate-700/50 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-3xl font-extralight bg-gradient-to-r from-red-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate("/")}>Novah</h1>
          <div className="flex items-center space-x-4">
            {(messages.some(m => m.type === 'ai')) && !showMindMap && ( // Show button if there's an AI message
              <Button onClick={generateAndShowMindMap} className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white" disabled={isProcessing}>
                <Map className="h-4 w-4 mr-2" />
                {fullMindMapData ? "View Mind Map" : "Generate Mind Map"}
              </Button>
            )}
            {showMindMap && (
              <Button variant="outline" onClick={() => setShowMindMap(false)} className="bg-slate-700/30 border border-slate-600/50 text-white hover:bg-slate-700/50">
                <X className="h-4 w-4 mr-2" />
                Hide Mind Map
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)] relative">
        <div className={`chat-container ${showMindMap ? "w-1/2" : "w-full"} flex flex-col`}>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onViewThinking={handleViewThinking}
                  hasThinkingData={(messageId) => !!localStorage.getItem(`thinking_process_${messageId}`)}
                />
              ))}
              {isProcessing && messages.length > 0 && messages[messages.length-1].type === 'user' && ( // Show thinking only if last message is user and processing
                <div className="flex justify-start">
                  <div className="max-w-3xl">
                    {isAutonomousMode ? (
                      <AutonomousThinkingProcess streamData={currentThinkingStreamData} isAutonomous={true} isVisible={true} />
                    ) : (
                      <ThinkingProcess steps={currentThinking} isVisible={true} />
                    )}
                    {streamingContent && <div className="bg-slate-800/50 text-white border border-slate-700/50 backdrop-blur-sm rounded-lg mt-4 p-6"><StreamingText content={streamingContent} /></div>}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <ChatInput message={newMessage} onMessageChange={setNewMessage} onSendMessage={handleSendMessage} onFileUpload={handleFileUpload} uploadedFiles={uploadedFiles} onRemoveFile={(id) => setUploadedFiles((prev) => prev.filter((f) => f.id !== id))} isProcessing={isProcessing} />
        </div>

        {showMindMap && displayedMindMapData && (
          <div className="mind-map-container w-1/2 border-l border-slate-700/50">
            <div className="h-full flex flex-col bg-slate-800/50">
              <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                <h3 className="text-white font-medium">Research Mind Map</h3>
                <div className="flex items-center">
                  <Button onClick={handleToggleLayout} variant="outline" size="sm" className="mr-2 bg-slate-700/30 border-slate-600/50 text-xs text-white hover:bg-slate-700/50">
                    {layoutDirection === "TB" ? "Horizontal" : "Vertical"} View
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowMindMap(false)} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="flex-1">
                <MindMap
                  mindMapData={displayedMindMapData}
                  onNodeExpand={handleNodeExpand} // For AI-based expansion
                  onNodeDoubleClick={handleNodeReveal} // For revealing existing children
                  isLoading={isProcessing && !displayedMindMapData} // Show loading if processing and no map yet
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialog for Viewing Thinking Process */}
      <Dialog open={viewingThinkingForMessageId !== null} onOpenChange={(isOpen) => { if (!isOpen) closeThinkingProcessDialog(); }}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Retrieved AI Thinking Process</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 rounded-md bg-slate-850 custom-scrollbar">
            {retrievedThinkingStream && retrievedThinkingStream.length > 0 ? (
              <ThinkingProcess streamData={retrievedThinkingStream} isAutonomous={true} isVisible={true} />
            ) : (
              <p>No thinking process data to display or data is empty.</p>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeThinkingProcessDialog} className="border-slate-600 hover:border-slate-500">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatPage;
