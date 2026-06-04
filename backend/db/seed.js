require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db } = require('./database');
const { runMigrations } = require('./migrations');

async function seed() {
  await runMigrations();
  console.log('🌱 Seeding database...');

  const hash = await bcrypt.hash('password123', 12);
  const adminResult = await db.run("INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", 'Admin User', 'admin@crm.com', hash, 'admin');
  const adminId = adminResult.lastInsertRowid || (await db.get("SELECT id FROM users WHERE email = ?", 'admin@crm.com')).id;

  await db.run("INSERT OR IGNORE INTO users (name, email, password) VALUES (?, ?, ?)", 'Sales Rep', 'sales@crm.com', hash);

  const companies = [
    ['Acme Corporation', 'Technology', 'https://acme.com', '+1-555-0100', 'info@acme.com', 'enterprise', 5000000],
    ['Globex Industries', 'Manufacturing', 'https://globex.com', '+1-555-0200', 'contact@globex.com', 'smb', 1200000],
    ['Initech Solutions', 'Consulting', 'https://initech.com', '+1-555-0300', 'hello@initech.com', 'startup', 300000],
    ['Umbrella Corp', 'Pharmaceuticals', 'https://umbrella.com', '+1-555-0400', 'corp@umbrella.com', 'enterprise', 12000000],
    ['Stark Industries', 'Aerospace', 'https://stark.com', '+1-555-0500', 'info@stark.com', 'enterprise', 8500000],
  ];

  const companyIds = [];
  for (const [name, industry, website, phone, email, size, revenue] of companies) {
    const r = await db.run("INSERT OR IGNORE INTO companies (name, industry, website, phone, email, size, annual_revenue, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", name, industry, website, phone, email, size, revenue, adminId);
    const id = r.lastInsertRowid || (await db.get("SELECT id FROM companies WHERE name = ?", name)).id;
    companyIds.push(id);
  }

  const contacts = [
    ['John', 'Smith', 'john.smith@acme.com', '+1-555-1001', 'CEO', companyIds[0], 'referral', 'active', '["vip","decision-maker"]'],
    ['Sarah', 'Johnson', 'sarah.j@acme.com', '+1-555-1002', 'CTO', companyIds[0], 'web', 'active', '["technical"]'],
    ['Michael', 'Brown', 'mbrown@globex.com', '+1-555-1003', 'Procurement Manager', companyIds[1], 'cold', 'active', '[]'],
    ['Emily', 'Davis', 'emily.d@globex.com', '+1-555-1004', 'CFO', companyIds[1], 'event', 'active', '["decision-maker"]'],
    ['Robert', 'Wilson', 'rwilson@initech.com', '+1-555-1005', 'Director', companyIds[2], 'referral', 'active', '["prospect"]'],
    ['Lisa', 'Taylor', 'lisa.t@umbrella.com', '+1-555-1006', 'VP Sales', companyIds[3], 'web', 'active', '["vip"]'],
    ['David', 'Anderson', 'danderson@stark.com', '+1-555-1007', 'Head of Procurement', companyIds[4], 'cold', 'inactive', '[]'],
    ['Jennifer', 'Martinez', 'jmart@stark.com', '+1-555-1008', 'Operations Manager', companyIds[4], 'event', 'active', '["prospect"]'],
  ];

  const contactIds = [];
  for (const [fn, ln, email, phone, title, companyId, source, status, tags] of contacts) {
    const r = await db.run("INSERT OR IGNORE INTO contacts (first_name, last_name, email, phone, job_title, company_id, owner_id, source, status, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", fn, ln, email, phone, title, companyId, adminId, source, status, tags);
    const id = r.lastInsertRowid || (await db.get("SELECT id FROM contacts WHERE email = ?", email)).id;
    contactIds.push(id);
  }

  const deals = [
    ['Enterprise Software License', 45000, 'won', 100, contactIds[0], companyIds[0]],
    ['Cloud Migration Project', 120000, 'negotiation', 75, contactIds[1], companyIds[0]],
    ['ERP System Implementation', 85000, 'proposal', 50, contactIds[2], companyIds[1]],
    ['Annual Maintenance Contract', 24000, 'qualified', 25, contactIds[3], companyIds[1]],
    ['Consulting Services Q2', 35000, 'lead', 10, contactIds[4], companyIds[2]],
    ['Security Audit & Compliance', 67000, 'proposal', 50, contactIds[5], companyIds[3]],
    ['Digital Transformation', 200000, 'negotiation', 75, contactIds[7], companyIds[4]],
    ['Hardware Upgrade Bundle', 18000, 'lost', 0, contactIds[6], companyIds[4]],
  ];

  const dealIds = [];
  for (const [title, value, stage, probability, contactId, companyId] of deals) {
    const closeDate = stage === 'won' ? new Date(Date.now() - 30 * 86400000).toISOString() : new Date(Date.now() + 60 * 86400000).toISOString();
    const r = await db.run("INSERT INTO deals (title, value, stage, probability, expected_close, contact_id, company_id, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", title, value, stage, probability, closeDate, contactId, companyId, adminId);
    dealIds.push(r.lastInsertRowid);
  }

  const tasks = [
    ['Follow up with John Smith', 'Schedule demo call', 'pending', 'high', contactIds[0], dealIds[1]],
    ['Prepare proposal for Globex', 'Include pricing and timeline', 'in_progress', 'urgent', contactIds[2], dealIds[2]],
    ['Send contract to Acme', 'Attach signed NDA', 'done', 'high', contactIds[0], dealIds[0]],
    ['Research Initech requirements', 'Check LinkedIn for pain points', 'pending', 'medium', contactIds[4], dealIds[4]],
    ['Review Umbrella security audit', 'Cross-check compliance checklist', 'pending', 'high', contactIds[5], dealIds[5]],
  ];

  for (const [title, desc, status, priority, contactId, dealId] of tasks) {
    const due = new Date(Date.now() + (status === 'done' ? -5 : 14) * 86400000).toISOString();
    await db.run("INSERT INTO tasks (title, description, status, priority, due_date, owner_id, assigned_to, contact_id, deal_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", title, desc, status, priority, due, adminId, adminId, contactId, dealId);
  }

  const activities = [
    ['call', 'Discovery call with John Smith', 'Discussed current pain points', 'Positive', 45, contactIds[0], dealIds[1]],
    ['meeting', 'Proposal presentation at Globex', 'Walked through solution', 'Need to revise pricing', 90, contactIds[2], dealIds[2]],
    ['email', 'Sent NDA to Acme', 'Non-disclosure agreement', 'Signed and returned', null, contactIds[0], dealIds[0]],
    ['demo', 'Product demo for Umbrella Corp', 'Showcased security features', 'Very interested', 60, contactIds[5], dealIds[5]],
    ['follow_up', 'Check-in call with Robert Wilson', 'Discussed timeline', 'Will confirm by end of week', 20, contactIds[4], dealIds[4]],
  ];

  for (const [type, subject, desc, outcome, duration, contactId, dealId] of activities) {
    const occurred = new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString();
    await db.run("INSERT INTO activities (type, subject, description, outcome, duration_min, occurred_at, contact_id, deal_id, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", type, subject, desc, outcome, duration, occurred, contactId, dealId, adminId);
  }

  const notes = [
    ['John prefers morning calls. Very detail-oriented, always asks for data.', contactIds[0], dealIds[1]],
    ['Globex procurement has a strict 3-department approval process.', contactIds[2], dealIds[2]],
    ['Umbrella Corp is under regulatory pressure - compliance is top priority.', contactIds[5], dealIds[5]],
  ];

  for (const [content, contactId, dealId] of notes) {
    await db.run("INSERT INTO notes (content, contact_id, deal_id, owner_id) VALUES (?, ?, ?, ?)", content, contactId, dealId, adminId);
  }

  console.log('✅ Seed complete!');
  console.log('   Admin: admin@crm.com / password123');
  console.log('   Sales: sales@crm.com / password123');
}

module.exports = { seed };

if (require.main === module) {
  seed().catch(err => { console.error(err); process.exit(1); });
}
