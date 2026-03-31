const { db } = require('./database');

async function runMigrations() {
  // Enable foreign keys and WAL per statement (libsql local file supports pragma)
  await db.exec(`PRAGMA foreign_keys = ON`);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      email       TEXT    NOT NULL UNIQUE,
      password    TEXT    NOT NULL,
      role        TEXT    NOT NULL DEFAULT 'user',
      avatar_url  TEXT,
      is_active   INTEGER NOT NULL DEFAULT 1,
      last_login  TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT    NOT NULL,
      industry       TEXT,
      website        TEXT,
      phone          TEXT,
      email          TEXT,
      address        TEXT,
      city           TEXT,
      country        TEXT,
      size           TEXT,
      annual_revenue REAL,
      description    TEXT,
      owner_id       INTEGER REFERENCES users(id),
      is_deleted     INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name   TEXT    NOT NULL,
      last_name    TEXT    NOT NULL,
      email        TEXT,
      phone        TEXT,
      mobile       TEXT,
      job_title    TEXT,
      department   TEXT,
      company_id   INTEGER REFERENCES companies(id) ON DELETE SET NULL,
      owner_id     INTEGER REFERENCES users(id),
      source       TEXT,
      status       TEXT    NOT NULL DEFAULT 'active',
      tags         TEXT    DEFAULT '[]',
      address      TEXT,
      city         TEXT,
      country      TEXT,
      linkedin_url TEXT,
      notes        TEXT,
      is_deleted   INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS deals (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      title          TEXT    NOT NULL,
      value          REAL    NOT NULL DEFAULT 0,
      currency       TEXT    NOT NULL DEFAULT 'USD',
      stage          TEXT    NOT NULL DEFAULT 'lead',
      probability    INTEGER NOT NULL DEFAULT 0,
      expected_close TEXT,
      actual_close   TEXT,
      contact_id     INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      company_id     INTEGER REFERENCES companies(id) ON DELETE SET NULL,
      owner_id       INTEGER REFERENCES users(id),
      description    TEXT,
      lost_reason    TEXT,
      is_deleted     INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT    NOT NULL,
      description  TEXT,
      status       TEXT    NOT NULL DEFAULT 'pending',
      priority     TEXT    NOT NULL DEFAULT 'medium',
      due_date     TEXT,
      completed_at TEXT,
      assigned_to  INTEGER REFERENCES users(id),
      owner_id     INTEGER REFERENCES users(id),
      contact_id   INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      company_id   INTEGER REFERENCES companies(id) ON DELETE SET NULL,
      deal_id      INTEGER REFERENCES deals(id) ON DELETE SET NULL,
      is_deleted   INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      type         TEXT    NOT NULL,
      subject      TEXT    NOT NULL,
      description  TEXT,
      outcome      TEXT,
      duration_min INTEGER,
      occurred_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      contact_id   INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      company_id   INTEGER REFERENCES companies(id) ON DELETE SET NULL,
      deal_id      INTEGER REFERENCES deals(id) ON DELETE SET NULL,
      owner_id     INTEGER REFERENCES users(id),
      is_deleted   INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      content      TEXT    NOT NULL,
      contact_id   INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
      company_id   INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      deal_id      INTEGER REFERENCES deals(id) ON DELETE CASCADE,
      owner_id     INTEGER REFERENCES users(id),
      is_deleted   INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      token      TEXT    NOT NULL UNIQUE,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_contacts_company   ON contacts(company_id)',
    'CREATE INDEX IF NOT EXISTS idx_contacts_owner     ON contacts(owner_id)',
    'CREATE INDEX IF NOT EXISTS idx_contacts_email     ON contacts(email)',
    'CREATE INDEX IF NOT EXISTS idx_deals_stage        ON deals(stage)',
    'CREATE INDEX IF NOT EXISTS idx_deals_owner        ON deals(owner_id)',
    'CREATE INDEX IF NOT EXISTS idx_deals_contact      ON deals(contact_id)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_assigned     ON tasks(assigned_to)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_due          ON tasks(due_date)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_deal         ON tasks(deal_id)',
    'CREATE INDEX IF NOT EXISTS idx_activities_contact ON activities(contact_id)',
    'CREATE INDEX IF NOT EXISTS idx_activities_deal    ON activities(deal_id)',
    'CREATE INDEX IF NOT EXISTS idx_notes_contact      ON notes(contact_id)',
    'CREATE INDEX IF NOT EXISTS idx_notes_deal         ON notes(deal_id)',
    'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)',
  ];

  for (const idx of indexes) await db.exec(idx);

  // Triggers for updated_at
  const tables = ['users', 'companies', 'contacts', 'deals', 'tasks', 'activities', 'notes'];
  for (const table of tables) {
    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_${table}_updated_at
      AFTER UPDATE ON ${table}
      BEGIN
        UPDATE ${table} SET updated_at = datetime('now') WHERE id = NEW.id;
      END
    `);
  }

  // ── Chat module ──────────────────────────────────────────────────────────────

  await db.exec(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      type        TEXT    NOT NULL DEFAULT 'direct',   -- 'direct' | 'group'
      name        TEXT,                                 -- null for direct chats
      avatar_url  TEXT,
      created_by  INTEGER NOT NULL REFERENCES users(id),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS chat_members (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at       TEXT    NOT NULL DEFAULT (datetime('now')),
      left_at         TEXT,
      UNIQUE(conversation_id, user_id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
      sender_id       INTEGER NOT NULL REFERENCES users(id),
      content         TEXT    NOT NULL,
      type            TEXT    NOT NULL DEFAULT 'text',  -- 'text' | 'system'
      deleted_at      TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS chat_message_reads (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      read_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(message_id, user_id)
    )
  `);

  // Chat indexes
  const chatIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_chat_members_conv   ON chat_members(conversation_id)',
    'CREATE INDEX IF NOT EXISTS idx_chat_members_user   ON chat_members(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_chat_msgs_conv      ON chat_messages(conversation_id)',
    'CREATE INDEX IF NOT EXISTS idx_chat_msgs_sender    ON chat_messages(sender_id)',
    'CREATE INDEX IF NOT EXISTS idx_chat_reads_msg      ON chat_message_reads(message_id)',
    'CREATE INDEX IF NOT EXISTS idx_chat_reads_user     ON chat_message_reads(user_id)',
  ];
  for (const idx of chatIndexes) await db.exec(idx);

  // updated_at trigger for chat_conversations
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_chat_conversations_updated_at
    AFTER UPDATE ON chat_conversations
    BEGIN
      UPDATE chat_conversations SET updated_at = datetime('now') WHERE id = NEW.id;
    END
  `);

  console.log('✅ Database migrations complete');
}

module.exports = { runMigrations };
