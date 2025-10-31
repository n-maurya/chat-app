# SmartChat Multi-User System 👥

## Overview

SmartChat now supports multiple users with individual registration, unique IDs, and separate chat histories. Each user has their own private conversation with the AI.

## 🎯 Key Features

### User Registration
- **Unique User ID**: Each user gets a unique identifier (`user_timestamp_randomString`)
- **Username**: Users can set their display name (2-20 characters)
- **Persistent Login**: User data saved in localStorage
- **Auto-login**: Returning users are automatically logged in

### Individual Chat Sessions
- **Separate Histories**: Each user has their own chat history
- **Privacy**: Users cannot see other users' conversations
- **Persistent Storage**: Chat history saved per user ID in localStorage
- **AI Context**: AI remembers previous messages within the same user session

### User Profile
- **Profile Display**: Click username in chat to see profile info
- **User Stats**: View message count and connection status
- **Logout Option**: Clear current session and return to registration

## 🔧 How It Works

### Client Side

1. **Registration Flow**:
   ```
   User opens app → RegisterPage → Enter name → Generate unique ID → Save to localStorage → LandingPage
   ```

2. **Chat Session**:
   ```javascript
   // User data structure
   {
     id: "user_1234567890_abc123xyz",
     name: "John Doe",
     registeredAt: "2025-10-31T12:00:00.000Z"
   }
   ```

3. **Storage Keys**:
   - User data: `smartchat_user`
   - Chat history: `chatHistory_${userId}`
   - Theme: `darkMode`

### Server Side

1. **Connection Tracking**:
   ```javascript
   activeUsers = Map {
     socketId => {
       userId: "user_1234567890_abc123xyz",
       username: "John Doe",
       connectedAt: "2025-10-31T12:00:00.000Z"
     }
   }
   ```

2. **Chat History**:
   ```javascript
   chatHistory = Map {
     userId => [
       { role: 'user', content: 'Hello' },
       { role: 'assistant', content: 'Hi there!' }
     ]
   }
   ```

## 📡 API Endpoints

### GET `/`
Health check and server info
```json
{
  "message": "SmartChat Server is running!",
  "activeUsers": 3,
  "timestamp": "2025-10-31T12:00:00.000Z"
}
```

### GET `/api/users`
Get list of active users
```json
{
  "count": 3,
  "users": [
    {
      "username": "John Doe",
      "userId": "user_1234567890_abc123xyz",
      "connectedAt": "2025-10-31T12:00:00.000Z"
    }
  ]
}
```

### GET `/api/stats`
Get server statistics
```json
{
  "activeUsers": 3,
  "totalChatSessions": 15,
  "timestamp": "2025-10-31T12:00:00.000Z"
}
```

## 🧪 Testing Multiple Users

### Method 1: Different Browsers
1. Open Chrome: Register as "Alice"
2. Open Firefox: Register as "Bob"
3. Open Edge: Register as "Charlie"
4. Each will have separate chat sessions

### Method 2: Incognito/Private Windows
1. Open incognito window: Register as "User1"
2. Open another incognito: Register as "User2"
3. Each window maintains separate localStorage

### Method 3: Manual Reset
1. In browser console: `localStorage.clear()`
2. Refresh page
3. Register with new name

## 💻 Usage Examples

### Starting a New Session
```bash
# Terminal 1: Start server
cd server
npm run dev

# Terminal 2: Start client
cd client
npm start

# Browser: http://localhost:3000
# 1. Enter your name (e.g., "Alice")
# 2. Click "Continue to Chat"
# 3. Start chatting!
```

### Checking Active Users
```bash
# While users are connected
curl http://localhost:3001/api/users

# View server stats
curl http://localhost:3001/api/stats
```

### Server Logs
```
User connected: Alice (user_1234567890_abc123xyz) [Socket: xyz123]
Active users: 1
Message from Alice (user_1234567890_abc123xyz): Hello!...
AI response sent to Alice
User disconnected: Alice (user_1234567890_abc123xyz) [Socket: xyz123]
Active users: 0
```

## 🎨 User Interface

### Registration Page
- Clean, minimal design
- Name input with validation
- Auto-focus for quick entry
- Info about unique ID system

### Landing Page
- Personalized welcome message
- Shows user's name
- Quick access to chat

### Chat Interface
- **Header**: 
  - Username display (clickable)
  - Connection status
  - Theme toggle
  - Clear chat button
  
- **User Info Dropdown**:
  - Avatar with initial
  - Full username
  - Unique user ID (truncated)
  - Message count
  - Connection status
  - Logout button

## 🔐 Privacy & Security

### What's Private
✅ Each user's chat history
✅ User credentials (stored locally)
✅ AI conversation context per user

### What's Shared
❌ No data shared between users
❌ Server only tracks active connections
❌ Chat history stored per user ID

### Data Retention
- **Client**: Data persists in localStorage until cleared
- **Server**: Chat history kept in memory (cleared on restart)
- **Future**: Can add MongoDB for permanent storage

## 🚀 Advanced Features

### Logout and Switch Users
```javascript
// Logout current user
localStorage.removeItem('smartchat_user');
window.location.reload();

// User will see registration page again
```

### Export Chat History
```javascript
// Get current user's chat history
const userId = JSON.parse(localStorage.getItem('smartchat_user')).id;
const chatKey = `chatHistory_${userId}`;
const history = localStorage.getItem(chatKey);
console.log(JSON.parse(history));

// Download as JSON
const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(history);
const downloadAnchor = document.createElement('a');
downloadAnchor.setAttribute("href", dataStr);
downloadAnchor.setAttribute("download", `chat_${userId}.json`);
downloadAnchor.click();
```

### Admin Dashboard (Future)
Create a simple admin page to monitor users:
```javascript
// In browser console or admin page
fetch('http://localhost:3001/api/users')
  .then(r => r.json())
  .then(data => console.table(data.users));
```

## 🐛 Debugging

### Check User Data
```javascript
// Browser console
console.log('User:', localStorage.getItem('smartchat_user'));
const user = JSON.parse(localStorage.getItem('smartchat_user'));
console.log('Chat History:', localStorage.getItem(`chatHistory_${user.id}`));
```

### Server-side Debugging
```javascript
// Add to server/index.js
console.log('Active Users:', Array.from(activeUsers.entries()));
console.log('Chat Sessions:', Array.from(chatHistory.keys()));
```

## 📝 Future Enhancements

- [ ] User avatars/profile pictures
- [ ] User-to-user messaging (peer chat)
- [ ] Public chat rooms
- [ ] User status (online/away/busy)
- [ ] Friend lists
- [ ] Message reactions
- [ ] User search
- [ ] Admin dashboard
- [ ] MongoDB integration for persistent storage
- [ ] User authentication (OAuth, JWT)

## 🤝 Contributing

To add more user features:
1. Update user schema in `RegisterPage.jsx`
2. Modify server's `activeUsers` Map structure
3. Update chat UI components
4. Add new API endpoints as needed

---

**Each user now has their own private AI conversation!** 🎉
