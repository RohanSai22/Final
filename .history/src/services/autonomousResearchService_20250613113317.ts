// Autonomous Research Agent - Complete implementation with Vercel AI SDK
import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { fileProcessingService } from "./fileProcessingService";

// Core interfaces for the autonomous agent
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

export interface MindMapNode {
  id: string;
  label: string;
  level: number;
  position: { x: number; y: number };
  data: {
    label: string;
    summary?: string;
    level: number;
  };
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  animated?: boolean;
}

export interface MindMapData {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

class AutonomousResearchService {
  private apiKey: string | null = null;
  private requestCount = 0;
  private windowStart = Date.now();
  private readonly rateLimitConfig = {
    maxRequests: 60, // Max requests per window
    windowMs: 60000, // 1 minute window
    delayBetweenRequests: 1000, // 1 second between requests
  };

  constructor() {
    this.initializeAI();
  }

  private initializeAI() {
    try {
      this.apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;
      if (!this.apiKey) {
        console.warn("Google AI API key not found in environment variables");
        return;
      }
      console.log(
        "Autonomous Research Agent initialized with Vercel AI SDK and Gemini 2.0 Flash Lite"
      );
    } catch (error) {
      console.error("Failed to initialize Autonomous Research Agent:", error);
    }
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();

    // Reset window if expired
    if (now - this.windowStart >= this.rateLimitConfig.windowMs) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    // Check if we've hit the rate limit
    if (this.requestCount >= this.rateLimitConfig.maxRequests) {
      const remainingTime =
        this.rateLimitConfig.windowMs - (now - this.windowStart);
      console.warn(`Rate limit reached. Waiting ${remainingTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, remainingTime));
      this.requestCount = 0;
      this.windowStart = Date.now();
    }

    // Add delay between requests
    if (this.requestCount > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.rateLimitConfig.delayBetweenRequests)
      );
    }

    this.requestCount++;
  }

  /**
   * Main entry point for autonomous research
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
        data: { message: "Starting autonomous research..." },
        timestamp: Date.now(),
      });

      // Decision Point 1: Is a File Provided?
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
        error instanceof Error ? error : new Error("Unknown error")
      );
    }
  }

  /**
   * File-First Analysis Path
   */
  private async executeFileFirstAnalysis(
    userQuery: string,
    files: File[],
    researchMode: "Normal" | "Deep",
    callbacks: StreamingCallback
  ): Promise<void> {
    try {
      callbacks.onThinkingData({
        type: "status",
        data: { message: "Analyzing uploaded files..." },
        timestamp: Date.now(),
      });

      // Step A1: Text Extraction & Chunking
      const processedFiles = await fileProcessingService.processFiles(files);
      const fileContent = processedFiles
        .filter((f) => f.success && f.content)
        .map((f) => `File: ${f.name}\nContent: ${f.content}`)
        .join("\n\n");

      if (!fileContent.trim()) {
        callbacks.onThinkingData({
          type: "sufficiency_check",
          data: {
            status: "insufficient",
            reason:
              "No readable content found in uploaded files. Beginning web research.",
          },
          timestamp: Date.now(),
        });
        await this.executeWebFirstResearch(userQuery, researchMode, callbacks);
        return;
      }

      // Step A2: Check if files contain sufficient information
      const sufficiencyCheck = await this.checkFileSufficiency(
        userQuery,
        fileContent,
        callbacks
      );

      if (sufficiencyCheck.sufficient) {
        // Step A3: Generate file-only report
        await this.generateFileOnlyReport(
          userQuery,
          fileContent,
          researchMode,
          callbacks
        );
      } else {
        // Files insufficient, proceed with web research enhanced by file context
        await this.executeWebFirstResearch(
          userQuery,
          researchMode,
          callbacks,
          fileContent
        );
      }
    } catch (error) {
      console.error("File-first analysis error:", error);
      callbacks.onError(
        error instanceof Error ? error : new Error("File analysis failed")
      );
    }
  }

  /**
   * Web-First Research Path
   */
  private async executeWebFirstResearch(
    userQuery: string,
    researchMode: "Normal" | "Deep",
    callbacks: StreamingCallback,
    fileContext?: string
  ): Promise<void> {
    try {
      callbacks.onThinkingData({
        type: "status",
        data: { message: "Planning web research strategy..." },
        timestamp: Date.now(),
      });

      // Strategic Planning
      const queries = await this.generateSearchQueries(
        userQuery,
        researchMode,
        fileContext,
        callbacks
      );

      callbacks.onThinkingData({
        type: "plan",
        data: { queries },
        timestamp: Date.now(),
      });

      // Research Loop with search grounding
      const allSources: Source[] = [];
      const allLearnings: string[] = [];
      const maxQueries = researchMode === "Normal" ? 3 : 6;
      let processedQueries = 0;

      for (const query of queries.slice(0, maxQueries)) {
        try {
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
          processedQueries++;

          // Check sufficiency after each search
          if (processedQueries >= 2) {
            const sufficient = await this.checkResearchSufficiency(
              userQuery,
              researchMode,
              allLearnings,
              allSources.length,
              callbacks
            );

            if (
              sufficient &&
              processedQueries >= (researchMode === "Normal" ? 2 : 3)
            ) {
              break;
            }
          }
        } catch (searchError) {
          console.error(`Search error for query "${query}":`, searchError);
          // Continue with next query instead of failing completely
        }
      }

      // Final Answer Generation
      await this.generateFinalReport(
        userQuery,
        researchMode,
        allLearnings,
        allSources,
        fileContext,
        callbacks
      );
    } catch (error) {
      console.error("Web-first research error:", error);
      callbacks.onError(
        error instanceof Error ? error : new Error("Web research failed")
      );
    }
  }

  /**
   * Check if files contain sufficient information
   */
  private async checkFileSufficiency(
    userQuery: string,
    fileContent: string,
    callbacks: StreamingCallback
  ): Promise<{ sufficient: boolean; reason: string }> {
    try {
      await this.enforceRateLimit();

      const prompt = `Analyze if the provided file content contains sufficient information to answer the user's query.

User Query: ${userQuery}

File Content: ${fileContent.substring(0, 8000)}

Instructions: Determine if the file content can comprehensively answer the user's query. Respond with "SUFFICIENT" if the files contain enough information, or "INSUFFICIENT" if web research is needed.

Consider:
- Does the file directly address the query?
- Is the information complete and up-to-date?
- Are there gaps that external sources could fill?

Respond with only "SUFFICIENT" or "INSUFFICIENT" followed by a brief reason.`;

      const result = await streamText({
        model: google("gemini-2.0-flash-lite"),
        prompt,
        maxTokens: 50,
        temperature: 0.1,
      });

      let response = "";
      for await (const delta of result.textStream) {
        response += delta;
      }

      const sufficient = response.toUpperCase().includes("SUFFICIENT");
      const reason =
        response.replace(/SUFFICIENT|INSUFFICIENT/i, "").trim() ||
        (sufficient
          ? "Files contain comprehensive information"
          : "Additional research needed");

      callbacks.onThinkingData({
        type: "sufficiency_check",
        data: {
          status: sufficient ? "sufficient" : "insufficient",
          reason,
        },
        timestamp: Date.now(),
      });

      return { sufficient, reason };
    } catch (error) {
      console.error("File sufficiency check error:", error);
      return { sufficient: false, reason: "Unable to analyze file content" };
    }
  }

  /**
   * Generate search queries for research
   */
  private async generateSearchQueries(
    userQuery: string,
    researchMode: "Normal" | "Deep",
    fileContext: string | undefined,
    callbacks: StreamingCallback
  ): Promise<string[]> {
    try {
      await this.enforceRateLimit();

      const queryCount = researchMode === "Normal" ? 3 : 6;
      let systemPrompt = `You are a research strategist. Generate ${queryCount} diverse, specific search queries to comprehensively research the user's topic.`;

      if (researchMode === "Deep") {
        systemPrompt +=
          " Focus on finding academic sources, recent developments, multiple perspectives, and detailed analysis.";
      } else {
        systemPrompt +=
          " Focus on finding authoritative, up-to-date information from reliable sources.";
      }

      if (fileContext) {
        systemPrompt +=
          "\n\nThe user has provided files. Generate queries that complement and expand upon the file content.";
      }

      systemPrompt +=
        "\n\nReturn only the search queries, one per line, without numbering or formatting.";

      const result = await streamText({
        model: google("gemini-2.0-flash-lite"),
        system: systemPrompt,
        prompt: userQuery,
        maxTokens: 300,
        temperature: 0.7,
      });

      let response = "";
      for await (const delta of result.textStream) {
        response += delta;
      }

      const queries = response
        .split("\n")
        .map((q) => q.replace(/^\d+\.\s*/, "").trim())
        .filter((q) => q.length > 0)
        .slice(0, queryCount);

      return queries.length > 0 ? queries : [userQuery];
    } catch (error) {
      console.error("Query generation error:", error);
      return [userQuery];
    }
  }

  /**
   * Perform web search with Vercel AI SDK search grounding
   */
  private async performWebSearch(
    query: string,
    fileContext: string | undefined,
    callbacks: StreamingCallback
  ): Promise<{ sources: Source[]; learnings: string[] }> {
    try {
      await this.enforceRateLimit();

      const sources: Source[] = [];
      const learnings: string[] = [];

      let systemPrompt = `You are a research assistant. Provide comprehensive, well-sourced information about the query. Include specific facts, recent developments, and authoritative perspectives.`;

      if (fileContext) {
        systemPrompt += ` Context from user files: ${fileContext.substring(
          0,
          2000
        )}`;
      }

      const result = await streamText({
        model: google("gemini-2.0-flash-lite"),
        system: systemPrompt,
        prompt: query,
        experimental_useSearchGrounding: true,
        maxTokens: 1500,
        temperature: 0.7,
      });

      let searchContent = "";

      // Process the full stream to get sources and content
      for await (const delta of result.fullStream) {
        if (delta.type === "text-delta") {
          searchContent += delta.textDelta;
        } else if (delta.type === "search-grounding-source") {
          const source: Source = {
            id: delta.id || `source-${sources.length + 1}`,
            url: delta.url || "",
            title: delta.title || "Source",
            sourceType: this.categorizeSource(delta.url || ""),
          };
          sources.push(source);

          callbacks.onThinkingData({
            type: "source_found",
            data: { source },
            timestamp: Date.now(),
          });
        } else if (delta.type === "search-grounding-sources") {
          // Handle batch sources
          for (const sourceData of delta.sources) {
            const source: Source = {
              id: sourceData.id || `source-${sources.length + 1}`,
              url: sourceData.url || "",
              title: sourceData.title || "Source",
              sourceType: this.categorizeSource(sourceData.url || ""),
            };
            sources.push(source);

            callbacks.onThinkingData({
              type: "source_found",
              data: { source },
              timestamp: Date.now(),
            });
          }
        }
      }

      // Extract learnings from the search content
      if (searchContent.trim()) {
        learnings.push(searchContent.trim());

        callbacks.onThinkingData({
          type: "learning",
          data: { summary: searchContent.substring(0, 300) + "..." },
          timestamp: Date.now(),
        });
      }

      return { sources, learnings };
    } catch (error) {
      console.error("Web search error:", error);
      return { sources: [], learnings: [] };
    }
  }

  /**
   * Check if research is sufficient
   */
  private async checkResearchSufficiency(
    userQuery: string,
    researchMode: "Normal" | "Deep",
    learnings: string[],
    sourceCount: number,
    callbacks: StreamingCallback
  ): Promise<boolean> {
    try {
      await this.enforceRateLimit();

      const minSources = researchMode === "Normal" ? 15 : 80;
      const targetWords = researchMode === "Normal" ? 400 : 800;

      if (sourceCount < minSources) {
        callbacks.onThinkingData({
          type: "reflection",
          data: {
            decision: "insufficient",
            reason: `Need more sources: ${sourceCount}/${minSources}. Continuing research...`,
          },
          timestamp: Date.now(),
        });
        return false;
      }

      const prompt = `Evaluate if the gathered research is sufficient to write a comprehensive ${targetWords}-word report.

User Query: ${userQuery}
Research Mode: ${researchMode}
Sources Found: ${sourceCount}
Learnings: ${learnings.slice(0, 5).join("\n")}

Respond with "SUFFICIENT" if the information is adequate, or "INSUFFICIENT" with a brief reason.`;

      const result = await streamText({
        model: google("gemini-2.0-flash-lite"),
        prompt,
        maxTokens: 50,
        temperature: 0.1,
      });

      let response = "";
      for await (const delta of result.textStream) {
        response += delta;
      }

      const sufficient = response.toUpperCase().includes("SUFFICIENT");

      callbacks.onThinkingData({
        type: "reflection",
        data: {
          decision: sufficient ? "sufficient" : "insufficient",
          reason:
            response.replace(/SUFFICIENT|INSUFFICIENT/i, "").trim() ||
            (sufficient ? "Research complete" : "Need more information"),
        },
        timestamp: Date.now(),
      });

      return sufficient;
    } catch (error) {
      console.error("Sufficiency check error:", error);
      return true; // Assume sufficient if check fails
    }
  }

  /**
   * Generate file-only report
   */
  private async generateFileOnlyReport(
    userQuery: string,
    fileContent: string,
    researchMode: "Normal" | "Deep",
    callbacks: StreamingCallback
  ): Promise<void> {
    try {
      await this.enforceRateLimit();

      const wordLimit = researchMode === "Normal" ? 400 : 800;

      const prompt = `Based solely on the provided file content, generate a comprehensive response to the user's query.

User Query: ${userQuery}
Target Length: ${wordLimit} words
File Content: ${fileContent}

Instructions:
- Answer the query using only information from the files
- Structure the response clearly with headings
- Stay within the ${wordLimit} word limit
- Reference specific file content where relevant
- Provide a thorough, well-organized analysis`;

      const result = await streamText({
        model: google("gemini-2.0-flash-lite"),
        prompt,
        maxTokens: wordLimit * 2,
        temperature: 0.7,
      });

      let reportContent = "";
      for await (const delta of result.textStream) {
        reportContent += delta;
      }

      const finalReport: FinalReport = {
        content: reportContent,
        sources: [
          {
            id: "uploaded-files",
            url: "User Uploaded Files",
            title: "User-provided documents",
            sourceType: "Research",
          },
        ],
        wordCount: reportContent.split(/\s+/).length,
      };

      callbacks.onFinalAnswer(finalReport);
    } catch (error) {
      console.error("File-only report generation error:", error);
      callbacks.onError(
        error instanceof Error
          ? error
          : new Error("Failed to generate file-based report")
      );
    }
  }

  /**
   * Generate final research report
   */
  private async generateFinalReport(
    userQuery: string,
    researchMode: "Normal" | "Deep",
    learnings: string[],
    sources: Source[],
    fileContext: string | undefined,
    callbacks: StreamingCallback
  ): Promise<void> {
    try {
      await this.enforceRateLimit();

      const wordLimit = researchMode === "Normal" ? 400 : 800;

      callbacks.onThinkingData({
        type: "status",
        data: { message: "Synthesizing final report..." },
        timestamp: Date.now(),
      });

      let systemPrompt = `You are a professional research writer. Synthesize all the gathered information into a comprehensive, well-structured report.

Requirements:
- Exactly ${wordLimit} words
- Include citations as [1], [2], [3] etc.
- Professional tone and clear structure
- Cover all major aspects of the query
- Use authoritative information from the research`;

      if (fileContext) {
        systemPrompt += `\n\nUser files provided context: ${fileContext.substring(
          0,
          1000
        )}`;
      }

      const researchSummary = `User Query: ${userQuery}

Research Findings:
${learnings.map((learning, i) => `${i + 1}. ${learning}`).join("\n")}

Sources Available:
${sources
  .map((source, i) => `[${i + 1}] ${source.title} - ${source.url}`)
  .join("\n")}

Write a comprehensive ${wordLimit}-word report with proper citations.`;

      const result = await streamText({
        model: google("gemini-2.0-flash-lite"),
        system: systemPrompt,
        prompt: researchSummary,
        maxTokens: wordLimit * 2,
        temperature: 0.7,
      });

      let reportContent = "";
      for await (const delta of result.textStream) {
        reportContent += delta;
      }

      const finalReport: FinalReport = {
        content: reportContent,
        sources: sources.slice(0, researchMode === "Normal" ? 30 : 140),
        wordCount: reportContent.split(/\s+/).length,
      };

      callbacks.onFinalAnswer(finalReport);
    } catch (error) {
      console.error("Final report generation error:", error);
      callbacks.onError(
        error instanceof Error
          ? error
          : new Error("Failed to generate final report")
      );
    }
  }

  /**
   * Generate mind map from research content
   */
  async generateMindMap(
    userQuery: string,
    reportContent: string,
    sources: Source[]
  ): Promise<MindMapData> {
    try {
      await this.enforceRateLimit();

      const prompt = `Create a hierarchical mind map structure from the research content.

User Query: ${userQuery}
Content: ${reportContent}

Generate a JSON object with:
1. "nodes" array: Each node has id, label, level (1-4), position {x, y}, and data {label, summary, level}
2. "edges" array: Each edge has id, source, target, label (relationship description), animated: true

Structure:
- Level 1: Main topic (center)
- Level 2: Primary themes (3-5 main ideas)
- Level 3: Supporting concepts (2-3 per level 2 node)
- Level 4: Specific details (1-2 per level 3 node)

Return only valid JSON.`;

      const result = await streamText({
        model: google("gemini-2.0-flash-lite"),
        prompt,
        maxTokens: 2000,
        temperature: 0.3,
      });

      let response = "";
      for await (const delta of result.textStream) {
        response += delta;
      }

      try {
        const mindMapData = JSON.parse(response);
        return this.validateAndFormatMindMap(mindMapData, userQuery);
      } catch (parseError) {
        console.error("Mind map JSON parse error:", parseError);
        return this.createFallbackMindMap(userQuery, sources);
      }
    } catch (error) {
      console.error("Mind map generation error:", error);
      return this.createFallbackMindMap(userQuery, sources);
    }
  }

  /**
   * Expand mind map node
   */
  async expandMindMapNode(
    nodeId: string,
    currentMindMap: MindMapData,
    userQuery: string
  ): Promise<MindMapData> {
    try {
      await this.enforceRateLimit();

      const targetNode = currentMindMap.nodes.find((n) => n.id === nodeId);
      if (!targetNode) return currentMindMap;

      const prompt = `Expand the mind map node "${
        targetNode.label
      }" with 2-3 relevant child nodes.

Context: ${userQuery}
Node to expand: ${targetNode.label}
Current level: ${targetNode.level}

Generate new child nodes (level ${targetNode.level + 1}) as JSON:
{
  "newNodes": [
    {"id": "unique-id", "label": "Node Label", "level": ${
      targetNode.level + 1
    }, "data": {"label": "Node Label", "summary": "Brief description", "level": ${
        targetNode.level + 1
      }}}
  ],
  "newEdges": [
    {"id": "edge-id", "source": "${nodeId}", "target": "child-id", "label": "relationship", "animated": true}
  ]
}`;

      const result = await streamText({
        model: google("gemini-2.0-flash-lite"),
        prompt,
        maxTokens: 500,
        temperature: 0.5,
      });

      let response = "";
      for await (const delta of result.textStream) {
        response += delta;
      }

      const expansion = JSON.parse(response);

      // Add positions to new nodes
      const newNodes = expansion.newNodes.map((node: any, index: number) => ({
        ...node,
        position: {
          x: targetNode.position.x + (index - 1) * 200,
          y: targetNode.position.y + 150,
        },
      }));

      return {
        nodes: [...currentMindMap.nodes, ...newNodes],
        edges: [...currentMindMap.edges, ...expansion.newEdges],
      };
    } catch (error) {
      console.error("Mind map expansion error:", error);
      return currentMindMap;
    }
  }

  /**
   * Categorize source based on URL
   */
  private categorizeSource(
    url: string
  ): "Academic" | "Government" | "News" | "Research" | "Web" {
    const urlLower = url.toLowerCase();

    if (
      urlLower.includes(".edu") ||
      urlLower.includes("scholar.google") ||
      urlLower.includes("jstor") ||
      urlLower.includes("pubmed") ||
      urlLower.includes("arxiv") ||
      urlLower.includes("researchgate")
    ) {
      return "Academic";
    }

    if (
      urlLower.includes(".gov") ||
      urlLower.includes(".mil") ||
      urlLower.includes("who.int") ||
      urlLower.includes("un.org")
    ) {
      return "Government";
    }

    if (
      urlLower.includes("news") ||
      urlLower.includes("bbc") ||
      urlLower.includes("cnn") ||
      urlLower.includes("reuters") ||
      urlLower.includes("nytimes") ||
      urlLower.includes("guardian")
    ) {
      return "News";
    }

    if (
      urlLower.includes("research") ||
      urlLower.includes("institute") ||
      urlLower.includes("foundation") ||
      urlLower.includes("think")
    ) {
      return "Research";
    }

    return "Web";
  }

  /**
   * Validate and format mind map data
   */
  private validateAndFormatMindMap(data: any, userQuery: string): MindMapData {
    try {
      if (!data.nodes || !Array.isArray(data.nodes)) {
        throw new Error("Invalid nodes structure");
      }

      const nodes = data.nodes.map((node: any, index: number) => ({
        id: node.id || `node-${index}`,
        label: node.label || "Node",
        level: node.level || 1,
        position: node.position || {
          x: index * 200,
          y: (node.level || 1) * 100,
        },
        data: {
          label: node.label || "Node",
          summary: node.data?.summary || "",
          level: node.level || 1,
        },
      }));

      const edges = (data.edges || []).map((edge: any, index: number) => ({
        id: edge.id || `edge-${index}`,
        source: edge.source,
        target: edge.target,
        label: edge.label || "related to",
        animated: true,
      }));

      return { nodes, edges };
    } catch (error) {
      return this.createFallbackMindMap(userQuery, []);
    }
  }

  /**
   * Create fallback mind map
   */
  private createFallbackMindMap(
    userQuery: string,
    sources: Source[]
  ): MindMapData {
    const nodes = [
      {
        id: "center",
        label: userQuery,
        level: 1,
        position: { x: 0, y: 0 },
        data: { label: userQuery, summary: "Main research topic", level: 1 },
      },
    ];

    const edges: MindMapEdge[] = [];

    // Add source categories as nodes
    const categories = ["Academic", "Government", "News", "Research"];
    categories.forEach((category, index) => {
      const categoryId = `category-${category.toLowerCase()}`;
      nodes.push({
        id: categoryId,
        label: `${category} Sources`,
        level: 2,
        position: { x: (index - 1.5) * 200, y: 150 },
        data: {
          label: `${category} Sources`,
          summary: `Sources from ${category.toLowerCase()} category`,
          level: 2,
        },
      });

      edges.push({
        id: `edge-center-${categoryId}`,
        source: "center",
        target: categoryId,
        label: "includes",
        animated: true,
      });
    });

    return { nodes, edges };
  }
}

export const autonomousResearchService = new AutonomousResearchService();
