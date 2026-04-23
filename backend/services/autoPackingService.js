const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');
const {
  clampInt,
  ensureOpenBox,
  getOrCreatePackingSettings,
  packReportRowIntoBox,
} = require('./packingHelpers');

const DEFAULT_BATCH_LIMIT = 100;

async function runAutoPack(io, options = {}) {
  try {
    const batchLimit = clampInt(
      options.batchLimit ?? process.env.AUTOPACK_BATCH_LIMIT,
      DEFAULT_BATCH_LIMIT,
      1,
      500,
    );

    const query = `
      SELECT TOP ${batchLimit}
        f.SL_NO,
        f.Barcode,
        f.Final_Marking,
        f.Shift
      FROM [FFAT].[dbo].[Final_Report] f
      LEFT JOIN PackingItem p ON f.Barcode = p.qrCode
      WHERE f.Overall_Result = 'OK' AND p.id IS NULL
      ORDER BY f.Date_Time ASC
    `;

    const okParts = await sequelize.query(query, { type: QueryTypes.SELECT });
    if (okParts.length === 0) return { processed: 0 };

    const settings = await getOrCreatePackingSettings();
    let currentBox = await ensureOpenBox(settings, io);
    let processed = 0;
    let packed = 0;

    for (const part of okParts) {
      const result = await packReportRowIntoBox(part, currentBox, settings, io);
      currentBox = result.currentBox;
      processed += 1;

      if (result.packed) {
        packed += 1;
      }

      if (result.reason === 'no_open_box' && !settings.autoCreateNextBox) {
        break;
      }
    }

    return { processed, packed };
  } catch (err) {
    console.error('[PACK] Auto-pack service error:', err.message);
    throw err;
  }
}

module.exports = { runAutoPack };
