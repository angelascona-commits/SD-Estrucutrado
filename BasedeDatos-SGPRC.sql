-- TABLAS PARA EL DOMINIO SGPRC (Gestión de Permisos y Recursos Cloud)

-- 1. Tabla de Solicitudes (Tickets)
CREATE TABLE IF NOT EXISTS public.sgprc_solicitudes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  orquestador_id integer NOT NULL, -- Vínculo a public.usuarios(id)
  proyectista_id integer NOT NULL, -- Vínculo a public.tareo_solicitante(id)
  descripcion_negocio text NOT NULL,
  sustento_tecnico text NOT NULL,
  estado character varying NOT NULL DEFAULT 'Borrador' CHECK (estado IN ('Borrador', 'Pendiente Infraestructura', 'Pendiente Ciberseguridad', 'Aprobado', 'Rechazado')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sgprc_solicitudes_pkey PRIMARY KEY (id),
  CONSTRAINT sgprc_solicitudes_orquestador_id_fkey FOREIGN KEY (orquestador_id) REFERENCES public.usuarios(id),
  CONSTRAINT sgprc_solicitudes_proyectista_id_fkey FOREIGN KEY (proyectista_id) REFERENCES public.tareo_solicitante(id)
);

-- 2. Tabla de Componentes Cloud
CREATE TABLE IF NOT EXISTS public.sgprc_componentes_cloud (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  solicitud_id bigint NOT NULL,
  servicio_requerido character varying NOT NULL, -- Ej: IAM, BD, API, Servidor, etc.
  entorno character varying NOT NULL,
  configuracion_detalles text NOT NULL,
  usuario_cloud character varying, -- Campo Usuario en el Excel
  cuenta_cloud character varying,  -- Campo Cuenta en el Excel
  accion_cloud text,               -- Campo Action en el Excel
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sgprc_componentes_cloud_pkey PRIMARY KEY (id),
  CONSTRAINT sgprc_componentes_cloud_solicitud_id_fkey FOREIGN KEY (solicitud_id) REFERENCES public.sgprc_solicitudes(id) ON DELETE CASCADE
);

-- 3. Tabla de Evaluaciones Técnicas
CREATE TABLE IF NOT EXISTS public.sgprc_evaluaciones_tecnicas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  solicitud_id bigint NOT NULL UNIQUE,
  evaluador_infraestructura_id integer, -- Vínculo a public.usuarios(id)
  presupuesto numeric(12,2) DEFAULT 0.00,
  integraciones_detalle text,
  aprobador_ciberseguridad_id integer, -- Vínculo a public.usuarios(id)
  reglas_perimetrales text, -- Detalle de IPs permitidas/denegadas, Firewalls, límites de peticiones, etc.
  comentarios text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sgprc_evaluaciones_tecnicas_pkey PRIMARY KEY (id),
  CONSTRAINT sgprc_evaluaciones_tecnicas_solicitud_id_fkey FOREIGN KEY (solicitud_id) REFERENCES public.sgprc_solicitudes(id) ON DELETE CASCADE,
  CONSTRAINT sgprc_evaluaciones_tecnicas_evaluador_infraestructura_id_fkey FOREIGN KEY (evaluador_infraestructura_id) REFERENCES public.usuarios(id),
  CONSTRAINT sgprc_evaluaciones_tecnicas_aprobador_ciberseguridad_id_fkey FOREIGN KEY (aprobador_ciberseguridad_id) REFERENCES public.usuarios(id)
);

-- 4. Tabla de Historial de Auditoría (Logs)
CREATE TABLE IF NOT EXISTS public.sgprc_auditoria_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  solicitud_id bigint NOT NULL,
  usuario_id integer NOT NULL, -- Vínculo a public.usuarios(id)
  accion character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sgprc_auditoria_logs_pkey PRIMARY KEY (id),
  CONSTRAINT sgprc_auditoria_logs_solicitud_id_fkey FOREIGN KEY (solicitud_id) REFERENCES public.sgprc_solicitudes(id) ON DELETE CASCADE,
  CONSTRAINT sgprc_auditoria_logs_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);

-- 5. Tabla de Control de Tokens de Correo
CREATE TABLE IF NOT EXISTS public.sgprc_tokens_correo (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  solicitud_id bigint NOT NULL,
  usuario_id integer NOT NULL, -- Vínculo a public.usuarios(id)
  token text NOT NULL UNIQUE,
  accion character varying NOT NULL CHECK (accion IN ('Aprobar', 'Rechazar')),
  fecha_expiracion timestamp with time zone NOT NULL,
  usado boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sgprc_tokens_correo_pkey PRIMARY KEY (id),
  CONSTRAINT sgprc_tokens_correo_solicitud_id_fkey FOREIGN KEY (solicitud_id) REFERENCES public.sgprc_solicitudes(id) ON DELETE CASCADE,
  CONSTRAINT sgprc_tokens_correo_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);

-- 6. Tabla de Configuración de Métricas Dinámicas
CREATE TABLE IF NOT EXISTS public.sgprc_metricas_config (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  key_name character varying NOT NULL UNIQUE, -- e.g., 'total', 'borradores', 'infra', 'ciber', 'aprobados', 'rechazados'
  label character varying NOT NULL, -- e.g., 'Total', 'Borradores', 'Infraestructura', 'Ciberseguridad', 'Aprobados'
  estado_asociado character varying, -- El estado correspondiente en sgprc_solicitudes. NULL representa totalizador.
  style_class character varying NOT NULL, -- clase CSS e.g. 'total', 'draft', 'infra', 'security', 'approved', 'rejected'
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  CONSTRAINT sgprc_metricas_config_pkey PRIMARY KEY (id)
);

-- 7. Tabla de Entornos Dinámicos
CREATE TABLE IF NOT EXISTS public.sgprc_entornos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre character varying NOT NULL UNIQUE,
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  CONSTRAINT sgprc_entornos_pkey PRIMARY KEY (id)
);

-- 8. Tabla de Servicios Cloud Dinámicos
CREATE TABLE IF NOT EXISTS public.sgprc_servicios_cloud (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre character varying NOT NULL UNIQUE,
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  CONSTRAINT sgprc_servicios_cloud_pkey PRIMARY KEY (id)
);

-- 9. Tabla de Cuentas Cloud (NUEVO)
CREATE TABLE IF NOT EXISTS public.sgprc_cuentas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre character varying NOT NULL UNIQUE,
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  CONSTRAINT sgprc_cuentas_pkey PRIMARY KEY (id)
);

-- 10. Tabla de Acciones Cloud (NUEVO)
CREATE TABLE IF NOT EXISTS public.sgprc_acciones (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre character varying NOT NULL UNIQUE,
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  CONSTRAINT sgprc_acciones_pkey PRIMARY KEY (id)
);

-- Habilitar RLS en las tablas creadas
ALTER TABLE public.sgprc_solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgprc_componentes_cloud ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgprc_evaluaciones_tecnicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgprc_auditoria_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgprc_tokens_correo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgprc_metricas_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgprc_entornos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgprc_servicios_cloud ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgprc_cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgprc_acciones ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS simplificadas para facilitar el desarrollo
DROP POLICY IF EXISTS "Permitir lectura para todos los usuarios autenticados" ON public.sgprc_solicitudes;
CREATE POLICY "Permitir lectura para todos los usuarios autenticados" ON public.sgprc_solicitudes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Permitir escritura para todos los usuarios autenticados" ON public.sgprc_solicitudes;
CREATE POLICY "Permitir escritura para todos los usuarios autenticados" ON public.sgprc_solicitudes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a componentes cloud para usuarios autenticados" ON public.sgprc_componentes_cloud;
CREATE POLICY "Permitir todo a componentes cloud para usuarios autenticados" ON public.sgprc_componentes_cloud FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a evaluaciones técnicas para usuarios autenticados" ON public.sgprc_evaluaciones_tecnicas;
CREATE POLICY "Permitir todo a evaluaciones técnicas para usuarios autenticados" ON public.sgprc_evaluaciones_tecnicas FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a logs auditoria para usuarios autenticados" ON public.sgprc_auditoria_logs;
CREATE POLICY "Permitir todo a logs auditoria para usuarios autenticados" ON public.sgprc_auditoria_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a tokens correo para usuarios autenticados" ON public.sgprc_tokens_correo;
CREATE POLICY "Permitir todo a tokens correo para usuarios autenticados" ON public.sgprc_tokens_correo FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a metricas config para usuarios autenticados" ON public.sgprc_metricas_config;
CREATE POLICY "Permitir todo a metricas config para usuarios autenticados" ON public.sgprc_metricas_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a entornos para usuarios autenticados" ON public.sgprc_entornos;
CREATE POLICY "Permitir todo a entornos para usuarios autenticados" ON public.sgprc_entornos FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a servicios cloud para usuarios autenticados" ON public.sgprc_servicios_cloud;
CREATE POLICY "Permitir todo a servicios cloud para usuarios autenticados" ON public.sgprc_servicios_cloud FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a cuentas para usuarios autenticados" ON public.sgprc_cuentas;
CREATE POLICY "Permitir todo a cuentas para usuarios autenticados" ON public.sgprc_cuentas FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a acciones para usuarios autenticados" ON public.sgprc_acciones;
CREATE POLICY "Permitir todo a acciones para usuarios autenticados" ON public.sgprc_acciones FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 11. Datos Semilla (Aprovisionamiento de Configuraciones)
INSERT INTO public.sgprc_metricas_config (key_name, label, estado_asociado, style_class, orden) VALUES
('total', 'Total', NULL, 'total', 10),
('borradores', 'Borradores', 'Borrador', 'draft', 20),
('infra', 'Infraestructura', 'Pendiente Infraestructura', 'infra', 30),
('ciber', 'Ciberseguridad', 'Pendiente Ciberseguridad', 'security', 40),
('aprobados', 'Aprobados', 'Aprobado', 'approved', 50),
('rechazados', 'Rechazados', 'Rechazado', 'rejected', 60)
ON CONFLICT (key_name) DO UPDATE SET
  label = EXCLUDED.label,
  estado_asociado = EXCLUDED.estado_asociado,
  style_class = EXCLUDED.style_class,
  orden = EXCLUDED.orden;

INSERT INTO public.sgprc_entornos (nombre, orden) VALUES
('Desarrollo', 10),
('QA', 20),
('Producción', 30)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.sgprc_servicios_cloud (nombre, orden) VALUES
('AWS Cloudformation', 10),
('AWS Lambda', 20),
('AWS DynamoDB', 30),
('AWS IAM', 40)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.sgprc_cuentas (nombre, orden) VALUES
('protectasecurity-nntp-develop-account', 10),
('protectasecurity-nntp-qa-account', 20),
('protectasecurity-nntp-production-account', 30)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.sgprc_acciones (nombre, orden) VALUES
('Creación, edición, eliminación y lectura de los stacks y recursos administrados por IAC', 10),
('Creación, edición, eliminación, lectura e invocación de las funciones lambda, gestion de variables de desarrollo', 20),
('Lectura y escritura en tablas NoSQL (DynamoDB)', 30),
('Acceso total de administración (Administrador)', 40)
ON CONFLICT (nombre) DO NOTHING;
