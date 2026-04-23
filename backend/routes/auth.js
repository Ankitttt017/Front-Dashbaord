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

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === AUTH_USERS.admin.username && password === AUTH_USERS.admin.password) {
    const token = jwt.sign(
      { username, role: AUTH_USERS.admin.role },
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

  if (username === AUTH_USERS.operator.username && password === AUTH_USERS.operator.password) {
    const token = jwt.sign(
      { username, role: AUTH_USERS.operator.role },
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
