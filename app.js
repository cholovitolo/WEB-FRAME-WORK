require('dotenv').config();

const express      = require('express');
const http         = require('http');         // Node's built-in HTTP module
const { Server }   = require('socket.io');    // Socket.io server
const mongoose     = require('mongoose');
const path         = require('path');
const cookieParser = require('cookie-parser');
const morgan       = require('morgan');
const cors         = require('cors');

const authRoutes  = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const apiRoutes   = require('./routes/apiRoutes');
const pageRoutes  = require('./routes/pageRoutes');

const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const logger = require('./config/logger');

// ─────────────────────────────────────────────────────────────────────────────
// CREATE THE APP AND SERVER
//
// Normally we just do: app.listen(PORT)
// But Socket.io needs access to the raw HTTP server
// So we wrap Express inside an HTTP server first
// Both Express routes AND Socket.io run on the same port
// ─────────────────────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);  // Wrap Express in HTTP server

// ─────────────────────────────────────────────────────────────────────────────
// SET UP SOCKET.IO
//
// Attach Socket.io to our HTTP server
// cors: allows connections from any origin (needed for browser connections)
// ─────────────────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*' }
});

// Make io available in controllers via req.app.get('io')
// This lets EventController.js broadcast messages
app.set('io', io);

// ─────────────────────────────────────────────────────────────────────────────
// SOCKET.IO CONNECTION HANDLER
//
// 'connection' fires every time a new browser connects
// Each connection gets its own 'socket' object
// Think of socket as a direct phone line to that one browser tab
// ─────────────────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  // ─────────────────────────────────────────────────────────────────────────
  // JOIN EVENT ROOM
  //
  // When user opens an event page, they join a room
  // A room is a named group — only people in the same room
  // receive messages from each other
  //
  // Example: 5 users have different event pages open
  //   Room "64abc" → User A, User B (viewing Event 64abc)
  //   Room "99xyz" → User C, User D, User E (viewing Event 99xyz)
  //   Message in room "64abc" → only A and B receive it
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('join-event', (eventId) => {
    socket.join(eventId);
    logger.info(`Socket ${socket.id} joined room: ${eventId}`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TYPING INDICATOR — USER STARTED TYPING
  //
  // socket.to(eventId) = send to everyone in the room EXCEPT the sender
  // We don't send it back to the person typing because they already know
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('typing', ({ eventId, userName }) => {
    socket.to(eventId).emit('user-typing', { userName });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TYPING INDICATOR — USER STOPPED TYPING
  //
  // We include userName so the receiver knows WHICH person stopped
  // This is needed to remove the right name from the Set in the browser
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('stop-typing', ({ eventId, userName }) => {
    socket.to(eventId).emit('user-stop-typing', { userName });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DISCONNECTION
  //
  // Fires when user closes the tab or loses internet
  // Socket.io automatically removes them from all rooms
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// ─── Static files served first ────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(cors());

// ─── Database ─────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => logger.info('MongoDB connected'))
  .catch((err) => {
    console.log('MONGODB FULL ERROR:', err);
    process.exit(1);
  });

// ─── View Engine ──────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/',        pageRoutes);
app.use('/auth',    authRoutes);
app.use('/events',  eventRoutes);
app.use('/api',     apiRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─────────────────────────────────────────────────────────────────────────────
// START THE SERVER
//
// IMPORTANT: We use server.listen not app.listen
// server is the HTTP server that wraps Express
// This means both Express and Socket.io share the same port
// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT} [${process.env.NODE_ENV}]`);
});

module.exports = app;