import React from 'react';

export type Tab = 'home' | 'heroes' | 'meta' | 'settings';

const items: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Мета', icon: <svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg> },
  { id: 'heroes', label: 'Герои', icon: <svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { id: 'meta', label: 'Анализ', icon: <svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 19V9m6 10V5m6 14v-7m4 7H2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { id: 'settings', label: 'Настройки', icon: <svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M19.4 15a1.7 1.7 0 00.34 1.88l.06.06a2 2 0 11-2.83 2.83l-.06-.06A1.7 1.7 0 0015 19.4a1.7 1.7 0 00-1 .6 1.7 1.7 0 00-.4 1.1V21a2 2 0 11-4 0v-.09A1.7 1.7 0 008.4 19.4a1.7 1.7 0 00-1.88.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.7 1.7 0 004.6 15a1.7 1.7 0 00-.6-1 1.7 1.7 0 00-1.1-.4H3a2 2 0 110-4h.09A1.7 1.7 0 004.6 8.4a1.7 1.7 0 00-.34-1.88l-.06-.06a2 2 0 112.83-2.83l.06.06A1.7 1.7 0 009 4.6h.09A1.7 1.7 0 0010 3.5V3a2 2 0 114 0v.09a1.7 1.7 0 001.6 1.51 1.7 1.7 0 001.88-.34l.06-.06a2 2 0 112.83 2.83l-.06.06A1.7 1.7 0 0019.4 9v.09a1.7 1.7 0 001.6 1.41H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.51.5z" fill="none" stroke="currentColor" strokeWidth="1.4"/></svg> },
];

export default function BottomNav({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => onTab(item.id)}>
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
