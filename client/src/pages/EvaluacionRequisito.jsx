import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const ESCALA = [
  { valor: 100, label: '100%', desc: 'Excelente' },
  { valor: 75, label: '75%', desc: 'Bueno' },
  { valor: 50, label: '50%', desc: 'Parcial' },
  { valor: 25, label: '25%', desc: 'Incipiente' },
  { valor: 0, label: '0%', desc: 'No existe' },
];

function ScaleSelector({ value, onChange, criterio, norma }) {
  const cDef = norma.criterios.find(c => c.id === criterio);
  const [showHelp, setShowHelp] = useState(false);
  return (
    <div>
      <div className="flex gap-2 mb-2">
        {ESCALA.map(opt => (
          <button
            key={opt.valor}
            onClick={() => onChange(opt.valor)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
              value === opt.valor
                ? opt.valor >= 80 ? 'bg-green-500 text-white border-green-500'
                : opt.valor >= 50 ? 'bg-blue-500 text-white border-blue-500'
                : opt.valor >= 25 ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-red-500 text-white border-red-500'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {value !== null && value !== undefined && cDef?.escala && (
        <p className="text-xs text-gray-500 mt-1 italic">
          {cDef.escala.find(e => e.valor === value)?.descripcion}
        </p>
      )}
    </div>
  );
}

function MatrizParticipacion({ value, onChange }) {
  const filas = ['Propuesta', 'Diseño', 'Ejecución', 'Revisión'];
  const cols = ['Dir. General', 'Resp. Programa', 'Comité Interno', 'Personal', 'Otros GI'];

  const toggle = (f, c) => {
    const key = `${f}_${c}`;
    onChange({ ...value, [key]: !value[key] });
  };

  const cumple = Object.values(value || {}).filter(Boolean).length;
  const pct = Math.round((cumple / 20) * 100);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 text-gray-400 font-medium w-24"></th>
              {cols.map(c => (
                <th key={c} className="p-2 text-center text-gray-500 font-medium border-b border-gray-100">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map(f => (
              <tr key={f} className="border-b border-gray-50">
                <td className="p-2 text-gray-600 font-medium">{f}</td>
                {cols.map(c => {
                  const key = `${f}_${c}`;
                  const checked = value?.[key] || false;
                  return (
                    <td key={c} className="p-2 text-center">
                      <button
                        onClick={() => toggle(f, c)}
                        className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center mx-auto ${
                          checked
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'bg-white border-gray-200 text-gray-200 hover:border-blue-300'
                        }`}
                      >
                        {checked ? '✓' : ''}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-orange-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-gray-600">{cumple}/20 = {pct}%</span>
      </div>
    </div>
  );
}

const DOC_CAMPOS = [
  { key: 'objetivo',      label: 'Objetivo centrado en la persona' },
  { key: 'alcance',       label: 'Alcance' },
  { key: 'procedimiento', label: 'Procedimiento que incluya difusión, revisión y responsables' },
  { key: 'metrica',       label: 'Métrica directamente relacionada con el objetivo' },
];

function DocumentacionReq3({ value, onChange, norma }) {
  const requisitos5a25 = norma.requisitos.filter(r => r.numero >= 5 && r.numero <= 25);

  const allVals = requisitos5a25.flatMap(r =>
    DOC_CAMPOS.map(c => (value[r.id] || {})[c.key])
  ).filter(v => v != null);
  const score = allVals.length > 0 ? allVals.reduce((a, b) => a + b, 0) / allVals.length : null;
  const scoreColor = score === null ? 'text-gray-400' : score >= 80 ? 'text-green-600' : score >= 60 ? 'text-orange-500' : 'text-red-500';

  return (
    <div>
      <p className="text-xs text-gray-500 mb-5 leading-relaxed">
        Para cada requisito del 5 al 25, evalúa si su documentación incluye los cuatro elementos requeridos.
        La puntuación del Requisito 3 es el promedio de todos los campos.
      </p>
      <div className="space-y-5">
        {requisitos5a25.map(req => {
          const rd = value[req.id] || {};
          const setField = (campo, val) => onChange({ ...value, [req.id]: { ...rd, [campo]: val } });
          const reqVals = DOC_CAMPOS.map(c => rd[c.key]).filter(v => v != null);
          const reqScore = reqVals.length > 0 ? reqVals.reduce((a, b) => a + b, 0) / reqVals.length : null;
          return (
            <div key={req.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-800">
                  Req. {req.numero} — {req.nombre}
                </p>
                {reqScore !== null && (
                  <span className={`text-sm font-bold ${reqScore >= 80 ? 'text-green-600' : reqScore >= 60 ? 'text-orange-500' : 'text-red-500'}`}>
                    {reqScore.toFixed(0)}%
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {DOC_CAMPOS.map(c => (
                  <div key={c.key}>
                    <p className="text-xs text-gray-500 mb-1.5">{c.label}</p>
                    <div className="flex gap-1.5">
                      {ESCALA.map(opt => (
                        <button
                          key={opt.valor}
                          onClick={() => setField(c.key, opt.valor)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            rd[c.key] === opt.valor
                              ? opt.valor >= 75 ? 'bg-green-500 text-white border-green-500'
                              : opt.valor >= 50 ? 'bg-blue-500 text-white border-blue-500'
                              : opt.valor >= 25 ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-red-500 text-white border-red-500'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className={`mt-5 p-4 rounded-lg border-2 flex items-center justify-between ${
        score === null ? 'border-gray-100 bg-gray-50' : score >= 80 ? 'border-green-200 bg-green-50' : score >= 60 ? 'border-orange-200 bg-orange-50' : 'border-red-200 bg-red-50'
      }`}>
        <p className="text-sm font-semibold text-gray-700">Puntuación total Requisito 3 — Documentación</p>
        <p className={`text-2xl font-bold ${scoreColor}`}>
          {score !== null ? `${score.toFixed(1)}%` : '—'}
        </p>
      </div>
    </div>
  );
}

export default function EvaluacionRequisito({ diagId, requisito, norma, navigate }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const esReq3 = requisito.numero === 3;

  const [minimosCumplidos, setMinimosCumplidos] = useState({});
  const [indicadoresCumplidos, setIndicadoresCumplidos] = useState({});
  const [bloqueado, setBloqueado] = useState(false);
  const [scores, setScores] = useState({ 1: null, 2: null, 3: null, 4: null, 5: null });
  const [notas, setNotas] = useState({ 1: '', 2: '', 3: '', 4: '', 5: '' });
  const [matriz, setMatriz] = useState({});
  const [docDetalle, setDocDetalle] = useState({});
  const [activeTab, setActiveTab] = useState('minimos');

  useEffect(() => {
    setLoading(true);
    api.evaluaciones.list(diagId).then(evs => {
      const ev = evs.find(e => e.requisito_id === requisito.id);
      if (ev) {
        setMinimosCumplidos(ev.minimos_detalle || {});
        setIndicadoresCumplidos(ev.indicadores_obligatorios_detalle || {});
        setBloqueado(!!ev.bloqueado);
        setScores({
          1: ev.puntuacion_criterio_1,
          2: ev.puntuacion_criterio_2,
          3: ev.puntuacion_criterio_3,
          4: ev.puntuacion_criterio_4,
          5: ev.puntuacion_criterio_5,
        });
        setNotas({
          1: ev.notas_criterio_1 || '',
          2: ev.notas_criterio_2 || '',
          3: ev.notas_criterio_3 || '',
          4: ev.notas_criterio_4 || '',
          5: ev.notas_criterio_5 || '',
        });
        setMatriz(ev.matriz_participacion || {});
        if (ev.documentacion_detalle) setDocDetalle(ev.documentacion_detalle);
      }
      setLoading(false);
      if (requisito.minimos_auditables?.length > 0) setActiveTab('minimos');
      else setActiveTab('criterio_1');
    });
  }, [diagId, requisito.id]);

  const minimosFallados = requisito.minimos_auditables
    ? requisito.minimos_auditables.filter((_, i) => minimosCumplidos[i] === false).length
    : 0;
  const allMinimosAnswered = requisito.minimos_auditables?.every((_, i) => minimosCumplidos[i] !== undefined) ?? true;

  const indicadores = Array.isArray(requisito.indicadores_obligatorios) ? requisito.indicadores_obligatorios : [];
  const indicadoresFallados = indicadores.filter((_, i) => indicadoresCumplidos[i] === false).length;
  const allIndicadoresAnswered = indicadores.length === 0 || indicadores.every((_, i) => indicadoresCumplidos[i] !== undefined);
  const isBlockedByIndicadores = indicadores.length > 0 && indicadoresFallados > 0;

  const isBlocked = (requisito.minimos_auditables?.length > 0 && minimosFallados > 0) || isBlockedByIndicadores;

  const computeParticipacionScore = () => {
    const cumple = Object.values(matriz).filter(Boolean).length;
    return Math.round((cumple / 20) * 100);
  };

  const getScore3 = () => {
    if (!requisito.criterios_evaluables.includes(3)) return null;
    return computeParticipacionScore();
  };

  const save = async (completado = false) => {
    setSaving(true);
    const score3 = getScore3();
    await api.evaluaciones.save(diagId, requisito.id, {
      minimos_cumplidos: !isBlocked,
      minimos_detalle: minimosCumplidos,
      indicadores_obligatorios_detalle: indicadoresCumplidos,
      bloqueado: isBlocked,
      documentacion_detalle: esReq3 ? docDetalle : null,
      puntuacion_criterio_1: scores[1],
      puntuacion_criterio_2: scores[2],
      puntuacion_criterio_3: score3,
      puntuacion_criterio_4: scores[4],
      puntuacion_criterio_5: scores[5],
      notas_criterio_1: notas[1],
      notas_criterio_2: notas[2],
      notas_criterio_3: notas[3],
      notas_criterio_4: notas[4],
      notas_criterio_5: notas[5],
      matriz_participacion: matriz,
      completado,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (completado) navigate('diagnostico', { id: diagId });
  };

  const criterioLabels = {
    1: 'Existencia y Funcionamiento',
    2: 'Difusión y Conocimiento',
    3: 'Participación Directa',
    4: 'Innovación o Mejora',
    5: 'Vinculación con Dirección Estratégica',
  };

  const tabs = [
    requisito.minimos_auditables?.length > 0 && { id: 'minimos', label: 'Mínimos Auditables' },
    ...requisito.criterios_evaluables.map(c => ({
      id: `criterio_${c}`,
      label: c === 3 ? 'Participación'
           : (esReq3 && c === 1) ? 'Documentación'
           : criterioLabels[c].split(' ')[0],
    })),
  ].filter(Boolean);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 mt-14 md:mt-0">
      <button className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
        onClick={() => navigate('diagnostico', { id: diagId })}>
        ← Volver al diagnóstico
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-blue-600">Requisito {requisito.numero}</span>
          {requisito.solo_existencia && (
            <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
              Solo Existencia y Funcionamiento
            </span>
          )}
        </div>
        <h1 className="text-lg font-semibold text-gray-900 leading-snug">{requisito.nombre}</h1>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">{requisito.descripcion}</p>
      </div>

      {/* Contextual help */}
      {requisito.ayuda_contextual && (
        <div className="mb-5 p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-xs font-semibold text-blue-700 mb-1">💡 Contexto</p>
          <p className="text-xs text-blue-700 leading-relaxed">{requisito.ayuda_contextual}</p>
        </div>
      )}

      {/* Blocked warning */}
      {isBlocked && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-semibold text-red-700 mb-1">⛔ Requisito Bloqueado</p>
          <p className="text-xs text-red-600">
            Uno o más mínimos auditables no se cumplen. Este requisito será marcado automáticamente como <strong>No Cumple</strong> y no es posible evaluar los criterios de evaluación.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.id === 'minimos' && (minimosFallados + indicadoresFallados) > 0 && (
              <span className="ml-1 w-4 h-4 inline-flex items-center justify-center bg-red-500 text-white text-xs rounded-full">{minimosFallados + indicadoresFallados}</span>
            )}
          </button>
        ))}
      </div>

      <div className="card p-6">
        {/* Mínimos auditables tab */}
        {activeTab === 'minimos' && requisito.minimos_auditables?.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Mínimos Auditables</h3>
            <p className="text-xs text-gray-500 mb-4">
              Evalúa cada mínimo auditable. Si alguno no se cumple, el requisito quedará bloqueado y no se podrán evaluar los criterios de evaluación.
            </p>
            <div className="space-y-4">
              {requisito.minimos_auditables.map((ma, i) => (
                <div key={i} className={`p-4 rounded-lg border transition-colors ${
                  minimosCumplidos[i] === true ? 'border-green-200 bg-green-50'
                  : minimosCumplidos[i] === false ? 'border-red-200 bg-red-50'
                  : 'border-gray-100 bg-gray-50'
                }`}>
                  <p className="text-sm text-gray-700 leading-relaxed mb-3">{ma}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMinimosCumplidos(m => ({ ...m, [i]: true }))}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                        minimosCumplidos[i] === true
                          ? 'bg-green-500 text-white border-green-500'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-green-400 hover:text-green-600'
                      }`}
                    >
                      ✓ Cumple
                    </button>
                    <button
                      onClick={() => setMinimosCumplidos(m => ({ ...m, [i]: false }))}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                        minimosCumplidos[i] === false
                          ? 'bg-red-500 text-white border-red-500'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-red-400 hover:text-red-600'
                      }`}
                    >
                      ✕ No Cumple
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {allMinimosAnswered && minimosFallados === 0 && (
              <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-lg">
                <p className="text-xs text-green-700 font-medium">✓ Todos los mínimos auditables se cumplen. Puedes continuar con los criterios de evaluación.</p>
              </div>
            )}

            {/* Indicadores Obligatorios */}
            {indicadores.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-1">Indicadores Obligatorios</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Evalúa cada indicador obligatorio. Si alguno no se cumple, el requisito quedará bloqueado al igual que los mínimos auditables.
                </p>
                <div className="space-y-4">
                  {indicadores.map((ind, i) => (
                    <div key={i} className={`p-4 rounded-lg border transition-colors ${
                      indicadoresCumplidos[i] === true ? 'border-green-200 bg-green-50'
                      : indicadoresCumplidos[i] === false ? 'border-red-200 bg-red-50'
                      : 'border-gray-100 bg-gray-50'
                    }`}>
                      <p className="text-sm text-gray-700 leading-relaxed mb-3">{ind}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIndicadoresCumplidos(m => ({ ...m, [i]: true }))}
                          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                            indicadoresCumplidos[i] === true
                              ? 'bg-green-500 text-white border-green-500'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-green-400 hover:text-green-600'
                          }`}
                        >
                          ✓ Cumple
                        </button>
                        <button
                          onClick={() => setIndicadoresCumplidos(m => ({ ...m, [i]: false }))}
                          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                            indicadoresCumplidos[i] === false
                              ? 'bg-red-500 text-white border-red-500'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-red-400 hover:text-red-600'
                          }`}
                        >
                          ✕ No Cumple
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {allIndicadoresAnswered && !isBlockedByIndicadores && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-lg">
                    <p className="text-xs text-green-700 font-medium">✓ Todos los indicadores obligatorios se cumplen.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Criterio 1 — Existencia y Funcionamiento (o Documentación para req 3) */}
        {activeTab === 'criterio_1' && requisito.criterios_evaluables.includes(1) && (
          <div>
            {esReq3 ? (
              <DocumentacionReq3 value={docDetalle} onChange={setDocDetalle} norma={norma} />
            ) : (
              <>
                <h3 className="text-sm font-semibold text-gray-800 mb-1">{criterioLabels[1]}</h3>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">{norma.criterios.find(x => x.id === 1)?.descripcion}</p>

                {requisito.preguntas_existencia && (
                  <div className="mb-5 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Preguntas orientadoras:</p>
                    <ul className="space-y-2">
                      {requisito.preguntas_existencia.map((q, i) => (
                        <li key={i} className="text-xs text-gray-600 flex gap-2">
                          <span className="text-gray-400 shrink-0">{i+1}.</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {isBlocked ? (
                  <p className="text-sm text-red-400 italic">No disponible — requisito bloqueado por mínimos auditables.</p>
                ) : (
                  <>
                    <ScaleSelector value={scores[1]} onChange={v => setScores(s => ({ ...s, 1: v }))} criterio={1} norma={norma} />
                    <div className="mt-4">
                      <label className="label">Notas u observaciones (opcional)</label>
                      <textarea className="input resize-none" rows={2}
                        placeholder="Evidencias encontradas, áreas de mejora, comentarios..."
                        value={notas[1]} onChange={e => setNotas(n => ({ ...n, 1: e.target.value }))} />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Criterios 2, 4, 5 */}
        {['2','4','5'].map(cStr => {
          const c = parseInt(cStr);
          if (activeTab !== `criterio_${c}`) return null;
          if (!requisito.criterios_evaluables.includes(c)) return null;
          const cDef = norma.criterios.find(x => x.id === c);
          return (
            <div key={c}>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">{criterioLabels[c]}</h3>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">{cDef?.descripcion}</p>
              {isBlocked ? (
                <p className="text-sm text-red-400 italic">No disponible — requisito bloqueado por mínimos auditables.</p>
              ) : (
                <>
                  <ScaleSelector value={scores[c]} onChange={v => setScores(s => ({ ...s, [c]: v }))} criterio={c} norma={norma} />
                  <div className="mt-4">
                    <label className="label">Notas u observaciones (opcional)</label>
                    <textarea className="input resize-none" rows={2}
                      placeholder="Evidencias encontradas, áreas de mejora, comentarios..."
                      value={notas[c]} onChange={e => setNotas(n => ({ ...n, [c]: e.target.value }))} />
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Participation matrix tab */}
        {activeTab === 'criterio_3' && requisito.criterios_evaluables.includes(3) && (
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Participación Directa</h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Marca cada cuadrante donde existe participación real y documentada en los últimos dos años.
              El índice se calcula como: cuadrantes cumplidos ÷ 20.
            </p>
            {isBlocked ? (
              <p className="text-sm text-red-400 italic">No disponible — requisito bloqueado por mínimos auditables.</p>
            ) : (
              <MatrizParticipacion value={matriz} onChange={setMatriz} />
            )}
          </div>
        )}
      </div>

      {/* Save buttons */}
      <div className="flex items-center justify-between mt-6">
        <div className="text-xs text-gray-400">
          {saved && <span className="text-green-600">✓ Guardado</span>}
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => save(false)} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar borrador'}
          </button>
          <button
            className="btn-primary"
            onClick={() => save(true)}
            disabled={saving || (requisito.minimos_auditables?.length > 0 && !allMinimosAnswered) || (indicadores.length > 0 && !allIndicadoresAnswered)}
          >
            {saving ? 'Guardando...' : isBlocked ? 'Registrar como No Cumple →' : 'Finalizar requisito →'}
          </button>
        </div>
      </div>

      {((requisito.minimos_auditables?.length > 0 && !allMinimosAnswered) || (indicadores.length > 0 && !allIndicadoresAnswered)) && (
        <p className="text-xs text-amber-600 text-right mt-2">
          Responde todos los mínimos auditables e indicadores obligatorios para poder finalizar.
        </p>
      )}
    </div>
  );
}
