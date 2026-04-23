require('dotenv').config();
const seq = require('./db/sequelize');

async function main() {
  await seq.authenticate();
  console.log('DB connected');

  const tables = ['PackingItem', 'PackingSettings'];
  
  for (const table of tables) {
    const [cols] = await seq.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${table}' ORDER BY ORDINAL_POSITION`
    );
    console.log(`${table} columns:`, cols.map(c => c.COLUMN_NAME).join(', '));
    
    try {
      const [data] = await seq.query(`SELECT TOP 1 * FROM ${table}`);
      console.log(`${table} sample:`, JSON.stringify(data, null, 2));
    } catch (e) {
      console.log(`${table} query failed:`, e.message);
    }
  }

  process.exit(0);
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});
