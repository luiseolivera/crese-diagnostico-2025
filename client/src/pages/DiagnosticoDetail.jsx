import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { generarPDF } from '../pdf';

function statusIcon(ev, reqId) {
  if (!ev) return { icon: '○', color: 'text-gray-300', bg: '' };
  if (ev.bloqueado) return { icon: '✕', color: 'text-red-500', bg: 'bg-red-50' };
  if (!ev.completado) return { icon: '◐', color: 'text-blue-400', bg: 'bg-blue-50' };
  const s = ev.puntuacion_total;
  if (s >= 80) return { icon: '✓', color: 'text-green-600', bg: 'bg-green-50' };
  if (s >= 60) return { icon: '✓', color: 'text-orange-500', bg: 'bg-orange-50' };
  return { icon: '!', color: 'text-red-500', bg: 'bg-red-50' };
}

function scoreColor(s) {
  if (s === null || s === undefined) return 'text-gray-400';
  return s >= 80 ? 'text-green-600' : s >= 60 ? 'text-orange-500' : 'text-red-500';
}

export default function DiagnosticoDetail({ id, norma, navigate }) {
  const [diag, setDiag] = useState(null);
  const [evalMap, setEvalMap] = useState({});
  const [progress, setProgress] = useState(0);

  const load = () => {
    api.diagnosticos.get(id).then(d => {
      setDiag(d);
      const m = {};
      for (const e of (d.evaluaciones || [])) m[e.requisito_id] = e;
      setEvalMap(m);
      const completadas = (d.evaluaciones || []).filter(e => e.completado).length;
      setProgress(Math.round((completadas / 25) * 100));
    });
  };

  useEffect(() => { load(); }, [id]);

  if (!diag) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 mt-14 md:mt-0">
      <button className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1" onClick={() => navigate('home')}>
        ← Volver
      </button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{diag.nombre_empresa}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {diag.responsable && `${diag.responsable} · `}
            {diag.periodo_inicio && `Periodo: ${diag.periodo_inicio} – ${diag.periodo_fin}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-sm" onClick={() => navigate('dashboard', { id })}>
            📊 Dashboard
          </button>
          <button className="btn-secondary text-sm" onClick={() => {
            api.diagnosticos.get(id).then(d => {
              generarPDF(d, d.evaluaciones || [], norma, null);
            });
          }}>
            📄 PDF
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-500">Avance del diagnóstico</p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">{Object.values(evalMap).filter(e => e.completado).length} / 25 requisitos</span>
            {diag.puntuacion_global !== null && diag.puntuacion_global !== undefined && (
              <span className={`text-sm font-semibold ${scoreColor(diag.puntuacion_global)}`}>
                {diag.puntuacion_global.toFixed(1)}% global
              </span>
            )}
          </div>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Requisitos by theme */}
      {norma.temas.map(tema => (
        <div key={tema.id} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Tema {tema.id}</span>
            <h2 className="text-sm font-semibold text-gray-800">{tema.nombre}</h2>
          </div>
          <div className="card overflow-hidden">
            {tema.requisitos.map((rId, idx) => {
              const req = norma.requisitos.find(r => r.id === rId);
              const ev = evalMap[rId];
              const s = statusIcon(ev, rId);
              return (
                <button
                  key={rId}
                  className={`w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors ${idx < tema.requisitos.length - 1 ? 'border-b border-gray-50' : ''}`}
                  onClick={() => navigate('evaluacion', { diagId: id, reqId: rId })}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${s.bg || 'bg-gray-50'} ${s.color}`}>
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">Requisito {req.numero}</p>
                    <p className="text-sm font-medium text-gray-800 leading-snug">{req.nombre}</p>
                  </div>
                  {ev?.completado && !ev?.bloqueado && ev?.puntuacion_total !== null && (
                    <span className={`text-sm font-semibold shrink-0 ${scoreColor(ev.puntuacion_total)}`}>
                      {ev.puntuacion_total.toFixed(0)}%
                    </span>
                  )}
                  {ev?.bloqueado && (
                    <span className="text-xs text-red-500 shrink-0 font-medium">No Cumple</span>
                  )}
                  {!ev && (
                    <span className="text-xs text-gray-300 shrink-0">Sin evaluar</span>
                  )}
                  {ev && !ev.completado && !ev.bloqueado && (
                    <span className="text-xs text-blue-400 shrink-0">En progreso</span>
                  )}
                  <span className="text-gray-300 shrink-0">›</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="text-gray-300">○</span> Sin evaluar</span>
        <span className="flex items-center gap-1"><span className="text-blue-400">◐</span> En progreso</span>
        <span className="flex items-center gap-1"><span className="text-green-600">✓</span> ≥80%</span>
        <span className="flex items-center gap-1"><span className="text-orange-500">✓</span> 60–79%</span>
        <span className="flex items-center gap-1"><span className="text-red-500">!</span> &lt;60%</span>
        <span className="flex items-center gap-1"><span className="text-red-500">✕</span> Bloqueado</span>
      </div>
    </div>
  );
}
