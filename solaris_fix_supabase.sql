-- 1. Agregar la columna sub_estatus que faltó en la tabla proyectos
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS sub_estatus text;

-- 2. Agregar los permisos de notificación en la tabla de perfiles
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS notif_viabilidad_tecnica boolean DEFAULT false;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS notif_viabilidad_revision boolean DEFAULT false;

-- 3. Arreglar la Política de Seguridad (RLS) para permitir INSERCIONES
DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados viabilidad" ON viabilidad_control;
CREATE POLICY "Permitir todo a usuarios autenticados viabilidad" 
  ON viabilidad_control 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);
