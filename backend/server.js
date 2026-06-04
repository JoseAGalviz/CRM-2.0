require('dotenv').config();
const path    = require('path');
const http    = require('http');
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const jwt     = require('jsonwebtoken');
const { Server } = require('socket.io');
const { db } = require('./db/database');
const { runMigrations } = require('./db/migrations');
const { seed } = require('./db/seed');
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');

const app    = express();
const server = http.createServer(app);

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'ws:'],
    }
  }
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
const localNetworkPattern = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/;
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || localNetworkPattern.test(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);

// ── REST Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/contacts',    require('./routes/contacts'));
app.use('/api/companies',   require('./routes/companies'));
app.use('/api/deals',       require('./routes/deals'));
app.use('/api/tasks',       require('./routes/tasks'));
app.use('/api/activities',  require('./routes/activities'));
app.use('/api/notes',       require('./routes/notes'));
app.use('/api/dashboard',   require('./routes/dashboard'));
app.use('/api/chat',        require('./routes/chat'));
app.use('/api/search',     require('./routes/search'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Frontend static + SPA catch-all ──────────────────────────────────────────
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// ── 404 / Error handlers ──────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.message === 'Not allowed by CORS') return res.status(403).json({ success: false, message: 'CORS error' });
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? true : allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// JWT authentication middleware for sockets
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = payload;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user.id;
  console.log(`💬 Chat: user ${socket.user.name} (${userId}) connected`);

  // ── join: subscribe to all user's conversations ─────────────────────────────
  socket.on('join_conversations', async () => {
    try {
      const convs = await db.all(
        `SELECT conversation_id FROM chat_members WHERE user_id = ? AND left_at IS NULL`,
        userId
      );
      for (const { conversation_id } of convs) {
        socket.join(`conv:${conversation_id}`);
      }
    } catch (err) {
      console.error('join_conversations error', err);
    }
  });

  // ── join specific conversation room ─────────────────────────────────────────
  socket.on('join_conversation', async ({ conversationId }) => {
    const member = await db.get(
      `SELECT id FROM chat_members WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL`,
      conversationId, userId
    );
    if (member) socket.join(`conv:${conversationId}`);
  });

  // ── send message ─────────────────────────────────────────────────────────────
  socket.on('send_message', async ({ conversationId, content, reply_to_id }, ack) => {
    try {
      if (!content?.trim()) return;

      const member = await db.get(
        `SELECT id FROM chat_members WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL`,
        conversationId, userId
      );
      if (!member) return;

      // Validate reply_to_id belongs to same conversation
      const validReplyId = reply_to_id
        ? (await db.get(`SELECT id FROM chat_messages WHERE id = ? AND conversation_id = ?`, reply_to_id, conversationId))?.id ?? null
        : null;

      const { lastInsertRowid: msgId } = await db.run(
        `INSERT INTO chat_messages (conversation_id, sender_id, content, reply_to_id) VALUES (?, ?, ?, ?)`,
        conversationId, userId, content.trim(), validReplyId
      );

      // Auto-read by sender
      await db.run(
        `INSERT OR IGNORE INTO chat_message_reads (message_id, user_id) VALUES (?, ?)`,
        msgId, userId
      );

      await db.run(
        `UPDATE chat_conversations SET updated_at = datetime('now') WHERE id = ?`,
        conversationId
      );

      const msg = await db.get(
        `SELECT m.*,
                u.name AS sender_name, u.avatar_url AS sender_avatar,
                rm.content AS reply_content,
                ru.name    AS reply_sender_name
         FROM chat_messages m
         JOIN users u ON u.id = m.sender_id
         LEFT JOIN chat_messages rm ON rm.id = m.reply_to_id
         LEFT JOIN users ru ON ru.id = rm.sender_id
         WHERE m.id = ?`,
        msgId
      );
      msg.reads = [{ user_id: userId, read_at: msg.created_at, name: msg.sender_name }];

      // Emit to all room members (including sender to sync across tabs)
      io.to(`conv:${conversationId}`).emit('new_message', msg);

      if (typeof ack === 'function') ack({ success: true, message: msg });
    } catch (err) {
      console.error('send_message error', err);
      if (typeof ack === 'function') ack({ success: false, error: err.message });
    }
  });

  // ── mark messages as read ────────────────────────────────────────────────────
  socket.on('mark_read', async ({ conversationId }) => {
    try {
      const member = await db.get(
        `SELECT id FROM chat_members WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL`,
        conversationId, userId
      );
      if (!member) return;

      const unread = await db.all(
        `SELECT m.id FROM chat_messages m
         WHERE m.conversation_id = ?
           AND m.sender_id != ?
           AND m.deleted_at IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM chat_message_reads r WHERE r.message_id = m.id AND r.user_id = ?
           )`,
        conversationId, userId, userId
      );

      for (const { id } of unread) {
        await db.run(
          `INSERT OR IGNORE INTO chat_message_reads (message_id, user_id) VALUES (?, ?)`,
          id, userId
        );
      }

      if (unread.length > 0) {
        const messageIds = unread.map(m => m.id);
        const user = await db.get(`SELECT id, name, avatar_url FROM users WHERE id = ?`, userId);
        // Notify all room members about who read the messages
        io.to(`conv:${conversationId}`).emit('messages_read', {
          conversationId,
          readBy: user,
          messageIds,
          readAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('mark_read error', err);
    }
  });

  // ── typing indicators ─────────────────────────────────────────────────────
  socket.on('typing', ({ conversationId }) => {
    socket.to(`conv:${conversationId}`).emit('user_typing', {
      conversationId,
      userId,
      name: socket.user.name,
    });
  });

  socket.on('stop_typing', ({ conversationId }) => {
    socket.to(`conv:${conversationId}`).emit('user_stop_typing', {
      conversationId,
      userId,
    });
  });

  socket.on('disconnect', () => {
    console.log(`💬 Chat: user ${socket.user.name} (${userId}) disconnected`);
  });
});

// ── Export io for use in routes ────────────────────────────────────────────────
app.set('io', io);

// ── Start ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await runMigrations();
    if (process.env.DB_PATH === ':memory:' || process.env.DEMO_SEED === 'true') {
      await seed();
    }
    server.listen(PORT, () => {
      console.log(`🚀 CRM Server running on port ${PORT} [${process.env.NODE_ENV}]`);
      console.log(`💬 Socket.IO ready`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
module.exports = app;
