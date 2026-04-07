// middleware/pageRoutes.js
/**
 * redirectIfAuthenticated
 * Prevents logged-in users from accessing login/register pages.
 */
const redirectIfAuthenticated = (req, res, next) => {
  if (req.user) return res.redirect('/dashboard');
  next();
};

module.exports = { redirectIfAuthenticated };