const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { db } = require('../db/database');
const { success, error } = require('../utils/response');

router.get('/metrics', authenticate, async (req, res) => {
  try {
    const [contacts, companies, activeDeals, wonDeals, revenue, pipeline, pendingTasks, overdueTasks, activitiesThisMonth] = await Promise.all([
      db.get("SELECT COUNT(*) as count FROM contacts WHERE is_deleted = 0"),
      db.get("SELECT COUNT(*) as count FROM companies WHERE is_deleted = 0"),
      db.get("SELECT COUNT(*) as count FROM deals WHERE is_deleted = 0 AND stage NOT IN ('won','lost')"),
      db.get("SELECT COUNT(*) as count FROM deals WHERE is_deleted = 0 AND stage = 'won'"),
      db.get("SELECT COALESCE(SUM(value), 0) as total FROM deals WHERE is_deleted = 0 AND stage = 'won'"),
      db.get("SELECT COALESCE(SUM(value), 0) as total FROM deals WHERE is_deleted = 0 AND stage NOT IN ('won','lost')"),
      db.get("SELECT COUNT(*) as count FROM tasks WHERE is_deleted = 0 AND status = 'pending'"),
      db.get("SELECT COUNT(*) as count FROM tasks WHERE is_deleted = 0 AND status NOT IN ('done','cancelled') AND due_date < datetime('now')"),
      db.get("SELECT COUNT(*) as count FROM activities WHERE is_deleted = 0 AND strftime('%Y-%m', occurred_at) = strftime('%Y-%m', 'now')"),
    ]);

    return success(res, {
      contacts: Number(contacts.count),
      companies: Number(companies.count),
      activeDeals: Number(activeDeals.count),
      wonDeals: Number(wonDeals.count),
      revenue: Number(revenue.total),
      pipeline: Number(pipeline.total),
      pendingTasks: Number(pendingTasks.count),
      overdueTasks: Number(overdueTasks.count),
      activitiesThisMonth: Number(activitiesThisMonth.count),
    });
  } catch (err) { console.error(err); return error(res, 'Error fetching metrics'); }
});

router.get('/deals-by-stage', authenticate, async (req, res) => {
  try {
    const data = await db.all(`
      SELECT stage, COUNT(*) as count, COALESCE(SUM(value), 0) as total_value
      FROM deals WHERE is_deleted = 0
      GROUP BY stage
      ORDER BY CASE stage WHEN 'lead' THEN 1 WHEN 'qualified' THEN 2 WHEN 'proposal' THEN 3 WHEN 'negotiation' THEN 4 WHEN 'won' THEN 5 WHEN 'lost' THEN 6 END
    `);
    return success(res, data.map(r => ({ ...r, count: Number(r.count), total_value: Number(r.total_value) })));
  } catch (err) { return error(res, 'Error'); }
});

router.get('/deals-by-month', authenticate, async (req, res) => {
  try {
    const data = await db.all(`
      SELECT strftime('%Y-%m', created_at) as month,
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN stage = 'won' THEN value ELSE 0 END), 0) as won_value,
        COUNT(CASE WHEN stage = 'won' THEN 1 END) as won_count
      FROM deals WHERE is_deleted = 0 AND created_at >= datetime('now', '-12 months')
      GROUP BY month ORDER BY month ASC
    `);
    return success(res, data.map(r => ({ ...r, count: Number(r.count), won_value: Number(r.won_value), won_count: Number(r.won_count) })));
  } catch (err) { return error(res, 'Error'); }
});

router.get('/recent-activities', authenticate, async (req, res) => {
  try {
    const activities = await db.all(`
      SELECT a.*, u.name as owner_name, c.first_name || ' ' || c.last_name as contact_name, d.title as deal_title
      FROM activities a
      LEFT JOIN users u ON a.owner_id = u.id
      LEFT JOIN contacts c ON a.contact_id = c.id
      LEFT JOIN deals d ON a.deal_id = d.id
      WHERE a.is_deleted = 0 ORDER BY a.occurred_at DESC LIMIT 10
    `);
    return success(res, activities);
  } catch (err) { return error(res, 'Error'); }
});

router.get('/overdue-tasks', authenticate, async (req, res) => {
  try {
    const tasks = await db.all(`
      SELECT t.*, u.name as assigned_name, c.first_name || ' ' || c.last_name as contact_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN contacts c ON t.contact_id = c.id
      WHERE t.is_deleted = 0 AND t.status NOT IN ('done', 'cancelled') AND t.due_date < datetime('now')
      ORDER BY t.due_date ASC LIMIT 10
    `);
    return success(res, tasks);
  } catch (err) { return error(res, 'Error'); }
});

router.get('/top-deals', authenticate, async (req, res) => {
  try {
    const deals = await db.all(`
      SELECT d.*, c.first_name || ' ' || c.last_name as contact_name, co.name as company_name
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
      LEFT JOIN companies co ON d.company_id = co.id
      WHERE d.is_deleted = 0 AND d.stage NOT IN ('won','lost')
      ORDER BY d.value DESC LIMIT 5
    `);
    return success(res, deals);
  } catch (err) { return error(res, 'Error'); }
});

module.exports = router;
