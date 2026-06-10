import React, { useState, useEffect } from 'react';
import { api } from './api';
import Home from './pages/Home';
import DiagnosticoDetail from './pages/DiagnosticoDetail';
import EvaluacionRequisito from './pages/EvaluacionRequisito';
import Dashboard from './pages/Dashboard';
import Configuracion from './pages/Configuracion';
import WhatsAppButton from './components/WhatsAppButton';
import Sidebar from './components/Sidebar';

export default function App() {
  const [norma, setNorma] = useState(null);
  const [config, setConfig] = useState(null);
  const [view, setView] = useState({ page: 'home' });

  useEffect(() => {
    Promise.all([api.norma(), api.config.get()])
      .then(([n, c]) => { setNorma(n); setConfig(c); });
  }, []);

  const navigate = (page, params = {}) => setView({ page, ...params });

  if (!norma || !config) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar view={view} navigate={navigate} />
      <main className="flex-1 min-w-0 overflow-auto pb-16 md:pb-0">
        {view.page === 'home' && (
          <Home norma={norma} navigate={navigate} />
        )}
        {view.page === 'diagnostico' && (
          <DiagnosticoDetail id={view.id} norma={norma} navigate={navigate} />
        )}
        {view.page === 'evaluacion' && (
          <EvaluacionRequisito
            diagId={view.diagId}
            requisito={norma.requisitos.find(r => r.id === view.reqId)}
            norma={norma}
            navigate={navigate}
          />
        )}
        {view.page === 'dashboard' && (
          <Dashboard id={view.id} norma={norma} navigate={navigate} config={config} />
        )}
        {view.page === 'config' && (
          <Configuracion config={config} setConfig={setConfig} navigate={navigate} />
        )}
      </main>
      <WhatsAppButton config={config} />
    </div>
  );
}
