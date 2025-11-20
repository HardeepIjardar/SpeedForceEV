// server.js
require('dotenv').config();
const express = require("express");
const cors = require("cors");
const { readStore, writeStore, STORE_FILE_PATH } = require("./counter-store");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "*", credentials: false }));
app.use(express.json());

const USE_SUPABASE = String(process.env.USE_SUPABASE || "false").toLowerCase() === "true";

let fleetStats = [
  {
    label: "Deployed",
    value: 3820,
    icon: "mdi mdi-moped",
    isStatic: true,
  },
  {
    label: "Active",
    value: 2974,
    icon: "mdi mdi-moped-electric",
    isStatic: false,
    minValue: 3000,
    maxValue: 3500,
  },
  {
    label: "Kilometers",
    value: 7000000,
    icon: "mdi mdi-map-marker-distance",
    isStatic: false,
    minKm: 150,
    maxKm: 250,
  },
];

const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function updateActive() {
  fleetStats = fleetStats.map((item) => {
    if (item.label === "Active") {
      return { ...item, value: random(item.minValue, item.maxValue) };
    }
    return item;
  });
}

async function updateStats() {
  let kmIncrement = 0;

  fleetStats = fleetStats.map((item) => {
    if (item.label === "Kilometers") {
      kmIncrement = random(item.minKm, item.maxKm);
      return { ...item, value: Number(item.value) + kmIncrement };
    }
    if (item.label === "Active") {
      return { ...item, value: random(item.minValue, item.maxValue) };
    }
    return item;
  });

  const km = fleetStats.find((s) => s.label === "Kilometers").value;
  console.log(`[Update] Kilometers: ${km} (+${kmIncrement})`);

  // Persist the value
  await writeStore({ greenKm: km });
}

app.get("/api/live-fleet-stats", (req, res) => {
  res.json({
    success: true,
    data: fleetStats,
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

(async () => {
  try {
    console.log(`[Startup] USE_SUPABASE=${USE_SUPABASE}`);
    const store = await readStore();
    const kmStat = fleetStats.find((s) => s.label === "Kilometers");

    if (store.greenKm) {
      kmStat.value = Number(store.greenKm);
      console.log(`Loaded persisted kilometers (${STORE_FILE_PATH}):`, store.greenKm);
    } else {
      console.log("Using default kilometers value.");
    }
  } catch (err) {
    console.log("Error loading persisted km:", err);
  }

  updateActive();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Counter store file: ${STORE_FILE_PATH}`);
  });

  // Production: 20 minutes (20 * 60 * 1000). Current for dev/testing may be smaller.
  // Keep your current setting; change to 20*60*1000 in production.
  setInterval(() => {
    updateStats();
  }, 20 * 60 * 1000); // 20 minute
})();
