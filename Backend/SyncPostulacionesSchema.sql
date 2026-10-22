-- =====================================================================
-- Sincroniza el esquema de postulaciones con el modelo actual del backend
-- =====================================================================
-- PARA CUALQUIER AMBIENTE (no lleva USE [LUCCA] quemado: se aplica sobre la
-- base de datos en la que se ejecuta). Idempotente: se puede correr las
-- veces que haga falta sin error ni duplicados.
--
-- ¿Por qué existe este script? El esquema de
-- dbo.RRHH_Reclutamiento_Postulaciones creció con entregas incrementales
-- (CreatePostulacionesTable.sql, AlterPostulacionesDocumentosYHabilidades.sql,
-- AgregarRfcCurpAPerfilYPostulaciones.sql, AgregarProfesionAPostulaciones.sql,
-- CreateAreasCatalogoYMigrarPostulaciones.sql, CrearPostulacionesCertificaciones.sql).
-- Los scripts viejos llevan USE [LUCCA], así que un ambiente nuevo que solo
-- corrió el CREATE inicial queda con una tabla vieja: EF Core intenta hacer
-- INSERT de columnas que no existen y el endpoint POST /api/postulaciones
-- responde HTTP 500 ("Invalid column name ..."). Este script deja la tabla
-- completa y actualizada, sea cual sea el punto de partida.
--
-- Qué hace:
--   1. Crea dbo.RRHH_Reclutamiento_Postulaciones si no existe (definición
--      completa y actual, refleja Models/Postulacion.cs).
--   2. Agrega las columnas que falten (idempotente, con defaults seguros
--      para las filas existentes: documentos "vacíos", Rfc/Curp en blanco).
--   3. Agrega las llaves foráneas (AreaId, ProfesionId, UsuarioId) solo si
--      la tabla referenciada existe y la restricción aún no está.
--   4. Agrega los índices que falten (reconoce ambos nombres usados por los
--      scripts históricos: IX_RRHH_Reclutamiento_Postulaciones_* e
--      IX_Postulaciones_*).
--   5. Crea dbo.RRHH_Reclutamiento_Postulaciones_Certificaciones si no
--      existe.
--   6. Al final verifica e imprime si todavía falta algo (debería imprimir
--      "esquema completo").
--
-- Uso:
--   1. Conéctate en SSMS a la base de datos del ambiente a corregir.
--   2. Ejecuta este script completo (F5).
--   3. Confirma el mensaje final: "esquema completo".
-- =====================================================================

SET NOCOUNT ON;

-- ---------------------------------------------------------------------
-- 1) Tabla base (si no existe): definición completa y actual.
-- ---------------------------------------------------------------------
IF OBJECT_ID(N'dbo.RRHH_Reclutamiento_Postulaciones', N'U') IS NULL
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
        Rfc                                 NVARCHAR(13)    NOT NULL CONSTRAINT DF_Postulaciones_Rfc DEFAULT (''),
        Curp                                NVARCHAR(18)    NOT NULL CONSTRAINT DF_Postulaciones_Curp DEFAULT (''),
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
        IneFileName                         NVARCHAR(255)   NOT NULL CONSTRAINT DF_Postulaciones_IneFileName DEFAULT (''),
        IneBytes                            VARBINARY(MAX)  NOT NULL CONSTRAINT DF_Postulaciones_IneBytes DEFAULT (0x),
        RfcFileName                         NVARCHAR(255)   NOT NULL CONSTRAINT DF_Postulaciones_RfcFileName DEFAULT (''),
        RfcBytes                            VARBINARY(MAX)  NOT NULL CONSTRAINT DF_Postulaciones_RfcBytes DEFAULT (0x),
        ActaNacimientoFileName              NVARCHAR(255)   NOT NULL CONSTRAINT DF_Postulaciones_ActaNacimientoFileName DEFAULT (''),
        ActaNacimientoBytes                 VARBINARY(MAX)  NOT NULL CONSTRAINT DF_Postulaciones_ActaNacimientoBytes DEFAULT (0x),
        HabilidadesClave                    NVARCHAR(1000)  NULL,
        UsuarioId                           INT             NULL,
        AreaId                              INT             NULL,
        FechaRegistro                       DATETIME2       NOT NULL DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT PK_RRHH_Reclutamiento_Postulaciones PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT CK_RRHH_Reclutamiento_Postulaciones_Municipio
            CHECK (Municipio NOT LIKE '%[^A-Za-zÁÉÍÓÚáéíóúÑñÜü ]%')
    );
END
GO

-- ---------------------------------------------------------------------
-- 2) Columnas que pudieran faltar en una tabla creada por una entrega
--    vieja. Cada bloque revisa primero si la columna ya existe.
-- ---------------------------------------------------------------------
IF COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'Rfc') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones
        ADD Rfc NVARCHAR(13) NOT NULL CONSTRAINT DF_Postulaciones_Rfc DEFAULT ('');
END
GO

IF COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'Curp') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones
        ADD Curp NVARCHAR(18) NOT NULL CONSTRAINT DF_Postulaciones_Curp DEFAULT ('');
END
GO

IF COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'IneFileName') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones ADD
        IneFileName    NVARCHAR(255)  NOT NULL CONSTRAINT DF_Postulaciones_IneFileName DEFAULT (''),
        IneBytes       VARBINARY(MAX) NOT NULL CONSTRAINT DF_Postulaciones_IneBytes DEFAULT (0x);
END
GO

IF COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'RfcFileName') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones ADD
        RfcFileName    NVARCHAR(255)  NOT NULL CONSTRAINT DF_Postulaciones_RfcFileName DEFAULT (''),
        RfcBytes       VARBINARY(MAX) NOT NULL CONSTRAINT DF_Postulaciones_RfcBytes DEFAULT (0x);
END
GO

IF COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'ActaNacimientoFileName') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones ADD
        ActaNacimientoFileName NVARCHAR(255)  NOT NULL CONSTRAINT DF_Postulaciones_ActaNacimientoFileName DEFAULT (''),
        ActaNacimientoBytes    VARBINARY(MAX) NOT NULL CONSTRAINT DF_Postulaciones_ActaNacimientoBytes DEFAULT (0x);
END
GO

IF COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'HabilidadesClave') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones ADD
        HabilidadesClave NVARCHAR(1000) NULL;
END
GO

IF COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'UsuarioId') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones ADD
        UsuarioId INT NULL;
END
GO

IF COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'ProfesionId') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones ADD
        ProfesionId INT NULL;
END
GO

IF COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'AreaId') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones ADD
        AreaId INT NULL;
END
GO

-- ---------------------------------------------------------------------
-- 3) Llaves foráneas: solo si la tabla referenciada existe y la
--    restricción todavía no está. (Si el catálogo no existe en este
--    ambiente, el endpoint fallaría antes en la validación del
--    controlador — ver SETUP.md para crear los catálogos.)
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.RRHH_Reclutamiento_Areas', N'U') IS NOT NULL
   AND OBJECT_ID('dbo.FK_Postulaciones_Areas', N'F') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones ADD CONSTRAINT
        FK_Postulaciones_Areas FOREIGN KEY (AreaId)
            REFERENCES dbo.RRHH_Reclutamiento_Areas (Id);
END
GO

IF OBJECT_ID('dbo.RRHH_Reclutamiento_Profesiones', N'U') IS NOT NULL
   AND OBJECT_ID('dbo.FK_Postulaciones_Profesiones', N'F') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones ADD CONSTRAINT
        FK_Postulaciones_Profesiones FOREIGN KEY (ProfesionId)
            REFERENCES dbo.RRHH_Reclutamiento_Profesiones (Id);
END
GO

IF OBJECT_ID('dbo.RRHH_Reclutamiento_Usuarios', N'U') IS NOT NULL
   AND OBJECT_ID('dbo.FK_Postulaciones_Usuarios', N'F') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones ADD CONSTRAINT
        FK_Postulaciones_Usuarios FOREIGN KEY (UsuarioId)
            REFERENCES dbo.RRHH_Reclutamiento_Usuarios (Id)
            ON DELETE SET NULL;
END
GO

-- ---------------------------------------------------------------------
-- 4) Índices: se agregan si falta tanto el nombre nuevo como el nombre
--    viejo usado por los scripts históricos.
-- ---------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE object_id = OBJECT_ID('dbo.RRHH_Reclutamiento_Postulaciones')
                 AND name IN ('IX_Postulaciones_UsuarioId', 'IX_RRHH_Reclutamiento_Postulaciones_UsuarioId'))
BEGIN
    CREATE INDEX IX_Postulaciones_UsuarioId ON dbo.RRHH_Reclutamiento_Postulaciones (UsuarioId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE object_id = OBJECT_ID('dbo.RRHH_Reclutamiento_Postulaciones')
                 AND name IN ('IX_Postulaciones_ProfesionId', 'IX_RRHH_Reclutamiento_Postulaciones_ProfesionId'))
BEGIN
    CREATE INDEX IX_Postulaciones_ProfesionId ON dbo.RRHH_Reclutamiento_Postulaciones (ProfesionId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE object_id = OBJECT_ID('dbo.RRHH_Reclutamiento_Postulaciones')
                 AND name IN ('IX_Postulaciones_AreaId', 'IX_RRHH_Reclutamiento_Postulaciones_AreaId'))
BEGIN
    CREATE INDEX IX_Postulaciones_AreaId ON dbo.RRHH_Reclutamiento_Postulaciones (AreaId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE object_id = OBJECT_ID('dbo.RRHH_Reclutamiento_Postulaciones')
                 AND name IN ('IX_Postulaciones_FechaRegistro', 'IX_RRHH_Reclutamiento_Postulaciones_FechaRegistro'))
BEGIN
    CREATE INDEX IX_Postulaciones_FechaRegistro ON dbo.RRHH_Reclutamiento_Postulaciones (FechaRegistro DESC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE object_id = OBJECT_ID('dbo.RRHH_Reclutamiento_Postulaciones')
                 AND name IN ('IX_Postulaciones_MaximaFormacionAcademica', 'IX_RRHH_Reclutamiento_Postulaciones_MaximaFormacionAcademica'))
BEGIN
    CREATE INDEX IX_Postulaciones_MaximaFormacionAcademica ON dbo.RRHH_Reclutamiento_Postulaciones (MaximaFormacionAcademica);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE object_id = OBJECT_ID('dbo.RRHH_Reclutamiento_Postulaciones')
                 AND name IN ('IX_Postulaciones_AreasInteres', 'IX_RRHH_Reclutamiento_Postulaciones_AreasInteres'))
BEGIN
    CREATE INDEX IX_Postulaciones_AreasInteres ON dbo.RRHH_Reclutamiento_Postulaciones (AreasInteres);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE object_id = OBJECT_ID('dbo.RRHH_Reclutamiento_Postulaciones')
                 AND name IN ('IX_Postulaciones_Municipio', 'IX_RRHH_Reclutamiento_Postulaciones_Municipio'))
BEGIN
    CREATE INDEX IX_Postulaciones_Municipio ON dbo.RRHH_Reclutamiento_Postulaciones (Municipio);
END
GO

-- ---------------------------------------------------------------------
-- 5) Tabla de certificaciones adjuntas en la postulación (opcional,
--    varias filas por postulación) — ver Models/PostulacionCertificacion.cs.
-- ---------------------------------------------------------------------
IF OBJECT_ID(N'dbo.RRHH_Reclutamiento_Postulaciones_Certificaciones', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RRHH_Reclutamiento_Postulaciones_Certificaciones
    (
        Id                  INT             IDENTITY(1,1) NOT NULL,
        PostulacionId       INT             NOT NULL,
        Nombre              NVARCHAR(300)   NOT NULL,
        ArchivoFileName     NVARCHAR(255)   NOT NULL,
        ArchivoBytes        VARBINARY(MAX)  NOT NULL,
        Orden               INT             NOT NULL,

        CONSTRAINT PK_RRHH_Postulaciones_Certificaciones PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT FK_PostulacionesCertificaciones_Postulaciones FOREIGN KEY (PostulacionId)
            REFERENCES dbo.RRHH_Reclutamiento_Postulaciones (Id)
            ON DELETE CASCADE
    );

    CREATE INDEX IX_PostulacionesCertificaciones_PostulacionId ON dbo.RRHH_Reclutamiento_Postulaciones_Certificaciones (PostulacionId);
END
GO

-- ---------------------------------------------------------------------
-- 6) Verificación final: imprime las columnas que sigan faltando contra
--    el modelo actual (Models/Postulacion.cs). Debe decir "esquema
--    completo"; si lista algo, ese ambiente necesita atención manual.
-- ---------------------------------------------------------------------
DECLARE @esquemaCompleto BIT = 1;

IF COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'Rfc') IS NULL
    OR COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'Curp') IS NULL
    OR COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'IneFileName') IS NULL
    OR COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'IneBytes') IS NULL
    OR COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'RfcFileName') IS NULL
    OR COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'RfcBytes') IS NULL
    OR COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'ActaNacimientoFileName') IS NULL
    OR COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'ActaNacimientoBytes') IS NULL
    OR COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'HabilidadesClave') IS NULL
    OR COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'UsuarioId') IS NULL
    OR COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'ProfesionId') IS NULL
    OR COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'AreaId') IS NULL
    SET @esquemaCompleto = 0;

IF OBJECT_ID(N'dbo.RRHH_Reclutamiento_Postulaciones_Certificaciones', N'U') IS NULL
    SET @esquemaCompleto = 0;

IF @esquemaCompleto = 1
    PRINT N'Verificación: esquema completo — dbo.RRHH_Reclutamiento_Postulaciones y _Certificaciones están al día.';
ELSE
    PRINT N'Verificación: AVISO — todavía faltan columnas/tablas. Revisa los mensajes de error de arriba y los catálogos referenciados.';
GO
