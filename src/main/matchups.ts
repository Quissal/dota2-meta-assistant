import { explorerQuery } from './apiClient';
import { readCache, writeCache, isFresh } from './cache';
import type { AppSnapshot, MatchupSet, Matchup } from '../shared/types';

const TTL = 12 * 60 * 60 * 1000;
const MIN_GAMES = 12;

interface MatchupRow { opponent: number; games: number; wins: number }

const matchupSql = (heroId: number, from: number): string => `
  WITH p AS (
    SELECT m.match_id, m.radiant_win,
      (x->>'hero_id')::int AS hero_id, (x->>'team')::int AS team
    FROM matches m, unnest(m.picks_bans) x
    WHERE m.start_time >= ${from} AND (x->>'is_pick')::boolean = true
  )
  SELECT opp.hero_id AS opponent, count(*)::int AS games,
    sum(CASE WHEN (mine.radiant_win = (mine.team = 0)) THEN 1 ELSE 0 END)::int AS wins
  FROM p mine JOIN p opp ON opp.match_id = mine.match_id AND opp.team <> mine.team
  WHERE mine.hero_id = ${heroId}
  GROUP BY 1
  ORDER BY games DESC`;

export async function getMatchups(heroId: number, snapshot: AppSnapshot, patchName: string): Promise<MatchupSet> {
  const cacheName = `matchups_${patchName}_${heroId}`;
  const cached = readCache<MatchupSet>(cacheName);
  if (cached && isFresh(cached, TTL)) return cached.data;

  const from = Math.floor(new Date(snapshot.patch.date).getTime() / 1000);
  let rows = await explorerQuery<MatchupRow>(matchupSql(heroId, from));
  let patchOnly = true;
  const relevant = rows.filter((r) => r.games >= MIN_GAMES);
  if (relevant.length < 4) {
    rows = await explorerQuery<MatchupRow>(matchupSql(heroId, Math.floor(Date.now() / 1000) - 30 * 24 * 3600));
    patchOnly = false;
  }
  const names = new Map(snapshot.heroes.map((h) => [h.id, h.localizedName]));
  const list: Matchup[] = rows
    .filter((r) => r.games >= MIN_GAMES)
    .map((r) => ({
      heroId: r.opponent,
      name: names.get(r.opponent) || `Герой #${r.opponent}`,
      games: r.games,
      winRate: r.wins / r.games,
    }))
    .sort((a, b) => b.winRate - a.winRate);

  const result: MatchupSet = {
    heroId,
    generatedAt: new Date().toISOString(),
    patchOnly,
    best: list.slice(0, 8),
    worst: list.slice(-8).reverse(),
    sample: rows.reduce((s, r) => s + r.games, 0),
  };
  writeCache(cacheName, result);
  return result;
}
