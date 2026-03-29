import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push"

// 1. Configurar las llaves
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!

webpush.setVapidDetails(
  'mailto:admin@sistemasolaris.com',
  vapidPublicKey,
  vapidPrivateKey
)

// Usamos la API moderna de Deno
Deno.serve(async (req) => {
  try {
    // 2. Recibir los datos del trigger SQL
    const payload = await req.json()
    const { usuario_id, mensaje } = payload.record

    // 3. Conectarse a Supabase (Service Role para saltar reglas RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 4. Buscar el token del celular
    const { data: subData } = await supabase
      .from('push_subscriptions')
      .select('subscription_json')
      .eq('user_id', usuario_id)
      .single()

    if (!subData) {
      return new Response("El usuario no tiene celular registrado.", { status: 200 })
    }

    // 5. ¡Disparar la Push!
    await webpush.sendNotification(subData.subscription_json, JSON.stringify({
      title: "Sistema Solaris",
      body: mensaje,
      url: "/"
    }))

    return new Response("Notificación enviada con éxito.", { status: 200 })
  } catch (error) {
    console.error("Error en Push:", error)
    return new Response("Error interno enviando push.", { status: 500 })
  }
})