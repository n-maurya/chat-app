import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Store active users and their socket connections
const activeUsers = new Map(); // socketId => userData
const userSockets = new Map(); // userId => socketId
const groups = new Map(); // groupId => { id, name, admin, members: [], createdAt }
const groupMessages = new Map(); // groupId => messages[]

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
    groups: Array.from(groups.values()).map(group => ({
      id: group.id,
      name: group.name,
      admin: group.admin,
      members: group.members,
      createdAt: group.createdAt
    }))
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
      groups: Array.from(groups.values()).map(g => ({
        id: g.id,
        name: g.name,
        admin: g.admin,
        members: g.members,
        createdAt: g.createdAt
      }))
    });

    // Notify creator
    socket.emit('group-created', {
      group,
      message: `Group "${groupName}" created successfully`
    });
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

    // Store message
    if (!groupMessages.has(groupId)) {
      groupMessages.set(groupId, []);
    }
    groupMessages.get(groupId).push(messageData);

    console.log(`Group message in ${group.name} from ${userInfo.username}: ${message.substring(0, 50)}...`);

    // Send to all group members
    group.members.forEach(member => {
      const memberSocketId = userSockets.get(member.userId);
      if (memberSocketId) {
        io.to(memberSocketId).emit('receive-group-message', messageData);
      }
    });
  });

  // Handle add member to group
  socket.on('add-group-member', (data) => {
    const { groupId, userId } = data;
    const userInfo = activeUsers.get(socket.id);
    
    if (!userInfo) return;

    const group = groups.get(groupId);
    if (!group) {
      socket.emit('message-error', { error: 'Group not found' });
      return;
    }

    // Check if requester is admin
    if (group.admin.userId !== userInfo.userId) {
      socket.emit('message-error', { error: 'Only admin can add members' });
      return;
    }

    // Check if user is already a member
    if (group.members.some(m => m.userId === userId)) {
      socket.emit('message-error', { error: 'User is already a member' });
      return;
    }

    // Add member
    const memberSocketId = userSockets.get(userId);
    const memberInfo = memberSocketId ? activeUsers.get(memberSocketId) : null;
    
    if (memberInfo) {
      group.members.push({
        userId,
        username: memberInfo.username,
        isAdmin: false
      });

      console.log(`${memberInfo.username} added to group ${group.name} by ${userInfo.username}`);

      // Notify all users about updated group
      io.emit('groups-list-updated', {
        groups: Array.from(groups.values()).map(g => ({
          id: g.id,
          name: g.name,
          admin: g.admin,
          members: g.members,
          createdAt: g.createdAt
        }))
      });

      // Notify the added member
      io.to(memberSocketId).emit('added-to-group', {
        group,
        message: `You were added to "${group.name}"`
      });

      socket.emit('member-added', {
        groupId,
        member: { userId, username: memberInfo.username, isAdmin: false }
      });
    }
  });

  // Handle remove member from group
  socket.on('remove-group-member', (data) => {
    const { groupId, userId } = data;
    const userInfo = activeUsers.get(socket.id);
    
    if (!userInfo) return;

    const group = groups.get(groupId);
    if (!group) {
      socket.emit('message-error', { error: 'Group not found' });
      return;
    }

    // Check if requester is admin
    if (group.admin.userId !== userInfo.userId) {
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
        groups: Array.from(groups.values()).map(g => ({
          id: g.id,
          name: g.name,
          admin: g.admin,
          members: g.members,
          createdAt: g.createdAt
        }))
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

    // Delete group
    groups.delete(groupId);
    groupMessages.delete(groupId);

    console.log(`Group ${group.name} deleted by ${userInfo.username}`);

    // Notify all users
    io.emit('groups-list-updated', {
      groups: Array.from(groups.values()).map(g => ({
        id: g.id,
        name: g.name,
        admin: g.admin,
        members: g.members,
        createdAt: g.createdAt
      }))
    });

    io.emit('group-deleted', {
      groupId,
      groupName: group.name
    });
  });

  // Handle user-to-user messages
  socket.on('send-message', (data) => {
    const { toUserId, message, fromUsername, fromUserId } = data;
    
    console.log(`Message from ${fromUsername} to user ${toUserId}: ${message.substring(0, 50)}...`);

    // Get recipient's socket ID
    const recipientSocketId = userSockets.get(toUserId);
    
    if (recipientSocketId) {
      // Send message to recipient
      io.to(recipientSocketId).emit('receive-message', {
        fromUserId,
        fromUsername,
        message,
        timestamp: new Date().toISOString()
      });
      
      // Confirm delivery to sender
      socket.emit('message-sent', {
        toUserId,
        message,
        timestamp: new Date().toISOString(),
        status: 'delivered'
      });
    } else {
      // User not found or offline
      socket.emit('message-error', {
        error: 'User is offline or not found',
        toUserId
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
