-- =====================================================================
-- Tablas del módulo de Bolsa de Trabajo — CU-01 a CU-04
-- =====================================================================
-- Script acumulado: junta TODAS las tablas creadas o necesarias hasta
-- CU-04 en un solo lugar. Se ejecuta contra la base compartida indicada
-- por DB_NAME en Backend/.env (LUCCA); todo queda bajo el prefijo
-- RRHH_Reclutamiento_ para no chocar con nada existente (nómina,
-- contabilidad, etc.).
--
-- CAMBIOS RESPECTO A LA ENTREGA ANTERIOR:
--   - RRHH_Reclutamiento_PerfilesAspirante y RRHH_Reclutamiento_Postulaciones:
--     NUEVO — se agregan Rfc (NVARCHAR(13)) y Curp (NVARCHAR(18)), el código
--     alfanumérico capturado como texto en "Completa tu perfil" y en el
--     formulario de postulación. Ambos opcionales (default ''). En
--     Postulaciones esto es distinto de RfcFileName/RfcBytes, que ya
--     existían y guardan el PDF escaneado del RFC, no el código. Si tu
--     base de datos ya tiene estas tablas creadas, usa el script aparte
--     AgregarRfcCurpAPerfilYPostulaciones.sql.
--   - RRHH_Reclutamiento_Usuarios: NUEVO — se agrega EsCuentaDesarrollo
--     (BIT, default 0) para la opción "crear cuenta de desarrollo" del
--     registro (el código de verificación de esas cuentas siempre se
--     regresa en pantalla, nunca se manda por Brevo/Vonage). Si tu base de
--     datos ya tiene esta tabla creada, usa el script aparte
--     AgregarCuentaDesarrolloAUsuarios.sql.
--   - *** RRHH_Reclutamiento_Postulaciones VUELVE A CAMBIAR OTRA VEZ ***:
--     se agrega AreaId (NULL, con llave foránea hacia el catálogo nuevo
--     RRHH_Reclutamiento_Areas), que sustituye a AreasInteres (texto
--     libre) como la fuente de verdad del área de interés. AreasInteres
--     NO se elimina: se queda como columna histórica, y el backend la
--     sigue llenando automáticamente con el nombre del área elegida.
--     Ver "Plan de Flujo - Filtrado de Postulantes por Area en
--     SIATEC.md" para el porqué (SIATEC va a filtrar candidatos por esta
--     misma área del lado de Puestos, usando la misma tabla catálogo).
--   - NUEVO: RRHH_Reclutamiento_Areas — catálogo compartido de áreas de
--     interés. Se crea antes que Postulaciones porque esta última ahora
--     tiene una llave foránea hacia ella.
--   - Se agregó también UsuarioId (NULL, con llave foránea hacia
--     Usuarios) en una entrega previa, para relacionar una postulación
--     con la cuenta que la envió cuando quien postula tiene sesión
--     iniciada (sigue permitiendo NULL para quien postula sin cuenta).
--     Si tu base de datos ya tiene esta tabla creada, este script NO la
--     modifica (por el IF OBJECT_ID IS NULL de abajo) — para aplicar los
--     cambios a una tabla ya existente usa los scripts aparte
--     AlterPostulacionesDocumentosYHabilidades.sql y
--     CreateAreasCatalogoYMigrarPostulaciones.sql.
--   - RRHH_Reclutamiento_Usuarios, CodigosVerificacion, IntentosAcceso:
--     SIN CAMBIOS tampoco (idéntico a la entrega de CU-02).
--   - NUEVO (CU-03): RRHH_Reclutamiento_PerfilesAspirante,
--     ..._ExperienciaLaboral, ..._FormacionAcademica, ..._Habilidades,
--     ..._HistorialPerfil.
--   - NUEVO (CU-04): RRHH_Reclutamiento_DocumentosAspirante.
--   - *** RRHH_Reclutamiento_FormacionAcademica VUELVE A CAMBIAR ***: se
--     agrega ProfesionId (NULL, con llave foránea hacia el catálogo nuevo
--     RRHH_Reclutamiento_Profesiones). El emparejamiento con vacantes deja
--     de basarse en Área y pasa a basarse en profesión/tipo de formación
--     académica — un aspirante puede tener varias formaciones y TODAS
--     cuentan, no solo la de mayor jerarquía. Los niveles sin carrera
--     concreta (Secundaria, Preparatoria, Diplomado) también participan,
--     mediante 3 renglones "genéricos" del catálogo cuyo Nombre es igual a
--     su Nivel — así ProfesionId es siempre obligatorio, sin casos
--     especiales. Si tu base de datos ya tiene esta tabla creada, usa el
--     script aparte CrearProfesionesYCertificaciones.sql.
--   - *** RRHH_Reclutamiento_Postulaciones VUELVE A CAMBIAR, OTRA VEZ MÁS
--     ***: se agrega ProfesionId (NULL, con llave foránea hacia el mismo
--     catálogo de Profesiones), para que el formulario público de
--     postulación (Postulacion.jsx) también capture la profesión/carrera
--     concreta correspondiente a "Máxima formación académica" — igual que
--     ya se le pide al aspirante con sesión iniciada en su perfil (CU-03).
--     Si tu base de datos ya tiene esta tabla creada, usa el script aparte
--     AgregarProfesionAPostulaciones.sql.
--   - NUEVO: RRHH_Reclutamiento_Profesiones — catálogo de profesiones/
--     carreras, agrupado por Nivel de estudios (ver "Catalogo de
--     Profesiones - Bolsa de Trabajo y SIATEC.md"). Se crea antes que
--     FormacionAcademica porque esta última ahora tiene una llave foránea
--     hacia ella.
--   - NUEVO: RRHH_Reclutamiento_Certificaciones — nueva sección del perfil
--     del aspirante (mismo patrón que ExperienciaLaboral/
--     FormacionAcademica/Habilidades). Ver "Plan de Implementación -
--     Profesiones y Certificaciones del Aspirante.md".
--
-- Nota sobre las llaves foráneas hacia Usuarios en las tablas nuevas de
-- CU-03/CU-04 (PerfilesAspirante.UsuarioId y DocumentosAspirante.UsuarioId):
-- el modelo de C# (Entity Framework) las trata como una simple columna
-- entera, sin declarar la relación con .HasOne()/.WithOne() — la relación
-- solo se respeta por lógica de aplicación. Aquí SÍ se agrega la
-- restricción FOREIGN KEY real a nivel de base de datos, como ya se hace
-- con CodigosVerificacion e IntentosAcceso, porque da integridad
-- referencial real sin costarte nada (EF no necesita saber que existe
-- para seguir funcionando igual). Es una mejora deliberada sobre lo que
-- el código C# declara explícitamente, no un descuido.
-- =====================================================================

USE [LUCCA];
GO

-- ---------------------------------------------------------------------
-- 0. RRHH_Reclutamiento_Areas — NUEVO: catálogo compartido de áreas de
--    interés. Se crea antes que Postulaciones porque esta última tiene
--    una llave foránea hacia ella. Es la misma tabla que SIATEC usará
--    del lado de Puestos (agregando su propio AreaId con FK hacia aquí)
--    para poder filtrar candidatos por área — ver "Plan de Flujo -
--    Filtrado de Postulantes por Area en SIATEC.md".
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.RRHH_Reclutamiento_Areas', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RRHH_Reclutamiento_Areas
    (
        Id      INT             IDENTITY(1,1) NOT NULL,
        Nombre  NVARCHAR(100)   NOT NULL,
        Activa  BIT             NOT NULL DEFAULT (1),

        CONSTRAINT PK_RRHH_Reclutamiento_Areas PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT UQ_RRHH_Reclutamiento_Areas_Nombre UNIQUE (Nombre)
    );
END
GO

-- Semillas: lista definitiva confirmada (incluye Salud). Solo inserta lo
-- que todavía no exista, para poder correr esto varias veces sin
-- duplicar ni pisar ediciones manuales (p. ej. si alguien desactivó un
-- área con Activa = 0).
INSERT INTO dbo.RRHH_Reclutamiento_Areas (Nombre)
SELECT v.Nombre
FROM (VALUES
    (N'Administración'),
    (N'Atención Ciudadana'),
    (N'Comunicación'),
    (N'Contabilidad'),
    (N'Derecho'),
    (N'Educación'),
    (N'Finanzas'),
    (N'Ingeniería y Mantenimiento'),
    (N'Logística y Almacén'),
    (N'Operaciones'),
    (N'Recursos Humanos'),
    (N'Salud'),
    (N'Seguridad y Protección Civil'),
    (N'Tecnologías de la Información')
) AS v(Nombre)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.RRHH_Reclutamiento_Areas a WHERE a.Nombre = v.Nombre
);
GO

-- ---------------------------------------------------------------------
-- 1. RRHH_Reclutamiento_Postulaciones — CAMBIÓ: se agregaron INE, RFC,
--    acta de nacimiento (obligatorios), habilidades clave (opcional),
--    UsuarioId (opcional, con llave foránea hacia Usuarios) para saber
--    qué cuenta mandó la postulación cuando había sesión iniciada, y
--    ahora también AreaId (opcional, con llave foránea hacia el
--    catálogo Areas de arriba) — ver el bloque de cambios al inicio del
--    archivo. Esta definición ya los incluye para una base de datos
--    nueva; para una tabla que ya existe, usa
--    AlterPostulacionesDocumentosYHabilidades.sql y
--    CreateAreasCatalogoYMigrarPostulaciones.sql.
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.RRHH_Reclutamiento_Postulaciones', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RRHH_Reclutamiento_Postulaciones
    (
        Id                                  INT             IDENTITY(1,1) NOT NULL,
        Nombre                              NVARCHAR(100)   NOT NULL,
        ApellidoPaterno                     NVARCHAR(100)   NOT NULL,
        ApellidoMaterno                     NVARCHAR(100)   NOT NULL,
        Correo                              NVARCHAR(255)   NOT NULL,
        Estado                              NVARCHAR(100)   NOT NULL,
        Municipio                           NVARCHAR(100)   NOT NULL,
        Telefono                            NVARCHAR(20)    NOT NULL,
        Rfc                                 NVARCHAR(13)    NOT NULL DEFAULT (''),
        Curp                                NVARCHAR(18)    NOT NULL DEFAULT (''),
        MaximaFormacionAcademica            NVARCHAR(100)   NOT NULL,
        ProfesionId                         INT             NULL,
        AreasInteres                        NVARCHAR(100)   NOT NULL,
        ExpectativasSalariales              NVARCHAR(50)    NOT NULL,
        CvFileName                          NVARCHAR(255)   NOT NULL,
        CvBytes                             VARBINARY(MAX)  NOT NULL,
        UltimoComprobanteEstudiosFileName   NVARCHAR(255)   NOT NULL,
        UltimoComprobanteEstudiosBytes      VARBINARY(MAX)  NOT NULL,
        CartaPresentacionFileName           NVARCHAR(255)   NULL,
        CartaPresentacionBytes              VARBINARY(MAX)  NULL,
        IneFileName                         NVARCHAR(255)   NOT NULL,
        IneBytes                            VARBINARY(MAX)  NOT NULL,
        RfcFileName                         NVARCHAR(255)   NOT NULL,
        RfcBytes                            VARBINARY(MAX)  NOT NULL,
        ActaNacimientoFileName              NVARCHAR(255)   NOT NULL,
        ActaNacimientoBytes                 VARBINARY(MAX)  NOT NULL,
        HabilidadesClave                    NVARCHAR(1000)  NULL,
        UsuarioId                           INT             NULL,
        AreaId                              INT             NULL,
        FechaRegistro                       DATETIME2       NOT NULL DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT PK_Postulaciones PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT CK_Postulaciones_Municipio CHECK (Municipio NOT LIKE '%[^A-Za-zÁÉÍÓÚáéíóúÑñÜü ]%'),
        CONSTRAINT FK_Postulaciones_Areas FOREIGN KEY (AreaId)
            REFERENCES dbo.RRHH_Reclutamiento_Areas (Id)
    );

    CREATE INDEX IX_Postulaciones_FechaRegistro ON dbo.RRHH_Reclutamiento_Postulaciones (FechaRegistro DESC);
    CREATE INDEX IX_Postulaciones_MaximaFormacionAcademica ON dbo.RRHH_Reclutamiento_Postulaciones (MaximaFormacionAcademica);
    CREATE INDEX IX_Postulaciones_AreasInteres ON dbo.RRHH_Reclutamiento_Postulaciones (AreasInteres);
    CREATE INDEX IX_Postulaciones_Municipio ON dbo.RRHH_Reclutamiento_Postulaciones (Municipio);
    CREATE INDEX IX_Postulaciones_UsuarioId ON dbo.RRHH_Reclutamiento_Postulaciones (UsuarioId);
    CREATE INDEX IX_Postulaciones_AreaId ON dbo.RRHH_Reclutamiento_Postulaciones (AreaId);
    CREATE INDEX IX_Postulaciones_ProfesionId ON dbo.RRHH_Reclutamiento_Postulaciones (ProfesionId);
END
GO
-- Nota: las llaves foráneas de Postulaciones hacia Usuarios y hacia
-- Profesiones se agregan más abajo, después de los bloques 2
-- (RRHH_Reclutamiento_Usuarios) y 7 (RRHH_Reclutamiento_Profesiones)
-- respectivamente — en una base de datos nueva, ninguna de esas dos tablas
-- existiría todavía en este punto del script.

-- ---------------------------------------------------------------------
-- 2. RRHH_Reclutamiento_Usuarios — SIN CAMBIOS desde la entrega anterior
--    TipoContacto: 0 = Correo, 1 = Telefono
--    Estado:       0 = PendienteVerificacion, 1 = Activa, 2 = Bloqueada
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.RRHH_Reclutamiento_Usuarios', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RRHH_Reclutamiento_Usuarios
    (
        Id                      INT             IDENTITY(1,1) NOT NULL,
        Nombre                  NVARCHAR(100)   NOT NULL,
        CorreoOTelefono         NVARCHAR(255)   NOT NULL,
        TipoContacto            TINYINT         NOT NULL,
        PasswordHash            NVARCHAR(200)   NOT NULL,
        PaisResidencia          NVARCHAR(100)   NOT NULL,
        Rol                     NVARCHAR(30)    NOT NULL DEFAULT ('Aspirante'),
        Estado                  TINYINT         NOT NULL DEFAULT (0),
        AceptoTerminosEn        DATETIME2       NOT NULL,
        FechaCreacion           DATETIME2       NOT NULL DEFAULT (SYSUTCDATETIME()),
        FechaVerificacion       DATETIME2       NULL,

        -- CU-02: bloqueo temporal de login, independiente del bloqueo
        -- de cuenta por intentos fallidos de código (ese usa el Estado de arriba).
        IntentosFallidosLogin   INT             NOT NULL DEFAULT (0),
        BloqueadoHasta          DATETIME2       NULL,

        -- NUEVO: cuenta creada desde la opción "solo para desarrollo" del
        -- registro. Cuando es 1, el código de verificación de esa cuenta
        -- siempre se manda por el canal de consola (nunca por Brevo/Vonage)
        -- y siempre se regresa en la respuesta del endpoint. Solo se puede
        -- activar mientras el backend corre en Development — ver
        -- CuentasController.Registro.
        EsCuentaDesarrollo      BIT             NOT NULL DEFAULT (0),

        CONSTRAINT PK_Usuarios PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT CK_Usuarios_TipoContacto CHECK (TipoContacto IN (0, 1)),
        CONSTRAINT CK_Usuarios_Estado CHECK (Estado IN (0, 1, 2))
    );

    -- Unicidad del correo/teléfono de acceso (ya la aplicaba EF con
    -- HasIndex().IsUnique(); aquí queda igual a nivel de base de datos).
    CREATE UNIQUE INDEX UX_Usuarios_CorreoOTelefono ON dbo.RRHH_Reclutamiento_Usuarios (CorreoOTelefono);
END
GO

-- Llave foránea de Postulaciones.UsuarioId hacia Usuarios: se agrega hasta
-- aquí (y no dentro del bloque 1) porque Usuarios recién queda creada en
-- este punto del script en una base de datos nueva.
IF OBJECT_ID('FK_Postulaciones_Usuarios', 'F') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones ADD CONSTRAINT
        FK_Postulaciones_Usuarios FOREIGN KEY (UsuarioId)
            REFERENCES dbo.RRHH_Reclutamiento_Usuarios (Id)
            ON DELETE SET NULL;
END
GO

-- ---------------------------------------------------------------------
-- 3. RRHH_Reclutamiento_CodigosVerificacion — SIN CAMBIOS
--    Proposito: 0 = VerificacionCuenta, 1 = RecuperacionContrasena
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.RRHH_Reclutamiento_CodigosVerificacion', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RRHH_Reclutamiento_CodigosVerificacion
    (
        Id                  INT             IDENTITY(1,1) NOT NULL,
        UsuarioId           INT             NOT NULL,
        Codigo              NVARCHAR(6)     NOT NULL,
        Proposito           TINYINT         NOT NULL DEFAULT (0),
        FechaCreacion       DATETIME2       NOT NULL DEFAULT (SYSUTCDATETIME()),
        FechaExpiracion     DATETIME2       NOT NULL,
        IntentosFallidos    INT             NOT NULL DEFAULT (0),
        Usado               BIT             NOT NULL DEFAULT (0),

        CONSTRAINT PK_CodigosVerificacion PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT CK_CodigosVerificacion_Proposito CHECK (Proposito IN (0, 1)),
        CONSTRAINT FK_CodigosVerificacion_Usuarios FOREIGN KEY (UsuarioId)
            REFERENCES dbo.RRHH_Reclutamiento_Usuarios (Id)
            ON DELETE CASCADE
    );

    -- Soporta la consulta "código vigente de este usuario para este propósito,
    -- el más reciente primero" que usa el backend en verificar/reenviar/restablecer.
    CREATE INDEX IX_CodigosVerificacion_UsuarioId_Proposito ON dbo.RRHH_Reclutamiento_CodigosVerificacion (UsuarioId, Proposito);
END
GO

-- ---------------------------------------------------------------------
-- 4. RRHH_Reclutamiento_IntentosAcceso — SIN CAMBIOS
--    Resultado: 0 = Exitoso, 1 = CredencialesInvalidas,
--               2 = CuentaNoVerificada, 3 = CuentaBloqueada
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.RRHH_Reclutamiento_IntentosAcceso', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RRHH_Reclutamiento_IntentosAcceso
    (
        Id                          INT             IDENTITY(1,1) NOT NULL,
        CorreoOTelefonoIngresado    NVARCHAR(255)   NOT NULL,
        UsuarioId                   INT             NULL,
        Resultado                   TINYINT         NOT NULL,
        FechaHora                   DATETIME2       NOT NULL DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT PK_IntentosAcceso PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT CK_IntentosAcceso_Resultado CHECK (Resultado IN (0, 1, 2, 3)),
        CONSTRAINT FK_IntentosAcceso_Usuarios FOREIGN KEY (UsuarioId)
            REFERENCES dbo.RRHH_Reclutamiento_Usuarios (Id)
            ON DELETE SET NULL
    );

    CREATE INDEX IX_IntentosAcceso_FechaHora ON dbo.RRHH_Reclutamiento_IntentosAcceso (FechaHora DESC);
    CREATE INDEX IX_IntentosAcceso_UsuarioId ON dbo.RRHH_Reclutamiento_IntentosAcceso (UsuarioId);
END
GO

-- ---------------------------------------------------------------------
-- 5. RRHH_Reclutamiento_PerfilesAspirante — NUEVO (CU-03)
--    Relación 1 a 1 con Usuarios (índice único en UsuarioId).
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.RRHH_Reclutamiento_PerfilesAspirante', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RRHH_Reclutamiento_PerfilesAspirante
    (
        Id                      INT             IDENTITY(1,1) NOT NULL,
        UsuarioId               INT             NOT NULL,
        Nombre                  NVARCHAR(100)   NOT NULL,
        ApellidoPaterno         NVARCHAR(100)   NOT NULL,
        ApellidoMaterno         NVARCHAR(100)   NULL,
        FechaNacimiento         DATE            NOT NULL,
        Telefono                NVARCHAR(12)    NOT NULL,
        Correo                  NVARCHAR(255)   NOT NULL,
        Estado                  NVARCHAR(100)   NOT NULL,
        Municipio               NVARCHAR(100)   NOT NULL,
        Rfc                     NVARCHAR(13)    NOT NULL DEFAULT (''),
        Curp                    NVARCHAR(18)    NOT NULL DEFAULT (''),
        FechaCreacion           DATETIME2       NOT NULL DEFAULT (SYSUTCDATETIME()),
        FechaActualizacion      DATETIME2       NOT NULL DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT PK_PerfilesAspirante PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT FK_PerfilesAspirante_Usuarios FOREIGN KEY (UsuarioId)
            REFERENCES dbo.RRHH_Reclutamiento_Usuarios (Id)
            ON DELETE CASCADE
    );

    -- 1 a 1 con Usuarios.
    CREATE UNIQUE INDEX UX_PerfilesAspirante_UsuarioId ON dbo.RRHH_Reclutamiento_PerfilesAspirante (UsuarioId);

    -- CU-03, flujo alterno A6: el correo/teléfono de contacto del perfil no
    -- puede repetirse entre aspirantes distintos. El backend ya lo valida
    -- antes de guardar; estos índices únicos son el respaldo a nivel de
    -- base de datos de esa misma regla.
    CREATE UNIQUE INDEX UX_PerfilesAspirante_Correo ON dbo.RRHH_Reclutamiento_PerfilesAspirante (Correo);
    CREATE UNIQUE INDEX UX_PerfilesAspirante_Telefono ON dbo.RRHH_Reclutamiento_PerfilesAspirante (Telefono);
END
GO

-- ---------------------------------------------------------------------
-- 6. RRHH_Reclutamiento_ExperienciaLaboral — NUEVO (CU-03)
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.RRHH_Reclutamiento_ExperienciaLaboral', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RRHH_Reclutamiento_ExperienciaLaboral
    (
        Id                  INT             IDENTITY(1,1) NOT NULL,
        PerfilAspiranteId   INT             NOT NULL,
        Empresa             NVARCHAR(150)   NOT NULL,
        Puesto              NVARCHAR(150)   NOT NULL,
        FechaInicio         DATE            NOT NULL,
        FechaFin            DATE            NULL, -- NULL = empleo actual
        Descripcion         NVARCHAR(500)   NULL,

        CONSTRAINT PK_ExperienciaLaboral PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT FK_ExperienciaLaboral_PerfilesAspirante FOREIGN KEY (PerfilAspiranteId)
            REFERENCES dbo.RRHH_Reclutamiento_PerfilesAspirante (Id)
            ON DELETE CASCADE
    );

    CREATE INDEX IX_ExperienciaLaboral_PerfilAspiranteId ON dbo.RRHH_Reclutamiento_ExperienciaLaboral (PerfilAspiranteId);
END
GO

-- ---------------------------------------------------------------------
-- 7. RRHH_Reclutamiento_Profesiones — NUEVO: catálogo de profesiones/
--    carreras, agrupado por Nivel de estudios. Se crea antes que
--    FormacionAcademica porque esta última tiene una llave foránea hacia
--    ella. Es el criterio real de emparejamiento con vacantes,
--    independiente de Área — ver "Catalogo de Profesiones - Bolsa de
--    Trabajo y SIATEC.md". Incluye 3 renglones "genéricos" (Secundaria,
--    Preparatoria, Diplomado) cuyo Nombre es igual a su Nivel, para los
--    niveles de estudio que no tienen una carrera concreta — así toda
--    formación académica siempre tiene una Profesión asociada.
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.RRHH_Reclutamiento_Profesiones', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RRHH_Reclutamiento_Profesiones
    (
        Id      INT             IDENTITY(1,1) NOT NULL,
        Nombre  NVARCHAR(150)   NOT NULL,
        Nivel   NVARCHAR(50)    NOT NULL,
        Activa  BIT             NOT NULL DEFAULT (1),

        CONSTRAINT PK_RRHH_Reclutamiento_Profesiones PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT UQ_RRHH_Reclutamiento_Profesiones_Nombre UNIQUE (Nombre)
    );

    CREATE INDEX IX_Profesiones_Nivel ON dbo.RRHH_Reclutamiento_Profesiones (Nivel);
END
GO

-- Semillas: catálogo propuesto (74 profesiones concretas + 3 renglones
-- genéricos). El valor de Nivel debe coincidir EXACTAMENTE (mayúsculas/
-- acentos incluidos) con FORMACION_OPTIONS en
-- Frontend/src/constants/catalogos.js, porque PerfilController.GuardarPerfil
-- valida esa igualdad byte a byte. Solo inserta lo que todavía no exista,
-- para poder correr esto varias veces sin duplicar ni pisar ediciones
-- manuales (p. ej. si alguien desactivó una profesión con Activa = 0).
INSERT INTO dbo.RRHH_Reclutamiento_Profesiones (Nombre, Nivel)
SELECT v.Nombre, v.Nivel
FROM (VALUES
    -- Técnico / Técnico Superior Universitario (TSU)
    (N'Técnico en Contabilidad', N'Técnico'),
    (N'Técnico en Administración', N'Técnico'),
    (N'Técnico en Recursos Humanos', N'Técnico'),
    (N'Técnico en Informática', N'Técnico'),
    (N'Técnico en Redes y Telecomunicaciones', N'Técnico'),
    (N'Técnico en Enfermería', N'Técnico'),
    (N'Técnico en Urgencias Médicas / Paramédico', N'Técnico'),
    (N'Técnico Laboratorista Clínico', N'Técnico'),
    (N'Técnico en Mantenimiento Industrial', N'Técnico'),
    (N'Técnico Electricista', N'Técnico'),
    (N'Técnico Electromecánico', N'Técnico'),
    (N'Técnico en Refrigeración y Climatización', N'Técnico'),
    (N'Técnico en Seguridad e Higiene / Protección Civil', N'Técnico'),
    (N'Técnico en Trabajo Social', N'Técnico'),
    (N'Técnico en Archivonomía / Gestión Documental', N'Técnico'),
    (N'Técnico en Logística', N'Técnico'),
    (N'Técnico en Diseño Gráfico', N'Técnico'),
    (N'Técnico en Contabilidad y Fiscal', N'Técnico'),

    -- Ingeniería
    (N'Ingeniería en Sistemas Computacionales', N'Ingeniería'),
    (N'Ingeniería en Tecnologías de la Información', N'Ingeniería'),
    (N'Ingeniería en Telecomunicaciones', N'Ingeniería'),
    (N'Ingeniería Industrial', N'Ingeniería'),
    (N'Ingeniería Civil', N'Ingeniería'),
    (N'Ingeniería Eléctrica', N'Ingeniería'),
    (N'Ingeniería Electrónica', N'Ingeniería'),
    (N'Ingeniería Mecánica', N'Ingeniería'),
    (N'Ingeniería Mecatrónica', N'Ingeniería'),
    (N'Ingeniería Química', N'Ingeniería'),
    (N'Ingeniería Ambiental', N'Ingeniería'),
    (N'Ingeniería en Energías Renovables', N'Ingeniería'),
    (N'Ingeniería en Logística', N'Ingeniería'),
    (N'Ingeniería en Gestión Empresarial', N'Ingeniería'),
    (N'Ingeniería Agrónoma / Agronomía', N'Ingeniería'),

    -- Licenciatura
    (N'Licenciatura en Derecho', N'Licenciatura'),
    (N'Licenciatura en Contaduría Pública', N'Licenciatura'),
    (N'Licenciatura en Administración', N'Licenciatura'),
    (N'Licenciatura en Administración Pública', N'Licenciatura'),
    (N'Licenciatura en Ciencias Políticas y Administración Pública', N'Licenciatura'),
    (N'Licenciatura en Economía', N'Licenciatura'),
    (N'Licenciatura en Comunicación', N'Licenciatura'),
    (N'Licenciatura en Relaciones Internacionales', N'Licenciatura'),
    (N'Licenciatura en Psicología', N'Licenciatura'),
    (N'Licenciatura en Trabajo Social', N'Licenciatura'),
    (N'Licenciatura en Pedagogía / Ciencias de la Educación', N'Licenciatura'),
    (N'Licenciatura en Enfermería', N'Licenciatura'),
    (N'Medicina (Médico Cirujano)', N'Licenciatura'),
    (N'Licenciatura en Recursos Humanos', N'Licenciatura'),
    (N'Licenciatura en Mercadotecnia', N'Licenciatura'),
    (N'Licenciatura en Arquitectura', N'Licenciatura'),
    (N'Licenciatura en Informática / Sistemas Computacionales', N'Licenciatura'),
    (N'Licenciatura en Seguridad Pública', N'Licenciatura'),
    (N'Licenciatura en Bibliotecología / Archivonomía', N'Licenciatura'),
    (N'Licenciatura en Turismo', N'Licenciatura'),

    -- Maestría
    (N'Maestría en Administración Pública', N'Maestría'),
    (N'Maestría en Administración de Empresas', N'Maestría'),
    (N'Maestría en Derecho', N'Maestría'),
    (N'Maestría en Derechos Humanos', N'Maestría'),
    (N'Maestría en Políticas Públicas', N'Maestría'),
    (N'Maestría en Educación', N'Maestría'),
    (N'Maestría en Ingeniería Industrial', N'Maestría'),
    (N'Maestría en Ingeniería Civil', N'Maestría'),
    (N'Maestría en Tecnologías de la Información', N'Maestría'),
    (N'Maestría en Salud Pública', N'Maestría'),
    (N'Maestría en Finanzas', N'Maestría'),
    (N'Maestría en Seguridad Pública', N'Maestría'),
    (N'Maestría en Trabajo Social', N'Maestría'),
    (N'Maestría en Ciencias Políticas', N'Maestría'),

    -- Doctorado
    (N'Doctorado en Derecho', N'Doctorado'),
    (N'Doctorado en Administración Pública', N'Doctorado'),
    (N'Doctorado en Educación', N'Doctorado'),
    (N'Doctorado en Ciencias Sociales', N'Doctorado'),
    (N'Doctorado en Ciencias de la Salud', N'Doctorado'),
    (N'Doctorado en Ingeniería', N'Doctorado'),
    (N'Doctorado en Ciencias Políticas', N'Doctorado'),

    -- Genéricos: niveles sin carrera concreta. El Nombre es idéntico al
    -- Nivel a propósito, para que aparezcan como una opción más de
    -- "Profesión" cuando se elige ese nivel de estudios.
    (N'Secundaria', N'Secundaria'),
    (N'Preparatoria', N'Preparatoria'),
    (N'Diplomado', N'Diplomado')
) AS v(Nombre, Nivel)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.RRHH_Reclutamiento_Profesiones p WHERE p.Nombre = v.Nombre
);
GO

-- Llave foránea de Postulaciones.ProfesionId hacia Profesiones: se agrega
-- hasta aquí (y no dentro del bloque 1) porque Profesiones recién queda
-- creada en este punto del script en una base de datos nueva. Mismo
-- criterio que Postulaciones.UsuarioId hacia Usuarios, arriba.
IF OBJECT_ID('FK_Postulaciones_Profesiones', 'F') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones ADD CONSTRAINT
        FK_Postulaciones_Profesiones FOREIGN KEY (ProfesionId)
            REFERENCES dbo.RRHH_Reclutamiento_Profesiones (Id);
END
GO

-- ---------------------------------------------------------------------
-- 8. RRHH_Reclutamiento_FormacionAcademica — CAMBIÓ: se agregó
--    ProfesionId (opcional, con llave foránea hacia el catálogo de
--    Profesiones de arriba) — ver el bloque de cambios al inicio del
--    archivo. Esta definición ya lo incluye para una base de datos nueva;
--    para una tabla que ya existe, usa
--    CrearProfesionesYCertificaciones.sql.
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.RRHH_Reclutamiento_FormacionAcademica', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RRHH_Reclutamiento_FormacionAcademica
    (
        Id                  INT             IDENTITY(1,1) NOT NULL,
        PerfilAspiranteId   INT             NOT NULL,
        Institucion         NVARCHAR(150)   NOT NULL,
        NivelEstudios       NVARCHAR(50)    NOT NULL,
        ProfesionId         INT             NULL,
        FechaInicio         DATE            NOT NULL,
        FechaFin            DATE            NULL, -- NULL = en curso

        CONSTRAINT PK_FormacionAcademica PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT FK_FormacionAcademica_PerfilesAspirante FOREIGN KEY (PerfilAspiranteId)
            REFERENCES dbo.RRHH_Reclutamiento_PerfilesAspirante (Id)
            ON DELETE CASCADE,
        CONSTRAINT FK_FormacionAcademica_Profesiones FOREIGN KEY (ProfesionId)
            REFERENCES dbo.RRHH_Reclutamiento_Profesiones (Id)
    );

    CREATE INDEX IX_FormacionAcademica_PerfilAspiranteId ON dbo.RRHH_Reclutamiento_FormacionAcademica (PerfilAspiranteId);
    CREATE INDEX IX_FormacionAcademica_ProfesionId ON dbo.RRHH_Reclutamiento_FormacionAcademica (ProfesionId);
END
GO

-- ---------------------------------------------------------------------
-- 9. RRHH_Reclutamiento_Habilidades — NUEVO (CU-03)
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.RRHH_Reclutamiento_Habilidades', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RRHH_Reclutamiento_Habilidades
    (
        Id                  INT             IDENTITY(1,1) NOT NULL,
        PerfilAspiranteId   INT             NOT NULL,
        Nombre              NVARCHAR(100)   NOT NULL,

        CONSTRAINT PK_Habilidades PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT FK_Habilidades_PerfilesAspirante FOREIGN KEY (PerfilAspiranteId)
            REFERENCES dbo.RRHH_Reclutamiento_PerfilesAspirante (Id)
            ON DELETE CASCADE
    );

    CREATE INDEX IX_Habilidades_PerfilAspiranteId ON dbo.RRHH_Reclutamiento_Habilidades (PerfilAspiranteId);
END
GO

-- ---------------------------------------------------------------------
-- 10. RRHH_Reclutamiento_Certificaciones — NUEVO. Nueva sección del
--     perfil del aspirante (mismo patrón que ExperienciaLaboral/
--     FormacionAcademica/Habilidades: se reemplaza la lista completa en
--     cada guardado del asistente de perfil). Ver "Plan de Implementación
--     - Profesiones y Certificaciones del Aspirante.md".
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.RRHH_Reclutamiento_Certificaciones', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RRHH_Reclutamiento_Certificaciones
    (
        Id                  INT             IDENTITY(1,1) NOT NULL,
        PerfilAspiranteId   INT             NOT NULL,
        Nombre              NVARCHAR(150)   NOT NULL,
        Institucion         NVARCHAR(150)   NOT NULL,
        FechaObtencion      DATE            NOT NULL,
        FechaVencimiento    DATE            NULL, -- NULL = no vence

        CONSTRAINT PK_RRHH_Reclutamiento_Certificaciones PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT FK_Certificaciones_PerfilesAspirante FOREIGN KEY (PerfilAspiranteId)
            REFERENCES dbo.RRHH_Reclutamiento_PerfilesAspirante (Id)
            ON DELETE CASCADE
    );

    CREATE INDEX IX_Certificaciones_PerfilAspiranteId ON dbo.RRHH_Reclutamiento_Certificaciones (PerfilAspiranteId);
END
GO

-- ---------------------------------------------------------------------
-- 11. RRHH_Reclutamiento_HistorialPerfil — NUEVO (CU-03)
--     Un renglón por cada vez que se guarda el asistente de perfil
--     completo; resumen simple, no un diff campo por campo.
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.RRHH_Reclutamiento_HistorialPerfil', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RRHH_Reclutamiento_HistorialPerfil
    (
        Id                  INT             IDENTITY(1,1) NOT NULL,
        PerfilAspiranteId   INT             NOT NULL,
        FechaHora           DATETIME2       NOT NULL DEFAULT (SYSUTCDATETIME()),
        Resumen             NVARCHAR(300)   NOT NULL,

        CONSTRAINT PK_HistorialPerfil PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT FK_HistorialPerfil_PerfilesAspirante FOREIGN KEY (PerfilAspiranteId)
            REFERENCES dbo.RRHH_Reclutamiento_PerfilesAspirante (Id)
            ON DELETE CASCADE
    );

    CREATE INDEX IX_HistorialPerfil_PerfilAspiranteId ON dbo.RRHH_Reclutamiento_HistorialPerfil (PerfilAspiranteId);
END
GO

-- ---------------------------------------------------------------------
-- 12. RRHH_Reclutamiento_DocumentosAspirante — NUEVO (CU-04)
--     TipoDocumento: 1=Ine, 2=Rfc, 3=ActaNacimiento, 4=CartillaMilitar,
--                    5=RecomendacionLaboral, 6=RecomendacionPersonal,
--                    7=ComprobanteEstudios.
--     Los siete tipos son de "slot único": subir uno nuevo marca el
--     anterior como Vigente = 0 (se conserva como versión histórica) en
--     vez de sobrescribirlo o borrarlo.
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.RRHH_Reclutamiento_DocumentosAspirante', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RRHH_Reclutamiento_DocumentosAspirante
    (
        Id                      INT             IDENTITY(1,1) NOT NULL,
        UsuarioId               INT             NOT NULL,
        TipoDocumento           TINYINT         NOT NULL,
        NombreArchivoOriginal   NVARCHAR(255)   NOT NULL,
        ContentType             NVARCHAR(100)   NOT NULL,
        TamanioBytes            BIGINT          NOT NULL,
        ContenidoCifrado        VARBINARY(MAX)  NOT NULL, -- AES-256; el IV va antepuesto en los primeros 16 bytes
        HashSha256              CHAR(64)        NOT NULL, -- hash del contenido original, antes de cifrar
        FechaVigencia           DATE            NULL,     -- opcional para los siete tipos
        NumeroVersion           INT             NOT NULL DEFAULT (1),
        Vigente                 BIT             NOT NULL DEFAULT (1),
        FechaCarga              DATETIME2       NOT NULL DEFAULT (SYSUTCDATETIME()),
        FechaEliminacion        DATETIME2       NULL,     -- borrado lógico

        CONSTRAINT PK_DocumentosAspirante PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT CK_DocumentosAspirante_TipoDocumento CHECK (TipoDocumento BETWEEN 1 AND 7),
        CONSTRAINT FK_DocumentosAspirante_Usuarios FOREIGN KEY (UsuarioId)
            REFERENCES dbo.RRHH_Reclutamiento_Usuarios (Id)
            ON DELETE CASCADE
    );

    -- Es como el backend busca "el vigente de este tipo para este aspirante"
    -- en cada carga y en el listado.
    CREATE INDEX IX_DocumentosAspirante_UsuarioId_TipoDocumento ON dbo.RRHH_Reclutamiento_DocumentosAspirante (UsuarioId, TipoDocumento);
END
GO
