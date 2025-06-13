import React, { useState, useEffect } from "react";

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
      <div
        className="whitespace-pre-wrap break-words"
        dangerouslySetInnerHTML={{
          __html: displayedText
            .replace(/\n/g, "<br>")
            .replace(
              /#{1,6}\s(.+)/g,
              '<strong class="text-white text-lg">$1</strong>'
            )
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="text-blue-300">$1</em>'),
        }}
      />
      {currentIndex < content.length && (
        <span className="inline-block w-2 h-5 bg-purple-400 animate-pulse ml-1"></span>
      )}
    </div>
  );
};

export default StreamingText;
