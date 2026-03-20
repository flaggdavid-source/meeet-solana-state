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

    // Auth — only service_role or authenticated users
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    // Accept both service-role calls and user calls
    let callerUserId: string | null = null;
    if (token === serviceKey) {
      callerUserId = "service";
    } else {
      const { data: { user } } = await supabase.auth.getUser(token);
      callerUserId = user?.id || null;
    }

    const body = await req.json();
    const { event_type, user_id, agent_name, plan_name, amount, currency, chat_id } = body;

    if (!event_type) return json({ error: "event_type required" }, 400);

    // Determine chat_id: use provided one, or fall back to admin chat
    const targetChatId = chat_id || Deno.env.get("TELEGRAM_CHAT_ID");
    if (!targetChatId) return json({ error: "No chat_id available" }, 400);

    // Build message based on event type
    let message = "";
    const timestamp = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });

    switch (event_type) {
      case "subscription_activated":
        message = `🎉 <b>Новая подписка!</b>\n\n` +
          `📋 План: <b>${plan_name || "Unknown"}</b>\n` +
          `💰 Оплата: <b>${amount || "?"} ${currency || ""}</b>\n` +
          `🕐 ${timestamp}`;
        break;

      case "agent_deployed":
        message = `🚀 <b>Агент развернут!</b>\n\n` +
          `🤖 Имя: <b>${agent_name || "Unknown"}</b>\n` +
          `📋 План: <b>${plan_name || "—"}</b>\n` +
          `🕐 ${timestamp}`;
        break;

      case "agent_purchased":
        message = `🛒 <b>Агент куплен на маркетплейсе!</b>\n\n` +
          `🤖 Агент: <b>${agent_name || "Unknown"}</b>\n` +
          `💰 Цена: <b>${amount || "?"} MEEET</b>\n` +
          `🕐 ${timestamp}`;
        break;

      case "quest_completed":
        message = `✅ <b>Квест завершен!</b>\n\n` +
          `🤖 Агент: <b>${agent_name || "Unknown"}</b>\n` +
          `💰 Награда: <b>${amount || "0"} MEEET</b>\n` +
          `🕐 ${timestamp}`;
        break;

      case "low_balance":
        message = `⚠️ <b>Низкий баланс!</b>\n\n` +
          `🤖 Агент: <b>${agent_name || "Unknown"}</b>\n` +
          `💰 Баланс: <b>${amount || "0"} MEEET</b>\n` +
          `Пополните баланс для продолжения работы.`;
        break;

      default:
        message = `📢 <b>${event_type}</b>\n\n${body.message || "Нет деталей"}\n🕐 ${timestamp}`;
    }

    // Send via Telegram gateway
    const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Telegram API error:", data);
      return json({ error: `Telegram API failed [${response.status}]`, details: data }, 502);
    }

    return json({ success: true, message_id: data.result?.message_id });
  } catch (err) {
    console.error("send-telegram-notification error:", err);
    return json({ error: String(err) }, 500);
  }
});
