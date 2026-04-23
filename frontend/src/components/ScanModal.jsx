import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Package, Clock } from 'lucide-react';
import { STATION_MAP } from '../constants/stationMap';

const DISPLAY_SECONDS = 5;
const isNgLike = (value) => ['NG', 'NOK', 'FAIL'].includes(String(value || '').trim().toUpperCase());

const ScanModal = ({ scanResult, onClose }) => {
  const [countdown, setCountdown] = useState(DISPLAY_SECONDS);

  useEffect(() => {
    if (!scanResult) return;
    setCountdown(DISPLAY_SECONDS);
    const iv = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(iv); onClose(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [scanResult]);

  if (!scanResult) return null;

  const {
    found, barcode, overall_result, shift, date_time,
    station_results, internal_leak, external_leak, final_marking,
    scannedBarcode
  } = scanResult;

  let bgGradient = 'from-[var(--warn)] to-black';
  let Icon = AlertTriangle;
  let title = 'BARCODE NOT FOUND';

  if (found) {
    if (String(overall_result || '').trim().toUpperCase() === 'OK') {
      bgGradient = 'from-[var(--ok)] to-black';
      Icon = CheckCircle2;
      title = 'PART OK — PACKED';
    } else {
      bgGradient = 'from-[var(--ng)] to-black';
      Icon = XCircle;
      title = 'PART NG';
    }
  }

  // Build failed-station list (NG stations)
  const failedStations = [];
  if (found && isNgLike(overall_result) && station_results) {
    Object.entries(station_results).forEach(([key, val]) => {
      if (isNgLike(val)) failedStations.push(STATION_MAP[key] || key);
    });
  }

  // Progress bar width
  const pct = (countdown / DISPLAY_SECONDS) * 100;

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br ${bgGradient} animate-in fade-in zoom-in duration-300`}>
      {/* Countdown bar at top */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/20">
        <div
          className="h-full bg-white/70 transition-all duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="text-white text-center p-6 max-w-lg w-full relative">
        {/* Close countdown badge */}
        <div className="absolute top-0 right-0 flex items-center gap-1.5 text-white/60 text-xs font-mono">
          <Clock size={12} />
          <span>Closing in {countdown}s</span>
        </div>

        <Icon size={96} className="mx-auto mb-4 drop-shadow-2xl" />
        <h1 className="text-5xl font-black mb-6 tracking-tighter drop-shadow-lg">{title}</h1>

        <div className="space-y-3 text-base font-mono bg-black/25 p-5 rounded-2xl backdrop-blur-sm border border-white/10">

          {/* Barcode */}
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <span className="opacity-60 text-xs font-bold uppercase tracking-[0.2em]">Scanned ID</span>
            <span className="font-bold text-lg tracking-wider">{barcode || scannedBarcode}</span>
          </div>

          {found && (
            <>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="opacity-60 text-xs font-bold uppercase tracking-[0.2em]">Overall Result</span>
                <span className={`font-black text-sm px-3 py-1 rounded-full border ${String(overall_result || '').trim().toUpperCase() === 'OK' ? 'bg-green-900/40 border-green-500/40 text-green-300' : 'bg-red-900/40 border-red-500/40 text-red-300'}`}>
                  {isNgLike(overall_result) ? 'NG' : overall_result}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="opacity-60 text-xs font-bold uppercase tracking-[0.2em]">Shift</span>
                <span className="font-bold">{shift || '—'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="opacity-60 text-xs font-bold uppercase tracking-[0.2em]">Timestamp</span>
                <span className="font-bold text-sm">{date_time ? new Date(date_time).toLocaleString() : '—'}</span>
              </div>

              {/* Extra sub-fields when OK */}
              {String(overall_result || '').trim().toUpperCase() === 'OK' && (
                <div className="flex items-center justify-center gap-3 mt-2 bg-white/10 rounded-xl p-3">
                  <Package size={22} className="text-white/80" />
                  <div className="text-left">
                    <p className="text-[10px] uppercase tracking-widest opacity-60 font-bold">Packing Status</p>
                    <p className="font-black text-sm">Added to Active Box</p>
                    {final_marking && (
                      <p className="text-[11px] opacity-70 mt-0.5">Marking: <span className="font-bold text-white">{final_marking}</span></p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* NG failed stations */}
          {failedStations.length > 0 && (
            <div className="mt-4 text-left">
              <span className="opacity-60 uppercase text-xs font-bold tracking-[0.2em] mb-2 block text-center">
                Failed Stations ({failedStations.length})
              </span>
              <div className="grid grid-cols-2 gap-2">
                {failedStations.map(st => (
                  <div key={st} className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 text-center font-bold text-sm">
                    {st}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-5 px-6 py-2 rounded-full border border-white/30 text-white/70 hover:text-white hover:border-white/60 text-xs font-bold uppercase tracking-widest transition-all"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default ScanModal;
