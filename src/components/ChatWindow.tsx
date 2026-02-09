
import React, { useEffect, useRef, useState } from 'react';
import { Message as MessageType } from '../types';
import { getChatbotResponse } from '../services/chatService';
import { INITIAL_MESSAGES, QUICK_REPLIES } from '../constants';
import Message from './Message';
import TypingIndicator from './TypingIndicator';
import QuickReplies from './QuickReplies';

interface ChatWindowProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<MessageType[]>(INITIAL_MESSAGES);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const showQuickReplies = messages.length <= INITIAL_MESSAGES.length && !isLoading;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            setTimeout(scrollToBottom, 100);
        }
    }, [isOpen, messages]);


    const submitMessage = async (text: string) => {
        const trimmedInput = text.trim();
        if (!trimmedInput) return;

        const userMessage: MessageType = {
            id: Date.now().toString(),
            text: trimmedInput,
            sender: 'user',
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setIsLoading(true);
        setError(null);

        try {
            const botResponseText = await getChatbotResponse(updatedMessages, trimmedInput);
            const botMessage: MessageType = {
                id: (Date.now() + 1).toString(),
                text: botResponseText,
                sender: 'bot',
            };
            setMessages((prev) => [...prev, botMessage]);
        } catch (err) {
            setError('We are having trouble connecting right now. Please try again shortly.');
            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    text: "I'm having trouble connecting right now. Please try again in a moment.",
                    sender: 'bot',
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        await submitMessage(inputValue);
        setInputValue('');
    };

    const handleQuickReplyClick = async (reply: string) => {
        await submitMessage(reply);
    };
    
    return (
        <div className="absolute bottom-20 right-0 w-[calc(100vw-2.5rem)] max-w-sm h-[70vh] max-h-[620px] rounded-2xl shadow-[0_18px_48px_rgba(0,0,0,0.55)] flex flex-col overflow-hidden border border-[#2b2b2b] bg-gradient-to-b from-[#141414] via-[#0f0f0f] to-[#0b0b0b]">
            <header className="p-4 bg-[#121212]/95 backdrop-blur border-b border-[#222] flex justify-between items-center">
                <div className="flex flex-col">
                    <h2 className="text-lg font-bold text-white">SHOCKWAVE AI Assistant</h2>
                    <p className="text-xs text-gray-400">Creative support for shoots, branding, and marketing.</p>
                    <p className="mt-1 text-[11px] text-[#D4AF37] flex items-center">
                        <span className="w-2 h-2 bg-[#D4AF37] rounded-full mr-1.5"></span>
                        Online
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2a2a2a] text-gray-400 transition hover:border-[#D4AF37] hover:text-white"
                    aria-label="Minimize chat"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                </button>
            </header>

            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.04),_transparent_45%)]">
                {messages.map((msg) => (
                    <Message key={msg.id} message={msg} />
                ))}
                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} />
            </div>

            {showQuickReplies && (
                <div className="px-4 py-3 border-t border-[#222]">
                    <QuickReplies replies={QUICK_REPLIES} onClick={handleQuickReplyClick} />
                </div>
            )}

            <footer className={`p-4 bg-[#0f0f0f] ${!showQuickReplies ? 'border-t border-[#222]' : ''}`}>
                {error && (
                    <div className="mb-3 rounded-lg border border-[#3a2a10] bg-[#1b1305] px-3 py-2 text-xs text-[#D4AF37]">
                        {error}
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ask about services, pricing, or availability..."
                        className="flex-1 rounded-lg border border-[#2a2a2a] bg-[#151515] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !inputValue.trim()}
                        className="rounded-lg border border-[#2a2a2a] bg-[#D4AF37] p-2 text-black transition hover:bg-[#ffd36a] disabled:opacity-50"
                        aria-label="Send message"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.27 3.13a59.7 59.7 0 0 1 18.22 8.87 59.7 59.7 0 0 1-18.22 8.88L6 12Zm0 0h7.5" />
                        </svg>
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default ChatWindow;
