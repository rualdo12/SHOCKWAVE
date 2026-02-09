
import React from 'react';
import { Message as MessageType } from '../types';

interface MessageProps {
    message: MessageType;
}

const Message: React.FC<MessageProps> = ({ message }) => {
    const isUser = message.sender === 'user';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${
                    isUser
                        ? 'bg-[#FDBE33] text-black rounded-br-lg shadow-[0_6px_16px_rgba(253,190,51,0.25)]'
                        : 'bg-[#1d1d1d] text-gray-100 rounded-bl-lg border border-[#2a2a2a]'
                }`}
            >
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
            </div>
        </div>
    );
};

export default Message;
