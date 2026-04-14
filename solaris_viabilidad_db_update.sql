ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS fachada_url text;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS link_maps text;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS calle text;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS colonia text;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS ciudad text;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS estado_dir text;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS codigo_postal text;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS nombre_cliente text;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS numero_cliente text;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS requiere_escalera boolean DEFAULT false;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS comentarios_solicitud text;

CREATE TABLE IF NOT EXISTS viabilidad_control (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proyecto_id uuid REFERENCES proyectos(id) ON DELETE CASCADE,
  status smallint NOT NULL DEFAULT 1,
  ingeniero_id uuid REFERENCES perfiles(id),
  fecha_solicitada timestamp with time zone DEFAULT now(),
  fecha_revisada_ingenieria timestamp with time zone,
  fecha_revisada_ventas timestamp with time zone,
  fecha_agendada timestamp with time zone,
  fecha_verificada timestamp with time zone,
  fecha_terminada timestamp with time zone,
  agenda_fecha date,
  agenda_hora_inicio time without time zone,
  comentarios_cancelacion text,
  comentarios_ingenieria text,
  comentarios_revision_ingenieria text,
  comentarios_revision_gerencia text,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS si es necesario o permitir todo
ALTER TABLE viabilidad_control ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo a usuarios autenticados viabilidad" ON viabilidad_control FOR ALL TO authenticated USING (true);
