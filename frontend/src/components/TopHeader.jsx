import React, { useState } from 'react';
import { ChevronDown, Menu, SunMoon } from 'lucide-react';

const TopHeader = ({ onMenuClick, onToggleCollapse, isCollapsed, isMobile, activeTheme = 'light', onThemeChange }) => {
  const [showSettings, setShowSettings] = useState(false);
  const user = JSON.parse(localStorage.getItem('tr_user') || '{"name":"System Admin","role":"admin"}');
  const isBlueTheme = activeTheme === 'bmw-blue';

  const handleThemeToggle = () => {
    if (!onThemeChange) return;
    onThemeChange(isBlueTheme ? 'light' : 'bmw-blue');
  };

  return (
    <header className="topbar fixed top-0 left-0 w-full z-[60]">
      {/* Left Section */}
      <div className="flex items-center gap-4 min-w-0">
        <button onClick={onMenuClick} className={`${isMobile ? 'flex' : 'hidden'} p-1 -ml-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors`}>
           <Menu size={20} />
        </button>
        <button onClick={onToggleCollapse} className={`${isMobile ? 'hidden' : 'hidden lg:block'} p-2 -ml-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors`} title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
           <Menu size={20} />
        </button>

      </div>

      <div className="absolute left-1/2 -translate-x-1/2 hidden md:block pointer-events-none">
        <h1 className="text-[24px] font-bold text-[var(--text-main)] tracking-[0.02em] leading-none">
          BMW GEN-6 REAR DASHBOARD (BAWAL)
        </h1>
      </div>


      {/* Right Section */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={handleThemeToggle}
          className={`hdr-theme-toggle ${isBlueTheme ? 'is-blue' : ''}`}
          title={isBlueTheme ? 'Switch to White Theme' : 'Switch to BMW Blue Theme'}
          aria-label={isBlueTheme ? 'Switch to White Theme' : 'Switch to BMW Blue Theme'}
        >
          <SunMoon size={17} className="hdr-theme-toggle-icon" aria-hidden="true" strokeWidth={1.9} />
        </button>

        <div className="relative">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`hdr-user-chip flex items-center gap-3 transition-all ${showSettings ? 'border-[var(--primary)] bg-[var(--primary-dim)]' : 'hover:bg-white/5'}`}
          >
            <div className="hdr-avatar uppercase font-black tracking-tighter">
              {user?.name ? user.name.substring(0, 2) : 'Us'}
              <div className="hdr-status-indicator" style={{ background: 'var(--ok)' }} />
            </div>
            <div className="hidden lg:block text-left mr-1">
              <p className="text-[12px] font-bold text-[var(--text-main)] leading-none mb-1">{user?.name || 'User'}</p>
            </div>
            <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform duration-300 ${showSettings ? 'rotate-180' : ''}`} />
          </button>

          {/* Quick Settings Dropdown (restored) */}
          {showSettings && (
            <div className="hdr-dropdown animate-in slide-in-from-top-4 duration-300 shadow-3xl">
              <div className="p-4 border-b border-white/10 bg-white/[0.02]">
                <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">System Control</h3>
                <div className="grid grid-cols-1 gap-2">
                  <div className="hdr-status-card">
                    <p className="text-[9px] text-[var(--text-dim)] uppercase tracking-widest mb-1">Database</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--ok)]" />
                      <span className="text-[11px] font-bold text-[var(--text-main)]">Online</span>
                    </div>
                  </div>
                </div>
              </div>

           
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
