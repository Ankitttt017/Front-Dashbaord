const {
  fetchReportRows,
  fetchReportDateRange,
  fetchJourneyParts,
  mergeRowsByBarcode,
  aggregateSummary,
  aggregateShiftWise,
  aggregateStationWise,
  aggregateHourly,
  resetJourneyStation,
  resolveTargetQty,
} = require('../utils/reportData');

function parsePage(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parseLimit(value, fallback = 50) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), 500);
}

async function getDateRange(req, res) {
  try {
    const range = await fetchReportDateRange();
    return res.json({
      min_date: range.min_date || null,
      max_date: range.max_date || null,
      minDate: range.min_date || null,
      maxDate: range.max_date || null,
    });
  } catch (error) {
    console.error('[REPORT] getDateRange failed:', error.message);
    return res.status(500).json({ message: 'Failed to load date range' });
  }
}

async function getSummary(req, res) {
  try {
    const rows = await fetchReportRows(req.query, { order: 'DESC' });
    const { summary, stationOkCounts } = aggregateSummary(rows);
    return res.json({
      ...summary,
      ...stationOkCounts,
    });
  } catch (error) {
    console.error('[REPORT] getSummary failed:', error.message);
    return res.status(500).json({ message: 'Failed to load summary' });
  }
}

async function getShiftWise(req, res) {
  try {
    const rows = await fetchReportRows(req.query, { order: 'DESC' });
    return res.json(aggregateShiftWise(rows));
  } catch (error) {
    console.error('[REPORT] getShiftWise failed:', error.message);
    return res.status(500).json({ message: 'Failed to load shift data' });
  }
}

async function getStationWise(req, res) {
  try {
    const rows = await fetchReportRows(req.query, { order: 'DESC' });
    return res.json(aggregateStationWise(rows));
  } catch (error) {
    console.error('[REPORT] getStationWise failed:', error.message);
    return res.status(500).json({ message: 'Failed to load station data' });
  }
}

async function getHourly(req, res) {
  try {
    const rows = await fetchReportRows(req.query, { order: 'DESC' });
    return res.json(aggregateHourly(rows));
  } catch (error) {
    console.error('[REPORT] getHourly failed:', error.message);
    return res.status(500).json({ message: 'Failed to load hourly data' });
  }
}

async function getRecords(req, res) {
  try {
    const rows = await fetchReportRows(req.query, { order: 'DESC' });
    const mergedRows = mergeRowsByBarcode(rows);
    const exportMode = String(req.query.export || '').toLowerCase() === 'true';

    if (exportMode) {
      return res.json({
        records: mergedRows,
        total: mergedRows.length,
        page: 1,
        totalPages: mergedRows.length > 0 ? 1 : 0,
      });
    }

    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit, 50);
    const total = mergedRows.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
    const startIndex = (safePage - 1) * limit;
    const records = mergedRows.slice(startIndex, startIndex + limit);

    return res.json({
      records,
      total,
      page: safePage,
      totalPages,
    });
  } catch (error) {
    console.error('[REPORT] getRecords failed:', error.message);
    return res.status(500).json({ message: 'Failed to load records' });
  }
}

async function getOee(req, res) {
  try {
    const rows = await fetchReportRows(req.query, { order: 'DESC' });
    const { summary } = aggregateSummary(rows);
    const targetDate = req.query.startDate || req.query.date || req.query.dateFrom || req.query.endDate || req.query.dateTo;
    const targetQty = await resolveTargetQty(targetDate, req.query.shift);

    const actual = summary.ok + summary.ng;
    const plannedOutput = targetQty > 0 ? targetQty : (actual || 1);
    const availability = summary.total > 0 ? 100 : 0;
    const performance = plannedOutput > 0 ? Number(Math.min(100, (actual / plannedOutput) * 100).toFixed(1)) : 0;
    const quality = actual > 0 ? Number(((summary.ok / actual) * 100).toFixed(1)) : 0;
    const oee = Number(((availability * performance * quality) / 10000).toFixed(1));

    return res.json({
      availability,
      performance,
      quality,
      oee,
      targetQty,
      ok: summary.ok,
      ng: summary.ng,
      in_progress: summary.in_progress,
      inProcess: summary.in_progress,
      total: summary.total,
    });
  } catch (error) {
    console.error('[REPORT] getOee failed:', error.message);
    return res.status(500).json({ message: 'Failed to load OEE data' });
  }
}

async function getJourney(req, res) {
  try {
    const parts = await fetchJourneyParts(req.query);
    return res.json({
      parts,
      total: parts.length,
    });
  } catch (error) {
    console.error('[REPORT] getJourney failed:', error.message);
    return res.status(500).json({ message: 'Failed to load part journey' });
  }
}

async function resetJourney(req, res) {
  try {
    const { barcode, stationKey, mode } = req.body || {};
    const updated = await resetJourneyStation(barcode, stationKey, mode);
    return res.json({
      ok: true,
      row: updated,
    });
  } catch (error) {
    const message = error.message || 'Failed to reset station';
    console.error('[REPORT] resetJourney failed:', message);
    const status = message === 'Part not found' || message === 'Invalid station key' || message === 'Barcode is required' ? 400 : 500;
    return res.status(status).json({ message });
  }
}

module.exports = {
  getDateRange,
  getSummary,
  getShiftWise,
  getStationWise,
  getHourly,
  getRecords,
  getOee,
  getJourney,
  resetJourney,
};
