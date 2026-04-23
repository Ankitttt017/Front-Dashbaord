const express = require('express');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');
const sequelize = require('./db/sequelize');
const db = require('./models');
const { runAutoPack } = require('./services/autoPackingService');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const BIND_HOST = process.env.BIND_HOST || '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const AUTO_PACK_CRON = process.env.AUTOPACK_CRON || '*/30 * * * * *';
const AUTO_PACK_TIMEZONE = process.env.CRON_TIMEZONE || 'Asia/Kolkata';
const AUTO_PACK_BATCH_LIMIT = Number(process.env.AUTOPACK_BATCH_LIMIT) || 100;
const DB_CONNECT_TIMEOUT_MS = Number(process.env.DB_CONNECT_TIMEOUT_MS) || 5000;

const io = new Server(server, {
  cors: { origin: CORS_ORIGIN },
});

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '2mb' }));
app.set('io', io);
app.set('dbStatus', {
  connected: false,
  lastCheckedAt: null,
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/report', require('./routes/report'));
app.use('/api/packing', require('./routes/packing'));
app.use('/api/targets', require('./routes/targets'));
app.use('/api/system', require('./routes/system'));

let autoPackTask = null;
let shuttingDown = false;

function startAutoPackScheduler() {
  if (autoPackTask) return;

  autoPackTask = cron.schedule(
    AUTO_PACK_CRON,
    () => {
      runAutoPack(io, { batchLimit: AUTO_PACK_BATCH_LIMIT })
        .catch(err => console.error('[CRON] Auto-pack error:', err.message));
    },
    {
      timezone: AUTO_PACK_TIMEZONE,
      noOverlap: true,
      name: 'auto-pack',
    },
  );

  console.log(
    `[CRON] Auto-pack scheduler ready (${AUTO_PACK_CRON}, timezone ${AUTO_PACK_TIMEZONE}, batch ${AUTO_PACK_BATCH_LIMIT}).`,
  );
}

async function bootstrapDatabase() {
  const MAX_RETRIES = 4;
  const BASE_DELAY = 3000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      console.log(`[DB] Connection attempt ${attempt}/${MAX_RETRIES}...`);

      await Promise.race([
        sequelize.authenticate(),
        new Promise((_, reject) => {
          const timeout = setTimeout(
            () => reject(new Error(`Connection timed out after ${DB_CONNECT_TIMEOUT_MS}ms`)),
            DB_CONNECT_TIMEOUT_MS,
          );
          timeout.unref();
        }),
      ]);

      console.log('[DB] ✓ Database connected successfully');

      if (process.env.DB_SYNC === 'true') {
        const alter = process.env.DB_SYNC_ALTER === 'true';
        await db.sequelize.sync({ alter });
        console.log(`[DB] ✓ Models synchronized (${alter ? 'alter' : 'safe'} mode)`);
      }

      return true;
    } catch (err) {
      const errCode = err.original?.code || err.code || 'UNKNOWN';
      const errMsg = err.original?.message || err.message;

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt - 1); // exponential backoff
        console.error(`[DB] ✗ Attempt ${attempt} failed [${errCode}]: ${errMsg}`);
        console.error(`[DB]   Retrying in ${(delay / 1000).toFixed(1)}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`[DB] ✗ All ${MAX_RETRIES} attempts failed [${errCode}]: ${errMsg}`);
        console.error('[DB]   Auto-pack scheduler disabled. API remains accessible.');
        console.error('[DB]   Check: SQL Server running? Named instance correct? Firewall rules?');
      }
    }
  }

  return false;
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`[SYS] Received ${signal}. Shutting down gracefully...`);

  if (autoPackTask) {
    autoPackTask.stop();
  }

  server.close(async () => {
    try {
      await sequelize.close();
    } catch (error) {
      console.error('[SYS] Error while closing database connection:', error.message);
    } finally {
      process.exit(0);
    }
  });

  setTimeout(() => {
    console.error('[SYS] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
}

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[SYS] Port ${PORT} is already in use on ${BIND_HOST}.`);
    console.error('[SYS] Stop the existing process using that port, or change backend/.env PORT and update the frontend proxy/socket URL to match.');
    process.exit(1);
  }

  console.error('[SYS] Server failed to start:', error.message);
  process.exit(1);
});

server.listen(PORT, BIND_HOST, async () => {
  console.log(`[SYS] Traceability API running at ${BIND_HOST}:${PORT}`);

  const connected = await bootstrapDatabase();
  app.set('dbStatus', {
    connected,
    lastCheckedAt: new Date().toISOString(),
  });
  if (connected) {
    startAutoPackScheduler();
  }
});

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
