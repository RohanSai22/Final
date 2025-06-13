import React, { useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Send, 
  Upload, 
  Brain, 
  Sparkles, 
  FileText,
  Settings,
  Loader2,
  Network
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import AutonomousThinkingProcess from "@/components/chat/AutonomousThinkingProcess";
import FinalReportDisplayNew from "@/components/chat/FinalReportDisplayNew";
import MindMapNew from "@/components/MindMapNew";
import { 
  autonomousResearchAgent, 
  ThinkingStreamData, 
  FinalReport,
  MindMapData 
} from "@/services/autonomousResearchAgent";

const AutonomousChatPage: React.FC = () => {
  const [query, setQuery] = useState("");
  const [researchMode, setResearchMode] = useState<"Normal" | "Deep">("Normal");
  const [files, setFiles] = useState<File[]>([]);
  const [isResearching, setIsResearching] = useState(false);
  const [thinkingData, setThinkingData] = useState<ThinkingStreamData[]>([]);
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
  const [isGeneratingMindMap, setIsGeneratingMindMap] = useState(false);
  const [isExpandingNode, setIsExpandingNode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    const newFiles = Array.from(selectedFiles);
    
    // Validate file types
    const supportedTypes = ['.txt', '.pdf', '.docx', '.doc'];
    const invalidFiles = newFiles.filter(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return !supportedTypes.includes(extension);
    });

    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file types",
        description: `Only ${supportedTypes.join(', ')} files are supported.`,
        variant: "destructive",
      });
      return;
    }

    if (files.length + newFiles.length > 3) {
      toast({
        title: "Too many files",
        description: "Maximum 3 files allowed.",
        variant: "destructive",
      });
      return;
    }

    setFiles(prev => [...prev, ...newFiles]);
    
    toast({
      title: "Files uploaded",
      description: `${newFiles.length} file(s) ready for analysis.`,
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [files.length]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const startResearch = useCallback(async () => {
    if (!query.trim()) {
      toast({
        title: "Query required",
        description: "Please enter a research question.",
        variant: "destructive",
      });
      return;
    }

    setIsResearching(true);
    setThinkingData([]);
    setFinalReport(null);
    setMindMapData(null);

    try {
      await autonomousResearchAgent.conductResearch(
        query,
        files,
        researchMode,
        {
          onThinkingData: (data) => {
            setThinkingData(prev => [...prev, data]);
          },
          onFinalAnswer: (report) => {
            setFinalReport(report);
            setIsResearching(false);
          },
          onError: (error) => {
            console.error("Research error:", error);
            toast({
              title: "Research failed",
              description: error.message || "An error occurred during research.",
              variant: "destructive",
            });
            setIsResearching(false);
          }
        }
      );
    } catch (error) {
      console.error("Research error:", error);
      toast({
        title: "Research failed",
        description: "Failed to start research. Please try again.",
        variant: "destructive",
      });
      setIsResearching(false);
    }
  }, [query, files, researchMode]);

  const generateMindMap = useCallback(async () => {
    if (!finalReport) {
      toast({
        title: "No report available",
        description: "Generate a research report first.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingMindMap(true);
    
    try {
      const mindMap = await autonomousResearchAgent.generateMindMap(
        query,
        finalReport.content,
        finalReport.sources
      );
      
      setMindMapData(mindMap);
      
      toast({
        title: "Mind map generated",
        description: "Interactive knowledge map is ready for exploration.",
      });
    } catch (error) {
      console.error("Mind map generation error:", error);
      toast({
        title: "Mind map generation failed",
        description: "Failed to generate mind map. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingMindMap(false);
    }
  }, [finalReport, query]);

  const expandMindMapNode = useCallback(async (nodeId: string) => {
    if (!mindMapData) return;

    setIsExpandingNode(true);
    
    try {
      const expandedMindMap = await autonomousResearchAgent.expandMindMapNode(
        nodeId,
        mindMapData,
        query
      );
      
      setMindMapData(expandedMindMap);
      
      toast({
        title: "Node expanded",
        description: "Mind map has been updated with additional details.",
      });
    } catch (error) {
      console.error("Node expansion error:", error);
      toast({
        title: "Node expansion failed",
        description: "Failed to expand node. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExpandingNode(false);
    }
  }, [mindMapData, query]);

  const resetSession = useCallback(() => {
    setQuery("");
    setFiles([]);
    setThinkingData([]);
    setFinalReport(null);
    setMindMapData(null);
    setIsResearching(false);
    setIsGeneratingMindMap(false);
    setIsExpandingNode(false);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="rounded-3xl border-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/20">
                  <Brain className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Autonomous Research Agent</h1>
                  <p className="text-blue-100 mt-1">
                    Single-click research with real-time AI transparency
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                <Sparkles className="w-4 h-4 mr-1" />
                Powered by Gemini 2.0
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Research Input */}
        <Card className="rounded-3xl">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Query Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Research Question
                </label>
                <Textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask any research question... (e.g., 'What are the latest developments in AI safety?')"
                  className="rounded-2xl min-h-20 text-base"
                  disabled={isResearching}
                />
              </div>

              {/* Research Mode Selection */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">Research Mode:</label>
                <div className="flex gap-2">
                  <Button
                    variant={researchMode === "Normal" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setResearchMode("Normal")}
                    disabled={isResearching}
                    className="rounded-xl"
                  >
                    Normal (200 words)
                  </Button>
                  <Button
                    variant={researchMode === "Deep" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setResearchMode("Deep")}
                    disabled={isResearching}
                    className="rounded-xl"
                  >
                    Deep (500 words)
                  </Button>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Files (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".txt,.pdf,.docx,.doc"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isResearching}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isResearching || files.length >= 3}
                    className="rounded-xl"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Files
                  </Button>
                  <span className="text-sm text-gray-500">
                    {files.length}/3 files • Supports: PDF, DOCX, DOC, TXT
                  </span>
                </div>
                
                {/* Uploaded Files */}
                {files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024 / 1024).toFixed(1)} MB)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          disabled={isResearching}
                          className="text-gray-500 hover:text-red-600"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <Button
                    onClick={startResearch}
                    disabled={isResearching || !query.trim()}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 px-8"
                  >
                    {isResearching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Researching...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Start Research
                      </>
                    )}
                  </Button>
                  
                  {(thinkingData.length > 0 || finalReport) && (
                    <Button
                      variant="outline"
                      onClick={resetSession}
                      disabled={isResearching}
                      className="rounded-xl"
                    >
                      New Research
                    </Button>
                  )}
                </div>

                {finalReport && (
                  <Button
                    onClick={generateMindMap}
                    disabled={isGeneratingMindMap}
                    variant="outline"
                    className="rounded-xl"
                  >
                    {isGeneratingMindMap ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Network className="w-4 h-4 mr-2" />
                        Generate Mind Map
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Thinking Process */}
        {(isResearching || thinkingData.length > 0) && (
          <Card className="rounded-3xl">
            <CardContent className="p-6">
              <AutonomousThinkingProcess
                streamData={thinkingData}
                isActive={isResearching}
              />
            </CardContent>
          </Card>
        )}

        {/* Final Report */}
        {finalReport && (
          <FinalReportDisplayNew
            report={finalReport}
            onGenerateMindMap={generateMindMap}
            isGeneratingMindMap={isGeneratingMindMap}
          />
        )}

        {/* Mind Map */}
        {mindMapData && (
          <MindMapNew
            mindMapData={mindMapData}
            isLoading={isGeneratingMindMap}
            onNodeExpand={expandMindMapNode}
            isExpanding={isExpandingNode}
          />
        )}

        {/* Footer */}
        <Card className="rounded-3xl bg-gray-50">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <Brain className="w-5 h-5" />
              <span className="text-sm">
                Autonomous Research Agent • File-First Intelligence • Real-time Transparency
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Powered by Google Gemini 2.0 Flash Lite with Vercel AI SDK
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AutonomousChatPage;
