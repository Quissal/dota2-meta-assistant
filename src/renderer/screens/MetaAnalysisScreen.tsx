import React, { useMemo, useState } from 'react';
import type { AppSnapshot, HeroMeta } from '../../shared/types';
import { ATTR_COLORS, compact, formatDate, normalizeSearch, pct, pp, tierColor } from '../utils';

interface Props {
  snapshot: AppSnapshot;
  onSelect: (id: number) => void;
  search: string;
}

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'strong-up', label: 'Сильно усилились' },
  { id: 'up', label: 'Усилились' },
  { id: 'stable', label: 'Без изменений' },
  { id: 'down', label: 'Ослабли' },
  { id: 'strong-down', label: 'Сильно ослабли' },
];

export default function MetaAnalysisScreen({ snapshot, onSelect, search }: Props) {
  const [cat, setCat] = useState('all');
  const [minGames, setMinGames] = useState(snapshot.comparisonReliable);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, 'strong-up': 0, up: 0, stable: 0, down: 0, 'strong-down': 0 };
    snapshot.heroes.forEach((h) => { c.all++; c[h.movement]++; });
    return c;
  }, [snapshot.heroes]);

  const list = useMemo(() => {
    const q = normalizeSearch(search);
    return snapshot.heroes.filter((h) => {
      if (cat !== 'all' && h.movement !== cat) return false;
      if (minGames && h.confidence === 'low') return false;
      if (q && !h.localizedName.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => b.winDelta - a.winDelta);
  }, [snapshot.heroes, cat, minGames, search]);

  return (
    <div className="screen">
      <div className="page-head">
        <div><h1>Анализ изменений меты</h1><p>{snapshot.previousPatch.name} → {snapshot.patch.name} · реальные матчи OpenDota</p></div>
      </div>

      <section className="compare-banner">
        <div className="compare-patch"><span>БЫЛО</span><b>{snapshot.previousPatch.name}</b><small>{formatDate(snapshot.previousPatch.date)}</small><small>{compact(snapshot.previousMatchSample)} матчей</small></div>
        <div className="compare-arrow">→</div>
        <div className="compare-patch current"><span>СТАЛО</span><b>{snapshot.patch.name}</b><small>{formatDate(snapshot.patch.date)}</small><small>{compact(snapshot.matchSample)} матчей</small></div>
      </section>

      {!snapshot.comparisonReliable && (
        <div className="warning-banner">⚠ В открытой базе OpenDota по патчу {snapshot.patch.name} всего {compact(snapshot.matchSample)} матчей против {compact(snapshot.previousMatchSample)} в патче {snapshot.previousPatch.name}. Сравнение предварительное: категории «усилился/ослаб» для большинства героев отмечены как «стабилен» из-за малой выборки. Данные не подменяются — это реальная статистика с указанием объёма.</div>
      )}
      <div className="note">
        Изменения считаются только при достаточном количестве матчей (по умолчанию ≥ 150).
        Герой не называется сильнее или слабее только по одному показателю: учитываются винрейт, пикрейт и банрейт.
        Данные патча {snapshot.patch.name} получены {formatDate(snapshot.generatedAt)} из OpenDota Explorer.
      </div>

      <div className="filter-bar">
        <div className="chips">
          {CATEGORIES.map((c) => <button key={c.id} className={cat === c.id ? 'chip active' : 'chip'} onClick={() => setCat(c.id)}>
            {c.label} <small>{counts[c.id]}</small>
          </button>)}
        </div>
        <label className="check"><input type="checkbox" checked={minGames} onChange={(e) => setMinGames(e.target.checked)} /> только достоверные</label>
      </div>

      <div className="table-wrap">
        <table className="meta-table compare-table">
          <thead><tr>
            <th>Герой</th><th>WIN {snapshot.previousPatch.name}</th><th>WIN {snapshot.patch.name}</th><th>Δ WIN</th>
            <th>Δ PICK</th><th>Δ BAN</th><th>Выборка</th><th>Статус</th>
          </tr></thead>
          <tbody>
            {list.map((h: HeroMeta) => (
              <tr key={h.id} onClick={() => onSelect(h.id)}>
                <td><div className="table-hero"><img src={h.icon} alt="" loading="lazy" />
                  <span>{h.localizedName}</span><i className="attr-dot" style={{ background: ATTR_COLORS[h.primaryAttr] }} />
                  <span className="tier-mini" style={{ background: tierColor(h.tier) }}>{h.tier}</span>
                </div></td>
                <td>{pct(h.previousWinRate)}</td>
                <td>{h.confidence === 'low' ? '—' : pct(h.currentWinRate)}</td>
                <td className={h.winDelta >= 0 ? 'pos' : 'neg'}>{h.confidence === 'low' ? '—' : pp(h.winDelta)}</td>
                <td className={h.pickDelta >= 0 ? 'pos' : 'neg'}>{h.confidence === 'low' ? '—' : pp(h.pickDelta)}</td>
                <td className={h.banDelta >= 0 ? 'pos' : 'neg'}>{h.confidence === 'low' ? '—' : pp(h.banDelta)}</td>
                <td>{compact(h.current.games)}</td>
                <td><span className={`status ${h.movement}`}>{h.confidence === 'low'
                  ? 'Недостаточно данных'
                  : {
                    'strong-up': 'Сильно усилился', up: 'Усилился', stable: 'Стабилен',
                    down: 'Ослаб', 'strong-down': 'Сильно ослаб',
                  }[h.movement]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!list.length && <div className="empty">Нет героев в этой категории</div>}
    </div>
  );
}
