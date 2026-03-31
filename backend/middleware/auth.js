const jwt = require('jsonwebtoken');
const { unauthorized } = require('../utils/response');

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'Authentication token required');
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Token expired');
    }
    return unauthorized(res, 'Invalid token');
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    const { forbidden } = require('../utils/response');
    return forbidden(res, 'Admin access required');
  }
  next();
}

module.exports = { authenticate, requireAdmin };
