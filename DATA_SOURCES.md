# Источники данных

Приложение использует только открытые источники. Никакие платные API, ключи, авторизация, CAPTCHA или обход ограничений не применяются.

## OpenDota API — https://docs.opendota.com/

Базовый адрес: `https://api.opendota.com/api`

| Endpoint | Что даёт | Использование |
|---|---|---|
| `/heroStats` | 127 героев, публичный винрейт/пикрейт по рангам 1–8, про-пик/про-бан, 7-точечные тренды | Каталог, карточки, главная, рейтинг |
| `/constants/patch` | Список патчей и даты выхода | Определение текущего и предыдущего патча |
| `/constants/items` | Названия, стоимости, изображения предметов | Сборки и иконки предметов |
| `/constants/abilities` | Названия и описания способностей | Таблица прокачки и таланты |
| `/constants/ability_ids` | Соответствие чис ID способности названию | Разбор `ability_upgrades_arr` |
| `/constants/hero_abilities` | Список способностей и талантов героя по уровням | Древо талантов 10/15/20/25 |
| `/explorer?sql=...` | SQL-доступ к матчам и игрокам | Статистика по патчам, сборки, контры |

Примечание: `/heroStats?patch=` не фильтрует данные — параметр игнорируется API. Поэтому патчевая статистика получается отдельными SQL-запросами к Explorer с фильтром по `start_time`, границы которого берутся из дат патчей.

### Примеры SQL

Победы по героям за патч:

```sql
SELECT pm.hero_id, count(*)::int AS games,
  sum(CASE WHEN m.radiant_win = (pm.player_slot < 128) THEN 1 ELSE 0 END)::int AS wins
FROM player_matches pm JOIN matches m ON pm.match_id = m.match_id
WHERE m.start_time >= :from AND m.start_time < :to
GROUP BY pm.hero_id;
```

Баны:

```sql
SELECT (x->>'hero_id')::int AS hero_id, count(*)::int AS bans
FROM matches m, unnest(m.picks_bans) x
WHERE m.start_time >= :from AND m.start_time < :to
  AND (x->>'is_pick')::boolean = false
GROUP BY 1;
```

Сборка героя (покупки по времени, порядок способностей):

```sql
SELECT item_0, item_1, item_2, item_3, item_4, item_5,
       purchase_log, ability_upgrades_arr, permanent_buffs
FROM player_matches
WHERE hero_id = :hero
  AND match_id IN (SELECT match_id FROM matches
                   WHERE start_time >= :from
                   ORDER BY start_time DESC LIMIT 4000)
LIMIT 120;
```

Матчапы:

```sql
WITH p AS (
  SELECT m.match_id, m.radiant_win,
    (x->>'hero_id')::int AS hero_id, (x->>'team')::int AS team
  FROM matches m, unnest(m.picks_bans) x
  WHERE m.start_time >= :from AND (x->>'is_pick')::boolean = true
)
SELECT opp.hero_id AS opponent, count(*)::int AS games,
  sum(CASE WHEN (mine.radiant_win = (mine.team = 0)) THEN 1 ELSE 0 END)::int AS wins
FROM p mine JOIN p opp ON opp.match_id = mine.match_id AND opp.team <> mine.team
WHERE mine.hero_id = :hero
GROUP BY 1;
```

## Valve Dota 2 CDN

`https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/...`

Изображения героев, иконок и предметов загружаются через главный процесс Electron и кэшируются на диске в каталоге `image-cache` профиля пользователя. Повторное открытие не требует повторной загрузки.

Dota 2 и Valve являются владельцами товарных знаков и соответствующих материалов. Изображения используются в информационном приложении; для коммерческого распространения уточните условия использования активов Valve.

## Что НЕ используется

- **Dotabuff** — нет публичного API, условия использования запрещают автоматизированный сбор данных.
- **STRATZ** — GraphQL API требует персональный токен; без него данные недоступны.
- Любые источники с платным доступом или обходом защиты.

## Ограничения

- OpenDota Explorer содержит про-матчи. На 21 ноября 2026 года по патчу 7.42 доступно около 44 матчей — этого мало для надёжного сравнения с патчем 7.41 (около 9267 матчей). Приложение показывает реальные числа и предупреждение.
- При нехватке данных патча для сборок и матчапов используется окно последних 30 дней с явной пометкой в интерфейсе.
- Частота выбора талантов вычисляется из `ability_upgrades_arr` матчей; если талант на конкретном уровне не встречается в выборке, показывается 0% с указанием реального числа матчей.
