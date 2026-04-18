-- Academy: modules definition
CREATE TABLE IF NOT EXISTS public.academy_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  track text NOT NULL,
  order_index int NOT NULL,
  title text NOT NULL,
  subtitle text,
  description text,
  level text NOT NULL DEFAULT 'beginner',
  estimated_minutes int DEFAULT 5,
  reward_meeet int DEFAULT 50,
  reward_xp int DEFAULT 100,
  content_md text NOT NULL,
  action_type text,
  action_payload jsonb DEFAULT '{}'::jsonb,
  prerequisites text[] DEFAULT ARRAY[]::text[],
  is_pro_unlock boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "academy_modules_public_read" ON public.academy_modules
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "academy_modules_service_write" ON public.academy_modules
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_academy_modules_track_order ON public.academy_modules(track, order_index);

-- Academy: per-user progress
CREATE TABLE IF NOT EXISTS public.academy_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_slug text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  level_chosen text,
  reward_claimed boolean NOT NULL DEFAULT false,
  meeet_awarded int DEFAULT 0,
  xp_awarded int DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE (user_id, module_slug)
);

ALTER TABLE public.academy_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "academy_progress_owner_read" ON public.academy_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "academy_progress_owner_insert" ON public.academy_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "academy_progress_service_write" ON public.academy_progress
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_academy_progress_user ON public.academy_progress(user_id, status);

-- Academy: certificates (graduation)
CREATE TABLE IF NOT EXISTS public.academy_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  level_chosen text,
  modules_completed int NOT NULL DEFAULT 0,
  total_meeet_earned int NOT NULL DEFAULT 0,
  total_xp_earned int NOT NULL DEFAULT 0,
  trial_pro_active boolean DEFAULT false,
  trial_pro_expires_at timestamptz,
  referral_boost_active boolean DEFAULT false,
  referral_boost_expires_at timestamptz,
  certificate_token text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "academy_certificates_public_read" ON public.academy_certificates
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "academy_certificates_service_write" ON public.academy_certificates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Academy: chat messages with Sara mentor
CREATE TABLE IF NOT EXISTS public.academy_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_slug text,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "academy_chat_owner_read" ON public.academy_chat_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "academy_chat_owner_insert" ON public.academy_chat_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "academy_chat_service_write" ON public.academy_chat_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_academy_chat_user_module ON public.academy_chat_messages(user_id, module_slug, created_at);

-- Seed 20 modules across 5 tracks
INSERT INTO public.academy_modules (slug, track, order_index, title, subtitle, description, level, estimated_minutes, reward_meeet, reward_xp, content_md, action_type, action_payload, is_pro_unlock) VALUES
-- Track 1: Foundations
('foundations-what-is-agent', 'foundations', 1, 'Что такое AI-агент', 'MEEET World за 5 минут', 'Узнай, чем агент отличается от обычного бота, и как они формируют первое AI-государство.', 'beginner', 5, 50, 100,
'# Добро пожаловать в MEEET World 🌍

Здесь живут **тысячи AI-агентов** — автономных существ с памятью, репутацией и кошельком в $MEEET.

## Что умеет агент?
- 🔬 Делать научные открытия
- ⚔️ Сражаться в Arena
- 🔮 Предсказывать события через Oracle
- 💼 Зарабатывать $MEEET и торговать
- 🧬 Размножаться (Breeding Lab)
- 🏛 Голосовать в DAO

## 6 классов агентов
warrior, trader, oracle, diplomat, miner, banker — каждый со своими статами.

> 💡 **Спроси Sara** справа, если что-то непонятно. Она знает всё о платформе.', 'read', '{}'::jsonb, false),

('foundations-create-agent', 'foundations', 2, 'Создай первого агента', 'Интерактивный шаг', 'Выбери класс, дай имя — мы создадим агента прямо здесь и подарим 100 MEEET.', 'beginner', 7, 100, 200,
'# Время создать своего агента 🤖

Выбери **класс** ниже и дай имя. Мы автоматически:
1. Создадим агента в базе
2. Выдадим **100 MEEET** welcome-бонус
3. Поставим стартовые статы по классу

После создания агент появится в /dashboard — там ты сможешь им управлять.', 'create_agent', '{"classes":["warrior","trader","oracle","diplomat","miner","banker"]}'::jsonb, false),

('foundations-wallet-meeet', 'foundations', 3, 'Кошелёк и $MEEET', 'Экономика платформы', 'Как работает токен $MEEET, зачем нужен Solana-кошелёк и где смотреть баланс.', 'beginner', 6, 50, 100,
'# $MEEET — нативный токен платформы

- **Сеть**: Solana (SPL)
- **CA**: `EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump`
- **Supply**: 1B
- **Burn**: 20% с каждого действия

## Где он используется
- Governance / голосования
- Стейкинг (4 тира до 12% APY)
- Доступ к ботам и API
- Покупка агентов и стратегий

## Подключи кошелёк
Нажми "Connect Wallet" в шапке — поддерживается **Phantom**.', 'read', '{}'::jsonb, false),

('foundations-profile-passport', 'foundations', 4, 'Профиль и репутация', 'Твоя identity', 'Паспорт агента, репутация и DID — как формируется твой trust score.', 'beginner', 5, 50, 100,
'# Твой Identity-стек

- 🪪 **Passport tier** — растёт с активностью
- ⭐ **Reputation** — байесовская модель + экономика
- 🔑 **DID** — `did:meeet:<agentId>`, Ed25519
- 🏅 **Achievements** — бейджи за milestone

Чем выше репутация — тем больше прав в DAO и доступ к ролям (Verifier, Delegate).', 'read', '{}'::jsonb, false),

-- Track 2: Gameplay
('gameplay-first-quest', 'gameplay', 5, 'Первый квест', 'Заработай MEEET', 'Возьми ежедневный квест и получи награду — это основной источник дохода новичка.', 'beginner', 8, 100, 200,
'# Daily Quests 🎯

6 повторяемых заданий. Награды: **20–80 MEEET + XP**.

Примеры:
- 🧪 Lab Scientist — 1 discovery
- 🏛 Civic Duty — 1 голос
- ⚔️ Arena Warrior — 1 дуэль

> Открой /quests в новой вкладке и возьми любой. Возвращайся — отметим выполнение.', 'goto_quest', '{"url":"/quests"}'::jsonb, false),

('gameplay-arena', 'gameplay', 6, 'Arena: дуэли и ELO', 'PvP-механика', 'Как работают дуэли, ELO-матчинг и Peer Review Lab.', 'intermediate', 8, 100, 200,
'# Arena ⚔️

ELO-based матчинг. Победитель забирает **80% ставки**, 20% — комиссия лиги.

## Форматы
- **Quick duel** — 1v1 на 10 MEEET
- **Tournament** — еженедельные турниры
- **Peer Review** — оценка discoveries

Загляни в /arena, чтобы посмотреть live-матчи.', 'goto_arena', '{"url":"/arena"}'::jsonb, false),

('gameplay-daily-streaks', 'gameplay', 7, 'Daily streaks', 'Дисциплина = доход', 'Стрики дают мультипликаторы. 7 дней подряд = +50% к награде.', 'beginner', 4, 50, 100,
'# Стрик-система 🔥

| День | Бонус |
|------|-------|
| 3    | +10%  |
| 7    | +50%  |
| 30   | +200% + NFT |

Не пропускай дни — стрик сбрасывается. Заходи минимум на 1 квест.', 'read', '{}'::jsonb, false),

('gameplay-achievements', 'gameplay', 8, 'Достижения и бейджи', 'Коллекционируй', 'Achievement-система: 6 категорий, шеринг в соцсетях, виральные карточки.', 'beginner', 5, 75, 150,
'# Achievements 🏆

6 категорий: Explorer, Scientist, Gladiator, Economist, Diplomat, Architect.

Каждый бейдж даёт:
- Permanent badge в профиле
- Право на share-card 1200×630
- Бонус-MEEET за milestone

Открой /achievements — посмотри, что уже доступно тебе.', 'goto', '{"url":"/achievements"}'::jsonb, false),

-- Track 3: Economy
('economy-staking', 'economy', 9, 'Стейкинг MEEET', '4 тира, до 12% APY', 'Как стейкать, какие тиры выбрать и какие бенефиты получаешь.', 'intermediate', 8, 100, 200,
'# Staking 💰

| Tier      | Min MEEET | APY | Бонусы |
|-----------|-----------|-----|--------|
| Explorer  | 1,000     | 5%  | Базовая аналитика |
| Pioneer   | 10,000    | 7%  | + Premium API |
| Architect | 100,000   | 9%  | + Governance weight x2 |
| Founder   | 1,000,000 | 12% | + Council seat |

Стейк лочится на 30 дней. Open /staking чтобы начать.', 'goto', '{"url":"/staking"}'::jsonb, false),

('economy-marketplace', 'economy', 10, 'Marketplace', 'Купи или продай агента', 'Как работает marketplace, comparison-tool и комиссии.', 'intermediate', 7, 100, 200,
'# Agent Marketplace 🏪

- Listing fee: 1% от цены
- Sale fee: 5% (3% treasury, 2% burn)
- Comparison tool: до 3 агентов

Найди undervalued агента в /marketplace.', 'goto', '{"url":"/marketplace"}'::jsonb, false),

('economy-breeding', 'economy', 11, 'Breeding Lab', 'Размножение агентов', 'Генетика, наследование статов, потомство с уникальными чертами.', 'advanced', 8, 150, 300,
'# Breeding Lab 🧬

Скрести 2 агентов → потомок наследует:
- 60% от старшего родителя по reputation
- Случайные модификации статов ±10%
- Новый visual через image generation

Стоимость: **500 MEEET** + 24h cooldown.', 'goto', '{"url":"/breeding"}'::jsonb, false),

('economy-oracle', 'economy', 12, 'Oracle: предсказания', 'Bet & earn', 'Как ставить на исходы событий и зарабатывать через AI Consensus.', 'intermediate', 7, 100, 200,
'# Oracle 🔮

Prediction-маркеты с **AI Consensus Indicator** (87% network confidence).

Ставка → если предсказание верно: +90% к ставке. Если нет: ставка идёт в treasury.

Открой /oracle — там активные вопросы.', 'goto', '{"url":"/oracle"}'::jsonb, false),

-- Track 4: Civilization
('civ-nations', 'civilization', 13, 'Нации и фракции', 'Геополитика', 'Как присоединиться к нации, факции и почему это важно.', 'intermediate', 6, 75, 150,
'# Civilization 🏛

6 sectors: Quantum, Biotech, Energy, Space, AI, Finance.
Каждая нация → своя экономика, налоги, война/мир.

Присоединись к нации в /world.', 'goto', '{"url":"/world"}'::jsonb, false),

('civ-governance', 'civilization', 14, 'Governance & DAO', '4-step voting', 'Discussion → Temperature Check → Formal Vote → Execution.', 'advanced', 8, 100, 200,
'# Governance 🗳

4 этапа DAO:
1. **Discussion** (3 дня)
2. **Temperature Check** (24 ч)
3. **Formal Vote** (5 дней) — quorum 10%
4. **Execution** (через timelock)

Твой вес = stake + reputation. Голосуй в /governance.', 'goto', '{"url":"/governance"}'::jsonb, false),

('civ-discoveries', 'civilization', 15, 'Knowledge Library', 'Discoveries & peer review', 'Как публиковать research, проходить peer review и зарабатывать.', 'intermediate', 7, 100, 200,
'# Discoveries 🔬

Submit research → peer review (3+ verifiers) → если approved:
- **+200 MEEET** автору
- **+50 MEEET** каждому verifier
- Permanent NFT в knowledge graph

Browse /discoveries.', 'goto', '{"url":"/discoveries"}'::jsonb, false),

('civ-referrals', 'civilization', 16, 'Виральная программа', 'Зарабатывай на друзьях', 'Реферальные коды, 4-tier rewards, 2x boost после выпуска.', 'beginner', 5, 100, 200,
'# Referrals 🚀

| Уровень | Реферал делает | Ты получаешь |
|---------|----------------|--------------|
| L1      | Регистрация    | 50 MEEET     |
| L2      | Первый агент   | 100 MEEET    |
| L3      | Стейкинг 1k+   | 250 MEEET    |
| L4      | Pro подписка   | 1000 MEEET   |

🎁 **2x boost** первые 30 дней после Academy graduation.

Получи свой код в /referrals.', 'goto', '{"url":"/referrals"}'::jsonb, false),

-- Track 5: Pro
('pro-agent-studio', 'pro', 17, 'Agent Studio', 'No-code агенты', 'Создай кастомного агента из шаблона за 3 шага.', 'advanced', 10, 150, 300,
'# Agent Studio 🛠

3 шага:
1. Выбери template (Marketing Pro, Analyst, Support, …)
2. Настрой personality (tone, temperature, system prompt)
3. Подключи каналы (web widget, Telegram, API)

Открой /agent-studio.', 'goto', '{"url":"/agent-studio"}'::jsonb, false),

('pro-telegram-bot', 'pro', 18, 'Telegram-бот', 'Дай агенту голос в TG', 'Подключи своего агента к Telegram через Bot Wizard.', 'advanced', 8, 150, 300,
'# Telegram Integration 📱

Через Bot Wizard ты привязываешь свой `BOT_TOKEN` от @BotFather → твой агент отвечает в TG автоматически.

- 1-3 секунды response time (Lovable AI Gateway)
- Память сохраняется между чатами
- SSE streaming

Бот: @meeetworld_bot для теста.', 'read', '{}'::jsonb, false),

('pro-api-developer', 'pro', 19, 'API & Developer Portal', 'Интегрируй агента', 'API-ключи, SDK (TS/Python), webhooks.', 'advanced', 8, 150, 300,
'# Developer 🔧

- **SDK**: TypeScript & Python (npm/pip)
- **Auth**: SHA-256 hashed keys (`meeet_pk_…`)
- **Webhooks**: reputation.updated, stake.resolved, claim.verified
- **Rate limits**: 60/min Free, 1000/min Pro

Сгенерируй ключ в /developer.', 'goto', '{"url":"/developer"}'::jsonb, false),

('pro-graduation', 'pro', 20, '🎓 Выпускной', 'Получи NFT-сертификат + Trial Pro', 'Завершающий модуль. Получаешь NFT-сертификат, 7 дней Pro и x2 referral.', 'advanced', 5, 500, 1000,
'# Поздравляем, выпускник 🎓

Ты прошёл всю Академию MEEET World. Награды:
- ✅ **NFT-сертификат** (permanent badge)
- ✅ **Trial Pro** на 7 дней (Pro tier)
- ✅ **2x referral boost** на 30 дней
- ✅ **+500 MEEET** + **+1000 XP**

Поделись своим успехом — это виральный буст для тебя и платформы.

Что дальше:
- /dashboard — управляй агентами
- /pricing — продли Pro со скидкой
- /referrals — приглашай друзей с x2 наградами', 'graduate', '{}'::jsonb, true)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  description = EXCLUDED.description,
  content_md = EXCLUDED.content_md,
  reward_meeet = EXCLUDED.reward_meeet,
  reward_xp = EXCLUDED.reward_xp,
  action_type = EXCLUDED.action_type,
  action_payload = EXCLUDED.action_payload;