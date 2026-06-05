const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { db } = require('../db/database');
const { success, error } = require('../utils/response');

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 25, entity_type, entity_id, user_id, action } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = 'WHERE 1=1';
    const params = [];
    if (entity_type) { where += ' AND al.entity_type = ?'; params.push(entity_type); }
    if (entity_id)   { where += ' AND al.entity_id = ?';   params.push(Number(entity_id)); }
    if (user_id)     { where += ' AND al.user_id = ?';     params.push(Number(user_id)); }
    if (action)      { where += ' AND al.action = ?';      params.push(action); }

    const countRow = await db.get(`SELECT COUNT(*) as count FROM audit_logs al ${where}`, ...params);
    const total = Number(countRow.count);

    const logs = await db.all(`
      SELECT al.*, u.name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${where}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `, ...params, parseInt(limit), offset);

    return success(res, {
      logs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error(err);
    return error(res, 'Error fetching audit logs');
  }
});

module.exports = router;
