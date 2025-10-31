import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import MessageBubble from '../components/MessageBubble';
import TypingIndicator from '../components/TypingIndicator';
import UserList from '../components/UserList';

const ChatPage = ({ onBack, userData }) => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [conversations, setConversations] = useState({}); // userId => messages[]
  const [inputMessage, setInputMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') !== 'false';
  });
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [showMobileUserList, setShowMobileUserList] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initialize Socket.io connection
  useEffect(() => {
    const newSocket = io('http://172.20.32.169:3001', {
      transports: ['websocket', 'polling'],
      query: {
        userId: userData.id,
        username: userData.name
      }
    });

    newSocket.on('connect', () => {
      console.log('Connected to server as:', userData.name, userData.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    // Receive updated user list
    newSocket.on('user-list-updated', (data) => {
      console.log('User list updated:', data.users);
      setOnlineUsers(data.users);
    });

    // Receive messages from other users
    newSocket.on('receive-message', (data) => {
      const { fromUserId, fromUsername, message, timestamp } = data;
      console.log('Message received from:', fromUsername);
      
      setConversations((prev) => ({
        ...prev,
        [fromUserId]: [
          ...(prev[fromUserId] || []),
          {
            id: Date.now(),
            text: message,
            isUser: false,
            senderName: fromUsername,
            timestamp
          }
        ]
      }));

      // Save to localStorage
      const convKey = `conversation_${userData.id}_${fromUserId}`;
      const updatedConv = [
        ...(JSON.parse(localStorage.getItem(convKey) || '[]')),
        {
          id: Date.now(),
          text: message,
          isUser: false,
          senderName: fromUsername,
          timestamp
        }
      ];
      localStorage.setItem(convKey, JSON.stringify(updatedConv));
    });

    // Message sent confirmation
    newSocket.on('message-sent', (data) => {
      console.log('Message delivered:', data);
    });

    // Message error
    newSocket.on('message-error', (data) => {
      alert(`Error: ${data.error}`);
    });

    // Typing indicators
    newSocket.on('user-typing', (data) => {
      setTypingUsers((prev) => new Set([...prev, data.fromUserId]));
    });

    newSocket.on('user-stop-typing', (data) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(data.fromUserId);
        return newSet;
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [userData.id, userData.name]);

  // Load conversation when user is selected
  useEffect(() => {
    if (selectedUser) {
      const convKey = `conversation_${userData.id}_${selectedUser.userId}`;
      const savedConv = localStorage.getItem(convKey);
      if (savedConv && !conversations[selectedUser.userId]) {
        setConversations((prev) => ({
          ...prev,
          [selectedUser.userId]: JSON.parse(savedConv)
        }));
      }
    }
  }, [selectedUser, userData.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, selectedUser]);

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setShowMobileUserList(false);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !socket || !isConnected || !selectedUser) return;

    const message = {
      id: Date.now(),
      text: inputMessage,
      isUser: true,
      senderName: userData.name,
      timestamp: new Date().toISOString()
    };

    // Add to local conversation
    setConversations((prev) => ({
      ...prev,
      [selectedUser.userId]: [
        ...(prev[selectedUser.userId] || []),
        message
      ]
    }));

    // Save to localStorage
    const convKey = `conversation_${userData.id}_${selectedUser.userId}`;
    const updatedConv = [
      ...(conversations[selectedUser.userId] || []),
      message
    ];
    localStorage.setItem(convKey, JSON.stringify(updatedConv));

    // Send to server
    socket.emit('send-message', {
      toUserId: selectedUser.userId,
      message: inputMessage,
      fromUsername: userData.name,
      fromUserId: userData.id
    });

    setInputMessage('');
    
    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit('stop-typing', { toUserId: selectedUser.userId });
    
    inputRef.current?.focus();
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    
    if (!selectedUser || !socket) return;

    // Send typing indicator
    socket.emit('typing', { toUserId: selectedUser.userId });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', { toUserId: selectedUser.userId });
    }, 2000);
  };

  const handleClearChat = () => {
    if (!selectedUser) return;
    
    if (window.confirm(`Clear conversation with ${selectedUser.username}?`)) {
      setConversations((prev) => ({
        ...prev,
        [selectedUser.userId]: []
      }));
      const convKey = `conversation_${userData.id}_${selectedUser.userId}`;
      localStorage.removeItem(convKey);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout? Your chat history will be saved.')) {
      localStorage.removeItem('smartchat_user');
      window.location.reload();
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const currentMessages = selectedUser ? (conversations[selectedUser.userId] || []) : [];
  const isTyping = selectedUser && typingUsers.has(selectedUser.userId);

  return (
    <div className={`min-h-screen flex ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* User List Sidebar - Desktop */}
      <div className="hidden md:block">
        <UserList
          users={onlineUsers}
          currentUserId={userData.id}
          onSelectUser={handleSelectUser}
          selectedUserId={selectedUser?.userId}
          darkMode={darkMode}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md py-4 px-4 md:px-6 flex items-center justify-between relative`}>
          <div className="flex items-center gap-4">
            {/* Mobile User List Toggle */}
            <button
              onClick={() => setShowMobileUserList(!showMobileUserList)}
              className={`md:hidden ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <button
              onClick={onBack}
              className={`${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
              title="Back to home"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="flex items-center gap-3">
              {selectedUser ? (
                <>
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">{selectedUser.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <h1 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedUser.username}
                    </h1>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Online</span>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <h1 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Smart<span className="text-green-500">Chat</span>
                  </h1>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Select a user to chat
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* User Info Button */}
            <button
              onClick={() => setShowUserInfo(!showUserInfo)}
              className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'} hover:scale-110 transition-transform`}
              title="Your profile"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-200 text-gray-700'} hover:scale-110 transition-transform`}
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fillRule="evenodd" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            {/* Clear Chat Button */}
            {selectedUser && (
              <button
                onClick={handleClearChat}
                className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'} hover:scale-110 transition-transform`}
                title="Clear conversation"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>

          {/* User Info Dropdown */}
          {showUserInfo && (
            <div className={`absolute top-16 right-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-2xl p-4 z-50 min-w-[300px] border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{userData.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{userData.name}</h3>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>You</p>
                </div>
              </div>
              
              <div className={`space-y-2 py-2 border-t border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between text-sm">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>User ID:</span>
                  <code className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-gray-700 text-green-400' : 'bg-gray-100 text-green-600'}`}>
                    {userData.id.substring(0, 15)}...
                  </code>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Online Users:</span>
                  <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{onlineUsers.length - 1}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Status:</span>
                  <span className={`flex items-center gap-1 ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className={`w-full mt-3 py-2 px-4 rounded-lg text-sm font-medium ${darkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'} transition-colors`}
              >
                Logout
              </button>
            </div>
          )}
        </header>

        {/* Mobile User List Overlay */}
        {showMobileUserList && (
          <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowMobileUserList(false)}>
            <div className={`w-4/5 max-w-sm h-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
              <UserList
                users={onlineUsers}
                currentUserId={userData.id}
                onSelectUser={handleSelectUser}
                selectedUserId={selectedUser?.userId}
                darkMode={darkMode}
              />
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className={`flex-1 overflow-y-auto px-4 py-6 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="max-w-4xl mx-auto">
            {!selectedUser ? (
              <div className="text-center py-20">
                <div className={`text-6xl mb-4 ${darkMode ? 'text-gray-700' : 'text-gray-300'}`}>👥</div>
                <h2 className={`text-2xl font-semibold mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Select a user to start chatting
                </h2>
                <p className={`${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Choose someone from the user list
                </p>
              </div>
            ) : currentMessages.length === 0 ? (
              <div className="text-center py-20">
                <div className={`text-6xl mb-4 ${darkMode ? 'text-gray-700' : 'text-gray-300'}`}>💬</div>
                <h2 className={`text-2xl font-semibold mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  No messages yet
                </h2>
                <p className={`${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Start a conversation with {selectedUser.username}!
                </p>
              </div>
            ) : (
              <>
                {currentMessages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg.text}
                    isUser={msg.isUser}
                    timestamp={msg.timestamp}
                  />
                ))}
                {isTyping && <TypingIndicator />}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} px-4 py-4`}>
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={handleInputChange}
                placeholder={
                  !isConnected
                    ? "Connecting..."
                    : !selectedUser
                    ? "Select a user first..."
                    : `Message ${selectedUser.username}...`
                }
                disabled={!isConnected || !selectedUser}
                className={`flex-1 px-4 py-3 rounded-full ${
                  darkMode 
                    ? 'bg-gray-700 text-white placeholder-gray-400' 
                    : 'bg-gray-100 text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed`}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || !isConnected || !selectedUser}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;

