import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  FileText,
  Target,
  Globe,
  BookOpen,
  Newspaper,
  Building,
  GraduationCap,
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Helper function to process citations
const processCitations = (markdownContent: string, sourcesCount: number): string => {
  if (!markdownContent) return "";
  return markdownContent.replace(/\[(\d+)\]/g, (match, numberStr) => {
    const number = parseInt(numberStr, 10);
    if (number > 0 && number <= sourcesCount) {
      // Ensure the link text itself is also Markdown escaped if necessary,
      // but for "[N]" it's simple. Using `match` directly is fine.
      return `[${match}](#source-${number})`;
    }
    return match; // Return original if not a valid citation number
  });
};

interface Source {
  id: string;
  url: string;
  title: string;
  sourceType: "Academic" | "Government" | "News" | "Research" | "Web";
}

interface FinalReportProps {
  content: string;
  sources: Source[];
  wordCount: number;
  isAutonomous?: boolean;
}

// Function to determine source type and get appropriate icon
const getSourceInfo = (source: Source) => {
  const sourceType = source.sourceType;

  switch (sourceType) {
    case "Academic":
      return {
        icon: GraduationCap,
        type: "Academic",
        color: "text-purple-400",
      };
    case "Government":
      return { icon: Building, type: "Government", color: "text-blue-400" };
    case "News":
      return { icon: Newspaper, type: "News", color: "text-orange-400" };
    case "Research":
      return { icon: BookOpen, type: "Research", color: "text-green-400" };
    default:
      return { icon: Globe, type: "Web", color: "text-cyan-400" };
  }
};

const FinalReportDisplay = ({
  content,
  sources,
  wordCount,
  isAutonomous = false,
}: FinalReportProps) => {
  // Process content for clickable citations
  const processedContent = processCitations(content, sources.length);

  // Extract citations from original content for summary (optional, could be removed if redundant)
  const citationRegex = /\[(\d+)\]/g;
  const citations = [...content.matchAll(citationRegex)];

  return (
    <div className="space-y-4">
      {/* Report Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileText className="h-5 w-5 text-blue-400" />
          <h3 className="text-white font-medium">
            {isAutonomous ? "Autonomous Research Report" : "Research Report"}
          </h3>
          {isAutonomous && (
            <Badge
              variant="outline"
              className="bg-purple-900/30 border-purple-700/50 text-purple-300"
            >
              AI-Generated
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <Target className="h-3 w-3" />
          <span>{wordCount} words</span>
          {sources.length > 0 && (
            <>
              <span>•</span>
              <span>{sources.length} sources</span>
            </>
          )}
        </div>
      </div>{" "}
      {/* Report Content */}
      <Card className="bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="prose prose-invert prose-slate max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {processedContent}
          </ReactMarkdown>
        </div>
      </Card>
      {/* Sources Section */}
      {sources.length > 0 && (
        <Card className="bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="space-y-4">
            <h4 className="text-white font-medium flex items-center">
              <ExternalLink className="h-4 w-4 mr-2 text-cyan-400" />
              Sources & References ({sources.length})
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {sources.map((source, index) => {
                const { icon: Icon, type, color } = getSourceInfo(source);
                return (
                  <div
                    key={source.id || index} // Use source.id if available and unique, otherwise fallback to index
                    id={`source-${index + 1}`} // ID for linking
                    className="flex items-start space-x-3 p-4 bg-slate-700/30 rounded-2xl hover:bg-slate-700/50 transition-all duration-300 border border-slate-600/30 hover:border-cyan-500/50"
                  >
                    <div className="flex-shrink-0 pt-1"> {/* Adjusted padding for alignment */}
                      <span
                        className={`inline-flex items-center justify-center h-7 w-7 ${color} bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-medium rounded-full shadow-md`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>{" "}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors duration-200">
                        <span className="font-semibold">{index + 1}. </span>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline" // Minimal styling, rely on prose for link color
                        >
                          {source.title}
                        </a>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 break-all">
                        {source.url}
                      </div>
                    </div>
                    {/* Removed the small ExternalLink icon from here to reduce clutter, main link is clear */}
                  </div>
                );
              })}
            </div>

            {/* Citation Summary (optional, could be removed if deemed redundant by clickable in-text citations) */}
            {citations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <p className="text-xs text-slate-400 mb-2">
                  Citations found in original report text: {citations.length}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[...new Set(citations.map((c) => parseInt(c[1])))]
                    .sort((a, b) => a - b)
                    .map((citationNum) => (
                      <Badge
                        key={citationNum}
                        variant="outline"
                        className="bg-cyan-900/30 border-cyan-700/50 text-cyan-300 text-xs"
                      >
                        [{citationNum}]
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default FinalReportDisplay;
