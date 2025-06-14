// =====================================================================================
// CENTRAL NODE COMPONENT - The Brain Hub
// Advanced visual design with pulsing animation and multi-directional connections
// =====================================================================================

import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';

interface CentralNodeData {
  label: string;
  summary?: string;
  content?: string;
  metadata?: {
    totalTopics: number;
    totalConversations: number;
    createdAt: Date;
    lastGenerated: Date;
  };
  size?: number;
  interactive?: boolean;
}

const CentralNode: React.FC<NodeProps<CentralNodeData>> = ({ data, selected }) => {
  const { 
    label = 'Second Brain', 
    summary = '', 
    metadata,
    size = 140,
    interactive = true 
  } = data;

  const totalConversations = metadata?.totalConversations || 0;
  const totalTopics = metadata?.totalTopics || 0;

  return (
    <div className="central-node relative">      {/* Main brain container with gradient and pulsing animation */}
      <div 
        className={`
          rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 
          shadow-2xl flex items-center justify-center border-4 border-white
          transition-all duration-300 animate-pulse
          ${interactive ? 'hover:scale-110 hover:shadow-3xl' : ''}
          ${selected ? 'ring-4 ring-purple-300 ring-opacity-75' : ''}
        `}
        style={{ 
          width: size, 
          height: size,
          boxShadow: '0 0 20px rgba(147, 51, 234, 0.3), 0 0 40px rgba(59, 130, 246, 0.2)'
        }}
      >
        <div className="text-center text-white">
          {/* Brain emoji with count */}
          <div className="text-3xl mb-1">🧠</div>
          <div className="text-sm font-bold">
            {totalConversations > 0 ? totalConversations : '∞'}
          </div>
          {totalTopics > 0 && (
            <div className="text-xs opacity-90">
              {totalTopics} topics
            </div>
          )}
        </div>
      </div>
      
      {/* Floating label with enhanced styling */}
      <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg border border-gray-200 min-w-max">
        <div className="text-center">
          <span className="text-sm font-semibold text-gray-700">{label}</span>
          {summary && (
            <div className="text-xs text-gray-500 mt-1 max-w-48 truncate">
              {summary}
            </div>
          )}
        </div>
      </div>
      
      {/* Multi-directional connection handles */}
      <Handle 
        type="source" 
        position={Position.Top} 
        className="w-3 h-3 bg-purple-400 border-2 border-white rounded-full opacity-0 hover:opacity-100 transition-opacity" 
        style={{ top: -6 }} 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-purple-400 border-2 border-white rounded-full opacity-0 hover:opacity-100 transition-opacity" 
        style={{ right: -6 }} 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 bg-purple-400 border-2 border-white rounded-full opacity-0 hover:opacity-100 transition-opacity" 
        style={{ bottom: -6 }} 
      />
      <Handle 
        type="source" 
        position={Position.Left} 
        className="w-3 h-3 bg-purple-400 border-2 border-white rounded-full opacity-0 hover:opacity-100 transition-opacity" 
        style={{ left: -6 }}      />

    </div>
  );
};

export default CentralNode;
