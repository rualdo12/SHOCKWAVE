
import React from 'react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-lg border border-[#2a2a2a] bg-[#1d1d1d] px-4 py-2">
        <div className="flex items-center justify-center space-x-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-[#FDBE33] [animation-delay:-0.3s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-[#FDBE33] [animation-delay:-0.15s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-[#FDBE33]"></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
