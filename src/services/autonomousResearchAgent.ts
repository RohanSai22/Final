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

export interface ProcessedFileInput {
  name: string;
  content: string;
  type: string; // e.g., 'pdf', 'docx', 'txt'
}

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
    files: ProcessedFileInput[],
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
    files: ProcessedFileInput[],
    researchMode: "Normal" | "Deep",
    callbacks: StreamingCallback
  ): Promise<void> {
    callbacks.onThinkingData({
      type: "status",
      data: { message: `📄 Analyzing ${files.length} pre-processed file(s)...` },
      timestamp: Date.now(),
    });

    // Combine content from pre-processed files
    let combinedFileContent = "";
    for (const file of files) {
      callbacks.onThinkingData({
        type: "status",
        data: { message: `Appending content from ${file.name}`},
        timestamp: Date.now(),
      });
      if (file.content && file.content.trim().length > 0) {
        combinedFileContent += `

--- ${file.name} ---
${file.content}`;
      } else {
        console.warn(`File ${file.name} has no content or content is empty.`);
         callbacks.onThinkingData({
            type: "status",
            data: { message: `Skipping ${file.name} as it has no content.`},
            timestamp: Date.now(),
        });
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

Your task is to answer the "User's Question" based strictly and solely on the information available in the "Text Chunk" provided below.
Do NOT infer, assume, or use any external knowledge or information not explicitly stated in the "Text Chunk".
If the information within this chunk is insufficient to fully answer the question, you MUST respond with the single, exact word: 'INSUFFICIENT'. Otherwise, provide the answer using only information from the chunk.

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
      const synthesisPrompt = `User's original question: '${userQuery}'.

Synthesize the following "Partial Answers" (which were all derived strictly from a single source document) into one cohesive and comprehensive answer to the user's question.
Your response MUST be approximately ${wordLimit} words and should be well-structured and definitive. Aim for a word count between ${wordLimit} and ${wordLimit + (researchMode === "Deep" ? 200 : 100)}.

CRITICAL INSTRUCTIONS:
1. Base your synthesis strictly and solely on the information present in the "Partial Answers".
2. Do NOT infer, assume, or introduce any information not explicitly stated in these "Partial Answers".
3. Do not describe the process of synthesis or mention that the information comes from a document. Present the synthesized information directly as a comprehensive answer.
4. If the combined "Partial Answers" are still insufficient to form a good answer, make the best attempt to answer using only the provided information, clearly stating any limitations if necessary (though the goal is a direct answer).

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
        planPrompt += `\n\nThe user provided a document (context below). Your generated search queries should aim to find NEW information NOT covered in this document. Refine your queries based strictly on this provided document context to avoid redundant topics. Document context: ${fileContext.substring(
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

      let systemPrompt = `You are a research assistant. Provide comprehensive, well-sourced information about the query. Include specific facts, recent developments, and authoritative perspectives.
Your response MUST be based strictly and solely on the information found through web searches. Do NOT infer or assume any information not explicitly stated in the search results.
Important: Your response should directly answer the query based on the search results. Do not mention or describe your own tools, capabilities, or internal processes (e.g., do not say 'I will use the web search tool' or 'Based on my search results...'). Focus solely on delivering the information requested by the user.`;

      if (fileContext) {
        systemPrompt += `\n\nAdditional context from user files to consider (use this to guide your understanding but prioritize web search results for the answer): ${fileContext.substring(
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

      const reflectionPrompt = `User Query: "${userQuery}"
Research Mode: ${researchMode} (${wordLimit}-word report goal)
Learnings Gathered So Far (last 3 shown):
${learnings.slice(-3).join("\n\n")}
Number of Sources Found: ${sourceCount} (Target: ~${targetSources})

Task: Assess if the "Learnings Gathered So Far" are sufficient to write a comprehensive ${wordLimit}-word report answering the "User Query".
Base your assessment strictly on the provided learnings. Do not infer or assume knowledge beyond what's presented.

If sufficient, respond with the single word: 'SUFFICIENT'.
If insufficient, respond with 'INSUFFICIENT', followed by 2-3 specific follow-up search queries that would address the most critical knowledge gaps for the report. These queries should aim to gather information not evident in the current learnings.`;

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

      const reportPrompt = `User Query: '${userQuery}'
Research Mode: ${researchMode} (${wordLimit}-${upperWordLimit} word target)

Task: Synthesize all the "Learnings" provided below into a single, cohesive, and comprehensive final report that directly answers the "User Query".

CRITICAL INSTRUCTIONS:
1.  Strict Adherence to Provided Context: Your entire report MUST be based strictly and solely on the information contained within the "Learnings" section. Do NOT use any external knowledge, infer information not explicitly stated, or make assumptions beyond the provided materials.
2.  Citation: You MUST cite sources for the information. Use bracketed numbers like [1], [2], etc., corresponding to the "Sources for citation" list provided at the end. Every piece of significant information or claim should ideally have a citation.
3.  Word Count: The report should be approximately ${wordLimit}-${upperWordLimit} words.
4.  Structure and Formatting: The report should be well-structured (e.g., introduction, body paragraphs, conclusion). Use Markdown for formatting. If tables or code examples are appropriate and supported by the learnings, include them using standard Markdown syntax (e.g., \`\`\`python ... \`\`\` for code, pipe tables for tabular data).
5.  Perspective: Write from the perspective of a knowledgeable expert. Do NOT refer to your own actions, the research process, tools used (like 'web search tool' or 'document analysis'), or the act of generating this report. Focus on delivering the synthesized information directly.
6.  Completeness: If the provided "Learnings" are insufficient to fully address aspects of the "User Query" or to meet the word count naturally while adhering to strict context, focus on thoroughly covering what *is* available in the learnings. Do not invent content to fill gaps. It's better to have a shorter, accurate report based on the given context than a longer one with unsupported information.

Learnings:
${learnings.join("\n\n---\n\n")}

Sources for citation:
${sources
  .map((source, index) => `[${index + 1}] ${source.title} (${source.sourceType}) - ${source.url}`)
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
