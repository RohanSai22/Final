// =====================================================================================
// PERFECT MIND MAP COMPONENT - SOPHISTICATED HIERARCHICAL VISUALIZATION
// Complete implementation of the layered architecture with professional UI
// Inspired by advanced mind map systems with intelligent caching and performance
// =====================================================================================

import React, {
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
} from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  BackgroundVariant,
  Panel,
  useReactFlow,
  NodeMouseHandler,
  Edge,
  MarkerType,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import html2canvas from "html2canvas";

import { perfectNodeTypes } from "@/components/mindmap/PerfectMindMapNodes";
import {
  perfectMindMapService,
  PerfectMindMapData,
  PerfectMindMapNode,
  PerfectMindMapEdge,
} from "@/services/perfectMindMapService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  RefreshCw,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
  Eye,
  EyeOff,
  Brain,
  Share2,
  X,
} from "lucide-react";
import type { ChatMessage } from "@/services/chatSessionStorage";

interface PerfectMindMapProps {
  messages: ChatMessage[];
  uploadedFiles: any[];
  sessionId: string;
  originalQuery?: string;
  onMindMapGenerated?: (mindMapData: PerfectMindMapData) => void;
  className?: string;
}

interface DetailsPanelData {
  node: PerfectMindMapNode;
  position: { x: number; y: number };
}

const PerfectMindMapContent: React.FC<PerfectMindMapProps> = ({
  messages,
  uploadedFiles,
  sessionId,
  originalQuery = "",
  onMindMapGenerated,
  className = "",
}) => {
  // ReactFlow state management
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  // Component state
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedNode, setSelectedNode] = useState<PerfectMindMapNode | null>(
    null
  );
  const [showDetails, setShowDetails] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mindMapData, setMindMapData] = useState<PerfectMindMapData | null>(
    null
  );
  const [layerVisibility, setLayerVisibility] = useState({
    layer1: true, // Central
    layer2: true, // Branches
    layer3: true, // Files/Queries
    layer4: true, // Analysis
  });

  // Performance optimization with caching
  const mindMapCache = useRef<{
    hash: string;
    data: PerfectMindMapData;
  } | null>(null);
  const currentDataHash = useRef<string>("");

  // =====================================================================================
  // DATA HASH CALCULATION FOR SMART CACHING
  // =====================================================================================

  const calculateDataHash = useCallback(
    (messages: ChatMessage[], files: any[]) => {
      if (!messages || messages.length === 0) return "empty";
      return JSON.stringify({
        messageCount: messages.length,
        fileCount: files.length,
        messageIds: messages.slice(0, 5).map((m) => m.id || ""),
        fileNames: files.slice(0, 5).map((f) => f.name || ""),
      });
    },
    []
  );

  // =====================================================================================
  // MIND MAP GENERATION WITH INTELLIGENT CACHING
  // =====================================================================================

  const generateMindMap = useCallback(async () => {
    if (!messages || messages.length === 0) {
      setNodes([]);
      setEdges([]);
      setMindMapData(null);
      return;
    }

    setIsGenerating(true);

    try {
      // Calculate data hash for caching
      const dataHash = calculateDataHash(messages, uploadedFiles);
      currentDataHash.current = dataHash;

      // Check cache for performance optimization
      if (mindMapCache.current && mindMapCache.current.hash === dataHash) {
        console.log("🎯 Using cached mind map for optimal performance");
        const cachedData = mindMapCache.current.data;
        setMindMapData(cachedData);
        setNodes(cachedData.nodes);
        setEdges(convertToReactFlowEdges(cachedData.edges));
        onMindMapGenerated?.(cachedData);
        return;
      }

      console.log("🚀 Generating new perfect mind map...");

      // Generate perfect mind map
      const perfectedMindMapData =
        await perfectMindMapService.generatePerfectMindMap(
          messages,
          sessionId,
          uploadedFiles,
          originalQuery
        );

      // Cache the result
      mindMapCache.current = { hash: dataHash, data: perfectedMindMapData }; // Update state
      setMindMapData(perfectedMindMapData);
      setNodes(perfectedMindMapData.nodes);
      setEdges(convertToReactFlowEdges(perfectedMindMapData.edges));

      // Callback for parent component
      onMindMapGenerated?.(perfectedMindMapData);

      // Auto-fit view for optimal viewing with better spacing
      setTimeout(() => {
        fitView({
          padding: 0.3,
          maxZoom: 0.9,
          minZoom: 0.4,
          duration: 800,
        });
      }, 200);

      toast({
        title: "🧠 Perfect Mind Map Generated",
        description: `Successfully created ${perfectedMindMapData.nodes.length} nodes across ${perfectedMindMapData.metadata.totalLayers} layers`,
      });
    } catch (error) {
      console.error("Error generating perfect mind map:", error);
      toast({
        title: "Generation Error",
        description: "Failed to generate mind map. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [
    messages,
    uploadedFiles,
    sessionId,
    originalQuery,
    onMindMapGenerated,
    calculateDataHash,
    fitView,
  ]);

  // =====================================================================================
  // LAYER VISIBILITY CONTROL
  // =====================================================================================

  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      const level = node.data.level;
      switch (level) {
        case 1:
          return layerVisibility.layer1;
        case 2:
          return layerVisibility.layer2;
        case 3:
          return layerVisibility.layer3;
        case 4:
          return layerVisibility.layer4;
        default:
          return true;
      }
    });
  }, [nodes, layerVisibility]);

  const filteredEdges = useMemo(() => {
    const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));
    return edges.filter(
      (edge) =>
        visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );
  }, [edges, filteredNodes]);

  // =====================================================================================
  // NODE INTERACTION HANDLERS
  // =====================================================================================

  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    setSelectedNode(node as PerfectMindMapNode);
    setShowDetails(true);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setShowDetails(false);
  }, []);

  // =====================================================================================
  // EXPORT AND SHARING FUNCTIONALITY
  // =====================================================================================

  const downloadAsPNG = useCallback(async () => {
    setIsSharing(true);
    try {
      const mindMapElement = document.querySelector(
        ".react-flow"
      ) as HTMLElement;
      if (mindMapElement) {
        const canvas = await html2canvas(mindMapElement, {
          backgroundColor: "#f8fafc",
          scale: 2, // High DPI for crisp images
          logging: false,
          useCORS: true,
          allowTaint: true,
        });

        const link = document.createElement("a");
        link.download = `perfect-mind-map-${
          new Date().toISOString().split("T")[0]
        }.png`;
        link.href = canvas.toDataURL();
        link.click();

        toast({
          title: "📸 Mind Map Exported",
          description: "High-quality PNG downloaded successfully!",
        });
      }
    } catch (error) {
      console.error("Error generating PNG:", error);
      toast({
        title: "Export Error",
        description: "Failed to export mind map.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  }, []);

  const shareToSocial = useCallback(async () => {
    if (!navigator.share) {
      toast({
        title: "Sharing Not Supported",
        description: "Web Share API not available on this device.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.share({
        title: "My Perfect Mind Map",
        text: "Check out my AI-generated mind map from Novah Insight Forge!",
        url: window.location.href,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  }, []);

  // =====================================================================================
  // COLOR SYSTEM FOR MINIMAP
  // =====================================================================================

  const getNodeColor = useCallback((node: any) => {
    switch (node.data.level) {
      case 1:
        return "#8B5CF6"; // Purple - Central
      case 2:
        return "#3B82F6"; // Blue - Branches
      case 3:
        return "#10B981"; // Green - Files/Queries
      case 4:
        return "#EC4899"; // Pink - Analysis
      default:
        return "#6B7280"; // Gray - Fallback
    }
  }, []);

  // =====================================================================================
  // TYPE CONVERSION UTILITIES
  // =====================================================================================  // Convert PerfectMindMapEdge to ReactFlow Edge format
  const convertToReactFlowEdges = useCallback(
    (perfectEdges: PerfectMindMapEdge[]): Edge[] => {
      return perfectEdges.map((edge) => {
        // Map custom edge types to standard React Flow types
        let reactFlowType: string;
        switch (edge.type) {
          case "hierarchical":
            reactFlowType = "smoothstep";
            break;
          case "related":
            reactFlowType = "bezier";
            break;
          case "analysis":
            reactFlowType = "step";
            break;
          default:
            reactFlowType = "smoothstep";
        }

        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: reactFlowType,
          label: edge.label,
          animated: edge.animated,
          style: edge.style,
          labelStyle: edge.labelStyle,
          markerEnd: edge.markerEnd
            ? {
                type: MarkerType.ArrowClosed,
                color: edge.markerEnd.color,
              }
            : undefined,
        };
      });
    },
    []
  );

  // =====================================================================================
  // EFFECTS
  // =====================================================================================

  // Generate mind map when data changes
  useEffect(() => {
    if (messages && messages.length > 0) {
      generateMindMap();
    }
  }, [generateMindMap]);

  // =====================================================================================
  // RENDER
  // =====================================================================================
  return (
    <div
      className={`perfect-mind-map h-full w-full relative ${className} ${
        isFullscreen ? "fixed inset-0 z-50 bg-white" : ""
      }`}
    >
      {" "}
      <ReactFlow
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={perfectNodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{
          padding: 0.3,
          maxZoom: 0.9,
          minZoom: 0.4,
        }}
        className="bg-gradient-to-br from-slate-50 to-blue-50"
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnScroll={true}
        selectionOnDrag={false}
        panOnDrag={[1, 2]}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        minZoom={0.2}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
      >
        {/* Enhanced Controls */}
        <Controls
          className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg"
          showInteractive={false}
        />
        {/* Intelligent MiniMap */}
        <MiniMap
          className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg"
          zoomable
          pannable
          nodeColor={getNodeColor}
        />
        {/* Subtle Background */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#e2e8f0"
        />{" "}
        {/* Control Panel */}
        <Panel position="top-left" className="m-4">
          <Card className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-600" />
                Perfect Mind Map
                {isFullscreen && (
                  <Button
                    onClick={() => setIsFullscreen(false)}
                    size="sm"
                    variant="ghost"
                    className="ml-auto h-6 w-6 p-0"
                    title="Exit Fullscreen"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {/* Generation Controls */}
              <div className="flex gap-2">
                <Button
                  onClick={generateMindMap}
                  disabled={isGenerating}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="w-3 h-3 mr-1" />
                  )}
                  Regenerate
                </Button>
                <Button
                  onClick={downloadAsPNG}
                  disabled={isSharing || !mindMapData}
                  size="sm"
                  variant="outline"
                >
                  {isSharing ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                </Button>{" "}
                <Button
                  onClick={shareToSocial}
                  disabled={!mindMapData}
                  size="sm"
                  variant="outline"
                >
                  <Share2 className="w-3 h-3" />
                </Button>
                <Button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  disabled={!mindMapData}
                  size="sm"
                  variant="outline"
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  <Maximize2 className="w-3 h-3" />
                </Button>
              </div>

              <Separator />

              {/* Layer Visibility Controls */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-600">
                  Layer Visibility
                </div>

                {[
                  {
                    key: "layer1",
                    label: "Central Brain",
                    color: "text-purple-600",
                  },
                  {
                    key: "layer2",
                    label: "Categories",
                    color: "text-blue-600",
                  },
                  { key: "layer3", label: "Items", color: "text-green-600" },
                  { key: "layer4", label: "Analysis", color: "text-pink-600" },
                ].map(({ key, label, color }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className={`text-xs ${color}`}>{label}</span>
                    <Button
                      onClick={() =>
                        setLayerVisibility((prev) => ({
                          ...prev,
                          [key]: !prev[key as keyof typeof prev],
                        }))
                      }
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                    >
                      {layerVisibility[key as keyof typeof layerVisibility] ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>

              {/* Statistics */}
              {mindMapData && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-600">
                      Statistics
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Nodes:</span>
                      <Badge variant="secondary" className="text-xs">
                        {mindMapData.metadata.nodeCount}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Files:</span>
                      <Badge variant="secondary" className="text-xs">
                        {mindMapData.metadata.filesCount}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Queries:</span>
                      <Badge variant="secondary" className="text-xs">
                        {mindMapData.metadata.queriesCount}
                      </Badge>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </Panel>
        {/* Node Details Panel */}
        {showDetails && selectedNode && (
          <Panel position="top-right" className="m-4">
            <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl w-80 max-h-96 overflow-y-auto">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    Node Details
                  </CardTitle>
                  <Button
                    onClick={() => setShowDetails(false)}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {/* Node Type Badge */}
                <Badge
                  variant="secondary"
                  className={`
                    ${
                      selectedNode.data.level === 1
                        ? "bg-purple-100 text-purple-700"
                        : ""
                    }
                    ${
                      selectedNode.data.level === 2
                        ? "bg-blue-100 text-blue-700"
                        : ""
                    }
                    ${
                      selectedNode.data.level === 3
                        ? "bg-green-100 text-green-700"
                        : ""
                    }
                    ${
                      selectedNode.data.level === 4
                        ? "bg-pink-100 text-pink-700"
                        : ""
                    }
                  `}
                >
                  Layer {selectedNode.data.level} - {selectedNode.data.nodeType}
                </Badge>

                {/* Main Label */}
                <div>
                  <div className="text-sm font-medium text-gray-800">
                    {selectedNode.data.label}
                  </div>
                </div>

                {/* Count Information */}
                {selectedNode.data.count !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Count:</span>
                    <Badge variant="outline">{selectedNode.data.count}</Badge>
                  </div>
                )}

                {/* Summary */}
                {selectedNode.data.summary && (
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      Summary
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      {selectedNode.data.summary}
                    </p>
                  </div>
                )}

                {/* Full Text for Queries */}
                {selectedNode.data.fullText && (
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      Full Question
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-2 rounded">
                      {selectedNode.data.fullText}
                    </p>
                  </div>
                )}

                {/* Content for Analysis */}
                {selectedNode.data.content && (
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      Analysis Content
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-2 rounded">
                      {selectedNode.data.content}
                    </p>
                  </div>
                )}

                {/* Keywords */}
                {selectedNode.data.keywords &&
                  selectedNode.data.keywords.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        Keywords
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedNode.data.keywords.map((keyword, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs"
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Timestamp */}
                {selectedNode.data.timestamp && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Date:</span>
                    <span className="text-xs text-gray-700">
                      {selectedNode.data.timestamp}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
};

// Wrapper component with ReactFlowProvider
const PerfectMindMap: React.FC<PerfectMindMapProps> = (props) => {
  return (
    <ReactFlowProvider>
      <PerfectMindMapContent {...props} />
    </ReactFlowProvider>
  );
};

export default PerfectMindMap;
