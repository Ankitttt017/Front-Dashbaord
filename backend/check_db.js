require('dotenv').config();
const seq = require('./db/sequelize');

async function main() {
  await seq.authenticate();
  console.log('DB connected');

  const [r1] = await seq.query('SELECT COUNT(*) as cnt FROM PackingItem');
  console.log('PackingItem count:', r1[0].cnt);

  const [r2] = await seq.query('SELECT COUNT(*) as cnt FROM PackingSettings');
  console.log('PackingSettings count:', r2[0].cnt);

  const [cols] = await seq.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='PackingBox' ORDER BY ORDINAL_POSITION"
  );
  console.log('PackingBox columns:', cols.map(c => c.COLUMN_NAME).join(', '));

  const [data] = await seq.query('SELECT TOP 2 * FROM PackingBox');
  console.log('PackingBox sample:', JSON.stringify(data, null, 2));

  process.exit(0);
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});
