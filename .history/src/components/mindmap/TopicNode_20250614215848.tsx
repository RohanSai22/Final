// =====================================================================================
// TOPIC NODE COMPONENT - Category Organizers
// Professional design with hover effects and dynamic keyword display
// =====================================================================================

import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';

interface TopicNodeData {
  label: string;
  summary?: string;
  content?: string;
  centralityScore?: number;
  metadata?: {
    totalConversations: number;
    avgRelevanceScore: number;
    keywords: string[];
  };
  color?: string;
  size?: number;
  interactive?: boolean;
}

const TopicNode: React.FC<NodeProps<TopicNodeData>> = ({ data, selected }) => {
  const { 
    label = 'Topic', 
    summary = '', 
    metadata,
    color = 'hsl(250, 70%, 60%)',
    size = 120,
    interactive = true 
  } = data;

  const conversationCount = metadata?.totalConversations || 0;
  const keywords = metadata?.keywords || [];
  const relevanceScore = metadata?.avgRelevanceScore || 0;

  // Extract HSL values for dynamic styling
  const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  const hue = hslMatch ? hslMatch[1] : '250';
  const saturation = hslMatch ? hslMatch[2] : '70';
  const lightness = hslMatch ? hslMatch[3] : '60';

  return (
    <div className="topic-node relative">
      {/* Main topic container with dynamic theming */}
      <div 
        className={`
          bg-white rounded-lg shadow-lg border-2 p-4 min-w-[200px] max-w-[250px]
          transition-all duration-300
          ${interactive ? 'hover:shadow-xl hover:scale-[1.02]' : ''}
          ${selected ? 'ring-4 ring-opacity-75' : ''}
        `}
        style={{ 
          borderColor: color,
          ...(selected && { 
            ringColor: `hsl(${hue}, ${saturation}%, ${Math.max(40, parseInt(lightness) - 20)}%)` 
          })
        }}
      >
        <div className="text-center">
          {/* Topic icon with dynamic coloring */}
          <div 
            className="text-2xl mb-2"
            style={{ color }}
          >
            📁
          </div>
          
          {/* Topic title */}
          <h3 className="font-semibold text-gray-800 text-sm mb-2 leading-tight">
            {label}
          </h3>
          
          {/* Metrics row */}
          <div className="flex items-center justify-center gap-2 mb-3">
            {/* Conversation count badge */}
            <span 
              className="px-2 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: color }}
            >
              {conversationCount} conversation{conversationCount !== 1 ? 's' : ''}
            </span>
            
            {/* Relevance score indicator */}
            {relevanceScore > 0 && (
              <div className="flex items-center gap-1">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ 
                    backgroundColor: relevanceScore > 75 ? '#10b981' : 
                                   relevanceScore > 50 ? '#f59e0b' : '#ef4444'
                  }}
                />
                <span className="text-xs text-gray-500">
                  {Math.round(relevanceScore)}%
                </span>
              </div>
            )}
          </div>
          
          {/* Summary text */}
          {summary && (
            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              {summary}
            </p>
          )}
          
          {/* Dynamic keyword display */}
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center">
              {keywords.slice(0, 3).map((keyword, index) => (
                <span 
                  key={index} 
                  className="px-2 py-1 rounded text-xs text-white"
                  style={{ 
                    backgroundColor: `hsl(${hue}, ${saturation}%, ${Math.max(30, parseInt(lightness) - 30)}%)` 
                  }}
                >
                  {keyword}
                </span>
              ))}
              {keywords.length > 3 && (
                <span className="text-xs text-gray-400 mt-1">
                  +{keywords.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Bidirectional connection handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 border-2 border-white rounded-full opacity-0 hover:opacity-100 transition-opacity" 
        style={{ 
          backgroundColor: color,
          top: -6 
        }} 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 border-2 border-white rounded-full opacity-0 hover:opacity-100 transition-opacity" 
        style={{ 
          backgroundColor: color,
          bottom: -6 
        }} 
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 border-2 border-white rounded-full opacity-0 hover:opacity-100 transition-opacity" 
        style={{ 
          backgroundColor: color,
          left: -6 
        }} 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 border-2 border-white rounded-full opacity-0 hover:opacity-100 transition-opacity" 
        style={{ 
          backgroundColor: color,
          right: -6 
        }} 
      />
    </div>
  );
};

export default TopicNode;
