import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendMessage(chatId: string | number, text: string, lovableKey: string, telegramKey: string) {
  const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": telegramKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  return res.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
    if (!TELEGRAM_API_KEY) return json({ error: "TELEGRAM_API_KEY not configured" }, 500);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();

    // Handle Telegram webhook update format
    const update = body.message ? body : body.update;
    if (!update?.message?.text) {
      return json({ ok: true, skipped: "no text message" });
    }

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const username = update.message.from?.username || "";

    // Parse command
    const [command, ...args] = text.split(/\s+/);

    switch (command.toLowerCase()) {
      case "/start": {
        await sendMessage(chatId,
          `🌐 <b>MEEET STATE Bot</b>\n\n` +
          `Команды:\n` +
          `/agents — Ваши агенты\n` +
          `/stats — Общая статистика\n` +
          `/balance — Баланс MEEET\n` +
          `/quests — Активные квесты\n` +
          `/deploy — Развернуть нового агента\n` +
          `/help — Справка`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY);
        break;
      }

      case "/help": {
        await sendMessage(chatId,
          `📖 <b>Справка MEEET STATE</b>\n\n` +
          `/agents — Список ваших агентов, их статус и баланс\n` +
          `/stats — Глобальная статистика платформы\n` +
          `/balance — Суммарный баланс всех агентов\n` +
          `/quests — Последние активные квесты\n` +
          `/oracle — Открытые рынки предсказаний\n` +
          `/deploy — Ссылка для развертывания агента\n\n` +
          `🔗 Платформа: meeet-solana-state.lovable.app`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY);
        break;
      }

      case "/stats": {
        const [
          { count: totalAgents },
          { count: activeQuests },
          { data: treasury },
        ] = await Promise.all([
          supabase.from("agents").select("id", { count: "exact", head: true }),
          supabase.from("quests").select("id", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("state_treasury").select("balance_meeet, balance_sol, total_burned").single(),
        ]);

        await sendMessage(chatId,
          `📊 <b>MEEET STATE Статистика</b>\n\n` +
          `🤖 Агентов: <b>${totalAgents ?? 0}</b>\n` +
          `📋 Открытых квестов: <b>${activeQuests ?? 0}</b>\n` +
          `💰 Казна: <b>${(treasury?.data?.balance_meeet ?? 0).toLocaleString()} MEEET</b>\n` +
          `🔥 Сожжено: <b>${(treasury?.data?.total_burned ?? 0).toLocaleString()} MEEET</b>`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY);
        break;
      }

      case "/agents": {
        // Try to find user by telegram username linked in profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("twitter_handle", username)
          .maybeSingle();

        if (!profile) {
          await sendMessage(chatId,
            `❌ Профиль не найден.\n\n` +
            `Укажите ваш Telegram username (<b>@${username}</b>) в поле Twitter Handle на платформе для привязки.`,
            LOVABLE_API_KEY, TELEGRAM_API_KEY);
          break;
        }

        const { data: agents } = await supabase
          .from("agents")
          .select("name, class, level, balance_meeet, status, quests_completed")
          .eq("user_id", profile.user_id)
          .limit(10);

        if (!agents || agents.length === 0) {
          await sendMessage(chatId, "У вас пока нет агентов. Перейдите на /deploy.", LOVABLE_API_KEY, TELEGRAM_API_KEY);
          break;
        }

        const list = agents.map((a, i) =>
          `${i + 1}. <b>${a.name}</b> (${a.class}) Lv.${a.level}\n` +
          `   💰 ${a.balance_meeet} MEEET | 📋 ${a.quests_completed} квестов | ${a.status === "active" ? "🟢" : "⚪"}`
        ).join("\n\n");

        await sendMessage(chatId, `🤖 <b>Ваши агенты:</b>\n\n${list}`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
        break;
      }

      case "/balance": {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("twitter_handle", username)
          .maybeSingle();

        if (!profile) {
          await sendMessage(chatId, `❌ Профиль не привязан. Укажите @${username} в настройках.`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          break;
        }

        const { data: agents } = await supabase
          .from("agents")
          .select("balance_meeet")
          .eq("user_id", profile.user_id);

        const total = (agents || []).reduce((s, a) => s + (a.balance_meeet || 0), 0);
        await sendMessage(chatId,
          `💰 <b>Баланс</b>\n\nСуммарный: <b>${total.toLocaleString()} MEEET</b>\nАгентов: <b>${agents?.length ?? 0}</b>`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY);
        break;
      }

      case "/quests": {
        const { data: quests } = await supabase
          .from("quests")
          .select("title, reward_meeet, status, category")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(5);

        if (!quests || quests.length === 0) {
          await sendMessage(chatId, "📋 Нет активных квестов.", LOVABLE_API_KEY, TELEGRAM_API_KEY);
          break;
        }

        const list = quests.map((q, i) =>
          `${i + 1}. <b>${q.title}</b>\n   🏷 ${q.category} | 💰 ${q.reward_meeet ?? 0} MEEET`
        ).join("\n\n");

        await sendMessage(chatId, `📋 <b>Активные квесты:</b>\n\n${list}`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
        break;
      }

      case "/oracle": {
        const { data: questions } = await supabase
          .from("oracle_questions")
          .select("question_text, yes_pool, no_pool, deadline, status")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(5);

        if (!questions || questions.length === 0) {
          await sendMessage(chatId, "🔮 Нет открытых рынков.", LOVABLE_API_KEY, TELEGRAM_API_KEY);
          break;
        }

        const list = questions.map((q, i) =>
          `${i + 1}. <b>${q.question_text.slice(0, 80)}</b>\n   ✅ ${q.yes_pool} | ❌ ${q.no_pool}`
        ).join("\n\n");

        await sendMessage(chatId, `🔮 <b>Oracle рынки:</b>\n\n${list}`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
        break;
      }

      case "/deploy": {
        await sendMessage(chatId,
          `🚀 <b>Развернуть агента</b>\n\n` +
          `Перейдите по ссылке:\nhttps://meeet-solana-state.lovable.app/deploy\n\n` +
          `Выберите план, оплатите из кошелька и ваш агент начнет работу!`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY);
        break;
      }

      default: {
        await sendMessage(chatId,
          `🤔 Неизвестная команда. Введите /help для списка команд.`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY);
      }
    }

    return json({ ok: true });
  } catch (err) {
    console.error("telegram-bot error:", err);
    return json({ error: String(err) }, 500);
  }
});
