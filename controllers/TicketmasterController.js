const axios  = require('axios');
const logger = require('../config/logger');

const API_KEY = () => process.env.TICKETMASTER_API_KEY;
const BASE    = 'https://app.ticketmaster.com/discovery/v2';

// Pick best image from Ticketmaster images array
function getBestImage(images = []) {
  if (!images.length) return '';
  // prefer 16_9 ratio, largest width
  const sixteenNine = images.filter(i => i.ratio === '16_9').sort((a,b) => b.width - a.width);
  if (sixteenNine.length) return sixteenNine[0].url;
  // fallback to any largest
  return images.sort((a,b) => (b.width||0) - (a.width||0))[0].url;
}

function mapEvent(e) {
  const venue      = e._embedded?.venues?.[0];
  const priceRange = e.priceRanges?.[0];
  const lat        = parseFloat(venue?.location?.latitude  || 0);
  const lng        = parseFloat(venue?.location?.longitude || 0);

  return {
    id:          e.id,
    title:       e.name || 'Untitled Event',
    url:         e.url,
    start:       e.dates?.start?.localDate,
    startTime:   e.dates?.start?.localTime,
    logo:        getBestImage(e.images || []),
    category:    e.classifications?.[0]?.segment?.name || 'Event',
    genre:       e.classifications?.[0]?.genre?.name   || '',
    isFree:      priceRange?.min === 0,
    priceMin:    priceRange?.min,
    priceMax:    priceRange?.max,
    currency:    priceRange?.currency || 'USD',
    venue: {
      name:    venue?.name         || '',
      address: venue?.address?.line1 || '',
      city:    venue?.city?.name   || '',
      state:   venue?.state?.name  || '',
      lat:     isNaN(lat) ? 0 : lat,
      lng:     isNaN(lng) ? 0 : lng,
    },
    source: 'ticketmaster',
  };
}

// ─── Search by city ───────────────────────────────────────────────────────────
exports.searchByCity = async (req, res, next) => {
  try {
    const { city, page = 0, size = 20 } = req.query;
    if (!city) return res.status(400).json({ success: false, message: 'city is required' });

    const response = await axios.get(`${BASE}/events.json`, {
      params: { apikey: API_KEY(), city, size, page, sort: 'date,asc' },
    });

    const data  = response.data;
    const items = data._embedded?.events || [];
    const pg    = data.page || {};

    res.json({
      success:    true,
      events:     items.map(mapEvent),
      city,
      total:      pg.totalElements || items.length,
      page:       pg.number        || 0,
      totalPages: pg.totalPages    || 1,
    });
  } catch (err) {
    console.log('TM SEARCH STATUS:', err.response?.status);
    console.log('TM SEARCH DATA:',   JSON.stringify(err.response?.data));
    logger.error('Ticketmaster search error:', err.message);
    res.json({ success: true, events: [], error: err.message });
  }
};

// ─── Nearby by lat/lng ────────────────────────────────────────────────────────
exports.nearbyEvents = async (req, res, next) => {
  try {
    const { lat, lng, radius = 10, size = 20 } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng required' });

    const response = await axios.get(`${BASE}/events.json`, {
      params: { apikey: API_KEY(), latlong: `${lat},${lng}`, radius, unit: 'km', size, sort: 'date,asc' },
    });

    const items = response.data._embedded?.events || [];
    res.json({ success: true, events: items.map(mapEvent) });
  } catch (err) {
    console.log('TM NEARBY STATUS:', err.response?.status);
    console.log('TM NEARBY DATA:',   JSON.stringify(err.response?.data));
    logger.error('Ticketmaster nearby error:', err.message);
    res.json({ success: true, events: [] });
  }
};