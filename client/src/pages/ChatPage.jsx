import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import MessageBubble from '../components/MessageBubble';
import TypingIndicator from '../components/TypingIndicator';
import UserList from '../components/UserList';
import GroupList from '../components/GroupList';
import GroupModal from '../components/GroupModal';

const ChatPage = ({ onBack, userData }) => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [knownUsers, setKnownUsers] = useState([]); // All users we've chatted with (online + offline)
  const [selectedUser, setSelectedUser] = useState(null);
  const [conversations, setConversations] = useState({}); // userId => messages[]
  const [unreadCounts, setUnreadCounts] = useState({}); // userId => unread count
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupConversations, setGroupConversations] = useState({}); // groupId => messages[]
  const [groupUnreadCounts, setGroupUnreadCounts] = useState({}); // groupId => unread count
  const [chatMode, setChatMode] = useState('users'); // 'users' or 'groups'
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupModalMode, setGroupModalMode] = useState(null); // null, 'create', or 'manage'
  const [inputMessage, setInputMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') !== 'false';
  });
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [showMobileUserList, setShowMobileUserList] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [scrollTrigger, setScrollTrigger] = useState(0); // Trigger for manual scroll
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Load unread counts from localStorage on mount
  useEffect(() => {
    const savedKnownUsers = localStorage.getItem('known_users');
    if (savedKnownUsers) {
      setKnownUsers(JSON.parse(savedKnownUsers));
    }
    
    const savedUnreadCounts = localStorage.getItem('unread_counts');
    if (savedUnreadCounts) {
      setUnreadCounts(JSON.parse(savedUnreadCounts));
    }
    const savedGroupUnreadCounts = localStorage.getItem('group_unread_counts');
    if (savedGroupUnreadCounts) {
      setGroupUnreadCounts(JSON.parse(savedGroupUnreadCounts));
    }
  }, []);  // Initialize Socket.io connection
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
      
      // Add new online users to known users list
      setKnownUsers(prevKnown => {
        const knownUserIds = new Set(prevKnown.map(u => u.userId));
        const newUsers = data.users.filter(u => !knownUserIds.has(u.userId));
        const updated = [...prevKnown, ...newUsers];
        localStorage.setItem('known_users', JSON.stringify(updated));
        return updated;
      });
    });

    // Receive updated groups list
    newSocket.on('groups-list-updated', (data) => {
      console.log('Groups list updated:', data.groups);
      setGroups(data.groups);
    });

    // Group created confirmation
    newSocket.on('group-created', (data) => {
      console.log('Group created:', data.group);
      alert(data.message);
      setSelectedGroup(data.group);
      setChatMode('groups');
    });

    // Added to group notification
    newSocket.on('added-to-group', (data) => {
      console.log('Added to group:', data.group);
      alert(data.message);
    });

    // Removed from group notification
    newSocket.on('removed-from-group', (data) => {
      console.log('Removed from group:', data.groupName);
      alert(data.message);
      if (selectedGroup && selectedGroup.id === data.groupId) {
        setSelectedGroup(null);
      }
    });

    // Group deleted notification
    newSocket.on('group-deleted', (data) => {
      console.log('Group deleted:', data.groupName);
      if (selectedGroup && selectedGroup.id === data.groupId) {
        setSelectedGroup(null);
        alert(`Group "${data.groupName}" has been deleted`);
      }
    });

    // Receive group messages
    newSocket.on('receive-group-message', (data) => {
      const { id, groupId, fromUserId, fromUsername, message, timestamp } = data;
      console.log('Group message received from:', fromUsername);
      
      const messageObj = {
        id: id,
        text: message,
        isUser: fromUserId === userData.id,
        senderName: fromUsername,
        timestamp
      };
      
      setGroupConversations((prev) => ({
        ...prev,
        [groupId]: [
          ...(prev[groupId] || []),
          messageObj
        ]
      }));

      // Save to localStorage
      const convKey = `group_conversation_${groupId}`;
      const updatedConv = [
        ...(JSON.parse(localStorage.getItem(convKey) || '[]')),
        messageObj
      ];
      localStorage.setItem(convKey, JSON.stringify(updatedConv));
      
      // Increment unread count if this group is not currently selected and message is from another user
      if (fromUserId !== userData.id && (!selectedGroup || selectedGroup.id !== groupId)) {
        setGroupUnreadCounts(prev => {
          const updated = { ...prev, [groupId]: (prev[groupId] || 0) + 1 };
          localStorage.setItem('group_unread_counts', JSON.stringify(updated));
          return updated;
        });
      }
      
      // Trigger scroll if at bottom
      if (shouldAutoScroll) {
        setScrollTrigger(prev => prev + 1);
      }
    });

    // Receive messages from other users
    newSocket.on('receive-message', (data) => {
      const { fromUserId, fromUsername, message, timestamp } = data;
      console.log('Message received from:', fromUsername);
      
      // Add sender to known users if not already there
      setKnownUsers(prevKnown => {
        const exists = prevKnown.some(u => u.userId === fromUserId);
        if (!exists) {
          const newUser = { userId: fromUserId, username: fromUsername };
          const updated = [...prevKnown, newUser];
          localStorage.setItem('known_users', JSON.stringify(updated));
          return updated;
        }
        return prevKnown;
      });
      
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
      
      // Increment unread count if this chat is not currently selected
      if (!selectedUser || selectedUser.userId !== fromUserId) {
        setUnreadCounts(prev => {
          const updated = { ...prev, [fromUserId]: (prev[fromUserId] || 0) + 1 };
          localStorage.setItem('unread_counts', JSON.stringify(updated));
          return updated;
        });
      }
      
      // Trigger scroll if at bottom
      if (shouldAutoScroll) {
        setScrollTrigger(prev => prev + 1);
      }
    });

    // Message sent confirmation (single tick)
    newSocket.on('message-sent', (data) => {
      const { messageId, toUserId, status } = data;
      console.log('Message sent:', messageId, status);
      
      // Update message status to 'sent'
      setConversations(prev => {
        const userMessages = prev[toUserId] || [];
        const updated = userMessages.map(msg => 
          msg.messageId === messageId ? { ...msg, status: 'sent' } : msg
        );
        
        // Update localStorage
        const convKey = `conversation_${userData.id}_${toUserId}`;
        localStorage.setItem(convKey, JSON.stringify(updated));
        
        return { ...prev, [toUserId]: updated };
      });
    });

    // Message delivered confirmation (double tick)
    newSocket.on('message-delivered', (data) => {
      const { messageId, toUserId, status } = data;
      console.log('Message delivered:', messageId, status);
      
      // Update message status to 'delivered'
      setConversations(prev => {
        const userMessages = prev[toUserId] || [];
        const updated = userMessages.map(msg => 
          msg.messageId === messageId ? { ...msg, status: 'delivered' } : msg
        );
        
        // Update localStorage
        const convKey = `conversation_${userData.id}_${toUserId}`;
        localStorage.setItem(convKey, JSON.stringify(updated));
        
        return { ...prev, [toUserId]: updated };
      });
    });

    // Multiple messages delivered (when recipient comes online)
    newSocket.on('messages-delivered', (data) => {
      const { messageIds, toUserId } = data;
      console.log('Messages delivered:', messageIds);
      
      // Update all message statuses to 'delivered'
      setConversations(prev => {
        const userMessages = prev[toUserId] || [];
        const updated = userMessages.map(msg => 
          messageIds.includes(msg.messageId) ? { ...msg, status: 'delivered' } : msg
        );
        
        // Update localStorage
        const convKey = `conversation_${userData.id}_${toUserId}`;
        localStorage.setItem(convKey, JSON.stringify(updated));
        
        return { ...prev, [toUserId]: updated };
      });
    });

    // Message error (keep for other error types, but not for offline users)
    newSocket.on('message-error', (data) => {
      if (data.error !== 'User is offline or not found') {
        alert(`Error: ${data.error}`);
      }
    });

    // Handle unread message notifications when coming online
    newSocket.on('unread-messages-notification', (data) => {
      const { totalCount, conversations, message } = data;
      console.log('Unread messages notification:', data);
      
      // Update unread counts for all conversations with unread messages
      setUnreadCounts(prev => {
        const updated = { ...prev };
        Object.keys(conversations).forEach(userId => {
          updated[userId] = conversations[userId].count;
        });
        localStorage.setItem('unread_counts', JSON.stringify(updated));
        return updated;
      });
      
      // Show notification popup
      if (totalCount > 0) {
        showUnreadNotificationPopup(message, totalCount);
      }
    });

    // Member management confirmations
    newSocket.on('member-added', (data) => {
      console.log('Member added:', data);
      // No need to update state - groups-list-updated will handle it
    });

    newSocket.on('member-removed', (data) => {
      console.log('Member removed:', data);
      // No need to update state - groups-list-updated will handle it
    });

    // Join request events
    newSocket.on('join-request-received', (data) => {
      alert(`${data.requester.username} wants to join "${data.groupName}"`);
      // This will be handled by the group modal when it's open
    });

    newSocket.on('join-request-sent', (data) => {
      alert(data.message);
    });

    newSocket.on('join-request-approved', (data) => {
      alert(data.message);
    });

    newSocket.on('join-request-rejected', (data) => {
      alert(data.message);
    });

    // Group member management notifications
    newSocket.on('invitation-sent', (data) => {
      alert(data.message);
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

    // Message history handlers
    newSocket.on('direct-message-history', (data) => {
      const { otherUserId, messages } = data;
      console.log(`Loaded ${messages.length} direct messages with user ${otherUserId}`);
      
      setIsLoadingHistory(true);
      
      const formattedMessages = messages.map(msg => {
        let status;
        if (msg.fromUserId === userData.id) {
          // This is a message sent by current user
          // If it exists in server history, recipient has loaded it = delivered
          status = 'delivered';
        }
        // Received messages don't need status
        
        return {
          id: `${msg.timestamp}_${msg.fromUserId}`,
          messageId: msg.messageId,
          text: msg.message,
          isUser: msg.fromUserId === userData.id,
          senderName: msg.fromUsername,
          timestamp: msg.timestamp,
          status: status
        };
      });

      setConversations(prev => ({
        ...prev,
        [otherUserId]: formattedMessages
      }));

      // Also save to localStorage for offline access
      const convKey = `conversation_${userData.id}_${otherUserId}`;
      localStorage.setItem(convKey, JSON.stringify(formattedMessages));
      
      // Allow auto-scroll again after a brief delay
      setTimeout(() => {
        setIsLoadingHistory(false);
      }, 500);
    });

    newSocket.on('group-message-history', (data) => {
      const { groupId, messages } = data;
      console.log(`Loaded ${messages.length} group messages for group ${groupId}`);
      
      setIsLoadingHistory(true);
      
      const formattedMessages = messages.map(msg => ({
        id: msg.id || `${msg.timestamp}_${msg.fromUserId}`,
        text: msg.message,
        isUser: msg.fromUserId === userData.id,
        senderName: msg.fromUsername,
        timestamp: msg.timestamp
      }));

      setGroupConversations(prev => ({
        ...prev,
        [groupId]: formattedMessages
      }));

      // Also save to localStorage for offline access
      const convKey = `group_conversation_${groupId}`;
      localStorage.setItem(convKey, JSON.stringify(formattedMessages));
      
      // Allow auto-scroll again after a brief delay
      setTimeout(() => {
        setIsLoadingHistory(false);
      }, 500);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [userData.id, userData.name]);

  // Load conversation when user is selected
  useEffect(() => {
    if (selectedUser && socket) {
      setIsLoadingHistory(true); // Mark as loading to prevent auto-scroll
      
      // First load from localStorage for immediate display
      const convKey = `conversation_${userData.id}_${selectedUser.userId}`;
      const savedConv = localStorage.getItem(convKey);
      if (savedConv && !conversations[selectedUser.userId]) {
        setConversations((prev) => ({
          ...prev,
          [selectedUser.userId]: JSON.parse(savedConv)
        }));
      }

      // Then request latest messages from server
      socket.emit('load-direct-messages', {
        otherUserId: selectedUser.userId
      });
    }
  }, [selectedUser, userData.id, socket]);

  // Auto-scroll effect - only triggers on scrollTrigger changes
  useEffect(() => {
    if (scrollTrigger > 0 && shouldAutoScroll && !isLoadingHistory) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [scrollTrigger, shouldAutoScroll, isLoadingHistory]);

  // Add scroll event listener to detect user scrolling
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    
    const handleScroll = () => {
      if (!messagesContainer) return;
      
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50; // 50px tolerance
      
      setShouldAutoScroll(isAtBottom);
    };

    if (messagesContainer) {
      messagesContainer.addEventListener('scroll', handleScroll);
      return () => messagesContainer.removeEventListener('scroll', handleScroll);
    }
  }, [selectedUser, selectedGroup]);

  // Load group conversation from localStorage and server
  useEffect(() => {
    if (selectedGroup && socket) {
      setIsLoadingHistory(true); // Mark as loading to prevent auto-scroll
      
      // First load from localStorage for immediate display
      const convKey = `group_conversation_${selectedGroup.id}`;
      const savedConv = localStorage.getItem(convKey);
      if (savedConv && !groupConversations[selectedGroup.id]) {
        setGroupConversations((prev) => ({
          ...prev,
          [selectedGroup.id]: JSON.parse(savedConv)
        }));
      }

      // Then request latest messages from server
      socket.emit('load-group-messages', {
        groupId: selectedGroup.id
      });
    }
  }, [selectedGroup, socket]);

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Helper function to show unread message notification popup
  const showUnreadNotificationPopup = (message, count) => {
    // Create notification popup
    const notification = document.createElement('div');
    notification.id = 'unread-notification';
    notification.innerHTML = `
      <div class="flex items-center justify-between p-4 bg-green-500 text-white rounded-lg shadow-lg">
        <div class="flex items-center gap-3">
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
          </svg>
          <div>
            <div class="font-semibold">${message}</div>
            <div class="text-sm opacity-90">Check your conversations for new messages</div>
          </div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-4 hover:bg-green-600 rounded p-1">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
    `;
    notification.className = 'fixed top-4 right-4 z-50 transform transition-all duration-300 translate-x-full';
    
    // Add to document
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 5000);
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSelectedGroup(null);
    setChatMode('users');
    setShowMobileUserList(false);
    setShouldAutoScroll(true); // Reset auto-scroll for new chat
    setTimeout(() => setScrollTrigger(prev => prev + 1), 200); // Trigger scroll after render
    
    // Clear unread count for this user
    if (unreadCounts[user.userId] > 0) {
      setUnreadCounts(prev => {
        const updated = { ...prev, [user.userId]: 0 };
        localStorage.setItem('unread_counts', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    setSelectedUser(null);
    setChatMode('groups');
    setShowMobileUserList(false);
    setShouldAutoScroll(true); // Reset auto-scroll for new chat
    setTimeout(() => setScrollTrigger(prev => prev + 1), 200); // Trigger scroll after render
    
    // Clear unread count for this group
    if (groupUnreadCounts[group.id] > 0) {
      setGroupUnreadCounts(prev => {
        const updated = { ...prev, [group.id]: 0 };
        localStorage.setItem('group_unread_counts', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleCreateGroup = (groupName, memberIds) => {
    if (socket && isConnected) {
      socket.emit('create-group', { groupName, memberIds });
    }
  };

  const handleAddMember = (groupId, userId) => {
    console.log('Adding member:', { groupId, userId, isAdmin: selectedGroup?.admin?.userId === userData.id });
    if (socket && isConnected) {
      socket.emit('add-group-member', { groupId, userId });
    }
  };

  const handleRemoveMember = (groupId, userId) => {
    console.log('Removing member:', { groupId, userId, isAdmin: selectedGroup?.admin?.userId === userData.id });
    if (socket && isConnected) {
      socket.emit('remove-group-member', { groupId, userId });
    }
  };

  const handleDeleteGroup = (groupId) => {
    if (socket && isConnected) {
      socket.emit('delete-group', { groupId });
    }
  };

  const handleJoinGroup = (groupId) => {
    if (socket && isConnected) {
      socket.emit('request-join-group', { groupId });
    }
  };

  const handleJoinRequest = (groupId, userId, action) => {
    if (socket && isConnected) {
      socket.emit('handle-join-request', { groupId, userId, action });
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !socket || !isConnected) return;

    if (chatMode === 'groups' && selectedGroup) {
      // Send group message (don't add to local state - server will echo back)
      socket.emit('send-group-message', {
        groupId: selectedGroup.id,
        message: inputMessage
      });

      setInputMessage('');
      inputRef.current?.focus();
      
      // Trigger scroll after sending
      setShouldAutoScroll(true);
      setScrollTrigger(prev => prev + 1);
    } else if (chatMode === 'users' && selectedUser) {
      // Send direct message
      const messageId = `${userData.id}_${Date.now()}`;
      const message = {
        id: Date.now(),
        messageId: messageId,
        text: inputMessage,
        isUser: true,
        senderName: userData.name,
        timestamp: new Date().toISOString(),
        status: 'sending' // Initial status
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
        fromUserId: userData.id,
        messageId: messageId
      });

      setInputMessage('');
      
      // Stop typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socket.emit('stop-typing', { toUserId: selectedUser.userId });
      
      inputRef.current?.focus();
      
      // Trigger scroll after sending
      setShouldAutoScroll(true);
      setScrollTrigger(prev => prev + 1);
    }
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    
    if (!selectedUser || !socket || chatMode !== 'users') return;

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
    if (selectedUser) {
      if (window.confirm(`Clear conversation with ${selectedUser.username}?`)) {
        setConversations((prev) => ({
          ...prev,
          [selectedUser.userId]: []
        }));
        const convKey = `conversation_${userData.id}_${selectedUser.userId}`;
        localStorage.removeItem(convKey);
      }
    } else if (selectedGroup) {
      if (window.confirm(`Clear conversation in ${selectedGroup.name}?`)) {
        setGroupConversations((prev) => ({
          ...prev,
          [selectedGroup.id]: []
        }));
        const convKey = `group_conversation_${selectedGroup.id}`;
        localStorage.removeItem(convKey);
      }
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

  const currentMessages = selectedUser 
    ? (conversations[selectedUser.userId] || []) 
    : selectedGroup 
    ? (groupConversations[selectedGroup.id] || [])
    : [];
  const isTyping = selectedUser && typingUsers.has(selectedUser.userId);

  return (
    <div className={`h-screen flex ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Sidebar - Desktop */}
      <div className="hidden md:block">
        <div className={`w-80 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg h-screen flex flex-col`}>
          {/* Tabs - Fixed height */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button
              onClick={() => setChatMode('users')}
              className={`flex-1 py-3 px-4 font-medium transition-colors ${
                chatMode === 'users'
                  ? 'border-b-2 border-blue-500 text-blue-500'
                  : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setChatMode('groups')}
              className={`flex-1 py-3 px-4 font-medium transition-colors ${
                chatMode === 'groups'
                  ? 'border-b-2 border-blue-500 text-blue-500'
                  : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Groups
            </button>
          </div>

          {/* Content - Scrollable area with constrained height */}
          <div className="flex-1 overflow-hidden">
            {chatMode === 'users' ? (
              <UserList
                users={onlineUsers}
                allKnownUsers={knownUsers}
                unreadCounts={unreadCounts}
                currentUserId={userData.id}
                onSelectUser={handleSelectUser}
                selectedUserId={selectedUser?.userId}
                darkMode={darkMode}
              />
            ) : (
              <GroupList
                groups={groups}
                groupUnreadCounts={groupUnreadCounts}
                currentUserId={userData.id}
                selectedGroupId={selectedGroup?.id}
                onSelectGroup={handleSelectGroup}
                onCreateGroup={() => {
                  setGroupModalMode('create');
                  setShowGroupModal(true);
                }}
                onJoinGroup={handleJoinGroup}
                darkMode={darkMode}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area - Fixed height container */}
      <div className="flex-1 flex flex-col h-screen">
        {/* Header */}
        <header className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md py-4 px-4 md:px-6 flex items-center justify-between relative`}>
          <div className="flex items-center gap-4">
            {/* Mobile List Toggle */}
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
              ) : selectedGroup ? (
                <>
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedGroup.name}
                    </h1>
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {selectedGroup.members.length} members
                    </span>
                  </div>
                </>
              ) : (
                <div>
                  <h1 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Smart<span className="text-green-500">Chat</span>
                  </h1>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Select a user or group to chat
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
            {(selectedUser || selectedGroup) && (
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
            
            {/* Manage Group Button */}
            {selectedGroup && selectedGroup.admin.userId === userData.id && (
              <button
                onClick={() => {
                  setGroupModalMode('manage');
                  setShowGroupModal(true);
                }}
                className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'} hover:scale-110 transition-transform`}
                title="Manage group"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
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

        {/* Mobile List Overlay */}
        {showMobileUserList && (
          <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowMobileUserList(false)}>
            <div className={`w-4/5 max-w-sm h-full ${darkMode ? 'bg-gray-800' : 'bg-white'} flex flex-col`} onClick={(e) => e.stopPropagation()}>
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setChatMode('users')}
                  className={`flex-1 py-3 px-4 font-medium transition-colors ${
                    chatMode === 'users'
                      ? 'border-b-2 border-blue-500 text-blue-500'
                      : darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  Users
                </button>
                <button
                  onClick={() => setChatMode('groups')}
                  className={`flex-1 py-3 px-4 font-medium transition-colors ${
                    chatMode === 'groups'
                      ? 'border-b-2 border-blue-500 text-blue-500'
                      : darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  Groups
                </button>
              </div>
              {chatMode === 'users' ? (
                <UserList
                  users={onlineUsers}
                  allKnownUsers={knownUsers}
                  currentUserId={userData.id}
                  onSelectUser={handleSelectUser}
                  selectedUserId={selectedUser?.userId}
                  darkMode={darkMode}
                  unreadCounts={unreadCounts}
                />
              ) : (
                <GroupList
                  groups={groups}
                  groupUnreadCounts={groupUnreadCounts}
                  currentUserId={userData.id}
                  selectedGroupId={selectedGroup?.id}
                  onSelectGroup={handleSelectGroup}
                  onCreateGroup={() => {
                    setGroupModalMode('create');
                    setShowGroupModal(true);
                  }}
                  onJoinGroup={handleJoinGroup}
                  darkMode={darkMode}
                />
              )}
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div 
          ref={messagesContainerRef}
          className={`flex-1 overflow-y-auto px-4 py-6 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
        >
          <div className="max-w-4xl mx-auto">
            {!selectedUser && !selectedGroup ? (
              <div className="text-center py-20">
                <div className={`text-6xl mb-4 ${darkMode ? 'text-gray-700' : 'text-gray-300'}`}>
                  {chatMode === 'users' ? '👥' : '👥'}
                </div>
                <h2 className={`text-2xl font-semibold mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {chatMode === 'users' ? 'Select a user to start chatting' : 'Select a group or create one'}
                </h2>
                <p className={`${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  {chatMode === 'users' ? 'Choose someone from the user list' : 'Create a group to chat with multiple people'}
                </p>
              </div>
            ) : currentMessages.length === 0 ? (
              <div className="text-center py-20">
                <div className={`text-6xl mb-4 ${darkMode ? 'text-gray-700' : 'text-gray-300'}`}>💬</div>
                <h2 className={`text-2xl font-semibold mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  No messages yet
                </h2>
                <p className={`${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Start a conversation with {selectedUser ? selectedUser.username : selectedGroup?.name}!
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
                    senderName={msg.senderName}
                    isGroupMessage={!!selectedGroup}
                    status={msg.status}
                  />
                ))}
                {isTyping && <TypingIndicator />}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Scroll to bottom button */}
          {!shouldAutoScroll && currentMessages.length > 0 && (
            <button
              onClick={() => {
                setShouldAutoScroll(true);
                setScrollTrigger(prev => prev + 1);
              }}
              className={`fixed bottom-24 right-8 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
                darkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600'
              } text-white z-10`}
              title="Scroll to bottom"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          )}
        </div>

        {/* Input Area - Only show when user or group is selected */}
        {(selectedUser || selectedGroup) && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} px-4 py-4 flex-shrink-0`}>
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
                      : selectedUser
                      ? `Message ${selectedUser.username}...`
                      : `Message ${selectedGroup.name}...`
                  }
                  disabled={!isConnected}
                  className={`flex-1 px-4 py-3 rounded-l-full ${
                    darkMode 
                      ? 'bg-gray-700 text-white placeholder-gray-400' 
                      : 'bg-gray-100 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || !isConnected}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-r-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Group Modal */}
      <GroupModal
        isOpen={showGroupModal}
        onClose={() => {
          setShowGroupModal(false);
          setGroupModalMode(null);
        }}
        onCreateGroup={handleCreateGroup}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
        onDeleteGroup={handleDeleteGroup}
        onHandleJoinRequest={handleJoinRequest}
        availableUsers={onlineUsers}
        currentUserId={userData.id}
        selectedGroup={groupModalMode === 'manage' ? selectedGroup : null}
      />
    </div>
  );
};

export default ChatPage;

