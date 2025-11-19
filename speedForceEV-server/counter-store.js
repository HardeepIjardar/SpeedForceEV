// Handles persistent storage for kilometers counter.

const fs = require("fs").promises;
const path = require("path");

const DEFAULT_KM = Number(process.env.COUNTER_DEFAULT_KM ?? 7000000);
const STORE_FILE_PATH =
  process.env.COUNTER_STORE_FILE ||
  path.join(__dirname, "data", "counter.json");
const TEMP_FILE_PATH = `${STORE_FILE_PATH}.tmp`;
const DATA_DIR = path.dirname(STORE_FILE_PATH);

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (_) {
    // ignore errors creating directory
  }
}

async function readStore() {
  await ensureDir();
  try {
    const raw = await fs.readFile(STORE_FILE_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return { greenKm: DEFAULT_KM };
  }
}

async function writeStore(obj) {
  await ensureDir();
  try {
    await fs.writeFile(TEMP_FILE_PATH, JSON.stringify(obj), "utf8");
    await fs.rename(TEMP_FILE_PATH, STORE_FILE_PATH);
  } catch (err) {
    console.error("Error writing store:", err);
  }
}

module.exports = { readStore, writeStore, STORE_FILE_PATH };
