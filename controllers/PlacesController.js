// controllers/PlacesController.js
const axios  = require('axios');
const logger = require('../config/logger');

const API_KEY  = () => process.env.GOOGLE_PLACES_API_KEY;
const BASE_URL = 'https://places.googleapis.com/v1/places';

// ─── Autocomplete ─────────────────────────────────────────────────────────────
exports.autocomplete = async (req, res, next) => {
  try {
    const { input } = req.query;
    if (!input) return res.status(400).json({ success: false, message: 'input is required' });

    const response = await axios.post(
      `${BASE_URL}:autocomplete`,
      { input },
      {
        headers: {
          'Content-Type':   'application/json',
          'X-Goog-Api-Key': API_KEY(),
        },
      }
    );

    const predictions = (response.data.suggestions || []).map((s) => {
      const p = s.placePrediction;
      return {
        placeId:       p.placeId,
        description:   p.text?.text || '',
        mainText:      p.structuredFormat?.mainText?.text || p.text?.text || '',
        secondaryText: p.structuredFormat?.secondaryText?.text || '',
      };
    });

    res.json({ success: true, predictions });
  } catch (err) {
    logger.error('Autocomplete error:', err.response?.data || err.message);
    next(err);
  }
};

// ─── Place Details ────────────────────────────────────────────────────────────
exports.placeDetails = async (req, res, next) => {
  try {
    const { placeId } = req.query;
    if (!placeId) return res.status(400).json({ success: false, message: 'placeId is required' });

    const response = await axios.get(
      `${BASE_URL}/${placeId}`,
      {
        headers: {
          'X-Goog-Api-Key':   API_KEY(),
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,photos,types,rating,userRatingCount,regularOpeningHours,websiteUri,nationalPhoneNumber,editorialSummary',
        },
      }
    );

    const r = response.data;

    const photos = (r.photos || []).slice(0, 5).map((photo) => ({
      url:         `/api/places/photo?name=${encodeURIComponent(photo.name)}&maxH=800&maxW=1200`,
      attribution: photo.authorAttributions?.[0]?.displayName || '',
    }));

    res.json({
      success: true,
      place: {
        placeId:     r.id,
        name:        r.displayName?.text || '',
        address:     r.formattedAddress || '',
        lat:         r.location?.latitude,
        lng:         r.location?.longitude,
        types:       r.types || [],
        rating:      r.rating || null,
        ratingCount: r.userRatingCount || 0,
        photos,
        coverPhoto:  photos[0]?.url || '',
        hours:       r.regularOpeningHours?.weekdayDescriptions || [],
        website:     r.websiteUri || '',
        phone:       r.nationalPhoneNumber || '',
        summary:     r.editorialSummary?.text || '',
      },
    });
  } catch (err) {
    logger.error('Place details error:', err.response?.data || err.message);
    next(err);
  }
};

// ─── Nearby Search ────────────────────────────────────────────────────────────
exports.nearbySearch = async (req, res, next) => {
  try {
    const { lat, lng, radius = 5000, query = 'venues and event spaces' } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng are required' });

    const response = await axios.post(
      `${BASE_URL}:searchText`,
      {
        textQuery: query,
        locationBias: {
          circle: {
            center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
            radius: parseFloat(radius),
          },
        },
        maxResultCount: 12,
      },
      {
        headers: {
          'Content-Type':     'application/json',
          'X-Goog-Api-Key':   API_KEY(),
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.photos,places.editorialSummary',
        },
      }
    );

    const places = (response.data.places || []).map((p) => {
      const coverPhoto = p.photos?.[0]?.name
        ? `/api/places/photo?name=${encodeURIComponent(p.photos[0].name)}&maxH=400&maxW=600`
        : '';

      return {
        placeId:     p.id,
        name:        p.displayName?.text || '',
        address:     p.formattedAddress || '',
        lat:         p.location?.latitude,
        lng:         p.location?.longitude,
        types:       p.types || [],
        rating:      p.rating || null,
        ratingCount: p.userRatingCount || 0,
        coverPhoto,
        summary:     p.editorialSummary?.text || '',
      };
    });

    res.json({ success: true, places });
  } catch (err) {
    logger.error('Nearby search error:', err.response?.data || err.message);
    next(err);
  }
};

// ─── Photo Proxy ──────────────────────────────────────────────────────────────
exports.getPhoto = async (req, res, next) => {
  try {
    const { name, maxH = 800, maxW = 1200 } = req.query;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });

    const metaUrl = `https://places.googleapis.com/v1/${name}/media?maxHeightPx=${maxH}&maxWidthPx=${maxW}&key=${API_KEY()}&skipHttpRedirect=true`;
    const meta    = await axios.get(metaUrl);
    const photoUri = meta.data.photoUri;

    if (!photoUri) return res.status(404).json({ success: false, message: 'Photo not found' });

    const imgResponse = await axios.get(photoUri, { responseType: 'stream' });
    res.setHeader('Content-Type', imgResponse.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    imgResponse.data.pipe(res);

  } catch (err) {
    logger.error('Photo proxy error:', err.response?.data || err.message);
    next(err);
  }
};