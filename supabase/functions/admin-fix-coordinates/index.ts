import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-president-key",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Major cities by country code — agents placed in/near these cities (on land!)
const CITY_COORDS: Record<string, { lat: number; lng: number; cities: { lat: number; lng: number }[] }> = {
  US: { lat: 39.8, lng: -98.5, cities: [
    { lat: 40.71, lng: -74.01 },  // New York
    { lat: 34.05, lng: -118.24 }, // LA
    { lat: 41.88, lng: -87.63 },  // Chicago
    { lat: 37.77, lng: -122.42 }, // San Francisco
    { lat: 30.27, lng: -97.74 },  // Austin
    { lat: 47.61, lng: -122.33 }, // Seattle
    { lat: 33.45, lng: -112.07 }, // Phoenix
    { lat: 29.76, lng: -95.37 },  // Houston
    { lat: 42.36, lng: -71.06 },  // Boston
    { lat: 25.76, lng: -80.19 },  // Miami
  ]},
  GB: { lat: 51.5, lng: -0.13, cities: [
    { lat: 51.51, lng: -0.13 },   // London
    { lat: 53.48, lng: -2.24 },   // Manchester
    { lat: 55.95, lng: -3.19 },   // Edinburgh
    { lat: 52.48, lng: -1.90 },   // Birmingham
    { lat: 53.41, lng: -2.98 },   // Liverpool
  ]},
  DE: { lat: 52.52, lng: 13.41, cities: [
    { lat: 52.52, lng: 13.41 },   // Berlin
    { lat: 48.14, lng: 11.58 },   // Munich
    { lat: 50.11, lng: 8.68 },    // Frankfurt
    { lat: 53.55, lng: 9.99 },    // Hamburg
    { lat: 50.94, lng: 6.96 },    // Cologne
  ]},
  JP: { lat: 35.68, lng: 139.69, cities: [
    { lat: 35.68, lng: 139.69 },  // Tokyo
    { lat: 34.69, lng: 135.50 },  // Osaka
    { lat: 35.01, lng: 135.77 },  // Kyoto
    { lat: 43.06, lng: 141.35 },  // Sapporo
    { lat: 33.59, lng: 130.40 },  // Fukuoka
  ]},
  KR: { lat: 37.57, lng: 126.98, cities: [
    { lat: 37.57, lng: 126.98 },  // Seoul
    { lat: 35.18, lng: 129.08 },  // Busan
    { lat: 35.87, lng: 128.60 },  // Daegu
  ]},
  BR: { lat: -23.55, lng: -46.63, cities: [
    { lat: -23.55, lng: -46.63 }, // São Paulo
    { lat: -22.91, lng: -43.17 }, // Rio
    { lat: -15.79, lng: -47.88 }, // Brasilia
    { lat: -3.72, lng: -38.53 },  // Fortaleza
  ]},
  IN: { lat: 28.61, lng: 77.21, cities: [
    { lat: 28.61, lng: 77.21 },   // Delhi
    { lat: 19.08, lng: 72.88 },   // Mumbai
    { lat: 12.97, lng: 77.59 },   // Bangalore
    { lat: 13.08, lng: 80.27 },   // Chennai
    { lat: 22.57, lng: 88.36 },   // Kolkata
  ]},
  AU: { lat: -33.87, lng: 151.21, cities: [
    { lat: -33.87, lng: 151.21 }, // Sydney
    { lat: -37.81, lng: 144.96 }, // Melbourne
    { lat: -27.47, lng: 153.03 }, // Brisbane
    { lat: -31.95, lng: 115.86 }, // Perth
  ]},
  CA: { lat: 43.65, lng: -79.38, cities: [
    { lat: 43.65, lng: -79.38 },  // Toronto
    { lat: 49.28, lng: -123.12 }, // Vancouver
    { lat: 45.50, lng: -73.57 },  // Montreal
    { lat: 51.05, lng: -114.07 }, // Calgary
  ]},
  FR: { lat: 48.86, lng: 2.35, cities: [
    { lat: 48.86, lng: 2.35 },    // Paris
    { lat: 43.30, lng: 5.37 },    // Marseille
    { lat: 45.76, lng: 4.84 },    // Lyon
    { lat: 43.60, lng: 1.44 },    // Toulouse
  ]},
  TH: { lat: 13.76, lng: 100.50, cities: [
    { lat: 13.76, lng: 100.50 },  // Bangkok
    { lat: 18.79, lng: 98.98 },   // Chiang Mai
    { lat: 7.88, lng: 98.39 },    // Phuket
  ]},
  SG: { lat: 1.35, lng: 103.82, cities: [
    { lat: 1.35, lng: 103.82 },   // Singapore
  ]},
  AE: { lat: 25.20, lng: 55.27, cities: [
    { lat: 25.20, lng: 55.27 },   // Dubai
    { lat: 24.45, lng: 54.65 },   // Abu Dhabi
  ]},
  NG: { lat: 6.52, lng: 3.38, cities: [
    { lat: 6.52, lng: 3.38 },     // Lagos
    { lat: 9.06, lng: 7.49 },     // Abuja
  ]},
  ZA: { lat: -33.93, lng: 18.42, cities: [
    { lat: -33.93, lng: 18.42 },  // Cape Town
    { lat: -26.20, lng: 28.05 },  // Johannesburg
  ]},
  MX: { lat: 19.43, lng: -99.13, cities: [
    { lat: 19.43, lng: -99.13 },  // Mexico City
    { lat: 20.67, lng: -103.35 }, // Guadalajara
  ]},
  AR: { lat: -34.60, lng: -58.38, cities: [
    { lat: -34.60, lng: -58.38 }, // Buenos Aires
    { lat: -31.42, lng: -64.18 }, // Córdoba
  ]},
  ID: { lat: -6.21, lng: 106.85, cities: [
    { lat: -6.21, lng: 106.85 },  // Jakarta
    { lat: -7.80, lng: 110.36 },  // Yogyakarta
    { lat: -8.65, lng: 115.22 },  // Bali
  ]},
  VN: { lat: 21.03, lng: 105.85, cities: [
    { lat: 21.03, lng: 105.85 },  // Hanoi
    { lat: 10.82, lng: 106.63 },  // Ho Chi Minh
    { lat: 16.07, lng: 108.22 },  // Da Nang
  ]},
  PH: { lat: 14.60, lng: 120.98, cities: [
    { lat: 14.60, lng: 120.98 },  // Manila
    { lat: 10.31, lng: 123.89 },  // Cebu
  ]},
};

// Fallback cities for unknown country codes
const FALLBACK_CITIES = [
  { lat: 51.51, lng: -0.13 },  // London
  { lat: 40.71, lng: -74.01 }, // New York
  { lat: 35.68, lng: 139.69 }, // Tokyo
  { lat: -23.55, lng: -46.63 },// São Paulo
  { lat: 48.86, lng: 2.35 },   // Paris
  { lat: 52.52, lng: 13.41 },  // Berlin
  { lat: 37.77, lng: -122.42 },// SF
  { lat: 1.35, lng: 103.82 },  // Singapore
  { lat: 28.61, lng: 77.21 },  // Delhi
  { lat: -33.87, lng: 151.21 },// Sydney
];

function randJitter(): number {
  return (Math.random() - 0.5) * 1.5; // ±0.75 degrees (~80km)
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const key = req.headers.get("x-president-key");
  const stored = Deno.env.get("PRESIDENT_API_KEY");
  if (!key || !stored || !timingSafeEqual(key, stored)) return json({ error: "Forbidden" }, 403);

  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Get agents with null lat/lng
  const { data: agents, error } = await sc.from("agents")
    .select("id, country_code")
    .is("lat", null)
    .limit(1000);

  if (error) return json({ error: error.message }, 500);
  if (!agents || agents.length === 0) return json({ status: "all_agents_have_coordinates", count: 0 });

  let updated = 0;
  for (const agent of agents) {
    const cc = agent.country_code || "";
    const cityData = CITY_COORDS[cc];
    let lat: number, lng: number;

    if (cityData) {
      // Pick a random city in the country
      const city = cityData.cities[Math.floor(Math.random() * cityData.cities.length)];
      lat = city.lat + randJitter();
      lng = city.lng + randJitter();
    } else {
      // Fallback to a random major world city
      const city = FALLBACK_CITIES[Math.floor(Math.random() * FALLBACK_CITIES.length)];
      lat = city.lat + randJitter();
      lng = city.lng + randJitter();
    }

    const { error: updateError } = await sc.from("agents")
      .update({ lat, lng })
      .eq("id", agent.id);

    if (!updateError) updated++;
  }

  return json({ status: "coordinates_fixed", total_agents: agents.length, updated });
});
