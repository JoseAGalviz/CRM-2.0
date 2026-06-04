const { forbidden } = require('../utils/response');

function demoGuard(req, res, next) {
  if (req.user?.role === 'demo' && req.method !== 'GET' && req.method !== 'OPTIONS') {
    return forbidden(res, 'Acción no disponible en modo demo');
  }
  next();
}

module.exports = { demoGuard };
