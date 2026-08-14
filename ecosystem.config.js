/**
 * PM2 Ecosystem Config — ReFly Payment Dashboard
 *
 * Usage:
 *   ./node_modules/.bin/pm2 start ecosystem.config.js
 *   ./node_modules/.bin/pm2 save
 *   ./node_modules/.bin/pm2 startup
 */
module.exports = {
  apps: [
    {
      name: 'refly-payment-dashboard',

      // Use Plesk's bundled Node.js (change path if your Plesk version differs)
      interpreter: '/opt/plesk/node/21/bin/node',

      // next start runs from node_modules/.bin/next
      script: 'node_modules/.bin/next',
      args: 'start -p 3040',

      cwd: '/var/www/vhosts/reports.refly.org/httpdocs',

      // Load env from .env.local
      env_file: '.env.local',

      instances: 1,       // Single instance (stateless session via cookie)
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',

      // Logging
      error_file: './logs/pm2-error.log',
      out_file:   './logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 10000,
    },
  ],
};
