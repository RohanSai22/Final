// AI Service - Integration with Autonomous Research Agent
import { autonomousResearchService } from "./autonomousResearchService";

// Main AI service interface
export const aiService = {
  // Autonomous research functionality
  conductResearch: autonomousResearchService.conductResearch.bind(
    autonomousResearchService
  ),
  generateMindMap: autonomousResearchService.generateMindMap.bind(
    autonomousResearchService
  ),
  expandMindMapNode: autonomousResearchService.expandMindMapNode.bind(
    autonomousResearchService
  ),

  // Legacy methods for backward compatibility (placeholder)
  processResearch: async () => ({ message: "Use conductResearch instead" }),
  processFollowUp: async () => ({ message: "Use conductResearch instead" }),
};
