const {
  fetchReportRowByBarcode,
  normalizeResult,
  STATION_KEYS,
  deriveShiftValue,
} = require('../utils/reportData');

async function checkBarcode(req, res) {
  try {
    const barcode = String(req.params.barcode || '').trim();
    if (!barcode) {
      return res.status(400).json({ found: false, scannedBarcode: '', message: 'Barcode is required' });
    }

    const row = await fetchReportRowByBarcode(barcode);
    if (!row) {
      return res.json({
        found: false,
        barcode: null,
        scannedBarcode: barcode,
        overall_result: 'IN PROGRESS',
      });
    }

    const stationResults = {};
    for (const key of STATION_KEYS) {
      stationResults[key] = row[key] ?? null;
    }

    const overallResult = normalizeResult(row.Overall_Result);

    return res.json({
      found: true,
      barcode: row.Barcode || barcode,
      scannedBarcode: barcode,
      overall_result: overallResult,
      Overall_Result: overallResult,
      shift: deriveShiftValue(row.Shift ?? row.shift, row.Date_Time) || null,
      Shift: deriveShiftValue(row.Shift ?? row.shift, row.Date_Time) || null,
      date_time: row.Date_Time ?? null,
      Date_Time: row.Date_Time ?? null,
      station_results: stationResults,
      internal_leak: row.Internal_Leak ?? null,
      Internal_Leak: row.Internal_Leak ?? null,
      external_leak: row.External_Leak ?? null,
      External_Leak: row.External_Leak ?? null,
      final_marking: row.Final_Marking ?? null,
      Final_Marking: row.Final_Marking ?? null,
    });
  } catch (error) {
    console.error('[SCAN] checkBarcode failed:', error.message);
    return res.status(500).json({ found: false, scannedBarcode: req.params.barcode || '', message: 'Failed to check barcode' });
  }
}

module.exports = {
  checkBarcode,
};
