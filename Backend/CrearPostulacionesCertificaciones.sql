-- =====================================================================
-- Crea dbo.RRHH_Reclutamiento_Postulaciones_Certificaciones
-- =====================================================================
-- Certificaciones que el postulante adjunta en el formulario público de
-- postulación (Postulacion.jsx) — sección "Certificaciones", debajo de
-- "Comprobante de estudios máximos en PDF". Campo opcional: una
-- postulación puede no tener ninguna fila aquí. Cada fila es una
-- certificación con su propio archivo PDF (nombre + bytes), igual que los
-- demás documentos de Postulaciones (CvFileName/CvBytes, etc.), pero como
-- aquí pueden ser varias, se guardan en tabla aparte en vez de columnas
-- fijas en dbo.RRHH_Reclutamiento_Postulaciones.
--
-- FK con ON DELETE CASCADE hacia Postulaciones: si se borra la
-- postulación, sus certificaciones se borran con ella — mismo criterio
-- que CodigosVerificacion/PerfilesAspirante/DocumentosAspirante hacia
-- Usuarios.
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
