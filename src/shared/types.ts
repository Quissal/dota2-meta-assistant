export type Role = 'Carry' | 'Mid' | 'Offlane' | 'Soft Support' | 'Hard Support';
export type PatchChoice = 'latest' | 'previous';

export interface HeroBase {
  id: number;
  name: string; // npc_dota_hero_antimage
  localizedName: string;
  primaryAttr: 'str' | 'agi' | 'int' | 'all';
  attackType: 'Melee' | 'Ranged';
  roles: string[];
  position: Role;
  positions: Role[];
  img: string;
  icon: string;
  baseHealth: number;
  baseMana: number;
  baseArmor: number;
  baseAttackMin: number;
  baseAttackMax: number;
  baseStr: number;
  baseAgi: number;
  baseInt: number;
  strGain: number;
  agiGain: number;
  intGain: number;
  attackRange: number;
  moveSpeed: number;
}

export interface RankStat {
  pick: number;
  win: number;
}

export interface PatchStat {
  games: number;
  wins: number;
  bans: number;
}

export interface HeroMeta extends HeroBase {
  pubPick: number;
  pubPickRate: number;
  pubWin: number;
  pubPickTrend: number[];
  pubWinTrend: number[];
  proPick: number;
  proWin: number;
  proBan: number;
  ranks: Record<number, RankStat>;
  current: PatchStat;
  previous: PatchStat;
  currentWinRate: number;
  pubWinRate: number;
  previousWinRate: number;
  pickRate: number;
  banRate: number;
  winDelta: number;
  trendDelta: number;
  pickDelta: number;
  banDelta: number;
  confidence: 'high' | 'medium' | 'low';
  tier: 'S' | 'A' | 'B' | 'C' | 'D';
  efficiency: number;
  movement: 'strong-up' | 'up' | 'stable' | 'down' | 'strong-down';
}

export interface PatchInfo {
  name: string;
  date: string;
  id: number;
}

export interface ItemInfo {
  id: number;
  key: string;
  name: string;
  cost: number;
  img: string;
  desc?: string;
}

export interface AbilityInfo {
  key: string;
  name: string;
  desc: string;
  img: string;
}

export interface DataSource {
  name: string;
  url: string;
  description: string;
  retrievedAt: string;
}

export interface AppSnapshot {
  generatedAt: string;
  patch: PatchInfo;
  previousPatch: PatchInfo;
  latestPatchName: string;
  previousPatchName: string;
  heroes: HeroMeta[];
  items: ItemInfo[];
  abilities: Record<string, AbilityInfo>;
  heroAbilities: Record<string, { abilities: string[]; talents: { name: string; level: number }[] }>;
  sources: DataSource[];
  matchSample: number;
  previousMatchSample: number;
  comparisonReliable: boolean;
  stale: boolean;
  error?: string;
}

export interface ItemPick {
  key: string;
  name: string;
  img: string;
  cost: number;
  count: number;
  percent: number;
}

export interface SkillPick {
  key: string;
  name: string;
  img: string;
  count: number;
  percent: number;
}

export interface TalentChoice {
  key: string;
  name: string;
  count: number;
  percent: number;
}

export interface TalentTier {
  level: number;
  choices: TalentChoice[];
}

export interface HeroBuild {
  heroId: number;
  generatedAt: string;
  matchesAnalyzed: number;
  patchOnly: boolean;
  starting: ItemPick[];
  early: ItemPick[];
  mid: ItemPick[];
  late: ItemPick[];
  finalItems: ItemPick[];
  skillOrder: { level: number; picks: SkillPick[] }[];
  skillPriority: SkillPick[];
  talents: TalentTier[];
}

export interface Matchup {
  heroId: number;
  name: string;
  games: number;
  winRate: number;
}

export interface MatchupSet {
  heroId: number;
  generatedAt: string;
  patchOnly: boolean;
  best: Matchup[];
  worst: Matchup[];
  sample: number;
}

export interface CacheInfo {
  files: { name: string; size: number; updatedAt: string }[];
  totalSize: number;
  path: string;
}
