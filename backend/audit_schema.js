require('dotenv').config();
const seq = require('./db/sequelize');

async function main() {
  await seq.authenticate();
  console.log('DB connected');

  const [cols] = await seq.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='PackingItem'"
  );
  
  const result = {
    exact_columns: cols.map(c => c.COLUMN_NAME),
    table_name: 'PackingItem'
  };

  const fs = require('fs');
  fs.writeFileSync('item_schema.json', JSON.stringify(result, null, 2));
  console.log('Schema written to item_schema.json');
  process.exit(0);
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});
