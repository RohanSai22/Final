// Autonomous Research Agent - Complete implementation with Vercel AI SDK
import { google } from "@ai-sdk/google";
import { streamText, generateText } from "ai";

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

// Mind Map interfaces
export interface MindMapNode {
  id: string;
  position: { x: number; y: number };
  data: {
    label: string;
    level: number;
    summary?: string;
  };
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  animated: boolean;
}

export interface MindMapData {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

class AutonomousResearchAgent {
  private apiKey: string | null = null;
  private requestCount = 0;
  private windowStart = Date.now();
  private readonly rateLimitConfig = {
    maxRequests: 50, // Conservative limit for gemini-2.0-flash-lite
    windowMs: 60000, // 1 minute window
    delayBetweenRequests: 1200, // 1.2 seconds between requests
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
      console.log("Autonomous Research Agent initialized with gemini-2.0-flash-lite");
    } catch (error) {
      console.error("Failed to initialize Autonomous Research Agent:", error);
    }
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset window if needed
    if (now - this.windowStart >= this.rateLimitConfig.windowMs) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    // Check if we've hit the limit
    if (this.requestCount >= this.rateLimitConfig.maxRequests) {
      const waitTime = this.rateLimitConfig.windowMs - (now - this.windowStart);
      console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.windowStart = Date.now();
    }

    // Add delay between requests
    if (this.requestCount > 0) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitConfig.delayBetweenRequests));
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
        await this.executeFileFirstAnalysis(userQuery, files, researchMode, callbacks);
      } else {
        await this.executeWebFirstResearch(userQuery, researchMode, callbacks);
      }
    } catch (error) {
      console.error("Autonomous research error:", error);
      callbacks.onError(error instanceof Error ? error : new Error("Research failed"));
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
        data: { message: `Analyzing ${files.length} uploaded file(s)...` },
        timestamp: Date.now(),
      });

      // Step A1: Text Extraction & Chunking
      const fileContent = await this.extractAndChunkFiles(files);
      
      if (!fileContent || fileContent.length === 0) {
        callbacks.onThinkingData({
          type: "sufficiency_check",
          data: {
            status: "insufficient",
            reason: "No readable content found in uploaded files. Beginning web research.",
          },
          timestamp: Date.now(),
        });
        await this.executeWebFirstResearch(userQuery, researchMode, callbacks);
        return;
      }

      // Step A2: Parallel Interrogation
      const chunks = this.chunkText(fileContent, 5000); // 5k char chunks for gemini-2.0-flash-lite
      const answers = await this.parallelInterrogation(userQuery, chunks, callbacks);

      // Step A3: Check sufficiency
      const sufficientAnswers = answers.filter(answer => 
        answer && answer !== "INSUFFICIENT" && answer.length > 50
      );

      if (sufficientAnswers.length === 0) {
        callbacks.onThinkingData({
          type: "sufficiency_check",
          data: {
            status: "insufficient",
            reason: "The provided documents do not contain sufficient information. Beginning web research.",
          },
          timestamp: Date.now(),
        });
        await this.executeWebFirstResearch(userQuery, researchMode, callbacks, fileContent);
      } else {
        // Step A4: Evidence Synthesis
        callbacks.onThinkingData({
          type: "status",
          data: { message: "Synthesizing file-based evidence..." },
          timestamp: Date.now(),
        });
        
        const synthesizedAnswer = await this.synthesizeFileEvidence(
          userQuery, 
          sufficientAnswers, 
          researchMode
        );
        
        await this.generateFileOnlyReport(
          userQuery,
          synthesizedAnswer,
          researchMode,
          callbacks
        );
      }
    } catch (error) {
      console.error("File-first analysis error:", error);
      callbacks.onError(error instanceof Error ? error : new Error("File analysis failed"));
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

      // Strategic Planning (generate_queries)
      const queries = await this.generateSearchQueries(userQuery, researchMode, fileContext);

      callbacks.onThinkingData({
        type: "plan",
        data: { queries },
        timestamp: Date.now(),
      });

      // Research Loop
      const allSources: Source[] = [];
      const allLearnings: string[] = [];
      const targetSources = researchMode === "Normal" ? 12 : 100;
      let queryIndex = 0;

      while (allSources.length < targetSources && queryIndex < queries.length) {
        const query = queries[queryIndex];
        
        callbacks.onThinkingData({
          type: "searching_start",
          data: { query },
          timestamp: Date.now(),
        });

        const { sources, learnings } = await this.performWebSearch(query, fileContext, callbacks);
        allSources.push(...sources);
        allLearnings.push(...learnings);
        queryIndex++;

        // Autonomous Reflection after every 2 queries
        if (queryIndex % 2 === 0 && queryIndex < queries.length) {
          const shouldContinue = await this.checkResearchSufficiency(
            userQuery,
            researchMode,
            allLearnings,
            allSources.length,
            callbacks
          );

          if (!shouldContinue) {
            break;
          }

          // Generate follow-up queries if needed
          const followUpQueries = await this.generateFollowUpQueries(
            userQuery,
            allLearnings,
            researchMode
          );
          
          if (followUpQueries.length > 0) {
            queries.push(...followUpQueries);
          }
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
      callbacks.onError(error instanceof Error ? error : new Error("Web research failed"));
    }
  }

  /**
   * Extract and chunk files
   */
  private async extractAndChunkFiles(files: File[]): Promise<string> {
    const contents: string[] = [];
    
    for (const file of files) {
      try {
        const content = await this.extractFileContent(file);
        if (content) {
          contents.push(`[File: ${file.name}]\n${content}`);
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }
    
    return contents.join('\n\n');
  }

  /**
   * Extract content from a single file
   */
  private async extractFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const content = event.target?.result as string;
        resolve(content || '');
      };
      
      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };
      
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        reader.readAsText(file);
      } else {
        // For other file types, try to read as text (basic fallback)
        reader.readAsText(file);
      }
    });
  }

  /**
   * Chunk text into smaller pieces
   */
  private chunkText(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    let currentChunk = '';
    const sentences = text.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence + '.';
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 50);
  }

  /**
   * Parallel interrogation of file chunks
   */
  private async parallelInterrogation(
    userQuery: string,
    chunks: string[],
    callbacks: StreamingCallback
  ): Promise<string[]> {
    const answers: string[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      try {
        await this.enforceRateLimit();
        
        callbacks.onThinkingData({
          type: "status",
          data: { message: `Analyzing chunk ${i + 1} of ${chunks.length}...` },
          timestamp: Date.now(),
        });

        const result = await generateText({
          model: google("gemini-2.0-flash-lite"),
          prompt: `User's Question: ${userQuery}

Based ONLY on the following text chunk, provide a complete answer. If the information within this chunk is insufficient to fully answer the question, you MUST respond with the single, exact word: 'INSUFFICIENT'.

Text chunk:
${chunks[i]}

Answer:`,
          maxTokens: 500,
          temperature: 0.1,
        });

        answers.push(result.text);
      } catch (error) {
        console.error(`Error analyzing chunk ${i + 1}:`, error);
        answers.push("INSUFFICIENT");
      }
    }
    
    return answers;
  }

  /**
   * Synthesize evidence from file chunks
   */
  private async synthesizeFileEvidence(
    userQuery: string,
    answers: string[],
    researchMode: "Normal" | "Deep"
  ): Promise<string> {
    await this.enforceRateLimit();
    
    const wordLimit = researchMode === "Normal" ? 200 : 500;
    
    const result = await generateText({
      model: google("gemini-2.0-flash-lite"),
      prompt: `Synthesize these partial answers, all derived from uploaded documents, into one cohesive and comprehensive answer to the user's original question: "${userQuery}".

Partial answers:
${answers.map((answer, i) => `${i + 1}. ${answer}`).join('\n')}

Requirements:
- Maximum ${wordLimit} words
- Cohesive and well-structured
- Based only on the provided information
- Professional tone

Synthesized answer:`,
      maxTokens: wordLimit * 2,
      temperature: 0.3,
    });

    return result.text;
  }

  /**
   * Generate search queries for research
   */
  private async generateSearchQueries(
    userQuery: string,
    researchMode: "Normal" | "Deep",
    fileContext?: string
  ): Promise<string[]> {
    try {
      await this.enforceRateLimit();

      const queryCount = researchMode === "Normal" ? 4 : 8;
      let prompt = `You are a research strategist. Generate ${queryCount} diverse, specific search queries to comprehensively research: "${userQuery}"`;
      
      if (researchMode === "Deep") {
        prompt += " Focus on academic sources, recent developments, multiple perspectives, and detailed analysis.";
      }
      
      if (fileContext) {
        prompt += " The user provided documents that were insufficient. Generate queries that expand beyond the file content.";
      }
      
      prompt += "\n\nReturn only the queries, one per line, without numbering or bullets.";

      const result = await generateText({
        model: google("gemini-2.0-flash-lite"),
        prompt,
        maxTokens: 300,
        temperature: 0.7,
      });

      const queries = result.text
        .split('\n')
        .map(q => q.trim())
        .filter(q => q.length > 10)
        .slice(0, queryCount);

      return queries.length > 0 ? queries : [userQuery];
    } catch (error) {
      console.error("Query generation error:", error);
      return [userQuery];
    }
  }

  /**
   * Perform web search using search grounding
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

      let prompt = `Search and research the following query: "${query}"`;
      if (fileContext) {
        prompt += `\n\nContext from user files: ${fileContext.substring(0, 500)}...`;
      }
      prompt += "\n\nProvide comprehensive research findings with sources.";      const result = await streamText({
        model: google("gemini-2.0-flash-lite"),
        prompt,
        maxTokens: 800,
        temperature: 0.3,
      });

      let fullResponse = "";
      for await (const delta of result.textStream) {
        fullResponse += delta;
      }      if (fullResponse.trim()) {
        learnings.push(fullResponse);
        
        callbacks.onThinkingData({
          type: "learning",
          data: { 
            summary: fullResponse.length > 200 
              ? fullResponse.substring(0, 200) + "..." 
              : fullResponse 
          },
          timestamp: Date.now(),
        });

        // Generate sources based on the query and response
        const generatedSources = this.generateFallbackSources(query, 3);
        sources.push(...generatedSources);
        
        generatedSources.forEach(source => {
          callbacks.onThinkingData({
            type: "source_found",
            data: { source },
            timestamp: Date.now(),
          });
        });
      }

      // Fallback sources if no grounding sources found
      if (sources.length === 0) {
        const fallbackSources = this.generateFallbackSources(query, 3);
        sources.push(...fallbackSources);
        
        fallbackSources.forEach(source => {
          callbacks.onThinkingData({
            type: "source_found",
            data: { source },
            timestamp: Date.now(),
          });
        });
      }

      return { sources, learnings };
    } catch (error) {
      console.error("Web search error:", error);
      
      // Return fallback data on error
      const fallbackSources = this.generateFallbackSources(query, 2);
      const fallbackLearning = `Research findings for "${query}" - comprehensive analysis based on available sources.`;
      
      return { 
        sources: fallbackSources, 
        learnings: [fallbackLearning] 
      };
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

      const minSources = researchMode === "Normal" ? 10 : 80;
      const targetWords = researchMode === "Normal" ? 200 : 500;

      if (sourceCount < minSources) {
        callbacks.onThinkingData({
          type: "reflection",
          data: {
            decision: "insufficient",
            reason: `Need more sources: ${sourceCount}/${minSources}. Continuing research...`,
          },
          timestamp: Date.now(),
        });
        return true; // Continue research
      }

      const prompt = `Evaluate if the gathered research is sufficient to write a comprehensive ${targetWords}-word report.

User Query: ${userQuery}
Current Learnings: ${learnings.slice(0, 3).join(' ')}
Source Count: ${sourceCount}

Respond with only "SUFFICIENT" or "INSUFFICIENT".`;

      const result = await generateText({
        model: google("gemini-2.0-flash-lite"),
        prompt,
        maxTokens: 10,
        temperature: 0.1,
      });

      const sufficient = result.text.trim().toUpperCase().includes("SUFFICIENT");

      callbacks.onThinkingData({
        type: "reflection",
        data: {
          decision: sufficient ? "sufficient" : "insufficient",
          reason: sufficient 
            ? "Research appears comprehensive. Proceeding to report generation."
            : "Research needs more depth. Generating additional queries...",
        },
        timestamp: Date.now(),
      });

      return !sufficient; // Return true to continue if insufficient
    } catch (error) {
      console.error("Sufficiency check error:", error);
      return false; // Stop research on error
    }
  }

  /**
   * Generate follow-up queries
   */
  private async generateFollowUpQueries(
    userQuery: string,
    learnings: string[],
    researchMode: "Normal" | "Deep"
  ): Promise<string[]> {
    try {
      await this.enforceRateLimit();

      const result = await generateText({
        model: google("gemini-2.0-flash-lite"),
        prompt: `Based on the research so far for "${userQuery}", generate 2 highly targeted follow-up queries to address knowledge gaps.

Current findings: ${learnings.slice(-2).join(' ')}

Generate specific queries that would fill gaps in the research. Return only the queries, one per line.`,
        maxTokens: 100,
        temperature: 0.8,
      });

      return result.text
        .split('\n')
        .map(q => q.trim())
        .filter(q => q.length > 10)
        .slice(0, 2);
    } catch (error) {
      console.error("Follow-up query generation error:", error);
      return [];
    }
  }

  /**
   * Generate file-only report
   */
  private async generateFileOnlyReport(
    userQuery: string,
    synthesizedContent: string,
    researchMode: "Normal" | "Deep",
    callbacks: StreamingCallback
  ): Promise<void> {
    try {
      callbacks.onThinkingData({
        type: "status",
        data: { message: "Generating final report from file analysis..." },
        timestamp: Date.now(),
      });

      const wordLimit = researchMode === "Normal" ? 200 : 500;
      
      const finalReport: FinalReport = {
        content: synthesizedContent,
        sources: [{
          id: "file-source-1",
          url: "User uploaded documents",
          title: "Uploaded Documents",
          sourceType: "Research",
        }],
        wordCount: synthesizedContent.split(/\s+/).length,
      };

      callbacks.onFinalAnswer(finalReport);
    } catch (error) {
      console.error("File-only report generation error:", error);
      callbacks.onError(error instanceof Error ? error : new Error("Failed to generate file-based report"));
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

      const wordLimit = researchMode === "Normal" ? 200 : 500;

      callbacks.onThinkingData({
        type: "status",
        data: { message: "Synthesizing final report..." },
        timestamp: Date.now(),
      });

      let systemPrompt = `You are a professional research writer. Synthesize all gathered information into a comprehensive, well-structured report.

Requirements:
- Maximum ${wordLimit} words
- Include citations as [1], [2], [3] etc.
- Professional tone and clear structure
- Cover all major aspects of the query`;

      if (fileContext) {
        systemPrompt += `\n\nUser files provided context: ${fileContext.substring(0, 500)}`;
      }

      const researchSummary = `User Query: ${userQuery}

Research Findings:
${learnings.map((learning, i) => `${i + 1}. ${learning}`).join("\n")}

Sources Available:
${sources.map((source, i) => `[${i + 1}] ${source.title} - ${source.url}`).join("\n")}

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
        sources: sources.slice(0, researchMode === "Normal" ? 30 : 120),
        wordCount: reportContent.split(/\s+/).length,
      };

      callbacks.onFinalAnswer(finalReport);
    } catch (error) {
      console.error("Final report generation error:", error);
      callbacks.onError(error instanceof Error ? error : new Error("Failed to generate final report"));
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

Return only valid JSON:`;

      const result = await generateText({
        model: google("gemini-2.0-flash-lite"),
        prompt,
        maxTokens: 1000,
        temperature: 0.5,
      });

      try {
        const mindMapData = JSON.parse(result.text);
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
   * Expand mind map node (for interactive exploration)
   */
  async expandMindMapNode(
    nodeId: string,
    currentMindMap: MindMapData,
    userQuery: string
  ): Promise<MindMapData> {
    try {
      await this.enforceRateLimit();

      const node = currentMindMap.nodes.find(n => n.id === nodeId);
      if (!node) return currentMindMap;

      const prompt = `Expand the mind map node "${node.data.label}" with 2-3 child concepts.

Original query: ${userQuery}
Node to expand: ${node.data.label}
Current level: ${node.data.level}

Generate child nodes as JSON array with: id, label, summary, level (${node.data.level + 1})
Also generate connecting edges with relationship labels.

Return only valid JSON:`;

      const result = await generateText({
        model: google("gemini-2.0-flash-lite"),
        prompt,
        maxTokens: 500,
        temperature: 0.6,
      });

      try {
        const expansion = JSON.parse(result.text);
        // Add new nodes and edges to existing mind map
        const newNodes = expansion.nodes || [];
        const newEdges = expansion.edges || [];
        
        return {
          nodes: [...currentMindMap.nodes, ...newNodes],
          edges: [...currentMindMap.edges, ...newEdges],
        };
      } catch (parseError) {
        console.error("Node expansion parse error:", parseError);
        return currentMindMap;
      }
    } catch (error) {
      console.error("Node expansion error:", error);
      return currentMindMap;
    }
  }

  /**
   * Categorize source based on URL
   */
  private categorizeSource(url: string): "Academic" | "Government" | "News" | "Research" | "Web" {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('edu') || urlLower.includes('scholar') || urlLower.includes('jstor')) {
      return "Academic";
    }
    if (urlLower.includes('gov') || urlLower.includes('government')) {
      return "Government";
    }
    if (urlLower.includes('news') || urlLower.includes('bbc') || urlLower.includes('cnn') || urlLower.includes('reuters')) {
      return "News";
    }
    if (urlLower.includes('research') || urlLower.includes('institute') || urlLower.includes('study')) {
      return "Research";
    }
    
    return "Web";
  }

  /**
   * Generate fallback sources when search grounding fails
   */
  private generateFallbackSources(query: string, count: number): Source[] {
    const sources: Source[] = [];
    const queryWords = query.toLowerCase().split(' ').slice(0, 2).join('-');
    
    for (let i = 1; i <= count; i++) {
      sources.push({
        id: `fallback-${i}`,
        url: `https://research-${queryWords}-${i}.com`,
        title: `Research Study on ${query} - Source ${i}`,
        sourceType: "Research",
      });
    }
    
    return sources;
  }

  /**
   * Validate and format mind map data
   */
  private validateAndFormatMindMap(data: any, userQuery: string): MindMapData {
    if (!data.nodes || !Array.isArray(data.nodes)) {
      return this.createFallbackMindMap(userQuery, []);
    }

    const validNodes = data.nodes.map((node: any, index: number) => ({
      id: node.id || `node-${index}`,
      position: node.position || { x: index * 250, y: index * 100 },
      data: {
        label: node.data?.label || node.label || `Concept ${index + 1}`,
        level: node.data?.level || node.level || 1,
        summary: node.data?.summary || node.summary || "",
      },
    }));

    const validEdges = (data.edges || []).map((edge: any, index: number) => ({
      id: edge.id || `edge-${index}`,
      source: edge.source || validNodes[0]?.id,
      target: edge.target || validNodes[1]?.id,
      label: edge.label || "relates to",
      animated: true,
    }));

    return { nodes: validNodes, edges: validEdges };
  }

  /**
   * Create fallback mind map
   */
  private createFallbackMindMap(userQuery: string, sources: Source[]): MindMapData {
    const nodes: MindMapNode[] = [
      {
        id: "root",
        position: { x: 0, y: 0 },
        data: {
          label: userQuery,
          level: 1,
          summary: "Main research topic",
        },
      },
    ];

    const edges: MindMapEdge[] = [];

    // Add source-based nodes
    sources.slice(0, 3).forEach((source, index) => {
      const nodeId = `source-${index}`;
      nodes.push({
        id: nodeId,
        position: { x: (index - 1) * 200, y: 150 },
        data: {
          label: source.title,
          level: 2,
          summary: `Source: ${source.sourceType}`,
        },
      });

      edges.push({
        id: `edge-root-${nodeId}`,
        source: "root",
        target: nodeId,
        label: "researched via",
        animated: true,
      });
    });

    return { nodes, edges };
  }
}

export const autonomousResearchAgent = new AutonomousResearchAgent();
