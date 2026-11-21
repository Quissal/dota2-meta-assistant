import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppSnapshot, PatchChoice } from '../shared/types';
import TopBar from './components/TopBar';
import BottomNav, { type Tab } from './components/BottomNav';
import HomeScreen from './screens/HomeScreen';
import HeroesScreen from './screens/HeroesScreen';
import HeroDetailScreen from './screens/HeroDetailScreen';
import MetaAnalysisScreen from './screens/MetaAnalysisScreen';
import SettingsScreen from './screens/SettingsScreen';
import { formatDate } from './utils';

export default function App() {
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [tab, setTab] = useState<Tab>('home');
  const [heroId, setHeroId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [patchChoice, setPatchChoice] = useState<PatchChoice>(() =>
    (localStorage.getItem('dota2-patch-choice') as PatchChoice) || 'latest'
  );

  useEffect(() => {
    const off = window.api.onProgress(setProgress);
    setLoading(true);
    window.api.bootstrap(patchChoice)
      .then((data) => { setSnapshot(data); setError(null); })
      .catch((e) => setError(e.message || String(e)))
      .finally(() => { setLoading(false); setProgress(''); });
    return off;
  }, [patchChoice]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await window.api.refresh(patchChoice);
      setSnapshot(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
      setProgress('');
    }
  }, [patchChoice]);

  const hero = useMemo(
    () => (heroId !== null ? snapshot?.heroes.find((h) => h.id === heroId) : undefined),
    [heroId, snapshot]
  );

  const selectHero = (id: number) => { setHeroId(id); setSearch(''); };

  const changePatch = (choice: PatchChoice) => {
    if (choice === patchChoice) return;
    localStorage.setItem('dota2-patch-choice', choice);
    setHeroId(null);
    setPatchChoice(choice);
  };

  return (
    <div className="app">
      <TopBar
        snapshot={snapshot}
        search={search}
        onSearch={(v) => { setSearch(v); if (v) setHeroId(null); }}
        onRefresh={refresh}
        refreshing={refreshing}
        progress={progress}
        onSettings={() => { setHeroId(null); setTab('settings'); }}
        onTogglePatch={() => changePatch(patchChoice === 'latest' ? 'previous' : 'latest')}
      />

      <main className="content">
        {loading && (
          <div className="splash">
            <div className="logo-mark">D2</div>
            <h1>Dota 2 Meta Assistant</h1>
            <p>{progress || 'Подключение к OpenDota…'}</p>
            <div className="spinner" />
          </div>
        )}

        {!loading && error && !snapshot && (
          <div className="splash error-state">
            <h1>Не удалось загрузить данные</h1>
            <p>{error}</p>
            <p className="muted">Проверьте подключение к интернету. OpenDota — публичный API.</p>
            <button className="primary-btn" onClick={refresh}>Повторить</button>
          </div>
        )}

        {snapshot && hero && (
          <HeroDetailScreen hero={hero} snapshot={snapshot} onBack={() => setHeroId(null)} onSelect={selectHero} />
        )}

        {snapshot && !hero && tab === 'home' && <HomeScreen snapshot={snapshot} onSelect={selectHero} search={search} />}
        {snapshot && !hero && tab === 'heroes' && <HeroesScreen snapshot={snapshot} onSelect={selectHero} search={search} onSearch={setSearch} />}
        {snapshot && !hero && tab === 'meta' && <MetaAnalysisScreen snapshot={snapshot} onSelect={selectHero} search={search} />}
        {snapshot && !hero && tab === 'settings' && (
          <SettingsScreen
            snapshot={snapshot}
            onRefresh={refresh}
            refreshing={refreshing}
            patchChoice={patchChoice}
            onPatchChange={changePatch}
          />
        )}
      </main>

      <BottomNav tab={tab} onTab={(t) => { setHeroId(null); setTab(t); }} />
    </div>
  );
}
