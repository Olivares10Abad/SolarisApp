const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => l.split('=')));
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
// We want to see the type of proyecto_id
supabase.from('mensajes_chat').insert([{ proyecto_id: '123_viab', destinatario_id: null, remitente_id: '123e4567-e89b-12d3-a456-426614174000', mensaje: 'test' }]).then(res => console.log('Insert test:', res));
