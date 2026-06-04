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

router.post('/', authenticate, requireAdmin, [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role').optional().isIn(['admin', 'user']),
  validate
], async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;
    const existing = await db.get('SELECT id FROM users WHERE email = ?', email);
    if (existing) return error(res, 'Email already in use', 409);
    const hash = await bcrypt.hash(password, 12);
    const result = await db.run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      name, email, hash, role
    );
    const user = await db.get(
      'SELECT id, name, email, role, avatar_url, is_active, created_at FROM users WHERE id = ?',
      result.lastInsertRowid
    );
    return success(res, user, 'User created', 201);
  } catch (err) {
    return error(res, 'Error creating user');
  }
});

router.put('/:id', authenticate, requireAdmin, [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin', 'user']),
  body('password').optional().isLength({ min: 8 }),
  validate
], async (req, res) => {
  try {
    const { id } = req.params;
    const target = await db.get('SELECT id FROM users WHERE id = ?', id);
    if (!target) return notFound(res, 'User not found');
    const { name, email, role, password } = req.body;
    if (email) {
      const dup = await db.get('SELECT id FROM users WHERE email = ? AND id != ?', email, id);
      if (dup) return error(res, 'Email already in use', 409);
    }
    const hashedPassword = password ? await bcrypt.hash(password, 12) : null;
    await db.run(
      'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), role = COALESCE(?, role), password = COALESCE(?, password) WHERE id = ?',
      name || null, email || null, role || null, hashedPassword, id
    );
    const updated = await db.get(
      'SELECT id, name, email, role, avatar_url, is_active, created_at FROM users WHERE id = ?', id
    );
    return success(res, updated, 'User updated');
  } catch (err) {
    return error(res, 'Error updating user');
  }
});

router.patch('/:id/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (Number(id) === req.user.id) return forbidden(res, 'Cannot change your own status');
    const target = await db.get('SELECT id, is_active FROM users WHERE id = ?', id);
    if (!target) return notFound(res, 'User not found');
    await db.run('UPDATE users SET is_active = ? WHERE id = ?', target.is_active ? 0 : 1, id);
    const updated = await db.get(
      'SELECT id, name, email, role, avatar_url, is_active, created_at FROM users WHERE id = ?', id
    );
    return success(res, updated, 'User status updated');
  } catch (err) {
    return error(res, 'Error updating status');
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (Number(id) === req.user.id) return forbidden(res, 'Cannot delete your own account');
    const target = await db.get('SELECT id FROM users WHERE id = ?', id);
    if (!target) return notFound(res, 'User not found');
    await db.run('DELETE FROM users WHERE id = ?', id);
    return success(res, null, 'User deleted');
  } catch (err) {
    return error(res, 'Error deleting user');
  }
});

module.exports = router;
