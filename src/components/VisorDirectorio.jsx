import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { 
  Users, Factory, Building2, HardHat, Briefcase, MapPin, Key, 
  UserCheck, UserX, Edit3, Save, X, Filter, ChevronDown, 
  ChevronRight, Phone, Mail 
} from 'lucide-react';

const estandarizar = (txt) => txt.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function VisorDirectorio({ 
  usuarios, vista, onToggleEstado, onRestablecerPin, 
  departamentos, areas, puestos, recargarDatos 
}) {
  const [tipoActivo, setTipoActivo] = useState('TODOS');
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [filtroDepto, setFiltroDepto] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [datosEdit, setDatosEdit] = useState({});
  const [deptosAbiertos, setDeptosAbiertos] = useState({});
  const [fotoZoom, setFotoZoom] = useState(null);

  if (!usuarios || usuarios.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(16px)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
        <Users size={48} style={{ opacity: 0.4, marginBottom: '10px' }} />
        <div style={{ fontWeight: '800', fontSize: '16px', color: '#ffffff' }}>Sin colaboradores registrados</div>
        <p style={{ fontSize: '13px', margin: '4px 0 0 0' }}>Agrega personal o ajusta los filtros de búsqueda.</p>
      </div>
    );
  }

  const usuariosPorTipo = usuarios.filter(u => 
    tipoActivo === 'TODOS' || u.tipo_personal?.toLowerCase() === tipoActivo.toLowerCase()
  );

  const conteoTipos = {
    TODOS: usuarios.length,
    PRODUCCION: usuarios.filter(u => u.tipo_personal?.toLowerCase() === 'produccion').length,
    ADMINISTRATIVO: usuarios.filter(u => u.tipo_personal?.toLowerCase() === 'administrativo').length,
    OBRA: usuarios.filter(u => u.tipo_personal?.toLowerCase() === 'obra').length
  };

  const arbol = usuariosPorTipo.reduce((acc, user) => {
    const depto = user.departamentos?.nombre?.toUpperCase() || 'SIN DEPARTAMENTO';
    const area = user.area?.toUpperCase() || 'GENERAL';
    if (!acc[depto]) acc[depto] = {};
    if (!acc[depto][area]) acc[depto][area] = [];
    acc[depto][area].push(user);
    return acc;
  }, {});

  const toggleDepto = (depto) => {
    setDeptosAbiertos(prev => ({ ...prev, [depto]: !prev[depto] }));
  };

  const usuariosFiltradosTabla = usuariosPorTipo.filter(u => {
    const pasaDepto = filtroDepto === '' || u.departamento_id === filtroDepto;
    const pasaRol = filtroRol === '' || u.rol === filtroRol;
    return pasaDepto && pasaRol;
  });

  const iniciarEdicion = (user) => {
    setEditandoId(user.id);
    setDatosEdit({
      numero_empleado: user.numero_empleado,
      departamento_id: user.departamento_id,
      area: user.area || '',
      puesto: user.puesto || '',
      rol: user.rol,
      tipo_personal: user.tipo_personal || 'produccion',
      celular: user.celular || '',
      correo: user.correo || ''
    });
  };

  const handleEditDepto = async (e) => {
    const val = e.target.value;
    if (val === 'NEW') {
      const nuevo = prompt("NUEVO MACRO-DEPARTAMENTO:");
      if (nuevo && nuevo.trim()) {
        const nomLimpio = estandarizar(nuevo);
        if (window.confirm(`¿Crear departamento "${nomLimpio}"?`)) {
          const { data, error } = await supabase.from('departamentos').insert([{ nombre: nomLimpio }]).select().single();
          if (error) return alert("Error: " + error.message);
          setDatosEdit(prev => ({ ...prev, departamento_id: data.id }));
          recargarDatos(); 
        }
      }
    } else {
      setDatosEdit(prev => ({ ...prev, departamento_id: val }));
    }
  };

  const handleEditArea = (e) => {
    const val = e.target.value;
    if (val === 'NEW') {
      const nueva = prompt("NUEVA ÁREA:");
      if (nueva && nueva.trim()) setDatosEdit(prev => ({ ...prev, area: estandarizar(nueva) }));
    } else {
      setDatosEdit(prev => ({ ...prev, area: val }));
    }
  };

  const handleEditPuesto = (e) => {
    const val = e.target.value;
    if (val === 'NEW') {
      const nuevo = prompt("NUEVO PUESTO:");
      if (nuevo && nuevo.trim()) setDatosEdit(prev => ({ ...prev, puesto: estandarizar(nuevo) }));
    } else {
      setDatosEdit(prev => ({ ...prev, puesto: val }));
    }
  };

  const guardarEdicionRapida = async (id) => {
    if (!datosEdit.numero_empleado || !datosEdit.departamento_id || !datosEdit.area) {
      return alert("Faltan campos obligatorios.");
    }
    setGuardando(true);
    try {
      const { error } = await supabase.from('usuarios').update({
        numero_empleado: datosEdit.numero_empleado.toUpperCase(),
        departamento_id: datosEdit.departamento_id,
        area: datosEdit.area.toUpperCase(),
        puesto: datosEdit.puesto.toUpperCase(),
        rol: datosEdit.rol,
        tipo_personal: datosEdit.tipo_personal,
        celular: datosEdit.celular || null,
        correo: datosEdit.correo.toLowerCase()
      }).eq('id', id);

      if (error) throw error;
      setEditandoId(null);
      recargarDatos(); 
    } catch (err) { 
      alert("Error: " + err.message); 
    } finally { 
      setGuardando(false); 
    }
  };

  // Badges luminosos optimizados para Dark Mode
  const badgeColors = {
    gerente: { bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.5)', text: '#fca5a5', label: 'GERENTE' },
    jefe_area: { bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.5)', text: '#fcd34d', label: 'JEFE DE ÁREA' },
    rh_nominas: { bg: 'rgba(99, 102, 241, 0.2)', border: 'rgba(99, 102, 241, 0.5)', text: '#a5b4fc', label: 'RH / NÓMINAS' },
    caseta: { bg: 'rgba(148, 163, 184, 0.2)', border: 'rgba(148, 163, 184, 0.5)', text: '#cbd5e1', label: 'CASETA' },
    empleado: { bg: 'rgba(34, 197, 94, 0.2)', border: 'rgba(34, 197, 94, 0.5)', text: '#86efac', label: 'EMPLEADO' }
  };

  const categoriasHeader = [
    { id: 'TODOS', label: 'TODOS', Icono: Users, count: conteoTipos.TODOS },
    { id: 'PRODUCCION', label: 'PRODUCCIÓN', Icono: Factory, count: conteoTipos.PRODUCCION },
    { id: 'ADMINISTRATIVO', label: 'ADMINISTRATIVO', Icono: Building2, count: conteoTipos.ADMINISTRATIVO },
    { id: 'OBRA', label: 'OBRA', Icono: HardHat, count: conteoTipos.OBRA }
  ];

  return (
    <div style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
      <style>{`
      /* TARJETAS SUPERIORES HERO - CRISTAL PURO */
        .hero-categories-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }

        @media (min-width: 768px) {
          .hero-categories-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 14px;
          }
        }

        .cat-card-dark {
          background: rgba(255, 255, 255, 0.08) !important;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 16px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.25s ease;
          user-select: none;
          color: #ffffff;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        }

        .cat-card-dark:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.18) !important;
          border-color: var(--color-tema, #3b82f6);
        }

        .cat-card-dark.active {
          background: var(--color-tema, #3b82f6) !important;
          border-color: var(--color-tema, #3b82f6);
          color: #ffffff;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
        }

        .cat-icon-wrapper-dark {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .cat-card-dark.active .cat-icon-wrapper-dark {
          background: rgba(255, 255, 255, 0.25);
          color: #ffffff;
        }

        .cat-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .cat-label {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cat-count {
          font-size: 18px;
          font-weight: 900;
          line-height: 1.1;
        }

        /* ÁRBOL DEPARTAMENTAL - CRISTAL PURO */
        .arbol-depto-node-dark {
          background: rgba(0, 0, 0, 0.2) !important;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          margin-bottom: 16px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }

        .arbol-depto-header-dark {
          padding: 16px 18px;
          background: rgba(255, 255, 255, 0.05) !important;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          border-left: 5px solid var(--color-tema, #3b82f6);
          transition: background 0.2s;
        }

        .arbol-depto-header-dark:hover {
          background: rgba(255, 255, 255, 0.12) !important;
        }

        .arbol-branch-container-dark {
          padding: 16px;
          background: rgba(0, 0, 0, 0.1) !important;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .arbol-area-section {
          position: relative;
          padding-left: 20px;
          margin-bottom: 20px;
        }

        .arbol-area-section::before {
          content: '';
          position: absolute;
          left: 6px;
          top: 12px;
          bottom: 0;
          width: 2px;
          background: rgba(255, 255, 255, 0.25);
        }

        .arbol-area-title-dark {
          font-size: 12px;
          font-weight: 900;
          color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 1px;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 12px;
          position: relative;
        }

        .arbol-area-title-dark::before {
          content: '';
          position: absolute;
          left: -14px;
          top: 50%;
          width: 10px;
          height: 2px;
          background: rgba(255, 255, 255, 0.25);
        }

        .cards-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        @media (min-width: 640px) {
          .cards-grid { grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); }
        }

        /* TARJETAS DE COLABORADOR - CRISTAL PURO */
        .user-card-pro-dark {
          background: rgba(255, 255, 255, 0.08) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 16px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-sizing: border-box;
          transition: all 0.2s ease;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        }

        .user-card-pro-dark:hover {
          background: rgba(255, 255, 255, 0.15) !important;
          border-color: var(--color-tema, #3b82f6);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
          transform: translateY(-2px);
        }

        .avatar-img-sharp-dark {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          object-fit: cover;
          cursor: pointer;
          border: 2px solid var(--color-tema, #3b82f6);
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          image-rendering: -webkit-optimize-contrast;
        }

        /* DATAGRID / EXCEL EN CRISTAL PURO */
        .grid-filters-dark {
          display: flex;
          gap: 10px;
          background: rgba(0, 0, 0, 0.2) !important;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          padding: 14px 16px;
          border-radius: 16px 16px 0 0;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-bottom: none;
          flex-wrap: wrap;
          align-items: center;
        }

        .filter-select-dark {
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          font-size: 12px;
          font-weight: 700;
          outline: none;
          flex: 1 1 160px;
          background: rgba(255, 255, 255, 0.1) !important;
          box-sizing: border-box;
          color: #ffffff;
        }

        .filter-select-dark option {
          background: #090d16;
          color: #ffffff;
        }

        .table-box-dark {
          width: 100%;
          background: rgba(0, 0, 0, 0.2) !important;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 0 0 16px 16px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-sizing: border-box;
          overflow: hidden;
        }

        .responsive-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          text-align: left;
        }

        .responsive-table th {
          background: rgba(255, 255, 255, 0.1) !important;
          padding: 12px 14px;
          font-weight: 900;
          color: #ffffff;
          border-bottom: 2px solid rgba(255, 255, 255, 0.15);
          white-space: nowrap;
          font-size: 11px;
          text-transform: uppercase;
        }

        .responsive-table td {
          padding: 12px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          vertical-align: middle;
          color: #ffffff;
        }

        .edit-input-dark {
          width: 100%;
          padding: 8px 10px;
          border: 1.5px solid var(--color-tema, #3b82f6);
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          outline: none;
          box-sizing: border-box;
          background: rgba(0, 0, 0, 0.4) !important;
          color: #ffffff;
        }

        /* CELULARES - CRISTAL PURO */
        @media (max-width: 768px) {
          .responsive-table thead { display: none; }
          
          .responsive-table, 
          .responsive-table tbody, 
          .responsive-table tr, 
          .responsive-table td { 
            display: block; 
            width: 100%; 
            box-sizing: border-box; 
          }

          .responsive-table tr { 
            margin: 12px; 
            width: calc(100% - 24px);
            border: 1px solid rgba(255, 255, 255, 0.18); 
            border-left: 5px solid var(--color-tema, #3b82f6);
            border-radius: 16px; 
            background: rgba(255, 255, 255, 0.08) !important; 
            backdrop-filter: blur(12px);
            padding: 12px;
            box-shadow: 0 6px 18px rgba(0,0,0,0.3);
          }

          .responsive-table td { 
            text-align: left; 
            padding: 24px 8px 8px 8px; 
            position: relative; 
            border-bottom: 1px dashed rgba(255, 255, 255, 0.12); 
            min-height: 44px;
          }

          .responsive-table td::before { 
            content: attr(data-label); 
            position: absolute; 
            top: 6px; 
            left: 8px; 
            font-weight: 900; 
            color: #cbd5e1; 
            font-size: 9px; 
            text-transform: uppercase; 
          }

          .responsive-table td:last-child { 
            border-bottom: none;
            background: rgba(0, 0, 0, 0.25) !important;
            border-radius: 10px;
            margin-top: 8px;
            padding: 10px;
          }
        }
      `}</style>

      {/* CLASIFICADOR HERO SUPERIOR */}
      <div className="hero-categories-grid">
        {categoriasHeader.map(({ id, label, Icono, count }) => {
          const esActivo = tipoActivo === id;
          return (
            <div 
              key={id} 
              className={`cat-card-dark ${esActivo ? 'active' : ''}`}
              onClick={() => setTipoActivo(id)}
            >
              <div className="cat-icon-wrapper-dark">
                <Icono size={22} />
              </div>
              <div className="cat-info">
                <span className="cat-label">{label}</span>
                <span className="cat-count">{count}</span>
              </div>
            </div>
          );
        })}
      </div>

      {vista === 'arbol' ? (
        /* ÁRBOL ORGANIZACIONAL EN CRISTAL OSCURO */
        <div>
          {Object.keys(arbol).sort().map(depto => {
            const estaAbierto = deptosAbiertos[depto];
            const totalPersonas = Object.values(arbol[depto]).flat().length;
            
            return (
              <div key={depto} className="arbol-depto-node-dark">
                <div className="arbol-depto-header-dark" onClick={() => toggleDepto(depto)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Briefcase size={20} color={estaAbierto ? 'var(--color-tema, #3b82f6)' : '#94a3b8'} />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '900', color: '#ffffff' }}>
                        {depto}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>
                        Macro-Departamento • {totalPersonas} {totalPersonas === 1 ? 'Colaborador' : 'Colaboradores'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ background: 'var(--color-tema, #3b82f6)', color: '#ffffff', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '900' }}>
                      {totalPersonas}
                    </span>
                    {estaAbierto ? <ChevronDown size={20} color="var(--color-tema, #3b82f6)"/> : <ChevronRight size={20} color="#94a3b8"/>}
                  </div>
                </div>

                {estaAbierto && (
                  <div className="arbol-branch-container-dark">
                    {Object.keys(arbol[depto]).sort().map(area => (
                      <div key={area} className="arbol-area-section">
                        <div className="arbol-area-title-dark">
                          <MapPin size={14} color="var(--color-tema, #3b82f6)" />
                          <span>ÁREA FÍSICA: {area}</span>
                          <span style={{ color: '#94a3b8', fontSize: '11px' }}>({arbol[depto][area].length})</span>
                        </div>

                        <div className="cards-grid">
                          {arbol[depto][area].map(user => {
                            const badge = badgeColors[user.rol] || badgeColors.empleado;
                            const urlFoto = user.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nombre_completo)}&background=1e293b&color=fff`;
                            
                            return (
                              <div key={user.id} className="user-card-pro-dark" style={{ opacity: user.activo ? 1 : 0.55 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  
                                  <img 
                                    src={urlFoto} 
                                    alt="Foto" 
                                    className="avatar-img-sharp-dark"
                                    onClick={() => setFotoZoom({ url: urlFoto, nombre: user.nombre_completo, puesto: user.puesto })}
                                    title="Toca para ver foto grande"
                                  />

                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <button onClick={() => onRestablecerPin(user.id, user.nombre_completo)} style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', padding: '6px', cursor: 'pointer' }} title="Restablecer PIN"><Key size={14} color="#cbd5e1"/></button>
                                    <button onClick={() => onToggleEstado(user.id, user.activo)} style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', padding: '6px', cursor: 'pointer' }} title={user.activo ? "Desactivar" : "Activar"}>
                                      {user.activo ? <UserX size={14} color="#ef4444"/> : <UserCheck size={14} color="#22c55e"/>}
                                    </button>
                                  </div>
                                </div>

                                <div>
                                  <div style={{ fontSize: '14px', fontWeight: '900', color: '#ffffff', lineHeight: 1.2 }}>{user.nombre_completo}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--color-tema, #3b82f6)', fontWeight: '800', marginTop: '2px' }}>
                                    @{user.usuario_login} • EMP-#{user.numero_empleado}
                                  </div>
                                  
                                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '3px', background: 'rgba(15, 23, 42, 0.6)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                    <div><strong style={{ color: '#ffffff' }}>PUESTO:</strong> {user.puesto?.toUpperCase() || 'NO ASIGNADO'}</div>
                                    {user.celular && <div><Phone size={11} style={{ verticalAlign: 'middle', marginRight: '4px' }}/>{user.celular}</div>}
                                    {user.correo && <div style={{ wordBreak: 'break-all' }}><Mail size={11} style={{ verticalAlign: 'middle', marginRight: '4px' }}/>{user.correo}</div>}
                                  </div>

                                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '900', background: badge.bg, color: badge.text, border: `1px solid ${badge.border}` }}>
                                      {badge.label}
                                    </span>
                                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>
                                      {user.tipo_personal}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* DATAGRID / EXCEL EN CRISTAL OSCURO */
        <div>
          <div className="grid-filters-dark">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '900', color: '#ffffff', fontSize: '12px' }}>
              <Filter size={16} color="var(--color-tema, #3b82f6)" /> FILTROS:
            </div>
            <select className="filter-select-dark" value={filtroDepto} onChange={e => setFiltroDepto(e.target.value)}>
              <option value="">TODOS LOS DEPARTAMENTOS</option>
              {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
            <select className="filter-select-dark" value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
              <option value="">TODOS LOS ROLES ERP</option>
              <option value="gerente">GERENTES</option>
              <option value="jefe_area">JEFES DE ÁREA</option>
              <option value="rh_nominas">RECURSOS HUMANOS</option>
              <option value="empleado">EMPLEADOS</option>
              <option value="caseta">CASETA</option>
            </select>
          </div>

          <div className="table-box-dark">
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>No. Emp</th>
                  <th>Colaborador</th>
                  <th>Departamento</th>
                  <th>Área Física</th>
                  <th>Puesto Real</th>
                  <th>Nómina</th>
                  <th>Rol ERP</th>
                  <th>Contacto</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltradosTabla.map(user => {
                  const enEdicion = editandoId === user.id;
                  const badge = badgeColors[user.rol] || badgeColors.empleado;
                  const urlFoto = user.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nombre_completo)}&background=1e293b&color=fff`;

                  return (
                    <tr key={user.id} style={{ opacity: user.activo ? 1 : 0.6 }}>
                      <td data-label="No. Empleado">
                        {enEdicion ? (
                          <input type="text" className="edit-input-dark" value={datosEdit.numero_empleado} onChange={e => setDatosEdit({...datosEdit, numero_empleado: e.target.value})} />
                        ) : (
                          <strong style={{ color: 'var(--color-tema, #3b82f6)', fontSize: '13px' }}>#{user.numero_empleado}</strong>
                        )}
                      </td>

                      <td data-label="Colaborador">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img 
                            src={urlFoto} 
                            alt="Foto" 
                            onClick={() => setFotoZoom({ url: urlFoto, nombre: user.nombre_completo, puesto: user.puesto })}
                            title="Toca para ver foto grande"
                            style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover', cursor: 'pointer', border: '1.5px solid var(--color-tema, #3b82f6)', flexShrink: 0, imageRendering: '-webkit-optimize-contrast' }}
                          />
                          <div>
                            <div style={{ fontWeight: '900', color: '#ffffff' }}>{user.nombre_completo}</div>
                            <div style={{ fontSize: '10px', color: 'var(--color-tema, #3b82f6)', fontWeight: '800' }}>@{user.usuario_login}</div>
                          </div>
                        </div>
                      </td>

                      <td data-label="Departamento">
                        {enEdicion ? (
                          <select className="edit-input-dark" value={datosEdit.departamento_id} onChange={handleEditDepto}>
                            {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                            <option value="NEW" style={{fontWeight: '900', color: 'var(--color-tema, #3b82f6)'}}>+ CREAR NUEVO...</option>
                          </select>
                        ) : user.departamentos?.nombre?.toUpperCase()}
                      </td>

                      <td data-label="Área Física">
                        {enEdicion ? (
                          <select className="edit-input-dark" value={datosEdit.area} onChange={handleEditArea}>
                            {!areas.includes(datosEdit.area) && datosEdit.area !== '' && <option value={datosEdit.area}>{datosEdit.area}</option>}
                            {areas.map(a => <option key={a} value={a}>{a}</option>)}
                            <option value="NEW" style={{fontWeight: '900', color: 'var(--color-tema, #3b82f6)'}}>+ CREAR NUEVA...</option>
                          </select>
                        ) : user.area?.toUpperCase()}
                      </td>

                      <td data-label="Puesto Real">
                        {enEdicion ? (
                          <select className="edit-input-dark" value={datosEdit.puesto} onChange={handleEditPuesto}>
                            {!puestos.includes(datosEdit.puesto) && datosEdit.puesto !== '' && <option value={datosEdit.puesto}>{datosEdit.puesto}</option>}
                            <option value="">-- SIN PUESTO --</option>
                            {puestos.map(p => <option key={p} value={p}>{p}</option>)}
                            <option value="NEW" style={{fontWeight: '900', color: 'var(--color-tema, #3b82f6)'}}>+ CREAR NUEVO...</option>
                          </select>
                        ) : user.puesto?.toUpperCase() || 'NO ASIGNADO'}
                      </td>

                      <td data-label="Nómina">
                        {enEdicion ? (
                          <select className="edit-input-dark" value={datosEdit.tipo_personal} onChange={e => setDatosEdit({...datosEdit, tipo_personal: e.target.value})}>
                            <option value="produccion">PRODUCCIÓN</option>
                            <option value="administrativo">ADMINISTRATIVO</option>
                            <option value="obra">OBRA</option>
                          </select>
                        ) : <span style={{ fontWeight: '800', color: '#cbd5e1', fontSize: '11px' }}>{user.tipo_personal?.toUpperCase()}</span>}
                      </td>

                      <td data-label="Rol ERP">
                        {enEdicion ? (
                          <select className="edit-input-dark" value={datosEdit.rol} onChange={e => setDatosEdit({...datosEdit, rol: e.target.value})}>
                            <option value="empleado">EMPLEADO</option>
                            <option value="jefe_area">JEFE ÁREA</option>
                            <option value="gerente">GERENTE</option>
                            <option value="rh_nominas">RH / NÓMINAS</option>
                            <option value="caseta">CASETA</option>
                          </select>
                        ) : (
                          <span style={{ background: badge.bg, color: badge.text, border: `1px solid ${badge.border}`, padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '900' }}>
                            {badge.label}
                          </span>
                        )}
                      </td>

                      <td data-label="Contacto">
                        {enEdicion ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <input type="tel" placeholder="Celular" className="edit-input-dark" value={datosEdit.celular} onChange={e => setDatosEdit({...datosEdit, celular: e.target.value})} />
                            <input type="email" placeholder="Correo" className="edit-input-dark" value={datosEdit.correo} onChange={e => setDatosEdit({...datosEdit, correo: e.target.value})} />
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                            {user.celular || 'Sin celular'}
                          </div>
                        )}
                      </td>

                      <td data-label="Acciones">
                        {enEdicion ? (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-start' }}>
                            <button disabled={guardando} onClick={() => guardarEdicionRapida(user.id)} style={{ background: '#22c55e', border: 'none', color: '#ffffff', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontWeight: '900', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}><Save size={14}/> GUARDAR</button>
                            <button onClick={() => setEditandoId(null)} style={{ background: '#ef4444', border: 'none', color: '#ffffff', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontWeight: '900', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}><X size={14}/> CANCELAR</button>
                          </div>
                        ) : (
                          <button onClick={() => iniciarEdicion(user)} style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', color: 'var(--color-tema, #3b82f6)', padding: '6px 12px', cursor: 'pointer', fontWeight: '900', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Edit3 size={14} /> EDITAR</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LIGHTBOX AMPLIFICADOR DE FOTOS */}
      {fotoZoom && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.92)',
            backdropFilter: 'blur(12px)',
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center',
            zIndex: 3500, padding: '20px'
          }}
          onClick={() => setFotoZoom(null)}
        >
          <div 
            style={{ position: 'relative', textAlign: 'center', maxWidth: '90%', maxHeight: '85vh' }}
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setFotoZoom(null)}
              style={{
                position: 'absolute', top: '-45px', right: '0',
                background: 'rgba(255,255,255,0.25)', border: 'none',
                color: '#fff', fontSize: '20px', borderRadius: '50%',
                width: '38px', height: '38px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              ✕
            </button>
            <img 
              src={fotoZoom.url} 
              alt="Foto ampliada" 
              style={{
                maxWidth: '100%', maxHeight: '70vh',
                borderRadius: '16px', objectFit: 'contain',
                boxShadow: '0 10px 35px rgba(0,0,0,0.8)',
                border: '3px solid var(--color-tema, #3b82f6)',
                imageRendering: '-webkit-optimize-contrast'
              }} 
            />
            <div style={{ color: '#ffffff', marginTop: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: '900' }}>{fotoZoom.nombre}</div>
              {fotoZoom.puesto && <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '2px' }}>{fotoZoom.puesto}</div>}
            </div>
            <p style={{ color: '#94a3b8', marginTop: '12px', fontSize: '11px', letterSpacing: '1px' }}>
              TOCA EN CUALQUIER PARTE PARA CERRAR
            </p>
          </div>
        </div>
      )}
    </div>
  );
}