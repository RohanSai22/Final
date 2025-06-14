export interface UploadedFileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  status: "uploading" | "uploaded" | "error";
}

export interface ThinkingStreamData {
  id: string;
  type: "tool_code" | "tool_output" | "message" | "error";
  content: string;
  name?: string;
}

export interface Source {
  id: string;
  type: "document" | "url" | "text";
  name: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  type: "user" | "ai" | "thinking" | "error"; // Added "thinking" and "error" for completeness
  content: string;
  files?: UploadedFileMetadata[];
  thinkingStreamData?: ThinkingStreamData[];
  sources?: Source[];
  timestamp: Date | string;
  isAutonomous?: boolean;
}

export interface ThinkingStep {
  id: number; // Kept as number based on original file
  type:
    | "planning"
    | "researching"
    | "sources"
    | "analyzing"
    | "replanning"
    | "file_processing";
  title: string;
  content: string;
  status: "processing" | "complete" | "pending";
}

export interface UploadedFile {
  id: string;
  name: string;
  content: string; // Assuming this is file content, could be large
  type: string; // MIME type
  file: File; // Browser File object
  processed?: boolean;
  wordCount?: number;
  error?: string;
}

export interface ChatSession {
  id: string;
  name?: string;
  originalQuery?: string;
  uploadedFileMetadata?: UploadedFileMetadata[];
  isAutonomousMode?: boolean;
  messages: ChatMessage[];
  fullMindMapData?: MindMapData | null;
}

// --- Mind Map Types (from mindMapService.ts) ---

export interface MindMapNode {
  id: string;
  position: { x: number; y: number };
  data: {
    label: string;
    level: number;
    summary?: string;
    nodeType?:
      | "concept"
      | "Person"
      | "Organization"
      | "Location"
      | "Event"
      | "Other"
      | "detail"
      | "example"
      | "connection";
  };
  type?: string; // Usually 'custom' for React Flow nodes
  style?: { [key: string]: string | number };
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  animated: boolean;
  style?: { [key: string]: string | number };
  labelStyle?: { [key: string]: string | number };
}

export interface MindMapData {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}
