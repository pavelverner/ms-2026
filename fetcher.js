/**
 * fetcher.js — Automatické stahování výsledků z football-data.org
 *
 * Nastavení: v .env nebo prostředí nastavte FOOTBALL_API_KEY
 * Zdarma na https://www.football-data.org/client/register
 *
 * Cron: každých 20 minut během turnaje (11. 6. – 20. 7. 2026)
 */
const cron = require('node-cron');

const API_KEY = process.env.FOOTBALL_API_KEY || '';
const API_BASE = 'https://api.football-data.org/v4';

// Mapování anglických názvů API → české názvy v DB
const TEAM_MAP = {
  'Mexico':                    'Mexiko',
  'South Africa':              'Jihoafrická republika',
  'Korea Republic':            'Jižní Korea',
  'South Korea':               'Jižní Korea',
  'Czech Republic':            'Česká republika',
  'Czechia':                   'Česká republika',
  'Canada':                    'Kanada',
  'Switzerland':               'Švýcarsko',
  'Qatar':                     'Katar',
  'Bosnia and Herzegovina':    'Bosna a Hercegovina',
  'Brazil':                    'Brazílie',
  'Morocco':                   'Maroko',
  'Scotland':                  'Skotsko',
  'Haiti':                     'Haiti',
  'United States':             'USA',
  'USA':                       'USA',
  'Australia':                 'Austrálie',
  'Paraguay':                  'Paraguay',
  'Turkey':                    'Turecko',
  'Türkiye':                   'Turecko',
  'Germany':                   'Německo',
  'Curaçao':                   'Curacao',
  "Côte d'Ivoire":             'Pobřeží slonoviny',
  'Ecuador':                   'Ekvádor',
  'Netherlands':               'Nizozemsko',
  'Japan':                     'Japonsko',
  'Tunisia':                   'Tunisko',
  'Sweden':                    'Švédsko',
  'Belgium':                   'Belgie',
  'Iran':                      'Írán',
  'Egypt':                     'Egypt',
  'New Zealand':               'Nový Zéland',
  'Spain':                     'Španělsko',
  'Uruguay':                   'Uruguay',
  'Saudi Arabia':              'Saúdská Arábie',
  'Cape Verde':                'Kapverdy',
  'France':                    'Francie',
  'Senegal':                   'Senegal',
  'Norway':                    'Norsko',
  'Iraq':                      'Irák',
  'Argentina':                 'Argentina',
  'Austria':                   'Rakousko',
  'Algeria':                   'Alžírsko',
  'Jordan':                    'Jordánsko',
  'Portugal':                  'Portugalsko',
  'Colombia':                  'Kolumbie',
  'Uzbekistan':                'Uzbekistán',
  'DR Congo':                  'DR Kongo',
  'Congo DR':                  'DR Kongo',
  'England':                   'Anglie',
  'Croatia':                   'Chorvatsko',
  'Panama':                    'Panama',
  'Ghana':                     'Ghana',
};

function mapTeam(name) {
  return TEAM_MAP[name] || name;
}

function calcPoints(predHome, predAway, actualHome, actualAway) {
  if (predHome === actualHome && predAway === actualAway) return 5;
  const predSign = Math.sign(predHome - predAway);
  const actualSign = Math.sign(actualHome - actualAway);
  if (predSign !== actualSign) return 0;
  if (predSign !== 0 && (predHome - predAway) === (actualHome - actualAway)) return 3;
  return 2;
}

async function fetchAndUpdate(db) {
  if (!API_KEY) {
    console.log('[fetcher] FOOTBALL_API_KEY není nastaven, přeskakuji.');
    return { updated: 0, skipped: true };
  }

  console.log('[fetcher] Stahuji výsledky z football-data.org...');

  let data;
  try {
    const res = await fetch(`${API_BASE}/competitions/WC/matches?status=FINISHED`, {
      headers: { 'X-Auth-Token': API_KEY },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    data = await res.json();
  } catch (err) {
    console.error('[fetcher] Chyba při stahování:', err.message);
    return { updated: 0, error: err.message };
  }

  const matches = data.matches || [];
  let updatedCount = 0;
  let log = [];

  for (const apiMatch of matches) {
    if (apiMatch.status !== 'FINISHED') continue;

    const homeTeam = mapTeam(apiMatch.homeTeam?.name || '');
    const awayTeam = mapTeam(apiMatch.awayTeam?.name || '');
    const ft = apiMatch.score?.fullTime;
    if (!ft || ft.home == null || ft.away == null) continue;

    const scoreHome = ft.home;
    const scoreAway = ft.away;
    const hasET = apiMatch.score?.extraTime?.home != null;
    const hasPEN = apiMatch.score?.penalties?.home != null;

    // Najít zápas v DB podle týmů
    const dbMatch = db.prepare(`
      SELECT * FROM matches
      WHERE team_home = ? AND team_away = ?
      AND score_home IS NULL
    `).get(homeTeam, awayTeam);

    if (!dbMatch) continue; // buď nenalezeno nebo už má výsledek

    // Uložit výsledek (po 90 minutách)
    db.prepare('UPDATE matches SET score_home = ?, score_away = ?, extra_time = ?, penalties = ? WHERE id = ?')
      .run(scoreHome, scoreAway, hasET ? 1 : 0, hasPEN ? 1 : 0, dbMatch.id);

    // Přepočítat body (s jokerem 2×)
    const preds = db.prepare('SELECT * FROM predictions WHERE match_id = ?').all(dbMatch.id);
    const updatePreds = db.transaction(() => {
      for (const p of preds) {
        const base = calcPoints(p.pred_home, p.pred_away, scoreHome, scoreAway);
        const pts = base * (p.is_joker ? 2 : 1);
        db.prepare('UPDATE predictions SET points_awarded = ? WHERE id = ?').run(pts, p.id);
      }
    });
    updatePreds();

    updatedCount++;
    log.push(`${homeTeam} ${scoreHome}:${scoreAway} ${awayTeam}${hasET ? ' (ET)' : ''}${hasPEN ? '+PEN' : ''}`);
  }

  if (updatedCount > 0) {
    console.log(`[fetcher] Aktualizováno ${updatedCount} zápasů:`);
    log.forEach(l => console.log('  ' + l));
  } else {
    console.log('[fetcher] Žádné nové výsledky.');
  }

  return { updated: updatedCount, matches: log };
}

function startCron(db) {
  // Každých 20 minut během turnaje (červen–červenec 2026)
  // Cron: */20 * * *  (každých 20 minut)
  cron.schedule('*/20 * * * *', async () => {
    const now = new Date();
    const start = new Date('2026-06-11T00:00:00Z');
    const end = new Date('2026-07-20T00:00:00Z');
    if (now < start || now > end) return; // mimo turnaj
    await fetchAndUpdate(db);
  });

  console.log('[fetcher] Cron nastaven — aktualizace výsledků každých 20 min (aktivní 11. 6.–20. 7. 2026)');
  if (!API_KEY) {
    console.log('[fetcher] ⚠️  FOOTBALL_API_KEY není nastaven! Nastavte ho pro automatické výsledky.');
    console.log('[fetcher]    Registrace zdarma: https://www.football-data.org/client/register');
  }
}

module.exports = { fetchAndUpdate, startCron };
