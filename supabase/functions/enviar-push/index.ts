import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push"

const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!

webpush.setVapidDetails('mailto:admin@sistemasolaris.com', vapidPublicKey, vapidPrivateKey)

Deno.serve(async (req) => {
  console.log("--- 🚀 INICIANDO ENVÍO ---")
  
  try {
    const payload = await req.json()
    const { usuario_id, autor_id, mensaje } = payload.record
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Buscamos dispositivos (asegurándonos de que tengan endpoint)
    const { data: subs, error: errFetch } = await supabase
      .from('push_subscriptions')
      .select('subscription_json, endpoint')
      .eq('user_id', usuario_id)
      .not('endpoint', 'is', null) // <--- Filtro de seguridad extra

    if (errFetch || !subs || subs.length === 0) {
      console.log(`⚠️ No hay dispositivos válidos para el usuario: ${usuario_id}`)
      return new Response("Sin dispositivos", { status: 200 })
    }

    // Buscar nombre del autor
    let tituloNotificacion = "Sistema Solaris"
    if (autor_id) {
        const { data: autor } = await supabase.from('perfiles').select('nombre, apellidos').eq('id', autor_id).single()
        if (autor) tituloNotificacion = `${autor.nombre} ${autor.apellidos}`
    }

    const promesas = subs.map(async (sub) => {
      try {
        // Usamos ?. y un fallback por si las moscas para que no truene el log
        const logEndpoint = sub.endpoint?.substring(0, 30) || "Sin endpoint"
        console.log(`📤 Enviando a: ${logEndpoint}...`)
        
        await webpush.sendNotification(sub.subscription_json, JSON.stringify({
          title: tituloNotificacion,
          body: mensaje,
          url: "/"
        }))
        console.log("✅ OK")
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log("🧹 Borrando token expirado")
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        } else {
          console.error("🔥 Error de envío:", err.message)
        }
      }
    })

    await Promise.all(promesas)
    console.log("--- ✨ FIN DEL PROCESO ---")
    return new Response("Hecho", { status: 200 })
    
  } catch (error) {
    console.error("🔥 ERROR EN EL SERVIDOR:", error.message)
    return new Response("Error", { status: 500 })
  }
})