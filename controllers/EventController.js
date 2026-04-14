// controllers/EventController.js
const Event   = require('../models/Event');
const User    = require('../models/User');
const Message = require('../models/Message');
const logger  = require('../config/logger');

// ─── Get All Events (search + filter + sort + pagination) ─────────────────────
exports.getAllEvents = async (req, res, next) => {
  try {
    const {
      q, category, status,
      sort = '-createdAt',
      page = 1, limit = 12,
      date, maxAttendees,
    } = req.query;

    const query = { isPublic: true };

    // Search
    if (q) {
      query.$or = [
        { title:           { $regex: q, $options: 'i' } },
        { description:     { $regex: q, $options: 'i' } },
        { tags:            { $regex: q, $options: 'i' } },
        { 'location.name': { $regex: q, $options: 'i' } },
      ];
    }

    // Filter
    if (category)     query.category     = category;
    if (status)       query.status       = status;
    else              query.status       = { $in: ['upcoming', 'ongoing'] };
    if (maxAttendees) query.maxAttendees  = { $lte: parseInt(maxAttendees) };
    if (date)         query.date         = { $gte: new Date(date) };

    // Sort
    const sortObj = {};
    if (sort.startsWith('-')) sortObj[sort.slice(1)] = -1;
    else                      sortObj[sort]          =  1;

    // Pagination
    const skip      = (parseInt(page) - 1) * parseInt(limit);
    const total     = await Event.countDocuments(query);
    const events    = await Event.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('organizer', 'name avatar');

    res.json({
      success:    true,
      total,
      page:       parseInt(page),
      limit:      parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      events,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Single Event ─────────────────────────────────────────────────────────
exports.getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer',      'name email avatar bio')
      .populate('attendees.user', 'name avatar');

    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    res.json({ success: true, event });
  } catch (err) {
    next(err);
  }
};

// ─── Create Event ─────────────────────────────────────────────────────────────
exports.createEvent = async (req, res, next) => {
  try {
    const {
      title, description, category, date, endDate,
      maxAttendees, location, tags, isPublic, coverImage,
    } = req.body;

    const event = await Event.create({
      title, description, category, date, endDate,
      maxAttendees: maxAttendees || 0,
      location,
      tags:         tags || [],
      isPublic:     isPublic !== false,
      coverImage:   coverImage || '',
      organizer:    req.user._id,
    });

    await User.findByIdAndUpdate(req.user._id, { $push: { eventsCreated: event._id } });

    logger.info(`Event created: "${title}" by user ${req.user._id}`);

    const populated = await event.populate('organizer', 'name email avatar');
    res.status(201).json({ success: true, message: 'Event created successfully', event: populated });
  } catch (err) {
    next(err);
  }
};

// ─── Update Event ─────────────────────────────────────────────────────────────
exports.updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this event' });
    }

    const allowed = ['title','description','category','date','endDate','maxAttendees','tags','isPublic','coverImage','status'];
    allowed.forEach((field) => { if (req.body[field] !== undefined) event[field] = req.body[field]; });

    await event.save();
    const populated = await event.populate('organizer', 'name email avatar');

    res.json({ success: true, message: 'Event updated', event: populated });
  } catch (err) {
    next(err);
  }
};

// ─── Delete Event ─────────────────────────────────────────────────────────────
exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Event.findByIdAndDelete(req.params.id);
    await User.findByIdAndUpdate(req.user._id, { $pull: { eventsCreated: event._id } });
    await Message.deleteMany({ event: event._id });

    logger.info(`Event deleted: ${req.params.id}`);
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// ─── Join Event ───────────────────────────────────────────────────────────────
exports.joinEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const alreadyJoined = event.attendees.some((a) => a.user.toString() === req.user._id.toString());
    if (alreadyJoined) return res.status(409).json({ success: false, message: 'Already joined this event' });

    if (event.maxAttendees > 0 && event.attendees.length >= event.maxAttendees) {
      return res.status(400).json({ success: false, message: 'This event is full' });
    }

    event.attendees.push({ user: req.user._id });
    await event.save();
    await User.findByIdAndUpdate(req.user._id, { $push: { eventsJoined: event._id } });

    res.json({ success: true, message: 'Joined event successfully', attendeeCount: event.attendees.length });
  } catch (err) {
    next(err);
  }
};

// ─── Leave Event ──────────────────────────────────────────────────────────────
exports.leaveEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    event.attendees = event.attendees.filter((a) => a.user.toString() !== req.user._id.toString());
    await event.save();
    await User.findByIdAndUpdate(req.user._id, { $pull: { eventsJoined: event._id } });

    res.json({ success: true, message: 'Left event', attendeeCount: event.attendees.length });
  } catch (err) {
    next(err);
  }
};

// ─── Get Messages ─────────────────────────────────────────────────────────────
exports.getMessages = async (req, res, next) => {
  try {
    const messages = await Message.find({ event: req.params.id, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', 'name avatar');

    res.json({ success: true, messages: messages.reverse() });
  } catch (err) {
    next(err);
  }
};

// ─── Post Message ─────────────────────────────────────────────────────────────
exports.postMessage = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const isAttendee  = event.attendees.some((a) => a.user.toString() === req.user._id.toString());
    const isOrganizer = event.organizer.toString() === req.user._id.toString();

    if (!isAttendee && !isOrganizer) {
      return res.status(403).json({ success: false, message: 'You must be an attendee to message in this event' });
    }

    // Save message to MongoDB
    const message   = await Message.create({ event: req.params.id, sender: req.user._id, content: req.body.content });
    const populated = await message.populate('sender', 'name avatar');

    
    // BROADCAST VIA SOCKET.IO
   
    const io = req.app.get('io');
    io.to(req.params.id).emit('receive-message', populated);

    res.status(201).json({ success: true, message: populated });
  } catch (err) {
    next(err);
  }
};

// ─── Nearby Events ────────────────────────────────────────────────────────────
exports.nearbyEvents = async (req, res, next) => {
  try {
    const { lat, lng, radius = 5 } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng required' });

    const userLat  = parseFloat(lat);
    const userLng  = parseFloat(lng);
    const radiusKm = parseFloat(radius);

    const events = await Event.find({
      isPublic: true,
      status:   { $in: ['upcoming', 'ongoing'] },
    })
      .populate('organizer', 'name avatar')
      .lean();

    const R      = 6371;
    const nearby = events
      .map(event => {
        const dLat     = (event.location.lat - userLat) * Math.PI / 180;
        const dLng     = (event.location.lng - userLng) * Math.PI / 180;
        const a        = Math.sin(dLat/2) * Math.sin(dLat/2) +
                         Math.cos(userLat * Math.PI/180) * Math.cos(event.location.lat * Math.PI/180) *
                         Math.sin(dLng/2) * Math.sin(dLng/2);
        const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return { ...event, distance: parseFloat(distance.toFixed(1)) };
      })
      .filter(e  => e.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    res.json({ success: true, events: nearby });
  } catch (err) {
    next(err);
  }
};