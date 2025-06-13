import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Map, X } from "lucide-react";
import MindMap from "@/components/MindMap";
import { toast } from "@/hooks/use-toast";
import ThinkingProcess from "@/components/chat/ThinkingProcess";
import AutonomousThinkingProcess from "@/components/chat/AutonomousThinkingProcess";
import StreamingText from "@/components/chat/StreamingText";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import { aiService } from "@/services/aiService";
import {
  autonomousResearchService,
  ThinkingStreamData,
  FinalReport,
  Source,
} from "@/services/autonomousResearchService";
import { fileProcessingService } from "@/services/fileProcessingService";

interface ChatMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  files?: any[];
  thinking?: ThinkingStep[];
  thinkingStreamData?: ThinkingStreamData[];
  sources?: string[];
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
  const [mindMapData, setMindMapData] = useState<any>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [originalQuery, setOriginalQuery] = useState("");
  const [isAutonomousMode, setIsAutonomousMode] = useState(true);

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

  const handleNodeExpand = async (nodeId: string) => {
    try {
      console.log("Expanding node:", nodeId);

      const expandedData = await aiService.expandMindMapNode(
        nodeId,
        mindMapData,
        originalQuery
      );

      setMindMapData(expandedData);

      toast({
        title: "Node Expanded",
        description:
          "Additional details have been generated and added to the mind map.",
      });
    } catch (error) {
      console.error("Error expanding node:", error);
      toast({
        title: "Expansion Failed",
        description: "Failed to expand node. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleInitialQuery = async (
    query: string,
    files: any[],
    deepResearch: boolean
  ) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: query,
      files,
      timestamp: new Date(),
    };

    setMessages([userMessage]);
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

    try {
      console.log("Starting autonomous research process for:", query);

      // Convert uploaded files to File objects for the autonomous service
      const fileObjects: File[] =
        files?.map((f) => f.file).filter(Boolean) || [];
      const researchMode = deepResearch ? "Deep" : "Normal";

      if (isAutonomousMode) {
        // Use the new autonomous research service
        await autonomousResearchService.conductResearch(
          query,
          fileObjects,
          researchMode,
          {
            onThinkingData: (streamData) => {
              setCurrentThinkingStreamData((prev) => [...prev, streamData]);
            },
            onFinalAnswer: (report) => {
              const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                type: "ai",
                content: report.content,
                thinkingStreamData: currentThinkingStreamData,
                sources: report.sources,
                timestamp: new Date(),
                isAutonomous: true,
              };

              setMessages((prev) => [...prev, aiMessage]);
              setCurrentThinkingStreamData([]);
              setIsProcessing(false);
              setStreamingContent("");
            },
            onError: (error) => {
              console.error("Autonomous research error:", error);
              toast({
                title: "Research Error",
                description:
                  "Failed to complete autonomous research. Please try again.",
                variant: "destructive",
              });
              setIsProcessing(false);
            },
          }
        );
      } else {
        // Fallback to original service
        let streamingData = "";

        const data = await aiService.processResearch(
          query,
          files,
          deepResearch,
          {
            onThinking: (step) => {
              setCurrentThinking((prev) => {
                const existing = prev.find((s) => s.id === step.id);
                if (existing) {
                  return prev.map((s) => (s.id === step.id ? step : s));
                }
                return [...prev, step];
              });
            },
            onContentChunk: (chunk) => {
              streamingData += chunk;
              setStreamingContent(streamingData);
            },
            onComplete: () => {
              console.log("Streaming complete");
            },
          }
        );

        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: "ai",
          content: data.response.content,
          thinking: data.thinkingSteps,
          sources: data.response.sources,
          timestamp: new Date(),
          isAutonomous: false,
        };

        setMessages((prev) => [...prev, aiMessage]);
        setMindMapData(data.mindMap);
        setCurrentThinking([]);
        setIsProcessing(false);
        setStreamingContent("");
      }

      console.log("Research process completed successfully");
    } catch (error) {
      console.error("Error processing research:", error);
      toast({
        title: "Error",
        description: "Failed to process research query. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
      setStreamingContent("");
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && uploadedFiles.length === 0) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: newMessage,
      files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      console.log("Processing follow-up question:", newMessage);

      const data = await aiService.processFollowUp(
        newMessage,
        messages.map((m) => m.content).join("\n"),
        uploadedFiles
      );

      setCurrentThinking(data.thinkingSteps);

      for (let i = 0; i < data.thinkingSteps.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setCurrentThinking((prev) =>
          prev.map((step, index) =>
            index <= i ? { ...step, status: "complete" } : step
          )
        );
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: data.response.content,
        thinking: data.thinkingSteps,
        sources: data.response.sources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setCurrentThinking([]);

      if (mindMapData && newMessage.length > 10) {
        const newNodeId = `followup_${Date.now()}`;
        const newNode = {
          id: newNodeId,
          label: newMessage.substring(0, 20) + "...",
          type: "sub",
          level: 2,
          parentId: "center",
          expanded: false,
          hasChildren: false,
        };

        setMindMapData((prev) => ({
          nodes: [...prev.nodes, newNode],
          edges: [...prev.edges, { source: "center", target: newNodeId }],
        }));
      }

      console.log("Follow-up processed successfully");
    } catch (error) {
      console.error("Error sending follow-up:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }

    setNewMessage("");
    setUploadedFiles([]);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files) return;

    try {
      const fileArray = Array.from(files);

      // Validate file types
      const unsupportedFiles = fileArray.filter(
        (file) => !fileProcessingService.isSupportedFileType(file)
      );
      if (unsupportedFiles.length > 0) {
        toast({
          title: "Unsupported Files",
          description: `${unsupportedFiles
            .map((f) => f.name)
            .join(
              ", "
            )} are not supported. Please upload PDF, DOCX, DOC, or TXT files.`,
          variant: "destructive",
        });
        return;
      }

      // Show processing toast
      toast({
        title: "Processing Files",
        description: `Processing ${fileArray.length} file(s)...`,
      });

      // Process files using the real file processing service
      const processedFiles = await fileProcessingService.processFiles(
        fileArray
      );

      // Convert to UploadedFile format for UI
      const uploadedFiles: UploadedFile[] = processedFiles.map((pFile) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: pFile.name,
        content: pFile.content,
        type: pFile.type,
        file: fileArray.find((f) => f.name === pFile.name)!,
        processed: pFile.success,
        wordCount: pFile.wordCount,
        error: pFile.error,
      }));

      setUploadedFiles((prev) => [...prev, ...uploadedFiles]);

      // Show success/error notifications
      const successfulFiles = processedFiles.filter((f) => f.success);
      const failedFiles = processedFiles.filter((f) => !f.success);

      if (successfulFiles.length > 0) {
        toast({
          title: "Files Processed",
          description: `Successfully processed ${
            successfulFiles.length
          } file(s). Total words: ${successfulFiles.reduce(
            (sum, f) => sum + f.wordCount,
            0
          )}`,
        });
      }

      if (failedFiles.length > 0) {
        toast({
          title: "Processing Errors",
          description: `Failed to process ${failedFiles.length} file(s). Check file formats.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("File upload error:", error);
      toast({
        title: "Upload Error",
        description: "Failed to process uploaded files. Please try again.",
        variant: "destructive",
      });
    }

    event.target.value = "";
  };

  const generateMindMap = () => {
    if (!mindMapData) {
      toast({
        title: "No Data",
        description: "Complete a research query first to generate mind map.",
        variant: "destructive",
      });
      return;
    }
    setShowMindMap(true);
  };

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-800/40 border-b border-slate-700/50 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1
            className="text-3xl font-extralight bg-gradient-to-r from-red-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent cursor-pointer hover:scale-105 transition-transform"
            onClick={() => navigate("/")}
          >
            Novah
          </h1>

          <div className="flex items-center space-x-4">
            {mindMapData && !showMindMap && (
              <Button
                onClick={generateMindMap}
                className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white"
              >
                <Map className="h-4 w-4 mr-2" />
                View Mind Map
              </Button>
            )}
            {showMindMap && (
              <Button
                variant="outline"
                onClick={() => setShowMindMap(false)}
                className="bg-slate-700/30 border border-slate-600/50 text-white hover:bg-slate-700/50"
              >
                <X className="h-4 w-4 mr-2" />
                Hide Mind Map
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)] relative">
        {/* Chat Area */}
        <div
          className={`chat-container ${
            showMindMap ? "w-1/2" : "w-full"
          } flex flex-col`}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {isProcessing && (
                <div className="flex justify-start">
                  <div className="max-w-3xl">
                    {isAutonomousMode ? (
                      <AutonomousThinkingProcess
                        streamData={currentThinkingStreamData}
                        isAutonomous={true}
                        isVisible={true}
                      />
                    ) : (
                      <ThinkingProcess
                        steps={currentThinking}
                        isVisible={true}
                      />
                    )}
                    {streamingContent && (
                      <div className="bg-slate-800/50 text-white border border-slate-700/50 backdrop-blur-sm rounded-lg mt-4 p-6">
                        <StreamingText content={streamingContent} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Chat Input */}
          <ChatInput
            message={newMessage}
            onMessageChange={setNewMessage}
            onSendMessage={handleSendMessage}
            onFileUpload={handleFileUpload}
            uploadedFiles={uploadedFiles}
            onRemoveFile={(id) =>
              setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
            }
            isProcessing={isProcessing}
          />
        </div>

        {/* Mind Map */}
        {showMindMap && (
          <div className="mind-map-container w-1/2 border-l border-slate-700/50">
            <div className="h-full flex flex-col bg-slate-800/50">
              <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                <h3 className="text-white font-medium">Research Mind Map</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMindMap(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1">
                <MindMap data={mindMapData} query={originalQuery} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
