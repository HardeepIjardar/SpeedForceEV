// counter-store.js
// Handles persistent storage for kilometers counter.
// Supports optional Supabase persistence (controlled by USE_SUPABASE env var).
// Falls back to local file storage if Supabase unavailable.

const fs = require("fs").promises;
const path = require("path");

const { enabled: SUPABASE_ENABLED, usedKeyName, getCounterValue, upsertCounterValue } = require("./db/supabase");

const DEFAULT_KM = Number(process.env.COUNTER_DEFAULT_KM ?? 7000000);
const STORE_FILE_PATH =
  process.env.COUNTER_STORE_FILE || path.join(__dirname, "data", "counter.json");
const TEMP_FILE_PATH = `${STORE_FILE_PATH}.tmp`;
const DATA_DIR = path.dirname(STORE_FILE_PATH);

const USE_SUPABASE = String(process.env.USE_SUPABASE || "false").toLowerCase() === "true";
const SUPABASE_WRITE_LOCAL_BACKUP = String(process.env.SUPABASE_WRITE_LOCAL_BACKUP || "false").toLowerCase() === "true";

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (_) {}
}

// Read store: prefer Supabase when requested & enabled; otherwise fallback to file
async function readStore() {
  await ensureDir();

  if (USE_SUPABASE && SUPABASE_ENABLED) {
    try {
      const val = await getCounterValue("green_kilometers");
      if (val !== null && val !== undefined) {
        console.log(`[counter-store] Read green_kilometers from Supabase (key=${usedKeyName}): ${val}`);
        return { greenKm: Number(val) };
      }
      console.log("[counter-store] Supabase has no green_kilometers row (falling back to file/default).");
    } catch (err) {
      console.error("[counter-store] Supabase read error:", err.message || err);
      // fallthrough to file fallback
    }
  }

  // file fallback
  try {
    const raw = await fs.readFile(STORE_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    console.log(`[counter-store] Loaded local store from ${STORE_FILE_PATH}`);
    return parsed;
  } catch (err) {
    console.log("[counter-store] No local store found; returning default value.");
    return { greenKm: DEFAULT_KM };
  }
}

// Write store: try Supabase first when enabled; fallback to local file
async function writeStore(obj) {
  await ensureDir();
  const value = Number(obj?.greenKm ?? DEFAULT_KM);

  if (USE_SUPABASE && SUPABASE_ENABLED) {
    try {
      await upsertCounterValue("green_kilometers", value);
      console.log(`[counter-store] Wrote ${value} to Supabase (key=${usedKeyName}).`);
      if (SUPABASE_WRITE_LOCAL_BACKUP) {
        await fs.writeFile(TEMP_FILE_PATH, JSON.stringify({ greenKm: value }), "utf8");
        await fs.rename(TEMP_FILE_PATH, STORE_FILE_PATH);
        console.log("[counter-store] Wrote local backup:", STORE_FILE_PATH);
      }
      return;
    } catch (err) {
      console.error("[counter-store] Error writing to Supabase:", err.message || err);
      // fall through to local write
    }
  }

  // local write (atomic)
  try {
    await fs.writeFile(TEMP_FILE_PATH, JSON.stringify({ greenKm: value }), "utf8");
    await fs.rename(TEMP_FILE_PATH, STORE_FILE_PATH);
    console.log(`[counter-store] Wrote local file: ${STORE_FILE_PATH}`);
  } catch (err) {
    console.error("[counter-store] Error writing local store:", err);
  }
}

module.exports = { readStore, writeStore, STORE_FILE_PATH };
