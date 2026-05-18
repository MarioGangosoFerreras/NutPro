-- ============================================================
-- ESQUEMA DE BASE DE DATOS - APLICACIÓN DE NUTRICIÓN
-- ============================================================


-- ------------------------------------------------------------
-- TABLAS
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.usuarios (
  id               uuid NOT NULL,
  auth_user_id     uuid,
  email            text NOT NULL,
  nombre           text NOT NULL,
  apellidos        text NOT NULL,
  rol              USER-DEFINED NOT NULL,
  avatar_url       text,
  created_at       timestamp with time zone
);
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.nutricionistas (
  id                uuid NOT NULL,
  usuario_id        uuid NOT NULL,
  numero_colegiado  text,
  especialidad      text,
  bio               text,
  estado            text NOT NULL,
  telefono          text,
  titulacion        USER-DEFINED,
  nombre_empresa    text,
  dni_fiscal        text,
  direccion_fiscal  text,
  centros           jsonb
);
ALTER TABLE public.nutricionistas ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pacientes (
  id               uuid NOT NULL,
  usuario_id       uuid,
  nutricionista_id uuid NOT NULL,
  dni              text NOT NULL,
  fecha_nacimiento date NOT NULL,
  sexo             USER-DEFINED NOT NULL,
  telefono         text NOT NULL,
  email            text NOT NULL,
  direccion        text NOT NULL,
  ocupacion        text,
  estado_civil     USER-DEFINED,
  nacionalidad     text,
  motivo_consulta  text NOT NULL,
  alergias         ARRAY,
  intolerancias    ARRAY,
  created_at       timestamp with time zone
);
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.antecedentes_familiares (
  id                    uuid NOT NULL,
  paciente_id           uuid NOT NULL,
  hta                   boolean,
  ecv                   boolean,
  diabetes              boolean,
  enfermedad_autoinmune boolean,
  alergias              boolean,
  obesidad              boolean,
  cancer                boolean,
  otra                  text
);
ALTER TABLE public.antecedentes_familiares ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.antecedentes_personales (
  id                       uuid NOT NULL,
  paciente_id              uuid NOT NULL,
  alcohol                  boolean,
  tabaco                   boolean,
  cirugias                 boolean,
  alergias                 boolean,
  enfermedad_patologia     text,
  medicacion               text,
  digestiones              text,
  menstruacion             text,
  suplementos_nutricionales text,
  descansa_bien            boolean,
  actividad_fisica         USER-DEFINED
);
ALTER TABLE public.antecedentes_personales ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.encuesta_alimentaria (
  id                        uuid NOT NULL,
  paciente_id               uuid NOT NULL,
  fecha                     date NOT NULL,
  come_en_casa              boolean,
  hace_la_comida            boolean,
  le_gusta_cocinar          boolean,
  come_solo_tv              text,
  num_comidas_dia           integer,
  come_tranquilo            boolean,
  ansiedad_comida           text,
  apetito                   text,
  picotea                   boolean,
  consumo_agua_litros       numeric,
  otras_bebidas             text,
  preferencias_alimentarias text,
  aversiones_alimentarias   text
);
ALTER TABLE public.encuesta_alimentaria ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.mediciones (
  id                    uuid NOT NULL,
  paciente_id           uuid NOT NULL,
  fecha                 date NOT NULL,
  peso_kg               numeric,
  altura_cm             numeric,
  imc                   numeric,
  grasa_corporal_pct    numeric,
  masa_muscular_kg      numeric,
  perimetro_cintura_cm  numeric,
  perimetro_cadera_cm   numeric,
  perimetro_abdomen_cm  numeric,
  indice_cintura_cadera numeric,
  notas                 text,
  registrado_por        text
);
ALTER TABLE public.mediciones ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.objetivos (
  id          uuid NOT NULL,
  paciente_id uuid NOT NULL,
  tipo        USER-DEFINED NOT NULL,
  valor_meta  numeric,
  valor_actual numeric,
  fecha_limite date,
  estado      USER-DEFINED NOT NULL
);
ALTER TABLE public.objetivos ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.planes_nutricionales (
  id                    uuid NOT NULL,
  paciente_id           uuid NOT NULL,
  tipo                  USER-DEFINED NOT NULL,
  objetivo              USER-DEFINED,
  factor_actividad      numeric,
  gasto_energetico_base numeric,
  calorias_objetivo     numeric,
  proteinas_g           numeric,
  grasas_g              numeric,
  carbohidratos_g       numeric,
  notas                 text,
  activo                boolean,
  created_at            timestamp with time zone
);
ALTER TABLE public.planes_nutricionales ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.food_items (
  id              uuid NOT NULL,
  creado_por      uuid,
  nombre          text NOT NULL,
  fuente          USER-DEFINED NOT NULL,
  external_id     text,
  categoria       text,
  es_publico      boolean,
  calorias_kcal   numeric,
  carbohidratos_g numeric,
  proteina_g      numeric,
  grasa_g         numeric,
  fibra_g         numeric,
  azucar_g        numeric,
  micronutrientes jsonb,
  sincronizado_at timestamp with time zone,
  imagen_url      text
);
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.recetas (
  id              uuid NOT NULL,
  creado_por      uuid,
  nombre          text NOT NULL,
  visibilidad     USER-DEFINED NOT NULL,
  tipo_comida     ARRAY,
  etiquetas       ARRAY,
  raciones        integer NOT NULL,
  tiempo_prep_min integer,
  instrucciones   text,
  imagen_url      text,
  calorias_kcal   numeric,
  proteina_g      numeric,
  carbohidratos_g numeric,
  grasa_g         numeric,
  fibra_g         numeric,
  created_at      timestamp with time zone,
  updated_at      timestamp with time zone
);
ALTER TABLE public.recetas ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.receta_ingredientes (
  id             uuid NOT NULL,
  receta_id      uuid NOT NULL,
  food_item_id   uuid NOT NULL,
  cantidad_g     numeric NOT NULL,
  cantidad_texto text,
  es_opcional    boolean,
  orden          integer
);
ALTER TABLE public.receta_ingredientes ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.receta_nutricion_cache (
  id              uuid NOT NULL,
  receta_id       uuid NOT NULL,
  numero_racion   integer NOT NULL,
  calorias_kcal   numeric,
  carbohidratos_g numeric,
  proteina_g      numeric,
  grasa_g         numeric,
  micronutrientes jsonb,
  calculado_at    timestamp with time zone
);
ALTER TABLE public.receta_nutricion_cache ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.recetas_ocultas (
  id         uuid NOT NULL,
  receta_id  uuid NOT NULL,
  usuario_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL
);
ALTER TABLE public.recetas_ocultas ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.menus_semanales (
  id               uuid NOT NULL,
  nutricionista_id uuid NOT NULL,
  paciente_id      uuid NOT NULL,
  nombre           text,
  titulo           text,
  fecha_inicio     date NOT NULL,
  fecha_fin        date NOT NULL,
  notas            text,
  plan_id          uuid,
  created_at       timestamp with time zone
);
ALTER TABLE public.menus_semanales ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.menu_entradas (
  id          uuid NOT NULL,
  menu_id     uuid NOT NULL,
  dia_semana  integer NOT NULL,
  tipo_comida USER-DEFINED NOT NULL,
  receta_id   uuid NOT NULL,
  raciones    numeric NOT NULL,
  orden       integer,
  notas       text
);
ALTER TABLE public.menu_entradas ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.listas_compra (
  id             uuid NOT NULL,
  menu_id        uuid NOT NULL,
  paciente_id    uuid NOT NULL,
  generado_at    date NOT NULL,
  semana_completa boolean,
  dias_filtro    ARRAY
);
ALTER TABLE public.listas_compra ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.lista_compra_items (
  id                 uuid NOT NULL,
  lista_id           uuid NOT NULL,
  food_item_id       uuid,
  nombre_ingrediente text NOT NULL,
  cantidad_total_g   numeric NOT NULL,
  etiqueta_unidad    text,
  categoria          text,
  marcado            boolean
);
ALTER TABLE public.lista_compra_items ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.registro_habitos (
  id          uuid NOT NULL,
  paciente_id uuid,
  fecha       date NOT NULL,
  agua        integer,
  fruta       integer,
  sueno       integer,
  created_at  timestamp with time zone
);
ALTER TABLE public.registro_habitos ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.citas (
  id               uuid NOT NULL,
  paciente_id      uuid NOT NULL,
  nutricionista_id uuid NOT NULL,
  fecha_hora       timestamp with time zone NOT NULL,
  duracion_min     integer NOT NULL,
  tipo             USER-DEFINED NOT NULL,
  estado           USER-DEFINED NOT NULL,
  notas            text,
  motivo_solicitud text,
  url_videollamada text,
  cancelado_por    uuid,
  google_event_id  text,
  facturada        boolean
);
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.chats (
  id               uuid NOT NULL,
  paciente_id      uuid NOT NULL,
  nutricionista_id uuid NOT NULL,
  created_at       timestamp with time zone
);
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.mensajes (
  id         uuid NOT NULL,
  chat_id    uuid NOT NULL,
  sender_id  uuid NOT NULL,
  contenido  text NOT NULL,
  enviado_at timestamp with time zone,
  leido      boolean
);
ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.documentos (
  id          uuid NOT NULL,
  paciente_id uuid NOT NULL,
  tipo        text NOT NULL,
  nombre      text NOT NULL,
  archivo_url text NOT NULL,
  importe     numeric,
  pagado      boolean,
  cita_id     uuid,
  created_at  timestamp with time zone NOT NULL
);
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.facturas (
  id               uuid NOT NULL,
  nutricionista_id uuid NOT NULL,
  paciente_id      uuid NOT NULL,
  numero_factura   text NOT NULL,
  fecha            date NOT NULL,
  importe          numeric NOT NULL,
  concepto         text NOT NULL,
  estado           USER-DEFINED NOT NULL
);
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.recursos (
  id               uuid NOT NULL,
  nutricionista_id uuid NOT NULL,
  titulo           text NOT NULL,
  tipo             USER-DEFINED NOT NULL,
  url              text NOT NULL,
  created_at       timestamp with time zone
);
ALTER TABLE public.recursos ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.recursos_paciente (
  recurso_id  uuid NOT NULL,
  paciente_id uuid NOT NULL,
  asignado_at timestamp with time zone
);
ALTER TABLE public.recursos_paciente ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.centros_consulta (
  id               uuid NOT NULL,
  nutricionista_id uuid NOT NULL,
  nombre           text NOT NULL,
  direccion        text NOT NULL,
  created_at       timestamp with time zone
);
ALTER TABLE public.centros_consulta ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.datos_facturacion (
  id               uuid NOT NULL,
  nutricionista_id uuid NOT NULL,
  direccion_fiscal text NOT NULL,
  dni              text NOT NULL,
  created_at       timestamp with time zone
);
ALTER TABLE public.datos_facturacion ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.nutricionista_google_tokens (
  nutricionista_id uuid NOT NULL,
  access_token     text NOT NULL,
  refresh_token    text,
  expires_at       timestamp with time zone,
  created_at       timestamp with time zone
);
ALTER TABLE public.nutricionista_google_tokens ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- POLÍTICAS DE SEGURIDAD (Row Level Security)
-- ============================================================

-- usuarios
CREATE POLICY "Ver mi propio usuario"
  ON public.usuarios FOR SELECT TO public
  USING (auth_user_id = auth.uid());

CREATE POLICY "Editar mi propio usuario"
  ON public.usuarios FOR UPDATE TO public
  USING (auth_user_id = auth.uid());

CREATE POLICY "insert mi perfil"
  ON public.usuarios FOR INSERT TO public
  USING (true);

CREATE POLICY "nutricionista puede actualizar usuarios de sus pacientes"
  ON public.usuarios FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT p.usuario_id
      FROM pacientes p
      JOIN nutricionistas n ON p.nutricionista_id = n.id
      JOIN usuarios u ON n.usuario_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
    OR auth_user_id = auth.uid()
  );

CREATE POLICY "nutricionista o admin puede eliminar usuarios de sus pacientes"
  ON public.usuarios FOR DELETE TO authenticated
  USING (
    id IN (
      SELECT p.usuario_id
      FROM pacientes p
      JOIN nutricionistas n ON p.nutricionista_id = n.id
      JOIN usuarios u ON n.usuario_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.auth_user_id = auth.uid() AND u.rol = 'admin'::rol_usuario
    )
  );

CREATE POLICY "nutricionistas ven usuarios"
  ON public.usuarios FOR SELECT TO public
  USING (get_mi_rol() = 'nutricionista'::rol_usuario);

CREATE POLICY "admin ve todos los usuarios"
  ON public.usuarios FOR SELECT TO public
  USING (get_mi_rol() = 'admin'::rol_usuario);

-- nutricionistas
CREATE POLICY "nutricionista ve su perfil"
  ON public.nutricionistas FOR SELECT TO public
  USING (
    usuario_id = get_mi_usuario_id()
    OR id IN (
      SELECT pacientes.nutricionista_id FROM pacientes
      WHERE pacientes.usuario_id = get_mi_usuario_id()
    )
  );

CREATE POLICY "Los nutricionistas pueden ver su propio perfil"
  ON public.nutricionistas FOR SELECT TO authenticated
  USING (
    usuario_id IN (
      SELECT usuarios.id FROM usuarios WHERE usuarios.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Los nutricionistas pueden editar su propio perfil"
  ON public.nutricionistas FOR UPDATE TO authenticated
  USING (
    usuario_id IN (
      SELECT usuarios.id FROM usuarios WHERE usuarios.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Allow signup insert nutricionista"
  ON public.nutricionistas FOR INSERT TO public
  USING (true);

CREATE POLICY "admin gestiona nutricionistas"
  ON public.nutricionistas FOR ALL TO public
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.auth_user_id = auth.uid() AND usuarios.rol = 'admin'::rol_usuario
    )
  );

-- pacientes
CREATE POLICY "Nutricionista ve sus pacientes"
  ON public.pacientes FOR SELECT TO public
  USING (nutricionista_id = get_mi_nutricionista_id());

CREATE POLICY "Paciente ve su propia ficha"
  ON public.pacientes FOR SELECT TO public
  USING (usuario_id = get_mi_usuario_id());

CREATE POLICY "nutricionista crea pacientes"
  ON public.pacientes FOR INSERT TO public
  USING (true);

CREATE POLICY "nutricionista puede actualizar sus pacientes"
  ON public.pacientes FOR UPDATE TO authenticated
  USING (
    nutricionista_id IN (
      SELECT n.id FROM nutricionistas n
      JOIN usuarios u ON n.usuario_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "nutricionista o admin puede eliminar pacientes"
  ON public.pacientes FOR DELETE TO authenticated
  USING (
    nutricionista_id IN (
      SELECT n.id FROM nutricionistas n
      JOIN usuarios u ON n.usuario_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.auth_user_id = auth.uid() AND u.rol = 'admin'::rol_usuario
    )
  );

-- antecedentes_familiares
CREATE POLICY "nutricionista accede a antecedentes_familiares de sus pacientes"
  ON public.antecedentes_familiares FOR ALL TO authenticated
  USING (
    paciente_id IN (
      SELECT p.id FROM pacientes p
      JOIN nutricionistas n ON p.nutricionista_id = n.id
      JOIN usuarios u ON n.usuario_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- antecedentes_personales
CREATE POLICY "nutricionista accede a antecedentes_personales de sus pacientes"
  ON public.antecedentes_personales FOR ALL TO authenticated
  USING (
    paciente_id IN (
      SELECT p.id FROM pacientes p
      JOIN nutricionistas n ON p.nutricionista_id = n.id
      JOIN usuarios u ON n.usuario_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- encuesta_alimentaria
CREATE POLICY "nutricionista accede a encuesta_alimentaria de sus pacientes"
  ON public.encuesta_alimentaria FOR ALL TO authenticated
  USING (
    paciente_id IN (
      SELECT p.id FROM pacientes p
      JOIN nutricionistas n ON p.nutricionista_id = n.id
      JOIN usuarios u ON n.usuario_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- mediciones
CREATE POLICY "nutricionista accede a mediciones de sus pacientes"
  ON public.mediciones FOR ALL TO authenticated
  USING (
    paciente_id IN (
      SELECT p.id FROM pacientes p
      JOIN nutricionistas n ON p.nutricionista_id = n.id
      JOIN usuarios u ON n.usuario_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- planes_nutricionales
CREATE POLICY "Paciente ve sus propios planes"
  ON public.planes_nutricionales FOR SELECT TO public
  USING (paciente_id = get_mi_paciente_id());

CREATE POLICY "Nutricionista gestiona planes de sus pacientes"
  ON public.planes_nutricionales FOR ALL TO public
  USING (
    paciente_id IN (
      SELECT pacientes.id FROM pacientes
      WHERE pacientes.nutricionista_id = get_mi_nutricionista_id()
    )
  );

-- recetas
CREATE POLICY "ver_recetas"
  ON public.recetas FOR SELECT TO public
  USING (
    visibilidad = 'publica'::visibilidad_receta
    OR creado_por = auth.uid()
  );

CREATE POLICY "gestionar_propias_recetas"
  ON public.recetas FOR ALL TO public
  USING (creado_por = auth.uid());

-- receta_ingredientes
CREATE POLICY "ver_ingredientes"
  ON public.receta_ingredientes FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM recetas r
      WHERE r.id = receta_ingredientes.receta_id
        AND (r.visibilidad = 'publica'::visibilidad_receta OR r.creado_por = auth.uid())
    )
  );

CREATE POLICY "gestionar_ingredientes"
  ON public.receta_ingredientes FOR ALL TO public
  USING (
    EXISTS (
      SELECT 1 FROM recetas r
      WHERE r.id = receta_ingredientes.receta_id AND r.creado_por = auth.uid()
    )
  );

-- recetas_ocultas
CREATE POLICY "Permitir SELECT recetas_ocultas"
  ON public.recetas_ocultas FOR SELECT TO public
  USING (true);

CREATE POLICY "Permitir INSERT recetas_ocultas"
  ON public.recetas_ocultas FOR INSERT TO public
  USING (true);

CREATE POLICY "Permitir DELETE recetas_ocultas"
  ON public.recetas_ocultas FOR DELETE TO public
  USING (true);

-- menus_semanales
CREATE POLICY "Nutricionista gestiona menus"
  ON public.menus_semanales FOR ALL TO public
  USING (nutricionista_id = get_mi_nutricionista_id());

CREATE POLICY "Pacientes pueden ver menus"
  ON public.menus_semanales FOR SELECT TO public
  USING (auth.role() = 'authenticated'::text);

-- menu_entradas
CREATE POLICY "Nutricionista gestiona entradas del menu"
  ON public.menu_entradas FOR ALL TO public
  USING (
    menu_id IN (
      SELECT menus_semanales.id FROM menus_semanales
      WHERE menus_semanales.nutricionista_id = get_mi_nutricionista_id()
    )
  );

CREATE POLICY "Pacientes pueden ver entradas"
  ON public.menu_entradas FOR SELECT TO public
  USING (auth.role() = 'authenticated'::text);

-- registro_habitos
CREATE POLICY "Permitir leer habitos"
  ON public.registro_habitos FOR SELECT TO public
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Permitir insertar habitos"
  ON public.registro_habitos FOR INSERT TO public
  USING (true);

CREATE POLICY "Permitir actualizar habitos"
  ON public.registro_habitos FOR UPDATE TO public
  USING (auth.role() = 'authenticated'::text);

-- citas
CREATE POLICY "nutricionista_gestiona_citas"
  ON public.citas FOR ALL TO authenticated
  USING (
    nutricionista_id IN (
      SELECT n.id FROM nutricionistas n
      JOIN usuarios u ON u.id = n.usuario_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Pacientes pueden ver las citas de su nutricionista"
  ON public.citas FOR SELECT TO public
  USING (
    nutricionista_id IN (
      SELECT p.nutricionista_id FROM pacientes p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Pacientes pueden agendar citas"
  ON public.citas FOR INSERT TO public
  USING (true);

-- documentos
CREATE POLICY "Permitir lectura de documentos a usuarios logueados"
  ON public.documentos FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Permitir crear documentos a usuarios logueados"
  ON public.documentos FOR INSERT TO authenticated
  USING (true);

CREATE POLICY "Permitir borrar documentos a usuarios logueados"
  ON public.documentos FOR DELETE TO authenticated
  USING (true);

CREATE POLICY "Permitir actualizar documentos"
  ON public.documentos FOR UPDATE TO public
  USING (auth.uid() IS NOT NULL);