// db/supabase.js
// Supabase helper: server-side usage. Accepts either service role key (preferred) or anon key.
// Exports: enabled (bool), getCounterValue(name), upsertCounterValue(name, value)

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || ""; // e.g. https://<project>.supabase.co
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || ""; // let's accept multiple names

// Determine which key to use: prefer service role (server writes), otherwise anon key.
let client = null;
let usedKeyName = null;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  usedKeyName = "SERVICE_ROLE";
} else if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  usedKeyName = "ANON";
} else {
  // not configured
  module.exports = {
    enabled: false,
    getCounterValue: async () => null,
    upsertCounterValue: async () => null,
  };
  return;
}

async function getCounterValue(name) {
  const { data, error } = await client
    .from("fleet_counters")
    .select("value")
    .eq("name", name)
    .limit(1);

  if (error) {
    // Bubble up error for caller to handle
    throw error;
  }

  if (!data || data.length === 0) return null;
  return Number(data[0].value);
}

async function upsertCounterValue(name, value) {
  // Use upsert. Note: anon key may be blocked by RLS/policies; service role key is recommended.
  const { error } = await client
    .from("fleet_counters")
    .upsert({ name, value: Number(value), last_updated: new Date().toISOString() }, { returning: "minimal" });

  if (error) {
    throw error;
  }
  return true;
}

module.exports = {
  enabled: true,
  usedKeyName,
  getCounterValue,
  upsertCounterValue,
};
