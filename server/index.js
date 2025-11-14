// -----------------------------
// SMARTCHAT SERVER - index.js
// -----------------------------

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// -----------------------------
// FIX ES MODULE __dirname / __filename
// -----------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -----------------------------
// EXPRESS SETUP
// -----------------------------
const app = express();
app.use(express.json());

// IMPORTANT CORS FIX
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// -----------------------------
// MESSAGE STORAGE
// -----------------------------
const DATA_FOLDER = path.join(__dirname, "data");
const CHAT_FILE = path.join(DATA_FOLDER, "messages.json");
const USERS_FILE = path.join(DATA_FOLDER, "users.json");

if (!fs.existsSync(DATA_FOLDER)) fs.mkdirSync(DATA_FOLDER);

if (!fs.existsSync(CHAT_FILE)) fs.writeFileSync(CHAT_FILE, "[]");
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]");

const loadMessages = () =>
  JSON.parse(fs.readFileSync(CHAT_FILE, "utf8"));

const saveMessages = (data) =>
  fs.writeFileSync(CHAT_FILE, JSON.stringify(data, null, 2));

const loadUsers = () =>
  JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));

const saveUsers = (data) =>
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));

// -----------------------------
// HTTP & SOCKET.IO SETUP
// -----------------------------
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 30000,   // IMPORTANT FIX
  pingInterval: 25000,  // IMPORTANT FIX
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // -----------------------------
  // USER JOINS
  // -----------------------------
  socket.on("join", (username) => {
    console.log(`User joined: ${username}`);

    let users = loadUsers();
    users.push({ id: socket.id, username });
    saveUsers(users);

    io.emit("users", users);
  });

  // -----------------------------
  // SEND CHAT HISTORY
  // -----------------------------
  socket.emit("chatHistory", loadMessages());

  // -----------------------------
  // HANDLE NEW MESSAGE
  // -----------------------------
  socket.on("sendMessage", (msg) => {
    const messages = loadMessages();
    messages.push(msg);
    saveMessages(messages);

    io.emit("receiveMessage", msg);
  });

  // -----------------------------
  // USER DISCONNECTS
  // -----------------------------
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    let users = loadUsers();
    users = users.filter((u) => u.id !== socket.id);
    saveUsers(users);

    io.emit("users", users);
  });
});

// -----------------------------
// START SERVER
// -----------------------------
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`🚀 SmartChat server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
});
