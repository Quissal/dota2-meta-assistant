import React, { useMemo, useState } from 'react';
import type { AppSnapshot, HeroMeta } from '../../shared/types';
import HeroCard from '../components/HeroCard';
import { ATTR_COLORS, compact, formatDate, normalizeSearch, pct, pp, ROLE_ICONS, ROLE_LABELS, ROLES, tierColor } from '../utils';

interface Props {
  snapshot: AppSnapshot;
  onSelect: (id: number) => void;
  search: string;
}

export default function HomeScreen({ snapshot, onSelect, search }: Props) {
  const [role, setRole] = useState<string>('all');
  const [rank, setRank] = useState<string>('all');
  const [minWin, setMinWin] = useState('0');
  const [minPick, setMinPick] = useState('0');
  const [sort, setSort] = useState<'efficiency' | 'win' | 'pick'>('efficiency');

  const heroes = snapshot.heroes;
  const top = useMemo(() => [...heroes].sort((a, b) => b.efficiency - a.efficiency).slice(0, 6), [heroes]);
  const risers = useMemo(() => [...heroes].filter((h) => h.trendDelta !== 0).sort((a, b) => b.trendDelta - a.trendDelta).slice(0, 6), [heroes]);
  const fallers = useMemo(() => [...heroes].filter((h) => h.trendDelta !== 0).sort((a, b) => a.trendDelta - b.trendDelta).slice(0, 6), [heroes]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(search);
    return heroes.filter((h) => {
      if (q && !h.localizedName.toLowerCase().includes(q) && !h.name.toLowerCase().includes(q)) return false;
      if (role !== 'all' && h.position !== role) return false;
      if (minWin && h.currentWinRate * 100 < Number(minWin)) return false;
      if (minPick && h.pickRate * 100 < Number(minPick)) return false;
      if (rank !== 'all' && !h.ranks[Number(rank)]) return false;
      return true;
    }).sort((a, b) => {
      if (sort === 'win') return b.pubWinRate - a.pubWinRate;
      if (sort === 'pick') return b.pubPickRate - a.pubPickRate;
      return b.efficiency - a.efficiency;
    });
  }, [heroes, search, role, rank, minWin, minPick, sort]);

  const byRole = (r: string): HeroMeta[] => heroes.filter((h) => h.position === r).sort((a, b) => b.efficiency - a.efficiency).slice(0, 5);

  return (
    <div className="screen home">
      <section className="hero-banner">
        <div className="banner-glow" />
        <div className="banner-content">
          <div className="eyebrow">АКТУАЛЬНАЯ МЕТА · OPEN DOTA DATA</div>
          <h1>Патч <span>{snapshot.patch.name}</span></h1>
          <p>Анализ сильнейших героев, сборок и изменений меты на основе реальных матчей.</p>
          <div className="banner-chips">
            <span>Обновлено: {formatDate(snapshot.generatedAt)}</span>
            <span>Предыдущий патч: {snapshot.previousPatch.name}</span>
          </div>
        </div>
        <div className="banner-stats">
          <div className="big-stat"><b>{compact(snapshot.matchSample)}</b><span>матчей в выборке {snapshot.patch.name}</span></div>
          <div className="big-stat"><b>{heroes.length}</b><span>героев в каталоге</span></div>
          <div className="big-stat"><b>{compact(snapshot.previousMatchSample)}</b><span>матчей {snapshot.previousPatch.name}</span></div>
        </div>
      </section>

      {snapshot.stale && (
        <div className="warning-banner">⚠ Нет связи с OpenDota. Показаны последние сохранённые данные от {formatDate(snapshot.generatedAt)}.</div>
      )}
      {!snapshot.comparisonReliable && (
        <div className="warning-banner">⚠ Патч {snapshot.patch.name} вышел недавно: в открытой базе всего {compact(snapshot.matchSample)} про-матчей. Сравнение с патчем {snapshot.previousPatch.name} в разделе «Анализ» предварительное; списки роста/падения ниже построены по 7-дневному тренду OpenDota.</div>
      )}

      <section>
        <div className="section-head"><h2>Сильнейшие герои</h2><span>по эффективности с учётом выборки</span></div>
        <div className="card-grid">
          {top.map((h, i) => <HeroCard key={h.id} hero={h} rank={i + 1} onSelect={onSelect} />)}
        </div>
      </section>

      <section className="two-col">
        <div>
          <div className="section-head"><h2>Выросли после патча</h2><span>тренд винрейта за 7 дней</span></div>
          <div className="move-list">
            {risers.map((h) => <MoveRow key={h.id} hero={h} onSelect={onSelect} />)}
          </div>
        </div>
        <div>
          <div className="section-head"><h2>Потеряли эффективность</h2><span>тренд винрейта за 7 дней</span></div>
          <div className="move-list">
            {fallers.map((h) => <MoveRow key={h.id} hero={h} onSelect={onSelect} />)}
          </div>
        </div>
      </section>

      <section>
        <div className="section-head"><h2>Популярные по позициям</h2><span>топ-5 каждой роли</span></div>
        <div className="role-columns">
          {ROLES.map((r) => (
            <div className="role-col" key={r}>
              <div className="role-col-title"><span>{ROLE_ICONS[r]}</span> {ROLE_LABELS[r]}</div>
              {byRole(r).map((h) => (
                <button key={h.id} className="role-row" onClick={() => onSelect(h.id)}>
                  <img src={h.icon} alt="" loading="lazy" />
                  <span>{h.localizedName}</span>
                  <b style={{ color: h.winDelta >= 0 ? '#7bc86c' : '#e06a6a' }}>{pct(h.pubWinRate)}</b>
                </button>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="section-head"><h2>Рейтинг героев</h2><span>фильтры и сортировка</span></div>
        <div className="filter-bar">
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="all">Все позиции</option>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <select value={rank} onChange={(e) => setRank(e.target.value)}>
            <option value="all">Все ранги</option>
            <option value="8">Immortal</option><option value="7">Divine</option><option value="6">Ancient</option>
            <option value="5">Legend</option><option value="4">Archon</option><option value="3">Crusader</option>
            <option value="2">Guardian</option><option value="1">Herald</option>
          </select>
          <input type="number" placeholder="Мин. винрейт %" value={minWin} onChange={(e) => setMinWin(e.target.value)} />
          <input type="number" placeholder="Мин. пикрейт %" value={minPick} onChange={(e) => setMinPick(e.target.value)} />
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="efficiency">По эффективности</option><option value="win">По винрейту</option><option value="pick">По пикрейту</option>
          </select>
          <span className="filter-count">{filtered.length} героев</span>
        </div>
        <div className="table-wrap">
          <table className="meta-table">
            <thead><tr><th>Герой</th><th>Позиция</th><th>Тир</th><th>Винрейт (публ.)</th><th>Пикрейт (публ.)</th><th>Банрейт патча</th><th>Δ патча</th><th>Эффективность</th></tr></thead>
            <tbody>
              {filtered.slice(0, 40).map((h) => (
                <tr key={h.id} onClick={() => onSelect(h.id)}>
                  <td><div className="table-hero"><img src={h.icon} alt="" loading="lazy" /><span>{h.localizedName}</span></div></td>
                  <td>{ROLE_LABELS[h.position] || h.position}</td>
                  <td><span className="tier-mini" style={{ background: tierColor(h.tier) }}>{h.tier}</span></td>
                  <td>{pct(h.pubWinRate)}</td>
                  <td>{pct(h.pubPickRate)}</td>
                  <td>{pct(h.banRate)}</td>
                  <td className={h.winDelta >= 0 ? 'pos' : 'neg'}>{pp(h.winDelta)}</td>
                  <td>{h.efficiency.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MoveRow({ hero, onSelect }: { hero: HeroMeta; onSelect: (id: number) => void }) {
  return (
    <button className="move-row" onClick={() => onSelect(hero.id)}>
      <img src={hero.icon} alt="" loading="lazy" />
      <div className="move-name"><b>{hero.localizedName}</b><span style={{ color: ATTR_COLORS[hero.primaryAttr] }}>{hero.trendDelta >= 0 ? 'Тренд вверх' : 'Тренд вниз'}</span></div>
      <div className="move-values"><span>{pct(hero.pubWinRate)}</span><b className={hero.trendDelta >= 0 ? 'pos' : 'neg'}>{pp(hero.trendDelta)}</b></div>
    </button>
  );
}
