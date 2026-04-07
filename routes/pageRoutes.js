// routes/pageRoutes.js
const express = require('express');
const router  = express.Router();
const Event   = require('../models/Event');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { redirectIfAuthenticated } = require('../middleware/pageRoutes');

// ─── Home ─────────────────────────────────────────────────────────────────────
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const featured = await Event.find({ isPublic: true, status: { $in: ['upcoming','ongoing'] } })
      .sort({ date: 1 })
      .limit(6)
      .populate('organizer', 'name avatar');

    res.render('home', { title: 'GatherSpot — Discover Events Near You', user: req.user || null, featured });
  } catch (err) { next(err); }
});

// ─── Explore / Browse Events ──────────────────────────────────────────────────
router.get('/explore', optionalAuth, async (req, res, next) => {
  try {
    const { category, search, page = 1 } = req.query;
    const limit = 9;
    const query = { isPublic: true, status: { $in: ['upcoming','ongoing'] } };
    if (category && category !== 'All') query.category = category;
    if (search) query.$or = [
      { title:       { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];

    const total  = await Event.countDocuments(query);
    const events = await Event.find(query)
      .sort({ date: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('organizer', 'name avatar');

    res.render('explore', {
      title: 'Explore Events — GatherSpot',
      user: req.user || null,
      events, total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      category: category || 'All',
      search: search || '',
      categories: ['All','Technology','Arts','Sports','Food','Music','Business','Education','Social','Other'],
    });
  } catch (err) { next(err); }
});

// ─── Auth pages ───────────────────────────────────────────────────────────────
router.get('/auth/login',    optionalAuth, redirectIfAuthenticated, (req, res) =>
  res.render('auth/login',    { title: 'Sign In — GatherSpot', user: null, error: null }));

router.get('/auth/register', optionalAuth, redirectIfAuthenticated, (req, res) =>
  res.render('auth/register', { title: 'Join GatherSpot', user: null, error: null }));

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', protect, async (req, res, next) => {
  try {
    const myEvents = await Event.find({ organizer: req.user._id })
      .sort({ date: -1 }).limit(5);
    const joined = await Event.find({ 'attendees.user': req.user._id })
      .sort({ date: 1 }).limit(5).populate('organizer','name avatar');

    res.render('dashboard', {
      title: 'Dashboard — GatherSpot',
      user: req.user,
      myEvents,
      joined,
    });
  } catch (err) { next(err); }
});

// ─── Create Event ─────────────────────────────────────────────────────────────
router.get('/events/new', protect, (req, res) =>
  res.render('events/create', {
    title: 'Create Event — GatherSpot',
    user: req.user,
    googleApiKey: process.env.GOOGLE_PLACES_API_KEY,
    categories: ['Technology','Arts','Sports','Food','Music','Business','Education','Social','Other'],
  }));

// ─── Single Event Page ────────────────────────────────────────────────────────
router.get('/events/:id', optionalAuth, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer',      'name avatar bio')
      .populate('attendees.user', 'name avatar');

    if (!event) return res.status(404).render('error', { title: '404', user: req.user||null, statusCode: 404, message: 'Event not found' });

    const isOrganizer = req.user && event.organizer._id.toString() === req.user._id.toString();
    const isAttendee  = req.user && event.attendees.some(a => a.user._id.toString() === req.user._id.toString());

    res.render('events/show', {
      title: `${event.title} — GatherSpot`,
      user:  req.user || null,
      event, isOrganizer, isAttendee,
      googleApiKey: process.env.GOOGLE_PLACES_API_KEY,
    });
  } catch (err) { next(err); }
});

// ─── Edit Event Page ──────────────────────────────────────────────────────────
router.get('/events/:id/edit', protect, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).render('error',{ title:'404', user:req.user, statusCode:404, message:'Event not found' });
    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).render('error',{ title:'403', user:req.user, statusCode:403, message:'Not authorized' });
    }
    res.render('events/edit', {
      title: 'Edit Event — GatherSpot',
      user: req.user, event,
      googleApiKey: process.env.GOOGLE_PLACES_API_KEY,
      categories: ['Technology','Arts','Sports','Food','Music','Business','Education','Social','Other'],
    });
  } catch (err) { next(err); }
});

// ─── Profile ──────────────────────────────────────────────────────────────────
router.get('/profile', protect, async (req, res, next) => {
  try {
    const myEvents = await Event.find({ organizer: req.user._id }).sort({ date: -1 });
    res.render('profile', { title: 'My Profile — GatherSpot', user: req.user, myEvents });
  } catch (err) { next(err); }
});

// ─── Nearby Page ─────────────────────────────────────────────────────────────
router.get('/nearby', optionalAuth, (req, res) => {
  res.render('nearby', {
    title: 'Events Near Me — GatherSpot',
    user:  req.user || null,
  });
});

module.exports = router;