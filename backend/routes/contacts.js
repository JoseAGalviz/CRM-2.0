const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { db } = require('../db/database');
const { success, created, error, notFound } = require('../utils/response');

const contactValidators = [
  body('first_name').trim().notEmpty().withMessage('First name is required').isLength({ max: 100 }),
  body('last_name').trim().notEmpty().withMessage('Last name is required').isLength({ max: 100 }),
  body('email').optional({ nullable: true }).isEmail().normalizeEmail(),
  body('status').optional().isIn(['active', 'inactive']),
  body('source').optional({ nullable: true }).isIn(['web', 'referral', 'cold', 'event', 'other', null, '']),
  body('tags').optional({ nullable: true }),
  validate
];

const parseTags = (contacts) => {
  (Array.isArray(contacts) ? contacts : [contacts]).forEach(c => {
    if (c) { try { c.tags = JSON.parse(c.tags || '[]'); } catch { c.tags = []; } }
  });
};

// GET /api/contacts
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', company_id, owner_id, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = 'WHERE c.is_deleted = 0';
    const params = [];

    if (search) {
      where += ' AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (company_id) { where += ' AND c.company_id = ?'; params.push(Number(company_id)); }
    if (owner_id) { where += ' AND c.owner_id = ?'; params.push(Number(owner_id)); }
    if (status) { where += ' AND c.status = ?'; params.push(status); }

    const countRow = await db.get(`SELECT COUNT(*) as count FROM contacts c ${where}`, ...params);
    const total = Number(countRow.count);
    const contacts = await db.all(`
      SELECT c.*, co.name as company_name, u.name as owner_name
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      LEFT JOIN users u ON c.owner_id = u.id
      ${where}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, ...params, parseInt(limit), offset);

    parseTags(contacts);
    return success(res, { contacts, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { console.error(err); return error(res, 'Error fetching contacts'); }
});

// POST /api/contacts
router.post('/', authenticate, contactValidators, async (req, res) => {
  try {
    const { first_name, last_name, email, phone, mobile, job_title, department, company_id, source, status, tags, address, city, country, linkedin_url, notes } = req.body;
    const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
    const result = await db.run(
      'INSERT INTO contacts (first_name, last_name, email, phone, mobile, job_title, department, company_id, owner_id, source, status, tags, address, city, country, linkedin_url, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      first_name, last_name, email || null, phone || null, mobile || null, job_title || null, department || null, company_id || null, req.user.id, source || null, status || 'active', tagsJson, address || null, city || null, country || null, linkedin_url || null, notes || null
    );
    const contact = await db.get('SELECT * FROM contacts WHERE id = ?', result.lastInsertRowid);
    parseTags(contact);
    return created(res, contact);
  } catch (err) { console.error(err); return error(res, 'Error creating contact'); }
});

// GET /api/contacts/:id
router.get('/:id', authenticate, async (req, res) => {
  const contact = await db.get(`
    SELECT c.*, co.name as company_name, u.name as owner_name
    FROM contacts c
    LEFT JOIN companies co ON c.company_id = co.id
    LEFT JOIN users u ON c.owner_id = u.id
    WHERE c.id = ? AND c.is_deleted = 0
  `, req.params.id);
  if (!contact) return notFound(res, 'Contact not found');
  parseTags(contact);
  return success(res, contact);
});

// PUT /api/contacts/:id
router.put('/:id', authenticate, contactValidators, async (req, res) => {
  try {
    const existing = await db.get('SELECT id FROM contacts WHERE id = ? AND is_deleted = 0', req.params.id);
    if (!existing) return notFound(res, 'Contact not found');
    const { first_name, last_name, email, phone, mobile, job_title, department, company_id, source, status, tags, address, city, country, linkedin_url, notes } = req.body;
    const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
    await db.run(
      'UPDATE contacts SET first_name=?, last_name=?, email=?, phone=?, mobile=?, job_title=?, department=?, company_id=?, source=?, status=?, tags=?, address=?, city=?, country=?, linkedin_url=?, notes=? WHERE id=?',
      first_name, last_name, email || null, phone || null, mobile || null, job_title || null, department || null, company_id || null, source || null, status || 'active', tagsJson, address || null, city || null, country || null, linkedin_url || null, notes || null, req.params.id
    );
    const contact = await db.get('SELECT * FROM contacts WHERE id = ?', req.params.id);
    parseTags(contact);
    return success(res, contact, 'Contact updated');
  } catch (err) { return error(res, 'Error updating contact'); }
});

// DELETE /api/contacts/:id
router.delete('/:id', authenticate, async (req, res) => {
  const existing = await db.get('SELECT id FROM contacts WHERE id = ? AND is_deleted = 0', req.params.id);
  if (!existing) return notFound(res, 'Contact not found');
  await db.run('UPDATE contacts SET is_deleted = 1 WHERE id = ?', req.params.id);
  return success(res, null, 'Contact deleted');
});

router.get('/:id/deals', authenticate, async (req, res) => {
  const deals = await db.all('SELECT * FROM deals WHERE contact_id = ? AND is_deleted = 0 ORDER BY created_at DESC', req.params.id);
  return success(res, deals);
});

router.get('/:id/activities', authenticate, async (req, res) => {
  const activities = await db.all('SELECT a.*, u.name as owner_name FROM activities a LEFT JOIN users u ON a.owner_id = u.id WHERE a.contact_id = ? AND a.is_deleted = 0 ORDER BY a.occurred_at DESC', req.params.id);
  return success(res, activities);
});

router.get('/:id/tasks', authenticate, async (req, res) => {
  const tasks = await db.all('SELECT * FROM tasks WHERE contact_id = ? AND is_deleted = 0 ORDER BY due_date ASC', req.params.id);
  return success(res, tasks);
});

router.get('/:id/notes', authenticate, async (req, res) => {
  const notes = await db.all('SELECT n.*, u.name as owner_name FROM notes n LEFT JOIN users u ON n.owner_id = u.id WHERE n.contact_id = ? AND n.is_deleted = 0 ORDER BY n.created_at DESC', req.params.id);
  return success(res, notes);
});

module.exports = router;
