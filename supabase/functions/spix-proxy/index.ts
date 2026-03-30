// @ts-nocheck
/**
 * spix-proxy — Generic proxy to Spix REST API
 *
 * Forwards any request to https://api.spix.sh/v1/{path}
 * with Bearer auth from SPIX_API_KEY secret.
 *
 * Usage from client:
 *   supabase.functions.invoke("spix-proxy", {
 *     body: { method: "POST", path: "/calls", payload: { ... } }
 *   })
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SPIX_BASE = "https://api.spix.sh/v1";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SPIX_API_KEY = Deno.env.get("SPIX_API_KEY")?.trim();
  if (!SPIX_API_KEY) {
    return jsonResponse({ success: false, error: "SPIX_API_KEY not configured" }, 500);
  }

  // Authenticate the caller via Supabase JWT
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } }
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  try {
    const body = await req.json();
    const { method = "GET", path, payload } = body;

    if (!path || typeof path !== "string") {
      return jsonResponse({ success: false, error: "path is required (e.g. '/calls')" }, 400);
    }

    // Sanitize path — must start with /
    const safePath = path.startsWith("/") ? path : `/${path}`;

    const fetchOpts: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        "Authorization": `Bearer ${SPIX_API_KEY}`,
        "Content-Type": "application/json",
      },
    };

    if (["POST", "PUT", "PATCH"].includes(fetchOpts.method!) && payload) {
      fetchOpts.body = JSON.stringify(payload);
    }

    const res = await fetch(`${SPIX_BASE}${safePath}`, fetchOpts);
    const data = await res.json();

    return jsonResponse({
      success: res.ok,
      status: res.status,
      data,
    }, res.ok ? 200 : res.status);
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 400);
  }
});
