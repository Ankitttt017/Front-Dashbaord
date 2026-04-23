const { PackingBox, PackingItem, PackingSettings } = require('../models');
const { generateQR } = require('./qrGenerator');
const { deriveShiftValue } = require('../utils/reportData');

const DEFAULT_SETTINGS = Object.freeze({
  boxPrefix: 'BOX',
  boxSeparator: '-',
  serialPadding: 4,
  nextSerial: 1,
  defaultCapacity: 65,
  autoCreateNextBox: true,
  labelPrefix: 'PKG',
});

function clampInt(value, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  return fallback;
}

function cleanText(value, fallback) {
  const text = value === undefined || value === null ? '' : String(value).trim();
  return text || fallback;
}

function buildBoxNumber(settings, serialNo = settings.nextSerial) {
  const serial = String(clampInt(serialNo, DEFAULT_SETTINGS.nextSerial))
    .padStart(clampInt(settings.serialPadding, DEFAULT_SETTINGS.serialPadding), '0');
  return `${cleanText(settings.boxPrefix, DEFAULT_SETTINGS.boxPrefix)}${cleanText(settings.boxSeparator, DEFAULT_SETTINGS.boxSeparator)}${serial}`;
}

function buildLabelCode(settings, boxNumber) {
  return `${cleanText(settings.labelPrefix, DEFAULT_SETTINGS.labelPrefix)}-${boxNumber}`;
}

function sanitizeSettingsInput(payload = {}) {
  return {
    boxPrefix: cleanText(payload.boxPrefix, DEFAULT_SETTINGS.boxPrefix),
    boxSeparator: cleanText(payload.boxSeparator, DEFAULT_SETTINGS.boxSeparator),
    serialPadding: clampInt(payload.serialPadding, DEFAULT_SETTINGS.serialPadding, 1, 8),
    nextSerial: clampInt(payload.nextSerial, DEFAULT_SETTINGS.nextSerial, 1),
    defaultCapacity: clampInt(payload.defaultCapacity, DEFAULT_SETTINGS.defaultCapacity, 1, 1000),
    autoCreateNextBox: toBoolean(payload.autoCreateNextBox, DEFAULT_SETTINGS.autoCreateNextBox),
    labelPrefix: cleanText(payload.labelPrefix, DEFAULT_SETTINGS.labelPrefix),
  };
}

function serializeSettings(settings) {
  const json = typeof settings?.toJSON === 'function' ? settings.toJSON() : { ...settings };
  return {
    ...json,
    computedNextBox: buildBoxNumber(json),
  };
}

async function getOrCreatePackingSettings(options = {}) {
  const { transaction } = options;
  let settings = await PackingSettings.findOne({ transaction });
  if (!settings) {
    settings = await PackingSettings.create({ ...DEFAULT_SETTINGS }, { transaction });
  }
  return settings;
}

async function getOpenPackingBox(options = {}) {
  const { transaction } = options;
  return PackingBox.findOne({
    where: { status: 'OPEN' },
    order: [['createdAt', 'DESC']],
    transaction,
  });
}

async function createNextBox(settings, options = {}) {
  if (!settings || typeof settings.save !== 'function') {
    throw new Error('Packing settings record is required to create a box.');
  }

  const { transaction } = options;
  const serialNo = clampInt(settings.nextSerial, DEFAULT_SETTINGS.nextSerial, 1);
  const boxNumber = buildBoxNumber(settings, serialNo);

  const box = await PackingBox.create({
    serialNo,
    boxNumber,
    capacity: clampInt(settings.defaultCapacity, DEFAULT_SETTINGS.defaultCapacity, 1),
    status: 'OPEN',
    generationSource: 'AUTO',
  }, { transaction });

  settings.nextSerial = serialNo + 1;
  await settings.save(transaction ? { transaction } : undefined);

  return box;
}

async function ensureOpenBox(settings, io, options = {}) {
  let openBox = await getOpenPackingBox(options);

  if (!openBox && settings?.autoCreateNextBox) {
    openBox = await createNextBox(settings, options);

    if (io) {
      io.emit('packing_update', {
        event: 'BOX_READY',
        boxNumber: openBox.boxNumber,
        capacity: openBox.capacity,
      });
    }
  }

  return openBox;
}

async function closeBox(box, settings, io, options = {}) {
  if (!box) return null;

  const { transaction, createNext = settings?.autoCreateNextBox } = options;
  const boxRecord = typeof box.toJSON === 'function'
    ? box
    : await PackingBox.findByPk(box.id, transaction ? { transaction } : undefined);

  if (!boxRecord) return null;
  if (boxRecord.status === 'CLOSED') {
    return { closedBox: boxRecord, nextBox: null };
  }

  boxRecord.status = 'CLOSED';
  boxRecord.closedAt = boxRecord.closedAt || new Date();
  boxRecord.labelCode = buildLabelCode(settings, boxRecord.boxNumber);

  try {
    boxRecord.qrCodeData = await generateQR(boxRecord.labelCode);
  } catch (err) {
    console.error(`[PACK] QR generation failed for ${boxRecord.boxNumber}:`, err.message);
  }

  await boxRecord.save(transaction ? { transaction } : undefined);

  if (io) {
    io.emit('packing_update', {
      event: 'BOX_CLOSED',
      boxNumber: boxRecord.boxNumber,
      labelCode: boxRecord.labelCode,
      packedCount: boxRecord.packedCount,
      capacity: boxRecord.capacity,
    });
  }

  let nextBox = null;
  if (createNext) {
    nextBox = await createNextBox(settings, options);

    if (io) {
      io.emit('packing_update', {
        event: 'BOX_READY',
        boxNumber: nextBox.boxNumber,
        capacity: nextBox.capacity,
      });
    }
  }

  return { closedBox: boxRecord, nextBox };
}

async function packReportRowIntoBox(reportRow, currentBox, settings, io, options = {}) {
  if (!reportRow || !reportRow.Barcode) {
    return { currentBox, packed: false, reason: 'missing_barcode' };
  }

  const { transaction } = options;
  let activeBox = currentBox || await ensureOpenBox(settings, io, options);

  while (activeBox && (activeBox.status === 'CLOSED' || activeBox.packedCount >= activeBox.capacity)) {
    const closed = await closeBox(activeBox, settings, io, { transaction });
    activeBox = closed?.nextBox || await ensureOpenBox(settings, io, options);
  }

  if (!activeBox) {
    return { currentBox: null, packed: false, reason: 'no_open_box' };
  }

  const alreadyPacked = await PackingItem.findOne({
    where: { qrCode: reportRow.Barcode },
    transaction,
  });

  if (alreadyPacked) {
    return {
      currentBox: activeBox,
      packed: false,
      reason: 'already_packed',
      existing: alreadyPacked,
    };
  }

  const slotNo = activeBox.packedCount + 1;
  await PackingItem.create({
    boxId: activeBox.id,
    boxNumber: activeBox.boxNumber,
    slotNo,
    partId: reportRow.SL_NO ?? null,
    qrCode: reportRow.Barcode,
    marking: reportRow.Final_Marking ?? null,
    shift: deriveShiftValue(reportRow.Shift ?? reportRow.shift, reportRow.Date_Time) || null,
  }, transaction ? { transaction } : undefined);

  activeBox.packedCount = slotNo;
  await activeBox.save(transaction ? { transaction } : undefined);

  if (io) {
    io.emit('packing_update', {
      event: 'PART_PACKED',
      partId: reportRow.Barcode,
      boxNumber: activeBox.boxNumber,
      slotNo,
      packedCount: activeBox.packedCount,
      capacity: activeBox.capacity,
    });
  }

  let nextBox = null;
  if (activeBox.packedCount >= activeBox.capacity) {
    const closed = await closeBox(activeBox, settings, io, { transaction });
    nextBox = closed?.nextBox || null;
  }

  return {
    currentBox: nextBox || activeBox,
    packed: true,
    boxNumber: activeBox.boxNumber,
    slotNo,
    packedCount: activeBox.packedCount,
    capacity: activeBox.capacity,
    closed: activeBox.packedCount >= activeBox.capacity,
    nextBox,
  };
}

module.exports = {
  DEFAULT_SETTINGS,
  buildBoxNumber,
  buildLabelCode,
  clampInt,
  sanitizeSettingsInput,
  serializeSettings,
  getOrCreatePackingSettings,
  getOpenPackingBox,
  createNextBox,
  ensureOpenBox,
  closeBox,
  packReportRowIntoBox,
};
