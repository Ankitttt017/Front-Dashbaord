const { Target } = require('../models');

function normalizeTargetPayload(payload = {}) {
  return {
    targetDate: payload.targetDate || null,
    shift: (payload.shift || 'ALL').toString().trim().toUpperCase() || 'ALL',
    stationNo: (payload.stationNo || 'Overall').toString().trim() || 'Overall',
    targetQty: Number.parseInt(payload.targetQty, 10) || 0,
    notes: payload.notes ? String(payload.notes).trim() : null,
  };
}

async function listTargets(req, res) {
  try {
    const targets = await Target.findAll({
      order: [
        ['targetDate', 'DESC'],
        ['id', 'DESC'],
      ],
    });

    return res.json(targets);
  } catch (error) {
    console.error('[TARGETS] listTargets failed:', error.message);
    return res.status(500).json({ message: 'Failed to load targets' });
  }
}

async function upsertTarget(req, res) {
  try {
    const payload = normalizeTargetPayload(req.body || {});
    if (!payload.targetDate) {
      return res.status(400).json({ message: 'targetDate is required' });
    }

    let target = null;
    if (req.body?.id) {
      target = await Target.findByPk(req.body.id);
    }

    if (!target) {
      target = await Target.findOne({
        where: {
          targetDate: payload.targetDate,
          shift: payload.shift,
          stationNo: payload.stationNo,
        },
      });
    }

    if (target) {
      await target.update(payload);
    } else {
      target = await Target.create(payload);
    }

    return res.json(target);
  } catch (error) {
    console.error('[TARGETS] upsertTarget failed:', error.message);
    return res.status(500).json({ message: 'Failed to save target' });
  }
}

async function deleteTarget(req, res) {
  try {
    const target = await Target.findByPk(req.params.id);
    if (!target) {
      return res.status(404).json({ message: 'Target not found' });
    }

    await target.destroy();
    return res.json({ ok: true, deleted: true, id: Number(req.params.id) });
  } catch (error) {
    console.error('[TARGETS] deleteTarget failed:', error.message);
    return res.status(500).json({ message: 'Failed to delete target' });
  }
}

module.exports = {
  listTargets,
  upsertTarget,
  deleteTarget,
};
