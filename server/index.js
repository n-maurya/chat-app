import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  saveDirectMessage,
  loadDirectMessages,
  saveGroupMessage,
  loadGroupMessages,
  deleteGroupChat
} from './chatStorage.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "https://peerchats.netlify.app/",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Store active users and their socket connections
const activeUsers = new Map(); // socketId => userData
const userSockets = new Map(); // userId => socketId
const groups = new Map(); // groupId => { id, name, admin, members: [], createdAt, joinRequests: [] }
const groupMessages = new Map(); // groupId => messages[]
const joinRequests = new Map(); // groupId => [{ userId, username, requestedAt }]

// Helper function to get groups list with join requests
const getGroupsList = () => {
  return Array.from(groups.values()).map(group => ({
    id: group.id,
    name: group.name,
    admin: group.admin,
    members: group.members,
    createdAt: group.createdAt,
    joinRequests: joinRequests.get(group.id) || []
  }));
};

// Helper function to check and send unread message notifications
const checkAndSendUnreadNotifications = (userId, socket) => {
  try {
    // Get all users this user has had conversations with
    const knownUsers = new Set();
    
    // Check all possible conversation files for this user
    const fs = require('fs');
    const path = require('path');
    const directDir = path.join(process.cwd(), 'chat_data', 'direct');
    
    if (fs.existsSync(directDir)) {
      const files = fs.readdirSync(directDir);
      
      files.forEach(file => {
        if (file.includes(`_${userId}_`) || file.includes(`_${userId}.enc`)) {
          // Extract the other user's ID from the filename
          const parts = file.replace('.enc', '').split('_');
          const userIndex1 = parts.findIndex(part => part === userId);
          if (userIndex1 !== -1) {
            // Find the other user ID in the filename
            for (let i = 0; i < parts.length; i++) {
              if (parts[i].startsWith('user_') && parts[i] !== userId) {
                const otherUserId = parts[i];
                knownUsers.add(otherUserId);
                break;
              }
            }
          }
        }
      });
    }
    
    // For each known user, check if there are unread messages
    let totalUnreadCount = 0;
    const unreadSummary = {};
    
    knownUsers.forEach(otherUserId => {
      const messages = loadDirectMessages(userId, otherUserId);
      
      // Count unread messages (messages from others that haven't been "read")
      // For simplicity, we'll consider messages as unread if the user wasn't online when they were sent
      const unreadMessages = messages.filter(msg => 
        msg.fromUserId !== userId && 
        msg.timestamp > (getLastSeenTime(userId) || new Date(0).toISOString())
      );
      
      if (unreadMessages.length > 0) {
        unreadSummary[otherUserId] = {
          count: unreadMessages.length,
          lastMessage: unreadMessages[unreadMessages.length - 1]
        };
        totalUnreadCount += unreadMessages.length;
      }
    });
    
    // Send unread notification if there are any unread messages
    if (totalUnreadCount > 0) {
      socket.emit('unread-messages-notification', {
        totalCount: totalUnreadCount,
        conversations: unreadSummary,
        message: `You have ${totalUnreadCount} unread message${totalUnreadCount > 1 ? 's' : ''}`
      });
      
      console.log(`Sent unread notification to ${userId}: ${totalUnreadCount} messages`);
    }
    
    // Update last seen time
    updateLastSeenTime(userId);
    
  } catch (error) {
    console.error('Error checking unread messages:', error);
  }
};

// Helper function to get last seen time (stored in localStorage simulation)
const lastSeenTimes = new Map();

const getLastSeenTime = (userId) => {
  return lastSeenTimes.get(userId);
};

const updateLastSeenTime = (userId) => {
  lastSeenTimes.set(userId, new Date().toISOString());
};

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'SmartChat Server is running! (Peer-to-Peer Mode)',
    activeUsers: activeUsers.size,
    timestamp: new Date().toISOString()
  });
});

// Get active users endpoint
app.get('/api/users', (req, res) => {
  const users = Array.from(activeUsers.values()).map(user => ({
    username: user.username,
    userId: user.userId,
    socketId: user.socketId,
    connectedAt: user.connectedAt
  }));
  res.json({ 
    count: users.length,
    users 
  });
});

// Get user stats endpoint
app.get('/api/stats', (req, res) => {
  res.json({
    activeUsers: activeUsers.size,
    totalGroups: groups.size,
    timestamp: new Date().toISOString()
  });
});

// Get groups endpoint
app.get('/api/groups', (req, res) => {
  const groupsList = Array.from(groups.values()).map(group => ({
    id: group.id,
    name: group.name,
    admin: group.admin,
    memberCount: group.members.length,
    createdAt: group.createdAt
  }));
  res.json({ 
    count: groupsList.length,
    groups: groupsList 
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId || socket.id;
  const username = socket.handshake.query.username || 'Anonymous';
  
  // Store active user info
  const userData = {
    userId,
    username,
    socketId: socket.id,
    connectedAt: new Date().toISOString()
  };
  
  activeUsers.set(socket.id, userData);
  userSockets.set(userId, socket.id);

  console.log(`User connected: ${username} (${userId}) [Socket: ${socket.id}]`);
  console.log(`Active users: ${activeUsers.size}`);

  // Broadcast updated user list to all clients
  io.emit('user-list-updated', {
    users: Array.from(activeUsers.values()).map(user => ({
      userId: user.userId,
      username: user.username,
      socketId: user.socketId
    }))
  });

  // Send current groups list to the connected user
  socket.emit('groups-list-updated', {
    groups: getGroupsList()
  });

  // Check for unread messages and notify user when they come online
  setTimeout(() => {
    checkAndSendUnreadNotifications(userId, socket);
  }, 1000); // Small delay to ensure client is ready

  // Handle load direct message history request
  socket.on('load-direct-messages', (data) => {
    const { otherUserId } = data;
    const userInfo = activeUsers.get(socket.id);
    
    if (!userInfo) return;

    const messages = loadDirectMessages(userInfo.userId, otherUserId);
    socket.emit('direct-message-history', {
      otherUserId,
      messages
    });
    console.log(`Loaded ${messages.length} direct messages for ${userInfo.username} with user ${otherUserId}`);
    
    // Notify the other user that their messages have been delivered (if they're online)
    const otherUserSocketId = userSockets.get(otherUserId);
    if (otherUserSocketId) {
      // Find messages sent by the other user and mark them as delivered
      const deliveredMessageIds = messages
        .filter(msg => msg.fromUserId === otherUserId)
        .map(msg => msg.messageId)
        .filter(id => id); // Filter out undefined
      
      if (deliveredMessageIds.length > 0) {
        io.to(otherUserSocketId).emit('messages-delivered', {
          messageIds: deliveredMessageIds,
          toUserId: userInfo.userId
        });
      }
    }
  });

  // Handle load group message history request
  socket.on('load-group-messages', (data) => {
    const { groupId } = data;
    const userInfo = activeUsers.get(socket.id);
    
    if (!userInfo) return;

    const group = groups.get(groupId);
    if (!group) {
      socket.emit('message-error', { error: 'Group not found' });
      return;
    }

    // Check if user is a member
    const isMember = group.members.some(m => m.userId === userInfo.userId);
    if (!isMember) {
      socket.emit('message-error', { error: 'You are not a member of this group' });
      return;
    }

    const messages = loadGroupMessages(groupId);
    socket.emit('group-message-history', {
      groupId,
      messages
    });
    console.log(`Loaded ${messages.length} group messages for ${userInfo.username} in group ${group.name}`);
  });

  // Handle group creation
  socket.on('create-group', (data) => {
    const { groupName, memberIds } = data;
    const userInfo = activeUsers.get(socket.id);
    
    if (!userInfo) return;

    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create group with creator as admin and all selected members
    const group = {
      id: groupId,
      name: groupName,
      admin: {
        userId: userInfo.userId,
        username: userInfo.username
      },
      members: [
        { userId: userInfo.userId, username: userInfo.username, isAdmin: true },
        ...memberIds.map(memberId => {
          const memberSocketId = userSockets.get(memberId);
          const memberInfo = memberSocketId ? activeUsers.get(memberSocketId) : null;
          return {
            userId: memberId,
            username: memberInfo?.username || 'Unknown',
            isAdmin: false
          };
        })
      ],
      createdAt: new Date().toISOString()
    };

    groups.set(groupId, group);
    groupMessages.set(groupId, []);

    console.log(`Group created: ${groupName} by ${userInfo.username} with ${memberIds.length} members`);

    // Notify all users about the new group
    io.emit('groups-list-updated', {
      groups: getGroupsList()
    });

    // Notify creator
    socket.emit('group-created', {
      group,
      message: `Group "${groupName}" created successfully`
    });
  });

  // Handle join group request
  socket.on('request-join-group', (data) => {
    const { groupId } = data;
    const userInfo = activeUsers.get(socket.id);
    
    if (!userInfo) return;

    const group = groups.get(groupId);
    if (!group) {
      socket.emit('message-error', { error: 'Group not found' });
      return;
    }

    // Check if user is already a member
    if (group.members.some(m => m.userId === userInfo.userId)) {
      socket.emit('message-error', { error: 'You are already a member of this group' });
      return;
    }

    // Check if user already has pending request
    if (!joinRequests.has(groupId)) {
      joinRequests.set(groupId, []);
    }
    
    const existingRequest = joinRequests.get(groupId).find(req => req.userId === userInfo.userId);
    if (existingRequest) {
      socket.emit('message-error', { error: 'You already have a pending request for this group' });
      return;
    }

    // Add join request
    const request = {
      userId: userInfo.userId,
      username: userInfo.username,
      requestedAt: new Date().toISOString()
    };
    
    joinRequests.get(groupId).push(request);
    
    console.log(`Join request: ${userInfo.username} wants to join ${group.name}`);

    // Notify admin
    const adminSocketId = userSockets.get(group.admin.userId);
    if (adminSocketId) {
      io.to(adminSocketId).emit('join-request-received', {
        groupId,
        groupName: group.name,
        requester: {
          userId: userInfo.userId,
          username: userInfo.username
        }
      });
    }

    // Confirm to requester
    socket.emit('join-request-sent', {
      groupId,
      groupName: group.name,
      message: `Join request sent to ${group.name}`
    });
  });

  // Handle approve/reject join request
  socket.on('handle-join-request', (data) => {
    const { groupId, userId, action } = data; // action: 'approve' or 'reject'
    const userInfo = activeUsers.get(socket.id);
    
    if (!userInfo) return;

    const group = groups.get(groupId);
    if (!group) {
      socket.emit('message-error', { error: 'Group not found' });
      return;
    }

    // Check if requester is admin
    if (group.admin.userId !== userInfo.userId) {
      socket.emit('message-error', { error: 'Only admin can handle join requests' });
      return;
    }

    // Find and remove the request
    if (!joinRequests.has(groupId)) {
      socket.emit('message-error', { error: 'No pending requests found' });
      return;
    }

    const requests = joinRequests.get(groupId);
    const requestIndex = requests.findIndex(req => req.userId === userId);
    
    if (requestIndex === -1) {
      socket.emit('message-error', { error: 'Join request not found' });
      return;
    }

    const request = requests[requestIndex];
    requests.splice(requestIndex, 1);

    const requesterSocketId = userSockets.get(userId);
    
    if (action === 'approve') {
      // Add user to group
      const requesterInfo = requesterSocketId ? activeUsers.get(requesterSocketId) : null;
      if (requesterInfo) {
        group.members.push({
          userId,
          username: requesterInfo.username,
          isAdmin: false
        });

        console.log(`Join request approved: ${requesterInfo.username} added to ${group.name}`);

        // Notify all users about updated group
        io.emit('groups-list-updated', {
          groups: getGroupsList()
        });

        // Notify the approved user
        if (requesterSocketId) {
          io.to(requesterSocketId).emit('join-request-approved', {
            groupId,
            groupName: group.name,
            message: `You have been added to "${group.name}"`
          });
        }
      }
    } else {
      // Notify rejected user
      if (requesterSocketId) {
        io.to(requesterSocketId).emit('join-request-rejected', {
          groupId,
          groupName: group.name,
          message: `Your request to join "${group.name}" was declined`
        });
      }
      
      // Update groups list to remove the request
      io.emit('groups-list-updated', {
        groups: getGroupsList()
      });
    }

    console.log(`Join request ${action}d: ${request.username} for ${group.name}`);
  });

  // Handle group messages
  socket.on('send-group-message', (data) => {
    const { groupId, message } = data;
    const userInfo = activeUsers.get(socket.id);
    
    if (!userInfo) return;

    const group = groups.get(groupId);
    if (!group) {
      socket.emit('message-error', { error: 'Group not found' });
      return;
    }

    // Check if user is a member
    const isMember = group.members.some(m => m.userId === userInfo.userId);
    if (!isMember) {
      socket.emit('message-error', { error: 'You are not a member of this group' });
      return;
    }

    const messageData = {
      id: Date.now(),
      groupId,
      fromUserId: userInfo.userId,
      fromUsername: userInfo.username,
      message,
      timestamp: new Date().toISOString()
    };

    // Store message in memory
    if (!groupMessages.has(groupId)) {
      groupMessages.set(groupId, []);
    }
    groupMessages.get(groupId).push(messageData);

    // Save message to encrypted storage
    saveGroupMessage(groupId, messageData);

    console.log(`Group message in ${group.name} from ${userInfo.username}: ${message.substring(0, 50)}...`);

    // Send to all group members
    group.members.forEach(member => {
      const memberSocketId = userSockets.get(member.userId);
      if (memberSocketId) {
        io.to(memberSocketId).emit('receive-group-message', messageData);
      }
    });
  });

  // Handle add member to group (with user confirmation)
  socket.on('add-group-member', (data) => {
    const { groupId, userId } = data;
    const userInfo = activeUsers.get(socket.id);
    
    console.log(`Add member request: ${userInfo?.username} trying to add user ${userId} to group ${groupId}`);
    
    if (!userInfo) return;

    const group = groups.get(groupId);
    if (!group) {
      console.log(`Group not found: ${groupId}`);
      socket.emit('message-error', { error: 'Group not found' });
      return;
    }

    // Check if requester is admin
    if (group.admin.userId !== userInfo.userId) {
      console.log(`Permission denied: ${userInfo.username} is not admin of ${group.name}`);
      socket.emit('message-error', { error: 'Only admin can add members' });
      return;
    }

    // Check if user is already a member
    if (group.members.some(m => m.userId === userId)) {
      console.log(`User ${userId} is already a member of ${group.name}`);
      socket.emit('message-error', { error: 'User is already a member of this group' });
      return;
    }

    // Add member directly (no confirmation needed)
    const memberSocketId = userSockets.get(userId);
    const memberInfo = memberSocketId ? activeUsers.get(memberSocketId) : null;
    
    if (memberInfo) {
      // Add user to group directly
      group.members.push({
        userId,
        username: memberInfo.username,
        isAdmin: false
      });

      console.log(`${memberInfo.username} added to group ${group.name} by ${userInfo.username}`);

      // Notify all users about updated group
      io.emit('groups-list-updated', {
        groups: getGroupsList()
      });

      // Notify the added member
      io.to(memberSocketId).emit('added-to-group', {
        group,
        message: `You were added to "${group.name}"`
      });

      // Notify admin
      socket.emit('member-added', {
        groupId,
        member: { userId, username: memberInfo.username, isAdmin: false }
      });
    } else {
      // User is not currently online
      socket.emit('message-error', { 
        error: 'Cannot add user - they are not currently online' 
      });
    }
  });

  // Handle remove member from group
  socket.on('remove-group-member', (data) => {
    const { groupId, userId } = data;
    const userInfo = activeUsers.get(socket.id);
    
    console.log(`Remove member request: ${userInfo?.username} trying to remove user ${userId} from group ${groupId}`);
    
    if (!userInfo) return;

    const group = groups.get(groupId);
    if (!group) {
      console.log(`Group not found: ${groupId}`);
      socket.emit('message-error', { error: 'Group not found' });
      return;
    }

    // Check if requester is admin
    if (group.admin.userId !== userInfo.userId) {
      console.log(`Permission denied: ${userInfo.username} is not admin of ${group.name}`);
      socket.emit('message-error', { error: 'Only admin can remove members' });
      return;
    }

    // Cannot remove admin
    if (userId === group.admin.userId) {
      socket.emit('message-error', { error: 'Cannot remove group admin' });
      return;
    }

    // Remove member
    const memberIndex = group.members.findIndex(m => m.userId === userId);
    if (memberIndex !== -1) {
      const removedMember = group.members[memberIndex];
      group.members.splice(memberIndex, 1);

      console.log(`${removedMember.username} removed from group ${group.name} by ${userInfo.username}`);

      // Notify all users about updated group
      io.emit('groups-list-updated', {
        groups: getGroupsList()
      });

      // Notify the removed member
      const memberSocketId = userSockets.get(userId);
      if (memberSocketId) {
        io.to(memberSocketId).emit('removed-from-group', {
          groupId,
          groupName: group.name,
          message: `You were removed from "${group.name}"`
        });
      }

      socket.emit('member-removed', {
        groupId,
        userId
      });
    }
  });

  // Handle delete group
  socket.on('delete-group', (data) => {
    const { groupId } = data;
    const userInfo = activeUsers.get(socket.id);
    
    if (!userInfo) return;

    const group = groups.get(groupId);
    if (!group) {
      socket.emit('message-error', { error: 'Group not found' });
      return;
    }

    // Check if requester is admin
    if (group.admin.userId !== userInfo.userId) {
      socket.emit('message-error', { error: 'Only admin can delete the group' });
      return;
    }

    // Delete group and its encrypted messages
    groups.delete(groupId);
    groupMessages.delete(groupId);
    deleteGroupChat(groupId);

    console.log(`Group ${group.name} deleted by ${userInfo.username}`);

    // Notify all users
    io.emit('groups-list-updated', {
      groups: getGroupsList()
    });

    io.emit('group-deleted', {
      groupId,
      groupName: group.name
    });
  });

  // Handle user-to-user messages
  socket.on('send-message', (data) => {
    const { toUserId, message, fromUsername, fromUserId, messageId } = data;
    
    console.log(`Message from ${fromUsername} to user ${toUserId}: ${message.substring(0, 50)}...`);

    const timestamp = new Date().toISOString();
    const messageData = {
      fromUserId,
      fromUsername,
      message,
      timestamp,
      messageId: messageId || `${fromUserId}_${Date.now()}`
    };

    // Save message to encrypted storage (always, even if recipient is offline)
    saveDirectMessage(fromUserId, toUserId, messageData);

    // Get recipient's socket ID
    const recipientSocketId = userSockets.get(toUserId);
    
    if (recipientSocketId) {
      // Send message to recipient (they're online)
      io.to(recipientSocketId).emit('receive-message', messageData);
      
      // Confirm delivery to sender (double tick - delivered)
      socket.emit('message-delivered', {
        messageId: messageData.messageId,
        toUserId,
        timestamp,
        status: 'delivered'
      });
      
      console.log(`Message delivered to ${toUserId}`);
    } else {
      // User is offline - message saved, will be delivered when they come online
      // Confirm sent to sender (single tick - sent but not delivered)
      socket.emit('message-sent', {
        messageId: messageData.messageId,
        toUserId,
        timestamp,
        status: 'sent'
      });
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    const { toUserId } = data;
    const recipientSocketId = userSockets.get(toUserId);
    
    if (recipientSocketId) {
      const senderInfo = activeUsers.get(socket.id);
      io.to(recipientSocketId).emit('user-typing', {
        fromUserId: senderInfo.userId,
        fromUsername: senderInfo.username
      });
    }
  });

  // Handle stop typing
  socket.on('stop-typing', (data) => {
    const { toUserId } = data;
    const recipientSocketId = userSockets.get(toUserId);
    
    if (recipientSocketId) {
      const senderInfo = activeUsers.get(socket.id);
      io.to(recipientSocketId).emit('user-stop-typing', {
        fromUserId: senderInfo.userId
      });
    }
  });

  socket.on('disconnect', () => {
    const userInfo = activeUsers.get(socket.id);
    if (userInfo) {
      console.log(`User disconnected: ${userInfo.username} (${userInfo.userId}) [Socket: ${socket.id}]`);
      
      // Update last seen time before removing user
      updateLastSeenTime(userInfo.userId);
      
      // Remove from maps
      activeUsers.delete(socket.id);
      userSockets.delete(userInfo.userId);
      
      console.log(`Active users: ${activeUsers.size}`);
      
      // Broadcast updated user list
      io.emit('user-list-updated', {
        users: Array.from(activeUsers.values()).map(user => ({
          userId: user.userId,
          username: user.username,
          socketId: user.socketId
        }))
      });
    }
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`🚀 SmartChat server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
});
