require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('viabilidad_control')
    .select('*, proyecto:proyecto_id(nombre_proyecto, vendedor_id), ingeniero:ingeniero_id(id, nombre, apellidos)')
    .not('fecha_agendada', 'is', null);
  console.log(JSON.stringify(data, null, 2));
}
run();
