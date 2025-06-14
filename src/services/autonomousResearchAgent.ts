// =====================================================================================
// AUTONOMOUS RESEARCH AGENT - COMPLETE IMPLEMENTATION
// Built with Vercel AI SDK + Google Gemini 2.0 Flash Lite
// Single-click autonomous research with real-time thinking transparency
// =====================================================================================

import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, generateText } from "ai";
import { fileProcessingService } from "./fileProcessingService";

// =====================================================================================
// CORE TYPES & INTERFACES
// =====================================================================================

export interface ThinkingStreamData {
  type:
    | "status"
    | "sufficiency_check"
    | "plan"
    | "searching_start"
    | "source_found"
    | "learning"
    | "reflection"
    | "final_answer";
  data: any;
  timestamp: number;
}

export interface Source {
  id: string;
  url: string;
  title: string;
  sourceType: "Academic" | "Government" | "News" | "Research" | "Web";
}

export interface FinalReport {
  content: string;
  sources: Source[];
  wordCount: number;
}

export interface StreamingCallback {
  onThinkingData: (data: ThinkingStreamData) => void;
  onFinalAnswer: (report: FinalReport) => void;
  onError: (error: Error) => void;
}

// MindMap related interfaces are no longer needed here as mind map generation is externalized.
// export interface MindMapNode { ... }
// export interface MindMapEdge { ... }
// export interface MindMapData { ... }

// =====================================================================================
// AUTONOMOUS RESEARCH AGENT CLASS
// =====================================================================================

class AutonomousResearchAgent {
  private apiKey: string | null = null;
  private googleProvider: any = null;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private readonly REQUEST_LIMIT = 50; // requests per minute
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute in ms
  private readonly MIN_DELAY = 1200; // 1.2 seconds between requests

  constructor() {
    this.initializeAI();
  }
  private initializeAI() {
    try {
      this.apiKey = (import.meta.env as any).VITE_GOOGLE_AI_API_KEY;
      if (this.apiKey) {
        console.log("Google AI API key loaded successfully.");
        // Create custom Google provider with API key
        this.googleProvider = createGoogleGenerativeAI({
          apiKey: this.apiKey,
        });
        console.log(
          "Google AI provider initialized successfully with gemini-2.0-flash-lite."
        );
        console.log(
          "🤖 Autonomous Research Agent initialized with gemini-2.0-flash-lite"
        );
      } else {
        console.error("Google AI API key not found in environment variables. VITE_GOOGLE_AI_API_KEY is not set.");
        this.googleProvider = null; // Ensure provider is null if key is missing
      }
    } catch (error) {
      console.error("Failed to initialize Autonomous Research Agent:", error);
      this.googleProvider = null; // Ensure provider is null on error
    }
  }

  /**
   * Enforce rate limiting for API requests
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // Reset request count if window has passed
    if (timeSinceLastRequest > this.RATE_LIMIT_WINDOW) {
      this.requestCount = 0;
    }

    // Check if we've exceeded the request limit
    if (this.requestCount >= this.REQUEST_LIMIT) {
      const waitTime = this.RATE_LIMIT_WINDOW - timeSinceLastRequest;
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
      this.requestCount = 0;
    }

    // Ensure minimum delay between requests
    if (timeSinceLastRequest < this.MIN_DELAY) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.MIN_DELAY - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Main entry point - Autonomous Research Conductor
   */
  async conductResearch(
    userQuery: string,
    files: File[],
    researchMode: "Normal" | "Deep",
    callbacks: StreamingCallback
  ): Promise<void> {
    try {
      if (!this.apiKey) {
        throw new Error("Google AI API key not configured");
      }

      callbacks.onThinkingData({
        type: "status",
        data: { message: "🚀 Starting autonomous research..." },
        timestamp: Date.now(),
      });

      // DECISION POINT 1: FILE-FIRST vs WEB-FIRST
      if (files && files.length > 0) {
        await this.executeFileFirstAnalysis(
          userQuery,
          files,
          researchMode,
          callbacks
        );
      } else {
        await this.executeWebFirstResearch(userQuery, researchMode, callbacks);
      }
    } catch (error) {
      console.error("Autonomous research error:", error);
      callbacks.onError(
        error instanceof Error ? error : new Error("Research failed")
      );
    }
  }

  /**
   * Step A: File-First Analysis Sub-Routine
   */
  private async executeFileFirstAnalysis(
    userQuery: string,
    files: File[],
    researchMode: "Normal" | "Deep",
    callbacks: StreamingCallback
  ): Promise<void> {
    callbacks.onThinkingData({
      type: "status",
      data: { message: `📄 Analyzing ${files.length} file(s)...` },
      timestamp: Date.now(),
    });

    // Extract and process all files
    let combinedFileContent = "";
    for (const file of files) {
      try {
        const content = await fileProcessingService.extractTextFromFile(file);
        combinedFileContent += `\n\n--- ${file.name} ---\n${content}`;
      } catch (error) {
        console.warn(`Failed to process file ${file.name}:`, error);
      }
    }

    if (!combinedFileContent.trim()) {
      callbacks.onThinkingData({
        type: "sufficiency_check",
        data: {
          status: "insufficient",
          reason:
            "Unable to extract content from uploaded files. Beginning web research.",
        },
        timestamp: Date.now(),
      });
      await this.executeWebFirstResearch(userQuery, researchMode, callbacks);
      return;
    }

    // Check if content exceeds safe threshold (800k characters for 1M token model)
    const chunks = this.chunkText(combinedFileContent, 5000); // 5k character chunks

    callbacks.onThinkingData({
      type: "status",
      data: {
        message: `🔍 Interrogating ${chunks.length} content chunk(s)...`,
      },
      timestamp: Date.now(),
    });

    // Parallel interrogation of chunks
    const chunkResults = await Promise.all(
      chunks.map((chunk, index) =>
        this.interrogateChunk(userQuery, chunk, index)
      )
    );

    // Check if file analysis is sufficient
    const sufficientResults = chunkResults.filter(
      (result) => result !== "INSUFFICIENT"
    );

    if (sufficientResults.length === 0) {
      callbacks.onThinkingData({
        type: "sufficiency_check",
        data: {
          status: "insufficient",
          reason:
            "The provided document does not contain sufficient information. Beginning web research.",
        },
        timestamp: Date.now(),
      });
      await this.executeWebFirstResearch(
        userQuery,
        researchMode,
        callbacks,
        combinedFileContent
      );
    } else {
      // Synthesize file-only results
      callbacks.onThinkingData({
        type: "status",
        data: { message: "🧠 Synthesizing document insights..." },
        timestamp: Date.now(),
      });

      await this.synthesizeFileResults(
        userQuery,
        sufficientResults,
        researchMode,
        callbacks
      );
    }
  }

  /**
   * Chunk text into manageable pieces
   */
  private chunkText(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    const words = text.split(" ");
    let currentChunk = "";

    for (const word of words) {
      if ((currentChunk + " " + word).length > maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = word;
      } else {
        currentChunk += (currentChunk ? " " : "") + word;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Interrogate a single chunk for relevant information
   */
  private async interrogateChunk(
    userQuery: string,
    chunk: string,
    index: number
  ): Promise<string> {
    if (!this.googleProvider) {
      console.error("Google AI provider not initialized. Cannot interrogate chunk.");
      throw new Error("Google AI provider not initialized.");
    }
    try {
      await this.enforceRateLimit();

      const prompt = `User's Question: ${userQuery}

Based ONLY on the following text chunk, provide a complete answer. If the information within this chunk is insufficient to fully answer the question, you MUST respond with the single, exact word: 'INSUFFICIENT'.

Text Chunk:
${chunk}`;
      const result = await generateText({
        model: this.googleProvider("gemini-2.0-flash-lite"),
        prompt,
        maxTokens: 1000,
        temperature: 0.3,
      });

      return result.text.trim();
    } catch (error) {
      console.error(`Error interrogating chunk ${index}:`, error);
      return "INSUFFICIENT";
    }
  }

  /**
   * Synthesize results from file analysis
   */
  private async synthesizeFileResults(
    userQuery: string,
    results: string[],
    researchMode: "Normal" | "Deep",
    callbacks: StreamingCallback
  ): Promise<void> {
    if (!this.googleProvider) {
      console.error("Google AI provider not initialized. Cannot synthesize file results.");
      throw new Error("Google AI provider not initialized.");
    }
    try {
      await this.enforceRateLimit();

      // Updated wordLimit
      const wordLimit = researchMode === "Deep" ? 1200 : 400;
      const synthesisPrompt = `Synthesize these partial answers, all derived from a single source document, into one cohesive and comprehensive answer to the user's original question: '${userQuery}'.

Your response MUST be approximately ${wordLimit} words and should be well-structured and definitive. Aim for a word count between ${wordLimit} and ${wordLimit + (researchMode === "Deep" ? 200 : 100)}.
Important: Synthesize these partial answers into a cohesive answer to the user's query. Do not describe the process of synthesis or mention that the information comes from a document. Present the information directly.

Partial Answers:
${results.join("\n\n---\n\n")}`;
      const result = await generateText({
        model: this.googleProvider("gemini-2.0-flash-lite"),
        prompt: synthesisPrompt,
        // Adjusted maxTokens: if wordLimit is 1200, 1.5*1200 = 1800. New: 2500. If 400, 1.5*400=600. New: 1000.
        maxTokens: researchMode === "Deep" ? 2500 : 1000,
        temperature: 0.7,
      });

      const finalReport: FinalReport = {
        content: result.text,
        sources: [
          {
            id: "file-source-1",
            url: "Uploaded Document",
            title: "User Provided Document",
            sourceType: "Research",
          },
        ],
        wordCount: result.text.split(" ").length,
      };

      callbacks.onFinalAnswer(finalReport);

      // Removed: await this.generateMindMap(result.text, userQuery, callbacks);
    } catch (error) {
      console.error("Error synthesizing file results:", error);
      callbacks.onError(new Error("Failed to synthesize file analysis"));
    }
  }

  /**
   * Step B: Web-First Research Path
   */
  private async executeWebFirstResearch(
    userQuery: string,
    researchMode: "Normal" | "Deep",
    callbacks: StreamingCallback,
    fileContext?: string
  ): Promise<void> {
    // Strategic Planning
    const queries = await this.generateSearchQueries(
      userQuery,
      researchMode,
      fileContext,
      callbacks
    );

    let allSources: Source[] = [];
    let allLearnings: string[] = [];

    // Research Loop with Reflection
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];

      callbacks.onThinkingData({
        type: "searching_start",
        data: { query },
        timestamp: Date.now(),
      });

      const { sources, learnings } = await this.performWebSearch(
        query,
        fileContext,
        callbacks
      );
      allSources.push(...sources);
      allLearnings.push(...learnings);

      // Autonomous reflection after each search batch
      if ((i + 1) % 2 === 0 || i === queries.length - 1) {
        const shouldContinue = await this.performReflection(
          userQuery,
          researchMode,
          allLearnings,
          allSources.length,
          callbacks
        );

        if (!shouldContinue) {
          break;
        }
      }
    }

    // Final Answer Generation
    await this.generateFinalReport(
      userQuery,
      allLearnings,
      allSources,
      researchMode,
      callbacks
    );
  }

  /**
   * Generate strategic search queries
   */
  private async generateSearchQueries(
    userQuery: string,
    researchMode: "Normal" | "Deep",
    fileContext: string | undefined,
    callbacks: StreamingCallback
  ): Promise<string[]> {
    if (!this.googleProvider) {
      console.error("Google AI provider not initialized. Cannot generate search queries.");
      throw new Error("Google AI provider not initialized.");
    }
    try {
      await this.enforceRateLimit();

      callbacks.onThinkingData({
        type: "status",
        data: { message: "🎯 Planning research strategy..." },
        timestamp: Date.now(),
      });

      const targetSourceCount = researchMode === "Deep" ? "100-120" : "10-12";
      let planPrompt = `You are an autonomous research agent in '${researchMode}' mode. Your goal is to answer: '${userQuery}'.

Generate a strategic list of search queries to accomplish this. In Normal mode, aim for broad queries that will yield ~10-12 sources. In Deep mode, create a diverse set of specific queries to uncover ~100-120 sources.

Return only the queries, one per line, without numbering or additional text.`;

      if (fileContext) {
        planPrompt += `\n\nThe user provided a document that was insufficient; use its content to refine your queries and avoid redundant topics: ${fileContext.substring(
          0,
          500
        )}...`;
      }

      const result = await generateText({
        model: this.googleProvider("gemini-2.0-flash-lite"),
        prompt: planPrompt,
        maxTokens: 1000,
        temperature: 0.8,
      });

      const queries = result.text
        .split("\n")
        .map((q) => q.trim())
        .filter((q) => q && !q.match(/^\d+\./))
        .slice(0, researchMode === "Deep" ? 15 : 5);

      callbacks.onThinkingData({
        type: "plan",
        data: { queries },
        timestamp: Date.now(),
      });

      return queries;
    } catch (error) {
      console.error("Error generating search queries:", error);
      return [userQuery]; // Fallback to original query
    }
  }
  /**
   * Perform web search with streaming text generation
   */
  private async performWebSearch(
    query: string,
    fileContext: string | undefined,
    callbacks: StreamingCallback
  ): Promise<{ sources: Source[]; learnings: string[] }> {
    if (!this.googleProvider) {
      console.error("Google AI provider not initialized. Cannot perform web search.");
      throw new Error("Google AI provider not initialized.");
    }
    try {
      await this.enforceRateLimit();

      const sources: Source[] = [];
      const learnings: string[] = [];

      let systemPrompt = `You are a research assistant. Provide comprehensive, well-sourced information about the query. Include specific facts, recent developments, and authoritative perspectives. Your response should be based on the information found through web searches.
Important: Your response should directly answer the query based on the search results. Do not mention or describe your own tools, capabilities, or internal processes (e.g., do not say 'I will use the web search tool' or 'Based on my search results...'). Focus solely on delivering the information requested by the user.`;

      if (fileContext) {
        systemPrompt += ` Additional context from user files to consider: ${fileContext.substring(
          0,
          2000
        )}`;
      }

      // Use a model that supports search grounding and enable it
      const result = await streamText({
        model: this.googleProvider("gemini-2.0-flash-exp", {
          useSearchGrounding: true,
        }),
        system: systemPrompt,
        prompt: query,
        maxTokens: 2500, // Increased from 1500
        temperature: 0.7,
      });

      let searchContent = "";
      let rawSources: any[] = [];

      for await (const part of result.fullStream) {
        if (part.type === "text-delta") {
          searchContent += part.textDelta;
        } else if (part.type === "source") {
            if (part.source && typeof part.source === 'object' && 'url' in part.source) {
                 rawSources.push(part.source);
            }
        }
      }

      if (rawSources.length === 0 && (result as any).experimental_attachments) {
        const attachments = (result as any).experimental_attachments;
        if (Array.isArray(attachments)) {
            attachments.forEach((att: any) => {
                if (att.source && att.source.url) {
                    rawSources.push(att.source);
                } else if (att.url && att.title) {
                    rawSources.push(att);
                }
            });
        }
      }

      if (searchContent.trim()) {
        learnings.push(searchContent.trim());
        callbacks.onThinkingData({
          type: "learning",
          data: { summary: searchContent.substring(0, 300) + "..." },
          timestamp: Date.now(),
        });

        if (rawSources.length > 0) {
            rawSources.forEach((rawSource: any, index: number) => {
                const source: Source = {
                    id: `source-${Date.now()}-${index}`,
                    url: rawSource.url || '',
                    title: rawSource.title || new URL(rawSource.url || 'http://example.com').hostname,
                    sourceType: this.categorizeSource(rawSource.url || ''),
                };
                sources.push(source);
                callbacks.onThinkingData({
                    type: "source_found",
                    data: { source },
                    timestamp: Date.now(),
                });
            });
        } else {
             callbacks.onThinkingData({
                type: "status",
                data: { message: "No specific sources returned by search grounding for this query." },
                timestamp: Date.now(),
            });
        }
      }

      return { sources, learnings };
    } catch (error) {
      console.error("Web search error:", error);
      callbacks.onError(error instanceof Error ? error : new Error("Web search failed"));
      return { sources: [], learnings: [] };
    }
  }
  /**
   * Categorize source type based on URL
   */
  private categorizeSource(url: string): Source["sourceType"] {
    if (url.includes(".edu") || url.includes("scholar.google"))
      return "Academic";
    if (url.includes(".gov")) return "Government";
    if (
      url.includes("news") ||
      url.includes("bbc") ||
      url.includes("cnn") ||
      url.includes("reuters")
    )
      return "News";
    if (
      url.includes("research") ||
      url.includes("journal") ||
      url.includes("arxiv")
    )
      return "Research";
    return "Web";
  }

  /**
   * Perform autonomous reflection on research progress
   */
  private async performReflection(
    userQuery: string,
    researchMode: "Normal" | "Deep",
    learnings: string[],
    sourceCount: number,
    callbacks: StreamingCallback
  ): Promise<boolean> {
    if (!this.googleProvider) {
      console.error("Google AI provider not initialized. Cannot perform reflection.");
      throw new Error("Google AI provider not initialized.");
    }
    try {
      await this.enforceRateLimit();

      const wordLimit = researchMode === "Deep" ? 500 : 200;
      const targetSources = researchMode === "Deep" ? 100 : 10;

      const reflectionPrompt = `Given the goal of writing a ${wordLimit}-word report about "${userQuery}", and based on the learnings gathered so far (${sourceCount} sources found), is the current information sufficient?

Current learnings summary:
${learnings.slice(-3).join("\n\n")}

If the information is sufficient for a comprehensive ${wordLimit}-word report, respond with 'SUFFICIENT'.
If not, respond with 'INSUFFICIENT' followed by 2-3 specific follow-up queries that would address the biggest remaining knowledge gaps.`;

      const result = await generateText({
        model: this.googleProvider("gemini-2.0-flash-lite"),
        prompt: reflectionPrompt,
        maxTokens: 500,
        temperature: 0.6,
      });

      const response = result.text.trim();

      if (response.startsWith("SUFFICIENT") || sourceCount >= targetSources) {
        callbacks.onThinkingData({
          type: "reflection",
          data: {
            status: "sufficient",
            message: `Research complete with ${sourceCount} sources`,
          },
          timestamp: Date.now(),
        });
        return false; // Stop researching
      } else {
        callbacks.onThinkingData({
          type: "reflection",
          data: {
            status: "insufficient",
            message: "Continuing research with refined queries",
          },
          timestamp: Date.now(),
        });
        return true; // Continue researching
      }
    } catch (error) {
      console.error("Reflection error:", error);
      return sourceCount < 5; // Conservative fallback
    }
  }

  /**
   * Generate final research report
   */
  private async generateFinalReport(
    userQuery: string,
    learnings: string[],
    sources: Source[],
    researchMode: "Normal" | "Deep",
    callbacks: StreamingCallback
  ): Promise<void> {
    if (!this.googleProvider) {
      console.error("Google AI provider not initialized. Cannot generate final report.");
      throw new Error("Google AI provider not initialized.");
    }
    try {
      await this.enforceRateLimit();

      callbacks.onThinkingData({
        type: "status",
        data: { message: "📝 Generating final report..." },
        timestamp: Date.now(),
      });

      // Adjusted word limits and maxTokens for better completeness
      const wordLimit = researchMode === "Deep" ? 1800 : 600;
      const upperWordLimit = researchMode === "Deep" ? 2200 : 800;
      const maxTokens = researchMode === "Deep" ? 4000 : 2000;
      // Note: maxTokens for generation + prompt tokens should not exceed the model's total token limit (e.g., 8192 for Gemini Flash).

      const reportPrompt = `Synthesize all the following learnings into a single, cohesive final report answering '${userQuery}'.

Your response MUST be approximately ${wordLimit}-${upperWordLimit} words. Aim for a word count between ${wordLimit} and ${upperWordLimit}. As you write, you MUST cite your sources using bracketed numbers like [1], [2], etc., corresponding to the provided source list. The report should be well-structured, definitive, and include tables and markdown for code if appropriate to the content.

When including code examples, always use triple backticks, and specify the programming language if applicable (e.g., \`\`\`python\n# Your Python code here\n\`\`\`).
For tabular data, use clear markdown table syntax. For example:
| Header 1 | Header 2 | Header 3 |
|---|---|---|
| Row 1 Col 1 | Row 1 Col 2 | Row 1 Col 3 |
| Row 2 Col 1 | Row 2 Col 2 | Row 2 Col 3 |

Important: Synthesize the information into a cohesive report that directly answers the user's query. Do not refer to your own actions, tools used during research (like 'web search tool', 'document analysis'), or the process of generating this report. The report should be from the perspective of a knowledgeable expert providing information, not an AI describing its work.

Learnings:
${learnings.join("\n\n---\n\n")}

Sources for citation:
${sources
  .map((source, index) => `[${index + 1}] ${source.title} - ${source.url}`)
  .join("\n")}`;

      const result = await generateText({
        model: this.googleProvider("gemini-2.0-flash-exp"),
        prompt: reportPrompt,
        maxTokens: maxTokens, // Use adjusted maxTokens
        temperature: 0.7,
      });

      const finalReport: FinalReport = {
        content: result.text,
        sources: sources,
        wordCount: result.text.split(" ").length,
      };

      callbacks.onFinalAnswer(finalReport);

      // Removed: await this.generateMindMap(result.text, userQuery, callbacks);
    } catch (error) {
      console.error("Error generating final report:", error);
      callbacks.onError(new Error("Failed to generate final report"));
    }
  }
}

// =====================================================================================
// EXPORT SINGLETON INSTANCE
// =====================================================================================

export const autonomousResearchAgent = new AutonomousResearchAgent();
