import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Brain } from "lucide-react";
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
  sourceType: "Academic" | "Government" | "News" | "Research" | "Web";
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
            <p className="text-lg leading-relaxed break-words">{message.content}</p>
            {/* Display structured file information */}
            {message.files && message.files.length > 0 && (
              <div className="mt-3 pt-3 border-t border-emerald-500/30">
                <p className="text-sm text-slate-300 mb-2 flex items-center">
                  <FileText className="h-4 w-4 mr-2 opacity-80" />
                  Attached files:
                </p>
                <div className="flex flex-wrap gap-2">
                  {message.files.map((file: { name: string, type: string }, index: number) => (
                    <div
                      key={index}
                      className="bg-slate-700/50 text-xs text-slate-300 px-2.5 py-1.5 rounded-lg flex items-center border border-slate-600/70"
                      title={`Type: ${file.type}`}
                    >
                      <FileText className="h-3.5 w-3.5 mr-1.5 text-emerald-400/70" />
                      <span className="break-all">{file.name}</span>
                    </div>
                  ))}
                </div>
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
              </div>{" "}
              {message.sources && (
                <div className="border-t border-slate-700/50 pt-4 mt-6">
                  <h4 className="font-medium text-cyan-400 mb-3">Sources:</h4>
                  <ul className="space-y-2">
                    {message.sources.map((source, index) => (
                      <li key={index} className="text-sm">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                           className="text-slate-300 hover:text-cyan-400 transition-colors hover:underline break-all"
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
          {/* View Thinking Button for AI messages */}
          {message.type === 'ai' && hasThinkingData(message.id) && (
            <div className="flex justify-end mt-4 pt-4 border-t border-slate-700/50">
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-slate-400 hover:text-slate-200 border-slate-600 hover:border-slate-500"
                onClick={() => onViewThinking(message.id)}
              >
                <Brain className="h-3.5 w-3.5 mr-2" />
                View Thinking
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default MessageBubble;
