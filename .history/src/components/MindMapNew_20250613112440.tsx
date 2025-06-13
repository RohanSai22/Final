import React, { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Network, Eye, EyeOff, Maximize2 } from 'lucide-react';
import { MindMapData, MindMapNode, MindMapEdge } from '@/services/autonomousResearchAgent';

import '@xyflow/react/dist/style.css';

interface MindMapProps {
  mindMapData: MindMapData | null;
  isLoading?: boolean;
  onNodeExpand?: (nodeId: string) => void;
  isExpanding?: boolean;
}

// Custom node component
const CustomNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const getLevelColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-blue-100 border-blue-300 text-blue-900';
      case 2:
        return 'bg-green-100 border-green-300 text-green-900';
      case 3:
        return 'bg-purple-100 border-purple-300 text-purple-900';
      case 4:
        return 'bg-orange-100 border-orange-300 text-orange-900';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-900';
    }
  };

  const getNodeSize = (level: number) => {
    switch (level) {
      case 1:
        return 'p-4 text-base min-w-48';
      case 2:
        return 'p-3 text-sm min-w-40';
      case 3:
        return 'p-2 text-sm min-w-32';
      default:
        return 'p-2 text-xs min-w-28';
    }
  };

  return (
    <div
      className={`
        ${getLevelColor(data.level)}
        ${getNodeSize(data.level)}
        ${selected ? 'ring-2 ring-blue-500' : ''}
        rounded-xl border-2 shadow-lg hover:shadow-xl transition-all duration-200
        cursor-pointer font-medium text-center max-w-60
      `}
    >
      <div className="font-semibold">{data.label}</div>
      {data.summary && (
        <div className="text-xs opacity-70 mt-1 line-clamp-2">
          {data.summary}
        </div>
      )}
      <Badge variant="outline" className="mt-2 text-xs">
        Level {data.level}
      </Badge>
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const MindMapComponent: React.FC<MindMapProps> = ({
  mindMapData,
  isLoading = false,
  onNodeExpand,
  isExpanding = false,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [visibleLevels, setVisibleLevels] = useState(3);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { fitView } = useReactFlow();

  // Initialize nodes and edges when mindMapData changes
  useEffect(() => {
    if (mindMapData?.nodes && mindMapData?.edges) {
      // Convert MindMapNodes to ReactFlow nodes
      const reactFlowNodes: Node[] = mindMapData.nodes.map((node: MindMapNode) => ({
        id: node.id,
        type: 'custom',
        position: node.position,
        data: node.data,
        hidden: node.data.level > visibleLevels,
      }));

      // Convert MindMapEdges to ReactFlow edges
      const reactFlowEdges: Edge[] = mindMapData.edges.map((edge: MindMapEdge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        animated: edge.animated,
        style: { stroke: '#6366f1', strokeWidth: 2 },
        labelStyle: { fontSize: 12, fontWeight: 500 },
        labelBgStyle: { fill: '#f8fafc', fillOpacity: 0.9 },
      }));

      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);

      // Fit view after a short delay to ensure nodes are rendered
      setTimeout(() => fitView({ duration: 800 }), 100);
    }
  }, [mindMapData, visibleLevels, setNodes, setEdges, fitView]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );
  const handleNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (onNodeExpand && typeof node.data.level === 'number' && node.data.level <= 3) {
        onNodeExpand(node.id);
      }
    },
    [onNodeExpand]
  );

  const toggleLevel = (level: number) => {
    setVisibleLevels(prev => prev === level ? level - 1 : level);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (isLoading) {
    return (
      <Card className="rounded-3xl h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Generating mind map...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!mindMapData || !mindMapData.nodes.length) {
    return (
      <Card className="rounded-3xl h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Network className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No mind map data available</p>
            <p className="text-sm text-gray-500 mt-2">
              Generate a report first to create a mind map
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const containerClasses = isFullscreen
    ? 'fixed inset-0 z-50 bg-white'
    : 'rounded-3xl h-96';

  return (
    <Card className={containerClasses}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Network className="w-5 h-5" />
          Knowledge Mind Map
        </CardTitle>
        <div className="flex items-center gap-2">
          {/* Level controls */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4].map((level) => (
              <Button
                key={level}
                variant={visibleLevels >= level ? "default" : "outline"}
                size="sm"
                onClick={() => toggleLevel(level)}
                className="w-8 h-8 p-0 text-xs"
              >
                {level}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="rounded-xl"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className={`p-0 ${isFullscreen ? 'h-[calc(100vh-80px)]' : 'h-80'}`}>
        <div className="w-full h-full relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDoubleClick={handleNodeDoubleClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ duration: 800, padding: 0.2 }}
            className="rounded-b-3xl"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <MiniMap
              className="!bg-gray-50 !border !border-gray-200 rounded-lg"
              nodeColor={(node) => {
                switch (node.data.level) {
                  case 1: return '#3b82f6';
                  case 2: return '#10b981';
                  case 3: return '#8b5cf6';
                  case 4: return '#f59e0b';
                  default: return '#6b7280';
                }
              }}
            />
            <Controls className="!bg-white !border !border-gray-200 !rounded-lg" />
          </ReactFlow>
          
          {/* Overlay for interaction hints */}
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
              <p className="text-xs text-gray-600 mb-1">
                💡 <strong>Double-click</strong> nodes to expand
              </p>
              <p className="text-xs text-gray-600">
                🎚️ Use level controls to show/hide layers
              </p>
              {isExpanding && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-xs text-blue-600">Expanding node...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Wrapper component with ReactFlowProvider
const MindMapNew: React.FC<MindMapProps> = (props) => {
  return (
    <ReactFlowProvider>
      <MindMapComponent {...props} />
    </ReactFlowProvider>
  );
};

export default MindMapNew;
