import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';

function Instructivo({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Instructivo de uso</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-light leading-none">×</button>
        </div>
        <div className="px-6 py-5 space-y-5 text-sm text-gray-700">

          <section>
            <h3 className="font-semibold text-blue-700 mb-1">¿Qué es esta herramienta?</h3>
            <p>Es una herramienta de autodiagnóstico y auditoría interna basada en la Norma CRESE 2025. Permite a la empresa evaluar su nivel de cumplimiento en los 25 requisitos agrupados en 7 temas, antes de someterse a la auditoría externa de certificación.</p>
          </section>

          <section>
            <h3 className="font-semibold text-blue-700 mb-1">¿Dónde se guardan los datos?</h3>
            <p>Los datos se guardan <strong>únicamente en el navegador web de este equipo</strong> (localStorage). No se envían a ningún servidor. Si borra el historial o caché del navegador, los datos se eliminarán. Por eso se recomienda exportar respaldos periódicamente.</p>
          </section>

          <section>
            <h3 className="font-semibold text-blue-700 mb-2">Pasos para realizar un diagnóstico</h3>
            <ol className="space-y-2 list-none">
              {[
                ['1', 'Crear un diagnóstico', 'Haga clic en "Nuevo diagnóstico / auditoría interna". Ingrese el nombre de la empresa, el responsable y el periodo de evaluación.'],
                ['2', 'Evaluar cada requisito', 'Dentro del diagnóstico verá los 25 requisitos organizados por tema. Haga clic en cada uno para abrirlo y completar su evaluación.'],
                ['3', 'Mínimos auditables', 'Cada requisito tiene mínimos auditables que deben cumplirse. Si alguno no se cumple, el requisito queda bloqueado con calificación 0.'],
                ['4', 'Criterios de evaluación', 'Si pasa los mínimos, evalúe cada criterio aplicable: EX (Existencia y funcionamiento), DC (Difusión y Conocimiento), PD (Participación directa), IM (Innovación o Mejora), VD (Vinculación con la dirección estratégica).'],
                ['5', 'Guardar', 'Presione "Guardar evaluación" al terminar cada requisito. El avance se guarda automáticamente en el navegador.'],
                ['6', 'Dashboard y reporte', 'Desde la lista de diagnósticos acceda al Dashboard para ver resultados por tema y criterio. Use "Descargar PDF" para generar el reporte completo.'],
                ['7', 'Exportar respaldo', 'Use el botón "Exportar" en cada diagnóstico para guardarlo como archivo .json en su equipo. Guárdelo en una carpeta segura como respaldo.'],
                ['8', 'Importar diagnóstico', 'Si tiene un archivo .json exportado previamente (desde este u otro equipo), use el botón "Importar diagnóstico" en la pantalla principal para cargarlo. Esto le permite continuar un diagnóstico en otro equipo o restaurar un respaldo.'],
              ].map(([num, titulo, desc]) => (
                <li key={num} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{num}</span>
                  <div><span className="font-medium text-gray-900">{titulo}: </span>{desc}</div>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h3 className="font-semibold text-blue-700 mb-1">Interpretación de resultados</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['bg-green-100 text-green-800', '90% – 100%', 'Empresa Ejemplar'],
                ['bg-green-100 text-green-800', '80% – 89%', 'Empresa Sobresaliente'],
                ['bg-orange-100 text-orange-800', '70% – 79%', 'Empresa Destacada'],
                ['bg-orange-100 text-orange-800', '60% – 69%', 'Empresa Comprometida'],
                ['bg-red-100 text-red-800', 'Menos de 60%', 'Por debajo del mínimo de certificación'],
              ].map(([cls, rango, cat]) => (
                <div key={cat} className={`rounded-lg px-3 py-2 ${cls}`}>
                  <p className="font-semibold">{rango}</p>
                  <p>{cat}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
            <strong>Importante:</strong> Esta herramienta no sustituye la auditoría externa de certificación CRESE. Su propósito es servir como evaluación previa de preparación.
          </section>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="btn-primary">Entendido</button>
        </div>
      </div>
    </div>
  );
}

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
  const [showInstructivo, setShowInstructivo] = useState(false);
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
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-10 mt-14 md:mt-0">
      {showInstructivo && <Instructivo onClose={() => setShowInstructivo(false)} />}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Diagnósticos / Auditorías Internas CRESE</h1>
        <div className="flex flex-wrap gap-2 mt-3">
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <button className="btn-secondary whitespace-nowrap" onClick={() => importRef.current.click()}>
            ↑ Importar diagnóstico
          </button>
          <button className="btn-primary whitespace-nowrap" onClick={() => setShowNew(true)}>
            <span>+</span> Nuevo diagnóstico / auditoría interna
          </button>
        </div>
        <button onClick={() => setShowInstructivo(true)} className="mt-2 text-xs text-blue-600 hover:text-blue-800 hover:underline">
          ℹ Ver instructivo de uso
        </button>
      </div>

      {showNew && (
        <div className="card p-6 mb-6 border-blue-100">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Nuevo Diagnóstico / Auditoría Interna</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="mt-8 space-y-3">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
            <span className="text-blue-500 text-lg mt-0.5">💾</span>
            <div>
              <p className="text-xs font-semibold text-blue-800 mb-0.5">Recordatorio: respalde sus datos periódicamente</p>
              <p className="text-xs text-blue-700">
                Los diagnósticos se guardan en este navegador. Si borra el caché o usa otro equipo, perderá la información.
                Use el botón <strong>Exportar</strong> en cada diagnóstico para guardar un archivo .json de respaldo en su equipo.
              </p>
            </div>
          </div>
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
            <p className="text-xs text-amber-700">
              <strong>Aviso:</strong> Esta herramienta no sustituye la auditoría externa de certificación CRESE.
              Su propósito es servir como una evaluación previa de preparación.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
