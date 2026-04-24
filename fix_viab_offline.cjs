const fs = require('fs');
let code = fs.readFileSync('/Users/olaf/SolarisApp/src/pages/Viabilidad.tsx', 'utf8');

// Insert imports
code = code.replace("import { supabase, enviarNotificacionVendedor, enviarNotificacionRoles } from '../supabaseClient'", 
`import { supabase, enviarNotificacionVendedor, enviarNotificacionRoles } from '../supabaseClient'
import { offlineService } from '../services/OfflineService'
import { CloudOff, Cloud, RefreshCw } from 'lucide-react'`);

// Add states
code = code.replace("const [motivoIncidenteTexto, setMotivoIncidenteTexto] = useState('')", 
`const [motivoIncidenteTexto, setMotivoIncidenteTexto] = useState('')
   
   // OFFLINE SYNC STATES
   const [isOnline, setIsOnline] = useState(navigator.onLine)
   const [syncQueueCount, setSyncQueueCount] = useState(0)
   const [sincronizando, setSincronizando] = useState(false)`);

// Replace useEffect
const eff = `
   const checkQueueCount = async () => {
      const tasks = await offlineService.getPendingTasks();
      setSyncQueueCount(tasks.length);
   }

   useEffect(() => {
      const handleOnline = () => { setIsOnline(true); procesarColaSync(); }
      const handleOffline = () => setIsOnline(false)
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      checkQueueCount()
      return () => {
         window.removeEventListener('online', handleOnline)
         window.removeEventListener('offline', handleOffline)
      }
   }, [])

   const procesarColaSync = async () => {
      if (!navigator.onLine) return;
      setSincronizando(true);
      try {
         const tasks = await offlineService.getPendingTasks();
         if (tasks.length === 0) {
            setSincronizando(false);
            return;
         }
         
         for (const task of tasks) {
            try {
               await ejecutarTareaSync(task);
               await offlineService.removeTask(task.id);
            } catch(e) {
               console.error("Error sync task", task, e);
            }
         }
         checkQueueCount();
         fetchViabilidades();
      } finally {
         setSincronizando(false);
      }
   }

   const ejecutarTareaSync = async (task: any) => {
      const { type, payload } = task;
      const { proyectoSeleccionado, usuarioLogueado } = payload;
      
      if (type === 'agendar') {
         const { agendaForm } = payload;
         const fechaInicioStr = agendaForm.fecha_inicio;
         const fechaFinStr = agendaForm.fecha_fin || agendaForm.fecha_inicio;

         const updates: any = {
            status: 3,
            fecha_verificada: null,
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

         await enviarNotificacionVendedor(proyectoSeleccionado.proyecto?.vendedor?.id || proyectoSeleccionado.proyecto?.vendedor_id, \`📅 Tu visita de Viabilidad ha sido agendada para el \${agendaForm.fecha_inicio} a las \${agendaForm.hora_inicio}.|||/proyectos?proyecto_id=\${proyectoSeleccionado.proyecto_id}\`, usuarioLogueado?.id);
         if (agendaForm.ingeniero_id) {
            await enviarNotificacionVendedor(agendaForm.ingeniero_id, \`🛠️ Se te ha asignado una viabilidad técnica para el \${agendaForm.fecha_inicio} a las \${agendaForm.hora_inicio}: \${proyectoSeleccionado.proyecto?.nombre_proyecto}|||/viabilidad?proyecto_id=\${proyectoSeleccionado.proyecto_id}\`, usuarioLogueado?.id);
         }
      } 
      else if (type === 'cancelar') {
         const { motivoCancelacion } = payload;
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

         await enviarNotificacionVendedor(proyectoSeleccionado.proyecto?.vendedor_id, \`❌ Tu solicitud de Viabilidad Técnica ha sido rechazada. Motivo: \${motivoCancelacion}|||/evaluacion?proyecto_id=\${proyectoSeleccionado.proyecto_id}\`, usuarioLogueado?.id);
      }
      else if (type === 'incidente') {
         const { motivoIncidenteTexto } = payload;
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

         await enviarNotificacionVendedor(proyectoSeleccionado.proyecto?.vendedor_id, \`⚠️ Inconveniente en Visita Técnica de tu proyecto \${proyectoSeleccionado.proyecto?.nombre_proyecto}. Motivo: \${motivoIncidenteTexto}|||/proyectos?proyecto_id=\${proyectoSeleccionado.proyecto_id}\`, usuarioLogueado?.id);
         await enviarNotificacionRoles('notif_viabilidad_tecnica', \`⚠️ Incidente reportado en visita de viabilidad: \${proyectoSeleccionado.proyecto?.nombre_proyecto}. Motivo: \${motivoIncidenteTexto}|||/viabilidad?proyecto_id=\${proyectoSeleccionado.proyecto_id}\`, usuarioLogueado?.id);
      }
      else if (type === 'avanzar') {
         const { targetStatus, filesReporte } = payload;
         const updates: any = { status: targetStatus }
         if (targetStatus === 4) updates.fecha_verificada = new Date().toISOString()
         if (targetStatus === 5 && filesReporte && filesReporte.length > 0) {
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
               updates.reporte_ingenieria = uploadedUrls[0]; 
            }
         }
         if (targetStatus === 7) updates.fecha_terminada = new Date().toISOString();

         await supabase.from('viabilidad_control').update(updates).eq('id', proyectoSeleccionado.id)

         if (targetStatus === 2) {
            updates.status = 1; 
            await supabase.from('proyectos').update({ estatus: 'Viabilidad', sub_estatus: 'Pendiente Aprobacion Ventas' }).eq('id', proyectoSeleccionado.proyecto_id);
            await supabase.from('proyectos_interacciones').insert([{
               proyecto_id: proyectoSeleccionado.proyecto_id, usuario_id: usuarioLogueado?.id,
               estado_anterior: 'Evaluación', estado_nuevo: 'Viabilidad', accion: 'Evaluación Aceptada',
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
         }
      }
   }`;

code = code.replace(`   useEffect(() => {
      fetchViabilidades()
   }, [])`, `   useEffect(() => {
      fetchViabilidades()
      procesarColaSync()
   }, [])\n\n` + eff);

fs.writeFileSync('/Users/olaf/SolarisApp/src/pages/Viabilidad.tsx', code);
