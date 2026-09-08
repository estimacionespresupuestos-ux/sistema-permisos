import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { 
  Users, Factory, Building2, HardHat, Briefcase, MapPin, Key, 
  UserCheck, UserX, Edit3, Save, X, Filter, ChevronDown, 
  ChevronRight, Phone, Mail, Laptop, Truck, Wrench, TrendingUp, 
  Calculator, Palette, ShoppingCart, ShieldAlert, HeartHandshake, Zap
} from 'lucide-react';

const estandarizar = (txt) => txt.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// =========================================================================
// MOTOR DE ICONOS DINÁMICOS POR DEPARTAMENTO
// =========================================================================
const obtenerIconoDepto = (nombre) => {
  const txt = nombre.toUpperCase();
  if (txt.includes('SISTEMA') || txt.includes('TI') || txt.includes('TECNOLOGIA')) return Laptop;
  if (txt.includes('LOGISTICA') || txt.includes('ALMACEN') || txt.includes('EMBARQUE') || txt.includes('CHOFER')) return Truck;
  if (txt.includes('MANTENIMIENTO') || txt.includes('INGENIERIA') || txt.includes('TALLER')) return Wrench;
  if (txt.includes('VENTA') || txt.includes('COMERCIAL') || txt.includes('PROYECTO')) return TrendingUp;
  if (txt.includes('FINANZA') || txt.includes('CONTABILIDAD') || txt.includes('ADMINISTRACION')) return Calculator;
  if (txt.includes('DISEÑO') || txt.includes('MARKETING') || txt.includes('ARQUITECTURA')) return Palette;
  if (txt.includes('COMPRA') || txt.includes('ABASTECIMIENTO')) return ShoppingCart;
  if (txt.includes('SEGURIDAD') || txt.includes('CASETA')) return ShieldAlert;
  if (txt.includes('RECURSO') || txt.includes('RH') || txt.includes('NOMINA')) return HeartHandshake;
  if (txt.includes('PRODUCCION') || txt.includes('MANUFACTURA')) return Factory;
  if (txt.includes('OBRA') || txt.includes('INSTALACION') || txt.includes('ESTIMACION')) return HardHat;
  if (txt.includes('ELECTRIC') || txt.includes('ELECTROMECANICA')) return Zap;
  return Briefcase; // Icono por defecto
};

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
  
  // ESTADO PARA EL ACORDEÓN EN CELULARES
  const [filasExpandidas, setFilasExpandidas] = useState({});

  if (!usuarios || usuarios.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ffffff', background: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(12px)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
        <Users size={48} style={{ opacity: 0.4, marginBottom: '10px' }} />
        <div style={{ fontWeight: '800', fontSize: '16px' }}>Sin colaboradores registrados</div>
        <p style={{ fontSize: '13px', margin: '4px 0 0 0', opacity: 0.7 }}>Agrega personal o ajusta los filtros de búsqueda.</p>
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

  const toggleFilaMobile = (id) => {
    setFilasExpandidas(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const usuariosFiltradosTabla = usuariosPorTipo.filter(u => {
    const pasaDepto = filtroDepto === '' || u.departamento_id === filtroDepto;
    const pasaRol = filtroRol === '' || u.rol === filtroRol;
    return pasaDepto && pasaRol;
  });

  const iniciarEdicion = (user) => {
    setEditandoId(user.id);
    setFilasExpandidas(prev => ({ ...prev, [user.id]: true })); // Expande en celular al editar
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

  const badgeColors = {
    gerente: { bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.5)', text: '#fca5a5', label: 'GERENTE' },
    jefe_area: { bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.5)', text: '#fcd34d', label: 'JEFE DE ÁREA' },
    rh_nominas: { bg: 'rgba(99, 102, 241, 0.2)', border: 'rgba(99, 102, 241, 0.5)', text: '#a5b4fc', label: 'RH / NÓMINAS' },
    caseta: { bg: 'rgba(148, 163, 184, 0.2)', border: 'rgba(148, 163, 184, 0.5)', text: '#cbd5e1', label: 'CASETA' },
    empleado: { bg: 'rgba(34, 197, 94, 0.2)', border: 'rgba(34, 197, 94, 0.5)', text: '#86efac', label: 'EMPLEADO' }
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
      <style>{`
        /* =========================================
           FILTRO DISCRETO EN LA ESQUINA (GLASS PILL)
           ========================================= */
        .filter-pill-discrete {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 0, 0, 0.45) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 20px;
          padding: 6px 14px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        }

        .tipo-select-discrete {
          background: transparent !important;
          border: none !important;
          color: #ffffff !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          outline: none !important;
          cursor: pointer;
          letter-spacing: 0.5px;
        }

        .tipo-select-discrete option {
          background: #090d16 !important;
          color: #ffffff !important;
        }

        /* ÁRBOL DEPARTAMENTAL - CRISTAL AHUMADO */
        .arbol-depto-node-dark {
          background: rgba(0, 0, 0, 0.45) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          margin-bottom: 16px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }

        .arbol-depto-header-dark {
          padding: 16px 18px;
          background: rgba(0, 0, 0, 0.25) !important;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          border-left: 4px solid var(--color-tema, #3b82f6);
          transition: background 0.2s;
        }

        .arbol-depto-header-dark:hover {
          background: rgba(255, 255, 255, 0.05) !important;
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
          background: rgba(255, 255, 255, 0.2);
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
          background: rgba(255, 255, 255, 0.2);
        }

        .cards-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        @media (min-width: 640px) {
          .cards-grid { grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); }
        }

        /* TARJETAS DE COLABORADOR - CRISTAL AHUMADO (VISTA ARBOL) */
        .user-card-pro-dark {
          background: rgba(0, 0, 0, 0.25) !important;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }

        .user-card-pro-dark:hover {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: var(--color-tema, #3b82f6);
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
        }

        /* DATAGRID / EXCEL EN CRISTAL AHUMADO */
        .grid-filters-dark {
          display: flex;
          gap: 10px;
          background: rgba(0, 0, 0, 0.45) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
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
          background: rgba(0, 0, 0, 0.35) !important;
          box-sizing: border-box;
          color: #ffffff;
        }

        .filter-select-dark option {
          background: #090d16;
          color: #ffffff;
        }

        .table-box-dark {
          width: 100%;
          background: rgba(0, 0, 0, 0.45) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
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
          background: rgba(0, 0, 0, 0.25) !important;
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
          background: rgba(0, 0, 0, 0.6) !important;
          color: #ffffff;
        }

        /* CELULARES - ACORDEÓN COMPACTO */
        .mobile-chevron { display: none; }

        @media (max-width: 768px) {
          .responsive-table thead { display: none; }
          
          .responsive-table, 
          .responsive-table tbody, 
          .responsive-table tr { 
            display: block; 
            width: 100%; 
            box-sizing: border-box; 
          }

          .responsive-table tr { 
            margin: 12px; 
            width: calc(100% - 24px);
            border: 1px solid rgba(255, 255, 255, 0.15); 
            border-left: 5px solid var(--color-tema, #3b82f6);
            border-radius: 16px; 
            background: rgba(0, 0, 0, 0.45) !important; 
            backdrop-filter: blur(12px);
            overflow: hidden;
            box-shadow: 0 6px 18px rgba(0,0,0,0.3);
          }

          /* Oculta los TD por defecto en celular */
          .responsive-table td { 
            display: none; 
            text-align: left; 
            padding: 8px 12px; 
            position: relative; 
            border-bottom: 1px dashed rgba(255, 255, 255, 0.12); 
            flex-direction: column;
            gap: 4px;
          }

          /* El TD Colaborador SIEMPRE está visible (es el botón del acordeón) */
          .responsive-table td[data-label="Colaborador"] {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            background: rgba(255, 255, 255, 0.03);
            cursor: pointer;
            padding: 12px;
          }

          .mobile-chevron { display: block; color: rgba(255,255,255,0.5); }

          /* Si la fila tiene la clase .expandida, mostramos los demás TD */
          .responsive-table tr.expandida td {
            display: flex;
          }

          .responsive-table td::before { 
            content: attr(data-label); 
            font-weight: 900; 
            color: #cbd5e1; 
            font-size: 9px; 
            text-transform: uppercase; 
          }

          .responsive-table td[data-label="Colaborador"]::before { display: none; }

          .responsive-table td:last-child { 
            border-bottom: none;
            background: rgba(0, 0, 0, 0.25) !important;
          }
        }
      `}</style>

      {/* =========================================
          CONTROL DISCRETO EN LA ESQUINA
          ========================================= */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
        <div className="filter-pill-discrete">
          <Filter size={14} color="var(--color-tema, #3b82f6)" />
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Filtro:</span>
          <select 
            className="tipo-select-discrete" 
            value={tipoActivo} 
            onChange={e => setTipoActivo(e.target.value)}
          >
            <option value="TODOS">TODOS ({conteoTipos.TODOS})</option>
            <option value="PRODUCCION">PRODUCCIÓN ({conteoTipos.PRODUCCION})</option>
            <option value="ADMINISTRATIVO">ADMINISTRATIVO ({conteoTipos.ADMINISTRATIVO})</option>
            <option value="OBRA">OBRA ({conteoTipos.OBRA})</option>
          </select>
        </div>
      </div>

      {vista === 'arbol' ? (
        /* ÁRBOL ORGANIZACIONAL EN CRISTAL AHUMADO */
        <div>
          {Object.keys(arbol).sort().map(depto => {
            const estaAbierto = deptosAbiertos[depto];
            const totalPersonas = Object.values(arbol[depto]).flat().length;
            
            // ASIGNACIÓN DINÁMICA DE ICONO SEGÚN EL NOMBRE DEL DEPARTAMENTO
            const IconoDepto = obtenerIconoDepto(depto);
            
            return (
              <div key={depto} className="arbol-depto-node-dark">
                <div className="arbol-depto-header-dark" onClick={() => toggleDepto(depto)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    
                    {/* ICONO DEL DEPARTAMENTO */}
                    <div style={{ background: estaAbierto ? 'var(--color-tema, #3b82f6)' : 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                      <IconoDepto size={18} color="#ffffff" />
                    </div>

                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '900', color: '#ffffff' }}>
                        {depto}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>
                        Macro-Departamento • {totalPersonas} {totalPersonas === 1 ? 'Colaborador' : 'Colaboradores'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {estaAbierto ? <ChevronDown size={20} color="var(--color-tema, #3b82f6)"/> : <ChevronRight size={20} color="rgba(255,255,255,0.5)"/>}
                  </div>
                </div>

                {estaAbierto && (
                  <div className="arbol-branch-container-dark">
                    {Object.keys(arbol[depto]).sort().map(area => (
                      <div key={area} className="arbol-area-section">
                        <div className="arbol-area-title-dark">
                          <MapPin size={14} color="var(--color-tema, #3b82f6)" />
                          <span>ÁREA FÍSICA: {area}</span>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>({arbol[depto][area].length})</span>
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
                                  
                                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '3px', background: 'rgba(0, 0, 0, 0.25)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                    <div><strong style={{ color: '#ffffff' }}>PUESTO:</strong> {user.puesto?.toUpperCase() || 'NO ASIGNADO'}</div>
                                    {user.celular && <div><Phone size={11} style={{ verticalAlign: 'middle', marginRight: '4px' }}/>{user.celular}</div>}
                                    {user.correo && <div style={{ wordBreak: 'break-all' }}><Mail size={11} style={{ verticalAlign: 'middle', marginRight: '4px' }}/>{user.correo}</div>}
                                  </div>

                                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '900', background: badge.bg, color: badge.text, border: `1px solid ${badge.border}` }}>
                                      {badge.label}
                                    </span>
                                    <span style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
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
        /* DATAGRID / EXCEL EN CRISTAL AHUMADO */
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
                  const estaExpandida = filasExpandidas[user.id];

                  return (
                    <tr key={user.id} className={estaExpandida ? 'expandida' : ''} style={{ opacity: user.activo ? 1 : 0.6 }}>
                      
                      {/* CELDA VISIBLE SIEMPRE EN CELULAR (ENCABEZADO DEL ACORDEÓN) */}
                      <td data-label="Colaborador" onClick={() => toggleFilaMobile(user.id)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img 
                            src={urlFoto} 
                            alt="Foto" 
                            onClick={(e) => { e.stopPropagation(); setFotoZoom({ url: urlFoto, nombre: user.nombre_completo, puesto: user.puesto }); }}
                            title="Toca para ver foto grande"
                            style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover', cursor: 'pointer', border: '1.5px solid var(--color-tema, #3b82f6)', flexShrink: 0, imageRendering: '-webkit-optimize-contrast' }}
                          />
                          <div>
                            <div style={{ fontWeight: '900', color: '#ffffff' }}>{user.nombre_completo}</div>
                            <div style={{ fontSize: '10px', color: 'var(--color-tema, #3b82f6)', fontWeight: '800' }}>#{user.numero_empleado} • {user.puesto || 'Sin puesto'}</div>
                          </div>
                        </div>
                        <div className="mobile-chevron">
                          {estaExpandida ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                        </div>
                      </td>

                      <td data-label="No. Empleado">
                        {enEdicion ? (
                          <input type="text" className="edit-input-dark" value={datosEdit.numero_empleado} onChange={e => setDatosEdit({...datosEdit, numero_empleado: e.target.value})} />
                        ) : (
                          <strong style={{ color: 'var(--color-tema, #3b82f6)', fontSize: '13px' }}>#{user.numero_empleado}</strong>
                        )}
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
                        ) : <span style={{ fontWeight: '800', color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>{user.tipo_personal?.toUpperCase()}</span>}
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
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                            {user.celular || 'Sin celular'}
                          </div>
                        )}
                      </td>

                      <td data-label="Acciones">
                        {enEdicion ? (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-start' }}>
                            <button disabled={guardando} onClick={() => guardarEdicionRapida(user.id)} style={{ background: '#22c55e', border: 'none', color: '#ffffff', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontWeight: '900', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}><Save size={14}/> GUARDAR</button>
                            <button onClick={(e) => { e.stopPropagation(); setEditandoId(null); }} style={{ background: '#ef4444', border: 'none', color: '#ffffff', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontWeight: '900', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}><X size={14}/> CANCELAR</button>
                          </div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); iniciarEdicion(user); }} style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', color: 'var(--color-tema, #3b82f6)', padding: '6px 12px', cursor: 'pointer', fontWeight: '900', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Edit3 size={14} /> EDITAR</button>
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
            <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '12px', fontSize: '11px', letterSpacing: '1px' }}>
              TOCA EN CUALQUIER PARTE PARA CERRAR
            </p>
          </div>
        </div>
      )}
    </div>
  );
}