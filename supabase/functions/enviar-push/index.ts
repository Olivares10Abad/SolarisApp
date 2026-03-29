import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push"

const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!

webpush.setVapidDetails(
  'mailto:admin@sistemasolaris.com',
  vapidPublicKey,
  vapidPrivateKey
)

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const { usuario_id, autor_id, mensaje } = payload.record

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Buscamos TODOS los dispositivos registrados para este usuario (quitamos el .single())
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('subscription_json')
      .eq('user_id', usuario_id)

    // Si no hay dispositivos en la lista, terminamos.
    if (error || !subs || subs.length === 0) return new Response("Sin dispositivos", { status: 200 })

    // 2. Buscar el nombre del autor
    let tituloNotificacion = "Sistema Solaris"
    if (autor_id) {
        const { data: autor } = await supabase.from('perfiles').select('nombre, apellidos').eq('id', autor_id).single()
        if (autor) tituloNotificacion = `${autor.nombre} ${autor.apellidos}`
    }

    // 3. ¡Disparar a TODOS los dispositivos al mismo tiempo!
    const promesasEnvio = subs.map(sub => 
      webpush.sendNotification(sub.subscription_json, JSON.stringify({
        title: tituloNotificacion,
        body: mensaje,
        url: "/"
      })).catch(err => {
        // Si un celular viejo ya borró la app, fallará aquí, pero no detendrá a los demás
        console.log("Un dispositivo falló o el token expiró", err)
      })
    )

    // Esperamos a que salgan todas las notificaciones
    await Promise.all(promesasEnvio)

    return new Response("Notificaciones multi-dispositivo enviadas", { status: 200 })
    
  } catch (error) {
    console.error("Error en Push:", error)
    return new Response("Error", { status: 500 })
  }
})