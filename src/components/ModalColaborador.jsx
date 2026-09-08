import React, { useState, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import imageCompression from 'browser-image-compression';
import { X, Camera, Image, Eye } from 'lucide-react';

const estandarizar = (txt) => txt.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function ModalColaborador({ onClose, onSuccess, departamentos, areas, puestos }) {
  const [formData, setFormData] = useState({
    numero_empleado: '', nombre_completo: '', fecha_ingreso: '', celular: '',
    telefono: '', correo: '', tipo_personal: 'produccion', departamento_id: '',
    area: '', puesto: '', rol: 'empleado', usuario_login: '', pin: ''
  });

  const [fotoArchivo, setFotoArchivo] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Estados de modales para fotos
  const [mostrarSelectorFoto, setMostrarSelectorFoto] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState(false);

  // Referencias a los dos inputs independientes
  const camaraInputRef = useRef(null);
  const galeriaInputRef = useRef(null);

  const [creandoNuevo, setCreandoNuevo] = useState({ depto: false, area: false, puesto: false });
  const [textosNuevos, setTextosNuevos] = useState({ depto: '', area: '', puesto: '' });

  const handleNombreChange = (e) => {
    const nombre = e.target.value.toUpperCase();
    const usuarioBase = nombre.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, '.');
    
    setFormData(prev => ({
      ...prev, 
      nombre_completo: nombre,
      usuario_login: usuarioBase,
      correo: prev.correo.includes('@') && !prev.correo.includes('mobiliarium') ? prev.correo : `${usuarioBase}@mobiliarium.com`
    }));
  };

  const handleSeleccionarFoto = async (e) => {
    const archivo = e.target.files[0];
    if (archivo) {
      setFotoPreview(URL.createObjectURL(archivo));
      try {
        const comp = await imageCompression(archivo, { maxSizeMB: 0.2, maxWidthOrHeight: 800, useWebWorker: true });
        setFotoArchivo(comp);
        setFotoPreview(URL.createObjectURL(comp));
      } catch (err) { 
        setFotoArchivo(archivo); 
      }
    }
    setMostrarSelectorFoto(false);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    
    let deptoFinalId = formData.departamento_id;
    let areaFinal = formData.area;
    let puestoFinal = formData.puesto;

    if (creandoNuevo.depto && textosNuevos.depto.trim()) {
      const nomLimpio = estandarizar(textosNuevos.depto);
      const { data, error } = await supabase.from('departamentos').insert([{ nombre: nomLimpio }]).select().single();
      if (error) return alert("Error creando depto: " + error.message);
      deptoFinalId = data.id;
    }
    if (creandoNuevo.area && textosNuevos.area.trim()) areaFinal = estandarizar(textosNuevos.area);
    if (creandoNuevo.puesto && textosNuevos.puesto.trim()) puestoFinal = estandarizar(textosNuevos.puesto);

    if (!formData.nombre_completo || !formData.numero_empleado || !formData.correo || !areaFinal || !deptoFinalId || !formData.usuario_login) {
      return alert("Faltan campos obligatorios (*).");
    }
    if (formData.pin.length < 6) return alert("El PIN requiere mínimo 6 dígitos.");

    setGuardando(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.correo.toLowerCase(), 
        password: formData.pin, 
        options: { data: { nombre_completo: formData.nombre_completo } }
      });
      if (authError) throw authError;

      let fotoUrl = null;
      if (fotoArchivo) {
        const fileName = `perfil_${authData.user.id}.jpg`;
        await supabase.storage.from('fotos_usuarios').upload(fileName, fotoArchivo, { contentType: fotoArchivo.type, upsert: true });
        fotoUrl = `${supabase.storage.from('fotos_usuarios').getPublicUrl(fileName).data.publicUrl}?t=${Date.now()}`;
      }

      const { error: dbError } = await supabase.from('usuarios').upsert([{
        id: authData.user.id, 
        numero_empleado: formData.numero_empleado.toUpperCase(), 
        nombre_completo: formData.nombre_completo,
        fecha_ingreso: formData.fecha_ingreso || null,
        celular: formData.celular || null,
        telefono: formData.telefono || null,
        correo: formData.correo.toLowerCase(),
        tipo_personal: formData.tipo_personal,
        departamento_id: deptoFinalId,
        area: areaFinal,
        puesto: puestoFinal || null,
        rol: formData.rol,
        usuario_login: formData.usuario_login.toLowerCase(),
        pin: formData.pin,
        foto_url: fotoUrl, 
        activo: true
      }]);

      if (dbError) throw dbError;

      alert(`✅ COLABORADOR CREADO.\nUsuario: ${formData.usuario_login}`);
      onSuccess();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 1000;
          padding: 0;
        }

        @media (min-width: 650px) {
          .modal-overlay {
            align-items: center;
            padding: 15px;
          }
        }

        .modal-card {
          background: #f8fafc;
          border-radius: 20px 20px 0 0;
          width: 100%;
          max-width: 850px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 -10px 25px rgba(0,0,0,0.2);
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          padding: 20px;
          gap: 15px;
        }

        @media (min-width: 650px) {
          .modal-card {
            border-radius: 20px;
            padding: 25px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.3);
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 12px;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 900;
          color: var(--color-tema, #0f172a);
          margin: 0;
        }

        .seccion-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          padding: 15px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .seccion-tag {
          font-size: 11px;
          font-weight: 900;
          color: #fff;
          background: var(--color-tema, #0f172a);
          padding: 4px 10px;
          border-radius: 6px;
          align-self: flex-start;
          text-transform: uppercase;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        @media (min-width: 600px) {
          .form-grid-2 { grid-template-columns: 1fr 1fr; }
          .form-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
        }

        .f-label {
          font-size: 10px;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .f-input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          font-weight: 600;
          background: #f8fafc;
          box-sizing: border-box;
          outline: none;
        }

        .f-input:focus {
          border-color: var(--color-tema, #0f172a);
          background: #fff;
        }

        .btn-submit {
          padding: 15px;
          background: var(--color-tema, #0f172a);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-weight: 900;
          font-size: 14px;
          cursor: pointer;
          margin-top: 10px;
        }

        /* ESTILOS DEL SELECTOR Y LIGHTBOX */
        .selector-btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
        }
      `}</style>

      {/* INPUT 1: EXCLUSIVO CÁMARA */}
      <input 
        ref={camaraInputRef} 
        type="file" 
        accept="image/*" 
        capture="environment" 
        onChange={handleSeleccionarFoto} 
        style={{ display: 'none' }} 
      />

      {/* INPUT 2: EXCLUSIVO GALERÍA (SIN CAPTURE) */}
      <input 
        ref={galeriaInputRef} 
        type="file" 
        accept="image/*" 
        onChange={handleSeleccionarFoto} 
        style={{ display: 'none' }} 
      />

      <div className="modal-overlay">
        <div className="modal-card">
          <div className="modal-header">
            <h2 className="modal-title">ALTA DE COLABORADOR</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={22} /></button>
          </div>

          <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* 1. PERSONALES */}
            <div className="seccion-card">
              <span className="seccion-tag">1. Identidad y Contacto</span>
              
              {/* ÁREA FOTO CON DISPARADOR DE OPCIONES */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', margin: '5px 0 10px 0' }}>
                <div 
                  onClick={() => setMostrarSelectorFoto(true)}
                  style={{ position: 'relative', width: '105px', height: '105px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer' }}
                >
                  <img 
                    src={fotoPreview || `https://ui-avatars.com/api/?name=${formData.nombre_completo || 'N'}&background=f1f5f9`} 
                    alt="Foto Colaborador" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', bottom: 0, width: '100%', height: '35%', background: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Camera size={20} color="#fff" />
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={() => setMostrarSelectorFoto(true)} 
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#334155' }}
                >
                  <Camera size={15} /> OPCIONES DE FOTO
                </button>
              </div>

              <div className="form-grid form-grid-2">
                <div>
                  <div className="f-label">NÚM. EMPLEADO *</div>
                  <input type="text" required className="f-input" style={{ textTransform: 'uppercase' }} value={formData.numero_empleado} onChange={e => setFormData({...formData, numero_empleado: e.target.value})} />
                </div>
                <div>
                  <div className="f-label">NOMBRE COMPLETO *</div>
                  <input type="text" required className="f-input" style={{ textTransform: 'uppercase' }} value={formData.nombre_completo} onChange={handleNombreChange} />
                </div>
              </div>

              <div className="form-grid form-grid-3">
                <div>
                  <div className="f-label">FECHA INGRESO</div>
                  <input type="date" className="f-input" value={formData.fecha_ingreso} onChange={e => setFormData({...formData, fecha_ingreso: e.target.value})} />
                </div>
                <div>
                  <div className="f-label">CELULAR</div>
                  <input type="tel" className="f-input" value={formData.celular} onChange={e => setFormData({...formData, celular: e.target.value})} />
                </div>
                <div>
                  <div className="f-label">TELÉFONO FIJO</div>
                  <input type="tel" className="f-input" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                </div>
              </div>
            </div>

            {/* 2. ESTRUCTURA */}
            <div className="seccion-card">
              <span className="seccion-tag">2. Ubicación en la Empresa</span>
              
              <div className="form-grid form-grid-2">
                <div>
                  <div className="f-label">TIPO DE PERSONAL *</div>
                  <select className="f-input" value={formData.tipo_personal} onChange={e => setFormData({...formData, tipo_personal: e.target.value})}>
                    <option value="produccion">PRODUCCIÓN</option>
                    <option value="administrativo">ADMINISTRATIVO</option>
                    <option value="obra">OBRA</option>
                  </select>
                </div>

                <div>
                  <div className="f-label">DEPARTAMENTO *</div>
                  {!creandoNuevo.depto ? (
                    <select required className="f-input" value={formData.departamento_id} onChange={e => e.target.value === 'NEW' ? setCreandoNuevo({...creandoNuevo, depto: true}) : setFormData({...formData, departamento_id: e.target.value})}>
                      <option value="">-- SELECCIONAR --</option>
                      {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                      <option value="NEW" style={{ fontWeight: '900', color: 'var(--color-tema)' }}>+ CREAR NUEVO...</option>
                    </select>
                  ) : (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <input autoFocus type="text" className="f-input" placeholder="NUEVO DEPTO..." value={textosNuevos.depto} onChange={e => setTextosNuevos({...textosNuevos, depto: e.target.value})} />
                      <button type="button" onClick={() => setCreandoNuevo({...creandoNuevo, depto: false})} style={{ padding: '0 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px' }}>X</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-grid form-grid-2">
                <div>
                  <div className="f-label">ÁREA FÍSICA *</div>
                  {!creandoNuevo.area ? (
                    <select required className="f-input" value={formData.area} onChange={e => e.target.value === 'NEW' ? setCreandoNuevo({...creandoNuevo, area: true}) : setFormData({...formData, area: e.target.value})}>
                      <option value="">-- SELECCIONAR --</option>
                      {areas.map(a => <option key={a} value={a}>{a}</option>)}
                      <option value="NEW" style={{ fontWeight: '900', color: 'var(--color-tema)' }}>+ CREAR NUEVA...</option>
                    </select>
                  ) : (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <input autoFocus type="text" className="f-input" placeholder="NUEVA ÁREA..." value={textosNuevos.area} onChange={e => setTextosNuevos({...textosNuevos, area: e.target.value})} />
                      <button type="button" onClick={() => setCreandoNuevo({...creandoNuevo, area: false})} style={{ padding: '0 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px' }}>X</button>
                    </div>
                  )}
                </div>

                <div>
                  <div className="f-label">PUESTO REAL</div>
                  {!creandoNuevo.puesto ? (
                    <select className="f-input" value={formData.puesto} onChange={e => e.target.value === 'NEW' ? setCreandoNuevo({...creandoNuevo, puesto: true}) : setFormData({...formData, puesto: e.target.value})}>
                      <option value="">-- SELECCIONAR --</option>
                      {puestos.map(p => <option key={p} value={p}>{p}</option>)}
                      <option value="NEW" style={{ fontWeight: '900', color: 'var(--color-tema)' }}>+ CREAR NUEVO...</option>
                    </select>
                  ) : (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <input autoFocus type="text" className="f-input" placeholder="NUEVO PUESTO..." value={textosNuevos.puesto} onChange={e => setTextosNuevos({...textosNuevos, puesto: e.target.value})} />
                      <button type="button" onClick={() => setCreandoNuevo({...creandoNuevo, puesto: false})} style={{ padding: '0 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px' }}>X</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. ACCESOS */}
            <div className="seccion-card">
              <span className="seccion-tag">3. Permisos y Accesos</span>
              
              <div className="form-grid form-grid-2">
                <div>
                  <div className="f-label">ROL EN SISTEMA *</div>
                  <select required className="f-input" value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})}>
                    <option value="empleado">EMPLEADO (SOLICITANTE)</option>
                    <option value="jefe_area">JEFE DE ÁREA (FIRMA 1)</option>
                    <option value="gerente">GERENTE (FIRMA 2)</option>
                    <option value="rh_nominas">RH / NÓMINAS (FIRMA 3)</option>
                    <option value="caseta">CASETA (VIGILANCIA)</option>
                  </select>
                </div>

                <div>
                  <div className="f-label">CORREO INSTITUCIONAL *</div>
                  <input type="email" required className="f-input" value={formData.correo} onChange={e => setFormData({...formData, correo: e.target.value})} />
                </div>
              </div>

              <div className="form-grid form-grid-2">
                <div>
                  <div className="f-label">USUARIO LOGIN</div>
                  <input type="text" required className="f-input" value={formData.usuario_login} readOnly style={{ background: '#e2e8f0' }} />
                </div>
                <div>
                  <div className="f-label">PIN DE ACCESO (MÍN 6) *</div>
                  <input type="text" minLength={6} maxLength={10} required className="f-input" value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value})} />
                </div>
              </div>
            </div>

            <button type="submit" disabled={guardando} className="btn-submit">
              {guardando ? 'GUARDANDO...' : 'REGISTRAR COLABORADOR'}
            </button>

          </form>
        </div>
      </div>

      {/* MINI-MODAL ACCIÓN DE FOTO */}
      {mostrarSelectorFoto && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 2000, padding: '20px'
          }}
          onClick={() => setMostrarSelectorFoto(false)}
        >
          <div 
            style={{
              background: '#fff', width: '100%', maxWidth: '340px',
              borderRadius: '16px', padding: '20px', display: 'flex',
              flexDirection: 'column', gap: '10px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: '900', color: '#1e293b', textAlign: 'center' }}>
              FOTO DE PERFIL
            </h3>

            <button 
              type="button"
              className="selector-btn"
              style={{ background: '#0f172a', color: '#fff' }}
              onClick={() => {
                setMostrarSelectorFoto(false);
                camaraInputRef.current?.click();
              }}
            >
              <Camera size={18} /> Tomar Foto (Cámara)
            </button>

            <button 
              type="button"
              className="selector-btn"
              style={{ background: '#3b82f6', color: '#fff' }}
              onClick={() => {
                setMostrarSelectorFoto(false);
                galeriaInputRef.current?.click();
              }}
            >
              <Image size={18} /> Subir de la Galería
            </button>

            {fotoPreview && (
              <button 
                type="button"
                className="selector-btn"
                style={{ background: '#f1f5f9', color: '#334155' }}
                onClick={() => {
                  setMostrarSelectorFoto(false);
                  setFotoAmpliada(true);
                }}
              >
                <Eye size={18} /> Ver Foto Grande
              </button>
            )}

            <button 
              type="button"
              className="selector-btn"
              style={{ background: '#fee2e2', color: '#dc2626', marginTop: '5px' }}
              onClick={() => setMostrarSelectorFoto(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* VISOR LIGHTBOX PARA VER FOTO GRANDE EN EL MODAL */}
      {fotoAmpliada && fotoPreview && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center',
            zIndex: 3000, padding: '20px'
          }}
          onClick={() => setFotoAmpliada(false)}
        >
          <img 
            src={fotoPreview} 
            alt="Foto ampliada" 
            style={{ maxWidth: '90%', maxHeight: '75vh', borderRadius: '16px', objectFit: 'contain', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }} 
          />
          <p style={{ color: '#fff', marginTop: '15px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>
            TOCA EN CUALQUIER PARTE PARA CERRAR
          </p>
        </div>
      )}
    </>
  );
}