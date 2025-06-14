import React, { useState, useRef, useEffect } from "react"; // Added useEffect
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Upload, ArrowRight, Sparkles, Menu, X as LucideX } from "lucide-react"; // Added Menu, X
import { toast } from "@/hooks/use-toast";
import SuggestionCards from "@/components/home/SuggestionCards";
import ChatHistorySidebar from "@/components/chat/ChatHistorySidebar"; // Added
import { ChatSession } from "@/types/common"; // Added
import FileUploadArea from "@/components/home/FileUploadArea";
import { fileProcessingService } from "@/services/fileProcessingService";

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

const HomePage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [deepResearch, setDeepResearch] = useState(false);
  const [autonomousMode] = useState(true); // Always use autonomous mode
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null); // Created fileInputRef

  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default to open
  const CHAT_HISTORY_KEY = 'novah_chat_history'; // Define key

  useEffect(() => {
    try {
      const historyRaw = localStorage.getItem(CHAT_HISTORY_KEY);
      if (historyRaw) {
        const loadedSessions = JSON.parse(historyRaw).filter((s: ChatSession | null) => s && typeof s.id !== 'undefined');
        setChatHistory(loadedSessions);
      }
    } catch (error) {
      console.error("HomePage: Error parsing chat history from localStorage:", error);
      setChatHistory([]); // Initialize with empty array on error
    }
  }, []);

  const handleSelectChat = (sessionId: string) => {
    navigate('/chat', { state: { loadSessionId: sessionId } });
  };

  const handleNewChatFromSidebar = () => {
    navigate('/chat', { state: { startNewSession: true } });
  };

  const handleDeleteChat = (sessionId: string) => {
    const updatedHistory = chatHistory.filter(s => s.id !== sessionId);
    setChatHistory(updatedHistory);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updatedHistory));
    toast({ title: "Chat Deleted", description: "Session removed from history." });
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    console.log("File input changed, processing files..."); // Added console log
    const files = event.target.files;
    if (!files) return;

    if (uploadedFiles.length + files.length > 2) {
      toast({
        title: "File Limit Exceeded",
        description: "You can only upload up to 2 files.",
        variant: "destructive",
      });
      return;
    }

    try {
      const fileArray = Array.from(files);

      // Validate file types using the real service
      const unsupportedFiles = fileArray.filter(
        (file) => !fileProcessingService.isFileTypeSupported(file)
      );
      if (unsupportedFiles.length > 0) {
        toast({
          title: "Invalid File Type",
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
      const newUploadedFiles: UploadedFile[] = processedFiles.map((pFile) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: pFile.metadata.fileName,
        content: pFile.content,
        type: pFile.metadata.fileType,
        file: fileArray.find((f) => f.name === pFile.metadata.fileName)!,
        processed: pFile.success,
        wordCount: pFile.metadata.wordCount,
        error: pFile.error,
      }));

      setUploadedFiles((prev) => [...prev, ...newUploadedFiles]);

      // Show success/error notifications
      const successfulFiles = processedFiles.filter((f) => f.success);
      const failedFiles = processedFiles.filter((f) => !f.success);

      if (successfulFiles.length > 0) {
        toast({
          title: "Files Processed",
          description: `Successfully processed ${
            successfulFiles.length
          } file(s). Total words: ${successfulFiles.reduce(
            (sum, f) => sum + f.metadata.wordCount,
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

  const handleSubmit = async () => {
    if (!query.trim()) {
      toast({
        title: "Query Required",
        description: "Please enter a research query.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const processedFilesForChat = uploadedFiles
      .filter(uf => uf.processed && uf.content && uf.content.trim().length > 0 && !uf.error)
      .map(uf => ({
        name: uf.name,
        content: uf.content,
        type: uf.type
      }));

    navigate("/chat", {
      state: {
        query,
        files: processedFilesForChat, // Pass the new array
        deepResearch,
        autonomousMode,
      },
    });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated background particles (can remain for the whole page if desired, or be constrained) */}
      <div className="absolute inset-0 pointer-events-none"> {/* Added pointer-events-none */}
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${4 + Math.random() * 6}s`,
            }}
          />
        ))}
      </div>

      {/* Top bar for sidebar toggle - minimal example */}
      <div className="relative z-20 p-2 bg-slate-900/50 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white hover:bg-slate-700">
          {isSidebarOpen ? <LucideX className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden relative z-10"> {/* Main container for sidebar + content */}
        {/* Sidebar */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            isSidebarOpen ? "w-72" : "w-0"
          } overflow-hidden flex-shrink-0 h-full bg-slate-850`} // bg-slate-850 from ChatPage sidebar parent
        >
          <ChatHistorySidebar
            chatHistory={chatHistory}
            currentSessionId={null} // No active session on home page
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChatFromSidebar}
            onDeleteChat={handleDeleteChat}
          />
        </div>

        {/* Original Page Content - now takes remaining space and scrolls */}
        <div className="flex-1 overflow-y-auto p-8"> {/* Ensure this part scrolls */}
          <div className="w-full max-w-6xl mx-auto space-y-16"> {/* Added mx-auto for centering */}
            {/* Hero Section */}
            <div className="text-center space-y-8">
            <div className="relative">
              <h1 className="text-7xl md:text-8xl font-extralight bg-gradient-to-r from-red-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent animate-glow mb-6">
                Novah
              </h1>
              <p className="text-xl md:text-2xl text-slate-300 mb-8 font-light">
                Advanced AI Research Assistant
              </p>
            </div>
          </div>

          {/* Main Input Card */}
          <Card className="bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm p-8 shadow-2xl max-w-4xl mx-auto">
            <div className="space-y-6">
              <div className="relative">
                <Textarea
                  placeholder="Enter your research query..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-h-32 bg-slate-700/30 border-2 border-slate-600/50 text-white placeholder-slate-400 text-lg resize-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 rounded-xl backdrop-blur-sm"
                  maxLength={1000}
                />
                <div className="absolute bottom-3 right-3 text-xs text-slate-500">
                  {query.length}/1000
                </div>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-6">
                <div className="flex items-center space-x-8">
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={deepResearch}
                      onCheckedChange={setDeepResearch}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-emerald-500 data-[state=checked]:to-cyan-500"
                    />
                    <div className="flex flex-col">
                      <span className="text-white font-medium">
                        {deepResearch ? "Deep Research" : "Normal Research"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {deepResearch
                          ? "800 words, 120-140+ sources"
                          : "400 words, 20-30 sources"}
                      </span>
                    </div>
                  </div>
                  {/* Removed wrapping label, Button now handles click */}
                  <input
                    type="file"
                    id="fileUploadInput" // id can be kept or removed, ref is primary
                    ref={fileInputRef} // Assigned ref
                    multiple
                    accept=".txt,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => { console.log("HomePage: Upload Files button clicked, attempting to trigger file input."); fileInputRef.current?.click(); }} // Added console.log
                    className="bg-slate-700/30 border-2 border-slate-600/50 text-white hover:bg-slate-700/50 hover:border-cyan-500/50 transition-all duration-300 group-hover:scale-105"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </Button>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-cyan-500/25 transform hover:scale-105 transition-all duration-300"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Processing...
                    </div>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Start Research
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Uploaded Files */}
          <FileUploadArea
            uploadedFiles={uploadedFiles}
            onFilesChange={setUploadedFiles}
          />

          {/* Suggestion Cards */}
          <SuggestionCards onQuerySelect={setQuery} />
        </div>
      </div>
    </div>
  </div>
  );
};

export default HomePage;
