import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Activity, Box, Settings, Target, BarChart2, Route, LogOut, X } from 'lucide-react';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { path: '/', label: 'Live Dashboard', icon: Activity },
      { path: '/report', label: 'Analysis Report', icon: BarChart2 },
    ]
  },
  {
    label: 'Operations',
    items: [
      { path: '/packing', label: 'Packing Line', icon: Box },
      { path: '/journey', label: 'Component Journey', icon: Route },
      { path: '/box-setup', label: 'Box Hub', icon: Settings },
    ]
  },
  {
    label: 'Management',
    items: [
      { path: '/targets', label: 'Production Targets', icon: Target },
    ]
  }
];

const Sidebar = ({ isOpen, toggle, isCollapsed }) => {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('tr_user') || '{"name":"User","role":"admin"}');
  const showCollapsedDesktop = isCollapsed && !isOpen;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300" 
          onClick={toggle}
        />
      )}

      <aside className={`sidebar mobile-sidebar animate-in slide-in-from-left duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} fixed top-[var(--header-h)] left-0 bottom-0 z-40 pb-[var(--header-h)]`}>

        <div className="lg:hidden px-4 pt-4 pb-3 border-b border-white/5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Navigation</p>
              <p className="text-[14px] font-semibold text-[var(--text-main)] truncate">Traceability Dashboard</p>
            </div>
            <button
              onClick={toggle}
              className="w-9 h-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center"
              aria-label="Close navigation"
            >
              <X size={17} />
            </button>
          </div>
          <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
            <p className="text-[10px] font-semibold text-[var(--text-main)] truncate">{user?.name || 'User'}</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] mt-1">{user?.role || 'user'}</p>
          </div>
        </div>

        <div className="sb-divider mb-6 opacity-30" />

        {/* Navigation */}
        <div className="flex-1 px-3 space-y-7 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1.5 flex flex-col">
              {!showCollapsedDesktop ? (
                <h3 className="sb-section-label animate-in fade-in">{group.label}</h3>
              ) : (
                <div className="h-4" /> /* spacer */
              )}
              {group.items.map((item, iIdx) => {
                const active = location.pathname === item.path;
                return (
                  <NavLink 
                    key={iIdx} 
                    to={item.path}
                    className={({ isActive }) => `sb-nav-item ${showCollapsedDesktop ? 'justify-center p-2.5' : ''} ${isActive ? 'sb-nav-active' : ''}`}
                    onClick={() => window.innerWidth < 1024 && toggle()}
                    title={showCollapsedDesktop ? item.label : undefined}
                  >
                    <div className={`sb-nav-icon shrink-0 ${active ? 'sb-nav-icon-active' : ''}`}>
                      <item.icon size={showCollapsedDesktop ? 20 : 18} />
                    </div>
                    {!showCollapsedDesktop && (
                      <span className={`sb-nav-label text-[13px] whitespace-nowrap font-semibold ${active ? 'is-active' : ''} animate-in fade-in`}>
                        {item.label}
                      </span>
                    )}
                    {active && !showCollapsedDesktop && <div className="sb-active-dot" />}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* System Footer */}
        <div className="sb-footer">
          <button 
             onClick={() => { localStorage.clear(); window.location.href='/login'; }}
             className={`w-full mt-3 flex items-center justify-center gap-2 ${showCollapsedDesktop ? 'p-2.5' : 'px-3 py-2.5'} rounded-lg text-[11px] font-bold text-[var(--ng)] bg-[var(--ng-bg)]/30 border border-[var(--ng-border)]/20 hover:bg-[var(--ng-bg)] transition-colors`}
             title={showCollapsedDesktop ? "Log Out" : undefined}
          >
             <LogOut size={showCollapsedDesktop ? 18 : 14} className="shrink-0" />
             {!showCollapsedDesktop && <span className="whitespace-nowrap animate-in fade-in">Log Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
