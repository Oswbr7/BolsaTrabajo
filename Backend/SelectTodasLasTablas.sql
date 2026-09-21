/*
    Consulta rápida de las 10 tablas del módulo de Bolsa de Trabajo,
    hasta CU-04 + el cambio de UsuarioId en Postulaciones.

    Nota: en SQL Server el nombre de tabla no lleva comillas simples (esas
    son para literales de texto) — si necesitas delimitarlo, se usa con
    corchetes, p. ej. SELECT * FROM [dbo].[RRHH_Reclutamiento_Usuarios].
    Aquí no hace falta porque ningún nombre tiene espacios ni caracteres
    especiales.

    Motor: SQL Server (compatible con SQL Server Management Studio).
*/

USE [LUCCA];
GO

SELECT * FROM dbo.RRHH_Reclutamiento_Postulaciones;
GO

SELECT * FROM dbo.RRHH_Reclutamiento_Usuarios;
GO

SELECT * FROM dbo.RRHH_Reclutamiento_CodigosVerificacion;
GO

SELECT * FROM dbo.RRHH_Reclutamiento_IntentosAcceso;
GO

SELECT * FROM dbo.RRHH_Reclutamiento_PerfilesAspirante;
GO

SELECT * FROM dbo.RRHH_Reclutamiento_ExperienciaLaboral;
GO

SELECT * FROM dbo.RRHH_Reclutamiento_FormacionAcademica;
GO

SELECT * FROM dbo.RRHH_Reclutamiento_Habilidades;
GO

SELECT * FROM dbo.RRHH_Reclutamiento_HistorialPerfil;
GO

SELECT * FROM dbo.RRHH_Reclutamiento_DocumentosAspirante;
GO
