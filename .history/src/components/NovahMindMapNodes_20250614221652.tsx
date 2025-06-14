// =====================================================================================
// NOVAH AI MIND MAP NODES - CUSTOM NODE COMPONENTS
// Advanced node components for the layered mind map system
// =====================================================================================

import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  MessageSquare, 
  Lightbulb, 
  Brain,
  Star,
  Info
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// =====================================================================================
// CENTRAL NODE COMPONENT
// =====================================================================================

export const CentralNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div className={`relative ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <Handle type="source" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />
      <Handle type="source" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      
      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg border-4 border-indigo-400">
        <div className="text-center text-white">
          <Brain className="w-8 h-8 mx-auto mb-1" />
          <div className="text-sm font-bold leading-tight">{data.label}</div>
          {data.summary && (
            <div className="text-xs opacity-90 mt-1">{data.summary.substring(0, 30)}...</div>
          )}
        </div>
      </div>
      
      {data.metadata && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
          <Badge variant="secondary" className="text-xs">
            Session {data.metadata.sessionId?.substring(0, 8)}
          </Badge>
        </div>
      )}
    </div>
  );
});

// =====================================================================================
// BRANCH NODE COMPONENT
// =====================================================================================

export const BranchNode = memo(({ data, selected }: NodeProps) => {
  const isFiles = data.label === 'Files';
  const Icon = isFiles ? FileText : MessageSquare;
  const bgGradient = isFiles 
    ? 'from-pink-400 to-red-500' 
    : 'from-blue-400 to-cyan-500';

  return (
    <div className={`relative ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <Handle type="target" position={Position.Right} className="opacity-0" />
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      
      <div className={`w-28 h-14 rounded-xl bg-gradient-to-br ${bgGradient} flex items-center justify-center shadow-md border-2 border-white/20`}>
        <div className="text-center text-white">
          <Icon className="w-5 h-5 mx-auto mb-1" />
          <div className="text-sm font-semibold">{data.label}</div>
        </div>
      </div>
      
      {data.summary && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute -top-2 -right-2">
                <Badge variant="outline" className="w-4 h-4 p-0 bg-white">
                  <Info className="w-3 h-3" />
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{data.summary}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
});

// =====================================================================================
// FILE NODE COMPONENT
// =====================================================================================

export const FileNode = memo(({ data, selected }: NodeProps) => {
  const [isExpanded, setIsExpanded] = useState(data.isExpanded || false);
  
  const fileTypeColor = {
    'pdf': 'bg-red-100 text-red-800 border-red-200',
    'txt': 'bg-gray-100 text-gray-800 border-gray-200',
    'doc': 'bg-blue-100 text-blue-800 border-blue-200',
    'default': 'bg-orange-100 text-orange-800 border-orange-200'
  };
  
  const fileType = data.metadata?.fileType?.toLowerCase() || 'default';
  const colorClass = fileTypeColor[fileType as keyof typeof fileTypeColor] || fileTypeColor.default;

  return (
    <div className={`relative ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      
      <Card className={`w-36 ${colorClass} shadow-md hover:shadow-lg transition-shadow`}>
        <CardHeader className="p-3 pb-2">
          <div className="flex items-center justify-between">
            <FileText className="w-4 h-4" />
            <Button
              variant="ghost"
              size="sm"
              className="w-4 h-4 p-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </Button>
          </div>
          <CardTitle className="text-sm font-semibold leading-tight">
            {data.label}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-3 pt-0">
          <div className="text-xs opacity-75 mb-2">{data.summary}</div>
          
          {data.metadata && (
            <div className="flex flex-wrap gap-1 mb-2">
              <Badge variant="outline" className="text-xs">
                {data.metadata.fileType?.toUpperCase()}
              </Badge>
              {data.metadata.size && (
                <Badge variant="outline" className="text-xs">
                  {Math.round(data.metadata.size / 1024)}KB
                </Badge>
              )}
            </div>
          )}
          
          {isExpanded && data.content && (
            <div className="text-xs bg-white/50 p-2 rounded border mt-2 max-h-20 overflow-y-auto">
              {data.content}
            </div>
          )}
          
          {data.insights && data.insights.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Lightbulb className="w-3 h-3" />
              <span className="text-xs">{data.insights.length} insights</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

// =====================================================================================
// QUERY NODE COMPONENT
// =====================================================================================

export const QueryNode = memo(({ data, selected }: NodeProps) => {
  const [isExpanded, setIsExpanded] = useState(data.isExpanded || false);
  
  const hasAnswer = data.metadata?.hasAnswer;
  const hasThinking = data.metadata?.hasThinking;

  return (
    <div className={`relative ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      
      <Card className="w-36 bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="p-3 pb-2">
          <div className="flex items-center justify-between">
            <MessageSquare className="w-4 h-4 text-teal-600" />
            <Button
              variant="ghost"
              size="sm"
              className="w-4 h-4 p-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </Button>
          </div>
          <CardTitle className="text-sm font-semibold leading-tight text-teal-800">
            {data.label}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-3 pt-0">
          <div className="text-xs opacity-75 mb-2 text-teal-700">{data.summary}</div>
          
          <div className="flex flex-wrap gap-1 mb-2">
            {hasAnswer && (
              <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-200">
                ✓ Answered
              </Badge>
            )}
            {hasThinking && (
              <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-200">
                🧠 AI Thinking
              </Badge>
            )}
          </div>
          
          {isExpanded && data.content && (
            <div className="text-xs bg-white/70 p-2 rounded border mt-2 max-h-20 overflow-y-auto text-teal-800">
              {data.content}
            </div>
          )}
          
          {data.insights && data.insights.length > 0 && (
            <div className="flex items-center gap-1 mt-2 text-teal-600">
              <Brain className="w-3 h-3" />
              <span className="text-xs">{data.insights.length} reasoning steps</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

// =====================================================================================
// INSIGHT NODE COMPONENT
// =====================================================================================

export const InsightNode = memo(({ data, selected }: NodeProps) => {
  const isTheme = data.metadata?.type === 'theme';
  const isKeyPoint = data.metadata?.type === 'keyPoint';
  const isReasoning = data.metadata?.type === 'reasoning';
  const isEvidence = data.metadata?.type === 'evidence';
  
  let bgColor = 'bg-yellow-100 border-yellow-200 text-yellow-800';
  let Icon = Lightbulb;
  
  if (isKeyPoint) {
    bgColor = 'bg-purple-100 border-purple-200 text-purple-800';
    Icon = Star;
  } else if (isReasoning) {
    bgColor = 'bg-green-100 border-green-200 text-green-800';
    Icon = Brain;
  } else if (isEvidence) {
    bgColor = 'bg-red-100 border-red-200 text-red-800';
    Icon = FileText;
  }

  return (
    <div className={`relative ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <Handle type="target" position={Position.Top} className="opacity-0" />
      
      <Card className={`w-32 ${bgColor} shadow-sm hover:shadow-md transition-shadow`}>
        <CardContent className="p-2">
          <div className="flex items-start gap-1 mb-1">
            <Icon className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <div className="text-xs font-medium leading-tight">{data.label}</div>
          </div>
          
          {data.summary && (
            <div className="text-xs opacity-75 leading-tight">{data.summary}</div>
          )}
          
          {data.confidence && (
            <div className="flex items-center gap-1 mt-1">
              <div className="w-full bg-white/50 rounded-full h-1">
                <div 
                  className="bg-current h-1 rounded-full" 
                  style={{ width: `${data.confidence * 100}%` }}
                />
              </div>
              <span className="text-xs opacity-75">{Math.round(data.confidence * 100)}%</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

// =====================================================================================
// ANALYSIS NODE COMPONENT
// =====================================================================================

export const AnalysisNode = memo(({ data, selected }: NodeProps) => {
  const isReasoning = data.metadata?.type === 'reasoning';
  const isEvidence = data.metadata?.type === 'evidence';
  
  let bgColor = 'bg-green-100 border-green-200 text-green-800';
  let Icon = Brain;
  
  if (isEvidence) {
    bgColor = 'bg-red-100 border-red-200 text-red-800';
    Icon = FileText;
  }

  return (
    <div className={`relative ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <Handle type="target" position={Position.Top} className="opacity-0" />
      
      <Card className={`w-32 ${bgColor} shadow-sm hover:shadow-md transition-shadow`}>
        <CardContent className="p-2">
          <div className="flex items-start gap-1 mb-1">
            <Icon className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <div className="text-xs font-medium leading-tight">{data.label}</div>
          </div>
          
          {data.summary && (
            <div className="text-xs opacity-75 leading-tight">{data.summary}</div>
          )}
          
          {data.confidence && (
            <div className="flex items-center gap-1 mt-1">
              <div className="w-full bg-white/50 rounded-full h-1">
                <div 
                  className="bg-current h-1 rounded-full" 
                  style={{ width: `${data.confidence * 100}%` }}
                />
              </div>
              <span className="text-xs opacity-75">{Math.round(data.confidence * 100)}%</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

// =====================================================================================
// NODE TYPE MAP
// =====================================================================================

export const nodeTypes = {
  centralNode: CentralNode,
  branchNode: BranchNode,
  fileNode: FileNode,
  queryNode: QueryNode,
  insightNode: InsightNode,
  analysisNode: AnalysisNode,
};

export default nodeTypes;
