/*
    Script: catálogo de profesiones (dbo.RRHH_Reclutamiento_Profesiones) +
    columna ProfesionId en dbo.RRHH_Reclutamiento_FormacionAcademica +
    tabla de certificaciones (dbo.RRHH_Reclutamiento_Certificaciones).

    Contexto: "Plan de Implementación - Profesiones y Certificaciones del
    Aspirante.md" (carpeta Documentacion/SE-137-Reclutamiento). El área de
    interés (RRHH_Reclutamiento_Areas) se queda tal cual está, pero deja de
    ser el criterio de emparejamiento con vacantes: eso ahora se hace por
    profesión/tipo de formación académica. Un aspirante puede tener varias
    formaciones académicas y TODAS cuentan para el emparejamiento, no solo
    la de mayor jerarquía.

    Los niveles de estudio que no tienen una carrera concreta (Secundaria,
    Preparatoria, Diplomado) también participan en el emparejamiento igual
    que cualquier profesión — para eso el catálogo trae 3 renglones
    "genéricos" cuyo Nombre es idéntico a su Nivel, en vez de que el
    sistema trate ese caso como una excepción. Con esto, ProfesionId es
    SIEMPRE obligatorio en una formación académica nueva, sin casos
    especiales.

    *** ESTE SCRIPT MODIFICA dbo.RRHH_Reclutamiento_FormacionAcademica ***:
    agrega la columna ProfesionId (NULL al inicio, con FK hacia el
    catálogo nuevo). Se deja NULL para las filas que ya existan (formación
    académica capturada antes de este cambio) porque no hay forma
    automática de saber qué profesión concreta corresponde a un
    "Licenciatura" ya guardado sin más detalle — el backend
    (PerfilController.GuardarPerfil) exige ProfesionId en toda formación
    académica NUEVA de aquí en adelante, y valida que la Profesión elegida
    tenga el mismo Nivel que el NivelEstudios de esa misma fila.

    Motor: SQL Server (compatible con SQL Server Management Studio).
    Es seguro volver a ejecutar este script completo las veces que haga
    falta: cada bloque revisa primero si ya se hizo antes de repetirlo.

    Uso:
      1. Conéctate en SSMS a la base de datos indicada por DB_NAME en
         Backend/.env (LUCCA).
      2. Ejecuta este script completo (F5).
      3. Revisa el mensaje final: dice cuántas formaciones académicas ya
         existentes quedaron sin ProfesionId (es esperado — no se puede
         inferir a qué carrera concreta correspondían) para que el
         aspirante las complemente la próxima vez que edite su perfil.
*/

USE [LUCCA];
GO

-- 1) Catálogo de profesiones/carreras, agrupado por Nivel de estudios.
IF OBJECT_ID(N'dbo.RRHH_Reclutamiento_Profesiones', N'U') IS NULL
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

-- 2) Semillas: catálogo propuesto en "Catalogo de Profesiones - Bolsa de
--    Trabajo y SIATEC.md" (74 profesiones concretas + 3 renglones
--    genéricos para Secundaria/Preparatoria/Diplomado). El valor de Nivel
--    debe coincidir EXACTAMENTE (mayúsculas/acentos incluidos) con
--    FORMACION_OPTIONS en Frontend/src/constants/catalogos.js, porque
--    PerfilController.GuardarPerfil valida esa igualdad byte a byte. Solo
--    se inserta lo que todavía no exista, para poder correr esto varias
--    veces sin duplicar ni pisar ediciones manuales (p. ej. si alguien
--    desactivó una profesión con Activa = 0).
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

-- 3) Columna ProfesionId en FormacionAcademica (FK al catálogo nuevo).
IF COL_LENGTH('dbo.RRHH_Reclutamiento_FormacionAcademica', 'ProfesionId') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_FormacionAcademica ADD
        ProfesionId INT NULL;

    ALTER TABLE dbo.RRHH_Reclutamiento_FormacionAcademica ADD CONSTRAINT
        FK_FormacionAcademica_Profesiones FOREIGN KEY (ProfesionId)
            REFERENCES dbo.RRHH_Reclutamiento_Profesiones (Id);

    CREATE INDEX IX_FormacionAcademica_ProfesionId ON dbo.RRHH_Reclutamiento_FormacionAcademica (ProfesionId);
END
GO

-- 4) RRHH_Reclutamiento_Certificaciones — nueva sección del perfil del
--    aspirante (misma forma que ExperienciaLaboral/FormacionAcademica/
--    Habilidades: se reemplaza la lista completa en cada guardado del
--    asistente de perfil).
IF OBJECT_ID(N'dbo.RRHH_Reclutamiento_Certificaciones', N'U') IS NULL
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

-- 5) Aviso final: cuántas formaciones académicas ya existentes quedaron
--    sin ProfesionId (esperado — no hay forma automática de inferir la
--    carrera concreta de una fila capturada antes de este cambio).
DECLARE @sinProfesion INT = (SELECT COUNT(*) FROM dbo.RRHH_Reclutamiento_FormacionAcademica WHERE ProfesionId IS NULL);
IF @sinProfesion > 0
    PRINT CONCAT(N'Aviso: quedaron ', @sinProfesion, N' formación(es) académica(s) sin ProfesionId (capturadas antes de este cambio). El aspirante deberá completarlas la próxima vez que edite su perfil.');
ELSE
    PRINT N'Listo: todas las formaciones académicas existentes ya tienen ProfesionId asignado.';
GO
