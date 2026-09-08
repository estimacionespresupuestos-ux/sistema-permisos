import React, { useState } from 'react';
import miLogo from '../assets/logo.png';
import { supabase } from '../services/supabaseClient';

export default function Login({ alEntrar }) {
  const [idUsuario, setIdUsuario] = useState('');
  const [pass, setPass] = useState('');
  const [cargando, setCargando] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    if (cargando) return;
    
    setCargando(true);
    const usuarioDigitado = idUsuario.trim();

    try {
      // 1. Buscamos por la columna 'usuario' y traemos todos los campos nuevos
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .ilike('usuario', usuarioDigitado) 
        .eq('password', pass)
        .single();

      if (error || !data) {
        alert("Credenciales incorrectas");
      } else {
        // 2. Guardamos la sesión con los campos exactos de la nueva tabla
        localStorage.setItem("permisos_sesion", JSON.stringify({
          id: data.id,
          usuario: data.usuario,
          nombre_completo: data.nombre_completo,
          rol: data.rol,
          area: data.area,
          departamento_id: data.departamento_id
        }));

        alEntrar(data); 
      }
    } catch (err) {
      alert("Error de conexión");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={styles.fondo}>
      <div style={styles.contenedor}>
        <img src={miLogo} alt="Logo" style={styles.logo} />
        <h3 style={styles.rh}>RH</h3>
        <h2 style={styles.titulo}>ACCESOS & SALIDAS</h2>
        
        <form onSubmit={entrar} style={styles.form}>
          <input 
            style={styles.input} 
            placeholder="USUARIO" 
            autoCapitalize="none"
            value={idUsuario}
            onChange={(e) => setIdUsuario(e.target.value)}
          />
          <input 
            style={styles.input} 
            type="password" 
            placeholder="CONTRASEÑA" 
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          <button type="submit" disabled={cargando} style={styles.boton}>
            {cargando ? 'VALIDANDO...' : 'ENTRAR'}
          </button>
        </form>
        
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
  contenedor: { 
    width: '100%', 
    maxWidth: '400px',
    textAlign: 'center',
    boxSizing: 'border-box'
  },
  logo: { 
    width: '100%', 
    maxWidth: '350px', 
    marginBottom: '15px',
    objectFit: 'contain'
  },
  rh: {
    fontSize: '18px',
    letterSpacing: '6px',
    color: '#000',
    margin: '0 0 4px 0',
    fontWeight: '900'
  },
  titulo: { 
    fontSize: '13px', 
    letterSpacing: '4px', 
    color: '#888', 
    marginBottom: '35px', 
    fontWeight: '900' 
  },
  form: { 
    width: '100%', 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '15px' 
  },
  input: { 
    width: '100%',
    padding: '18px', 
    border: '2px solid #f0f0f0', 
    borderRadius: '15px', 
    fontSize: '16px',
    outline: 'none',
    backgroundColor: '#fafafa',
    transition: '0.3s',
    boxSizing: 'border-box'
  },
  boton: { 
    width: '100%',
    padding: '20px', 
    backgroundColor: '#000', 
    color: '#fff', 
    border: 'none',
    borderRadius: '15px', 
    fontSize: '16px', 
    fontWeight: '900', 
    cursor: 'pointer',
    marginTop: '10px',
    letterSpacing: '2px',
    boxSizing: 'border-box'
  },
  footer: {
    marginTop: '40px',
    fontSize: '10px',
    color: '#ccc',
    letterSpacing: '3px'
  }
};