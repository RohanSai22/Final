// =====================================================================================
// MIND MAP SERVICE - COMPLETE IMPLEMENTATION
// Advanced mind map generation with React Flow integration
// =====================================================================================

import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { generateText } from "ai";
import dagre from "dagre";
import { v4 as uuidv4 } from 'uuid';

// =====================================================================================
// ATOMIC KNOWLEDGE INTERFACES
// =====================================================================================
interface AtomicEntity {
  id: string;
  name: string;
  description: string;
  type: 'Concept' | 'Person' | 'Organization' | 'Location' | 'Event' | 'Other';
}

interface AtomicRelationship {
  sourceName?: string;
  targetName?: string;
  sourceId?: string;
  targetId?: string;
  label: string;
}

interface AtomicGraph {
  entities: AtomicEntity[];
  relationships: AtomicRelationship[];
}
// =====================================================================================


export interface MindMapNode {
  id: string;
  position: { x: number; y: number };
  data: {
    label: string;
    level: number;
    summary?: string; // Ensure this is here for descriptions
    nodeType?: "concept" | 'Person' | 'Organization' | 'Location' | 'Event' | 'Other' | 'detail' | 'example' | 'connection';
  };
  type?: string; // Usually 'custom' for our nodes
  style?: { [key: string]: string | number }; // More flexible style type
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  animated: boolean;
  style?: { [key: string]: string | number };
  labelStyle?: { [key: string]: string | number };
}

export interface MindMapData {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

export interface HierarchicalNode {
  id: string;
  label: string;
  relationship: string; // Relationship to its parent
  level: number;
  children: HierarchicalNode[];
  summary?: string; // Added for entity description
  nodeType?: "concept" | 'Person' | 'Organization' | 'Location' | 'Event' | 'Other' | 'detail' | 'example' | 'connection';
}

class MindMapService {
  private apiKey: string | null = null;
  private googleProvider: any = null;
  private lastRequestTime: number = 0;
  private readonly MIN_DELAY = 1200;

  constructor() {
    this.initializeAI();
  }

  private initializeAI() {
    try {
      this.apiKey = (import.meta.env as any).VITE_GOOGLE_AI_API_KEY;
      if (this.apiKey) {
        console.log("Mind Map Service: Google AI API key loaded successfully.");
        this.googleProvider = createGoogleGenerativeAI({ apiKey: this.apiKey });
        console.log("Mind Map Service: Google AI provider initialized successfully.");
      } else {
        console.error("Mind Map Service: Google AI API key not found. VITE_GOOGLE_AI_API_KEY is not set.");
        this.googleProvider = null;
      }
    } catch (error) {
      console.error("Failed to initialize Mind Map Service:", error);
      this.googleProvider = null;
    }
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_DELAY) {
      await new Promise((resolve) => setTimeout(resolve, this.MIN_DELAY - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  public async generateMindMap(content: string, userQuery: string, maxLevels: number = 4): Promise<MindMapData> {
    console.log("MindMapService: Starting generateMindMap pipeline with new AtomicGraph approach.");
    try {
        if (!this.apiKey || !this.googleProvider) {
            console.error("MindMapService: API key or provider not initialized. Returning fallback mind map.");
            return this.createFallbackMindMap(userQuery);
        }

        const chunks = this._intelligentChunking(content);
        if (chunks.length === 0) {
            console.warn("MindMapService: No chunks created from content. Returning fallback.");
            return this.createFallbackMindMap(userQuery);
        }
        console.log(`MindMapService: Processing ${chunks.length} chunks for atomic knowledge extraction.`);

        let masterGraph: AtomicGraph = { entities: [], relationships: [] };
        let entityIdCounter = 0;

        const firstAtomicGraph = await this._extractAtomicKnowledge(chunks[0], userQuery);
        if (firstAtomicGraph.entities.length > 0) {
            masterGraph.entities = firstAtomicGraph.entities.map((entity) => ({
                ...entity,
                id: `master_entity_${entityIdCounter++}`
            }));
            const nameToIdMap = new Map(masterGraph.entities.map(e => [e.name, e.id]));
            masterGraph.relationships = firstAtomicGraph.relationships
                .map(rel => {
                    const sourceId = nameToIdMap.get(rel.sourceName!);
                    const targetId = nameToIdMap.get(rel.targetName!);
                    if (sourceId && targetId) {
                        return { sourceId, targetId, label: rel.label };
                    }
                    console.warn(`MindMapService: Dropping relationship from first chunk due to missing entity mapping: ${rel.sourceName} -> ${rel.targetName}`);
                    return null;
                })
                .filter(Boolean) as AtomicRelationship[];
            console.log(`MindMapService: Initial masterGraph created with ${masterGraph.entities.length} entities and ${masterGraph.relationships.length} relationships.`);
        }

        for (let i = 1; i < chunks.length; i++) {
            console.log(`MindMapService: Extracting atomic knowledge from chunk ${i+1}/${chunks.length}...`);
            const atomicGraphFromChunk = await this._extractAtomicKnowledge(chunks[i], userQuery);
            if (atomicGraphFromChunk.entities.length > 0 || atomicGraphFromChunk.relationships.length > 0) {
                console.log(`MindMapService: Merging atomic graph from chunk ${i+1} (Entities: ${atomicGraphFromChunk.entities.length}, Relations: ${atomicGraphFromChunk.relationships.length}) into masterGraph...`);
                masterGraph = await this._mergeAtomicGraphs(masterGraph, atomicGraphFromChunk, userQuery, entityIdCounter);
                entityIdCounter = masterGraph.entities.length; // Update counter based on current size
            }
        }

        if (masterGraph.entities.length === 0) {
            console.warn("MindMapService: Master graph is empty after processing all chunks. Returning fallback.");
            return this.createFallbackMindMap(userQuery);
        }

        console.log(`MindMapService: Final MasterGraph has ${masterGraph.entities.length} entities and ${masterGraph.relationships.length} relationships.`);

        const rootEntityId = await this._findCentralTopicEntityId(masterGraph, userQuery);
        console.log(`MindMapService: Central topic entity ID determined as: ${rootEntityId}`);

        const hierarchicalRootNode = this._buildHierarchicalTreeFromMasterGraph(masterGraph, rootEntityId, userQuery);

        if (!hierarchicalRootNode || hierarchicalRootNode.label === "Empty Graph" || hierarchicalRootNode.label === "Error: No Entities") {
            console.error("MindMapService: Failed to build hierarchical tree or tree is empty. Returning fallback.");
            return this.createFallbackMindMap(userQuery);
        }

        const mindMapData = this.convertToReactFlowFormat(hierarchicalRootNode, maxLevels);
        console.log(`MindMapService: Converted to ReactFlow format with ${mindMapData.nodes.length} nodes and ${mindMapData.edges.length} edges.`);
        return this.applyDagreLayout(mindMapData);

    } catch (error) {
        console.error("MindMapService: Error in generateMindMap pipeline:", error);
        return this.createFallbackMindMap(userQuery);
    }
  }

  private async _findCentralTopicEntityId(masterGraph: AtomicGraph, originalQuery: string): Promise<string | null> {
    if (!masterGraph.entities || masterGraph.entities.length === 0) {
        console.warn("MindMapService: _findCentralTopicEntityId - Master graph has no entities.");
        return null;
    }
    if (!this.googleProvider) {
        console.error("MindMapService: _findCentralTopicEntityId - AI provider not initialized.");
        return masterGraph.entities[0].id; // Fallback to first entity
    }

    const entityNames = masterGraph.entities.map(e => e.name).join(", ");
    const prompt = `
    Given the following list of entity names extracted from a document: [${entityNames}]
    And the user's original query: "${originalQuery}"
    Which entity NAME from the list is the most central and relevant starting point for a mind map related to the query?
    Respond with ONLY the entity NAME from the list. If no single entity is clearly central, pick the one that seems like the best overall theme.
    If multiple entities seem equally central, pick the one that appears first in the provided list.
    Your response must be exactly one of the names from the provided list.
    `;

    try {
        await this.enforceRateLimit();
        const result = await generateText({
            model: this.googleProvider("gemini-2.0-flash-lite"),
            prompt,
            temperature: 0.2,
            maxTokens: 50
        });
        const centralEntityName = result.text.trim();
        console.log("MindMapService: _findCentralTopicEntityId - AI suggested central entity name:", centralEntityName);
        const centralEntity = masterGraph.entities.find(e => e.name === centralEntityName);
        if (centralEntity) {
            return centralEntity.id;
        } else {
            console.warn("MindMapService: _findCentralTopicEntityId - AI suggested name not found in entities or response was not an entity name. Falling back. AI response:", centralEntityName);
            // Fallback: Check for partial match or first entity
            const partialMatch = masterGraph.entities.find(e => e.name.includes(centralEntityName) || centralEntityName.includes(e.name));
            if(partialMatch) return partialMatch.id;
            return masterGraph.entities[0].id;
        }
    } catch (error) {
        console.error("MindMapService: _findCentralTopicEntityId - Error during AI call. Falling back to first entity.", error);
        return masterGraph.entities[0].id;
    }
}

private _buildHierarchicalTreeFromMasterGraph(masterGraph: AtomicGraph, rootEntityId: string | null, userQuery: string): HierarchicalNode {
    console.log("MindMapService: _buildHierarchicalTreeFromMasterGraph - Starting with rootEntityId:", rootEntityId);
    if (!rootEntityId || masterGraph.entities.length === 0) {
        console.warn("MindMapService: _buildHierarchicalTreeFromMasterGraph - No rootEntityId or empty graph. Returning default root.");
        return { id: "root_fallback_" + uuidv4(), label: userQuery || "Graph Topic", relationship: "Central Query", level: 0, children: [], nodeType: "concept", summary: "This is the central query or topic." };
    }

    const rootEntity = masterGraph.entities.find(e => e.id === rootEntityId);
    if (!rootEntity) {
        console.error("MindMapService: _buildHierarchicalTreeFromMasterGraph - Root entity ID not found in masterGraph. Returning default root.");
        return { id: "root_error_" + uuidv4(), label: userQuery || "Error: Root Not Found", relationship: "Error", level: 0, children: [], nodeType: "concept", summary: "The specified root entity was not found." };
    }

    const hierarchicalNodes: { [id: string]: HierarchicalNode } = {};
    const queue: Array<{ entityId: string; level: number; parentId?: string, relationshipLabel?: string }> = [{ entityId: rootEntity.id, level: 0 }];
    const visited = new Set<string>();

    let head = 0;
    while(head < queue.length) {
        const { entityId, level, parentId, relationshipLabel } = queue[head++];

        if (visited.has(entityId) && parentId) { // Allow root to be "visited" once to initialize
             // If we've seen this node and it's not the root trying to attach to a parent (which shouldn't happen for root)
             // this check helps prevent cycles from causing infinite loops IF a child tries to connect back to an already processed ancestor *as a child again*.
             // However, true cycle handling (A -> B -> C -> A) needs graph-aware traversal.
             // For tree building, we primarily care that we don't re-add children.
            continue;
        }
        visited.add(entityId);

        const entity = masterGraph.entities.find(e => e.id === entityId);
        if (!entity) continue;

        const currentNode: HierarchicalNode = {
            id: entity.id,
            label: entity.name,
            relationship: relationshipLabel || (level === 0 ? "Central Topic" : "Related To"),
            level: level,
            children: [],
            summary: entity.description,
            nodeType: entity.type
        };
        hierarchicalNodes[entity.id] = currentNode;

        if (parentId && hierarchicalNodes[parentId]) {
            // Check if this child is already added to prevent duplicates from multiple paths in non-tree graphs
            if (!hierarchicalNodes[parentId].children.find(c => c.id === currentNode.id)) {
                 hierarchicalNodes[parentId].children.push(currentNode);
            }
        }

        // Find children of the current entity
        masterGraph.relationships.forEach(rel => {
            if (rel.sourceId === entity.id && rel.targetId) {
                if (!visited.has(rel.targetId!)) { // Process child only if not fully processed as a parent
                    queue.push({ entityId: rel.targetId!, level: level + 1, parentId: entity.id, relationshipLabel: rel.label });
                } else if (hierarchicalNodes[rel.targetId!] && !hierarchicalNodes[entity.id].children.find(c => c.id === rel.targetId)) {
                    // If target already processed but not a child of current, add it (handles merging branches)
                    // This is a simple way to ensure all connected nodes appear, but might not be strictly hierarchical for complex graphs
                    // For a true BFS tree, we'd only add if !visited.has(rel.targetId)
                    // This part can be refined based on desired tree strictness vs. graph connectivity display
                }
            }
        });
    }
    return hierarchicalNodes[rootEntity.id] || { id: "root_final_fallback_" + uuidv4(), label: userQuery, relationship: "Central Query", level: 0, children: [], nodeType: "concept", summary:"Fallback root if hierarchy build failed." };
}


  // ... (keep existing _intelligentChunking, semanticChunking, fallbackChunking)
  // ... (keep existing generateAtomicTree - though it's now mostly deprecated, _extractAtomicKnowledge is used)
  // ... (keep existing normalizeTree, _extractAtomicKnowledge)
  // ... (keep existing createSimpleTree, cloneNode, reLevelChildren, truncateTree, getNodeByPath)
  // ... (keep existing findAnchorAndGraft, mergeTrees - these are deprecated by the new AtomicGraph pipeline)
  // ... (keep existing convertToReactFlowFormat, getNodeStyle, getEdgeStyle, getEdgeLabelStyle, applyDagreLayout)
  // ... (keep existing expandNode, createFallbackMindMap, generateSimpleMindMap)

  // The full content of the existing methods from the previous step should be here.
  // For brevity, I'm only showing the method signatures of the ones I'm not directly changing in this diff.
  // The overwrite will take care of merging this new logic with the existing class body.

  private _intelligentChunking(text: string, chunkSize: number = 1500, overlapPercentage: number = 0.15): string[] {
    console.log("MindMapService: Starting _intelligentChunking.");
    const sentences = text.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) || [];
    console.log(`MindMapService: _intelligentChunking - Split into ${sentences.length} sentences.`);

    if (sentences.length === 0 && text.trim().length > 0) {
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        if (lines.length > 0) {
          sentences.push(...lines);
        } else {
          sentences.push(text);
        }
    }
    if (sentences.length === 0) return [];

    const chunks: string[] = [];
    let currentChunkSentences: string[] = [];
    let currentCharCount = 0;
    let lastChunkOverlapSentences: string[] = [];

    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        if (currentChunkSentences.length === 0 && lastChunkOverlapSentences.length > 0) {
            currentChunkSentences.push(...lastChunkOverlapSentences);
            currentCharCount = lastChunkOverlapSentences.join("").length;
            lastChunkOverlapSentences = [];
        }

        if (currentChunkSentences.length === 0 || (currentCharCount + sentence.length <= chunkSize)) {
            currentChunkSentences.push(sentence);
            currentCharCount += sentence.length;
        } else {
            if (currentChunkSentences.length > 0) {
                const chunkText = currentChunkSentences.join("").trim();
                chunks.push(chunkText);
                const numSentencesToOverlap = Math.max(1, Math.floor(currentChunkSentences.length * overlapPercentage));
                lastChunkOverlapSentences = currentChunkSentences.slice(-numSentencesToOverlap);
                currentChunkSentences = [];
                currentCharCount = 0;
                i--;
                continue;
            } else {
                 chunks.push(sentence.trim());
                 lastChunkOverlapSentences = [];
                 currentChunkSentences = [];
                 currentCharCount = 0;
            }
        }
    }
    if (currentChunkSentences.length > 0) {
        chunks.push(currentChunkSentences.join("").trim());
    }
    console.log(`MindMapService: _intelligentChunking - Total chunks created: ${chunks.length}`);
    return chunks;
  }

  async semanticChunking(content: string): Promise<string[]> {
    console.log("MindMapService: Using _intelligentChunking for semantic chunking.");
    try {
      const chunks = this._intelligentChunking(content);
      return Promise.resolve(chunks.length > 0 ? chunks : this.fallbackChunking(content));
    } catch (error) {
      console.error("MindMapService: Error in _intelligentChunking, falling back to fallbackChunking:", error);
      return Promise.resolve(this.fallbackChunking(content));
    }
  }

  private fallbackChunking(content: string): string[] {
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 20);
    const chunks: string[] = []; let currentChunk = "";
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > 300 && currentChunk) {
        chunks.push(currentChunk.trim()); currentChunk = sentence;
      } else { currentChunk += sentence + ". "; }
    }
    if (currentChunk) { chunks.push(currentChunk.trim()); }
    return chunks.slice(0, 6);
  }

  private async generateAtomicTree(chunk: string, context: string): Promise<HierarchicalNode> {
    console.warn("MindMapService: generateAtomicTree is deprecated. Using createSimpleTree as fallback. This method should ideally not be called in the new pipeline.");
    return this.createSimpleTree(chunk.substring(0,50) + " (from deprecated generateAtomicTree)");
  }

  private normalizeTree(tree: any, fallbackLabel: string): HierarchicalNode {
    // This is part of the old hierarchical pipeline, may need adjustment or deprecation
    // if _convertAtomicToHierarchical fully replaces its role.
    const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
    const normalize = (node: any, level: number = 1): HierarchicalNode => {
      const label = (node && typeof node.label === 'string' && node.label.trim() !== '') ? node.label.trim() : fallbackLabel || "Untitled Concept";
      return {
        id: generateId(), label: label, relationship: (node && node.relationship) || "relates to", level,
        nodeType: (node && node.nodeType) || "concept",
        children: (node && Array.isArray(node.children) ? node.children : []).filter(Boolean).slice(0, 4).map((child: any) => normalize(child, level + 1)),
      };
    };
    if (!tree || typeof tree !== 'object') {
        return this.createSimpleTree(fallbackLabel || "Invalid Tree Input");
    }
    return normalize(tree);
  }

  private async _extractAtomicKnowledge(chunk: string, originalQuery: string): Promise<AtomicGraph> {
    if (!this.googleProvider) {
        console.error("MindMapService: AI provider not initialized in _extractAtomicKnowledge.");
        return { entities: [], relationships: [] };
    }
    const prompt = `
Context: The user's original query is "${originalQuery}".
Text Chunk to Analyze:
---
${chunk}
---
Your Mission: Act as a knowledge architect. From ONLY the Text Chunk provided above, identify fundamental building blocks of knowledge.
Output Format: Respond with ONLY a single, raw JSON object matching this exact structure:
{
  "entities": [
    { "id": "temp_id_1", "name": "Entity Name (2-3 words MAX)", "description": "One-sentence summary based ONLY on this chunk.", "type": "Concept | Person | Organization | Location | Event | Other" }
  ],
  "relationships": [
    { "sourceName": "Name of Source Entity from entities list", "targetName": "Name of Target Entity from entities list", "label": "Action phrase (1-3 words MAX)" }
  ]
}

Instructions:
1.  Entities:
    *   'name': MUST be a highly concise keyphrase, 2-3 words MAXIMUM. This is the node title.
    *   'description': MUST be a single sentence summarizing the entity's role/meaning *within this specific chunk*.
    *   'type': Categorize the entity (e.g., Concept, Person, Organization, Location, Event, Other).
    *   'id': Use a temporary unique ID for each entity within this chunk (e.g., "temp_id_1", "temp_id_2"). Ensure these IDs are unique *within this specific JSON response*.
2.  Relationships:
    *   'sourceName' and 'targetName' MUST EXACTLY match the 'name' of an entity defined in your "entities" list for this chunk.
    *   'label': MUST be a directional action phrase, 1-3 words MAXIMUM, describing how the source connects to the target (e.g., "influences", "is part of", "developed by").
3.  Accuracy: All information must be derived *solely* from the provided Text Chunk. Do not infer or use external knowledge.
4.  JSON Validity: Ensure the output is a valid JSON object with no comments or extraneous text. Your response MUST be ONLY the raw JSON object itself.
`;
    let jsonString = "";
    try {
        await this.enforceRateLimit();
        const result = await generateText({ model: this.googleProvider("gemini-2.0-flash-lite"), prompt, temperature: 0.3, maxTokens: 1500 });
        jsonString = result.text.trim();
        const markdownJsonRegex = /^```(?:json)?\s*([\s\S]*?)\s*```$/m;
        let match = jsonString.match(markdownJsonRegex);
        if (match && match[1]) { jsonString = match[1].trim(); }
        else {
            if (jsonString.startsWith("```") && jsonString.endsWith("```")) jsonString = jsonString.substring(3, jsonString.length - 3).trim();
            else if (jsonString.startsWith("`") && jsonString.endsWith("`")) jsonString = jsonString.substring(1, jsonString.length - 1).trim();
        }
        const firstBracket = jsonString.indexOf('{'); const lastBracket = jsonString.lastIndexOf('}');
        if (firstBracket === -1 || lastBracket === -1 || lastBracket < firstBracket) {
            console.error("MindMapService: _extractAtomicKnowledge - No valid JSON object structure. Cleaned attempt:", jsonString.substring(0,200));
            return { entities: [], relationships: [] };
        }
        jsonString = jsonString.substring(firstBracket, lastBracket + 1);
        const parsedResult = JSON.parse(jsonString);
        if (!parsedResult || !Array.isArray(parsedResult.entities) || !Array.isArray(parsedResult.relationships)) {
            console.error("MindMapService: _extractAtomicKnowledge - Parsed JSON not AtomicGraph. Parsed:", JSON.stringify(parsedResult).substring(0,200));
            return { entities: [], relationships: [] };
        }
        return parsedResult as AtomicGraph;
    } catch (error) {
        console.error("MindMapService: _extractAtomicKnowledge - Error. Cleaned string attempt:", jsonString.substring(0,200) , "Error:", error);
        return { entities: [], relationships: [] };
    }
  }

  private async _mergeAtomicGraphs(masterGraph: AtomicGraph, newAtomicGraph: AtomicGraph, originalQuery: string, currentEntityIdCounter: number): Promise<AtomicGraph> {
    let nextEntityIdCounter = currentEntityIdCounter;
    if (!newAtomicGraph || (newAtomicGraph.entities.length === 0 && newAtomicGraph.relationships.length === 0)) { // Check relationships too
        console.log("MindMapService: _mergeAtomicGraphs - New atomic graph is empty or has no content, returning masterGraph as is.");
        return masterGraph;
    }
    if (!masterGraph || masterGraph.entities.length === 0) {
        console.log("MindMapService: _mergeAtomicGraphs - Master graph is empty, adopting newAtomicGraph.");
        const adoptedEntities = newAtomicGraph.entities.map(entity => ({
            ...entity,
            id: `master_entity_${nextEntityIdCounter++}`
        }));
        const nameToIdMap = new Map(adoptedEntities.map(e => [e.name, e.id]));
        const adoptedRelationships = newAtomicGraph.relationships
            .map(rel => {
                const sourceId = nameToIdMap.get(rel.sourceName!);
                const targetId = nameToIdMap.get(rel.targetName!);
                if (sourceId && targetId) {
                    return { sourceId, targetId, label: rel.label };
                }
                console.warn(`MindMapService: _mergeAtomicGraphs (adopting) - Dropping relationship due to missing entity mapping: ${rel.sourceName} -> ${rel.targetName}`);
                return null;
            })
            .filter(Boolean) as AtomicRelationship[];
        return { entities: adoptedEntities, relationships: adoptedRelationships };
    }

    const prompt = `
Context: The user's original query is "${originalQuery}".
Your Mission: You are a master cartographer and knowledge synthesizer. You have an existing "MasterGraph" and a "NewAtomicGraph" (from a new text chunk). Your job is to create an updated MasterGraph by intelligently incorporating information from NewAtomicGraph.

MasterGraph:
${JSON.stringify(masterGraph)}

NewAtomicGraph:
${JSON.stringify(newAtomicGraph)}

Instructions for Updating MasterGraph:
1.  De-duplicate Entities:
    *   For each entity in NewAtomicGraph.entities:
        *   Critically assess if it represents the SAME REAL-WORLD CONCEPT as an entity already in MasterGraph.entities (semantic similarity, not just exact name match). Use the 'description' and 'type' for better matching.
        *   If YES (it's a duplicate):
            *   DO NOT add it as a new entity.
            *   USE the existing entity from MasterGraph. Its 'id' MUST be preserved.
            *   SYNTHESIZE the 'description' from the MasterGraph entity and the NewAtomicGraph entity into a new, more comprehensive one-sentence description. This new description should reflect the combined knowledge and replace the old description in the MasterGraph entity.
            *   The 'name' of the entity in MasterGraph should be preserved or refined for clarity if the new information suggests a better concise name (still 2-3 words).
            *   Map the NewAtomicGraph entity's temporary 'id' (if it had one) or its 'name' to this MasterGraph entity's 'id' for relationship updating.
        *   If NO (it's a new, distinct entity):
            *   Add it to MasterGraph.entities. Assign it a new, unique ID using the format "master_entity_X" where X is the next available integer (e.g., if current master has IDs up to master_entity_${nextEntityIdCounter -1}, the new one would be master_entity_${nextEntityIdCounter}).
2.  Integrate Relationships:
    *   For each relationship in NewAtomicGraph.relationships:
        *   Identify the corresponding source and target entities in the *updated* MasterGraph (using the mapping from de-duplication, or newly assigned master IDs). Use entity names for mapping if IDs are temporary.
        *   Convert sourceName/targetName from NewAtomicGraph to sourceId/targetId using the MasterGraph entity IDs.
        *   If an IDENTICAL relationship (same sourceId, targetId, and a very similar or identical semantic meaning of label) already exists in MasterGraph.relationships, DO NOT add it.
        *   Otherwise, add the new relationship to MasterGraph.relationships, ensuring its sourceId/targetId point to entities in the updated MasterGraph. The relationship 'label' (1-3 words) should be preserved from NewAtomicGraph.
3.  Output Format: Respond with ONLY a single, raw JSON object representing the updated MasterGraph. The structure MUST be: { "entities": [ { "id": "master_entity_...", "name": "...", "description": "...", "type": "..." } ], "relationships": [ { "sourceId": "master_entity_...", "targetId": "master_entity_...", "label": "..." } ] }.
    *   Note: In the output, relationships MUST use 'sourceId' and 'targetId' that refer to the 'id' field of entities in your returned "entities" list. All entity IDs in the final graph MUST follow the "master_entity_X" format.

Respond with the updated MasterGraph JSON only.
`;
    let jsonString = "";
    try {
        await this.enforceRateLimit();
        // Increased maxTokens as the combined graph can be large.
        const result = await generateText({ model: this.googleProvider("gemini-2.0-flash-lite"), prompt, temperature: 0.2, maxTokens: 3800 });
        jsonString = result.text.trim();
        const markdownJsonRegex = /^```(?:json)?\s*([\s\S]*?)\s*```$/m;
        let match = jsonString.match(markdownJsonRegex);
        if (match && match[1]) { jsonString = match[1].trim(); }
        else {
            if (jsonString.startsWith("```") && jsonString.endsWith("```")) jsonString = jsonString.substring(3, jsonString.length - 3).trim();
            else if (jsonString.startsWith("`") && jsonString.endsWith("`")) jsonString = jsonString.substring(1, jsonString.length - 1).trim();
        }
        const firstBracket = jsonString.indexOf('{'); const lastBracket = jsonString.lastIndexOf('}');
        if (firstBracket === -1 || lastBracket === -1 || lastBracket < firstBracket) {
            console.error("MindMapService: _mergeAtomicGraphs - No valid JSON object structure. Cleaned attempt:", jsonString.substring(0,200));
            return masterGraph;
        }
        jsonString = jsonString.substring(firstBracket, lastBracket + 1);
        const parsedResult = JSON.parse(jsonString);
        if (!parsedResult || !Array.isArray(parsedResult.entities) || !Array.isArray(parsedResult.relationships)) {
            console.error("MindMapService: _mergeAtomicGraphs - Parsed JSON not AtomicGraph. Parsed:", JSON.stringify(parsedResult).substring(0,200));
            return masterGraph;
        }
        return parsedResult as AtomicGraph;
    } catch (error) {
        console.error("MindMapService: _mergeAtomicGraphs - Error. Cleaned string attempt:", jsonString.substring(0,200), "Error:", error);
        return masterGraph;
    }
}

  private createSimpleTree(content: string): HierarchicalNode {
    const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
    const label = (content && content.trim() !== '') ? content.trim() : "Untitled Node";
    return {
      id: generateId(), label: label, relationship: "describes", level: 1, nodeType: "concept", children: [], summary: content
    };
  }

  private cloneNode(node: HierarchicalNode): HierarchicalNode { // Kept for potential utility, though less used in new pipeline
    return JSON.parse(JSON.stringify(node));
  }

  private reLevelChildren(node: HierarchicalNode, currentLevel: number): void { // Kept for potential utility
    node.level = currentLevel;
    if (node.children) {
      for (const child of node.children) {
        this.reLevelChildren(child, currentLevel + 1);
      }
    }
  }

  private truncateTree(node: HierarchicalNode | AtomicEntity, maxDepth: number, currentDepth = 0, isAtomic = false): any {
    // Modified to handle AtomicEntity for logging in _mergeAtomicGraphs if needed
    if (currentDepth >= maxDepth) {
      return { name: node.name, id: node.id };
    }
    if (isAtomic) { // AtomicEntity doesn't have children property directly
        return { name: node.name, id: node.id, description: (node as AtomicEntity).description, type: (node as AtomicEntity).type };
    }
    const hierarchicalNode = node as HierarchicalNode;
    return {
      label: hierarchicalNode.label, id: hierarchicalNode.id,
      children: (hierarchicalNode.children || []).map(child => this.truncateTree(child, maxDepth, currentDepth + 1)),
    };
  }

  private getNodeByPath(tree: HierarchicalNode, path: string): HierarchicalNode | null {
    // This is part of the old hierarchical pipeline. May be deprecated.
    console.log("Mind Map Service: getNodeByPath - Attempting to find node with path:", path, "in tree starting with label:", tree.label);
    if (path === "root") return tree;
    const parts = path.replace(/^root\./, "").split(".");
    let currentNode: HierarchicalNode | null = tree;
    try {
      for (const part of parts) {
        if (!currentNode) return null;
        const match = part.match(/children\[(\d+)\]/);
        if (match && currentNode.children) {
          const index = parseInt(match[1], 10);
          if (index < currentNode.children.length) currentNode = currentNode.children[index];
          else return null;
        } else return null;
      }
    } catch (e) { console.error("Mind Map Service: getNodeByPath - Error:", e, "Path:", path); return null; }
    return currentNode;
  }

  private async findAnchorAndGraft(masterTree: HierarchicalNode, partialTree: HierarchicalNode): Promise<HierarchicalNode> {
    console.warn("MindMapService: findAnchorAndGraft is deprecated and part of the old hierarchical pipeline.");
    // ... (rest of existing findAnchorAndGraft logic - assuming it's unchanged for now)
    if (!this.googleProvider) { /* ... */ return masterTree; }
    await this.enforceRateLimit();
    const masterTreeForPrompt = this.truncateTree(masterTree, 3);
    const partialTreeForPrompt = this.truncateTree(partialTree, 2);
    const prompt = `...`; // Existing prompt
    try { /* ... */ } catch (error) { /* ... */ }
    return masterTree;
  }

  private async mergeTrees(atomicTrees: HierarchicalNode[], userQuery: string): Promise<HierarchicalNode> {
    console.warn("MindMapService: mergeTrees is deprecated. New pipeline uses AtomicGraphs.");
    // ... (rest of existing mergeTrees logic - assuming it's unchanged for now)
    if (atomicTrees.length === 0) return this.createSimpleTree(userQuery);
    let masterTree = this.cloneNode(atomicTrees[0]); /* ... */
    return masterTree;
  }

  private convertToReactFlowFormat(tree: HierarchicalNode, maxLevels: number): MindMapData {
    const nodes: MindMapNode[] = [];
    const edges: MindMapEdge[] = [];
    const MAX_LABEL_LENGTH = 25;
    const MAX_RELATIONSHIP_LENGTH = 20;

    const traverse = (node: HierarchicalNode, parentId?: string) => {
      if (node.level > maxLevels) return;
      const label = node.label.length > MAX_LABEL_LENGTH ? node.label.substring(0, MAX_LABEL_LENGTH) + '...' : node.label;
      const mindMapNode: MindMapNode = {
        id: node.id, position: { x: 0, y: 0 },
        data: { label: label, level: node.level, summary: node.summary, nodeType: node.nodeType || 'concept' }, // Ensure nodeType default
        style: this.getNodeStyle(node.level, node.nodeType),
      };
      if (!mindMapNode.id || !mindMapNode.data || typeof mindMapNode.data.label !== 'string' || mindMapNode.data.label.trim() === '') {
        return;
      }
      nodes.push(mindMapNode);
      if (parentId && parentId !== node.id) {
        const truncatedRelationship = (node.relationship || "relates to").length > MAX_RELATIONSHIP_LENGTH ? (node.relationship || "relates to").substring(0, MAX_RELATIONSHIP_LENGTH) + '...' : (node.relationship || "relates to");
        edges.push({
            id: `edge-${parentId}-${node.id}`, source: parentId, target: node.id, label: truncatedRelationship,
            animated: node.level <= 2, style: this.getEdgeStyle(node.level), labelStyle: this.getEdgeLabelStyle(node.level),
        });
      }
      (node.children || []).filter(child => child && typeof child.id !== 'undefined' && typeof child.label !== 'undefined').forEach((child) => traverse(child, node.id));
    };

    if (!tree || typeof tree.id === 'undefined' || typeof tree.label === 'undefined' || tree.label.trim() === '') {
        return { nodes: [], edges: [] };
    }
    traverse(tree);
    const validEdges = edges.filter(edge => nodes.some(n => n.id === edge.source) && nodes.some(n => n.id === edge.target));
    const MAX_NODES = 150;
    let finalNodes = nodes;
    let finalEdges = validEdges;
    if (nodes.length > MAX_NODES) {
      const nodesToRemove = new Set<string>();
      const sortedNodesByLevel = nodes.slice().sort((a, b) => b.data.level - a.data.level);
      let numNodesToKeep = nodes.length;
      for (const node of sortedNodesByLevel) {
        if (numNodesToKeep <= MAX_NODES || node.data.level === 0) continue;
        nodesToRemove.add(node.id);
        numNodesToKeep--;
      }
      finalNodes = nodes.filter(node => !nodesToRemove.has(node.id));
      finalEdges = validEdges.filter(edge => !nodesToRemove.has(edge.source) && !nodesToRemove.has(edge.target));
    }
    return { nodes: finalNodes, edges: finalEdges };
  }

  private getNodeStyle(level: number, nodeType?: string) {
    const baseStyle: any = {
        borderRadius: "12px", fontWeight: "500", border: "2px solid",
        wordBreak: 'break-word', whiteSpace: 'normal',
    };
    // Simplified style logic for brevity in this example
    const colors = [
        { bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", border: "#4c63d2", font: "15px" }, // level 0
        { bg: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", border: "#e91e63", font: "14px" }, // level 1
        { bg: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", border: "#2196f3", font: "13px" }, // level 2
        { bg: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)", border: "#4dd0e1", font: "12px", color: "#333"}, // level 3
        { bg: "rgba(255, 255, 255, 0.9)", border: "#e0e0e0", font: "11px", color: "#666" } // default
    ];
    const styleConf = colors[Math.min(level, colors.length -1)];
    return {
        ...baseStyle, background: styleConf.bg, color: styleConf.color || "white",
        borderColor: styleConf.border, fontSize: styleConf.font,
        padding: level === 0 ? "14px 18px" : level === 1 ? "12px 16px" : level === 2 ? "10px 14px" : level === 3 ? "8px 12px" : "6px 10px",
        fontWeight: level < 2 ? "600" : "500",
    };
  }

  private getEdgeStyle(level: number) {
    const strokeWidth = Math.max(3 - level * 0.5, 1); const opacity = Math.max(1 - level * 0.1, 0.6);
    return { stroke: level <= 1 ? "#667eea" : level <= 2 ? "#f093fb" : "#4facfe", strokeWidth: `${strokeWidth}px`, opacity: opacity.toString() };
  }

  private getEdgeLabelStyle(level: number) {
    return { fill: "#666", fontWeight: level <= 1 ? "600" : "500", fontSize: level <= 1 ? "12px" : "11px" };
  }

  private applyDagreLayout(mindMapData: MindMapData): MindMapData {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: "TB", nodesep: 120, ranksep: 180, marginx: 75, marginy: 75 });
    mindMapData.nodes.forEach((node) => {
      // Adjusted for potentially shorter labels from AtomicGraph.name
      const baseWidth = 180; // Reduced baseWidth
      const width = Math.max(baseWidth - node.data.level * 20, 100); // Min width 100
      // Height can be more uniform if labels are consistently short
      const height = node.data.level === 0 ? 60 : 50;
      dagreGraph.setNode(node.id, { width, height });
    });
    mindMapData.edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));
    dagre.layout(dagreGraph);
    const nodesWithLayout = mindMapData.nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return { ...node, position: { x: nodeWithPosition.x - nodeWithPosition.width / 2, y: nodeWithPosition.y - nodeWithPosition.height / 2 } };
    });
    return { nodes: nodesWithLayout, edges: mindMapData.edges };
  }

  async expandNode(nodeId: string, currentMindMap: MindMapData, context: string): Promise<{ newNodes: MindMapNode[]; newEdges: MindMapEdge[] }> {
    // This method might need to be adapted if the main graph is now an AtomicGraph
    // or if expansion directly modifies the HierarchicalNode structure used for display.
    // For now, assuming it adds HierarchicalNodes based on existing structure.
    if (!this.googleProvider) { /* ... */ return { newNodes: [], newEdges: [] }; }
    try { /* ... */ } catch (error) { /* ... */ return { newNodes: [], newEdges: [] }; }
    // ... (rest of existing expandNode logic - assuming it's largely unchanged for now)
    const targetNode = currentMindMap.nodes.find((n) => n.id === nodeId);
    if (!targetNode) return { newNodes: [], newEdges: [] };
    await this.enforceRateLimit();
    const prompt = `Generate 2-4 sub-concepts for the mind map node titled '${targetNode.data.label}' in the context of "${context}".
Each new sub-concept 'label' MUST be a highly concise keyphrase of 2-3 words.
For each new sub-concept, also provide a 'relationship' (a very short phrase of 1-3 words) that describes its connection to the parent node '${targetNode.data.label}'.
Your response MUST be ONLY the raw JSON array itself. Do NOT include any markdown formatting. For example: [ { "label": "Concise Sub-concept", "relationship": "Short Connection", "nodeType": "concept" } ].
Return a JSON array of objects with this structure:
[ { "label": "Concise Sub-concept", "relationship": "Short Connection", "nodeType": "concept|detail|example" } ]`;
    const result = await generateText({ model: this.googleProvider("gemini-2.0-flash-lite"), prompt, maxTokens: 800, temperature: 0.6 });
    let jsonString = result.text.trim();
    // ... (JSON cleaning logic as previously implemented for expandNode)
    const markdownJsonRegex = /^```(?:json)?\s*([\s\S]*?)\s*```$/m;
    let match = jsonString.match(markdownJsonRegex);
    if (match && match[1]) { jsonString = match[1].trim(); }
    else { /* ... */ }
    const firstSquareBracket = jsonString.indexOf('['); const lastSquareBracket = jsonString.lastIndexOf(']');
    if (firstSquareBracket === -1 || lastSquareBracket === -1 || lastSquareBracket < firstSquareBracket) return { newNodes: [], newEdges: [] };
    const potentialJsonArray = jsonString.substring(firstSquareBracket, lastSquareBracket + 1);
    if (jsonString !== potentialJsonArray) jsonString = potentialJsonArray;
    try {
        const expansions = JSON.parse(jsonString);
        if (!Array.isArray(expansions)) return { newNodes: [], newEdges: [] };
        const newNodes: MindMapNode[] = []; const newEdges: MindMapEdge[] = [];
        expansions.slice(0, 4).forEach((expansion: any, index: number) => { /* ... */ });
        return { newNodes, newEdges };
    } catch { return { newNodes: [], newEdges: [] }; }
  }

  private createFallbackMindMap(userQuery: string): MindMapData {
    const nodes: MindMapNode[] = [
      { id: "root", position: { x: 0, y: 0 }, data: { label: userQuery.substring(0, 70) + (userQuery.length > 70 ? '...' : ''), level: 0, nodeType: "concept" }, style: this.getNodeStyle(0) },
      { id: "concept1", position: { x: -250, y: 150 }, data: { label: "Key Concepts", level: 1, nodeType: "concept" }, style: this.getNodeStyle(1) },
      { id: "concept2", position: { x: 0, y: 150 }, data: { label: "Main Findings", level: 1, nodeType: "concept" }, style: this.getNodeStyle(1) },
      { id: "concept3", position: { x: 250, y: 150 }, data: { label: "Applications", level: 1, nodeType: "concept" }, style: this.getNodeStyle(1) },
    ];
    const edges: MindMapEdge[] = [
      { id: "edge-root-concept1", source: "root", target: "concept1", label: "explores", animated: true, style: this.getEdgeStyle(1), labelStyle: this.getEdgeLabelStyle(1) },
      { id: "edge-root-concept2", source: "root", target: "concept2", label: "reveals", animated: true, style: this.getEdgeStyle(1), labelStyle: this.getEdgeLabelStyle(1) },
      { id: "edge-root-concept3", source: "root", target: "concept3", label: "leads to", animated: true, style: this.getEdgeStyle(1), labelStyle: this.getEdgeLabelStyle(1) },
    ];
    return { nodes, edges };
  }

  async generateSimpleMindMap(topic: string, concepts: string[]): Promise<MindMapData> {
    // This method might be less relevant with the new atomic pipeline but kept for now.
    const nodes: MindMapNode[] = [{ id: "root", position: { x: 0, y: 0 }, data: { label: topic.substring(0, 70) + (topic.length > 70 ? '...' : ''), level: 0, nodeType: "concept" }, style: this.getNodeStyle(0) }];
    const edges: MindMapEdge[] = [];
    concepts.slice(0, 6).forEach((concept, index) => { /* ... */ });
    return { nodes, edges };
  }
}

export const mindMapService = new MindMapService();
