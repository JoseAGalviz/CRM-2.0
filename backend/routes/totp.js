const express = require('express');
const router = express.Router();
const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const { authenticate } = require('../middleware/auth');
const { db } = require('../db/database');
const { success, error, forbidden } = require('../utils/response');

// GET /api/auth/2fa/status
router.get('/status', authenticate, async (req, res) => {
  const user = await db.get('SELECT totp_enabled FROM users WHERE id = ?', req.user.id);
  return success(res, { enabled: !!user?.totp_enabled });
});

// POST /api/auth/2fa/setup — generate secret + QR code (NOT yet enabled)
router.post('/setup', authenticate, async (req, res) => {
  try {
    const user = await db.get('SELECT email, totp_enabled FROM users WHERE id = ?', req.user.id);
    if (user.totp_enabled) return error(res, '2FA ya está activado', 400);

    const secret = authenticator.generateSecret();
    await db.run('UPDATE users SET totp_secret = ? WHERE id = ?', secret, req.user.id);

    const otpauth = authenticator.keyuri(user.email, 'CRM Pro', secret);
    const qrDataUrl = await qrcode.toDataURL(otpauth);

    return success(res, { secret, qrDataUrl, otpauth });
  } catch (err) {
    console.error(err);
    return error(res, 'Error generando 2FA');
  }
});

// POST /api/auth/2fa/enable — verify TOTP token and enable 2FA
router.post('/enable', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return error(res, 'Token requerido', 400);

    const user = await db.get('SELECT totp_secret, totp_enabled FROM users WHERE id = ?', req.user.id);
    if (!user?.totp_secret) return error(res, 'Configura 2FA primero', 400);
    if (user.totp_enabled) return error(res, '2FA ya está activado', 400);

    const valid = authenticator.verify({ token, secret: user.totp_secret });
    if (!valid) return error(res, 'Código incorrecto', 400);

    await db.run('UPDATE users SET totp_enabled = 1 WHERE id = ?', req.user.id);
    return success(res, null, '2FA activado correctamente');
  } catch (err) {
    return error(res, 'Error activando 2FA');
  }
});

// POST /api/auth/2fa/disable
router.post('/disable', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await db.get('SELECT totp_secret, totp_enabled FROM users WHERE id = ?', req.user.id);
    if (!user?.totp_enabled) return error(res, '2FA no está activado', 400);

    const valid = authenticator.verify({ token, secret: user.totp_secret });
    if (!valid) return error(res, 'Código incorrecto', 400);

    await db.run('UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?', req.user.id);
    return success(res, null, '2FA desactivado');
  } catch (err) {
    return error(res, 'Error desactivando 2FA');
  }
});

// POST /api/auth/2fa/verify — verify TOTP during login (called after password check)
router.post('/verify', async (req, res) => {
  try {
    const { userId, token } = req.body;
    if (!userId || !token) return error(res, 'Datos requeridos', 400);

    const user = await db.get('SELECT id, name, email, role, totp_secret, totp_enabled FROM users WHERE id = ? AND is_active = 1', userId);
    if (!user || !user.totp_enabled) return error(res, 'Usuario no válido', 400);

    const valid = authenticator.verify({ token, secret: user.totp_secret });
    if (!valid) return error(res, 'Código incorrecto', 400);

    // Generate real tokens
    const jwt = require('jsonwebtoken');
    const { v4: uuidv4 } = require('uuid');
    const { db: dbInstance } = require('../db/database');

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
    const refreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await dbInstance.run('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)', refreshToken, user.id, expiresAt);
    await dbInstance.run("UPDATE users SET last_login = datetime('now') WHERE id = ?", user.id);

    const { totp_secret: _, ...safeUser } = user;
    return success(res, { user: safeUser, accessToken, refreshToken }, '2FA verificado');
  } catch (err) {
    console.error(err);
    return error(res, 'Error verificando 2FA');
  }
});

module.exports = router;
