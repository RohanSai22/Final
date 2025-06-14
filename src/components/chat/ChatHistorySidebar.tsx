import React from 'react';
import { ChatSession } from '@/types/common';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Trash2, MessageSquareText } from 'lucide-react'; // Added MessageSquareText for item icon

export interface ChatHistorySidebarProps {
  chatHistory: ChatSession[];
  currentSessionId: string | null;
  onSelectChat: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (sessionId: string) => void;
}

const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  chatHistory,
  currentSessionId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-800/50 border-r border-slate-700/50 text-white p-4 space-y-4">
      <Button
        onClick={onNewChat}
        variant="outline"
        className="w-full border-slate-600 hover:bg-slate-700 hover:text-white"
      >
        <PlusCircle className="mr-2 h-5 w-5" />
        New Chat
      </Button>
      <div className="flex-grow overflow-hidden"> {/* Added for ScrollArea proper sizing */}
        <ScrollArea className="h-full pr-3"> {/* Added pr-3 for scrollbar spacing */}
          <div className="space-y-2">
            {chatHistory.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No chat history yet.</p>
            )}
            {chatHistory.map((session) => (
              <div
                key={session.id}
                onClick={() => onSelectChat(session.id)}
                className={`
                  p-3 rounded-lg cursor-pointer transition-colors group
                  flex items-center justify-between
                  ${
                    session.id === currentSessionId
                      ? 'bg-slate-700/70 text-white shadow-md'
                      : 'hover:bg-slate-700/40 text-slate-300 hover:text-white'
                  }
                `}
              >
                <div className="flex items-center space-x-3 min-w-0"> {/* For truncation */}
                  <MessageSquareText className={`h-5 w-5 ${session.id === currentSessionId ? 'text-purple-400' : 'text-slate-500 group-hover:text-purple-300'}`} />
                  <span className="truncate text-sm font-medium">
                    {session.name || `Chat from ${new Date(session.messages[0]?.timestamp || session.id).toLocaleDateString()}`}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent onSelectChat from firing
                    onDeleteChat(session.id);
                  }}
                  className="h-7 w-7 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete chat"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default ChatHistorySidebar;
