-- =====================================================================
-- AgregarProfesionIdAEmpleados.sql
-- =====================================================================
-- Agrega la columna ProfesionId a dbo.Empleados (tabla existente, ajena a
-- este proyecto — no forma parte de RRHH_Reclutamiento_*) y le asigna un
-- número de profesión ALEATORIO (entre 1 y 200) a los primeros 300
-- registros de esa tabla, ordenados por su llave primaria.
--
-- OJO — esto es data de prueba: el ProfesionId que le toca a cada empleado
-- es aleatorio, no su profesión real. Sirve para tener datos con los que
-- probar cruces contra dbo.RRHH_Reclutamiento_Profesiones (por ejemplo, la
-- "parte 2" de conexionPerfilPuesto.md), no para reportes reales.
--
-- El script no conoce de antemano el nombre de la llave primaria de
-- Empleados, así que la detecta sola (sys.indexes / sys.index_columns) y
-- arma el UPDATE con SQL dinámico. Si Empleados no tiene llave primaria
-- definida, el script se detiene con un mensaje claro en vez de adivinar
-- una columna — en ese caso, dime cuál es la columna de orden correcta y
-- ajusto el script.
--
-- Idempotente:
--   - La columna solo se agrega si no existe (COL_LENGTH).
--   - El UPDATE siempre calcula el mismo conjunto fijo de "primeros 300"
--     (por PK, sin importar si ya tienen ProfesionId o no) pero solo
--     escribe en las filas que todavía tienen ProfesionId NULL — si ya
--     corriste el script antes, esas 300 no se vuelven a tocar ni cambian
--     de valor al volver a ejecutarlo.
--   - La FK hacia Profesiones se agrega solo si no existe ya.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Columna
-- ---------------------------------------------------------------------

IF OBJECT_ID(N'dbo.Empleados', N'U') IS NULL
BEGIN
    THROW 54230, 'No existe dbo.Empleados en esta base de datos.', 1;
END;
GO

IF COL_LENGTH(N'dbo.Empleados', N'ProfesionId') IS NULL
BEGIN
    ALTER TABLE [dbo].[Empleados] ADD [ProfesionId] INT NULL;
END;
GO

-- ---------------------------------------------------------------------
-- 2) Backfill aleatorio de los primeros 300 registros (por PK)
-- ---------------------------------------------------------------------

DECLARE @PkColumna SYSNAME;

SELECT TOP (1) @PkColumna = c.name
FROM sys.indexes i
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE i.object_id = OBJECT_ID(N'dbo.Empleados')
  AND i.is_primary_key = 1
ORDER BY ic.key_ordinal;

IF @PkColumna IS NULL
BEGIN
    THROW 54231, 'dbo.Empleados no tiene llave primaria detectable; no se puede determinar el orden de los "primeros 300 registros". Avisa cuál es la columna de orden correcta.', 1;
END;

DECLARE @Sql NVARCHAR(MAX) = N'
UPDATE [dbo].[Empleados]
SET [ProfesionId] = ABS(CHECKSUM(NEWID())) % 200 + 1
WHERE [ProfesionId] IS NULL
  AND ' + QUOTENAME(@PkColumna) + N' IN (
    SELECT TOP (300) ' + QUOTENAME(@PkColumna) + N'
    FROM [dbo].[Empleados]
    ORDER BY ' + QUOTENAME(@PkColumna) + N'
);';

EXEC sp_executesql @Sql;

PRINT CONCAT('Filas actualizadas en esta corrida: ', @@ROWCOUNT, ' (llave primaria usada: ', @PkColumna, ').');
GO

-- ---------------------------------------------------------------------
-- 3) Llave foránea hacia el catálogo de profesiones (opcional pero
--    recomendada: garantiza que ningún ProfesionId aleatorio apunte a un
--    Id que no exista en el catálogo).
-- ---------------------------------------------------------------------

IF OBJECT_ID(N'dbo.RRHH_Reclutamiento_Profesiones', N'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Empleados_Profesion')
BEGIN
    ALTER TABLE [dbo].[Empleados]
        ADD CONSTRAINT [FK_Empleados_Profesion] FOREIGN KEY ([ProfesionId])
        REFERENCES [dbo].[RRHH_Reclutamiento_Profesiones] ([Id]);
END;
GO
