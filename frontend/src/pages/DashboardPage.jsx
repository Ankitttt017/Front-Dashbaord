import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  LayoutDashboard,
  Loader2,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { exportRecords, getDateRange, getJourney } from '../api';
import FilterBar from '../components/FilterBar';
import KpiCard from '../components/KpiCard';
import StationCard from '../components/StationCard';
import {
  getMachineOperation,
  MACHINE_OPERATION_CARDS,
  normalizeMachineResultValue,
  getMachineOperationValue,
} from '../constants/machineOperations';

/* ─────────────────────── helpers ─────────────────────── */

const formatDate = (d) => d.toISOString().split('T')[0];

const subtractDays = (dateText, days) => {
  const base = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(base.getTime())) return dateText;
  base.setDate(base.getDate() - days);
  return formatDate(base);
};

const getDateRangeFromPreset = (preset, latestDate) => {
  if (!latestDate) return { startDate: '', endDate: '' };
  if (preset === '24H') return { startDate: subtractDays(latestDate, 1), endDate: latestDate };
  if (preset === '7D') return { startDate: subtractDays(latestDate, 6), endDate: latestDate };
  if (preset === '15D') return { startDate: subtractDays(latestDate, 14), endDate: latestDate };
  if (preset === 'MONTH') {
    const [y, m] = latestDate.split('-');
    return { startDate: `${y}-${m}-01`, endDate: latestDate };
  }
  return { startDate: subtractDays(latestDate, 5), endDate: latestDate };
};

const resolveOperationResult = (item, operation) => {
  if (!operation) return normalizeMachineResultValue(item?.overall);
  const raw = item?.raw || item || {};
  return normalizeMachineResultValue(getMachineOperationValue(raw, operation));
};

/* Display label: IN PROGRESS → PENDING */
const getDisplayResult = (result) => {
  if (result === 'OK') return 'OK';
  if (result === 'NG') return 'NG';
  return 'PENDING';
};

const buildSummaryFromParts = (parts, operation = null) => {
  const s = { total: parts.length, ok: 0, ng: 0, in_progress: 0, fpy: 0 };
  parts.forEach((p) => {
    const r = resolveOperationResult(p, operation);
    if (r === 'OK') s.ok += 1;
    else if (r === 'NG') s.ng += 1;
    else s.in_progress += 1;
  });
  s.fpy = s.total > 0 ? Number(((s.ok / s.total) * 100).toFixed(1)) : 0;
  return s;
};

const buildHourlyFromParts = (parts, operation = null) => {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, ok: 0, ng: 0 }));
  parts.forEach((part) => {
    const date = part.updatedAt ? new Date(part.updatedAt) : null;
    if (!date || Number.isNaN(date.getTime())) return;
    const r = resolveOperationResult(part, operation);
    if (r === 'OK') buckets[date.getHours()].ok += 1;
    else if (r === 'NG') buckets[date.getHours()].ng += 1;
  });
  return buckets;
};

const buildShiftFromParts = (parts, operation = null) => {
  const base = ['A', 'B', 'C'].map((shift) => ({ shift, ok: 0, ng: 0 }));
  const lup = new Map(base.map((x) => [x.shift, x]));
  parts.forEach((part) => {
    const shift = String(part.shift || '').trim().toUpperCase();
    if (!lup.has(shift)) return;
    const r = resolveOperationResult(part, operation);
    if (r === 'OK') lup.get(shift).ok += 1;
    else if (r === 'NG') lup.get(shift).ng += 1;
  });
  return base;
};

const buildStationsFromParts = (parts) =>
  MACHINE_OPERATION_CARDS.map((op) => {
    const bucket = { id: op.id, station: op.title, total: parts.length, ok: 0, ng: 0, in_progress: 0 };
    parts.forEach((part) => {
      const r = normalizeMachineResultValue(getMachineOperationValue(part?.raw || {}, op));
      if (r === 'OK') bucket.ok += 1;
      else if (r === 'NG') bucket.ng += 1;
      else bucket.in_progress += 1;
    });
    bucket.fpy = bucket.total > 0 ? Number(((bucket.ok / bucket.total) * 100).toFixed(1)) : 0;
    return bucket;
  });

/* ─────────────────────── CustomTooltip ─────────────────────── */

export const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '10px 14px', boxShadow: 'var(--shadow-soft)',
    }}>
      <p style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || 'var(--text-main)', fontSize: 12, fontWeight: 600, margin: '2px 0' }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   RESULT BADGE — compact pill used in the table
   ═══════════════════════════════════════════════════════════ */
const ResultBadge = ({ result }) => {
  const display = getDisplayResult(result);
  const isPending = display === 'PENDING';
  const isOk      = display === 'OK';
  const isNg      = display === 'NG';

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 9px', borderRadius: '6px',
      fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em',
      background: isOk
        ? 'rgba(34,197,94,0.12)'
        : isNg
          ? 'rgba(239,68,68,0.12)'
          : 'rgba(100,116,139,0.14)',
      color: isOk
        ? 'var(--ok)'
        : isNg
          ? 'var(--ng)'
          : 'var(--text-muted)',
      border: `1px solid ${isOk
        ? 'rgba(34,197,94,0.22)'
        : isNg
          ? 'rgba(239,68,68,0.22)'
          : 'rgba(100,116,139,0.20)'}`,
    }}>
      {isOk  && <CheckCircle2 size={9} />}
      {isNg  && <XCircle size={9} />}
      {isPending && <Clock size={9} />}
      {display}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════
   MACHINE MODAL  — compact, professional
   ═══════════════════════════════════════════════════════════ */

const MachineModal = ({ operation, appliedFilters, onClose }) => {
  const [resultFilter, setResultFilter] = useState('ALL');
  const [rows, setRows]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');

  /* lock body scroll */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  /* Escape key */
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  /* fetch records */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const payload = await exportRecords({
          startDate: appliedFilters.startDate,
          endDate:   appliedFilters.endDate,
          shift:     appliedFilters.shift   === 'ALL' ? undefined : appliedFilters.shift,
          category:  appliedFilters.variant === 'ALL' ? undefined : appliedFilters.variant,
        });
        const records = Array.isArray(payload?.records) ? payload.records : [];
        setRows(records.map((rec, idx) => ({
          id:      `${rec.Barcode || rec.Part_ID || rec.QR_Code || 'r'}-${idx}`,
          partId:  rec.Barcode || rec.Part_ID || rec.QR_Code || '-',
          shift:   rec.Shift || '-',
          variant: rec.Model_Type || rec.Variant || '-',
          result:  resolveOperationResult(rec, operation),
        })));
      } catch (err) {
        console.error('[MachineModal]', err);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [appliedFilters, operation]);

  /* derived */
  const okCount         = useMemo(() => rows.filter((r) => r.result === 'OK').length, [rows]);
  const ngCount         = useMemo(() => rows.filter((r) => r.result === 'NG').length, [rows]);
  const pendingCount    = useMemo(() => rows.filter((r) => r.result !== 'OK' && r.result !== 'NG').length, [rows]);
  const total           = rows.length;
  const fpy             = total > 0 ? ((okCount / total) * 100).toFixed(1) : '0.0';

  const filteredRows = useMemo(() => rows.filter((r) => {
    const byResult =
      resultFilter === 'ALL'
        ? true
        : resultFilter === 'PENDING'
          ? (r.result !== 'OK' && r.result !== 'NG')
          : r.result === resultFilter;
    const bySearch = !search.trim() || r.partId.toLowerCase().includes(search.trim().toLowerCase());
    return byResult && bySearch;
  }), [rows, resultFilter, search]);

  /* Excel */
  const handleExcel = async () => {
    if (!filteredRows.length) return;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(operation.title);
    const hr = ws.addRow(['Part ID', 'Shift', 'Variant', `${operation.title} Result`]);
    hr.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF25343F' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    filteredRows.forEach((r) => {
      const row = ws.addRow([r.partId, r.shift, r.variant, getDisplayResult(r.result)]);
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });
    ws.columns.forEach((col) => { col.width = 22; });
    const buf  = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${operation.title}_${resultFilter}_${appliedFilters.startDate}_to_${appliedFilters.endDate}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* PDF */
  const handlePdf = async () => {
    if (!filteredRows.length) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFillColor(20, 30, 48);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.text(`${operation.title} — Machine Report`, 12, 14);
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.text(
      `Period: ${appliedFilters.startDate} to ${appliedFilters.endDate}  |  Filter: ${resultFilter}  |  Records: ${filteredRows.length}`,
      12, 30,
    );
    autoTable(doc, {
      startY: 36,
      head: [['Part ID', 'Shift', 'Variant', `${operation.title} Result`]],
      body: filteredRows.map((r) => [r.partId, r.shift, r.variant, getDisplayResult(r.result)]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [37, 52, 63] },
      theme: 'grid',
    });
    doc.save(`${operation.title}_${resultFilter}_${appliedFilters.startDate}_to_${appliedFilters.endDate}.pdf`);
  };

  /* filter pill config — uses PENDING label */
  const pillCfg = [
    { label: 'All',     value: 'ALL',     count: total,        activeClass: 'bg-[var(--primary)] text-white',  inactiveClass: 'text-[var(--text-main)]'  },
    { label: 'OK',      value: 'OK',      count: okCount,      activeClass: 'bg-[var(--ok)] text-white',       inactiveClass: 'text-[var(--ok)]'          },
    { label: 'NG',      value: 'NG',      count: ngCount,      activeClass: 'bg-[var(--ng)] text-white',       inactiveClass: 'text-[var(--ng)]'          },
    { label: 'Pending', value: 'PENDING', count: pendingCount, activeClass: 'bg-[var(--text-muted)] text-[var(--bg)]', inactiveClass: 'text-[var(--text-muted)]' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.55)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── Modal shell: max-w-3xl (narrower), max-h-[82vh] (shorter) ── */}
      <div
        className="relative w-full flex flex-col overflow-hidden"
        style={{
          maxWidth: '780px',
          maxHeight: '82vh',
          borderRadius: '18px',
          border: '1px solid var(--border)',
          background: 'var(--card)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.48)',
          animation: 'modalIn 0.20s cubic-bezier(.4,0,.2,1)',
        }}
      >

        {/* ── HEADER — single compact row ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          flexShrink: 0,
          gap: '12px',
        }}>
          {/* Left: label + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            {/* Colored dot accent */}
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
              background: 'var(--primary)',
              boxShadow: '0 0 8px var(--primary)',
            }} />
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.18em', color: 'var(--text-muted)',
                marginBottom: '2px',
              }}>
                Machine Report
              </p>
              <h2 style={{
                fontSize: '16px', fontWeight: 800, lineHeight: 1.2,
                color: 'var(--text-main)', letterSpacing: '-0.01em',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {operation.title}
              </h2>
            </div>
          </div>

          {/* Right: date badge + close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '4px 10px', borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)',
            }}>
              <CalendarDays size={11} />
              <span>{appliedFilters.startDate}</span>
              <span style={{ opacity: 0.4 }}>→</span>
              <span>{appliedFilters.endDate}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '28px', height: '28px', borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-main)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">

          {/* KPI strip — compact 4-col row */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
            gap: '10px', padding: '12px 18px',
            borderBottom: '1px solid var(--border)',
          }}>
            {[
              { label: 'Total',    value: total,      color: 'var(--primary)' },
              { label: 'Passed',   value: okCount,    color: 'var(--ok)'      },
              { label: 'Failed',   value: ngCount,    color: 'var(--ng)'      },
              { label: 'Pass Rate',value: `${fpy}%`,  color: 'var(--ok)'      },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                padding: '10px 14px',
              }}>
                <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  {label}
                </p>
                <p style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'monospace', lineHeight: 1, color }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Controls: pills + search + downloads */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '8px',
            padding: '10px 18px',
            borderBottom: '1px solid var(--border)',
          }}>
            {/* Filter pills */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '3px',
              borderRadius: '10px', border: '1px solid var(--border)',
              background: 'var(--surface)', padding: '3px',
            }}>
              {pillCfg.map(({ label, value, count, activeClass, inactiveClass }) => {
                const active = resultFilter === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setResultFilter(value)}
                    className={`rounded-[7px] px-3 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${active ? activeClass : inactiveClass}`}
                  >
                    {label}
                    <span style={{
                      marginLeft: '4px', fontSize: '10px', fontWeight: 700,
                      opacity: active ? 0.85 : 0.55,
                    }}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search + downloads */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={12} style={{
                  position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)', pointerEvents: 'none',
                }} />
                <input
                  type="text"
                  placeholder="Search part ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    height: '32px', paddingLeft: '30px', paddingRight: '10px',
                    borderRadius: '9px', border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    fontSize: '11px', color: 'var(--text-main)',
                    width: '160px', outline: 'none',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={handleExcel}
                disabled={!filteredRows.length}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  height: '32px', padding: '0 12px', borderRadius: '9px',
                  border: '1px solid var(--ok-border)',
                  background: 'rgba(34,197,94,0.08)',
                  fontSize: '11px', fontWeight: 600, color: 'var(--ok)',
                  cursor: 'pointer', transition: 'background 0.15s',
                  opacity: filteredRows.length ? 1 : 0.4,
                }}
              >
                <Download size={11} /> Excel
              </button>
              <button
                type="button"
                onClick={handlePdf}
                disabled={!filteredRows.length}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  height: '32px', padding: '0 12px', borderRadius: '9px',
                  border: '1px solid var(--ng-border)',
                  background: 'rgba(239,68,68,0.08)',
                  fontSize: '11px', fontWeight: 600, color: 'var(--ng)',
                  cursor: 'pointer', transition: 'background 0.15s',
                  opacity: filteredRows.length ? 1 : 0.4,
                }}
              >
                <Download size={11} /> PDF
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: '10px',
                padding: '60px 0', color: 'var(--text-muted)',
              }}>
                <Loader2 size={22} className="animate-spin" />
                <span style={{ fontSize: '12px' }}>Loading records for {operation.title}…</span>
              </div>
            ) : (
              <>
                <table className="report-table" style={{ minWidth: '620px', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>Part ID</th>
                      <th>Shift</th>
                      <th>Variant</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row, idx) => (
                      <tr key={row.id}>
                        <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '11px', textAlign: 'center' }}>
                          {idx + 1}
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>{row.partId}</td>
                        <td>{row.shift}</td>
                        <td>{row.variant}</td>
                        <td><ResultBadge result={row.result} /></td>
                      </tr>
                    ))}
                    {filteredRows.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                          No records found for the selected filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {filteredRows.length > 0 && (
                  <div style={{
                    padding: '8px 18px',
                    borderTop: '1px solid var(--border)',
                    fontSize: '11px', color: 'var(--text-muted)',
                    fontFamily: 'monospace',
                  }}>
                    Showing {filteredRows.length} of {rows.length} records
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.97) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   DASHBOARD PAGE
   ═══════════════════════════════════════════════════════════ */

const DashboardPage = () => {
  const [filters, setFilters] = useState({
    rangeType: 'MONTH', startDate: '', endDate: '',
    shift: 'ALL', variant: 'ALL', result: 'ALL', machine: 'ALL', search: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({
    rangeType: 'MONTH', startDate: '', endDate: '',
    shift: 'ALL', variant: 'ALL', result: 'ALL', machine: 'ALL', search: '',
  });
  const [latestDate, setLatestDate] = useState('');
  const [summary, setSummary]       = useState(null);
  const [hourly, setHourly]         = useState([]);
  const [shiftData, setShiftData]   = useState([]);
  const [stations, setStations]     = useState([]);
  const [modalStationId, setModalStationId] = useState(null);

  /* init date range */
  useEffect(() => {
    getDateRange().then((res) => {
      if (res?.max_date) {
        setLatestDate(res.max_date);
        const preset = getDateRangeFromPreset('MONTH', res.max_date);
        const patch = (c) => ({
          ...c,
          rangeType:  c.rangeType  || 'MONTH',
          startDate:  c.startDate  || preset.startDate,
          endDate:    c.endDate    || preset.endDate,
        });
        setFilters(patch);
        setAppliedFilters(patch);
      }
    });
  }, []);

  /* fetch journey */
  useEffect(() => {
    if (!appliedFilters.startDate || !appliedFilters.endDate) return;
    const run = async () => {
      const res = await getJourney({
        startDate: appliedFilters.startDate,
        endDate:   appliedFilters.endDate,
        shift:     appliedFilters.shift   === 'ALL' ? undefined : appliedFilters.shift,
        category:  appliedFilters.variant === 'ALL' ? undefined : appliedFilters.variant,
      });
      const parts = Array.isArray(res?.parts) ? res.parts : [];
      setSummary(buildSummaryFromParts(parts, null));
      setHourly(buildHourlyFromParts(parts, null));
      setShiftData(buildShiftFromParts(parts, null));
      setStations(buildStationsFromParts(parts));
    };
    run();
  }, [appliedFilters]);

  const handleApply = () => setAppliedFilters(filters);

  const openModal  = useCallback((id) => setModalStationId(id), []);
  const closeModal = useCallback(() => setModalStationId(null), []);

  const modalOperation = useMemo(
    () => (modalStationId ? getMachineOperation(modalStationId) : null),
    [modalStationId],
  );

  const pieData = summary ? [
    { name: 'Passed',  value: summary.ok,          color: 'var(--ok)'   },
    { name: 'Failed',  value: summary.ng,          color: 'var(--ng)'   },
    { name: 'Pending', value: summary.in_progress, color: 'var(--warn)' },
  ].filter((d) => d.value > 0) : [];

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500">

        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary-dim)]">
              <LayoutDashboard size={20} className="text-[var(--primary)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-main)]">Live Dashboard</h1>
              <p className="text-[12px] text-[var(--text-muted)]">Real-time production visibility across the full line</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
            <CalendarDays size={14} />
            <span>{appliedFilters.startDate} to {appliedFilters.endDate}</span>
          </div>
        </div>

        {/* KPI cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <KpiCard label="Total Scanned" value={summary.total}       color="primary" />
            <KpiCard label="Passed (OK)"   value={summary.ok}          color="ok"      />
            <KpiCard label="Failed (NG)"   value={summary.ng}          color="ng"      />
            <KpiCard label="Pending"       value={summary.in_progress} color="warn"    />
            <KpiCard label="Pass Rate %"   value={`${summary.fpy}%`}   color="ok"      />
          </div>
        )}

        {/* Filter bar */}
        <FilterBar
          filters={filters}
          setFilters={(next) => setFilters((c) => (typeof next === 'function' ? next(c) : next))}
          onApply={handleApply}
        />

        {/* Charts */}
        <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6">

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5 h-80 flex flex-col hover:border-[var(--border-focus)] transition-colors">
            <h3 className="text-[14px] font-semibold mb-4 text-[var(--text-muted)] uppercase tracking-wider">Result Split</h3>
            <div className="flex-1 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} dataKey="value" stroke="none">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {summary && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold font-mono text-[var(--text)]">{summary.fpy}%</span>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">Pass Rate</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5 h-80 flex flex-col hover:border-[var(--border-focus)] transition-colors">
            <h3 className="text-[14px] font-semibold mb-4 text-[var(--text-muted)] uppercase tracking-wider">Hourly Trend</h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourly} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="ok" name="Passed" stroke="var(--ok)" fill="var(--ok)" fillOpacity={0.2} strokeWidth={2} />
                  <Area type="monotone" dataKey="ng" name="Failed" stroke="var(--ng)" fill="var(--ng)" fillOpacity={0.2} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5 h-80 flex flex-col hover:border-[var(--border-focus)] transition-colors">
            <h3 className="text-[14px] font-semibold mb-4 text-[var(--text-muted)] uppercase tracking-wider">Shift Comparison</h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shiftData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="shift" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="ok" name="Passed" fill="var(--ok)" radius={[2, 2, 0, 0]} barSize={20} />
                  <Bar dataKey="ng" name="Failed" fill="var(--ng)" radius={[2, 2, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Station Pipeline */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Station Status Pipeline</h3>
            <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
              <Search size={11} /> Click any card to open machine report
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6 gap-3">
            {stations.map((st) => (
              <StationCard
                key={st.id}
                station={st.id}
                title={st.station}
                passed={st.ok}
                failed={st.ng}
                inProgress={st.in_progress}
                selected={false}
                onClick={() => openModal(st.id)}
              />
            ))}
          </div>
        </div>

      </div>

      {/* Machine Modal */}
      {modalStationId && modalOperation && (
        <MachineModal
          operation={modalOperation}
          appliedFilters={appliedFilters}
          onClose={closeModal}
        />
      )}
    </>
  );
};

export default DashboardPage;