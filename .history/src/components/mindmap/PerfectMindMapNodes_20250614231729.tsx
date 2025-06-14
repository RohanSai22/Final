// =====================================================================================
// PERFECT MIND MAP NODES - CUSTOM COMPONENTS FOR EACH LAYER
// Sophisticated visual design inspired by advanced mind map systems
// =====================================================================================

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

// =====================================================================================
// LAYER 1: CENTRAL BRAIN NODE - The main hub
// =====================================================================================

export const CentralBrainNode: React.FC<NodeProps> = ({ data }) => {
  return (
    <div className="central-brain-node relative">
      {/* Gradient brain icon with neural pulse animation */}
      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 shadow-2xl flex items-center justify-center border-4 border-white relative overflow-hidden">
        {/* Neural pulse animation */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 via-blue-400 to-indigo-500 animate-pulse opacity-30"></div>
        
        <div className="text-center relative z-10">
          <div className="text-3xl mb-1">🧠</div>
          <div className="text-xs font-bold text-white">
            {data.count || '0'}
          </div>
        </div>
      </div>
      
      {/* Floating label with session info */}
      <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg border border-gray-200">
        <span className="text-sm font-semibold text-gray-700">
          {data.label || 'Session Brain'}
        </span>
      </div>

      {/* Dynamic subtitle */}
      <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 text-center">
        {data.summary && (
          <div className="max-w-xs truncate">
            {data.summary}
          </div>
        )}
      </div>
      
      {/* Multi-directional connection handles */}
      <Handle 
        type="source" 
        position={Position.Top} 
        className="w-3 h-3 bg-purple-400 border-2 border-white rounded-full" 
        style={{ top: -6 }} 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-purple-400 border-2 border-white rounded-full" 
        style={{ right: -6 }} 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 bg-purple-400 border-2 border-white rounded-full" 
        style={{ bottom: -6 }} 
      />
      <Handle 
        type="source" 
        position={Position.Left} 
        className="w-3 h-3 bg-purple-400 border-2 border-white rounded-full" 
        style={{ left: -6 }} 
      />
    </div>
  );
};

// =====================================================================================
// LAYER 2: FILES BRANCH NODE - File category organizer
// =====================================================================================

export const FilesBranchNode: React.FC<NodeProps> = ({ data }) => {
  return (
    <div className="files-branch-node relative">
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] min-w-[220px]">
        <CardContent className="p-4">
          <div className="text-center">
            {/* Files icon with animation */}
            <div className="text-2xl mb-2 animate-bounce">📁</div>
            
            <h3 className="font-bold text-gray-800 text-lg mb-2">
              FILES
            </h3>
            
            {/* Count badge */}
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 mb-3">
              {data.count || 0} file{(data.count || 0) !== 1 ? 's' : ''}
            </Badge>
            
            {/* Summary */}
            {data.summary && (
              <p className="text-xs text-gray-600 leading-relaxed">
                {data.summary}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Connection handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-4 h-4 bg-blue-400 border-2 border-white rounded-full" 
        style={{ top: -8 }} 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-4 h-4 bg-blue-400 border-2 border-white rounded-full" 
        style={{ bottom: -8 }} 
      />
    </div>
  );
};

// =====================================================================================
// LAYER 2: QUESTIONS BRANCH NODE - Questions category organizer
// =====================================================================================

export const QuestionsBranchNode: React.FC<NodeProps> = ({ data }) => {
  return (
    <div className="questions-branch-node relative">
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] min-w-[220px]">
        <CardContent className="p-4">
          <div className="text-center">
            {/* Questions icon with pulse */}
            <div className="text-2xl mb-2 animate-pulse">❓</div>
            
            <h3 className="font-bold text-gray-800 text-lg mb-2">
              QUESTIONS
            </h3>
            
            {/* Count badge */}
            <Badge variant="secondary" className="bg-green-100 text-green-700 mb-3">
              {data.count || 0} quer{(data.count || 0) === 1 ? 'y' : 'ies'}
            </Badge>
            
            {/* Summary */}
            {data.summary && (
              <p className="text-xs text-gray-600 leading-relaxed">
                {data.summary}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Connection handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-4 h-4 bg-green-400 border-2 border-white rounded-full" 
        style={{ top: -8 }} 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-4 h-4 bg-green-400 border-2 border-white rounded-full" 
        style={{ bottom: -8 }} 
      />
    </div>
  );
};

// =====================================================================================
// LAYER 3: FILE NODE - Individual file representation
// =====================================================================================

export const FileNode: React.FC<NodeProps> = ({ data }) => {
  const getFileIcon = (fileName: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'txt': return '📄';
      case 'csv': return '📊';
      case 'xlsx':
      case 'xls': return '📈';
      default: return '📄';
    }
  };

  return (
    <div className="file-node relative">
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300 shadow-md hover:shadow-lg transition-all duration-300 hover:border-blue-400 max-w-[200px]">
        <CardContent className="p-3">
          <div className="text-center">
            {/* File icon */}
            <div className="text-lg mb-1">
              {getFileIcon(data.label || '')}
            </div>
            
            {/* File name */}
            <h4 className="font-semibold text-gray-800 text-sm mb-2 leading-tight line-clamp-2">
              {(data.label || '').replace('📄 ', '')}
            </h4>
            
            {/* Timestamp */}
            {data.timestamp && (
              <div className="text-xs text-gray-500 mb-2">
                {data.timestamp}
              </div>
            )}
            
            {/* Analysis indicator */}
            <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">
              5 analyses
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      {/* Connection handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 bg-blue-400 border-2 border-white rounded-full" 
        style={{ top: -6 }} 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 bg-blue-400 border-2 border-white rounded-full" 
        style={{ bottom: -6 }} 
      />
    </div>
  );
};

// =====================================================================================
// LAYER 3: QUERY NODE - Individual query representation
// =====================================================================================

export const QueryNode: React.FC<NodeProps> = ({ data }) => {
  return (
    <div className="query-node relative">
      <Card className="bg-gradient-to-br from-green-50 to-teal-50 border-2 border-green-300 shadow-md hover:shadow-lg transition-all duration-300 hover:border-green-400 max-w-[200px]">
        <CardContent className="p-3">
          <div className="text-center">
            {/* Query header */}
            <div className="flex items-center justify-between mb-1">
              <div className="text-lg">💬</div>
              {data.conversationIndex && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-600">
                  #{data.conversationIndex}
                </Badge>
              )}
            </div>
            
            {/* Query preview */}
            <p className="text-sm text-gray-700 leading-relaxed font-medium mb-2 line-clamp-3">
              {(data.label || '').replace('💬 ', '')}
            </p>
            
            {/* Timestamp */}
            {data.timestamp && (
              <div className="text-xs text-gray-500 mb-2">
                {data.timestamp}
              </div>
            )}
            
            {/* Analysis indicator */}
            <Badge variant="outline" className="text-xs border-green-300 text-green-600">
              5 analyses
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      {/* Connection handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 bg-green-400 border-2 border-white rounded-full" 
        style={{ top: -6 }} 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 bg-green-400 border-2 border-white rounded-full" 
        style={{ bottom: -6 }} 
      />
    </div>
  );
};

// =====================================================================================
// LAYER 4: FILE ANALYSIS NODE - Deep file analysis
// =====================================================================================

export const FileAnalysisNode: React.FC<NodeProps> = ({ data }) => {
  const getAnalysisIcon = (analysisType: string) => {
    const icons = {
      'content': '📊',
      'themes': '🔍',
      'insights': '💡',
      'summary': '📝',
      'topics': '🏷️'
    };
    return icons[analysisType as keyof typeof icons] || '📋';
  };

  const getAnalysisColor = (analysisType: string) => {
    const colors = {
      'content': 'from-purple-50 to-violet-50 border-purple-200',
      'themes': 'from-blue-50 to-indigo-50 border-blue-200',
      'insights': 'from-yellow-50 to-orange-50 border-yellow-200',
      'summary': 'from-gray-50 to-slate-50 border-gray-200',
      'topics': 'from-pink-50 to-rose-50 border-pink-200'
    };
    return colors[analysisType as keyof typeof colors] || 'from-gray-50 to-slate-50 border-gray-200';
  };

  return (
    <div className="file-analysis-node relative">
      <Card className={`bg-gradient-to-br ${getAnalysisColor(data.analysisType || '')} border-2 shadow-sm hover:shadow-md transition-all duration-300 max-w-[180px]`}>
        <CardContent className="p-2.5">
          <div className="text-center">
            {/* Analysis icon */}
            <div className="text-base mb-1">
              {getAnalysisIcon(data.analysisType || '')}
            </div>
            
            {/* Analysis type */}
            <h5 className="font-medium text-gray-800 text-xs mb-1 leading-tight">
              {(data.label || '').split(' ').slice(1).join(' ')} {/* Remove emoji */}
            </h5>
            
            {/* Content preview */}
            {data.content && (
              <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                {data.content.substring(0, 60)}...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Connection handle */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-2 h-2 bg-indigo-400 border-2 border-white rounded-full" 
        style={{ top: -4 }} 
      />
    </div>
  );
};

// =====================================================================================
// LAYER 4: QUERY ANALYSIS NODE - Deep query analysis
// =====================================================================================

export const QueryAnalysisNode: React.FC<NodeProps> = ({ data }) => {
  const getAnalysisIcon = (analysisType: string) => {
    const icons = {
      'thinking': '🧠',
      'reasoning': '💡',
      'evidence': '📚',
      'conclusions': '✅',
      'related': '🔗'
    };
    return icons[analysisType as keyof typeof icons] || '🔍';
  };

  const getAnalysisColor = (analysisType: string) => {
    const colors = {
      'thinking': 'from-emerald-50 to-teal-50 border-emerald-200',
      'reasoning': 'from-blue-50 to-cyan-50 border-blue-200',
      'evidence': 'from-amber-50 to-yellow-50 border-amber-200',
      'conclusions': 'from-green-50 to-lime-50 border-green-200',
      'related': 'from-purple-50 to-fuchsia-50 border-purple-200'
    };
    return colors[analysisType as keyof typeof colors] || 'from-gray-50 to-slate-50 border-gray-200';
  };

  return (
    <div className="query-analysis-node relative">
      <Card className={`bg-gradient-to-br ${getAnalysisColor(data.analysisType || '')} border-2 shadow-sm hover:shadow-md transition-all duration-300 max-w-[180px]`}>
        <CardContent className="p-2.5">
          <div className="text-center">
            {/* Analysis icon */}
            <div className="text-base mb-1">
              {getAnalysisIcon(data.analysisType || '')}
            </div>
            
            {/* Analysis type */}
            <h5 className="font-medium text-gray-800 text-xs mb-1 leading-tight">
              {(data.label || '').split(' ').slice(1).join(' ')} {/* Remove emoji */}
            </h5>
            
            {/* Content preview */}
            {data.content && (
              <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                {data.content.substring(0, 60)}...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Connection handle */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-2 h-2 bg-pink-400 border-2 border-white rounded-full" 
        style={{ top: -4 }} 
      />
    </div>
  );
};

// =====================================================================================
// NODE TYPES REGISTRY - Map node types to components
// =====================================================================================

export const perfectNodeTypes = {
  'central': CentralBrainNode,
  'files-branch': FilesBranchNode,
  'questions-branch': QuestionsBranchNode,
  'file': FileNode,
  'query': QueryNode,
  'file-analysis': FileAnalysisNode,
  'query-analysis': QueryAnalysisNode,
};
