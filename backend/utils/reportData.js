const { QueryTypes } = require('sequelize');
const sequelize = require('../db/sequelize');
const { Target } = require('../models');

const STATION_LABELS = {
  Station_30_Result: 'OP30 - FETLING',
  Station_31_Result: 'OP40 - HEAT TREATMENT',
  Station_32_Result: 'OP50 - PDI',
  Station_100_Result: 'OP60 - OP 60',
  Station_200_Result: 'OP70 - OP 70A / 70B',
  Station_300_Result: 'OP80/90 - OP 80A / OP 80B / OP 90A / OP 90B',
  Station_9_Result: 'OP100 - DEBURRING',
  Station_10_Result: 'OP110 - PRE WASHING',
  Station_11_Result: 'OP120 - MANUAL PDI',
  Station_12_Result: 'OP130 - LEAK TEST 1',
  Station_13_Result: 'OP135 - CMM',
  Station_14_Result: 'OP140 - DOWEL PRESSING',
  Station_15_Result: 'OP150 - ULTRASONIC WASHING',
  Station_16_Result: 'OP160 - PLUGGING',
  Station_17_Result: 'OP170 - LEAK TEST 2',
  Station_18_Result: 'OP180 - LASER MARKING',
  Station_19_Result: 'OP190 - FINAL INSPECTION',
};

const STATION_KEYS = [
  'Station_30_Result',
  'Station_31_Result',
  'Station_32_Result',
  'Station_100_Result',
  'Station_200_Result',
  'Station_300_Result',
  'Station_9_Result',
  'Station_10_Result',
  'Station_11_Result',
  'Station_12_Result',
  'Station_13_Result',
  'Station_14_Result',
  'Station_15_Result',
  'Station_16_Result',
  'Station_17_Result',
  'Station_18_Result',
  'Station_19_Result',
];
const RESULT_STATION_KEYS = [...STATION_KEYS];
const STATION_DETAIL_KEYS = ['T1', 'T2', 'T3', 'Trolley', 'In_Time', 'Out_Time', 'Internal_Leak', 'External_Leak', 'Final_Marking'];
const SHIFT_ORDER = ['A', 'B', 'C'];
const STATION_RESET_MAP = {
  Station_31_Result: {
    status: 'PENDING',
    details: {
      T1: null,
      T2: null,
      T3: null,
      Trolley: null,
      In_Time: null,
      Out_Time: null,
    },
  },
  Station_17_Result: {
    status: 'PENDING',
    details: {
      Internal_Leak: null,
      External_Leak: null,
    },
  },
  Station_18_Result: {
    status: 'PENDING',
    details: {
      Final_Marking: null,
    },
  },
};

const buildColumnNormalizedSql = (column) => `UPPER(LTRIM(RTRIM(COALESCE(${column}, ''))))`;
const OVERALL_RESULT_SQL = buildColumnNormalizedSql('Overall_Result');
const STATION_NG_SQL = RESULT_STATION_KEYS.map((key) => `${buildColumnNormalizedSql(key)} IN ('NG', 'NOK', 'FAIL')`).join(' OR ');

const RESULT_SQL = `
  CASE
    WHEN ${OVERALL_RESULT_SQL} IN ('NG', 'NOK', 'FAIL') OR (${STATION_NG_SQL}) THEN 'NG'
    WHEN ${OVERALL_RESULT_SQL} = 'OK' THEN 'OK'
    ELSE 'IN PROGRESS'
  END
`;

function normalizeResult(value) {
  if (value === null || value === undefined) return 'IN PROGRESS';

  const normalized = String(value).trim().toUpperCase();
  if (normalized === 'OK') return 'OK';
  if (normalized === 'NG' || normalized === 'NOK' || normalized === 'FAIL') return 'NG';
  if (normalized === 'IN PROGRESS' || normalized === 'IN_PROGRESS' || normalized === 'IN-PROGRESS') {
    return 'IN PROGRESS';
  }

  return 'IN PROGRESS';
}

function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized !== '' && normalized !== '-' && normalized !== '—' && normalized !== '–';
  }
  return true;
}

function hydrateStationAliases(row = {}) {
  const next = { ...row };

  if (!hasValue(next.Station_31_Result) && hasValue(next.Heat_Status)) {
    next.Station_31_Result = next.Heat_Status;
  }

  if (!hasValue(next.In_Time) && hasValue(next.Heat_In)) {
    next.In_Time = next.Heat_In;
  }

  if (!hasValue(next.Out_Time) && hasValue(next.Heat_Out)) {
    next.Out_Time = next.Heat_Out;
  }

  const downstreamOp50Keys = [
    'Station_100_Result',
    'Station_200_Result',
    'Station_300_Result',
    'Station_9_Result',
    'Station_10_Result',
    'Station_11_Result',
    'Station_12_Result',
    'Station_13_Result',
    'Station_14_Result',
    'Station_15_Result',
    'Station_16_Result',
    'Station_17_Result',
    'Station_18_Result',
    'Station_19_Result',
  ];

  const hasReachedDownstreamStation = downstreamOp50Keys.some((key) => hasValue(next[key]));
  const op30Passed = normalizeResult(next.Station_30_Result) === 'OK';
  const op40Passed = normalizeResult(next.Station_31_Result) === 'OK';

  if (!hasValue(next.Station_32_Result) && op30Passed && op40Passed && hasReachedDownstreamStation) {
    next.Station_32_Result = 'OK';
  }

  return next;
}

function deriveOverallResult(row = {}) {
  const stationResults = RESULT_STATION_KEYS.map((key) => normalizeResult(row[key]));
  if (stationResults.some((value) => value === 'NG')) return 'NG';

  const overallResult = normalizeResult(row.Overall_Result);
  if (overallResult === 'NG') return 'NG';
  if (overallResult === 'OK') return 'OK';

  if (stationResults.every((value) => value === 'OK')) return 'OK';
  return 'IN PROGRESS';
}

function normalizeShiftValue(value) {
  if (value === null || value === undefined) return '';
  const normalized = String(value).trim().toUpperCase();
  return normalized;
}

function deriveShiftValue(value, dateTime = null) {
  const normalized = normalizeShiftValue(value);
  if (SHIFT_ORDER.includes(normalized)) return normalized;

  const parsed = dateTime ? new Date(dateTime) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return '';

  const hour = parsed.getHours();

  if (hour >= 6 && hour < 14) return 'A';
  if (hour >= 14 && hour < 22) return 'B';
  return 'C';
}

function normalizeCategoryValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().toUpperCase();
}

function parseDateParam(value) {
  if (!value) return null;
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function round1(value) {
  return Number((Math.round(value * 10) / 10).toFixed(1));
}

function buildWhereClause(filters = {}) {
  const clauses = [];
  const replacements = {};

  const startDate = parseDateParam(filters.startDate || filters.dateFrom);
  const endDate = parseDateParam(filters.endDate || filters.dateTo);
  const shift = normalizeCategoryValue(filters.shift);
  const result = normalizeCategoryValue(filters.result);
  const category = normalizeCategoryValue(filters.category);
  const search = filters.search ? String(filters.search).trim() : '';

  clauses.push("UPPER(LTRIM(RTRIM(COALESCE(Shift, '')))) NOT IN ('', '0', 'UNKNOWN')");

  if (startDate) {
    clauses.push('CAST(Date_Time AS date) >= :startDate');
    replacements.startDate = startDate;
  }

  if (endDate) {
    clauses.push('CAST(Date_Time AS date) <= :endDate');
    replacements.endDate = endDate;
  }

  if (shift && shift !== 'ALL') {
    clauses.push("UPPER(LTRIM(RTRIM(COALESCE(Shift, '')))) = :shift");
    replacements.shift = shift;
  }

  if (result && result !== 'ALL') {
    clauses.push(`${RESULT_SQL} = :result`);
    replacements.result = normalizeResult(result);
  }

  if (category && category !== 'ALL') {
    clauses.push("UPPER(RIGHT(COALESCE(Barcode, ''), 2)) = :category");
    replacements.category = category;
  }

  if (search) {
    clauses.push("UPPER(COALESCE(Barcode, '')) LIKE :search");
    replacements.search = `%${search.toUpperCase()}%`;
  }

  return {
    whereClause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    replacements,
  };
}

async function fetchReportRows(filters = {}, options = {}) {
  const { whereClause, replacements } = buildWhereClause(filters);
  const order = String(options.order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const rows = await sequelize.query(
    `SELECT * FROM [FFAT].[dbo].[Final_Report] ${whereClause} ORDER BY Date_Time ${order}, SL_NO ${order}`,
    {
      replacements,
      type: QueryTypes.SELECT,
    },
  );

  return rows.map((row) => {
    const normalizedRow = hydrateStationAliases(row);
    return {
      ...normalizedRow,
      Shift: deriveShiftValue(normalizedRow.Shift ?? normalizedRow.shift, normalizedRow.Date_Time),
      Overall_Result: deriveOverallResult(normalizedRow),
    };
  });
}

async function fetchReportDateRange() {
  const [row] = await sequelize.query(
    `
      SELECT
        CONVERT(varchar(10), MIN(Date_Time), 23) AS min_date,
        CONVERT(varchar(10), MAX(Date_Time), 23) AS max_date
      FROM [FFAT].[dbo].[Final_Report]
    `,
    { type: QueryTypes.SELECT },
  );

  return row || { min_date: null, max_date: null };
}

async function fetchReportRowByBarcode(barcode) {
  if (!barcode) return null;

  const [row] = await sequelize.query(
    `
      SELECT TOP 1 *
      FROM [FFAT].[dbo].[Final_Report]
      WHERE UPPER(LTRIM(RTRIM(Barcode))) = UPPER(LTRIM(RTRIM(:barcode)))
      ORDER BY Date_Time DESC, SL_NO DESC
    `,
    {
      replacements: { barcode },
      type: QueryTypes.SELECT,
    },
  );

  if (!row) return null;

  return {
    ...hydrateStationAliases(row),
    Shift: deriveShiftValue(row.Shift ?? row.shift, row.Date_Time),
    Overall_Result: deriveOverallResult(hydrateStationAliases(row)),
  };
}

function createJourneyStation(row, stationKey) {
  const station = {
    key: stationKey,
    label: STATION_LABELS[stationKey] || stationKey,
    status: row?.[stationKey] ?? 'PENDING',
    details: {},
  };

  if (stationKey === 'Station_31_Result') {
    station.details = {
      T1: row?.T1 ?? null,
      T2: row?.T2 ?? null,
      T3: row?.T3 ?? null,
      Trolley: row?.Trolley ?? null,
      In_Time: row?.In_Time ?? null,
      Out_Time: row?.Out_Time ?? null,
    };
  }

  if (stationKey === 'Station_17_Result') {
    station.details = {
      Internal_Leak: row?.Internal_Leak ?? 'PENDING',
      External_Leak: row?.External_Leak ?? 'PENDING',
    };
  }

  if (stationKey === 'Station_18_Result') {
    station.details = {
      Final_Marking: row?.Final_Marking ?? null,
    };
  }

  return station;
}

function mergeRowsByBarcode(rows = []) {
  const mergedByBarcode = new Map();

  for (const row of rows) {
    const barcode = String(row.Barcode || '').trim();
    if (!barcode) continue;

    if (!mergedByBarcode.has(barcode)) {
      mergedByBarcode.set(barcode, {
        ...row,
        Barcode: barcode,
        Shift: deriveShiftValue(row.Shift ?? row.shift, row.Date_Time),
      });
      continue;
    }

    const merged = mergedByBarcode.get(barcode);

    for (const key of RESULT_STATION_KEYS) {
      if (!hasValue(merged[key]) && hasValue(row[key])) {
        merged[key] = row[key];
      }
    }

    for (const key of STATION_DETAIL_KEYS) {
      if (!hasValue(merged[key]) && hasValue(row[key])) {
        merged[key] = row[key];
      }
    }

    if (!hasValue(merged.Overall_Result) && hasValue(row.Overall_Result)) {
      merged.Overall_Result = row.Overall_Result;
    }
  }

  return Array.from(mergedByBarcode.values()).map((row) => ({
    ...row,
    Overall_Result: deriveOverallResult(row),
  }));
}

async function fetchJourneyParts(filters = {}) {
  const rows = await fetchReportRows(filters, { order: 'DESC' });
  const mergedRows = mergeRowsByBarcode(rows);

  return mergedRows.map((row) => {
    const barcode = String(row.Barcode || '').trim();
    return {
      barcode,
      shift: deriveShiftValue(row.Shift ?? row.shift, row.Date_Time),
      variant: row.Variant || row.Model || row.Part_No || row.PartNo || 'Unknown Variant',
      updatedAt: row.Date_Time || null,
      overall: deriveOverallResult(row),
      raw: row,
      stations: STATION_KEYS.map((stationKey) => createJourneyStation(row, stationKey)),
    };
  });
}

async function resetJourneyStation(barcode, stationKey, mode = 'single') {
  const normalizedBarcode = String(barcode || '').trim();
  if (!normalizedBarcode) {
    throw new Error('Barcode is required');
  }

  const startIndex = STATION_KEYS.indexOf(stationKey);
  if (startIndex === -1) {
    throw new Error('Invalid station key');
  }

  const targetRow = await fetchReportRowByBarcode(normalizedBarcode);
  if (!targetRow) {
    throw new Error('Part not found');
  }

  const affectedStations = mode === 'from_here'
    ? STATION_KEYS.slice(startIndex)
    : [stationKey];

  const assignments = [];
  const replacements = { barcode: normalizedBarcode };

  affectedStations.forEach((key) => {
    assignments.push(`[${key}] = :${key}`);
    replacements[key] = STATION_RESET_MAP[key]?.status || 'PENDING';

    const details = STATION_RESET_MAP[key]?.details || {};
    Object.entries(details).forEach(([detailKey, detailValue]) => {
      assignments.push(`[${detailKey}] = :${detailKey}`);
      replacements[detailKey] = detailValue;
    });
  });

  if (affectedStations.length > 0) {
    assignments.push('[Overall_Result] = :overallResult');
    replacements.overallResult = 'IN PROGRESS';
  }

  await sequelize.query(
    `
      UPDATE [FFAT].[dbo].[Final_Report]
      SET ${assignments.join(', ')}
      WHERE SL_NO = :slNo
    `,
    {
      replacements: {
        ...replacements,
        slNo: targetRow.SL_NO,
      },
      type: QueryTypes.UPDATE,
    },
  );

  return fetchReportRowByBarcode(normalizedBarcode);
}

function bucketKey(value) {
  const normalized = normalizeResult(value);
  if (normalized === 'OK') return 'ok';
  if (normalized === 'NG') return 'ng';
  return 'in_progress';
}

function createHourlyBuckets() {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    total: 0,
    ok: 0,
    ng: 0,
    in_progress: 0,
  }));
}

function aggregateSummary(rows) {
  const summary = {
    total: 0,
    ok: 0,
    ng: 0,
    in_progress: 0,
    inProcess: 0,
    fpy: 0,
    chartData: createHourlyBuckets().map(bucket => ({ hour: bucket.hour, ok: 0 })),
  };

  const stationOkCounts = Object.fromEntries(STATION_KEYS.map(key => [`ok_${key}`, 0]));
  const hourly = createHourlyBuckets();

  for (const row of rows) {
    summary.total += 1;

    const overallKey = bucketKey(row.Overall_Result);
    summary[overallKey] += 1;

    const dateValue = row.Date_Time ? new Date(row.Date_Time) : null;
    if (dateValue && !Number.isNaN(dateValue.getTime())) {
      const hour = dateValue.getHours();
      if (hourly[hour]) {
        hourly[hour].total += 1;
        hourly[hour][overallKey] += 1;
      }
    }

    for (const stationKey of STATION_KEYS) {
      if (normalizeResult(row[stationKey]) === 'OK') {
        stationOkCounts[`ok_${stationKey}`] += 1;
      }
    }
  }

  summary.inProcess = summary.in_progress;
  summary.fpy = summary.total > 0 ? round1((summary.ok / summary.total) * 100) : 0;
  summary.chartData = hourly.map(bucket => ({ hour: bucket.hour, ok: bucket.ok }));

  return {
    summary,
    stationOkCounts,
    hourly,
  };
}

function aggregateShiftWise(rows) {
  const bucketMap = new Map(
    SHIFT_ORDER.map(shift => [shift, {
      shift,
      total: 0,
      ok: 0,
      ng: 0,
      in_progress: 0,
      fpy: 0,
    }]),
  );

  for (const row of rows) {
    const shift = normalizeShiftValue(row.Shift);
    if (!SHIFT_ORDER.includes(shift)) continue;
    if (!bucketMap.has(shift)) {
      bucketMap.set(shift, {
        shift,
        total: 0,
        ok: 0,
        ng: 0,
        in_progress: 0,
        fpy: 0,
      });
    }

    const bucket = bucketMap.get(shift);
    const overallKey = bucketKey(row.Overall_Result);
    bucket.total += 1;
    bucket[overallKey] += 1;
  }

  return Array.from(bucketMap.values()).sort((a, b) => {
    const aIndex = SHIFT_ORDER.indexOf(a.shift);
    const bIndex = SHIFT_ORDER.indexOf(b.shift);
    if (aIndex !== -1 || bIndex !== -1) {
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    }
    return a.shift.localeCompare(b.shift);
  }).map(bucket => ({
    ...bucket,
    fpy: bucket.ok + bucket.ng > 0 ? round1((bucket.ok / (bucket.ok + bucket.ng)) * 100) : 0,
  }));
}

function aggregateStationWise(rows) {
  const bucketMap = new Map(
    STATION_KEYS.map(stationKey => [stationKey, {
      id: stationKey,
      station: STATION_LABELS[stationKey] || stationKey,
      total: 0,
      ok: 0,
      ng: 0,
      in_progress: 0,
      fpy: 0,
    }]),
  );

  for (const row of rows) {
    for (const stationKey of STATION_KEYS) {
      const bucket = bucketMap.get(stationKey);
      const bucketResult = bucketKey(row[stationKey]);
      bucket.total += 1;
      bucket[bucketResult] += 1;
    }
  }

  return STATION_KEYS.map(stationKey => {
    const bucket = bucketMap.get(stationKey);
    return {
      ...bucket,
      fpy: bucket.ok + bucket.ng > 0 ? round1((bucket.ok / (bucket.ok + bucket.ng)) * 100) : 0,
    };
  });
}

function aggregateHourly(rows) {
  const buckets = createHourlyBuckets();

  for (const row of rows) {
    const dateValue = row.Date_Time ? new Date(row.Date_Time) : null;
    if (!dateValue || Number.isNaN(dateValue.getTime())) continue;

    const hour = dateValue.getHours();
    const bucket = buckets[hour];
    if (!bucket) continue;

    bucket.total += 1;
    bucket[bucketKey(row.Overall_Result)] += 1;
  }

  return buckets;
}

async function resolveTargetQty(targetDate, shift) {
  const parsedDate = parseDateParam(targetDate);
  if (!parsedDate) return 0;

  const normalizedShift = normalizeCategoryValue(shift);
  const lookupCandidates = [];

  if (normalizedShift && normalizedShift !== 'ALL') {
    lookupCandidates.push({ targetDate: parsedDate, shift: normalizedShift });
  }

  lookupCandidates.push({ targetDate: parsedDate, shift: 'ALL' });
  lookupCandidates.push({ targetDate: parsedDate });

  try {
    for (const where of lookupCandidates) {
      const target = await Target.findOne({
        where,
        order: [['id', 'DESC']],
      });

      if (target) {
        return Number(target.targetQty) || 0;
      }
    }
  } catch (error) {
    return 0;
  }

  return 0;
}

module.exports = {
  STATION_KEYS,
  STATION_LABELS,
  buildWhereClause,
  fetchReportRows,
  fetchReportDateRange,
  fetchReportRowByBarcode,
  fetchJourneyParts,
  mergeRowsByBarcode,
  resetJourneyStation,
  normalizeResult,
  deriveOverallResult,
  normalizeShiftValue,
  deriveShiftValue,
  aggregateSummary,
  aggregateShiftWise,
  aggregateStationWise,
  aggregateHourly,
  resolveTargetQty,
};
