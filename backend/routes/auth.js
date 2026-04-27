const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const AUTH_USERS = {
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin@123',
    role: 'admin',
    displayName: process.env.ADMIN_DISPLAY_NAME || 'Administrator',
  },
  operator: {
    username: process.env.OPERATOR_USERNAME || 'operator',
    password: process.env.OPERATOR_PASSWORD || 'operator@123',
    role: 'operator',
    displayName: process.env.OPERATOR_DISPLAY_NAME || 'Operator Node',
  },
};

const normalizeUsername = value => String(value || '').trim().toLowerCase();
const adminAliases = [
  AUTH_USERS.admin.username,
  'admin',
  'desktop-j9f8crk\\admin',
].map(normalizeUsername);

router.post('/login', (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '').trim();
  const normalizedUsername = normalizeUsername(username);
  const adminUsername = String(AUTH_USERS.admin.username || '').trim();
  const operatorUsername = String(AUTH_USERS.operator.username || '').trim();

  if (adminAliases.includes(normalizedUsername) && password === AUTH_USERS.admin.password) {
    const token = jwt.sign(
      { username: adminUsername, role: AUTH_USERS.admin.role },
      process.env.JWT_SECRET || 'traceability_secret_2024',
      { expiresIn: '8h' }
    );
    return res.json({
      token,
      user: {
        role: AUTH_USERS.admin.role,
        username: AUTH_USERS.admin.displayName,
      },
    });
  }

  if (normalizedUsername === operatorUsername.toLowerCase() && password === AUTH_USERS.operator.password) {
    const token = jwt.sign(
      { username: operatorUsername, role: AUTH_USERS.operator.role },
      process.env.JWT_SECRET || 'traceability_secret_2024',
      { expiresIn: '8h' }
    );
    return res.json({
      token,
      user: {
        role: AUTH_USERS.operator.role,
        username: AUTH_USERS.operator.displayName,
      },
    });
  }
  res.status(401).json({ message: 'Invalid credentials' });
});

module.exports = router;
