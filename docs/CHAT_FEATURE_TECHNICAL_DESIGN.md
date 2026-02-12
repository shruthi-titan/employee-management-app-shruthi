# Technical Design Document: Real-Time Chat Feature

## Document Information
- **Version**: 1.0
- **Last Updated**: 2026-02-12
- **Author**: Shruthi Titan
- **Status**: Design Phase

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Design](#architecture-design)
4. [WebSocket Communication](#websocket-communication)
5. [Message Persistence](#message-persistence)
6. [Scalability Design](#scalability-design)
7. [End-to-End Encryption](#end-to-end-encryption)
8. [API Specifications](#api-specifications)
9. [Database Schema](#database-schema)
10. [Security Considerations](#security-considerations)
11. [Infrastructure Requirements](#infrastructure-requirements)
12. [Performance Requirements](#performance-requirements)
13. [Monitoring and Logging](#monitoring-and-logging)
14. [Implementation Phases](#implementation-phases)
15. [Risk Assessment](#risk-assessment)

---

## 1. Executive Summary

This document outlines the technical design for implementing a real-time chat feature in the Employee Management System. The solution leverages WebSocket technology for real-time bidirectional communication, PostgreSQL for persistent message storage, and implements end-to-end encryption for secure communications. The system is designed to support 10,000 concurrent users with horizontal scalability.

### Key Requirements
- **Real-time Communication**: WebSocket-based bidirectional messaging
- **Persistence**: PostgreSQL database for message history
- **Scalability**: Support for 10,000+ concurrent users
- **Security**: End-to-end encryption (E2EE) for all messages

---

## 2. System Overview

### 2.1 High-Level Architecture

```
┌─────────────────┐
│   Web Client    │ (React + WebSocket Client + Crypto)
└────────┬────────┘
         │ WSS (Secure WebSocket)
         ▼
┌─────────────────────────────────────────┐
│         Load Balancer (NGINX)           │
│    (WebSocket + Sticky Sessions)        │
└────────┬────────────────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌─────────┐  ...  ┌─────────┐
│ Node.js │ │ Node.js │        │ Node.js │
│ Server  │ │ Server  │        │ Server  │
│   +     │ │   +     │        │   +     │
│Socket.io│ │Socket.io│        │Socket.io│
└────┬────┘ └────┬────┘        └────┬────┘
     │           │                   │
     └───────────┴───────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌──────────────┐  ┌─────────────┐
│   Redis      │  │ PostgreSQL  │
│  (Pub/Sub)   │  │  (Messages) │
│  (Presence)  │  │  (Users)    │
└──────────────┘  └─────────────┘
```

### 2.2 Core Components

1. **Client Layer**: React-based web application with WebSocket client
2. **WebSocket Gateway**: Node.js servers with Socket.io for WebSocket management
3. **Message Broker**: Redis for pub/sub and cross-server communication
4. **Persistence Layer**: PostgreSQL for message and user data
5. **Encryption Layer**: Client-side E2EE using Web Crypto API

---

## 3. Architecture Design

### 3.1 Technology Stack

#### Backend
- **Node.js** (v18 LTS): Runtime environment
- **Socket.io** (v4.x): WebSocket library with fallback support
- **Express** (v5.x): HTTP server for REST API
- **PostgreSQL** (v15): Primary database for persistence
- **Redis** (v7.x): Pub/sub message broker and session store
- **ioredis**: Redis adapter for Socket.io

#### Frontend
- **React** (v18.x): UI framework
- **Socket.io-client** (v4.x): WebSocket client library
- **Web Crypto API**: Browser-native encryption
- **IndexedDB**: Client-side key storage

#### Infrastructure
- **NGINX**: Load balancer with WebSocket support
- **Docker**: Containerization
- **Kubernetes**: Container orchestration (optional for scale)
- **PM2**: Process manager for Node.js

### 3.2 System Components

#### 3.2.1 WebSocket Server
```javascript
// Pseudo-code structure
class ChatServer {
  constructor() {
    this.io = socketIO(server, {
      cors: { origin: process.env.CLIENT_URL },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });
    
    this.redisAdapter = createAdapter(redisClient);
    this.io.adapter(this.redisAdapter);
  }
  
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleAuthentication(socket);
      this.handleMessageEvents(socket);
      this.handleTypingEvents(socket);
      this.handlePresenceEvents(socket);
    });
  }
}
```

#### 3.2.2 Message Service
```javascript
class MessageService {
  async saveMessage(messageData) {
    // Validate and save encrypted message to PostgreSQL
    // Update Redis cache for recent messages
    // Broadcast via Redis pub/sub
  }
  
  async getMessageHistory(chatId, pagination) {
    // Retrieve from cache or database
    // Support cursor-based pagination
  }
}
```

---

## 4. WebSocket Communication

### 4.1 Connection Establishment

#### Flow
1. Client authenticates via REST API (JWT token)
2. Client establishes WebSocket connection with token
3. Server validates token and creates socket session
4. Server subscribes client to relevant channels
5. Client receives connection acknowledgment

#### Authentication
```javascript
// Client-side
const socket = io(SERVER_URL, {
  auth: {
    token: jwtToken
  },
  transports: ['websocket']
});

// Server-side middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});
```

### 4.2 Event Types

#### Client to Server Events
- `message:send` - Send a new message
- `message:read` - Mark messages as read
- `typing:start` - User started typing
- `typing:stop` - User stopped typing
- `chat:join` - Join a chat room
- `chat:leave` - Leave a chat room

#### Server to Client Events
- `message:new` - New message received
- `message:delivered` - Message delivery confirmation
- `message:error` - Message sending failed
- `typing:indicator` - Typing indicator for other users
- `presence:update` - User online/offline status
- `connection:acknowledged` - Connection successful

### 4.3 Message Format

```javascript
// Encrypted message structure
{
  "messageId": "uuid-v4",
  "chatId": "chat-uuid",
  "senderId": "user-uuid",
  "encryptedContent": "base64-encrypted-payload",
  "encryptedKeys": {
    "recipient1-id": "encrypted-symmetric-key-for-user1",
    "recipient2-id": "encrypted-symmetric-key-for-user2"
  },
  "iv": "initialization-vector",
  "timestamp": "ISO-8601-timestamp",
  "messageType": "text|image|file",
  "metadata": {
    "replyTo": "message-id",
    "mentions": ["user-id-1", "user-id-2"]
  }
}
```

### 4.4 Connection Management

#### Reconnection Strategy
```javascript
const socket = io(SERVER_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});

socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server disconnected, manual reconnection needed
    socket.connect();
  }
  // Auto-reconnection for other cases
});
```

#### Heartbeat Mechanism
- Ping interval: 25 seconds
- Ping timeout: 60 seconds
- Automatic reconnection on timeout

---

## 5. Message Persistence

### 5.1 Database: PostgreSQL

#### Why PostgreSQL?
- **ACID Compliance**: Ensures data integrity
- **JSON Support**: Native JSONB for metadata storage
- **Full-Text Search**: Built-in search capabilities
- **Scalability**: Proven at scale with proper indexing
- **Replication**: Built-in streaming replication

### 5.2 Data Flow

1. Client sends encrypted message via WebSocket
2. Server validates and stores in PostgreSQL
3. Server publishes to Redis pub/sub
4. Other servers receive via Redis and emit to connected clients
5. Recent messages cached in Redis (optional)

### 5.3 Caching Strategy

#### Redis Caching
```javascript
// Cache recent messages per chat (last 50 messages)
const CACHE_KEY = `chat:${chatId}:recent`;
const CACHE_TTL = 3600; // 1 hour

// On message send
await redis.lpush(CACHE_KEY, JSON.stringify(message));
await redis.ltrim(CACHE_KEY, 0, 49); // Keep last 50
await redis.expire(CACHE_KEY, CACHE_TTL);

// On message fetch
const cached = await redis.lrange(CACHE_KEY, 0, -1);
if (cached.length > 0) {
  return cached.map(JSON.parse);
}
// Fallback to PostgreSQL
```

### 5.4 Message Retention Policy

- **Active Messages**: Stored indefinitely
- **Deleted Messages**: Soft delete with tombstone
- **Archive Policy**: Messages older than 2 years moved to cold storage
- **Backup**: Daily incremental, weekly full backup

---

## 6. Scalability Design

### 6.1 Horizontal Scaling Strategy

#### Target: 10,000 Concurrent Users

**Assumptions**:
- Average message rate: 5 messages/user/minute
- Total message rate: ~833 messages/second
- Each server handles 1,000 concurrent connections

**Architecture**:
- **10 Node.js instances** (each handling 1,000 users)
- **Redis Cluster**: 3 master nodes + 3 replicas
- **PostgreSQL**: Master-slave replication (1 master + 2 read replicas)

### 6.2 Load Balancing

#### NGINX Configuration
```nginx
upstream websocket_backend {
  # IP hash for sticky sessions
  ip_hash;
  
  server node1:3000 max_fails=3 fail_timeout=30s;
  server node2:3000 max_fails=3 fail_timeout=30s;
  server node3:3000 max_fails=3 fail_timeout=30s;
  # ... up to 10 servers
}

server {
  listen 443 ssl http2;
  server_name chat.example.com;
  
  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
  
  location /socket.io/ {
    proxy_pass http://websocket_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    
    # Increase timeouts for WebSocket
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;
  }
}
```

### 6.3 Redis Pub/Sub Architecture

```javascript
// Server instance publishes messages
redisPublisher.publish('chat:messages', JSON.stringify({
  chatId: 'chat-123',
  message: messageData
}));

// All server instances subscribe
redisSubscriber.subscribe('chat:messages');
redisSubscriber.on('message', (channel, data) => {
  const { chatId, message } = JSON.parse(data);
  // Emit to local connected clients in this chat
  io.to(chatId).emit('message:new', message);
});
```

### 6.4 Database Scaling

#### Read Replicas
- **Master**: Write operations (message inserts, updates)
- **Replica 1**: Read operations (message history, search)
- **Replica 2**: Analytics queries, backups

#### Connection Pooling
```javascript
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  max: 20, // Max connections per server instance
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

#### Sharding Strategy (Future)
- Shard by `chatId` using consistent hashing
- Each shard handles subset of chats
- Enables further horizontal scaling beyond 10k users

### 6.5 Performance Optimizations

1. **Message Batching**: Batch database writes (100ms window)
2. **Compression**: Enable Socket.io compression for large payloads
3. **CDN**: Serve static assets via CDN
4. **Binary Protocol**: Use binary format for media files
5. **Lazy Loading**: Load message history on-demand

---

## 7. End-to-End Encryption

### 7.1 Encryption Architecture

#### Key Principles
- **Client-Side Encryption**: All encryption happens in the browser
- **Zero-Knowledge**: Server never sees plaintext messages
- **Forward Secrecy**: Regular key rotation
- **Key Exchange**: Asymmetric encryption for key distribution

### 7.2 Cryptographic Approach

#### Technologies
- **Web Crypto API**: Browser-native cryptography
- **Algorithm**: AES-256-GCM for message encryption
- **Key Exchange**: RSA-OAEP (4096-bit) for key encryption
- **Key Derivation**: PBKDF2 for password-based keys

### 7.3 Key Management

#### User Key Pair (Generated on Registration)
```javascript
// Generate RSA key pair
const keyPair = await crypto.subtle.generateKey(
  {
    name: "RSA-OAEP",
    modulusLength: 4096,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256"
  },
  true,
  ["encrypt", "decrypt"]
);

// Export public key (sent to server)
const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);

// Export private key (encrypted with user password, stored locally)
const privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
const encryptedPrivateKey = await encryptWithPassword(privateKey, userPassword);
```

#### Message Encryption Flow

**Sender Side**:
1. Generate random AES-256 symmetric key
2. Encrypt message with symmetric key
3. Fetch recipient public keys from server
4. Encrypt symmetric key with each recipient's public key
5. Send encrypted message + encrypted keys to server

```javascript
// 1. Generate symmetric key
const symmetricKey = await crypto.subtle.generateKey(
  { name: "AES-GCM", length: 256 },
  true,
  ["encrypt", "decrypt"]
);

// 2. Encrypt message
const iv = crypto.getRandomValues(new Uint8Array(12));
const encryptedContent = await crypto.subtle.encrypt(
  { name: "AES-GCM", iv },
  symmetricKey,
  new TextEncoder().encode(messageText)
);

// 3. Export symmetric key
const rawKey = await crypto.subtle.exportKey("raw", symmetricKey);

// 4. Encrypt key for each recipient
const encryptedKeys = {};
for (const recipient of recipients) {
  const recipientPublicKey = await importPublicKey(recipient.publicKey);
  encryptedKeys[recipient.id] = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    rawKey
  );
}

// 5. Construct encrypted message
const encryptedMessage = {
  encryptedContent: arrayBufferToBase64(encryptedContent),
  encryptedKeys: Object.fromEntries(
    Object.entries(encryptedKeys).map(([id, key]) => 
      [id, arrayBufferToBase64(key)]
    )
  ),
  iv: arrayBufferToBase64(iv)
};
```

**Receiver Side**:
1. Receive encrypted message + encrypted symmetric key
2. Decrypt symmetric key with private key
3. Decrypt message with symmetric key
4. Display plaintext message

```javascript
// 1. Decrypt symmetric key
const encryptedSymmetricKey = base64ToArrayBuffer(
  message.encryptedKeys[currentUserId]
);
const symmetricKeyRaw = await crypto.subtle.decrypt(
  { name: "RSA-OAEP" },
  userPrivateKey,
  encryptedSymmetricKey
);

// 2. Import symmetric key
const symmetricKey = await crypto.subtle.importKey(
  "raw",
  symmetricKeyRaw,
  { name: "AES-GCM" },
  false,
  ["decrypt"]
);

// 3. Decrypt message
const iv = base64ToArrayBuffer(message.iv);
const encryptedContent = base64ToArrayBuffer(message.encryptedContent);
const decryptedContent = await crypto.subtle.decrypt(
  { name: "AES-GCM", iv },
  symmetricKey,
  encryptedContent
);

// 4. Display
const plaintext = new TextDecoder().decode(decryptedContent);
```

### 7.4 Key Storage

#### Client-Side Storage
- **Public Keys**: Stored on server (non-sensitive)
- **Private Keys**: Encrypted with user password, stored in IndexedDB
- **Session Keys**: In-memory only, cleared on logout

#### Server-Side Storage
```sql
CREATE TABLE user_public_keys (
  user_id UUID PRIMARY KEY,
  public_key TEXT NOT NULL,
  key_fingerprint VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_key_fingerprint ON user_public_keys(key_fingerprint);
```

### 7.5 Key Rotation

- **User Keys**: Rotate every 90 days (user-initiated)
- **Session Keys**: Unique per message (automatic)
- **Notification**: Users notified to re-encrypt old messages with new key

### 7.6 Security Considerations

1. **Man-in-the-Middle**: TLS/SSL for transport security
2. **Key Verification**: Display key fingerprints for manual verification
3. **Device Management**: Track trusted devices
4. **Key Recovery**: Secure key backup mechanism (optional)
5. **Audit Logging**: Track key generation and rotation events

---

## 8. API Specifications

### 8.1 REST API Endpoints

#### Authentication
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh-token
```

#### User Management
```
GET    /api/users/:userId
GET    /api/users/:userId/public-key
POST   /api/users/:userId/public-key
GET    /api/users/search?q=name
```

#### Chat Management
```
GET    /api/chats                    # List user's chats
POST   /api/chats                    # Create new chat
GET    /api/chats/:chatId            # Get chat details
PUT    /api/chats/:chatId            # Update chat
DELETE /api/chats/:chatId            # Delete chat
POST   /api/chats/:chatId/members    # Add members
DELETE /api/chats/:chatId/members/:userId  # Remove member
```

#### Message Management
```
GET    /api/chats/:chatId/messages   # Get message history
GET    /api/messages/:messageId      # Get specific message
DELETE /api/messages/:messageId      # Delete message (soft)
```

### 8.2 WebSocket API

#### Connection
```javascript
// Client connects
const socket = io(SERVER_URL, {
  auth: { token: 'jwt-token' }
});

// Server acknowledges
socket.emit('connection:acknowledged', {
  userId: 'user-123',
  sessionId: 'session-456'
});
```

#### Send Message
```javascript
// Client emits
socket.emit('message:send', {
  chatId: 'chat-123',
  encryptedContent: '...',
  encryptedKeys: {...},
  iv: '...',
  messageType: 'text',
  metadata: {}
});

// Server responds
socket.emit('message:delivered', {
  messageId: 'msg-789',
  chatId: 'chat-123',
  timestamp: '2026-02-12T10:00:00Z'
});

// Server broadcasts to recipients
socket.to(chatId).emit('message:new', {
  messageId: 'msg-789',
  chatId: 'chat-123',
  senderId: 'user-123',
  encryptedContent: '...',
  encryptedKeys: {...},
  iv: '...',
  timestamp: '2026-02-12T10:00:00Z'
});
```

#### Typing Indicator
```javascript
// Start typing
socket.emit('typing:start', { chatId: 'chat-123' });

// Stop typing
socket.emit('typing:stop', { chatId: 'chat-123' });

// Receive indicator
socket.on('typing:indicator', (data) => {
  // data = { chatId, userId, isTyping: true/false }
});
```

#### Presence
```javascript
// Join chat room
socket.emit('chat:join', { chatId: 'chat-123' });

// Leave chat room
socket.emit('chat:leave', { chatId: 'chat-123' });

// Presence update
socket.on('presence:update', (data) => {
  // data = { userId, status: 'online'|'offline', timestamp }
});
```

---

## 9. Database Schema

### 9.1 PostgreSQL Schema

```sql
-- Users table (extends existing employees table)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id INTEGER REFERENCES employees(id),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP,
  status VARCHAR(20) DEFAULT 'offline', -- online, offline, away
  CONSTRAINT fk_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- User public keys for E2EE
CREATE TABLE user_public_keys (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  key_fingerprint VARCHAR(64) NOT NULL UNIQUE,
  algorithm VARCHAR(20) DEFAULT 'RSA-OAEP',
  key_size INTEGER DEFAULT 4096,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chats (rooms/conversations)
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  type VARCHAR(20) NOT NULL, -- direct, group, channel
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP
);

-- Chat members
CREATE TABLE chat_members (
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member', -- admin, member
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_read_at TIMESTAMP,
  is_muted BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (chat_id, user_id)
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Encrypted content
  encrypted_content TEXT NOT NULL,
  encrypted_keys JSONB NOT NULL, -- {userId: encryptedKey}
  iv VARCHAR(32) NOT NULL, -- Initialization vector
  
  message_type VARCHAR(20) DEFAULT 'text', -- text, image, file, system
  metadata JSONB, -- {replyTo, mentions, fileName, fileSize, etc}
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP, -- Soft delete
  
  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(metadata->>'plaintextPreview', ''))
  ) STORED
);

-- Message read receipts
CREATE TABLE message_receipts (
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, user_id)
);

-- Devices (for multi-device support)
CREATE TABLE user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_name VARCHAR(100),
  device_fingerprint VARCHAR(255) UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_trusted BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX idx_messages_chat_id ON messages(chat_id, created_at DESC);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_deleted_at ON messages(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_search ON messages USING GIN(search_vector);
CREATE INDEX idx_chat_members_user_id ON chat_members(user_id);
CREATE INDEX idx_chat_members_chat_id ON chat_members(chat_id);
CREATE INDEX idx_chats_last_message ON chats(last_message_at DESC);
CREATE INDEX idx_users_status ON users(status, last_seen);
CREATE INDEX idx_message_receipts_user ON message_receipts(user_id, read_at);

-- Trigger to update chat.last_message_at
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats 
  SET last_message_at = NEW.created_at 
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_last_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_last_message();

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_update_chats_updated_at
BEFORE UPDATE ON chats
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_update_messages_updated_at
BEFORE UPDATE ON messages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

### 9.2 Redis Data Structures

```javascript
// User presence
// Key: user:${userId}:presence
// Type: Hash
// TTL: 5 minutes (refreshed on heartbeat)
{
  status: 'online',
  lastSeen: '2026-02-12T10:00:00Z',
  activeChats: ['chat-1', 'chat-2']
}

// Recent messages cache (per chat)
// Key: chat:${chatId}:messages:recent
// Type: List
// TTL: 1 hour
[message1, message2, ...] // Last 50 messages

// Typing indicators
// Key: chat:${chatId}:typing
// Type: Set
// TTL: 5 seconds
['userId1', 'userId2']

// Online users count
// Key: stats:online_users
// Type: String
// Value: count

// Active connections (per server)
// Key: server:${serverId}:connections
// Type: Set
['userId1', 'userId2', ...]
```

---

## 10. Security Considerations

### 10.1 Transport Security

- **TLS 1.3**: All WebSocket connections over WSS (WebSocket Secure)
- **Certificate Pinning**: Optional for mobile apps
- **HSTS**: HTTP Strict Transport Security headers

### 10.2 Authentication & Authorization

#### JWT Authentication
```javascript
// Token structure
{
  userId: 'uuid',
  email: 'user@example.com',
  iat: 1234567890,
  exp: 1234571490, // 1 hour
  type: 'access'
}

// Refresh token (stored in httpOnly cookie)
{
  userId: 'uuid',
  iat: 1234567890,
  exp: 1234654290, // 24 hours
  type: 'refresh'
}
```

#### Authorization Rules
- Users can only join chats they're members of
- Users can only read messages from chats they're members of
- Only chat admins can add/remove members
- Users can only delete their own messages

### 10.3 Rate Limiting

```javascript
// Connection rate limiting
const connectionLimiter = {
  maxConnections: 5, // per user
  windowMs: 60000 // 1 minute
};

// Message rate limiting
const messageLimiter = {
  max: 60, // messages
  windowMs: 60000, // per minute
  skipFailedRequests: true
};

// API rate limiting (existing)
const apiLimiter = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // requests per IP
};
```

### 10.4 Input Validation & Sanitization

```javascript
// Message validation
const messageSchema = {
  chatId: { type: 'uuid', required: true },
  encryptedContent: { 
    type: 'string', 
    maxLength: 100000, // ~100KB
    required: true 
  },
  encryptedKeys: { 
    type: 'object',
    required: true,
    validate: (keys) => Object.keys(keys).length > 0
  },
  iv: { type: 'string', required: true },
  messageType: { 
    type: 'string', 
    enum: ['text', 'image', 'file', 'system'] 
  }
};
```

### 10.5 SQL Injection Prevention

- **Parameterized Queries**: All database queries use parameterized statements
- **ORM**: Consider using an ORM (e.g., Sequelize) for additional safety
- **Input Validation**: Strict validation before database operations

### 10.6 XSS Prevention

- **Content Security Policy**: Strict CSP headers
- **Sanitization**: Sanitize user-generated content before rendering
- **React**: React's built-in XSS protection

### 10.7 CSRF Prevention

- **SameSite Cookies**: Set SameSite attribute on cookies
- **CSRF Tokens**: For state-changing operations
- **Origin Checking**: Validate Origin header on WebSocket connections

### 10.8 Monitoring & Logging

```javascript
// Security event logging
const securityEvents = [
  'AUTH_FAILURE',
  'RATE_LIMIT_EXCEEDED',
  'INVALID_TOKEN',
  'UNAUTHORIZED_ACCESS',
  'SUSPICIOUS_ACTIVITY',
  'KEY_ROTATION',
  'DEVICE_ADDED'
];

// Log structure
{
  timestamp: '2026-02-12T10:00:00Z',
  event: 'AUTH_FAILURE',
  userId: 'user-123',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  details: { attempts: 3 }
}
```

---

## 11. Infrastructure Requirements

### 11.1 Server Specifications

#### Application Servers (10 instances for 10k users)
- **CPU**: 4 vCPUs
- **RAM**: 8 GB
- **Network**: 1 Gbps
- **OS**: Ubuntu 22.04 LTS
- **Software**: Node.js v18, PM2

#### PostgreSQL Server
- **CPU**: 8 vCPUs
- **RAM**: 32 GB
- **Storage**: 500 GB SSD (RAID 10)
- **IOPS**: 10,000+
- **Replication**: 2 read replicas

#### Redis Cluster (3 masters + 3 replicas)
- **CPU**: 2 vCPUs per instance
- **RAM**: 16 GB per instance
- **Network**: 10 Gbps
- **Persistence**: AOF + RDB

#### Load Balancer
- **Type**: NGINX or AWS ALB
- **Throughput**: 10 Gbps
- **SSL Offloading**: Yes

### 11.2 Network Architecture

```
Internet
   |
   v
[Firewall/WAF]
   |
   v
[Load Balancer] (HTTPS/WSS)
   |
   +-------------------+
   |                   |
   v                   v
[App Servers]    [App Servers]
   |                   |
   +-------------------+
   |
   +--------+--------+
   |        |        |
   v        v        v
[Redis] [PostgreSQL] [S3/Storage]
```

### 11.3 Deployment Architecture

#### Container Orchestration (Kubernetes)
```yaml
# Deployment for WebSocket servers
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chat-server
spec:
  replicas: 10
  selector:
    matchLabels:
      app: chat-server
  template:
    metadata:
      labels:
        app: chat-server
    spec:
      containers:
      - name: chat-server
        image: chat-server:latest
        ports:
        - containerPort: 3000
        env:
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        - name: DB_URL
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: url
        resources:
          requests:
            memory: "6Gi"
            cpu: "3"
          limits:
            memory: "8Gi"
            cpu: "4"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
```

### 11.4 Cloud Provider Resources (AWS Example)

- **EC2 Instances**: c5.xlarge (app servers)
- **RDS**: db.r5.2xlarge (PostgreSQL)
- **ElastiCache**: cache.r6g.xlarge (Redis)
- **ALB**: Application Load Balancer
- **S3**: File storage for media
- **CloudFront**: CDN for static assets
- **Route 53**: DNS management
- **CloudWatch**: Monitoring and logging

### 11.5 Estimated Costs (AWS, Monthly)

| Resource | Specification | Cost |
|----------|--------------|------|
| EC2 (10 instances) | c5.xlarge | ~$1,400 |
| RDS PostgreSQL | db.r5.2xlarge | ~$600 |
| ElastiCache Redis | cache.r6g.xlarge (6 nodes) | ~$900 |
| ALB | Standard | ~$50 |
| Data Transfer | 10 TB | ~$900 |
| S3 Storage | 1 TB | ~$25 |
| CloudWatch | Logs + Metrics | ~$100 |
| **Total** | | **~$3,975/month** |

---

## 12. Performance Requirements

### 12.1 Response Time SLAs

| Operation | Target | Maximum |
|-----------|--------|---------|
| Message Delivery | < 100ms | < 500ms |
| Message Persistence | < 200ms | < 1s |
| Connection Establishment | < 1s | < 3s |
| Message History Load | < 500ms | < 2s |
| Typing Indicator | < 50ms | < 200ms |
| Presence Update | < 100ms | < 500ms |

### 12.2 Throughput Requirements

- **Messages per Second**: 833 (sustained)
- **Peak Messages per Second**: 2,000
- **Concurrent WebSocket Connections**: 10,000
- **API Requests per Second**: 500

### 12.3 Resource Utilization Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| CPU Usage | < 70% | > 85% |
| Memory Usage | < 75% | > 90% |
| Database Connections | < 80% of pool | > 90% |
| Redis Memory | < 80% | > 90% |
| Network Bandwidth | < 60% | > 80% |
| Disk I/O | < 70% | > 85% |

### 12.4 Performance Testing Strategy

#### Load Testing Scenarios
1. **Ramp-up Test**: 0 to 10,000 users over 30 minutes
2. **Sustained Load**: 10,000 users for 2 hours
3. **Spike Test**: Sudden jump from 2,000 to 10,000 users
4. **Soak Test**: 5,000 users for 24 hours

#### Tools
- **Artillery**: WebSocket load testing
- **k6**: API load testing
- **Apache JMeter**: End-to-end testing

---

## 13. Monitoring and Logging

### 13.1 Application Metrics

#### Key Performance Indicators (KPIs)
```javascript
// Metrics to collect
const metrics = {
  connections: {
    current: 'gauge',
    total: 'counter',
    failed: 'counter'
  },
  messages: {
    sent: 'counter',
    delivered: 'counter',
    failed: 'counter',
    latency: 'histogram'
  },
  database: {
    query_time: 'histogram',
    connection_pool: 'gauge',
    errors: 'counter'
  },
  redis: {
    operations: 'counter',
    latency: 'histogram',
    errors: 'counter'
  },
  encryption: {
    encrypt_time: 'histogram',
    decrypt_time: 'histogram',
    key_operations: 'counter'
  }
};
```

#### Monitoring Stack
- **Prometheus**: Metrics collection
- **Grafana**: Visualization and dashboards
- **AlertManager**: Alert routing and management

### 13.2 Logging Strategy

#### Log Levels
- **ERROR**: Application errors, exceptions
- **WARN**: Deprecations, potential issues
- **INFO**: Important events (connections, disconnections)
- **DEBUG**: Detailed diagnostic information

#### Structured Logging
```javascript
// Log format (JSON)
{
  timestamp: '2026-02-12T10:00:00.123Z',
  level: 'INFO',
  service: 'chat-server',
  instance: 'server-01',
  traceId: 'trace-uuid',
  userId: 'user-123',
  event: 'message:sent',
  data: {
    messageId: 'msg-456',
    chatId: 'chat-789',
    latency: 45
  }
}
```

#### Log Aggregation
- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Retention**: 30 days hot, 90 days warm, 1 year cold

### 13.3 Alerting Rules

```yaml
# Example Prometheus alerts
groups:
  - name: chat_alerts
    rules:
    - alert: HighErrorRate
      expr: rate(errors_total[5m]) > 10
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate detected"
        
    - alert: HighMessageLatency
      expr: histogram_quantile(0.95, message_latency) > 500
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "95th percentile message latency > 500ms"
        
    - alert: DatabaseConnectionPoolExhausted
      expr: database_connections_active / database_connections_max > 0.9
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Database connection pool nearly exhausted"
```

### 13.4 Dashboard Metrics

#### Real-time Dashboard
- Active connections by server
- Messages per second
- Message delivery latency (p50, p95, p99)
- Error rate
- Database query performance
- Redis operations per second

#### Business Metrics
- Daily Active Users (DAU)
- Messages per user per day
- Average chat session duration
- Peak concurrent users
- Feature adoption rates

---

## 14. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Setup infrastructure and basic WebSocket server

- [ ] Setup PostgreSQL database with schema
- [ ] Setup Redis cluster
- [ ] Implement basic WebSocket server with Socket.io
- [ ] Implement JWT authentication
- [ ] Create REST API for user and chat management
- [ ] Setup development environment

**Deliverables**:
- Working WebSocket server
- Database schema implemented
- Basic authentication working

### Phase 2: Core Messaging (Weeks 3-4)
**Goal**: Implement core messaging functionality

- [ ] Implement message sending/receiving via WebSocket
- [ ] Implement message persistence in PostgreSQL
- [ ] Implement Redis pub/sub for multi-server support
- [ ] Add typing indicators
- [ ] Add presence system (online/offline)
- [ ] Implement message history retrieval

**Deliverables**:
- Real-time messaging working
- Message history accessible
- Typing indicators functional

### Phase 3: End-to-End Encryption (Weeks 5-6)
**Goal**: Implement E2EE for all messages

- [ ] Implement key generation (RSA-4096)
- [ ] Implement message encryption (AES-256-GCM)
- [ ] Implement key management (public key storage)
- [ ] Client-side encryption/decryption
- [ ] Key exchange mechanism
- [ ] IndexedDB for private key storage

**Deliverables**:
- E2EE fully functional
- Key management working
- Security audit passed

### Phase 4: Scalability (Weeks 7-8)
**Goal**: Scale to 10,000 concurrent users

- [ ] Setup load balancer (NGINX)
- [ ] Deploy multiple server instances
- [ ] Configure Redis adapter for Socket.io
- [ ] Implement connection pooling
- [ ] Setup database replication
- [ ] Implement caching strategy

**Deliverables**:
- Multi-server deployment
- Load testing passed (10k users)
- Performance benchmarks met

### Phase 5: Features & UX (Weeks 9-10)
**Goal**: Polish and additional features

- [ ] Read receipts
- [ ] Message search
- [ ] File attachments
- [ ] Message reactions
- [ ] Message editing/deletion
- [ ] User settings
- [ ] Notification system

**Deliverables**:
- Feature-complete chat application
- User acceptance testing passed

### Phase 6: Monitoring & Deployment (Weeks 11-12)
**Goal**: Production-ready deployment

- [ ] Setup monitoring (Prometheus + Grafana)
- [ ] Setup logging (ELK stack)
- [ ] Implement alerting rules
- [ ] Security hardening
- [ ] Performance optimization
- [ ] Documentation
- [ ] Production deployment

**Deliverables**:
- Production deployment
- Monitoring dashboards
- Complete documentation

---

## 15. Risk Assessment

### 15.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| WebSocket connection instability | Medium | High | Implement robust reconnection logic, fallback to polling |
| Database performance bottleneck | Medium | High | Implement caching, database optimization, read replicas |
| Redis single point of failure | Low | High | Use Redis Cluster with replication |
| Key management complexity | Medium | Medium | Thorough testing, clear documentation, key recovery mechanism |
| Browser compatibility issues | Low | Medium | Use polyfills, test across browsers |
| Message delivery failures | Medium | High | Implement message queue, retry mechanism, acknowledgments |

### 15.2 Security Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Man-in-the-middle attacks | Low | Critical | Enforce TLS 1.3, certificate pinning |
| Key compromise | Low | Critical | Regular key rotation, device management |
| DDoS attacks | Medium | High | Rate limiting, DDoS protection (CloudFlare) |
| XSS attacks | Low | High | CSP headers, input sanitization |
| Session hijacking | Low | High | Secure cookies, short token expiry |
| Replay attacks | Low | Medium | Nonce in messages, timestamp validation |

### 15.3 Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Insufficient capacity | Medium | High | Auto-scaling, capacity planning |
| Data loss | Low | Critical | Regular backups, replication |
| Network partitions | Low | High | Multi-AZ deployment, circuit breakers |
| Deployment failures | Medium | Medium | Blue-green deployment, rollback plan |
| Cost overruns | Medium | Medium | Resource monitoring, cost alerts |

### 15.4 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Low user adoption | Medium | High | User testing, gradual rollout |
| Poor user experience | Medium | High | UX research, feedback loops |
| Compliance issues | Low | High | Legal review, privacy audit |
| Vendor lock-in | Low | Medium | Use open standards, containerization |

---

## 16. Appendices

### Appendix A: Glossary

- **E2EE**: End-to-End Encryption
- **WSS**: WebSocket Secure (WebSocket over TLS)
- **JWT**: JSON Web Token
- **PBKDF2**: Password-Based Key Derivation Function 2
- **AES-GCM**: Advanced Encryption Standard - Galois/Counter Mode
- **RSA-OAEP**: RSA Optimal Asymmetric Encryption Padding
- **Pub/Sub**: Publish/Subscribe messaging pattern
- **TTL**: Time To Live

### Appendix B: References

1. Socket.io Documentation: https://socket.io/docs/
2. Web Crypto API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
3. PostgreSQL Documentation: https://www.postgresql.org/docs/
4. Redis Documentation: https://redis.io/documentation
5. Signal Protocol (E2EE inspiration): https://signal.org/docs/
6. WebSocket RFC 6455: https://tools.ietf.org/html/rfc6455

### Appendix C: Alternative Approaches Considered

#### 1. Database Choice
- **Considered**: MongoDB, Cassandra
- **Reason for PostgreSQL**: ACID compliance, better consistency guarantees, mature tooling

#### 2. Message Broker
- **Considered**: RabbitMQ, Kafka
- **Reason for Redis**: Lower latency, simpler setup, sufficient for use case

#### 3. Encryption Approach
- **Considered**: Server-side encryption, TLS only
- **Reason for E2EE**: Zero-knowledge architecture, enhanced security, user privacy

### Appendix D: Future Enhancements

1. **Video/Voice Calls**: WebRTC integration
2. **Message Threading**: Organize conversations in threads
3. **Advanced Search**: Semantic search using vector databases
4. **AI Features**: Smart replies, message summarization
5. **Mobile Apps**: Native iOS/Android applications
6. **Bot Framework**: Chatbot integration API
7. **Webhooks**: External integrations
8. **Analytics Dashboard**: Usage statistics and insights

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-12 | Shruthi Titan | Initial technical design document |

---

## Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Tech Lead | | | |
| Security Architect | | | |
| Engineering Manager | | | |
| Product Owner | | | |

---

**End of Document**
