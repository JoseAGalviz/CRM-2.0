const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { db } = require('../db/database');
const { success, created, error, notFound } = require('../utils/response');
const { logAudit, diffEntities } = require('../utils/audit');
const { triggerWebhook } = require('../utils/webhook');

const parseTags = (companies) => {
  (Array.isArray(companies) ? companies : [companies]).forEach(c => {
    if (c) { try { c.tags = JSON.parse(c.tags || '[]'); } catch { c.tags = []; } }
  });
};

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

    parseTags(companies);
    return success(res, { companies, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { console.error(err); return error(res, 'Error fetching companies'); }
});

router.post('/', authenticate, companyValidators, async (req, res) => {
  try {
    const { name, industry, website, phone, email, address, city, country, size, annual_revenue, description, tags } = req.body;
    const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
    const result = await db.run(
      'INSERT INTO companies (name, industry, website, phone, email, address, city, country, size, annual_revenue, description, owner_id, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      name, industry || null, website || null, phone || null, email || null, address || null, city || null, country || null, size || null, annual_revenue || null, description || null, req.user.id, tagsJson
    );
    const company = await db.get('SELECT * FROM companies WHERE id = ?', result.lastInsertRowid);
    parseTags(company);
    await logAudit(db, req.user.id, 'create', 'company', company.id, company.name, null, req.ip);
    triggerWebhook('company.created', company);
    return created(res, company);
  } catch (err) { return error(res, 'Error creating company'); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const company = await db.get(`
      SELECT c.*, u.name as owner_name,
        (SELECT COUNT(*) FROM contacts ct WHERE ct.company_id = c.id AND ct.is_deleted = 0) as contacts_count,
        (SELECT COUNT(*) FROM deals d WHERE d.company_id = c.id AND d.is_deleted = 0) as deals_count
      FROM companies c LEFT JOIN users u ON c.owner_id = u.id
      WHERE c.id = ? AND c.is_deleted = 0
    `, req.params.id);
    if (!company) return notFound(res, 'Company not found');
    parseTags(company);
    return success(res, company);
  } catch (err) { console.error(err); return error(res, 'Error fetching company'); }
});

router.put('/:id', authenticate, companyValidators, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM companies WHERE id = ? AND is_deleted = 0', req.params.id);
    if (!existing) return notFound(res, 'Company not found');
    const { name, industry, website, phone, email, address, city, country, size, annual_revenue, description, tags } = req.body;
    const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
    await db.run(
      'UPDATE companies SET name=?, industry=?, website=?, phone=?, email=?, address=?, city=?, country=?, size=?, annual_revenue=?, description=?, tags=? WHERE id=?',
      name, industry || null, website || null, phone || null, email || null, address || null, city || null, country || null, size || null, annual_revenue || null, description || null, tagsJson, req.params.id
    );
    const company = await db.get('SELECT * FROM companies WHERE id = ?', req.params.id);
    parseTags(company);
    const changes = diffEntities('company', existing, company);
    await logAudit(db, req.user.id, 'update', 'company', company.id, company.name, changes, req.ip);
    triggerWebhook('company.updated', company);
    return success(res, company, 'Company updated');
  } catch (err) { return error(res, 'Error updating company'); }
});

// POST /api/companies/bulk-delete
router.post('/bulk-delete', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return error(res, 'No IDs provided', 400);
    if (ids.length > 200) return error(res, 'Max 200 at a time', 400);
    let deleted = 0;
    for (const id of ids) {
      const c = await db.get('SELECT id, name FROM companies WHERE id = ? AND is_deleted = 0', id);
      if (!c) continue;
      await db.run('UPDATE companies SET is_deleted = 1 WHERE id = ?', id);
      await logAudit(db, req.user.id, 'delete', 'company', c.id, c.name, null, req.ip);
      deleted++;
    }
    return success(res, { deleted }, `${deleted} empresas eliminadas`);
  } catch (err) { console.error(err); return error(res, 'Error en eliminación masiva'); }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const existing = await db.get('SELECT id, name FROM companies WHERE id = ? AND is_deleted = 0', req.params.id);
    if (!existing) return notFound(res, 'Company not found');
    await db.run('UPDATE companies SET is_deleted = 1 WHERE id = ?', req.params.id);
    await logAudit(db, req.user.id, 'delete', 'company', existing.id, existing.name, null, req.ip);
    triggerWebhook('company.deleted', { id: existing.id, name: existing.name });
    return success(res, null, 'Company deleted');
  } catch (err) { console.error(err); return error(res, 'Error deleting company'); }
});

// POST /api/companies/merge
router.post('/merge', authenticate, async (req, res) => {
  try {
    const { keepId, mergeId } = req.body;
    if (!keepId || !mergeId || keepId === mergeId) return error(res, 'Invalid IDs', 400);
    const keep  = await db.get('SELECT * FROM companies WHERE id = ? AND is_deleted = 0', keepId);
    const merge = await db.get('SELECT * FROM companies WHERE id = ? AND is_deleted = 0', mergeId);
    if (!keep || !merge) return notFound(res, 'Company not found');

    const fields = ['industry','website','phone','email','address','city','country','size','annual_revenue','description'];
    const updates = {};
    for (const f of fields) { if (!keep[f] && merge[f]) updates[f] = merge[f]; }
    if (Object.keys(updates).length > 0) {
      const setClauses = Object.keys(updates).map(f => `${f}=?`).join(', ');
      await db.run(`UPDATE companies SET ${setClauses} WHERE id=?`, ...Object.values(updates), keepId);
    }

    const keepTags  = JSON.parse(keep.tags || '[]');
    const mergeTags = JSON.parse(merge.tags || '[]');
    await db.run('UPDATE companies SET tags=? WHERE id=?', JSON.stringify([...new Set([...keepTags, ...mergeTags])]), keepId);

    await db.run('UPDATE contacts SET company_id=? WHERE company_id=? AND is_deleted=0', keepId, mergeId);
    await db.run('UPDATE deals    SET company_id=? WHERE company_id=? AND is_deleted=0', keepId, mergeId);
    await db.run('UPDATE activities SET company_id=? WHERE company_id=?', keepId, mergeId);
    await db.run('UPDATE notes    SET company_id=? WHERE company_id=?', keepId, mergeId);

    await db.run('UPDATE companies SET is_deleted=1 WHERE id=?', mergeId);
    await logAudit(db, req.user.id, 'merge', 'company', keepId, `${keep.name} ← ${merge.name}`, null, req.ip);

    const updated = await db.get('SELECT * FROM companies WHERE id=?', keepId);
    parseTags(updated);
    return success(res, updated, 'Empresas fusionadas');
  } catch (err) { console.error(err); return error(res, 'Error fusionando empresas'); }
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

router.get('/:id/notes', authenticate, async (req, res) => {
  const notes = await db.all('SELECT n.*, u.name as owner_name FROM notes n LEFT JOIN users u ON n.owner_id = u.id WHERE n.company_id = ? AND n.is_deleted = 0 ORDER BY n.created_at DESC', req.params.id);
  return success(res, notes);
});

// POST /api/companies/import — bulk import from CSV (parsed array)
router.post('/import', authenticate, async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) return error(res, 'No rows provided', 400);
    if (rows.length > 500) return error(res, 'Max 500 rows per import', 400);

    let imported = 0, skipped = 0;
    for (const row of rows) {
      const name = (row.name || row.nombre || row.empresa || '').trim();
      if (!name) { skipped++; continue; }

      const dup = await db.get('SELECT id FROM companies WHERE name = ? AND is_deleted = 0', name);
      if (dup) { skipped++; continue; }

      await db.run(
        'INSERT INTO companies (name, industry, website, phone, email, city, country, owner_id, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        name,
        (row.industry || row.industria || '').trim() || null,
        (row.website || row.web || '').trim() || null,
        (row.phone || row.telefono || '').trim() || null,
        (row.email || '').trim().toLowerCase() || null,
        (row.city || row.ciudad || '').trim() || null,
        (row.country || row.pais || row.país || '').trim() || null,
        req.user.id, '[]'
      );
      imported++;
    }

    await logAudit(db, req.user.id, 'import', 'company', 0, `${imported} companies`, null, req.ip);
    return success(res, { imported, skipped }, `${imported} empresas importadas, ${skipped} omitidas`);
  } catch (err) { console.error(err); return error(res, 'Error importando empresas'); }
});

module.exports = router;
