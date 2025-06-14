import React, { ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatHistorySidebar from "@/components/chat/ChatHistorySidebar";
import { useChat } from "@/contexts/ChatContext"; // Assuming ChatContext.tsx is in src/contexts

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const {
    chatHistory,
    currentSessionId,
    isSidebarOpen,
    isLoadingHistory,
    selectChat,
    newChat,
    deleteChat,
    toggleSidebar,
  } = useChat();

  return (
    <div className="flex h-screen bg-slate-900 text-white">
      {/* Sidebar */}
      <div
        className={`
          transform
          transition-all
          duration-300
          ease-in-out
          ${isSidebarOpen ? "w-72" : "w-0"}
          bg-slate-850
          h-full
          overflow-hidden
          flex-shrink-0
          relative
        `}
      >
        {/* Content of the sidebar, ensuring it doesn't render if width is 0 to avoid visual glitches */}
        {isSidebarOpen && !isLoadingHistory && (
          <ChatHistorySidebar
            chatHistory={chatHistory}
            currentSessionId={currentSessionId}
            onSelectChat={(id) => {
              selectChat(id);
            }}
            onNewChat={() => {
              const newId = newChat();
              // Potentially navigate to /chat if not already there,
              // or ChatPage can handle setting up based on new currentSessionId from context
            }}
            onDeleteChat={deleteChat}
            // className prop removed as sidebar handles its own full height/width within its container
          />
        )}
         {isSidebarOpen && isLoadingHistory && (
            <div className="p-4 text-slate-400">Loading history...</div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header for toggle button */}
        <header className="bg-slate-800/60 backdrop-blur-md p-2 h-14 flex items-center flex-shrink-0 border-b border-slate-700/50">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-white hover:bg-slate-700"
          >
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
          {/* You can add more header content here if needed */}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
