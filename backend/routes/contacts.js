const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { db } = require('../db/database');
const { success, created, error, notFound } = require('../utils/response');
const { logAudit, diffEntities } = require('../utils/audit');
const { triggerWebhook } = require('../utils/webhook');

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
    const { page = 1, limit = 20, search = '', company_id, owner_id, status, tag } = req.query;
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
    if (tag) { where += ' AND c.tags LIKE ?'; params.push(`%"${tag}"%`); }

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
    await logAudit(db, req.user.id, 'create', 'contact', contact.id, `${contact.first_name} ${contact.last_name}`, null, req.ip);
    triggerWebhook('contact.created', contact);
    return created(res, contact);
  } catch (err) { console.error(err); return error(res, 'Error creating contact'); }
});

// GET /api/contacts/find-duplicates — MUST be before /:id
router.get('/find-duplicates', authenticate, async (req, res) => {
  try {
    const emailDups = await db.all(`
      SELECT a.id as id1, a.first_name || ' ' || a.last_name as name1, a.email as email1, a.phone as phone1,
             b.id as id2, b.first_name || ' ' || b.last_name as name2, b.email as email2, b.phone as phone2
      FROM contacts a JOIN contacts b ON a.email = b.email AND a.id < b.id
      WHERE a.is_deleted = 0 AND b.is_deleted = 0 AND a.email IS NOT NULL AND a.email != ''
      LIMIT 50
    `);
    const nameDups = await db.all(`
      SELECT a.id as id1, a.first_name || ' ' || a.last_name as name1, a.email as email1,
             b.id as id2, b.first_name || ' ' || b.last_name as name2, b.email as email2
      FROM contacts a JOIN contacts b ON LOWER(a.first_name) = LOWER(b.first_name) AND LOWER(a.last_name) = LOWER(b.last_name) AND a.id < b.id
      WHERE a.is_deleted = 0 AND b.is_deleted = 0
      LIMIT 50
    `);
    const seen = new Set(emailDups.map(d => `${d.id1}-${d.id2}`));
    const combined = [...emailDups, ...nameDups.filter(d => !seen.has(`${d.id1}-${d.id2}`))];
    return success(res, combined);
  } catch (err) { console.error(err); return error(res, 'Error finding duplicates'); }
});

// GET /api/contacts/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
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
  } catch (err) { console.error(err); return error(res, 'Error fetching contact'); }
});

// PUT /api/contacts/:id
router.put('/:id', authenticate, contactValidators, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM contacts WHERE id = ? AND is_deleted = 0', req.params.id);
    if (!existing) return notFound(res, 'Contact not found');
    const { first_name, last_name, email, phone, mobile, job_title, department, company_id, source, status, tags, address, city, country, linkedin_url, notes } = req.body;
    const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
    await db.run(
      'UPDATE contacts SET first_name=?, last_name=?, email=?, phone=?, mobile=?, job_title=?, department=?, company_id=?, source=?, status=?, tags=?, address=?, city=?, country=?, linkedin_url=?, notes=? WHERE id=?',
      first_name, last_name, email || null, phone || null, mobile || null, job_title || null, department || null, company_id || null, source || null, status || 'active', tagsJson, address || null, city || null, country || null, linkedin_url || null, notes || null, req.params.id
    );
    const contact = await db.get('SELECT * FROM contacts WHERE id = ?', req.params.id);
    parseTags(contact);
    const changes = diffEntities('contact', existing, contact);
    await logAudit(db, req.user.id, 'update', 'contact', contact.id, `${contact.first_name} ${contact.last_name}`, changes, req.ip);
    triggerWebhook('contact.updated', contact);
    return success(res, contact, 'Contact updated');
  } catch (err) { return error(res, 'Error updating contact'); }
});

// POST /api/contacts/merge — merge mergeId into keepId
router.post('/merge', authenticate, async (req, res) => {
  try {
    const { keepId, mergeId } = req.body;
    if (!keepId || !mergeId || keepId === mergeId) return error(res, 'Invalid IDs', 400);

    const keep  = await db.get('SELECT * FROM contacts WHERE id = ? AND is_deleted = 0', keepId);
    const merge = await db.get('SELECT * FROM contacts WHERE id = ? AND is_deleted = 0', mergeId);
    if (!keep || !merge) return notFound(res, 'Contact not found');

    // Copy missing fields from merge → keep
    const fields = ['email','phone','mobile','job_title','department','company_id','source','address','city','country','linkedin_url','notes'];
    const updates = {};
    for (const f of fields) {
      if (!keep[f] && merge[f]) updates[f] = merge[f];
    }
    if (Object.keys(updates).length > 0) {
      const setClauses = Object.keys(updates).map(f => `${f}=?`).join(', ');
      await db.run(`UPDATE contacts SET ${setClauses} WHERE id=?`, ...Object.values(updates), keepId);
    }

    // Merge tags
    const keepTags  = JSON.parse(keep.tags || '[]');
    const mergeTags = JSON.parse(merge.tags || '[]');
    const combined  = [...new Set([...keepTags, ...mergeTags])];
    await db.run('UPDATE contacts SET tags=? WHERE id=?', JSON.stringify(combined), keepId);

    // Reassign all references
    await db.run('UPDATE deals      SET contact_id=? WHERE contact_id=? AND is_deleted=0', keepId, mergeId);
    await db.run('UPDATE tasks      SET contact_id=? WHERE contact_id=?', keepId, mergeId);
    await db.run('UPDATE activities SET contact_id=? WHERE contact_id=?', keepId, mergeId);
    await db.run('UPDATE notes      SET contact_id=? WHERE contact_id=?', keepId, mergeId);

    // Soft delete merged contact
    await db.run('UPDATE contacts SET is_deleted=1 WHERE id=?', mergeId);

    await logAudit(db, req.user.id, 'merge', 'contact', keepId,
      `${keep.first_name} ${keep.last_name} ← ${merge.first_name} ${merge.last_name}`, null, req.ip);

    const updated = await db.get('SELECT * FROM contacts WHERE id=?', keepId);
    parseTags(updated);
    return success(res, updated, 'Contactos fusionados');
  } catch (err) { console.error(err); return error(res, 'Error fusionando contactos'); }
});

// POST /api/contacts/bulk-delete
router.post('/bulk-delete', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return error(res, 'No IDs provided', 400);
    if (ids.length > 200) return error(res, 'Max 200 at a time', 400);
    let deleted = 0;
    for (const id of ids) {
      const c = await db.get('SELECT id, first_name, last_name FROM contacts WHERE id = ? AND is_deleted = 0', id);
      if (!c) continue;
      await db.run('UPDATE contacts SET is_deleted = 1 WHERE id = ?', id);
      await logAudit(db, req.user.id, 'delete', 'contact', c.id, `${c.first_name} ${c.last_name}`, null, req.ip);
      deleted++;
    }
    return success(res, { deleted }, `${deleted} contactos eliminados`);
  } catch (err) { console.error(err); return error(res, 'Error en eliminación masiva'); }
});

// PATCH /api/contacts/bulk-assign
router.patch('/bulk-assign', authenticate, async (req, res) => {
  try {
    const { ids, owner_id } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !owner_id) return error(res, 'Invalid data', 400);
    if (ids.length > 200) return error(res, 'Max 200 at a time', 400);
    const placeholders = ids.map(() => '?').join(',');
    await db.run(`UPDATE contacts SET owner_id = ? WHERE id IN (${placeholders}) AND is_deleted = 0`, owner_id, ...ids);
    await logAudit(db, req.user.id, 'bulk_assign', 'contact', 0, `${ids.length} contacts → user ${owner_id}`, null, req.ip);
    return success(res, { updated: ids.length }, `${ids.length} contactos reasignados`);
  } catch (err) { console.error(err); return error(res, 'Error en asignación masiva'); }
});

// DELETE /api/contacts/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const existing = await db.get('SELECT id, first_name, last_name FROM contacts WHERE id = ? AND is_deleted = 0', req.params.id);
    if (!existing) return notFound(res, 'Contact not found');
    await db.run('UPDATE contacts SET is_deleted = 1 WHERE id = ?', req.params.id);
    await logAudit(db, req.user.id, 'delete', 'contact', existing.id, `${existing.first_name} ${existing.last_name}`, null, req.ip);
    triggerWebhook('contact.deleted', { id: existing.id, first_name: existing.first_name, last_name: existing.last_name });
    return success(res, null, 'Contact deleted');
  } catch (err) { console.error(err); return error(res, 'Error deleting contact'); }
});

router.get('/:id/deals', authenticate, async (req, res) => {
  try {
    const deals = await db.all('SELECT * FROM deals WHERE contact_id = ? AND is_deleted = 0 ORDER BY created_at DESC', req.params.id);
    return success(res, deals);
  } catch (err) { return error(res, 'Error fetching deals'); }
});

router.get('/:id/activities', authenticate, async (req, res) => {
  try {
    const activities = await db.all('SELECT a.*, u.name as owner_name FROM activities a LEFT JOIN users u ON a.owner_id = u.id WHERE a.contact_id = ? AND a.is_deleted = 0 ORDER BY a.occurred_at DESC', req.params.id);
    return success(res, activities);
  } catch (err) { return error(res, 'Error fetching activities'); }
});

router.get('/:id/tasks', authenticate, async (req, res) => {
  try {
    const tasks = await db.all('SELECT * FROM tasks WHERE contact_id = ? AND is_deleted = 0 ORDER BY due_date ASC', req.params.id);
    return success(res, tasks);
  } catch (err) { return error(res, 'Error fetching tasks'); }
});

router.get('/:id/notes', authenticate, async (req, res) => {
  try {
    const notes = await db.all('SELECT n.*, u.name as owner_name FROM notes n LEFT JOIN users u ON n.owner_id = u.id WHERE n.contact_id = ? AND n.is_deleted = 0 ORDER BY n.created_at DESC', req.params.id);
    return success(res, notes);
  } catch (err) { return error(res, 'Error fetching notes'); }
});

// POST /api/contacts/import — bulk import from CSV (parsed array)
router.post('/import', authenticate, async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) return error(res, 'No rows provided', 400);
    if (rows.length > 500) return error(res, 'Max 500 rows per import', 400);

    let imported = 0, skipped = 0;
    for (const row of rows) {
      const first_name = (row.first_name || row.nombre || '').trim();
      const last_name  = (row.last_name  || row.apellido || '').trim();
      if (!first_name || !last_name) { skipped++; continue; }

      const email = (row.email || '').trim().toLowerCase() || null;
      if (email) {
        const dup = await db.get('SELECT id FROM contacts WHERE email = ? AND is_deleted = 0', email);
        if (dup) { skipped++; continue; }
      }

      await db.run(
        'INSERT INTO contacts (first_name, last_name, email, phone, job_title, company_id, source, status, owner_id, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        first_name, last_name, email,
        (row.phone || row.telefono || '').trim() || null,
        (row.job_title || row.cargo || '').trim() || null,
        null, 'other', 'active', req.user.id, '[]'
      );
      imported++;
    }

    await logAudit(db, req.user.id, 'import', 'contact', 0, `${imported} contacts`, null, req.ip);
    return success(res, { imported, skipped }, `${imported} contactos importados, ${skipped} omitidos`);
  } catch (err) { console.error(err); return error(res, 'Error importando contactos'); }
});

module.exports = router;
