import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';

function ScoreBar({ score }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-orange-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-500 w-8 text-right">{score.toFixed(0)}%</span>
    </div>
  );
}

export default function Home({ norma, navigate }) {
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ nombre_empresa: '', responsable: '', periodo_inicio: '', periodo_fin: '' });
  const [saving, setSaving] = useState(false);
  const importRef = useRef();

  useEffect(() => {
    api.diagnosticos.list().then(setDiagnosticos);
  }, []);

  const crear = async () => {
    if (!form.nombre_empresa.trim()) return;
    setSaving(true);
    const { id } = await api.diagnosticos.create(form);
    setSaving(false);
    setShowNew(false);
    setForm({ nombre_empresa: '', responsable: '', periodo_inicio: '', periodo_fin: '' });
    navigate('diagnostico', { id });
  };

  const eliminar = async (id, e) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar este diagnóstico? Esta acción no se puede deshacer.')) return;
    await api.diagnosticos.delete(id);
    setDiagnosticos(d => d.filter(x => x.id !== id));
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const { id } = await api.diagnosticos.import(data);
        const list = await api.diagnosticos.list();
        setDiagnosticos(list);
        navigate('diagnostico', { id });
      } catch {
        alert('Error al importar el archivo. Verifica que sea un archivo de diagnóstico CRESE válido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const estadoBadge = (d) => {
    if (d.estado === 'completado') return <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full">Completado</span>;
    return <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">En progreso</span>;
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Diagnósticos / Auditorías Internas CRESE</h1>
          <p className="text-sm text-gray-500 mt-1">Diagnóstico / Auditoría Interna — Norma CRESE 2025</p>
        </div>
        <div className="flex gap-2">
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <div className="flex flex-col items-end gap-0.5">
            <button className="btn-secondary" onClick={() => importRef.current.click()}>
              <span>↑</span> Importar
            </button>
            <p className="text-xs text-gray-400">Cargar un diagnóstico como archivo .json</p>
          </div>
          <button className="btn-primary" onClick={() => setShowNew(true)}>
            <span>+</span> Nuevo diagnóstico / auditoría interna
          </button>
        </div>
      </div>

      {showNew && (
        <div className="card p-6 mb-6 border-blue-100">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Nuevo Diagnóstico / Auditoría Interna</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Nombre de la empresa *</label>
              <input className="input" placeholder="Empresa S.A. de C.V." value={form.nombre_empresa}
                onChange={e => setForm(f => ({ ...f, nombre_empresa: e.target.value }))} />
            </div>
            <div>
              <label className="label">Responsable del diagnóstico</label>
              <input className="input" placeholder="Nombre del responsable" value={form.responsable}
                onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))} />
            </div>
            <div>
              <label className="label">Periodo de evaluación</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label text-gray-400 font-normal">Inicio</label>
                  <input type="date" className="input" value={form.periodo_inicio}
                    onChange={e => setForm(f => ({ ...f, periodo_inicio: e.target.value }))} />
                </div>
                <div>
                  <label className="label text-gray-400 font-normal">Fin</label>
                  <input type="date" className="input" value={form.periodo_fin}
                    onChange={e => setForm(f => ({ ...f, periodo_fin: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button className="btn-secondary" onClick={() => setShowNew(false)}>Cancelar</button>
            <button className="btn-primary" onClick={crear} disabled={saving || !form.nombre_empresa.trim()}>
              {saving ? 'Creando...' : 'Crear diagnóstico'}
            </button>
          </div>
        </div>
      )}

      {diagnosticos.length === 0 && !showNew && (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-base font-medium text-gray-900 mb-2">Sin diagnósticos / auditorías internas</h3>
          <p className="text-sm text-gray-500 mb-6">Crea tu primer diagnóstico / auditoría interna CRESE para comenzar la evaluación.</p>
          <button className="btn-primary" onClick={() => setShowNew(true)}>+ Nuevo diagnóstico / auditoría interna</button>
        </div>
      )}

      <div className="space-y-3">
        {diagnosticos.map(d => (
          <div
            key={d.id}
            className="card p-5 hover:shadow-md cursor-pointer transition-shadow"
            onClick={() => navigate('diagnostico', { id: d.id })}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{d.nombre_empresa}</h3>
                  {estadoBadge(d)}
                </div>
                <p className="text-xs text-gray-400">
                  {d.responsable && `${d.responsable} · `}
                  {d.periodo_inicio && d.periodo_fin && `${d.periodo_inicio} – ${d.periodo_fin} · `}
                  Actualizado {new Date(d.updated_at).toLocaleDateString('es-MX')}
                </p>
                {d.puntuacion_global !== null && d.puntuacion_global !== undefined && (
                  <div className="mt-3 max-w-xs">
                    <ScoreBar score={d.puntuacion_global} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  className="text-xs text-gray-400 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                  onClick={e => { e.stopPropagation(); navigate('dashboard', { id: d.id }); }}
                >
                  Dashboard
                </button>
                <button
                  className="text-xs text-gray-400 hover:text-green-600 px-2 py-1 rounded hover:bg-green-50 transition-colors"
                  onClick={e => { e.stopPropagation(); api.diagnosticos.exportDiag(d.id); }}
                >
                  Exportar
                </button>
                <button
                  className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                  onClick={e => eliminar(d.id, e)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {diagnosticos.length > 0 && (
        <div className="mt-8 p-4 bg-amber-50 border border-amber-100 rounded-lg">
          <p className="text-xs text-amber-700">
            <strong>Aviso:</strong> Esta herramienta de autodiagnóstico no sustituye la auditoría externa de certificación CRESE.
            Su propósito es servir como una evaluación previa de preparación.
          </p>
        </div>
      )}
    </div>
  );
}
