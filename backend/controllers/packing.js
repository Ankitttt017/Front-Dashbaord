const {
  PackingBox,
  PackingItem,
} = require('../models');
const {
  clampInt,
  sanitizeSettingsInput,
  serializeSettings,
  getOrCreatePackingSettings,
  createNextBox,
  closeBox,
  packReportRowIntoBox,
  ensureOpenBox,
} = require('../services/packingHelpers');
const { runAutoPack } = require('../services/autoPackingService');
const { fetchReportRowByBarcode, deriveShiftValue } = require('../utils/reportData');

function serializeItem(item) {
  const plain = typeof item?.toJSON === 'function' ? item.toJSON() : (item || {});
  return {
    ...plain,
    Shift: deriveShiftValue(plain.shift ?? plain.Shift, plain.packedAt ?? plain.createdAt) || null,
    Final_Marking: plain.marking ?? plain.Final_Marking ?? null,
    packedAt: plain.packedAt ?? plain.createdAt ?? null,
  };
}

function serializeBox(box, items = null) {
  const plain = typeof box?.toJSON === 'function' ? box.toJSON() : (box || {});
  const sourceItems = items || plain.items || [];
  return {
    ...plain,
    items: sourceItems.map(serializeItem),
  };
}

async function findBoxByIdentifier(identifier) {
  const numericId = Number.parseInt(identifier, 10);

  if (Number.isFinite(numericId)) {
    const byId = await PackingBox.findByPk(numericId);
    if (byId) return byId;
  }

  return PackingBox.findOne({
    where: { boxNumber: String(identifier).trim() },
  });
}

async function listBoxes(req, res) {
  try {
    const boxes = await PackingBox.findAll({
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
    });

    return res.json(boxes.map(box => serializeBox(box, [])));
  } catch (error) {
    console.error('[PACKING] listBoxes failed:', error.message);
    return res.status(500).json({ message: 'Failed to load boxes' });
  }
}

async function getBox(req, res) {
  try {
    const box = await findBoxByIdentifier(req.params.num);
    if (!box) {
      return res.status(404).json({ message: 'Box not found' });
    }

    const items = await PackingItem.findAll({
      where: { boxId: box.id },
      order: [
        ['slotNo', 'ASC'],
        ['id', 'ASC'],
      ],
    });

    return res.json(serializeBox(box, items));
  } catch (error) {
    console.error('[PACKING] getBox failed:', error.message);
    return res.status(500).json({ message: 'Failed to load box' });
  }
}

async function getSettings(req, res) {
  try {
    const settings = await getOrCreatePackingSettings();
    return res.json(serializeSettings(settings));
  } catch (error) {
    console.error('[PACKING] getSettings failed:', error.message);
    return res.status(500).json({ message: 'Failed to load settings' });
  }
}

async function updateSettings(req, res) {
  try {
    const settings = await getOrCreatePackingSettings();
    const payload = sanitizeSettingsInput(req.body || {});
    settings.set(payload);
    await settings.save();

    return res.json(serializeSettings(settings));
  } catch (error) {
    console.error('[PACKING] updateSettings failed:', error.message);
    return res.status(500).json({ message: 'Failed to save settings' });
  }
}

async function generateNextBox(req, res) {
  try {
    const settings = await getOrCreatePackingSettings();
    const io = req.app.get('io');
    const box = await createNextBox(settings);

    if (io) {
      io.emit('packing_update', {
        event: 'BOX_READY',
        boxNumber: box.boxNumber,
        capacity: box.capacity,
      });
    }

    return res.status(201).json(serializeBox(box, []));
  } catch (error) {
    console.error('[PACKING] generateNextBox failed:', error.message);
    return res.status(500).json({ message: 'Failed to generate box' });
  }
}

async function triggerAutoPack(req, res) {
  try {
    const io = req.app.get('io');
    const batchLimit = req.body?.batchLimit || req.query?.batchLimit;
    const result = await runAutoPack(io, { batchLimit });
    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error('[PACKING] triggerAutoPack failed:', error.message);
    return res.status(500).json({ message: 'Failed to auto-pack' });
  }
}

async function getPackedBarcodes(req, res) {
  try {
    const items = await PackingItem.findAll({
      attributes: ['qrCode', 'boxNumber', 'slotNo', 'packedAt'],
      order: [
        ['packedAt', 'DESC'],
        ['id', 'DESC'],
      ],
    });

    return res.json(items.map(item => ({
      qrCode: item.qrCode,
      boxNumber: item.boxNumber,
      slotNo: item.slotNo,
      packedAt: item.packedAt,
    })));
  } catch (error) {
    console.error('[PACKING] getPackedBarcodes failed:', error.message);
    return res.status(500).json({ message: 'Failed to load packed barcodes' });
  }
}

async function updateBox(req, res) {
  try {
    const box = await PackingBox.findByPk(req.params.id);
    if (!box) {
      return res.status(404).json({ message: 'Box not found' });
    }

    const io = req.app.get('io');
    const requestedStatus = String(req.body?.status || box.status).trim().toUpperCase();
    const settings = await getOrCreatePackingSettings();

    if (requestedStatus === 'CLOSED') {
      const closed = await closeBox(box, settings, io, { createNext: false });
      return res.json(serializeBox(closed?.closedBox || box, []));
    }

    if (requestedStatus === 'OPEN') {
      box.status = 'OPEN';
      box.closedAt = null;
      box.labelCode = null;
      box.qrCodeData = null;
      if (req.body?.capacity != null) {
        box.capacity = clampInt(req.body.capacity, box.capacity, 1, 1000);
      }
      if (req.body?.packedCount != null) {
        box.packedCount = clampInt(req.body.packedCount, box.packedCount, 0, box.capacity);
      }
      await box.save();

      if (io) {
        io.emit('packing_update', {
          event: 'BOX_READY',
          boxNumber: box.boxNumber,
          capacity: box.capacity,
        });
      }

      return res.json(serializeBox(box, []));
    }

    if (req.body?.capacity != null) {
      box.capacity = clampInt(req.body.capacity, box.capacity, 1, 1000);
    }
    if (req.body?.packedCount != null) {
      box.packedCount = clampInt(req.body.packedCount, box.packedCount, 0, box.capacity);
    }
    await box.save();

    return res.json(serializeBox(box, []));
  } catch (error) {
    console.error('[PACKING] updateBox failed:', error.message);
    return res.status(500).json({ message: 'Failed to update box' });
  }
}

async function deleteBox(req, res) {
  try {
    const box = await PackingBox.findByPk(req.params.id);
    if (!box) {
      return res.status(404).json({ message: 'Box not found' });
    }

    await PackingItem.destroy({ where: { boxId: box.id } });
    await box.destroy();

    const io = req.app.get('io');
    if (io) {
      io.emit('packing_update', {
        event: 'BOX_DELETED',
        boxId: box.id,
        boxNumber: box.boxNumber,
      });
    }

    return res.json({ ok: true, deleted: true, id: Number(req.params.id) });
  } catch (error) {
    console.error('[PACKING] deleteBox failed:', error.message);
    return res.status(500).json({ message: 'Failed to delete box' });
  }
}

async function mapFinalReport(req, res) {
  try {
    const payload = req.body || {};
    const barcode = payload.barcode || payload.Barcode || payload.reportRow?.Barcode || payload.reportRow?.barcode;
    let reportRow = payload.reportRow || payload.row || null;

    if (!reportRow && barcode) {
      reportRow = await fetchReportRowByBarcode(barcode);
    }

    if (!reportRow || !reportRow.Barcode) {
      return res.status(400).json({ message: 'Report row with a barcode is required' });
    }

    const settings = await getOrCreatePackingSettings();
    const io = req.app.get('io');

    let currentBox = null;
    if (payload.boxId) {
      currentBox = await PackingBox.findByPk(payload.boxId);
    }
    if (!currentBox && payload.boxNumber) {
      currentBox = await PackingBox.findOne({ where: { boxNumber: payload.boxNumber } });
    }
    if (!currentBox) {
      currentBox = await ensureOpenBox(settings, io);
    }

    const result = await packReportRowIntoBox(reportRow, currentBox, settings, io);
    const serializedCurrent = result.currentBox
      ? serializeBox(
        result.currentBox,
        await PackingItem.findAll({
          where: { boxId: result.currentBox.id },
          order: [['slotNo', 'ASC']],
        }),
      )
      : null;

    const serializedNext = result.nextBox
      ? serializeBox(result.nextBox, [])
      : null;

    return res.json({
      ok: true,
      ...result,
      currentBox: serializedCurrent,
      nextBox: serializedNext,
    });
  } catch (error) {
    console.error('[PACKING] mapFinalReport failed:', error.message);
    return res.status(500).json({ message: 'Failed to map report row' });
  }
}

module.exports = {
  getBoxes: listBoxes,
  listBoxes,
  getBox,
  getSettings,
  updateSettings,
  generateNextBox,
  triggerAutoPack,
  getPackedBarcodes,
  mapFinalReport,
  updateBox,
  deleteBox,
};
