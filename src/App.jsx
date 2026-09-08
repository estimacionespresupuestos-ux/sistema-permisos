import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import AdminUsuarios from './pages/AdminUsuarios';
import Layout from './components/Layout'; 
import Login from './pages/Login';
import MisPermisos from './pages/MisPermisos';
import Aprobaciones from './pages/Aprobaciones';
import Caseta from './pages/Caseta';
import AprobarDirecto from './pages/AprobarDirecto';

function RutasProtegidas() {
  const { usuario, iniciarSesion } = useAuth();

  // Si no hay sesión, mostramos Login
  if (!usuario) {
    return <Login alEntrar={iniciarSesion} />;
  }

  // Si SÍ hay sesión, mostramos el Menú Lateral (Layout)
  return <Layout />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta pública para aprobación directa por WhatsApp */}
          <Route path="/aprobar-directo" element={<AprobarDirecto />} />
          
          {/* Rutas Privadas envueltas en RutasProtegidas */}
          <Route element={<RutasProtegidas />}>
            <Route path="/mis-permisos" element={<MisPermisos />} />
            <Route path="/aprobaciones" element={<Aprobaciones />} />
            <Route path="/caseta" element={<Caseta />} />
            <Route path="/directorio" element={<AdminUsuarios />} />
            
            {/* Redirección por defecto */}
            <Route path="/" element={<Navigate to="/mis-permisos" replace />} />
          </Route>
          
          {/* Comodín de seguridad al final de todas las rutas */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}