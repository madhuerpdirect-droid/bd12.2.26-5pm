
import React, { useState } from 'react';
import { UserRole } from '../types';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z', roles: [UserRole.ADMIN, UserRole.COLLECTOR, UserRole.VIEWER] },
  { id: 'my_portal', label: 'My Financials', icon: 'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z', roles: [UserRole.MEMBER] },
  { id: 'chits', label: 'Chits', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z', roles: [UserRole.ADMIN, UserRole.COLLECTOR, UserRole.VIEWER] },
  { id: 'members', label: 'Members', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z', roles: [UserRole.ADMIN, UserRole.COLLECTOR, UserRole.VIEWER] },
  { id: 'allotment', label: 'Allotment', icon: 'M11.5 1L2 6v10l9.5 5 9.5-5V6l-9.5-5zm0 17.5L5 15V8.5l6.5 3.5 6.5-3.5V15l-6.5 3.5z', roles: [UserRole.ADMIN, UserRole.COLLECTOR] },
  { id: 'collections', label: 'Collections', icon: 'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z', roles: [UserRole.ADMIN, UserRole.COLLECTOR] },
  { id: 'reports', label: 'Reports', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z', roles: [UserRole.ADMIN, UserRole.COLLECTOR, UserRole.VIEWER] },
  { id: 'masters', label: 'Masters', icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38.3 1.03-.7 1.62-.94l.36-2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.21.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z', roles: [UserRole.ADMIN] },
];

interface Props {
  children: React.ReactNode;
  activePage: string;
  setActivePage: (id: string) => void;
  user: { name: string; role: UserRole };
  onLogout: () => void;
  onSync: () => void;
  isDirty?: boolean;
  isSyncing?: boolean;
  syncLabel?: string;
  syncColor?: string;
}

const Layout: React.FC<Props> = ({ children, activePage, setActivePage, user, onLogout, onSync, isDirty, isSyncing, syncLabel, syncColor }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (id: string) => {
    setActivePage(id);
    setIsMobileMenuOpen(false);
  };

  const navContent = (
    <>
      <div className="p-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-black ms-primary tracking-tighter uppercase">
            Bhadrakali Chits
          </h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-500 p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 mt-2 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.filter(item => item.roles.includes(user.role)).map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-3 text-sm rounded-md transition-colors ${
              activePage === item.id 
              ? 'ms-active-nav' 
              : 'text-gray-600 hover:ms-bg-hover'
            }`}
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d={item.icon} />
            </svg>
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t ms-border shrink-0">
        <div className="flex items-center gap-3 p-2">
          <div className="w-8 h-8 shrink-0 rounded-full ms-bg-primary text-white flex items-center justify-center text-xs font-bold">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-semibold truncate">{user.name}</p>
            <p className="text-[10px] text-gray-500 capitalize">{user.role}</p>
          </div>
          <button onClick={onLogout} title="Logout" className="text-gray-400 hover:text-red-500 p-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-white">
      {/* Sidebar - Desktop */}
      <div className="w-64 ms-bg-sidebar border-r ms-border flex flex-col hidden md:flex shrink-0">
        {navContent}
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute top-0 left-0 bottom-0 w-64 bg-white flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white min-w-0">
        <header className="h-14 border-b ms-border flex items-center justify-between px-4 md:px-6 bg-white shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-1.5 text-gray-600 hover:bg-gray-100 rounded"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-800 truncate">
              {NAV_ITEMS.find(n => n.id === activePage)?.label || 'Page'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {user.role !== UserRole.MEMBER && (
              <button 
                onClick={onSync}
                className={`flex items-center gap-2 px-3 py-1.5 text-[10px] md:text-xs font-bold border rounded transition-all ${syncColor}`}
                title={syncLabel}
              >
                <svg className={`w-3 h-3 md:w-4 md:h-4 ${isSyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                <span className="hidden xs:inline">{syncLabel}</span>
              </button>
            )}
            <button className="text-gray-500 hover:text-gray-700 p-2" aria-label="Notifications">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto bg-gray-50 relative scrolling-touch">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
