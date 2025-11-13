// PM2 Ecosystem Configuration File
// This file helps manage the server process in production
// Usage: pm2 start ecosystem.config.js

module.exports = {
  apps: [{
    name: 'speedforceev-api',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    // Auto-restart if the app crashes
    autorestart: true,
    // Watch for file changes (disable in production)
    watch: false,
    // Maximum memory usage before restart (optional)
    max_memory_restart: '500M',
    // Log files
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    // Merge logs from all instances
    merge_logs: true,
    // Restart delay in milliseconds
    restart_delay: 4000,
    // Maximum number of restarts within max_restarts time window
    max_restarts: 10,
    min_uptime: '10s'
  }]
};

