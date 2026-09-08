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

  const [mostrarSelectorFoto, setMostrarSelectorFoto] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState(false);

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
        .modal-overlay-dark {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.2); /* Fondo suave sin oscurecer la pantalla */
          backdrop-filter: blur(3px); /* Desenfoque mínimo para no distorsionar la imagen */
          -webkit-backdrop-filter: blur(3px);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 1000;
          padding: 0;
        }

        @media (min-width: 650px) {
          .modal-overlay-dark {
            align-items: center;
            padding: 15px;
          }
        }

        /* VISTA PRINCIPAL DEL MODAL EN CRISTAL TRANSPARENTE */
        .modal-card-dark {
          background: rgba(10, 15, 26, 0.35) !important; /* Casi 100% transparente */
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          border: 1px solid rgba(255, 255, 255, 0.2) !important; /* Marco brillante estilo cristal */
          border-radius: 20px 20px 0 0;
          width: 100%;
          max-width: 850px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          padding: 20px;
          gap: 15px;
          color: #ffffff;
        }

        @media (min-width: 650px) {
          .modal-card-dark {
            border-radius: 24px;
            padding: 25px;
          }
        }

        .modal-header-dark {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.15);
          padding-bottom: 12px;
        }

        .modal-title-dark {
          font-size: 18px;
          font-weight: 900;
          color: #ffffff;
          margin: 0;
          letter-spacing: 1px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        }

        /* TARJETAS SECCIÓN INTERNA SIN BLUR ENCIMADO */
        .seccion-card-dark {
          background: rgba(255, 255, 255, 0.03) !important; /* Solo el 3% de color */
          backdrop-filter: none !important; /* Se elimina el desenfoque extra */
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          padding: 16px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .seccion-tag-dark {
          font-size: 11px;
          font-weight: 900;
          color: #ffffff;
          background: var(--color-tema, #3b82f6);
          padding: 4px 10px;
          border-radius: 6px;
          align-self: flex-start;
          text-transform: uppercase;
          letter-spacing: 0.8px;
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

        .f-label-dark {
          font-size: 10px;
          font-weight: 800;
          color: #ffffff;
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
          text-transform: uppercase;
          margin-bottom: 4px;
          letter-spacing: 0.5px;
        }

        /* INPUTS COMPLETAMENTE TRASLÚCIDOS */
        .f-input-dark {
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.25) !important;
          font-size: 13px;
          font-weight: 700;
          background: rgba(0, 0, 0, 0.25) !important;
          color: #ffffff !important;
          box-sizing: border-box;
          outline: none;
        }

        .f-input-dark:focus {
          border-color: var(--color-tema, #3b82f6) !important;
          background: rgba(0, 0, 0, 0.45) !important;
          box-shadow: 0 0 12px rgba(59, 130, 246, 0.4);
        }

        .f-input-dark option {
          background: #090d16;
          color: #ffffff;
        }

        .btn-submit-dark {
          padding: 16px;
          background: var(--color-tema, #3b82f6);
          color: #ffffff;
          border: none;
          border-radius: 14px;
          font-weight: 900;
          font-size: 14px;
          cursor: pointer;
          margin-top: 10px;
          letter-spacing: 1px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }

        .selector-btn-dark {
          width: 100%;
          padding: 14px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          font-size: 14px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
        }
      `}</style>

      {/* INPUTS DE FOTO INDEPENDIENTES */}
      <input ref={camaraInputRef} type="file" accept="image/*" capture="environment" onChange={handleSeleccionarFoto} style={{ display: 'none' }} />
      <input ref={galeriaInputRef} type="file" accept="image/*" onChange={handleSeleccionarFoto} style={{ display: 'none' }} />

      <div className="modal-overlay-dark">
        <div className="modal-card-dark">
          <div className="modal-header-dark">
            <h2 className="modal-title-dark">ALTA DE COLABORADOR</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={22} /></button>
          </div>

          <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* 1. PERSONALES */}
            <div className="seccion-card-dark">
              <span className="seccion-tag-dark">1. Identidad y Contacto</span>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', margin: '5px 0 10px 0' }}>
                <div 
                  onClick={() => setMostrarSelectorFoto(true)}
                  style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--color-tema, #3b82f6)', boxShadow: '0 8px 20px rgba(0,0,0,0.4)', cursor: 'pointer' }}
                >
                  <img 
                    src={fotoPreview || `https://ui-avatars.com/api/?name=${formData.nombre_completo || 'N'}&background=1e293b&color=fff`} 
                    alt="Foto Colaborador" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', bottom: 0, width: '100%', height: '35%', background: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Camera size={18} color="#fff" />
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={() => setMostrarSelectorFoto(true)} 
                  style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', padding: '8px 16px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#ffffff' }}
                >
                  📷 OPCIONES DE FOTO
                </button>
              </div>

              <div className="form-grid form-grid-2">
                <div>
                  <div className="f-label-dark">NÚM. EMPLEADO *</div>
                  <input type="text" required className="f-input-dark" style={{ textTransform: 'uppercase' }} value={formData.numero_empleado} onChange={e => setFormData({...formData, numero_empleado: e.target.value})} />
                </div>
                <div>
                  <div className="f-label-dark">NOMBRE COMPLETO *</div>
                  <input type="text" required className="f-input-dark" style={{ textTransform: 'uppercase' }} value={formData.nombre_completo} onChange={handleNombreChange} />
                </div>
              </div>

              <div className="form-grid form-grid-3">
                <div>
                  <div className="f-label-dark">FECHA INGRESO</div>
                  <input type="date" className="f-input-dark" value={formData.fecha_ingreso} onChange={e => setFormData({...formData, fecha_ingreso: e.target.value})} />
                </div>
                <div>
                  <div className="f-label-dark">CELULAR</div>
                  <input type="tel" className="f-input-dark" value={formData.celular} onChange={e => setFormData({...formData, celular: e.target.value})} />
                </div>
                <div>
                  <div className="f-label-dark">TELÉFONO FIJO</div>
                  <input type="tel" className="f-input-dark" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                </div>
              </div>
            </div>

            {/* 2. ESTRUCTURA */}
            <div className="seccion-card-dark">
              <span className="seccion-tag-dark">2. Ubicación en la Empresa</span>
              
              <div className="form-grid form-grid-2">
                <div>
                  <div className="f-label-dark">TIPO DE PERSONAL *</div>
                  <select className="f-input-dark" value={formData.tipo_personal} onChange={e => setFormData({...formData, tipo_personal: e.target.value})}>
                    <option value="produccion">PRODUCCIÓN</option>
                    <option value="administrativo">ADMINISTRATIVO</option>
                    <option value="obra">OBRA</option>
                  </select>
                </div>

                <div>
                  <div className="f-label-dark">DEPARTAMENTO *</div>
                  {!creandoNuevo.depto ? (
                    <select required className="f-input-dark" value={formData.departamento_id} onChange={e => e.target.value === 'NEW' ? setCreandoNuevo({...creandoNuevo, depto: true}) : setFormData({...formData, departamento_id: e.target.value})}>
                      <option value="">-- SELECCIONAR --</option>
                      {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                      <option value="NEW" style={{ fontWeight: '900', color: 'var(--color-tema, #3b82f6)' }}>+ CREAR NUEVO...</option>
                    </select>
                  ) : (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <input autoFocus type="text" className="f-input-dark" placeholder="NUEVO DEPTO..." value={textosNuevos.depto} onChange={e => setTextosNuevos({...textosNuevos, depto: e.target.value})} />
                      <button type="button" onClick={() => setCreandoNuevo({...creandoNuevo, depto: false})} style={{ padding: '0 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px' }}>X</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-grid form-grid-2">
                <div>
                  <div className="f-label-dark">ÁREA FÍSICA *</div>
                  {!creandoNuevo.area ? (
                    <select required className="f-input-dark" value={formData.area} onChange={e => e.target.value === 'NEW' ? setCreandoNuevo({...creandoNuevo, area: true}) : setFormData({...formData, area: e.target.value})}>
                      <option value="">-- SELECCIONAR --</option>
                      {areas.map(a => <option key={a} value={a}>{a}</option>)}
                      <option value="NEW" style={{ fontWeight: '900', color: 'var(--color-tema, #3b82f6)' }}>+ CREAR NUEVA...</option>
                    </select>
                  ) : (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <input autoFocus type="text" className="f-input-dark" placeholder="NUEVA ÁREA..." value={textosNuevos.area} onChange={e => setTextosNuevos({...textosNuevos, area: e.target.value})} />
                      <button type="button" onClick={() => setCreandoNuevo({...creandoNuevo, area: false})} style={{ padding: '0 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px' }}>X</button>
                    </div>
                  )}
                </div>

                <div>
                  <div className="f-label-dark">PUESTO REAL</div>
                  {!creandoNuevo.puesto ? (
                    <select className="f-input-dark" value={formData.puesto} onChange={e => e.target.value === 'NEW' ? setCreandoNuevo({...creandoNuevo, puesto: true}) : setFormData({...formData, puesto: e.target.value})}>
                      <option value="">-- SELECCIONAR --</option>
                      {puestos.map(p => <option key={p} value={p}>{p}</option>)}
                      <option value="NEW" style={{ fontWeight: '900', color: 'var(--color-tema, #3b82f6)' }}>+ CREAR NUEVO...</option>
                    </select>
                  ) : (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <input autoFocus type="text" className="f-input-dark" placeholder="NUEVO PUESTO..." value={textosNuevos.puesto} onChange={e => setTextosNuevos({...textosNuevos, puesto: e.target.value})} />
                      <button type="button" onClick={() => setCreandoNuevo({...creandoNuevo, puesto: false})} style={{ padding: '0 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px' }}>X</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. ACCESOS */}
            <div className="seccion-card-dark">
              <span className="seccion-tag-dark">3. Permisos y Accesos</span>
              
              <div className="form-grid form-grid-2">
                <div>
                  <div className="f-label-dark">ROL EN SISTEMA *</div>
                  <select required className="f-input-dark" value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})}>
                    <option value="empleado">EMPLEADO (SOLICITANTE)</option>
                    <option value="jefe_area">JEFE DE ÁREA (FIRMA 1)</option>
                    <option value="gerente">GERENTE (FIRMA 2)</option>
                    <option value="rh_nominas">RH / NÓMINAS (FIRMA 3)</option>
                    <option value="caseta">CASETA (VIGILANCIA)</option>
                  </select>
                </div>

                <div>
                  <div className="f-label-dark">CORREO INSTITUCIONAL *</div>
                  <input type="email" required className="f-input-dark" value={formData.correo} onChange={e => setFormData({...formData, correo: e.target.value})} />
                </div>
              </div>

              <div className="form-grid form-grid-2">
                <div>
                  <div className="f-label-dark">USUARIO LOGIN</div>
                  <input type="text" required className="f-input-dark" value={formData.usuario_login} readOnly style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8' }} />
                </div>
                <div>
                  <div className="f-label-dark">PIN DE ACCESO (MÍN 6) *</div>
                  <input type="text" minLength={6} maxLength={10} required className="f-input-dark" value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value})} />
                </div>
              </div>
            </div>

            <button type="submit" disabled={guardando} className="btn-submit-dark">
              {guardando ? 'GUARDANDO...' : 'REGISTRAR COLABORADOR'}
            </button>

          </form>
        </div>
      </div>

      {/* MINI-MODAL ACCIÓN DE FOTO EN TEMA OSCURO */}
      {mostrarSelectorFoto && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 2000, padding: '20px'
          }}
          onClick={() => setMostrarSelectorFoto(false)}
        >
          <div 
            style={{
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(20px)',
              width: '100%', maxWidth: '340px',
              borderRadius: '20px', padding: '20px', display: 'flex',
              flexDirection: 'column', gap: '10px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.15)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: '900', color: '#ffffff', textAlign: 'center' }}>
              FOTO DE PERFIL
            </h3>

            <button type="button" className="selector-btn-dark" style={{ background: 'var(--color-tema, #3b82f6)', color: '#fff' }} onClick={() => { setMostrarSelectorFoto(false); camaraInputRef.current?.click(); }}>
              <Camera size={18} /> Tomar Foto (Cámara)
            </button>

            <button type="button" className="selector-btn-dark" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#fff' }} onClick={() => { setMostrarSelectorFoto(false); galeriaInputRef.current?.click(); }}>
              <Image size={18} /> Subir de la Galería
            </button>

            {fotoPreview && (
              <button type="button" className="selector-btn-dark" style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8' }} onClick={() => { setMostrarSelectorFoto(false); setFotoAmpliada(true); }}>
                <Eye size={18} /> Ver Foto Grande
              </button>
            )}

            <button type="button" className="selector-btn-dark" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', marginTop: '5px' }} onClick={() => setMostrarSelectorFoto(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* VISOR LIGHTBOX */}
      {fotoAmpliada && fotoPreview && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.92)',
            backdropFilter: 'blur(12px)',
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center',
            zIndex: 3000, padding: '20px'
          }}
          onClick={() => setFotoAmpliada(false)}
        >
          <img src={fotoPreview} alt="Foto ampliada" style={{ maxWidth: '90%', maxHeight: '75vh', borderRadius: '16px', objectFit: 'contain', boxShadow: '0 10px 35px rgba(0,0,0,0.8)', border: '2px solid var(--color-tema, #3b82f6)' }} />
          <p style={{ color: '#ffffff', marginTop: '15px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>
            TOCA EN CUALQUIER PARTE PARA CERRAR
          </p>
        </div>
      )}
    </>
  );
}