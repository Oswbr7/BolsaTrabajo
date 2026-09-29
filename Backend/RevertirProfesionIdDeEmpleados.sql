-- =====================================================================
-- RevertirProfesionIdDeEmpleados.sql
-- =====================================================================
-- Reversa completa de AgregarProfesionIdAEmpleados.sql: quita la columna
-- ProfesionId de dbo.Empleados (tabla existente, ajena a este proyecto)
-- y la llave foránea que la acompañaba.
--
-- OJO: esto BORRA los valores de ProfesionId que tengan las filas de
-- Empleados en este momento (los 300 aleatorios que puso el script
-- original, o los que sean si ya se modificaron a mano). Como el script
-- original los generó con datos de prueba aleatorios, no hay nada real
-- que se pierda — pero si mientras tanto se usó esta columna para algo
-- más, avísame antes de correr esto.
--
-- Idempotente: puedes ejecutarlo las veces que haga falta, incluso si ya
-- se corrió antes o si la columna/llave foránea nunca llegó a crearse.
--
-- Uso:
--   1. Conéctate en SSMS a la base de datos indicada por DB_NAME en
--      Backend/.env (LUCCA).
--   2. Ejecuta este script completo (F5).
-- =====================================================================

IF OBJECT_ID(N'dbo.Empleados', N'U') IS NULL
BEGIN
    THROW 54232, 'No existe dbo.Empleados en esta base de datos.', 1;
END;
GO

-- ---------------------------------------------------------------------
-- Paso 1: llave foránea hacia el catálogo de profesiones (hay que
-- quitarla antes de poder quitar la columna).
-- ---------------------------------------------------------------------

IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Empleados_Profesion')
BEGIN
    ALTER TABLE [dbo].[Empleados] DROP CONSTRAINT [FK_Empleados_Profesion];
END;
GO

-- ---------------------------------------------------------------------
-- Paso 2: columna
-- ---------------------------------------------------------------------

IF COL_LENGTH(N'dbo.Empleados', N'ProfesionId') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[Empleados] DROP COLUMN [ProfesionId];
END;
GO
