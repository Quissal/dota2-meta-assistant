import React, { useMemo, useState } from 'react';
import type { AppSnapshot } from '../../shared/types';
import HeroCard from '../components/HeroCard';
import { normalizeSearch, ROLES, ROLE_LABELS } from '../utils';

interface Props {
  snapshot: AppSnapshot;
  onSelect: (id: number) => void;
  search: string;
  onSearch: (v: string) => void;
}

export default function HeroesScreen({ snapshot, onSelect, search, onSearch }: Props) {
  const [role, setRole] = useState('all');
  const [sort, setSort] = useState('efficiency');

  const list = useMemo(() => {
    const q = normalizeSearch(search);
    return snapshot.heroes.filter((h) => {
      if (q && !h.localizedName.toLowerCase().includes(q) && !h.name.toLowerCase().includes(q)) return false;
      if (role !== 'all' && h.position !== role) return false;
      return true;
    }).sort((a, b) => {
      if (sort === 'win') return b.pubWinRate - a.pubWinRate;
      if (sort === 'pick') return b.pubPickRate - a.pubPickRate;
      if (sort === 'delta') return b.winDelta - a.winDelta;
      if (sort === 'name') return a.localizedName.localeCompare(b.localizedName);
      return b.efficiency - a.efficiency;
    });
  }, [snapshot.heroes, search, role, sort]);

  return (
    <div className="screen">
      <div className="page-head">
        <div><h1>Каталог героев</h1><p>{snapshot.heroes.length} героев · патч {snapshot.patch.name} · данные OpenDota</p></div>
        <div className="head-search">
          <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Найти героя…" />
        </div>
      </div>

      <div className="filter-bar">
        <div className="chips">
          <button className={role === 'all' ? 'chip active' : 'chip'} onClick={() => setRole('all')}>Все</button>
          {ROLES.map((r) => <button key={r} className={role === r ? 'chip active' : 'chip'} onClick={() => setRole(r)}>{ROLE_LABELS[r]}</button>)}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="efficiency">По эффективности</option>
          <option value="win">По винрейту</option>
          <option value="pick">По пикрейту</option>
          <option value="delta">По изменению</option>
          <option value="name">По имени</option>
        </select>
        <span className="filter-count">{list.length}</span>
      </div>

      <div className="card-grid large">
        {list.map((h) => <HeroCard key={h.id} hero={h} onSelect={onSelect} />)}
      </div>
      {!list.length && <div className="empty">Герои не найдены</div>}
    </div>
  );
}
