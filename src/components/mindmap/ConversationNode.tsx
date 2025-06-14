// =====================================================================================
// CONVERSATION NODE COMPONENT - Individual Conversation Items
// Gradient design with smart timestamp formatting and interactive features
// =====================================================================================

import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';

interface ConversationNodeData {
  label: string;
  summary?: string;
  content?: string;
  relevanceScore?: number;
  metadata?: {
    timestamp?: string | Date;
    keywords?: string[];
    conversationIndex?: number;
    wordCount?: number;
    hasFiles?: boolean;
    hasThinking?: boolean;
    isAutonomous?: boolean;
  };
  color?: string;
  size?: number;
  interactive?: boolean;
}

const ConversationNode: React.FC<NodeProps<ConversationNodeData>> = ({ data, selected }) => {
  const { 
    label = 'Conversation', 
    summary = '', 
    content = '',
    relevanceScore = 0,
    metadata,
    color = 'hsl(280, 60%, 55%)',
    size = 100,
    interactive = true 
  } = data;

  const keywords = metadata?.keywords || [];
  const conversationIndex = metadata?.conversationIndex;
  const timestamp = metadata?.timestamp;
  const wordCount = metadata?.wordCount || 0;
  const hasFiles = metadata?.hasFiles || false;
  const hasThinking = metadata?.hasThinking || false;
  const isAutonomous = metadata?.isAutonomous || false;

  // Smart timestamp formatting
  const formatTimestamp = (timestamp: string | Date | undefined) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        return date.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
      } else if (diffInHours < 168) { // Within a week
        return date.toLocaleDateString('en-US', { 
          weekday: 'short',
          hour: 'numeric'
        });
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      }
    } catch {
      return '';
    }
  };

  // Extract HSL values for dynamic styling
  const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  const hue = hslMatch ? hslMatch[1] : '280';
  const saturation = hslMatch ? hslMatch[2] : '60';
  const lightness = hslMatch ? hslMatch[3] : '55';

  const backgroundColor = `hsl(${hue}, ${Math.max(10, parseInt(saturation) - 40)}%, ${Math.min(95, parseInt(lightness) + 40)}%)`;
  const borderColor = color;

  return (
    <div className="conversation-node relative">
      {/* Main conversation container with gradient */}
      <div 
        className={`
          rounded-lg shadow-md border p-3 max-w-[220px] min-w-[180px]
          transition-all duration-300
          ${interactive ? 'hover:shadow-lg hover:border-opacity-80' : ''}
          ${selected ? 'ring-2 ring-opacity-75' : ''}
        `}
        style={{ 
          backgroundColor,
          borderColor,
          ...(selected && { ringColor: borderColor })
        }}
      >
        <div className="text-center">
          {/* Header with conversation index and indicators */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <div className="text-sm">💬</div>
              {/* Feature indicators */}
              <div className="flex gap-1">
                {hasFiles && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full" title="Has files" />
                )}
                {hasThinking && (
                  <div className="w-2 h-2 bg-purple-500 rounded-full" title="Has AI thinking" />
                )}
                {isAutonomous && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" title="Autonomous mode" />
                )}
              </div>
            </div>
            
            {conversationIndex && (
              <span 
                className="text-xs px-1.5 py-0.5 rounded-full font-medium text-white"
                style={{ backgroundColor: borderColor }}
              >
                #{conversationIndex}
              </span>
            )}
          </div>
          
          {/* Truncated question preview */}
          <p className="text-xs text-gray-700 leading-relaxed font-medium mb-2 text-left">
            {label}
          </p>
          
          {/* Summary if available */}
          {summary && summary !== label && (
            <p className="text-xs text-gray-600 mb-2 text-left leading-tight">
              {summary.length > 60 ? summary.substring(0, 60) + '...' : summary}
            </p>
          )}
          
          {/* Metadata row */}
          <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
            {/* Timestamp */}
            {timestamp && (
              <span>{formatTimestamp(timestamp)}</span>
            )}
            
            {/* Relevance score */}
            {relevanceScore > 0 && (
              <div className="flex items-center gap-1">
                <div 
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ 
                    backgroundColor: relevanceScore > 75 ? '#10b981' : 
                                   relevanceScore > 50 ? '#f59e0b' : '#ef4444'
                  }}
                />
                <span>{Math.round(relevanceScore)}%</span>
              </div>
            )}
          </div>
          
          {/* Word count indicator */}
          {wordCount > 0 && (
            <div className="text-xs text-gray-400 mb-2">
              {wordCount} words
            </div>
          )}
          
          {/* Keyword tags with smart truncation */}
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center">
              {keywords.slice(0, 2).map((keyword, index) => (
                <span 
                  key={index} 
                  className="px-1.5 py-0.5 rounded text-xs text-white"
                  style={{ 
                    backgroundColor: `hsl(${hue}, ${saturation}%, ${Math.max(30, parseInt(lightness) - 20)}%)` 
                  }}
                >
                  {keyword}
                </span>
              ))}
              {keywords.length > 2 && (
                <span className="text-xs text-gray-400">
                  +{keywords.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Input handle */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-2 h-2 border-2 border-white rounded-full opacity-0 hover:opacity-100 transition-opacity" 
        style={{ 
          backgroundColor: borderColor,
          top: -4 
        }} 
      />
    </div>
  );
};

export default ConversationNode;
