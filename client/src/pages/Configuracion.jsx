import React, { useState } from 'react';
import { api } from '../api';

export default function Configuracion({ config, setConfig, navigate }) {
  const [form, setForm] = useState({ ...config });
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await api.config.set(form);
    setConfig(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const field = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="label">{label}</label>
      {type === 'textarea' ? (
        <textarea className="input resize-none" rows={3} value={form[key] || ''} placeholder={placeholder}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
      ) : (
        <input type={type} className="input" value={form[key] || ''} placeholder={placeholder}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
      )}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Configuración</h1>

      <div className="card p-6 space-y-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700">Información de la Organización</h2>
        {field('nombre_organizacion', 'Nombre de la organización', 'text', 'CRESE Certificado...')}
        {field('correo_contacto', 'Correo de contacto', 'email', 'info@crese.org')}
        {field('version_norma', 'Versión de la Norma CRESE', 'text', '2025')}
      </div>

      <div className="card p-6 space-y-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700">Soporte vía WhatsApp</h2>
        {field('whatsapp_numero', 'Número de WhatsApp (con código de país, sin +)', 'text', '527222412988')}
        {field('whatsapp_mensaje', 'Mensaje predeterminado', 'textarea', 'Hola. Estoy realizando el autodiagnóstico...')}
      </div>

      <div className="card p-6 space-y-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700">Textos Legales</h2>
        {field('aviso_legal', 'Aviso legal', 'textarea', 'Esta herramienta de autodiagnóstico...')}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-green-600">{saved ? '✓ Configuración guardada' : ''}</p>
        <button className="btn-primary" onClick={save}>Guardar configuración</button>
      </div>
    </div>
  );
}
