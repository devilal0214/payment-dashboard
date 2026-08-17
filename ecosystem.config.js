/**
 * PM2 Ecosystem Config — ReFly Payment Dashboard & Dedicated Export Worker
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

      // Plesk's bundled Node.js runtime
      interpreter: '/opt/plesk/node/21/bin/node',

      // Next.js production server
      script: 'node_modules/.bin/next',
      args: 'start -p 3040',

      cwd: '/var/www/vhosts/refly.org/reports.refly.org/payment-dashboard',

      env_file: '.env.local',

      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',

      error_file: './logs/pm2-error.log',
      out_file:   './logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 10000,
    },
    {
      name: 'refly-payment-export-worker',

      interpreter: '/opt/plesk/node/21/bin/node',
      script: 'scripts/export-worker-standalone.js',

      cwd: '/var/www/vhosts/refly.org/reports.refly.org/payment-dashboard',

      env_file: '.env.local',

      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',

      error_file: './logs/worker-error.log',
      out_file:   './logs/worker-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
