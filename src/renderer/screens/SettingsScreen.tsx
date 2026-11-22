import React, { useEffect, useState } from 'react';
import type { AppSnapshot, CacheInfo, PatchChoice } from '../../shared/types';
import { compact, formatDate } from '../utils';

interface Props {
  snapshot: AppSnapshot | null;
  onRefresh: () => void;
  refreshing: boolean;
  patchChoice: PatchChoice;
  onPatchChange: (choice: PatchChoice) => void;
}

export default function SettingsScreen({ snapshot, onRefresh, refreshing, patchChoice, onPatchChange }: Props) {
  const [cache, setCache] = useState<CacheInfo | null>(null);
  const [cleared, setCleared] = useState(false);
  const [password, setPassword] = useState('');
  const [secretMessage, setSecretMessage] = useState('');

  const trySecret = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    const result = await window.api.launchSecret(password);
    setSecretMessage(result.ok
      ? 'Запущено'
      : result.reason === 'launch'
        ? `Не удалось запустить: ${result.error || 'неизвестная ошибка'}`
        : 'Неверный пароль');
    setPassword('');
  };

  const load = () => window.api.cacheInfo().then(setCache).catch(() => undefined);
  useEffect(() => { void load(); }, []);

  const clear = async () => {
    await window.api.clearCache();
    setCleared(true);
    await load();
    setTimeout(() => setCleared(false), 3000);
  };

  return (
    <div className="screen">
      <div className="page-head"><div><h1>Настройки и данные</h1><p>Источники, обновление и локальный кэш</p></div></div>

      <section>
        <div className="section-head"><h2>Активный патч</h2><span>переключение между последним и предыдущим</span></div>
        <div className="patch-switch">
          {(['latest', 'previous'] as PatchChoice[]).map((choice) => {
            const target = choice === 'latest'
              ? snapshot?.latestPatchName
              : snapshot?.previousPatchName;
            return (
              <button
                key={choice}
                className={patchChoice === choice ? 'active' : ''}
                onClick={() => onPatchChange(choice)}
              >
                <b>{target || (choice === 'latest' ? 'Последний' : 'Предыдущий')}</b>
                <span>{choice === 'latest' ? 'Последний патч · меньше матчей, данные свежие' : 'Предыдущий патч · больше матчей, стабильнее статистика'}</span>
              </button>
            );
          })}
        </div>
        <div className="note">Переключение загружает отдельный набор данных из OpenDota и сохраняет его в кэше. Настройка запоминается между запусками.</div>
      </section>

      <section className="two-col">
        <div className="panel">
          <h3>Обновление данных</h3>
          <div className="setting-row"><span>Текущий патч</span><b>{snapshot?.patch.name || '—'}</b></div>
          <div className="setting-row"><span>Последнее обновление</span><b>{snapshot ? formatDate(snapshot.generatedAt) : '—'}</b></div>
          <div className="setting-row"><span>Матчей в выборке</span><b>{snapshot ? compact(snapshot.matchSample) : '—'}</b></div>
          <div className="setting-row"><span>Состояние</span><b className={snapshot?.stale ? 'neg' : 'pos'}>{snapshot?.stale ? 'Устаревшие данные (offline)' : 'Актуально'}</b></div>
          <button className="primary-btn" onClick={onRefresh} disabled={refreshing}>{refreshing ? 'Обновление…' : 'Обновить данные вручную'}</button>
          <p className="hint">Приложение проверяет данные при запуске и использует локальный кэш, если интернет недоступен.</p>
        </div>

        <div className="panel">
          <h3>Локальный кэш</h3>
          <div className="setting-row"><span>Размер кэша</span><b>{cache ? `${(cache.totalSize / 1024 / 1024).toFixed(2)} МБ` : '—'}</b></div>
          <div className="setting-row"><span>Файлов</span><b>{cache?.files.length ?? '—'}</b></div>
          <div className="setting-row"><span>Путь</span><b className="path">{cache?.path || '—'}</b></div>
          <button className="ghost-btn" onClick={clear}>Очистить кэш</button>
          {cleared && <div className="toast-inline">Кэш очищен</div>}
          {cache && <div className="cache-list">{cache.files.map((f) => <div key={f.name}><span>{f.name}</span><small>{(f.size / 1024).toFixed(0)} КБ · {formatDate(f.updatedAt)}</small></div>)}</div>}
        </div>
      </section>

      <section>
        <div className="section-head"><h2>Источники данных</h2><span>открытые API без обхода ограничений</span></div>
        <div className="source-list">
          {(snapshot?.sources || []).map((s) => (
            <div className="source" key={s.name}>
              <div><b>{s.name}</b><span>{s.description}</span></div>
              <span className="source-url" title={s.url}>{s.url.replace('https://', '')}</span>
              <small>Получено: {formatDate(s.retrievedAt)}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="panel secret-panel">
        <h3>Дополнение</h3>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={trySecret}
          placeholder="Пароль"
          aria-label="Пароль"
        />
        {secretMessage && <div className="hint">{secretMessage}</div>}
      </section>

      <section className="panel about">
        <h3>О приложении</h3>
        <p>Dota 2 Meta Assistant 1.0 · Electron + React + TypeScript.</p>
        <p>Статистика собирается из публичного API OpenDota. Сборки, уроны по уровням и таланты вычисляются из реальных матчей текущего патча, а не задаются вручную. Если данных недостаточно, приложение сообщает об этом вместо показа выдуманных значений.</p>
        <p>Изображения героев и предметов предоставляются CDN Valve и используются для информационных целей. Dota 2 и Valve — владельцы соответствующих товарных знаков.</p>
      </section>
    </div>
  );
}
