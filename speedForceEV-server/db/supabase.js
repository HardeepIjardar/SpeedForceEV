// db/supabase.js
// Supabase helper: server-side usage. Accepts either service role key (preferred) or anon key.
// Exports: enabled (bool), usedKeyName (string|null), getCounterValue(name), upsertCounterValue(name, value)

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || ""; // e.g. https://<project>.supabase.co
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || ""; // accept multiple names

let client = null;
let usedKeyName = null;

if (!SUPABASE_URL) {
  console.log("[supabase] SUPABASE_URL not set. Supabase disabled.");
} else if (SUPABASE_SERVICE_ROLE_KEY) {
  client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  usedKeyName = "SERVICE_ROLE";
  console.log("[supabase] Client created with SERVICE_ROLE key.");
} else if (SUPABASE_ANON_KEY) {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  usedKeyName = "ANON";
  console.log("[supabase] Client created with ANON key (writes may be blocked by RLS).");
} else {
  console.log("[supabase] No key provided. Supabase disabled.");
}

const enabled = !!client;

async function getCounterValue(name) {
  if (!enabled) return null;

  const { data, error } = await client
    .from("fleet_counters")
    .select("value")
    .eq("name", name)
    .limit(1);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) return null;
  return Number(data[0].value);
}

async function upsertCounterValue(name, value) {
  if (!enabled) return false;

  const { error } = await client
    .from("fleet_counters")
    .upsert(
      {
        name,
        value: Number(value),
        last_updated: new Date().toISOString(),
      },
      { returning: "minimal" }
    );

  if (error) {
    throw error;
  }
  return true;
}

module.exports = {
  enabled,
  usedKeyName,
  getCounterValue,
  upsertCounterValue,
};
