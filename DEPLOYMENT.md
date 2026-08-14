# Plesk Deployment Guide — reports.refly.org

## Overview

The ReFly Payment Dashboard runs as an **independent** Node.js process on `127.0.0.1:3040`.  
Plesk proxies only `reports.refly.org` to that process.  
**No other domains or Nginx configs are modified.**

---

## Step 1 — Transfer Files to Server

```bash
# On your local machine — build and archive
npm run build
tar -czf refly-dashboard.tar.gz \
  .next package.json package-lock.json \
  next.config.ts tailwind.config.ts postcss.config.js \
  tsconfig.json public scripts

# Upload to server
scp refly-dashboard.tar.gz user@your-server:/var/www/vhosts/reports.refly.org/
```

Or use Plesk's File Manager to upload files.

---

## Step 2 — Install on Server

```bash
cd /var/www/vhosts/reports.refly.org/httpdocs

# Extract
tar -xzf ../refly-dashboard.tar.gz

# Install production dependencies using Plesk's Node
/opt/plesk/node/21/bin/npm install --production

# Create .env.local
cp .env.example .env.local
nano .env.local  # Fill in your credentials
```

---

## Step 3 — Run Database Setup

```bash
mysql -u root -p zendesk_reporting < scripts/setup-db.sql
```

Create the read-only MySQL user (once):
```sql
CREATE USER IF NOT EXISTS 'refly_reporting_ro'@'127.0.0.1'
  IDENTIFIED BY 'YourStrongDBPassword';

GRANT SELECT ON zendesk_reporting.reporting_tickets TO 'refly_reporting_ro'@'127.0.0.1';
GRANT SELECT ON zendesk_reporting.users TO 'refly_reporting_ro'@'127.0.0.1';

FLUSH PRIVILEGES;
```

---

## Step 4 — Seed Admin User

```bash
SEED_ADMIN_PASSWORD=YourAdminPass123! \
  /opt/plesk/node/21/bin/node \
  --require tsx/cjs \
  scripts/seed-admin.ts
```

---

## Step 5 — Start with PM2 (Recommended)

Install PM2 in the project (not globally):
```bash
/opt/plesk/node/21/bin/npm install --save-dev pm2
```

Create `ecosystem.config.js`:
```js
module.exports = {
  apps: [{
    name: 'refly-payment-dashboard',
    script: '/opt/plesk/node/21/bin/node',
    args: 'node_modules/.bin/next start -p 3040',
    cwd: '/var/www/vhosts/reports.refly.org/httpdocs',
    env_file: '.env.local',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    merge_logs: true,
  }],
};
```

Start:
```bash
./node_modules/.bin/pm2 start ecosystem.config.js
./node_modules/.bin/pm2 save
./node_modules/.bin/pm2 startup
```

---

## Step 6 — Configure Plesk Reverse Proxy

### Option A: Plesk Node.js Extension

1. Go to **Plesk → reports.refly.org → Node.js**
2. Set **Document Root** to the app directory
3. Set **Application Root** to same directory
4. Set **Application Startup File** → `node_modules/.bin/next`
5. Set **Application URL** → `https://reports.refly.org`
6. Set **Application Port** → `3040`

### Option B: Manual Nginx via Plesk (Additional Nginx Directives)

In **Plesk → reports.refly.org → Apache & nginx Settings → Additional nginx directives**:

```nginx
location / {
    proxy_pass         http://127.0.0.1:3040;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade $http_upgrade;
    proxy_set_header   Connection 'upgrade';
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 300s;
    proxy_connect_timeout 30s;
}
```

> ⚠️ This directive is **scoped to `reports.refly.org` only**.  
> Do NOT add it to the global nginx config.

---

## Step 7 — Verify Isolation

Check the app is only listening on 127.0.0.1:3040:

```bash
# Should show: 127.0.0.1:3040
ss -tlnp | grep 3040

# Or
netstat -tlnp | grep 3040
```

Expected output:
```
tcp  0  0  127.0.0.1:3040  0.0.0.0:*  LISTEN  <pid>/node
```

It should **NOT** show `0.0.0.0:3040` (which would mean it's publicly exposed).

---

## Step 8 — Verify Health Endpoint

```bash
# From the server (direct)
curl http://127.0.0.1:3040/api/health

# From the internet (via Plesk proxy)
curl https://reports.refly.org/api/health
```

Expected:
```json
{"status": "ok", "timestamp": "2024-01-01T12:00:00.000Z", "service": "refly-payment-dashboard"}
```

---

## Step 9 — SSL

Plesk handles SSL termination for `reports.refly.org` automatically.  
The app itself runs HTTP on `127.0.0.1:3040` — only Plesk's Nginx faces the public internet.

Install Let's Encrypt via Plesk for `reports.refly.org` if not already done.

---

## Step 10 — Production Build After Updates

```bash
cd /var/www/vhosts/reports.refly.org/httpdocs

# Pull new files (or re-upload)
# Then:
/opt/plesk/node/21/bin/npm run build

# Restart app
./node_modules/.bin/pm2 restart refly-payment-dashboard
```

---

## Maintenance Commands

```bash
# View logs
./node_modules/.bin/pm2 logs refly-payment-dashboard

# Tail audit logs
tail -f logs/audit-$(date +%Y-%m-%d).log

# Status
./node_modules/.bin/pm2 status

# Stop
./node_modules/.bin/pm2 stop refly-payment-dashboard

# Restart
./node_modules/.bin/pm2 restart refly-payment-dashboard
```

---

## Security Checklist

- [ ] `.env.local` file permissions: `chmod 600 .env.local`
- [ ] `logs/` directory not accessible from web (Nginx should block `/.../logs/`)
- [ ] `scripts/` directory not accessible from web
- [ ] Verify `SHOW GRANTS FOR 'refly_reporting_ro'@'127.0.0.1'` shows no `refly_db` access
- [ ] Verify app is NOT listening on `0.0.0.0:3040`
- [ ] SSL certificate valid for `reports.refly.org`
- [ ] SESSION_SECRET is at least 32 characters and random
- [ ] Admin password changed from default

---

## Isolation Guarantee

The following are **never modified** by this application:
- `refly.org` or any existing subdomain configuration
- Global Nginx config (`/etc/nginx/nginx.conf`)
- Any existing Docker containers or services
- `refly_db` database (read-only user has zero access)
- Any existing Laravel/WordPress/API application configs
