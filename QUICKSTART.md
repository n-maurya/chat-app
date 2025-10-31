# Quick Start Guide

## 🚀 Running SmartChat (Multi-User Version)

### Step 1: Start the Backend Server
```bash
cd server
npm run dev
```
Server will run on: `http://localhost:3001`

### Step 2: Start the Frontend Client
```bash
cd client
npm start
```
Client will run on: `http://localhost:3000`

### Step 3: Register Your User
1. Navigate to: `http://localhost:3000`
2. Enter your name (2-20 characters)
3. Click "Continue to Chat"
4. You'll receive a unique user ID automatically

### Step 4: Start Chatting
1. Click "Start Chatting" on the landing page
2. Type your message
3. Get instant AI responses!

## 👥 Testing Multiple Users

### Option 1: Different Browsers
- User 1: Chrome → Register as "Alice"
- User 2: Firefox → Register as "Bob"
- User 3: Edge → Register as "Charlie"

### Option 2: Incognito Windows
- Open multiple incognito/private windows
- Each window = separate user session
- Register with different names

### Option 3: Manual Reset
```javascript
// In browser console
localStorage.clear();
// Refresh page, register as new user
```

## ⚙️ Configuration

Make sure your `.env` file in the `server` folder has your OpenAI API key:
```
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001
NODE_ENV=development
```

## 🎯 User Features to Try

1. **View Profile**:
   - Click on your username in the chat header
   - See your unique ID, message count, status

2. **Switch Users**:
   - Click username → Logout
   - Register with a new name
   - Get a new unique ID

3. **Dark/Light Mode**:
   - Click sun/moon icon in header

4. **Clear Chat**:
   - Click trash icon (only clears YOUR chat)

## 📊 Check Active Users

While users are connected, check the API:

```bash
# Get active users
curl http://localhost:3001/api/users

# Get server stats
curl http://localhost:3001/api/stats

# Health check
curl http://localhost:3001/
```

## 🎯 Test the Application

### User 1 Session:
1. Open browser → Register as "Alice"
2. Ask: "What is React?"
3. Continue conversation...

### User 2 Session:
1. Open different browser → Register as "Bob"
2. Ask: "Tell me a joke"
3. Bob's chat is completely separate from Alice's!

## 🔍 How It Works

### Each User Gets:
- ✅ Unique ID: `user_1234567890_abc123xyz`
- ✅ Display Name: "Alice", "Bob", etc.
- ✅ Private Chat History: Stored per user ID
- ✅ Separate AI Context: AI remembers YOUR conversation

### What's Tracked:
- Username and User ID
- Connection timestamp
- Message history per user
- Active connection status

## 🔧 Troubleshooting

- If port 3001 is in use, change PORT in `.env` file
- Make sure OpenAI API key is valid
- Check that both server and client are running
- Clear browser cache if styles don't load
- Use `localStorage.clear()` to reset user data

## 📝 Current Configuration

- **Backend**: http://localhost:3001
- **Frontend**: http://localhost:3000
- **Socket.io**: Connected with user identification
- **OpenAI**: GPT-3.5-turbo model
- **Storage**: localStorage (per user)

## 📚 More Information

For detailed multi-user documentation, see:
- `MULTI_USER_GUIDE.md` - Complete multi-user system guide
- `README.md` - Full project documentation

---

**Now supporting multiple simultaneous users!** 👥💬
