// =====================================================================================
// NOVAH AI ADVANCED MIND MAP COMPONENT
// Advanced mind map visualization with layered architecture
// =====================================================================================

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  BackgroundVariant,
  Panel,
  Node
} from 'reactflow';
import 'reactflow/dist/style.css';

import { nodeTypes } from './NovahMindMapNodes';
import { novahMindMapService, NovahMindMapData, SessionData } from '@/services/novahMindMapService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Info,
  Eye,
  EyeOff,
  Filter
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface NovahAdvancedMindMapProps {
  sessionData: SessionData;
  onMindMapGenerated?: (mindMapData: NovahMindMapData) => void;
  className?: string;
}

interface DetailsPanelData {
  node: Node | null;
  isOpen: boolean;
}

export const NovahAdvancedMindMap: React.FC<NovahAdvancedMindMapProps> = ({
  sessionData,
  onMindMapGenerated,
  className = ''
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mindMapData, setMindMapData] = useState<NovahMindMapData | null>(null);
  const [detailsPanel, setDetailsPanel] = useState<DetailsPanelData>({ node: null, isOpen: false });
  const [viewOptions, setViewOptions] = useState({
    showInsights: true,
    showAnalysis: true,
    showConnections: true,
    nodeLevel: 'all' as 'all' | '1' | '2' | '3'
  });

  // =====================================================================================
  // MIND MAP GENERATION
  // =====================================================================================

  const generateMindMap = useCallback(async () => {
    if (!sessionData || isGenerating) return;

    setIsGenerating(true);
    try {
      console.log('Generating mind map for session:', sessionData.id);
      const newMindMapData = await novahMindMapService.generateSessionMindMap(sessionData);
      
      setMindMapData(newMindMapData);
      setNodes(newMindMapData.nodes);
      setEdges(newMindMapData.edges);
      
      if (onMindMapGenerated) {
        onMindMapGenerated(newMindMapData);
      }
      
      console.log('Mind map generated successfully:', newMindMapData);
    } catch (error) {
      console.error('Error generating mind map:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [sessionData, isGenerating, onMindMapGenerated, setNodes, setEdges]);

  // =====================================================================================
  // FILTERED NODES AND EDGES
  // =====================================================================================

  const filteredNodes = useMemo(() => {
    if (!mindMapData) return nodes;

    let filtered = [...nodes];

    // Filter by level
    if (viewOptions.nodeLevel !== 'all') {
      const maxLevel = parseInt(viewOptions.nodeLevel);
      filtered = filtered.filter(node => node.data.level <= maxLevel);
    }

    // Filter by node type
    if (!viewOptions.showInsights) {
      filtered = filtered.filter(node => node.data.nodeType !== 'insight');
    }
    if (!viewOptions.showAnalysis) {
      filtered = filtered.filter(node => node.data.nodeType !== 'analysis');
    }

    return filtered;
  }, [nodes, viewOptions, mindMapData]);

  const filteredEdges = useMemo(() => {
    if (!mindMapData) return edges;

    const visibleNodeIds = new Set(filteredNodes.map(node => node.id));
    let filtered = edges.filter(edge => 
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );

    // Filter connections
    if (!viewOptions.showConnections) {
      filtered = filtered.filter(edge => edge.type !== 'connection');
    }

    return filtered;
  }, [edges, filteredNodes, viewOptions, mindMapData]);

  // =====================================================================================
  // EVENT HANDLERS
  // =====================================================================================

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setDetailsPanel({ node, isOpen: true });
  }, []);

  const handleExport = useCallback(() => {
    if (!mindMapData) return;

    const dataStr = JSON.stringify(mindMapData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `novah-mindmap-${sessionData.id}-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [mindMapData, sessionData]);

  const fitView = useCallback(() => {
    // This would normally use the fitView function from reactflow
    console.log('Fit view requested');
  }, []);

  // =====================================================================================
  // EFFECTS
  // =====================================================================================

  useEffect(() => {
    if (sessionData && (sessionData.files.length > 0 || sessionData.queries.length > 0)) {
      generateMindMap();
    }
  }, [sessionData, generateMindMap]);

  // =====================================================================================
  // RENDER
  // =====================================================================================

  if (!sessionData) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center text-gray-500">
          <Brain className="w-12 h-12 mx-auto mb-2" />
          <p>No session data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-[600px] bg-gray-50 rounded-lg overflow-hidden ${className}`}>
      <ReactFlow
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <MiniMap 
          nodeStrokeColor="#374151"
          nodeColor="#6b7280"
          nodeBorderRadius={2}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        
        {/* Top Panel - Controls */}
        <Panel position="top-left" className="bg-white rounded-lg shadow-lg p-4 m-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                onClick={generateMindMap}
                disabled={isGenerating}
                size="sm"
                variant="outline"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Generating...' : 'Regenerate'}
              </Button>
              
              <Button
                onClick={handleExport}
                disabled={!mindMapData}
                size="sm"
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            <div className="flex items-center gap-2">
              <Label htmlFor="show-insights" className="text-sm">Insights</Label>
              <Switch
                id="show-insights"
                checked={viewOptions.showInsights}
                onCheckedChange={(checked) => 
                  setViewOptions(prev => ({ ...prev, showInsights: checked }))
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="show-analysis" className="text-sm">Analysis</Label>
              <Switch
                id="show-analysis"
                checked={viewOptions.showAnalysis}
                onCheckedChange={(checked) => 
                  setViewOptions(prev => ({ ...prev, showAnalysis: checked }))
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="show-connections" className="text-sm">Connections</Label>
              <Switch
                id="show-connections"
                checked={viewOptions.showConnections}
                onCheckedChange={(checked) => 
                  setViewOptions(prev => ({ ...prev, showConnections: checked }))
                }
              />
            </div>

            <Select 
              value={viewOptions.nodeLevel} 
              onValueChange={(value: any) => 
                setViewOptions(prev => ({ ...prev, nodeLevel: value }))
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="1">Level 1</SelectItem>
                <SelectItem value="2">Level 2</SelectItem>
                <SelectItem value="3">Level 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Panel>

        {/* Statistics Panel */}
        {mindMapData && (
          <Panel position="top-right" className="bg-white rounded-lg shadow-lg p-4 m-4">
            <div className="text-sm space-y-2">
              <div className="font-semibold text-gray-800">Mind Map Stats</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Files: <Badge variant="outline">{mindMapData.metadata.totalFiles}</Badge></div>
                <div>Queries: <Badge variant="outline">{mindMapData.metadata.totalQueries}</Badge></div>
                <div>Insights: <Badge variant="outline">{mindMapData.metadata.totalInsights}</Badge></div>
                <div>Nodes: <Badge variant="outline">{filteredNodes.length}</Badge></div>
              </div>
              <div className="text-xs text-gray-500">
                Generated: {new Date(mindMapData.metadata.generatedAt).toLocaleString()}
              </div>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Details Panel */}
      {detailsPanel.isOpen && detailsPanel.node && (
        <div className="absolute top-4 right-4 w-80 bg-white rounded-lg shadow-xl border z-50">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{detailsPanel.node.data.label}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDetailsPanel({ node: null, isOpen: false })}
                >
                  ×
                </Button>
              </div>
              <Badge variant="outline">{detailsPanel.node.data.nodeType}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {detailsPanel.node.data.summary && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Summary</div>
                  <div className="text-sm text-gray-600">{detailsPanel.node.data.summary}</div>
                </div>
              )}
              
              {detailsPanel.node.data.content && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Content</div>
                  <div className="text-sm text-gray-600 max-h-32 overflow-y-auto">
                    {detailsPanel.node.data.content}
                  </div>
                </div>
              )}
              
              {detailsPanel.node.data.confidence && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Confidence</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${detailsPanel.node.data.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">
                      {Math.round(detailsPanel.node.data.confidence * 100)}%
                    </span>
                  </div>
                </div>
              )}
              
              {detailsPanel.node.data.metadata && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Metadata</div>
                  <div className="text-xs bg-gray-50 p-2 rounded">
                    <pre>{JSON.stringify(detailsPanel.node.data.metadata, null, 2)}</pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default NovahAdvancedMindMap;
