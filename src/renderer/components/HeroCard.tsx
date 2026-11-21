import React from 'react';
import type { HeroMeta } from '../../shared/types';
import { ATTR_COLORS, pct, pp, ROLE_ICONS, ROLE_LABELS, tierColor } from '../utils';

interface Props {
  hero: HeroMeta;
  onSelect: (id: number) => void;
  compact?: boolean;
  rank?: number;
}

export default function HeroCard({ hero, onSelect, compact = false, rank }: Props) {
  return (
    <button className={`hero-card ${compact ? 'compact' : ''}`} onClick={() => onSelect(hero.id)}>
      <div className="hero-card-image" style={{ borderColor: ATTR_COLORS[hero.primaryAttr] }}>
        <img src={hero.img} alt={hero.localizedName} loading="lazy" />
        <span className="tier-badge" style={{ background: tierColor(hero.tier) }}>{hero.tier}</span>
        {rank !== undefined && <span className="rank-badge">#{rank}</span>}
      </div>
      <div className="hero-card-body">
        <div className="hero-card-name">{hero.localizedName}</div>
        <div className="hero-card-role">
          <span>{ROLE_ICONS[hero.position] || '◆'}</span> {ROLE_LABELS[hero.position] || hero.position}
        </div>
        <div className="hero-card-stats">
          <div><span className="stat-label">WIN</span><b>{pct(hero.pubWinRate)}</b></div>
          <div><span className="stat-label">PICK</span><b>{pct(hero.pubPickRate)}</b></div>
        </div>
        <div className={`delta ${hero.trendDelta >= 0 ? 'positive' : 'negative'}`}>{pp(hero.trendDelta)} тренд 7 дней</div>
      </div>
    </button>
  );
}
