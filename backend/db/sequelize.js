const { Sequelize } = require('sequelize');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

/* ─── Parse env vars ─── */
const rawServer   = process.env.DB_SERVER || 'localhost';
const DB_PORT     = Number(process.env.DB_PORT) || 1433;
const DB_NAME     = process.env.DB_NAME || 'database';
const DB_USER     = process.env.DB_USER || '';
const DB_PASS     = process.env.DB_PASS || '';
const DB_ENCRYPT  = (process.env.DB_ENCRYPT || 'false') === 'true';
const DB_TRUST    = (process.env.DB_TRUST_CERT || 'true') === 'true';

/* ─── Pool settings ─── */
const POOL_MAX     = Number(process.env.DB_POOL_MAX) || 10;
const POOL_MIN     = Number(process.env.DB_POOL_MIN) || 2;
const POOL_ACQUIRE = Number(process.env.DB_POOL_ACQUIRE) || 30000;
const POOL_IDLE    = Number(process.env.DB_POOL_IDLE) || 10000;

/* ─── Timeouts ─── */
const CONNECT_TIMEOUT = Number(process.env.DB_CONNECT_TIMEOUT_MS) || 15000;
const REQUEST_TIMEOUT = Number(process.env.DB_REQUEST_TIMEOUT_MS) || 30000;

/* ─── Handle named instances (e.g. localhost\SQLEXPRESS) ─── */
let host = rawServer;
let instanceName = null;

if (rawServer.includes('\\')) {
  const parts = rawServer.split('\\');
  host = parts[0];
  instanceName = parts[1];
}

/* ─── Build dialect options for tedious driver ─── */
const dialectOptions = {
  options: {
    encrypt: DB_ENCRYPT,
    trustServerCertificate: DB_TRUST,
    connectTimeout: CONNECT_TIMEOUT,
    requestTimeout: REQUEST_TIMEOUT,
    ...(instanceName ? { instanceName, port: undefined } : {}),
  },
};

/* ─── Sequelize instance ─── */
const sequelizeOptions = {
  host,
  dialect: 'mssql',
  dialectOptions,
  logging: (msg) => {
    if (process.env.DB_LOGGING === 'true') {
      console.log('[DB:SQL]', msg);
    }
  },
  pool: {
    max: POOL_MAX,
    min: POOL_MIN,
    acquire: POOL_ACQUIRE,
    idle: POOL_IDLE,
    evict: 1000,
  },
  retry: {
    max: 3,
  },
};

if (!instanceName) {
  sequelizeOptions.port = DB_PORT;
}

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, sequelizeOptions);

/* ─── Startup log ─── */
const connTarget = instanceName
  ? `${host}\\${instanceName} (named instance)`
  : `${host}:${DB_PORT}`;

console.log(`[DB] Sequelize configured → ${connTarget} / ${DB_NAME} (pool ${POOL_MIN}-${POOL_MAX})`);

module.exports = sequelize;