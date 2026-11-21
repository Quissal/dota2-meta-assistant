import React, { useEffect, useState } from 'react';
import type { AppSnapshot, HeroMeta, HeroBuild, MatchupSet } from '../../shared/types';
import ItemIcon from '../components/ItemIcon';
import { ATTR_COLORS, ATTR_LABELS, compact, formatDate, pct, pp, ROLE_ICONS, ROLE_LABELS, tierColor } from '../utils';

interface Props {
  hero: HeroMeta;
  snapshot: AppSnapshot;
  onBack: () => void;
  onSelect: (id: number) => void;
}

const PHASES: { key: keyof HeroBuild; title: string; hint: string }[] = [
  { key: 'starting', title: 'Стартовый закуп', hint: 'покупки до 0:00' },
  { key: 'early', title: 'Ранняя игра', hint: '0–10 минут' },
  { key: 'mid', title: 'Средняя игра', hint: '10–25 минут' },
  { key: 'late', title: 'Поздняя игра', hint: 'после 25 минут' },
  { key: 'finalItems', title: 'Итоговый закуп', hint: 'предметы в слотах в конце матча' },
];

export default function HeroDetailScreen({ hero, snapshot, onBack, onSelect }: Props) {
  const [build, setBuild] = useState<HeroBuild | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [matchups, setMatchups] = useState<MatchupSet | null>(null);
  const [loadingBuild, setLoadingBuild] = useState(true);
  const [loadingMatchups, setLoadingMatchups] = useState(true);

  useEffect(() => {
    let alive = true;
    setBuild(null); setMatchups(null); setBuildError(null);
    setLoadingBuild(true); setLoadingMatchups(true);
    window.api.getBuild(hero.id, snapshot.patch.name)
      .then((b) => { if (alive) setBuild(b); })
      .catch((e) => { if (alive) setBuildError(e.message || String(e)); })
      .finally(() => { if (alive) setLoadingBuild(false); });
    window.api.getMatchups(hero.id, snapshot.patch.name)
      .then((m) => { if (alive) setMatchups(m); })
      .catch(() => { if (alive) setMatchups(null); })
      .finally(() => { if (alive) setLoadingMatchups(false); });
    return () => { alive = false; };
  }, [hero.id, snapshot.patch.name]);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (hero.currentWinRate >= 0.52) strengths.push('Высокий винрейт в текущем патче');
  else if (hero.currentWinRate < 0.47) weaknesses.push('Низкий винрейт в текущем патче');
  if (hero.baseArmor >= 5) strengths.push(`Хорошая стартовая броня (${hero.baseArmor})`);
  else if (hero.baseArmor <= 1) weaknesses.push(`Низкая стартовая броня (${hero.baseArmor})`);
  if (hero.attackRange >= 500) strengths.push(`Дальняя атака (${hero.attackRange})`);
  else weaknesses.push('Ближний бой — требуется позиционирование');
  if (hero.baseHealth >= 700) strengths.push(`Много стартового HP (${hero.baseHealth})`);
  else if (hero.baseHealth < 550) weaknesses.push(`Мало стартового HP (${hero.baseHealth})`);
  if (hero.confidence === 'high') strengths.push('Достаточная выборка матчей для оценки');
  else weaknesses.push('Малая выборка — оценка неточна');

  return (
    <div className="screen detail">
      <button className="back-btn" onClick={onBack}>← Назад к героям</button>

      <section className="detail-hero" style={{ '--accent': ATTR_COLORS[hero.primaryAttr] } as React.CSSProperties}>
        <div className="detail-portrait"><img src={hero.img} alt={hero.localizedName} /></div>
        <div className="detail-info">
          <div className="eyebrow">{ATTR_LABELS[hero.primaryAttr]} · {hero.attackType}</div>
          <h1>{hero.localizedName}</h1>
          <div className="detail-roles">{hero.positions.map((r) => <span key={r}>{ROLE_ICONS[r] || '◆'} {ROLE_LABELS[r] || r}</span>)}<span>{hero.roles.slice(0, 3).join(' · ')}</span></div>
          <p className="detail-desc">
            Публичный винрейт <b>{pct(hero.pubWinRate)}</b> (OpenDota, большая выборка), пикрейт <b>{pct(hero.pubPickRate)}</b>.
            В патче {snapshot.patch.name} в открытой базе {compact(hero.current.games)} про-матчей — винрейт {hero.current.games ? pct(hero.currentWinRate) : '—'}.
            {hero.confidence === 'high'
              ? ` Изменение к патчу ${snapshot.previousPatch.name}: ${pp(hero.winDelta)}.`
              : ' Выборка патча мала, сравнение с прошлым патчом не отображается.'}
          </p>
          <div className="detail-tags">
            <span className="tier-tag" style={{ background: tierColor(hero.tier) }}>Тир {hero.tier}</span>
            <span className="tag">Эффективность {hero.efficiency.toFixed(1)}</span>
            <span className="tag">Достоверность: {{ high: 'высокая', medium: 'средняя', low: 'низкая' }[hero.confidence]}</span>
          </div>
        </div>
        <div className="detail-basestats">
          <div><span>HP</span><b>{hero.baseHealth}</b></div>
          <div><span>MANA</span><b>{hero.baseMana}</b></div>
          <div><span>ARMOR</span><b>{hero.baseArmor}</b></div>
          <div><span>DMG</span><b>{hero.baseAttackMin}–{hero.baseAttackMax}</b></div>
          <div><span>RANGE</span><b>{hero.attackRange}</b></div>
          <div><span>MS</span><b>{hero.moveSpeed}</b></div>
        </div>
      </section>

      <section className="two-col strengths">
        <div className="panel">
          <h3>Сильные стороны</h3>
          {strengths.length ? strengths.map((s) => <div key={s} className="factor good">＋ {s}</div>) : <div className="muted">Нет ярко выраженных преимуществ по базовым параметрам.</div>}
        </div>
        <div className="panel">
          <h3>Слабые стороны</h3>
          {weaknesses.length ? weaknesses.map((s) => <div key={s} className="factor bad">− {s}</div>) : <div className="muted">Явных слабостей по базовым параметрам нет.</div>}
        </div>
      </section>

      <section className="stat-grid">
        <StatCard label="Винрейт (публичный)" value={pct(hero.pubWinRate)} sub="OpenDota, большая выборка" />
        <StatCard label="Винрейт (патч)" value={hero.current.games ? pct(hero.currentWinRate) : '—'} sub={`${hero.current.wins} побед / ${hero.current.games} про-матчей`} />
        <StatCard label="Винрейт (прошлый)" value={hero.previous.games ? pct(hero.previousWinRate) : '—'} sub={snapshot.previousPatch.name} />
        <StatCard label="Пикрейт (публ.)" value={pct(hero.pubPickRate)} sub="OpenDota, большая выборка" />
        <StatCard label="Банрейт патча" value={pct(hero.banRate)} sub={`${compact(hero.current.bans)} банов · про-матчи`} />
        <StatCard label="Про-пик" value={compact(hero.proPick)} sub={`винрейт ${hero.proPick ? pct(hero.proWin / hero.proPick) : '—'}`} />
        <StatCard label="Δ винрейта" value={hero.confidence === 'high' ? pp(hero.winDelta) : '—'} sub={hero.confidence === 'high' ? 'к предыдущему патчу' : 'малая выборка патча'} accent={hero.winDelta >= 0 ? 'pos' : 'neg'} />
      </section>

      <section>
        <div className="section-head"><h2>Сборка предметов</h2><span>
          {build ? `${build.matchesAnalyzed} матчей · ${build.patchOnly ? 'патч ' + snapshot.patch.name : 'последние 30 дней (данных патча мало)'} · ${formatDate(build.generatedAt)}` : 'расчёт по реальным матчам'}
        </span></div>
        {loadingBuild && <div className="loading-block">Собираем статистику предметов из матчей…</div>}
        {buildError && <div className="warning-banner">{buildError}</div>}
        {build && (
          <>
            <div className="build-grid">
              {PHASES.map((phase) => {
                const items = build[phase.key] as typeof build.starting;
                return (
                  <div className="panel build-panel" key={phase.key}>
                    <div className="panel-head"><h3>{phase.title}</h3><span>{phase.hint}</span></div>
                    <div className="item-grid">
                      {items.length ? items.map((it) => <ItemIcon key={it.key} item={it} />) : <div className="muted">Нет данных</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="note">
              Процент рядом с предметом — доля матчей, в которых он был куплен на этом этапе. Приоритет определяется частотой покупки в выборке.
              Сборка зависит от позиции, состава и противника — это статистический ориентир, а не универсальный рецепт.
            </div>
          </>
        )}
      </section>

      <section className="two-col">
        <div className="panel">
          <div className="panel-head"><h3>Прокачка способностей</h3><span>{build ? `${build.matchesAnalyzed} матчей` : ''}</span></div>
          {build ? (
            <div className="skill-table">
              <div className="skill-row head"><span>Ур.</span><span>Что берут чаще</span><span>%</span></div>
              {build.skillOrder.map((row) => (
                <div className="skill-row" key={row.level}>
                  <span className="lvl">{row.level}</span>
                  <span className="skill-names">
                    {row.picks.map((p) => <span key={p.key} title={p.name}>
                      {p.img ? <img src={p.img} alt="" loading="lazy" /> : null}
                      <em>{p.name}</em>
                    </span>)}
                  </span>
                  <span className="skill-pct">{row.picks[0]?.percent ?? 0}%</span>
                </div>
              ))}
              {build.skillPriority.length > 0 && <div className="priority-line"><b>Приоритет:</b> {build.skillPriority.slice(0, 4).map((p) => p.name).join(' → ')}</div>}
            </div>
          ) : <div className="loading-block">Загрузка…</div>}
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Древо талантов</h3><span>частота выбора</span></div>
          {build ? (
            <div className="talent-list">
              {build.talents.map((tier) => (
                <div className="talent-tier" key={tier.level}>
                  <div className="tier-level">{tier.level}</div>
                  <div className="tier-options">
                    {tier.choices.map((c) => (
                      <div className={c.percent >= 50 ? 'talent-option picked' : 'talent-option'} key={c.key}>
                        <span>{c.name}</span><b>{c.percent}%</b>
                        <div className="bar"><i style={{ width: `${c.percent}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="note">Выбор таланта показан по частоте в матчах текущего патча. Альтернативу стоит брать под состав и противника.</div>
            </div>
          ) : <div className="loading-block">Загрузка…</div>}
        </div>
      </section>

      <section>
        <div className="section-head"><h2>Контры и синергия</h2><span>{matchups ? `${matchups.sample} матчей · ${matchups.patchOnly ? 'патч ' + snapshot.patch.name : 'последние 30 дней'}` : 'расчёт по реальным матчам'}</span></div>
        {loadingMatchups && <div className="loading-block">Считаем винрейт против каждого героя…</div>}
        {matchups && (
          <div className="two-col">
            <div className="panel"><h3>Лучшие матчапы</h3>
              {matchups.best.length ? matchups.best.map((m) => <button key={m.heroId} className="matchup-row" onClick={() => onSelect(m.heroId)}>
                <img src={snapshot.heroes.find((h) => h.id === m.heroId)?.icon} alt="" loading="lazy" />
                <span>{m.name}</span><small>{m.games} игр</small><b className="pos">{pct(m.winRate)}</b>
              </button>) : <div className="muted">Недостаточно матчей</div>}
            </div>
            <div className="panel"><h3>Худшие матчапы</h3>
              {matchups.worst.length ? matchups.worst.map((m) => <button key={m.heroId} className="matchup-row" onClick={() => onSelect(m.heroId)}>
                <img src={snapshot.heroes.find((h) => h.id === m.heroId)?.icon} alt="" loading="lazy" />
                <span>{m.name}</span><small>{m.games} игр</small><b className="neg">{pct(m.winRate)}</b>
              </button>) : <div className="muted">Недостаточно матчей</div>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: string }) {
  return <div className="stat-card"><span>{label}</span><b className={accent}>{value}</b><small>{sub}</small></div>;
}
