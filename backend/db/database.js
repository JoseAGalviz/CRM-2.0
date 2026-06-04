const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './crm.db';

let _client;

function getClient() {
  if (!_client) {
    const url = dbPath === ':memory:' ? ':memory:' : `file:${path.resolve(dbPath)}`;
    _client = createClient({ url });
  }
  return _client;
}

/**
 * Async database helper — wraps @libsql/client with a convenient API
 * similar to better-sqlite3 but all methods return Promises.
 */
const db = {
  /** Execute a query and return one row (or null) */
  async get(sql, ...args) {
    const result = await getClient().execute({ sql, args: args.flat() });
    return result.rows[0] ?? null;
  },

  /** Execute a query and return all rows */
  async all(sql, ...args) {
    const result = await getClient().execute({ sql, args: args.flat() });
    return result.rows;
  },

  /** Execute a write query; returns { lastInsertRowid, changes } */
  async run(sql, ...args) {
    const result = await getClient().execute({ sql, args: args.flat() });
    return {
      lastInsertRowid: result.lastInsertRowid != null ? Number(result.lastInsertRowid) : null,
      changes: result.rowsAffected,
    };
  },

  /** Execute raw SQL (DDL, multiple statements via ';') */
  async exec(sql) {
    return getClient().executeMultiple(sql);
  },
};

module.exports = { db };
