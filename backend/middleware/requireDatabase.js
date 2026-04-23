function requireDatabase(req, res, next) {
  const dbStatus = req.app.get('dbStatus') || {};

  if (dbStatus.connected) {
    return next();
  }

  return res.status(503).json({
    message: 'Database unavailable',
    code: 'DB_UNAVAILABLE',
    details: 'The API is running, but the SQL Server connection is offline.',
    updatedAt: dbStatus.lastCheckedAt || null,
  });
}

module.exports = requireDatabase;
