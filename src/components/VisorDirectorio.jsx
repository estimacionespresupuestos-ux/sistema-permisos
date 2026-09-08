import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Briefcase, Key, UserCheck, UserX, MapPin, Edit3, Save, X, Filter, ChevronDown, ChevronRight, Phone, Mail } from 'lucide-react';

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

  if (!usuarios || usuarios.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontWeight: '500' }}>No se encontraron colaboradores.</div>;
  }

  const usuariosPorTipo = usuarios.filter(u => 
    tipoActivo === 'TODOS' || u.tipo_personal?.toLowerCase() === tipoActivo.toLowerCase()
  );

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

  const badgeColors = {
    gerente: { bg: '#fee2e2', text: '#991b1b', label: 'GERENTE' },
    jefe_area: { bg: '#fef3c7', text: '#92400e', label: 'JEFE ÁREA' },
    rh_nominas: { bg: '#e0e7ff', text: '#3730a3', label: 'RH / NÓMINAS' },
    caseta: { bg: '#e2e8f0', text: '#334155', label: 'CASETA' },
    empleado: { bg: '#dcfce7', text: '#166534', label: 'EMPLEADO' }
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
      <style>{`
        /* TABS RESPONSIVAS CON SCROLL SUAVE */
        .tabs-bar {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 6px;
          margin-bottom: 15px;
          -webkit-overflow-scrolling: touch;
        }

        .tab-item {
          padding: 8px 14px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          font-weight: 800;
          font-size: 11px;
          cursor: pointer;
          white-space: nowrap;
          background: #fff;
          color: #64748b;
          flex-shrink: 0;
        }

        .tab-item.active {
          background: var(--color-tema, #0f172a);
          color: #fff;
          border-color: var(--color-tema, #0f172a);
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        }

        /* ACORDEÓN ÁRBOL */
        .depto-bar {
          padding: 12px 14px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          margin-bottom: 8px;
        }

        .depto-body {
          padding: 10px 8px;
          border-left: 3px solid var(--color-tema, #0f172a);
          background: rgba(255,255,255,0.5);
          margin-bottom: 15px;
          border-radius: 0 10px 10px 12px;
        }

        .cards-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        @media (min-width: 600px) {
          .cards-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
        }

        .user-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-sizing: border-box;
          word-break: break-word;
        }

        /* FILTROS DATAGRID */
        .grid-filters {
          display: flex;
          gap: 8px;
          background: #f8fafc;
          padding: 12px;
          border-radius: 12px 12px 0 0;
          border: 1px solid #e2e8f0;
          border-bottom: none;
          flex-wrap: wrap;
        }

        .filter-select {
          padding: 8px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 11px;
          font-weight: 600;
          outline: none;
          flex: 1 1 140px;
          box-sizing: border-box;
        }

        .table-box {
          width: 100%;
          background: #fff;
          border-radius: 0 0 12px 12px;
          border: 1px solid #e2e8f0;
          box-sizing: border-box;
        }

        .responsive-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          text-align: left;
        }

        .responsive-table th {
          background: #f1f5f9;
          padding: 10px;
          font-weight: 800;
          color: #334155;
          border-bottom: 2px solid #cbd5e1;
          white-space: nowrap;
        }

        .responsive-table td {
          padding: 10px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .edit-input {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--color-tema, #0f172a);
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          outline: none;
          box-sizing: border-box;
          background: #fff;
        }

        /* TRANSFORMACIÓN LIMPIA A TARJETAS EN CELULARES */
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
            margin-bottom: 12px; 
            border: 1px solid #e2e8f0; 
            border-left: 4px solid var(--color-tema, #0f172a);
            border-radius: 12px; 
            background: #fff; 
            padding: 8px 10px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.03);
          }

          .responsive-table td { 
            text-align: left; 
            padding: 22px 6px 6px 6px; 
            position: relative; 
            border-bottom: 1px dashed #f1f5f9; 
            min-height: 48px;
          }

          .responsive-table td::before { 
            content: attr(data-label); 
            position: absolute; 
            top: 5px; 
            left: 6px; 
            font-weight: 800; 
            color: #64748b; 
            font-size: 9px; 
            text-transform: uppercase; 
            letter-spacing: 0.5px;
          }

          .responsive-table td:last-child { 
            border-bottom: none;
            background: #f8fafc;
            border-radius: 8px;
            margin-top: 6px;
            padding: 8px;
          }
        }
      `}</style>

      {/* CLASIFICACIÓN TIPO DE PERSONAL */}
      <div className="tabs-bar">
        {['TODOS', 'PRODUCCION', 'ADMINISTRATIVO', 'OBRA'].map(tipo => (
          <button 
            key={tipo} 
            onClick={() => setTipoActivo(tipo)} 
            className={`tab-item ${tipoActivo === tipo ? 'active' : ''}`}
          >
            {tipo.toUpperCase()}
          </button>
        ))}
      </div>

      {vista === 'arbol' ? (
        /* ÁRBOL DE JERARQUÍAS */
        <div>
          {Object.keys(arbol).sort().map(depto => {
            const estaAbierto = deptosAbiertos[depto];
            const totalPersonas = Object.values(arbol[depto]).flat().length;
            
            return (
              <div key={depto}>
                <div className="depto-bar" onClick={() => toggleDepto(depto)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Briefcase size={18} color={estaAbierto ? 'var(--color-tema, #0f172a)' : '#64748b'} />
                    <span style={{ fontSize: '13px', fontWeight: '900', color: estaAbierto ? 'var(--color-tema, #0f172a)' : '#1e293b' }}>{depto}</span>
                    <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: '800', color: '#475569' }}>
                      {totalPersonas}
                    </span>
                  </div>
                  {estaAbierto ? <ChevronDown size={18} color="var(--color-tema, #0f172a)"/> : <ChevronRight size={18} color="#94a3b8"/>}
                </div>

                {estaAbierto && (
                  <div className="depto-body">
                    {Object.keys(arbol[depto]).sort().map(area => (
                      <div key={area} style={{ marginBottom: '15px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} color="#64748b"/> {area} ({arbol[depto][area].length})
                        </div>

                        <div className="cards-grid">
                          {arbol[depto][area].map(user => {
                            const badge = badgeColors[user.rol] || badgeColors.empleado;
                            return (
                              <div key={user.id} className="user-card" style={{ opacity: user.activo ? 1 : 0.5 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <img 
                                    src={user.foto_url || `https://ui-avatars.com/api/?name=${user.nombre_completo}&background=f1f5f9&color=000`} 
                                    alt="Foto" 
                                    style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                                  />
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <button onClick={() => onRestablecerPin(user.id, user.nombre_completo)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '5px', cursor: 'pointer' }}><Key size={13} color="#64748b"/></button>
                                    <button onClick={() => onToggleEstado(user.id, user.activo)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '5px', cursor: 'pointer' }}>
                                      {user.activo ? <UserX size={13} color="#ef4444"/> : <UserCheck size={13} color="#22c55e"/>}
                                    </button>
                                  </div>
                                </div>

                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{user.nombre_completo}</div>
                                  <div style={{ fontSize: '10px', color: 'var(--color-tema, #0f172a)', fontWeight: '800' }}>@{user.usuario_login} • {user.numero_empleado}</div>
                                  
                                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <div><strong>PUESTO:</strong> {user.puesto?.toUpperCase() || 'NO ASIGNADO'}</div>
                                    {user.celular && <div><Phone size={10} style={{ verticalAlign: 'middle' }}/> {user.celular}</div>}
                                    {user.correo && <div style={{ wordBreak: 'break-all' }}><Mail size={10} style={{ verticalAlign: 'middle' }}/> {user.correo}</div>}
                                  </div>

                                  <span style={{ display: 'inline-block', marginTop: '8px', padding: '3px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '900', background: badge.bg, color: badge.text }}>
                                    {badge.label}
                                  </span>
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
        /* DATAGRID / TABLA RESPONSIVA */
        <div>
          <div className="grid-filters">
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '800', color: '#475569', fontSize: '11px' }}><Filter size={14} /> FILTROS:</div>
            <select className="filter-select" value={filtroDepto} onChange={e => setFiltroDepto(e.target.value)}>
              <option value="">TODOS LOS DEPARTAMENTOS</option>
              {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
            <select className="filter-select" value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
              <option value="">TODOS LOS ROLES</option>
              <option value="gerente">GERENTES</option>
              <option value="jefe_area">JEFES DE ÁREA</option>
              <option value="rh_nominas">RECURSOS HUMANOS</option>
              <option value="empleado">EMPLEADOS</option>
              <option value="caseta">CASETA</option>
            </select>
          </div>

          <div className="table-box">
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>No. Emp</th>
                  <th>Colaborador</th>
                  <th>Departamento</th>
                  <th>Área Física</th>
                  <th>Puesto Real</th>
                  <th>Tipo Nómina</th>
                  <th>Rol ERP</th>
                  <th>Contacto</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltradosTabla.map(user => {
                  const enEdicion = editandoId === user.id;
                  const badge = badgeColors[user.rol] || badgeColors.empleado;

                  return (
                    <tr key={user.id} style={{ opacity: user.activo ? 1 : 0.6 }}>
                      <td data-label="No. Empleado">
                        {enEdicion ? <input type="text" className="edit-input" value={datosEdit.numero_empleado} onChange={e => setDatosEdit({...datosEdit, numero_empleado: e.target.value})} /> : <strong>{user.numero_empleado}</strong>}
                      </td>

                      <td data-label="Colaborador">
                        <div style={{ fontWeight: '800', color: '#1e293b' }}>{user.nombre_completo}</div>
                        <div style={{ fontSize: '10px', color: 'var(--color-tema, #0f172a)', fontWeight: '800' }}>@{user.usuario_login}</div>
                      </td>

                      <td data-label="Departamento">
                        {enEdicion ? (
                          <select className="edit-input" value={datosEdit.departamento_id} onChange={handleEditDepto}>
                            {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                            <option value="NEW" style={{fontWeight: '900', color: 'var(--color-tema, #0f172a)'}}>+ CREAR NUEVO...</option>
                          </select>
                        ) : user.departamentos?.nombre?.toUpperCase()}
                      </td>

                      <td data-label="Área Física">
                        {enEdicion ? (
                          <select className="edit-input" value={datosEdit.area} onChange={handleEditArea}>
                            {!areas.includes(datosEdit.area) && datosEdit.area !== '' && <option value={datosEdit.area}>{datosEdit.area}</option>}
                            {areas.map(a => <option key={a} value={a}>{a}</option>)}
                            <option value="NEW" style={{fontWeight: '900', color: 'var(--color-tema, #0f172a)'}}>+ CREAR NUEVA...</option>
                          </select>
                        ) : user.area?.toUpperCase()}
                      </td>

                      <td data-label="Puesto">
                        {enEdicion ? (
                          <select className="edit-input" value={datosEdit.puesto} onChange={handleEditPuesto}>
                            {!puestos.includes(datosEdit.puesto) && datosEdit.puesto !== '' && <option value={datosEdit.puesto}>{datosEdit.puesto}</option>}
                            <option value="">-- SIN PUESTO --</option>
                            {puestos.map(p => <option key={p} value={p}>{p}</option>)}
                            <option value="NEW" style={{fontWeight: '900', color: 'var(--color-tema, #0f172a)'}}>+ CREAR NUEVO...</option>
                          </select>
                        ) : user.puesto?.toUpperCase()}
                      </td>

                      <td data-label="Tipo Nómina">
                        {enEdicion ? (
                          <select className="edit-input" value={datosEdit.tipo_personal} onChange={e => setDatosEdit({...datosEdit, tipo_personal: e.target.value})}>
                            <option value="produccion">PRODUCCION</option>
                            <option value="administrativo">ADMINISTRATIVO</option>
                            <option value="obra">OBRA</option>
                          </select>
                        ) : user.tipo_personal?.toUpperCase()}
                      </td>

                      <td data-label="Rol ERP">
                        {enEdicion ? (
                          <select className="edit-input" value={datosEdit.rol} onChange={e => setDatosEdit({...datosEdit, rol: e.target.value})}>
                            <option value="empleado">EMPLEADO</option>
                            <option value="jefe_area">JEFE ÁREA</option>
                            <option value="gerente">GERENTE</option>
                            <option value="rh_nominas">RH / NÓMINAS</option>
                            <option value="caseta">CASETA</option>
                          </select>
                        ) : <span style={{ background: badge.bg, color: badge.text, padding: '2px 5px', borderRadius: '4px', fontSize: '9px', fontWeight: '900' }}>{badge.label}</span>}
                      </td>

                      <td data-label="Contacto">
                        {enEdicion ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <input type="tel" placeholder="Celular" className="edit-input" value={datosEdit.celular} onChange={e => setDatosEdit({...datosEdit, celular: e.target.value})} />
                            <input type="email" placeholder="Correo" className="edit-input" value={datosEdit.correo} onChange={e => setDatosEdit({...datosEdit, correo: e.target.value})} />
                          </div>
                        ) : (
                          <div style={{ fontSize: '10px', color: '#64748b' }}>
                            {user.celular || 'Sin cel'}
                          </div>
                        )}
                      </td>

                      <td data-label="Acciones">
                        {enEdicion ? (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-start' }}>
                            <button disabled={guardando} onClick={() => guardarEdicionRapida(user.id)} style={{ background: '#dcfce7', border: 'none', color: '#22c55e', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}><Save size={14}/> GUARDAR</button>
                            <button onClick={() => setEditandoId(null)} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}><X size={14}/> CANCELAR</button>
                          </div>
                        ) : (
                          <button onClick={() => iniciarEdicion(user)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', color: 'var(--color-tema, #0f172a)', padding: '5px 10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Edit3 size={14} /> EDITAR</button>
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
    </div>
  );
}