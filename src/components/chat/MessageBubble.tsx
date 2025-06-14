import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Brain, ChevronDown } from "lucide-react"; // Added ChevronDown
import ThinkingProcess from "./ThinkingProcess"; // For older 'thinking' steps
import AutonomousThinkingProcess from "./AutonomousThinkingProcess"; // For 'thinkingStreamData'
import FinalReportDisplay from "./FinalReportDisplay";
import StreamingText from "./StreamingText";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"; // Import Collapsible components
import {
  ChatMessage,
  ThinkingStreamData, // Now needed for props
  // Source, // Not directly used here
  UploadedFileMetadata,
} from "@/types/common";

interface MessageBubbleProps {
  message: ChatMessage;
  currentThinkingStreamData?: ThinkingStreamData[]; // Added
  isAutonomousMode?: boolean; // Added
  // Removed hasThinkingData and onViewThinking
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentThinkingStreamData,
  isAutonomousMode
}) => {
  if (message.type === "thinking") {
    return (
      <div className="flex justify-start"> {/* Typically AI-side, so justify-start */}
        <Card className="max-w-3xl bg-slate-800/30 text-white border-slate-700/30 p-4 rounded-3xl shadow-lg">
          <AutonomousThinkingProcess
            streamData={currentThinkingStreamData || []}
            isAutonomous={isAutonomousMode === undefined ? true : isAutonomousMode} // Default to true if undefined
            isVisible={true}
          />
        </Card>
      </div>
    );
  }

  if (message.type === "user") {
    return (
      <div className="flex justify-end">
        <Card className="max-w-3xl p-6 bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 text-white ml-auto border border-emerald-500/30 backdrop-blur-sm rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="space-y-3">
            <p className="text-lg leading-relaxed break-words">{message.content}</p>
            {message.files && message.files.length > 0 && (
              <div className="mt-3 pt-3 border-t border-emerald-500/30">
                <p className="text-sm text-slate-300 mb-2 flex items-center">
                  <FileText className="h-4 w-4 mr-2 opacity-80" />
                  Attached files:
                </p>
                <div className="flex flex-wrap gap-2">
                  {message.files.map((file: UploadedFileMetadata) => (
                    <div
                      key={file.id}
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

  // AI Message Bubble
  return (
    <div className="flex justify-start">
      <Card className="max-w-3xl bg-slate-800/50 text-white border border-slate-700/50 backdrop-blur-sm p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="space-y-4">
          {/* Display for older 'thinking' steps if present (and not autonomous, to avoid double display if both exist) */}
          {message.thinking && !message.isAutonomous && (
            <ThinkingProcess steps={message.thinking as any} isVisible={true} />
          )}

          {/* Main content display */}
          {message.isAutonomous ? (
            <FinalReportDisplay
              content={message.content}
              sources={message.sources || []}
              wordCount={message.content.split(" ").length}
              isAutonomous={true} // This prop might be redundant if FinalReportDisplay handles content based on structure
            />
          ) : (
            <>
              <div className="prose prose-invert max-w-none ai-response-content" style={{ width: '100%', overflowWrap: 'break-word' }}>
                <StreamingText content={message.content} />
              </div>
              {message.sources && message.sources.length > 0 && (
                <div className="border-t border-slate-700/50 pt-4 mt-6">
                  <h4 className="font-medium text-cyan-400 mb-3">Sources:</h4>
                  <ul className="space-y-2">
                    {message.sources.map((source, index) => (
                      <li key={source.id || index} className="text-sm">
                        <a
                          href={typeof source.content === 'string' && source.type === 'url' ? source.content : undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-slate-300 hover:text-cyan-400 transition-colors hover:underline break-all ${!(typeof source.content === 'string' && source.type === 'url') && "cursor-default no-underline hover:text-slate-300"}`}
                        >
                          {source.name || "Unnamed Source"}
                        </a>
                        {source.type !== 'url' && source.content && (
                            <p className="text-xs text-slate-400 mt-1 truncate" title={source.content}>
                                Preview: {source.content.substring(0,100)}{source.content.length > 100 && "..."}
                            </p>
                        )}
                        {source.metadata?.sourceType && (
                           <span className="ml-2 text-xs text-slate-500">
                             ({source.metadata.sourceType})
                           </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Collapsible Thinking Process for thinkingStreamData */}
          {message.thinkingStreamData && message.thinkingStreamData.length > 0 && (
            <Collapsible className="mt-4 pt-4 border-t border-slate-700/50">
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs text-slate-400 hover:text-slate-200 border-slate-600 hover:border-slate-500 w-full flex items-center justify-between">
                  <span>
                    <Brain className="h-3.5 w-3.5 mr-2 inline-block" />
                    Show Thinking Process
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 px-2 py-1 bg-slate-700/20 rounded-md">
                <AutonomousThinkingProcess
                  streamData={message.thinkingStreamData}
                  // isAutonomous might not be strictly necessary for AutonomousThinkingProcess if it just renders streamData
                  isAutonomous={message.isAutonomous || false}
                  isVisible={true}
                />
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </Card>
    </div>
  );
};

export default MessageBubble;
