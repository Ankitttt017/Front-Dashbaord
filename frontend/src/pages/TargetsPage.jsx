import React, { useState, useEffect } from 'react';
import { getTargets, saveTarget, deleteTarget } from '../api';
import { Trash2, Edit2, Plus, Target } from 'lucide-react';

const TargetsPage = () => {
   const user = JSON.parse(localStorage.getItem('tr_user') || '{}');
   const isAdmin = user.role === 'admin';

   const [targets, setTargets] = useState([]);
   const [editing, setEditing] = useState(null);
   const [formData, setFormData] = useState({ targetDate: '', shift: 'ALL', stationNo: 'Overall', targetQty: 500, notes: '' });

   const fetchTargets = async () => {
      try {
         const data = await getTargets();
         setTargets(data);
      } catch (err) {
         console.error(err);
      }
   };

   useEffect(() => { fetchTargets(); }, []);

   const handleSubmit = async (e) => {
      if (!isAdmin) return;
      e.preventDefault();
      try {
         if (editing) {
            await saveTarget({ ...formData, id: editing.id });
         } else {
            await saveTarget(formData);
         }
         setEditing(null);
         setFormData({ targetDate: '', shift: 'ALL', stationNo: 'Overall', targetQty: 500, notes: '' });
         fetchTargets();
      } catch (err) {
         console.error(err);
      }
   };

   const handleEdit = (t) => {
      if (!isAdmin) return;
      setEditing(t);
      setFormData({
         targetDate: t.targetDate, shift: t.shift || 'ALL', stationNo: t.stationNo, targetQty: t.targetQty, notes: t.notes || ''
      });
   };

   const handleDelete = async (id) => {
      if (!window.confirm('Delete this target?')) return;
      try {
         await deleteTarget(id);
         fetchTargets();
      } catch (err) {
         console.error(err);
      }
   };

   return (
      <div className="space-y-6 animate-in fade-in duration-500">
         <div className="flex items-center gap-3 mb-6 relative">
            <Target size={24} className="text-[var(--primary)]" />
            <h1 className="text-xl font-bold">Production Targets</h1>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
               <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-focus)] transition-colors">
                  <h2 className="text-[14px] font-semibold mb-4 text-[var(--text-muted)] uppercase tracking-wider">
                     {editing ? 'Edit Target' : 'New Target'}
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1 uppercase">Date</label>
                        <input required type="date" value={formData.targetDate} onChange={e => setFormData({ ...formData, targetDate: e.target.value })} className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded px-3 py-2 text-[13px] outline-none focus:border-[var(--primary)] text-[var(--text)]" style={{ colorScheme: 'dark' }} />
                     </div>
                     <div>
                        <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1 uppercase">Shift Strategy</label>
                        <select disabled={!isAdmin} value={formData.shift} onChange={e => setFormData({ ...formData, shift: e.target.value })} className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded px-3 py-2 text-[13px] outline-none focus:border-[var(--primary)] text-[var(--text)] disabled:opacity-50">
                           <option value="ALL">Daily (All Shifts Combined)</option>
                           <option value="A">Shift A</option>
                           <option value="B">Shift B</option>
                           <option value="C">Shift C</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1 uppercase">Process Node</label>
                        <select disabled={!isAdmin} value={formData.stationNo} onChange={e => setFormData({ ...formData, stationNo: e.target.value })} className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded px-3 py-2 text-[13px] outline-none focus:border-[var(--primary)] text-[var(--text)] disabled:opacity-50">
                           <option value="Overall">Plant Wide Output</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1 uppercase">Target Qty (per day/shift)</label>
                        <input disabled={!isAdmin} required type="number" min="1" value={formData.targetQty} onChange={e => setFormData({ ...formData, targetQty: parseInt(e.target.value) })} className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded px-3 py-2 text-[13px] outline-none focus:border-[var(--primary)] text-[var(--text)] font-bold disabled:opacity-50" />
                     </div>
                     <div>
                        <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1 uppercase">Context / Notes</label>
                        <input disabled={!isAdmin} type="text" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded px-3 py-2 text-[13px] outline-none focus:border-[var(--primary)] text-[var(--text)] disabled:opacity-50" />
                     </div>
                     {isAdmin && (
                        <div className="pt-2 flex gap-2">
                           <button type="submit" className="flex-1 bg-[var(--primary)] text-white hover:opacity-90 py-2 rounded font-bold transition-opacity">
                              {editing ? 'Update Production Delta' : 'Establish Target'}
                           </button>
                           {editing && (
                              <button type="button" onClick={() => setEditing(null)} className="flex-1 bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--card-hover)] py-2 rounded font-medium transition-colors">
                                 Cancel
                              </button>
                           )}
                        </div>
                     )}
                  </form>
               </div>
            </div>

            <div className="lg:col-span-2">
               <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--border-focus)] transition-colors">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                           <tr className="bg-[var(--surface)] border-b border-[var(--border)] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                              <th className="p-3 font-semibold">Scheduled Date</th>
                              <th className="p-3 font-semibold">Shift Mapping</th>
                              <th className="p-3 font-semibold">Scope</th>
                              <th className="p-3 font-semibold text-center">Objective</th>
                              <th className="p-3 font-semibold">Notes</th>
                              {isAdmin && <th className="p-3 font-semibold text-right">Operations</th>}
                           </tr>
                        </thead>
                        <tbody className="text-[13px]">
                           {targets.map(t => (
                              <tr key={t.id} className="border-b border-[var(--border)] hover:bg-[var(--card-hover)] transition-colors">
                                 <td className="p-3 font-mono text-[var(--text)]">{t.targetDate}</td>
                                 <td className="p-3">
                                    {t.shift === 'ALL' ?
                                       <span className="text-[10px] font-bold text-[var(--primary)] bg-[var(--primary-dim)] px-2 py-0.5 rounded tracking-tighter">DAILY / COMBINED</span> :
                                       <span className="font-mono font-bold text-white/60">SHIFT {t.shift}</span>
                                    }
                                 </td>
                                 <td className="p-3 text-[var(--text-muted)] font-medium italic">{t.stationNo}</td>
                                 <td className="p-3 font-mono text-[var(--ok)] font-bold text-center text-lg">{t.targetQty}</td>
                                 <td className="p-3 text-[var(--text-muted)] text-[11px]">{t.notes || '—'}</td>
                                 {isAdmin && (
                                    <td className="p-3 text-right">
                                       <button onClick={() => handleEdit(t)} className="p-1.5 text-[var(--primary)] hover:bg-[var(--primary-dim)] rounded mr-1" title="Edit Entry"><Edit2 size={14} /></button>
                                       <button onClick={() => handleDelete(t.id)} className="p-1.5 text-[var(--ng)] hover:bg-[var(--ng-bg)] rounded" title="Remove Entry"><Trash2 size={14} /></button>
                                    </td>
                                 )}
                              </tr>
                           ))}
                           {targets.length === 0 && (
                              <tr>
                                 <td colSpan={isAdmin ? 6 : 5} className="p-16 text-center text-[var(--text-muted)] font-mono tracking-widest opacity-50 italic">PRODUCTION LEDGER EMPTY</td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};
export default TargetsPage;
