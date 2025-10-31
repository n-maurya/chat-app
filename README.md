# SmartChat — Real-Time AI Chat Application 🚀

A modern, real-time chat web application that allows users to send messages instantly using Socket.io and get AI-generated responses from the OpenAI API.

![SmartChat](https://img.shields.io/badge/SmartChat-AI%20Powered-green)
![React](https://img.shields.io/badge/React-18.2.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-orange)

## ✨ Features

- 🎨 **Modern UI**: Beautiful, responsive interface built with React and Tailwind CSS
- ⚡ **Real-time Communication**: Instant messaging powered by Socket.io
- 🤖 **AI-Powered Responses**: Intelligent conversations using OpenAI GPT-3.5/GPT-4
- � **Multi-User Support**: Individual user registration with unique IDs
- 🔐 **Private Sessions**: Each user has their own separate chat history
- 💾 **Persistent Storage**: User data and chat history saved in localStorage
- 🌓 **Dark/Light Mode**: Toggle between themes
- 📱 **Fully Responsive**: Works seamlessly on all devices
- ✅ **Connection Status**: Real-time connection indicator
- 👤 **User Profiles**: Display username, ID, and session stats
- 🔄 **Auto-scroll**: Automatically scrolls to latest messages
- ⌨️ **Typing Indicator**: Shows when AI is generating response
- 🚪 **Logout System**: Switch between users easily

## 🛠️ Tech Stack

### Frontend
- **React** - UI framework
- **Tailwind CSS** - Styling
- **Socket.io Client** - Real-time communication
- **React Hooks** - State management

### Backend
- **Node.js** - Runtime environment
- **Express** - Web server framework
- **Socket.io** - WebSocket server
- **OpenAI API** - AI responses
- **dotenv** - Environment variables

## 📦 Project Structure

```
watschat/
├── client/                    # React frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── MessageBubble.jsx
│   │   │   └── TypingIndicator.jsx
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   └── ChatPage.jsx
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
│
└── server/                    # Node.js backend
    ├── index.js
    ├── package.json
    ├── .env
    └── .env.example
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API Key ([Get one here](https://platform.openai.com/api-keys))

### Installation

1. **Clone the repository or navigate to the project folder**
   ```bash
   cd watschat
   ```

2. **Setup Server**
   ```bash
   cd server
   npm install
   ```

3. **Configure Environment Variables**
   
   Create a `.env` file in the `server` directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=5000
   NODE_ENV=development
   ```

4. **Setup Client**
   ```bash
   cd ../client
   npm install
   ```

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd server
   npm start
   ```
   Server will run on `http://localhost:5000`

2. **Start the React Frontend** (in a new terminal)
   ```bash
   cd client
   npm start
   ```
   Client will run on `http://localhost:3000`

3. **Open your browser**
   Navigate to `http://localhost:3000`

## 💬 Usage

1. **Registration**: Enter your name to create a unique user profile
2. **Landing Page**: Click on "Start Chatting" button
3. **Chat Interface**: Type your message in the input box
4. **Send Message**: Click the send button or press Enter
5. **AI Response**: Wait for the AI to generate a response (typing indicator will show)
6. **Continue Chatting**: Messages are automatically saved per user
7. **View Profile**: Click your username to see your unique ID and stats
8. **Toggle Dark Mode**: Click the sun/moon icon in the header
9. **Clear Chat**: Click the trash icon to clear your chat history
10. **Logout**: Open profile dropdown and click logout to switch users
11. **Go Back**: Click the back arrow to return to landing page

## 🎨 Design Features

- **User Messages**: Right-aligned, blue bubbles
- **AI Messages**: Left-aligned, gray bubbles
- **Smooth Animations**: Fade-in effects and hover states
- **Auto-scroll**: Automatically scrolls to latest messages
- **Responsive Layout**: Adapts to all screen sizes
- **Custom Scrollbar**: Styled scrollbar for better UX

## 🔧 API Endpoints

### REST API
- `GET /` - Health check endpoint with active user count
- `GET /api/users` - Get list of currently active users
- `GET /api/stats` - Get server statistics (active users, total sessions)
- `POST /api/chat` - Send message and receive AI response

### Socket.io Events
- `chat-message` - Send message to server (includes userId and username)
- `user-message` - Receive user message confirmation
- `ai-message` - Receive AI response
- `error-message` - Receive error messages
- `typing` - Typing indicator

## 🌐 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | Required |
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment mode | development |

## 📝 Scripts

### Server
```bash
npm start       # Start the server
npm run dev     # Start with nodemon (auto-restart)
```

### Client
```bash
npm start       # Start development server
npm run build   # Build for production
npm test        # Run tests
```

## 🎯 Features Implemented

✅ User registration with unique IDs  
✅ Individual user profiles  
✅ Separate chat histories per user  
✅ Landing page with personalized welcome  
✅ Real-time chat interface  
✅ Socket.io integration with user tracking  
✅ OpenAI API integration  
✅ Message bubbles with timestamps  
✅ Typing indicator  
✅ Auto-scroll to latest message  
✅ Per-user chat history (localStorage)  
✅ Dark/Light mode toggle  
✅ Connection status indicator  
✅ User profile dropdown  
✅ Logout/switch user functionality  
✅ Clear chat functionality  
✅ Fully responsive design  
✅ Error handling  
✅ Active user tracking on server  

## 🔒 Security Notes

- Never commit your `.env` file
- Keep your OpenAI API key secure
- Use environment variables for sensitive data
- Implement rate limiting in production
- Add authentication for production use

## 🚧 Future Enhancements

- [ ] User authentication (OAuth, JWT)
- [ ] MongoDB integration for persistent storage
- [ ] User-to-user messaging
- [ ] Public chat rooms
- [ ] Profile pictures/avatars
- [ ] Online user list
- [ ] User search
- [ ] File/image sharing
- [ ] Voice messages
- [ ] Message search
- [ ] Export chat history
- [ ] Custom AI personalities
- [ ] Rate limiting
- [ ] Message reactions/emojis
- [ ] Admin dashboard

## 🐛 Troubleshooting

### Server won't start
- Check if port 3001 is already in use
- Verify OpenAI API key is correctly set in `.env`
- Ensure all dependencies are installed

### Client won't connect
- Make sure server is running on port 3001
- Check browser console for errors
- Verify CORS settings in server

### AI not responding
- Check OpenAI API key validity
- Verify internet connection
- Check API usage limits/billing

### Can't register/login
- Clear browser localStorage: `localStorage.clear()`
- Check browser console for errors
- Refresh the page

### Multiple users testing
- Use different browsers (Chrome, Firefox, Edge)
- Use incognito/private windows
- Clear localStorage between tests

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 👨‍💻 Author

Built with ❤️ using React, Node.js, Socket.io, and OpenAI

## 🙏 Acknowledgments

- OpenAI for the GPT API
- Socket.io for real-time communication
- Tailwind CSS for styling
- React team for the amazing framework

---

**Enjoy chatting with AI! 🤖💬**
