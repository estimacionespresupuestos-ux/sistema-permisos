import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';

export default function Caseta() {
  const { usuario, cerrarSesion } = useAuth();
  const [permisosAprobados, setPermisosAprobados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState(null);

  useEffect(() => {
    cargarAprobados();
  }, []);

  const cargarAprobados = async () => {
    setCargando(true);
    
    const { data, error } = await supabase
      .from('permisos')
      .select('*, usuarios!empleado_id(nombre, username)')
      .eq('estado', 'aprobado')
      .order('id', { ascending: false });

    if (error) {
      console.error("Error al cargar permisos:", error);
    } else {
      setPermisosAprobados(data || []);
    }
    setCargando(false);
  };

  const registrarTiempo = async (idPermiso, tipo) => {
    setProcesandoId(idPermiso);
    
    // Obtenemos la hora actual del dispositivo en formato HH:MM (24hrs)
    const ahora = new Date();
    const horaLocal = ahora.toLocaleTimeString('es-MX', { hour12: false, hour: '2-digit', minute: '2-digit' });

    const campoActualizar = tipo === 'salida' ? { hora_salida_real: horaLocal } : { hora_regreso_real: horaLocal };

    try {
      const { error } = await supabase
        .from('permisos')
        .update(campoActualizar)
        .eq('id', idPermiso);

      if (error) {
        alert("Ocurrió un error al registrar la hora");
      } else {
        cargarAprobados(); // Recargamos para ver los cambios
      }
    } catch (err) {
      alert("Error de conexión");
    } finally {
      setProcesandoId(null);
    }
  };

  const permisosFiltrados = permisosAprobados.filter((p) => {
    const termino = busqueda.toLowerCase().trim();
    const nombreEmpleado = p.usuarios?.nombre?.toLowerCase() || '';
    const folioStr = p.id.toString();
    return nombreEmpleado.includes(termino) || folioStr.includes(termino);
  });

  return (
    <div style={styles.contenedorPadre}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.tituloHeader}>MONITOR DE CASETA</h1>
          <p style={styles.subtituloHeader}>VIGILANCIA — {usuario?.nombre || 'GUARDIA'}</p>
        </div>
        <button onClick={cerrarSesion} style={styles.botonSalir}>
          SALIR
        </button>
      </header>

      <main style={styles.contenido}>
        <div style={styles.contenedorBuscador}>
          <label style={styles.label}>BUSCAR EMPLEADO O FOLIO</label>
          <input 
            type="text" 
            style={styles.inputBuscador} 
            placeholder="Escribe el nombre o folio (#)..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <h2 style={styles.subtitulo}>PASES AUTORIZADOS ({permisosFiltrados.length})</h2>

        {cargando ? (
          <p style={styles.textoVacio}>Cargando pases autorizados...</p>
        ) : permisosFiltrados.length === 0 ? (
          <p style={styles.textoVacio}>No hay pases aprobados para mostrar.</p>
        ) : (
          <div style={styles.lista}>
            {permisosFiltrados.map((p) => (
              <div key={p.id} style={styles.tarjeta}>
                <div style={styles.headerTarjeta}>
                  <div>
                    <span style={styles.folio}>FOLIO #{p.id}</span>
                    <h3 style={styles.nombreEmpleado}>{p.usuarios?.nombre || 'Empleado'}</h3>
                  </div>
                  <span style={styles.badgeAprobado}>AUTORIZADO</span>
                </div>

                <div style={styles.detalles}>
                  <p style={styles.infoTexto}><strong>Fecha:</strong> {p.fecha_permiso}</p>
                  <p style={styles.infoTexto}><strong>Horario Solicitado:</strong> {p.hora_inicio} a {p.hora_fin}</p>
                  <p style={styles.infoTexto}><strong>Motivo:</strong> {p.motivo}</p>
                </div>

                {/* CONTROLES DE CASETA (SALIDA Y REGRESO) */}
                <div style={styles.controlesCaseta}>
                  {!p.hora_salida_real ? (
                    // Si no ha salido, mostramos botón de registrar salida
                    <button 
                      onClick={() => registrarTiempo(p.id, 'salida')}
                      disabled={procesandoId === p.id}
                      style={styles.botonAccion}
                    >
                      {procesandoId === p.id ? 'GUARDANDO...' : 'REGISTRAR SALIDA'}
                    </button>
                  ) : (
                    // Si ya salió, mostramos la hora real de salida
                    <div style={styles.registroTiempo}>
                      <p style={styles.textoTiempo}>Salida confirmada: <strong>{p.hora_salida_real.substring(0,5)}</strong></p>
                      
                      {!p.hora_regreso_real ? (
                        // Si no ha regresado, mostramos botón de registrar regreso
                        <button 
                          onClick={() => registrarTiempo(p.id, 'regreso')}
                          disabled={procesandoId === p.id}
                          style={{ ...styles.botonAccion, backgroundColor: '#f3f4f6', color: '#000', border: '2px solid #e5e7eb' }}
                        >
                          {procesandoId === p.id ? 'GUARDANDO...' : 'REGISTRAR REGRESO'}
                        </button>
                      ) : (
                        // Si ya regresó, mostramos la hora real de regreso
                        <p style={styles.textoTiempo}>Regreso confirmado: <strong>{p.hora_regreso_real.substring(0,5)}</strong></p>
                      )}
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  contenedorPadre: {
    minHeight: '100vh',
    backgroundColor: '#fff',
    color: '#000',
    fontFamily: 'system-ui, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '2px solid #f0f0f0',
    maxWidth: '900px',
    margin: '0 auto'
  },
  tituloHeader: {
    fontSize: '18px',
    fontWeight: '900',
    letterSpacing: '2px',
    margin: 0
  },
  subtituloHeader: {
    fontSize: '12px',
    color: '#888',
    margin: '4px 0 0 0',
    letterSpacing: '1px'
  },
  botonSalir: {
    padding: '10px 18px',
    backgroundColor: '#000',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: '800',
    cursor: 'pointer',
    letterSpacing: '1px'
  },
  contenido: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '20px'
  },
  contenedorBuscador: {
    marginBottom: '30px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '11px',
    fontWeight: '800',
    color: '#888',
    letterSpacing: '1px'
  },
  inputBuscador: {
    width: '100%',
    padding: '18px',
    border: '2px solid #f0f0f0',
    borderRadius: '15px',
    fontSize: '16px',
    outline: 'none',
    backgroundColor: '#fafafa',
    boxSizing: 'border-box'
  },
  subtitulo: {
    fontSize: '13px',
    letterSpacing: '3px',
    color: '#888',
    marginBottom: '20px',
    fontWeight: '900'
  },
  lista: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  tarjeta: {
    padding: '20px',
    border: '2px solid #f0f0f0',
    borderRadius: '15px',
    backgroundColor: '#fafafa'
  },
  headerTarjeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px'
  },
  folio: {
    fontSize: '11px',
    fontWeight: '800',
    color: '#888',
    letterSpacing: '1px'
  },
  nombreEmpleado: {
    fontSize: '16px',
    fontWeight: '900',
    margin: '2px 0 0 0',
    letterSpacing: '0.5px'
  },
  badgeAprobado: {
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '10px',
    fontWeight: '900',
    letterSpacing: '1px',
    color: '#15803d',
    backgroundColor: '#dcfce7'
  },
  detalles: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  infoTexto: {
    fontSize: '13px',
    color: '#444',
    margin: 0
  },
  controlesCaseta: {
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid #eaeaea',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  botonAccion: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#000',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '900',
    cursor: 'pointer',
    letterSpacing: '1px'
  },
  registroTiempo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  textoTiempo: {
    fontSize: '14px',
    color: '#15803d', /* Verde oscuro */
    backgroundColor: '#dcfce7',
    padding: '10px 15px',
    borderRadius: '8px',
    margin: 0
  },
  textoVacio: {
    color: '#aaa',
    fontSize: '13px',
    letterSpacing: '1px'
  }
};