import normaData from './data/norma-crese.json';

const STORAGE_KEY = 'crese-diagnostico-v1';

// Ponderaciones por requisito (Norma CRESE 2025, pág. 45)
const PONDERACION_REQ = {
  1: 6.23, 2: 2.08, 3: 19.00, 4: 2.08, 5: 6.23,
  6: 6.23, 7: 4.15, 8: 4.15,  9: 4.15, 10: 4.15,
  11: 4.15, 12: 2.08, 13: 4.15, 14: 2.08, 15: 2.08,
  16: 2.08, 17: 2.08, 18: 2.08, 19: 2.08, 20: 2.08,
  21: 2.08, 22: 2.08, 23: 2.08, 24: 4.15, 25: 6.23,
};

// Pesos por criterio según requisito (Norma CRESE 2025, pág. 46)
// Criterios: 1=EX, 2=DC, 3=PD, 4=IM, 5=VD
function getPesosCriterios(reqNumero) {
  if (reqNumero === 3) return { 1: 1.00, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (reqNumero <= 5)  return { 1: 0.45, 2: 0.10, 3: 0.15, 4: 0.15, 5: 0.15 };
  return                      { 1: 0.50, 2: 0.10, 3: 0.15, 4: 0.15, 5: 0.10 };
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function defaultConfig() {
  return {
    nombre_organizacion: 'CRESE',
    correo_contacto: 'info@crese.org',
    version_norma: '2025',
    whatsapp_numero: '527222412988',
    whatsapp_mensaje: 'Hola. Estoy realizando la auditoría interna/autodiagnóstico CRESE 2025 y necesito apoyo.',
    aviso_legal: 'Esta herramienta de autodiagnóstico no sustituye la auditoría externa de certificación CRESE. Su propósito es servir como evaluación previa de preparación.',
  };
}

function getDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const db = JSON.parse(raw);
      if (!db.configuracion) db.configuracion = defaultConfig();
      let needsSave = false;

      // Migrate v1: reset req 3 evaluations saved before documentacion_detalle format
      const req3Def = normaData.requisitos.find(r => r.numero === 3);
      if (req3Def) {
        db.evaluaciones = db.evaluaciones.map(e => {
          if (e.requisito_id === req3Def.id && !e.documentacion_detalle) {
            needsSave = true;
            return { ...e, completado: false, puntuacion_total: null, puntuacion_criterio_1: null };
          }
          return e;
        });
      }

      // Migrate v2: recompute puntuacion_total for all evaluations using norm weights
      if (!db.scores_migrated_v2) {
        for (const e of db.evaluaciones) {
          if (!e.completado || e.bloqueado) continue;
          const reqDef = normaData.requisitos.find(r => r.id === e.requisito_id);
          if (!reqDef) continue;
          const pesos = getPesosCriterios(reqDef.numero);
          const criterios = reqDef.criterios_evaluables;
          const sc3 = criterios.includes(3)
            ? Math.round((Object.values(e.matriz_participacion || {}).filter(Boolean).length / 20) * 100)
            : null;
          const sc = {
            1: criterios.includes(1) ? (e.puntuacion_criterio_1 ?? null) : null,
            2: criterios.includes(2) ? (e.puntuacion_criterio_2 ?? null) : null,
            3: sc3,
            4: criterios.includes(4) ? (e.puntuacion_criterio_4 ?? null) : null,
            5: criterios.includes(5) ? (e.puntuacion_criterio_5 ?? null) : null,
          };
          let ws = 0, tw = 0;
          for (const c of [1, 2, 3, 4, 5]) {
            if (sc[c] != null && pesos[c] > 0) { ws += sc[c] * pesos[c]; tw += pesos[c]; }
          }
          if (tw > 0) e.puntuacion_total = ws / tw;
          e.puntuacion_criterio_3 = sc3;
        }
        for (const diag of db.diagnosticos) recalcScores(db, diag.id);
        db.scores_migrated_v2 = true;
        needsSave = true;
      }

      // Migrate v3: recompute req 3 score dividing over all 84 cells (not just filled ones)
      if (!db.scores_migrated_v3) {
        const req3DefM = normaData.requisitos.find(r => r.numero === 3);
        if (req3DefM) {
          const reqs5a25 = normaData.requisitos.filter(r => r.numero >= 5 && r.numero <= 25);
          const totalCeldas = reqs5a25.length * 4;
          for (const e of db.evaluaciones) {
            if (e.requisito_id !== req3DefM.id || !e.completado || e.bloqueado) continue;
            if (!e.documentacion_detalle) continue;
            const suma = reqs5a25.reduce((acc, r) => {
              const d = e.documentacion_detalle[r.id];
              if (!d) return acc;
              return acc + Object.values(d).reduce((s, v) => s + (v ?? 0), 0);
            }, 0);
            const newScore = totalCeldas > 0 ? suma / totalCeldas : 0;
            e.puntuacion_criterio_1 = newScore;
            e.puntuacion_total = newScore;
            needsSave = true;
          }
          if (needsSave) {
            for (const diag of db.diagnosticos) recalcScores(db, diag.id);
          }
        }
        db.scores_migrated_v3 = true;
        needsSave = true;
      }

      if (needsSave) localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
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

  // Puntaje parcial: promedio ponderado solo sobre los requisitos ya evaluados
  const sumPond = diagEvs.reduce((s, e) => {
    const req = normaData.requisitos.find(r => r.id === e.requisito_id);
    return s + (PONDERACION_REQ[req?.numero] || 0);
  }, 0);
  const parcial = diagEvs.length && sumPond > 0
    ? diagEvs.reduce((s, e) => {
        const req = normaData.requisitos.find(r => r.id === e.requisito_id);
        return s + (e.puntuacion_total || 0) * (PONDERACION_REQ[req?.numero] || 0);
      }, 0) / sumPond
    : null;

  // Puntaje proyectado: suma ponderada sobre los 100 pts totales (no evaluados = 0)
  const proyectado = diagEvs.length
    ? diagEvs.reduce((s, e) => {
        const req = normaData.requisitos.find(r => r.id === e.requisito_id);
        return s + (e.puntuacion_total || 0) * (PONDERACION_REQ[req?.numero] || 0) / 100;
      }, 0)
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

      // Para req 3: promedio sobre los 84 campos totales (21 req × 4 campos), vacíos = 0
      let scoreC1 = body.puntuacion_criterio_1 ?? null;
      if (reqDef.numero === 3 && body.documentacion_detalle) {
        const reqs5a25 = normaData.requisitos.filter(r => r.numero >= 5 && r.numero <= 25);
        const totalCeldas = reqs5a25.length * 4;
        const suma = reqs5a25.reduce((acc, r) => {
          const d = body.documentacion_detalle[r.id];
          if (!d) return acc;
          return acc + Object.values(d).reduce((s, v) => s + (v ?? 0), 0);
        }, 0);
        scoreC1 = totalCeldas > 0 ? suma / totalCeldas : null;
      }

      let puntuacion_total = null;
      if (body.completado) {
        if (body.bloqueado) {
          puntuacion_total = 0;
        } else {
          const pesos = getPesosCriterios(reqDef.numero);
          const scoreC3 = criterios.includes(3)
            ? Math.round((Object.values(body.matriz_participacion || {}).filter(Boolean).length / 20) * 100)
            : null;
          const scores = {
            1: criterios.includes(1) ? scoreC1 : null,
            2: criterios.includes(2) ? (body.puntuacion_criterio_2 ?? null) : null,
            3: scoreC3,
            4: criterios.includes(4) ? (body.puntuacion_criterio_4 ?? null) : null,
            5: criterios.includes(5) ? (body.puntuacion_criterio_5 ?? null) : null,
          };
          let weightedSum = 0, totalWeight = 0;
          for (const c of [1, 2, 3, 4, 5]) {
            if (scores[c] != null && pesos[c] > 0) {
              weightedSum += scores[c] * pesos[c];
              totalWeight += pesos[c];
            }
          }
          if (totalWeight > 0) puntuacion_total = weightedSum / totalWeight;
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
        documentacion_detalle: body.documentacion_detalle || null,
        puntuacion_criterio_1: scoreC1,
        puntuacion_criterio_2: body.puntuacion_criterio_2 ?? null,
        puntuacion_criterio_3: criterios.includes(3)
          ? Math.round((Object.values(body.matriz_participacion || {}).filter(Boolean).length / 20) * 100) : null,
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
