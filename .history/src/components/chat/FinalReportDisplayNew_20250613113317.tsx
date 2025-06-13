import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  ExternalLink,
  Copy,
  CheckCircle,
  GraduationCap,
  Building,
  Newspaper,
  BookOpen,
  Globe,
  BarChart3,
  Network,
} from "lucide-react";
import { FinalReport, Source } from "@/services/autonomousResearchAgent";

interface FinalReportDisplayProps {
  report: FinalReport;
  onGenerateMindMap?: () => void;
  isGeneratingMindMap?: boolean;
}

const FinalReportDisplay: React.FC<FinalReportDisplayProps> = ({
  report,
  onGenerateMindMap,
  isGeneratingMindMap = false,
}) => {
  const [copiedText, setCopiedText] = useState(false);

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(report.content);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

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

  const formatReportContent = (content: string) => {
    // Add proper spacing around citations
    return content.replace(/\[(\d+)\]/g, " [$1] ");
  };

  const sourceTypeStats = report.sources.reduce((stats, source) => {
    stats[source.sourceType] = (stats[source.sourceType] || 0) + 1;
    return stats;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <Card className="rounded-3xl border-2 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-800">
                  Research Report
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Autonomous research completed • {report.wordCount} words •{" "}
                  {report.sources.length} sources
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyReport}
                className="rounded-xl"
              >
                {copiedText ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
              {onGenerateMindMap && (
                <Button
                  onClick={onGenerateMindMap}
                  disabled={isGeneratingMindMap}
                  size="sm"
                  className="rounded-xl bg-purple-600 hover:bg-purple-700"
                >
                  {isGeneratingMindMap ? (
                    <>
                      <BarChart3 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Network className="w-4 h-4 mr-2" />
                      Mind Map
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Report Content */}
      <Card className="rounded-3xl">
        <CardContent className="p-8">
          <div className="prose prose-gray max-w-none">
            <div className="text-gray-800 leading-relaxed text-base">
              {formatReportContent(report.content)
                .split("\n")
                .map((paragraph, index) => (
                  <p key={index} className="mb-4 last:mb-0">
                    {paragraph}
                  </p>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Source Statistics */}
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Source Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {Object.entries(sourceTypeStats).map(([type, count]) => (
              <div key={type} className="text-center">
                <div className="p-3 rounded-xl bg-gray-50 mb-2">
                  {getSourceIcon(type)}
                </div>
                <div className="text-2xl font-bold text-gray-800">{count}</div>
                <div className="text-sm text-gray-600">{type}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sources List */}
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Sources ({report.sources.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {report.sources.map((source, index) => (
              <div
                key={source.id}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-500 min-w-[2rem]">
                    [{index + 1}]
                  </span>
                  {getSourceIcon(source.sourceType)}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-800 truncate">
                      {source.title}
                    </p>
                    {source.url !== "User uploaded documents" ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                      >
                        <span className="truncate">{source.url}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <p className="text-sm text-gray-600 mt-1">
                        User uploaded files
                      </p>
                    )}
                  </div>
                </div>
                <Badge
                  className={`${getSourceColor(source.sourceType)} text-xs`}
                >
                  {source.sourceType}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinalReportDisplay;
