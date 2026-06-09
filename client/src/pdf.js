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
  doc.rect(0, 0, W, 160, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('Reporte de Diagnóstico / Auditoría Interna', W / 2, 60, { align: 'center' });

  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(191, 219, 254);
  doc.text('Norma CRESE 2025', W / 2, 85, { align: 'center' });

  const fechaGen = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.setFontSize(9);
  doc.setTextColor(147, 197, 253);
  doc.text(`Generado el ${fechaGen}`, W / 2, 105, { align: 'center' });

  // ── Empresa info ─────────────────────────────────────────────────────
  let y = 185;

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

  y += boxH + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...sc(proyectado));
  doc.text(`Categoría estimada: ${categoria(proyectado)}`, W / 2, y, { align: 'center' });
  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('El puntaje proyectado considera los 25 requisitos; los no evaluados se computan como 0.', W / 2, y, { align: 'center' });
  y += 20;

  // ── Requisitos table ─────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 64, 175);
  doc.text('RESULTADOS POR REQUISITO', M, y);
  y += 4;
  doc.setLineWidth(0.5);
  doc.line(M, y, W - M, y);
  y += 8;

  const tableRows = [];
  for (const tema of norma.temas) {
    tableRows.push([{ content: `Tema ${tema.id}: ${tema.nombre}`, colSpan: 3, styles: { fillColor: [239, 246, 255], textColor: [30, 64, 175], fontStyle: 'bold', fontSize: 9 } }]);
    for (const rId of tema.requisitos) {
      const req = norma.requisitos.find(r => r.id === rId);
      const ev = evalMap[rId];
      let statusText, statusColor;
      if (!ev) { statusText = 'Sin evaluar'; statusColor = [156, 163, 175]; }
      else if (ev.bloqueado) { statusText = 'No Cumple'; statusColor = [220, 38, 38]; }
      else if (!ev.completado) { statusText = 'En progreso'; statusColor = [59, 130, 246]; }
      else { statusText = `${ev.puntuacion_total.toFixed(0)}%`; statusColor = sc(ev.puntuacion_total); }

      tableRows.push([
        { content: req.numero, styles: { halign: 'center', textColor: [107, 114, 128], fontSize: 8 } },
        { content: req.nombre, styles: { fontSize: 9 } },
        { content: statusText, styles: { halign: 'center', fontStyle: 'bold', textColor: statusColor, fontSize: 9 } },
      ]);
    }
  }

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: CW - 30 - 70 }, 2: { cellWidth: 70 } },
    body: tableRows,
    theme: 'plain',
    styles: { cellPadding: { top: 4, bottom: 4, left: 4, right: 4 }, lineColor: [243, 244, 246], lineWidth: 0.3 },
    didDrawPage: (data) => {
      // page number footer
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(`Página ${doc.internal.getCurrentPageInfo().pageNumber}`, W / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' });
    },
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

  const drawAnalysisSection = (title, color, items, renderRow) => {
    if (!items.length) return;
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
    y += 10;
  };

  drawAnalysisSection('Fortalezas principales', [22, 163, 74], fortalezas, (e) => {
    const req = norma.requisitos.find(r => r.id === e.requisito_id);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(31, 41, 55);
    const text = `  ✓  Req. ${req.numero} — ${req.nombre}`;
    const truncated = text.length > 70 ? text.substring(0, 68) + '…' : text;
    doc.text(truncated, M, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text(`${e.puntuacion_total.toFixed(0)}%`, W - M, y, { align: 'right' });
    y += 14;
  });

  drawAnalysisSection('Áreas prioritarias de mejora (<60%)', [234, 88, 12], oportunidades, (e) => {
    const req = norma.requisitos.find(r => r.id === e.requisito_id);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(31, 41, 55);
    const text = `  ⚠  Req. ${req.numero} — ${req.nombre}`;
    const truncated = text.length > 70 ? text.substring(0, 68) + '…' : text;
    doc.text(truncated, M, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(234, 88, 12);
    doc.text(`${e.puntuacion_total.toFixed(0)}%`, W - M, y, { align: 'right' });
    y += 14;
  });

  drawAnalysisSection('Requisitos bloqueados por mínimos auditables', [220, 38, 38], bloqueadosList, (e) => {
    const req = norma.requisitos.find(r => r.id === e.requisito_id);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(31, 41, 55);
    const text = `  ✗  Req. ${req.numero} — ${req.nombre}: No cumple mínimos auditables`;
    const lines = doc.splitTextToSize(text, CW);
    doc.text(lines, M, y);
    y += lines.length * 13;
  });

  // Criteria averages
  if (conPuntuacion.length > 0) {
    if (y > 650) { doc.addPage(); y = 60; }
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
