import React, { useState, useEffect, useMemo } from 'react';
import { getSummary, getHourly, getShiftWise, getStationWise, getRecords, getDateRange, exportRecords } from '../api';
import FilterBar from '../components/FilterBar';
import KpiCard from '../components/KpiCard';
import ResultBadge, { normalizeResult as normalizeBadgeResult } from '../components/ResultBadge';
import ShiftBadge from '../components/ShiftBadge';
import CategoryBadge from '../components/CategoryBadge';
import { PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Search, FileText, ChevronLeft, ChevronRight, Factory } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import {
   STATION_MAP,
   VISIBLE_STATION_KEYS,
   GROUPED_STATION_COLUMNS,
} from '../constants/stationMap';
import {
   MACHINE_OPERATION_CARDS,
   getMachineOperation,
   getMachineOperationValue,
   normalizeMachineResultValue,
} from '../constants/machineOperations';

const ExportNoticeModal = ({ notice, onClose }) => {
   if (!notice) return null;

   return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm animate-in fade-in duration-200">
         <div className="w-full max-w-md rounded-3xl border border-[var(--primary)]/20 bg-[var(--card)] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.45)] animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
               <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn)]">
                  <FileText size={18} />
               </div>
               <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">{notice.title}</p>
                  <p className="mt-2 text-[14px] leading-6 text-[var(--text-main)]">{notice.message}</p>
               </div>
            </div>
            <div className="mt-6 flex justify-end">
               <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex min-w-[96px] items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:brightness-110"
               >
                  OK
               </button>
            </div>
         </div>
      </div>
   );
};

const PIE_COLORS = ['var(--ok)', 'var(--ng)', 'var(--warn)'];
const HEAT_SUB_RESULT_KEYS = ['Station_9_2_Result', 'Station_9_3_Result', 'Station_9_4_Result'];
const EMPTY_CELL = '-';
const HEAT_TREATMENT_DURATION_KEY = 'Heat_Treatment_Duration';
const REPORT_STATION_ORDER = [
   { id: 'Station_30_Result', label: STATION_MAP.Station_30_Result },
   { id: 'Station_31_Result', label: STATION_MAP.Station_31_Result },
   { id: 'Station_32_Result', label: STATION_MAP.Station_32_Result },
   { id: 'Station_100_1_Result', label: 'OP60A' },
   { id: 'Station_100_2_Result', label: 'OP60B' },
   { id: 'Station_200_3_Result', label: 'OP70A' },
   { id: 'Station_200_4_Result', label: 'OP70B' },
   { id: 'Station_200_5_Result', label: 'OP70C' },
   { id: 'Station_300_6_Result', label: 'OP80A / OP90A' },
   { id: 'Station_300_7_Result', label: 'OP80B / OP90B' },
   { id: 'Station_300_8_Result', label: 'OP80C / OP90C' },
   { id: 'Station_9_Result', label: STATION_MAP.Station_9_Result },
   { id: 'Station_10_Result', label: STATION_MAP.Station_10_Result },
   { id: 'Station_11_Result', label: STATION_MAP.Station_11_Result },
   { id: 'Station_12_Result', label: STATION_MAP.Station_12_Result },
   { id: 'Station_13_Result', label: STATION_MAP.Station_13_Result },
   { id: 'Station_14_Result', label: STATION_MAP.Station_14_Result },
   { id: 'Station_15_Result', label: STATION_MAP.Station_15_Result },
   { id: 'Station_16_Result', label: STATION_MAP.Station_16_Result },
   { id: 'Station_17_Result', label: STATION_MAP.Station_17_Result },
   { id: 'Station_18_Result', label: STATION_MAP.Station_18_Result },
   { id: 'Station_19_Result', label: STATION_MAP.Station_19_Result },
];
const REPORT_VISIBLE_STATIONS = [
   { id: 'report-op30', sourceKey: 'Station_32_Result', label: 'OP30 - FETLING' },
   { id: 'Station_31_Result', sourceKey: 'Station_31_Result', label: STATION_MAP.Station_31_Result },
   { id: 'report-op50', sourceKey: 'Station_30_Result', label: 'OP50 - PDI' },
   ...VISIBLE_STATION_KEYS
      .filter((key) => !['Station_30_Result', 'Station_31_Result', 'Station_32_Result'].includes(key))
      .map((key) => ({ id: key, sourceKey: key, label: STATION_MAP[key] || key })),
];
const REPORT_GROUPED_STATION_COLUMNS = {
   ...GROUPED_STATION_COLUMNS,
   Station_31_Result: [
      ...(GROUPED_STATION_COLUMNS.Station_31_Result || []),
      { key: HEAT_TREATMENT_DURATION_KEY, label: 'Duration', parentKey: 'Station_31_Result' },
   ],
   Station_100_Result: [
      { key: 'Station_100_1_Result', label: 'OP60A', fallbackKeys: ['Station_100_1_Result', 'Station_100_ST_1_Result'], parentKey: 'Station_100_Result' },
      { key: 'Station_100_2_Result', label: 'OP60B', fallbackKeys: ['Station_100_2_Result', 'Station_100_ST_2_Result'], parentKey: 'Station_100_Result' },
   ],
   Station_200_Result: [
      { key: 'Station_200_3_Result', label: 'OP70A', fallbackKeys: ['Station_200_3_Result', 'Station_200_ST_3_Result'], parentKey: 'Station_200_Result' },
      { key: 'Station_200_4_Result', label: 'OP70B', fallbackKeys: ['Station_200_4_Result', 'Station_200_ST_4_Result'], parentKey: 'Station_200_Result' },
      { key: 'Station_200_5_Result', label: 'OP70C', fallbackKeys: ['Station_200_5_Result', 'Station_200_ST_5_Result'], parentKey: 'Station_200_Result' },
   ],
   Station_300_Result: [
      { key: 'Station_300_6_Result', label: 'OP80A / OP90A', fallbackKeys: ['Station_300_6_Result', 'Station_300_ST_6_Result'], parentKey: 'Station_300_Result' },
      { key: 'Station_300_7_Result', label: 'OP80B / OP90B', fallbackKeys: ['Station_300_7_Result', 'Station_300_ST_7_Result'], parentKey: 'Station_300_Result' },
      { key: 'Station_300_8_Result', label: 'OP80C / OP90C', fallbackKeys: ['Station_300_8_Result', 'Station_300_ST_8_Result'], parentKey: 'Station_300_Result' },
   ],
};

const PieTooltip = ({ active, payload }) => {
   if (!active || !payload?.length) return null;
   const d = payload[0];
   return (
      <div style={{
         background: 'rgba(13, 23, 38, 0.95)', border: '1px solid rgba(34, 50, 74, 0.8)',
         borderRadius: 10, padding: '10px 16px', minWidth: 120, backdropFilter: 'blur(12px)'
      }}>
         <div style={{ color: d.payload.color, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>{d.name}</div>
         <div style={{ color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800 }}>{d.value}</div>
      </div>
   );
};

const BarTooltip = ({ active, payload, label }) => {
   if (!active || !payload?.length) return null;
   return (
      <div style={{
         background: 'rgba(13, 23, 38, 0.95)', border: '1px solid rgba(34, 50, 74, 0.8)',
         borderRadius: 10, padding: '10px 16px', backdropFilter: 'blur(12px)'
      }}>
         <p style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</p>
         {payload.map((p, i) => (
            <div key={i} style={{ color: p.color, fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 2 }}>
               <span style={{ opacity: 0.7 }}>{p.name}: </span><strong>{p.value}</strong>
            </div>
         ))}
      </div>
   );
};

const getSubValueTone = (value, key) => {
   const normalized = String(value ?? '').trim().toUpperCase();

   if (normalized === '-') {
      return {
         wrapper: 'bg-[var(--surface)] border border-[var(--border)]',
         value: 'text-[var(--text-muted)]'
      };
   }

   if (!normalized || normalized === '—' || normalized === 'Â€”' || normalized === 'â€”') {
      return {
         wrapper: 'bg-[var(--surface)] border border-[var(--border)]',
         value: 'text-[var(--text-muted)]'
      };
   }

   if (normalized === 'OK' || normalized === 'PASS') {
      return {
         wrapper: 'bg-[var(--ok-bg)]/70 border border-[var(--ok-border)]/60',
         value: 'text-[var(--ok)]'
      };
   }

   if (['NG', 'NOK', 'FAIL'].includes(normalized)) {
      return {
         wrapper: 'bg-[var(--ng-bg)]/70 border border-[var(--ng-border)]/60',
         value: 'text-[var(--ng)]'
      };
   }

   if (key === 'Final_Marking') {
      return {
         wrapper: 'bg-[var(--primary-dim)] border border-[var(--primary)]/30',
         value: 'text-white'
      };
   }

   return {
      wrapper: 'bg-[var(--surface)] border border-[var(--border)]',
      value: 'text-[var(--text-main)]'
   };
};

const TableResultCell = ({ value }) => {
   const normalized = normalizeBadgeResult(value);

   if (normalized === 'IN PROGRESS') {
      return <span className="text-[12px] font-semibold text-[var(--text-muted)]">-</span>;
   }

   return <ResultBadge value={value} />;
};

const getDisplayValue = (value) => {
   if (value === null || value === undefined) return EMPTY_CELL;
   if (typeof value === 'string' && value.trim() === '') return EMPTY_CELL;
   return value;
};

const formatDateDisplay = (value) => {
   const resolved = getDisplayValue(value);
   if (resolved === EMPTY_CELL) return EMPTY_CELL;

   const date = new Date(resolved);
   return Number.isNaN(date.getTime()) ? EMPTY_CELL : date.toLocaleString();
};

const getOrderedExportKeys = (sample = {}) => {
   const baseKeys = ['SL_NO', 'Barcode', 'Date_Time', 'Shift'];
   const orderedStationKeys = REPORT_VISIBLE_STATIONS.flatMap((station) => {
      const groupedColumns = REPORT_GROUPED_STATION_COLUMNS[station.sourceKey];
      return groupedColumns ? groupedColumns.map((column) => column.key) : [station.sourceKey];
   });
   const extraKeys = ['Overall_Result'];

   return [...baseKeys, ...orderedStationKeys, ...extraKeys]
      .filter((key) => Object.prototype.hasOwnProperty.call(sample, key));
};

const getExportHeaderLabel = (key) => {
   if (key === 'SL_NO') return '#';
   if (key === 'Date_Time') return 'Date/Time';
   if (key === 'Overall_Result') return 'Overall Result';

   const directStation = REPORT_VISIBLE_STATIONS.find((station) => station.sourceKey === key);
   if (directStation) return directStation.label;

   for (const [parentKey, columns] of Object.entries(REPORT_GROUPED_STATION_COLUMNS)) {
      const match = columns.find((column) => column.key === key);
      if (match) {
         if (['Station_100_Result', 'Station_200_Result', 'Station_300_Result'].includes(parentKey)) {
            return match.label;
         }
         const parentLabel = REPORT_VISIBLE_STATIONS.find((station) => station.sourceKey === parentKey)?.label
            || STATION_MAP[parentKey]
            || parentKey;
         return `${parentLabel} - ${match.label}`;
      }
   }

   return STATION_MAP[key] || key;
};

const REPORT_PAGE_SIZE = 50;

const getReportApiParams = (filters, page) => {
   const next = { ...filters, page };
   if (next.variant !== undefined) {
      next.category = next.variant;
      delete next.variant;
   }
   delete next.machine;
   return next;
};

const getMachineScopedApiParams = (filters, page) => {
   const next = getReportApiParams(filters, page);
   delete next.result;
   return next;
};

const getMachineScopedRecordResult = (record, operation) => {
   if (!operation) return normalizeMachineResultValue(record?.Overall_Result);
   return normalizeMachineResultValue(getMachineOperationValue(record, operation));
};

const filterMachineScopedRecordsByResult = (records, filters, operation) => {
   if (!operation || !filters?.result || filters.result === 'ALL') return records;
   return records.filter((record) => getMachineScopedRecordResult(record, operation) === filters.result);
};

const buildMachineScopedSummary = (records, operation) => {
   const summary = {
      total: records.length,
      ok: 0,
      ng: 0,
      in_progress: 0,
      fpy: 0,
   };

   records.forEach((record) => {
      const result = getMachineScopedRecordResult(record, operation);
      if (result === 'OK') summary.ok += 1;
      else if (result === 'NG') summary.ng += 1;
      else summary.in_progress += 1;
   });

   summary.fpy = summary.total > 0 ? Number(((summary.ok / summary.total) * 100).toFixed(1)) : 0;
   return summary;
};

const buildMachineScopedShiftData = (records, operation) => {
   const lookup = new Map(['A', 'B', 'C'].map((shift) => [shift, {
      shift,
      total: 0,
      ok: 0,
      ng: 0,
      in_progress: 0,
      fpy: 0,
   }]));

   records.forEach((record) => {
      const shift = String(record?.Shift || '').trim().toUpperCase();
      if (!lookup.has(shift)) return;
      const bucket = lookup.get(shift);
      const result = getMachineScopedRecordResult(record, operation);
      bucket.total += 1;
      if (result === 'OK') bucket.ok += 1;
      else if (result === 'NG') bucket.ng += 1;
      else bucket.in_progress += 1;
   });

   return Array.from(lookup.values()).map((bucket) => ({
      ...bucket,
      fpy: bucket.total > 0 ? Number(((bucket.ok / bucket.total) * 100).toFixed(1)) : 0,
   }));
};

const buildMachineScopedHourlyData = (records, operation) => {
   const buckets = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      total: 0,
      ok: 0,
      ng: 0,
      in_progress: 0,
   }));

   records.forEach((record) => {
      const date = record?.Date_Time ? new Date(record.Date_Time) : null;
      if (!date || Number.isNaN(date.getTime())) return;
      const bucket = buckets[date.getHours()];
      const result = getMachineScopedRecordResult(record, operation);
      bucket.total += 1;
      if (result === 'OK') bucket.ok += 1;
      else if (result === 'NG') bucket.ng += 1;
      else bucket.in_progress += 1;
   });

   return buckets;
};

const buildMachineScopedStationData = (records, operation) => {
   const operations = operation ? [operation] : MACHINE_OPERATION_CARDS;

   return operations.map((machine) => {
      const bucket = {
         id: machine.id,
         station: machine.title,
         total: records.length,
         ok: 0,
         ng: 0,
         in_progress: 0,
         fpy: 0,
      };

      records.forEach((record) => {
         const result = normalizeMachineResultValue(getMachineOperationValue(record, machine));
         if (result === 'OK') bucket.ok += 1;
         else if (result === 'NG') bucket.ng += 1;
         else bucket.in_progress += 1;
      });

      bucket.fpy = bucket.total > 0 ? Number(((bucket.ok / bucket.total) * 100).toFixed(1)) : 0;
      return bucket;
   });
};

const buildMachineSummaryRows = (records, selectedMachine = null) => {
   const operations = selectedMachine ? [selectedMachine] : MACHINE_OPERATION_CARDS;

   return operations.map((machine) => {
      const bucket = {
         id: machine.id,
         machine: machine.title,
         total: 0,
         ok: 0,
         ng: 0,
         in_progress: 0,
         fpy: 0,
      };

      records.forEach((record) => {
         const result = normalizeMachineResultValue(getMachineOperationValue(record, machine));
         bucket.total += 1;
         if (result === 'OK') bucket.ok += 1;
         else if (result === 'NG') bucket.ng += 1;
         else bucket.in_progress += 1;
      });

      bucket.fpy = bucket.total > 0 ? Number(((bucket.ok / bucket.total) * 100).toFixed(1)) : 0;
      return bucket;
   });
};

const paginateMachineScopedRecords = (records, page = 1) => {
   const total = records.length;
   const totalPages = Math.max(1, Math.ceil(total / REPORT_PAGE_SIZE));
   const safePage = Math.min(Math.max(page, 1), totalPages);
   const start = (safePage - 1) * REPORT_PAGE_SIZE;

   return {
      records: records.slice(start, start + REPORT_PAGE_SIZE),
      total,
      page: safePage,
      totalPages,
   };
};

const ReportPage = () => {
   const [activeTab, setActiveTab] = useState('summary');
   const [filters, setFilters] = useState({ startDate: '', endDate: '', shift: 'ALL', result: 'ALL', variant: 'ALL', machine: 'ALL', search: '' });
   const [appliedFilters, setAppliedFilters] = useState(null);
   const [loading, setLoading] = useState(false);
   const [machineSearch, setMachineSearch] = useState('');
   const [exportNotice, setExportNotice] = useState(null);

   const [data, setData] = useState({
      summary: null, shifts: [], stations: [], hourly: [], machineSummary: [], records: { records: [], total: 0, page: 1, totalPages: 1 }
   });
   const appliedMachine = useMemo(() => getMachineOperation(appliedFilters?.machine || 'ALL'), [appliedFilters]);

   const orderedStationData = useMemo(() => {
      if (appliedMachine) {
         return data.stations || [];
      }

      const lookup = new Map((data.stations || []).map((station) => [station.id, station]));
      return REPORT_STATION_ORDER.map((stationDef) => {
         const station = lookup.get(stationDef.id);
         return station || {
            id: stationDef.id,
            station: stationDef.label,
            total: 0,
            ok: 0,
            ng: 0,
            in_progress: 0,
            fpy: 0,
         };
      });
   }, [appliedMachine, data.stations]);

   useEffect(() => {
      getDateRange().then(res => {
         if (res && res.max_date) {
            const currentMonthStart = `${res.max_date.substring(0, 7)}-01`;
            const init = { ...filters, startDate: currentMonthStart, endDate: res.max_date };
            setFilters(init);
            setAppliedFilters(init);
         }
      });
   }, []);

   const fetchData = async (p, tab, page = 1) => {
      if (!p) return;
      setLoading(true);
      try {
         const q = getReportApiParams(p, page);
         const selectedMachine = getMachineOperation(p.machine);

         if (selectedMachine) {
            const exportPayload = await exportRecords(getMachineScopedApiParams(p, page));
            const machineRecords = filterMachineScopedRecordsByResult(Array.isArray(exportPayload?.records) ? exportPayload.records : [], p, selectedMachine);

            if (tab === 'summary') {
               setData((prev) => ({
                  ...prev,
                  summary: buildMachineScopedSummary(machineRecords, selectedMachine),
                  shifts: buildMachineScopedShiftData(machineRecords, selectedMachine),
               }));
            } else if (tab === 'shift') {
               setData((prev) => ({ ...prev, shifts: buildMachineScopedShiftData(machineRecords, selectedMachine) }));
            } else if (tab === 'station') {
               setData((prev) => ({ ...prev, stations: buildMachineScopedStationData(machineRecords, selectedMachine) }));
            } else if (tab === 'hourly') {
               setData((prev) => ({ ...prev, hourly: buildMachineScopedHourlyData(machineRecords, selectedMachine) }));
            } else if (tab === 'machine') {
               setData((prev) => ({ ...prev, machineSummary: buildMachineSummaryRows(machineRecords, selectedMachine) }));
            } else if (tab === 'records') {
               setData((prev) => ({ ...prev, records: paginateMachineScopedRecords(machineRecords, page) }));
            }
         } else if (tab === 'summary') {
            const [sum, sh] = await Promise.all([getSummary(q), getShiftWise(q)]);
            setData(prev => ({ ...prev, summary: sum, shifts: sh }));
         } else if (tab === 'shift') {
            const sh = await getShiftWise(q);
            setData(prev => ({ ...prev, shifts: sh }));
         } else if (tab === 'station') {
            const st = await getStationWise(q);
            setData(prev => ({ ...prev, stations: st }));
         } else if (tab === 'hourly') {
            const hr = await getHourly(q);
            setData(prev => ({ ...prev, hourly: hr }));
         } else if (tab === 'machine') {
            const exportPayload = await exportRecords(q);
            const machineRecords = Array.isArray(exportPayload?.records) ? exportPayload.records : [];
            setData((prev) => ({ ...prev, machineSummary: buildMachineSummaryRows(machineRecords, null) }));
         } else if (tab === 'records') {
            const rec = await getRecords(q);
            setData(prev => ({ ...prev, records: rec }));
         }
      } catch (err) { console.error(err); } finally { setLoading(false); }
   };

   useEffect(() => {
      fetchData(appliedFilters, activeTab, 1);
   }, [appliedFilters, activeTab]);

   const handleApply = () => setAppliedFilters({ ...filters });
   const handleRecordSearchApply = () => {
      const nextFilters = { ...filters };
      setFilters(nextFilters);
      setAppliedFilters(nextFilters);
   };
   const handleRecordSearchClear = () => {
      const nextFilters = { ...filters, search: '' };
      setFilters(nextFilters);
      setAppliedFilters(nextFilters);
   };
   const handlePageChange = (p) => fetchData(appliedFilters, 'records', p);

   const handleDownload = async () => {
      try {
         if (activeTab === 'machine') {
            const selectedMachine = getMachineOperation(appliedFilters?.machine || 'ALL');
            const fetchParams = selectedMachine ? getMachineScopedApiParams(appliedFilters) : getReportApiParams(appliedFilters);
            const res = await exportRecords(fetchParams);
            const filteredRecords = filterMachineScopedRecordsByResult(Array.isArray(res?.records) ? res.records : [], appliedFilters, selectedMachine);
            const machineRows = buildMachineSummaryRows(filteredRecords, selectedMachine)
               .filter((row) => row.machine.toLowerCase().includes(machineSearch.trim().toLowerCase()));
            if (!machineRows.length) return;

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Machine Summary');
            const headers = ['Machine', 'Total Parts', 'OK Parts', 'NG Parts', 'In Progress', 'Pass Rate %'];
            const headerRow = worksheet.addRow(headers);
            headerRow.eachCell((cell) => {
               cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF25343F' } };
               cell.font = { color: { argb: 'FFEAEFEF' }, bold: true };
               cell.alignment = { vertical: 'middle', horizontal: 'center' };
               cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            machineRows.forEach((row, idx) => {
               const excelRow = worksheet.addRow([row.machine, row.total, row.ok, row.ng, row.in_progress, row.fpy]);
               excelRow.eachCell((cell, cellNumber) => {
                  if (cellNumber === 3) cell.font = { color: { argb: 'FF15803D' }, bold: true };
                  if (cellNumber === 4) cell.font = { color: { argb: 'FFB91C1C' }, bold: true };
                  if (cellNumber === 5) cell.font = { color: { argb: 'FFC2410C' }, bold: true };
                  cell.alignment = { vertical: 'middle', horizontal: 'center' };
                  cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
               });
               if (idx % 2 === 1) {
                  excelRow.eachCell((cell) => {
                     cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
                  });
               }
            });

            worksheet.columns = [
               { width: 26 },
               { width: 14 },
               { width: 14 },
               { width: 14 },
               { width: 14 },
               { width: 14 },
            ];

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `BMW_Gen6_Bawal_Machine_Summary_${selectedMachine?.title || 'All'}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
         } else if (activeTab === 'records') {
            const selectedMachine = getMachineOperation(appliedFilters?.machine || 'ALL');
            const fetchParams = selectedMachine ? getMachineScopedApiParams(appliedFilters) : getReportApiParams(appliedFilters);
            const res = await exportRecords(fetchParams);
            if (!res || !res.records || res.records.length === 0) return;

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Traceability Data');
            
            const headerKeys = getOrderedExportKeys(res.records[0]);
            const filteredRecords = filterMachineScopedRecordsByResult(res.records, appliedFilters, selectedMachine);
            if (!filteredRecords.length) return;
            const displayHeaders = headerKeys.map((k) => getExportHeaderLabel(k));
            const resultHeader = selectedMachine ? `${selectedMachine.title} Result` : 'Overall Result';
            
            // Add Header Row
            const headerRow = worksheet.addRow([...displayHeaders, resultHeader]);
            headerRow.eachCell((cell) => {
               cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF25343F' } };
               cell.font = { color: { argb: 'FFEAEFEF' }, bold: true };
               cell.alignment = { vertical: 'middle', horizontal: 'center' };
               cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            });
            
            // Add Data Rows
            filteredRecords.forEach((r, idx) => {
               const row = worksheet.addRow([
                  ...headerKeys.map((k) => getDisplayValue(r[k])),
                  getMachineScopedRecordResult(r, selectedMachine),
               ]);
               row.eachCell((cell) => {
                  const val = String(cell.value).toUpperCase();
                  if (val === 'OK' || val === 'PASS' || val === 'CLOSED') {
                     cell.font = { color: { argb: 'FF15803D' }, bold: true };
                  } else if (val === 'NG' || val === 'NOK' || val === 'FAIL' || val === 'ACTIVE') {
                     cell.font = { color: { argb: 'FFB91C1C' }, bold: true };
                  } else if (val === 'IN PROGRESS') {
                     cell.font = { color: { argb: 'FFC2410C' }, bold: true };
                  }
                  cell.alignment = { vertical: 'middle', horizontal: 'center' };
                  cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
               });
               
               // Subtle alternating row highlighting
               if (idx % 2 === 1) {
                  row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }; });
               }
            });
            
            // Format column widths intelligently
            worksheet.columns.forEach(col => { col.width = 16; });
            
            // Output Blob
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'BMW_Gen6_Bawal_Traceability.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);
         } else {
            setExportNotice({
               title: 'Export Notice',
               message: "Excel export is available from the 'By Machine' and 'All Records' tabs only.",
            });
         }
      } catch (e) { console.error(e); }
   };

   const handleDownloadPdf = async () => {
      try {
         if (activeTab === 'machine') {
            const selectedMachine = getMachineOperation(appliedFilters?.machine || 'ALL');
            const fetchParams = selectedMachine ? getMachineScopedApiParams(appliedFilters) : getReportApiParams(appliedFilters);
            const res = await exportRecords(fetchParams);
            const filteredRecords = filterMachineScopedRecordsByResult(Array.isArray(res?.records) ? res.records : [], appliedFilters, selectedMachine);
            const machineRows = buildMachineSummaryRows(filteredRecords, selectedMachine)
               .filter((row) => row.machine.toLowerCase().includes(machineSearch.trim().toLowerCase()));
            if (!machineRows.length) return;

            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            doc.setFillColor(20, 30, 48);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('BMW Gen-6 Bawal - Machine Summary Report', 12, 12);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(180, 190, 210);
            doc.text(`Machine: ${selectedMachine?.title || 'All Machines'} | Period: ${getDisplayValue(appliedFilters?.startDate)} to ${getDisplayValue(appliedFilters?.endDate)}`, 12, 20);

            autoTable(doc, {
               startY: 34,
               head: [['Machine', 'Total Parts', 'OK Parts', 'NG Parts', 'In Progress', 'Pass Rate %']],
               body: machineRows.map((row) => [row.machine, row.total, row.ok, row.ng, row.in_progress, row.fpy]),
               styles: { fontSize: 9, cellPadding: 2, halign: 'center', valign: 'middle' },
               headStyles: { fillColor: [30, 42, 65] },
               didParseCell: (hook) => {
                  if (hook.section !== 'body') return;
                  if (hook.column.index === 2) hook.cell.styles.textColor = [21, 128, 61];
                  if (hook.column.index === 3) hook.cell.styles.textColor = [185, 28, 28];
                  if (hook.column.index === 4) hook.cell.styles.textColor = [194, 65, 12];
               },
            });

            doc.save(`BMW_Gen6_Bawal_Machine_Summary_${selectedMachine?.title || 'All'}.pdf`);
         } else if (activeTab === 'records') {
            const selectedMachine = getMachineOperation(appliedFilters?.machine || 'ALL');
            const fetchParams = selectedMachine ? getMachineScopedApiParams(appliedFilters) : getReportApiParams(appliedFilters);
            const res = await exportRecords(fetchParams);
            if (!res || !res.records || res.records.length === 0) return;

            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = { left: 10, right: 10, top: 10, bottom: 15 };
            const usableWidth = pageWidth - margin.left - margin.right;

            // ─── Report Header ───
            doc.setFillColor(20, 30, 48);
            doc.rect(0, 0, pageWidth, 30, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('BMW Gen-6 Bawal - Production Traceability Report', margin.left + 2, 12);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(180, 190, 210);
            const filteredRecords = filterMachineScopedRecordsByResult(res.records, appliedFilters, selectedMachine);
            if (!filteredRecords.length) return;
            const dateRange = appliedFilters
              ? `${getDisplayValue(appliedFilters.startDate)} to ${getDisplayValue(appliedFilters.endDate)}`
              : '';
            doc.text(`Period: ${dateRange}  |  Generated: ${new Date().toLocaleString()}  |  Records: ${filteredRecords.length}`, margin.left + 2, 19);
            doc.text(`Shift: ${appliedFilters?.shift || 'ALL'}  |  Result: ${appliedFilters?.result || 'ALL'}  |  Variant: ${appliedFilters?.variant || 'ALL'}  |  Machine: ${selectedMachine?.title || 'Overall'}`, margin.left + 2, 25);

            // ─── Build table columns ───
            const keys = [...getOrderedExportKeys(res.records[0]), '__machine_result__'];

            // Short display headers
            const displayHeaders = keys.map(k => {
               if (k === '__machine_result__') return selectedMachine ? `${selectedMachine.title} Result` : 'Overall Result';
               return getExportHeaderLabel(k);
            });

            // Data rows
            const tableData = filteredRecords.map(r =>
               keys.map(k => {
                  if (k === '__machine_result__') return getMachineScopedRecordResult(r, selectedMachine);
                  if (k === 'Date_Time') return formatDateDisplay(r[k]);
                  return String(getDisplayValue(r[k]));
               })
            );

            // Allow JsPDF AutoTable to dynamically calculate safe widths
            // to entirely prevent horizontal overflow across vast datasets.

            // ─── Generate table ───
            autoTable(doc, {
               head: [displayHeaders],
               body: tableData,
               startY: 34,

               styles: {
                  fontSize: 5,
                  cellPadding: 1,
                  overflow: 'linebreak',
                  halign: 'center',
                  valign: 'middle',
                  lineWidth: 0.1,
                  lineColor: [50, 60, 80],
               },

               headStyles: {
                  fillColor: [30, 42, 65],
                  textColor: [200, 215, 240],
                  fontSize: 5,
                  fontStyle: 'bold',
                  halign: 'center',
               },

               alternateRowStyles: {
                  fillColor: [15, 22, 38],
               },

               bodyStyles: {
                  textColor: [220, 230, 245],
                  fillColor: [10, 18, 32],
               },

               margin: { left: 5, right: 5, top: 10, bottom: 15 },
               horizontalPageBreak: true,

               didParseCell: (data) => {
                  if (data.section === 'body') {
                     const val = String(data.cell.raw).toUpperCase();
                     if (val === 'OK' || val === 'PASS' || val === 'CLOSED') {
                        data.cell.styles.textColor = [21, 128, 61];
                        data.cell.styles.fontStyle = 'bold';
                     } else if (val === 'NG' || val === 'NOK' || val === 'FAIL' || val === 'ACTIVE') {
                        data.cell.styles.textColor = [185, 28, 28];
                        data.cell.styles.fontStyle = 'bold';
                     } else if (val === 'IN PROGRESS') {
                        data.cell.styles.textColor = [194, 65, 12];
                        data.cell.styles.fontStyle = 'bold';
                     }
                  }
               },

               didDrawPage: (pageData) => {
                  // Footer with page number
                  const totalPages = doc.internal.getNumberOfPages();
                  doc.setFontSize(8);
                  doc.setTextColor(130, 140, 160);
                  doc.text(
                     `Page ${pageData.pageNumber} of ${totalPages}`,
                     margin.left,
                     pageHeight - 8
                  );
                  doc.text(
                     'Traceability Report — Confidential',
                     pageWidth - margin.right - 50,
                     pageHeight - 8
                  );
               },
            });

            // Fix total page count in all pages
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
               doc.setPage(i);
               doc.setFontSize(8);
               doc.setTextColor(130, 140, 160);
               // Clear previous page text and redraw
               doc.setFillColor(255, 255, 255);
               doc.rect(margin.left - 1, pageHeight - 12, 60, 8, 'F');
               doc.text(
                  `Page ${i} of ${totalPages}`,
                  margin.left,
                  pageHeight - 8
               );
            }

            doc.save('BMW_Gen6_Bawal_Traceability.pdf');

         } else {
            setExportNotice({
               title: 'Export Notice',
               message: "PDF export is available from the 'By Machine' and 'All Records' tabs only.",
            });
         }
      } catch (e) {
         console.error('[PDF Export Error]:', e);
      }
   };

   const TABS = [
      { id: 'summary', label: 'Summary' },
      { id: 'shift', label: 'By Shift' },
      { id: 'station', label: 'By Station' },
      { id: 'hourly', label: 'Hourly' },
      { id: 'machine', label: 'By Machine' },
      { id: 'records', label: 'All Records' },
   ];

   const pieData = data.summary ? [
      { name: 'Passed', value: data.summary.ok, color: 'var(--ok)' },
      { name: 'Failed', value: data.summary.ng, color: 'var(--ng)' },
      { name: 'In Progress', value: data.summary.in_progress, color: 'var(--warn)' },
   ].filter(d => d.value > 0) : [];

   const visibleRecords = data.records.records;
   const filteredMachineSummary = useMemo(() => {
      const query = machineSearch.trim().toLowerCase();
      if (!query) return data.machineSummary;
      return data.machineSummary.filter((row) => row.machine.toLowerCase().includes(query));
   }, [data.machineSummary, machineSearch]);

   const getGroupedValue = (row, column) => {
      const candidateKeys = [column.key, ...(column.fallbackKeys || [])];
      for (const candidateKey of candidateKeys) {
         if (row[candidateKey] !== null && row[candidateKey] !== undefined && String(row[candidateKey]).trim() !== '') {
            return row[candidateKey];
         }
      }

      if (column.parentKey && row[column.parentKey] !== null && row[column.parentKey] !== undefined && String(row[column.parentKey]).trim() !== '') {
         return row[column.parentKey];
      }

      return EMPTY_CELL;
   };

   return (
      <div className="space-y-5 animate-in fade-in duration-400">
         <ExportNoticeModal notice={exportNotice} onClose={() => setExportNotice(null)} />
         {/* Page Title */}
         <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--primary-dim)] border border-[var(--primary)]/20">
               <FileText size={20} className="text-[var(--primary)]" />
            </div>
            <div className="min-w-0">
               <h1 className="text-xl font-bold tracking-tight text-[var(--text-main)]">Analysis Report</h1>
               <p className="text-[12px] text-[var(--text-muted)]">Production data analysis & insights{appliedMachine ? ` for ${appliedMachine.title}` : ''}</p>
            </div>
         </div>

         <FilterBar filters={filters} setFilters={setFilters} onApply={handleApply} onDownloadCsv={handleDownload} onDownloadPdf={handleDownloadPdf} />

         {/* Tabs */}
         <div className="flex bg-[var(--surface)] border border-[var(--border)] rounded-xl p-1 gap-1 overflow-x-auto custom-scrollbar">
            {TABS.map(t => (
               <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2.5 text-[12px] font-semibold rounded-lg transition-all whitespace-nowrap flex-none sm:flex-1 lg:flex-none ${activeTab === t.id
                     ? 'bg-[var(--primary-dim)] text-[var(--primary)] border border-[var(--primary)]/20'
                     : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/[0.03] border border-transparent'
                  }`}
               >
                  {t.label}
               </button>
            ))}
         </div>

         {/* Content */}
         <div className={`transition-opacity duration-300 ${loading ? 'opacity-50 blur-[1px]' : 'opacity-100'}`}>
            {activeTab === 'summary' && data.summary && (
               <div className="space-y-5 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                     <KpiCard label="Total Scanned" value={data.summary.total} color="primary" />
                     <KpiCard label="Passed (OK)" value={data.summary.ok} color="ok" />
                     <KpiCard label="Failed (NG)" value={data.summary.ng} color="ng" />
                     <KpiCard label="In Progress" value={data.summary.in_progress} color="warn" />
                     <KpiCard label="Pass Rate %" value={`${data.summary.fpy}%`} color="ok" />
                  </div>
                  <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5">
                     {/* Pie Chart */}
                     <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5 h-80 flex flex-col hover:border-[var(--border-light)] transition-colors">
                        <h3 className="text-[12px] font-semibold mb-3 text-[var(--text-muted)] uppercase tracking-wider">Result Distribution</h3>
                        <div className="flex-1 relative">
                           <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                 <Pie
                                    data={pieData}
                                    cx="50%" cy="50%"
                                    innerRadius={62}
                                    outerRadius={96}
                                    dataKey="value"
                                    stroke="none"
                                    paddingAngle={3}
                                 >
                                    {pieData.map((entry, index) => (
                                       <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                 </Pie>
                                 <Tooltip content={<PieTooltip />} />
                              </PieChart>
                           </ResponsiveContainer>
                           <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                              <span className="text-3xl font-black font-mono text-white">{data.summary.fpy}%</span>
                              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mt-1">Pass Rate</span>
                           </div>
                        </div>
                        <div className="flex justify-center gap-5 mt-2">
                           {[{ c: 'var(--ok)', l: 'Passed' }, { c: 'var(--ng)', l: 'Failed' }, { c: 'var(--warn)', l: 'Progress' }].map(item => (
                              <div key={item.l} className="flex items-center gap-1.5">
                                 <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.c }} />
                                 <span className="text-[11px] text-[var(--text-muted)]">{item.l}</span>
                              </div>
                           ))}
                        </div>
                     </div>

                     {/* Bar Chart */}
                     <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5 h-80 flex flex-col hover:border-[var(--border-light)] transition-colors">
                        <h3 className="text-[12px] font-semibold mb-3 text-[var(--text-muted)] uppercase tracking-wider">Shift Output</h3>
                        <div className="flex-1">
                           <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={data.shifts} margin={{ top: 5, right: 0, left: -20, bottom: 0 }} layout="vertical">
                                 <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                                 <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                 <YAxis dataKey="shift" type="category" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                 <Tooltip content={<BarTooltip />} />
                                 <Bar dataKey="ok" name="Passed" fill="var(--ok)" stackId="a" radius={[0, 0, 0, 0]} />
                                 <Bar dataKey="ng" name="Failed" fill="var(--ng)" stackId="a" radius={[0, 0, 0, 0]} />
                                 <Bar dataKey="in_progress" name="In Progress" fill="var(--warn)" stackId="a" radius={[0, 2, 2, 0]} />
                              </BarChart>
                           </ResponsiveContainer>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {activeTab === 'shift' && (
               <div className="space-y-5 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5 h-80 flex flex-col hover:border-[var(--border-light)] transition-colors">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.shifts} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                           <XAxis dataKey="shift" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                           <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                           <Tooltip content={<BarTooltip />} />
                           <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
                           <Bar dataKey="ok" name="Passed" fill="var(--ok)" stackId="a" radius={[0, 0, 0, 0]} barSize={40} />
                           <Bar dataKey="in_progress" name="In Progress" fill="var(--warn)" stackId="a" barSize={40} />
                           <Bar dataKey="ng" name="Failed" fill="var(--ng)" stackId="a" radius={[2, 2, 0, 0]} barSize={40} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-x-auto hover:border-[var(--border-light)] transition-colors">
                     <table className="report-table">
                        <thead>
                           <tr><th>Shift</th><th>Total</th><th>Passed</th><th>Failed</th><th>In Progress</th><th>Pass Rate</th></tr>
                        </thead>
                        <tbody>
                           {data.shifts.map(s => (
                              <tr key={s.shift}>
                                 <td><ShiftBadge shift={s.shift} /></td>
                                 <td className="font-mono">{s.total}</td>
                                 <td className="font-mono text-[var(--ok)]">{s.ok}</td>
                                 <td className="font-mono text-[var(--ng)]">{s.ng}</td>
                                 <td className="font-mono text-[var(--warn)]">{s.in_progress}</td>
                                 <td className="font-mono text-[var(--ok)] font-bold">{s.fpy}%</td>
                              </tr>
                           ))}
                           {data.shifts.length === 0 && <tr><td colSpan="6" className="text-center text-[var(--text-muted)] py-8">No data for selected filters</td></tr>}
                        </tbody>
                     </table>
                  </div>
               </div>
            )}

            {activeTab === 'station' && (
               <div className="space-y-5 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5 h-[420px] sm:h-[500px] flex flex-col hover:border-[var(--border-light)] transition-colors">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={orderedStationData} margin={{ top: 5, right: 30, left: 30, bottom: 0 }} layout="vertical">
                           <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                           <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                           <YAxis dataKey="id" type="category" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} width={220} tickFormatter={(v) => orderedStationData.find((item) => item.id === v)?.station || STATION_MAP[v] || v} />
                           <Tooltip content={<BarTooltip />} />
                           <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
                           <Bar dataKey="ok" name="OK" fill="var(--ok)" stackId="station" radius={[0, 0, 0, 0]} barSize={16} />
                           <Bar dataKey="ng" name="NG" fill="var(--ng)" stackId="station" radius={[0, 4, 4, 0]} barSize={16} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-x-auto hover:border-[var(--border-light)] transition-colors">
                     <table className="report-table min-w-[600px]">
                        <thead>
                           <tr><th>Station</th><th>Total Reached</th><th>Passed</th><th>Failed</th><th>In Progress</th><th>Pass Rate</th></tr>
                        </thead>
                        <tbody>
                           {orderedStationData.map(s => (
                              <tr key={s.id}>
                                 <td className="font-semibold tracking-wide">{s.station}</td>
                                 <td className="font-mono">{s.total}</td>
                                 <td className="font-mono text-[var(--ok)]">{s.ok}</td>
                                 <td className="font-mono text-[var(--ng)]">{s.ng}</td>
                                 <td className="font-mono text-[var(--warn)]">{s.in_progress}</td>
                                 <td className="font-mono text-[var(--ok)] font-bold">{s.fpy}%</td>
                              </tr>
                           ))}
                           {orderedStationData.length === 0 && <tr><td colSpan="6" className="text-center text-[var(--text-muted)] py-8">No data for selected filters</td></tr>}
                        </tbody>
                     </table>
                  </div>
               </div>
            )}

            {activeTab === 'hourly' && (
               <div className="space-y-5 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5 h-[320px] sm:h-[400px] flex flex-col hover:border-[var(--border-light)] transition-colors">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.hourly} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                           <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={h => `${h}:00`} />
                           <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                           <Tooltip content={<BarTooltip />} />
                           <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
                           <Area type="monotone" dataKey="ok" name="OK" stroke="var(--ok)" fill="var(--ok)" fillOpacity={0.15} strokeWidth={2} />
                           <Area type="monotone" dataKey="ng" name="NG" stroke="var(--ng)" fill="var(--ng)" fillOpacity={0.1} strokeWidth={2} />
                           <Area type="monotone" dataKey="in_progress" name="In Progress" stroke="var(--warn)" fill="var(--warn)" fillOpacity={0.08} strokeWidth={2} />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-x-auto hover:border-[var(--border-light)] transition-colors">
                     <table className="report-table">
                        <thead>
                           <tr><th>Hour</th><th>Total</th><th>Passed</th><th>Failed</th><th>In Progress</th></tr>
                        </thead>
                        <tbody>
                           {data.hourly.map((h, idx) => (
                              <tr key={idx}>
                                 <td className="font-mono font-semibold">{h.hour}:00</td>
                                 <td className="font-mono">{h.total}</td>
                                 <td className="font-mono text-[var(--ok)]">{h.ok}</td>
                                 <td className="font-mono text-[var(--ng)]">{h.ng}</td>
                                 <td className="font-mono text-[var(--warn)]">{h.in_progress}</td>
                              </tr>
                           ))}
                           {data.hourly.length === 0 && <tr><td colSpan="5" className="text-center text-[var(--text-muted)] py-8">No data for selected filters</td></tr>}
                        </tbody>
                     </table>
                  </div>
               </div>
            )}

            {activeTab === 'machine' && (
               <div className="space-y-5 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                     <KpiCard label="Machines Visible" value={filteredMachineSummary.length} color="primary" />
                     <KpiCard label="Total OK Parts" value={filteredMachineSummary.reduce((sum, row) => sum + row.ok, 0)} color="ok" />
                     <KpiCard label="Total NG Parts" value={filteredMachineSummary.reduce((sum, row) => sum + row.ng, 0)} color="ng" />
                     <KpiCard label="Total Parts" value={filteredMachineSummary.reduce((sum, row) => sum + row.total, 0)} color="warn" />
                  </div>

                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--border-light)] transition-colors">
                     <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 text-[var(--text-muted)]">
                           <Factory size={14} />
                           <span className="text-[12px] font-semibold uppercase tracking-wider">Machine Wise Summary</span>
                        </div>
                        <div className="relative w-full sm:w-[320px]">
                           <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                           <input
                              type="text"
                              value={machineSearch}
                              onChange={(e) => setMachineSearch(e.target.value)}
                              placeholder="Search machine name"
                              className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] py-2 pl-9 pr-3 text-[12px] text-[var(--text-main)] outline-none transition-colors focus:border-[var(--primary)]"
                           />
                        </div>
                     </div>

                     <div className="overflow-x-auto custom-scrollbar">
                        <table className="report-table min-w-[760px]">
                           <thead>
                              <tr>
                                 <th>Machine</th>
                                 <th>Total Parts</th>
                                 <th>OK Parts</th>
                                 <th>NG Parts</th>
                                 <th>In Progress</th>
                                 <th>Pass Rate</th>
                              </tr>
                           </thead>
                           <tbody>
                              {filteredMachineSummary.map((row) => (
                                 <tr key={row.id}>
                                    <td className="font-semibold tracking-wide">{row.machine}</td>
                                    <td className="font-mono">{row.total}</td>
                                    <td className="font-mono text-[var(--ok)]">{row.ok}</td>
                                    <td className="font-mono text-[var(--ng)]">{row.ng}</td>
                                    <td className="font-mono text-[var(--warn)]">{row.in_progress}</td>
                                    <td className="font-mono text-[var(--primary)] font-bold">{row.fpy}%</td>
                                 </tr>
                              ))}
                              {filteredMachineSummary.length === 0 && (
                                 <tr>
                                    <td colSpan="6" className="text-center text-[var(--text-muted)] py-8">
                                       No machine report found for current filters.
                                    </td>
                                 </tr>
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>
            )}

            {activeTab === 'records' && (
               <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--border-light)] transition-colors flex flex-col h-[620px] sm:h-[700px] lg:h-[calc(100vh-250px)] animate-in slide-in-from-bottom-2 duration-300">
                  <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)] flex flex-col items-stretch gap-3 shrink-0 lg:flex-row lg:items-center">
                     <div className="flex items-center gap-2 text-[var(--text-muted)] shrink-0">
                        <Search size={14} />
                        <span className="text-[12px] font-semibold uppercase tracking-wider">Part ID Search</span>
                     </div>
                     <div className="flex flex-col items-stretch gap-2 flex-1 min-w-0 sm:flex-row sm:items-center sm:min-w-[240px]">
                        <input
                           type="text"
                           value={filters.search || ''}
                           placeholder="Search by part id / barcode"
                           onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                           onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRecordSearchApply();
                           }}
                           className="bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12px] outline-none focus:border-[var(--primary)] text-[var(--text)] transition-colors w-full font-mono"
                        />
                        <button
                           onClick={handleRecordSearchApply}
                           className="bg-[var(--primary)] text-white hover:brightness-110 px-4 py-2 rounded-lg font-semibold text-[12px] transition-all shrink-0"
                        >
                           Search
                        </button>
                        {!!filters.search && (
                           <button
                              onClick={handleRecordSearchClear}
                              className="border border-[var(--border)] text-[var(--text)] bg-[var(--card)] hover:bg-[var(--card-hover)] px-4 py-2 rounded-lg font-semibold text-[12px] transition-all shrink-0"
                           >
                              Clear
                           </button>
                        )}
                     </div>
                     <div className="text-[12px] text-[var(--text-dim)] font-mono break-all lg:truncate lg:min-w-[180px]">
                        {appliedFilters?.search ? `Showing matches for: ${appliedFilters.search}` : 'Showing all part IDs'}
                     </div>
                  </div>
                  <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar relative">
                     <table className="w-full text-left border-collapse text-[12px] whitespace-nowrap min-w-max">
                        <thead className="sticky top-0 bg-[var(--surface)] z-20 border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                           <tr>
                              <th className="p-2.5 sticky left-0 bg-[var(--surface)] z-30 font-semibold">#</th>
                              <th className="p-2.5 sticky left-[50px] bg-[var(--surface)] z-30 font-semibold border-r border-[var(--border)]">Barcode</th>
                              <th className="p-2.5 pl-4 font-semibold">Date/Time</th>
                              <th className="p-2.5 font-semibold">Shift</th>
                              <th className="p-2.5 font-semibold">Category</th>
                              {REPORT_VISIBLE_STATIONS.flatMap((station) => {
                                 const groupedColumns = REPORT_GROUPED_STATION_COLUMNS[station.sourceKey];
                                 if (!groupedColumns) {
                                    return <th key={station.id} className="p-2.5 font-semibold">{station.label}</th>;
                                 }

                                 return groupedColumns.map((column, index) => (
                                    <th
                                       key={`${station.id}-${column.key}`}
                                       className={`p-2 text-[9px] font-semibold text-center ${index === 0 ? 'border-l border-[var(--border)]' : ''} ${index === groupedColumns.length - 1 ? 'border-r border-[var(--border)]' : ''}`}
                                    >
                                       {column.label}
                                    </th>
                                 ));
                              })}
                              <th className="p-2.5 sticky right-0 bg-[var(--surface)] z-30 border-l border-[var(--border)] font-semibold text-center pr-4">{appliedMachine?.title || 'Overall'}</th>
                           </tr>
                        </thead>
                        <tbody>
                           {visibleRecords.map((r, i) => {
                              const scopedResult = getMachineScopedRecordResult(r, appliedMachine);
                              const isFail = scopedResult === 'NG';
                              return (
                                 <tr key={r.SL_NO || i} className={`border-b border-[var(--border)]/50 hover:bg-[var(--card-hover)] transition-colors ${isFail ? 'bg-[var(--ng-bg)]/30' : i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                                    <td className="p-2.5 font-mono sticky left-0 z-10 text-[var(--text-muted)] bg-[var(--card)]">{r.SL_NO}</td>
                                    <td className="p-2.5 font-mono font-bold sticky left-[50px] z-10 pr-4 border-r border-[var(--border)] bg-[var(--card)]">{getDisplayValue(r.Barcode)}</td>
                                    <td className="p-2.5 font-mono pl-4">{formatDateDisplay(r.Date_Time)}</td>
                                    <td className="p-2.5"><ShiftBadge shift={r.Shift} /></td>
                                    <td className="p-2.5"><CategoryBadge barcode={r.Barcode} /></td>
                                    {REPORT_VISIBLE_STATIONS.flatMap((station) => {
                                       const groupedColumns = REPORT_GROUPED_STATION_COLUMNS[station.sourceKey];
                                         if (!groupedColumns) {
                                            return (
                                               <td key={station.id} className="p-2.5 align-top">
                                                <TableResultCell value={r[station.sourceKey]} />
                                               </td>
                                            );
                                         }

                                       return groupedColumns.map((column, index) => {
                                          const valueText = String(getGroupedValue(r, column));
                                          const tone = getSubValueTone(valueText, column.key);
                                          return (
                                             <td
                                                key={`${station.id}-${column.key}`}
                                                className={`p-2.5 text-center align-middle min-w-[92px] ${index === 0 ? 'border-l border-[var(--border)]' : ''} ${index === groupedColumns.length - 1 ? 'border-r border-[var(--border)]' : ''}`}
                                             >
                                                <div className={`rounded-lg px-2.5 py-2 ${tone.wrapper}`}>
                                                   <span className={`font-mono text-[11px] font-semibold ${tone.value}`}>{valueText}</span>
                                                </div>
                                             </td>
                                          );
                                       });
                                     })}
                                     <td className="p-2.5 sticky right-0 z-10 border-l border-[var(--border)] pr-4 bg-[var(--card)] text-center">
                                       <TableResultCell value={scopedResult} />
                                     </td>
                                  </tr>
                               );
                           })}
                           {visibleRecords.length === 0 && (
                              <tr><td colSpan={5 + REPORT_VISIBLE_STATIONS.reduce((total, station) => total + (REPORT_GROUPED_STATION_COLUMNS[station.sourceKey]?.length || 1), 0) + 1} className="p-12 text-center text-[var(--text-muted)]">{appliedFilters?.search ? 'Part not found' : 'No records found for current filters.'}</td></tr>
                           )}
                        </tbody>
                     </table>
                  </div>

                  {/* Pagination */}
                  <div className="p-3 border-t border-[var(--border)] bg-[var(--surface)] flex flex-col gap-3 text-[12px] shrink-0 sm:flex-row sm:justify-between sm:items-center">
                     <div className="text-[var(--text-muted)]">
                        Page <span className="font-bold text-[var(--text)]">{data.records.page}</span> of <span className="font-bold text-[var(--text)]">{data.records.totalPages || 1}</span>
                        <span className="ml-2 text-[var(--text-dim)]">({data.records.total} records)</span>
                     </div>
                     <div className="flex gap-1.5">
                        <button
                           disabled={data.records.page <= 1}
                           onClick={() => handlePageChange(data.records.page - 1)}
                           className="p-1.5 border border-[var(--border)] rounded-lg hover:bg-[var(--card-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-[var(--text)] bg-[var(--card)]"
                        >
                           <ChevronLeft size={16} />
                        </button>
                        <button
                           disabled={data.records.page >= data.records.totalPages || data.records.totalPages === 0}
                           onClick={() => handlePageChange(data.records.page + 1)}
                           className="p-1.5 border border-[var(--border)] rounded-lg hover:bg-[var(--card-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-[var(--text)] bg-[var(--card)]"
                        >
                           <ChevronRight size={16} />
                        </button>
                     </div>
                  </div>
               </div>
            )}
         </div>
      </div>
   );
};
export default ReportPage;
