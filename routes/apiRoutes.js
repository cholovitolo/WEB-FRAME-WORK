// routes/apiRoutes.js
const express = require('express');
const router  = express.Router();

const placesController  = require('../controllers/PlacesController');
const { nearbyEvents }  = require('../controllers/EventController');
const { nearbyEvents: tmNearby, searchByCity } = require('../controllers/TicketmasterController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

// Places
router.get('/places/autocomplete', protect, placesController.autocomplete);
router.get('/places/details',      protect, placesController.placeDetails);
router.get('/places/nearby',       protect, placesController.nearbySearch);
router.get('/places/photo',        protect, placesController.getPhoto);

// GatherSpot events
router.get('/events/nearby',           optionalAuth, nearbyEvents);

// Ticketmaster
router.get('/ticketmaster/nearby',     optionalAuth, tmNearby);
router.get('/ticketmaster/search',     optionalAuth, searchByCity);

module.exports = router;