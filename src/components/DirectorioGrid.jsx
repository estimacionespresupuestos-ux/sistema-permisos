import React from 'react';
import { Briefcase, Key, UserCheck, UserX, MapPin } from 'lucide-react';

export default function DirectorioGrid({ usuarios, onRestablecerPin, onToggleEstado }) {
  
  if (!usuarios || usuarios.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: '#64748b', fontSize: '14px', fontWeight: '500' }}>
        No se encontraron colaboradores con esos datos.
      </div>
    );
  }

  // MAGIA ORGANIZACIONAL: Agrupamos a los usuarios por su Departamento
  const usuariosAgrupados = usuarios.reduce((grupos, user) => {
    const depto = user.departamentos?.nombre?.toUpperCase() || 'SIN DEPARTAMENTO';
    if (!grupos[depto]) grupos[depto] = [];
    grupos[depto].push(user);
    return grupos;
  }, {});

  // Ordenamos los departamentos alfabéticamente para que se vean impecables
  const departamentosOrdenados = Object.keys(usuariosAgrupados).sort();

  const obtenerBadges = (rol) => {
    const colores = {
      gerente: { bg: '#fee2e2', text: '#991b1b', label: 'GERENTE' },
      jefe_area: { bg: '#fef3c7', text: '#92400e', label: 'JEFE DE ÁREA' },
      rh_nominas: { bg: '#e0e7ff', text: '#3730a3', label: 'RH / NÓMINAS' },
      caseta: { bg: '#e2e8f0', text: '#334155', label: 'CASETA' },
      empleado: { bg: '#dcfce7', text: '#166534', label: 'EMPLEADO' }
    };
    return colores[rol] || colores.empleado;
  };

  return (
    <>
      <style>{`
        .depto-section { margin-bottom: 30px; }
        .depto-title { font-size: 14px; font-weight: 900; color: #334155; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; display: flex; align-items: center; gap: 8px; }
        
        /* Grid 100% Responsivo */
        .grid-usuarios { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; }
        
        .tarjeta-user { background: rgba(255,255,255,0.85); border: 1px solid rgba(0,0,0,0.06); border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); transition: transform 0.2s ease; }
        .tarjeta-user:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.06); }
        
        .t-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .t-avatar { width: 55px; height: 55px; border-radius: 50%; object-fit: cover; object-position: center 15%; border: 2px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.08); }
        .t-acciones { display: flex; gap: 6px; }
        .btn-accion { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; cursor: pointer; color: #64748b; transition: all 0.2s; }
        .btn-accion:hover { background: #f1f5f9; }
        
        .t-nombre { font-size: 15px; font-weight: 800; color: #1e293b; margin: 0 0 4px 0; text-transform: uppercase; }
        .t-tags { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; flex-wrap: wrap; }
        .tag-usuario { font-size: 11px; color: #0ea5e9; font-weight: 800; }
        .tag-num { font-size: 10px; background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-weight: 700; }
        
        .t-info { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #475569; margin-bottom: 4px; }
        .t-badge { padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; align-self: flex-start; margin-top: 8px; }
      `}</style>

      <div>
        {departamentosOrdenados.map((depto) => (
          <div key={depto} className="depto-section">
            <h3 className="depto-title">
              <Briefcase size={16} color="#0ea5e9" />
              {depto} <span style={{ color: '#94a3b8', fontSize: '12px' }}>({usuariosAgrupados[depto].length})</span>
            </h3>
            
            <div className="grid-usuarios">
              {usuariosAgrupados[depto].map((user) => {
                const badge = obtenerBadges(user.rol);
                const areaTexto = user.area ? user.area.toUpperCase() : 'GENERAL';
                const puestoTexto = user.puesto ? user.puesto.toUpperCase() : 'SIN PUESTO';
                
                return (
                  <div key={user.id} className="tarjeta-user" style={{ opacity: user.activo ? 1 : 0.5 }}>
                    
                    <div className="t-header">
                      <img src={user.foto_url || `https://ui-avatars.com/api/?name=${user.nombre_completo}&background=e2e8f0`} alt="Avatar" className="t-avatar" />
                      <div className="t-acciones">
                        <button className="btn-accion" title="Cambiar PIN" onClick={() => onRestablecerPin(user.id, user.nombre_completo)}>
                          <Key size={14} />
                        </button>
                        <button className="btn-accion" style={{ color: user.activo ? '#ef4444' : '#22c55e' }} title={user.activo ? "Dar de baja" : "Reactivar"} onClick={() => onToggleEstado(user.id, user.activo)}>
                          {user.activo ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="t-nombre">{user.nombre_completo}</h4>
                      <div className="t-tags">
                        <span className="tag-usuario">@{user.usuario_login}</span>
                        <span className="tag-num">{user.numero_empleado.toUpperCase()}</span>
                      </div>
                      
                      <div className="t-info">
                        <Briefcase size={13} color="#64748b" /> 
                        <span><strong>ÁREA:</strong> {areaTexto}</span>
                      </div>
                      
                      <div className="t-info">
                        <MapPin size={13} color="#94a3b8" /> 
                        <span style={{ color: '#64748b' }}>{puestoTexto} ({user.tipo_personal.toUpperCase()})</span>
                      </div>

                      <div className="t-badge" style={{ backgroundColor: badge.bg, color: badge.text }}>
                        {badge.label}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}