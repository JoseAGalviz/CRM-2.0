const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { db } = require('../db/database');
const { success, created, error, notFound } = require('../utils/response');
const { logAudit } = require('../utils/audit');

const activityValidators = [
  body('type').isIn(['call', 'email', 'meeting', 'demo', 'follow_up', 'other']),
  body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 200 }),
  body('duration_min').optional({ nullable: true }).isInt({ min: 0 }),
  body('occurred_at').optional().isISO8601(),
  validate
];

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, owner_id, contact_id, deal_id, from, to } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE a.is_deleted = 0';
    const params = [];
    if (type) { where += ' AND a.type = ?'; params.push(type); }
    if (owner_id) { where += ' AND a.owner_id = ?'; params.push(Number(owner_id)); }
    if (contact_id) { where += ' AND a.contact_id = ?'; params.push(Number(contact_id)); }
    if (deal_id) { where += ' AND a.deal_id = ?'; params.push(Number(deal_id)); }
    if (from) { where += ' AND a.occurred_at >= ?'; params.push(from); }
    if (to) { where += ' AND a.occurred_at <= ?'; params.push(to); }

    const countRow = await db.get(`SELECT COUNT(*) as count FROM activities a ${where}`, ...params);
    const total = Number(countRow.count);
    const activities = await db.all(`
      SELECT a.*, c.first_name || ' ' || c.last_name as contact_name, co.name as company_name, d.title as deal_title, u.name as owner_name
      FROM activities a
      LEFT JOIN contacts c ON a.contact_id = c.id
      LEFT JOIN companies co ON a.company_id = co.id
      LEFT JOIN deals d ON a.deal_id = d.id
      LEFT JOIN users u ON a.owner_id = u.id
      ${where} ORDER BY a.occurred_at DESC LIMIT ? OFFSET ?
    `, ...params, parseInt(limit), offset);

    return success(res, { activities, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { console.error(err); return error(res, 'Error fetching activities'); }
});

router.post('/', authenticate, activityValidators, async (req, res) => {
  try {
    const { type, subject, description, outcome, duration_min, occurred_at, contact_id, company_id, deal_id } = req.body;
    const result = await db.run(
      'INSERT INTO activities (type, subject, description, outcome, duration_min, occurred_at, contact_id, company_id, deal_id, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      type, subject, description || null, outcome || null, duration_min || null, occurred_at || new Date().toISOString(), contact_id || null, company_id || null, deal_id || null, req.user.id
    );
    const activity = await db.get('SELECT * FROM activities WHERE id = ?', result.lastInsertRowid);
    await logAudit(db, req.user.id, 'create', 'activity', activity.id, activity.subject, null, req.ip);
    return created(res, activity);
  } catch (err) { return error(res, 'Error creating activity'); }
});

router.get('/:id', authenticate, async (req, res) => {
  const activity = await db.get('SELECT * FROM activities WHERE id = ? AND is_deleted = 0', req.params.id);
  if (!activity) return notFound(res, 'Activity not found');
  return success(res, activity);
});

router.put('/:id', authenticate, activityValidators, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM activities WHERE id = ? AND is_deleted = 0', req.params.id);
    if (!existing) return notFound(res, 'Activity not found');
    const { type, subject, description, outcome, duration_min, occurred_at, contact_id, company_id, deal_id } = req.body;
    await db.run(
      'UPDATE activities SET type=?, subject=?, description=?, outcome=?, duration_min=?, occurred_at=?, contact_id=?, company_id=?, deal_id=? WHERE id=?',
      type, subject, description || null, outcome || null, duration_min || null, occurred_at || new Date().toISOString(), contact_id || null, company_id || null, deal_id || null, req.params.id
    );
    const activity = await db.get('SELECT * FROM activities WHERE id = ?', req.params.id);
    await logAudit(db, req.user.id, 'update', 'activity', activity.id, activity.subject, null, req.ip);
    return success(res, activity, 'Activity updated');
  } catch (err) { return error(res, 'Error updating activity'); }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const existing = await db.get('SELECT id, subject FROM activities WHERE id = ? AND is_deleted = 0', req.params.id);
    if (!existing) return notFound(res, 'Activity not found');
    await db.run('UPDATE activities SET is_deleted = 1 WHERE id = ?', req.params.id);
    await logAudit(db, req.user.id, 'delete', 'activity', existing.id, existing.subject, null, req.ip);
    return success(res, null, 'Activity deleted');
  } catch (err) { return error(res, 'Error deleting activity'); }
});

module.exports = router;
