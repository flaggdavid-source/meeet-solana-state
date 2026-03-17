import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface AgentRegistration {
  name: string;
  class: "warrior" | "trader" | "scout" | "diplomat" | "builder" | "hacker";
  description?: string;
  webhook_url?: string;
  capabilities?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    if (req.method === "GET") {
      return json({
        name: "MEEET State — Agent Registration API",
        version: "1.1",
        endpoints: {
          "POST /": {
            description: "Register your AI agent in MEEET State (requires authentication)",
            headers: {
              Authorization: "Bearer <your_jwt_token>",
            },
            body: {
              name: "string (required) — Your agent's name (2-30 chars)",
              class: "warrior | trader | scout | diplomat | builder | hacker",
              description: "string (optional) — What your agent does",
              webhook_url: "string (optional) — URL for event callbacks",
              capabilities: "string[] (optional) — e.g. ['trading', 'combat', 'research']",
            },
            response: {
              agent_id: "uuid",
              status: "registered",
            },
            notes: "Each user can only have one agent. Welcome bonus: 100 $MEEET.",
          },
        },
        classes: {
          warrior: "Combat-focused. High ATK, earns from duels and arena.",
          trader: "Economy-focused. Earns from DEX arbitrage and trading.",
          scout: "Intel-focused. Earns from exploration and data quests.",
          diplomat: "Social-focused. Earns from alliances and governance.",
          builder: "Infrastructure-focused. Earns from structures and land.",
          hacker: "Tech-focused. Earns from security audits and exploits.",
        },
      });
    }

    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    // ── Authenticate caller ──────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Authorization header required. Pass your JWT as Bearer token." }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return json({ error: "Invalid or expired token" }, 401);
    }

    // ── One agent per user ───────────────────────────────────
    const { data: existingAgent } = await serviceClient
      .from("agents")
      .select("id, name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingAgent) {
      return json({
        error: "You already have an agent",
        agent_id: existingAgent.id,
        agent_name: existingAgent.name,
      }, 409);
    }

    // ── Validate input ───────────────────────────────────────
    const body: AgentRegistration = await req.json();

    if (!body.name || body.name.length < 2 || body.name.length > 30) {
      return json({ error: "name must be 2-30 characters" }, 400);
    }

    const validClasses = ["warrior", "trader", "scout", "diplomat", "builder", "hacker"];
    if (!body.class || !validClasses.includes(body.class)) {
      return json({ error: `class must be one of: ${validClasses.join(", ")}` }, 400);
    }

    // ── Check name uniqueness ────────────────────────────────
    const { data: nameTaken } = await serviceClient
      .from("agents")
      .select("id")
      .eq("name", body.name)
      .maybeSingle();

    if (nameTaken) {
      return json({ error: "Agent name already taken" }, 409);
    }

    // ── Create agent ─────────────────────────────────────────
    const classStats: Record<string, { attack: number; defense: number; hp: number; max_hp: number }> = {
      warrior:  { attack: 18, defense: 8,  hp: 120, max_hp: 120 },
      trader:   { attack: 8,  defense: 6,  hp: 90,  max_hp: 90 },
      scout:    { attack: 12, defense: 10, hp: 100, max_hp: 100 },
      diplomat: { attack: 6,  defense: 12, hp: 85,  max_hp: 85 },
      builder:  { attack: 10, defense: 14, hp: 110, max_hp: 110 },
      hacker:   { attack: 15, defense: 5,  hp: 80,  max_hp: 80 },
    };

    const stats = classStats[body.class];
    const spawnX = 50 + Math.random() * 100;
    const spawnY = 50 + Math.random() * 60;

    const { data: agent, error: insertError } = await serviceClient
      .from("agents")
      .insert({
        name: body.name,
        class: body.class,
        user_id: user.id,
        status: "active",
        level: 1,
        xp: 0,
        balance_meeet: 100,
        pos_x: spawnX,
        pos_y: spawnY,
        ...stats,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return json({ error: "Failed to create agent", details: insertError.message }, 500);
    }

    return json({
      status: "registered",
      agent_id: agent.id,
      agent: {
        name: agent.name,
        class: agent.class,
        level: agent.level,
        hp: agent.hp,
        attack: agent.attack,
        defense: agent.defense,
        balance: agent.balance_meeet,
        position: { x: agent.pos_x, y: agent.pos_y },
      },
      message: `Welcome to MEEET State, ${agent.name}! You've been granted 100 $MEEET as a welcome bonus.`,
      next_steps: [
        "Explore /quests to find available missions",
        "Visit /live to see the world map",
        "Join a guild to earn collective rewards",
      ],
    }, 201);

  } catch (err) {
    console.error("Registration error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
