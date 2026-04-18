

## 🧬 Расширение направлений агентов MEEET World

Сейчас в системе **6 базовых классов** (warrior, trader, oracle, diplomat, miner, banker) и **8 типов research-хабов** (medical, climate, space, quantum, ai, education, economics, security). Концепция позволяет масштабироваться до полноценных «министерств» цивилизации.

### 🎯 Предлагаемые 12 новых направлений (Sectors / Ministries)

Сгруппировано в 4 «ветви власти» цивилизации:

#### 🔬 Knowledge Branch (Наука и Знания)
| # | Направление | Иконка | Что делает | Связь с системой |
|---|---|---|---|---|
| 1 | **AI Architects** | 🤖 | Создают новых агентов, обучают модели, проектируют нейросетевые скиллы | Agent Studio, Skills Marketplace, Breeding Lab |
| 2 | **Health & Bio** | 🧬 | Анализ клинических данных, drug discovery, геномика, ментальное здоровье | Discoveries (medical), NIH/Pasteur hubs, Spix для пациентов |
| 3 | **Climate & Earth** | 🌍 | Климат-модели, спутниковые данные, биоразнообразие, океанография | Discoveries (climate), Earth scientists, World Map events |
| 4 | **Space & Cosmos** | 🚀 | JWST данные, экзопланеты, астероиды, спутниковая связь | Discoveries (space), NASA/ESA hubs |

#### 🏛 Governance Branch (Управление)
| # | Направление | Иконка | Что делает | Связь с системой |
|---|---|---|---|---|
| 5 | **Politics & Diplomacy** | ⚖️ | Анализ геополитики, переговоры между нациями, договоры, UN SDGs трекинг | Parliament, Country Wars, Alliances, Petitions |
| 6 | **Legal & Compliance** | 📜 | Анализ законов, контрактов, GDPR/AI Act compliance, юридические заключения | Laws, Governance, Audit Trail (Signet) |
| 7 | **Justice & Arbitration** | ⚔️ | Решает споры между агентами, медиация дуэлей, апелляции | Disputes, Arena, Peer Review Lab |

#### 💰 Economy Branch (Экономика)
| # | Направление | Иконка | Что делает | Связь с системой |
|---|---|---|---|---|
| 8 | **DeFi & Markets** | 📈 | Торговля, ликвидность, риск-менеджмент, prediction markets | Oracle, Token Trader, Staking |
| 9 | **Energy & Resources** | ⚡ | Энергорынки, нефть/газ, возобновляемые источники, ресурсное планирование | Mining sector, Country balances |
| 10 | **Trade & Logistics** | 📦 | Цепочки поставок, торговые маршруты, импорт/экспорт между нациями | Marketplace, Country Wars |

#### 🌐 Society Branch (Общество)
| # | Направление | Иконка | Что делает | Связь с системой |
|---|---|---|---|---|
| 11 | **Education & Culture** | 🎓 | Курсы Academy, переводы, локализация, культурный обмен | Academy, Onboarding Course, i18n |
| 12 | **Media & Journalism** | 📰 | Новости, фактчекинг, контент для соцсетей, отчёты Cortex | Twitter/Reddit/Medium bots, Herald, Newsletter |

---

### 🔗 Как всё связать (Cross-System Integration)

```text
                  ┌─────────────────────┐
                  │  AGENT (1 of 12)    │
                  │  + class + sector   │
                  └──────────┬──────────┘
                             │
       ┌─────────┬───────────┼───────────┬─────────┐
       ▼         ▼           ▼           ▼         ▼
   Discovery  Quests    Parliament    Arena    Marketplace
   (sector)  (sector)   (vote rights)(domain) (sector skills)
       │         │           │           │         │
       └─────────┴───────────┼───────────┴─────────┘
                             ▼
              ┌──────────────────────────┐
              │  Cortex Reports / Cross  │
              │  Sector Analytics        │
              └──────────────────────────┘
```

**Ключевые механики связи:**
- Каждый агент получает `sector` (in addition to `class`) — даёт доступ к специализированным quests, discovery domains и арена-категориям
- **Cross-sector collaborations**: Health + AI = drug discovery; Climate + Energy = green tech; Politics + Legal = treaty drafting → бонусы XP/MEEET
- **Sector Leaderboards** — топ-агенты в каждом министерстве
- **Министры (Ministers)** — выборная роль в каждом секторе (как мини-Президенты), голосование в Parliament
- **Sector Treasury** — каждое министерство получает 0.5% civilization tax на свои инициативы

---

### 🛠 Что нужно реализовать

1. **БД миграция**: добавить `agent_sectors` таблицу + поле `sector` в `agents`, RLS политики
2. **Data layer**: `src/data/agent-sectors.ts` — описания, иконки, цвета, связи
3. **UI: страница `/sectors`** — обзор всех 12 направлений с фильтрацией агентов, статистикой, топами
4. **Интеграция в существующее**:
   - Agent Studio: выбор sector при создании
   - Discoveries: фильтр по sector
   - Quests: sector-specific quests
   - Parliament: голосования за Министров
   - Marketplace: фильтр по sector
   - Cortex: cross-sector reports
5. **Edge function** `sector-analytics` — агрегаты по секторам, top agents, treasury
6. **Гейминг**: добавить achievements за участие в нескольких секторах
7. **Документация**: обновить AGENTS.md и MEEET_World_Documentation с новыми секторами

---

### 📊 Влияние на экономику

- +12 новых типов quests → +60% дневной активности
- Sector Treasuries → 6% доп. демпинг на $MEEET (распределение через grants)
- Министерские выборы → новый use-case для $MEEET голосования
- Cross-sector коллаборации → +30% к discovery generation rate

---

### ❓ Вопросы для обсуждения перед реализацией

1. **Объём первого релиза**: запустить все 12 сразу или фазированно (4 → 4 → 4 по кварталам)?
2. **Связь с классами**: sector добавляется к существующему class (агент имеет оба) или заменяет?
3. **Министры**: вводить роль сразу или сначала запустить sectors, а governance layer добавить позже?
4. **Sector Treasury**: использовать общий Mission Fund или отдельные wallet'ы для каждого министерства?

<lov-actions>
<lov-suggestion message="Запускай все 12 секторов сразу полным релизом: миграция БД, страница /sectors, интеграция в Agent Studio/Discoveries/Quests/Parliament/Marketplace, edge function sector-analytics, министерские выборы и sector treasuries. Sector добавляется к классу (агент имеет оба). Обнови документацию.">Запустить все 12 сразу (полный пакет)</lov-suggestion>
<lov-suggestion message="Сделай фазированный запуск: Фаза 1 — Knowledge Branch (AI Architects, Health, Climate, Space). Только sectors + страница /sectors + фильтры в Discoveries и Quests. Без министров и treasury пока.">Фаза 1: только Knowledge Branch (4 сектора)</lov-suggestion>
<lov-suggestion message="Сначала добавь только инфраструктуру: миграция БД с таблицей agent_sectors, data layer src/data/agent-sectors.ts со всеми 12 секторами, страница /sectors с обзором. Интеграции в другие модули добавим позже.">Только инфраструктура + страница /sectors</lov-suggestion>
<lov-suggestion message="Предложи альтернативную группировку секторов с упором на реальные мировые проблемы (SDG-aligned): голод, бедность, климат, образование. Покажи как это маппится на текущие классы агентов.">Альтернатива: SDG-aligned сектора</lov-suggestion>
</lov-actions>
