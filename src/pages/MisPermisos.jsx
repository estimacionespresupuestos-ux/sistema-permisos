import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { registrarSuscripcionPush } from '../services/notificaciones';

export default function MisPermisos() {
  const { usuario } = useAuth(); 
  
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [pago, setPago] = useState('Sin goce'); 
  const [motivo, setMotivo] = useState('');
  const [cargando, setCargando] = useState(false);
  
  const [misPermisos, setMisPermisos] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);

  const calcularHoras = (inicio, fin) => {
    if (!inicio || !fin) return 0;
    const [h1, m1] = inicio.split(':');
    const [h2, m2] = fin.split(':');
    const d1 = new Date(2000, 0, 1, h1, m1);
    const d2 = new Date(2000, 0, 1, h2, m2);
    let diff = (d2 - d1) / 3600000;
    return diff > 0 ? parseFloat(diff.toFixed(2)) : 0;
  };

  const cargarHistorial = useCallback(async () => {
    if (!usuario?.id) return;
    setCargandoHistorial(true);
    
    const { data, error } = await supabase
      .from('permisos')
      .select('*')
      .eq('usuario_id', usuario.id) 
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error al obtener permisos:", error);
    } else {
      setMisPermisos(data || []);
    }
    setCargandoHistorial(false);
  }, [usuario?.id]);

  const activarNotificacionesAutomaticas = useCallback(async () => {
    try {
      const suscripcion = await registrarSuscripcionPush();
      if (suscripcion && suscripcion.endpoint && usuario?.id) {
        const { error } = await supabase
          .from('suscripciones_push')
          .upsert(
            [
              {
                usuario_id: usuario.id,
                subscription: suscripcion,
                endpoint: suscripcion.endpoint 
              }
            ],
            { onConflict: 'endpoint' } 
          );

        if (error) console.error("Error al guardar suscripción:", error);
      }
    } catch (err) {
      console.error("Error activando suscripcion push:", err);
    }
  }, [usuario?.id]);

  useEffect(() => {
    if (usuario?.id) {
      cargarHistorial();
      activarNotificacionesAutomaticas();
    }
  }, [usuario?.id, cargarHistorial, activarNotificacionesAutomaticas]);

  const enviarSolicitud = async (e) => {
    e.preventDefault();
    if (cargando) return;

    const sesionStr = localStorage.getItem("permisos_sesion");
    const sesion = sesionStr ? JSON.parse(sesionStr) : null;

    if (!sesion || !sesion.id || !sesion.departamento_id) {
      alert("Error: Sesión incompleta. Vuelve a iniciar sesión.");
      return;
    }

    setCargando(true);

    try {
      const { data: depto, error: errDepto } = await supabase
        .from('departamentos')
        .select('jefe_id, gerente_id, rh_id')
        .eq('id', sesion.departamento_id)
        .single();

      if (errDepto) throw new Error("No se pudo obtener el departamento.");

      const { data, error } = await supabase
        .from('permisos')
        .insert([
          {
            usuario_id: sesion.id,
            fecha_permiso: fecha,
            pago: pago,
            asunto_motivo: motivo.trim(),
            total_horas: calcularHoras(horaInicio, horaFin),
            observaciones: `Horario solicitado: ${horaInicio} a ${horaFin}`, 
            firma_1_id: depto.jefe_id,
            firma_2_id: depto.gerente_id,
            firma_3_id: depto.rh_id,
            estado_general: 'en_firmas'
          }
        ])
        .select();

      if (error) {
        alert(`Error al guardar: ${error.message}`);
        return;
      }

      if (data && data.length > 0) {
        const permisoCreado = data[0];
        
        if (depto.jefe_id) {
          const { data: suscripcionesJefe } = await supabase
            .from('suscripciones_push')
            .select('subscription')
            .eq('usuario_id', depto.jefe_id);

          if (suscripcionesJefe && suscripcionesJefe.length > 0) {
            const envios = suscripcionesJefe.map(async (item) => {
              try {
                await fetch('/api/notificar', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    subscription: item.subscription,
                    titulo: '⚠️ NUEVO PASE POR FIRMAR',
                    mensaje: `${sesion.nombre_completo} ha solicitado un permiso (Folio: ${permisoCreado.folio}).`
                  })
                });
              } catch (err) {
                console.error("❌ Error en el fetch Push:", err);
              }
            });
            await Promise.allSettled(envios);
          }
        }

        alert(`Solicitud ${permisoCreado.folio} creada con éxito.`);
        
        setFecha('');
        setHoraInicio('');
        setHoraFin('');
        setMotivo('');
        setPago('Sin goce');
        cargarHistorial();
      }
    } catch (err) {
      console.error("❌ Error en el proceso:", err);
      alert("Error de conexión");
    } finally {
      setCargando(false);
    }
  };

  const obtenerEtiquetaEstado = (estado) => {
    switch (estado) {
      case 'borrador': return { texto: 'BORRADOR', color: '#4b5563', bg: '#f3f4f6' };
      case 'en_firmas': return { texto: 'EN FIRMAS', color: '#d97706', bg: '#fef3c7' };
      case 'autorizado_nominas': return { texto: 'AUTORIZADO', color: '#15803d', bg: '#dcfce7' };
      case 'rechazado': return { texto: 'RECHAZADO', color: '#b91c1c', bg: '#fee2e2' };
      default: return { texto: estado ? estado.toUpperCase().replace('_', ' ') : 'PENDIENTE', color: '#4b5563', bg: '#f3f4f6' };
    }
  };

  return (
    <div style={styles.contenido}>
      <section style={styles.seccionFormulario}>
        <h2 style={styles.subtitulo}>NUEVO PASE DE SALIDA</h2>
        
        <form onSubmit={enviarSolicitud} style={styles.form}>
          <div style={styles.gridHoras}>
            <div style={styles.grupoInput}>
              <label style={styles.label}>FECHA DEL PERMISO</label>
              <input type="date" style={styles.input} value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
            <div style={styles.grupoInput}>
              <label style={styles.label}>TIPO DE PAGO</label>
              <select style={styles.input} value={pago} onChange={(e) => setPago(e.target.value)}>
                <option value="Con goce">Con goce</option>
                <option value="Sin goce">Sin goce</option>
                <option value="Con tiempo">Reposición de tiempo</option>
              </select>
            </div>
          </div>

          <div style={styles.gridHoras}>
            <div style={styles.grupoInput}>
              <label style={styles.label}>HORA INICIO</label>
              <input type="time" style={styles.input} value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} required />
            </div>

            <div style={styles.grupoInput}>
              <label style={styles.label}>HORA FIN</label>
              <input type="time" style={styles.input} value={horaFin} onChange={(e) => setHoraFin(e.target.value)} required />
            </div>
          </div>

          <div style={styles.grupoInput}>
            <label style={styles.label}>MOTIVO / EXPLICACIÓN</label>
            <textarea style={styles.textarea} placeholder="Escribe aquí el motivo del pase..." rows="3" value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
          </div>

          <button type="submit" disabled={cargando} style={styles.botonEnviar}>
            {cargando ? 'ENVIANDO...' : 'ENVIAR SOLICITUD'}
          </button>
        </form>
      </section>

      <section style={styles.seccionHistorial}>
        <h2 style={styles.subtitulo}>HISTORIAL DE SOLICITUDES</h2>

        {cargandoHistorial ? (
          <p style={styles.textoVacio}>Cargando historial...</p>
        ) : misPermisos.length === 0 ? (
          <p style={styles.textoVacio}>No has registrado ninguna solicitud aún.</p>
        ) : (
          <div style={styles.lista}>
            {misPermisos.map((p) => {
              const badge = obtenerEtiquetaEstado(p.estado_general);
              return (
                <div key={p.id} style={styles.tarjetaPermiso}>
                  <div style={styles.headerTarjeta}>
                    <span style={styles.folio}>{p.folio}</span>
                    <span style={{ ...styles.badge, color: badge.color, backgroundColor: badge.bg }}>
                      {badge.texto}
                    </span>
                  </div>

                  <div style={styles.detallesTarjeta}>
                    <p style={styles.infoTexto}><strong>Fecha:</strong> {p.fecha_permiso}</p>
                    <p style={styles.infoTexto}><strong>Horas Totales:</strong> {p.total_horas} hr(s) - ({p.pago})</p>
                    <p style={styles.infoTexto}><strong>Motivo:</strong> {p.asunto_motivo}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

const styles = {
  contenido: { display: 'flex', flexDirection: 'column', gap: '40px', fontFamily: 'system-ui, sans-serif' },
  subtitulo: { fontSize: '13px', letterSpacing: '3px', color: '#888', marginBottom: '20px', fontWeight: '900' },
  seccionFormulario: { width: '100%' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  gridHoras: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  grupoInput: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '11px', fontWeight: '800', color: '#888', letterSpacing: '1px' },
  input: { width: '100%', padding: '16px', border: '2px solid #f0f0f0', borderRadius: '12px', fontSize: '15px', outline: 'none', backgroundColor: '#fafafa', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '16px', border: '2px solid #f0f0f0', borderRadius: '12px', fontSize: '15px', outline: 'none', backgroundColor: '#fafafa', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' },
  botonEnviar: { width: '100%', padding: '18px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '900', cursor: 'pointer', marginTop: '5px', letterSpacing: '2px' },
  seccionHistorial: { width: '100%' },
  lista: { display: 'flex', flexDirection: 'column', gap: '15px' },
  tarjetaPermiso: { padding: '18px', border: '2px solid #f0f0f0', borderRadius: '15px', backgroundColor: '#fafafa' },
  headerTarjeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  folio: { fontSize: '13px', fontWeight: '900', letterSpacing: '1px' },
  badge: { padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', letterSpacing: '1px' },
  detallesTarjeta: { display: 'flex', flexDirection: 'column', gap: '6px' },
  infoTexto: { fontSize: '13px', color: '#444', margin: 0 },
  textoVacio: { color: '#aaa', fontSize: '13px', letterSpacing: '1px' }
};