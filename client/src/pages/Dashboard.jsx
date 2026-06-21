import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { generarPDF } from '../pdf';

function scoreColor(s) {
  if (s === null || s === undefined) return '#d1d5db';
  return s >= 80 ? '#16a34a' : s >= 60 ? '#ea580c' : '#dc2626';
}

function scoreTextColor(s) {
  if (s === null || s === undefined) return 'text-gray-300';
  return s >= 80 ? 'text-green-600' : s >= 60 ? 'text-orange-500' : 'text-red-500';
}

function ScoreGauge({ score, evaluadas }) {
  const capped = Math.max(0, Math.min(100, score || 0));
  const color = scoreColor(capped);
  let cat = 'Sin categoría';
  if (capped >= 90) cat = 'Empresa Ejemplar';
  else if (capped >= 80) cat = 'Empresa Sobresaliente';
  else if (capped >= 70) cat = 'Empresa Destacada';
  else if (capped >= 60) cat = 'Empresa Comprometida';

  const r = 70;
  const circ = Math.PI * r;
  const offset = circ - (capped / 100) * circ;

  return (
    <div className="flex flex-col items-center">
      <svg width={180} height={100} viewBox="0 0 180 100">
        <path d={`M 10 90 A ${r} ${r} 0 0 1 170 90`} fill="none" stroke="#e5e7eb" strokeWidth="14" strokeLinecap="round" />
        <path d={`M 10 90 A ${r} ${r} 0 0 1 170 90`} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x="90" y="82" textAnchor="middle" fill={color} fontSize="28" fontWeight="700" fontFamily="Inter, sans-serif">
          {capped.toFixed(1)}%
        </text>
      </svg>
      <p className="text-sm font-semibold mt-1" style={{ color }}>{cat}</p>
      <p className="text-xs font-semibold text-gray-500 mt-1 tracking-wide">PUNTAJE PARCIAL</p>
      <p className="text-xs text-gray-400">({evaluadas} de 25 evaluados)</p>
    </div>
  );
}

function ProjectedGauge({ score }) {
  const capped = Math.max(0, Math.min(100, score || 0));
  const color = scoreColor(capped);
  const r = 70;
  const circ = Math.PI * r;
  const offset = circ - (capped / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <svg width={180} height={100} viewBox="0 0 180 100">
        <path d={`M 10 90 A ${r} ${r} 0 0 1 170 90`} fill="none" stroke="#e5e7eb" strokeWidth="14" strokeLinecap="round" />
        <path d={`M 10 90 A ${r} ${r} 0 0 1 170 90`} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x="90" y="82" textAnchor="middle" fill={color} fontSize="28" fontWeight="700" fontFamily="Inter, sans-serif">
          {capped.toFixed(1)}%
        </text>
      </svg>
      <p className="text-xs font-semibold text-gray-500 mt-1 tracking-wide">PUNTAJE PROYECTADO</p>
      <p className="text-xs text-gray-400">(sobre 25 requisitos)</p>
    </div>
  );
}

function EvaluadasRing({ completadas, total }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const pct = completadas / total;
  const offset = circ - pct * circ;
  const color = pct === 1 ? '#16a34a' : pct >= 0.6 ? '#2563eb' : '#ea580c';
  return (
    <div className="flex flex-col items-center">
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x="50" y="44" textAnchor="middle" fill={color} fontSize="20" fontWeight="700" fontFamily="Inter, sans-serif">
          {completadas}
        </text>
        <text x="50" y="62" textAnchor="middle" fill="#9ca3af" fontSize="11" fontFamily="Inter, sans-serif">
          de {total}
        </text>
      </svg>
      <p className="text-xs font-semibold text-gray-500 mt-1 tracking-wide">REQUISITOS EVALUADOS</p>
    </div>
  );
}

function BloqueadosIndicator({ count }) {
  const color = count === 0 ? '#16a34a' : '#dc2626';
  const r = 38;
  return (
    <div className="flex flex-col items-center">
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill={count === 0 ? '#f0fdf4' : '#fef2f2'} stroke={color} strokeWidth="2" />
        {count === 0 ? (
          <>
            <text x="50" y="56" textAnchor="middle" fill={color} fontSize="32" fontWeight="700" fontFamily="Inter, sans-serif">✓</text>
          </>
        ) : (
          <>
            <text x="50" y="44" textAnchor="middle" fill={color} fontSize="26" fontWeight="700" fontFamily="Inter, sans-serif">
              {count}
            </text>
            <text x="50" y="62" textAnchor="middle" fill={color} fontSize="10" fontFamily="Inter, sans-serif">bloqueados</text>
          </>
        )}
      </svg>
      <p className="text-xs font-semibold text-gray-500 mt-1 tracking-wide">REQUISITOS BLOQUEADOS</p>
    </div>
  );
}

function BarChart({ data }) {
  const max = 100;
  return (
    <div className="space-y-2">
      {data.map(item => (
        <div key={item.label} className="flex items-center gap-3">
          <p className="text-xs text-gray-500 w-24 sm:w-40 md:w-56 shrink-0 leading-tight">{item.label}</p>
          <div className="flex-1 h-5 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
            {item.score !== null && item.score !== undefined ? (
              <div
                className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                style={{ width: `${item.score}%`, backgroundColor: scoreColor(item.score), minWidth: 28 }}
              >
                <span className="text-xs text-white font-medium">{item.score.toFixed(0)}%</span>
              </div>
            ) : (
              <div className="h-full flex items-center pl-3">
                <span className="text-xs text-gray-300">Sin evaluar</span>
              </div>
            )}
            {item.blocked && (
              <div className="h-full bg-red-100 flex items-center pl-3">
                <span className="text-xs text-red-500">⛔ Bloqueado</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard({ id, norma, navigate, config }) {
  const [diag, setDiag] = useState(null);
  const [evalMap, setEvalMap] = useState({});

  useEffect(() => {
    api.diagnosticos.get(id).then(d => {
      setDiag(d);
      const m = {};
      for (const e of (d.evaluaciones || [])) m[e.requisito_id] = e;
      setEvalMap(m);
    });
  }, [id]);

  if (!diag) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const completadas = Object.values(evalMap).filter(e => e.completado);
  const bloqueados = completadas.filter(e => e.bloqueado);
  const conPuntuacion = completadas.filter(e => !e.bloqueado && e.puntuacion_total !== null);

  const fortalezas = [...conPuntuacion].sort((a, b) => b.puntuacion_total - a.puntuacion_total).slice(0, 5);
  const oportunidades = [...conPuntuacion].sort((a, b) => a.puntuacion_total - b.puntuacion_total).slice(0, 5);

  const criterioNombres = {
    1: 'Existencia y Funcionamiento',
    2: 'Difusión y Conocimiento',
    3: 'Participación Directa',
    4: 'Innovación o Mejora',
    5: 'Vinculación Estratégica',
  };

  const promediosPorCriterio = [1, 2, 3, 4, 5].map(c => {
    const vals = conPuntuacion
      .map(e => [e.puntuacion_criterio_1, e.puntuacion_criterio_2, e.puntuacion_criterio_3, e.puntuacion_criterio_4, e.puntuacion_criterio_5][c - 1])
      .filter(v => v !== null && v !== undefined);
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    return { label: criterioNombres[c], score: avg };
  });

  const byTheme = norma.temas.map(tema => {
    const reqs = tema.requisitos.map(rId => evalMap[rId]).filter(Boolean).filter(e => e.completado && !e.bloqueado && e.puntuacion_total !== null);
    const avg = reqs.length ? reqs.reduce((a, e) => a + e.puntuacion_total, 0) / reqs.length : null;
    return { label: `T${tema.id}: ${tema.nombre}`, score: avg };
  });

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 mt-14 md:mt-0">
      <button className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
        onClick={() => navigate('diagnostico', { id })}>
        ← Volver
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400">{diag.nombre_empresa}</p>
        </div>
        <button className="btn-secondary text-sm" onClick={() => generarPDF(diag, Object.values(evalMap), norma, config)}>
          📄 Descargar PDF
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="card p-4 col-span-2 md:col-span-1 flex flex-col items-center justify-center">
          <ScoreGauge score={diag.puntuacion_global || 0} evaluadas={completadas.length} />
        </div>
        <div className="card p-4 flex flex-col items-center justify-center">
          <ProjectedGauge score={diag.puntuacion_proyectada || 0} />
        </div>
        <div className="card p-4 flex flex-col items-center justify-center">
          <EvaluadasRing completadas={completadas.length} total={25} />
        </div>
        <div className="card p-4 flex flex-col items-center justify-center">
          <BloqueadosIndicator count={bloqueados.length} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Resultados por Tema</h3>
          <p className="text-xs text-gray-400 mb-4">Promedio de los requisitos evaluados por tema</p>
          <BarChart data={byTheme} />
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Promedio por Criterio</h3>
          <p className="text-xs text-gray-400 mb-4">Promedio de los requisitos evaluados</p>
          <BarChart data={promediosPorCriterio} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-green-700 mb-3">✓ Fortalezas (top 5)</h3>
          {fortalezas.length === 0 ? (
            <p className="text-xs text-gray-400">Sin datos suficientes</p>
          ) : (
            <div className="space-y-3">
              {fortalezas.map(e => {
                const req = norma.requisitos.find(r => r.id === e.requisito_id);
                return (
                  <div key={e.requisito_id} className="flex items-center justify-between">
                    <p className="text-xs text-gray-600 flex-1 truncate">Req. {req.numero}: {req.nombre}</p>
                    <span className={`text-sm font-semibold ml-2 ${scoreTextColor(e.puntuacion_total)}`}>
                      {e.puntuacion_total.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-orange-600 mb-3">⚠ Áreas de Oportunidad (bottom 5)</h3>
          {oportunidades.length === 0 ? (
            <p className="text-xs text-gray-400">Sin datos suficientes</p>
          ) : (
            <div className="space-y-3">
              {oportunidades.map(e => {
                const req = norma.requisitos.find(r => r.id === e.requisito_id);
                return (
                  <div key={e.requisito_id} className="flex items-center justify-between">
                    <p className="text-xs text-gray-600 flex-1 truncate">Req. {req.numero}: {req.nombre}</p>
                    <span className={`text-sm font-semibold ml-2 ${scoreTextColor(e.puntuacion_total)}`}>
                      {e.puntuacion_total.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {bloqueados.length > 0 && (
        <div className="card p-5 border-red-100">
          <h3 className="text-sm font-semibold text-red-700 mb-3">⛔ Requisitos Bloqueados por Mínimos Auditables</h3>
          <div className="space-y-2">
            {bloqueados.map(e => {
              const req = norma.requisitos.find(r => r.id === e.requisito_id);
              return (
                <div key={e.requisito_id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <p className="text-xs text-red-700">Req. {req.numero}: {req.nombre}</p>
                  <button
                    className="text-xs text-red-600 underline"
                    onClick={() => navigate('evaluacion', { diagId: id, reqId: req.id })}
                  >
                    Revisar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All requisitos */}
      <div className="mt-6 card p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Todos los Requisitos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {norma.requisitos.map(req => {
            const ev = evalMap[req.id];
            const s = ev?.completado ? (ev.bloqueado ? null : ev.puntuacion_total) : null;
            return (
              <button
                key={req.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-left"
                onClick={() => navigate('evaluacion', { diagId: id, reqId: req.id })}
              >
                <div className="w-1.5 h-8 rounded-full shrink-0" style={{ backgroundColor: ev?.bloqueado ? '#dc2626' : scoreColor(s) }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">Req. {req.numero}</p>
                  <p className="text-xs font-medium text-gray-700 truncate">{req.nombre}</p>
                </div>
                <span className={`text-xs font-semibold shrink-0 ${ev?.bloqueado ? 'text-red-500' : scoreTextColor(s)}`}>
                  {ev?.bloqueado ? '⛔' : s !== null && s !== undefined ? `${s.toFixed(0)}%` : '—'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
