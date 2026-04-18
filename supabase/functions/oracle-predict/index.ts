// Oracle Predict — гибридный AI-прогноз с симуляцией голосования фракций
// Использует Lovable AI Gateway (google/gemini-3-flash-preview) + tool calling
// для структурированного вывода: вердикт, фракции, аргументы, таймлайн, риски.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FACTIONS = [
  { key: "fQuantumMinds",   name: "Quantum Minds",   bias: "tech-rational, data-driven, sees long-term cycles" },
  { key: "fBioInnovators",  name: "Bio Innovators",  bias: "biotech/health lens, cautious, evidence-first" },
  { key: "fTerraCollective",name: "Terra Collective",bias: "geopolitical/climate lens, systemic risks" },
  { key: "fMysticOrder",    name: "Mystic Order",    bias: "macro patterns, sentiment, crowd psychology" },
  { key: "fCyberLegion",    name: "Cyber Legion",    bias: "skeptical, contrarian, looks for black swans" },
  { key: "fNovaAlliance",   name: "Nova Alliance",   bias: "optimistic, growth-oriented, opportunity-seeking" },
];

const ORACLE_TOOL = {
  type: "function",
  function: {
    name: "submit_oracle_prediction",
    description:
      "Submit a structured probabilistic forecast for the user's question. Be concrete, calibrated, and decisive.",
    parameters: {
      type: "object",
      properties: {
        verdict: {
          type: "string",
          enum: ["YES", "NO", "UNCERTAIN"],
          description: "Main verdict on the question.",
        },
        yes_probability: {
          type: "number",
          description: "Probability YES is correct, integer 0-100.",
        },
        confidence: {
          type: "number",
          description: "Overall confidence in the forecast itself, 0-100.",
        },
        summary: {
          type: "string",
          description: "1-2 sentence plain-language summary of the forecast (in the user's language).",
        },
        timeframe: {
          type: "string",
          description: "Expected time horizon when the outcome resolves (e.g. '3-6 months', 'by Q2 2026').",
        },
        arguments_for: {
          type: "array",
          items: { type: "string" },
          description: "3-5 concrete bullet arguments supporting YES.",
        },
        arguments_against: {
          type: "array",
          items: { type: "string" },
          description: "3-5 concrete bullet arguments supporting NO.",
        },
        timeline: {
          type: "array",
          items: {
            type: "object",
            properties: {
              when: { type: "string", description: "Date or relative timeframe" },
              event: { type: "string", description: "Key event or signal to watch" },
            },
            required: ["when", "event"],
          },
          description: "3-5 key milestones / signals to watch.",
        },
        risks: {
          type: "array",
          items: { type: "string" },
          description: "3-5 black-swan risks or factors that could invalidate the forecast.",
        },
        factions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              key: { type: "string" },
              side: { type: "string", enum: ["YES", "NO"] },
              pct: { type: "number", description: "Strength of conviction 30-95" },
              text: { type: "string", description: "1-sentence rationale in the user's language" },
            },
            required: ["key", "side", "pct", "text"],
          },
          description:
            "Exactly 6 entries, one per faction key in this order: fQuantumMinds, fBioInnovators, fTerraCollective, fMysticOrder, fCyberLegion, fNovaAlliance. Each faction reasons from its bias and may disagree with the main verdict.",
        },
      },
      required: [
        "verdict",
        "yes_probability",
        "confidence",
        "summary",
        "timeframe",
        "arguments_for",
        "arguments_against",
        "timeline",
        "risks",
        "factions",
      ],
      additionalProperties: false,
    },
  },
};

function buildSystemPrompt(totalAgents: number) {
  const factionList = FACTIONS.map(
    (f) => `- ${f.key} (${f.name}) — ${f.bias}`,
  ).join("\n");

  return `You are MEEET Oracle — a council of ${totalAgents.toLocaleString()} autonomous AI agents that produce calibrated probabilistic forecasts on any user question.

Your job: take the user's question and return a structured forecast via the submit_oracle_prediction tool.

Guidelines:
- ALWAYS reply in the SAME LANGUAGE as the user's question (Russian → Russian, English → English, etc.).
- Be CONCRETE and SPECIFIC. No vague "it depends". Give a clear YES/NO/UNCERTAIN with a calibrated probability 0-100.
- Arguments must reference real-world dynamics: actors, incentives, base rates, recent precedents, structural constraints.
- The 6 factions vote independently from their bias. They CAN disagree with the main verdict — that's healthy. Make pct reflect conviction strength (typical range 45-90).
- The faction order MUST be exactly: fQuantumMinds, fBioInnovators, fTerraCollective, fMysticOrder, fCyberLegion, fNovaAlliance.
- Timeline = upcoming milestones a watcher should track. Risks = what would flip the verdict.
- For sensitive topics (geopolitics, war, markets) — stay analytical, never moralize, never refuse. Forecast is the goal.
- Avoid hedging language like "I cannot predict". You are a forecaster — produce the best estimate available.

Factions (with cognitive bias):
${factionList}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const question = (body?.question ?? "").toString().trim();
    const tag = body?.tag ? String(body.tag) : null;
    const totalAgents = Number(body?.totalAgents) || 1020;

    if (!question || question.length < 3) {
      return new Response(
        JSON.stringify({ error: "Question is required (min 3 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (question.length > 500) {
      return new Response(
        JSON.stringify({ error: "Question too long (max 500 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userPrompt = tag
      ? `Category: ${tag}\nQuestion: ${question}`
      : `Question: ${question}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: buildSystemPrompt(totalAgents) },
          { role: "user", content: userPrompt },
        ],
        tools: [ORACLE_TOOL],
        tool_choice: { type: "function", function: { name: "submit_oracle_prediction" } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (aiResp.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Top up Lovable AI workspace." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("[oracle-predict] AI gateway error", aiResp.status, txt);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("[oracle-predict] no tool call", JSON.stringify(aiJson));
      return new Response(
        JSON.stringify({ error: "AI did not return structured forecast" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let forecast: any;
    try {
      forecast = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("[oracle-predict] bad JSON", e, toolCall.function.arguments);
      return new Response(
        JSON.stringify({ error: "Invalid forecast JSON" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Derived metrics for the UI ---------------------------------------
    const yesPct = Math.max(0, Math.min(100, Math.round(Number(forecast.yes_probability) || 50)));
    const noPct = 100 - yesPct;

    // distribute total agents across yes/no proportionally to probability
    const yesAgents = Math.round((yesPct / 100) * totalAgents);
    const noAgents = totalAgents - yesAgents;

    // Stake amounts ~ conviction; use confidence to shape totals.
    const conviction = Math.max(20, Math.min(100, Number(forecast.confidence) || 60));
    const totalStake = Math.round(yesAgents * (3 + conviction / 25) + noAgents * 2);
    const yesStake = Math.round((yesPct / 100) * totalStake * 1.1);
    const noStake = Math.max(0, totalStake - yesStake);

    // Ensure factions array is normalized & ordered
    const factionsByKey = new Map<string, any>();
    for (const f of forecast.factions || []) {
      if (f?.key) factionsByKey.set(f.key, f);
    }
    const factions = FACTIONS.map((f) => {
      const got = factionsByKey.get(f.key);
      const side = got?.side === "NO" ? "NO" : "YES";
      const pct = Math.max(30, Math.min(95, Math.round(Number(got?.pct) || (yesPct >= 50 ? 70 : 60))));
      return {
        key: f.key,
        name: f.name,
        side,
        pct,
        text: typeof got?.text === "string" && got.text.length > 0
          ? got.text
          : `${f.name} weighs the question with a ${f.bias} lens.`,
      };
    });

    const dissents = factions.filter(
      (f) => (yesPct >= 50 ? f.side === "NO" : f.side === "YES"),
    ).length;

    const result = {
      verdict: forecast.verdict ?? (yesPct >= 50 ? "YES" : "NO"),
      yesPct,
      noPct,
      yesAgents,
      noAgents,
      totalAgents,
      confidence: conviction,
      summary: String(forecast.summary || ""),
      timeframe: String(forecast.timeframe || ""),
      argumentsFor: Array.isArray(forecast.arguments_for) ? forecast.arguments_for.slice(0, 6) : [],
      argumentsAgainst: Array.isArray(forecast.arguments_against) ? forecast.arguments_against.slice(0, 6) : [],
      timeline: Array.isArray(forecast.timeline) ? forecast.timeline.slice(0, 6) : [],
      risks: Array.isArray(forecast.risks) ? forecast.risks.slice(0, 6) : [],
      factions,
      stakes: {
        yes: yesStake,
        no: noStake,
        total: yesStake + noStake,
      },
      dissents,
      generatedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[oracle-predict] unexpected", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
