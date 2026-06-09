# CRESE Autodiagnóstico 2025

Aplicación web local para el autodiagnóstico de la Norma CRESE 2025 - Sistema de Gestión de Calidad Humana, Responsabilidad Social y Sostenibilidad.

## Iniciar la aplicación

**Opción 1 — Doble clic:**
Ejecuta `INICIAR.bat`

**Opción 2 — Terminal:**
```bash
npm start
```

La aplicación se abrirá en `http://localhost:3000`

## Arquitectura

| Componente | Tecnología |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Base de datos | SQLite (local, en `~/.crese-diagnostico/`) |
| PDF | PDFKit |

## Datos de la Norma

Los datos de la Norma CRESE 2025 se almacenan en `server/data/norma-crese.json`. Para actualizar la norma a una versión futura, edita únicamente ese archivo sin tocar el código fuente.

## Funcionalidades

- ✅ Gestión de múltiples diagnósticos
- ✅ Evaluación de los 25 requisitos de la Norma CRESE 2025
- ✅ Validación de mínimos auditables (bloqueo automático)
- ✅ Escala de madurez 0/25/50/75/100% con descripciones
- ✅ Matriz de participación directa (4x5 = 20 cuadrantes)
- ✅ Dashboard visual con gráficas por tema y criterio
- ✅ Reporte PDF descargable
- ✅ Exportar/importar diagnósticos
- ✅ Botón flotante de WhatsApp
- ✅ Configuración del sistema
- ✅ Funciona 100% sin internet

## Base de datos

Los diagnósticos se guardan en:
```
Windows: C:\Users\[tu usuario]\.crese-diagnostico\diagnosticos.db
```

Para hacer un respaldo, copia ese archivo `.db`.
