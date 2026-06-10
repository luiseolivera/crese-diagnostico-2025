import normaData from './data/norma-crese.json';

const STORAGE_KEY = 'crese-diagnostico-v1';

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function defaultConfig() {
  return {
    nombre_organizacion: 'CRESE',
    correo_contacto: 'info@crese.org',
    version_norma: '2025',
    whatsapp_numero: '527222412988',
    whatsapp_mensaje: 'Hola. Estoy realizando el autodiagnóstico CRESE 2025 y necesito apoyo.',
    aviso_legal: 'Esta herramienta de autodiagnóstico no sustituye la auditoría externa de certificación CRESE. Su propósito es servir como evaluación previa de preparación.',
  };
}

function getDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const db = JSON.parse(raw);
      if (!db.configuracion) db.configuracion = defaultConfig();
      return db;
    }
  } catch {}
  return { diagnosticos: [], evaluaciones: [], configuracion: defaultConfig() };
}

function saveDB(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function recalcScores(db, diagId) {
  const diagEvs = db.evaluaciones.filter(e => e.diagnostico_id === diagId && e.completado);
  const parcial = diagEvs.length
    ? diagEvs.reduce((s, e) => s + (e.puntuacion_total || 0), 0) / diagEvs.length
    : null;
  const proyectado = diagEvs.length
    ? diagEvs.reduce((s, e) => s + (e.puntuacion_total || 0), 0) / 25
    : null;
  const diag = db.diagnosticos.find(d => d.id === diagId);
  if (diag) {
    diag.puntuacion_global = parcial;
    diag.puntuacion_proyectada = proyectado;
    diag.updated_at = new Date().toISOString();
  }
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const api = {
  norma: () => Promise.resolve(normaData),

  config: {
    get: () => Promise.resolve({ ...getDB().configuracion }),
    set: (data) => {
      const db = getDB();
      Object.assign(db.configuracion, data);
      saveDB(db);
      return Promise.resolve({ ok: true });
    },
  },

  diagnosticos: {
    list: () => {
      const db = getDB();
      return Promise.resolve([...db.diagnosticos].sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
    },
    get: (id) => {
      const db = getDB();
      const diag = db.diagnosticos.find(d => d.id === id);
      if (!diag) return Promise.reject(new Error('No encontrado'));
      const evaluaciones = db.evaluaciones.filter(e => e.diagnostico_id === id);
      return Promise.resolve({ ...diag, evaluaciones });
    },
    create: (data) => {
      const db = getDB();
      const id = uid();
      const now = new Date().toISOString();
      db.diagnosticos.push({
        id,
        nombre_empresa: data.nombre_empresa,
        responsable: data.responsable || '',
        periodo_inicio: data.periodo_inicio || '',
        periodo_fin: data.periodo_fin || '',
        estado: 'en_progreso',
        puntuacion_global: null,
        puntuacion_proyectada: null,
        created_at: now,
        updated_at: now,
      });
      saveDB(db);
      return Promise.resolve({ id });
    },
    update: (id, data) => {
      const db = getDB();
      const d = db.diagnosticos.find(x => x.id === id);
      if (d) Object.assign(d, { ...data, updated_at: new Date().toISOString() });
      saveDB(db);
      return Promise.resolve({ ok: true });
    },
    delete: (id) => {
      const db = getDB();
      db.diagnosticos = db.diagnosticos.filter(d => d.id !== id);
      db.evaluaciones = db.evaluaciones.filter(e => e.diagnostico_id !== id);
      saveDB(db);
      return Promise.resolve({ ok: true });
    },
    exportDiag: (id) => {
      const db = getDB();
      const diag = db.diagnosticos.find(d => d.id === id);
      if (!diag) return;
      const evaluaciones = db.evaluaciones.filter(e => e.diagnostico_id === id);
      const filename = `crese-${diag.nombre_empresa.replace(/\s+/g, '_').replace(/[^\w-]/g, '')}.json`;
      downloadJSON({ version: '1.0', exportado: new Date().toISOString(), diagnostico: diag, evaluaciones }, filename);
    },
    import: (data) => {
      const db = getDB();
      const newId = uid();
      const now = new Date().toISOString();
      db.diagnosticos.push({
        ...data.diagnostico,
        id: newId,
        nombre_empresa: data.diagnostico.nombre_empresa + ' (importado)',
        updated_at: now,
      });
      for (const e of (data.evaluaciones || [])) {
        db.evaluaciones.push({ ...e, id: uid(), diagnostico_id: newId });
      }
      saveDB(db);
      return Promise.resolve({ id: newId });
    },
  },

  evaluaciones: {
    list: (diagId) => {
      const db = getDB();
      return Promise.resolve(db.evaluaciones.filter(e => e.diagnostico_id === diagId));
    },
    save: (diagId, reqId, body) => {
      const db = getDB();
      const reqIdNum = parseInt(reqId);
      const reqDef = normaData.requisitos.find(r => r.id === reqIdNum);
      const criterios = reqDef.criterios_evaluables;

      let puntuacion_total = null;
      if (body.completado) {
        if (body.bloqueado) {
          puntuacion_total = 0;
        } else {
          const vals = [];
          if (criterios.includes(1) && body.puntuacion_criterio_1 != null) vals.push(body.puntuacion_criterio_1);
          if (criterios.includes(2) && body.puntuacion_criterio_2 != null) vals.push(body.puntuacion_criterio_2);
          if (criterios.includes(3)) {
            const cumple = Object.values(body.matriz_participacion || {}).filter(Boolean).length;
            vals.push(Math.round((cumple / 20) * 100));
          }
          if (criterios.includes(4) && body.puntuacion_criterio_4 != null) vals.push(body.puntuacion_criterio_4);
          if (criterios.includes(5) && body.puntuacion_criterio_5 != null) vals.push(body.puntuacion_criterio_5);
          if (vals.length > 0) puntuacion_total = vals.reduce((a, b) => a + b, 0) / vals.length;
        }
      }

      const existing = db.evaluaciones.findIndex(e => e.diagnostico_id === diagId && e.requisito_id === reqIdNum);
      const record = {
        id: existing >= 0 ? db.evaluaciones[existing].id : uid(),
        diagnostico_id: diagId,
        requisito_id: reqIdNum,
        minimos_cumplidos: body.minimos_cumplidos,
        minimos_detalle: body.minimos_detalle || {},
        indicadores_obligatorios_detalle: body.indicadores_obligatorios_detalle || {},
        bloqueado: !!body.bloqueado,
        existencia_subelementos: body.existencia_subelementos || null,
        puntuacion_criterio_1: body.puntuacion_criterio_1 ?? null,
        puntuacion_criterio_2: body.puntuacion_criterio_2 ?? null,
        puntuacion_criterio_3: body.puntuacion_criterio_3 ?? null,
        puntuacion_criterio_4: body.puntuacion_criterio_4 ?? null,
        puntuacion_criterio_5: body.puntuacion_criterio_5 ?? null,
        notas_criterio_1: body.notas_criterio_1 || '',
        notas_criterio_2: body.notas_criterio_2 || '',
        notas_criterio_3: body.notas_criterio_3 || '',
        notas_criterio_4: body.notas_criterio_4 || '',
        notas_criterio_5: body.notas_criterio_5 || '',
        matriz_participacion: body.matriz_participacion || {},
        puntuacion_total,
        completado: !!body.completado,
        updated_at: new Date().toISOString(),
      };

      if (existing >= 0) db.evaluaciones[existing] = record;
      else db.evaluaciones.push(record);

      recalcScores(db, diagId);
      saveDB(db);
      return Promise.resolve({ ok: true, puntuacion_total });
    },
  },
};
