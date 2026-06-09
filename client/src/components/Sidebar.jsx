import React from 'react';

const navItems = [
  { id: 'home', icon: '🏠', label: 'Diagnósticos' },
  { id: 'config', icon: '⚙️', label: 'Configuración' },
];

export default function Sidebar({ view, navigate }) {
  return (
    <aside className="w-52 min-h-screen bg-white border-r border-gray-100 flex flex-col shrink-0">
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xl">⭐</span>
          <div>
            <p className="text-xs font-bold text-blue-700 leading-tight">CRESE</p>
            <p className="text-xs text-gray-400 leading-tight">Autodiagnóstico</p>
          </div>
        </div>
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
