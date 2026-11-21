import React from 'react';
import type { AppSnapshot } from '../../shared/types';
import { formatDate } from '../utils';

interface Props {
  snapshot: AppSnapshot | null;
  search: string;
  onSearch: (v: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  progress: string;
  onSettings: () => void;
  onTogglePatch: () => void;
}

export default function TopBar({ snapshot, search, onSearch, onRefresh, refreshing, progress, onSettings, onTogglePatch }: Props) {
  return (
    <header className="topbar">
      <div className="search-box">
        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Поиск героя…"
          aria-label="Поиск героя"
        />
      </div>

      <div className="topbar-right">
        {snapshot && (
          <button className="patch-chip" onClick={onTogglePatch} title={`Обновлено: ${formatDate(snapshot.generatedAt)}. Нажмите, чтобы переключить патч.`}>
            <span className="dot" /> Патч {snapshot.patch.name} <span className="patch-arrow">▾</span>
          </button>
        )}
        <button className="icon-btn" onClick={onRefresh} disabled={refreshing} title="Обновить данные">
          <svg viewBox="0 0 24 24" width="18" height="18" className={refreshing ? 'spin' : ''}><path d="M20 12a8 8 0 10-2.34 5.66M20 12V7m0 5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button className="icon-btn" onClick={onSettings} title="Настройки">
          <svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M19.4 15a1.7 1.7 0 00.34 1.88l.06.06a2 2 0 11-2.83 2.83l-.06-.06A1.7 1.7 0 0015 19.4a1.7 1.7 0 00-1 .6 1.7 1.7 0 00-.4 1.1V21a2 2 0 11-4 0v-.09A1.7 1.7 0 008.4 19.4a1.7 1.7 0 00-1.88.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.7 1.7 0 004.6 15a1.7 1.7 0 00-.6-1 1.7 1.7 0 00-1.1-.4H3a2 2 0 110-4h.09A1.7 1.7 0 004.6 8.4a1.7 1.7 0 00-.34-1.88l-.06-.06a2 2 0 112.83-2.83l.06.06A1.7 1.7 0 009 4.6h.09A1.7 1.7 0 0010 3.5V3a2 2 0 114 0v.09a1.7 1.7 0 001.6 1.51 1.7 1.7 0 001.88-.34l.06-.06a2 2 0 112.83 2.83l-.06.06A1.7 1.7 0 0019.4 9v.09a1.7 1.7 0 001.6 1.41H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.51.5z" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
        </button>
        <div className="window-controls">
          <button onClick={() => window.api.minimize()} title="Свернуть">−</button>
          <button onClick={() => window.api.maximize()} title="Развернуть">▢</button>
          <button className="close" onClick={() => window.api.close()} title="Закрыть">×</button>
        </div>
      </div>
      {refreshing && <div className="progress-toast">{progress || 'Обновление…'}</div>}
    </header>
  );
}
