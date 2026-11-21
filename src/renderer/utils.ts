import type { HeroMeta, Role } from '../shared/types';

const RU_TO_EN: Record<string, string> = {
  'й':'q','ц':'w','у':'e','к':'r','е':'t','н':'y','г':'u','ш':'i','щ':'o','з':'p','х':'[','ъ':']',
  'ф':'a','ы':'s','в':'d','а':'f','п':'g','р':'h','о':'j','л':'k','д':'l','э':"'",'я':'z',
  'ч':'x','с':'c','м':'v','и':'b','т':'n','ь':'m','б':',','ю':'.','ё':'`',
};

/** Allows typing Latin hero names while the Windows keyboard layout is Russian. */
export function normalizeSearch(value: string): string {
  let result = '';
  for (const char of value.toLowerCase().trim()) result += RU_TO_EN[char] ?? char;
  return result;
}

export const ROLES: Role[] = ['Carry', 'Mid', 'Offlane', 'Soft Support', 'Hard Support'];

export const ROLE_LABELS: Record<string, string> = {
  Carry: 'Керри', Mid: 'Мид', Offlane: 'Оффлейн',
  'Soft Support': 'Мисаппорт', 'Hard Support': 'Хардсаппорт',
};

export const ROLE_ICONS: Record<string, string> = {
  Carry: '⚔', Mid: '✦', Offlane: '🛡', 'Soft Support': '✚', 'Hard Support': '✝',
};

export const ATTR_COLORS: Record<string, string> = {
  str: '#e0574b', agi: '#7bc86c', int: '#5aa9e6', all: '#c58cf0',
};

export const ATTR_LABELS: Record<string, string> = {
  str: 'Сила', agi: 'Ловкость', int: 'Интеллект', all: 'Универсал',
};

export function pct(v: number, digits = 1): string {
  return `${(v * 100).toFixed(digits)}%`;
}

export function pp(v: number, digits = 1): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(digits)} п.п.`;
}

export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export function heroRole(hero: HeroMeta): string {
  for (const r of ROLES) if (hero.roles.includes(r)) return r;
  return hero.roles[0] || '';
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export function movementLabel(m: HeroMeta['movement']): string {
  return {
    'strong-up': 'Сильно усилился', up: 'Усилился', stable: 'Без изм.',
    down: 'Ослаб', 'strong-down': 'Сильно ослаб',
  }[m];
}

export function tierColor(tier: string): string {
  return { S: '#e5b567', A: '#7bc86c', B: '#5aa9e6', C: '#9aa2ad', D: '#cf6a6a' }[tier] || '#9aa2ad';
}
