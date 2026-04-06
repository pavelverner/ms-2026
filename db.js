/**
 * db.js — thin better-sqlite3-compatible wrapper over sql.js (pure JS, no native bindings)
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'ms2026.db');
let _db = null;
let _saveTimer = null;

// Debounced save to avoid hammering disk on bulk inserts
function scheduleSave() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    const data = _db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }, 200);
}

function saveNow() {
  clearTimeout(_saveTimer);
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

/**
 * Convert @paramName style (better-sqlite3) or plain positional args to sql.js positional ?.
 */
function normalizeCall(sql, args) {
  // No args
  if (!args || args.length === 0) return { sql, params: [] };

  // Single object with named params → convert @name → ?
  if (args.length === 1 && args[0] !== null && typeof args[0] === 'object' && !Array.isArray(args[0])) {
    const obj = args[0];
    const values = [];
    const normalized = sql.replace(/@(\w+)/g, (_, name) => {
      values.push(obj[name] ?? null);
      return '?';
    });
    return { sql: normalized, params: values };
  }

  // Positional args: .run(a, b, c) or .all(a, b, c)
  return { sql, params: Array.from(args) };
}

class PreparedStatement {
  constructor(sql) {
    this._sql = sql;
  }

  run(...args) {
    const { sql, params } = normalizeCall(this._sql, args);
    _db.run(sql, params);
    scheduleSave();
    const meta = _db.exec('SELECT last_insert_rowid() as id, changes() as ch');
    const row = meta[0]?.values[0] ?? [null, 0];
    return { lastInsertRowid: row[0], changes: row[1] };
  }

  get(...args) {
    const { sql, params } = normalizeCall(this._sql, args);
    const result = _db.exec(sql, params);
    if (!result.length || !result[0].values.length) return undefined;
    const { columns, values } = result[0];
    return Object.fromEntries(columns.map((c, i) => [c, values[0][i]]));
  }

  all(...args) {
    const { sql, params } = normalizeCall(this._sql, args);
    const result = _db.exec(sql, params);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
  }
}

const dbProxy = {
  prepare: (sql) => new PreparedStatement(sql),

  exec(sql) {
    _db.run(sql);
    saveNow();
  },

  pragma() { /* no-op — sql.js uses PRAGMA differently; WAL/FK set at init */ },

  transaction(fn) {
    return (...args) => {
      _db.run('BEGIN');
      try {
        const result = fn(...args);
        _db.run('COMMIT');
        saveNow();
        return result;
      } catch (e) {
        _db.run('ROLLBACK');
        throw e;
      }
    };
  },
};

async function initialize() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    _db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    _db = new SQL.Database();
  }

  _db.run('PRAGMA foreign_keys = ON');

  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_home TEXT NOT NULL,
      team_away TEXT NOT NULL,
      flag_home TEXT DEFAULT '',
      flag_away TEXT DEFAULT '',
      match_date TEXT NOT NULL,
      stage TEXT NOT NULL,
      group_name TEXT,
      score_home INTEGER,
      score_away INTEGER,
      extra_time INTEGER DEFAULT 0,
      penalties INTEGER DEFAULT 0,
      is_featured INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      pred_home INTEGER NOT NULL,
      pred_away INTEGER NOT NULL,
      points_awarded INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, match_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (match_id) REFERENCES matches(id)
    )
  `);

  // Speciální tipy (vítěz skupiny, celkový vítěz atd.)
  _db.run(`
    CREATE TABLE IF NOT EXISTS special_bets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      category TEXT NOT NULL,
      input_type TEXT NOT NULL DEFAULT 'select',
      options TEXT,
      correct_answer TEXT,
      points_reward INTEGER DEFAULT 10,
      points_partial INTEGER DEFAULT 0,
      deadline TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS special_predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      bet_id INTEGER NOT NULL,
      answer TEXT NOT NULL,
      points_awarded INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, bet_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (bet_id) REFERENCES special_bets(id)
    )
  `);

  // Migrace: přidat sloupce pokud neexistují (pro existující DB)
  const migrations = [
    'ALTER TABLE predictions ADD COLUMN is_joker INTEGER DEFAULT 0',
  ];
  for (const sql of migrations) {
    try { _db.run(sql); } catch { /* sloupec už existuje */ }
  }

  _db.run(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      achievement_code TEXT NOT NULL,
      earned_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, achievement_code),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  saveNow();
  return dbProxy;
}

module.exports = { initialize, db: dbProxy };
