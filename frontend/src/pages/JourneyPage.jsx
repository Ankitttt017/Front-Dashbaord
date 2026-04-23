import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  CalendarDays, ChevronDown, ChevronUp,
  Filter, LocateFixed, Route, Search,
  CheckCircle2, XCircle, Clock,
  ArrowRight, Info, X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { normalizeResult } from '../components/ResultBadge';
import ShiftBadge from '../components/ShiftBadge';
import { getJourney } from '../api';
import {
  GROUPED_STATION_COLUMNS,
  STATION_MAP,
  VISIBLE_STATION_KEYS,
} from '../constants/stationMap';
import { VARIANT_OPTIONS } from '../constants/variants';

/* ─────────────────────────────────────────────
   Station flow
   ───────────────────────────────────────────── */
const STATION_FLOW = VISIBLE_STATION_KEYS.map((key, index) => ({
  key,
  label: STATION_MAP[key] || key,
  order: index + 1,
  details: GROUPED_STATION_COLUMNS[key] || [{ key, label: 'Status' }],
}));

const RANGE_OPTIONS = [
  { value: '24H',    label: 'Last 24 Hours' },
  { value: '7D',     label: 'Last 7 Days' },
  { value: '15D',    label: 'Last 15 Days' },
  { value: 'MONTH',  label: 'This Month' },
  { value: 'CUSTOM', label: 'Custom Range' },
];

const CARDS_PER_PAGE = 25;

/* ─────────────────────────────────────────────
   Sub-station palettes — bold for light theme
   ───────────────────────────────────────────── */
const SUB_PALETTES = {
  A: { accent:'#1c69d4', bg:'rgba(28,105,212,0.10)',  border:'rgba(28,105,212,0.40)', text:'#1a55b0', label:'rgba(28,105,212,0.85)',  glow:'0 0 18px rgba(28,105,212,0.22)', ribbon:'linear-gradient(90deg,rgba(28,105,212,0.18),rgba(28,105,212,0.04))' },
  B: { accent:'#6d28d9', bg:'rgba(109,40,217,0.10)',  border:'rgba(109,40,217,0.40)', text:'#5b21b6', label:'rgba(109,40,217,0.85)', glow:'0 0 18px rgba(109,40,217,0.22)', ribbon:'linear-gradient(90deg,rgba(109,40,217,0.18),rgba(109,40,217,0.04))' },
  C: { accent:'#0d9488', bg:'rgba(13,148,136,0.10)',  border:'rgba(13,148,136,0.40)', text:'#0f766e', label:'rgba(13,148,136,0.85)',  glow:'0 0 18px rgba(13,148,136,0.22)', ribbon:'linear-gradient(90deg,rgba(13,148,136,0.18),rgba(13,148,136,0.04))' },
  D: { accent:'#b45309', bg:'rgba(180,83,9,0.10)',    border:'rgba(180,83,9,0.40)',   text:'#92400e', label:'rgba(180,83,9,0.85)',    glow:'0 0 18px rgba(180,83,9,0.22)',   ribbon:'linear-gradient(90deg,rgba(180,83,9,0.18),rgba(180,83,9,0.04))' },
  E: { accent:'#be185d', bg:'rgba(190,24,93,0.10)',   border:'rgba(190,24,93,0.40)',  text:'#9d174d', label:'rgba(190,24,93,0.85)',   glow:'0 0 18px rgba(190,24,93,0.22)',  ribbon:'linear-gradient(90deg,rgba(190,24,93,0.18),rgba(190,24,93,0.04))' },
};

const PLAIN_COLORS = [
  { bg:'rgba(28,105,212,0.08)',  border:'rgba(28,105,212,0.30)',  text:'#1a55b0', label:'rgba(28,105,212,0.75)'  },
  { bg:'rgba(109,40,217,0.08)', border:'rgba(109,40,217,0.30)',  text:'#5b21b6', label:'rgba(109,40,217,0.75)' },
  { bg:'rgba(13,148,136,0.08)', border:'rgba(13,148,136,0.30)',  text:'#0f766e', label:'rgba(13,148,136,0.75)'  },
  { bg:'rgba(180,83,9,0.08)',   border:'rgba(180,83,9,0.30)',    text:'#92400e', label:'rgba(180,83,9,0.75)'    },
  { bg:'rgba(190,24,93,0.08)',  border:'rgba(190,24,93,0.30)',   text:'#9d174d', label:'rgba(190,24,93,0.75)'  },
];

/* ═══════════════════════════════════════════════
   groupDetailsBySubStation
   ═══════════════════════════════════════════════ */
const groupDetailsBySubStation = (details, stationLabel = '') => {
  const groups = {};
  details.forEach((detail) => {
    const key    = String(detail.key);
    const m      = key.match(/OP[\d/]+([A-E])(?:_|$)/i);
    const mPlain = !m ? key.match(/^OP[\d/]+([A-E])$/i) : null;
    const suffix = m ? m[1].toUpperCase() : mPlain ? mPlain[1].toUpperCase() : '';
    if (!groups[suffix]) groups[suffix] = [];
    groups[suffix].push(detail);
  });
  const hasRealSubGroups = Object.keys(groups).some((k) => k !== '');
  if (!hasRealSubGroups && stationLabel) {
    const suffixesInLabel = [...new Set(
      [...String(stationLabel).matchAll(/OP[\d/]+([A-E])/gi)].map((m2) => m2[1].toUpperCase()),
    )];
    if (suffixesInLabel.length > 1) {
      suffixesInLabel.forEach((s) => { groups[s] = details; });
      delete groups[''];
    }
  }
  return groups;
};

const getActiveSubStations = (stationData, detailGroups) => {
  const active  = new Set();
  const entries = Object.entries(detailGroups).filter(([s]) => s !== '');
  if (!entries.length) return active;
  const isSynthetic = entries.length > 1 && entries.every(([, f]) => f === entries[0][1]);
  if (isSynthetic) {
    entries.forEach(([suffix]) => {
      const rel = Object.entries(stationData).filter(([k]) =>
        new RegExp(`OP[\\d/]+${suffix}(?:_|$)`, 'i').test(k),
      );
      if (!rel.length) return;
      const hasReal = rel.some(([, raw]) => {
        if (raw == null || raw === '') return false;
        const s = String(raw).trim().toUpperCase();
        return s && s !== 'PENDING' && s !== '--' && s !== 'NULL';
      });
      if (hasReal) active.add(suffix);
    });
    return active;
  }
  entries.forEach(([suffix, fields]) => {
    const hasReal = fields.some((field) => {
      const raw = stationData[field.key];
      if (raw == null || raw === '') return false;
      const s = String(raw).trim().toUpperCase();
      return s && s !== 'PENDING' && s !== '--' && s !== 'NULL';
    });
    if (hasReal) active.add(suffix);
  });
  return active;
};

/* ─── Helpers ─── */
const getOperationMeta = (label) => {
  const text  = String(label || '').trim();
  const match = text.match(/^(OP[0-9/]+)\s*-\s*(.+)$/i);
  if (!match) return { operationNo: '--', machineName: text || '--' };
  return { operationNo: match[1].toUpperCase(), machineName: match[2].trim() };
};

const formatDate      = (v) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? '--' : d.toLocaleString(); };
const formatDateInput = (v) => { const d = new Date(v); if (Number.isNaN(d.getTime())) return ''; return d.toISOString().split('T')[0]; };
const subtractDays    = (dateText, days) => {
  const base = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(base.getTime())) return '';
  base.setDate(base.getDate() - days);
  return base.toISOString().split('T')[0];
};
const getDateRangeFromPreset = (preset, latestDate) => {
  if (!latestDate) return { startDate: '', endDate: '' };
  if (preset === '24H')   return { startDate: subtractDays(latestDate, 1),  endDate: latestDate };
  if (preset === '7D')    return { startDate: subtractDays(latestDate, 6),  endDate: latestDate };
  if (preset === '15D')   return { startDate: subtractDays(latestDate, 14), endDate: latestDate };
  if (preset === 'MONTH') {
    const [year, month] = latestDate.split('-');
    return { startDate: `${year}-${month}-01`, endDate: latestDate };
  }
  return { startDate: '', endDate: latestDate };
};

const getStationStatus      = (d = {}) => d.status || d[Object.keys(d)[0]] || 'PENDING';
const getJourneyStatusLabel = (v) => {
  const n = normalizeResult(v);
  if (n==='OK') return 'OK';
  if (n==='NG') return 'NG';
  return 'PENDING';
};
const getJourneyDetailValue = (v) => {
  const n = normalizeResult(v);
  if (n==='OK') return 'OK';
  if (n==='NG') return 'NG';
  if (v==null||v==='') return '--';
  const raw = String(v).trim();
  if (!raw) return '--';
  return raw.toUpperCase()==='PENDING' ? 'PENDING' : raw;
};
const getJourneyStatusFilterLabel = (value) => {
  if (value === 'OK') return 'Pass (OK)';
  if (value === 'NG') return 'Failed (NG)';
  if (value === 'PENDING') return 'Pending';
  return value;
};
const formatJourneyDetail = (key, value) => {
  const r = getJourneyDetailValue(value);
  if (r==='--') return '--';
  if ((key==='In_Time'||key==='Out_Time') && value) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString();
  }
  return r;
};
const createStationFallback = (station) => {
  const next = { status:'PENDING' };
  station.details.forEach((d) => { next[d.key] = d.key===station.key ? 'PENDING' : '--'; });
  return next;
};
const getStationSummary = (station, part) => {
  const stationData = part?.stations?.[station.key] || createStationFallback(station);
  const baseValue   = stationData[station.key] ?? stationData.status;
  const normalized  = normalizeResult(getStationStatus(stationData));
  return { ...station, stationData, rawStatus: baseValue, normalizedStatus: normalized };
};
const getPartOverallStatus = (part) => {
  const ss = STATION_FLOW.map((st) => normalizeResult(getStationStatus(part.stations?.[st.key]||{})));
  if (ss.includes('NG')) return 'NG';
  if (ss.every((s) => s==='OK')) return 'OK';
  return 'PENDING';
};
const getPartProgress = (part) => {
  const ss = STATION_FLOW.map((st) => normalizeResult(getStationStatus(part.stations?.[st.key]||{})));
  const passedCount     = ss.filter((s) => s==='OK').length;
  const failedCount     = ss.filter((s) => s==='NG').length;
  const inProgressCount = ss.filter((s) => !['OK','NG'].includes(s)).length;
  return { passedCount, failedCount, inProgressCount, percent: STATION_FLOW.length ? Math.round((passedCount/STATION_FLOW.length)*100) : 0 };
};
const getBarcodeValue   = (b) => String(b??'').trim();
const getDisplayBarcode = (b) => getBarcodeValue(b)||'_';

/* ─── Status meta — bold for light theme ─── */
const STATUS_META = {
  'OK':      { bg:'rgba(22,163,74,0.12)',  color:'#15803d', border:'rgba(22,163,74,0.40)',  Icon:CheckCircle2 },
  'NG':      { bg:'rgba(220,38,38,0.12)', color:'#dc2626', border:'rgba(220,38,38,0.40)', Icon:XCircle      },
  'PENDING': { bg:'rgba(0,0,0,0.05)',      color:'#6b7280', border:'rgba(0,0,0,0.15)',      Icon:Clock        },
};
const getStatusMeta = (v) => STATUS_META[getJourneyStatusLabel(v)] ?? STATUS_META.PENDING;

const StatusBadge = ({ value }) => {
  const label = getJourneyStatusLabel(value);
  const m     = getStatusMeta(value);
  return (
    <span style={{
      display:'inline-flex',alignItems:'center',gap:'5px',
      padding:'4px 11px',borderRadius:'999px',whiteSpace:'nowrap',
      background:m.bg,color:m.color,border:`1.5px solid ${m.border}`,
      fontSize:'10px',fontWeight:800,letterSpacing:'0.07em',textTransform:'uppercase',
    }}>
      <m.Icon size={11}/>{label}
    </span>
  );
};

/* ─── Status box — no order number, fixed consistent size ─── */
const StationStatusBox = ({ value }) => {
  const isPending = value==null||String(value).trim()===''||String(value).trim().toUpperCase()==='PENDING';
  return (
    <div style={{
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      gap:'6px',
      width:'100px',minWidth:'100px',height:'68px',
      borderRadius:'12px',
      border:'1.5px solid rgba(0,0,0,0.12)',
      background:'rgba(0,0,0,0.03)',
      flexShrink:0,
    }}>
      <span style={{fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.14em',color:'#6b7280',fontWeight:700}}>
        Status
      </span>
      {isPending
        ? <span style={{fontSize:'20px',color:'#9ca3af',fontWeight:600,lineHeight:1}}>—</span>
        : <StatusBadge value={value}/>
      }
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   SubMachineBlock
   ═══════════════════════════════════════════════════════════════════ */
const SubMachineBlock = ({ suffix, operationNo, fields, isActive, anyActive }) => {
  const p      = SUB_PALETTES[suffix] || SUB_PALETTES.A;
  const dimmed = anyActive && !isActive;
  const machineLabel = `${operationNo}${suffix}`;
  const visible = fields.filter((f) => !/^status$/i.test(f.label));
  if (!visible.length) return null;

  return (
    <div style={{
      borderRadius:'10px',
      border: isActive ? `2px solid ${p.border}` : dimmed ? '1px solid rgba(0,0,0,0.08)' : `1px dashed ${p.border}`,
      boxShadow: isActive ? p.glow : 'none',
      overflow:'hidden',
      opacity: dimmed ? 0.35 : 1,
      filter:  dimmed ? 'grayscale(0.5)' : 'none',
      transition:'all 0.24s ease',
    }}>
      {isActive && (
        <div style={{
          display:'flex',alignItems:'center',gap:'7px',padding:'5px 12px',
          background:p.ribbon,borderBottom:`1.5px solid ${p.border}`,
          fontSize:'8px',fontWeight:800,letterSpacing:'0.18em',textTransform:'uppercase',color:p.accent,
        }}>
          <span style={{width:'6px',height:'6px',borderRadius:'50%',flexShrink:0,background:p.accent,boxShadow:`0 0 8px ${p.accent}`,animation:'pulse-dot 1.5s ease-in-out infinite'}}/>
          ✓ Processed on this machine
          <span style={{marginLeft:'auto',fontWeight:700,fontSize:'8px'}}>{machineLabel}</span>
        </div>
      )}
      {dimmed && (
        <div style={{
          display:'flex',alignItems:'center',gap:'5px',padding:'3px 12px',
          background:'rgba(0,0,0,0.02)',borderBottom:'1px solid rgba(0,0,0,0.06)',
          fontSize:'8px',fontWeight:700,letterSpacing:'0.16em',textTransform:'uppercase',color:'#9ca3af',
        }}>
          <span style={{width:'5px',height:'5px',borderRadius:'50%',background:'#d1d5db',display:'inline-block'}}/>
          Not used — {machineLabel}
        </div>
      )}
      <div style={{
        display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 12px',
        background: isActive ? p.bg : dimmed ? 'rgba(0,0,0,0.02)' : `${p.bg}88`,
        borderBottom:`1px solid ${isActive?p.border:dimmed?'rgba(0,0,0,0.05)':`${p.border}55`}`,
      }}>
        <span style={{fontSize:'11px',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.09em',color:isActive?p.accent:dimmed?'#9ca3af':p.label}}>
          {machineLabel}
        </span>
        <span style={{
          display:'inline-flex',alignItems:'center',gap:'4px',
          fontSize:'8px',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.12em',
          padding:'2px 9px',borderRadius:'999px',
          border:`1.5px solid ${isActive?p.border:dimmed?'rgba(0,0,0,0.10)':`${p.border}55`}`,
          color:isActive?p.accent:dimmed?'#9ca3af':p.label,
          background:isActive?p.bg:'rgba(0,0,0,0.03)',
        }}>
          <span style={{width:'5px',height:'5px',borderRadius:'50%',background:isActive?p.accent:dimmed?'#d1d5db':p.accent,boxShadow:isActive?`0 0 6px ${p.accent}`:'none'}}/>
          {machineLabel}
        </span>
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:'6px',padding:'10px 12px',background:'rgba(0,0,0,0.01)'}}>
        {visible.map((field) => (
          <div key={field.key} style={{
            borderRadius:'8px',padding:'5px 10px',
            background:isActive?p.bg:'rgba(0,0,0,0.02)',
            border:`1.5px solid ${isActive?p.border:dimmed?'rgba(0,0,0,0.06)':`${p.border}44`}`,
            minWidth:'76px',
          }}>
            <div style={{fontSize:'8px',textTransform:'uppercase',letterSpacing:'0.12em',fontWeight:700,marginBottom:'3px',color:isActive?p.label:dimmed?'#9ca3af':p.label}}>{field.label}</div>
            <div style={{fontSize:'12px',fontWeight:700,color:isActive?p.text:dimmed?'#9ca3af':p.text}}>{field.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SingleStationFields = ({ fields }) => {
  const visible = fields.filter((f) => !/^status$/i.test(f.label));
  if (!visible.length) return null;
  return (
    <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginTop:'10px'}}>
      {visible.map((field, idx) => {
        const c = PLAIN_COLORS[idx%PLAIN_COLORS.length];
        return (
          <div key={field.key} style={{borderRadius:'8px',padding:'5px 10px',background:c.bg,border:`1.5px solid ${c.border}`,minWidth:'76px'}}>
            <div style={{fontSize:'8px',textTransform:'uppercase',letterSpacing:'0.12em',fontWeight:700,color:c.label,marginBottom:'3px'}}>{field.label}</div>
            <div style={{fontSize:'12px',fontWeight:700,color:c.text}}>{field.value}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ─── Reusable filter field ─── */
const FilterField = ({ label, children }) => (
  <label style={{display:'flex',flexDirection:'column',gap:'6px'}}>
    <span style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.18em',color:'var(--text-muted)'}}>{label}</span>
    {children}
  </label>
);
const inputCls = 'w-full rounded-[12px] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[12px] text-[var(--text-main)] outline-none transition-all focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 placeholder:text-[var(--text-dim)]';

/* ═══════════════════════════════════════════════════════════════════
   OperationCard — always fully expanded, no click needed, no order #
   ═══════════════════════════════════════════════════════════════════ */
const OperationCard = ({ station }) => {
  const { operationNo, machineName } = getOperationMeta(station.label);
  const detailGroups   = groupDetailsBySubStation(station.details, station.label);
  const groupKeys      = Object.keys(detailGroups).sort();
  const hasSubStations = groupKeys.some((k) => k !== '');

  const buildFields = (details) =>
    details.map((detail) => {
      const raw = station.stationData[detail.key] ?? (detail.key===station.key ? station.stationData.status : '--');
      return { key:detail.key, label:detail.label, value:formatJourneyDetail(detail.key, raw) };
    });

  const activeSubStations = hasSubStations ? getActiveSubStations(station.stationData, detailGroups) : new Set();
  const anySubActive = activeSubStations.size > 0;

  /* Clean machine name — remove repeated OP60A / OP60B style suffix */
  const cleanMachineName = useMemo(() => {
    if (!hasSubStations) return machineName;
    return machineName
      .replace(/\s*[/,]\s*OP[\d/]+[A-E]/gi, '')
      .replace(/^OP[\d/]+[A-E]\s*/i, '')
      .trim() || machineName;
  }, [machineName, hasSubStations]);

  /* Pills */
  const machinePills = hasSubStations
    ? groupKeys.filter((k)=>k!=='').map((suffix) => {
        const p   = SUB_PALETTES[suffix] || SUB_PALETTES.A;
        const act = activeSubStations.has(suffix);
        const dim = anySubActive && !act;
        const pillLabel = `${operationNo}${suffix}`;
        return (
          <span key={suffix} style={{
            display:'inline-flex',alignItems:'center',gap:'4px',
            fontSize:'8px',fontWeight:800,padding:'2px 8px',borderRadius:'999px',
            border:`1.5px solid ${act?p.border:dim?'rgba(0,0,0,0.10)':`${p.border}66`}`,
            color:act?p.accent:dim?'#9ca3af':p.label,
            background:act?p.bg:dim?'rgba(0,0,0,0.02)':`${p.bg}66`,
            opacity:dim?0.5:1,
            letterSpacing:'0.08em',textTransform:'uppercase',transition:'opacity 0.2s',
          }}>
            <span style={{width:'5px',height:'5px',borderRadius:'50%',background:act?p.accent:dim?'#d1d5db':p.accent,boxShadow:act?`0 0 5px ${p.accent}`:'none'}}/>
            {pillLabel}
          </span>
        );
      })
    : null;

  /* Card border/bg by status */
  const isOK = station.normalizedStatus === 'OK';
  const isNG = station.normalizedStatus === 'NG';
  const cardBorder = isOK ? '1.5px solid rgba(22,163,74,0.35)' : isNG ? '1.5px solid rgba(220,38,38,0.35)' : '1px solid rgba(0,0,0,0.10)';
  const cardBg     = isOK ? 'rgba(22,163,74,0.04)'            : isNG ? 'rgba(220,38,38,0.04)'            : 'var(--card)';

  return (
    <div style={{borderRadius:'16px',border:cardBorder,background:cardBg,boxShadow:'0 1px 4px rgba(0,0,0,0.08)',padding:'14px 16px'}}>
      <div style={{display:'flex',alignItems:'flex-start',gap:'14px'}}>
        <div style={{flex:1,minWidth:0}}>

          {/* Operation label row + pills */}
          <div style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:'5px',marginBottom:'4px'}}>
            <span style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.10em',color:'#6b7280'}}>
              Operation
            </span>
            {machinePills && <div style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:'3px'}}>{machinePills}</div>}
          </div>

          {/* Operation number */}
          <div style={{fontSize:'24px',fontWeight:900,lineHeight:1,color:'var(--text-main)',letterSpacing:'-0.02em'}}>
            {operationNo}
          </div>

          {/* Clean machine name */}
          <div style={{fontSize:'11px',fontWeight:600,color:'#374151',marginTop:'4px'}}>{cleanMachineName}</div>

          {/* Details — always visible, no click required */}
          <div style={{marginTop:'12px'}}>
            {hasSubStations ? (
              <div style={{display:'flex',flexDirection:'column',gap:'9px'}}>
                {groupKeys.filter((k)=>k!=='').length > 1 && anySubActive && (
                  <div style={{
                    display:'flex',alignItems:'flex-start',gap:'6px',padding:'7px 11px',borderRadius:'10px',
                    background:'rgba(28,105,212,0.07)',border:'1.5px solid rgba(28,105,212,0.22)',
                    fontSize:'10px',color:'#1c69d4',lineHeight:1.5,fontWeight:600,
                  }}>
                    <Info size={12} style={{flexShrink:0,marginTop:'1px',color:'#1c69d4'}}/>
                    <span>
                      This operation has <strong>{groupKeys.filter(k=>k!=='').length} machines</strong>.&nbsp;
                      Part processed on <strong>{[...activeSubStations].map(s=>`${operationNo}${s}`).join(' & ')}</strong>.
                    </span>
                  </div>
                )}
                {groupKeys.filter((k)=>k!=='').map((suffix) => (
                  <SubMachineBlock
                    key={suffix}
                    suffix={suffix}
                    operationNo={operationNo}
                    fields={buildFields(detailGroups[suffix])}
                    isActive={activeSubStations.has(suffix)}
                    anyActive={anySubActive}
                  />
                ))}
                {detailGroups[''] && detailGroups[''].length > 0 && (
                  <SingleStationFields fields={buildFields(detailGroups[''])}/>
                )}
              </div>
            ) : (
              station.details.length > 0 && (
                <SingleStationFields fields={buildFields(detailGroups['']||station.details)}/>
              )
            )}
          </div>
        </div>

        {/* Status box — fixed size, no order number */}
        <StationStatusBox value={station.rawStatus}/>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   OperationList — all cards always expanded
   ═══════════════════════════════════════════════════════════════════ */
const OperationList = ({ partStations }) => (
  <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
    {partStations.map((station) => (
      <OperationCard key={station.key} station={station}/>
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════
   JourneyModal
   ═══════════════════════════════════════════════════════════════════ */
const JourneyModal = ({ part, onClose, onPrev, onNext, hasPrev, hasNext }) => {
  const partStations = useMemo(
    () => (part ? STATION_FLOW.map((st) => getStationSummary(st, part)) : []),
    [part],
  );
  const progress = useMemo(() => (part ? getPartProgress(part) : null), [part]);

  const handleBackdrop = useCallback((e) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  if (!part) return null;

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position:'fixed',inset:0,zIndex:1000,
        background:'rgba(0,0,0,0.55)',backdropFilter:'blur(6px)',
        display:'flex',alignItems:'center',justifyContent:'center',
        padding:'16px',animation:'fadeIn 0.18s ease',
      }}
    >
      <div style={{
        width:'100%',maxWidth:'900px',maxHeight:'calc(100vh - 32px)',
        borderRadius:'24px',border:'1px solid rgba(0,0,0,0.12)',
        background:'var(--card)',
        boxShadow:'0 32px 80px rgba(0,0,0,0.28)',
        display:'flex',flexDirection:'column',
        overflow:'hidden',animation:'slideUp 0.22s ease',
      }}>

        {/* Header */}
        <div style={{
          display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'16px 20px',borderBottom:'1px solid rgba(0,0,0,0.10)',
          background:'var(--card)',flexShrink:0,
        }}>
          <div style={{display:'flex',alignItems:'center',gap:'12px',minWidth:0}}>
            <div style={{width:'36px',height:'36px',borderRadius:'11px',flexShrink:0,background:'rgba(28,105,212,0.10)',border:'1.5px solid rgba(28,105,212,0.30)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Route size={15} style={{color:'#1c69d4'}}/>
            </div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.18em',color:'#6b7280'}}>Component Journey</div>
              <div style={{fontFamily:'monospace',fontSize:'14px',fontWeight:800,color:'var(--text-main)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {getDisplayBarcode(part.barcode)}
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
              <ShiftBadge shift={part.shift}/>
              <StatusBadge value={getPartOverallStatus(part)}/>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
            {[
              { fn:onPrev, enabled:hasPrev, icon:<ChevronLeft size={14}/> },
              { fn:onNext, enabled:hasNext, icon:<ChevronRight size={14}/> },
              { fn:onClose, enabled:true,   icon:<X size={14}/> },
            ].map(({fn,enabled,icon},i) => (
              <button key={i} type="button" onClick={fn} disabled={!enabled} style={{
                display:'flex',alignItems:'center',justifyContent:'center',
                width:'32px',height:'32px',borderRadius:'9px',
                border:'1.5px solid rgba(0,0,0,0.12)',
                background:enabled?'rgba(0,0,0,0.04)':'transparent',
                color:enabled?'var(--text-main)':'#9ca3af',
                cursor:enabled?'pointer':'not-allowed',opacity:enabled?1:0.35,transition:'all 0.15s',
              }}>{icon}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{overflowY:'auto',flex:1,padding:'16px 20px',scrollbarWidth:'thin',scrollbarColor:'rgba(0,0,0,0.15) transparent'}}>

          {/* Progress */}
          {progress && (
            <div style={{marginBottom:'16px'}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px',marginBottom:'12px'}}>
                {[
                  { label:'Passed',  value:progress.passedCount,     color:'#15803d', bg:'rgba(22,163,74,0.10)',  border:'rgba(22,163,74,0.35)'  },
                  { label:'Failed',  value:progress.failedCount,     color:'#dc2626', bg:'rgba(220,38,38,0.10)', border:'rgba(220,38,38,0.35)' },
                  { label:'Pending', value:progress.inProgressCount, color:'#b45309', bg:'rgba(180,83,9,0.10)',  border:'rgba(180,83,9,0.35)'   },
                ].map(({label,value,color,bg,border}) => (
                  <div key={label} style={{borderRadius:'14px',padding:'12px 14px',background:bg,border:`1.5px solid ${border}`}}>
                    <div style={{fontSize:'8px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.16em',color:'#6b7280'}}>{label}</div>
                    <div style={{fontSize:'28px',fontWeight:900,lineHeight:1,marginTop:'6px',color}}>{value}</div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px'}}>
                  <span style={{fontSize:'9px',color:'#6b7280',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em'}}>
                    Overall Progress — {progress.passedCount}/{STATION_FLOW.length} stations
                  </span>
                  <span style={{fontSize:'10px',fontWeight:800,color:'#1c69d4'}}>{progress.percent}%</span>
                </div>
                <div style={{height:'6px',borderRadius:'999px',background:'rgba(0,0,0,0.08)',overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:'999px',background:'linear-gradient(90deg,#1c69d4,#16a34a)',width:`${progress.percent}%`,transition:'width 0.6s cubic-bezier(0.34,1.06,0.64,1)'}}/>
                </div>
              </div>
            </div>
          )}

          {/* All operation cards — always expanded */}
          <OperationList partStations={partStations}/>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   PartCard
   ═══════════════════════════════════════════════════════════════════ */
const PartCard = ({ part, onClick }) => {
  const overall     = getPartOverallStatus(part);
  const progress    = getPartProgress(part);
  const nextStation = STATION_FLOW.find((st) => normalizeResult(getStationStatus(part.stations?.[st.key]||{})) !== 'OK');

  return (
    <button type="button" onClick={onClick} style={{all:'unset',display:'block',width:'100%',boxSizing:'border-box',cursor:'pointer'}}>
      <div
        style={{borderRadius:'16px',padding:'13px 14px',border:'1px solid rgba(0,0,0,0.10)',background:'var(--card)',boxShadow:'0 1px 4px rgba(0,0,0,0.08)',transition:'all 0.20s ease'}}
        onMouseEnter={e=>{e.currentTarget.style.border='1.5px solid rgba(28,105,212,0.40)';e.currentTarget.style.background='rgba(28,105,212,0.04)';e.currentTarget.style.boxShadow='0 6px 20px rgba(28,105,212,0.14)';e.currentTarget.style.transform='translateY(-1px)';}}
        onMouseLeave={e=>{e.currentTarget.style.border='1px solid rgba(0,0,0,0.10)';e.currentTarget.style.background='var(--card)';e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.08)';e.currentTarget.style.transform='translateY(0)';}}
      >
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'8px'}}>
          <div style={{minWidth:0}}>
            <div style={{fontFamily:'monospace',fontSize:'11px',fontWeight:800,color:'var(--text-main)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'170px'}}>
              {getDisplayBarcode(part.barcode)}
            </div>
            <div style={{marginTop:'5px'}}><StatusBadge value={overall}/></div>
          </div>
          <ShiftBadge shift={part.shift}/>
        </div>
        <div style={{marginTop:'8px',fontSize:'10px',fontWeight:500,color:'#6b7280'}}>{formatDate(part.updatedAt)}</div>
        <div style={{marginTop:'10px'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
            <span style={{fontSize:'9px',color:'#6b7280',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.10em'}}>{progress.passedCount}/{STATION_FLOW.length} stations</span>
            <span style={{fontSize:'11px',fontWeight:800,color:'#1c69d4'}}>{progress.percent}%</span>
          </div>
          <div style={{height:'5px',borderRadius:'999px',background:'rgba(0,0,0,0.08)',overflow:'hidden'}}>
            <div style={{
              height:'100%',borderRadius:'999px',
              background:progress.failedCount>0?'linear-gradient(90deg,#dc2626,#f97316)':'linear-gradient(90deg,#1c69d4,#16a34a)',
              width:`${progress.percent}%`,transition:'width 0.5s ease',
            }}/>
          </div>
        </div>
        {nextStation && (
          <div style={{marginTop:'7px',display:'flex',alignItems:'center',gap:'4px'}}>
            <ArrowRight size={10} style={{color:'#9ca3af',flexShrink:0}}/>
            <span style={{fontSize:'9px',fontWeight:500,color:'#6b7280',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{nextStation.label}</span>
          </div>
        )}
      </div>
    </button>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════ */
const JourneyPage = () => {
  const [parts, setParts]               = useState([]);
  const [filters, setFilters]           = useState({
    query:'', rangeType:'MONTH', startDate:'', endDate:'',
    variant:'ALL', shift:'ALL', station:'ALL', stationStatus:'ALL',
  });
  const [modalBarcode, setModalBarcode] = useState(null);
  const [loading, setLoading]           = useState(false);
  const [showFilters, setShowFilters]   = useState(false);
  const [currentPage, setCurrentPage]   = useState(1);

  const filteredParts = useMemo(() =>
    parts.filter((part) => {
      const bv        = getBarcodeValue(part.barcode);
      const queryMatch= !filters.query || bv.toUpperCase().includes(filters.query.toUpperCase());
      const partDate  = part.updatedAt ? new Date(part.updatedAt) : null;
      const startOk   = !filters.startDate||!partDate||Number.isNaN(partDate.getTime())||partDate>=new Date(`${filters.startDate}T00:00:00`);
      const endOk     = !filters.endDate  ||!partDate||Number.isNaN(partDate.getTime())||partDate<=new Date(`${filters.endDate}T23:59:59`);
      const variantOk = filters.variant==='ALL'||part.variant===filters.variant;
      const shiftOk   = filters.shift==='ALL'||part.shift===filters.shift;
      const stationOk = filters.station==='ALL'||part.stations?.[filters.station];
      const statusOk  = (() => {
        if (filters.stationStatus==='ALL') return true;
        const target = filters.stationStatus;
        if (filters.station==='ALL')
          return STATION_FLOW.some((st) => getJourneyStatusLabel(getStationStatus(part.stations?.[st.key]||{}))=== target);
        return getJourneyStatusLabel(getStationStatus(part.stations?.[filters.station]||{}))=== target;
      })();
      return queryMatch&&startOk&&endOk&&variantOk&&shiftOk&&stationOk&&statusOk;
    }),
    [parts, filters],
  );

  const totalPages      = Math.max(1, Math.ceil(filteredParts.length / CARDS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex  = filteredParts.length === 0 ? 0 : (safeCurrentPage - 1) * CARDS_PER_PAGE;
  const paginatedParts  = useMemo(
    () => filteredParts.slice(pageStartIndex, pageStartIndex + CARDS_PER_PAGE),
    [filteredParts, pageStartIndex],
  );
  const pageFrom = filteredParts.length === 0 ? 0 : pageStartIndex + 1;
  const pageTo   = Math.min(pageStartIndex + CARDS_PER_PAGE, filteredParts.length);

  useEffect(() => { setCurrentPage(1); }, [
    filters.endDate, filters.query, filters.rangeType, filters.shift,
    filters.startDate, filters.station, filters.stationStatus, filters.variant,
  ]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const modalIndex = modalBarcode ? filteredParts.findIndex(p => p.barcode === modalBarcode) : -1;
  const modalPart  = modalIndex >= 0 ? filteredParts[modalIndex] : null;
  const hasPrev    = modalIndex > 0;
  const hasNext    = modalIndex >= 0 && modalIndex < filteredParts.length - 1;

  const openModal  = useCallback((barcode) => setModalBarcode(barcode), []);
  const closeModal = useCallback(() => setModalBarcode(null), []);
  const prevModal  = useCallback(() => { if (hasPrev) setModalBarcode(filteredParts[modalIndex-1].barcode); }, [hasPrev, filteredParts, modalIndex]);
  const nextModal  = useCallback(() => { if (hasNext) setModalBarcode(filteredParts[modalIndex+1].barcode); }, [hasNext, filteredParts, modalIndex]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await getJourney({
          search:filters.query, shift:filters.shift,
          startDate:filters.startDate, endDate:filters.endDate,
          category:filters.variant==='ALL'?undefined:filters.variant,
        });
        const apiParts = Array.isArray(response?.parts)
          ? response.parts.map((part) => ({
              ...part,
              stations: Object.fromEntries(
                (part.stations||[]).map((st) => [st.key,{status:st.status,...st.details}]),
              ),
            }))
          : [];
        if (apiParts.length > 0) {
          setParts(apiParts);
          const latestDate  = formatDateInput(apiParts[0]?.updatedAt);
          const presetDates = getDateRangeFromPreset('MONTH', latestDate);
          setFilters((cur) => ({
            ...cur,
            rangeType: cur.rangeType||'MONTH',
            startDate: cur.startDate||presetDates.startDate,
            endDate:   cur.endDate  ||presetDates.endDate,
          }));
        } else {
          setParts([]);
        }
      } catch (err) {
        console.error('[JOURNEY] load failed:', err.message);
        setParts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filters.endDate, filters.query, filters.shift, filters.startDate, filters.variant]);

  const updateFilter    = (key, value) => setFilters((cur) => ({...cur,[key]:value}));
  const updateRangeType = (value) => {
    const latestDate = formatDateInput(parts[0]?.updatedAt);
    const nextDates  = getDateRangeFromPreset(value, latestDate);
    setFilters((cur) => ({...cur, rangeType:value, ...nextDates}));
  };

  const durationValue = filters.startDate && filters.endDate
    ? `${filters.startDate} → ${filters.endDate}`
    : 'Select date range';

  return (
    <>
      <style>{`
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.5)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>

      <div className="space-y-4">

        {/* Page header */}
        <section style={{borderRadius:'24px',border:'1px solid rgba(0,0,0,0.10)',background:'var(--card)',padding:'16px 20px',boxShadow:'0 2px 12px rgba(0,0,0,0.08)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <div style={{width:'38px',height:'38px',borderRadius:'12px',flexShrink:0,background:'rgba(28,105,212,0.10)',border:'1.5px solid rgba(28,105,212,0.30)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Route size={16} style={{color:'#1c69d4'}}/>
            </div>
            <div>
              <h1 style={{fontSize:'16px',fontWeight:800,color:'var(--text-main)',margin:0}}>Component Journey</h1>
              <p style={{fontSize:'11px',fontWeight:500,color:'#6b7280',margin:'2px 0 0'}}>
                Click any part card to view its full operation journey. Use filters to narrow down results.
              </p>
            </div>
          </div>
        </section>

        {/* Filter bar */}
        <section style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'10px',flexWrap:'wrap'}}>
            <button type="button" onClick={()=>setShowFilters(c=>!c)} style={{
              display:'inline-flex',alignItems:'center',gap:'7px',padding:'7px 16px',borderRadius:'999px',
              border:showFilters?'1.5px solid rgba(28,105,212,0.40)':'1px solid rgba(0,0,0,0.12)',
              background:showFilters?'rgba(28,105,212,0.08)':'var(--card)',
              color:showFilters?'#1c69d4':'var(--text-main)',
              fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.14em',cursor:'pointer',transition:'all 0.18s ease',
            }}>
              <Filter size={13}/>Filters{showFilters?<ChevronUp size={13}/>:<ChevronDown size={13}/>}
            </button>
            <div style={{display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
              <div style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'11px',fontWeight:600,color:'#6b7280'}}>
                <CalendarDays size={13}/><span>{durationValue}</span>
              </div>
              <div style={{
                padding:'4px 11px',borderRadius:'9px',fontSize:'10px',fontWeight:700,
                border:loading?'1.5px solid rgba(180,83,9,0.40)':'1.5px solid rgba(22,163,74,0.40)',
                background:loading?'rgba(180,83,9,0.08)':'rgba(22,163,74,0.08)',
                color:loading?'#b45309':'#15803d',
              }}>{loading?'⟳ Loading...':'● Live data'}</div>
              <span style={{fontSize:'11px',fontWeight:600,color:'#6b7280'}}>{filteredParts.length} part{filteredParts.length!==1?'s':''}</span>
            </div>
          </div>

          {showFilters && (
            <div style={{borderRadius:'20px',border:'1px solid rgba(0,0,0,0.10)',background:'var(--card)',padding:'18px 20px',boxShadow:'0 4px 16px rgba(0,0,0,0.08)'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'16px'}}>
                <LocateFixed size={14} style={{color:'#6b7280'}}/>
                <span style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.16em',color:'#6b7280'}}>Component Journey Filters</span>
                <div style={{marginLeft:'auto'}}>
                  <div style={{padding:'3px 10px',borderRadius:'8px',fontSize:'10px',fontWeight:700,border:loading?'1.5px solid rgba(180,83,9,0.35)':'1.5px solid rgba(22,163,74,0.35)',background:loading?'rgba(180,83,9,0.08)':'rgba(22,163,74,0.08)',color:loading?'#b45309':'#15803d'}}>
                    {loading?'Loading...':'Live data'}
                  </div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:'14px'}}>
                <FilterField label="Part Search">
                  <div style={{position:'relative'}}>
                    <Search size={13} style={{position:'absolute',left:'11px',top:'50%',transform:'translateY(-50%)',color:'#9ca3af',pointerEvents:'none'}}/>
                    <input value={filters.query} onChange={(e)=>updateFilter('query',e.target.value)} placeholder="Search part id" className={inputCls} style={{paddingLeft:'32px',fontFamily:'monospace'}}/>
                  </div>
                </FilterField>
                <FilterField label="Variant">
                  <select value={filters.variant} onChange={(e)=>updateFilter('variant',e.target.value)} className={inputCls}>
                    {VARIANT_OPTIONS.map((opt)=><option key={opt.value} value={opt.value}>{opt.value==='ALL'?'ALL':opt.label}</option>)}
                  </select>
                </FilterField>
                <FilterField label="Shift">
                  <select value={filters.shift} onChange={(e)=>updateFilter('shift',e.target.value)} className={inputCls}>
                    <option value="ALL">All Shifts</option>
                    <option value="A">Shift A</option>
                    <option value="B">Shift B</option>
                    <option value="C">Shift C</option>
                  </select>
                </FilterField>
                <FilterField label="Date Preset">
                  <select value={filters.rangeType} onChange={(e)=>updateRangeType(e.target.value)} className={inputCls}>
                    {RANGE_OPTIONS.map((opt)=><option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </FilterField>
                <FilterField label="Start Date">
                  <input type="date" value={filters.startDate} onChange={(e)=>{updateFilter('startDate',e.target.value);updateFilter('rangeType','CUSTOM');}} className={inputCls}/>
                </FilterField>
                <FilterField label="End Date">
                  <input type="date" value={filters.endDate} onChange={(e)=>{updateFilter('endDate',e.target.value);updateFilter('rangeType','CUSTOM');}} className={inputCls}/>
                </FilterField>
                <FilterField label="Station">
                  <select value={filters.station} onChange={(e)=>updateFilter('station',e.target.value)} className={inputCls}>
                    <option value="ALL">Any Station</option>
                    {STATION_FLOW.map((st)=><option key={st.key} value={st.key}>{st.label}</option>)}
                  </select>
                </FilterField>
                <FilterField label="Station Status">
                  <select value={filters.stationStatus} onChange={(e)=>updateFilter('stationStatus',e.target.value)} className={inputCls}>
                    <option value="ALL">Any</option>
                    <option value="OK">Pass (OK)</option>
                    <option value="NG">Failed (NG)</option>
                    <option value="PENDING">Pending</option>
                  </select>
                </FilterField>
              </div>
              {(filters.query||filters.variant!=='ALL'||filters.shift!=='ALL'||filters.station!=='ALL'||filters.stationStatus!=='ALL') && (
                <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginTop:'14px',paddingTop:'14px',borderTop:'1px solid rgba(0,0,0,0.08)'}}>
                  <span style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.14em',color:'#6b7280',alignSelf:'center'}}>Active:</span>
                  {filters.query && <span style={{display:'inline-flex',alignItems:'center',gap:'4px',fontSize:'10px',fontWeight:700,padding:'2px 9px',borderRadius:'999px',background:'rgba(28,105,212,0.10)',border:'1.5px solid rgba(28,105,212,0.30)',color:'#1c69d4'}}>ID: {filters.query}<button type="button" onClick={()=>updateFilter('query','')} style={{all:'unset',cursor:'pointer',lineHeight:1}}><X size={9}/></button></span>}
                  {filters.variant!=='ALL' && <span style={{display:'inline-flex',alignItems:'center',gap:'4px',fontSize:'10px',fontWeight:700,padding:'2px 9px',borderRadius:'999px',background:'rgba(109,40,217,0.10)',border:'1.5px solid rgba(109,40,217,0.30)',color:'#6d28d9'}}>Variant: {filters.variant}<button type="button" onClick={()=>updateFilter('variant','ALL')} style={{all:'unset',cursor:'pointer',lineHeight:1}}><X size={9}/></button></span>}
                  {filters.shift!=='ALL' && <span style={{display:'inline-flex',alignItems:'center',gap:'4px',fontSize:'10px',fontWeight:700,padding:'2px 9px',borderRadius:'999px',background:'rgba(13,148,136,0.10)',border:'1.5px solid rgba(13,148,136,0.30)',color:'#0d9488'}}>Shift: {filters.shift}<button type="button" onClick={()=>updateFilter('shift','ALL')} style={{all:'unset',cursor:'pointer',lineHeight:1}}><X size={9}/></button></span>}
                  {filters.station!=='ALL' && <span style={{display:'inline-flex',alignItems:'center',gap:'4px',fontSize:'10px',fontWeight:700,padding:'2px 9px',borderRadius:'999px',background:'rgba(180,83,9,0.10)',border:'1.5px solid rgba(180,83,9,0.30)',color:'#b45309'}}>Station: {STATION_MAP[filters.station]||filters.station}<button type="button" onClick={()=>updateFilter('station','ALL')} style={{all:'unset',cursor:'pointer',lineHeight:1}}><X size={9}/></button></span>}
                  {filters.stationStatus!=='ALL' && <span style={{display:'inline-flex',alignItems:'center',gap:'4px',fontSize:'10px',fontWeight:700,padding:'2px 9px',borderRadius:'999px',background:'rgba(190,24,93,0.10)',border:'1.5px solid rgba(190,24,93,0.30)',color:'#be185d'}}>Status: {getJourneyStatusFilterLabel(filters.stationStatus)}<button type="button" onClick={()=>updateFilter('stationStatus','ALL')} style={{all:'unset',cursor:'pointer',lineHeight:1}}><X size={9}/></button></span>}
                  <button type="button" onClick={()=>setFilters(f=>({...f,query:'',variant:'ALL',shift:'ALL',station:'ALL',stationStatus:'ALL'}))} style={{display:'inline-flex',alignItems:'center',gap:'3px',fontSize:'9px',fontWeight:700,padding:'2px 9px',borderRadius:'999px',background:'rgba(0,0,0,0.05)',border:'1px solid rgba(0,0,0,0.12)',color:'#6b7280',cursor:'pointer'}}><X size={8}/>Clear all</button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Parts grid */}
        <section style={{borderRadius:'24px',border:'1px solid rgba(0,0,0,0.10)',background:'var(--card)',padding:'16px',boxShadow:'0 2px 12px rgba(0,0,0,0.08)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
            <div>
              <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.20em',color:'#6b7280'}}>Part Catalog</div>
              <div style={{fontSize:'15px',fontWeight:800,color:'var(--text-main)',marginTop:'3px'}}>All Parts</div>
            </div>
            <span style={{fontSize:'10px',fontWeight:600,color:'#6b7280',padding:'3px 10px',borderRadius:'999px',border:'1px solid rgba(0,0,0,0.10)'}}>
              {filteredParts.length} {filteredParts.length===1?'part':'parts'}
            </span>
          </div>

          {filteredParts.length === 0 ? (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'220px',gap:'10px',color:'#9ca3af',border:'1px dashed rgba(0,0,0,0.12)',borderRadius:'14px'}}>
              <Search size={22} style={{opacity:0.3}}/>
              <span style={{fontSize:'12px',fontWeight:600}}>No parts match the current filters</span>
              <button type="button" onClick={()=>setFilters(f=>({...f,query:'',variant:'ALL',shift:'ALL',station:'ALL',stationStatus:'ALL'}))} style={{fontSize:'10px',fontWeight:700,padding:'5px 14px',borderRadius:'999px',border:'1px solid rgba(0,0,0,0.12)',background:'rgba(0,0,0,0.03)',color:'var(--text-main)',cursor:'pointer'}}>Clear filters</button>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'10px',flexWrap:'wrap'}}>
                <span style={{fontSize:'10px',fontWeight:600,color:'#6b7280'}}>Showing {pageFrom}–{pageTo} of {filteredParts.length} parts</span>
                <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                  <span style={{fontSize:'10px',fontWeight:600,color:'#6b7280',padding:'4px 10px',borderRadius:'999px',border:'1px solid rgba(0,0,0,0.10)',background:'rgba(0,0,0,0.03)'}}>Page {safeCurrentPage} of {totalPages}</span>
                  <button type="button" onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={safeCurrentPage===1} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'4px',padding:'6px 13px',borderRadius:'999px',border:'1px solid rgba(0,0,0,0.12)',background:safeCurrentPage===1?'transparent':'rgba(0,0,0,0.03)',color:safeCurrentPage===1?'#9ca3af':'var(--text-main)',cursor:safeCurrentPage===1?'not-allowed':'pointer',opacity:safeCurrentPage===1?0.45:1,fontSize:'11px',fontWeight:700}}>
                    <ChevronLeft size={12}/>Prev
                  </button>
                  <button type="button" onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={safeCurrentPage===totalPages} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'4px',padding:'6px 13px',borderRadius:'999px',border:'1.5px solid rgba(28,105,212,0.40)',background:safeCurrentPage===totalPages?'transparent':'rgba(28,105,212,0.08)',color:safeCurrentPage===totalPages?'#9ca3af':'#1c69d4',cursor:safeCurrentPage===totalPages?'not-allowed':'pointer',opacity:safeCurrentPage===totalPages?0.45:1,fontSize:'11px',fontWeight:700}}>
                    Next<ChevronRight size={12}/>
                  </button>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:'10px'}}>
                {paginatedParts.map((part) => (
                  <PartCard key={part.barcode} part={part} onClick={()=>openModal(part.barcode)}/>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {modalPart && (
        <JourneyModal part={modalPart} onClose={closeModal} onPrev={prevModal} onNext={nextModal} hasPrev={hasPrev} hasNext={hasNext}/>
      )}
    </>
  );
};

export default JourneyPage;