// AI Service - Integration with Autonomous Research Agent
import { autonomousResearchService } from "./autonomousResearchService";
import { realAiService } from "./realAiService";

// Main AI service interface
export const aiService = {
  // Autonomous research functionality
  conductResearch: autonomousResearchService.conductResearch.bind(autonomousResearchService),
  generateMindMap: autonomousResearchService.generateMindMap.bind(autonomousResearchService),
  expandMindMapNode: autonomousResearchService.expandMindMapNode.bind(autonomousResearchService),
  
  // Legacy methods from realAiService for backward compatibility
  processResearch: realAiService.processResearch?.bind(realAiService),
  processFollowUp: realAiService.processFollowUp?.bind(realAiService),
};
