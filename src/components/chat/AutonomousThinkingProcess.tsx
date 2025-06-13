import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Circle,
  Clock,
  AlertCircle,
  Search,
  FileText,
  Brain,
  Target,
  Globe,
  BookOpen,
  Lightbulb,
  RefreshCw,
} from "lucide-react";

interface ThinkingStep {
  id: number;
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
  details?: string;
}

// New autonomous thinking data structure
interface ThinkingStreamData {
  type:
    | "status"
    | "sufficiency_check"
    | "plan"
    | "searching_start"
    | "source_found"
    | "learning"
    | "reflection"
    | "final_answer";
  data: any;
  timestamp: number;
}

interface ThinkingProcessProps {
  steps?: ThinkingStep[];
  streamData?: ThinkingStreamData[];
  isAutonomous?: boolean;
  isVisible?: boolean;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "complete":
      return <CheckCircle className="h-4 w-4 text-green-400" />;
    case "processing":
      return <Circle className="h-4 w-4 text-blue-400 animate-pulse" />;
    case "pending":
      return <Clock className="h-4 w-4 text-gray-400" />;
    default:
      return <Circle className="h-4 w-4 text-gray-400" />;
  }
};

const getStepIcon = (type: string) => {
  switch (type) {
    case "planning":
      return <Target className="h-4 w-4 text-blue-400" />;
    case "researching":
      return <Search className="h-4 w-4 text-green-400" />;
    case "sources":
      return <Globe className="h-4 w-4 text-yellow-400" />;
    case "analyzing":
      return <Brain className="h-4 w-4 text-purple-400" />;
    case "replanning":
      return <RefreshCw className="h-4 w-4 text-pink-400" />;
    case "file_processing":
      return <FileText className="h-4 w-4 text-cyan-400" />;
    default:
      return <Brain className="h-4 w-4 text-gray-400" />;
  }
};

const AutonomousThinkingStream = ({
  streamData,
}: {
  streamData: ThinkingStreamData[];
}) => {
  // Track source count for real-time display
  const sourceCount = streamData.filter(
    (item) => item.type === "source_found"
  ).length;
  const isResearching = streamData.some(
    (item) => item.type === "searching_start"
  );

  const renderStreamItem = (item: ThinkingStreamData, index: number) => {
    switch (item.type) {
      case "status":
        return (
          <div
            key={index}
            className="flex items-center space-x-3 p-4 bg-blue-900/20 border border-blue-700/30 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="animate-spin">
              <Circle className="h-4 w-4 text-blue-400" />
            </div>
            <span className="text-blue-300 text-sm">{item.data.message}</span>
          </div>
        );

      case "sufficiency_check":
        return (
          <div
            key={index}
            className={`p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300 ${
              item.data.status === "sufficient"
                ? "bg-green-900/20 border-green-700/30"
                : "bg-yellow-900/20 border-yellow-700/30"
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className="mt-0.5">
                {item.data.status === "sufficient" ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                )}
              </div>
              <div>
                <h4 className="font-medium text-white text-sm mb-1">
                  Sufficiency Check
                </h4>
                <p
                  className={`text-sm ${
                    item.data.status === "sufficient"
                      ? "text-green-300"
                      : "text-yellow-300"
                  }`}
                >
                  {item.data.reason}
                </p>
              </div>
            </div>
          </div>
        );

      case "plan":
        return (
          <div
            key={index}
            className="p-4 bg-purple-900/20 border border-purple-700/30 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-start space-x-3">
              <Target className="h-5 w-5 text-purple-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-white text-sm mb-2">
                  Planning...
                </h4>
                <div className="space-y-1">
                  {item.data.queries.map((query: string, i: number) => (
                    <div
                      key={i}
                      className="text-sm text-purple-300 pl-3 border-l-2 border-purple-600/30"
                    >
                      {i + 1}. {query}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case "searching_start":
        return (
          <div
            key={index}
            className="p-3 bg-green-900/20 border border-green-700/30 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <Search className="h-4 w-4 text-green-400 animate-pulse" />
              <span className="text-green-300 text-sm">
                <strong>Searching:</strong> {item.data.query}
              </span>
            </div>
            <div className="mt-2 ml-7" id={`sources-${index}`}>
              {/* Sources will be dynamically added here */}
            </div>
          </div>
        );

      case "source_found":
        const source = item.data.source; // data.source contains the Source object
        if (!source || !source.url) return null;
        return (
          <div key={index} className="ml-7 text-xs py-1 flex items-center space-x-2 group transition-all hover:bg-slate-700/50 rounded-md p-1 -m-1">
            <Globe className="h-3.5 w-3.5 text-cyan-500 flex-shrink-0" />
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 hover:underline truncate"
              title={source.url}
            >
              {source.title || new URL(source.url).hostname}
            </a>
            {source.sourceType && (
              <Badge
                variant="outline"
                className="text-xs bg-slate-600 border-slate-500 text-slate-300 px-1.5 py-0.5 group-hover:border-cyan-500 transition-colors"
              >
                {source.sourceType}
              </Badge>
            )}
          </div>
        );

      case "learning":
        return (
          <div
            key={index}
            className="p-3 bg-cyan-900/20 border border-cyan-700/30 rounded-lg"
          >
            <div className="flex items-start space-x-3">
              <Lightbulb className="h-4 w-4 text-cyan-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-white text-sm mb-1">
                  Learning...
                </h4>
                <p className="text-sm text-cyan-300">{item.data.summary}</p>
              </div>
            </div>
          </div>
        );

      case "reflection":
        return (
          <div
            key={index}
            className="p-4 bg-pink-900/20 border border-pink-700/30 rounded-lg"
          >
            <div className="flex items-start space-x-3">
              <RefreshCw className="h-5 w-5 text-pink-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-white text-sm mb-1">
                  Status:{" "}
                  {item.data.status === "insufficient"
                    ? "Insufficient, replanning..."
                    : "Sufficient"}
                </h4>
                <p className="text-sm text-pink-300">{item.data.reason}</p>
                {item.data.action && (
                  <p className="text-xs text-pink-400 mt-1">
                    Action: {item.data.action}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {streamData.map((item, index) => renderStreamItem(item, index))}
    </div>
  );
};

const ClassicThinkingSteps = ({ steps }: { steps: ThinkingStep[] }) => {
  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div
          key={step.id}
          className="flex items-start space-x-3 p-3 bg-slate-700/30 rounded-lg"
        >
          <div className="mt-0.5">{getStatusIcon(step.status)}</div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              {getStepIcon(step.type)}
              <span className="text-white font-medium text-sm">
                {step.title}
              </span>
              <Badge variant="outline" className="text-xs">
                {step.status}
              </Badge>
            </div>
            <p className="text-sm text-slate-300">{step.content}</p>
            {step.details && (
              <p className="text-xs text-slate-400 mt-1">{step.details}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const ThinkingProcess = ({
  steps = [],
  streamData = [],
  isAutonomous = false,
  isVisible = true,
}: ThinkingProcessProps) => {
  if (!isVisible || (steps.length === 0 && streamData.length === 0)) {
    return null;
  }

  return (
    <Card className="bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm shadow-xl">
      {" "}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Brain className="h-5 w-5 text-purple-400 animate-pulse" />
            <h3 className="text-white font-medium">
              {isAutonomous ? "AI Thinking Stream" : "AI Thinking Process"}
            </h3>
            {isAutonomous && (
              <Badge
                variant="outline"
                className="text-xs bg-purple-900/30 border-purple-700/50 text-purple-300"
              >
                Autonomous Mode
              </Badge>
            )}
          </div>
          {isAutonomous && streamData.length > 0 && (
            <div className="flex items-center space-x-4 text-xs text-slate-400">
              {(() => {
                const sourceCount = streamData.filter(
                  (item) => item.type === "source_found"
                ).length;
                const isResearching = streamData.some(
                  (item) => item.type === "searching_start"
                );
                return (
                  <>
                    {sourceCount > 0 && (
                      <div className="flex items-center space-x-1">
                        <Globe className="h-3 w-3 text-cyan-400" />
                        <span>{sourceCount} sources found</span>
                      </div>
                    )}
                    {isResearching && (
                      <div className="flex items-center space-x-1">
                        <Search className="h-3 w-3 text-green-400 animate-pulse" />
                        <span>Researching...</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
      <div className="p-4">
        {isAutonomous ? (
          <AutonomousThinkingStream streamData={streamData} />
        ) : (
          <ClassicThinkingSteps steps={steps} />
        )}
      </div>
    </Card>
  );
};

export default ThinkingProcess;
