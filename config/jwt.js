// config/jwt.js
const jwt = require('jsonwebtoken');

/**
 * Sign a JWT token for a given user id.
 */
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/**
 * Verify a JWT token and return the decoded payload.
 */
const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

/**
 * Attach a signed JWT as an HTTP-only cookie on the response.
 */
const sendTokenCookie = (res, token) => {
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };
  res.cookie('jwt', token, cookieOptions);
};

module.exports = { signToken, verifyToken, sendTokenCookie };