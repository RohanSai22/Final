// =====================================================================================
// ADVANCED MIND MAP COMPONENT - Complete Interactive Visualization
// Implements the sophisticated mind map system with AI-driven topic analysis,
// interactive detail panels, export features, and caching
// =====================================================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  NodeMouseHandler,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import html2canvas from 'html2canvas';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Share2, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Eye,
  Clock,
  FileText,
  Brain,
  Lightbulb
} from 'lucide-react';

import CentralNode from './CentralNode';
import TopicNode from './TopicNode';
import ConversationNode from './ConversationNode';

import type { 
  AdvancedMindMapData, 
  MindMapNodeExtended,
  ChatSession 
} from '@/services/chatSessionStorage';
import { advancedMindMapService } from '@/services/advancedMindMapService';
import { chatSessionStorage } from '@/services/chatSessionStorage';

// =====================================================================================
// NODE TYPE DEFINITIONS FOR REACT FLOW
// =====================================================================================

const nodeTypes = {
  central: CentralNode,
  topic: TopicNode,
  conversation: ConversationNode,
};

// =====================================================================================
// INTERFACES
// =====================================================================================

interface AdvancedMindMapProps {
  sessionId: string;
  onNodeSelect?: (nodeId: string | null) => void;
  autoGenerate?: boolean;
  showControls?: boolean;
  enableExport?: boolean;
  className?: string;
}

interface DetailPanelProps {
  node: MindMapNodeExtended | null;
  onClose: () => void;
  mindMapData: AdvancedMindMapData | null;
}

// =====================================================================================
// DETAIL PANEL COMPONENT
// =====================================================================================

const DetailPanel: React.FC<DetailPanelProps> = ({ node, onClose, mindMapData }) => {
  if (!node) return null;

  const renderCentralDetails = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-lg text-gray-900">Second Brain Overview</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-purple-50 p-3 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {mindMapData?.topics.length || 0}
          </div>
          <div className="text-sm text-gray-600">Topics</div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {mindMapData?.conversations.length || 0}
          </div>
          <div className="text-sm text-gray-600">Conversations</div>
        </div>
      </div>
      
      {node.data.summary && (
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Overview</h4>
          <p className="text-sm text-gray-600 leading-relaxed">{node.data.summary}</p>
        </div>
      )}
      
      {mindMapData?.metadata && (
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Generation Info</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div>Generated: {new Date(mindMapData.metadata.generatedAt).toLocaleString()}</div>
            <div>Version: {mindMapData.metadata.version}</div>
            <div>Layout: {mindMapData.metadata.layoutAlgorithm}</div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTopicDetails = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: node.data.color }} />
        <h3 className="font-semibold text-lg text-gray-900">{node.data.label}</h3>
      </div>
      
      {node.data.summary && (
        <p className="text-sm text-gray-600 leading-relaxed">{node.data.summary}</p>
      )}
      
      <div className="flex items-center gap-4">
        <Badge variant="secondary">
          {node.data.metadata?.totalConversations || 0} conversations
        </Badge>
        {node.data.centralityScore && (
          <Badge variant="outline">
            {Math.round(node.data.centralityScore)}% relevance
          </Badge>
        )}
      </div>
      
      {node.data.metadata?.keywords && node.data.metadata.keywords.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Keywords</h4>
          <div className="flex flex-wrap gap-1">
            {node.data.metadata.keywords.map((keyword: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderConversationDetails = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-lg">💬</div>
          <h3 className="font-semibold text-lg text-gray-900">Conversation</h3>
        </div>
        {node.data.metadata?.conversationIndex && (
          <Badge variant="secondary">#{node.data.metadata.conversationIndex}</Badge>
        )}
      </div>
      
      {node.data.content && (
        <div>
          <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Question
          </h4>
          <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded">
            {node.data.content}
          </p>
        </div>
      )}
      
      {node.data.summary && node.data.summary !== node.data.label && (
        <div>
          <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Summary
          </h4>
          <p className="text-sm text-gray-600 leading-relaxed">{node.data.summary}</p>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        {node.data.relevanceScore && (
          <div>
            <span className="text-gray-600">Relevance:</span>
            <span className="ml-1 font-medium">{Math.round(node.data.relevanceScore)}%</span>
          </div>
        )}
        {node.data.metadata?.timestamp && (
          <div>
            <span className="text-gray-600">Time:</span>
            <span className="ml-1 font-medium">
              {new Date(node.data.metadata.timestamp).toLocaleDateString()}
            </span>
          </div>
        )}
        {node.data.metadata?.wordCount && (
          <div>
            <span className="text-gray-600">Words:</span>
            <span className="ml-1 font-medium">{node.data.metadata.wordCount}</span>
          </div>
        )}
      </div>
      
      {/* Feature indicators */}
      <div className="flex gap-2">
        {node.data.metadata?.hasFiles && (
          <Badge variant="outline" className="text-xs">📎 Files</Badge>
        )}
        {node.data.metadata?.hasThinking && (
          <Badge variant="outline" className="text-xs">🧠 AI Thinking</Badge>
        )}
        {node.data.metadata?.isAutonomous && (
          <Badge variant="outline" className="text-xs">🤖 Autonomous</Badge>
        )}
      </div>
      
      {node.data.metadata?.keywords && node.data.metadata.keywords.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Keywords</h4>
          <div className="flex flex-wrap gap-1">
            {node.data.metadata.keywords.map((keyword: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Card className="absolute top-4 right-4 w-80 max-h-[calc(100vh-2rem)] overflow-y-auto bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl z-50">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Details</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          >
            ✕
          </Button>
        </div>
        
        {node.type === 'central' && renderCentralDetails()}
        {node.type === 'topic' && renderTopicDetails()}
        {node.type === 'conversation' && renderConversationDetails()}
      </div>
    </Card>
  );
};

// =====================================================================================
// MAIN ADVANCED MIND MAP COMPONENT
// =====================================================================================

const AdvancedMindMapComponent: React.FC<AdvancedMindMapProps> = ({
  sessionId,
  onNodeSelect,
  autoGenerate = true,
  showControls = true,
  enableExport = true,
  className = ''
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<MindMapNodeExtended | null>(null);
  const [mindMapData, setMindMapData] = useState<AdvancedMindMapData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const mindMapRef = useRef<HTMLDivElement>(null);

  // =====================================================================================
  // MIND MAP GENERATION AND LOADING
  // =====================================================================================

  const generateMindMap = useCallback(async () => {
    if (!sessionId) return;
    
    setIsGenerating(true);
    try {
      console.log("🧠 Generating advanced mind map for session:", sessionId);
      
      // Check cache first
      const session = chatSessionStorage.loadSession(sessionId);
      if (!session) {
        console.error("Session not found:", sessionId);
        return;
      }
      
      const cachedData = advancedMindMapService.getCachedMindMap(sessionId, session.messages.length);
      let advancedData: AdvancedMindMapData;
      
      if (cachedData) {
        console.log("📦 Using cached mind map data");
        advancedData = cachedData;
      } else {
        console.log("🔄 Generating new mind map data");
        advancedData = await advancedMindMapService.generateAdvancedMindMap(session);
        
        // Cache the generated data
        advancedMindMapService.setCachedMindMap(sessionId, session.messages.length, advancedData);
        
        // Save to session storage
        chatSessionStorage.saveAdvancedMindMapData(sessionId, advancedData);
      }
      
      setMindMapData(advancedData);
      setNodes(advancedData.nodes);
      setEdges(advancedData.edges);
      
      // Auto-fit view after a short delay
      setTimeout(() => fitView({ padding: 0.2, maxZoom: 1.2 }), 100);
      
      console.log("✅ Mind map generated successfully");
    } catch (error) {
      console.error("❌ Error generating mind map:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [sessionId, fitView]);

  const loadExistingMindMap = useCallback(() => {
    if (!sessionId) return;
    
    const session = chatSessionStorage.loadSession(sessionId);
    if (!session) return;
    
    const advancedData = session.advancedMindMapData;
    if (advancedData) {
      console.log("📂 Loading existing mind map data");
      setMindMapData(advancedData);
      setNodes(advancedData.nodes);
      setEdges(advancedData.edges);
      setTimeout(() => fitView({ padding: 0.2, maxZoom: 1.2 }), 100);
    }
  }, [sessionId, fitView]);

  // =====================================================================================
  // INTERACTION HANDLERS
  // =====================================================================================

  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    setSelectedNode(node as MindMapNodeExtended);
    onNodeSelect?.(node.id);
  }, [onNodeSelect]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  const handleRefresh = useCallback(() => {
    advancedMindMapService.clearCache();
    generateMindMap();
  }, [generateMindMap]);

  // =====================================================================================
  // EXPORT AND SHARING FEATURES
  // =====================================================================================

  const downloadAsPNG = async () => {
    if (!mindMapRef.current) return;
    
    setIsSharing(true);
    try {
      const mindMapElement = mindMapRef.current.querySelector('.react-flow') as HTMLElement;
      if (mindMapElement) {
        const canvas = await html2canvas(mindMapElement, {
          backgroundColor: '#f8fafc',
          scale: 2, // High DPI for crisp images
          logging: false,
          useCORS: true,
          allowTaint: true,
        });
        
        const link = document.createElement('a');
        link.download = `mind-map-${sessionId}-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
    } catch (error) {
      console.error('Error generating PNG:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const shareToSocial = async () => {
    if (!mindMapRef.current) return;
    
    setIsSharing(true);
    try {
      const mindMapElement = mindMapRef.current.querySelector('.react-flow') as HTMLElement;
      if (mindMapElement) {
        const canvas = await html2canvas(mindMapElement, {
          backgroundColor: '#f8fafc',
          scale: 2,
          logging: false,
        });
        
        canvas.toBlob((blob) => {
          if (blob && navigator.share) {
            const file = new File([blob], 'novah-mind-map.png', { type: 'image/png' });
            navigator.share({
              title: 'My Novah AI Mind Map',
              text: 'Check out my conversation analysis from Novah AI!',
              files: [file],
            });
          }
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setIsSharing(false);
    }
  };

  // =====================================================================================
  // EFFECTS
  // =====================================================================================

  useEffect(() => {
    const session = chatSessionStorage.loadSession(sessionId);
    setHasSession(!!session);
    
    if (session) {
      if (session.advancedMindMapData) {
        loadExistingMindMap();
      } else if (autoGenerate && session.messages.length > 0) {
        generateMindMap();
      }
    }
  }, [sessionId, autoGenerate, loadExistingMindMap, generateMindMap]);

  // =====================================================================================
  // NODE COLOR FUNCTION FOR MINIMAP
  // =====================================================================================

  const nodeColor = (node: any) => {
    switch (node.type) {
      case 'central': return 'hsl(263, 70%, 50%)';
      case 'topic': return node.data?.color || 'hsl(250, 70%, 60%)';
      case 'conversation': return node.data?.color || 'hsl(280, 60%, 55%)';
      default: return '#e2e8f0';
    }
  };

  // =====================================================================================
  // RENDER
  // =====================================================================================

  if (!hasSession) {
    return (
      <div className={`flex items-center justify-center h-96 bg-gray-50 rounded-lg ${className}`}>
        <div className="text-center text-gray-500">
          <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No session found</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={mindMapRef} className={`relative w-full h-full ${className}`}>
      {/* Control Panel */}
      {showControls && (
        <div className="absolute top-4 left-4 z-40 flex flex-col gap-2">
          <Card className="p-2 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isGenerating}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              </Button>
              
              <Separator orientation="vertical" className="h-6" />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => zoomIn()}
                className="h-8 w-8 p-0"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => zoomOut()}
                className="h-8 w-8 p-0"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fitView({ padding: 0.2, maxZoom: 1.2 })}
                className="h-8 w-8 p-0"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
              
              {enableExport && (
                <>
                  <Separator orientation="vertical" className="h-6" />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={downloadAsPNG}
                    disabled={isSharing}
                    className="h-8 w-8 p-0"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  
                  {navigator.share && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={shareToSocial}
                      disabled={isSharing}
                      className="h-8 w-8 p-0"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </Card>
          
          {/* Status indicator */}
          {(isGenerating || isSharing) && (
            <Card className="p-2 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                {isGenerating ? 'Generating...' : 'Exporting...'}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Mind Map */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
        className="bg-gradient-to-br from-slate-50 to-blue-50"
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Controls 
          className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg"
          showInteractive={false}
        />
        
        <MiniMap 
          className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg"
          zoomable
          pannable
          nodeColor={nodeColor}
        />
        
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1}
          color="#e2e8f0"
        />
      </ReactFlow>

      {/* Detail Panel */}
      <DetailPanel 
        node={selectedNode} 
        onClose={() => setSelectedNode(null)}
        mindMapData={mindMapData}
      />
    </div>
  );
};

// =====================================================================================
// WRAPPED COMPONENT WITH REACT FLOW PROVIDER
// =====================================================================================

const AdvancedMindMap: React.FC<AdvancedMindMapProps> = (props) => {
  return (
    <ReactFlowProvider>
      <AdvancedMindMapComponent {...props} />
    </ReactFlowProvider>
  );
};

export default AdvancedMindMap;
