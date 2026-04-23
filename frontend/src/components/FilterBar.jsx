import React from 'react';
import { Download, Filter } from 'lucide-react';
import { VARIANT_OPTIONS } from '../constants/variants';
import { MACHINE_FILTER_OPTIONS } from '../constants/machineOperations';

const FilterBar = ({ filters, setFilters, onApply, onDownloadCsv, onDownloadPdf }) => {
    const categories = VARIANT_OPTIONS;

    const inputClass = 'bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 text-[var(--text)] transition-colors w-full placeholder:text-[var(--text-dim)]';
    const dateInputStyle = { colorScheme: 'dark' };

    return (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sticky top-[56px] z-30 shadow-lg shadow-black/30">
            <div className="flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1.5 flex-1 min-w-[120px]">
                    <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">From Date</label>
                    <input
                        type="date"
                        className={`${inputClass} font-mono`}
                        value={filters.startDate || ''}
                        onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                        style={dateInputStyle}
                    />
                </div>
                <div className="flex flex-col gap-1.5 flex-1 min-w-[120px]">
                    <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">To Date</label>
                    <input
                        type="date"
                        className={`${inputClass} font-mono`}
                        value={filters.endDate || ''}
                        onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                        style={dateInputStyle}
                    />
                </div>
                <div className="flex flex-col gap-1.5 flex-1 min-w-[100px]">
                    <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Shift</label>
                    <select
                        className={`${inputClass} font-semibold`}
                        value={filters.shift || 'ALL'}
                        onChange={e => setFilters({ ...filters, shift: e.target.value })}
                    >
                        <option value="ALL">All Shifts</option>
                        <option value="A">Shift A</option>
                        <option value="B">Shift B</option>
                        <option value="C">Shift C</option>
                    </select>
                </div>
                <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                    <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Overall Result</label>
                    <select
                        className={`${inputClass} font-semibold`}
                        value={filters.result || 'ALL'}
                        onChange={e => setFilters({ ...filters, result: e.target.value })}
                    >
                        <option value="ALL">All Results</option>
                        <option value="OK">Passed (OK)</option>
                        <option value="NG">Failed (NG)</option>
                        <option value="IN PROGRESS">In Progress</option>
                    </select>
                </div>
                <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
                    <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Variant</label>
                    <select
                        className={`${inputClass} font-semibold`}
                        value={filters.variant || 'ALL'}
                        onChange={e => setFilters({ ...filters, variant: e.target.value })}
                    >
                        {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-1.5 flex-1 min-w-[170px]">
                    <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Machine</label>
                    <select
                        className={`${inputClass} font-semibold`}
                        value={filters.machine || 'ALL'}
                        onChange={e => setFilters({ ...filters, machine: e.target.value })}
                    >
                        {MACHINE_FILTER_OPTIONS.map((machine) => <option key={machine.value} value={machine.value}>{machine.label}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
                    <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Part ID Search</label>
                    <input
                        type="text"
                        placeholder="Search part id"
                        className={`${inputClass} font-mono`}
                        value={filters.search || ''}
                        onChange={e => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>

                <div className="flex w-full flex-wrap gap-2 pt-1 sm:w-auto sm:ml-auto">
                    <button
                        onClick={onApply}
                        className="bg-[var(--primary)] text-white hover:brightness-110 px-5 py-2 rounded-lg font-semibold text-[13px] transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                        <Filter size={14} />
                        Apply
                    </button>
                    {onDownloadCsv && (
                        <button
                            onClick={onDownloadCsv}
                            className="bg-[var(--ok)]/20 text-[var(--ok)] border border-[var(--ok-border)] hover:bg-[var(--ok)]/30 px-4 py-2 rounded-lg font-semibold text-[13px] transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                            title="Download Excel Spreadsheet"
                        >
                            <Download size={14} />
                            Excel
                        </button>
                    )}
                    {onDownloadPdf && (
                        <button
                            onClick={onDownloadPdf}
                            className="bg-[var(--ng)]/20 text-[var(--ng)] border border-[var(--ng-border)] hover:bg-[var(--ng)]/30 px-4 py-2 rounded-lg font-semibold text-[13px] transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                            title="Download PDF"
                        >
                            <Download size={14} />
                            PDF
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
export default FilterBar;
