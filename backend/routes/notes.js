const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { db } = require('../db/database');
const { success, created, error, notFound, forbidden } = require('../utils/response');

router.get('/', authenticate, async (req, res) => {
  try {
    const { contact_id, deal_id, company_id, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'WHERE n.is_deleted = 0';
    const params = [];
    if (contact_id) { where += ' AND n.contact_id = ?'; params.push(Number(contact_id)); }
    if (deal_id) { where += ' AND n.deal_id = ?'; params.push(Number(deal_id)); }
    if (company_id) { where += ' AND n.company_id = ?'; params.push(Number(company_id)); }

    const countRow = await db.get(`SELECT COUNT(*) as count FROM notes n ${where}`, ...params);
    const total = Number(countRow.count);
    const notes = await db.all(`
      SELECT n.*, u.name as owner_name FROM notes n LEFT JOIN users u ON n.owner_id = u.id
      ${where} ORDER BY n.created_at DESC LIMIT ? OFFSET ?
    `, ...params, parseInt(limit), offset);

    return success(res, { notes, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { return error(res, 'Error fetching notes'); }
});

router.post('/', authenticate, [body('content').trim().notEmpty(), validate], async (req, res) => {
  try {
    const { content, contact_id, deal_id, company_id } = req.body;
    const result = await db.run(
      'INSERT INTO notes (content, contact_id, deal_id, company_id, owner_id) VALUES (?, ?, ?, ?, ?)',
      content, contact_id || null, deal_id || null, company_id || null, req.user.id
    );
    const note = await db.get('SELECT n.*, u.name as owner_name FROM notes n LEFT JOIN users u ON n.owner_id = u.id WHERE n.id = ?', result.lastInsertRowid);
    return created(res, note);
  } catch (err) { return error(res, 'Error creating note'); }
});

router.put('/:id', authenticate, [body('content').trim().notEmpty(), validate], async (req, res) => {
  try {
    const note = await db.get('SELECT * FROM notes WHERE id = ? AND is_deleted = 0', req.params.id);
    if (!note) return notFound(res, 'Note not found');
    if (note.owner_id !== req.user.id && req.user.role !== 'admin') return forbidden(res, 'Cannot edit another user\'s note');
    await db.run('UPDATE notes SET content = ? WHERE id = ?', req.body.content, req.params.id);
    const updated = await db.get('SELECT n.*, u.name as owner_name FROM notes n LEFT JOIN users u ON n.owner_id = u.id WHERE n.id = ?', req.params.id);
    return success(res, updated, 'Note updated');
  } catch (err) { return error(res, 'Error updating note'); }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const note = await db.get('SELECT * FROM notes WHERE id = ? AND is_deleted = 0', req.params.id);
    if (!note) return notFound(res, 'Note not found');
    if (note.owner_id !== req.user.id && req.user.role !== 'admin') return forbidden(res, 'Cannot delete another user\'s note');
    await db.run('UPDATE notes SET is_deleted = 1 WHERE id = ?', req.params.id);
    return success(res, null, 'Note deleted');
  } catch (err) { return error(res, 'Error deleting note'); }
});

module.exports = router;
