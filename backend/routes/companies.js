const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { db } = require('../db/database');
const { success, created, error, notFound } = require('../utils/response');

const companyValidators = [
  body('name').trim().notEmpty().withMessage('Company name is required').isLength({ max: 200 }),
  body('email').optional({ nullable: true }).isEmail().normalizeEmail(),
  body('size').optional({ nullable: true }).isIn(['startup', 'smb', 'enterprise', null, '']),
  body('annual_revenue').optional({ nullable: true }).isFloat({ min: 0 }),
  validate
];

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', industry, owner_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE c.is_deleted = 0';
    const params = [];
    if (search) { where += ' AND c.name LIKE ?'; params.push(`%${search}%`); }
    if (industry) { where += ' AND c.industry = ?'; params.push(industry); }
    if (owner_id) { where += ' AND c.owner_id = ?'; params.push(Number(owner_id)); }

    const countRow = await db.get(`SELECT COUNT(*) as count FROM companies c ${where}`, ...params);
    const total = Number(countRow.count);
    const companies = await db.all(`
      SELECT c.*, u.name as owner_name,
        (SELECT COUNT(*) FROM contacts ct WHERE ct.company_id = c.id AND ct.is_deleted = 0) as contacts_count,
        (SELECT COUNT(*) FROM deals d WHERE d.company_id = c.id AND d.is_deleted = 0) as deals_count
      FROM companies c LEFT JOIN users u ON c.owner_id = u.id
      ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?
    `, ...params, parseInt(limit), offset);

    return success(res, { companies, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { console.error(err); return error(res, 'Error fetching companies'); }
});

router.post('/', authenticate, companyValidators, async (req, res) => {
  try {
    const { name, industry, website, phone, email, address, city, country, size, annual_revenue, description } = req.body;
    const result = await db.run(
      'INSERT INTO companies (name, industry, website, phone, email, address, city, country, size, annual_revenue, description, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      name, industry || null, website || null, phone || null, email || null, address || null, city || null, country || null, size || null, annual_revenue || null, description || null, req.user.id
    );
    const company = await db.get('SELECT * FROM companies WHERE id = ?', result.lastInsertRowid);
    return created(res, company);
  } catch (err) { return error(res, 'Error creating company'); }
});

router.get('/:id', authenticate, async (req, res) => {
  const company = await db.get(`
    SELECT c.*, u.name as owner_name,
      (SELECT COUNT(*) FROM contacts ct WHERE ct.company_id = c.id AND ct.is_deleted = 0) as contacts_count,
      (SELECT COUNT(*) FROM deals d WHERE d.company_id = c.id AND d.is_deleted = 0) as deals_count
    FROM companies c LEFT JOIN users u ON c.owner_id = u.id
    WHERE c.id = ? AND c.is_deleted = 0
  `, req.params.id);
  if (!company) return notFound(res, 'Company not found');
  return success(res, company);
});

router.put('/:id', authenticate, companyValidators, async (req, res) => {
  try {
    const existing = await db.get('SELECT id FROM companies WHERE id = ? AND is_deleted = 0', req.params.id);
    if (!existing) return notFound(res, 'Company not found');
    const { name, industry, website, phone, email, address, city, country, size, annual_revenue, description } = req.body;
    await db.run(
      'UPDATE companies SET name=?, industry=?, website=?, phone=?, email=?, address=?, city=?, country=?, size=?, annual_revenue=?, description=? WHERE id=?',
      name, industry || null, website || null, phone || null, email || null, address || null, city || null, country || null, size || null, annual_revenue || null, description || null, req.params.id
    );
    const company = await db.get('SELECT * FROM companies WHERE id = ?', req.params.id);
    return success(res, company, 'Company updated');
  } catch (err) { return error(res, 'Error updating company'); }
});

router.delete('/:id', authenticate, async (req, res) => {
  const existing = await db.get('SELECT id FROM companies WHERE id = ? AND is_deleted = 0', req.params.id);
  if (!existing) return notFound(res, 'Company not found');
  await db.run('UPDATE companies SET is_deleted = 1 WHERE id = ?', req.params.id);
  return success(res, null, 'Company deleted');
});

router.get('/:id/contacts', authenticate, async (req, res) => {
  const contacts = await db.all('SELECT * FROM contacts WHERE company_id = ? AND is_deleted = 0 ORDER BY first_name', req.params.id);
  contacts.forEach(c => { try { c.tags = JSON.parse(c.tags || '[]'); } catch { c.tags = []; } });
  return success(res, contacts);
});

router.get('/:id/deals', authenticate, async (req, res) => {
  const deals = await db.all('SELECT * FROM deals WHERE company_id = ? AND is_deleted = 0 ORDER BY created_at DESC', req.params.id);
  return success(res, deals);
});

router.get('/:id/activities', authenticate, async (req, res) => {
  const activities = await db.all('SELECT a.*, u.name as owner_name FROM activities a LEFT JOIN users u ON a.owner_id = u.id WHERE a.company_id = ? AND a.is_deleted = 0 ORDER BY a.occurred_at DESC', req.params.id);
  return success(res, activities);
});

module.exports = router;
