// =====================================================================================
// AI SERVICE - MAIN ORCHESTRATION LAYER
// Coordinates autonomous research, file processing, and mind map generation
// =====================================================================================

import { autonomousResearchAgent } from "./autonomousResearchAgent";
import { fileProcessingService } from "./fileProcessingService";
import { mindMapService, type MindMapData } from "./mindMapService";
import type {
  ThinkingStreamData,
  Source,
  FinalReport,
  StreamingCallback,
  ProcessedFileInput,
} from "./autonomousResearchAgent";

export interface ResearchRequest {
  query: string;
  files?: File[];
  researchMode: "Normal" | "Deep";
}

export interface ResearchResponse {
  finalReport: FinalReport;
  thinkingProcess: ThinkingStreamData[];
  processingStats?: {
    totalFiles: number;
    successCount: number;
    failureCount: number;
    totalWords: number;
    totalCharacters: number;
  };
}

export interface AIServiceCallbacks {
  onThinkingUpdate: (data: ThinkingStreamData) => void;
  onProgress: (stage: string, progress: number) => void;
  onError: (error: Error) => void;
  onComplete: (response: ResearchResponse) => void;
}

class AIService {
  private isProcessing: boolean = false;

  /**
   * Main research processing method
   */
  async processResearch(
    request: ResearchRequest,
    callbacks: AIServiceCallbacks
  ): Promise<void> {
    if (this.isProcessing) {
      callbacks.onError(new Error("Research already in progress"));
      return;
    }

    this.isProcessing = true;
    const thinkingProcess: ThinkingStreamData[] = [];
    let finalReport: FinalReport | null = null;
    let mindMapData: MindMapData | null = null;

    try {
      callbacks.onProgress("Initializing", 0);

      // Validate files if provided
      if (request.files && request.files.length > 0) {
        for (const file of request.files) {
          const validation = fileProcessingService.validateFile(file);
          if (!validation.valid) {
            callbacks.onError(
              new Error(`File validation failed: ${validation.error}`)
            );
            return;
          }
        }
      }

      callbacks.onProgress("Starting Research", 10);

      // Set up streaming callbacks for autonomous research
      const researchCallbacks: StreamingCallback = {
        onThinkingData: (data: ThinkingStreamData) => {
          thinkingProcess.push(data);
          callbacks.onThinkingUpdate(data);

          // Update progress based on thinking data type
          switch (data.type) {
            case "status":
              if (data.data.message.includes("Starting"))
                callbacks.onProgress("Analyzing", 15);
              if (data.data.message.includes("Analyzing"))
                callbacks.onProgress("Processing Files", 25);
              if (data.data.message.includes("Planning"))
                callbacks.onProgress("Planning Research", 35);
              if (data.data.message.includes("Searching"))
                callbacks.onProgress("Searching Web", 50);
              if (data.data.message.includes("Generating"))
                callbacks.onProgress("Generating Report", 75);
              if (data.data.message.includes("mind map"))
                callbacks.onProgress("Creating Mind Map", 85);
              break;
            case "plan":
              callbacks.onProgress("Executing Research Plan", 40);
              break;
            case "searching_start":
              callbacks.onProgress("Web Research", 45);
              break;
            case "reflection":
              callbacks.onProgress("Analyzing Results", 65);
              break;
            case "final_answer":
              callbacks.onProgress("Finalizing", 90);
              break;
          }
        },

        onFinalAnswer: (report: FinalReport) => {
          finalReport = report;
          callbacks.onProgress("Generating Mind Map", 80);
        },

        onError: (error: Error) => {
          callbacks.onError(error);
        },
      };

      // Process files if provided
      let processedFiles: ProcessedFileInput[] = [];
      if (request.files && request.files.length > 0) {
        callbacks.onProgress("Processing Files", 5);
        try {
          const fileResults = await fileProcessingService.processFiles(request.files);
          processedFiles = fileResults
            .filter(result => result.success)
            .map(result => ({
              name: result.metadata.fileName,
              content: result.content,
              type: result.metadata.fileType
            }));
        } catch (fileError) {
          console.error("File processing error:", fileError);
          callbacks.onError(new Error("Failed to process uploaded files"));
          return;
        }
      }

      // Execute autonomous research
      await autonomousResearchAgent.conductResearch(
        request.query,
        processedFiles,
        request.researchMode,
        researchCallbacks
      );

      // Note: Mind map generation is now handled manually by user request in the UI
      // This allows users to control when mind maps are generated/regenerated

      callbacks.onProgress("Complete", 100);

      // Prepare file processing stats if files were processed
      let processingStats;
      if (request.files && request.files.length > 0) {
        const fileResults = await fileProcessingService.processFiles(
          request.files
        );
        processingStats = fileProcessingService.getProcessingStats(fileResults);
      }

      // Send final response
      if (finalReport && mindMapData) {
        callbacks.onComplete({
          finalReport,
          mindMap: mindMapData,
          thinkingProcess,
          processingStats,
        });
      } else {
        callbacks.onError(
          new Error("Research completed but failed to generate final outputs")
        );
      }
    } catch (error) {
      console.error("AI Service error:", error);
      callbacks.onError(
        error instanceof Error ? error : new Error("Research failed")
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process follow-up questions
   */
  async processFollowUp(
    query: string,
    context: FinalReport,
    callbacks: AIServiceCallbacks
  ): Promise<void> {
    if (this.isProcessing) {
      callbacks.onError(new Error("Research already in progress"));
      return;
    }

    this.isProcessing = true;

    try {
      callbacks.onProgress("Processing Follow-up", 10);

      // Create enhanced context from previous research
      const enhancedQuery = `Follow-up question: ${query}

Previous research context:
${context.content}

Sources available:
${context.sources.map((s, i) => `[${i + 1}] ${s.title}`).join("\n")}`;

      const followUpRequest: ResearchRequest = {
        query: enhancedQuery,
        files: [],
        researchMode: "Normal", // Follow-ups are typically shorter
      };

      await this.processResearch(followUpRequest, callbacks);
    } catch (error) {
      console.error("Follow-up processing error:", error);
      callbacks.onError(
        error instanceof Error ? error : new Error("Follow-up failed")
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Expand mind map node
   */
  async expandMindMapNode(
    nodeId: string,
    currentMindMap: MindMapData,
    context: string
  ): Promise<{ newNodes: any[]; newEdges: any[] }> {
    try {
      return await mindMapService.expandNode(nodeId, currentMindMap, context);
    } catch (error) {
      console.error("Mind map expansion error:", error);
      return { newNodes: [], newEdges: [] };
    }
  }

  /**
   * Extract key concepts from report for fallback mind map
   */
  private extractKeyConceptsFromReport(content: string): string[] {
    // Simple extraction using basic NLP techniques
    const sentences = content.split(/[.!?]+/);
    const concepts: string[] = [];

    for (const sentence of sentences) {
      // Look for sentences that might contain key concepts
      const words = sentence.trim().split(/\s+/);
      if (words.length > 3 && words.length < 15) {
        // Extract potential concept phrases
        const phrase = words.slice(0, 4).join(" ");
        if (phrase.length > 10 && phrase.length < 50) {
          concepts.push(phrase);
        }
      }
    }

    // Return top 6 unique concepts
    return [...new Set(concepts)].slice(0, 6);
  }

  /**
   * Get processing status
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Validate research request
   */
  validateRequest(request: ResearchRequest): {
    valid: boolean;
    error?: string;
  } {
    if (!request.query || request.query.trim().length === 0) {
      return { valid: false, error: "Query is required" };
    }

    if (request.query.length > 1000) {
      return { valid: false, error: "Query too long (max 1000 characters)" };
    }

    if (request.files && request.files.length > 10) {
      return { valid: false, error: "Too many files (max 10)" };
    }

    if (request.files) {
      for (const file of request.files) {
        const validation = fileProcessingService.validateFile(file);
        if (!validation.valid) {
          return { valid: false, error: validation.error };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Get supported file types
   */
  getSupportedFileTypes(): string[] {
    return ["pdf", "docx", "doc", "txt"];
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    return fileProcessingService.formatFileSize(bytes);
  }

  /**
   * Check if file type is supported
   */
  isFileTypeSupported(file: File): boolean {
    return fileProcessingService.isFileTypeSupported(file);
  }
}

// =====================================================================================
// EXPORT SINGLETON INSTANCE
// =====================================================================================

export const aiService = new AIService();

// Re-export types for convenience
export type {
  ThinkingStreamData,
  Source,
  FinalReport,
  StreamingCallback,
  ProcessedFileInput,
} from "./autonomousResearchAgent";

export type { MindMapData } from "./mindMapService";
