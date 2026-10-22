-- =====================================================================
-- Sincroniza los catálogos (Áreas y Profesiones) para cualquier ambiente
-- =====================================================================
-- PARA CUALQUIER AMBIENTE (sin USE [LUCCA] quemado: se aplica sobre la
-- base de datos en la que se ejecuta). Idempotente: se puede correr las
-- veces que haga falta sin error ni duplicados.
--
-- ¿Por qué existe este script? Los Ids de estos catálogos los asigna
-- IDENTITY según el orden en que cada ambiente corrió los scripts de
-- siembra — NO son iguales entre bases de datos. Si un frontend cargó el
-- catálogo de un backend pero envía la postulación a OTRO backend (p. ej.
-- el botón de desarrollo "Cargar 5 candidatos" apuntando a un puerto
-- equivocado), el INSERT falla con violación de llave foránea
-- (SqlException 547) y el endpoint responde HTTP 500. Este script no hace
-- los Ids iguales entre ambientes (eso requeriría migrar datos), pero:
--   1. Garantiza que ambas tablas existan con la estructura COMPLETA
--      actual (incluidas AreaEstudio/CarreraGenerica en Profesiones).
--   2. Siembra la lista definitiva de Áreas y los 3 renglones "genéricos"
--      de Profesiones (Secundaria/Preparatoria/Diplomado) si faltan —
--      sin ellos el formulario de postulación no puede completarse.
--   3. Imprime un DIAGNÓSTICO al final: cuántas filas tiene cada catálogo
--      y los Ids de los genéricos — compáralo entre ambientes; si los
--      conteos difieren, ese ambiente no corrió
--      AgregarCatalogoCarrerasSEP2022.sql y su catálogo es distinto.
--
-- Uso:
--   1. Conéctate en SSMS a la base de datos del ambiente a revisar.
--   2. Ejecuta este script completo (F5).
--   3. Lee el diagnóstico final y compáralo con el ambiente de
--      desarrollo (mismas consultas en la otra base).
-- =====================================================================

SET NOCOUNT ON;

-- ---------------------------------------------------------------------
-- 1) Catálogo de Áreas de interés (compartido con SIATEC).
-- ---------------------------------------------------------------------
IF OBJECT_ID(N'dbo.RRHH_Reclutamiento_Areas', N'U') IS NULL
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

-- Semillas: lista definitiva (misma que CreateAreasCatalogoYMigrarPostulaciones.sql).
-- Solo inserta lo que no exista, sin pisar ediciones manuales (p. ej. Activa=0).
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
-- 2) Catálogo de Profesiones/carreras: tabla completa + columnas que
--    pudieran faltar en una tabla creada por una entrega vieja.
-- ---------------------------------------------------------------------
IF OBJECT_ID(N'dbo.RRHH_Reclutamiento_Profesiones', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RRHH_Reclutamiento_Profesiones
    (
        Id              INT             IDENTITY(1,1) NOT NULL,
        Nombre          NVARCHAR(150)   NOT NULL,
        Nivel           NVARCHAR(50)    NOT NULL,
        Activa          BIT             NOT NULL DEFAULT (1),
        AreaEstudio     NVARCHAR(100)   NULL,
        CarreraGenerica NVARCHAR(150)   NULL,

        CONSTRAINT PK_RRHH_Reclutamiento_Profesiones PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT UQ_RRHH_Reclutamiento_Profesiones_Nombre UNIQUE (Nombre)
    );
END
GO

IF COL_LENGTH('dbo.RRHH_Reclutamiento_Profesiones', 'AreaEstudio') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Profesiones ADD
        AreaEstudio NVARCHAR(100) NULL;
END
GO

IF COL_LENGTH('dbo.RRHH_Reclutamiento_Profesiones', 'CarreraGenerica') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Profesiones ADD
        CarreraGenerica NVARCHAR(150) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE object_id = OBJECT_ID('dbo.RRHH_Reclutamiento_Profesiones')
                 AND name = 'IX_Profesiones_AreaEstudio')
BEGIN
    CREATE INDEX IX_Profesiones_AreaEstudio ON dbo.RRHH_Reclutamiento_Profesiones (AreaEstudio);
END
GO

-- ---------------------------------------------------------------------
-- 3) Renglones "genéricos": niveles sin carrera concreta. El Nombre es
--    idéntico al Nivel a propósito (ver Models/Profesion.cs). Sin estas 3
--    filas, "Secundaria"/"Preparatoria"/"Diplomado" no tienen opción de
--    Profesión y el formulario no puede enviarse con esos niveles.
-- ---------------------------------------------------------------------
INSERT INTO dbo.RRHH_Reclutamiento_Profesiones (Nombre, Nivel)
SELECT v.Nombre, v.Nivel
FROM (VALUES
    (N'Secundaria', N'Secundaria'),
    (N'Preparatoria', N'Preparatoria'),
    (N'Diplomado', N'Diplomado')
) AS v(Nombre, Nivel)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.RRHH_Reclutamiento_Profesiones p WHERE p.Nombre = v.Nombre
);
GO

-- ---------------------------------------------------------------------
-- 4) Diagnóstico final: compara estos números contra el ambiente de
--    desarrollo. Si difieren, los Ids del catálogo NO coinciden entre
--    ambientes — ese es el motivo del error 500 en postulaciones cuando
--    el frontend y el INSERT llegan a backends distintos.
-- ---------------------------------------------------------------------
DECLARE @areas INT = (SELECT COUNT(*) FROM dbo.RRHH_Reclutamiento_Areas);
DECLARE @profesiones INT = (SELECT COUNT(*) FROM dbo.RRHH_Reclutamiento_Profesiones);
DECLARE @activas INT = (SELECT COUNT(*) FROM dbo.RRHH_Reclutamiento_Profesiones WHERE Activa = 1);

PRINT N'=== Diagnóstico de catálogos (' + DB_NAME() + N') ===';
PRINT CONCAT(N'Áreas: ', @areas, N' filas (esperado: 14)');
PRINT CONCAT(N'Profesiones: ', @profesiones, N' filas (', @activas, N' activas). En desarrollo deberían ser >1000; si hay muchas menos, falta correr AgregarCatalogoCarrerasSEP2022.sql en este ambiente.');
PRINT N'Ids de los renglones genéricos (anótalos para comparar con el otro ambiente):';

SELECT Id, Nombre, Nivel, Activa
FROM dbo.RRHH_Reclutamiento_Profesiones
WHERE Nombre IN (N'Secundaria', N'Preparatoria', N'Diplomado')
ORDER BY Id;
GO
