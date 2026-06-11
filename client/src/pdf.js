// Client-side PDF generation using jsPDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const sc = s => s >= 80 ? [22, 163, 74] : s >= 60 ? [234, 88, 12] : [220, 38, 38];

const categoria = s => {
  if (s >= 90) return 'Empresa Ejemplar';
  if (s >= 80) return 'Empresa Sobresaliente';
  if (s >= 70) return 'Empresa Destacada';
  if (s >= 60) return 'Empresa Comprometida';
  return 'Por debajo del mínimo de certificación';
};

export function generarPDF(diag, evaluaciones, norma, config) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  const M = 50;
  const CW = W - M * 2;

  const evalMap = {};
  for (const e of evaluaciones) evalMap[e.requisito_id] = e;

  const parcial = diag.puntuacion_global || 0;
  const proyectado = diag.puntuacion_proyectada || 0;
  const completadas = evaluaciones.filter(e => e.completado);

  // ── Header band ─────────────────────────────────────────────────────
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, W, 100, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('Reporte de Auditoria Interna / Autodiagnostico CRESE', W / 2, 38, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(191, 219, 254);
  doc.text('Norma CRESE 2025', W / 2, 58, { align: 'center' });

  const fechaGen = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.setFontSize(9);
  doc.setTextColor(147, 197, 253);
  doc.text(`Generado el ${fechaGen}`, W / 2, 76, { align: 'center' });

  // ── Empresa info ─────────────────────────────────────────────────────
  let y = 125;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 64, 175);
  doc.text('INFORMACIÓN DE LA EMPRESA', M, y);
  y += 4;
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.line(M, y, W - M, y);
  y += 14;

  const infoRows = [
    ['Empresa', diag.nombre_empresa],
    ['Responsable', diag.responsable || 'No especificado'],
    ['Periodo evaluado', diag.periodo_inicio ? `${diag.periodo_inicio}  a  ${diag.periodo_fin}` : 'No especificado'],
    ['Fecha del diagnóstico', new Date(diag.created_at).toLocaleDateString('es-MX')],
  ];

  for (const [label, value] of infoRows) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(label.toUpperCase(), M, y);
    y += 12;
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text(value, M, y);
    y += 16;
  }

  y += 8;

  // ── Score boxes ──────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 64, 175);
  doc.text('RESULTADO GLOBAL', M, y);
  y += 4;
  doc.line(M, y, W - M, y);
  y += 14;

  const boxW = (CW - 12) / 2;
  const boxH = 72;

  // Box 1 – parcial
  doc.setFillColor(240, 249, 255);
  doc.roundedRect(M, y, boxW, boxH, 4, 4, 'F');
  doc.setDrawColor(186, 230, 253);
  doc.setLineWidth(0.8);
  doc.roundedRect(M, y, boxW, boxH, 4, 4, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('PUNTAJE PARCIAL', M + boxW / 2, y + 14, { align: 'center' });
  doc.text(`(${completadas.length} de 25 evaluados)`, M + boxW / 2, y + 24, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...sc(parcial));
  doc.text(`${parcial.toFixed(1)}%`, M + boxW / 2, y + 52, { align: 'center' });

  // Box 2 – proyectado
  const b2x = M + boxW + 12;
  doc.setFillColor(254, 252, 232);
  doc.roundedRect(b2x, y, boxW, boxH, 4, 4, 'F');
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(b2x, y, boxW, boxH, 4, 4, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('PUNTAJE PROYECTADO', b2x + boxW / 2, y + 14, { align: 'center' });
  doc.text('(sobre 25 requisitos)', b2x + boxW / 2, y + 24, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...sc(proyectado));
  doc.text(`${proyectado.toFixed(1)}%`, b2x + boxW / 2, y + 52, { align: 'center' });

  y += boxH + 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...sc(proyectado));
  doc.text(`Categoría estimada: ${categoria(proyectado)}`, W / 2, y, { align: 'center' });
  y += 13;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('El puntaje proyectado considera los 25 requisitos; los no evaluados se computan como 0.', W / 2, y, { align: 'center' });
  y += 24;

  // ── Requisitos table ─────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 64, 175);
  doc.text('RESULTADOS POR REQUISITO', M, y);
  y += 4;
  doc.setLineWidth(0.5);
  doc.line(M, y, W - M, y);
  y += 10;

  // Leyenda de criterios
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(M, y, CW, 18, 2, 2, 'FD');
  const leyenda = [
    ['EX', 'Existencia y funcionamiento'],
    ['DC', 'Difusion y Conocimiento'],
    ['PD', 'Participacion directa'],
    ['IM', 'Innovacion o Mejora'],
    ['VD', 'Vinculacion con la direccion estrategica'],
  ];
  const colStep = CW / 5;
  for (let i = 0; i < leyenda.length; i++) {
    const lx = M + i * colStep + 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 64, 175);
    doc.text(leyenda[i][0] + ':', lx, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text(leyenda[i][1], lx + 13, y + 7);
  }
  y += 26;

  // col widths: # | Nombre | EX | DC | PD | IM | VD | Total
  const cW = [22, 196, 36, 36, 36, 36, 36, 54]; // sum = 452... adjust below
  // CW = 512; sum cW = 22+196+36*5+54 = 22+196+180+54 = 452; give extra to nombre
  cW[1] = CW - cW[0] - cW[2] - cW[3] - cW[4] - cW[5] - cW[6] - cW[7]; // 512-22-36*5-54=256

  const crHeaders = ['EX', 'DC', 'PD', 'IM', 'VD'];
  const crKeys = ['puntuacion_criterio_1','puntuacion_criterio_2','puntuacion_criterio_3','puntuacion_criterio_4','puntuacion_criterio_5'];

  // Header row
  const headerRow = [
    { content: '#', styles: { halign: 'center', fontStyle: 'bold', fontSize: 8, textColor: [107,114,128] } },
    { content: 'Requisito', styles: { fontStyle: 'bold', fontSize: 8, textColor: [107,114,128] } },
    ...crHeaders.map(h => ({ content: h, styles: { halign: 'center', fontStyle: 'bold', fontSize: 8, textColor: [107,114,128] } })),
    { content: 'Total', styles: { halign: 'center', fontStyle: 'bold', fontSize: 8, textColor: [107,114,128] } },
  ];

  const tableRows = [headerRow];
  for (const tema of norma.temas) {
    tableRows.push([{ content: `Tema ${tema.id}: ${tema.nombre}`, colSpan: 8, styles: { fillColor: [239, 246, 255], textColor: [30, 64, 175], fontStyle: 'bold', fontSize: 9 } }]);
    for (const rId of tema.requisitos) {
      const req = norma.requisitos.find(r => r.id === rId);
      const ev = evalMap[rId];
      let statusText, statusColor;
      if (!ev) { statusText = 'Sin evaluar'; statusColor = [156, 163, 175]; }
      else if (ev.bloqueado) { statusText = 'No Cumple'; statusColor = [220, 38, 38]; }
      else if (!ev.completado) { statusText = 'En progreso'; statusColor = [59, 130, 246]; }
      else { statusText = `${ev.puntuacion_total.toFixed(0)}%`; statusColor = sc(ev.puntuacion_total); }

      // Para Req 3 en progreso: calcular avance desde documentacion_detalle
      let req3Progress = null;
      if (req.numero === 3 && ev && !ev.completado && !ev.bloqueado && ev.documentacion_detalle) {
        const reqs5a25 = norma.requisitos.filter(r => r.numero >= 5 && r.numero <= 25);
        const totalCeldas = reqs5a25.length * 4; // 21 × 4 campos = 84
        const celdasLlenas = reqs5a25.reduce((acc, r) => {
          const d = ev.documentacion_detalle[r.id];
          if (!d) return acc;
          return acc + Object.values(d).filter(v => v != null).length;
        }, 0);
        req3Progress = totalCeldas > 0 ? Math.round((celdasLlenas / totalCeldas) * 100) : 0;
      }

      const crCells = crKeys.map((key, i) => {
        const crNum = i + 1;
        if (!req.criterios_evaluables.includes(crNum)) {
          return { content: '-', styles: { halign: 'center', fontSize: 8, textColor: [209, 213, 219] } };
        }
        // Req 3 en progreso: mostrar avance en celda EX (criterio 1)
        if (req.numero === 3 && crNum === 1 && req3Progress !== null) {
          return { content: `${req3Progress}%`, styles: { halign: 'center', fontSize: 8, fontStyle: 'bold', textColor: [59, 130, 246] } };
        }
        if (!ev || !ev.completado || ev.bloqueado) {
          return { content: '-', styles: { halign: 'center', fontSize: 8, textColor: [209, 213, 219] } };
        }
        const val = ev[key];
        if (val == null) return { content: '-', styles: { halign: 'center', fontSize: 8, textColor: [209, 213, 219] } };
        return { content: `${Math.round(val)}%`, styles: { halign: 'center', fontSize: 8, fontStyle: 'bold', textColor: sc(val) } };
      });

      tableRows.push([
        { content: req.numero, styles: { halign: 'center', textColor: [107, 114, 128], fontSize: 8 } },
        { content: req.nombre, styles: { fontSize: 9 } },
        ...crCells,
        { content: statusText, styles: { halign: 'center', fontStyle: 'bold', textColor: statusColor, fontSize: 9 } },
      ]);
    }
  }

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    columnStyles: {
      0: { cellWidth: cW[0] },
      1: { cellWidth: cW[1] },
      2: { cellWidth: cW[2] },
      3: { cellWidth: cW[3] },
      4: { cellWidth: cW[4] },
      5: { cellWidth: cW[5] },
      6: { cellWidth: cW[6] },
      7: { cellWidth: cW[7] },
    },
    body: tableRows,
    theme: 'plain',
    styles: { cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, lineColor: [243, 244, 246], lineWidth: 0.3 },
  });

  // ── Análisis page ────────────────────────────────────────────────────
  doc.addPage();
  y = 60;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 64, 175);
  doc.text('ANÁLISIS DETALLADO', M, y);
  y += 4;
  doc.setLineWidth(0.5);
  doc.line(M, y, W - M, y);
  y += 16;

  const conPuntuacion = completadas.filter(e => !e.bloqueado && e.puntuacion_total !== null);
  const bloqueadosList = completadas.filter(e => e.bloqueado);
  const fortalezas = [...conPuntuacion].sort((a, b) => b.puntuacion_total - a.puntuacion_total).slice(0, 5);
  const oportunidades = [...conPuntuacion].filter(e => e.puntuacion_total < 60)
    .sort((a, b) => a.puntuacion_total - b.puntuacion_total).slice(0, 5);

  const sectionDivider = () => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(M, y, W - M, y);
    y += 14;
  };

  const drawAnalysisSection = (title, color, items, renderRow) => {
    if (!items.length) return;
    sectionDivider();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...color);
    doc.text(title, M, y);
    y += 14;
    for (const item of items) {
      if (y > 700) { doc.addPage(); y = 60; }
      renderRow(item);
      y += 4;
    }
    y += 6;
  };

  drawAnalysisSection('Fortalezas principales', [22, 163, 74], fortalezas, (e) => {
    const req = norma.requisitos.find(r => r.id === e.requisito_id);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(31, 41, 55);
    const nombre = req.nombre.length > 60 ? req.nombre.substring(0, 58) + '...' : req.nombre;
    doc.text(`Req. ${req.numero} - ${nombre}`, M, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text(`${e.puntuacion_total.toFixed(0)}%`, W - M, y, { align: 'right' });
    y += 14;
  });

  drawAnalysisSection('Areas prioritarias de mejora (<60%)', [234, 88, 12], oportunidades, (e) => {
    const req = norma.requisitos.find(r => r.id === e.requisito_id);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(31, 41, 55);
    const nombre = req.nombre.length > 60 ? req.nombre.substring(0, 58) + '...' : req.nombre;
    doc.text(`Req. ${req.numero} - ${nombre}`, M, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(234, 88, 12);
    doc.text(`${e.puntuacion_total.toFixed(0)}%`, W - M, y, { align: 'right' });
    y += 14;
  });

  drawAnalysisSection('Requisitos bloqueados por minimos auditables', [220, 38, 38], bloqueadosList, (e) => {
    const req = norma.requisitos.find(r => r.id === e.requisito_id);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(31, 41, 55);
    const text = `Req. ${req.numero} - ${req.nombre}: No cumple minimos auditables`;
    const lines = doc.splitTextToSize(text, CW);
    doc.text(lines, M, y);
    y += lines.length * 13;
  });

  // Criteria averages
  if (conPuntuacion.length > 0) {
    if (y > 650) { doc.addPage(); y = 60; }
    sectionDivider();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 64, 175);
    doc.text('Promedio por criterio de evaluación', M, y);
    y += 16;

    const crNames = ['Existencia y Funcionamiento', 'Difusión y Conocimiento', 'Participación Directa', 'Innovación o Mejora', 'Vinculación Estratégica'];
    const crKeys = ['puntuacion_criterio_1','puntuacion_criterio_2','puntuacion_criterio_3','puntuacion_criterio_4','puntuacion_criterio_5'];
    for (let i = 0; i < 5; i++) {
      const vals = conPuntuacion.map(e => e[crKeys[i]]).filter(v => v != null);
      if (!vals.length) continue;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const barW = 120;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(31, 41, 55);
      doc.text(crNames[i], M, y);
      doc.setFillColor(243, 244, 246);
      doc.rect(M + 190, y - 8, barW, 10, 'F');
      doc.setFillColor(...sc(avg));
      doc.rect(M + 190, y - 8, Math.round(barW * avg / 100), 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...sc(avg));
      doc.text(`${avg.toFixed(0)}%`, M + 318, y, { align: 'left' });
      y += 18;
    }
  }

  // ── Página Req 3 Documentación ───────────────────────────────────────
  const req3Def = norma.requisitos.find(r => r.numero === 3);
  const evalReq3 = req3Def ? evaluaciones.find(e => e.requisito_id === req3Def.id && e.documentacion_detalle) : null;

  if (evalReq3) {
    doc.addPage();
    let yd = 60;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 64, 175);
    doc.text('Req. 3 - Evaluacion de Documentacion por Requisito (5 al 25)', M, yd);
    yd += 4;
    doc.setLineWidth(0.5);
    doc.line(M, yd, W - M, yd);
    yd += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Objetivo, Alcance, Procedimiento y Metrica evaluados para cada requisito.', M, yd);
    yd += 14;

    const docCols = [
      { key: 'objetivo',      label: 'Objetivo' },
      { key: 'alcance',       label: 'Alcance' },
      { key: 'procedimiento', label: 'Procedim.' },
      { key: 'metrica',       label: 'Metrica' },
    ];
    const colN = 22, colNom = 130, colDoc = (CW - colN - colNom - 40) / 4;

    const drawDocRow = (label, detalle, isHeader) => {
      if (isHeader) {
        if (yd > 710) { doc.addPage(); yd = 60; }
        doc.setFillColor(239, 246, 255);
        doc.rect(M, yd - 9, CW, 22, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 64, 175);
        doc.text(label, M + colN + 3, yd);
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(9);
        docCols.forEach((c, i) => {
          doc.text(c.label, M + colN + colNom + i * colDoc + 2, yd + 10);
        });
        doc.text('Total', M + colN + colNom + 4 * colDoc + 2, yd + 10);
        yd += 23;
      } else {
        if (yd > 720) { doc.addPage(); yd = 60; }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(31, 41, 55);
        doc.text(label, M + colN + 3, yd);
        const vals = [];
        docCols.forEach((c, i) => {
          const val = detalle?.[c.key];
          if (val !== null && val !== undefined) {
            vals.push(val);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...sc(val));
            doc.text(`${val}%`, M + colN + colNom + i * colDoc + 2, yd);
          } else {
            doc.setTextColor(209, 213, 219);
            doc.setFont('helvetica', 'normal');
            doc.text('-', M + colN + colNom + i * colDoc + 2, yd);
          }
        });
        if (vals.length > 0) {
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...sc(avg));
          doc.text(`${avg.toFixed(0)}%`, M + colN + colNom + 4 * colDoc + 2, yd);
        }
        doc.setTextColor(229, 231, 235);
        doc.setLineWidth(0.2);
        doc.line(M, yd + 4, W - M, yd + 4);
        yd += 14;
      }
    };

    const reqs5a25 = norma.requisitos.filter(r => r.numero >= 5 && r.numero <= 25)
      .sort((a, b) => a.numero - b.numero);
    let lastTemaId = null;
    for (const req of reqs5a25) {
      const temaId = norma.temas.find(t => t.requisitos.includes(req.id))?.id;
      if (temaId !== lastTemaId) {
        const tema = norma.temas.find(t => t.id === temaId);
        drawDocRow(`Tema ${tema.id}: ${tema.nombre}`, null, true);
        lastTemaId = temaId;
      }
      const nombre = req.nombre.length > 22 ? req.nombre.substring(0, 20) + '..' : req.nombre;
      const detalle = evalReq3.documentacion_detalle[req.id] || null;
      drawDocRow(`${req.numero}. ${nombre}`, detalle, false);
    }
  }

  // ── Página de ponderaciones ──────────────────────────────────────────
  doc.addPage();
  let yp = 60;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 64, 175);
  doc.text('TABLA DE PONDERACIONES — NORMA CRESE 2025', M, yp);
  yp += 4;
  doc.setLineWidth(0.5);
  doc.line(M, yp, W - M, yp);
  yp += 22;

  // ── Escala de valoración ─────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 64, 175);
  doc.text('Escala de valoración por criterio', M, yp);
  yp += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Cada criterio evaluable se califica con uno de los cinco niveles siguientes:', M, yp);
  yp += 12;

  autoTable(doc, {
    startY: yp,
    margin: { left: M, right: M },
    head: [['Puntaje', 'Nivel', 'Descripción']],
    body: [
      ['0%',   'Ausente',       'No existe evidencia del criterio en la organización.'],
      ['25%',  'Incipiente',    'Existe algún indicio o intento pero sin estructura formal.'],
      ['50%',  'En desarrollo', 'Hay avances concretos pero aún incompletos o no sistemáticos.'],
      ['75%',  'Implementado',  'Se cumple de manera consistente con evidencia documentada o demostrable.'],
      ['100%', 'Consolidado',   'Está plenamente integrado, es sistemático y se puede evidenciar en toda la organización.'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 52, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 90, halign: 'center' },
      2: { cellWidth: CW - 52 - 90 },
    },
    styles: { fontSize: 8.5, cellPadding: { top: 4, bottom: 4, left: 6, right: 6 } },
    didParseCell: (data) => {
      if (data.column.index === 0 && data.section === 'body') {
        const v = parseInt(data.cell.raw);
        data.cell.styles.textColor = v >= 75 ? [22, 163, 74] : v >= 50 ? [234, 88, 12] : [220, 38, 38];
      }
    },
  });

  yp = doc.lastAutoTable.finalY + 22;

  // Subtítulo ponderación por criterio
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 64, 175);
  doc.text('Ponderación por criterio de evaluación (pág. 46)', M, yp);
  yp += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('El puntaje de cada requisito se calcula como la suma ponderada de sus criterios evaluados.', M, yp);
  yp += 12;

  const critRows = [
    ['Criterio', 'Req. 3', 'Req. 1, 2, 4, 5', 'Req. 6 al 25'],
    ['EX — Existencia y Funcionamiento',  '100%', '45%', '50%'],
    ['DC — Difusión y Conocimiento',       '—',   '10%', '10%'],
    ['PD — Participación Directa',         '—',   '15%', '15%'],
    ['IM — Innovación o Mejora',           '—',   '15%', '15%'],
    ['VD — Vinculación Estratégica',       '—',   '15%', '10%'],
  ];

  autoTable(doc, {
    startY: yp,
    margin: { left: M, right: M },
    head: [critRows[0]],
    body: critRows.slice(1),
    theme: 'grid',
    headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 260, halign: 'left' },
      1: { cellWidth: 70, halign: 'center' },
      2: { cellWidth: 100, halign: 'center' },
      3: { cellWidth: 82, halign: 'center' },
    },
    styles: { fontSize: 9, cellPadding: { top: 4, bottom: 4, left: 6, right: 6 } },
    alternateRowStyles: { fillColor: [240, 249, 255] },
  });

  yp = doc.lastAutoTable.finalY + 22;

  // Subtítulo ponderación por requisito
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 64, 175);
  doc.text('Ponderación por requisito para el puntaje global (pág. 45)', M, yp);
  yp += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('La suma de todas las ponderaciones es 100 puntos. Los requisitos no evaluados se computan como 0 en el puntaje proyectado.', M, yp);
  yp += 12;

  const PONDERACION_REQ = {
    1: 6.23, 2: 2.08, 3: 19.00, 4: 2.08, 5: 6.23,
    6: 6.23, 7: 4.15, 8: 4.15,  9: 4.15, 10: 4.15,
    11: 4.15, 12: 2.08, 13: 4.15, 14: 2.08, 15: 2.08,
    16: 2.08, 17: 2.08, 18: 2.08, 19: 2.08, 20: 2.08,
    21: 2.08, 22: 2.08, 23: 2.08, 24: 4.15, 25: 6.23,
  };

  const ponderRows = norma.requisitos
    .slice()
    .sort((a, b) => a.numero - b.numero)
    .map(req => [
      { content: `${req.numero}`, styles: { halign: 'center' } },
      { content: req.nombre },
      { content: `${PONDERACION_REQ[req.numero]} pts`, styles: { halign: 'center', fontStyle: 'bold' } },
    ]);

  autoTable(doc, {
    startY: yp,
    margin: { left: M, right: M },
    head: [[
      { content: '#', styles: { halign: 'center' } },
      { content: 'Requisito' },
      { content: 'Ponderación', styles: { halign: 'center' } },
    ]],
    body: ponderRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: CW - 30 - 80 },
      2: { cellWidth: 80 },
    },
    styles: { fontSize: 8.5, cellPadding: { top: 3, bottom: 3, left: 6, right: 6 } },
    alternateRowStyles: { fillColor: [240, 249, 255] },
    didParseCell: (data) => {
      if (data.column.index === 2 && data.section === 'body') {
        const pond = parseFloat(data.cell.raw?.content || data.cell.raw || 0);
        if (pond >= 10) data.cell.styles.textColor = [30, 64, 175];
        else if (pond >= 4) data.cell.styles.textColor = [22, 163, 74];
        else data.cell.styles.textColor = [107, 114, 128];
      }
    },
  });

  // Footer / aviso legal
  const lastPage = doc.internal.getNumberOfPages();
  doc.setPage(lastPage);
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(M, pageH - 45, W - M, pageH - 45);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  const aviso = config?.aviso_legal || 'Esta herramienta de autodiagnóstico no sustituye la auditoría externa de certificación CRESE.';
  const avisoLines = doc.splitTextToSize(aviso, CW);
  doc.text(avisoLines, W / 2, pageH - 32, { align: 'center' });

  // Page numbers on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Página ${i} de ${totalPages}`, W / 2, pageH - 15, { align: 'center' });
  }

  doc.save(`reporte-crese-${diag.nombre_empresa.replace(/\s+/g, '_').replace(/[^\w-]/g, '')}.pdf`);
}
