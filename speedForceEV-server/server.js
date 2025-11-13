const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS configuration - allow specific origins in production
// Set CORS_ORIGIN environment variable to your React app URL (e.g., 'https://speedforceev.in')
// For multiple origins, use comma-separated values: 'https://speedforceev.in,https://www.speedforceev.in'
// If CORS_ORIGIN is not set, allows all origins (useful for development)
const corsOrigin = process.env.CORS_ORIGIN;

const corsOptions = corsOrigin && corsOrigin !== '*'
  ? {
      origin: function (origin, callback) {
        const allowedOrigins = corsOrigin.split(',').map(origin => origin.trim());
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      optionsSuccessStatus: 200,
    }
  : {
      origin: '*', // Allow all origins (development only)
      credentials: false,
      optionsSuccessStatus: 200,
    };

app.use(cors(corsOptions));
app.use(express.json());

// Optional request logging middleware (can be disabled via environment variable)
const enableRequestLogging = process.env.ENABLE_REQUEST_LOGGING === 'true';
if (enableRequestLogging) {
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip || req.connection.remoteAddress}`);
    next();
  });
}

// Initial fleet stats data
let fleetStats = [
  {
    label: "Deployed",
    value: 3820,
    icon: "mdi mdi-moped-electric",
    isStatic: true,
  },
  {
    label: "Active",
    value: 2974,
    icon: "mdi mdi-car-multiple",
    isStatic: false,
    minValue: 2974,
    maxValue: 3820,
  },
  {
    label: "Kilometers",
    value: 7000000,
    icon: "mdi mdi-map-marker-distance",
    isStatic: false,
    baseValue: 7000000,
    minKm: 150,
    maxKm: 250,
  },
];

// Function to generate random value between min and max
const getRandomValue = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Function to update Active only (for initial setup)
const updateActiveOnly = () => {
  fleetStats = fleetStats.map((item) => {
    if (item.label === "Active") {
      // Update active value between minValue and maxValue
      return {
        ...item,
        value: getRandomValue(item.minValue, item.maxValue),
      };
    }
    return item;
  });
};

// Function to update fleet stats
const updateFleetStats = () => {
  let kmIncrement = 0;
  
  fleetStats = fleetStats.map((item) => {
    if (item.isStatic) {
      // Keep static values unchanged
      return item;
    }

    if (item.label === "Active") {
      // Update active value between minValue and maxValue
      return {
        ...item,
        value: getRandomValue(item.minValue, item.maxValue),
      };
    }

    if (item.label === "Kilometers") {
      // Increment kilometers by a random amount between minKm and maxKm
      const randomIncrement = getRandomValue(item.minKm, item.maxKm);
      kmIncrement = randomIncrement; // Store for logging
      return {
        ...item,
        value: item.value + randomIncrement, // Increment the current value
      };
    }

    return item;
  });

  const activeStat = fleetStats.find(s => s.label === 'Active');
  const kmStat = fleetStats.find(s => s.label === 'Kilometers');
  
  console.log(`[${new Date().toISOString()}] Fleet stats updated:`, 
    `Active: ${activeStat ? activeStat.value : 'N/A'},`,
    `Kilometers: ${kmStat ? kmStat.value.toLocaleString('en-IN') : 'N/A'} (+${kmIncrement})`
  );
};

// API endpoint to get live fleet stats
app.get('/api/live-fleet-stats', (req, res) => {
  try {
    res.json({
      success: true,
      data: fleetStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in /api/live-fleet-stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  try {
    res.json({
      status: 'ok',
      service: 'speedForceEV-server',
      environment: NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in /health:', error);
    res.status(500).json({
      status: 'error',
      service: 'speedForceEV-server',
      timestamp: new Date().toISOString(),
    });
  }
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message,
    timestamp: new Date().toISOString(),
  });
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`🚀 SpeedForceEV Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📊 Live Fleet Stats API: http://localhost:${PORT}/api/live-fleet-stats`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  
  // Initialize Active with a random value (kilometers stays at 7000000)
  updateActiveOnly();
  console.log(`📊 Initial stats - Active: ${fleetStats.find(s => s.label === 'Active').value}, Kilometers: ${fleetStats.find(s => s.label === 'Kilometers').value.toLocaleString('en-IN')} (will increment every 20 minutes)`);
  
  // Update stats every 20 minutes
  // Note: Active changes randomly between 2974-3820
  // Kilometers increments by 150-250 every 20 minutes (starting from 7000000)
  setInterval(updateFleetStats, 20 * 60 * 1000); // 20 minutes
  console.log(`⏰ Stats update interval: 20 minutes`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please use a different port.`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
    process.exit(1);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

