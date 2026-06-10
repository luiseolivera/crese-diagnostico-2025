import React from 'react';
import logoCrese from '../assets/logo-crese.png';

const navItems = [
  { id: 'home', icon: '🏠', label: 'Diagnósticos / Auditorías Internas' },
];

export default function Sidebar({ view, navigate }) {
  return (
    <aside className="w-52 min-h-screen bg-white border-r border-gray-100 flex flex-col shrink-0">
      <div className="px-4 py-4 border-b border-gray-100">
        <img src={logoCrese} alt="Logo CRESE" className="w-full max-h-16 object-contain" />
        <p className="text-xs text-gray-500 font-medium leading-tight mt-2 text-center">Herramienta de autodiagnóstico y auditoría interna</p>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
              view.page === item.id
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">Norma CRESE 2025</p>
        <p className="text-xs text-gray-300">v1.0 — Local</p>
      </div>
    </aside>
  );
}
