// ─── State ───────────────────────────────────────────────────────────────────
let currentUser = null;
let currentTab = 'matches';
let pendingSaves = {};
let jokersRemaining = 2;
let matchSummaryCache = {}; // matchId → summary data

// ─── Achievementy definice ────────────────────────────────────────────────────
const ACHIEVEMENTS = {
  first_tip:    { icon: '⚽', name: 'První tip',       desc: 'Zadal jsi svůj první tip' },
  first_exact:  { icon: '🎯', name: 'Ostrý střelec',   desc: 'Uhodl jsi přesný výsledek' },
  hat_trick:    { icon: '🎩', name: 'Hat-trick',        desc: '3 přesné výsledky celkem' },
  sharpshooter: { icon: '🏹', name: 'Sniper',           desc: '5 přesných výsledků celkem' },
  sniper:       { icon: '🔫', name: '3 v řadě',         desc: '3 přesné výsledky za sebou' },
  joker_win:    { icon: '🃏', name: 'Hazardér',         desc: 'Použil joker a dostal body' },
  joker_hero:   { icon: '🦸', name: 'Joker hrdina',     desc: 'Joker + přesný výsledek = 10 bodů!' },
};

// ─── API helpers ─────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Chyba serveru');
  return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function switchAuth(mode) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('login-form').style.display = mode === 'login' ? '' : 'none';
  document.getElementById('register-form').style.display = mode === 'register' ? '' : 'none';
  clearErrors();
}

function clearErrors() {
  ['login-error', 'reg-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

async function submitLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    const data = await api('POST', '/api/login', { username, password });
    setUser(data.user);
  } catch (err) {
    document.getElementById('login-error').textContent = err.message;
  }
}

async function submitRegister(e) {
  e.preventDefault();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  try {
    const data = await api('POST', '/api/register', { username, password });
    setUser(data.user);
    toast('Vítej v tipovačce MS 2026! 🎉', 'success');
  } catch (err) {
    document.getElementById('reg-error').textContent = err.message;
  }
}

async function logout() {
  await api('POST', '/api/logout');
  currentUser = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('auth-overlay').style.display = 'flex';
}

function setUser(user) {
  currentUser = user;
  document.getElementById('auth-overlay').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('header-user').textContent = user.username + (user.is_admin ? ' ⚙️' : '');
  if (user.is_admin) {
    document.getElementById('admin-tab').style.display = '';
  }
  switchTab('matches');
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.querySelector(`.nav-tab[data-tab="${tab}"]`).classList.add('active');

  if (tab === 'matches') loadMatches();
  else if (tab === 'leaderboard') loadLeaderboard();
  else if (tab === 'my-predictions') loadMyPredictions();
  else if (tab === 'special') loadSpecialBets();
  else if (tab === 'admin') loadAdmin();
}

// ─── Flag helper ──────────────────────────────────────────────────────────────
function flag(code) {
  if (!code) return '<span class="flag-placeholder">🏳</span>';
  return `<span class="fi fi-${code} team-flag"></span>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STAGE_LABELS = {
  group: 'Skupinová fáze', r32: 'Osmifinále (Round of 32)',
  r16: 'Osmifinále (Round of 16)', qf: 'Čtvrtfinále',
  sf: 'Semifinále', '3rd': 'O 3. místo', final: 'Finále'
};

const STAGE_ORDER = ['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final'];

function formatDate(str) {
  const d = new Date(str);
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

function isLocked(match_date) {
  return new Date(match_date).getTime() <= Date.now();
}

function pointsClass(pts) {
  if (pts === 5) return 'pts-5';
  if (pts === 3) return 'pts-3';
  if (pts === 2) return 'pts-2';
  if (pts === 0) return 'pts-0';
  return '';
}

function pointsLabel(pts) {
  if (pts === 5) return '✅ Přesný výsledek +5b';
  if (pts === 3) return '🎯 Správný rozdíl +3b';
  if (pts === 2) return '👍 Správný vítěz +2b';
  if (pts === 0) return '❌ Špatný tip +0b';
  return '';
}

// ─── Matches ──────────────────────────────────────────────────────────────────
async function loadMatches() {
  const container = document.getElementById('matches-container');
  container.innerHTML = '<div class="loading">Načítám zápasy…</div>';
  try {
    const data = await api('GET', '/api/matches');
    jokersRemaining = data.jokers_remaining ?? 2;
    renderMatches(container, data.matches);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

function renderMatches(container, matches) {
  if (!matches.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>Žádné zápasy k zobrazení</p></div>';
    return;
  }

  // Group by stage then by group_name
  const byStage = {};
  for (const m of matches) {
    const key = m.stage;
    if (!byStage[key]) byStage[key] = {};
    const gkey = m.group_name || '_';
    if (!byStage[key][gkey]) byStage[key][gkey] = [];
    byStage[key][gkey].push(m);
  }

  let html = '';
  for (const stage of STAGE_ORDER) {
    if (!byStage[stage]) continue;
    const stageGroups = byStage[stage];
    let stageHtml = '';

    for (const [gname, gmatches] of Object.entries(stageGroups).sort()) {
      if (stage === 'group') {
        stageHtml += `<div class="group-label">Skupina ${gname}</div>`;
      }
      stageHtml += gmatches.map(m => renderMatchCard(m)).join('');
    }

    const stageBadgeClass = stage === '3rd' ? 'third' : stage;
    const isKnockoutStage = ['r32','r16','qf','sf','3rd','final'].includes(stage);
    const knockoutBanner = isKnockoutStage
      ? `<div class="knockout-banner">⏱️ Tipujte výsledek <strong>po 90 minutách</strong> — prodloužení ani penalty se nezapočítávají</div>`
      : '';
    html += `
      <div class="stage-section">
        <div class="stage-header">
          <span class="stage-badge ${stageBadgeClass}">${STAGE_LABELS[stage] || stage}</span>
        </div>
        ${knockoutBanner}
        ${stageHtml}
      </div>
    `;
  }

  // Joker banner – zobrazit nad zápasy
  const jokerBanner = jokersRemaining > 0 ? `
    <div class="joker-banner">
      <div class="joker-banner-left">
        <span class="joker-icon">🃏</span>
        <div>
          <strong>Joker – ${jokersRemaining === 2 ? 'máš 2 jokery' : 'zbývá 1 joker'}</strong>
          <div class="joker-desc">Použij joker na zápas kde si jsi nejvíc jistý → dostaneš <strong>2× body</strong>. Joker nelze vzít zpět po uzamčení zápasu.</div>
        </div>
      </div>
      <div class="joker-dots">${'🃏'.repeat(jokersRemaining)}${'⬜'.repeat(2 - jokersRemaining)}</div>
    </div>` : `
    <div class="joker-banner joker-empty">
      <span class="joker-icon">🃏</span>
      <span>Oba jokery jsou použity – sleduj, jestli se vyplatily!</span>
    </div>`;

  container.innerHTML = jokerBanner + html;
}

function renderMatchCard(m) {
  const locked = isLocked(m.match_date);
  const hasPred = m.has_prediction;
  const hasResult = m.score_home !== null && m.score_away !== null;
  const isTBD = m.team_home === 'TBD' || m.team_away === 'TBD';

  let cardClass = 'match-card';
  if (locked) cardClass += ' locked';
  if (hasResult && hasPred && m.my_points !== null) {
    cardClass += ` has-result ${pointsClass(m.my_points)}`;
  }

  const groupBadge = m.group_name ? `<span class="match-group-badge">Sk. ${m.group_name}</span>` : '';
  const lockedBadge = locked ? `<span class="match-locked-badge">🔒 Uzamčeno</span>` : '';

  // Result display
  let resultHtml;
  if (hasResult) {
    const extra = m.extra_time ? `<span class="extra-label">${m.penalties ? 'PEN' : 'ET'}</span>` : '';
    resultHtml = `<div class="result-display">${m.score_home} : ${m.score_away}${extra}</div>`;
  } else {
    resultHtml = `<div class="result-display pending">vs</div>`;
  }

  // Knockout note
  const isKnockout = ['r32','r16','qf','sf','3rd','final'].includes(m.stage);
  const knockoutNote = isKnockout && !isTBD && !locked
    ? `<div class="knockout-note">⚠️ Tipujte výsledek po 90 minutách (bez prodloužení/penalt)</div>`
    : '';

  // Prediction area
  let predHtml = '';
  if (isTBD) {
    predHtml = `<div class="my-tip-display" style="text-align:center;margin-top:8px;color:var(--text-muted);font-size:12px;">Soupeři budou upřesněni</div>`;
  } else if (locked) {
    const summaryHtml = `<div id="summary-${m.id}" class="match-summary-placeholder" onclick="loadSummary(${m.id})">
      <span style="font-size:12px;color:var(--text-muted);cursor:pointer;text-decoration:underline">👁 Co tipovali ostatní?</span>
    </div>`;

    if (hasPred) {
      const isJoker = m.my_joker === 1;
      const jokerLabel = isJoker ? `<span class="tip-badge joker-badge">🃏 JOKER</span>` : '';
      const ptsBadge = m.my_points !== null
        ? `<span class="tip-badge ${pointsClass(m.my_points)}">${pointsLabel(m.my_points)}${isJoker ? ' (2×)' : ''}</span>`
        : '';
      predHtml = `
        <div class="match-actions" style="flex-wrap:wrap;">
          <span class="tip-badge saved">Tvůj tip: ${m.my_pred_home} : ${m.my_pred_away}</span>
          ${jokerLabel}
          ${ptsBadge}
        </div>
        ${summaryHtml}`;
    } else {
      predHtml = `
        <div class="my-tip-display" style="text-align:center;margin-top:8px;">Žádný tip</div>
        ${summaryHtml}`;
    }
  } else {
    const savedH = hasPred ? m.my_pred_home : '';
    const savedA = hasPred ? m.my_pred_away : '';
    const isJoker = m.my_joker === 1;
    const canAddJoker = jokersRemaining > 0 || isJoker;

    const jokerBtn = hasPred ? `
      <button class="btn-joker ${isJoker ? 'active' : ''} ${!canAddJoker ? 'disabled' : ''}"
        onclick="toggleJoker(${m.id})"
        title="${isJoker ? 'Joker aktivní – klikni pro odebrání' : (canAddJoker ? 'Použít joker na tento zápas (2× body)' : 'Nemáš žádný joker')}">
        🃏 ${isJoker ? 'Joker aktivní' : 'Joker'}
      </button>` : '';

    predHtml = `
      ${knockoutNote}
      <div class="match-actions">
        <div class="prediction-input">
          <input type="number" class="score-input" min="0" max="20" value="${savedH}"
            id="pred-h-${m.id}" placeholder="0" oninput="markDirty(${m.id})">
          <span class="prediction-sep">:</span>
          <input type="number" class="score-input" min="0" max="20" value="${savedA}"
            id="pred-a-${m.id}" placeholder="0" oninput="markDirty(${m.id})">
        </div>
        <button class="btn-save" id="btn-save-${m.id}" onclick="savePrediction(${m.id})">
          ${hasPred ? 'Upravit' : 'Uložit tip'}
        </button>
        ${hasPred ? `<span class="tip-badge saved">Uloženo ✓</span>` : ''}
        ${jokerBtn}
      </div>`;
  }

  return `
    <div class="match-card ${cardClass}" id="card-${m.id}">
      <div class="match-meta">
        <span class="match-date">${formatDate(m.match_date)}</span>
        ${groupBadge}
        ${lockedBadge}
      </div>
      <div class="match-main">
        <div class="team home">
          <span class="team-name">${m.team_home}</span>
          ${flag(m.flag_home)}
        </div>
        <div class="match-center">
          ${resultHtml}
        </div>
        <div class="team away">
          ${flag(m.flag_away)}
          <span class="team-name">${m.team_away}</span>
        </div>
      </div>
      ${predHtml}
    </div>`;
}

function markDirty(matchId) {
  pendingSaves[matchId] = true;
}

async function toggleJoker(matchId) {
  const btn = document.querySelector(`[onclick="toggleJoker(${matchId})"]`);
  if (btn && btn.classList.contains('disabled')) {
    toast('Nemáš žádný volný joker!', 'error'); return;
  }
  try {
    const res = await api('POST', `/api/predictions/${matchId}/joker`);
    jokersRemaining = res.jokers_remaining;
    if (res.joker_active) {
      toast('🃏 Joker aktivován! Dostaneš 2× body za tento zápas.', 'success');
    } else {
      toast('Joker odebrán.', '');
    }
    loadMatches();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function loadSummary(matchId) {
  const el = document.getElementById(`summary-${matchId}`);
  if (!el) return;
  if (matchSummaryCache[matchId]) {
    el.innerHTML = renderSummary(matchSummaryCache[matchId]);
    return;
  }
  el.innerHTML = '<span style="font-size:12px;color:var(--text-muted)">Načítám…</span>';
  try {
    const data = await api('GET', `/api/matches/${matchId}/summary`);
    matchSummaryCache[matchId] = data;
    el.innerHTML = renderSummary(data);
  } catch (err) {
    el.innerHTML = `<span style="font-size:12px;color:var(--red)">${err.message}</span>`;
  }
}

function renderSummary(data) {
  if (!data.total) return '<span style="font-size:12px;color:var(--text-muted)">Žádné tipy</span>';
  return `
    <div class="match-summary">
      <div class="summary-title">👁 Co tipovalo ${data.total} hráčů:</div>
      <div class="summary-bars">
        <div class="summary-bar">
          <span class="summary-label">Výhra domácích</span>
          <div class="bar-track"><div class="bar-fill home" style="width:${data.home_win}%"></div></div>
          <span class="summary-pct">${data.home_win}%</span>
        </div>
        <div class="summary-bar">
          <span class="summary-label">Remíza</span>
          <div class="bar-track"><div class="bar-fill draw" style="width:${data.draw}%"></div></div>
          <span class="summary-pct">${data.draw}%</span>
        </div>
        <div class="summary-bar">
          <span class="summary-label">Výhra hostů</span>
          <div class="bar-track"><div class="bar-fill away" style="width:${data.away_win}%"></div></div>
          <span class="summary-pct">${data.away_win}%</span>
        </div>
      </div>
      <div class="summary-scores">
        ${data.top_scores.map(s => `<span class="summary-score-pill">${s.score} <em>${s.pct}%</em></span>`).join('')}
      </div>
    </div>`;
}

async function savePrediction(matchId) {
  const hInput = document.getElementById(`pred-h-${matchId}`);
  const aInput = document.getElementById(`pred-a-${matchId}`);
  const btn = document.getElementById(`btn-save-${matchId}`);

  const predHome = parseInt(hInput.value);
  const predAway = parseInt(aInput.value);

  if (isNaN(predHome) || isNaN(predAway) || predHome < 0 || predAway < 0) {
    toast('Zadejte platný výsledek (0 nebo více)', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = '…';

  try {
    await api('POST', '/api/predictions', { match_id: matchId, pred_home: predHome, pred_away: predAway });
    delete pendingSaves[matchId];
    toast('Tip uložen! ⚽', 'success');
    // Refresh the single card
    loadMatches();
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Uložit tip';
  }
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
async function loadLeaderboard() {
  const container = document.getElementById('leaderboard-container');
  container.innerHTML = '<div class="loading">Načítám žebříček…</div>';
  try {
    const [rows, achAll] = await Promise.all([
      api('GET', '/api/leaderboard/full'),
      api('GET', '/api/achievements/all'),
    ]);
    const achMap = {};
    for (const a of achAll) achMap[a.id] = (a.codes || '').split(',').filter(Boolean);
    renderLeaderboard(container, rows, achMap);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
  }
}

function renderLeaderboard(container, rows, achMap = {}) {
  if (!rows.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🏆</div><p>Zatím žádné tipy</p></div>';
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];

  const rowsHtml = rows.map((r, i) => {
    const isMy = currentUser && r.id === currentUser.id;
    const rankClass = i < 3 ? `rank-${i + 1}` : '';
    const medal = medals[i] || `${i + 1}.`;
    return `
      <tr ${isMy ? 'class="me-row"' : ''}>
        <td class="rank-cell ${rankClass}">${medal}</td>
        <td>
          <strong>${r.username}</strong>${isMy ? ' <em style="color:var(--text-muted);font-size:12px;">(já)</em>' : ''}
          <span class="ach-badges">
            ${(achMap[r.id] || []).map(code => {
              const a = ACHIEVEMENTS[code];
              return a ? `<span class="ach-badge" title="${a.name}: ${a.desc}">${a.icon}</span>` : '';
            }).join('')}
          </span>
        </td>
        <td class="points-cell">${r.total_points}</td>
        <td style="font-size:12px;color:var(--text-muted)">
          ⚽ ${r.match_points}b
          ${r.special_points > 0 ? `<span style="color:#b07800"> + ⭐ ${r.special_points}b</span>` : ''}
        </td>
        <td>
          <span class="stat-pill stat-5" title="Přesných výsledků">✅ ${r.exact_scores}</span>
          <span class="stat-pill stat-3" title="Správný rozdíl">🎯 ${r.correct_diff}</span>
          <span class="stat-pill stat-2" title="Správný vítěz">👍 ${r.correct_winner}</span>
        </td>
        <td style="color:var(--text-muted)">${r.total_tips} tipů</td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="leaderboard-table">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Hráč</th>
            <th>Body</th>
            <th>Statistiky</th>
            <th>Tipy</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
}

// ─── My Predictions ───────────────────────────────────────────────────────────
async function loadMyPredictions() {
  const container = document.getElementById('my-predictions-container');
  container.innerHTML = '<div class="loading">Načítám…</div>';
  try {
    const preds = await api('GET', '/api/predictions/mine');
    renderMyPredictions(container, preds);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
  }
}

function renderMyPredictions(container, preds) {
  if (!preds.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>Zatím žádné tipy. Jdi tipovat!</p></div>';
    return;
  }

  const scored = preds.filter(p => p.points_awarded !== null);
  const totalPts = scored.reduce((s, p) => s + p.points_awarded, 0);
  const exact = scored.filter(p => p.points_awarded === 5).length;
  const diff = scored.filter(p => p.points_awarded === 3).length;
  const winner = scored.filter(p => p.points_awarded === 2).length;

  const statsHtml = `
    <div class="predictions-stats">
      <div class="stat-card total"><div class="stat-value">${totalPts}</div><div class="stat-label">Celkem bodů</div></div>
      <div class="stat-card exact"><div class="stat-value">${exact}</div><div class="stat-label">Přesných výsledků</div></div>
      <div class="stat-card diff"><div class="stat-value">${diff}</div><div class="stat-label">Správný rozdíl</div></div>
      <div class="stat-card winner"><div class="stat-value">${winner}</div><div class="stat-label">Správný vítěz</div></div>
    </div>`;

  const byStage = {};
  for (const p of preds) {
    if (!byStage[p.stage]) byStage[p.stage] = [];
    byStage[p.stage].push(p);
  }

  let tableHtml = '';
  for (const stage of STAGE_ORDER) {
    if (!byStage[stage]) continue;
    tableHtml += `<h4 style="margin:16px 0 8px;color:var(--green-dark);font-size:14px;">${STAGE_LABELS[stage]}</h4>`;
    tableHtml += byStage[stage].map(p => {
      const hasResult = p.score_home !== null && p.score_away !== null;
      const ptsBadge = p.points_awarded !== null
        ? `<span class="tip-badge ${pointsClass(p.points_awarded)}">${pointsLabel(p.points_awarded)}</span>`
        : `<span style="color:var(--text-muted);font-size:12px;">čekáme na výsledek</span>`;

      const resultStr = hasResult ? `<strong>${p.score_home}:${p.score_away}</strong>` : `<span style="color:var(--text-muted)">–</span>`;

      return `
        <div class="match-card" style="margin-bottom:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
            <div>
              <span style="font-size:13px;color:var(--text-muted)">${formatDate(p.match_date)}</span>
              ${p.group_name ? `<span class="match-group-badge" style="margin-left:6px;">Sk. ${p.group_name}</span>` : ''}
            </div>
          </div>
          <div style="margin-top:8px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <span style="font-weight:600">${p.flag_home} ${p.team_home} <em style="color:var(--text-muted);font-weight:400">vs</em> ${p.team_away} ${p.flag_away}</span>
            <span style="font-size:13px;">Skutečnost: ${resultStr}</span>
            <span style="font-size:13px;">Tvůj tip: <strong>${p.pred_home}:${p.pred_away}</strong></span>
            ${ptsBadge}
          </div>
        </div>`;
    }).join('');
  }

  container.innerHTML = statsHtml + tableHtml;
}

// ─── Speciální tipy ───────────────────────────────────────────────────────────
const CATEGORY_LABELS = {
  group: '🏟️ Skupiny',
  tournament: '🏆 Turnaj',
  stats: '📊 Statistiky',
};

async function loadSpecialBets() {
  const container = document.getElementById('special-bets-container');
  container.innerHTML = '<div class="loading">Načítám…</div>';
  try {
    const bets = await api('GET', '/api/special-bets');
    renderSpecialBets(container, bets);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
  }
}

function renderSpecialBets(container, bets) {
  if (!bets.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">⭐</div><p>Žádné speciální tipy</p></div>';
    return;
  }

  const byCategory = {};
  for (const b of bets) {
    if (!byCategory[b.category]) byCategory[b.category] = [];
    byCategory[b.category].push(b);
  }

  let html = '';
  for (const [cat, items] of Object.entries(byCategory)) {
    html += `<div class="stage-section">
      <div class="stage-header">
        <span class="stage-badge group" style="font-size:13px">${CATEGORY_LABELS[cat] || cat}</span>
      </div>
      ${items.map(b => renderSpecialBetCard(b)).join('')}
    </div>`;
  }

  container.innerHTML = html;
}

function renderSpecialBetCard(b) {
  const locked = new Date(b.deadline).getTime() <= Date.now();
  const hasResult = b.correct_answer != null;
  const hasPred = b.my_answer != null;

  let statusBadge = '';
  if (hasResult) {
    const correct = b.my_answer && b.my_answer.toLowerCase() === b.correct_answer.toLowerCase();
    const pts = b.my_points;
    if (pts > 0) statusBadge = `<span class="tip-badge pts-5">✅ +${pts} bodů</span>`;
    else if (pts === 0 && hasPred) statusBadge = `<span class="tip-badge pts-0">❌ 0 bodů</span>`;
    else if (!hasPred) statusBadge = `<span class="tip-badge pts-0">Bez tipu</span>`;
  } else if (locked) {
    statusBadge = `<span class="match-locked-badge">🔒 Uzamčeno</span>`;
  }

  const pointsBadge = `<span class="legend-item ${b.points_reward >= 15 ? 'exact' : b.points_reward >= 10 ? 'diff' : 'winner'}">${b.points_reward} bodů</span>`;
  const deadlineStr = new Date(b.deadline).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  let inputHtml = '';
  if (hasResult) {
    const correctDisplay = b.input_type === 'finalist'
      ? b.correct_answer.replace('|', ' &amp; ')
      : b.correct_answer;
    inputHtml = `
      <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:8px;align-items:center">
        <span style="font-size:13px;color:var(--text-muted)">Správná odpověď:</span>
        <strong>${correctDisplay}</strong>
        ${hasPred ? `<span style="font-size:13px;color:var(--text-muted)">· Tvůj tip:</span><strong>${b.my_answer}</strong>` : ''}
        ${statusBadge}
      </div>`;
  } else if (locked) {
    inputHtml = `
      <div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${hasPred ? `<span class="tip-badge saved">Tvůj tip: ${b.my_answer}</span>` : '<span style="color:var(--text-muted);font-size:13px">Žádný tip</span>'}
        ${statusBadge}
      </div>`;
  } else {
    const options = b.options ? JSON.parse(b.options) : null;
    if (b.input_type === 'select' && options) {
      const opts = options.map(o =>
        `<option value="${o}" ${b.my_answer === o ? 'selected' : ''}>${o}</option>`
      ).join('');
      inputHtml = `
        <div class="special-bet-input">
          <select id="sb-input-${b.id}" class="sb-select">
            <option value="">-- Vyberte odpověď --</option>
            ${opts}
          </select>
          <button class="btn-save" onclick="saveSpecialBet(${b.id})">Uložit</button>
          ${hasPred ? `<span class="tip-badge saved">Uloženo ✓</span>` : ''}
        </div>`;
    } else if (b.input_type === 'number') {
      inputHtml = `
        <div class="special-bet-input">
          <input type="number" id="sb-input-${b.id}" class="sb-number" min="0" max="500"
            value="${b.my_answer ?? ''}" placeholder="Zadejte číslo">
          <button class="btn-save" onclick="saveSpecialBet(${b.id})">Uložit</button>
          ${hasPred ? `<span class="tip-badge saved">Uloženo ✓</span>` : ''}
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
          Přesně = ${b.points_reward} b, odchylka ±5 = ${b.points_partial} b
        </div>`;
    } else {
      inputHtml = `
        <div class="special-bet-input">
          <input type="text" id="sb-input-${b.id}" class="sb-text"
            value="${b.my_answer ?? ''}" placeholder="Zadejte odpověď">
          <button class="btn-save" onclick="saveSpecialBet(${b.id})">Uložit</button>
          ${hasPred ? `<span class="tip-badge saved">Uloženo ✓</span>` : ''}
        </div>`;
    }
  }

  return `
    <div class="match-card" style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">
        <div>
          <div style="font-weight:700;font-size:15px">${b.question}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:3px">
            Deadline: ${deadlineStr}
          </div>
        </div>
        ${pointsBadge}
      </div>
      ${inputHtml}
    </div>`;
}

async function saveSpecialBet(betId) {
  const el = document.getElementById(`sb-input-${betId}`);
  const answer = el ? el.value.trim() : '';
  if (!answer) { toast('Vyberte nebo zadejte odpověď', 'error'); return; }
  try {
    await api('POST', '/api/special-bets/predict', { bet_id: betId, answer });
    toast('Tip uložen ⭐', 'success');
    loadSpecialBets();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ─── Admin ────────────────────────────────────────────────────────────────────
async function loadAdmin() {
  try {
    const [matches, users, specialBets] = await Promise.all([
      api('GET', '/api/matches/all'),
      api('GET', '/api/admin/users'),
      api('GET', '/api/admin/special-bets'),
    ]);
    renderAdminMatches(matches);
    renderAdminSpecialBets(specialBets);
    renderAdminUsers(users);
  } catch (err) {
    toast(err.message, 'error');
  }
}

function renderAdminMatches(matches) {
  const container = document.getElementById('admin-matches-list');
  const isKnockout = s => ['r32','r16','qf','sf','3rd','final'].includes(s);

  const html = matches.map(m => {
    const hasResult = m.score_home !== null && m.score_away !== null;
    const stageLabel = STAGE_LABELS[m.stage] || m.stage;
    const groupLabel = m.group_name ? ` (Sk. ${m.group_name})` : '';
    const knockout = isKnockout(m.stage);

    let resultBadge;
    if (hasResult) {
      const extra = m.extra_time ? (m.penalties ? ' PEN' : ' ET') : '';
      resultBadge = `
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="result-set-badge">${m.score_home}:${m.score_away}${extra}</span>
          <button class="btn-confirm" style="background:var(--gray)" onclick="clearResult(${m.id})">Zrušit</button>
        </div>`;
    } else {
      const etCheck = knockout
        ? `<label style="font-size:12px;display:flex;align-items:center;gap:4px;white-space:nowrap">
             <input type="checkbox" id="r-et-${m.id}"> ET
           </label>
           <label style="font-size:12px;display:flex;align-items:center;gap:4px;white-space:nowrap">
             <input type="checkbox" id="r-pen-${m.id}" onchange="syncPen(${m.id})"> PEN
           </label>`
        : '';
      resultBadge = `
        <div class="result-inputs">
          <input type="number" id="r-h-${m.id}" min="0" max="20" placeholder="0">
          <span>:</span>
          <input type="number" id="r-a-${m.id}" min="0" max="20" placeholder="0">
          ${etCheck}
          <button class="btn-confirm" onclick="submitResult(${m.id})">Potvrdit</button>
        </div>`;
    }

    return `
      <div class="admin-match-row" style="grid-template-columns: auto 1fr auto; gap:12px;">
        <div>
          <div class="admin-match-teams">
            ${flag(m.flag_home)} ${m.team_home} <span class="vs">vs</span> ${m.team_away} ${flag(m.flag_away)}
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">${stageLabel}${groupLabel} · ${formatDate(m.match_date)}</div>
        </div>
        <div></div>
        ${resultBadge}
      </div>`;
  }).join('');

  container.innerHTML = html || '<p style="color:var(--text-muted)">Žádné zápasy</p>';
}

function syncPen(matchId) {
  const pen = document.getElementById(`r-pen-${matchId}`);
  const et = document.getElementById(`r-et-${matchId}`);
  if (pen && pen.checked && et) et.checked = true; // penalty vždy předpokládá ET
}

async function submitResult(matchId) {
  const h = parseInt(document.getElementById(`r-h-${matchId}`).value);
  const a = parseInt(document.getElementById(`r-a-${matchId}`).value);
  if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
    toast('Zadejte platný výsledek', 'error'); return;
  }
  const etEl = document.getElementById(`r-et-${matchId}`);
  const penEl = document.getElementById(`r-pen-${matchId}`);
  const extra_time = etEl ? etEl.checked : false;
  const penalties = penEl ? penEl.checked : false;

  // Výsledek po 90 min (pokud ET/PEN, musí být remíza po 90 min)
  if (penalties && h !== a) {
    toast('Při penaltách musí být výsledek po 90 min remíza!', 'error'); return;
  }
  if (extra_time && !penalties && h === a) {
    toast('Při ET bez penalt musí být rozhodnuto v prodloužení (výsledek nesmí být remíza)', 'error'); return;
  }

  try {
    const res = await api('POST', '/api/admin/result', { match_id: matchId, score_home: h, score_away: a, extra_time, penalties });
    toast(`Výsledek uložen, ohodnoceno ${res.updated} tipů ✅`, 'success');
    loadAdmin();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function clearResult(matchId) {
  try {
    await api('POST', '/api/admin/result/clear', { match_id: matchId });
    toast('Výsledek smazán', 'success');
    loadAdmin();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function adminAddMatch(e) {
  e.preventDefault();
  const body = {
    team_home: document.getElementById('add-team-home').value.trim(),
    team_away: document.getElementById('add-team-away').value.trim(),
    flag_home: document.getElementById('add-flag-home').value.trim(),
    flag_away: document.getElementById('add-flag-away').value.trim(),
    match_date: document.getElementById('add-date').value,
    stage: document.getElementById('add-stage').value,
    group_name: document.getElementById('add-group').value.trim() || null,
  };

  try {
    await api('POST', '/api/admin/match', body);
    toast('Zápas přidán ✅', 'success');
    e.target.reset();
    document.getElementById('add-match-error').textContent = '';
    loadAdmin();
  } catch (err) {
    document.getElementById('add-match-error').textContent = err.message;
  }
}

function renderAdminUsers(users) {
  const container = document.getElementById('admin-users-list');
  const html = `
    <table class="admin-users-table">
      <thead><tr><th>Uživatel</th><th>Registrace</th><th>Role</th></tr></thead>
      <tbody>
        ${users.map(u => `
          <tr>
            <td><strong>${u.username}</strong></td>
            <td style="color:var(--text-muted);font-size:13px">${new Date(u.created_at).toLocaleDateString('cs-CZ')}</td>
            <td>
              ${u.id === currentUser.id
                ? `<span style="color:var(--green);font-weight:600">${u.is_admin ? 'Admin' : 'Hráč'} (já)</span>`
                : `<label style="cursor:pointer;display:flex;align-items:center;gap:6px">
                     <input type="checkbox" ${u.is_admin ? 'checked' : ''} onchange="toggleAdmin(${u.id}, this.checked)">
                     ${u.is_admin ? 'Admin' : 'Hráč'}
                   </label>`
              }
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
  container.innerHTML = html;
}

async function toggleAdmin(userId, isAdmin) {
  try {
    await api('PUT', `/api/admin/users/${userId}/admin`, { is_admin: isAdmin });
    toast(`Práva aktualizována`, 'success');
  } catch (err) {
    toast(err.message, 'error');
    loadAdmin();
  }
}

function renderAdminSpecialBets(bets) {
  const container = document.getElementById('admin-special-bets-list');
  if (!bets.length) { container.innerHTML = '<p style="color:var(--text-muted)">Žádné tipy</p>'; return; }

  const html = bets.map(b => {
    const hasResult = b.correct_answer != null;
    const deadlineStr = new Date(b.deadline).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });

    let resultSection;
    if (hasResult) {
      resultSection = `<span class="result-set-badge">✅ ${b.correct_answer}</span>
        <button class="btn-confirm" style="background:var(--gray);margin-left:6px" onclick="clearSpecialResult(${b.id})">Zrušit</button>`;
    } else {
      const opts = b.options ? JSON.parse(b.options) : null;
      if (b.input_type === 'finalist') {
        // Finalisté: admin zadá oba týmy oddělené |
        resultSection = `
          <div style="display:flex;flex-direction:column;gap:4px">
            <div style="display:flex;gap:6px;align-items:center">
              <select id="sba-f1-${b.id}" style="padding:7px;border:1.5px solid var(--border);border-radius:7px;font-size:13px">
                <option value="">-- Finalista 1 --</option>
                ${opts.map(o => `<option value="${o}">${o}</option>`).join('')}
              </select>
              <span style="font-weight:700;color:var(--text-muted)">|</span>
              <select id="sba-f2-${b.id}" style="padding:7px;border:1.5px solid var(--border);border-radius:7px;font-size:13px">
                <option value="">-- Finalista 2 --</option>
                ${opts.map(o => `<option value="${o}">${o}</option>`).join('')}
              </select>
              <button class="btn-confirm" onclick="setFinalistResult(${b.id})">Potvrdit</button>
            </div>
            <div style="font-size:11px;color:var(--text-muted)">Zadejte oba finalisty — body dostanou hráči kteří tipovali KTERÉHOKOLI z nich</div>
          </div>`;
      } else if (opts) {
        resultSection = `
          <select id="sba-${b.id}" style="padding:7px;border:1.5px solid var(--border);border-radius:7px;font-size:13px">
            <option value="">-- Správná odpověď --</option>
            ${opts.map(o => `<option value="${o}">${o}</option>`).join('')}
          </select>
          <button class="btn-confirm" onclick="setSpecialResult(${b.id})">Potvrdit</button>`;
      } else {
        resultSection = `
          <input type="${b.input_type === 'number' ? 'number' : 'text'}" id="sba-${b.id}"
            placeholder="Správná odpověď" style="width:160px;padding:7px;border:1.5px solid var(--border);border-radius:7px;font-size:13px">
          <button class="btn-confirm" onclick="setSpecialResult(${b.id})">Potvrdit</button>`;
      }
    }

    return `
      <div class="admin-match-row" style="grid-template-columns:1fr auto;gap:12px;align-items:center">
        <div>
          <div style="font-weight:600;font-size:13px">${b.question}</div>
          <div style="font-size:11px;color:var(--text-muted)">${CATEGORY_LABELS[b.category] || b.category} · ${b.points_reward} b · deadline ${deadlineStr}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">${resultSection}</div>
      </div>`;
  }).join('');

  container.innerHTML = html;
}

async function setFinalistResult(betId) {
  const f1 = document.getElementById(`sba-f1-${betId}`)?.value?.trim();
  const f2 = document.getElementById(`sba-f2-${betId}`)?.value?.trim();
  if (!f1 || !f2) { toast('Vyberte oba finalisty', 'error'); return; }
  if (f1 === f2) { toast('Finalisté musí být různé týmy', 'error'); return; }
  try {
    const res = await api('POST', `/api/admin/special-bets/${betId}/result`, { correct_answer: `${f1}|${f2}` });
    toast(`Vyhodnoceno ${res.evaluated} tipů ✅`, 'success');
    loadAdmin();
  } catch (err) { toast(err.message, 'error'); }
}

async function setSpecialResult(betId) {
  const el = document.getElementById(`sba-${betId}`);
  const answer = el?.value?.trim();
  if (!answer) { toast('Zadejte správnou odpověď', 'error'); return; }
  try {
    const res = await api('POST', `/api/admin/special-bets/${betId}/result`, { correct_answer: answer });
    toast(`Vyhodnoceno ${res.evaluated} tipů ✅`, 'success');
    loadAdmin();
  } catch (err) { toast(err.message, 'error'); }
}

async function clearSpecialResult(betId) {
  // Reset správné odpovědi (jednoduché PUT)
  try {
    await api('POST', `/api/admin/special-bets/${betId}/result/clear`);
    toast('Odpověď smazána', 'success');
    loadAdmin();
  } catch (err) { toast(err.message, 'error'); }
}

async function triggerFetch() {
  const el = document.getElementById('fetch-result');
  el.textContent = 'Stahuji…';
  try {
    const res = await api('POST', '/api/admin/fetch');
    if (res.skipped) el.textContent = '⚠️ API klíč není nastaven (FOOTBALL_API_KEY)';
    else if (res.error) el.textContent = `❌ Chyba: ${res.error}`;
    else el.textContent = `✅ Aktualizováno ${res.updated} zápasů: ${(res.matches || []).join(', ') || '(žádné nové)'}`;
  } catch (err) { el.textContent = `❌ ${err.message}`; }
}

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  try {
    const data = await api('GET', '/api/me');
    setUser(data.user);
  } catch {
    // Not logged in, show auth overlay
  }
}

init();

// ─── PWA Service Worker ───────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
