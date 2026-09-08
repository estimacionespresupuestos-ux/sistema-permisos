import React, { useEffect, useState } from 'react';
import { useSearchParams } from "react-router-dom";
import { supabase } from '../services/supabaseClient';

export default function AprobarDirecto() {
  const [searchParams] = useSearchParams();
  const [mensaje, setMensaje] = useState('PROCESANDO RESPUESTA...');
  const [cargando, setCargando] = useState(true);

  const folio = searchParams.get('folio');
  const token = searchParams.get('token');
  const accion = searchParams.get('accion'); // 'aprobar' o 'rechazar'

  useEffect(() => {
    procesarRespuesta();
  }, []);

  const procesarRespuesta = async () => {
    if (!folio || !token || !accion) {
      setMensaje('ENLACE INVÁLIDO O INCOMPLETO');
      setCargando(false);
      return;
    }

    const nuevoEstado = accion === 'aprobar' ? 'aprobado' : 'rechazado';

    try {
      const { data, error } = await supabase
        .from('permisos')
        .update({ estado: nuevoEstado })
        .eq('id', folio)
        .eq('token_aprobacion', token)
        .select();

      if (error || !data || data.length === 0) {
        setMensaje('EL PERMISO NO EXISTE O EL TOKEN ES INVÁLIDO');
      } else {
        setMensaje(
          accion === 'aprobar' 
            ? `✅ PERMISO FOLIO #${folio} APROBADO CON ÉXITO` 
            : `❌ PERMISO FOLIO #${folio} HA SIDO RECHAZADO`
        );
      }
    } catch (err) {
      setMensaje('ERROR DE CONEXIÓN AL PROCESAR LA RESPUESTA');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={styles.fondo}>
      <div style={styles.tarjeta}>
        <h2 style={styles.titulo}>PASE DE SALIDA</h2>
        <div style={styles.mensajeBox}>
          <p style={styles.texto}>{mensaje}</p>
        </div>
        <p style={styles.footer}>ALEJANDRO VALENZO © 2026</p>
      </div>
    </div>
  );
}

const styles = {
  fondo: {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: '20px',
    boxSizing: 'border-box'
  },
  tarjeta: {
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center'
  },
  titulo: {
    fontSize: '14px',
    letterSpacing: '5px',
    color: '#888',
    marginBottom: '30px',
    fontWeight: '900'
  },
  mensajeBox: {
    padding: '25px',
    border: '2px solid #f0f0f0',
    borderRadius: '15px',
    backgroundColor: '#fafafa',
    marginBottom: '20px'
  },
  texto: {
    fontSize: '15px',
    fontWeight: '800',
    color: '#000',
    margin: 0,
    letterSpacing: '1px'
  },
  footer: {
    fontSize: '10px',
    color: '#ccc',
    letterSpacing: '3px'
  }
};