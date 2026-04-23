async function getStatus(req, res) {
  const dbStatus = req.app.get('dbStatus') || {};
  const dbDisplayLabel = process.env.DB_DISPLAY_LABEL || process.env.DB_NAME || 'database';
  const apiUrl = process.env.API_URL || `${req.protocol}://${req.get('host')}`;

  return res.json({
    database: {
      connected: Boolean(dbStatus.connected),
      label: dbDisplayLabel,
      updatedAt: dbStatus.lastCheckedAt || null,
    },
    api: {
      url: apiUrl,
    },
    network: {
      status: dbStatus.connected ? 'Stable' : 'Attention',
      label: process.env.DB_SERVER || 'LAN',
    },
  });
}

module.exports = {
  getStatus,
};
