require('dotenv').config();
const sequelize = require('./db/sequelize');
const { QueryTypes } = require('sequelize');

const TABLE_NAME = '[FFAT].[dbo].[Final_Report]';
const SEED_BARCODE_PREFIX = 'DUMMY-TRACE-';

const HEAT_RESULT_KEYS = [
  'Station_9_1_Result',
  'Station_9_2_Result',
  'Station_9_3_Result',
  'Station_9_4_Result',
  'Station_9_5_Result',
  'Station_9_6_Result',
];

const EXTRA_COLUMNS = [
  { name: 'Station_9_1_Result', type: 'VARCHAR(50)' },
  { name: 'Station_9_2_Result', type: 'VARCHAR(50)' },
  { name: 'Station_9_3_Result', type: 'VARCHAR(50)' },
  { name: 'Station_9_4_Result', type: 'VARCHAR(50)' },
  { name: 'Station_9_5_Result', type: 'VARCHAR(50)' },
  { name: 'Station_9_6_Result', type: 'VARCHAR(50)' },
  { name: 'Heat_Status', type: 'VARCHAR(50)' },
  { name: 'Heat_In', type: 'INT' },
  { name: 'Heat_Out', type: 'INT' },
];

function padNumber(value, size = 4) {
  return String(value).padStart(size, '0');
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function formatTimeOnly(date) {
  return date.toISOString().slice(11, 19);
}

function buildDummyBarcode(index) {
  return `${SEED_BARCODE_PREFIX}${padNumber(index + 1)}`;
}

function buildDummyDate(index) {
  const base = new Date();
  base.setMinutes(0, 0, 0);
  base.setHours(6 + (index * 2));
  base.setDate(base.getDate() - Math.floor(index / 3));
  return base;
}

function pickShift(index) {
  return ['A', 'B', 'C'][index % 3];
}

function pickResult(index, key = '') {
  if (key === 'Overall_Result') {
    return index === 3 ? 'NG' : 'OK';
  }

  if (key === 'Station_17_Result') {
    return index === 3 ? 'NG' : 'OK';
  }

  return 'OK';
}

function buildDummyValue(column, index) {
  const columnName = column.column_name;
  const dataType = String(column.data_type || '').toLowerCase();
  const dateValue = buildDummyDate(index);
  const barcode = buildDummyBarcode(index);

  if (columnName === 'Barcode') return barcode;
  if (columnName === 'Shift') return pickShift(index);
  if (columnName === 'Date_Time') return dateValue;
  if (columnName === 'Date') return formatDateOnly(dateValue);
  if (columnName === 'Time') return formatTimeOnly(dateValue);
  if (columnName === 'Overall_Result') return pickResult(index, columnName);
  if (columnName === 'Heat_Status') return index % 2 === 0 ? 'COMPLETE' : 'PROCESS';
  if (columnName === 'Heat_In') return 10 + index;
  if (columnName === 'Heat_Out') return 16 + index;
  if (columnName === 'Internal_Leak' || columnName === 'External_Leak') return index === 3 ? 'NG' : 'OK';
  if (columnName === 'Final_Marking') return `MARK-${padNumber(index + 1, 3)}`;
  if (columnName === 'Part_No' || columnName === 'PartNo') return `PART-${padNumber(index + 1, 3)}`;
  if (columnName === 'Model' || columnName === 'Variant') return index % 2 === 0 ? 'BMW GEN-6' : 'BMW GEN-6 ALT';
  if (columnName === 'Operator_Name' || columnName === 'Operator') return `Operator ${index + 1}`;
  if (columnName === 'Machine_Name' || columnName === 'Machine') return `Machine ${index + 1}`;
  if (columnName === 'Remarks' || columnName === 'Comment') return `Dummy row ${index + 1}`;
  if (columnName === 'Status') return 'COMPLETE';
  if (columnName === 'Category') return index % 2 === 0 ? 'A1' : 'B1';
  if (columnName === 'Line') return 'TRACE';

  if (columnName.endsWith('_Result') || HEAT_RESULT_KEYS.includes(columnName)) {
    return pickResult(index, columnName);
  }

  if (dataType.includes('char') || dataType.includes('text')) return `TEST-${index + 1}`;
  if (dataType === 'uniqueidentifier') return `00000000-0000-0000-0000-00000000000${index + 1}`;
  if (['int', 'bigint', 'smallint', 'tinyint'].includes(dataType)) return index + 1;
  if (['decimal', 'numeric', 'float', 'real', 'money', 'smallmoney'].includes(dataType)) return Number(`${index + 1}.0`);
  if (dataType === 'bit') return index % 2;
  if (['date'].includes(dataType)) return formatDateOnly(dateValue);
  if (['datetime', 'datetime2', 'smalldatetime', 'datetimeoffset'].includes(dataType)) return dateValue;
  if (dataType === 'time') return formatTimeOnly(dateValue);

  return null;
}

async function ensureColumns() {
  for (const col of EXTRA_COLUMNS) {
    const exists = await sequelize.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Final_Report' AND COLUMN_NAME = :col`,
      {
        replacements: { col: col.name },
        type: QueryTypes.SELECT,
      },
    );

    if (exists.length === 0) {
      console.log(`[DB] Adding ${col.name} to Final_Report`);
      await sequelize.query(`ALTER TABLE ${TABLE_NAME} ADD ${col.name} ${col.type}`);
    } else {
      console.log(`[DB] ${col.name} already exists in Final_Report`);
    }
  }
}

async function fillMissingDefaults() {
  console.log('[DB] Filling missing station defaults for existing rows');
  await sequelize.query(`
    UPDATE ${TABLE_NAME}
    SET
      Station_9_1_Result = COALESCE(Station_9_1_Result, 'OK'),
      Station_9_2_Result = COALESCE(Station_9_2_Result, 'OK'),
      Station_9_3_Result = COALESCE(Station_9_3_Result, 'OK'),
      Station_9_4_Result = COALESCE(Station_9_4_Result, 'OK'),
      Station_9_5_Result = COALESCE(Station_9_5_Result, 'OK'),
      Station_9_6_Result = COALESCE(Station_9_6_Result, 'OK'),
      Heat_Status = COALESCE(Heat_Status, 'COMPLETE'),
      Heat_In = COALESCE(Heat_In, 12),
      Heat_Out = COALESCE(Heat_Out, 18)
  `);
}

async function getWritableColumns() {
  return sequelize.query(
    `
      SELECT
        c.COLUMN_NAME AS column_name,
        c.DATA_TYPE AS data_type,
        c.IS_NULLABLE AS is_nullable,
        COLUMNPROPERTY(OBJECT_ID(c.TABLE_SCHEMA + '.' + c.TABLE_NAME), c.COLUMN_NAME, 'IsIdentity') AS is_identity,
        COLUMNPROPERTY(OBJECT_ID(c.TABLE_SCHEMA + '.' + c.TABLE_NAME), c.COLUMN_NAME, 'IsComputed') AS is_computed
      FROM INFORMATION_SCHEMA.COLUMNS c
      WHERE c.TABLE_SCHEMA = 'dbo'
        AND c.TABLE_NAME = 'Final_Report'
      ORDER BY c.ORDINAL_POSITION
    `,
    { type: QueryTypes.SELECT },
  );
}

function selectInsertableColumns(columns) {
  return columns.filter((column) => {
    const dataType = String(column.data_type || '').toLowerCase();
    const columnName = column.column_name;

    if (column.is_identity) return false;
    if (column.is_computed) return false;
    if (dataType === 'timestamp' || dataType === 'rowversion') return false;
    if (columnName === 'SL_NO') return false;

    return true;
  });
}

async function removeExistingDummyRows() {
  const deleted = await sequelize.query(
    `DELETE FROM ${TABLE_NAME} WHERE Barcode LIKE :barcodePrefix`,
    {
      replacements: { barcodePrefix: `${SEED_BARCODE_PREFIX}%` },
      type: QueryTypes.BULKDELETE,
    },
  );

  return deleted;
}

async function insertDummyRows(columns, rowCount = 5) {
  for (let index = 0; index < rowCount; index += 1) {
    const replacements = {};
    const columnNames = [];
    const valuePlaceholders = [];

    columns.forEach((column) => {
      const paramName = `c_${index}_${column.column_name}`;
      const value = buildDummyValue(column, index);

      if (value === null && column.is_nullable === 'YES') {
        return;
      }

      columnNames.push(`[${column.column_name}]`);
      valuePlaceholders.push(`:${paramName}`);
      replacements[paramName] = value;
    });

    await sequelize.query(
      `INSERT INTO ${TABLE_NAME} (${columnNames.join(', ')}) VALUES (${valuePlaceholders.join(', ')})`,
      { replacements, type: QueryTypes.INSERT },
    );

    console.log(`[DB] Inserted dummy row ${index + 1}/${rowCount}`);
  }
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log('[DB] Connected');

    await ensureColumns();
    await fillMissingDefaults();

    const allColumns = await getWritableColumns();
    const insertableColumns = selectInsertableColumns(allColumns);
    console.log(`[DB] Final_Report writable columns detected: ${insertableColumns.length}`);

    await removeExistingDummyRows();
    await insertDummyRows(insertableColumns, 5);

    console.log('[DB] Done. Added 5 dummy rows for testing.');
    process.exit(0);
  } catch (error) {
    console.error('[DB] Error:', error.message);
    process.exit(1);
  }
}

main();
