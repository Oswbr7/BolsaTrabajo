-- =====================================================================
-- Agrega ProfesionId a dbo.RRHH_Reclutamiento_Postulaciones
-- =====================================================================
-- Para una base de datos que ya tiene esta tabla creada (por una entrega
-- anterior de CreateTablasCuentas.sql) y que YA CORRIÓ
-- CrearProfesionesYCertificaciones.sql (este script necesita que el
-- catálogo dbo.RRHH_Reclutamiento_Profesiones ya exista, porque agrega una
-- llave foránea hacia él). Idempotente: se puede correr varias veces sin
-- error.
--
-- Qué es: el formulario público de postulación (Postulacion.jsx) ahora
-- captura, además de "Máxima formación académica" (texto libre, sin
-- cambios), la profesión/carrera concreta correspondiente — mismo catálogo
-- y mismo criterio que ya se le pide al aspirante con sesión iniciada en su
-- perfil (ver ProfesionId en RRHH_Reclutamiento_FormacionAcademica).
-- PostulacionesController.Registrar exige esta columna y valida que la
-- Profesión elegida tenga el mismo Nivel que MaximaFormacionAcademica.
--
-- Nulo en la base de datos únicamente por compatibilidad con las
-- postulaciones ya registradas antes de este cambio (mismo criterio que
-- AreaId cuando se agregó) — toda postulación nueva siempre lo trae.
--
-- Motor: SQL Server (compatible con SQL Server Management Studio).
--
-- Uso:
--   1. Confirma que ya corriste CrearProfesionesYCertificaciones.sql en
--      esta base de datos (el catálogo de Profesiones debe existir).
--   2. Conéctate en SSMS a la base de datos indicada por DB_NAME en
--      Backend/.env (LUCCA).
--   3. Ejecuta este script completo (F5).
-- =====================================================================

USE [LUCCA];
GO

IF COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'ProfesionId') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones ADD
        ProfesionId INT NULL;

    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones ADD CONSTRAINT
        FK_Postulaciones_Profesiones FOREIGN KEY (ProfesionId)
            REFERENCES dbo.RRHH_Reclutamiento_Profesiones (Id);

    CREATE INDEX IX_Postulaciones_ProfesionId ON dbo.RRHH_Reclutamiento_Postulaciones (ProfesionId);
END
GO
