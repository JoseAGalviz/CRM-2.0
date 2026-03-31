const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { db } = require('../db/database');
const { success, error, notFound, forbidden } = require('../utils/response');

router.get('/', authenticate, requireAdmin, async (req, res) => {
  const users = await db.all('SELECT id, name, email, role, avatar_url, is_active, last_login, created_at FROM users ORDER BY created_at DESC');
  return success(res, users);
});

router.get('/:id', authenticate, async (req, res) => {
  const user = await db.get('SELECT id, name, email, role, avatar_url, is_active, last_login, created_at FROM users WHERE id = ?', req.params.id);
  if (!user) return notFound(res, 'User not found');
  return success(res, user);
});

router.put('/me', authenticate, [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('avatar_url').optional({ nullable: true }),
  validate
], async (req, res) => {
  const { name, avatar_url } = req.body;
  await db.run('UPDATE users SET name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url) WHERE id = ?', name || null, avatar_url || null, req.user.id);
  const updated = await db.get('SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = ?', req.user.id);
  return success(res, updated, 'Profile updated');
});

router.put('/me/password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
  validate
], async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await db.get('SELECT * FROM users WHERE id = ?', req.user.id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return forbidden(res, 'Current password is incorrect');
    const hash = await bcrypt.hash(newPassword, 12);
    await db.run('UPDATE users SET password = ? WHERE id = ?', hash, req.user.id);
    return success(res, null, 'Password updated successfully');
  } catch (err) {
    return error(res, 'Password update failed');
  }
});

module.exports = router;
