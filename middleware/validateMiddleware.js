// middleware/validateMiddleware.js
const { body, param, validationResult } = require('express-validator');

// ─── Helper ───────────────────────────────────────────────────────────────────
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.originalUrl.startsWith('/api') || req.headers['content-type']?.includes('application/json')) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    // For page routes: re-render with errors
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// ─── Auth Validators ─────────────────────────────────────────────────────────
const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 60 }).withMessage('Name must be 2–60 characters'),
  body('email')
    .trim()
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/\d/).withMessage('Password must contain at least one number'),
  handleValidation,
];

const validateLogin = [
  body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation,
];

// ─── Event Validators ─────────────────────────────────────────────────────────
const validateEvent = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 100 }).withMessage('Title must be 3–100 characters'),
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  body('date')
    .notEmpty().withMessage('Event date is required')
    .isISO8601().withMessage('Invalid date format')
    .custom((val) => {
      if (new Date(val) < new Date()) throw new Error('Event date must be in the future');
      return true;
    }),
  body('location.placeId').notEmpty().withMessage('Location is required'),
  body('location.name').notEmpty().withMessage('Location name is required'),
  body('location.lat').isFloat().withMessage('Invalid latitude'),
  body('location.lng').isFloat().withMessage('Invalid longitude'),
  handleValidation,
];

const validateMongoId = [
  param('id').isMongoId().withMessage('Invalid ID format'),
  handleValidation,
];

module.exports = { validateRegister, validateLogin, validateEvent, validateMongoId };