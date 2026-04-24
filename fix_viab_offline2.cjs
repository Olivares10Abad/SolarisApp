const fs = require('fs');
let code = fs.readFileSync('/Users/olaf/SolarisApp/src/pages/Viabilidad.tsx', 'utf8');

// fetchViabilidades
code = code.replace(`   const fetchViabilidades = async () => {
      setCargando(true)
      const { data } = await supabase`, 
`   const fetchViabilidades = async () => {
      setCargando(true)
      
      try {
         const cached = await offlineService.getCache('viabilidades');
         if (cached) {
            setViabilidades(cached);
            setCargando(false);
         }
      } catch(e) {}

      if (!navigator.onLine) {
         setCargando(false);
         return;
      }

      const { data } = await supabase`);

code = code.replace(`      if (data) {
         setViabilidades(data)`, 
`      if (data) {
         offlineService.setCache('viabilidades', data).catch(console.error);
         setViabilidades(data)`);

// agendarVisita
code = code.replace(`   const agendarVisita = async () => {
      setProcesando(true)
      try {
         const fechaInicioStr = agendaForm.fecha_inicio;
         const fechaFinStr = agendaForm.fecha_fin || agendaForm.fecha_inicio;

         const updates: any = {
            status: 3, // Force status to Agendada
            fecha_verificada: null, // Reset verification
            ingeniero_id: agendaForm.ingeniero_id,
            fecha_agendada: fechaInicioStr,
            hora_agendada_inicio: agendaForm.hora_inicio,
            fecha_agendada_fin: fechaFinStr,
            hora_agendada_fin: agendaForm.hora_fin
         }
         await supabase.from('viabilidad_control').update(updates).eq('id', proyectoSeleccionado.id)
         await supabase.from('proyectos').update({ sub_estatus: 'Agendada' }).eq('id', proyectoSeleccionado.proyecto_id);

         await supabase.from('proyectos_interacciones').insert([{
            proyecto_id: proyectoSeleccionado.proyecto_id,
            usuario_id: usuarioLogueado?.id,
            estado_anterior: 'Viabilidad',
            estado_nuevo: 'Viabilidad',
            accion: 'Agenda Viabilidad',
            mensaje: \`Visita Agendada para \${agendaForm.fecha_inicio} a las \${agendaForm.hora_inicio}\`
         }]);

         await enviarNotificacionVendedor(
            proyectoSeleccionado.proyecto?.vendedor?.id || proyectoSeleccionado.proyecto?.vendedor_id,
            \`📅 Tu visita de Viabilidad ha sido agendada para el \${agendaForm.fecha_inicio} a las \${agendaForm.hora_inicio}.|||/proyectos?proyecto_id=\${proyectoSeleccionado.proyecto_id}\`,
            usuarioLogueado?.id
         );

         if (agendaForm.ingeniero_id) {
            await enviarNotificacionVendedor(
               agendaForm.ingeniero_id,
               \`🛠️ Se te ha asignado una viabilidad técnica para el \${agendaForm.fecha_inicio} a las \${agendaForm.hora_inicio}: \${proyectoSeleccionado.proyecto?.nombre_proyecto}|||/viabilidad?proyecto_id=\${proyectoSeleccionado.proyecto_id}\`,
               usuarioLogueado?.id
            );
         }`, 
`   const agendarVisita = async () => {
      setProcesando(true)
      try {
         if (!navigator.onLine) {
            await offlineService.addSyncTask('agendar', { proyectoSeleccionado, agendaForm, usuarioLogueado });
            setViabilidades(v => v.map((item:any) => item.id === proyectoSeleccionado.id ? { ...item, status: 3, ingeniero_id: agendaForm.ingeniero_id, fecha_agendada: agendaForm.fecha_inicio, hora_agendada_inicio: agendaForm.hora_inicio } : item));
            await showAlert('Modo Offline', 'Sin conexión. La visita se ha agendado localmente y se sincronizará cuando recuperes señal.');
         } else {
            await ejecutarTareaSync({ type: 'agendar', payload: { proyectoSeleccionado, agendaForm, usuarioLogueado } });
         }`);

// confirmarCancelacion
code = code.replace(`   const confirmarCancelacion = async () => {
      if (!motivoCancelacion.trim()) {
         await showAlert('Aviso', "Debe ingresar un motivo para el rechazo.");
         return;
      }
      setProcesando(true);
      try {
         await supabase.from('viabilidad_control').update({
            status: 0,
            fecha_agendada: null, fecha_agendada_fin: null, fecha_verificada: null, fecha_terminada: null,
            hora_agendada_inicio: null, hora_agendada_fin: null
         }).eq('id', proyectoSeleccionado.id)
         await supabase.from('proyectos').update({ estatus: 'Evaluación', sub_estatus: null }).eq('id', proyectoSeleccionado.proyecto_id);

         await supabase.from('proyectos_interacciones').insert([{
            proyecto_id: proyectoSeleccionado.proyecto_id,
            usuario_id: usuarioLogueado?.id,
            estado_anterior: 'Viabilidad',
            estado_nuevo: 'Evaluación',
            accion: 'Rechazo',
            mensaje: \`Se rechazó la solicitud de viabilidad técnica y se retornó a evaluación. Motivo: \${motivoCancelacion}\`
         }]);

         await enviarNotificacionVendedor(
            proyectoSeleccionado.proyecto?.vendedor_id,
            \`❌ Tu solicitud de Viabilidad Técnica ha sido rechazada. Motivo: \${motivoCancelacion}|||/evaluacion?proyecto_id=\${proyectoSeleccionado.proyecto_id}\`,
            usuarioLogueado?.id
         );`, 
`   const confirmarCancelacion = async () => {
      if (!motivoCancelacion.trim()) {
         await showAlert('Aviso', "Debe ingresar un motivo para el rechazo.");
         return;
      }
      setProcesando(true);
      try {
         if (!navigator.onLine) {
            await offlineService.addSyncTask('cancelar', { proyectoSeleccionado, motivoCancelacion, usuarioLogueado });
            setViabilidades(v => v.map((item:any) => item.id === proyectoSeleccionado.id ? { ...item, status: 0 } : item));
            await showAlert('Modo Offline', 'Sin conexión. El rechazo se sincronizará cuando recuperes señal.');
         } else {
            await ejecutarTareaSync({ type: 'cancelar', payload: { proyectoSeleccionado, motivoCancelacion, usuarioLogueado } });
         }`);

// avanzarA
code = code.replace(`   const avanzarA = async (targetStatus: number, uploadPdf: boolean = false) => {
      setProcesando(true)
      try {
         const updates: any = { status: targetStatus }
         if (targetStatus === 4) updates.fecha_verificada = new Date().toISOString()
         if (targetStatus === 5 && uploadPdf && filesReporte.length > 0) {
            const uploadedUrls = [];
            for (const file of filesReporte) {
               const fileExt = file.name.split('.').pop()
               const fileName = \`viab_\${proyectoSeleccionado.id}_\${Date.now()}_\${Math.random().toString(36).substring(7)}.\${fileExt}\`
               const { error } = await supabase.storage.from('proyectos_media').upload(fileName, file)
               if (!error) {
                  uploadedUrls.push(supabase.storage.from('proyectos_media').getPublicUrl(fileName).data.publicUrl)
               }
            }
            if (uploadedUrls.length > 0) {
               updates.reportes_ingenieria = uploadedUrls;
               updates.reporte_ingenieria = uploadedUrls[0]; // Compatibility
            }
         }
         if (targetStatus === 7) updates.fecha_terminada = new Date().toISOString();

         await supabase.from('viabilidad_control').update(updates).eq('id', proyectoSeleccionado.id)

         if (targetStatus === 2) {
            updates.status = 1; // Se mantiene en 1 hasta que Ventas apruebe
            await supabase.from('proyectos').update({ estatus: 'Viabilidad', sub_estatus: 'Pendiente Aprobacion Ventas' }).eq('id', proyectoSeleccionado.proyecto_id);

            await supabase.from('proyectos_interacciones').insert([{
               proyecto_id: proyectoSeleccionado.proyecto_id,
               usuario_id: usuarioLogueado?.id,
               estado_anterior: 'Evaluación',
               estado_nuevo: 'Viabilidad',
               accion: 'Evaluación Aceptada',
               mensaje: 'Ingeniería aceptó la solicitud de viabilidad. Esperando aprobación de presupuesto de Ventas.'
            }]);

            await enviarNotificacionVendedor(proyectoSeleccionado.proyecto?.vendedor_id, \`⚙️ Ingeniería aceptó tu Solicitud de Viabilidad. Requiere que apruebes el proyecto en la bandeja de Aprobaciones.\`, usuarioLogueado?.id);
         } else if (targetStatus === 7) {
            await supabase.from('proyectos').update({ estatus: 'Viabilidad - Revisión', sub_estatus: null }).eq('id', proyectoSeleccionado.proyecto_id);
            await enviarNotificacionRoles('notif_viabilidad_revision', \`Viabilidad Técnica finalizada, requiere revisión gerencial: \${proyectoSeleccionado.proyecto?.nombre_proyecto}|||/revision\`, usuarioLogueado?.id);
         } else {
            const map: any = { 4: 'Verificada', 5: 'Ingeniería' }
            if (map[targetStatus]) await supabase.from('proyectos').update({ sub_estatus: map[targetStatus] }).eq('id', proyectoSeleccionado.proyecto_id);

            if (targetStatus === 4) {
               await enviarNotificacionVendedor(proyectoSeleccionado.proyecto?.vendedor_id, \`✅ Tu solicitud de Viabilidad Técnica ha sido verificada y confirmada en agenda: \${proyectoSeleccionado.proyecto?.nombre_proyecto}|||/proyectos?proyecto_id=\${proyectoSeleccionado.proyecto_id}\`, usuarioLogueado?.id);
            }
         }`, 
`   const avanzarA = async (targetStatus: number, uploadPdf: boolean = false) => {
      setProcesando(true)
      try {
         if (!navigator.onLine) {
            await offlineService.addSyncTask('avanzar', { proyectoSeleccionado, targetStatus, filesReporte: uploadPdf ? filesReporte : [], usuarioLogueado });
            setViabilidades(v => v.map((item:any) => item.id === proyectoSeleccionado.id ? { ...item, status: targetStatus } : item));
            await showAlert('Modo Offline', 'Sin conexión. El avance del proyecto se ha guardado y se sincronizará cuando recuperes señal.');
         } else {
            await ejecutarTareaSync({ type: 'avanzar', payload: { proyectoSeleccionado, targetStatus, filesReporte: uploadPdf ? filesReporte : [], usuarioLogueado } });
         }`);

// reportarIncidente
code = code.replace(`   const reportarIncidente = async () => {
      if (!motivoIncidenteTexto.trim()) {
         await showAlert('Aviso', "Debe ingresar el motivo del incidente.");
         return;
      }
      setProcesando(true);
      try {
         await supabase.from('viabilidad_control').update({
            incidente_visita: true,
            motivo_incidente: motivoIncidenteTexto,
            fecha_incidente: new Date().toISOString()
         }).eq('id', proyectoSeleccionado.id)

         await supabase.from('proyectos_interacciones').insert([{
            proyecto_id: proyectoSeleccionado.proyecto_id,
            usuario_id: usuarioLogueado?.id,
            estado_anterior: 'Viabilidad',
            estado_nuevo: 'Viabilidad',
            accion: 'Incidente Visita',
            mensaje: \`Incidente reportado en visita técnica. Motivo: \${motivoIncidenteTexto}\`
         }]);

         await enviarNotificacionVendedor(
            proyectoSeleccionado.proyecto?.vendedor_id, 
            \`⚠️ Inconveniente en Visita Técnica de tu proyecto \${proyectoSeleccionado.proyecto?.nombre_proyecto}. Motivo: \${motivoIncidenteTexto}|||/proyectos?proyecto_id=\${proyectoSeleccionado.proyecto_id}\`, 
            usuarioLogueado?.id
         );
         
         await enviarNotificacionRoles('notif_viabilidad_tecnica', \`⚠️ Incidente reportado en visita de viabilidad: \${proyectoSeleccionado.proyecto?.nombre_proyecto}. Motivo: \${motivoIncidenteTexto}|||/viabilidad?proyecto_id=\${proyectoSeleccionado.proyecto_id}\`, usuarioLogueado?.id);`, 
`   const reportarIncidente = async () => {
      if (!motivoIncidenteTexto.trim()) {
         await showAlert('Aviso', "Debe ingresar el motivo del incidente.");
         return;
      }
      setProcesando(true);
      try {
         if (!navigator.onLine) {
            await offlineService.addSyncTask('incidente', { proyectoSeleccionado, motivoIncidenteTexto, usuarioLogueado });
            setViabilidades(v => v.map((item:any) => item.id === proyectoSeleccionado.id ? { ...item, incidente_visita: true } : item));
            await showAlert('Modo Offline', 'Sin conexión. El incidente se sincronizará cuando recuperes señal.');
         } else {
            await ejecutarTareaSync({ type: 'incidente', payload: { proyectoSeleccionado, motivoIncidenteTexto, usuarioLogueado } });
         }`);

// UI Headers
code = code.replace(`               <div className="flex bg-white/90 backdrop-blur-md p-1.5 rounded-[20px] shadow-sm border border-slate-200 w-full xl:w-max overflow-x-auto custom-scrollbar shrink-0 mb-4">`,
`               {/* MODO OFFLINE BANNER */}
               {(!isOnline || syncQueueCount > 0) && (
                  <div className={\`flex items-center justify-between p-3 rounded-2xl mb-4 text-xs font-black uppercase tracking-widest \${!isOnline ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-orange-50 text-orange-600 border border-orange-200'}\`}>
                     <div className="flex items-center gap-2">
                        {!isOnline ? <CloudOff size={16} /> : <Cloud size={16} />}
                        {!isOnline ? 'Trabajando sin conexión' : 'Conexión Restablecida'}
                     </div>
                     {syncQueueCount > 0 && (
                        <div className="flex items-center gap-2">
                           {sincronizando && <RefreshCw size={14} className="animate-spin" />}
                           {syncQueueCount} cambios pendientes
                        </div>
                     )}
                  </div>
               )}

               <div className="flex bg-white/90 backdrop-blur-md p-1.5 rounded-[20px] shadow-sm border border-slate-200 w-full xl:w-max overflow-x-auto custom-scrollbar shrink-0 mb-4">`);

fs.writeFileSync('/Users/olaf/SolarisApp/src/pages/Viabilidad.tsx', code);
