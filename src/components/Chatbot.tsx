
import React, { useState } from 'react';
import ChatWindow from './ChatWindow';

const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-7 h-7">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.25a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm4 0a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm4 0a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm7 0c0 4.97-4.48 9-10 9a11.2 11.2 0 0 1-3.05-.43 7.3 7.3 0 0 1-2.6 1.02 7.7 7.7 0 0 1-1.2.12 5.9 5.9 0 0 0 1.2-2.8 2.1 2.1 0 0 0-.58-1.7C4.7 16.2 3.75 14.18 3.75 12c0-4.97 4.48-9 10-9s10 4.03 10 9Z" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-[1000]">
      <div
        className={`transition-all duration-300 ease-out ${
          isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        }`}
      >
        <ChatWindow isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </div>

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="group mt-3 flex h-14 w-14 items-center justify-center rounded-full border border-[#2b2b2b] bg-[#0f0f0f] text-white shadow-[0_14px_32px_rgba(0,0,0,0.45)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#FDBE33] hover:text-[#FDBE33] focus:outline-none focus:ring-2 focus:ring-[#FDBE33]/40"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <CloseIcon /> : <ChatIcon />}
      </button>
    </div>
  );
};

export default Chatbot;
