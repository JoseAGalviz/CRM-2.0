const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { db } = require('../db/database');
const { success, created, error, notFound } = require('../utils/response');
const { logAudit, diffEntities } = require('../utils/audit');
const { triggerWebhook } = require('../utils/webhook');

const taskValidators = [
  body('title').trim().notEmpty().withMessage('Task title is required').isLength({ max: 200 }),
  body('status').optional().isIn(['pending', 'in_progress', 'done', 'cancelled']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('due_date').optional({ nullable: true }).isISO8601(),
  validate
];

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority, assigned_to, due_before, contact_id, deal_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE t.is_deleted = 0';
    const params = [];
    if (status) { where += ' AND t.status = ?'; params.push(status); }
    if (priority) { where += ' AND t.priority = ?'; params.push(priority); }
    if (assigned_to) { where += ' AND t.assigned_to = ?'; params.push(Number(assigned_to)); }
    if (due_before) { where += ' AND t.due_date <= ?'; params.push(due_before); }
    if (contact_id) { where += ' AND t.contact_id = ?'; params.push(Number(contact_id)); }
    if (deal_id) { where += ' AND t.deal_id = ?'; params.push(Number(deal_id)); }

    const countRow = await db.get(`SELECT COUNT(*) as count FROM tasks t ${where}`, ...params);
    const total = Number(countRow.count);
    const tasks = await db.all(`
      SELECT t.*, c.first_name || ' ' || c.last_name as contact_name, d.title as deal_title, u.name as assigned_name
      FROM tasks t
      LEFT JOIN contacts c ON t.contact_id = c.id
      LEFT JOIN deals d ON t.deal_id = d.id
      LEFT JOIN users u ON t.assigned_to = u.id
      ${where}
      ORDER BY CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END, t.due_date ASC, t.created_at DESC
      LIMIT ? OFFSET ?
    `, ...params, parseInt(limit), offset);

    return success(res, { tasks, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { console.error(err); return error(res, 'Error fetching tasks'); }
});

router.post('/', authenticate, taskValidators, async (req, res) => {
  try {
    const { title, description, status, priority, due_date, assigned_to, contact_id, company_id, deal_id } = req.body;
    const result = await db.run(
      'INSERT INTO tasks (title, description, status, priority, due_date, assigned_to, owner_id, contact_id, company_id, deal_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      title, description || null, status || 'pending', priority || 'medium', due_date || null, assigned_to || req.user.id, req.user.id, contact_id || null, company_id || null, deal_id || null
    );
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', result.lastInsertRowid);
    await logAudit(db, req.user.id, 'create', 'task', task.id, task.title, null, req.ip);
    triggerWebhook('task.created', task);
    return created(res, task);
  } catch (err) { return error(res, 'Error creating task'); }
});

router.get('/:id', authenticate, async (req, res) => {
  const task = await db.get('SELECT * FROM tasks WHERE id = ? AND is_deleted = 0', req.params.id);
  if (!task) return notFound(res, 'Task not found');
  return success(res, task);
});

router.put('/:id', authenticate, taskValidators, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM tasks WHERE id = ? AND is_deleted = 0', req.params.id);
    if (!existing) return notFound(res, 'Task not found');
    const { title, description, status, priority, due_date, assigned_to, contact_id, company_id, deal_id } = req.body;
    const completed_at = status === 'done' ? new Date().toISOString() : null;
    await db.run(
      'UPDATE tasks SET title=?, description=?, status=?, priority=?, due_date=?, assigned_to=?, contact_id=?, company_id=?, deal_id=?, completed_at=? WHERE id=?',
      title, description || null, status || 'pending', priority || 'medium', due_date || null, assigned_to || req.user.id, contact_id || null, company_id || null, deal_id || null, completed_at, req.params.id
    );
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', req.params.id);
    const changes = diffEntities('task', existing, task);
    await logAudit(db, req.user.id, 'update', 'task', task.id, task.title, changes, req.ip);
    return success(res, task, 'Task updated');
  } catch (err) { return error(res, 'Error updating task'); }
});

router.patch('/:id/status', authenticate, [body('status').isIn(['pending', 'in_progress', 'done', 'cancelled']), validate], async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM tasks WHERE id = ? AND is_deleted = 0', req.params.id);
    if (!existing) return notFound(res, 'Task not found');
    const { status } = req.body;
    const completed_at = status === 'done' ? new Date().toISOString() : null;
    await db.run('UPDATE tasks SET status=?, completed_at=? WHERE id=?', status, completed_at, req.params.id);
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', req.params.id);
    const changes = diffEntities('task', existing, task);
    await logAudit(db, req.user.id, 'update', 'task', task.id, task.title, changes, req.ip);
    if (status === 'done') triggerWebhook('task.completed', task);
    return success(res, task, 'Task status updated');
  } catch (err) { return error(res, 'Error updating task status'); }
});

router.delete('/:id', authenticate, async (req, res) => {
  const existing = await db.get('SELECT id, title FROM tasks WHERE id = ? AND is_deleted = 0', req.params.id);
  if (!existing) return notFound(res, 'Task not found');
  await db.run('UPDATE tasks SET is_deleted = 1 WHERE id = ?', req.params.id);
  await logAudit(db, req.user.id, 'delete', 'task', existing.id, existing.title, null, req.ip);
  return success(res, null, 'Task deleted');
});

module.exports = router;
