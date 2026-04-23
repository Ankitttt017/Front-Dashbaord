const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const bearerToken = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  const token = bearerToken || req.headers['x-access-token'] || req.headers.token;

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is required' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'traceability_secret_2024');
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
