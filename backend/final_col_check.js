require('dotenv').config();
const seq = require('./db/sequelize');

async function main() {
  await seq.authenticate();
  console.log('DB connected');

  const [cols] = await seq.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='PackingItem'"
  );
  console.log('PackingItem_COLUMNS:', JSON.stringify(cols.map(c => c.COLUMN_NAME)));
  
  const [cols2] = await seq.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='PackingBox'"
  );
  console.log('PackingBox_COLUMNS:', JSON.stringify(cols2.map(c => c.COLUMN_NAME)));

  process.exit(0);
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});
