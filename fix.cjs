const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => l.split('=')));
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const query = 
  ALTER TABLE viabilidad_control ADD COLUMN IF NOT EXISTS reporte_ingenieria TEXT;
;

supabase.rpc('ejecutar_sql', { query_sql: query }).then(res => console.log('ALTER OK', res)).catch(console.error);
