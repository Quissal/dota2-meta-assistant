import { getJson, explorerQuery } from './apiClient';
import { readCache, writeCache, isFresh } from './cache';
import type {
  AppSnapshot, HeroMeta, HeroBase, PatchInfo, ItemInfo,
  DataSource, RankStat, PatchStat, AbilityInfo, PatchChoice,
} from '../shared/types';

const CDN = 'https://cdn.cloudflare.steamstatic.com';
const SNAPSHOT_TTL = 20 * 60 * 1000;

// Images are served through a local caching protocol in the main process.
const img = (p: string): string => (p ? 'd2img://image/' + encodeURIComponent(CDN + p) : '');

interface RawHeroStat {
  id: number;
  name: string;
  primary_attr: string;
  attack_type: string;
  roles: string[];
  img: string;
  icon: string;
  base_health: number;
  base_mana: number;
  base_armor: number;
  base_attack_min: number;
  base_attack_max: number;
  base_str: number;
  base_agi: number;
  base_int: number;
  str_gain: number;
  agi_gain: number;
  int_gain: number;
  attack_range: number;
  move_speed: number;
  localized_name: string;
  pub_pick: number;
  pub_win: number;
  pub_pick_trend: number[];
  pub_win_trend: number[];
  pro_pick: number;
  pro_win: number;
  pro_ban: number;
  [key: string]: unknown;
}

interface RawItem {
  id: number;
  dname: string;
  cost: number;
  img: string;
  desc?: string;
  [key: string]: unknown;
}

interface PatchRow { hero_id: number; games: number; wins: number }
interface BanRow { hero_id: number; bans: number }
interface CountRow { n: number }
interface LaneRow { hero_id: number; lane_role: number; games: number }

const patchStatsSql = (from: number, to: number): string => `
  SELECT pm.hero_id, count(*)::int AS games,
    sum(CASE WHEN m.radiant_win = (pm.player_slot < 128) THEN 1 ELSE 0 END)::int AS wins
  FROM player_matches pm JOIN matches m ON pm.match_id = m.match_id
  WHERE m.start_time >= ${from} AND m.start_time < ${to}
  GROUP BY pm.hero_id`;

const banStatsSql = (from: number, to: number): string => `
  SELECT (x->>'hero_id')::int AS hero_id, count(*)::int AS bans
  FROM matches m, unnest(m.picks_bans) x
  WHERE m.start_time >= ${from} AND m.start_time < ${to}
    AND (x->>'is_pick')::boolean = false
  GROUP BY 1`;

const countSql = (from: number, to: number): string =>
  `SELECT count(*)::int AS n FROM matches WHERE start_time >= ${from} AND start_time < ${to}`;

const laneSql = (from: number): string => `
  SELECT pm.hero_id, pm.lane_role, count(*)::int AS games
  FROM player_matches pm JOIN matches m ON pm.match_id = m.match_id
  WHERE m.start_time >= ${from}
  GROUP BY 1, 2`;

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

async function fetchSnapshot(choice: PatchChoice, onProgress?: (text: string) => void): Promise<AppSnapshot> {
  const progress = (t: string) => onProgress?.(t);
  progress('Загрузка справочников OpenDota…');

  const [rawHeroes, rawItems, rawAbilityIds, rawAbilities, rawHeroAbilities, rawPatches] = await Promise.all([
    getJson<RawHeroStat[]>('/heroStats'),
    getJson<Record<string, RawItem>>('/constants/items'),
    getJson<Record<string, string>>('/constants/ability_ids'),
    getJson<Record<string, { dname?: string; desc?: string; img?: string }>>('/constants/abilities'),
    getJson<Record<string, { abilities: string[]; talents: { name: string; level: number }[] }>>('/constants/hero_abilities'),
    getJson<PatchInfo[]>('/constants/patch'),
  ]);

  const latestIndex = rawPatches.length - 1;
  const patchIndex = choice === 'previous' ? latestIndex - 1 : latestIndex;
  const patch = rawPatches[patchIndex];
  const previousPatch = rawPatches[patchIndex - 1] || rawPatches[patchIndex];
  const now = Math.floor(Date.now() / 1000);
  const from = Math.floor(new Date(patch.date).getTime() / 1000);
  const prevFrom = Math.floor(new Date(previousPatch.date).getTime() / 1000);
  const laneFrom = Math.floor(Date.now() / 1000) - 90 * 24 * 3600;

  progress('Подсчёт статистики за патч ' + patch.name + '…');
  const [curRows, prevRows, curBans, prevBans, curCount, prevCount, laneRows] = await Promise.all([
    explorerQuery<PatchRow>(patchStatsSql(from, now + 60)),
    explorerQuery<PatchRow>(patchStatsSql(prevFrom, from)),
    explorerQuery<BanRow>(banStatsSql(from, now + 60)),
    explorerQuery<BanRow>(banStatsSql(prevFrom, from)),
    explorerQuery<CountRow>(countSql(from, now + 60)),
    explorerQuery<CountRow>(countSql(prevFrom, from)),
    explorerQuery<LaneRow>(laneSql(laneFrom)),
  ]);

  const curMap = new Map(curRows.map((r) => [r.hero_id, r]));
  const prevMap = new Map(prevRows.map((r) => [r.hero_id, r]));
  const curBanMap = new Map(curBans.map((r) => [r.hero_id, r.bans]));
  const prevBanMap = new Map(prevBans.map((r) => [r.hero_id, r.bans]));
  const totalCur = num(curCount[0]?.n) || 1;
  const totalPrev = num(prevCount[0]?.n) || 1;

  const items: ItemInfo[] = Object.entries(rawItems)
    .filter(([, v]) => v && v.id !== undefined && v.dname)
    .map(([key, v]) => ({ id: v.id, key, name: v.dname, cost: num(v.cost), img: img(v.img), desc: v.desc }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const abilities: Record<string, AbilityInfo> = {};
  for (const [key, v] of Object.entries(rawAbilities)) {
    if (v && v.dname) abilities[key] = { key, name: v.dname, desc: v.desc || '', img: img(v.img || '') };
  }

  const ranksFor = (h: RawHeroStat): Record<number, RankStat> => {
    const result: Record<number, RankStat> = {};
    for (let r = 1; r <= 8; r++) {
      const pick = num(h[`${r}_pick`]);
      const win = num(h[`${r}_win`]);
      if (pick > 0) result[r] = { pick, win };
    }
    return result;
  };

  const totalPubPick = rawHeroes.reduce((sum, h) => sum + num(h.pub_pick), 0) || 1;

  // Lane positions are derived from real match data (lane_role), not guessed.
  const laneTotals = new Map<number, Map<number, number>>();
  for (const row of laneRows) {
    if (!laneTotals.has(row.hero_id)) laneTotals.set(row.hero_id, new Map());
    const lanes = laneTotals.get(row.hero_id)!;
    lanes.set(row.lane_role, (lanes.get(row.lane_role) || 0) + num(row.games));
  }
  const positionFor = (h: RawHeroStat): { position: HeroMeta['position']; positions: HeroMeta['positions'] } => {
    const lanes = laneTotals.get(h.id);
    const mainLane = lanes ? [...lanes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] : undefined;
    const isSupport = h.roles.includes('Support');
    let position: HeroMeta['position'];
    if (mainLane === 1) position = isSupport ? 'Hard Support' : 'Carry';
    else if (mainLane === 2) position = 'Mid';
    else if (mainLane === 3) position = isSupport ? 'Soft Support' : 'Offlane';
    else position = isSupport ? 'Hard Support' : 'Carry';
    const positions: HeroMeta['positions'] = [position];
    const secondLane = lanes ? [...lanes.entries()].sort((a, b) => b[1] - a[1])[1]?.[0] : undefined;
    if (secondLane !== undefined && secondLane !== mainLane) {
      const second: HeroMeta['position'] = secondLane === 2 ? 'Mid'
        : secondLane === 3 ? (isSupport ? 'Soft Support' : 'Offlane')
        : (isSupport ? 'Hard Support' : 'Carry');
      if (!positions.includes(second)) positions.push(second);
    }
    return { position, positions };
  };

  const heroes: HeroMeta[] = rawHeroes.map((h) => {
    const cur: PatchStat = {
      games: num(curMap.get(h.id)?.games),
      wins: num(curMap.get(h.id)?.wins),
      bans: num(curBanMap.get(h.id)),
    };
    const prev: PatchStat = {
      games: num(prevMap.get(h.id)?.games),
      wins: num(prevMap.get(h.id)?.wins),
      bans: num(prevBanMap.get(h.id)),
    };
    const curWin = cur.games ? cur.wins / cur.games : 0;
    const prevWin = prev.games ? prev.wins / prev.games : 0;
    const curPickRate = cur.games / totalCur;
    const prevPickRate = prev.games / totalPrev;
    const curBanRate = cur.bans / totalCur;
    const prevBanRate = prev.bans / totalPrev;

    const confidence: HeroMeta['confidence'] = cur.games >= 400 ? 'high' : cur.games >= 150 ? 'medium' : 'low';
    const trendWinRates = (h.pub_win_trend || []).map((w, i) => {
      const p = (h.pub_pick_trend || [])[i] || 0;
      return p > 0 ? w / p : 0;
    }).filter((v) => v > 0);
    const trendDelta = trendWinRates.length >= 2
      ? (trendWinRates[trendWinRates.length - 1] - trendWinRates[0]) * 100
      : 0;
    const pubWinRate = h.pub_pick ? h.pub_win / h.pub_pick : 0;
    const proWinRate = h.pro_pick ? h.pro_win / h.pro_pick : 0;
    const sampleWeight = Math.min(1, cur.games / 300);
    const efficiency =
      (pubWinRate - 0.5) * 100 * 0.8 +
      (proWinRate - 0.5) * 100 * (h.pro_pick > 20 ? 0.3 : 0.1) +
      (curWin - 0.5) * 100 * sampleWeight * 0.4 +
      curPickRate * 100 * 0.05;

    const tier: HeroMeta['tier'] = confidence === 'low'
      ? (efficiency >= 3 ? 'B' : efficiency >= 0 ? 'C' : 'D')
      : efficiency >= 7 ? 'S' : efficiency >= 3.5 ? 'A' : efficiency >= 0.8 ? 'B' : efficiency >= -1.5 ? 'C' : 'D';
    const winDelta = (curWin - prevWin) * 100;
    const movement: HeroMeta['movement'] = confidence === 'low' || !prev.games
      ? 'stable'
      : winDelta >= 3 ? 'strong-up' : winDelta >= 1 ? 'up' : winDelta <= -3 ? 'strong-down' : winDelta <= -1 ? 'down' : 'stable';

    const base: HeroBase = {
      id: h.id,
      name: h.name,
      localizedName: h.localized_name || h.name,
      primaryAttr: (['str', 'agi', 'int', 'all'].includes(h.primary_attr) ? h.primary_attr : 'all') as HeroBase['primaryAttr'],
      attackType: h.attack_type === 'Ranged' ? 'Ranged' : 'Melee',
      roles: h.roles || [],
      ...positionFor(h),
      img: img(h.img),
      icon: img(h.icon),
      baseHealth: num(h.base_health), baseMana: num(h.base_mana), baseArmor: num(h.base_armor),
      baseAttackMin: num(h.base_attack_min), baseAttackMax: num(h.base_attack_max),
      baseStr: num(h.base_str), baseAgi: num(h.base_agi), baseInt: num(h.base_int),
      strGain: num(h.str_gain), agiGain: num(h.agi_gain), intGain: num(h.int_gain),
      attackRange: num(h.attack_range), moveSpeed: num(h.move_speed),
    };

    return {
      ...base,
      pubPick: num(h.pub_pick),
      pubPickRate: num(h.pub_pick) / totalPubPick,
      pubWin: num(h.pub_win),
      pubPickTrend: Array.isArray(h.pub_pick_trend) ? h.pub_pick_trend : [],
      pubWinTrend: Array.isArray(h.pub_win_trend) ? h.pub_win_trend : [],
      proPick: num(h.pro_pick), proWin: num(h.pro_win), proBan: num(h.pro_ban),
      ranks: ranksFor(h),
      current: cur,
      previous: prev,
      currentWinRate: curWin,
      pubWinRate,
      previousWinRate: prevWin,
      pickRate: curPickRate,
      banRate: curBanRate,
      winDelta,
      trendDelta,
      pickDelta: (curPickRate - prevPickRate) * 100,
      banDelta: (curBanRate - prevBanRate) * 100,
      confidence,
      tier,
      efficiency,
      movement,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    patch,
    previousPatch,
    latestPatchName: rawPatches[latestIndex]?.name || patch.name,
    previousPatchName: rawPatches[latestIndex - 1]?.name || patch.name,
    heroes,
    items,
    abilities,
    heroAbilities: rawHeroAbilities || {},
    sources: [
      { name: 'OpenDota API — Hero stats', url: 'https://api.opendota.com/api/heroStats', description: 'Публичный винрейт/пикрейт по рангам и тренды.', retrievedAt: new Date().toISOString() },
      { name: 'OpenDota Explorer — Patch stats', url: 'https://api.opendota.com/api/explorer', description: 'Статистика побед, пиков и банов по патчам, сборки, скиллы и таланты.', retrievedAt: new Date().toISOString() },
      { name: 'OpenDota Constants', url: 'https://api.opendota.com/api/constants/', description: 'Справочники героев, предметов, способностей и талантов.', retrievedAt: new Date().toISOString() },
      { name: 'Valve Dota 2 CDN', url: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/', description: 'Официальные изображения героев и предметов.', retrievedAt: new Date().toISOString() },
    ] as DataSource[],
    matchSample: totalCur,
    previousMatchSample: totalPrev,
    comparisonReliable: totalCur >= 1000 && totalPrev >= 1000,
    stale: false,
  };
}

const cacheKey = (choice: PatchChoice): string => `snapshot_${choice}_v4`;

export async function bootstrap(choice: PatchChoice = 'latest', onProgress?: (text: string) => void): Promise<AppSnapshot> {
  const cached = readCache<AppSnapshot>(cacheKey(choice));
  if (cached && isFresh(cached, SNAPSHOT_TTL)) {
    onProgress?.('Данные из локального кэша');
    return { ...cached.data, stale: false };
  }
  try {
    const fresh = await fetchSnapshot(choice, onProgress);
    writeCache(cacheKey(choice), fresh);
    return fresh;
  } catch (error) {
    if (cached) {
      return {
        ...cached.data,
        stale: true,
        error: error instanceof Error ? error.message : String(error),
      };
    }
    throw error;
  }
}

export async function refresh(choice: PatchChoice = 'latest', onProgress?: (text: string) => void): Promise<AppSnapshot> {
  const fresh = await fetchSnapshot(choice, onProgress);
  writeCache(cacheKey(choice), fresh);
  return fresh;
}
