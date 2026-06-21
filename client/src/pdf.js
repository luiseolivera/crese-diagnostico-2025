import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Design tokens ─────────────────────────────────────────────────────────────
const G    = [26, 100, 74];       // accent: institutional dark green
const G_BG = [232, 245, 237];     // accent very-light tint
const G_DK = [16, 70, 52];        // darker green (score box bg)
const C900 = [17, 24, 39];
const C700 = [55, 65, 81];
const C500 = [107, 114, 128];
const C400 = [156, 163, 175];
const C200 = [229, 231, 235];
const C100 = [243, 244, 246];

const sc = s => {
  if (s == null) return C400;
  if (s >= 80)  return [26, 100, 74];   // accent green
  if (s >= 60)  return [140, 100, 25];  // dark amber
  return [165, 48, 48];                  // dark red
};

const categoria = s => {
  if (s >= 90) return 'Empresa Ejemplar';
  if (s >= 80) return 'Empresa Sobresaliente';
  if (s >= 70) return 'Empresa Destacada';
  if (s >= 60) return 'Empresa Comprometida';
  return 'Por debajo del mínimo de certificación';
};

export function generarPDF(diag, evaluaciones, norma, config) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const W  = doc.internal.pageSize.getWidth();   // 612
  const H  = doc.internal.pageSize.getHeight();  // 792
  const ML = 54, MR = 54;
  const CW = W - ML - MR;  // 504

  const evalMap = {};
  for (const e of evaluaciones) evalMap[e.requisito_id] = e;

  const parcial     = diag.puntuacion_global     || 0;
  const proyectado  = diag.puntuacion_proyectada || 0;
  const completadas = evaluaciones.filter(e => e.completado);
  const conPunt     = completadas.filter(e => !e.bloqueado && e.puntuacion_total !== null);
  const bloqueados  = completadas.filter(e => e.bloqueado);
  const fortalezas  = [...conPunt].sort((a, b) => b.puntuacion_total - a.puntuacion_total).slice(0, 5);
  const oportunidades = [...conPunt].filter(e => e.puntuacion_total < 60)
                        .sort((a, b) => a.puntuacion_total - b.puntuacion_total).slice(0, 5);

  const fechaGen  = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const fechaDiag = diag.created_at ? new Date(diag.created_at).toLocaleDateString('es-MX') : '—';
  const empresa   = diag.nombre_empresa || '';

  // ── Shared helpers ────────────────────────────────────────────────────────

  const pageHeader = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C400);
    doc.text('REPORTE DE DIAGNÓSTICO / AUDITORÍA INTERNA CRESE', ML, 26);
    doc.text('NORMA CRESE 2025', W - MR, 26, { align: 'right' });
    doc.setDrawColor(...C200);
    doc.setLineWidth(0.3);
    doc.line(ML, 31, W - MR, 31);
  };

  const sectionHeading = (text, y) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...G);
    doc.text(text, ML, y);
    y += 5;
    doc.setDrawColor(...G);
    doc.setLineWidth(0.8);
    doc.line(ML, y, W - MR, y);
    return y + 14;
  };

  const miniBar = (x, y, pct, bw = 90, bh = 3) => {
    doc.setFillColor(...C200);
    doc.rect(x, y, bw, bh, 'F');
    if (pct > 0) {
      doc.setFillColor(...sc(pct));
      doc.rect(x, y, Math.max(2, Math.round(bw * pct / 100)), bh, 'F');
    }
  };

  // autoTable hook: header on every new page created by the table
  const atDidDrawPage = (data) => {
    if (data.pageNumber > 1) pageHeader();
  };

  // ── PAGE 1 — PORTADA ──────────────────────────────────────────────────────
  pageHeader();
  let y = 68;

  // Main title — large
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(...C900);
  const titleLines = doc.splitTextToSize('Reporte de Diagnóstico / Auditoría Interna CRESE', CW);
  doc.text(titleLines, ML, y);
  y += titleLines.length * 36 + 2;

  // Decorative rule
  doc.setDrawColor(...G);
  doc.setLineWidth(2.5);
  doc.line(ML, y, ML + 72, y);
  y += 18;

  // Generation date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...C500);
  doc.text(`Generado el ${fechaGen}`, ML, y);
  y += 30;

  // Score box (dark green)
  const sbH  = 94;
  const half = CW / 2;
  doc.setFillColor(...G_DK);
  doc.roundedRect(ML, y, CW, sbH, 4, 4, 'F');

  // left: parcial
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(180, 220, 200);
  doc.text('PUNTAJE PARCIAL', ML + 18, y + 17);
  doc.setFontSize(34);
  doc.setTextColor(255, 255, 255);
  doc.text(`${parcial.toFixed(1)}%`, ML + 18, y + 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(160, 210, 185);
  doc.text(`${completadas.length} de 25 requisitos evaluados`, ML + 18, y + 76);

  // divider
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.line(ML + half, y + 14, ML + half, y + sbH - 14);

  // right: proyectado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(180, 220, 200);
  doc.text('PUNTAJE PROYECTADO', ML + half + 18, y + 17);
  doc.setFontSize(34);
  doc.setTextColor(255, 255, 255);
  doc.text(`${proyectado.toFixed(1)}%`, ML + half + 18, y + 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(160, 210, 185);
  doc.text('sobre los 25 requisitos', ML + half + 18, y + 76);

  y += sbH + 14;

  // Category note
  const noteText = `El puntaje proyectado considera los 25 requisitos; los no evaluados se computan como 0.`;
  const noteLines = doc.splitTextToSize(noteText, CW - 22);
  const noteH = Math.max(38, noteLines.length * 12 + 22);
  doc.setFillColor(...C100);
  doc.setDrawColor(...C200);
  doc.setLineWidth(0.4);
  doc.roundedRect(ML, y, CW, noteH, 2, 2, 'FD');
  doc.setFillColor(...G);
  doc.rect(ML, y, 3.5, noteH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C700);
  const catLabel = 'Categoría estimada: ';
  const catValue = `${categoria(proyectado)}.`;
  doc.text(catLabel, ML + 12, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.text(catValue, ML + 12 + doc.getTextWidth(catLabel), y + 14);
  doc.setFontSize(7.5);
  doc.setTextColor(...C500);
  doc.text(noteLines, ML + 12, y + 26);

  y += noteH + 20;

  // Company info heading
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...G);
  doc.text('INFORMACIÓN DE LA EMPRESA', ML, y);
  y += 10;

  // 2×2 info grid
  const cellH = 48, cellW = CW / 2;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...C200);
  doc.setLineWidth(0.5);
  doc.roundedRect(ML, y, CW, cellH * 2, 3, 3, 'FD');
  doc.line(ML + cellW, y, ML + cellW, y + cellH * 2);
  doc.line(ML, y + cellH, ML + CW, y + cellH);

  const infoItems = [
    ['EMPRESA',                              empresa],
    ['RESPONSABLE',                          diag.responsable || '—'],
    ['PERIODO EVALUADO',                     diag.periodo_inicio ? `${diag.periodo_inicio} a ${diag.periodo_fin}` : '—'],
    ['FECHA DEL DIAGNÓSTICO / AUDITORÍA INTERNA', fechaDiag],
  ];
  const infoPos = [
    [ML + 10, y], [ML + cellW + 10, y],
    [ML + 10, y + cellH], [ML + cellW + 10, y + cellH],
  ];
  for (let i = 0; i < 4; i++) {
    const [cx, cy] = infoPos[i];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C400);
    doc.text(infoItems[i][0], cx, cy + 13);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...C900);
    const valLines = doc.splitTextToSize(infoItems[i][1], cellW - 20);
    doc.text(valLines[0], cx, cy + 30);
  }

  // ── PAGE 2 — RESULTADOS POR REQUISITO ────────────────────────────────────
  doc.addPage();
  pageHeader();
  y = 52;
  y = sectionHeading('RESULTADOS POR REQUISITO', y);

  // Legend
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C700);
  const legendPairs = [
    ['EX', 'Existencia y funcionamiento'],
    ['DC', 'Difusión y conocimiento'],
    ['PD', 'Participación directa'],
    ['IM', 'Innovación o mejora'],
    ['VD', 'Vinculación con la dirección estratégica'],
  ];
  let lx = ML;
  for (let i = 0; i < legendPairs.length; i++) {
    const [abbr, label] = legendPairs[i];
    const sep = i < legendPairs.length - 1 ? '  ·  ' : '';
    const chunk = `${label}${sep}`;
    if (lx + doc.getTextWidth(abbr + ' ' + chunk) > W - MR) { y += 12; lx = ML; }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...G);
    doc.text(abbr, lx, y);
    lx += doc.getTextWidth(abbr + ' ');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C700);
    doc.text(chunk, lx, y);
    lx += doc.getTextWidth(chunk);
  }
  y += 16;

  // Build table rows
  const crKeys = ['puntuacion_criterio_1','puntuacion_criterio_2','puntuacion_criterio_3','puntuacion_criterio_4','puntuacion_criterio_5'];
  const reqTableBody = [];

  for (const tema of norma.temas) {
    reqTableBody.push([{
      content: `Tema ${tema.id}  ·  ${tema.nombre}`,
      colSpan: 8,
      styles: { fillColor: G_BG, textColor: G, fontStyle: 'bold', fontSize: 8.5,
                cellPadding: { top: 5, bottom: 5, left: 8, right: 6 } },
    }]);

    for (const rId of tema.requisitos) {
      const req = norma.requisitos.find(r => r.id === rId);
      const ev  = evalMap[rId];

      let totTxt = 'Sin evaluar', totSty = { halign: 'right', fontStyle: 'italic', textColor: C400, fontSize: 8 };
      if (ev?.bloqueado) {
        totTxt = 'No cumple'; totSty = { halign: 'right', fontStyle: 'bold', textColor: [165,48,48], fontSize: 8 };
      } else if (ev && !ev.completado) {
        totTxt = 'En progreso'; totSty = { halign: 'right', fontStyle: 'italic', textColor: [60,120,200], fontSize: 8 };
      } else if (ev?.completado && ev.puntuacion_total != null) {
        const s = ev.puntuacion_total;
        totTxt = `${s.toFixed(0)}%`;
        totSty = { halign: 'right', fontStyle: 'bold', textColor: sc(s), fontSize: 9 };
      }

      const crCells = crKeys.map((key, i) => {
        const crNum = i + 1;
        if (!req.criterios_evaluables.includes(crNum))
          return { content: '–', styles: { halign: 'center', textColor: C200, fontSize: 8 } };
        if (!ev || !ev.completado || ev.bloqueado)
          return { content: '–', styles: { halign: 'center', textColor: C400, fontSize: 8 } };
        const val = ev[key];
        if (val == null) return { content: '–', styles: { halign: 'center', textColor: C400, fontSize: 8 } };
        return { content: `${Math.round(val)}%`, styles: { halign: 'center', fontSize: 8, textColor: sc(val) } };
      });

      reqTableBody.push([
        { content: `${req.numero}`, styles: { halign: 'center', textColor: C500, fontSize: 8 } },
        { content: req.nombre, styles: { fontSize: 8.5, textColor: C700 } },
        ...crCells,
        { content: totTxt, styles: totSty },
      ]);
    }
  }

  const nomW = CW - 20 - 5 * 40 - 58;
  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: MR },
    head: [[
      { content: '#',         styles: { halign: 'center' } },
      { content: 'REQUISITO' },
      ...['EX','DC','PD','IM','VD'].map(h => ({ content: h, styles: { halign: 'center' } })),
      { content: 'Total',     styles: { halign: 'right' } },
    ]],
    body: reqTableBody,
    theme: 'plain',
    headStyles: { textColor: C500, fontStyle: 'bold', fontSize: 7.5, fillColor: [255,255,255],
                  lineColor: C200, lineWidth: { bottom: 0.6 },
                  cellPadding: { top: 6, bottom: 6, left: 4, right: 4 } },
    columnStyles: {
      0: { cellWidth: 20 }, 1: { cellWidth: nomW },
      2: { cellWidth: 40 }, 3: { cellWidth: 40 }, 4: { cellWidth: 40 },
      5: { cellWidth: 40 }, 6: { cellWidth: 40 }, 7: { cellWidth: 58 },
    },
    styles: { cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
              lineColor: C200, lineWidth: { bottom: 0.3 }, overflow: 'linebreak' },
    alternateRowStyles: { fillColor: [250, 251, 252] },
    didParseCell: (data) => {
      if (data.row.raw?.[0]?.colSpan === 8) {
        data.cell.styles.fillColor = G_BG;
      }
    },
    didDrawPage: atDidDrawPage,
  });

  // ── PAGE — ANÁLISIS DETALLADO ─────────────────────────────────────────────
  doc.addPage();
  pageHeader();
  y = 52;
  y = sectionHeading('ANÁLISIS DETALLADO', y);
  y += 4;

  // Two-column: fortalezas | oportunidades
  if (fortalezas.length || oportunidades.length || bloqueados.length) {
    const colW = (CW - 18) / 2;

    // Column headings
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C700);
    doc.text('Fortalezas principales', ML, y);
    doc.text(`Áreas prioritarias de mejora (<60%)`, ML + colW + 18, y);
    y += 7;
    doc.setDrawColor(...C200);
    doc.setLineWidth(0.4);
    doc.line(ML, y, ML + colW, y);
    doc.line(ML + colW + 18, y, ML + CW, y);
    y += 12;

    const maxRows = Math.max(fortalezas.length, oportunidades.length);
    for (let i = 0; i < maxRows; i++) {
      if (y > H - 90) { doc.addPage(); pageHeader(); y = 52; }

      const drawItem = (e, ox, cw) => {
        const req = norma.requisitos.find(r => r.id === e.requisito_id);
        const s   = e.puntuacion_total;
        const lbl = `Req. ${req.numero} · ${req.nombre}`;
        const txt = lbl.length > 44 ? lbl.substring(0, 42) + '…' : lbl;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...C700);
        doc.text(txt, ox, y);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...sc(s));
        doc.text(`${s.toFixed(0)}%`, ox + cw, y, { align: 'right' });
        miniBar(ox, y + 3, s, Math.min(cw - 4, 100), 3);
      };

      if (fortalezas[i]) drawItem(fortalezas[i], ML, colW);
      if (oportunidades[i]) drawItem(oportunidades[i], ML + colW + 18, colW);
      y += 22;
    }

    // Bloqueados
    if (bloqueados.length) {
      y += 6;
      if (y > H - 90) { doc.addPage(); pageHeader(); y = 52; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(165, 48, 48);
      doc.text(`Requisitos bloqueados por mínimos auditables (${bloqueados.length})`, ML, y);
      y += 12;
      for (const e of bloqueados) {
        if (y > H - 60) { doc.addPage(); pageHeader(); y = 52; }
        const req = norma.requisitos.find(r => r.id === e.requisito_id);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...C700);
        doc.text(`Req. ${req.numero} · ${req.nombre} — No cumple mínimos auditables`, ML, y);
        y += 14;
      }
    }

    y += 8;
  }

  // Criteria averages
  if (conPunt.length > 0) {
    if (y > H - 130) { doc.addPage(); pageHeader(); y = 52; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C700);
    doc.text('Promedio por criterio de evaluación', ML, y);
    y += 16;

    const crNames = ['Existencia y\nfuncionamiento', 'Difusión y\nconocimiento', 'Participación\ndirecta', 'Innovación o\nmejora', 'Vinculación\nestratégica'];
    const crKeysCrit = ['puntuacion_criterio_1','puntuacion_criterio_2','puntuacion_criterio_3','puntuacion_criterio_4','puntuacion_criterio_5'];
    const boxSz = (CW - 4 * 6) / 5;
    const boxH  = 72;

    for (let i = 0; i < 5; i++) {
      const vals = conPunt.map(e => e[crKeysCrit[i]]).filter(v => v != null);
      if (!vals.length) continue;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const bx  = ML + i * (boxSz + 6);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...C200);
      doc.setLineWidth(0.5);
      doc.roundedRect(bx, y, boxSz, boxH, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(...sc(avg));
      doc.text(`${avg.toFixed(0)}%`, bx + boxSz / 2, y + 32, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...C500);
      crNames[i].split('\n').forEach((line, li) => {
        doc.text(line, bx + boxSz / 2, y + 48 + li * 9, { align: 'center' });
      });
    }
    y += boxH + 14;
  }

  // ── PAGE — COMENTARIOS Y RECOMENDACIONES ──────────────────────────────────
  doc.addPage();
  pageHeader();
  y = 52;
  y = sectionHeading('COMENTARIOS Y RECOMENDACIONES DEL CONSULTOR / AUDITOR', y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C500);
  doc.text('Espacio reservado para observaciones, hallazgos y recomendaciones de seguimiento.', ML, y);
  y += 20;

  const drawWritingBlock = (label, blockH) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C700);
    doc.text(label, ML, y);
    y += 8;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...C200);
    doc.setLineWidth(0.5);
    doc.roundedRect(ML, y, CW, blockH, 3, 3, 'FD');
    doc.setDrawColor(...C200);
    doc.setLineWidth(0.25);
    const spacing = 20;
    const numLines = Math.floor((blockH - 14) / spacing);
    for (let i = 1; i <= numLines; i++) {
      doc.line(ML + 10, y + i * spacing, ML + CW - 10, y + i * spacing);
    }
    y += blockH + 18;
  };

  drawWritingBlock('Comentarios generales', 168);
  drawWritingBlock('Recomendaciones y plan de acción', 156);

  // Signature lines
  const sigW = (CW - 20) / 2;
  doc.setDrawColor(...C700);
  doc.setLineWidth(0.7);
  doc.line(ML, y, ML + sigW, y);
  doc.line(ML + sigW + 20, y, ML + CW, y);
  y += 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C500);
  doc.text('Nombre y firma del consultor / auditor', ML, y);
  doc.text('Fecha', ML + sigW + 20, y);

  // ── PAGE — REQ. 3 DOCUMENTACIÓN ──────────────────────────────────────────
  const req3Def  = norma.requisitos.find(r => r.numero === 3);
  const evalReq3 = req3Def
    ? evaluaciones.find(e => e.requisito_id === req3Def.id && e.documentacion_detalle)
    : null;

  if (evalReq3) {
    doc.addPage();
    pageHeader();
    let yd = 52;
    yd = sectionHeading('REQ. 3 — EVALUACIÓN DE DOCUMENTACIÓN POR REQUISITO', yd);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C500);
    doc.text('Objetivo, alcance, procedimiento y métrica evaluados para cada requisito (5 al 25).', ML, yd);
    yd += 16;

    const docCols = [
      { key: 'objetivo',      label: 'Objetivo' },
      { key: 'alcance',       label: 'Alcance' },
      { key: 'procedimiento', label: 'Procedim.' },
      { key: 'metrica',       label: 'Métrica' },
    ];
    const dColW  = 58;
    const dNomW  = CW - dColW * 5;

    const docBody = [];
    const reqs5a25 = norma.requisitos.filter(r => r.numero >= 5 && r.numero <= 25).sort((a, b) => a.numero - b.numero);
    let lastTema = null;
    for (const req of reqs5a25) {
      const temaObj = norma.temas.find(t => t.requisitos.includes(req.id));
      if (temaObj?.id !== lastTema) {
        docBody.push([{
          content: `Tema ${temaObj.id}  ·  ${temaObj.nombre}`,
          colSpan: 6,
          styles: { fillColor: G_BG, textColor: G, fontStyle: 'bold', fontSize: 8,
                    cellPadding: { top: 5, bottom: 5, left: 8, right: 6 } },
        }]);
        lastTema = temaObj?.id;
      }
      const det  = evalReq3.documentacion_detalle?.[req.id];
      const vals = det ? docCols.map(c => det[c.key]).filter(v => v != null) : [];
      const avg  = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;

      docBody.push([
        { content: `${req.numero}. ${req.nombre}`, styles: { fontSize: 8, textColor: C700 } },
        ...docCols.map(c => {
          const v = det?.[c.key];
          return {
            content: v != null ? `${v}%` : '–',
            styles: { halign: 'center', fontSize: 8,
                      textColor: v != null ? sc(v) : C400,
                      fontStyle: v != null ? 'bold' : 'normal' },
          };
        }),
        {
          content: avg != null ? `${avg.toFixed(0)}%` : '–',
          styles: { halign: 'center', fontSize: 8.5, fontStyle: 'bold',
                    textColor: avg != null ? sc(avg) : C400 },
        },
      ]);
    }

    autoTable(doc, {
      startY: yd,
      margin: { left: ML, right: MR },
      head: [[
        { content: 'REQUISITO' },
        ...docCols.map(c => ({ content: c.label, styles: { halign: 'center' } })),
        { content: 'Total', styles: { halign: 'center' } },
      ]],
      body: docBody,
      theme: 'plain',
      headStyles: { textColor: C500, fontStyle: 'bold', fontSize: 7.5,
                    lineColor: C200, lineWidth: { bottom: 0.6 },
                    cellPadding: { top: 6, bottom: 6, left: 4, right: 4 } },
      columnStyles: {
        0: { cellWidth: dNomW },
        1: { cellWidth: dColW }, 2: { cellWidth: dColW },
        3: { cellWidth: dColW }, 4: { cellWidth: dColW },
        5: { cellWidth: dColW },
      },
      styles: { fontSize: 8, cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
                lineColor: C200, lineWidth: { bottom: 0.3 }, overflow: 'linebreak' },
      alternateRowStyles: { fillColor: [250, 251, 252] },
      didParseCell: (data) => {
        if (data.row.raw?.[0]?.colSpan === 6) data.cell.styles.fillColor = G_BG;
      },
      didDrawPage: atDidDrawPage,
    });
  }

  // ── PAGE — TABLA DE PONDERACIONES ────────────────────────────────────────
  doc.addPage();
  pageHeader();
  let yp = 52;
  yp = sectionHeading('TABLA DE PONDERACIONES — NORMA CRESE 2025', yp);

  // Escala de valoración
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C700);
  doc.text('Escala de valoración por criterio', ML, yp);
  yp += 10;

  autoTable(doc, {
    startY: yp,
    margin: { left: ML, right: MR },
    head: [['PUNTAJE', 'NIVEL', 'DESCRIPCIÓN']],
    body: [
      ['0%',   'Ausente',       'No existe evidencia del criterio en la organización.'],
      ['25%',  'Incipiente',    'Existe algún indicio o intento pero sin estructura formal.'],
      ['50%',  'En desarrollo', 'Hay avances concretos pero aún incompletos o no sistemáticos.'],
      ['75%',  'Implementado',  'Se cumple de manera consistente con evidencia documentada o demostrable.'],
      ['100%', 'Consolidado',   'Está plenamente integrado, es sistemático y se puede evidenciar en toda la organización.'],
    ],
    theme: 'plain',
    headStyles: { textColor: C500, fontStyle: 'bold', fontSize: 7.5,
                  lineColor: C200, lineWidth: { bottom: 0.6 },
                  cellPadding: { top: 6, bottom: 6, left: 6, right: 6 } },
    columnStyles: {
      0: { cellWidth: 54, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 92 },
      2: { cellWidth: CW - 54 - 92 },
    },
    styles: { fontSize: 8.5, cellPadding: { top: 6, bottom: 6, left: 6, right: 6 },
              lineColor: C200, lineWidth: { bottom: 0.3 } },
    alternateRowStyles: { fillColor: [250, 251, 252] },
    didParseCell: (data) => {
      if (data.column.index === 0 && data.section === 'body') {
        const v = parseInt(data.cell.raw);
        if (!isNaN(v)) data.cell.styles.textColor = sc(v);
      }
    },
    didDrawPage: atDidDrawPage,
  });

  yp = doc.lastAutoTable.finalY + 22;

  // Ponderación por criterio
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C700);
  const pcLabel = 'Ponderación por criterio de evaluación';
  doc.text(pcLabel, ML, yp);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C500);
  doc.text(' (pág. 46)', ML + doc.getTextWidth(pcLabel), yp);
  yp += 8;
  doc.text('El puntaje de cada requisito se calcula como la suma ponderada de sus criterios evaluados.', ML, yp);
  yp += 10;

  autoTable(doc, {
    startY: yp,
    margin: { left: ML, right: MR },
    head: [['CRITERIO', 'Req. 3', 'Req. 1, 2, 4, 5', 'Req. 6 al 25']],
    body: [
      ['EX — Existencia y Funcionamiento', '100%', '45%', '50%'],
      ['DC — Difusión y Conocimiento',     '—',    '10%', '10%'],
      ['PD — Participación Directa',       '—',    '15%', '15%'],
      ['IM — Innovación o Mejora',         '—',    '15%', '15%'],
      ['VD — Vinculación Estratégica',     '—',    '15%', '10%'],
    ],
    theme: 'plain',
    headStyles: { textColor: C500, fontStyle: 'bold', fontSize: 7.5,
                  lineColor: C200, lineWidth: { bottom: 0.6 },
                  cellPadding: { top: 6, bottom: 6, left: 6, right: 6 } },
    columnStyles: {
      0: { cellWidth: CW - 3 * 82, halign: 'left' },
      1: { cellWidth: 82, halign: 'center' },
      2: { cellWidth: 82, halign: 'center' },
      3: { cellWidth: 82, halign: 'center' },
    },
    styles: { fontSize: 8.5, cellPadding: { top: 6, bottom: 6, left: 6, right: 6 },
              lineColor: C200, lineWidth: { bottom: 0.3 } },
    alternateRowStyles: { fillColor: [250, 251, 252] },
    didDrawPage: atDidDrawPage,
  });

  yp = doc.lastAutoTable.finalY + 22;

  // Ponderación por requisito (2-column layout)
  const prLabel = 'Ponderación por requisito para el puntaje global';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C700);
  doc.text(prLabel, ML, yp);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C500);
  doc.text(' (pág. 45)', ML + doc.getTextWidth(prLabel), yp);
  yp += 8;
  doc.text('La suma de todas las ponderaciones es 100 puntos. Los requisitos no evaluados se computan como 0 en el puntaje proyectado.', ML, yp);
  yp += 10;

  const POND = {
    1:6.23, 2:2.08, 3:19.00, 4:2.08, 5:6.23, 6:6.23, 7:4.15, 8:4.15, 9:4.15,
    10:4.15, 11:4.15, 12:2.08, 13:4.15, 14:2.08, 15:2.08, 16:2.08, 17:2.08,
    18:2.08, 19:2.08, 20:2.08, 21:2.08, 22:2.08, 23:2.08, 24:4.15, 25:6.23,
  };

  const sorted   = norma.requisitos.slice().sort((a, b) => a.numero - b.numero);
  const halfLen  = Math.ceil(sorted.length / 2);
  const col1reqs = sorted.slice(0, halfLen);
  const col2reqs = sorted.slice(halfLen);
  const cHalf    = (CW - 12) / 2;
  const numCW    = 20, ptsCW = 54, namCW = cHalf - numCW - ptsCW - 4;

  const pondRows = [];
  for (let i = 0; i < halfLen; i++) {
    const r1 = col1reqs[i];
    const r2 = col2reqs[i];
    const makeCell = (r) => r ? [
      { content: `${r.numero}`, styles: { halign: 'center', textColor: C500, fontSize: 8 } },
      { content: r.nombre,      styles: { fontSize: 8, textColor: C700 } },
      { content: `${POND[r.numero]} pts`, styles: { halign: 'right', fontStyle: 'bold', fontSize: 8,
          textColor: POND[r.numero] >= 10 ? G : C700 } },
    ] : [{ content: '' }, { content: '' }, { content: '' }];

    pondRows.push([...makeCell(r1), { content: '' }, ...makeCell(r2)]);
  }

  autoTable(doc, {
    startY: yp,
    margin: { left: ML, right: MR },
    body: pondRows,
    theme: 'plain',
    columnStyles: {
      0: { cellWidth: numCW }, 1: { cellWidth: namCW }, 2: { cellWidth: ptsCW },
      3: { cellWidth: 12 },   // gap
      4: { cellWidth: numCW }, 5: { cellWidth: namCW }, 6: { cellWidth: ptsCW },
    },
    styles: { fontSize: 8, cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
              lineColor: C200, lineWidth: { bottom: 0.2 } },
    alternateRowStyles: { fillColor: [250, 251, 252] },
    didDrawPage: atDidDrawPage,
  });

  // ── FOOTERS on all pages ──────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const fy = H - 26;
    doc.setDrawColor(...C200);
    doc.setLineWidth(0.3);
    doc.line(ML, fy - 8, W - MR, fy - 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C400);
    doc.text(empresa.toUpperCase(), ML, fy);
    doc.text(`Página ${p} de ${totalPages}`, W / 2, fy, { align: 'center' });
    doc.text('NORMA CRESE 2025', W - MR, fy, { align: 'right' });
  }

  // ── Aviso legal on last page ──────────────────────────────────────────────
  doc.setPage(totalPages);
  const aviso = config?.aviso_legal || 'Esta herramienta de autodiagnóstico no sustituye la auditoría externa de certificación CRESE.';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C400);
  doc.text(aviso, W / 2, H - 38, { align: 'center' });

  doc.save(`reporte-crese-${empresa.replace(/\s+/g, '_').replace(/[^\w-]/g, '')}.pdf`);
}
