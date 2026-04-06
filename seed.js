const matches = [
  // ═══════════════ SKUPINOVÁ FÁZE ═══════════════
  // Skupina A (Mexiko, Jižní Korea, Jihoafrická republika, Česká republika)
  { team_home: 'Mexiko',                flag_home: 'mx', team_away: 'Jihoafrická republika', flag_away: 'za', match_date: '2026-06-11T18:00:00', stage: 'group', group_name: 'A' },
  { team_home: 'Jižní Korea',           flag_home: 'kr', team_away: 'Česká republika',       flag_away: 'cz', match_date: '2026-06-11T22:00:00', stage: 'group', group_name: 'A' },
  { team_home: 'Mexiko',                flag_home: 'mx', team_away: 'Jižní Korea',           flag_away: 'kr', match_date: '2026-06-16T22:00:00', stage: 'group', group_name: 'A' },
  { team_home: 'Jihoafrická republika', flag_home: 'za', team_away: 'Česká republika',       flag_away: 'cz', match_date: '2026-06-17T02:00:00', stage: 'group', group_name: 'A' },
  { team_home: 'Mexiko',                flag_home: 'mx', team_away: 'Česká republika',       flag_away: 'cz', match_date: '2026-06-21T22:00:00', stage: 'group', group_name: 'A' },
  { team_home: 'Jižní Korea',           flag_home: 'kr', team_away: 'Jihoafrická republika', flag_away: 'za', match_date: '2026-06-21T22:00:00', stage: 'group', group_name: 'A' },

  // Skupina B (Kanada, Švýcarsko, Katar, Bosna a Hercegovina)
  { team_home: 'Kanada',              flag_home: 'ca', team_away: 'Bosna a Hercegovina', flag_away: 'ba', match_date: '2026-06-12T21:00:00', stage: 'group', group_name: 'B' },
  { team_home: 'Švýcarsko',           flag_home: 'ch', team_away: 'Katar',              flag_away: 'qa', match_date: '2026-06-13T00:00:00', stage: 'group', group_name: 'B' },
  { team_home: 'Kanada',              flag_home: 'ca', team_away: 'Švýcarsko',          flag_away: 'ch', match_date: '2026-06-17T21:00:00', stage: 'group', group_name: 'B' },

  // Skupina C (Brazílie, Maroko, Skotsko, Haiti)
  { team_home: 'Brazílie', flag_home: 'br', team_away: 'Maroko',  flag_away: 'ma',     match_date: '2026-06-13T22:00:00', stage: 'group', group_name: 'C' },
  { team_home: 'Brazílie', flag_home: 'br', team_away: 'Skotsko', flag_away: 'gb-sct', match_date: '2026-06-18T22:00:00', stage: 'group', group_name: 'C' },
  { team_home: 'Maroko',   flag_home: 'ma', team_away: 'Skotsko', flag_away: 'gb-sct', match_date: '2026-06-23T02:00:00', stage: 'group', group_name: 'C' },

  // Skupina D (USA, Austrálie, Paraguay, Turecko)
  { team_home: 'USA',       flag_home: 'us', team_away: 'Paraguay', flag_away: 'py', match_date: '2026-06-12T22:00:00', stage: 'group', group_name: 'D' },
  { team_home: 'USA',       flag_home: 'us', team_away: 'Turecko',  flag_away: 'tr', match_date: '2026-06-18T02:00:00', stage: 'group', group_name: 'D' },
  { team_home: 'Turecko',   flag_home: 'tr', team_away: 'Paraguay', flag_away: 'py', match_date: '2026-06-23T22:00:00', stage: 'group', group_name: 'D' },
  { team_home: 'Austrálie', flag_home: 'au', team_away: 'Paraguay', flag_away: 'py', match_date: '2026-06-14T02:00:00', stage: 'group', group_name: 'D' },

  // Skupina E (Německo, Curacao, Pobřeží slonoviny, Ekvádor)
  { team_home: 'Německo',           flag_home: 'de', team_away: 'Pobřeží slonoviny', flag_away: 'ci', match_date: '2026-06-14T22:00:00', stage: 'group', group_name: 'E' },
  { team_home: 'Německo',           flag_home: 'de', team_away: 'Ekvádor',           flag_away: 'ec', match_date: '2026-06-19T22:00:00', stage: 'group', group_name: 'E' },
  { team_home: 'Pobřeží slonoviny', flag_home: 'ci', team_away: 'Ekvádor',           flag_away: 'ec', match_date: '2026-06-24T22:00:00', stage: 'group', group_name: 'E' },

  // Skupina F (Nizozemsko, Japonsko, Tunisko, Švédsko)
  { team_home: 'Nizozemsko', flag_home: 'nl', team_away: 'Japonsko', flag_away: 'jp', match_date: '2026-06-14T02:00:00', stage: 'group', group_name: 'F' },
  { team_home: 'Nizozemsko', flag_home: 'nl', team_away: 'Švédsko',  flag_away: 'se', match_date: '2026-06-19T02:00:00', stage: 'group', group_name: 'F' },
  { team_home: 'Japonsko',   flag_home: 'jp', team_away: 'Švédsko',  flag_away: 'se', match_date: '2026-06-24T02:00:00', stage: 'group', group_name: 'F' },

  // Skupina G (Belgie, Írán, Egypt, Nový Zéland)
  { team_home: 'Belgie', flag_home: 'be', team_away: 'Egypt', flag_away: 'eg', match_date: '2026-06-15T22:00:00', stage: 'group', group_name: 'G' },
  { team_home: 'Belgie', flag_home: 'be', team_away: 'Írán',  flag_away: 'ir', match_date: '2026-06-20T22:00:00', stage: 'group', group_name: 'G' },
  { team_home: 'Egypt',  flag_home: 'eg', team_away: 'Írán',  flag_away: 'ir', match_date: '2026-06-25T22:00:00', stage: 'group', group_name: 'G' },

  // Skupina H (Španělsko, Uruguay, Saúdská Arábie, Kapverdy)
  { team_home: 'Španělsko',     flag_home: 'es', team_away: 'Uruguay',        flag_away: 'uy', match_date: '2026-06-15T02:00:00', stage: 'group', group_name: 'H' },
  { team_home: 'Španělsko',     flag_home: 'es', team_away: 'Saúdská Arábie', flag_away: 'sa', match_date: '2026-06-20T02:00:00', stage: 'group', group_name: 'H' },
  { team_home: 'Uruguay',       flag_home: 'uy', team_away: 'Saúdská Arábie', flag_away: 'sa', match_date: '2026-06-25T02:00:00', stage: 'group', group_name: 'H' },

  // Skupina I (Francie, Senegal, Norsko, Irák)
  { team_home: 'Francie', flag_home: 'fr', team_away: 'Senegal', flag_away: 'sn', match_date: '2026-06-16T22:00:00', stage: 'group', group_name: 'I' },
  { team_home: 'Francie', flag_home: 'fr', team_away: 'Norsko',  flag_away: 'no', match_date: '2026-06-21T02:00:00', stage: 'group', group_name: 'I' },
  { team_home: 'Senegal', flag_home: 'sn', team_away: 'Norsko',  flag_away: 'no', match_date: '2026-06-26T02:00:00', stage: 'group', group_name: 'I' },

  // Skupina J (Argentina, Rakousko, Alžírsko, Jordánsko)
  { team_home: 'Argentina', flag_home: 'ar', team_away: 'Alžírsko', flag_away: 'dz', match_date: '2026-06-16T02:00:00', stage: 'group', group_name: 'J' },
  { team_home: 'Argentina', flag_home: 'ar', team_away: 'Rakousko', flag_away: 'at', match_date: '2026-06-22T02:00:00', stage: 'group', group_name: 'J' },
  { team_home: 'Alžírsko',  flag_home: 'dz', team_away: 'Rakousko', flag_away: 'at', match_date: '2026-06-27T02:00:00', stage: 'group', group_name: 'J' },

  // Skupina K (Portugalsko, Kolumbie, Uzbekistán, DR Kongo)
  { team_home: 'Portugalsko', flag_home: 'pt', team_away: 'Kolumbie', flag_away: 'co', match_date: '2026-06-17T02:00:00', stage: 'group', group_name: 'K' },
  { team_home: 'Portugalsko', flag_home: 'pt', team_away: 'DR Kongo', flag_away: 'cd', match_date: '2026-06-22T22:00:00', stage: 'group', group_name: 'K' },
  { team_home: 'Kolumbie',    flag_home: 'co', team_away: 'DR Kongo', flag_away: 'cd', match_date: '2026-06-27T22:00:00', stage: 'group', group_name: 'K' },

  // Skupina L (Anglie, Chorvatsko, Panama, Ghana)
  { team_home: 'Anglie',     flag_home: 'gb-eng', team_away: 'Chorvatsko', flag_away: 'hr', match_date: '2026-06-17T22:00:00', stage: 'group', group_name: 'L' },
  { team_home: 'Anglie',     flag_home: 'gb-eng', team_away: 'Panama',     flag_away: 'pa', match_date: '2026-06-22T22:00:00', stage: 'group', group_name: 'L' },
  { team_home: 'Chorvatsko', flag_home: 'hr',     team_away: 'Ghana',      flag_away: 'gh', match_date: '2026-06-28T02:00:00', stage: 'group', group_name: 'L' },

  // ═══════════════ VYŘAZOVACÍ FÁZE ═══════════════
  // Round of 32 — 8 vybraných zápasů (nejzajímavější pavouk)
  // Bracket: 1A vs 3F/G/H, 1C vs 3A/D/E, 1E vs 3C/D/F, 1G vs 3A/B/H
  //          2A vs 2C,      2E vs 2G,     2B vs 2D,      2F vs 2H
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-06-29T19:00:00', stage: 'r32', group_name: null },  // 1C vs 3x (Brazílie/Maroko vs outsider)
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-06-29T22:00:00', stage: 'r32', group_name: null },  // 1A vs 3x (Mexiko/ČR vs outsider)
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-06-30T19:00:00', stage: 'r32', group_name: null },  // 1H vs 3x (Španělsko/Uruguay vs outsider)
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-06-30T22:00:00', stage: 'r32', group_name: null },  // 1J vs 3x (Argentina vs outsider)
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-07-01T19:00:00', stage: 'r32', group_name: null },  // 2C vs 2I (Maroko/Brazílie vs Francie/Senegal)
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-07-01T22:00:00', stage: 'r32', group_name: null },  // 1E vs 3x (Německo vs outsider)
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-07-02T19:00:00', stage: 'r32', group_name: null },  // 1K vs 3x (Portugalsko vs outsider)
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-07-02T22:00:00', stage: 'r32', group_name: null },  // 1L vs 3x (Anglie/Chorvatsko vs outsider)

  // Osmifinále Round of 16 (8 zápasů)
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-07-06T22:00:00', stage: 'r16', group_name: null },
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-07-07T02:00:00', stage: 'r16', group_name: null },
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-07-07T22:00:00', stage: 'r16', group_name: null },
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-07-08T02:00:00', stage: 'r16', group_name: null },
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-07-08T22:00:00', stage: 'r16', group_name: null },
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-07-09T02:00:00', stage: 'r16', group_name: null },
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-07-09T22:00:00', stage: 'r16', group_name: null },
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-07-10T02:00:00', stage: 'r16', group_name: null },

  // Čtvrtfinále (4 zápasy)
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-07-11T22:00:00', stage: 'qf', group_name: null },
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-07-12T02:00:00', stage: 'qf', group_name: null },
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-07-12T22:00:00', stage: 'qf', group_name: null },
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-07-13T02:00:00', stage: 'qf', group_name: null },

  // Semifinále
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-07-14T22:00:00', stage: 'sf', group_name: null },
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-07-15T22:00:00', stage: 'sf', group_name: null },

  // O 3. místo
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-07-18T22:00:00', stage: '3rd', group_name: null },

  // Finále
  { team_home: 'TBD', flag_home: '', team_away: 'TBD', flag_away: '', match_date: '2026-07-19T22:00:00', stage: 'final', group_name: null },
];

// Deadline pro všechny speciální tipy = těsně před zahájením turnaje
const TOURNAMENT_START = '2026-06-11T17:00:00';

const specialBets = [
  // ── Skupiny ──────────────────────────────────────────────────────────────
  {
    question: 'Kdo vyhraje skupinu A?',
    category: 'group',
    input_type: 'select',
    options: JSON.stringify(['Mexiko', 'Jižní Korea', 'Jihoafrická republika', 'Česká republika']),
    points_reward: 10,
    points_partial: 0,
    deadline: TOURNAMENT_START,
  },
  {
    question: 'Kdo postoupí ze skupiny A jako druhý?',
    category: 'group',
    input_type: 'select',
    options: JSON.stringify(['Mexiko', 'Jižní Korea', 'Jihoafrická republika', 'Česká republika']),
    points_reward: 8,
    points_partial: 0,
    deadline: TOURNAMENT_START,
  },
  {
    question: 'Kdo vyhraje skupinu C? (Brazílie, Maroko, Skotsko, Haiti)',
    category: 'group',
    input_type: 'select',
    options: JSON.stringify(['Brazílie', 'Maroko', 'Skotsko', 'Haiti']),
    points_reward: 10,
    points_partial: 0,
    deadline: TOURNAMENT_START,
  },
  {
    question: 'Kdo vyhraje skupinu J? (Argentina, Alžírsko, Rakousko, Jordánsko)',
    category: 'group',
    input_type: 'select',
    options: JSON.stringify(['Argentina', 'Alžírsko', 'Rakousko', 'Jordánsko']),
    points_reward: 10,
    points_partial: 0,
    deadline: TOURNAMENT_START,
  },
  // ── Turnaj ───────────────────────────────────────────────────────────────
  {
    question: 'Kdo vyhraje celý turnaj?',
    category: 'tournament',
    input_type: 'select',
    options: JSON.stringify([
      'Argentina','Anglie','Austrálie','Belgie','Bosna a Hercegovina',
      'Brazílie','Česká republika','DR Kongo','Ekvádor','Egypt',
      'Francie','Ghana','Chorvatsko','Haiti','Irák',
      'Írán','Japonsko','Jihoafrická republika','Jižní Korea','Jordánsko',
      'Kanada','Kapverdy','Kolumbie','Maroko','Mexiko',
      'Německo','Nizozemsko','Norsko','Nový Zéland','Panama',
      'Paraguay','Pobřeží slonoviny','Portugalsko','Rakousko','Saúdská Arábie',
      'Senegal','Skotsko','Španělsko','Švédsko','Švýcarsko',
      'Turecko','Uruguay','USA','Uzbekistán',
    ]),
    points_reward: 15,
    points_partial: 0,
    deadline: TOURNAMENT_START,
  },
  {
    // input_type='finalist': correct_answer = "TýmA|TýmB" (oba finalisté odděleni |)
    // body dostane každý, kdo tipoval JAKÉHOKOLI z obou finalistů — nezáleží na pořadí
    question: 'Tip na finalistu č. 1 (pořadí nezáleží)',
    category: 'tournament',
    input_type: 'finalist',
    options: JSON.stringify([
      'Argentina','Anglie','Austrálie','Belgie','Bosna a Hercegovina',
      'Brazílie','Česká republika','DR Kongo','Ekvádor','Egypt',
      'Francie','Ghana','Chorvatsko','Haiti','Irák',
      'Írán','Japonsko','Jihoafrická republika','Jižní Korea','Jordánsko',
      'Kanada','Kapverdy','Kolumbie','Maroko','Mexiko',
      'Německo','Nizozemsko','Norsko','Nový Zéland','Panama',
      'Paraguay','Pobřeží slonoviny','Portugalsko','Rakousko','Saúdská Arábie',
      'Senegal','Skotsko','Španělsko','Švédsko','Švýcarsko',
      'Turecko','Uruguay','USA','Uzbekistán',
    ]),
    points_reward: 8,
    points_partial: 0,
    deadline: TOURNAMENT_START,
  },
  {
    question: 'Tip na finalistu č. 2 (pořadí nezáleží)',
    category: 'tournament',
    input_type: 'finalist',
    options: JSON.stringify([
      'Argentina','Anglie','Austrálie','Belgie','Bosna a Hercegovina',
      'Brazílie','Česká republika','DR Kongo','Ekvádor','Egypt',
      'Francie','Ghana','Chorvatsko','Haiti','Irák',
      'Írán','Japonsko','Jihoafrická republika','Jižní Korea','Jordánsko',
      'Kanada','Kapverdy','Kolumbie','Maroko','Mexiko',
      'Německo','Nizozemsko','Norsko','Nový Zéland','Panama',
      'Paraguay','Pobřeží slonoviny','Portugalsko','Rakousko','Saúdská Arábie',
      'Senegal','Skotsko','Španělsko','Švédsko','Švýcarsko',
      'Turecko','Uruguay','USA','Uzbekistán',
    ]),
    points_reward: 8,
    points_partial: 0,
    deadline: TOURNAMENT_START,
  },
  // ── Statistiky ───────────────────────────────────────────────────────────
  {
    question: 'Který tým vstřelí nejvíce gólů v turnaji?',
    category: 'stats',
    input_type: 'select',
    options: JSON.stringify([
      'Argentina','Anglie','Brazílie','Česká republika','Francie',
      'Německo','Nizozemsko','Norsko','Portugalsko','Španělsko','Uruguay',
      'USA','Mexiko','Jižní Korea','Maroko','Kolumbie',
    ]),
    points_reward: 8,
    points_partial: 0,
    deadline: TOURNAMENT_START,
  },
  {
    question: 'Který tým obdrží nejméně gólů na zápas (min. 3 odehrané zápasy)?',
    category: 'stats',
    input_type: 'select',
    options: JSON.stringify([
      'Argentina','Anglie','Brazílie','Česká republika','Francie',
      'Německo','Nizozemsko','Norsko','Portugalsko','Španělsko','Uruguay',
      'USA','Mexiko','Jižní Korea','Maroko','Kolumbie',
    ]),
    points_reward: 8,
    points_partial: 0,
    deadline: TOURNAMENT_START,
  },
  {
    question: 'Kdo bude nejlepší střelec turnaje (hráč)?',
    category: 'stats',
    input_type: 'text',
    options: null,
    points_reward: 10,
    points_partial: 0,
    deadline: TOURNAMENT_START,
  },
  {
    // Průměr WC je ~2.7 gólů/zápas → 104 × 2.7 ≈ 280 gólů
    // ±10 = rozumná odchylka (3.5 %), ±20 = slušný pokus
    question: 'Kolik gólů padne celkem v turnaji? (104 zápasů, průměr ~280)',
    category: 'stats',
    input_type: 'number',
    options: null,
    points_reward: 10,
    points_partial: 5,  // ±10 gólů = 5 bodů (opraveno v server.js)
    deadline: TOURNAMENT_START,
  },
];

function seed(db) {
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM matches').get();
  if (existing && existing.cnt > 0) {
    console.log(`Seed přeskočen – databáze obsahuje ${existing.cnt} zápasů.`);
  } else {
    const insert = db.transaction(() => {
      for (const m of matches) {
        db.prepare(
          'INSERT INTO matches (team_home, team_away, flag_home, flag_away, match_date, stage, group_name, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
        ).run(m.team_home, m.team_away, m.flag_home, m.flag_away, m.match_date, m.stage, m.group_name || null);
      }
    });
    insert();
    console.log(`Seed: vloženo ${matches.length} zápasů.`);
  }

  // Speciální tipy — přidáme jen pokud ještě nejsou
  const existingSB = db.prepare('SELECT COUNT(*) as cnt FROM special_bets').get();
  if (!existingSB || existingSB.cnt === 0) {
    const insertSB = db.transaction(() => {
      for (const sb of specialBets) {
        db.prepare(`
          INSERT INTO special_bets (question, category, input_type, options, points_reward, points_partial, deadline)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(sb.question, sb.category, sb.input_type, sb.options, sb.points_reward, sb.points_partial, sb.deadline);
      }
    });
    insertSB();
    console.log(`Seed: vloženo ${specialBets.length} speciálních tipů.`);
  }
}

module.exports = { seed };
