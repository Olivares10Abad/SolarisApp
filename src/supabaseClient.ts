import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const enviarNotificacionRoles = async (rolConfigCol: string, mensaje: string, autorId: string | null = null) => {
  // Buscar usuarios que tienen activa la notificación para ese módulo
  const { data: usuariosDestino } = await supabase.from('perfiles').select('id').eq(rolConfigCol, true);
  if (!usuariosDestino || usuariosDestino.length === 0) return;

  // Armar el payload masivo de notificaciones
  const payloadNotifs = usuariosDestino.map(u => ({
    usuario_id: u.id,
    autor_id: autorId,
    mensaje: mensaje
  }));

  await supabase.from('notificaciones').insert(payloadNotifs);
}

export const enviarNotificacionVendedor = async (usuarioDestinoId: string, mensaje: string, autorId: string | null = null) => {
  if (!usuarioDestinoId) return;
  await supabase.from('notificaciones').insert([{
    usuario_id: usuarioDestinoId,
    autor_id: autorId,
    mensaje: mensaje
  }]);
}