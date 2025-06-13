import React from "react";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Brain,
  ChevronDown,
  CheckCircle,
  Loader,
  Search,
  FileText,
  Target,
  BarChart,
  Lightbulb,
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
}

interface ThinkingProcessProps {
  steps: ThinkingStep[];
  isVisible: boolean;
}

const getStepIcon = (type: string) => {
  switch (type) {
    case "planning":
      return <Target className="h-4 w-4" />;
    case "researching":
      return <Search className="h-4 w-4" />;
    case "sources":
      return <BarChart className="h-4 w-4" />;
    case "analyzing":
      return <Brain className="h-4 w-4" />;
    case "replanning":
      return <Lightbulb className="h-4 w-4" />;
    case "file_processing":
      return <FileText className="h-4 w-4" />;
    default:
      return <Brain className="h-4 w-4" />;
  }
};

const getStepColor = (type: string) => {
  switch (type) {
    case "planning":
      return "text-blue-400";
    case "researching":
      return "text-green-400";
    case "sources":
      return "text-yellow-400";
    case "analyzing":
      return "text-purple-400";
    case "replanning":
      return "text-pink-400";
    case "file_processing":
      return "text-cyan-400";
    default:
      return "text-gray-400";
  }
};

const ThinkingProcess = ({ steps, isVisible }: ThinkingProcessProps) => {
  if (!isVisible || steps.length === 0) return null;

  return (
    <Card className="bg-gray-800/50 backdrop-blur-lg border-gray-700/50 shadow-xl">
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-700/30 transition-colors rounded-lg">
          <div className="flex items-center space-x-3">
            <Brain className="h-5 w-5 text-purple-400 animate-pulse" />
            <span className="text-white font-medium">AI Thinking Process</span>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4">
          <div className="space-y-3">
            {steps.map((step) => (
              <div
                key={step.id}
                className="flex items-start space-x-3 p-3 bg-gray-700/30 rounded-lg backdrop-blur-sm border border-gray-600/30"
              >
                <div className={`${getStepColor(step.type)} mt-0.5`}>
                  {step.status === "complete" ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : step.status === "processing" ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    getStepIcon(step.type)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-white text-sm">
                      {step.title}
                    </h4>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        step.status === "complete"
                          ? "bg-green-400/20 text-green-300"
                          : step.status === "processing"
                          ? "bg-blue-400/20 text-blue-300"
                          : "bg-gray-400/20 text-gray-400"
                      }`}
                    >
                      {step.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mt-1 leading-relaxed">
                    {step.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ThinkingProcess;
