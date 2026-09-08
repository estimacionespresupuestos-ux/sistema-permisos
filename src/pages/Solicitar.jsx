// 1. Obtenemos los datos del empleado desde la sesión activa
const sesion = JSON.parse(localStorage.getItem("permisos_sesion"));

// 2. Consultamos quién es el Jefe asignado a su departamento
const { data: depto } = await supabase
  .from('departamentos')
  .select('jefe_id')
  .eq('id', sesion.departamento_id)
  .single();

if (depto?.jefe_id) {
  // 3. Buscamos TODAS las suscripciones (dispositivos) registradas de ese jefe
  const { data: suscripciones } = await supabase
    .from('suscripciones_push')
    .select('subscription')
    .eq('usuario_id', depto.jefe_id);

  // 4. Si el jefe tiene dispositivos, le mandamos la notificación a TODOS
  if (suscripciones && suscripciones.length > 0) {
    // Usamos Promise.all para enviar a todos los aparatos al mismo tiempo
    await Promise.all(suscripciones.map(sub => 
      fetch('/api/notificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub.subscription,
          titulo: '⚠️ NUEVO PASE DE SALIDA',
          mensaje: `${sesion.nombre_completo} ha solicitado un pase de salida y requiere tu firma.`
        })
      })
    ));
  }
}