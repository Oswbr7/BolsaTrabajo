-- =====================================================================
-- Crea dbo.RRHH_Reclutamiento_PostulacionesPuesto_Certificaciones
-- =====================================================================
-- Archivo que el aspirante adjunta por cada certificación que pide el
-- perfil académico del perfil de puesto al que se está postulando
-- (PostularsePerfilPuesto.jsx, sección "Certificaciones requeridas" —
-- una fila por cada RRHH_Reclutamiento_PerfilesPuesto_Certificaciones de
-- la versión vigente). A diferencia de los Documentos requeridos
-- (RRHH_Reclutamiento_PerfilesPuesto_Documentos, que sí tienen columna
-- Obligatorio), la tabla de Certificaciones de SIATEC no distingue
-- obligatorias de opcionales — por decisión del proyecto, TODAS las
-- certificaciones que liste el puesto son obligatorias de adjuntar al
-- postularse.
--
-- FK con ON DELETE CASCADE hacia PostulacionesPuesto: si se borra la
-- postulación, sus certificaciones adjuntas se borran con ella — mismo
-- criterio que PostulacionesPuesto_Documentos. La FK hacia
-- PerfilesPuesto_Certificaciones (el catálogo de SIATEC) NO tiene
-- cascada: son tablas de dominios distintos.
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

IF OBJECT_ID(N'dbo.RRHH_Reclutamiento_PostulacionesPuesto_Certificaciones', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RRHH_Reclutamiento_PostulacionesPuesto_Certificaciones
    (
        Id                          INT             IDENTITY(1,1) NOT NULL,
        PostulacionPuestoId         INT             NOT NULL,
        PerfilPuestoCertificacionId INT             NOT NULL,
        ArchivoFileName             NVARCHAR(255)   NOT NULL,
        ArchivoBytes                VARBINARY(MAX)  NOT NULL,

        CONSTRAINT PK_RRHH_PostulacionesPuesto_Certificaciones PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT FK_PostulacionesPuestoCertificaciones_PostulacionPuesto FOREIGN KEY (PostulacionPuestoId)
            REFERENCES dbo.RRHH_Reclutamiento_PostulacionesPuesto (Id)
            ON DELETE CASCADE,
        CONSTRAINT FK_PostulacionesPuestoCertificaciones_PerfilPuestoCertificacion FOREIGN KEY (PerfilPuestoCertificacionId)
            REFERENCES dbo.RRHH_Reclutamiento_PerfilesPuesto_Certificaciones (Id),
        CONSTRAINT UQ_PostulacionesPuestoCertificaciones_PostulacionYCertificacion UNIQUE (PostulacionPuestoId, PerfilPuestoCertificacionId)
    );

    CREATE INDEX IX_PostulacionesPuestoCertificaciones_PostulacionPuestoId ON dbo.RRHH_Reclutamiento_PostulacionesPuesto_Certificaciones (PostulacionPuestoId);
END
GO
