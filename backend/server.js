'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const MatchmakingQueue = require('./matchmaking');

const PORT = process.env.PORT || 4000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'zivo-admin-2025';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const queue = new MatchmakingQueue();

// socketId -> roomId
const rooms = new Map();

// ── Admin tracking ────────────────────────────────────────────────────────────
let totalSessions = 0;               // increments every match
const reportsLog = [];               // last 100 reports
const activePairs = new Map();       // roomId -> { userA, userB, startTime }
const userJoinTime = new Map();      // socketId -> timestamp

function recordReport(socketId, reason) {
  reportsLog.unshift({ socketId, reason, ts: Date.now() });
  if (reportsLog.length > 100) reportsLog.pop();
}

// ── Admin auth middleware ─────────────────────────────────────────────────────
function adminAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '').trim();
  if (token !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ── Admin REST routes ─────────────────────────────────────────────────────────

// Login — verify password
app.post('/admin/auth', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_SECRET) {
    res.json({ ok: true, token: ADMIN_SECRET });
  } else {
    res.status(401).json({ ok: false, error: 'Wrong password' });
  }
});

// Stats
app.get('/admin/stats', adminAuth, (req, res) => {
  res.json({
    online: io.engine.clientsCount,
    activeChats: activePairs.size,
    inQueue: queue.size(),
    totalSessions,
    uptime: Math.floor(process.uptime()),
  });
});

// Active rooms
app.get('/admin/rooms', adminAuth, (req, res) => {
  const list = [];
  activePairs.forEach((pair, roomId) => {
    list.push({
      roomId: roomId.slice(0, 8),
      fullRoomId: roomId,
      userA: pair.userA.slice(0, 8),
      fullUserA: pair.userA,
      userB: pair.userB.slice(0, 8),
      fullUserB: pair.userB,
      duration: Math.floor((Date.now() - pair.startTime) / 1000),
    });
  });
  res.json(list);
});

// Connected users
app.get('/admin/users', adminAuth, (req, res) => {
  const list = [];
  io.sockets.sockets.forEach((sock) => {
    list.push({
      id: sock.id.slice(0, 8),
      fullId: sock.id,
      status: activePairs.has(rooms.get(sock.id)) ? 'chatting' : queue.isQueued(sock.id) ? 'queued' : 'idle',
      joinedAgo: Math.floor((Date.now() - (userJoinTime.get(sock.id) || Date.now())) / 1000),
    });
  });
  res.json(list);
});

// Reports log
app.get('/admin/reports', adminAuth, (req, res) => {
  res.json(reportsLog);
});

// Kick a user
app.post('/admin/kick', adminAuth, (req, res) => {
  const { socketId } = req.body;
  const sock = io.sockets.sockets.get(socketId);
  if (!sock) return res.status(404).json({ error: 'User not found' });
  sock.emit('kicked', { reason: 'Removed by admin' });
  sock.disconnect(true);
  res.json({ ok: true });
});

// ── Matchmaking loop (every 500ms) ──────────────────────────────────────────
setInterval(() => {
  const pairs = queue.tryMatchAll();
  for (const [idA, idB] of pairs) {
    const roomId = crypto.randomUUID();
    rooms.set(idA, roomId);
    rooms.set(idB, roomId);
    const sockA = io.sockets.sockets.get(idA);
    const sockB = io.sockets.sockets.get(idB);
    if (sockA && sockB) {
      sockA.join(roomId);
      sockB.join(roomId);
      sockA.emit('matched', { roomId, isOfferer: true });
      sockB.emit('matched', { roomId, isOfferer: false });
      // Track
      totalSessions++;
      activePairs.set(roomId, { userA: idA, userB: idB, startTime: Date.now() });
    }
  }
  io.emit('online-count', io.engine.clientsCount);
}, 500);

// ── Socket events ────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] ${socket.id}`);
  userJoinTime.set(socket.id, Date.now());
  io.emit('online-count', io.engine.clientsCount);

  const eventTimes = {};
  function throttle(event, limit = 10, windowMs = 5000) {
    const now = Date.now();
    if (!eventTimes[event]) eventTimes[event] = [];
    eventTimes[event] = eventTimes[event].filter(t => now - t < windowMs);
    if (eventTimes[event].length >= limit) return true;
    eventTimes[event].push(now);
    return false;
  }

  socket.on('find-match', (prefs = {}) => {
    if (throttle('find-match', 8)) return;
    _leaveCurrentSession(socket);
    queue.enqueue(socket.id, {
      interests: Array.isArray(prefs.interests) ? prefs.interests.slice(0, 8) : [],
      country: prefs.country || null,
      gender: prefs.gender || null,
    });
    socket.emit('queued');
  });

  socket.on('next', (prefs = {}) => {
    if (throttle('next', 15)) return;
    const partner = queue.getPartner(socket.id);
    const roomId = rooms.get(socket.id);
    if (partner && roomId) {
      activePairs.delete(roomId);
      const partnerSock = io.sockets.sockets.get(partner);
      if (partnerSock) {
        partnerSock.leave(roomId);
        queue.enqueue(partner, {});
        partnerSock.emit('peer-disconnected');
        partnerSock.emit('queued');
      }
      socket.leave(roomId);
      rooms.delete(socket.id);
      rooms.delete(partner);
      queue.leaveSession(socket.id);
    }
    queue.enqueue(socket.id, {
      interests: Array.isArray(prefs.interests) ? prefs.interests.slice(0, 8) : [],
      country: prefs.country || null,
      gender: prefs.gender || null,
    });
    socket.emit('queued');
  });

  socket.on('leave', () => _leaveCurrentSession(socket));

  // WebRTC signaling
  socket.on('offer', ({ roomId, offer }) => {
    if (roomId && offer) socket.to(roomId).emit('offer', { offer });
  });
  socket.on('answer', ({ roomId, answer }) => {
    if (roomId && answer) socket.to(roomId).emit('answer', { answer });
  });
  socket.on('ice-candidate', ({ roomId, candidate }) => {
    if (roomId && candidate) socket.to(roomId).emit('ice-candidate', { candidate });
  });

  // Text chat
  socket.on('chat-message', ({ roomId, message }) => {
    if (throttle('chat-message', 25)) return;
    if (!roomId || typeof message !== 'string') return;
    const text = message.trim().slice(0, 500);
    if (text) socket.to(roomId).emit('chat-message', { message: text, ts: Date.now() });
  });

  socket.on('typing', ({ roomId, isTyping }) => {
    if (roomId) socket.to(roomId).emit('typing', { isTyping: !!isTyping });
  });

  socket.on('report', ({ reason }) => {
    console.log(`[REPORT] ${socket.id} — ${reason}`);
    recordReport(socket.id, reason || 'No reason');
    socket.emit('report-received');
  });

  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id}`);
    userJoinTime.delete(socket.id);
    const roomId = rooms.get(socket.id);
    if (roomId) {
      activePairs.delete(roomId);
      socket.to(roomId).emit('peer-disconnected');
      rooms.delete(socket.id);
    }
    const partner = queue.remove(socket.id);
    if (partner) {
      rooms.delete(partner);
      const partnerSock = io.sockets.sockets.get(partner);
      if (partnerSock) {
        queue.enqueue(partner, {});
        partnerSock.emit('queued');
      }
    }
    io.emit('online-count', io.engine.clientsCount);
  });

  function _leaveCurrentSession(sock) {
    const roomId = rooms.get(sock.id);
    if (roomId) {
      activePairs.delete(roomId);
      sock.to(roomId).emit('peer-disconnected');
      sock.leave(roomId);
      const partner = queue.getPartner(sock.id);
      if (partner) {
        rooms.delete(partner);
        const partnerSock = io.sockets.sockets.get(partner);
        if (partnerSock) {
          queue.enqueue(partner, {});
          partnerSock.emit('queued');
        }
      }
      rooms.delete(sock.id);
    }
    queue.remove(sock.id);
  }
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', online: io.engine.clientsCount });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Zivo Talk backend → http://localhost:${PORT}`);
  console.log(`🔐 Admin secret: ${ADMIN_SECRET}`);
});
