const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { db } = require('../db/database');
const { success, created, error, notFound } = require('../utils/response');

const VALID_EVENTS = [
  'contact.created', 'contact.updated', 'contact.deleted',
  'deal.created', 'deal.updated', 'deal.stage_changed', 'deal.won', 'deal.lost',
  'task.created', 'task.completed',
  'company.created', 'company.updated', 'company.deleted',
];

const webhookValidators = [
  body('name').trim().notEmpty().withMessage('Name required').isLength({ max: 100 }),
  body('url').isURL().withMessage('Valid URL required'),
  body('events').isArray({ min: 1 }).withMessage('At least one event required'),
  body('events.*').isIn(VALID_EVENTS),
  body('secret').optional({ nullable: true }).isLength({ max: 200 }),
  validate,
];

router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const hooks = await db.all(`
      SELECT wc.*, u.name as created_by_name,
        (SELECT COUNT(*) FROM webhook_deliveries wd WHERE wd.webhook_id = wc.id) as delivery_count,
        (SELECT COUNT(*) FROM webhook_deliveries wd WHERE wd.webhook_id = wc.id AND wd.response_status >= 200 AND wd.response_status < 300) as success_count
      FROM webhook_configs wc LEFT JOIN users u ON u.id = wc.created_by
      ORDER BY wc.created_at DESC
    `);
    hooks.forEach(h => { try { h.events = JSON.parse(h.events); } catch { h.events = []; } });
    return success(res, hooks);
  } catch (err) { return error(res, 'Error fetching webhooks'); }
});

router.post('/', authenticate, requireAdmin, webhookValidators, async (req, res) => {
  try {
    const { name, url, events, secret } = req.body;
    const result = await db.run(
      'INSERT INTO webhook_configs (name, url, events, secret, created_by) VALUES (?, ?, ?, ?, ?)',
      name, url, JSON.stringify(events), secret || null, req.user.id
    );
    const hook = await db.get('SELECT * FROM webhook_configs WHERE id = ?', result.lastInsertRowid);
    hook.events = JSON.parse(hook.events);
    return created(res, hook);
  } catch (err) { return error(res, 'Error creating webhook'); }
});

router.put('/:id', authenticate, requireAdmin, webhookValidators, async (req, res) => {
  try {
    const existing = await db.get('SELECT id FROM webhook_configs WHERE id = ?', req.params.id);
    if (!existing) return notFound(res, 'Webhook not found');
    const { name, url, events, secret, is_active } = req.body;
    await db.run(
      'UPDATE webhook_configs SET name=?, url=?, events=?, secret=?, is_active=?, updated_at=datetime(\'now\') WHERE id=?',
      name, url, JSON.stringify(events), secret || null, is_active !== undefined ? (is_active ? 1 : 0) : 1, req.params.id
    );
    const hook = await db.get('SELECT * FROM webhook_configs WHERE id = ?', req.params.id);
    hook.events = JSON.parse(hook.events);
    return success(res, hook, 'Webhook updated');
  } catch (err) { return error(res, 'Error updating webhook'); }
});

router.patch('/:id/toggle', authenticate, requireAdmin, async (req, res) => {
  try {
    const hook = await db.get('SELECT id, is_active FROM webhook_configs WHERE id = ?', req.params.id);
    if (!hook) return notFound(res, 'Webhook not found');
    await db.run('UPDATE webhook_configs SET is_active=? WHERE id=?', hook.is_active ? 0 : 1, req.params.id);
    const updated = await db.get('SELECT * FROM webhook_configs WHERE id = ?', req.params.id);
    updated.events = JSON.parse(updated.events);
    return success(res, updated);
  } catch (err) { return error(res, 'Error toggling webhook'); }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const hook = await db.get('SELECT id FROM webhook_configs WHERE id = ?', req.params.id);
    if (!hook) return notFound(res, 'Webhook not found');
    await db.run('DELETE FROM webhook_configs WHERE id = ?', req.params.id);
    return success(res, null, 'Webhook deleted');
  } catch (err) { return error(res, 'Error deleting webhook'); }
});

router.get('/:id/deliveries', authenticate, requireAdmin, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const deliveries = await db.all(
      'SELECT * FROM webhook_deliveries WHERE webhook_id = ? ORDER BY delivered_at DESC LIMIT ?',
      req.params.id, parseInt(limit)
    );
    return success(res, deliveries);
  } catch (err) { return error(res, 'Error fetching deliveries'); }
});

router.post('/:id/test', authenticate, requireAdmin, async (req, res) => {
  try {
    const hook = await db.get('SELECT * FROM webhook_configs WHERE id = ?', req.params.id);
    if (!hook) return notFound(res, 'Webhook not found');
    const { triggerWebhook } = require('../utils/webhook');
    hook.events = JSON.parse(hook.events);
    const testEvent = hook.events[0] || 'test';
    await triggerWebhook(testEvent, { test: true, webhook_id: hook.id, message: 'Test delivery from CRM Pro' });
    return success(res, null, `Test enviado para evento: ${testEvent}`);
  } catch (err) { return error(res, 'Error sending test'); }
});

module.exports = { router, VALID_EVENTS };
