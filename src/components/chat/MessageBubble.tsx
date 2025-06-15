import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Brain, ChevronDown, ChevronUp } from "lucide-react";
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
  hasThinkingData: (messageId: string) => boolean;
  onViewThinking: (messageId: string) => void;
  loadThinkingData: (messageId: string) => ThinkingStreamData[] | null;
}

const MessageBubble = ({
  message,
  hasThinkingData,
  onViewThinking,
  loadThinkingData,
}: MessageBubbleProps) => {
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
  const [loadedThinkingData, setLoadedThinkingData] = useState<
    ThinkingStreamData[] | null
  >(null); // Load thinking data when dropdown is expanded
  const handleThinkingToggle = () => {
    console.log(
      "MessageBubble: Thinking toggle clicked for message:",
      message.id
    );

    if (!isThinkingExpanded) {
      // If expanding and no data is loaded yet, try to load it
      if (!message.thinkingStreamData && !loadedThinkingData) {
        console.log("MessageBubble: Attempting to load thinking data...");

        if (hasThinkingData(message.id)) {
          const thinkingData = loadThinkingData(message.id);
          if (thinkingData && thinkingData.length > 0) {
            console.log(
              "MessageBubble: Successfully loaded thinking data for message:",
              message.id,
              "Data points:",
              thinkingData.length
            );
            setLoadedThinkingData(thinkingData);
          } else {
            console.log(
              "MessageBubble: No thinking data found despite hasThinkingData returning true"
            );
          }
        } else {
          console.log(
            "MessageBubble: hasThinkingData returned false for message:",
            message.id
          );
        }
      } else {
        console.log("MessageBubble: Thinking data already available");
      }
    }
    setIsThinkingExpanded(!isThinkingExpanded);
  };
  // Get the thinking data to display
  const getThinkingDataToDisplay = () => {
    // First check if the message already has thinking data
    if (message.thinkingStreamData && message.thinkingStreamData.length > 0) {
      console.log(
        "MessageBubble: Using message's own thinking data:",
        message.thinkingStreamData.length,
        "items"
      );
      return message.thinkingStreamData;
    }

    // Then check if we loaded it from localStorage
    if (loadedThinkingData && loadedThinkingData.length > 0) {
      console.log(
        "MessageBubble: Using loaded thinking data:",
        loadedThinkingData.length,
        "items"
      );
      return loadedThinkingData;
    }

    console.log(
      "MessageBubble: No thinking data available for message:",
      message.id
    );
    return null;
  };

  if (message.type === "user") {
    return (
      <div className="flex justify-end">
        <Card className="max-w-3xl p-6 bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 text-white ml-auto border border-emerald-500/30 backdrop-blur-sm rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="space-y-3">
            <p className="text-lg leading-relaxed break-words">
              {message.content}
            </p>
            {/* Display structured file information */}
            {message.files && message.files.length > 0 && (
              <div className="mt-3 pt-3 border-t border-emerald-500/30">
                <p className="text-sm text-slate-300 mb-2 flex items-center">
                  <FileText className="h-4 w-4 mr-2 opacity-80" />
                  Attached files:
                </p>
                <div className="flex flex-wrap gap-2">
                  {message.files.map(
                    (file: { name: string; type: string }, index: number) => (
                      <div
                        key={index}
                        className="bg-slate-700/50 text-xs text-slate-300 px-2.5 py-1.5 rounded-lg flex items-center border border-slate-600/70"
                        title={`Type: ${file.type}`}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1.5 text-emerald-400/70" />
                        <span className="break-all">{file.name}</span>
                      </div>
                    )
                  )}
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
          {" "}
          {/* AI Thinking Process - Collapsible */}
          {message.type === "ai" && (
            <div className="border border-slate-700/50 rounded-xl p-4 bg-slate-900/30">
              <Button
                variant="ghost"
                size="sm"
                className="w-full flex items-center justify-between text-slate-300 hover:text-white hover:bg-slate-700/30 p-3"
                onClick={handleThinkingToggle}
              >
                <div className="flex items-center">
                  <Brain className="h-4 w-4 mr-2" />
                  <span className="font-medium">AI Thinking Process</span>
                </div>
                {isThinkingExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              {isThinkingExpanded && (
                <div className="mt-4 border-t border-slate-700/50 pt-4">
                  {(() => {
                    const thinkingDataToDisplay = getThinkingDataToDisplay();
                    console.log("MessageBubble: Displaying thinking data:", {
                      messageId: message.id,
                      hasThinkingStreamData: !!message.thinkingStreamData,
                      hasLoadedThinkingData: !!loadedThinkingData,
                      thinkingDataLength: thinkingDataToDisplay?.length || 0,
                      hasThinkingDataAvailable: hasThinkingData(message.id),
                    });

                    if (
                      thinkingDataToDisplay &&
                      thinkingDataToDisplay.length > 0
                    ) {
                      return (
                        <AutonomousThinkingProcess
                          streamData={thinkingDataToDisplay}
                          isAutonomous={true}
                          isVisible={true}
                        />
                      );
                    } else if (hasThinkingData(message.id)) {
                      return (
                        <div className="flex justify-center py-4">
                          <div className="text-slate-400 text-sm">
                            Loading thinking data...
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="text-slate-400 text-sm">
                          No thinking data available for this message
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
            </div>
          )}
          {/* Main AI Response Content */}
          {message.isAutonomous ? (
            <FinalReportDisplay
              content={message.content}
              sources={message.sources || []}
              wordCount={message.content.split(" ").length}
              isAutonomous={true}
            />
          ) : (
            <>
              <div
                className="prose prose-invert max-w-none ai-response-content"
                style={{ width: "100%", overflowWrap: "break-word" }}
              >
                <StreamingText content={message.content} />
              </div>
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
        </div>
      </Card>
    </div>
  );
};

export default MessageBubble;
