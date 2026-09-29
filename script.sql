- ---------------------------------------------------------------------
-- 8. RRHH_Reclutamiento_Profesiones — catálogo de profesiones/carreras,
--    agrupado por Nivel de estudios. Se crea antes que FormacionAcademica
--    porque esta última tiene una llave foránea hacia ella. Incluye 3
--    renglones "genéricos" (Secundaria, Preparatoria, Diplomado) cuyo
--    Nombre es igual a su Nivel, para los niveles de estudio que no
--    tienen una carrera concreta — así toda formación académica siempre
--    tiene una Profesión asociada. Ver "Catalogo de Profesiones - Bolsa
--    de Trabajo y SIATEC.md".
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

-- Semilla: 77 filas (74 profesiones concretas + 3 genéricas). Ver el
-- INSERT completo en Backend/CreateTablasCuentas.sql o
-- Backend/CrearProfesionesYCertificaciones.sql — no se repite aquí para
-- no tener el mismo texto largo duplicado en dos archivos de referencia;
-- este documento es un resumen consolidado, no el script que se ejecuta.

-- Llave foránea de Postulaciones.ProfesionId hacia Profesiones (columna
-- agregada a la tabla 2, arriba): se agrega hasta aquí porque Profesiones
-- recién queda creada en este punto del script en una base de datos nueva.
IF OBJECT_ID('FK_Postulaciones_Profesiones', 'F') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones ADD CONSTRAINT
        FK_Postulaciones_Profesiones FOREIGN KEY (ProfesionId)
            REFERENCES dbo.RRHH_Reclutamiento_Profesiones (Id);
END
GO

-- ---------------------------------------------------------------------
-- 9. RRHH_Reclutamiento_FormacionAcademica — ganó la columna ProfesionId
--    (FK hacia el catálogo de arriba), obligatoria para toda formación
--    académica nueva/editada (PerfilController.GuardarPerfil lo exige y
--    valida que su Nivel coincida con NivelEstudios de esa misma fila).
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
        FechaFin            DATE            NULL,

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
-- 10. RRHH_Reclutamiento_Habilidades
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
-- 11. RRHH_Reclutamiento_Certificaciones — nueva sección del perfil del
--     aspirante (mismo patrón que ExperienciaLaboral/FormacionAcademica/
--     Habilidades).
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
        FechaVencimiento    DATE            NULL,

        CONSTRAINT PK_RRHH_Reclutamiento_Certificaciones PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT FK_Certificaciones_PerfilesAspirante FOREIGN KEY (PerfilAspiranteId)
            REFERENCES dbo.RRHH_Reclutamiento_PerfilesAspirante (Id)
            ON DELETE CASCADE
    );

    CREATE INDEX IX_Certificaciones_PerfilAspiranteId ON dbo.RRHH_Reclutamiento_Certificaciones (PerfilAspiranteId);
END
GO

-- ---------------------------------------------------------------------
-- 12. RRHH_Reclutamiento_HistorialPerfil
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
-- 13. RRHH_Reclutamiento_DocumentosAspirante
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
        ContenidoCifrado        VARBINARY(MAX)  NOT NULL,
        HashSha256              CHAR(64)        NOT NULL,
        FechaVigencia           DATE            NULL,
        NumeroVersion           INT             NOT NULL DEFAULT (1),
        Vigente                 BIT             NOT NULL DEFAULT (1),
        FechaCarga              DATETIME2       NOT NULL DEFAULT (SYSUTCDATETIME()),
        FechaEliminacion        DATETIME2       NULL,

        CONSTRAINT PK_DocumentosAspirante PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT CK_DocumentosAspirante_TipoDocumento CHECK (TipoDocumento BETWEEN 1 AND 7),
        CONSTRAINT FK_DocumentosAspirante_Usuarios FOREIGN KEY (UsuarioId)
            REFERENCES dbo.RRHH_Reclutamiento_Usuarios (Id)
            ON DELETE CASCADE
    );

    CREATE INDEX IX_DocumentosAspirante_UsuarioId_TipoDocumento ON dbo.RRHH_Reclutamiento_DocumentosAspirante (UsuarioId, TipoDocumento);
END
GO

-- =====================================================================
-- 14-19. Perfiles de Puesto (SIATEC)
-- =====================================================================
-- PerfilesPuesto.AreaId referencia el catálogo compartido de arriba
-- (RRHH_Reclutamiento_Areas). PerfilesPuesto_Escolaridades.ProfesionId
-- referencia el catálogo de la tabla 8 (RRHH_Reclutamiento_Profesiones):
-- es el criterio real de emparejamiento entre un perfil de puesto y las
-- profesiones/niveles de estudio que acepta.
--
-- CAMBIO: estas 6 tablas (antes 5) ahora sí traen guarda IF OBJECT_ID —
-- antes se entregaron con CREATE TABLE directo, pensadas solo para
-- instalación nueva, y fallaban si se corrían dos veces. Se agregó
-- además la tabla 18 (Escolaridades), que no existía. La FK de
-- PuestoCodigo hacia dbo.Nomina_Puestos y su índice
-- (IX_RRHH_PerfilesPuesto_Puesto) se quitaron: la columna se conserva
-- pero ya no está forzada por FK ni indexada. Ver
-- RRHH_Reclutamiento_PerfilesPuesto.sql, la fuente de la verdad de este
-- bloque, para el detalle de cada cambio.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 14. RRHH_Reclutamiento_PerfilesPuesto
-- ---------------------------------------------------------------------
IF OBJECT_ID(N'dbo.RRHH_Reclutamiento_PerfilesPuesto', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RRHH_Reclutamiento_PerfilesPuesto] (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RRHH_Reclutamiento_PerfilesPuesto] PRIMARY KEY,
        [CodigoPerfil] VARCHAR(50) NOT NULL CONSTRAINT [UQ_RRHH_PerfilesPuesto_Codigo] UNIQUE,
        [PuestoCodigo] INT NULL, [AreaId] INT NULL, [VersionActual] INT NOT NULL,
        [EstadoActual] VARCHAR(20) NOT NULL, [CreadoPor] NVARCHAR(100) NOT NULL,
        [ModificadoPor] NVARCHAR(100) NOT NULL, [FechaCreacion] DATETIME NOT NULL DEFAULT GETDATE(),
        [FechaModificacion] DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [CK_RRHH_PerfilesPuesto_Estado] CHECK ([EstadoActual] IN ('borrador','publicado','inactivo'))
    );
END
GO

-- ---------------------------------------------------------------------
-- 15. RRHH_Reclutamiento_PerfilesPuesto_Versiones
-- ---------------------------------------------------------------------
IF OBJECT_ID(N'dbo.RRHH_Reclutamiento_PerfilesPuesto_Versiones', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RRHH_Reclutamiento_PerfilesPuesto_Versiones] (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RRHH_PerfilesPuesto_Versiones] PRIMARY KEY,
        [PerfilId] INT NOT NULL, [NumeroVersion] INT NOT NULL, [Estado] VARCHAR(20) NOT NULL,
        [NombrePuesto] NVARCHAR(300) NOT NULL, [Rama] NVARCHAR(150) NOT NULL, [Familia] NVARCHAR(150) NOT NULL,
        [GrupoCategoria] NVARCHAR(150) NOT NULL, [NivelOrganizacional] NVARCHAR(150) NOT NULL, [TipoPersonal] NVARCHAR(150) NOT NULL,
        [AreaFuncional] NVARCHAR(300) NOT NULL, [PuestoSuperior] NVARCHAR(300) NULL, [VigenciaInicio] VARCHAR(10) NOT NULL,
        [VigenciaFin] VARCHAR(10) NULL, [Observaciones] NVARCHAR(MAX) NOT NULL, [ObjetivoGeneral] NVARCHAR(MAX) NOT NULL,
        [PublicadoEn] DATETIME NULL, [InactivadoEn] DATETIME NULL, [CreadoPor] NVARCHAR(100) NOT NULL,
        [ModificadoPor] NVARCHAR(100) NOT NULL, [FechaCreacion] DATETIME NOT NULL DEFAULT GETDATE(),
        [FechaModificacion] DATETIME NOT NULL DEFAULT GETDATE(), [RowVersion] VARBINARY(8) NOT NULL,
        CONSTRAINT [UQ_RRHH_PerfilesPuesto_Version] UNIQUE ([PerfilId], [NumeroVersion]),
        CONSTRAINT [CK_RRHH_PerfilesPuesto_Version_Estado] CHECK ([Estado] IN ('borrador','publicado','inactivo'))
    );
END
GO

-- ---------------------------------------------------------------------
-- 16. RRHH_Reclutamiento_PerfilesPuesto_Funciones
-- ---------------------------------------------------------------------
IF OBJECT_ID(N'dbo.RRHH_Reclutamiento_PerfilesPuesto_Funciones', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RRHH_Reclutamiento_PerfilesPuesto_Funciones] (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RRHH_PerfilesPuesto_Funciones] PRIMARY KEY,
        [VersionId] INT NOT NULL, [Orden] INT NOT NULL, [Descripcion] NVARCHAR(MAX) NOT NULL,
        [Obligatoria] BIT NOT NULL, [Critica] BIT NOT NULL, [Activa] BIT NOT NULL
    );
END
GO

-- ---------------------------------------------------------------------
-- 17. RRHH_Reclutamiento_PerfilesPuesto_Documentos
-- ---------------------------------------------------------------------
IF OBJECT_ID(N'dbo.RRHH_Reclutamiento_PerfilesPuesto_Documentos', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RRHH_Reclutamiento_PerfilesPuesto_Documentos] (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RRHH_PerfilesPuesto_Documentos] PRIMARY KEY,
        [VersionId] INT NOT NULL, [Orden] INT NOT NULL, [TipoDocumento] VARCHAR(50) NOT NULL,
        [Nombre] NVARCHAR(300) NOT NULL, [Obligatorio] BIT NOT NULL, [Activo] BIT NOT NULL,
        [Observaciones] NVARCHAR(MAX) NOT NULL
    );
END
GO

-- ---------------------------------------------------------------------
-- 18. RRHH_Reclutamiento_PerfilesPuesto_Escolaridades
-- ---------------------------------------------------------------------
IF OBJECT_ID(N'dbo.RRHH_Reclutamiento_PerfilesPuesto_Escolaridades', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RRHH_Reclutamiento_PerfilesPuesto_Escolaridades] (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RRHH_PerfilesPuesto_Escolaridades] PRIMARY KEY,
        [VersionId] INT NOT NULL, [ProfesionId] INT NOT NULL, [Orden] INT NOT NULL,
        CONSTRAINT [UQ_RRHH_PerfilesPuesto_Escolaridad] UNIQUE ([VersionId], [ProfesionId])
    );
END
GO

-- ---------------------------------------------------------------------
-- 19. RRHH_Reclutamiento_PerfilesPuesto_Auditoria
-- ---------------------------------------------------------------------
IF OBJECT_ID(N'dbo.RRHH_Reclutamiento_PerfilesPuesto_Auditoria', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RRHH_Reclutamiento_PerfilesPuesto_Auditoria] (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RRHH_PerfilesPuesto_Auditoria] PRIMARY KEY,
        [PerfilId] INT NOT NULL, [VersionId] INT NULL, [UsuarioId] NVARCHAR(100) NOT NULL,
        [Accion] VARCHAR(50) NOT NULL, [Campo] VARCHAR(100) NULL, [ValorAnterior] NVARCHAR(MAX) NULL,
        [ValorNuevo] NVARCHAR(MAX) NULL, [FechaHora] DATETIME NOT NULL DEFAULT GETDATE()
    );
END
GO

-- ---------------------------------------------------------------------
-- Índices — Perfiles de Puesto
-- ---------------------------------------------------------------------

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RRHH_PerfilesPuesto_AreaEstado')
    CREATE INDEX [IX_RRHH_PerfilesPuesto_AreaEstado] ON [dbo].[RRHH_Reclutamiento_PerfilesPuesto] ([AreaId], [EstadoActual]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RRHH_PerfilesPuesto_Version_EstadoVigencia')
    CREATE INDEX [IX_RRHH_PerfilesPuesto_Version_EstadoVigencia] ON [dbo].[RRHH_Reclutamiento_PerfilesPuesto_Versiones] ([Estado], [VigenciaInicio], [VigenciaFin]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RRHH_PerfilesPuesto_Auditoria_Perfil')
    CREATE INDEX [IX_RRHH_PerfilesPuesto_Auditoria_Perfil] ON [dbo].[RRHH_Reclutamiento_PerfilesPuesto_Auditoria] ([PerfilId], [FechaHora]);
GO

-- ---------------------------------------------------------------------
-- Llaves foráneas — Perfiles de Puesto
-- ---------------------------------------------------------------------

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_RRHH_PerfilesPuesto_Version_Perfil')
    ALTER TABLE [dbo].[RRHH_Reclutamiento_PerfilesPuesto_Versiones] ADD CONSTRAINT [FK_RRHH_PerfilesPuesto_Version_Perfil] FOREIGN KEY ([PerfilId]) REFERENCES [dbo].[RRHH_Reclutamiento_PerfilesPuesto] ([Id]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_RRHH_PerfilesPuesto_Funcion_Version')
    ALTER TABLE [dbo].[RRHH_Reclutamiento_PerfilesPuesto_Funciones] ADD CONSTRAINT [FK_RRHH_PerfilesPuesto_Funcion_Version] FOREIGN KEY ([VersionId]) REFERENCES [dbo].[RRHH_Reclutamiento_PerfilesPuesto_Versiones] ([Id]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_RRHH_PerfilesPuesto_Documento_Version')
    ALTER TABLE [dbo].[RRHH_Reclutamiento_PerfilesPuesto_Documentos] ADD CONSTRAINT [FK_RRHH_PerfilesPuesto_Documento_Version] FOREIGN KEY ([VersionId]) REFERENCES [dbo].[RRHH_Reclutamiento_PerfilesPuesto_Versiones] ([Id]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_RRHH_PerfilesPuesto_Auditoria_Perfil')
    ALTER TABLE [dbo].[RRHH_Reclutamiento_PerfilesPuesto_Auditoria] ADD CONSTRAINT [FK_RRHH_PerfilesPuesto_Auditoria_Perfil] FOREIGN KEY ([PerfilId]) REFERENCES [dbo].[RRHH_Reclutamiento_PerfilesPuesto] ([Id]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_RRHH_PerfilesPuesto_Auditoria_Version')
    ALTER TABLE [dbo].[RRHH_Reclutamiento_PerfilesPuesto_Auditoria] ADD CONSTRAINT [FK_RRHH_PerfilesPuesto_Auditoria_Version] FOREIGN KEY ([VersionId]) REFERENCES [dbo].[RRHH_Reclutamiento_PerfilesPuesto_Versiones] ([Id]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_RRHH_PerfilesPuesto_Escolaridad_Version')
    ALTER TABLE [dbo].[RRHH_Reclutamiento_PerfilesPuesto_Escolaridades] ADD CONSTRAINT [FK_RRHH_PerfilesPuesto_Escolaridad_Version] FOREIGN KEY ([VersionId]) REFERENCES [dbo].[RRHH_Reclutamiento_PerfilesPuesto_Versiones] ([Id]);
GO

IF OBJECT_ID(N'dbo.RRHH_Reclutamiento_Areas', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_RRHH_PerfilesPuesto_Area')
    ALTER TABLE [dbo].[RRHH_Reclutamiento_PerfilesPuesto] ADD CONSTRAINT [FK_RRHH_PerfilesPuesto_Area] FOREIGN KEY ([AreaId]) REFERENCES [dbo].[RRHH_Reclutamiento_Areas] ([Id]);
GO

IF OBJECT_ID(N'dbo.RRHH_Reclutamiento_Profesiones', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_RRHH_PerfilesPuesto_Escolaridad_Profesion')
    ALTER TABLE [dbo].[RRHH_Reclutamiento_PerfilesPuesto_Escolaridades] ADD CONSTRAINT [FK_RRHH_PerfilesPuesto_Escolaridad_Profesion] FOREIGN KEY ([ProfesionId]) REFERENCES [dbo].[RRHH_Reclutamiento_Profesiones] ([Id]);
GO
