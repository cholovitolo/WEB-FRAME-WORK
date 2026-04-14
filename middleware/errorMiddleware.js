// middleware/errorMiddleware.js
const logger = require('../config/logger');

/**
 * notFound – 404 handler.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * errorHandler – global error handler.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message    = err.message || 'Internal Server Error';

  // Mongoose: Bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message    = 'Resource not found (invalid ID)';
  }

  // Mongoose: Duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message    = `An account with this ${field} already exists`;
  }

  // Mongoose: Validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message    = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message    = 'Invalid token. Please log in again.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message    = 'Your session has expired. Please log in again.';
  }

  logger.error(`[${statusCode}] ${message}`, { stack: err.stack, url: req.originalUrl });

  // API vs HTML response
  if (req.originalUrl.startsWith('/api') || req.headers.accept?.includes('application/json')) {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  res.status(statusCode).render('error', {
    title:   `${statusCode} Error`,
    user:    req.user || null,
    statusCode,
    message,
  });
};

module.exports = { notFound, errorHandler };