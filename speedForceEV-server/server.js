// server.js
const express = require("express");
const cors = require("cors");
const { readStore, writeStore, STORE_FILE_PATH } = require("./counter-store");

const app = express();
const PORT = process.env.PORT || 3001;

// CORS
app.use(cors({ origin: "*", credentials: false }));
app.use(express.json());

// Default stats (km will be overridden by stored value)
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

// Random value generator
const random = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Update Active
function updateActive() {
  fleetStats = fleetStats.map((item) => {
    if (item.label === "Active") {
      return { ...item, value: random(item.minValue, item.maxValue) };
    }
    return item;
  });
}

// Update kilometers + persist to disk
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

// API route
app.get("/api/live-fleet-stats", (req, res) => {
  res.json({
    success: true,
    data: fleetStats,
    timestamp: new Date().toISOString(),
  });
});

// Health
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Start server
(async () => {
  try {
    // Load stored km value
    const store = await readStore();
    const kmStat = fleetStats.find((s) => s.label === "Kilometers");

    if (store.greenKm) {
      kmStat.value = Number(store.greenKm);
      console.log(
        `Loaded persisted kilometers (${STORE_FILE_PATH}):`,
        store.greenKm
      );
    } else {
      console.log("Using default kilometers value.");
    }
  } catch (err) {
    console.log("Error loading persisted km:", err);
  }

  // Initial active update
  updateActive();

  // Start API
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Counter store file: ${STORE_FILE_PATH}`);
  });

  // Update every 20 minutes
  setInterval(() => {
    updateStats();
  }, 20 * 60 * 1000);
})();
