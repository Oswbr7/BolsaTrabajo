/*
    Script: catálogo compartido de áreas (dbo.RRHH_Reclutamiento_Areas) +
    migración de dbo.RRHH_Reclutamiento_Postulaciones para usar AreaId
    en vez de texto libre en AreasInteres.

    Contexto: "Plan de Flujo - Filtrado de Postulantes por Area en
    SIATEC.md". Esta es la misma tabla que SIATEC va a usar del lado de
    Puestos (agregando su propio AreaId con FK a esta tabla) para poder
    filtrar candidatos por área de interés — ambas plataformas comparten
    esta base de datos, así que basta con que las dos apunten al mismo
    catálogo, sin ninguna API de por medio.

    *** ESTE SCRIPT MODIFICA dbo.RRHH_Reclutamiento_Postulaciones ***:
    agrega la columna AreaId (NULL al inicio, con FK hacia el catálogo
    nuevo) y la rellena para las postulaciones que ya existen, buscando
    coincidencia por nombre entre el texto viejo de AreasInteres y el
    catálogo nuevo. AreasInteres NO se elimina: se queda como columna
    histórica y, de aquí en adelante, el backend la sigue llenando
    automáticamente con el nombre del área elegida (para no romper nada
    que ya la lea), pero deja de ser la fuente de verdad — eso pasa a
    ser AreaId.

    Motor: SQL Server (compatible con SQL Server Management Studio).
    Es seguro volver a ejecutar este script completo las veces que haga
    falta: cada bloque revisa primero si ya se hizo antes de repetirlo.

    Uso:
      1. Conéctate en SSMS a la base de datos indicada por DB_NAME en
         Backend/.env (LUCCA).
      2. Ejecuta este script completo (F5).
      3. Revisa el mensaje final: dice cuántas postulaciones existentes
         quedaron sin AreaId asignado (porque su texto viejo de
         AreasInteres no coincidió con ningún nombre del catálogo nuevo)
         para que las revises a mano si hace falta.
*/

USE [LUCCA];
GO

-- 1) Catálogo de áreas.
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

-- 2) Semillas: lista definitiva confirmada (incluye Salud). Solo se
--    inserta lo que todavía no exista, para poder correr esto varias
--    veces sin duplicar ni pisar ediciones manuales que se hayan hecho
--    después (por ejemplo, si alguien desactivó un área con Activa=0).
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

-- 3) Columna AreaId en Postulaciones (FK al catálogo nuevo).
IF COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'AreaId') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones ADD
        AreaId INT NULL;

    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones ADD CONSTRAINT
        FK_Postulaciones_Areas FOREIGN KEY (AreaId)
            REFERENCES dbo.RRHH_Reclutamiento_Areas (Id);

    CREATE INDEX IX_Postulaciones_AreaId ON dbo.RRHH_Reclutamiento_Postulaciones (AreaId);
END
GO

-- 4) Migración de las postulaciones que ya existen: se asigna AreaId
--    buscando coincidencia exacta de nombre entre el texto viejo de
--    AreasInteres y el catálogo nuevo. "Informática" (nombre viejo) se
--    mapea a "Tecnologías de la Información" (nombre nuevo) porque el
--    catálogo lo renombró; el resto de los nombres viejos coincide tal
--    cual con el catálogo nuevo. Solo toca filas que todavía no tienen
--    AreaId, así que también es seguro volver a correrlo.
UPDATE p
SET p.AreaId = a.Id
FROM dbo.RRHH_Reclutamiento_Postulaciones p
JOIN dbo.RRHH_Reclutamiento_Areas a
    ON a.Nombre = CASE p.AreasInteres
                      WHEN N'Informática' THEN N'Tecnologías de la Información'
                      ELSE p.AreasInteres
                  END
WHERE p.AreaId IS NULL;
GO

-- 5) Aviso final: cuántas postulaciones quedaron sin AreaId (su texto
--    viejo no coincidió con nada del catálogo nuevo) para revisarlas a
--    mano si hace falta.
DECLARE @sinArea INT = (SELECT COUNT(*) FROM dbo.RRHH_Reclutamiento_Postulaciones WHERE AreaId IS NULL);
IF @sinArea > 0
    PRINT CONCAT(N'Aviso: quedaron ', @sinArea, N' postulación(es) sin AreaId asignado. Revísalas a mano (probablemente su AreasInteres viejo no coincide con ningún nombre del catálogo).');
ELSE
    PRINT N'Listo: todas las postulaciones existentes quedaron con AreaId asignado.';
GO
