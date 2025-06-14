import React, { useCallback, useState, useEffect } from "react";
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
  Handle,
  Position,
  NodeProps,
} from "@xyflow/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Network, Eye, EyeOff, Maximize2 } from "lucide-react";
import {
  type MindMapData,
  type MindMapNode,
  type MindMapEdge,
} from "@/types/common"; // Updated import path

import "@xyflow/react/dist/style.css";

interface MindMapComponentProps {
  mindMapData: MindMapData | null;
  isLoading?: boolean;
  onNodeExpand?: (nodeId: string) => void;
  isExpanding?: boolean;
}

// Custom node component for the modern mind map
const CustomNode = ({ data, selected, isConnectable }: NodeProps<any>) => { // Use NodeProps and add isConnectable
  const getLevelColor = (level: number) => {
    switch (level) {
      case 0:
        return "from-purple-500 to-blue-600";
      case 1:
        return "from-blue-500 to-cyan-600";
      case 2:
        return "from-green-500 to-emerald-600";
      case 3:
        return "from-yellow-500 to-orange-600";
      case 4:
        return "from-red-500 to-pink-600";
      default:
        return "from-gray-500 to-slate-600";
    }
  };

  const getNodeSize = (level: number) => {
    switch (level) {
      case 0:
        return "w-64 h-24 text-lg";
      case 1:
        return "w-56 h-20 text-base";
      case 2:
        return "w-48 h-16 text-sm";
      case 3:
        return "w-40 h-14 text-sm";
      default:
        return "w-36 h-12 text-xs";
    }
  };

  return (
    <div
      className={`
        bg-gradient-to-r ${getLevelColor(data.level)}
        ${getNodeSize(data.level)}
        ${selected ? "ring-2 ring-blue-500" : ""}
        rounded-xl border-2 border-white/20 shadow-lg hover:shadow-xl transition-all duration-200
        cursor-pointer font-medium text-center flex flex-col justify-center items-center
        text-white p-3
      `}
    >
      <div className="font-semibold leading-tight">{data.label}</div>
      {data.summary && (
        <div className="text-xs opacity-80 mt-1 line-clamp-2 leading-tight">
          {data.summary}
        </div>
      )}
      <Badge
        variant="outline"
        className="mt-1 text-xs bg-white/10 border-white/30 text-white"
      >
        Level {data.level}
      </Badge>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        style={{ background: '#555', width: '10px', height: '10px' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        style={{ background: '#555', width: '10px', height: '10px' }}
      />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const MindMapComponent: React.FC<MindMapComponentProps> = ({
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
      const reactFlowNodes: Node[] = mindMapData.nodes.map(
        (node: MindMapNode) => ({
          id: node.id,
          type: "custom",
          position: node.position,
          data: node.data,
          hidden: node.data.level > visibleLevels,
        })
      );

      // Convert MindMapEdges to ReactFlow edges
      const reactFlowEdges: Edge[] = mindMapData.edges.map(
        (edge: MindMapEdge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          animated: edge.animated,
          style: { stroke: "#6366f1", strokeWidth: 2 },
          labelStyle: { fontSize: 12, fontWeight: 500 },
          labelBgStyle: { fill: "#f8fafc", fillOpacity: 0.9 },
        })
      );

      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);

      // Fit view after a short delay to ensure nodes are rendered
      if (isFullscreen) {
        setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 150);
      } else {
        // Use a smaller padding for normal view for a tighter fit initially
        setTimeout(() => fitView({ duration: 800, padding: 0.1 }), 100);
      }
    }
  }, [mindMapData, visibleLevels, setNodes, setEdges, fitView, isFullscreen]); // Added isFullscreen

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (
        onNodeExpand &&
        typeof node.data.level === "number" &&
        node.data.level <= 3
      ) {
        onNodeExpand(node.id);
      }
    },
    [onNodeExpand]
  );

  const toggleLevel = (level: number) => {
    setVisibleLevels((prev) => (prev === level ? level - 1 : level));
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
              Mind map will be generated after research completion
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const containerClass = isFullscreen
    ? "fixed inset-0 z-50 bg-white flex flex-col" // Added flex flex-col for fullscreen
    : "rounded-3xl h-full flex flex-col"; // Use h-full and flex flex-col for normal mode

  return (
    <Card className={containerClass}>
      <CardHeader className="pb-2 shrink-0"> {/* Prevent header from shrinking */}
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5 text-blue-600" />
            Knowledge Map
            {isExpanding && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Level visibility controls */}
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4].map((level) => (
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
              className="p-2"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0"> {/* Added min-h-0 to ensure flex-1 works correctly in nested flex */}
        <div className="h-full w-full"> {/* Changed to h-full w-full */}
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
              position="bottom-right" // Added position prop
              nodeColor={(node) => {
                switch (node.data.level) {
                  case 1:
                    return "#3b82f6";
                  case 2:
                    return "#10b981";
                  case 3:
                    return "#8b5cf6";
                  case 4:
                    return "#f59e0b";
                  default:
                    return "#6b7280";
                }
              }}
            />
            <Controls
              className="!bg-white !border !border-gray-200 !rounded-lg"
              position="bottom-left" // Added position prop
            />
          </ReactFlow>
        </div>
      </CardContent>
      {isFullscreen && (
        <div className="absolute top-4 right-4">
          <Button onClick={toggleFullscreen} variant="outline" size="sm">
            Exit Fullscreen
          </Button>
        </div>
      )}
    </Card>
  );
};

// Wrap with ReactFlowProvider for hooks to work
const ModernMindMap: React.FC<MindMapComponentProps> = (props) => {
  return (
    <ReactFlowProvider>
      <MindMapComponent {...props} />
    </ReactFlowProvider>
  );
};

export default ModernMindMap;
