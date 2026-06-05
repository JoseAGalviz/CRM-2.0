const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { db } = require('../db/database');
const { success, created, error, notFound } = require('../utils/response');
const { logAudit, diffEntities } = require('../utils/audit');
const { triggerWebhook } = require('../utils/webhook');

const parseTags = (deals) => {
  (Array.isArray(deals) ? deals : [deals]).forEach(d => {
    if (d) { try { d.tags = JSON.parse(d.tags || '[]'); } catch { d.tags = []; } }
  });
};

// Fetch valid stage values from DB (falls back to hardcoded defaults)
async function getStages() {
  try {
    const rows = await db.all('SELECT value, probability FROM pipeline_stages WHERE is_active = 1 ORDER BY sort_order');
    if (rows.length > 0) return rows;
  } catch {}
  return [
    { value: 'lead', probability: 10 }, { value: 'qualified', probability: 25 },
    { value: 'proposal', probability: 50 }, { value: 'negotiation', probability: 75 },
    { value: 'won', probability: 100 }, { value: 'lost', probability: 0 },
  ];
}

const dealValidators = [
  body('title').trim().notEmpty().withMessage('Deal title is required').isLength({ max: 200 }),
  body('value').optional().isFloat({ min: 0 }),
  body('stage').optional().isString(),
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

    parseTags(deals);
    return success(res, { deals, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { console.error(err); return error(res, 'Error fetching deals'); }
});

router.post('/', authenticate, dealValidators, async (req, res) => {
  try {
    const stages = await getStages();
    const { title, value, currency, stage, probability, expected_close, contact_id, company_id, description, tags } = req.body;
    const s = stage || stages[0]?.value || 'lead';
    if (stage && !stages.find(st => st.value === s)) return error(res, 'Etapa inválida', 400);
    const stageRow = stages.find(st => st.value === s);
    const prob = probability !== undefined ? probability : (stageRow?.probability ?? 0);
    const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
    const result = await db.run(
      'INSERT INTO deals (title, value, currency, stage, probability, expected_close, contact_id, company_id, owner_id, description, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      title, value || 0, currency || 'USD', s, prob, expected_close || null, contact_id || null, company_id || null, req.user.id, description || null, tagsJson
    );
    const deal = await db.get('SELECT * FROM deals WHERE id = ?', result.lastInsertRowid);
    parseTags(deal);
    await logAudit(db, req.user.id, 'create', 'deal', deal.id, deal.title, null, req.ip);
    triggerWebhook('deal.created', deal);
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
  parseTags(deal);
  return success(res, deal);
});

router.put('/:id', authenticate, dealValidators, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM deals WHERE id = ? AND is_deleted = 0', req.params.id);
    if (!existing) return notFound(res, 'Deal not found');
    const stages = await getStages();
    const { title, value, currency, stage, probability, expected_close, actual_close, contact_id, company_id, owner_id, description, lost_reason, tags } = req.body;
    const s = stage || existing.stage || 'lead';
    if (stage && !stages.find(st => st.value === s)) return error(res, 'Etapa inválida', 400);
    const stageRow = stages.find(st => st.value === s);
    const prob = probability !== undefined ? probability : (stageRow?.probability ?? existing.probability);
    const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
    await db.run(
      'UPDATE deals SET title=?, value=?, currency=?, stage=?, probability=?, expected_close=?, actual_close=?, contact_id=?, company_id=?, owner_id=COALESCE(?, owner_id), description=?, lost_reason=?, tags=? WHERE id=?',
      title, value || 0, currency || 'USD', s, prob, expected_close || null, actual_close || null, contact_id || null, company_id || null, owner_id || null, description || null, lost_reason || null, tagsJson, req.params.id
    );
    const deal = await db.get('SELECT * FROM deals WHERE id = ?', req.params.id);
    parseTags(deal);
    const changes = diffEntities('deal', existing, deal);
    await logAudit(db, req.user.id, 'update', 'deal', deal.id, deal.title, changes, req.ip);
    return success(res, deal, 'Deal updated');
  } catch (err) { return error(res, 'Error updating deal'); }
});

router.patch('/:id/stage', authenticate, [body('stage').notEmpty(), validate], async (req, res) => {
  try {
    const stages = await getStages();
    const existing = await db.get('SELECT * FROM deals WHERE id = ? AND is_deleted = 0', req.params.id);
    if (!existing) return notFound(res, 'Deal not found');
    const { stage, lost_reason } = req.body;
    if (!stages.find(s => s.value === stage)) return error(res, 'Etapa inválida', 400);
    const stageRow = stages.find(s => s.value === stage);
    const probability = stageRow?.probability ?? existing.probability;
    const actual_close = (stageRow?.probability === 100 || stageRow?.probability === 0) ? new Date().toISOString() : null;
    await db.run(
      'UPDATE deals SET stage=?, probability=?, actual_close=COALESCE(?, actual_close), lost_reason=COALESCE(?, lost_reason) WHERE id=?',
      stage, probability, actual_close, lost_reason || null, req.params.id
    );
    const deal = await db.get('SELECT * FROM deals WHERE id = ?', req.params.id);
    const changes = diffEntities('deal', existing, deal);
    await logAudit(db, req.user.id, 'update', 'deal', deal.id, deal.title, changes, req.ip);
    triggerWebhook('deal.stage_changed', { ...deal, previous_stage: existing.stage });
    if (stage === 'won') triggerWebhook('deal.won', deal);
    if (stage === 'lost') triggerWebhook('deal.lost', deal);
    return success(res, deal, 'Deal stage updated');
  } catch (err) { return error(res, 'Error updating stage'); }
});

// POST /api/deals/bulk-delete
router.post('/bulk-delete', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return error(res, 'No IDs provided', 400);
    if (ids.length > 200) return error(res, 'Max 200 at a time', 400);
    let deleted = 0;
    for (const id of ids) {
      const d = await db.get('SELECT id, title FROM deals WHERE id = ? AND is_deleted = 0', id);
      if (!d) continue;
      await db.run('UPDATE deals SET is_deleted = 1 WHERE id = ?', id);
      await logAudit(db, req.user.id, 'delete', 'deal', d.id, d.title, null, req.ip);
      deleted++;
    }
    return success(res, { deleted }, `${deleted} negocios eliminados`);
  } catch (err) { return error(res, 'Error en eliminación masiva'); }
});

router.delete('/:id', authenticate, async (req, res) => {
  const existing = await db.get('SELECT id, title FROM deals WHERE id = ? AND is_deleted = 0', req.params.id);
  if (!existing) return notFound(res, 'Deal not found');
  await db.run('UPDATE deals SET is_deleted = 1 WHERE id = ?', req.params.id);
  await logAudit(db, req.user.id, 'delete', 'deal', existing.id, existing.title, null, req.ip);
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
