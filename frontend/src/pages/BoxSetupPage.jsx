import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings, listBoxes } from '../api';
import QrCodeDisplay from '../components/QrCodeDisplay';
import { Settings as SettingsIcon, Package, CheckCircle, AlertCircle, Plus, RefreshCw, Trash2, Printer, Edit3, X } from 'lucide-react';

const StatCard = ({ label, value, color, icon }) => {
   const colors = {
      primary: { bg: 'from-[var(--primary-dim)]/40 to-transparent', border: 'border-[var(--primary-dim)]', text: 'text-[var(--primary)]' },
      ok: { bg: 'from-[var(--ok-bg)]/40 to-transparent', border: 'border-[var(--ok-border)]', text: 'text-[var(--ok)]' },
      warn: { bg: 'from-[var(--warn-bg)]/40 to-transparent', border: 'border-[var(--warn-border)]', text: 'text-[var(--warn)]' },
   };
   const c = colors[color] || colors.primary;
   return (
      <div className={`relative overflow-hidden bg-[var(--card)] border ${c.border} rounded-2xl p-5 flex flex-col gap-2 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5`}>
         <div className={`absolute inset-0 bg-gradient-to-br ${c.bg} pointer-events-none`} />
         <div className="flex items-center justify-between z-10">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.25em]">{label}</span>
            <span className={`${c.text} opacity-60`}>{icon}</span>
         </div>
         <div className={`text-4xl font-black font-mono ${c.text} z-10 leading-none`}>{value}</div>
      </div>
   );
};

// Format Configuration Modal Component
const FormatConfigModal = ({ isOpen, onClose, settings, onSave, isAdmin, saving }) => {
   const [localSettings, setLocalSettings] = useState(settings);
   const [localSaving, setLocalSaving] = useState(false);

   useEffect(() => {
      if (settings) {
         setLocalSettings(settings);
      }
   }, [settings]);

   const handleSubmit = async (e) => {
      e.preventDefault();
      if (!isAdmin) return;
      setLocalSaving(true);
      try {
         const { computedNextBox, ...dataToSave } = localSettings;
         await onSave(dataToSave);
         onClose();
      } catch (err) {
         console.error('Save failed:', err);
      } finally {
         setLocalSaving(false);
      }
   };

   if (!isOpen) return null;

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
         {/* Backdrop */}
         <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
         
         {/* Modal */}
         <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface)] rounded-t-2xl">
               <div className="flex items-center gap-2">
                  <SettingsIcon size={18} className="text-[var(--primary)]" />
                  <h2 className="text-[14px] font-bold text-white uppercase tracking-wider">Format Configuration</h2>
               </div>
               <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-all"
               >
                  <X size={18} />
               </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
               <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-[0.2em]">Box Number Prefix</label>
                  <input
                     disabled={!isAdmin}
                     required
                     type="text"
                     value={localSettings?.boxPrefix || ''}
                     onChange={e => setLocalSettings({ ...localSettings, boxPrefix: e.target.value })}
                     className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-[14px] font-mono font-bold text-white outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all disabled:opacity-40 placeholder-white/20"
                     placeholder="e.g. BOX"
                  />
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <div>
                     <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-[0.2em]">Separator</label>
                     <input
                        disabled={!isAdmin}
                        type="text"
                        value={localSettings?.boxSeparator || ''}
                        onChange={e => setLocalSettings({ ...localSettings, boxSeparator: e.target.value })}
                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-[14px] font-mono font-bold text-white outline-none focus:border-[var(--primary)] transition-all disabled:opacity-40"
                        placeholder="-"
                     />
                  </div>
                  <div>
                     <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-[0.2em]">Digits</label>
                     <input
                        disabled={!isAdmin}
                        required
                        type="number"
                        min="1"
                        value={localSettings?.serialPadding || 0}
                        onChange={e => setLocalSettings({ ...localSettings, serialPadding: parseInt(e.target.value) || 0 })}
                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-[14px] font-bold text-white outline-none focus:border-[var(--primary)] transition-all disabled:opacity-40"
                     />
                  </div>
               </div>

               <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-[0.2em]">Parts Per Box</label>
                  <input
                     disabled={!isAdmin}
                     required
                     type="number"
                     min="1"
                     value={localSettings?.defaultCapacity || 0}
                     onChange={e => setLocalSettings({ ...localSettings, defaultCapacity: parseInt(e.target.value) || 0 })}
                     className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-[14px] font-bold text-[var(--primary)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all disabled:opacity-40"
                  />
               </div>

               <div className="flex items-center gap-3 py-1">
                  <div
                     onClick={() => isAdmin && setLocalSettings({ ...localSettings, autoCreateNextBox: !localSettings?.autoCreateNextBox })}
                     className={`relative w-10 h-5 rounded-full transition-all cursor-pointer ${isAdmin ? '' : 'opacity-40 cursor-not-allowed'} ${localSettings?.autoCreateNextBox ? 'bg-[var(--primary)]' : 'bg-[var(--surface)] border border-[var(--border)]'}`}
                  >
                     <div className={`absolute top-0.5 w-4 h-4 rounded-full shadow-sm transition-all ${localSettings?.autoCreateNextBox ? 'left-5 bg-white' : 'left-0.5 bg-[var(--text-muted)]'}`} />
                  </div>
                  <span className="text-[12px] text-[var(--text-muted)] font-medium">Auto-create next box on fill</span>
               </div>

               {/* Next Box Preview */}
               <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Next Box</span>
                  <span className="font-mono font-black text-[var(--ok)] text-lg">{localSettings?.computedNextBox || '—'}</span>
               </div>

               {/* Action Buttons */}
               <div className="pt-2 flex gap-3">
                  <button
                     type="button"
                     onClick={onClose}
                     className="flex-1 bg-transparent hover:bg-white/5 border border-[var(--border)] text-[var(--text-muted)] hover:text-white py-3 rounded-xl font-bold transition-all"
                  >
                     Cancel
                  </button>
                  <button
                     type="submit"
                     disabled={!isAdmin || localSaving}
                     className="flex-1 bg-[var(--primary)] hover:opacity-90 active:scale-[0.98] text-white py-3 rounded-xl font-black uppercase tracking-[0.1em] transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                     {localSaving ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                     ) : (
                        <><SettingsIcon size={16} />Save Configuration</>
                     )}
                  </button>
               </div>
            </form>
         </div>
      </div>
   );
};

const BoxSetupPage = () => {
   const [settings, setSettings] = useState(null);
   const [boxes, setBoxes] = useState([]);
   const [saving, setSaving] = useState(false);
   const [selectedBox, setSelectedBox] = useState(null);
   const [toast, setToast] = useState(null);
   const [errorMsg, setErrorMsg] = useState(null);
   const [isModalOpen, setIsModalOpen] = useState(false);

   const user = JSON.parse(localStorage.getItem('tr_user') || '{}');
   const isAdmin = user.role === 'admin';

   const showToast = (msg, type = 'ok') => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 2500);
   };

   const loadData = async () => {
      try {
         setErrorMsg(null);
         const [sets, bx] = await Promise.all([getSettings(), listBoxes()]);
         setSettings(sets || {});
         setBoxes(bx || []);
      } catch (e) {
         console.error(e);
         setErrorMsg('Failed to connect to server and load configuration. Make sure database is initialised.');
      }
   };

   useEffect(() => { loadData(); }, []);

   const handleSave = async (dataToSave) => {
      if (!isAdmin) return;
      setSaving(true);
      try {
         await updateSettings(dataToSave);
         await loadData(); // Reload completely to get new computed box & box updates
         showToast('Configuration saved successfully');
      } catch (err) {
         showToast('Failed to save settings', 'ng');
         throw err;
      } finally {
         setSaving(false);
      }
   };

   const handleDeleteBox = async (id) => {
      if (!isAdmin) return;
      if (!window.confirm('Delete this box and all its packed items? This cannot be undone.')) return;
      try {
         const { deleteBox } = await import('../api');
         await deleteBox(id);
         if (selectedBox?.id === id) setSelectedBox(null);
         loadData();
         showToast('Box deleted successfully');
      } catch (e) {
         showToast('Failed to delete box', 'ng');
      }
   };

   const handleToggleStatus = async (box) => {
      if (!isAdmin) return;
      const newStatus = box.status === 'OPEN' ? 'CLOSED' : 'OPEN';
      try {
         const { updateBox } = await import('../api');
         await updateBox(box.id, { status: newStatus });
         loadData();
         showToast(`Box ${newStatus === 'CLOSED' ? 'closed' : 'reopened'}`);
      } catch (e) {
         showToast('Failed to update status', 'ng');
      }
   };

   const handleGenerateNextBox = async () => {
      if (!isAdmin) return;
      try {
         const { generateNextBox } = await import('../api');
         await generateNextBox();
         loadData();
         showToast('New box generated successfully');
      } catch (e) {
         showToast('Failed to generate box', 'ng');
      }
   };

   const handlePrintLabel = () => {
      window.print();
   };

   if (errorMsg) return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 animate-in fade-in">
         <AlertCircle size={40} className="text-[var(--ng)] opacity-60" />
         <p className="text-[12px] font-mono text-[var(--ng)] text-center max-w-sm">{errorMsg}</p>
         <button onClick={loadData} className="px-5 py-2 mt-2 bg-[var(--surface)] text-white border border-[var(--border)] rounded-lg hover:border-[var(--primary)]/50 transition-all font-bold text-xs">
           Retry Connection
         </button>
      </div>
   );

   if (!settings) return (
      <div className="flex items-center justify-center h-64">
         <div className="w-10 h-10 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
      </div>
   );

   const total = boxes.length;
   const open = boxes.filter(b => b.status === 'OPEN').length;
   const closed = boxes.filter(b => b.status === 'CLOSED').length;

   return (
      <div className="space-y-6 animate-in fade-in duration-500 relative">
         <style>{`
            @media print {
               body * { visibility: hidden !important; }
               .print-area, .print-area * { visibility: visible !important; }
               .print-area {
                  position: fixed !important; inset: 0 !important;
                  display: flex; align-items: center; justify-content: center;
                  background: white !important;
                  padding: 40px !important;
               }
            }
         `}</style>

         {/* Toast */}
         {toast && (
            <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-[13px] font-bold tracking-wide border flex items-center gap-2 animate-in slide-in-from-right duration-300
               ${toast.type === 'ng' ? 'bg-[var(--ng-bg)] border-[var(--ng-border)] text-[var(--ng)]' : 'bg-[var(--ok-bg)] border-[var(--ok-border)] text-[var(--ok)]'}`}>
               {toast.type === 'ng' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
               {toast.msg}
            </div>
         )}

         {/* Header */}
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="p-2.5 bg-[var(--primary-dim)] rounded-xl text-[var(--primary)] border border-[var(--primary-dim)] shadow-sm">
                  <Package size={22} />
               </div>
               <div>
                  <h1 className="text-xl font-black tracking-tight text-white">Box Configuration</h1>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono uppercase tracking-widest mt-0.5">Container Management & Ledger</p>
               </div>
            </div>
            <button onClick={loadData} className="p-2 text-[var(--text-muted)] hover:text-white hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-all" title="Refresh">
               <RefreshCw size={16} />
            </button>
         </div>

         {/* Stats row */}
         <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total Boxes" value={total} color="primary" icon={<Package size={18} />} />
            <StatCard label="Open / Active" value={open} color="warn" icon={<AlertCircle size={18} />} />
            <StatCard label="Closed / Done" value={closed} color="ok" icon={<CheckCircle size={18} />} />
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left: Settings Panel */}
            <div className="lg:col-span-1">
               <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-lg hover:border-[var(--border-focus)] transition-colors">
                  <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface)]">
                     <div className="flex items-center gap-2">
                        <SettingsIcon size={16} className="text-[var(--primary)]" />
                        <h2 className="text-[13px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Format Configuration</h2>
                     </div>
                     {isAdmin && (
                        <button
                           onClick={() => setIsModalOpen(true)}
                           className="p-1.5 rounded-lg bg-[var(--primary-dim)] hover:bg-[var(--primary)]/50 text-[var(--primary)] hover:text-white transition-all border border-[var(--primary-dim)] hover:border-[var(--primary)]"
                           title="Edit Format Configuration"
                        >
                           <Edit3 size={14} />
                        </button>
                     )}
                  </div>
                  
                  {/* Compact Preview */}
                  <div className="p-5 space-y-4">
                     <div className="flex items-center justify-between p-3 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Box Format</span>
                        <span className="font-mono font-black text-[var(--primary)] text-sm">
                           {settings.boxPrefix}{settings.boxSeparator}{'0'.repeat(settings.serialPadding)}
                        </span>
                     </div>
                     
                     <div className="flex items-center justify-between p-3 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Capacity</span>
                        <span className="font-mono font-bold text-[var(--ok)] text-sm">{settings.defaultCapacity} parts/box</span>
                     </div>
                     
                     <div className="flex items-center justify-between p-3 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Auto-create</span>
                        <span className={`text-[11px] font-bold ${settings.autoCreateNextBox ? 'text-[var(--ok)]' : 'text-[var(--text-muted)]'}`}>
                           {settings.autoCreateNextBox ? 'Enabled' : 'Disabled'}
                        </span>
                     </div>

                     <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl flex items-center justify-between mt-2">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Next Box</span>
                        <span className="font-mono font-black text-[var(--ok)] text-lg">{settings.computedNextBox || '—'}</span>
                     </div>

                     {isAdmin && (
                        <div className="pt-2">
                           <button
                              type="button"
                              onClick={handleGenerateNextBox}
                              className="w-full bg-[var(--primary)] hover:opacity-90 active:scale-[0.98] text-white py-3 rounded-xl font-black uppercase tracking-[0.1em] transition-all shadow-lg flex items-center justify-center gap-2"
                           >
                              <Plus size={18} /> Generate Next Box
                           </button>
                        </div>
                     )}
                  </div>
               </div>
            </div>

            {/* Right: Box Ledger */}
            <div className="lg:col-span-2 space-y-4">

               <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-lg hover:border-[var(--border-focus)] transition-colors">
                  <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--surface)]">
                     <h2 className="text-[13px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                        <Package size={14} /> Box Ledger
                     </h2>
                     <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--card)] border border-[var(--border)] px-3 py-1 rounded-full">{boxes.length} containers</span>
                  </div>
                  <div className="overflow-x-auto max-h-[420px] overflow-y-auto custom-scrollbar">
                     <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-[var(--surface)] z-10">
                           <tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                              <th className="p-3 pl-5 font-bold">ID</th>
                              <th className="p-3 font-bold">Box Number</th>
                              <th className="p-3 font-bold">Fill Progress</th>
                              <th className="p-3 font-bold">Status</th>
                              <th className="p-3 font-bold">Created</th>
                              <th className="p-3 pr-5 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                           {boxes.map(b => {
                              const pct = Math.round((b.packedCount / b.capacity) * 100);
                              const isSel = selectedBox?.id === b.id;
                              return (
                                 <tr
                                    key={b.id}
                                    onClick={() => setSelectedBox(isSel ? null : b)}
                                    className={`border-b border-[var(--border)] cursor-pointer transition-colors ${isSel ? 'bg-[var(--primary-dim)]/20 border-l-2 border-l-[var(--primary)]' : 'hover:bg-[var(--card-hover)]'}`}
                                 >
                                    <td className="p-3 pl-5 text-[var(--text-muted)] font-mono text-[12px]">{b.id}</td>
                                    <td className="p-3 font-mono font-bold text-[var(--primary)] text-[14px]">{b.boxNumber}</td>
                                    <td className="p-3" style={{ minWidth: 140 }}>
                                       <div className="flex items-center gap-2">
                                          <div className="flex-1 h-1.5 bg-[var(--surface)] rounded-full overflow-hidden border border-[var(--border)]">
                                             <div
                                                className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-[var(--ok)]' : 'bg-[var(--primary)]'}`}
                                                style={{ width: `${Math.min(pct, 100)}%` }}
                                             />
                                          </div>
                                          <span className="text-[11px] font-mono text-[var(--text-muted)] whitespace-nowrap">
                                             <span className={pct >= 100 ? 'text-[var(--ok)] font-bold' : ''}>{b.packedCount}</span>/{b.capacity}
                                          </span>
                                       </div>
                                    </td>
                                    <td className="p-3">
                                       {b.status === 'CLOSED'
                                          ? <span className="inline-flex items-center gap-1 text-[9px] font-black text-[var(--ok)] bg-[var(--ok-bg)]/20 border border-[var(--ok-border)]/30 px-2.5 py-1 rounded-full uppercase tracking-widest">
                                             <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)]" />Closed
                                          </span>
                                          : <span className="inline-flex items-center gap-1 text-[9px] font-black text-[var(--warn)] bg-[var(--warn-bg)]/20 border border-[var(--warn-border)]/30 px-2.5 py-1 rounded-full uppercase tracking-widest">
                                             <span className="w-1.5 h-1.5 rounded-full bg-[var(--warn)] animate-pulse" />Active
                                          </span>
                                       }
                                    </td>
                                    <td className="p-3 text-[10px] font-mono text-[var(--text-muted)]">{new Date(b.createdAt).toLocaleDateString()}</td>
                                    <td className="p-3 pr-5">
                                       <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                          <button title="Toggle Open/Closed" disabled={!isAdmin} onClick={() => handleToggleStatus(b)}
                                             className="p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all disabled:opacity-20">
                                             <RefreshCw size={13} />
                                          </button>
                                          <button title="Delete Box" disabled={!isAdmin} onClick={() => handleDeleteBox(b.id)}
                                             className="p-2 rounded-lg text-[var(--ng)] hover:bg-[var(--ng-bg)]/20 border border-transparent hover:border-[var(--ng-border)]/30 transition-all disabled:opacity-20">
                                             <Trash2 size={13} />
                                          </button>
                                       </div>
                                    </td>
                                 </tr>
                              );
                           })}
                           {boxes.length === 0 && (
                              <tr>
                                 <td colSpan="6" className="p-16 text-center">
                                    <div className="flex flex-col items-center gap-3 opacity-50">
                                       <Package size={32} className="text-[var(--text-muted)]" />
                                       <p className="text-[12px] font-mono text-[var(--text-muted)] uppercase tracking-widest">No boxes created yet</p>
                                    </div>
                                 </td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>

               {/* Selected Box QR Preview */}
               {selectedBox && (
                  <div className="print-area bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-lg animate-in slide-in-from-bottom-2 duration-300 hover:border-[var(--border-focus)] transition-colors">
                     <div className="flex gap-6 items-center">
                        <div className="shrink-0 bg-white rounded-xl p-3 shadow-inner">
                           <QrCodeDisplay dataUrl={selectedBox.qrCodeData} label={selectedBox.labelCode} size={130} />
                        </div>
                        <div className="flex-1 space-y-2">
                           <div>
                              <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-bold mb-1">Container ID</p>
                              <h3 className="text-2xl font-black font-mono text-[var(--primary)]">{selectedBox.boxNumber}</h3>
                           </div>
                           <div className="grid grid-cols-2 gap-4 mt-3">
                              <div>
                                 <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest mb-1">Label Code</p>
                                 <p className="font-mono text-[13px] text-white">{selectedBox.labelCode || '—'}</p>
                              </div>
                              <div>
                                 <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest mb-1">Capacity</p>
                                 <p className="font-mono font-bold text-[13px] text-white">{selectedBox.capacity} parts</p>
                              </div>
                              <div>
                                 <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest mb-1">Status</p>
                                 <p className={`font-bold text-[13px] ${selectedBox.status === 'CLOSED' ? 'text-[var(--ok)]' : 'text-[var(--warn)]'}`}>{selectedBox.status}</p>
                              </div>
                              {selectedBox.closedAt && (
                                 <div>
                                    <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest mb-1">Closed At</p>
                                    <p className="font-mono text-[12px] text-white/60">{new Date(selectedBox.closedAt).toLocaleString()}</p>
                                 </div>
                              )}
                           </div>
                        </div>
                        {selectedBox.status === 'CLOSED' && (
                           <div className="shrink-0 flex items-center justify-end">
                              <button
                                 onClick={handlePrintLabel}
                                 className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--primary-dim)] hover:bg-[var(--primary)] text-[var(--primary)] hover:text-white px-5 py-3 rounded-xl font-black text-xs transition-all uppercase tracking-widest"
                              >
                                 <Printer size={16} /> Print Label
                              </button>
                           </div>
                        )}
                     </div>
                  </div>
               )}
            </div>
         </div>

         {/* Format Configuration Modal */}
         <FormatConfigModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            settings={settings}
            onSave={handleSave}
            isAdmin={isAdmin}
            saving={saving}
         />
      </div>
   );
};

export default BoxSetupPage;