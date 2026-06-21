import React, { useState } from 'react';
import logoCrese from '../assets/logo-crese.png';

const navItems = [
  { id: 'home', icon: '🏠', label: 'Inicio / Home' },
];

export default function Sidebar({ view, navigate }) {
  const [open, setOpen] = useState(false);

  const handleNav = (id) => {
    navigate(id);
    setOpen(false);
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 flex items-center justify-between px-4 h-14">
        <img src={logoCrese} alt="Logo CRESE" className="h-8 object-contain" />
        <button onClick={() => setOpen(o => !o)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          {open ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/30" onClick={() => setOpen(false)} />
      )}

      {/* Mobile drawer */}
      <div className={`md:hidden fixed top-14 left-0 bottom-0 z-30 w-64 bg-white border-r border-gray-100 transform transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <nav className="px-2 py-4 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                view.page === item.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-100 absolute bottom-0 w-full">
          <p className="text-xs text-gray-400">Norma CRESE 2025</p>
          <p className="text-xs text-gray-300">v1.0</p>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-52 min-h-screen bg-white border-r border-gray-100 flex-col shrink-0">
        <div className="px-4 py-4 border-b border-gray-100">
          <img src={logoCrese} alt="Logo CRESE" className="w-full max-h-16 object-contain" />
          <p className="text-xs text-gray-500 font-medium leading-tight mt-2 text-center">Herramienta de autodiagnóstico y auditoría interna</p>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => navigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                view.page === item.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}>
              <span className="text-base">{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">Norma CRESE 2025</p>
          <p className="text-xs text-gray-300">v1.0 — Local</p>
        </div>
      </aside>
    </>
  );
}
