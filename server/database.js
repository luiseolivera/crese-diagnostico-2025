const { Low } = require('lowdb');
const { JSONFileSync } = require('lowdb/node');
const path = require('path');
const os = require('os');
const fs = require('fs');

const DB_DIR = path.join(os.homedir(), '.crese-diagnostico');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const adapter = new JSONFileSync(path.join(DB_DIR, 'db.json'));
const db = new Low(adapter, {
  diagnosticos: [],
  evaluaciones: [],
  configuracion: {
    nombre_organizacion: 'CRESE Certificado de Calidad Humana y Responsabilidad Social',
    whatsapp_numero: '527222412988',
    whatsapp_mensaje: 'Hola. Estoy realizando el autodiagnóstico de la Norma CRESE y necesito apoyo con algunas dudas.',
    correo_contacto: 'info@crese.org',
    version_norma: '2025',
    aviso_legal: 'Esta herramienta de autodiagnóstico no sustituye la auditoría externa de certificación CRESE. Su propósito es servir como evaluación previa de preparación.',
  },
});

db.read();

module.exports = db;
