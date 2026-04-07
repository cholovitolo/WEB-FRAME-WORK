// routes/eventRoutes.js
const express = require('express');
const router  = express.Router();

const {
  createEvent, getAllEvents, getEvent,
  updateEvent, deleteEvent, joinEvent, leaveEvent,
  getMessages, postMessage,
} = require('../controllers/EventController');

const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { validateEvent, validateMongoId } = require('../middleware/validateMiddleware');

// Public / optional auth
router.get('/',        optionalAuth, getAllEvents);          // GET /events?q=&category=&sort=&page=&limit=
router.get('/search',  optionalAuth, getAllEvents);          // GET /events/search?q=keyword
router.get('/:id',     optionalAuth, validateMongoId, getEvent);

// Protected
router.post('/',             protect, validateEvent,    createEvent);
router.put('/:id',           protect, validateMongoId, updateEvent);
router.delete('/:id',        protect, validateMongoId, deleteEvent);
router.post('/:id/join',     protect, validateMongoId, joinEvent);
router.post('/:id/leave',    protect, validateMongoId, leaveEvent);
router.get('/:id/messages',  protect, validateMongoId, getMessages);
router.post('/:id/messages', protect, validateMongoId, postMessage);

module.exports = router;