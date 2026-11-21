import { explorerQuery } from './apiClient';
import { readCache, writeCache, isFresh } from './cache';
import type {
  AppSnapshot, HeroBuild, ItemPick, SkillPick, TalentTier,
  TalentChoice, ItemInfo, AbilityInfo,
} from '../shared/types';

const BUILD_TTL = 4 * 60 * 60 * 1000;

interface BuildRow {
  item_0: number | null;
  item_1: number | null;
  item_2: number | null;
  item_3: number | null;
  item_4: number | null;
  item_5: number | null;
  purchase_log: { time: number; key: string }[] | null;
  ability_upgrades_arr: number[] | null;
  permanent_buffs: unknown;
}

const buildSql = (heroId: number, patchStart: number): string => `
  SELECT item_0, item_1, item_2, item_3, item_4, item_5,
         purchase_log, ability_upgrades_arr, permanent_buffs
  FROM player_matches
  WHERE hero_id = ${heroId}
    AND match_id IN (
      SELECT match_id FROM matches WHERE start_time >= ${patchStart}
      ORDER BY start_time DESC LIMIT 4000
    )
  LIMIT 120`;

type CounterMap = Map<string, { count: number; total: number }>;

function bump(map: CounterMap, key: string): void {
  if (!key) return;
  const entry = map.get(key) || { count: 0, total: 0 };
  entry.count += 1;
  map.set(key, entry);
}

function topItems(
  map: CounterMap,
  total: number,
  itemsByKey: Map<string, ItemInfo>
): ItemPick[] {
  return [...map.entries()]
    .filter(([key]) => !key.startsWith('recipe_'))
    .map(([key, v]) => {
      const item = itemsByKey.get(key);
      return {
        key,
        name: item?.name || key.replace(/_/g, ' '),
        img: item?.img || '',
        cost: item?.cost || 0,
        count: v.count,
        percent: total ? Math.round((v.count / total) * 100) : 0,
      };
    })
    .filter((x) => x.name)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 12);
}

function tierForLevel(level: number): number {
  if (level <= 13) return 10;
  if (level <= 18) return 15;
  if (level <= 23) return 20;
  return 25;
}

export async function getHeroBuild(
  heroId: number,
  snapshot: AppSnapshot,
  patchName: string,
  onProgress?: (text: string) => void
): Promise<HeroBuild> {
  const cacheName = `build_${patchName}_${heroId}`;
  const cached = readCache<HeroBuild>(cacheName);
  if (cached && isFresh(cached, BUILD_TTL)) return cached.data;

  onProgress?.('Сборка: загрузка матчей героя…');
  const patchStart = Math.floor(new Date(snapshot.patch.date).getTime() / 1000);
  let rows = await explorerQuery<BuildRow>(buildSql(heroId, patchStart));
  let patchOnly = true;
  if (rows.length < 12) {
    const fallbackFrom = Math.floor(Date.now() / 1000) - 30 * 24 * 3600;
    rows = await explorerQuery<BuildRow>(buildSql(heroId, fallbackFrom));
    patchOnly = false;
  }
  if (!rows.length) throw new Error('Недостаточно матчей для расчёта сборки этого героя.');

  const itemsByKey = new Map(snapshot.items.map((i) => [i.key, i]));
  const itemsById = new Map(snapshot.items.map((i) => [i.id, i.key]));
  const abilityIdMap: Record<string, string> = {};
  // ability ids come from constants; they are part of the snapshot abilities only by name,
  // so fetch the small id map once per process and cache it.
  const savedIds = readCache<Record<string, string>>('ability_ids');
  if (savedIds) Object.assign(abilityIdMap, savedIds.data);
  else {
    const { getJson } = await import('./apiClient');
    const ids = await getJson<Record<string, string>>('/constants/ability_ids');
    Object.assign(abilityIdMap, ids);
    writeCache('ability_ids', ids);
  }

  const start = new Map<string, { count: number; total: number }>();
  const early = new Map<string, { count: number; total: number }>();
  const mid = new Map<string, { count: number; total: number }>();
  const late = new Map<string, { count: number; total: number }>();
  const finals = new Map<string, { count: number; total: number }>();
  const skillCounts = new Map<number, CounterMap>();
  const skillPriority: CounterMap = new Map();
  const talentCounts = new Map<number, CounterMap>();

  for (const row of rows) {
    const seenStart = new Set<string>();
    const seenEarly = new Set<string>();
    const seenMid = new Set<string>();
    const seenLate = new Set<string>();
    for (const purchase of row.purchase_log || []) {
      if (!purchase || !purchase.key || purchase.key.startsWith('recipe_')) continue;
      const t = purchase.time;
      if (t <= 0) { if (!seenStart.has(purchase.key)) { bump(start, purchase.key); seenStart.add(purchase.key); } }
      else if (t <= 600) { if (!seenEarly.has(purchase.key)) { bump(early, purchase.key); seenEarly.add(purchase.key); } }
      else if (t <= 1500) { if (!seenMid.has(purchase.key)) { bump(mid, purchase.key); seenMid.add(purchase.key); } }
      else if (!seenLate.has(purchase.key)) { bump(late, purchase.key); seenLate.add(purchase.key); }
    }

    const seenFinal = new Set<string>();
    for (let i = 0; i <= 5; i++) {
      const id = row[`item_${i}` as keyof BuildRow] as number | null;
      if (!id) continue;
      const key = itemsById.get(id);
      if (key && !seenFinal.has(key)) { bump(finals, key); seenFinal.add(key); }
    }

    const upgrades = row.ability_upgrades_arr || [];
    upgrades.forEach((id, index) => {
      const name = abilityIdMap[String(id)];
      if (!name) return;
      const level = index + 1;
      if (!skillCounts.has(level)) skillCounts.set(level, new Map());
      bump(skillCounts.get(level)!, name);
      if (!name.startsWith('special_bonus') && name !== 'special_bonus_attributes') bump(skillPriority, name);
      if (name.startsWith('special_bonus_unique') || (name.startsWith('special_bonus') && level >= 10 && name !== 'special_bonus_attributes')) {
        const tier = tierForLevel(level);
        if (!talentCounts.has(tier)) talentCounts.set(tier, new Map());
        bump(talentCounts.get(tier)!, name);
      }
    });
  }

  const total = rows.length;
  const skillOrder = [...skillCounts.entries()]
    .sort((a, b) => a[0] - b[0])
    .slice(0, 30)
    .map(([level, counts]) => {
      const picks: SkillPick[] = [...counts.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 2)
        .map(([name, v]) => {
          const info: AbilityInfo | undefined = snapshot.abilities[name];
          return {
            key: name,
            name: info?.name || name.replace(/^special_bonus_unique_[^_]+_?/g, '').replace(/_/g, ' '),
            img: info?.img || '',
            count: v.count,
            percent: Math.round((v.count / total) * 100),
          };
        });
      return { level, picks };
    });

  const priority: SkillPick[] = [...skillPriority.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([name, v]) => {
      const info = snapshot.abilities[name];
      return {
        key: name, name: info?.name || name.replace(/_/g, ' '), img: info?.img || '',
        count: v.count, percent: Math.round((v.count / total) * 100),
      };
    });

  const heroKey = snapshot.heroes.find((h) => h.id === heroId)?.name || '';
  const talentMeta = snapshot.heroAbilities[heroKey]?.talents || [];
  const talents: TalentTier[] = [10, 15, 20, 25].map((level) => {
    const observed = talentCounts.get(level) || new Map();
    const tierIndex = level === 10 ? 1 : level === 15 ? 2 : level === 20 ? 3 : 4;
    const metaNames = talentMeta.filter((t) => t.level === tierIndex).map((t) => t.name);
    let names = new Set<string>([...observed.keys()]);
    metaNames.forEach((n) => names.add(n));
    if (metaNames.length) names = new Set([...names].filter((n) => metaNames.includes(n)));
    const choices: TalentChoice[] = [...names].map((name) => ({
      key: name,
      name: snapshot.abilities[name]?.name || name.replace(/_/g, ' '),
      count: observed.get(name)?.count || 0,
      percent: Math.round(((observed.get(name)?.count || 0) / total) * 100),
    })).sort((a, b) => b.count - a.count);
    return { level, choices };
  });

  const build: HeroBuild = {
    heroId,
    generatedAt: new Date().toISOString(),
    matchesAnalyzed: total,
    patchOnly,
    starting: topItems(start, total, itemsByKey),
    early: topItems(early, total, itemsByKey),
    mid: topItems(mid, total, itemsByKey),
    late: topItems(late, total, itemsByKey),
    finalItems: topItems(finals, total, itemsByKey),
    skillOrder,
    skillPriority: priority,
    talents,
  };
  writeCache(cacheName, build);
  return build;
}
