import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const MEEET_CONTRACT = "EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump";
const PUMP_FUN_URL = `https://frontend-api-v3.pump.fun/coins/${MEEET_CONTRACT}`;
const DEXSCREENER_URL = `https://api.dexscreener.com/latest/dex/tokens/${MEEET_CONTRACT}`;
const SOL_PRICE_URL = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";
const CACHE_TTL_MS = 60_000;

interface PriceData {
  priceUsd: number;
  priceSOL: number;
  marketCap: number;
  volume24h: number;
  change24h: number;
  liquidity: number;
  fetchedAt: number;
  bondingCurveProgress?: number;
  bondingCurveSol?: number;
  source?: string;
}

let cachedPrice: PriceData | null = null;

async function getSolPrice(): Promise<number> {
  try {
    const res = await fetch(SOL_PRICE_URL, { headers: { "User-Agent": "MEEET-Platform/1.0" } });
    if (res.ok) {
      const data = await res.json();
      return data?.solana?.usd ?? 130;
    }
  } catch (_) {}
  return 130;
}

async function fetchFromPumpFun(solPrice: number): Promise<PriceData | null> {
  try {
    const res = await fetch(PUMP_FUN_URL, { headers: { "User-Agent": "MEEET-Platform/1.0" } });
    if (!res.ok) return null;
    const data = await res.json();

    const virtualSolReserves = Number(data.virtual_sol_reserves || 0) / 1e9; // lamports to SOL
    const virtualTokenReserves = Number(data.virtual_token_reserves || 0) / 1e6; // token decimals

    const priceSOL = virtualTokenReserves > 0 ? virtualSolReserves / virtualTokenReserves : 0;
    const priceUsd = priceSOL * solPrice;
    const marketCap = data.usd_market_cap || (data.market_cap ? data.market_cap * solPrice / 1e9 : priceUsd * 1e9);

    // Bonding curve: pump.fun bonding curve fills at ~85 SOL
    const BONDING_CURVE_TARGET_SOL = 85;
    const realSolReserves = Number(data.virtual_sol_reserves || 0) / 1e9 - 30; // subtract virtual offset (~30 SOL)
    const bondingCurveSol = Math.max(0, realSolReserves);
    const bondingCurveProgress = Math.min(100, (bondingCurveSol / BONDING_CURVE_TARGET_SOL) * 100);

    return {
      priceUsd: priceUsd > 0 ? priceUsd : 0.001,
      priceSOL,
      marketCap,
      volume24h: 0,
      change24h: 0,
      liquidity: 0,
      fetchedAt: Date.now(),
      bondingCurveProgress,
      bondingCurveSol,
      source: "pump.fun",
    };
  } catch (err) {
    console.error("pump.fun fetch error:", err);
    return null;
  }
}

async function fetchFromDexScreener(): Promise<PriceData | null> {
  try {
    const res = await fetch(DEXSCREENER_URL, { headers: { "User-Agent": "MEEET-Platform/1.0" } });
    if (!res.ok) return null;
    const data = await res.json();
    const pairs = data.pairs || [];
    let bestPair = pairs[0];
    for (const p of pairs) {
      if ((p.liquidity?.usd || 0) > (bestPair?.liquidity?.usd || 0)) bestPair = p;
    }
    if (!bestPair) return null;
    return {
      priceUsd: parseFloat(bestPair.priceUsd || "0"),
      priceSOL: parseFloat(bestPair.priceNative || "0"),
      marketCap: bestPair.marketCap || bestPair.fdv || 0,
      volume24h: bestPair.volume?.h24 || 0,
      change24h: bestPair.priceChange?.h24 || 0,
      liquidity: bestPair.liquidity?.usd || 0,
      fetchedAt: Date.now(),
      source: "dexscreener",
    };
  } catch (_) {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const now = Date.now();

    if (cachedPrice && now - cachedPrice.fetchedAt < CACHE_TTL_MS) {
      return json({ ...cachedPrice, cached: true });
    }

    const solPrice = await getSolPrice();

    // Try pump.fun first, then DexScreener
    let priceData = await fetchFromPumpFun(solPrice);
    if (!priceData || priceData.priceUsd <= 0) {
      priceData = await fetchFromDexScreener();
    }

    if (priceData && priceData.priceUsd > 0) {
      cachedPrice = priceData;

      // Store in DB
      try {
        const sc = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await sc.from("token_price_history").insert({
          price_usd: priceData.priceUsd,
          price_sol: priceData.priceSOL,
          market_cap: priceData.marketCap,
          volume_24h: priceData.volume24h,
          liquidity_usd: priceData.liquidity,
        });
      } catch (_) {}

      return json({ ...priceData, cached: false });
    }

    if (cachedPrice) return json({ ...cachedPrice, cached: true, stale: true });

    return json({
      priceUsd: 0,
      priceSOL: 0,
      marketCap: 0,
      volume24h: 0,
      change24h: 0,
      liquidity: 0,
      fetchedAt: now,
      fallback: true,
      unavailable: true,
    });
  } catch (err: any) {
    console.error("get-meeet-price error:", err);
    if (cachedPrice) return json({ ...cachedPrice, cached: true, stale: true });
    return json({ priceUsd: 0, fallback: true, unavailable: true, error: err.message }, 200);
  }
});
