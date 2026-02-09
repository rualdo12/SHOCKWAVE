
import React from 'react';

interface QuickRepliesProps {
  replies: string[];
  onClick: (reply: string) => void;
}

const QuickReplies: React.FC<QuickRepliesProps> = ({ replies, onClick }) => {
  return (
    <div className="flex flex-wrap gap-2 justify-start">
      {replies.map((reply) => (
        <button
          key={reply}
          onClick={() => onClick(reply)}
          className="rounded-full border border-[#2a2a2a] bg-[#141414] px-3 py-1.5 text-sm font-medium text-gray-200 transition hover:border-[#D4AF37] hover:text-[#D4AF37]"
        >
          {reply}
        </button>
      ))}
    </div>
  );
};

export default QuickReplies;
