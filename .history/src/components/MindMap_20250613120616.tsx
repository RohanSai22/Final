import React, { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Controls,
  Background,
  MiniMap,
  ReactFlowProvider,
  Position,
  MarkerType,
} from "reactflow";
import dagre from "dagre";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Download, Plus, Trash2, RotateCcw, Expand } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import "reactflow/dist/style.css";

interface MindMapNode {
  id: string;
  label: string;
  type: "center" | "main" | "sub" | "detail";
  level: number;
  parentId?: string;
  expanded: boolean;
  hasChildren: boolean;
}

interface MindMapEdge {
  source: string;
  target: string;
}

interface MindMapProps {
  data?: {
    nodes: MindMapNode[];
    edges: MindMapEdge[];
  };
  query?: string;
  onNodeExpand?: (nodeId: string) => void;
}

// Dagre layout configuration
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 172;
const nodeHeight = 80;

const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction = "TB"
) => {
  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? Position.Left : Position.Top;
    node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

    // We are shifting the dagre node position (anchor=center center) to the top left
    // so it matches the React Flow node anchor point (top left).
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return node;
  });

  return { nodes, edges };
};

// Custom node component
const CustomNode = ({ data, id }: { data: any; id: string }) => {
  const [isExpanding, setIsExpanding] = useState(false);

  const handleExpand = async () => {
    if (!data.hasChildren || isExpanding) return;

    setIsExpanding(true);
    try {
      await data.onExpand?.(id);
    } catch (error) {
      console.error("Error expanding node:", error);
    } finally {
      setIsExpanding(false);
    }
  };

  const getNodeStyle = () => {
    const baseStyle = {
      padding: "12px",
      borderRadius: "8px",
      border: "2px solid",
      color: "white",
      fontSize: "12px",
      fontWeight: "bold",
      textAlign: "center" as const,
      cursor: data.hasChildren ? "pointer" : "default",
      minWidth: "150px",
      minHeight: "60px",
      display: "flex",
      flexDirection: "column" as const,
      justifyContent: "center",
      alignItems: "center",
      position: "relative" as const,
    };

    switch (data.type) {
      case "center":
        return {
          ...baseStyle,
          backgroundColor: "#dc2626",
          borderColor: "#991b1b",
          fontSize: "14px",
          minWidth: "180px",
          minHeight: "80px",
        };
      case "main":
        return {
          ...baseStyle,
          backgroundColor: "#7c3aed",
          borderColor: "#5b21b6",
          fontSize: "13px",
          minWidth: "160px",
          minHeight: "70px",
        };
      case "sub":
        return {
          ...baseStyle,
          backgroundColor: "#059669",
          borderColor: "#047857",
          fontSize: "12px",
        };
      case "detail":
        return {
          ...baseStyle,
          backgroundColor: "#0891b2",
          borderColor: "#0e7490",
          fontSize: "11px",
          minWidth: "140px",
          minHeight: "50px",
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div style={getNodeStyle()} onDoubleClick={handleExpand}>
      <div style={{ wordBreak: "break-word", textAlign: "center" }}>
        {data.label}
      </div>
      {data.hasChildren && (
        <div
          style={{
            position: "absolute",
            bottom: "4px",
            right: "4px",
            opacity: 0.8,
            fontSize: "10px",
          }}
        >
          {isExpanding ? "..." : "+"}
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const MindMap = ({ data, query, onNodeExpand }: MindMapProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [newNodeLabel, setNewNodeLabel] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [layoutDirection, setLayoutDirection] = useState<"TB" | "LR">("TB");

  // Convert mind map data to React Flow format
  const convertToReactFlowFormat = useCallback(
    (mindMapData: { nodes: MindMapNode[]; edges: MindMapEdge[] }) => {
      const flowNodes: Node[] = mindMapData.nodes.map((node) => ({
        id: node.id,
        type: "custom",
        position: { x: 0, y: 0 }, // Will be set by layout
        data: {
          label: node.label,
          type: node.type,
          level: node.level,
          hasChildren: node.hasChildren,
          onExpand: handleNodeExpand,
        },
      }));

      const flowEdges: Edge[] = mindMapData.edges.map((edge, index) => ({
        id: `edge-${edge.source}-${edge.target}-${index}`,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        style: { stroke: "#64748b", strokeWidth: 2 },
        markerEnd: {
          type: "arrow",
          color: "#64748b",
        },
      }));

      return { nodes: flowNodes, edges: flowEdges };
    },
    []
  );

  // Update nodes and edges when data changes
  useEffect(() => {
    if (data) {
      const { nodes: flowNodes, edges: flowEdges } =
        convertToReactFlowFormat(data);
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(flowNodes, flowEdges, layoutDirection);

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [data, convertToReactFlowFormat, layoutDirection, setNodes, setEdges]);

  const handleNodeExpand = useCallback(
    async (nodeId: string) => {
      try {
        if (onNodeExpand) {
          await onNodeExpand(nodeId);
        } else {
          // Fallback to using the aiService directly
          const { aiService } = await import("@/services/aiService");
          const expandedData = await aiService.expandMindMapNode(
            nodeId,
            data,
            query || ""
          );

          toast({
            title: "Node Expanded",
            description: "Additional details have been generated.",
          });

          console.log("Expanded data:", expandedData);
        }
      } catch (error) {
        console.error("Error expanding node:", error);
        toast({
          title: "Expansion Failed",
          description: "Failed to expand node. Please try again.",
          variant: "destructive",
        });
      }
    },
    [onNodeExpand, data, query]
  );

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = useCallback(() => {
    if (!newNodeLabel.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a label for the new node.",
        variant: "destructive",
      });
      return;
    }

    const newNodeId = `node_${Date.now()}`;
    const targetNodeId =
      selectedNodeId || nodes.find((n) => n.data.type === "center")?.id;

    if (!targetNodeId) {
      toast({
        title: "No Target",
        description: "Please select a parent node first.",
        variant: "destructive",
      });
      return;
    }

    const newNode: Node = {
      id: newNodeId,
      type: "custom",
      position: { x: 0, y: 0 },
      data: {
        label: newNodeLabel,
        type: "sub",
        level: 3,
        hasChildren: false,
        onExpand: handleNodeExpand,
      },
    };

    const newEdge: Edge = {
      id: `edge-${targetNodeId}-${newNodeId}`,
      source: targetNodeId,
      target: newNodeId,
      type: "smoothstep",
      style: { stroke: "#64748b", strokeWidth: 2 },
      markerEnd: {
        type: "arrow",
        color: "#64748b",
      },
    };

    const updatedNodes = [...nodes, newNode];
    const updatedEdges = [...edges, newEdge];

    // Re-layout with new node
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      updatedNodes,
      updatedEdges,
      layoutDirection
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setNewNodeLabel("");

    toast({
      title: "Node Added",
      description: "New node has been added to the mind map.",
    });
  }, [
    newNodeLabel,
    selectedNodeId,
    nodes,
    edges,
    layoutDirection,
    setNodes,
    setEdges,
    handleNodeExpand,
  ]);

  const deleteNode = useCallback(() => {
    if (!selectedNodeId) {
      toast({
        title: "No Selection",
        description: "Please select a node to delete.",
        variant: "destructive",
      });
      return;
    }

    const selectedNode = nodes.find((n) => n.id === selectedNodeId);
    if (selectedNode?.data.type === "center") {
      toast({
        title: "Cannot Delete",
        description: "The center node cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    const updatedNodes = nodes.filter((n) => n.id !== selectedNodeId);
    const updatedEdges = edges.filter(
      (e) => e.source !== selectedNodeId && e.target !== selectedNodeId
    );

    // Re-layout after deletion
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      updatedNodes,
      updatedEdges,
      layoutDirection
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setSelectedNodeId(null);

    toast({
      title: "Node Deleted",
      description: "Selected node has been removed.",
    });
  }, [selectedNodeId, nodes, edges, layoutDirection, setNodes, setEdges]);

  const toggleLayout = useCallback(() => {
    const newDirection = layoutDirection === "TB" ? "LR" : "TB";
    setLayoutDirection(newDirection);

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      newDirection
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutDirection, nodes, edges, setNodes, setEdges]);

  const exportAsImage = useCallback(() => {
    // This would need to be implemented with html2canvas or similar
    toast({
      title: "Export Feature",
      description:
        "Export functionality will be implemented in the next iteration.",
    });
  }, []);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-800/50">
      {/* Controls */}
      <Card className="m-4 p-4 glass-effect border-gray-700/50">
        <div className="space-y-3">
          <div className="flex space-x-2">
            <Input
              placeholder="Add new node..."
              value={newNodeLabel}
              onChange={(e) => setNewNodeLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNode()}
              className="glass-effect border-white/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
            />
            <Button
              onClick={addNode}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <Button
                onClick={deleteNode}
                size="sm"
                variant="destructive"
                disabled={!selectedNodeId}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              <Button
                onClick={toggleLayout}
                size="sm"
                variant="outline"
                className="glass-effect border-white/20 text-white hover:bg-white/10 shrink-0"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                {layoutDirection === "TB" ? "Horizontal" : "Vertical"}
              </Button>
              <Button
                onClick={exportAsImage}
                size="sm"
                variant="outline"
                className="glass-effect border-white/20 text-white hover:bg-white/10 shrink-0"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>

            <div className="text-white text-sm">
              {selectedNodeId ? (
                <span className="px-2 py-1 glass-effect rounded">
                  Selected:{" "}
                  {nodes.find((n) => n.id === selectedNodeId)?.data.label}
                </span>
              ) : (
                <span className="text-gray-400">Click a node to select</span>
              )}
            </div>
          </div>

          <div className="text-sm text-gray-300 p-2 glass-effect rounded">
            <strong>Instructions:</strong> Double-click nodes with "+" to expand
            • Drag nodes to reposition • Use mouse wheel to zoom
          </div>
        </div>
      </Card>

      {/* React Flow Mind Map */}
      <div className="flex-1 bg-gray-800/50 border-t border-gray-700/50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="top-right"
          className="bg-gray-900"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(120, 119, 198, 0.1) 0%, rgba(15, 23, 42, 0.9) 50%)",
          }}
        >
          <Controls className="bg-gray-800 border-gray-600" />
          <MiniMap
            className="bg-gray-800 border-gray-600"
            nodeColor={(node) => {
              switch (node.data?.type) {
                case "center":
                  return "#dc2626";
                case "main":
                  return "#7c3aed";
                case "sub":
                  return "#059669";
                case "detail":
                  return "#0891b2";
                default:
                  return "#4f46e5";
              }
            }}
          />
          <Background color="#374151" gap={16} />
        </ReactFlow>
      </div>
    </div>
  );
};

const MindMapWithProvider = (props: MindMapProps) => (
  <ReactFlowProvider>
    <MindMap {...props} />
  </ReactFlowProvider>
);

export default MindMapWithProvider;
