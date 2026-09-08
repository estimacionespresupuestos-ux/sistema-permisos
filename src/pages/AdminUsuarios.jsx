import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import ModalColaborador from '../components/ModalColaborador';
import VisorDirectorio from '../components/VisorDirectorio';
import { Search, Plus, LayoutGrid, TableProperties } from 'lucide-react';

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [areasUnicas, setAreasUnicas] = useState([]);
  const [puestosUnicos, setPuestosUnicos] = useState([]);
  
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [vista, setVista] = useState('arbol');

  const cargarDatos = async () => {
    setCargando(true);
    
    const { data: listUsuarios, error: errU } = await supabase
      .from('usuarios')
      .select('id, numero_empleado, nombre_completo, usuario_login, puesto, area, rol, tipo_personal, foto_url, activo, departamento_id, fecha_ingreso, celular, telefono, correo')
      .order('nombre_completo', { ascending: true });

    if (errU) console.error("Error usuarios:", errU);

    const { data: listDeptos, error: errD } = await supabase
      .from('departamentos')
      .select('id, nombre')
      .order('nombre', { ascending: true });

    if (errD) console.error("Error deptos:", errD);

    if (listUsuarios && listDeptos) {
      const deptosFormateados = listDeptos
        .map(d => ({ ...d, nombre: d.nombre.toUpperCase() }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
        
      setDepartamentos(deptosFormateados);

      const usuariosCruzados = listUsuarios.map(user => {
        const deptoEncontrado = deptosFormateados.find(d => d.id === user.departamento_id);
        return {
          ...user,
          departamentos: { nombre: deptoEncontrado ? deptoEncontrado.nombre : 'SIN DEPARTAMENTO' }
        };
      });

      setUsuarios(usuariosCruzados);
      
      const estandar = (txt) => txt.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      setAreasUnicas([...new Set(listUsuarios.map(u => u.area ? estandar(u.area) : null).filter(Boolean))].sort());
      setPuestosUnicos([...new Set(listUsuarios.map(u => u.puesto ? estandar(u.puesto) : null).filter(Boolean))].sort());
    }
    setCargando(false);
  };

  useEffect(() => { cargarDatos(); }, []);

  const toggleEstado = async (id, actual) => {
    await supabase.from('usuarios').update({ activo: !actual }).eq('id', id);
    cargarDatos(); 
  };

  const restablecerPin = async (id, nombre) => {
    const nuevoPin = prompt(`NUEVO PIN (Mínimo 6 dígitos) para ${nombre.toUpperCase()}:`);
    if (nuevoPin && nuevoPin.length >= 6) {
      await supabase.from('usuarios').update({ pin: nuevoPin }).eq('id', id);
      alert('PIN actualizado correctamente.');
      cargarDatos();
    } else if (nuevoPin) {
      alert("El PIN debe tener al menos 6 dígitos.");
    }
  };

  const usuariosFiltrados = usuarios.filter(u =>
    u.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.area?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.puesto?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.numero_empleado?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.correo?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <>
      <style>{`
        .admin-container {
          display: flex;
          flex-direction: column;
          gap: 15px;
          padding: 10px;
          width: 100%;
          box-sizing: border-box;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .admin-title {
          font-size: 20px;
          font-weight: 900;
          color: var(--color-tema);
          margin: 0;
          letter-spacing: 0.5px;
        }

        .admin-sub {
          font-size: 12px;
          color: #64748b;
          margin: 2px 0 0 0;
        }

        .admin-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          width: 100%;
          justify-content: space-between;
        }

        @media (min-width: 600px) {
          .admin-container { padding: 20px; gap: 20px; }
          .admin-title { font-size: 24px; }
          .admin-actions { width: auto; justify-content: flex-end; }
        }

        .view-switch {
          display: flex;
          background: #f1f5f9;
          border-radius: 10px;
          padding: 3px;
        }

        .switch-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 800;
          font-size: 12px;
          background: transparent;
          color: #64748b;
        }

        .switch-btn.active {
          background: #fff;
          color: var(--color-tema);
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }

        .btn-nuevo-main {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: var(--color-tema);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 12px color-mix(in srgb, var(--color-tema) 30%, transparent);
        }

        .search-box {
          position: relative;
          width: 100%;
        }

        .search-input {
          width: 100%;
          padding: 12px 12px 12px 42px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          outline: none;
          font-size: 14px;
          box-sizing: border-box;
          background: #fff;
        }

        .search-input:focus {
          border-color: var(--color-tema);
        }
      `}</style>

      <div className="admin-container">
        <header className="admin-header">
          <div>
            <h1 className="admin-title">DIRECTORIO CORPORATIVO</h1>
            <p className="admin-sub">Organización y Estructura de Personal ERP</p>
          </div>
          
          <div className="admin-actions">
            <div className="view-switch">
              <button 
                onClick={() => setVista('arbol')}
                className={`switch-btn ${vista === 'arbol' ? 'active' : ''}`}
              >
                <LayoutGrid size={16} /> <span className="hide-mobile">Árbol</span>
              </button>
              <button 
                onClick={() => setVista('excel')}
                className={`switch-btn ${vista === 'excel' ? 'active' : ''}`}
              >
                <TableProperties size={16} /> <span className="hide-mobile">DataGrid</span>
              </button>
            </div>

            <button onClick={() => setModalAbierto(true)} className="btn-nuevo-main">
              <Plus size={18} strokeWidth={3} />
              <span>NUEVO</span>
            </button>
          </div>
        </header>

        <div className="search-box">
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, área, puesto, num. empleado..." 
            className="search-input"
            value={busqueda} 
            onChange={(e) => setBusqueda(e.target.value)} 
          />
        </div>

        {cargando ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontWeight: '600' }}>
            Sincronizando estructura organizacional...
          </div>
        ) : (
          <VisorDirectorio 
            usuarios={usuariosFiltrados} 
            vista={vista} 
            departamentos={departamentos}
            areas={areasUnicas}
            puestos={puestosUnicos}
            onToggleEstado={toggleEstado} 
            onRestablecerPin={restablecerPin} 
            recargarDatos={cargarDatos}
          />
        )}

        {modalAbierto && (
          <ModalColaborador 
            departamentos={departamentos} 
            areas={areasUnicas} 
            puestos={puestosUnicos}
            onClose={() => setModalAbierto(false)} 
            onSuccess={() => { setModalAbierto(false); cargarDatos(); }}
          />
        )}
      </div>
    </>
  );
}