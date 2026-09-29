-- =====================================================================
-- Crea dbo.RRHH_Reclutamiento_PostulacionesPuesto
-- y dbo.RRHH_Reclutamiento_PostulacionesPuesto_Documentos
-- =====================================================================
-- Postulación de un aspirante (con sesión iniciada, [Authorize]) a un
-- perfil de puesto ESPECÍFICO (formulario "Postularme" en
-- PostularsePerfilPuesto.jsx, llegando desde Vacantes.jsx o
-- PerfilPuestoDetalle.jsx). Distinta de dbo.RRHH_Reclutamiento_Postulaciones
-- (el registro general, público, de Postulacion.jsx): esta exige sesión,
-- no captura formación académica/área de interés (la escolaridad ya la
-- define el propio perfil de puesto) y su documentación requerida es
-- dinámica según el puesto — por eso vive en tabla aparte con su propia
-- tabla hija de documentos, en vez de columnas fijas.
--
-- PerfilPuestoVersionId guarda una "foto" de a qué VERSIÓN del perfil de
-- puesto se postuló (no solo a qué PerfilPuestoId): si SIATEC publica una
-- versión nueva después, con documentos distintos, esta postulación ya
-- guardada conserva el registro histórico de lo que realmente se pidió
-- y se entregó en su momento.
--
-- Una sola postulación por usuario por vacante: índice único
-- (UsuarioId, PerfilPuestoId).
--
-- FK con ON DELETE CASCADE hacia PostulacionesPuesto en la tabla de
-- documentos: si se borra la postulación, sus documentos se borran con
-- ella — mismo criterio que PostulacionesCertificaciones hacia
-- Postulaciones. La FK hacia PerfilesPuesto_Documentos (el catálogo de
-- SIATEC) NO tiene cascada: son tablas de dominios distintos.
--
-- Motor: SQL Server (compatible con SQL Server Management Studio).
-- Es seguro volver a ejecutar este script completo las veces que haga
-- falta.
--
-- Uso:
--   1. Conéctate en SSMS a la base de datos indicada por DB_NAME en
--      Backend/.env (LUCCA).
--   2. Ejecuta este script completo (F5).
-- =====================================================================

USE [LUCCA];
GO

IF OBJECT_ID(N'dbo.RRHH_Reclutamiento_PostulacionesPuesto', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RRHH_Reclutamiento_PostulacionesPuesto
    (
        Id                      INT             IDENTITY(1,1) NOT NULL,
        UsuarioId               INT             NOT NULL,
        PerfilPuestoId          INT             NOT NULL,
        PerfilPuestoVersionId   INT             NOT NULL,
        Nombre                  NVARCHAR(200)   NOT NULL,
        ApellidoPaterno         NVARCHAR(200)   NOT NULL,
        ApellidoMaterno         NVARCHAR(200)   NULL,
        Rfc                     VARCHAR(13)     NOT NULL,
        Curp                    VARCHAR(18)     NOT NULL,
        Estado                  NVARCHAR(100)   NOT NULL,
        Municipio               NVARCHAR(150)   NULL,
        Telefono                VARCHAR(12)     NOT NULL,
        Correo                  NVARCHAR(255)   NOT NULL,
        ExpectativasSalariales  NVARCHAR(50)    NOT NULL,
        HabilidadesClave        NVARCHAR(500)   NULL,
        ComprobanteEstudiosFileName NVARCHAR(255)   NOT NULL,
        ComprobanteEstudiosBytes   VARBINARY(MAX)  NOT NULL,
        FechaRegistro           DATETIME2       NOT NULL,

        CONSTRAINT PK_RRHH_PostulacionesPuesto PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT FK_PostulacionesPuesto_Usuarios FOREIGN KEY (UsuarioId)
            REFERENCES dbo.RRHH_Reclutamiento_Usuarios (Id),
        CONSTRAINT FK_PostulacionesPuesto_PerfilesPuesto FOREIGN KEY (PerfilPuestoId)
            REFERENCES dbo.RRHH_Reclutamiento_PerfilesPuesto (Id),
        CONSTRAINT FK_PostulacionesPuesto_PerfilesPuestoVersiones FOREIGN KEY (PerfilPuestoVersionId)
            REFERENCES dbo.RRHH_Reclutamiento_PerfilesPuesto_Versiones (Id),
        CONSTRAINT UQ_PostulacionesPuesto_UsuarioPerfil UNIQUE (UsuarioId, PerfilPuestoId)
    );

    CREATE INDEX IX_PostulacionesPuesto_PerfilPuestoId ON dbo.RRHH_Reclutamiento_PostulacionesPuesto (PerfilPuestoId);
END
GO

IF OBJECT_ID(N'dbo.RRHH_Reclutamiento_PostulacionesPuesto_Documentos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RRHH_Reclutamiento_PostulacionesPuesto_Documentos
    (
        Id                      INT             IDENTITY(1,1) NOT NULL,
        PostulacionPuestoId     INT             NOT NULL,
        PerfilPuestoDocumentoId INT             NOT NULL,
        ArchivoFileName         NVARCHAR(255)   NOT NULL,
        ArchivoBytes            VARBINARY(MAX)  NOT NULL,

        CONSTRAINT PK_RRHH_PostulacionesPuesto_Documentos PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT FK_PostulacionesPuestoDocumentos_PostulacionPuesto FOREIGN KEY (PostulacionPuestoId)
            REFERENCES dbo.RRHH_Reclutamiento_PostulacionesPuesto (Id)
            ON DELETE CASCADE,
        CONSTRAINT FK_PostulacionesPuestoDocumentos_PerfilPuestoDocumento FOREIGN KEY (PerfilPuestoDocumentoId)
            REFERENCES dbo.RRHH_Reclutamiento_PerfilesPuesto_Documentos (Id),
        CONSTRAINT UQ_PostulacionesPuestoDocumentos_PostulacionYDocumento UNIQUE (PostulacionPuestoId, PerfilPuestoDocumentoId)
    );

    CREATE INDEX IX_PostulacionesPuestoDocumentos_PostulacionPuestoId ON dbo.RRHH_Reclutamiento_PostulacionesPuesto_Documentos (PostulacionPuestoId);
END
GO
