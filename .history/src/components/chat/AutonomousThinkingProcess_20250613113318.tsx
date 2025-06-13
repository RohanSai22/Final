import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Brain,
  Search,
  FileText,
  CheckCircle,
  AlertCircle,
  Globe,
  BookOpen,
  Building,
  Newspaper,
  GraduationCap,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { ThinkingStreamData, Source } from "@/services/autonomousResearchAgent";

interface ThinkingProcessProps {
  streamData: ThinkingStreamData[];
  isActive: boolean;
}

const AutonomousThinkingProcess: React.FC<ThinkingProcessProps> = ({
  streamData,
  isActive,
}) => {
  const [displayedData, setDisplayedData] = useState<ThinkingStreamData[]>([]);

  useEffect(() => {
    if (streamData.length > displayedData.length) {
      const newItems = streamData.slice(displayedData.length);

      // Add items with a slight delay for smooth animation
      newItems.forEach((item, index) => {
        setTimeout(() => {
          setDisplayedData((prev) => [...prev, item]);
        }, index * 200);
      });
    }
  }, [streamData, displayedData.length]);

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case "Academic":
        return <GraduationCap className="w-4 h-4 text-purple-500" />;
      case "Government":
        return <Building className="w-4 h-4 text-blue-500" />;
      case "News":
        return <Newspaper className="w-4 h-4 text-orange-500" />;
      case "Research":
        return <BookOpen className="w-4 h-4 text-green-500" />;
      default:
        return <Globe className="w-4 h-4 text-cyan-500" />;
    }
  };

  const getSourceColor = (sourceType: string) => {
    switch (sourceType) {
      case "Academic":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Government":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "News":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "Research":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-cyan-100 text-cyan-800 border-cyan-200";
    }
  };

  const renderThinkingBlock = (item: ThinkingStreamData, index: number) => {
    const baseClasses =
      "rounded-3xl p-6 mb-4 animate-in slide-in-from-left-4 duration-500";

    switch (item.type) {
      case "status":
        return (
          <Card
            key={index}
            className={`${baseClasses} bg-blue-50 border-blue-200`}
          >
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800 font-medium">
                  {item.data.message}
                </span>
                {isActive && (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                )}
              </div>
            </CardContent>
          </Card>
        );

      case "sufficiency_check":
        return (
          <Card
            key={index}
            className={`${baseClasses} bg-amber-50 border-amber-200`}
          >
            <CardContent className="p-0">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-800 mb-2">
                    Sufficiency Check
                  </h4>
                  <p className="text-amber-700">
                    <strong>Status:</strong> {item.data.status}
                  </p>
                  <p className="text-amber-700 mt-1">{item.data.reason}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "plan":
        return (
          <Card
            key={index}
            className={`${baseClasses} bg-indigo-50 border-indigo-200`}
          >
            <CardContent className="p-0">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-indigo-800 mb-3">
                    Research Strategy
                  </h4>
                  <div className="space-y-2">
                    {item.data.queries.map((query: string, qIndex: number) => (
                      <div
                        key={qIndex}
                        className="bg-white rounded-xl p-3 border border-indigo-100"
                      >
                        <span className="text-indigo-700 text-sm">
                          {qIndex + 1}. {query}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "searching_start":
        return (
          <Card
            key={index}
            className={`${baseClasses} bg-emerald-50 border-emerald-200`}
          >
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-emerald-600" />
                <div>
                  <h4 className="font-semibold text-emerald-800">Searching</h4>
                  <p className="text-emerald-700 text-sm mt-1">
                    {item.data.query}
                  </p>
                </div>
                {isActive && (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                )}
              </div>
            </CardContent>
          </Card>
        );

      case "source_found":
        const source = item.data.source as Source;
        return (
          <Card
            key={index}
            className={`${baseClasses} bg-gray-50 border-gray-200`}
          >
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                {getSourceIcon(source.sourceType)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      className={`${getSourceColor(source.sourceType)} text-xs`}
                    >
                      {source.sourceType}
                    </Badge>
                  </div>
                  <p className="text-gray-800 text-sm font-medium truncate">
                    {source.title}
                  </p>
                  {source.url !== "User uploaded documents" && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                    >
                      <span className="truncate max-w-48">{source.url}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "learning":
        return (
          <Card
            key={index}
            className={`${baseClasses} bg-violet-50 border-violet-200`}
          >
            <CardContent className="p-0">
              <div className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-violet-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-violet-800 mb-2">
                    Learning
                  </h4>
                  <p className="text-violet-700 text-sm leading-relaxed">
                    {item.data.summary}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "reflection":
        return (
          <Card
            key={index}
            className={`${baseClasses} bg-rose-50 border-rose-200`}
          >
            <CardContent className="p-0">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-rose-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-rose-800 mb-2">
                    Autonomous Reflection
                  </h4>
                  <p className="text-rose-700">
                    <strong>Decision:</strong> {item.data.decision}
                  </p>
                  <p className="text-rose-700 mt-1 text-sm">
                    {item.data.reason}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card
            key={index}
            className={`${baseClasses} bg-gray-50 border-gray-200`}
          >
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700">Processing...</span>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">
          AI Thinking Process
        </h3>
        {isActive && (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            Active
          </Badge>
        )}
      </div>

      <Separator className="mb-4" />

      <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
        {displayedData.length === 0 && isActive && (
          <Card className="rounded-3xl p-6 bg-blue-50 border-blue-200">
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-blue-800">
                  Initializing autonomous research agent...
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {displayedData.map((item, index) => renderThinkingBlock(item, index))}

        {isActive && displayedData.length > 0 && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        )}
      </div>
    </div>
  );
};

export default AutonomousThinkingProcess;
