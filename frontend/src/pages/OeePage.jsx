import React, { useState, useEffect } from 'react';
import { getOee, getDateRange } from '../api';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CustomTooltip } from './DashboardPage';
import { Target } from 'lucide-react';

const Gauge = ({ value, label, color, size = 180, strokeWidth = 12 }) => {
   const radius = (size - strokeWidth) / 2;
   const circumference = radius * 2 * Math.PI;
   const offset = circumference - (value / 100) * circumference;

   return (
      <div className="flex flex-col items-center">
         <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
               <circle
                  cx={size / 2} cy={size / 2} r={radius}
                  stroke="var(--bg)" strokeWidth={strokeWidth} fill="transparent"
               />
               <circle
                  cx={size / 2} cy={size / 2} r={radius}
                  stroke={color} strokeWidth={strokeWidth} fill="transparent"
                  strokeDasharray={circumference} strokeDashoffset={offset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
               />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
               <span className="text-3xl font-bold font-mono" style={{ color }}>{value}%</span>
            </div>
         </div>
         <span className="mt-4 font-semibold text-[var(--text-muted)] tracking-wider uppercase text-[12px]">{label}</span>
      </div>
   );
};

const OeePage = () => {
   const [dateStr, setDateStr] = useState('');
   const [shift, setShift] = useState('ALL');
   const [data, setData] = useState(null);

   useEffect(() => {
      getDateRange().then(res => {
         if (res && res.max_date) setDateStr(res.max_date);
      });
   }, []);

   useEffect(() => {
      if (!dateStr) return;
      getOee({ startDate: dateStr, endDate: dateStr, shift: shift === 'ALL' ? undefined : shift }).then(setData);
   }, [dateStr, shift]);

   // Mock trend data for demonstration based on the current day's OEE
   const trendData = data ? Array.from({ length: 24 }).map((_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      oee: Math.max(0, Math.min(100, data.oee + (Math.random() * 10 - 5)))
   })) : [];

   return (
      <div className="space-y-6 animate-in fade-in duration-500">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
               <Target size={24} className="text-[var(--primary)]" />
               <h1 className="text-xl font-bold">Overall Equipment Effectiveness</h1>
            </div>
            <div className="flex gap-3">
               <input
                  type="date"
                  className="bg-[var(--input-bg)] border border-[var(--border)] rounded px-3 py-1.5 text-[13px] outline-none focus:border-[var(--primary)] text-[var(--text)]"
                  value={dateStr} onChange={e => setDateStr(e.target.value)} style={{ colorScheme: 'dark' }}
               />
               <select
                  className="bg-[var(--input-bg)] border border-[var(--border)] rounded px-3 py-1.5 text-[13px] outline-none focus:border-[var(--primary)] text-[var(--text)]"
                  value={shift} onChange={e => setShift(e.target.value)}
               >
                  <option value="ALL">All Shifts</option>
                  <option value="A">Shift A</option>
                  <option value="B">Shift B</option>
                  <option value="C">Shift C</option>
               </select>
            </div>
         </div>

         {data ? (
            <>
               {/* Top Gauges */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 flex items-center justify-center hover:border-[var(--border-focus)] transition-colors">
                     <Gauge value={data.availability} label="Availability" color="var(--primary)" size={140} strokeWidth={10} />
                  </div>
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 flex items-center justify-center hover:border-[var(--border-focus)] transition-colors">
                     <Gauge value={data.performance} label="Performance" color="var(--warn)" size={140} strokeWidth={10} />
                  </div>
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 flex items-center justify-center hover:border-[var(--border-focus)] transition-colors">
                     <Gauge value={data.quality} label="Quality" color="var(--ok)" size={140} strokeWidth={10} />
                  </div>
                  <div className="bg-[var(--card)] border-2 border-[var(--primary)] rounded-xl p-6 flex flex-col items-center justify-center bg-[var(--primary-dim)] relative overflow-hidden">
                     <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary-dim)] to-transparent pointer-events-none" />
                     <Gauge value={data.oee} label="Composite OEE" color="var(--primary)" size={180} strokeWidth={14} />
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 h-[400px] flex flex-col hover:border-[var(--border-focus)] transition-colors">
                     <h3 className="text-[14px] font-semibold mb-6 text-[var(--text-muted)] uppercase tracking-wider">OEE Trend</h3>
                     <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={trendData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                              <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                              <RechartsTooltip content={<CustomTooltip />} />
                              <Area type="monotone" dataKey="oee" name="OEE %" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.2} strokeWidth={2} />
                           </AreaChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--border-focus)] transition-colors">
                     <div className="p-4 border-b border-[var(--border)]">
                        <h3 className="text-[14px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Shift Metrics</h3>
                     </div>
                     <div className="p-0">
                        <table className="w-full text-left border-collapse">
                           <tbody className="text-[13px]">
                              <tr className="border-b border-[var(--border)] hover:bg-[var(--card-hover)]">
                                 <td className="p-4 text-[var(--text-muted)]">Target Output</td>
                                 <td className="p-4 font-mono font-bold text-right text-[var(--primary)]">{data.targetQty}</td>
                              </tr>
                              <tr className="border-b border-[var(--border)] hover:bg-[var(--card-hover)]">
                                 <td className="p-4 text-[var(--text-muted)]">Actual Output (OK)</td>
                                 <td className="p-4 font-mono font-bold text-right text-[var(--ok)]">{data.ok}</td>
                              </tr>
                              <tr className="border-b border-[var(--border)] hover:bg-[var(--card-hover)]">
                                 <td className="p-4 text-[var(--text-muted)]">Defects (NG)</td>
                                 <td className="p-4 font-mono font-bold text-right text-[var(--ng)]">{data.ng}</td>
                              </tr>
                              <tr className="border-b border-[var(--border)] hover:bg-[var(--card-hover)] text-[var(--ok)] bg-[var(--ok-bg)]">
                                 <td className="p-4 font-semibold">Quality %</td>
                                 <td className="p-4 font-mono font-bold text-right">{data.quality}%</td>
                              </tr>
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>
            </>
         ) : (
            <div className="h-64 flex items-center justify-center text-[var(--text-muted)]">Loading metrics...</div>
         )}
      </div>
   );
};
export default OeePage;
