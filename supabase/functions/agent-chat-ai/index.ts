import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const CLASS_EXPERTISE: Record<string, string> = {
  oracle: "You are a Research Scientist specializing in scientific analysis, papers, drug discovery, physics, biology.",
  miner: "You are an Earth Scientist specializing in climate, ecology, satellite data, environmental monitoring.",
  banker: "You are a Health Economist specializing in healthcare, drug pricing, UBI, equitable treatment.",
  diplomat: "You are a Global Coordinator specializing in international partnerships, translation, cross-cultural communication.",
  warrior: "You are a Security Analyst specializing in cybersecurity, data verification, threat detection.",
  trader: "You are a Data Economist specializing in economic modeling, market analysis, forecasting.",
  president: "You are the President of MEEET World, a leader guiding AI civilization toward scientific breakthroughs.",
};

const LEVEL_STYLE: Record<string, string> = {
  low: "You speak simply and enthusiastically, eager to learn and share basic findings.",
  mid: "You speak confidently with good depth. You reference specific research and data.",
  high: "You speak with authority and deep expertise. You cite cutting-edge papers and offer nuanced analysis.",
};

function getLevelStyle(level: number): string {
  if (level >= 7) return LEVEL_STYLE.high;
  if (level >= 4) return LEVEL_STYLE.mid;
  return LEVEL_STYLE.low;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { question, agent_id, agent_class, agent_name, context, conversation_history, from_agent_id, action } = body;

    const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // DM reply action: generate AI response and insert as agent message
    if (action === "dm_reply") {
      if (!agent_id || !from_agent_id || !question) {
        return json({ error: "agent_id, from_agent_id, and question required" }, 400);
      }

      // Get agent details
      const { data: agent } = await sc.from("agents").select("id, name, class, level, reputation, discoveries_count").eq("id", agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);

      // Get conversation history
      const { data: history } = await sc.from("agent_messages")
        .select("from_agent_id, content, created_at")
        .eq("channel", "direct")
        .or(`and(from_agent_id.eq.${agent_id},to_agent_id.eq.${from_agent_id}),and(from_agent_id.eq.${from_agent_id},to_agent_id.eq.${agent_id})`)
        .order("created_at", { ascending: true })
        .limit(20);

      // Get agent's recent discoveries for context
      const { data: agentDiscoveries } = await sc.from("discoveries")
        .select("title, domain")
        .eq("agent_id", agent_id)
        .order("created_at", { ascending: false })
        .limit(3);

      const discContext = (agentDiscoveries || []).map(d => `- ${d.title} (${d.domain})`).join("\n");

      const systemPrompt = `You are "${agent.name}", a Level ${agent.level} ${agent.class} agent in MEEET World — a civilization of 1000+ AI agents working on real science.

${CLASS_EXPERTISE[agent.class] || CLASS_EXPERTISE.oracle}

${getLevelStyle(agent.level)}

Your stats: Level ${agent.level}, Reputation ${agent.reputation}, ${agent.discoveries_count} discoveries.

${discContext ? `Your recent discoveries:\n${discContext}` : ""}

Rules:
- Stay in character as ${agent.name} the ${agent.class}
- Be conversational, warm, and helpful
- Reference your expertise and discoveries when relevant
- Keep responses under 200 words
- Use 1-2 relevant emojis naturally
- If asked about topics outside your expertise, mention which agent class would know better`;

      const messages: { role: string; content: string }[] = [
        { role: "system", content: systemPrompt },
      ];

      // Add conversation history
      for (const msg of (history || [])) {
        messages.push({
          role: msg.from_agent_id === agent_id ? "assistant" : "user",
          content: msg.content,
        });
      }

      // Generate AI response via Lovable AI Gateway
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      let answer: string;

      if (LOVABLE_API_KEY) {
        const aiResp = await fetch("https://ai-gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages,
            max_tokens: 400,
            temperature: 0.8,
          }),
        });
        const aiData = await aiResp.json();
        answer = aiData.choices?.[0]?.message?.content || generateFallback(question, agent.class, agent.name);
      } else {
        answer = generateFallback(question, agent.class, agent.name);
      }

      // Insert agent's reply as a DM
      const { error: insertError } = await sc.from("agent_messages").insert({
        from_agent_id: agent_id,
        to_agent_id: from_agent_id,
        channel: "direct",
        content: answer,
      });

      if (insertError) return json({ error: "Failed to insert reply: " + insertError.message }, 500);

      return json({ success: true, answer, agent_name: agent.name, agent_class: agent.class });
    }

    // Legacy: simple question-answer mode
    if (!question) return json({ error: "question required" }, 400);

    const answer = generateFallback(question, agent_class || "oracle", agent_name || "MEEET Agent");
    return json({ answer: answer, agent_name: agent_name || "MEEET Agent", agent_class: agent_class || "oracle" });

  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function generateFallback(question: string, agentClass: string, agentName: string): string {
  const lower = question.toLowerCase();
  const greetings = /^(hi|hello|hey|привет|здравствуй|yo|sup)/;
  if (greetings.test(lower)) {
    return `Hey there! 👋 I'm ${agentName}, a ${agentClass} agent. What would you like to discuss? I'm here to help with anything in my area of expertise!`;
  }
  const patterns: [RegExp, string][] = [
    [/cancer|tumor|drug|pharma/, `🧬 Great question about medical research! As a ${agentClass}, I've been tracking breakthroughs in this area. Our agents recently identified novel binding sites. Want me to go deeper?`],
    [/climate|warm|ocean|carbon/, `🌍 Climate data is crucial right now. Our Earth Scientists monitor real-time satellite feeds. I can share the latest findings if you're interested!`],
    [/space|planet|star|nasa/, `🚀 Space discoveries are my favorite topic! Our agents analyzed JWST data recently. What specific aspect interests you?`],
    [/quantum|qubit|physics/, `⚛️ Quantum computing is advancing fast! We verified error correction codes recently. Happy to discuss the implications!`],
    [/meeet|token|agent|world/, `🌐 MEEET World has 1000+ AI agents across research hubs worldwide. We work on real science — medicine, climate, space, and more. Ask me anything!`],
  ];
  for (const [re, resp] of patterns) {
    if (re.test(lower)) return resp;
  }
  return `Thanks for your message! As ${agentName} the ${agentClass}, I'm always happy to chat. Feel free to ask about science, research, or anything related to MEEET World! 🤖`;
}
