import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Encryption settings
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

// Storage directories
const STORAGE_DIR = path.join(__dirname, 'chat_data');
const DIRECT_CHATS_DIR = path.join(STORAGE_DIR, 'direct');
const GROUP_CHATS_DIR = path.join(STORAGE_DIR, 'groups');

// Create storage directories if they don't exist
const initStorage = () => {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { mode: 0o700 }); // Owner only
  }
  if (!fs.existsSync(DIRECT_CHATS_DIR)) {
    fs.mkdirSync(DIRECT_CHATS_DIR, { mode: 0o700 });
  }
  if (!fs.existsSync(GROUP_CHATS_DIR)) {
    fs.mkdirSync(GROUP_CHATS_DIR, { mode: 0o700 });
  }
};

// Generate encryption key from password
const generateKey = (password, salt) => {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
};

// Get encryption password from environment or generate one
const getEncryptionPassword = () => {
  if (process.env.CHAT_ENCRYPTION_KEY) {
    return process.env.CHAT_ENCRYPTION_KEY;
  }
  // Generate a random key if not provided
  const key = crypto.randomBytes(32).toString('hex');
  console.warn('WARNING: Using generated encryption key. Set CHAT_ENCRYPTION_KEY in .env for persistence!');
  console.warn(`Generated key: ${key}`);
  return key;
};

const ENCRYPTION_PASSWORD = getEncryptionPassword();

// Encrypt data
const encrypt = (text) => {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = generateKey(ENCRYPTION_PASSWORD, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Combine salt + iv + tag + encrypted data
  return Buffer.concat([
    salt,
    iv,
    tag,
    Buffer.from(encrypted, 'hex')
  ]).toString('base64');
};

// Decrypt data
const decrypt = (encryptedData) => {
  try {
    const buffer = Buffer.from(encryptedData, 'base64');
    
    const salt = buffer.slice(0, SALT_LENGTH);
    const iv = buffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = buffer.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    const key = generateKey(ENCRYPTION_PASSWORD, salt);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    return null;
  }
};

// Generate chat ID for direct messages (always same for two users)
const getDirectChatId = (userId1, userId2) => {
  const sorted = [userId1, userId2].sort();
  return `direct_${sorted[0]}_${sorted[1]}`;
};

// Generate chat ID for groups
const getGroupChatId = (groupId) => {
  return `group_${groupId}`;
};

// Save direct chat message
const saveDirectMessage = (userId1, userId2, message) => {
  try {
    const chatId = getDirectChatId(userId1, userId2);
    const filePath = path.join(DIRECT_CHATS_DIR, `${chatId}.enc`);
    
    let messages = [];
    
    // Load existing messages if file exists
    if (fs.existsSync(filePath)) {
      const encryptedData = fs.readFileSync(filePath, 'utf8');
      const decryptedData = decrypt(encryptedData);
      if (decryptedData) {
        messages = JSON.parse(decryptedData);
      }
    }
    
    // Add new message
    messages.push({
      ...message,
      savedAt: new Date().toISOString()
    });
    
    // Encrypt and save
    const jsonData = JSON.stringify(messages);
    const encrypted = encrypt(jsonData);
    fs.writeFileSync(filePath, encrypted, { mode: 0o600 }); // Owner read/write only
    
    return true;
  } catch (error) {
    console.error('Error saving direct message:', error);
    return false;
  }
};

// Load direct chat messages
const loadDirectMessages = (userId1, userId2) => {
  try {
    const chatId = getDirectChatId(userId1, userId2);
    const filePath = path.join(DIRECT_CHATS_DIR, `${chatId}.enc`);
    
    if (!fs.existsSync(filePath)) {
      return [];
    }
    
    const encryptedData = fs.readFileSync(filePath, 'utf8');
    const decryptedData = decrypt(encryptedData);
    
    if (!decryptedData) {
      return [];
    }
    
    return JSON.parse(decryptedData);
  } catch (error) {
    console.error('Error loading direct messages:', error);
    return [];
  }
};

// Save group message
const saveGroupMessage = (groupId, message) => {
  try {
    const chatId = getGroupChatId(groupId);
    const filePath = path.join(GROUP_CHATS_DIR, `${chatId}.enc`);
    
    let messages = [];
    
    // Load existing messages if file exists
    if (fs.existsSync(filePath)) {
      const encryptedData = fs.readFileSync(filePath, 'utf8');
      const decryptedData = decrypt(encryptedData);
      if (decryptedData) {
        messages = JSON.parse(decryptedData);
      }
    }
    
    // Add new message
    messages.push({
      ...message,
      savedAt: new Date().toISOString()
    });
    
    // Encrypt and save
    const jsonData = JSON.stringify(messages);
    const encrypted = encrypt(jsonData);
    fs.writeFileSync(filePath, encrypted, { mode: 0o600 }); // Owner read/write only
    
    return true;
  } catch (error) {
    console.error('Error saving group message:', error);
    return false;
  }
};

// Load group messages
const loadGroupMessages = (groupId) => {
  try {
    const chatId = getGroupChatId(groupId);
    const filePath = path.join(GROUP_CHATS_DIR, `${chatId}.enc`);
    
    if (!fs.existsSync(filePath)) {
      return [];
    }
    
    const encryptedData = fs.readFileSync(filePath, 'utf8');
    const decryptedData = decrypt(encryptedData);
    
    if (!decryptedData) {
      return [];
    }
    
    return JSON.parse(decryptedData);
  } catch (error) {
    console.error('Error loading group messages:', error);
    return [];
  }
};

// Delete direct chat
const deleteDirectChat = (userId1, userId2) => {
  try {
    const chatId = getDirectChatId(userId1, userId2);
    const filePath = path.join(DIRECT_CHATS_DIR, `${chatId}.enc`);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting direct chat:', error);
    return false;
  }
};

// Delete group chat
const deleteGroupChat = (groupId) => {
  try {
    const chatId = getGroupChatId(groupId);
    const filePath = path.join(GROUP_CHATS_DIR, `${chatId}.enc`);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting group chat:', error);
    return false;
  }
};

// Initialize storage on module load
initStorage();

export {
  saveDirectMessage,
  loadDirectMessages,
  saveGroupMessage,
  loadGroupMessages,
  deleteDirectChat,
  deleteGroupChat
};
