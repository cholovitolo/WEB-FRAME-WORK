// middleware/authMiddleware.js
const { verifyToken } = require('../config/jwt');
const User = require('../models/User');
const logger = require('../config/logger');

/**
 * protect – requires a valid JWT cookie or Authorization header.
 * Attaches req.user on success.
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Cookie-based (web UI)
    if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    // 2. Bearer token (API clients)
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      // For API routes return JSON; for page routes redirect to login
      if (req.originalUrl.startsWith('/api')) {
        return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });
      }
      return res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    logger.error('Auth middleware error:', err.message);
    if (req.originalUrl.startsWith('/api')) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
    res.clearCookie('jwt');
    return res.redirect('/auth/login');
  }
};

/**
 * optionalAuth – attaches req.user if a valid token is present,
 * but never blocks the request.
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.jwt;
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }
    if (token) {
      const decoded = verifyToken(token);
      req.user = await User.findById(decoded.id);
    }
  } catch (_) {
    req.user = null;
  }
  next();
};

/**
 * restrictTo – restricts access to specific roles.
 */
const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
  }
  next();
};

module.exports = { protect, optionalAuth, restrictTo };