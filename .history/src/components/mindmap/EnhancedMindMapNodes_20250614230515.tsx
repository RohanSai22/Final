// =====================================================================================
// NOVAH AI ENHANCED MIND MAP NODES - SOPHISTICATED VISUAL COMPONENTS
// Professional node components with hierarchical design and interactive features
// =====================================================================================

import React, { useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  FileText, 
  MessageSquare, 
  Brain, 
  Folder, 
  HelpCircle,
  BarChart3,
  Search,
  Lightbulb,
  FileSearch,
  Tag,
  Zap,
  Target,
  BookOpen,
  CheckCircle,
  Link
} from 'lucide-react';
import type { EnhancedMindMapNode } from '@/services/enhancedMindMapService';

// =====================================================================================
// CENTRAL BRAIN NODE COMPONENT - THE MAIN HUB
// =====================================================================================

export const CentralBrainNode: React.FC<NodeProps<EnhancedMindMapNode['data']>> = ({ data, selected }) => {
  const [isExpanding, setIsExpanding] = useState(false);

  return (
    <div className="central-brain-node relative">
      {/* Pulsing gradient background with neural effect */}
      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 shadow-2xl flex items-center justify-center neural-pulse border-4 border-white/20">
        <div className="text-center">
          <div className="text-3xl mb-1">🧠</div>
          <div className="text-xs font-bold text-white">
            {data.totalFiles + data.totalQueries}
          </div>
        </div>
      </div>
      
      {/* Floating session title */}
      <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-gray-200 max-w-[200px]">
        <span className="text-xs font-semibold text-gray-700 truncate block text-center">
          {data.sessionTitle}
        </span>
      </div>
      
      {/* Information tooltip on hover */}
      {selected && (
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-3 py-2 rounded-lg text-xs z-10 whitespace-nowrap">
          📁 {data.totalFiles} files • ❓ {data.totalQueries} queries
        </div>
      )}
      
      {/* Multi-directional connection handles */}
      <Handle type="source" position={Position.Top} className="w-3 h-3 bg-purple-400 border-2 border-white rounded-full" style={{ top: -6 }} />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-purple-400 border-2 border-white rounded-full" style={{ right: -6 }} />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-purple-400 border-2 border-white rounded-full" style={{ bottom: -6 }} />
      <Handle type="source" position={Position.Left} className="w-3 h-3 bg-purple-400 border-2 border-white rounded-full" style={{ left: -6 }} />
      
      {/* CSS for neural pulse animation */}
      <style jsx>{`
        .neural-pulse {
          animation: neuralPulse 3s ease-in-out infinite;
        }
        
        @keyframes neuralPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.4); }
          50% { box-shadow: 0 0 0 20px rgba(147, 51, 234, 0); }
        }
      `}</style>
    </div>
  );
};

// =====================================================================================
// MAIN BRANCH NODE COMPONENT - FILES & QUESTIONS ORGANIZERS
// =====================================================================================

export const MainBranchNode: React.FC<NodeProps<EnhancedMindMapNode['data']>> = ({ data, selected }) => {
  const isFiles = 'category' in data && data.category === 'FILES';
  const icon = isFiles ? <Folder className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />;
  const bgColor = isFiles ? 'from-blue-500 to-cyan-500' : 'from-green-500 to-emerald-500';
  const borderColor = isFiles ? 'border-blue-300' : 'border-green-300';
  
  return (
    <div className="main-branch-node relative">
      <div className={`bg-gradient-to-br ${bgColor} rounded-xl shadow-xl border-2 ${borderColor} p-4 min-w-[220px] hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]`}>
        <div className="text-center text-white">
          <div className="flex items-center justify-center mb-2">
            {icon}
          </div>
          <h3 className="font-bold text-lg mb-2">
            {data.label}
          </h3>
          
          {/* Count badge */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
              {'count' in data ? data.count : 0} items
            </span>
          </div>
          
          {/* Summary */}
          {'summary' in data && (
            <p className="text-sm text-white/80 leading-relaxed">
              {data.summary}
            </p>
          )}
        </div>
      </div>
      
      {/* Connection handles */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-white border-2 border-current rounded-full" style={{ top: -6 }} />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-white border-2 border-current rounded-full" style={{ bottom: -6 }} />
    </div>
  );
};

// =====================================================================================
// FILE NODE COMPONENT - INDIVIDUAL FILE ITEMS
// =====================================================================================

export const FileNode: React.FC<NodeProps<EnhancedMindMapNode['data']>> = ({ data, selected }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('doc')) return '📝';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('text')) return '📋';
    return '📁';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="file-node relative">
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg shadow-lg border-2 border-indigo-200 p-3 max-w-[240px] hover:shadow-xl transition-all duration-300 hover:border-indigo-300">
        <div className="text-center">
          {/* File header */}
          <div className="flex items-center justify-between mb-2">
            <div className="text-lg">
              {'fileType' in data ? getFileIcon(data.fileType) : '📁'}
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4 text-indigo-600" />
              {'hasChildren' in data && data.hasChildren && (
                <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">
                  +5
                </span>
              )}
            </div>
          </div>
          
          {/* File name */}
          <h4 className="font-semibold text-gray-800 text-sm mb-2 leading-tight">
            {'fileName' in data ? data.fileName : data.label}
          </h4>
          
          {/* File metadata */}
          <div className="flex items-center justify-center gap-2 mb-2">
            {'fileSize' in data && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {formatFileSize(data.fileSize)}
              </span>
            )}
            {'uploadDate' in data && (
              <span className="text-xs text-gray-500">
                {data.uploadDate}
              </span>
            )}
          </div>
          
          {/* Summary */}
          {'summary' in data && (
            <p className="text-xs text-gray-600 leading-relaxed">
              {data.summary}
            </p>
          )}
        </div>
      </div>
      
      {/* Connection handles */}
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-indigo-400 border-2 border-white rounded-full" style={{ top: -4 }} />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-indigo-400 border-2 border-white rounded-full" style={{ bottom: -4 }} />
    </div>
  );
};

// =====================================================================================
// QUERY NODE COMPONENT - INDIVIDUAL QUESTION ITEMS
// =====================================================================================

export const QueryNode: React.FC<NodeProps<EnhancedMindMapNode['data']>> = ({ data, selected }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className="query-node relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg shadow-lg border-2 border-emerald-200 p-3 max-w-[240px] hover:shadow-xl transition-all duration-300 hover:border-emerald-300">
        <div className="text-center">
          {/* Query header */}
          <div className="flex items-center justify-between mb-2">
            <div className="text-lg">💬</div>
            <div className="flex items-center gap-1">
              {'queryIndex' in data && (
                <span className="text-xs bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">
                  #{data.queryIndex}
                </span>
              )}
              {'isAutonomous' in data && data.isAutonomous && (
                <Zap className="w-3 h-3 text-yellow-500" />
              )}
            </div>
          </div>
          
          {/* Query preview */}
          <p className="text-sm text-gray-700 leading-relaxed font-medium mb-2">
            {data.label}
          </p>
          
          {/* Timestamp */}
          {'timestamp' in data && (
            <div className="text-xs text-gray-500 mb-2">
              {data.timestamp}
            </div>
          )}
          
          {/* Query type indicator */}
          <div className="flex items-center justify-center">
            {'isAutonomous' in data && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                data.isAutonomous 
                  ? 'bg-yellow-100 text-yellow-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {data.isAutonomous ? 'Autonomous' : 'Standard'}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Full query tooltip on hover */}
      {isHovered && 'query' in data && (
        <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-black/90 text-white p-3 rounded-lg text-xs max-w-[300px] z-20">
          <p className="leading-relaxed">{data.query}</p>
        </div>
      )}
      
      {/* Connection handles */}
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-emerald-400 border-2 border-white rounded-full" style={{ top: -4 }} />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-emerald-400 border-2 border-white rounded-full" style={{ bottom: -4 }} />
    </div>
  );
};

// =====================================================================================
// FILE ANALYSIS NODE COMPONENT - DEEP FILE INSIGHTS
// =====================================================================================

export const FileAnalysisNode: React.FC<NodeProps<EnhancedMindMapNode['data']>> = ({ data, selected }) => {
  const getAnalysisIcon = (type: string) => {
    const icons = {
      'content': <BarChart3 className="w-4 h-4" />,
      'themes': <Search className="w-4 h-4" />,
      'insights': <Lightbulb className="w-4 h-4" />,
      'summary': <FileSearch className="w-4 h-4" />,
      'topics': <Tag className="w-4 h-4" />
    };
    return icons[type as keyof typeof icons] || <BarChart3 className="w-4 h-4" />;
  };

  const getAnalysisColor = (type: string) => {
    const colors = {
      'content': 'from-blue-400 to-blue-600',
      'themes': 'from-purple-400 to-purple-600',
      'insights': 'from-yellow-400 to-orange-500',
      'summary': 'from-green-400 to-green-600',
      'topics': 'from-pink-400 to-rose-500'
    };
    return colors[type as keyof typeof colors] || 'from-gray-400 to-gray-600';
  };

  return (
    <div className="file-analysis-node relative">
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-2 max-w-[180px] hover:shadow-lg transition-all duration-300">
        <div className="text-center">
          {/* Analysis type header */}
          <div className={`w-full bg-gradient-to-r ${
            'analysisType' in data ? getAnalysisColor(data.analysisType) : 'from-gray-400 to-gray-600'
          } rounded-md p-2 mb-2 text-white`}>
            <div className="flex items-center justify-center gap-1">
              {'analysisType' in data && getAnalysisIcon(data.analysisType)}
              <span className="text-xs font-semibold">
                {data.label.replace(/^[📊🔍💡📝🏷️]\s/, '')}
              </span>
            </div>
          </div>
          
          {/* Content preview */}
          {'content' in data && (
            <p className="text-xs text-gray-600 leading-relaxed">
              {data.content.substring(0, 60)}
              {data.content.length > 60 ? '...' : ''}
            </p>
          )}
        </div>
      </div>
      
      {/* Connection handle */}
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-gray-400 border-2 border-white rounded-full" style={{ top: -4 }} />
    </div>
  );
};

// =====================================================================================
// QUERY ANALYSIS NODE COMPONENT - DEEP ANSWER BREAKDOWN
// =====================================================================================

export const QueryAnalysisNode: React.FC<NodeProps<EnhancedMindMapNode['data']>> = ({ data, selected }) => {
  const getAnalysisIcon = (type: string) => {
    const icons = {
      'thinking': <Brain className="w-4 h-4" />,
      'reasoning': <Target className="w-4 h-4" />,
      'evidence': <BookOpen className="w-4 h-4" />,
      'conclusions': <CheckCircle className="w-4 h-4" />,
      'related': <Link className="w-4 h-4" />
    };
    return icons[type as keyof typeof icons] || <Brain className="w-4 h-4" />;
  };

  const getAnalysisColor = (type: string) => {
    const colors = {
      'thinking': 'from-indigo-400 to-indigo-600',
      'reasoning': 'from-cyan-400 to-cyan-600',
      'evidence': 'from-teal-400 to-teal-600',
      'conclusions': 'from-green-400 to-green-600',
      'related': 'from-violet-400 to-violet-600'
    };
    return colors[type as keyof typeof colors] || 'from-gray-400 to-gray-600';
  };

  return (
    <div className="query-analysis-node relative">
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-2 max-w-[180px] hover:shadow-lg transition-all duration-300">
        <div className="text-center">
          {/* Analysis type header */}
          <div className={`w-full bg-gradient-to-r ${
            'analysisType' in data ? getAnalysisColor(data.analysisType) : 'from-gray-400 to-gray-600'
          } rounded-md p-2 mb-2 text-white`}>
            <div className="flex items-center justify-center gap-1">
              {'analysisType' in data && getAnalysisIcon(data.analysisType)}
              <span className="text-xs font-semibold">
                {data.label.replace(/^[🧠💡📚✅🔗]\s/, '')}
              </span>
            </div>
          </div>
          
          {/* Content preview */}
          {'content' in data && (
            <p className="text-xs text-gray-600 leading-relaxed">
              {data.content.substring(0, 60)}
              {data.content.length > 60 ? '...' : ''}
            </p>
          )}
        </div>
      </div>
      
      {/* Connection handle */}
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-gray-400 border-2 border-white rounded-full" style={{ top: -4 }} />
    </div>
  );
};

// =====================================================================================
// NODE TYPE REGISTRY
// =====================================================================================

export const enhancedNodeTypes = {
  'central': CentralBrainNode,
  'main-branch': MainBranchNode,
  'file': FileNode,
  'query': QueryNode,
  'file-analysis': FileAnalysisNode,
  'query-analysis': QueryAnalysisNode,
};
