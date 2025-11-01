import React from 'react';

const MessageBubble = ({ message, isUser, timestamp, senderName, isGroupMessage = false, status }) => {
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Render status ticks for sent messages
  const renderStatusTicks = () => {
    if (!isUser || isGroupMessage) return null; // Only show ticks for user's direct messages
    
    if (status === 'delivered') {
      // Double tick (blue) - message delivered/seen
      return (
        <span className="inline-flex ml-1">
          <svg className="w-4 h-4 text-blue-400" viewBox="0 0 16 15" fill="currentColor">
            <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.033l-.358-.325a.32.32 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
          </svg>
        </span>
      );
    } else if (status === 'sent') {
      // Single tick (gray) - message sent but not delivered
      return (
        <span className="inline-flex ml-1">
          <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 15" fill="currentColor">
            <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l6.258 6.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
          </svg>
        </span>
      );
    } else if (status === 'sending') {
      // Clock icon for sending
      return (
        <svg className="w-3 h-3 text-gray-400 inline ml-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth="2" stroke="currentColor" opacity="0.25"/>
          <path d="M4 12a8 8 0 018-8" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    }
    return null;
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}>
      <div className={`flex items-start gap-2 max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-blue-500' : 'bg-gray-700'
        }`}>
          {isUser ? (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
            </svg>
          )}
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Group Message Sender Name */}
          {isGroupMessage && !isUser && senderName && (
            <span className="text-xs text-gray-500 mb-1 px-2 font-medium">
              {senderName}
            </span>
          )}
          <div className={`rounded-2xl px-4 py-2 shadow-md ${
            isUser 
              ? 'bg-blue-500 text-white rounded-tr-sm' 
              : 'bg-gray-700 text-gray-100 rounded-tl-sm'
          }`}>
            <p className="text-sm md:text-base whitespace-pre-wrap break-words leading-relaxed">
              {message}
            </p>
          </div>
          {timestamp && (
            <span className="text-xs text-gray-500 mt-1 px-2 flex items-center gap-1">
              {formatTime(timestamp)}
              {renderStatusTicks()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
