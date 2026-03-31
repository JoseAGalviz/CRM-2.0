const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { db } = require('../db/database');
const { success, created, error, notFound } = require('../utils/response');

const STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
const STAGE_PROBABILITY = { lead: 10, qualified: 25, proposal: 50, negotiation: 75, won: 100, lost: 0 };

const dealValidators = [
  body('title').trim().notEmpty().withMessage('Deal title is required').isLength({ max: 200 }),
  body('value').optional().isFloat({ min: 0 }),
  body('stage').optional().isIn(STAGES),
  body('probability').optional().isInt({ min: 0, max: 100 }),
  body('expected_close').optional({ nullable: true }).isISO8601(),
  validate
];

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', stage, owner_id, contact_id, company_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE d.is_deleted = 0';
    const params = [];
    if (search) { where += ' AND d.title LIKE ?'; params.push(`%${search}%`); }
    if (stage) { where += ' AND d.stage = ?'; params.push(stage); }
    if (owner_id) { where += ' AND d.owner_id = ?'; params.push(Number(owner_id)); }
    if (contact_id) { where += ' AND d.contact_id = ?'; params.push(Number(contact_id)); }
    if (company_id) { where += ' AND d.company_id = ?'; params.push(Number(company_id)); }

    const countRow = await db.get(`SELECT COUNT(*) as count FROM deals d ${where}`, ...params);
    const total = Number(countRow.count);
    const deals = await db.all(`
      SELECT d.*, c.first_name || ' ' || c.last_name as contact_name, co.name as company_name, u.name as owner_name
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
      LEFT JOIN companies co ON d.company_id = co.id
      LEFT JOIN users u ON d.owner_id = u.id
      ${where} ORDER BY d.created_at DESC LIMIT ? OFFSET ?
    `, ...params, parseInt(limit), offset);

    return success(res, { deals, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { console.error(err); return error(res, 'Error fetching deals'); }
});

router.post('/', authenticate, dealValidators, async (req, res) => {
  try {
    const { title, value, currency, stage, probability, expected_close, contact_id, company_id, description } = req.body;
    const s = stage || 'lead';
    const prob = probability !== undefined ? probability : STAGE_PROBABILITY[s];
    const result = await db.run(
      'INSERT INTO deals (title, value, currency, stage, probability, expected_close, contact_id, company_id, owner_id, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      title, value || 0, currency || 'USD', s, prob, expected_close || null, contact_id || null, company_id || null, req.user.id, description || null
    );
    const deal = await db.get('SELECT * FROM deals WHERE id = ?', result.lastInsertRowid);
    return created(res, deal);
  } catch (err) { return error(res, 'Error creating deal'); }
});

router.get('/:id', authenticate, async (req, res) => {
  const deal = await db.get(`
    SELECT d.*, c.first_name || ' ' || c.last_name as contact_name, co.name as company_name, u.name as owner_name
    FROM deals d
    LEFT JOIN contacts c ON d.contact_id = c.id
    LEFT JOIN companies co ON d.company_id = co.id
    LEFT JOIN users u ON d.owner_id = u.id
    WHERE d.id = ? AND d.is_deleted = 0
  `, req.params.id);
  if (!deal) return notFound(res, 'Deal not found');
  return success(res, deal);
});

router.put('/:id', authenticate, dealValidators, async (req, res) => {
  try {
    const existing = await db.get('SELECT id FROM deals WHERE id = ? AND is_deleted = 0', req.params.id);
    if (!existing) return notFound(res, 'Deal not found');
    const { title, value, currency, stage, probability, expected_close, actual_close, contact_id, company_id, description, lost_reason } = req.body;
    const s = stage || 'lead';
    const prob = probability !== undefined ? probability : STAGE_PROBABILITY[s];
    await db.run(
      'UPDATE deals SET title=?, value=?, currency=?, stage=?, probability=?, expected_close=?, actual_close=?, contact_id=?, company_id=?, description=?, lost_reason=? WHERE id=?',
      title, value || 0, currency || 'USD', s, prob, expected_close || null, actual_close || null, contact_id || null, company_id || null, description || null, lost_reason || null, req.params.id
    );
    const deal = await db.get('SELECT * FROM deals WHERE id = ?', req.params.id);
    return success(res, deal, 'Deal updated');
  } catch (err) { return error(res, 'Error updating deal'); }
});

router.patch('/:id/stage', authenticate, [body('stage').isIn(STAGES), validate], async (req, res) => {
  try {
    const existing = await db.get('SELECT id FROM deals WHERE id = ? AND is_deleted = 0', req.params.id);
    if (!existing) return notFound(res, 'Deal not found');
    const { stage, lost_reason } = req.body;
    const probability = STAGE_PROBABILITY[stage];
    const actual_close = ['won', 'lost'].includes(stage) ? new Date().toISOString() : null;
    await db.run(
      'UPDATE deals SET stage=?, probability=?, actual_close=COALESCE(?, actual_close), lost_reason=COALESCE(?, lost_reason) WHERE id=?',
      stage, probability, actual_close, lost_reason || null, req.params.id
    );
    const deal = await db.get('SELECT * FROM deals WHERE id = ?', req.params.id);
    return success(res, deal, 'Deal stage updated');
  } catch (err) { return error(res, 'Error updating stage'); }
});

router.delete('/:id', authenticate, async (req, res) => {
  const existing = await db.get('SELECT id FROM deals WHERE id = ? AND is_deleted = 0', req.params.id);
  if (!existing) return notFound(res, 'Deal not found');
  await db.run('UPDATE deals SET is_deleted = 1 WHERE id = ?', req.params.id);
  return success(res, null, 'Deal deleted');
});

router.get('/:id/activities', authenticate, async (req, res) => {
  const activities = await db.all('SELECT a.*, u.name as owner_name FROM activities a LEFT JOIN users u ON a.owner_id = u.id WHERE a.deal_id = ? AND a.is_deleted = 0 ORDER BY a.occurred_at DESC', req.params.id);
  return success(res, activities);
});

router.get('/:id/tasks', authenticate, async (req, res) => {
  const tasks = await db.all('SELECT * FROM tasks WHERE deal_id = ? AND is_deleted = 0 ORDER BY due_date ASC', req.params.id);
  return success(res, tasks);
});

router.get('/:id/notes', authenticate, async (req, res) => {
  const notes = await db.all('SELECT n.*, u.name as owner_name FROM notes n LEFT JOIN users u ON n.owner_id = u.id WHERE n.deal_id = ? AND n.is_deleted = 0 ORDER BY n.created_at DESC', req.params.id);
  return success(res, notes);
});

module.exports = router;
