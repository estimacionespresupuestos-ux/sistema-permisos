import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { registrarSuscripcionPush } from '../services/notificaciones';

export default function Aprobaciones() {
  const { usuario, cerrarSesion } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState(null);
  const [notifActivadas, setNotifActivadas] = useState(false);
  const [guardandoPush, setGuardandoPush] = useState(false);

  const activarNotificacionesWeb = useCallback(async (mostrarAlerts = true) => {
    setGuardandoPush(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || usuario?.id;

      if (!userId) {
        if (mostrarAlerts) alert("Error: No hay una sesión activa de usuario.");
        setGuardandoPush(false);
        return;
      }

      const suscripcion = await registrarSuscripcionPush();
      
      if (suscripcion) {
        // CORREGIDO: Usa .upsert() con onConflict 'usuario_id' para EVITAR DUPLICADOS
        const { error } = await supabase
          .from('suscripciones_push')
          .upsert(
            [
              {
                usuario_id: userId,
                subscription: suscripcion
              }
            ],
            { onConflict: 'usuario_id' }
          );

        if (error) {
          console.error("Error al guardar en Supabase:", error);
          if (mostrarAlerts) alert("Error de base de datos: " + error.message);
        } else {
          setNotifActivadas(true);
          if (mostrarAlerts) alert("¡Dispositivo vinculado con éxito para recibir alertas!");
        }
      } else {
        if (mostrarAlerts) alert("No se pudo obtener la suscripción Web Push desde el navegador.");
      }
    } catch (error) {
      console.error("Error en activación Push:", error);
      if (mostrarAlerts) alert("Error al activar notificaciones: " + error.message);
    } finally {
      setGuardandoPush(false);
    }
  }, [usuario?.id]);

  const comprobarYRegistrarNotificaciones = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotifActivadas(true);
      await activarNotificacionesWeb(false);
    }
  }, [activarNotificacionesWeb]);

  const cargarSolicitudes = useCallback(async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('permisos')
      .select('*, usuarios!empleado_id(nombre, username)')
      .order('id', { ascending: false });

    if (!error) setSolicitudes(data || []);
    setCargando(false);
  }, []);

  useEffect(() => {
    if (usuario?.id) {
      cargarSolicitudes();
      comprobarYRegistrarNotificaciones();
    }
  }, [usuario?.id, cargarSolicitudes, comprobarYRegistrarNotificaciones]);

  const responderSolicitud = async (idPermiso, nuevoEstado, empleadoId) => {
    setProcesandoId(idPermiso);
    try {
      const { error } = await supabase
        .from('permisos')
        .update({ estado: nuevoEstado })
        .eq('id', idPermiso);

      if (!error) {
        if (empleadoId) {
          // Obtener la suscripción push activa del empleado
          const { data: suscripciones, error: errSub } = await supabase
            .from('suscripciones_push')
            .select('subscription')
            .eq('usuario_id', empleadoId);

          if (errSub) console.error("Error consultando suscripción del empleado:", errSub);

          if (suscripciones && suscripciones.length > 0) {
            const mensajeEstado = nuevoEstado === 'aprobado' ? 'Aprobado ✅' : 'Rechazado ❌';
            
            const envios = suscripciones.map(item =>
              fetch('/api/notificar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  subscription: item.subscription,
                  titulo: `Permiso ${mensajeEstado}`,
                  mensaje: `Tu solicitud de permiso FOLIO #${idPermiso} ha sido ${nuevoEstado}.`
                })
              }).catch(err => console.error("Error al notificar empleado:", err))
            );

            await Promise.allSettled(envios);
          }
        }

        cargarSolicitudes();
      }
    } catch (err) {
      alert("Error al procesar la solicitud: " + err.message);
    } finally {
      setProcesandoId(null);
    }
  };

  const obtenerEtiquetaEstado = (estado) => {
    switch (estado) {
      case 'pendiente_jefe': return { texto: 'PENDIENTE JEFE', color: '#d97706', bg: '#fef3c7' };
      case 'aprobado': return { texto: 'APROBADO', color: '#15803d', bg: '#dcfce7' };
      case 'rechazado': return { texto: 'RECHAZADO', color: '#b91c1c', bg: '#fee2e2' };
      default: return { texto: estado ? estado.toUpperCase() : 'PENDIENTE', color: '#4b5563', bg: '#f3f4f6' };
    }
  };

  return (
    <div style={styles.contenedorPadre}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.tituloHeader}>PANEL DE APROBACIONES</h1>
          <p style={styles.subtituloHeader}>{usuario?.nombre}</p>
        </div>
        <button onClick={cerrarSesion} style={styles.botonSalir}>SALIR</button>
      </header>

      <main style={styles.contenido}>
        <div style={notifActivadas ? styles.alertaActiva : styles.alertaNotificacion}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>
            {notifActivadas 
              ? "🟢 PERMISOS DEL NAVEGADOR ACTIVOS" 
              : "⚠️ ACTIVAR NOTIFICACIONES PUSH EN ESTE TELÉFONO"}
          </p>
          <button 
            onClick={() => activarNotificacionesWeb(true)} 
            disabled={guardandoPush}
            style={styles.botonNotificacion}
          >
            {guardandoPush ? "VINCULANDO..." : "VINCULAR / RE-SINCRONIZAR DISPOSITIVO"}
          </button>
        </div>

        <h2 style={styles.subtitulo}>SOLICITUDES DE PERMISOS</h2>

        {cargando ? (
          <p style={styles.textoVacio}>Cargando...</p>
        ) : solicitudes.length === 0 ? (
          <p style={styles.textoVacio}>No hay solicitudes.</p>
        ) : (
          <div style={styles.lista}>
            {solicitudes.map((p) => {
              const badge = obtenerEtiquetaEstado(p.estado);
              const esPendiente = p.estado && p.estado.startsWith('pendiente');

              return (
                <div key={p.id} style={styles.tarjeta}>
                  <div style={styles.headerTarjeta}>
                    <div>
                      <span style={styles.folio}>FOLIO #{p.id}</span>
                      <h3 style={styles.nombreEmpleado}>{p.usuarios?.nombre || 'Empleado'}</h3>
                    </div>
                    <span style={{ ...styles.badge, color: badge.color, backgroundColor: badge.bg }}>
                      {badge.texto}
                    </span>
                  </div>

                  <div style={styles.detalles}>
                    <p style={styles.infoTexto}><strong>Fecha:</strong> {p.fecha_permiso}</p>
                    <p style={styles.infoTexto}><strong>Horario:</strong> {p.hora_inicio} a {p.hora_fin}</p>
                    <p style={styles.infoTexto}><strong>Motivo:</strong> {p.motivo}</p>
                  </div>

                  {esPendiente && (
                    <div style={styles.acciones}>
                      <button 
                        onClick={() => responderSolicitud(p.id, 'aprobado', p.empleado_id)} 
                        disabled={procesandoId === p.id} 
                        style={styles.botonAprobar}
                      >
                        {procesandoId === p.id ? 'GUARDANDO...' : 'APROBAR'}
                      </button>
                      <button 
                        onClick={() => responderSolicitud(p.id, 'rechazado', p.empleado_id)} 
                        disabled={procesandoId === p.id} 
                        style={styles.botonRechazar}
                      >
                        RECHAZAR
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  contenedorPadre: { minHeight: '100vh', backgroundColor: '#fff', color: '#000', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '2px solid #f0f0f0', maxWidth: '900px', margin: '0 auto' },
  tituloHeader: { fontSize: '18px', fontWeight: '900', letterSpacing: '2px', margin: 0 },
  subtituloHeader: { fontSize: '12px', color: '#888', margin: '4px 0 0 0', letterSpacing: '1px' },
  botonSalir: { padding: '10px 18px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' },
  contenido: { maxWidth: '900px', margin: '0 auto', padding: '20px' },
  alertaNotificacion: { backgroundColor: '#fef3c7', border: '2px solid #fde68a', padding: '15px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' },
  botonNotificacion: { backgroundColor: '#000', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', textAlign: 'center' },
  alertaActiva: { backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '15px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' },
  subtitulo: { fontSize: '13px', letterSpacing: '3px', color: '#888', marginBottom: '20px', fontWeight: '900' },
  lista: { display: 'flex', flexDirection: 'column', gap: '15px' },
  tarjeta: { padding: '20px', border: '2px solid #f0f0f0', borderRadius: '15px', backgroundColor: '#fafafa' },
  headerTarjeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
  folio: { fontSize: '11px', fontWeight: '800', color: '#888', letterSpacing: '1px' },
  nombreEmpleado: { fontSize: '16px', fontWeight: '900', margin: '2px 0 0 0', letterSpacing: '0.5px' },
  badge: { padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', letterSpacing: '1px' },
  detalles: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '15px' },
  infoTexto: { fontSize: '13px', color: '#444', margin: 0 },
  acciones: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eaeaea' },
  botonAprobar: { padding: '14px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '900', cursor: 'pointer' },
  botonRechazar: { padding: '14px', backgroundColor: '#fff', color: '#b91c1c', border: '2px solid #fee2e2', borderRadius: '10px', fontSize: '13px', fontWeight: '900', cursor: 'pointer' },
  textoVacio: { color: '#aaa', fontSize: '13px', letterSpacing: '1px' }
};