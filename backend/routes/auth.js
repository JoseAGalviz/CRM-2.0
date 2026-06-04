const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { db } = require('../db/database');
const { success, created, error, unauthorized, notFound } = require('../utils/response');

function generateTokens(user) {
  const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
  const refreshToken = uuidv4();
  return { accessToken, refreshToken };
}

// POST /api/auth/register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate
], async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await db.get('SELECT id FROM users WHERE email = ?', email);
    if (existing) return error(res, 'Email already registered', 409);

    const hash = await bcrypt.hash(password, 12);
    const result = await db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', name, email, hash);
    const user = await db.get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', result.lastInsertRowid);

    const { accessToken, refreshToken } = generateTokens(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.run('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)', refreshToken, user.id, expiresAt);

    return created(res, { user, accessToken, refreshToken }, 'Account created successfully');
  } catch (err) {
    console.error(err);
    return error(res, 'Registration failed');
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate
], async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.get('SELECT * FROM users WHERE email = ? AND is_active = 1', email);
    if (!user) return unauthorized(res, 'Invalid credentials');

    const match = await bcrypt.compare(password, user.password);
    if (!match) return unauthorized(res, 'Invalid credentials');

    const { accessToken, refreshToken } = generateTokens(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.run('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)', refreshToken, user.id, expiresAt);
    await db.run("UPDATE users SET last_login = datetime('now') WHERE id = ?", user.id);

    const { password: _, ...safeUser } = user;
    return success(res, { user: safeUser, accessToken, refreshToken }, 'Login successful');
  } catch (err) {
    console.error(err);
    return error(res, 'Login failed');
  }
});

// POST /api/auth/refresh
router.post('/refresh', [body('refreshToken').notEmpty(), validate], async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const stored = await db.get('SELECT * FROM refresh_tokens WHERE token = ?', refreshToken);
    if (!stored || new Date(stored.expires_at) < new Date()) {
      if (stored) await db.run('DELETE FROM refresh_tokens WHERE id = ?', stored.id);
      return unauthorized(res, 'Invalid or expired refresh token');
    }

    const user = await db.get('SELECT id, name, email, role FROM users WHERE id = ? AND is_active = 1', stored.user_id);
    if (!user) return unauthorized(res, 'User not found');

    const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    return success(res, { accessToken }, 'Token refreshed');
  } catch (err) {
    return error(res, 'Token refresh failed');
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await db.run('DELETE FROM refresh_tokens WHERE token = ? AND user_id = ?', refreshToken, req.user.id);
    return success(res, null, 'Logged out successfully');
  } catch (err) {
    return error(res, 'Logout failed');
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const user = await db.get('SELECT id, name, email, role, avatar_url, last_login, created_at FROM users WHERE id = ?', req.user.id);
  if (!user) return notFound(res, 'User not found');
  return success(res, user);
});

module.exports = router;
