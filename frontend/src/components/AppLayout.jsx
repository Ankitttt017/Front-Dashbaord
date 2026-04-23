import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopHeader from './TopHeader';
import Sidebar from './Sidebar';

const THEMES = ['light', 'bmw-blue'];

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(localStorage.getItem('sidebar_collapsed') === 'true');
  const [activeTheme, setActiveTheme] = useState('light');

  const handleToggleCollapse = () => {
    const newVal = !isCollapsed;
    setIsCollapsed(newVal);
    localStorage.setItem('sidebar_collapsed', newVal);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const nextTheme = THEMES.includes(savedTheme) ? savedTheme : 'light';
    setActiveTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
    localStorage.setItem('theme', activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    if (!sidebarOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  return (
    <div className={`app-shell font-inter ${isCollapsed ? 'sidebar-collapsed' : ''} transition-all duration-300`}>
      <TopHeader
        onMenuClick={() => setSidebarOpen(true)}
        onToggleCollapse={handleToggleCollapse}
        isCollapsed={isCollapsed}
        activeTheme={activeTheme}
        onThemeChange={setActiveTheme}
      />
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(false)} isCollapsed={isCollapsed} />

      <main className="app-main min-h-screen pt-[var(--header-h)] lg:pl-[var(--sidebar-w)] transition-[padding] duration-300">
        <div className="app-content">
          <div className="app-backdrop" />
          <div className="page-shell">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
