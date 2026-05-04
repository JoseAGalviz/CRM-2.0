const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { db } = require('../db/database');
const { success, error } = require('../utils/response');

// GET /api/search?q=query&limit=5
router.get('/', authenticate, async (req, res) => {
  try {
    const { q = '', limit = 6 } = req.query;
    const trimmed = q.trim();
    if (!trimmed) return success(res, { contacts: [], companies: [], deals: [] });

    const like = `%${trimmed}%`;
    const n = Math.min(Number(limit), 20);

    const [contacts, companies, deals] = await Promise.all([
      db.all(
        `SELECT c.id, c.first_name, c.last_name, c.email, c.job_title, co.name AS company_name
         FROM contacts c
         LEFT JOIN companies co ON c.company_id = co.id
         WHERE c.is_deleted = 0
           AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ?
                OR (c.first_name || ' ' || c.last_name) LIKE ?)
         ORDER BY c.first_name, c.last_name
         LIMIT ?`,
        like, like, like, like, n
      ),
      db.all(
        `SELECT id, name, industry, city, country
         FROM companies
         WHERE is_deleted = 0 AND name LIKE ?
         ORDER BY name
         LIMIT ?`,
        like, n
      ),
      db.all(
        `SELECT d.id, d.title, d.value, d.stage, d.currency,
                c.first_name || ' ' || c.last_name AS contact_name
         FROM deals d
         LEFT JOIN contacts c ON d.contact_id = c.id
         WHERE d.is_deleted = 0 AND d.title LIKE ?
         ORDER BY d.created_at DESC
         LIMIT ?`,
        like, n
      ),
    ]);

    return success(res, { contacts, companies, deals });
  } catch (err) {
    console.error(err);
    return error(res, 'Search failed');
  }
});

module.exports = router;
