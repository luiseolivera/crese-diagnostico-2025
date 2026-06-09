const express = require('express');
const cors = require('cors');
const db = require('./database');
const norma = require('./data/norma-crese.json');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const save = () => db.write();

// --- Norma ---
app.get('/api/norma', (req, res) => res.json(norma));

// --- Config ---
app.get('/api/config', (req, res) => res.json(db.data.configuracion));
app.put('/api/config', (req, res) => {
  Object.assign(db.data.configuracion, req.body);
  save();
  res.json({ ok: true });
});

// --- Diagnósticos ---
app.get('/api/diagnosticos', (req, res) => {
  const list = [...db.data.diagnosticos].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  res.json(list);
});

app.get('/api/diagnosticos/:id', (req, res) => {
  const diag = db.data.diagnosticos.find(d => d.id === req.params.id);
  if (!diag) return res.status(404).json({ error: 'No encontrado' });
  const evaluaciones = db.data.evaluaciones.filter(e => e.diagnostico_id === req.params.id);
  res.json({ ...diag, evaluaciones });
});

app.post('/api/diagnosticos', (req, res) => {
  const id = uuidv4();
  const now = new Date().toISOString();
  const diag = {
    id,
    nombre_empresa: req.body.nombre_empresa,
    responsable: req.body.responsable || '',
    periodo_inicio: req.body.periodo_inicio || '',
    periodo_fin: req.body.periodo_fin || '',
    estado: 'en_progreso',
    puntuacion_global: null,
    puntuacion_proyectada: null,
    created_at: now,
    updated_at: now,
  };
  db.data.diagnosticos.push(diag);
  save();
  res.json({ id });
});

app.put('/api/diagnosticos/:id', (req, res) => {
  const d = db.data.diagnosticos.find(x => x.id === req.params.id);
  if (!d) return res.status(404).json({ error: 'No encontrado' });
  Object.assign(d, { ...req.body, updated_at: new Date().toISOString() });
  save();
  res.json({ ok: true });
});

app.delete('/api/diagnosticos/:id', (req, res) => {
  db.data.diagnosticos = db.data.diagnosticos.filter(d => d.id !== req.params.id);
  db.data.evaluaciones = db.data.evaluaciones.filter(e => e.diagnostico_id !== req.params.id);
  save();
  res.json({ ok: true });
});

// --- Evaluaciones ---
app.get('/api/diagnosticos/:id/evaluaciones', (req, res) => {
  res.json(db.data.evaluaciones.filter(e => e.diagnostico_id === req.params.id));
});

app.put('/api/diagnosticos/:id/evaluaciones/:reqId', (req, res) => {
  const { id, reqId } = req.params;
  const reqIdNum = parseInt(reqId);
  const body = req.body;

  const reqDef = norma.requisitos.find(r => r.id === reqIdNum);
  const criterios = reqDef.criterios_evaluables;

  let puntuacion_total = null;
  if (body.completado) {
    if (body.bloqueado) {
      puntuacion_total = 0;
    } else {
      const vals = [];
      if (criterios.includes(1) && body.puntuacion_criterio_1 !== null && body.puntuacion_criterio_1 !== undefined) vals.push(body.puntuacion_criterio_1);
      if (criterios.includes(2) && body.puntuacion_criterio_2 !== null && body.puntuacion_criterio_2 !== undefined) vals.push(body.puntuacion_criterio_2);
      if (criterios.includes(3)) {
        const cumple = Object.values(body.matriz_participacion || {}).filter(Boolean).length;
        vals.push(Math.round((cumple / 20) * 100));
      }
      if (criterios.includes(4) && body.puntuacion_criterio_4 !== null && body.puntuacion_criterio_4 !== undefined) vals.push(body.puntuacion_criterio_4);
      if (criterios.includes(5) && body.puntuacion_criterio_5 !== null && body.puntuacion_criterio_5 !== undefined) vals.push(body.puntuacion_criterio_5);
      if (vals.length > 0) puntuacion_total = vals.reduce((a, b) => a + b, 0) / vals.length;
    }
  }

  const existing = db.data.evaluaciones.findIndex(e => e.diagnostico_id === id && e.requisito_id === reqIdNum);
  const record = {
    id: existing >= 0 ? db.data.evaluaciones[existing].id : uuidv4(),
    diagnostico_id: id,
    requisito_id: reqIdNum,
    minimos_cumplidos: body.minimos_cumplidos,
    minimos_detalle: body.minimos_detalle || {},
    bloqueado: !!body.bloqueado,
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

  if (existing >= 0) db.data.evaluaciones[existing] = record;
  else db.data.evaluaciones.push(record);

  // Recalculate scores
  const diagEvs = db.data.evaluaciones.filter(e => e.diagnostico_id === id && e.completado);

  // Puntaje parcial: promedio de los evaluados
  const parcial = diagEvs.length
    ? diagEvs.reduce((s, e) => s + (e.puntuacion_total || 0), 0) / diagEvs.length
    : null;

  // Puntaje proyectado: promedio sobre los 25 requisitos (no evaluados = 0)
  const totalReqs = 25;
  const proyectado = diagEvs.length
    ? diagEvs.reduce((s, e) => s + (e.puntuacion_total || 0), 0) / totalReqs
    : null;

  const diag = db.data.diagnosticos.find(d => d.id === id);
  if (diag) {
    diag.puntuacion_global = parcial;
    diag.puntuacion_proyectada = proyectado;
    diag.updated_at = new Date().toISOString();
  }

  save();
  res.json({ ok: true, puntuacion_total });
});

// --- Export / Import ---
app.get('/api/diagnosticos/:id/export', (req, res) => {
  const diag = db.data.diagnosticos.find(d => d.id === req.params.id);
  if (!diag) return res.status(404).json({ error: 'No encontrado' });
  const evaluaciones = db.data.evaluaciones.filter(e => e.diagnostico_id === req.params.id);
  const filename = `crese-${diag.nombre_empresa.replace(/\s+/g, '_').replace(/[^\w-]/g, '')}.json`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.json({ version: '1.0', exportado: new Date().toISOString(), diagnostico: diag, evaluaciones });
});

app.post('/api/diagnosticos/import', (req, res) => {
  const { diagnostico, evaluaciones } = req.body;
  const newId = uuidv4();
  const now = new Date().toISOString();
  db.data.diagnosticos.push({
    ...diagnostico,
    id: newId,
    nombre_empresa: diagnostico.nombre_empresa + ' (importado)',
    updated_at: now,
  });
  for (const e of (evaluaciones || [])) {
    db.data.evaluaciones.push({ ...e, id: uuidv4(), diagnostico_id: newId });
  }
  save();
  res.json({ id: newId });
});

// --- PDF ---
app.get('/api/diagnosticos/:id/pdf', (req, res) => {
  const diag = db.data.diagnosticos.find(d => d.id === req.params.id);
  if (!diag) return res.status(404).json({ error: 'No encontrado' });
  const evals = db.data.evaluaciones.filter(e => e.diagnostico_id === req.params.id);
  const evalMap = {};
  for (const e of evals) evalMap[e.requisito_id] = e;

  const MARGIN = 55;
  const PAGE_W = 612; // US Letter points
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const doc = new PDFDocument({ margin: MARGIN, size: 'LETTER' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="reporte-crese-${Date.now()}.pdf"`);
  doc.pipe(res);

  const BLUE = '#1e40af';
  const GRAY = '#9ca3af';
  const DARK = '#1f2937';
  const GREEN = '#16a34a';
  const ORANGE = '#ea580c';
  const RED = '#dc2626';
  const LIGHT_GRAY = '#f3f4f6';

  const sc = s => (s >= 80 ? GREEN : s >= 60 ? ORANGE : RED);

  const categoria = (s) => {
    if (s >= 90) return 'Empresa Ejemplar';
    if (s >= 80) return 'Empresa Sobresaliente';
    if (s >= 70) return 'Empresa Destacada';
    if (s >= 60) return 'Empresa Comprometida';
    return 'Por debajo del mínimo de certificación';
  };

  const drawHRule = (y, color = '#e5e7eb') => {
    doc.save().moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).lineWidth(0.5).strokeColor(color).stroke().restore();
  };

  const drawFilledRect = (x, y, w, h, color) => {
    doc.save().rect(x, y, w, h).fillColor(color).fill().restore();
  };

  // ── PORTADA ──────────────────────────────────────────────────────────────
  drawFilledRect(0, 0, PAGE_W, 200, BLUE);
  doc.fontSize(26).fillColor('white').font('Helvetica-Bold')
    .text('Reporte de Autodiagnóstico', MARGIN, 55, { width: CONTENT_W, align: 'center' });
  doc.fontSize(14).fillColor('#bfdbfe').font('Helvetica')
    .text('Norma CRESE 2025', MARGIN, 92, { width: CONTENT_W, align: 'center' });
  doc.fontSize(9).fillColor('#93c5fd')
    .text(`Generado el ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      MARGIN, 115, { width: CONTENT_W, align: 'center' });

  doc.y = 220;

  // ── DATOS DE LA EMPRESA ──────────────────────────────────────────────────
  doc.fontSize(11).fillColor(BLUE).font('Helvetica-Bold').text('INFORMACIÓN DE LA EMPRESA', MARGIN, doc.y);
  drawHRule(doc.y + 4, BLUE);
  doc.moveDown(0.8);

  const infoRows = [
    ['Empresa', diag.nombre_empresa],
    ['Responsable', diag.responsable || 'No especificado'],
    ['Periodo evaluado', diag.periodo_inicio ? `${diag.periodo_inicio}  a  ${diag.periodo_fin}` : 'No especificado'],
    ['Fecha del diagnóstico', new Date(diag.created_at).toLocaleDateString('es-MX')],
  ];

  for (const [label, value] of infoRows) {
    doc.fontSize(9).fillColor(GRAY).font('Helvetica').text(label.toUpperCase(), MARGIN, doc.y, { continued: false });
    doc.fontSize(10).fillColor(DARK).font('Helvetica').text(value, MARGIN, doc.y, { width: CONTENT_W });
    doc.moveDown(0.4);
  }

  doc.moveDown(0.5);

  // ── RESULTADO GLOBAL ─────────────────────────────────────────────────────
  doc.fontSize(11).fillColor(BLUE).font('Helvetica-Bold').text('RESULTADO GLOBAL', MARGIN, doc.y);
  drawHRule(doc.y + 4, BLUE);
  doc.moveDown(0.8);

  const parcial = diag.puntuacion_global || 0;
  const proyectado = diag.puntuacion_proyectada || 0;
  const completadas = evals.filter(e => e.completado).length;

  // Score boxes side by side
  const boxW = (CONTENT_W - 10) / 2;
  const boxY = doc.y;
  const boxH = 70;

  // Box 1: Puntaje parcial
  drawFilledRect(MARGIN, boxY, boxW, boxH, '#f0f9ff');
  doc.save().rect(MARGIN, boxY, boxW, boxH).lineWidth(1).strokeColor('#bae6fd').stroke().restore();
  doc.fontSize(8).fillColor(GRAY).font('Helvetica')
    .text('PUNTAJE PARCIAL', MARGIN, boxY + 10, { width: boxW, align: 'center' });
  doc.fontSize(8).fillColor(GRAY)
    .text(`(${completadas} de 25 evaluados)`, MARGIN, boxY + 20, { width: boxW, align: 'center' });
  doc.fontSize(22).fillColor(sc(parcial)).font('Helvetica-Bold')
    .text(`${parcial.toFixed(1)}%`, MARGIN, boxY + 30, { width: boxW, align: 'center' });

  // Box 2: Puntaje proyectado
  const box2X = MARGIN + boxW + 10;
  drawFilledRect(box2X, boxY, boxW, boxH, '#fefce8');
  doc.save().rect(box2X, boxY, boxW, boxH).lineWidth(1).strokeColor('#fde68a').stroke().restore();
  doc.fontSize(8).fillColor(GRAY).font('Helvetica')
    .text('PUNTAJE PROYECTADO', box2X, boxY + 10, { width: boxW, align: 'center' });
  doc.fontSize(8).fillColor(GRAY)
    .text('(sobre 25 requisitos)', box2X, boxY + 20, { width: boxW, align: 'center' });
  doc.fontSize(22).fillColor(sc(proyectado)).font('Helvetica-Bold')
    .text(`${proyectado.toFixed(1)}%`, box2X, boxY + 30, { width: boxW, align: 'center' });

  doc.y = boxY + boxH + 8;

  // Categoria
  doc.fontSize(10).fillColor(sc(proyectado)).font('Helvetica-Bold')
    .text(`Categoría estimada: ${categoria(proyectado)}`, MARGIN, doc.y, { width: CONTENT_W, align: 'center' });
  doc.moveDown(0.4);
  doc.fontSize(8).fillColor(GRAY).font('Helvetica')
    .text('El puntaje proyectado considera los 25 requisitos; los no evaluados se computan como 0.',
      MARGIN, doc.y, { width: CONTENT_W, align: 'center' });
  doc.moveDown(1);

  // ── RESULTADOS POR REQUISITO ─────────────────────────────────────────────
  doc.fontSize(11).fillColor(BLUE).font('Helvetica-Bold').text('RESULTADOS POR REQUISITO', MARGIN, doc.y);
  drawHRule(doc.y + 4, BLUE);
  doc.moveDown(0.8);

  const COL_NUM = MARGIN;
  const COL_NAME = MARGIN + 24;
  const COL_SCORE = PAGE_W - MARGIN - 60;
  const NAME_W = COL_SCORE - COL_NAME - 4;

  for (const tema of norma.temas) {
    // Ensure enough space for tema header + at least one row
    if (doc.y > 680) doc.addPage();

    drawFilledRect(MARGIN, doc.y, CONTENT_W, 16, '#eff6ff');
    doc.fontSize(9).fillColor(BLUE).font('Helvetica-Bold')
      .text(`Tema ${tema.id}: ${tema.nombre}`, MARGIN + 4, doc.y + 3, { width: CONTENT_W - 8 });
    doc.y += 18;

    for (const rId of tema.requisitos) {
      if (doc.y > 700) doc.addPage();

      const req = norma.requisitos.find(r => r.id === rId);
      const ev = evalMap[rId];
      const pts = ev?.puntuacion_total;
      const bloqueado = ev?.bloqueado;

      let statusText, statusColor;
      if (!ev) { statusText = 'Sin evaluar'; statusColor = GRAY; }
      else if (bloqueado) { statusText = 'No Cumple'; statusColor = RED; }
      else if (!ev.completado) { statusText = 'En progreso'; statusColor = '#3b82f6'; }
      else { statusText = `${pts.toFixed(0)}%`; statusColor = sc(pts); }

      // Row background alternate
      const rowY = doc.y;

      // Number
      doc.fontSize(8).fillColor(GRAY).font('Helvetica')
        .text(`${req.numero}.`, COL_NUM, rowY + 2, { width: 20 });

      // Name — truncate to fit
      const nameText = req.nombre.length > 52 ? req.nombre.substring(0, 50) + '…' : req.nombre;
      doc.fontSize(9).fillColor(DARK).font('Helvetica')
        .text(nameText, COL_NAME, rowY + 2, { width: NAME_W, lineBreak: false });

      // Score bar background
      const barX = COL_SCORE;
      const barW = 55;
      const barH = 10;
      const barY = rowY + 3;
      drawFilledRect(barX, barY, barW, barH, '#f3f4f6');

      if (ev?.completado && pts !== null && !bloqueado) {
        drawFilledRect(barX, barY, Math.round(barW * pts / 100), barH, statusColor);
      }

      // Score text
      doc.fontSize(8).fillColor(statusColor).font('Helvetica-Bold')
        .text(statusText, barX + barW + 4, rowY + 2, { width: 40, lineBreak: false });

      doc.y = rowY + 16;
      drawHRule(doc.y - 1, '#f3f4f6');
    }
    doc.moveDown(0.3);
  }

  // ── ANÁLISIS ─────────────────────────────────────────────────────────────
  doc.addPage();
  doc.fontSize(11).fillColor(BLUE).font('Helvetica-Bold').text('ANÁLISIS DETALLADO', MARGIN, doc.y);
  drawHRule(doc.y + 4, BLUE);
  doc.moveDown(0.8);

  const completadasList = evals.filter(e => e.completado && !e.bloqueado && e.puntuacion_total !== null);
  const bloqueadosList = evals.filter(e => e.bloqueado);
  const fortalezas = [...completadasList].sort((a, b) => b.puntuacion_total - a.puntuacion_total).slice(0, 5);
  const oportunidades = [...completadasList].filter(e => e.puntuacion_total < 60)
    .sort((a, b) => a.puntuacion_total - b.puntuacion_total).slice(0, 5);

  const drawSection = (title, color, items, renderItem) => {
    if (!items.length) return;
    doc.fontSize(10).fillColor(color).font('Helvetica-Bold').text(title, MARGIN, doc.y);
    doc.moveDown(0.3);
    for (const item of items) {
      if (doc.y > 700) doc.addPage();
      renderItem(item);
      doc.moveDown(0.2);
    }
    doc.moveDown(0.5);
  };

  drawSection('Fortalezas principales (≥75%)', GREEN, fortalezas, (e) => {
    const req = norma.requisitos.find(r => r.id === e.requisito_id);
    doc.fontSize(9).fillColor(DARK).font('Helvetica')
      .text(`  ✓  Req. ${req.numero} — ${req.nombre}`, MARGIN, doc.y, { continued: true, width: CONTENT_W - 50 });
    doc.fillColor(GREEN).font('Helvetica-Bold').text(`  ${e.puntuacion_total.toFixed(0)}%`, { align: 'right' });
  });

  drawSection('Áreas prioritarias de mejora (<60%)', ORANGE, oportunidades, (e) => {
    const req = norma.requisitos.find(r => r.id === e.requisito_id);
    doc.fontSize(9).fillColor(DARK).font('Helvetica')
      .text(`  ⚠  Req. ${req.numero} — ${req.nombre}`, MARGIN, doc.y, { continued: true, width: CONTENT_W - 50 });
    doc.fillColor(ORANGE).font('Helvetica-Bold').text(`  ${e.puntuacion_total.toFixed(0)}%`, { align: 'right' });
  });

  drawSection('Requisitos bloqueados por mínimos auditables', RED, bloqueadosList, (e) => {
    const req = norma.requisitos.find(r => r.id === e.requisito_id);
    doc.fontSize(9).fillColor(DARK).font('Helvetica')
      .text(`  ✗  Req. ${req.numero} — ${req.nombre}: No cumple mínimos auditables`, MARGIN, doc.y, { width: CONTENT_W });
  });

  // Criteria averages
  if (completadasList.length > 0) {
    doc.fontSize(10).fillColor(BLUE).font('Helvetica-Bold').text('Promedio por criterio de evaluación', MARGIN, doc.y);
    doc.moveDown(0.4);
    const crNames = ['Existencia y Funcionamiento', 'Difusión y Conocimiento', 'Participación Directa', 'Innovación o Mejora', 'Vinculación Estratégica'];
    const crKeys = ['puntuacion_criterio_1','puntuacion_criterio_2','puntuacion_criterio_3','puntuacion_criterio_4','puntuacion_criterio_5'];
    for (let i = 0; i < 5; i++) {
      const vals = completadasList.map(e => e[crKeys[i]]).filter(v => v !== null && v !== undefined);
      if (!vals.length) continue;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const barW = 120;
      const barY = doc.y + 3;
      drawFilledRect(MARGIN + 180, barY, barW, 9, '#f3f4f6');
      drawFilledRect(MARGIN + 180, barY, Math.round(barW * avg / 100), 9, sc(avg));
      doc.fontSize(9).fillColor(DARK).font('Helvetica')
        .text(`  ${crNames[i]}`, MARGIN, doc.y, { width: 175, lineBreak: false });
      doc.fontSize(8).fillColor(sc(avg)).font('Helvetica-Bold')
        .text(`${avg.toFixed(0)}%`, MARGIN + 308, doc.y, { width: 40 });
      doc.y += 15;
    }
  }

  // ── PIE ──────────────────────────────────────────────────────────────────
  doc.moveDown(2);
  drawHRule(doc.y, '#e5e7eb');
  doc.moveDown(0.5);
  doc.fontSize(7.5).fillColor(GRAY).font('Helvetica')
    .text(
      db.data.configuracion.aviso_legal ||
      'Esta herramienta de autodiagnóstico no sustituye la auditoría externa de certificación CRESE. Su propósito es servir como evaluación previa de preparación.',
      MARGIN, doc.y, { width: CONTENT_W, align: 'center' }
    );

  doc.end();
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n✅ CRESE Autodiagnóstico — servidor en http://localhost:${PORT}`);
  console.log(`   Datos: ${require('os').homedir()}/.crese-diagnostico/db.json\n`);
});
