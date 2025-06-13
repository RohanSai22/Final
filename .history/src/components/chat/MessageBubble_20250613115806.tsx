import React from "react";
import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";
import ThinkingProcess from "./ThinkingProcess";
import AutonomousThinkingProcess from "./AutonomousThinkingProcess";
import FinalReportDisplay from "./FinalReportDisplay";
import StreamingText from "./StreamingText";

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

interface Source {
  id: string;
  url: string;
  title: string;
  sourceType: 'Academic' | 'Government' | 'News' | 'Research' | 'Web';
}

interface ChatMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  files?: any[];
  thinking?: any[];
  thinkingStreamData?: ThinkingStreamData[];
  sources?: Source[];
  timestamp: Date;
  isAutonomous?: boolean;
}

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  if (message.type === "user") {
    return (
      <div className="flex justify-end">
        <Card className="max-w-3xl p-6 bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 text-white ml-auto border border-emerald-500/30 backdrop-blur-sm rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="space-y-3">
            <p className="text-lg leading-relaxed">{message.content}</p>
            {message.files && message.files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm opacity-80 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Attached Files:
                </p>
                {message.files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center p-3 bg-slate-700/40 rounded-2xl border border-slate-600/50"
                  >
                    <FileText className="h-4 w-4 text-emerald-400 mr-3" />
                    <span className="text-sm text-slate-300">{file.name}</span>
                    {file.wordCount && (
                      <span className="ml-auto text-xs text-slate-400">
                        {file.wordCount} words
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <Card className="max-w-3xl bg-slate-800/50 text-white border border-slate-700/50 backdrop-blur-sm p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="space-y-4">
          {message.isAutonomous && message.thinkingStreamData ? (
            <AutonomousThinkingProcess
              streamData={message.thinkingStreamData}
              isAutonomous={true}
              isVisible={true}
            />
          ) : message.thinking ? (
            <ThinkingProcess steps={message.thinking} isVisible={true} />
          ) : null}

          {message.isAutonomous ? (
            <FinalReportDisplay
              content={message.content}
              sources={message.sources || []}
              wordCount={message.content.split(" ").length}
              isAutonomous={true}
            />
          ) : (
            <>
              <div className="prose prose-invert max-w-none">
                <StreamingText content={message.content} />
              </div>              {message.sources && (
                <div className="border-t border-slate-700/50 pt-4 mt-6">
                  <h4 className="font-medium text-cyan-400 mb-3">Sources:</h4>
                  <ul className="space-y-2">
                    {message.sources.map((source, index) => (
                      <li key={index} className="text-sm">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-300 hover:text-cyan-400 transition-colors hover:underline"
                        >
                          {source.title}
                        </a>
                        <span className="ml-2 text-xs text-slate-500">
                          ({source.sourceType})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default MessageBubble;
