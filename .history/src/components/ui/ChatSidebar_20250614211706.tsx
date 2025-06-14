import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  PanelLeft,
  MessageSquare,
  Plus,
  Trash2,
  Clock,
  FileText,
  Brain,
  Map,
  Search,
  X,
  ChevronRight,
  Archive,
  Home
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { chatSessionStorage, type ChatSessionSummary } from '@/services/chatSessionStorage';

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onToggle,
  currentSessionId,
  onSessionSelect,
  onNewChat,
}) => {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadChatSessions();
  }, []);

  // Refresh sessions when currentSessionId changes (new session created)
  useEffect(() => {
    if (currentSessionId) {
      loadChatSessions();
    }
  }, [currentSessionId]);

  const loadChatSessions = () => {
    try {
      const loadedSessions = chatSessionStorage.getAllSessions();
      setSessions(loadedSessions);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      toast({
        title: 'Load Error',
        description: 'Could not load chat sessions',
        variant: 'destructive',
      });
    }
  };

  const createNewSession = () => {
    try {
      onNewChat();
      navigate('/', { replace: true });
      if (isOpen) onToggle(); // Close sidebar on mobile
      toast({
        title: 'New Chat Started',
        description: 'Ready for a fresh conversation',
      });
    } catch (error) {
      console.error('Error creating new session:', error);
      toast({
        title: 'Error',
        description: 'Could not create new session',
        variant: 'destructive',
      });
    }
  };

  const selectSession = (sessionId: string) => {
    try {
      onSessionSelect(sessionId);
      if (isOpen) onToggle(); // Close sidebar on mobile
      toast({
        title: 'Session Loaded',
        description: 'Chat session has been restored',
      });
    } catch (error) {
      console.error('Error selecting session:', error);
      toast({
        title: 'Load Error',
        description: 'Could not load the selected session',
        variant: 'destructive',
      });
    }
  };

  const deleteSession = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      chatSessionStorage.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      // If deleting current session, create new chat
      if (sessionId === currentSessionId) {
        createNewSession();
      }
      
      toast({
        title: 'Session Deleted',
        description: 'Chat session and associated data removed',
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Delete Failed',
        description: 'Could not delete the session',
        variant: 'destructive',
      });
    }
  };

  const clearAllSessions = () => {
    try {
      chatSessionStorage.clearAllSessions();
      setSessions([]);
      createNewSession();
      
      toast({
        title: 'All Sessions Cleared',
        description: 'All chat history has been removed',
      });
    } catch (error) {
      console.error('Error clearing sessions:', error);
      toast({
        title: 'Clear Failed',
        description: 'Could not clear all sessions',
        variant: 'destructive',
      });
    }
  };

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.originalQuery.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full bg-slate-900 border-r border-slate-700 z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } w-80 lg:w-80`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Chat History</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* New Chat Button */}
            <Button
              onClick={createNewSession}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Sessions List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredSessions.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  {searchTerm ? 'No matching chats found' : 'No chat history yet'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => selectSession(session.id)}
                      className={`group p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                        session.id === currentSessionId
                          ? 'bg-blue-600/20 border border-blue-500/30'
                          : 'bg-slate-800/50 hover:bg-slate-700/50 border border-transparent hover:border-slate-600/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-white truncate">
                            {session.title}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {truncateText(session.originalQuery)}
                          </p>
                          
                          {/* Metadata */}
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3 text-slate-500" />
                              <span className="text-xs text-slate-500">{session.messageCount}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-500" />
                              <span className="text-xs text-slate-500">{formatDate(session.lastUpdated)}</span>
                            </div>
                          </div>
                          
                          {/* Features badges */}
                          <div className="flex items-center gap-1 mt-2">
                            {session.hasFiles && (
                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                <FileText className="h-2 w-2 mr-1" />
                                Files
                              </Badge>
                            )}
                            {session.hasMindMap && (
                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                <Map className="h-2 w-2 mr-1" />
                                Map
                              </Badge>
                            )}
                            {session.hasThinking && (
                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                <Brain className="h-2 w-2 mr-1" />
                                AI
                              </Badge>
                            )}
                            {session.isAutonomous && (
                              <Badge variant="outline" className="text-xs px-1 py-0 border-purple-500 text-purple-400">
                                Auto
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => deleteSession(session.id, e)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto text-slate-400 hover:text-red-400"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <ChevronRight className="h-3 w-3 text-slate-500" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          {sessions.length > 0 && (
            <div className="p-4 border-t border-slate-700">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllSessions}
                className="w-full text-slate-400 hover:text-red-400 hover:bg-red-900/20"
              >
                <Archive className="h-4 w-4 mr-2" />
                Clear All History
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ChatSidebar;
