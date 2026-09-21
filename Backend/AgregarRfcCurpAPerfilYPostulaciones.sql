-- =====================================================================
-- Agrega Rfc y Curp (texto) a PerfilesAspirante y Postulaciones
-- =====================================================================
-- Para una base de datos que ya tiene ambas tablas creadas (por una
-- entrega anterior de CreateTablasCuentas.sql). Idempotente: se puede
-- correr varias veces sin error.
--
-- Qué es: el código alfanumérico de RFC (13 caracteres, persona física) y
-- CURP (18 caracteres), capturados como texto en "Completa tu perfil" y en
-- el formulario de postulación. Ambos opcionales.
--
-- OJO: esto es distinto de RfcFileName/RfcBytes que ya existían en
-- RRHH_Reclutamiento_Postulaciones — esas columnas guardan el PDF escaneado
-- del RFC que se sube como documento; Rfc (esta columna nueva) guarda el
-- código en sí, como texto. No se tocan ni se reemplazan entre sí.
-- =====================================================================

USE [LUCCA];
GO

-- ---------------------------------------------------------------------
-- RRHH_Reclutamiento_PerfilesAspirante
-- ---------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.RRHH_Reclutamiento_PerfilesAspirante')
      AND name = 'Rfc'
)
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_PerfilesAspirante
        ADD Rfc NVARCHAR(13) NOT NULL CONSTRAINT DF_PerfilesAspirante_Rfc DEFAULT ('');
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.RRHH_Reclutamiento_PerfilesAspirante')
      AND name = 'Curp'
)
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_PerfilesAspirante
        ADD Curp NVARCHAR(18) NOT NULL CONSTRAINT DF_PerfilesAspirante_Curp DEFAULT ('');
END
GO

-- ---------------------------------------------------------------------
-- RRHH_Reclutamiento_Postulaciones
-- ---------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.RRHH_Reclutamiento_Postulaciones')
      AND name = 'Rfc'
)
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones
        ADD Rfc NVARCHAR(13) NOT NULL CONSTRAINT DF_Postulaciones_Rfc DEFAULT ('');
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.RRHH_Reclutamiento_Postulaciones')
      AND name = 'Curp'
)
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones
        ADD Curp NVARCHAR(18) NOT NULL CONSTRAINT DF_Postulaciones_Curp DEFAULT ('');
END
GO
