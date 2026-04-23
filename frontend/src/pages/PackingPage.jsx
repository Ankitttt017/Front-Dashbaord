import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { getBox, listBoxes, triggerAutoPack } from '../api';
import QrCodeDisplay from '../components/QrCodeDisplay';
import CategoryBadge from '../components/CategoryBadge';
import {
  Box as BoxIcon, Play, Download, Printer, RefreshCw,
  Check, X, ChevronRight, Package, Zap, ScanLine,
  CheckCircle2, AlertTriangle, ArrowRight, Clock,
  Shield, Layers, Activity, Grid, Table, FileText,
  QrCode, HardDrive, Truck, Factory, ClipboardList,
  Settings, AlertOctagon, Circle, TrendingUp, Users
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;
const COLS = 13; // grid columns — change here if capacity changes

/* ─────────────────────────────────────────────────
   Hex grid texture
───────────────────────────────────────────────── */
const HexBg = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="hexP" x="0" y="0" width="56" height="48" patternUnits="userSpaceOnUse">
        <polygon points="28,4 52,16 52,40 28,52 4,40 4,16" fill="none" stroke="var(--primary)" strokeWidth="1" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#hexP)" />
  </svg>
);

/* ─────────────────────────────────────────────────
   Scanline overlay
───────────────────────────────────────────────── */
const NoiseOverlay = () => (
  <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.018]"
    style={{ backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.04) 2px,rgba(255,255,255,0.04) 4px)` }} />
);

/* ─────────────────────────────────────────────────
   Live badge
───────────────────────────────────────────────── */
const LiveBadge = () => (
  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-[8px] font-mono font-black text-[var(--primary)] uppercase tracking-[0.25em]">
    <span className="relative flex h-1.5 w-1.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75" />
      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--primary)]" />
    </span>
    LIVE
  </span>
);

/* ─────────────────────────────────────────────────
   Format date + time
───────────────────────────────────────────────── */
const formatDateTime = (val) => {
  if (!val) return { date: '—', time: '—' };
  const d = new Date(val);
  const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  return { date, time };
};

/* ─────────────────────────────────────────────────
   AUTO PRINT via USB / window.print
───────────────────────────────────────────────── */
const triggerSilentPrint = () => {
  setTimeout(() => window.print(), 600);
};

/* ─────────────────────────────────────────────────
   SLOT TOOLTIP — edge-aware, never clipped
   Props: item, slotNo, capacity
───────────────────────────────────────────────── */
const SlotTooltip = ({ item, slotNo, capacity }) => {
  const dt = formatDateTime(item.packedAt);

  const col   = (slotNo - 1) % COLS;           // 0 … COLS-1
  const row   = Math.floor((slotNo - 1) / COLS);
  const totalRows = Math.ceil(capacity / COLS);

  // ── Vertical: show above for bottom half, below for top half ──
  const showBelow = row < Math.ceil(totalRows / 2);
  const vertClass = showBelow
    ? 'top-[calc(100%+10px)]'
    : 'bottom-[calc(100%+10px)]';

  // ── Horizontal: centre by default, pin to edges ──
  // left-edge cols (0,1) → pin left; right-edge cols (11,12) → pin right; else centre
  let horizClass = 'left-1/2 -translate-x-1/2';
  if (col <= 1)  horizClass = 'left-0';
  if (col >= 11) horizClass = 'right-0';

  // ── Arrow direction & horizontal position ──
  const arrowV = showBelow
    ? 'top-[-5px] border-b-0 border-r-0 rotate-[-135deg]'   // points up
    : 'bottom-[-5px] border-t-0 border-l-0 rotate-45';      // points down
  let arrowH = 'left-1/2 -translate-x-1/2';
  if (col <= 1)  arrowH = 'left-4';
  if (col >= 11) arrowH = 'right-4';

  return (
    <div
      className={`
        absolute ${vertClass} ${horizClass}
        w-64 sm:w-72
        bg-[var(--card)] border border-[var(--primary)]/25
        rounded-2xl p-4
        opacity-0 group-hover/slot:opacity-100
        pointer-events-none
        transition-all duration-200 ease-out
        z-[9999]
        shadow-[0_8px_40px_rgba(0,0,0,0.6)]
        text-left
        -translate-y-1 group-hover/slot:translate-y-0
      `}
    >
      {/* Header */}
      <div className="text-[8px] font-mono font-black text-[var(--primary)] uppercase tracking-[0.2em] mb-2.5 pb-2 border-b border-white/[0.06]">
        Slot {String(slotNo).padStart(2, '0')}
      </div>

      {/* Body */}
      <div className="space-y-2">
        <div>
          <div className="text-[7px] text-[var(--text-muted)] uppercase tracking-widest opacity-50 mb-0.5">
            Component ID
          </div>
          <div className="font-mono font-bold text-[11px] text-white break-all leading-4">
            {item.qrCode}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {item.Final_Marking && (
            <div>
              <div className="text-[7px] text-[var(--text-muted)] uppercase tracking-widest opacity-50 mb-0.5">
                Marking
              </div>
              <div className="font-mono text-[11px] text-white italic break-all leading-4">
                {item.Final_Marking}
              </div>
            </div>
          )}
          <div>
            <div className="text-[7px] text-[var(--text-muted)] uppercase tracking-widest opacity-50 mb-0.5">
              Shift
            </div>
            <div className="font-mono text-[11px] text-[var(--primary)]">
              {item.Shift || '—'}
            </div>
          </div>
        </div>

        <div className="pt-1.5 border-t border-white/[0.06]">
          <p className="text-[10px] font-mono font-bold text-white">{dt.date}</p>
          <p className="text-[9px] font-mono text-[var(--text-muted)] opacity-50">{dt.time}</p>
        </div>
      </div>

      {/* Arrow caret */}
      <div
        className={`
          absolute ${arrowV} ${arrowH}
          w-2.5 h-2.5
          bg-[var(--card)]
          border border-[var(--primary)]/20
        `}
      />
    </div>
  );
};

/* ─────────────────────────────────────────────────
   QR SCAN DETAIL MODAL
───────────────────────────────────────────────── */
const QrScanModal = ({ data, onClose }) => {
  if (!data) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center  bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-[var(--card)] border border-[var(--primary)]/30 rounded-[40px] overflow-hidden shadow-[0_0_80px_-10px_var(--primary-glow)] animate-in zoom-in-95 duration-400">
        <HexBg />
        <div className="absolute top-0 left-0 w-64 h-40 bg-[var(--primary)]/8 blur-[80px] rounded-full pointer-events-none" />

        <div className="flex items-center justify-between p-8 border-b border-white/[0.05] relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center text-[var(--primary)] border border-[var(--primary)]/25 shadow-lg">
              <QrCode size={22} />
            </div>
            <div>
              <h2 className="text-[13px] font-rajdhani font-black text-white uppercase tracking-[0.3em] italic">
                Container Manifest
              </h2>
              <p className="text-[8px] font-mono text-[var(--text-muted)] opacity-50 uppercase tracking-widest mt-0.5">
                {data.boxNumber} · {data.items?.length || 0} Components · {data.status === 'CLOSED' ? 'Ready for Dispatch' : 'In Progress'}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[420px] overflow-y-auto custom-scrollbar relative z-10">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-[var(--surface)] z-10">
              <tr className="text-[8px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                <th className="px-6 py-3 font-black">Slot Number</th>
                <th className="px-4 py-3 font-black">Component ID</th>
                <th className="px-4 py-3 font-black">Marking</th>
                <th className="px-4 py-3 font-black">Shift</th>
                <th className="px-4 py-3 font-black">Packed At</th>
              </tr>
            </thead>
            <tbody>
              {(data.items || []).map((it, i) => {
                const dt = formatDateTime(it.packedAt);
                return (
                  <tr key={it.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3 font-mono font-black text-[var(--primary)] text-[13px]">
                      {String(it.slotNo).padStart(2, '0')}
                    </td>
                    <td className="px-4 py-3 font-mono text-white text-[11px] font-bold">{it.qrCode}</td>
                    <td className="px-4 py-3 font-mono text-[var(--text-muted)] text-[11px] italic">{it.Final_Marking || '—'}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[var(--text-muted)]">{it.Shift || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="text-[10px] font-mono font-bold text-white">{dt.date}</p>
                      <p className="text-[9px] font-mono text-[var(--text-muted)] opacity-60">{dt.time}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-white/[0.05] flex items-center justify-between relative z-10">
          <p className="text-[9px] font-mono text-[var(--text-muted)] opacity-40 uppercase tracking-widest italic">
            Scanned · {new Date().toLocaleString()}
          </p>
          <button onClick={onClose}
            className="px-6 py-2.5 bg-[var(--primary)]/10 border border-[var(--primary)]/30 rounded-2xl text-[10px] font-mono font-black text-[var(--primary)] uppercase tracking-widest hover:bg-[var(--primary)]/20 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────
   BOX COMPLETE MODAL
───────────────────────────────────────────────── */
const BoxCompleteModal = ({ boxData, nextBox, onPrint, onNext, onClose }) => {
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    const pt = setTimeout(() => { onPrint(); }, 1000);
    const iv = setInterval(() => setCountdown(c => {
      if (c <= 1) { clearInterval(iv); return 0; }
      return c - 1;
    }), 1000);
    return () => { clearTimeout(pt); clearInterval(iv); };
  }, []);

  useEffect(() => {
    if (countdown === 0 && nextBox) onNext();
  }, [countdown]);

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-in fade-in duration-400">
      <div className="relative w-full max-w-lg bg-[var(--card)] border border-[var(--ok-border)] rounded-[44px] overflow-hidden shadow-[0_0_100px_-10px_var(--ok-bg)] animate-in zoom-in-90 duration-500">
        <HexBg />

        <div className="absolute inset-0 bg-gradient-to-br from-[var(--ok-bg)] via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 w-72 h-48 bg-[var(--ok-bg)] blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 p-10 flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-[var(--ok-bg)] border border-[var(--ok-border)] flex items-center justify-center shadow-[0_0_40px_-5px_var(--ok-bg)]">
              <CheckCircle2 size={44} className="text-[var(--ok)]" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-[var(--ok-border)] animate-ping" style={{ animationDuration: '2s' }} />
          </div>

          <h2 className="text-2xl font-rajdhani font-black text-white uppercase tracking-[0.1em] italic mb-2">
            Container <span className="text-[var(--ok)]">Complete!</span>
          </h2>
          <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest opacity-60 mb-8">
            All {boxData?.capacity} slots filled · Label printed automatically
          </p>

          <div className="w-full grid grid-cols-3 gap-3 mb-8">
            {[
              { label: 'Container ID', value: boxData?.boxNumber, icon: Package },
              { label: 'Components Packed', value: boxData?.packedCount, icon: HardDrive },
              { label: 'Status', value: 'Ready for Dispatch', icon: Truck },
            ].map((s, i) => (
              <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
                <s.icon size={14} className="text-[var(--primary)] opacity-60 mb-2" />
                <p className="text-[8px] font-mono font-black text-[var(--text-muted)] uppercase tracking-widest opacity-50 mb-1">{s.label}</p>
                <p className="text-[11px] font-mono font-black text-white italic tracking-tight">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="w-full flex items-center gap-3 bg-[var(--ok-bg)] border border-[var(--ok-border)] rounded-2xl p-4 mb-7">
            <div className="w-8 h-8 bg-[var(--ok-bg)] rounded-xl flex items-center justify-center text-[var(--ok)] flex-shrink-0">
              <Printer size={16} />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-mono font-black text-[var(--ok)] uppercase tracking-widest">Label Printing</p>
              <p className="text-[9px] font-mono text-[var(--text-muted)] opacity-60 mt-0.5">Sent to printer automatically</p>
            </div>
            <div className="ml-auto">
              <div className="w-5 h-5 border-2 border-[var(--ok-border)] border-t-[var(--ok)] rounded-full animate-spin" />
            </div>
          </div>

          {nextBox && (
            <div className="w-full flex items-center gap-3 bg-[var(--primary)]/8 border border-[var(--primary)]/20 rounded-2xl p-4 mb-7">
              <div className="w-8 h-8 bg-[var(--primary)]/15 rounded-xl flex items-center justify-center text-[var(--primary)] flex-shrink-0">
                <Package size={16} />
              </div>
              <div className="text-left">
                <p className="text-[9px] font-mono font-black text-[var(--text-muted)] uppercase tracking-widest opacity-50">Next Container</p>
                <p className="text-[13px] font-mono font-black text-[var(--primary)] italic">{nextBox.boxNumber}</p>
              </div>
              <div className="ml-auto text-[10px] font-mono font-black text-[var(--text-muted)] uppercase tracking-widest italic opacity-60">
                Auto in {countdown}s
              </div>
            </div>
          )}

          <div className="w-full flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-2xl text-[11px] font-mono font-black text-[var(--text-muted)] uppercase tracking-widest hover:border-white/20 hover:text-white transition-all">
              Stay Here
            </button>
            {nextBox && (
              <button onClick={onNext}
                className="flex-1 py-3 bg-[var(--primary)] rounded-2xl text-[11px] font-mono font-black text-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_-4px_var(--primary-glow)]">
                Next Container <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────── */
const PackingPage = () => {
  const [boxes, setBoxes] = useState([]);
  const [selectedBoxNum, setSelectedBoxNum] = useState('');
  const [activeBoxData, setActiveBoxData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [highlightBarcode, setHighlightBarcode] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completedBoxData, setCompletedBoxData] = useState(null);
  const [nextBoxData, setNextBoxData] = useState(null);
  const prevPackedRef = useRef(0);

  const user = JSON.parse(localStorage.getItem('tr_user') || '{}');
  const isAdmin = user.role === 'admin';

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchBoxes = async () => {
    try {
      const b = await listBoxes();
      setBoxes(b);
      if (b.length > 0 && !selectedBoxNum) {
        const openBox = b.find(x => x.status === 'OPEN') || b[0];
        setSelectedBoxNum(openBox.boxNumber);
      }
      return b;
    } catch (e) {
      console.error(e);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBoxes(); }, []);

  useEffect(() => {
    if (!selectedBoxNum) return;
    getBox(selectedBoxNum).then(data => {
      setActiveBoxData(data);
      prevPackedRef.current = data?.packedCount || 0;
    }).catch(console.error);
  }, [selectedBoxNum]);

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('packing_update', async (msg) => {
      if (msg.event === 'PART_PACKED') {
        if (msg.boxNumber === selectedBoxNum) {
          const data = await getBox(selectedBoxNum).catch(() => null);
          if (data) {
            setActiveBoxData(data);
            const cap = data.capacity || 65;
            const packed = data.packedCount || 0;

            if (packed >= cap && prevPackedRef.current < cap) {
              const allBoxes = await fetchBoxes();
              const nextOpen = allBoxes.find(b => b.status === 'OPEN' && b.boxNumber !== selectedBoxNum);
              setCompletedBoxData(data);
              setNextBoxData(nextOpen || null);
              setShowCompleteModal(true);
            }
            prevPackedRef.current = packed;
          }
          setHighlightBarcode(msg.partId);
          setTimeout(() => setHighlightBarcode(null), 2500);
        }
        showToast(`Component [${msg.partId}] packed into Container [${msg.boxNumber}]`, 'success');
      } else if (msg.event === 'BOX_CLOSED') {
        if (msg.boxNumber === selectedBoxNum) {
          getBox(selectedBoxNum).then(setActiveBoxData).catch(console.error);
          fetchBoxes();
        }
        showToast(`Container [${msg.boxNumber}] sealed & ready for dispatch`, 'info');
      } else if (msg.event === 'BOX_READY') {
        fetchBoxes();
      }
    });

    return () => socket.disconnect();
  }, [selectedBoxNum]);

  const handleAutoPrint = useCallback(() => {
    triggerSilentPrint();
  }, []);

  const handleGoNextBox = () => {
    if (nextBoxData) {
      setSelectedBoxNum(nextBoxData.boxNumber);
    }
    setShowCompleteModal(false);
    setCompletedBoxData(null);
    setNextBoxData(null);
  };

  const handleDownloadCsv = async () => {
    if (!activeBoxData?.items?.length) return;
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Container Manifest');
    
    const headers = ['Slot Number', 'Component ID', 'Marking', 'Shift', 'Date', 'Time'];
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
       cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF25343F' } };
       cell.font = { color: { argb: 'FFEAEFEF' }, bold: true };
       cell.alignment = { vertical: 'middle', horizontal: 'center' };
       cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });

    activeBoxData.items.forEach((it, idx) => {
      const dt = formatDateTime(it.packedAt);
      const row = worksheet.addRow([String(it.slotNo).padStart(2, '0'), it.qrCode, it.Final_Marking || '—', it.Shift || '—', dt.date, dt.time]);
      row.eachCell((cell, colNumber) => {
        const val = String(cell.value).toUpperCase();
        if (colNumber === 3 && cell.value !== '—') {
           if (val.includes('OK')) {
              cell.font = { color: { argb: 'FF15803D' }, bold: true };
           } else if (val.includes('NG') || val.includes('NOK') || val.includes('FAIL')) {
              cell.font = { color: { argb: 'FFB91C1C' }, bold: true };
           }
        }
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      });
      if (idx % 2 === 1) {
         row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }; });
      }
    });

    worksheet.columns.forEach(col => { col.width = 18; });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `BMW_Gen6_Bawal_Container_${activeBoxData.boxNumber}_Manifest.xlsx`; 
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    if (!activeBoxData?.items?.length) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`BMW Gen-6 Bawal - Packing Manifest: ${activeBoxData.boxNumber}`, 14, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()} | Status: ${activeBoxData.status === 'CLOSED' ? 'Ready for Dispatch' : 'In Progress'} | Components: ${activeBoxData.packedCount}/${activeBoxData.capacity}`, 14, 22);
    autoTable(doc, {
      head: [['Slot', 'Component ID', 'Marking', 'Shift', 'Date', 'Time']],
      body: activeBoxData.items.map(it => {
        const dt = formatDateTime(it.packedAt);
        return [String(it.slotNo).padStart(2, '0'), it.qrCode, it.Final_Marking || '—', it.Shift || '—', dt.date, dt.time];
      }),
      startY: 28,
      styles: { 
         fontSize: 8, cellPadding: 2, halign: 'center', valign: 'middle', 
         lineColor: [50, 60, 80], lineWidth: 0.1 
      },
      headStyles: { fillColor: [30, 42, 65], textColor: [200, 215, 240] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      bodyStyles: { textColor: [30, 40, 50], fillColor: [255, 255, 255] },
      didParseCell: (data) => {
         if (data.section === 'body' && data.column.index === 2 && data.cell.raw !== '—') {
            const val = String(data.cell.raw).toUpperCase();
            if (val.includes('OK')) {
               data.cell.styles.textColor = [21, 128, 61];
               data.cell.styles.fontStyle = 'bold';
            } else if (val.includes('NG') || val.includes('NOK') || val.includes('FAIL')) {
               data.cell.styles.textColor = [185, 28, 28];
               data.cell.styles.fontStyle = 'bold';
            }
         }
      }
    });
    doc.save(`BMW_Gen6_Bawal_Container_${activeBoxData.boxNumber}.pdf`);
  };

  const handlePrintLabel = () => {
    if (activeBoxData?.status === 'CLOSED') triggerSilentPrint();
  };

  const handleAutoPack = async () => {
    try {
      await triggerAutoPack();
      showToast('Auto-pack triggered successfully', 'success');
    } catch (error) {
      showToast('Failed to trigger auto-pack', 'error');
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[70vh] gap-5">
      <div className="w-12 h-12 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
      <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-[0.4em] animate-pulse">Loading container data...</p>
    </div>
  );

  if (boxes.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[70vh] gap-6 animate-in fade-in duration-500">
      <div className="p-8 bg-[var(--card)] border border-[var(--border)] rounded-3xl text-[var(--primary)] shadow-2xl"><Package size={52} /></div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-black text-white uppercase tracking-[0.2em]">No Containers Found</h2>
        <p className="text-[12px] font-mono text-[var(--text-muted)] max-w-xs text-center leading-relaxed">
          Create a container in <span className="text-[var(--primary)] font-bold">Container Configuration</span> to start tracking components.
        </p>
      </div>
    </div>
  );

  if (!activeBoxData) return (
    <div className="flex flex-col items-center justify-center h-[70vh] gap-5">
      <div className="w-10 h-10 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
      <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-[0.4em] animate-pulse">Loading container data...</p>
    </div>
  );

  const capacity = activeBoxData.capacity || 65;
  const packedCount = activeBoxData.packedCount || 0;
  const items = activeBoxData.items || [];
  const slotMap = {};
  items.forEach(it => { slotMap[it.slotNo] = it; });
  const isClosed = activeBoxData.status === 'CLOSED';
  const fillPercentage = Math.min(Math.round((packedCount / capacity) * 100), 100);

  return (
    <div className="space-y-4 animate-in fade-in duration-500 relative">
      <NoiseOverlay />

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-label, .print-label * { visibility: visible !important; }
          .print-label {
            position: fixed !important; inset: 0 !important;
            display: flex; align-items: center; justify-content: center;
            background: white !important;
          }
        }
      `}</style>

      {showCompleteModal && (
        <BoxCompleteModal
          boxData={completedBoxData}
          nextBox={nextBoxData}
          onPrint={handleAutoPrint}
          onNext={handleGoNextBox}
          onClose={() => setShowCompleteModal(false)}
        />
      )}
      {/* Header */}
      <div className="relative flex flex-col sm:flex-row justify-between items-center gap-2 bg-[var(--card)]/60 backdrop-blur-md p-2 rounded-lg border border-white/[0.04] shadow-md overflow-hidden">
        <div className="flex items-center gap-4 relative z-10">
          <div className="relative w-10 h-10 bg-[var(--primary)]/10 rounded-lg flex items-center justify-center border border-[var(--primary)]/20 text-[var(--primary)] shadow-sm">
            <Package size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-[var(--primary)]">
              Packing Station
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <LiveBadge />
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest opacity-80">Live Container Monitor</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 relative z-10">
          <div className="flex flex-col gap-1">
            <label className="text-[8px] font-mono font-black text-[var(--text-muted)] uppercase tracking-widest opacity-80 px-1">Container Selection</label>
            <select
              className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-3 py-2 text-[12px] font-mono font-bold text-[var(--primary)] outline-none focus:border-[var(--primary)]/50 transition-all shadow-inner appearance-none"
              value={selectedBoxNum}
              onChange={e => setSelectedBoxNum(e.target.value)}
            >
              {boxes.map(b => (
                <option key={b.id} value={b.boxNumber}>
                  {b.boxNumber} {b.status === 'OPEN' ? '▶ Active' : '✓ Completed'} · {b.packedCount}/{b.capacity}
                </option>
              ))}
            </select>
          </div>

          <button onClick={fetchBoxes}
            className="mt-5 p-2.5 text-[var(--text-muted)] hover:text-white bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)]/30 rounded-xl transition-all"
            title="Refresh Container List">
            <RefreshCw size={15} />
          </button>

          {isAdmin && (
            <button onClick={handleAutoPack}
              className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)]/10 border border-[var(--primary)]/30 hover:bg-[var(--primary)]/20 rounded-2xl text-[var(--primary)] text-[11px] font-mono font-black uppercase tracking-widest transition-all">
              <Zap size={13} /> Auto-Pack Next
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]">

        {/* Left Column */}
        <div className="space-y-5">

          {/* ── Slot Matrix ─────────────────────────────────────────
              IMPORTANT: No overflow-hidden on this card so tooltips
              are never clipped. The HexBg is wrapped in its own
              overflow-hidden div to prevent SVG pattern bleed.
          ──────────────────────────────────────────────────────── */}
          <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 shadow-lg group hover:border-[var(--primary)]/15 transition-all">
            {/* Background effects contained inside their own clip */}
            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
              <HexBg />
              <div className="absolute top-0 right-0 w-64 h-40 bg-[var(--primary)]/5 blur-[80px] rounded-full -mr-32 -mt-20" />
            </div>

            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[var(--primary)]/10 rounded-[16px] flex items-center justify-center text-[var(--primary)] border border-[var(--primary)]/20 shadow-lg">
                  <Grid size={18} />
                </div>
                <div>
                  <h2 className="text-[11px] font-rajdhani font-black text-white uppercase tracking-[0.3em] italic">Component Slot Matrix</h2>
                  <p className="text-[8px] font-mono text-[var(--text-muted)] opacity-80 uppercase tracking-widest mt-0.5">
                    {capacity} total slots · {capacity - packedCount} slots available
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-[9px] font-mono">
                  <span className="w-2 h-2 rounded-sm bg-[var(--ok)]" />
                  <span className="text-[var(--text-muted)] opacity-90">Filled</span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-mono">
                  <span className="w-2 h-2 rounded-sm bg-[var(--primary)] animate-pulse" />
                  <span className="text-[var(--text-muted)] opacity-90">Next Slot</span>
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-1.5">
                  <span className="font-mono font-black text-white text-lg">{packedCount}</span>
                  <span className="font-mono text-[var(--text-muted)] text-[11px]">/{capacity}</span>
                </div>
              </div>
            </div>

            <div className="h-2 bg-black/40 rounded-full overflow-hidden mb-7 shadow-inner relative z-10">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_var(--primary-glow)]"
                style={{
                  width: `${fillPercentage}%`,
                  background: isClosed
                    ? 'linear-gradient(90deg, var(--ok), var(--ok))'
                    : 'linear-gradient(90deg, var(--primary), #fff8)'
                }}
              />
            </div>

            {/* Slot grid — overflow visible so tooltips escape the card */}
            <div className="relative z-10 overflow-x-auto custom-scrollbar pb-1">
            <div
              className="grid gap-1.5 min-w-[720px]"
              style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: capacity }).map((_, i) => {
                const slotNo = i + 1;
                const item = slotMap[slotNo];
                const isFilled = !!item;
                const isNext = !isClosed && slotNo === packedCount + 1;
                const isHighlighted = item && highlightBarcode === item.qrCode;

                let cls = 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)]/40';
                if (isFilled) cls = `bg-[var(--ok-bg)] border-[var(--ok-border)] ${isHighlighted ? 'shadow-[0_0_16px_var(--ok-bg)] scale-110 z-10' : 'shadow-[0_0_6px_var(--ok-bg)]'}`;
                else if (isNext) cls = 'bg-[var(--primary-dim)] border-[var(--primary)] animate-pulse shadow-[0_0_10px_var(--primary-glow)]';

                return (
                  <div
                    key={slotNo}
                    className={`
                      aspect-square border rounded-lg
                      flex items-center justify-center
                      text-[9px] sm:text-[10px] font-mono font-bold
                      transition-all duration-300
                      relative group/slot cursor-default
                      ${cls}
                    `}
                  >
                    {!isFilled && !isNext && <span className="opacity-70">{slotNo}</span>}
                    {isNext && <span className="text-[var(--primary)] font-black">{slotNo}</span>}
                    {isFilled && (
                      <>
                        <span className="text-[var(--ok)]/25 absolute text-[8px]">{slotNo}</span>
                        <span className="text-[var(--ok)] text-[13px] font-black z-10">✓</span>
                        {/* Edge-aware tooltip rendered via extracted component */}
                        <SlotTooltip item={item} slotNo={slotNo} capacity={capacity} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            </div>
          </div>

          {/* Manifest Table */}
          <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-lg hover:border-[var(--primary)]/15 transition-all">
            <HexBg />

            <div className="flex flex-col gap-3 px-4 py-4 border-b border-white/[0.05] bg-[var(--surface)]/60 relative z-10 sm:px-6 lg:px-8 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="w-9 h-9 bg-[var(--primary)]/10 rounded-[14px] flex items-center justify-center text-[var(--primary)] border border-[var(--primary)]/20">
                  <ClipboardList size={16} />
                </div>
                <h2 className="text-[11px] font-rajdhani font-black text-white uppercase tracking-[0.3em] italic flex items-center gap-3">
                  Packed Components
                  <span className="font-mono text-[var(--primary)] text-[10px] bg-[var(--primary)]/10 border border-[var(--primary)]/20 px-2.5 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </h2>
              </div>
              <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                <button onClick={handleDownloadCsv} disabled={!items.length}
                  className="inline-flex min-w-[148px] items-center justify-center gap-2 rounded-xl border border-[var(--ok-border)] bg-[linear-gradient(135deg,rgba(0,165,80,0.26),rgba(0,165,80,0.12))] px-4 py-3 text-[11px] font-mono font-black uppercase tracking-[0.14em] text-[var(--ok)] shadow-[0_10px_24px_rgba(0,165,80,0.14)] transition-all hover:-translate-y-0.5 hover:border-[var(--ok)] hover:bg-[linear-gradient(135deg,rgba(0,165,80,0.34),rgba(0,165,80,0.16))] hover:text-white disabled:opacity-100 disabled:text-[var(--text-main)] disabled:border-[var(--border)] disabled:bg-[var(--surface-strong)] disabled:shadow-none disabled:cursor-not-allowed">
                  <FileText size={12} /> Excel Export
                </button>
                <button onClick={handleDownloadPdf} disabled={!items.length}
                  className="inline-flex min-w-[148px] items-center justify-center gap-2 rounded-xl border border-[var(--primary)]/40 bg-[linear-gradient(135deg,rgba(28,105,212,0.28),rgba(28,105,212,0.12))] px-4 py-3 text-[11px] font-mono font-black uppercase tracking-[0.14em] text-[var(--primary)] shadow-[0_10px_24px_rgba(28,105,212,0.16)] transition-all hover:-translate-y-0.5 hover:border-[var(--primary)] hover:bg-[linear-gradient(135deg,rgba(28,105,212,0.38),rgba(28,105,212,0.16))] hover:text-white disabled:opacity-100 disabled:text-[var(--text-main)] disabled:border-[var(--border)] disabled:bg-[var(--surface-strong)] disabled:shadow-none disabled:cursor-not-allowed">
                  <Download size={12} /> PDF Export
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[400px] custom-scrollbar relative z-10">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[var(--surface)] z-10 border-b border-white/[0.04]">
                  <tr className="text-[9px] uppercase tracking-[0.18em] text-[var(--text-main)]">
                    <th className="px-6 py-3.5 font-black w-16">Slot</th>
                    <th className="px-4 py-3.5 font-black">Component ID</th>
                    <th className="px-4 py-3.5 font-black">Category</th>
                    <th className="px-4 py-3.5 font-black hidden md:table-cell">Marking</th>
                    <th className="px-4 py-3.5 font-black hidden md:table-cell">Shift</th>
                    <th className="px-4 py-3.5 font-black">Date & Time</th>
                    <th className="px-4 py-3.5 font-black hidden sm:table-cell">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => {
                    const dt = formatDateTime(it.packedAt);
                    const isHl = highlightBarcode === it.qrCode;
                    return (
                      <tr key={it.id}
                        className={`border-b border-white/[0.04] transition-all duration-500
                          ${isHl ? 'bg-[var(--ok-bg)] border-[var(--ok-border)]' : 'hover:bg-white/[0.02]'}`}>
                        <td className="px-6 py-4 font-mono font-black text-[var(--primary)] text-[13px]">
                          {String(it.slotNo).padStart(2, '0')}
                        </td>
                        <td className="px-4 py-4 font-mono text-white text-[11px] font-bold">{it.qrCode}</td>
                        <td className="px-4 py-4"><CategoryBadge barcode={it.qrCode} /></td>
                        <td className="px-4 py-4 font-mono text-[var(--text-muted)] text-[10px] italic hidden md:table-cell">{it.Final_Marking || '—'}</td>
                        <td className="px-4 py-4 font-mono text-[10px] text-[var(--text-muted)] hidden md:table-cell">{it.Shift || '—'}</td>
                        <td className="px-4 py-4">
                          <p className="text-[11px] font-mono font-bold text-white leading-tight">{dt.date}</p>
                          <p className="text-[9px] font-mono text-[var(--text-muted)] opacity-80 mt-0.5">{dt.time}</p>
                        </td>
                        <td className="px-4 py-4 hidden sm:table-cell">
                          <span className="inline-flex items-center gap-1.5 text-[8px] font-black text-[var(--ok)] bg-[var(--ok-bg)] border border-[var(--ok-border)] px-2.5 py-1 rounded-full uppercase tracking-widest">
                            <Check size={9} /> Verified
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-14 text-center text-[var(--text-muted)] font-mono text-[11px] uppercase tracking-[0.18em] opacity-80">
                        Awaiting first component scan...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Container Panel */}
          <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 sm:p-6 flex flex-col items-center text-center shadow-lg hover:border-[var(--primary)]/15 transition-all overflow-hidden 2xl:sticky 2xl:top-4">
          <HexBg />
          {isClosed && <div className="absolute inset-0 bg-gradient-to-br from-[var(--ok-bg)] to-transparent pointer-events-none" />}
          <div className="absolute top-0 right-0 w-48 h-40 bg-[var(--primary)]/5 blur-[80px] rounded-full pointer-events-none" />

          <div className="w-full flex items-center justify-between pb-4 mb-4 border-b border-white/[0.05] relative z-10">
            <p className="text-[8px] font-mono font-black text-[var(--text-muted)] uppercase tracking-[0.3em] opacity-80">Container ID</p>
            <Shield size={13} className="text-[var(--text-muted)] opacity-30" />
          </div>

          <div className="text-[32px] sm:text-3xl font-black font-mono text-white mb-3 z-10 tracking-[0.16em] drop-shadow-[0_0_20px_var(--primary-glow)]">
            {activeBoxData.boxNumber}
          </div>

          <div className="mb-4 z-10">
            {isClosed ? (
              <span className="inline-flex items-center gap-2 text-[10px] font-black text-[var(--ok)] bg-[var(--ok-bg)] border border-[var(--ok-border)] px-5 py-2 rounded-full uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-[var(--ok)]" /> Ready for Dispatch
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-[10px] font-black text-[var(--warn)] bg-[var(--warn-bg)] border border-[var(--warn-border)] px-5 py-2 rounded-full uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-[var(--warn)] animate-pulse" /> In Progress
              </span>
            )}
          </div>

          <div className="relative w-28 h-28 sm:w-32 sm:h-32 mb-4 z-10">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="var(--border)" strokeWidth="5" />
              <circle
                cx="40" cy="40" r="32" fill="none"
                stroke={isClosed ? 'var(--ok)' : 'var(--primary)'}
                strokeWidth="5" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - fillPercentage / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 6px ${isClosed ? 'var(--ok)' : 'var(--primary)'})` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-black text-2xl text-white leading-none">{packedCount}</span>
              <span className="text-[9px] text-[var(--text-muted)] font-mono mt-0.5 opacity-90">/{capacity}</span>
              <span className="text-[10px] font-mono font-black text-[var(--primary)] mt-0.5">{fillPercentage}%</span>
            </div>
          </div>

          <div className={`w-full min-h-[210px] rounded-2xl p-3 flex items-center justify-center z-10 shadow-inner mb-2 print-label ${
            activeBoxData.qrCodeData
              ? 'bg-white border-4 border-[var(--surface)]'
              : 'bg-[var(--surface)] border border-[var(--primary)]/35'
          }`}>
            <QrCodeDisplay dataUrl={activeBoxData.qrCodeData} label={activeBoxData.labelCode} size={160} />
          </div>
          <p className="text-[10px] font-mono font-black text-[var(--text-main)] tracking-[0.16em] z-10 mb-4 opacity-95">
            {activeBoxData.labelCode || '—'}
          </p>

          <div className="w-full flex flex-col gap-2.5 z-10">
            <button onClick={handlePrintLabel} disabled={!isClosed}
              className="w-full flex items-center justify-center gap-2 border border-transparent bg-[var(--primary)] hover:opacity-90 text-black py-3.5 rounded-2xl font-mono font-black uppercase tracking-[0.15em] text-[11px] transition-all disabled:opacity-100 disabled:text-[var(--text-main)] disabled:bg-[var(--surface-strong)] disabled:border-[var(--border)] disabled:shadow-none disabled:cursor-not-allowed shadow-[0_0_20px_-4px_var(--primary-glow)]">
              <Printer size={14} /> Print Shipping Label
            </button>
            <button onClick={handleDownloadPdf} disabled={!items.length}
              className="w-full flex items-center justify-center gap-2 bg-[linear-gradient(135deg,rgba(28,105,212,0.26),rgba(28,105,212,0.1))] border border-[var(--primary)]/40 hover:border-[var(--primary)]/60 hover:bg-[linear-gradient(135deg,rgba(28,105,212,0.36),rgba(28,105,212,0.16))] text-[var(--primary)] py-3.5 rounded-2xl font-mono font-black text-[11px] uppercase tracking-[0.14em] transition-all disabled:opacity-100 disabled:text-[var(--text-main)] disabled:border-[var(--border)] disabled:bg-[var(--surface-strong)] disabled:shadow-none disabled:cursor-not-allowed">
              <Download size={14} /> Download Manifest
            </button>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)]/92 px-4 py-3.5 text-left shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
              <p className="text-[9px] font-mono font-black uppercase tracking-[0.16em] text-[var(--text-main)]">Action Status</p>
              <p className="mt-1 text-[11px] leading-5 text-[var(--text-main)]">
                {isClosed
                  ? 'Shipping label is ready to print.'
                  : 'Complete packing to enable shipping label print.'}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-[var(--text-main)]">
                {items.length
                  ? 'Manifest download is available for packed components.'
                  : 'Start scanning components to enable manifest download.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[10000] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 animate-in slide-in-from-bottom-8 duration-400 bg-[var(--card)] border-[var(--primary)]/20 text-white min-w-[320px]">
          <div className={`p-2 rounded-xl flex-shrink-0 ${toast.type === 'success' ? 'bg-[var(--ok-bg)] text-[var(--ok)]' : toast.type === 'error' ? 'bg-[var(--ng-bg)] text-[var(--ng)]' : 'bg-[var(--warn-bg)] text-[var(--warn)]'}`}>
            {toast.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          </div>
          <div>
            <div className="text-[8px] font-black uppercase tracking-[0.2em] opacity-50 mb-0.5">
              {toast.type === 'success' ? 'Packing Update' : toast.type === 'error' ? 'System Alert' : 'Information'}
            </div>
            <div className="text-[12px] font-mono font-bold">{toast.message}</div>
          </div>
          <button onClick={() => setToast(null)} className="ml-auto text-[var(--text-muted)] hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default PackingPage;
