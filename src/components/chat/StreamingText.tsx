import React, { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface StreamingTextProps {
  content: string;
  speed?: number;
  onComplete?: () => void;
}

const StreamingText = ({
  content,
  speed = 30,
  onComplete,
}: StreamingTextProps) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < content.length) {
      const timer = setTimeout(() => {
        setDisplayedText((prev) => prev + content[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, content, speed, onComplete]);

  return (
    <div className="text-gray-100 leading-relaxed">
      {/* The 'prose' and 'prose-invert' classes should ideally be applied by the parent
          (MessageBubble.tsx) to ensure consistent styling for markdown content.
          If not, they might need to be added here or to a wrapping div. */}
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {displayedText}
      </ReactMarkdown>
      {currentIndex < content.length && (
        <span className="inline-block w-1 h-4 bg-purple-400 animate-pulse ml-1 align-text-bottom"></span>
      )}
    </div>
  );
};

export default StreamingText;
