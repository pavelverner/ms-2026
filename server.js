const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const { initialize } = require('./db');
const { fetchAndUpdate, startCron } = require('./fetcher');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'ms2026-tajny-klic-zmente-v-produkci';
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Auth middleware ───────────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.cookies.token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Nepřihlášen' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Neplatný token' });
  }
}

function adminAuth(req, res, next) {
  auth(req, res, () => {
    if (!req.user.is_admin) return res.status(403).json({ error: 'Přístup zamítnut' });
    next();
  });
}

// ─── Points calculation ────────────────────────────────────────────────────────
function calcPoints(predHome, predAway, actualHome, actualAway) {
  // 5 bodů: přesný výsledek
  if (predHome === actualHome && predAway === actualAway) return 5;

  const predSign = Math.sign(predHome - predAway);
  const actualSign = Math.sign(actualHome - actualAway);

  // 0 bodů: špatný výsledek (vítěz nebo remíza)
  if (predSign !== actualSign) return 0;

  // 3 body: správný vítěz A správný gólový rozdíl (jen pro výhry, ne remízy)
  // Remíza má vždy rozdíl 0 — dát 3 body za jakoukoli správnou remízu by bylo příliš štědré
  if (predSign !== 0 && (predHome - predAway) === (actualHome - actualAway)) return 3;

  // 2 body: správný vítěz (špatný rozdíl) nebo správná remíza (špatné skóre)
  return 2;
}

function setupRoutes(db) {
  // ─── Auth routes ─────────────────────────────────────────────────────────────
  app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Vyplňte uživatelské jméno a heslo' });
    if (username.length < 2 || username.length > 30) return res.status(400).json({ error: 'Jméno musí mít 2–30 znaků' });
    if (password.length < 4) return res.status(400).json({ error: 'Heslo musí mít alespoň 4 znaky' });

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) return res.status(409).json({ error: 'Uživatelské jméno již existuje' });

    const hash = bcrypt.hashSync(password, 10);
    const isFirstUser = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt === 0;
    const result = db.prepare('INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)').run(username, hash, isFirstUser ? 1 : 0);

    const user = { id: result.lastInsertRowid, username, is_admin: isFirstUser ? 1 : 0 };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({ user, token });
  });

  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Špatné jméno nebo heslo' });
    }
    const payload = { id: user.id, username: user.username, is_admin: user.is_admin };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({ user: payload, token });
  });

  app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ ok: true });
  });

  app.get('/api/me', auth, (req, res) => {
    res.json({ user: req.user });
  });

  // ─── Achievements ─────────────────────────────────────────────────────────────
  function checkAndGrantAchievements(userId) {
    const scoredPreds = db.prepare(`
      SELECT p.*, m.score_home as act_home, m.score_away as act_away, m.match_date
      FROM predictions p
      JOIN matches m ON m.id = p.match_id
      WHERE p.user_id = ? AND m.score_home IS NOT NULL
      ORDER BY m.match_date ASC
    `).all(userId);

    const grant = new Set();

    // ⚽ První tip
    const anyTip = db.prepare('SELECT COUNT(*) as c FROM predictions WHERE user_id = ?').get(userId);
    if (anyTip.c > 0) grant.add('first_tip');

    let exactCount = 0, streak = 0, maxStreak = 0;
    for (const p of scoredPreds) {
      const isExact = p.pred_home === p.act_home && p.pred_away === p.act_away;
      if (isExact) {
        exactCount++;
        streak++;
        maxStreak = Math.max(maxStreak, streak);
      } else {
        streak = 0;
      }
      // 🃏 Joker s body
      if (p.is_joker && p.points_awarded > 0) grant.add('joker_win');
      // 🦸 Joker + přesný výsledek
      if (p.is_joker && isExact) grant.add('joker_hero');
    }

    if (exactCount >= 1) grant.add('first_exact');
    if (exactCount >= 3) grant.add('hat_trick');
    if (exactCount >= 5) grant.add('sharpshooter');
    if (maxStreak >= 3) grant.add('sniper');

    const ins = db.prepare('INSERT OR IGNORE INTO user_achievements (user_id, achievement_code) VALUES (?, ?)');
    db.transaction(() => { for (const code of grant) ins.run(userId, code); })();
  }

  // ─── Matches routes ───────────────────────────────────────────────────────────
  app.get('/api/matches', auth, (req, res) => {
    const uid = req.user.id;
    const jokersUsed = db.prepare('SELECT COUNT(*) as c FROM predictions WHERE user_id = ? AND is_joker = 1').get(uid).c;
    const matches = db.prepare(`
      SELECT m.*,
        (SELECT COUNT(*) FROM predictions p WHERE p.match_id = m.id AND p.user_id = ?) as has_prediction,
        (SELECT pred_home FROM predictions p WHERE p.match_id = m.id AND p.user_id = ?) as my_pred_home,
        (SELECT pred_away FROM predictions p WHERE p.match_id = m.id AND p.user_id = ?) as my_pred_away,
        (SELECT points_awarded FROM predictions p WHERE p.match_id = m.id AND p.user_id = ?) as my_points,
        (SELECT is_joker FROM predictions p WHERE p.match_id = m.id AND p.user_id = ?) as my_joker
      FROM matches m
      WHERE m.is_featured = 1
      ORDER BY m.match_date ASC
    `).all(uid, uid, uid, uid, uid);
    res.json({ matches, jokers_remaining: Math.max(0, 2 - jokersUsed) });
  });

  app.get('/api/matches/all', adminAuth, (req, res) => {
    const matches = db.prepare('SELECT * FROM matches ORDER BY match_date ASC').all();
    res.json(matches);
  });

  // ─── Predictions routes ───────────────────────────────────────────────────────
  app.post('/api/predictions', auth, (req, res) => {
    const { match_id, pred_home, pred_away } = req.body;
    if (pred_home == null || pred_away == null || pred_home < 0 || pred_away < 0) {
      return res.status(400).json({ error: 'Neplatný výsledek' });
    }

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(match_id);
    if (!match) return res.status(404).json({ error: 'Zápas nenalezen' });

    if (new Date(match.match_date).getTime() <= Date.now()) {
      return res.status(403).json({ error: 'Tip již nelze změnit – zápas začal' });
    }

    if (match.team_home === 'TBD' || match.team_away === 'TBD') {
      return res.status(403).json({ error: 'Soupeři ještě nejsou určeni' });
    }

    // UPSERT using INSERT OR REPLACE equivalent
    const existing = db.prepare('SELECT id FROM predictions WHERE user_id = ? AND match_id = ?').get(req.user.id, match_id);
    if (existing) {
      db.prepare('UPDATE predictions SET pred_home = ?, pred_away = ?, points_awarded = NULL WHERE user_id = ? AND match_id = ?')
        .run(pred_home, pred_away, req.user.id, match_id);
    } else {
      db.prepare('INSERT INTO predictions (user_id, match_id, pred_home, pred_away) VALUES (?, ?, ?, ?)')
        .run(req.user.id, match_id, pred_home, pred_away);
    }
    checkAndGrantAchievements(req.user.id);
    res.json({ ok: true });
  });

  // ─── Joker ────────────────────────────────────────────────────────────────────
  app.post('/api/predictions/:matchId/joker', auth, (req, res) => {
    const matchId = Number(req.params.matchId);
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
    if (!match) return res.status(404).json({ error: 'Zápas nenalezen' });
    if (new Date(match.match_date).getTime() <= Date.now()) {
      return res.status(403).json({ error: 'Zápas již začal – joker nelze změnit' });
    }

    const pred = db.prepare('SELECT * FROM predictions WHERE user_id = ? AND match_id = ?').get(req.user.id, matchId);
    if (!pred) return res.status(400).json({ error: 'Nejdřív zadej tip, pak aktivuj joker' });

    const jokersUsed = db.prepare('SELECT COUNT(*) as c FROM predictions WHERE user_id = ? AND is_joker = 1').get(req.user.id).c;
    const isCurrentlyJoker = pred.is_joker === 1;

    if (!isCurrentlyJoker && jokersUsed >= 2) {
      return res.status(403).json({ error: 'Nemáš žádný joker – oba jsi už použil' });
    }

    // Toggle
    db.prepare('UPDATE predictions SET is_joker = ? WHERE user_id = ? AND match_id = ?')
      .run(isCurrentlyJoker ? 0 : 1, req.user.id, matchId);

    const remaining = db.prepare('SELECT COUNT(*) as c FROM predictions WHERE user_id = ? AND is_joker = 1').get(req.user.id);
    res.json({ ok: true, joker_active: !isCurrentlyJoker, jokers_remaining: Math.max(0, 2 - remaining.c) });
  });

  // ─── Co tipovali ostatní (po zámku) ──────────────────────────────────────────
  app.get('/api/matches/:id/summary', auth, (req, res) => {
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
    if (!match) return res.status(404).json({ error: 'Zápas nenalezen' });
    if (new Date(match.match_date).getTime() > Date.now()) {
      return res.status(403).json({ error: 'Zápas ještě nezačal' });
    }

    const preds = db.prepare('SELECT pred_home, pred_away FROM predictions WHERE match_id = ?').all(req.params.id);
    if (!preds.length) return res.json({ total: 0, home_win: 0, draw: 0, away_win: 0, top_scores: [] });

    let homeWin = 0, draw = 0, awayWin = 0;
    const scoreCounts = {};
    for (const p of preds) {
      const key = `${p.pred_home}:${p.pred_away}`;
      scoreCounts[key] = (scoreCounts[key] || 0) + 1;
      const diff = p.pred_home - p.pred_away;
      if (diff > 0) homeWin++;
      else if (diff === 0) draw++;
      else awayWin++;
    }

    const topScores = Object.entries(scoreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([score, count]) => ({ score, count, pct: Math.round(count / preds.length * 100) }));

    res.json({
      total: preds.length,
      home_win: Math.round(homeWin / preds.length * 100),
      draw: Math.round(draw / preds.length * 100),
      away_win: Math.round(awayWin / preds.length * 100),
      top_scores: topScores,
    });
  });

  app.get('/api/predictions/mine', auth, (req, res) => {
    const preds = db.prepare(`
      SELECT p.*, m.team_home, m.team_away, m.flag_home, m.flag_away, m.match_date, m.stage, m.group_name,
             m.score_home, m.score_away
      FROM predictions p
      JOIN matches m ON m.id = p.match_id
      WHERE p.user_id = ?
      ORDER BY m.match_date ASC
    `).all(req.user.id);
    res.json(preds);
  });

  // ─── Leaderboard ──────────────────────────────────────────────────────────────
  app.get('/api/leaderboard', auth, (req, res) => {
    const rows = db.prepare(`
      SELECT u.id, u.username,
        COALESCE(SUM(p.points_awarded), 0) as total_points,
        COUNT(p.id) as total_tips,
        SUM(CASE WHEN p.points_awarded = 5 THEN 1 ELSE 0 END) as exact_scores,
        SUM(CASE WHEN p.points_awarded = 3 THEN 1 ELSE 0 END) as correct_diff,
        SUM(CASE WHEN p.points_awarded = 2 THEN 1 ELSE 0 END) as correct_winner,
        SUM(CASE WHEN p.points_awarded = 0 THEN 1 ELSE 0 END) as wrong_tips
      FROM users u
      LEFT JOIN predictions p ON p.user_id = u.id AND p.points_awarded IS NOT NULL
      GROUP BY u.id
      ORDER BY total_points DESC, exact_scores DESC, correct_diff DESC
    `).all();
    res.json(rows);
  });

  // ─── Admin routes ─────────────────────────────────────────────────────────────
  app.post('/api/admin/result', adminAuth, (req, res) => {
    const { match_id, score_home, score_away, extra_time = false, penalties = false } = req.body;
    if (score_home == null || score_away == null || score_home < 0 || score_away < 0) {
      return res.status(400).json({ error: 'Neplatný výsledek' });
    }

    db.prepare('UPDATE matches SET score_home = ?, score_away = ?, extra_time = ?, penalties = ? WHERE id = ?')
      .run(score_home, score_away, extra_time ? 1 : 0, penalties ? 1 : 0, match_id);

    // Hodnotíme vždy výsledek po 90 minutách (score_home/score_away)
    const preds = db.prepare('SELECT * FROM predictions WHERE match_id = ?').all(match_id);
    const affectedUsers = new Set();
    const update = db.transaction(() => {
      for (const p of preds) {
        const base = calcPoints(p.pred_home, p.pred_away, score_home, score_away);
        const pts = base * (p.is_joker ? 2 : 1);
        db.prepare('UPDATE predictions SET points_awarded = ? WHERE id = ?').run(pts, p.id);
        affectedUsers.add(p.user_id);
      }
    });
    update();
    for (const uid of affectedUsers) checkAndGrantAchievements(uid);

    res.json({ ok: true, updated: preds.length });
  });

  app.post('/api/admin/result/clear', adminAuth, (req, res) => {
    const { match_id } = req.body;
    db.prepare('UPDATE matches SET score_home = NULL, score_away = NULL, extra_time = 0, penalties = 0 WHERE id = ?').run(match_id);
    db.prepare('UPDATE predictions SET points_awarded = NULL WHERE match_id = ?').run(match_id);
    res.json({ ok: true });
  });

  app.post('/api/admin/match', adminAuth, (req, res) => {
    const { team_home, team_away, flag_home, flag_away, match_date, stage, group_name } = req.body;
    if (!team_home || !team_away || !match_date || !stage) {
      return res.status(400).json({ error: 'Vyplňte všechna povinná pole' });
    }
    const result = db.prepare(
      'INSERT INTO matches (team_home, team_away, flag_home, flag_away, match_date, stage, group_name) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(team_home, team_away, flag_home || '', flag_away || '', match_date, stage, group_name || null);
    res.json({ id: result.lastInsertRowid });
  });

  app.put('/api/admin/match/:id', adminAuth, (req, res) => {
    const { team_home, team_away, flag_home, flag_away, match_date, stage, group_name, is_featured } = req.body;
    db.prepare(
      'UPDATE matches SET team_home=?, team_away=?, flag_home=?, flag_away=?, match_date=?, stage=?, group_name=?, is_featured=? WHERE id=?'
    ).run(team_home, team_away, flag_home || '', flag_away || '', match_date, stage, group_name || null, is_featured ?? 1, req.params.id);
    res.json({ ok: true });
  });

  // ─── Achievementy ─────────────────────────────────────────────────────────────
  app.get('/api/achievements/mine', auth, (req, res) => {
    const rows = db.prepare('SELECT achievement_code, earned_at FROM user_achievements WHERE user_id = ? ORDER BY earned_at ASC').all(req.user.id);
    res.json(rows);
  });

  app.get('/api/achievements/all', auth, (req, res) => {
    const rows = db.prepare(`
      SELECT u.id, u.username, GROUP_CONCAT(ua.achievement_code) as codes
      FROM users u
      LEFT JOIN user_achievements ua ON ua.user_id = u.id
      GROUP BY u.id
    `).all();
    res.json(rows);
  });

  app.get('/api/admin/users', adminAuth, (req, res) => {
    const users = db.prepare('SELECT id, username, is_admin, created_at FROM users ORDER BY created_at ASC').all();
    res.json(users);
  });

  app.put('/api/admin/users/:id/admin', adminAuth, (req, res) => {
    db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(req.body.is_admin ? 1 : 0, req.params.id);
    res.json({ ok: true });
  });

  // Manuální trigger auto-fetcheru
  app.post('/api/admin/fetch', adminAuth, async (req, res) => {
    const result = await fetchAndUpdate(db);
    res.json(result);
  });

  // ─── Speciální tipy ───────────────────────────────────────────────────────────
  app.get('/api/special-bets', auth, (req, res) => {
    const uid = req.user.id;
    const bets = db.prepare(`
      SELECT sb.*,
        (SELECT answer FROM special_predictions sp WHERE sp.bet_id = sb.id AND sp.user_id = ?) as my_answer,
        (SELECT points_awarded FROM special_predictions sp WHERE sp.bet_id = sb.id AND sp.user_id = ?) as my_points
      FROM special_bets sb
      WHERE sb.is_active = 1
      ORDER BY sb.category, sb.id
    `).all(uid, uid);
    res.json(bets);
  });

  app.post('/api/special-bets/predict', auth, (req, res) => {
    const { bet_id, answer } = req.body;
    if (!answer || String(answer).trim() === '') return res.status(400).json({ error: 'Odpověď nesmí být prázdná' });

    const bet = db.prepare('SELECT * FROM special_bets WHERE id = ? AND is_active = 1').get(bet_id);
    if (!bet) return res.status(404).json({ error: 'Tip nenalezen' });
    if (new Date(bet.deadline).getTime() <= Date.now()) {
      return res.status(403).json({ error: 'Deadline vypršel – tip nelze změnit' });
    }

    const existing = db.prepare('SELECT id FROM special_predictions WHERE user_id = ? AND bet_id = ?').get(req.user.id, bet_id);
    if (existing) {
      db.prepare('UPDATE special_predictions SET answer = ?, points_awarded = NULL WHERE user_id = ? AND bet_id = ?')
        .run(String(answer).trim(), req.user.id, bet_id);
    } else {
      db.prepare('INSERT INTO special_predictions (user_id, bet_id, answer) VALUES (?, ?, ?)')
        .run(req.user.id, bet_id, String(answer).trim());
    }
    res.json({ ok: true });
  });

  // Admin: nastavit správnou odpověď a vyhodnotit
  app.post('/api/admin/special-bets/:id/result', adminAuth, (req, res) => {
    const { correct_answer } = req.body;
    if (!correct_answer) return res.status(400).json({ error: 'Chybí správná odpověď' });

    const bet = db.prepare('SELECT * FROM special_bets WHERE id = ?').get(req.params.id);
    if (!bet) return res.status(404).json({ error: 'Tip nenalezen' });

    db.prepare('UPDATE special_bets SET correct_answer = ? WHERE id = ?').run(correct_answer, req.params.id);

    const preds = db.prepare('SELECT * FROM special_predictions WHERE bet_id = ?').all(req.params.id);
    const update = db.transaction(() => {
      for (const p of preds) {
        let pts = 0;
        if (bet.input_type === 'number') {
          // Počet gólů: přesně = plné body, ±10 = poloviční body
          const diff = Math.abs(Number(p.answer) - Number(correct_answer));
          if (diff === 0) pts = bet.points_reward;
          else if (diff <= 10) pts = bet.points_partial;
          else pts = 0;
        } else if (bet.input_type === 'finalist') {
          // Finalisté: correct_answer = "TýmA|TýmB" — pořadí NEZÁLEŽÍ
          // Hráč dostane body pokud jeho tip je JEDEN Z OBOU finalistů
          const finalists = correct_answer.split('|').map(s => s.trim().toLowerCase());
          pts = finalists.includes(p.answer.toLowerCase()) ? bet.points_reward : 0;
        } else {
          pts = p.answer.toLowerCase() === correct_answer.toLowerCase() ? bet.points_reward : 0;
        }
        db.prepare('UPDATE special_predictions SET points_awarded = ? WHERE id = ?').run(pts, p.id);
      }
    });
    update();

    res.json({ ok: true, evaluated: preds.length });
  });

  app.get('/api/admin/special-bets', adminAuth, (req, res) => {
    const bets = db.prepare('SELECT * FROM special_bets ORDER BY category, id').all();
    res.json(bets);
  });

  app.post('/api/admin/special-bets/:id/result/clear', adminAuth, (req, res) => {
    db.prepare('UPDATE special_bets SET correct_answer = NULL WHERE id = ?').run(req.params.id);
    db.prepare('UPDATE special_predictions SET points_awarded = NULL WHERE bet_id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  // Rozšíření žebříčku o body ze speciálních tipů
  app.get('/api/leaderboard/full', auth, (req, res) => {
    const rows = db.prepare(`
      SELECT u.id, u.username,
        COALESCE(SUM(p.points_awarded), 0) as match_points,
        COALESCE(SUM(sp.points_awarded), 0) as special_points,
        COALESCE(SUM(p.points_awarded), 0) + COALESCE(SUM(sp.points_awarded), 0) as total_points,
        COUNT(DISTINCT p.id) as total_tips,
        SUM(CASE WHEN p.points_awarded = 5 THEN 1 ELSE 0 END) as exact_scores,
        SUM(CASE WHEN p.points_awarded = 3 THEN 1 ELSE 0 END) as correct_diff,
        SUM(CASE WHEN p.points_awarded = 2 THEN 1 ELSE 0 END) as correct_winner
      FROM users u
      LEFT JOIN predictions p ON p.user_id = u.id AND p.points_awarded IS NOT NULL
      LEFT JOIN special_predictions sp ON sp.user_id = u.id AND sp.points_awarded IS NOT NULL
      GROUP BY u.id
      ORDER BY total_points DESC, exact_scores DESC, correct_diff DESC
    `).all();
    res.json(rows);
  });

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function start() {
  const db = await initialize();

  // Run seed
  const { seed } = require('./seed');
  seed(db);

  setupRoutes(db);
  startCron(db);

  app.listen(PORT, () => {
    console.log(`\n⚽  MS 2026 Tipovačka běží na http://localhost:${PORT}\n`);
  });
}

start().catch(err => {
  console.error('Chyba při spuštění:', err);
  process.exit(1);
});
