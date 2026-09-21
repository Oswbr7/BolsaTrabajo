-- =====================================================================
-- Agrega RRHH_Reclutamiento_Usuarios.EsCuentaDesarrollo
-- =====================================================================
-- Para una base de datos que ya tiene la tabla Usuarios creada (por una
-- entrega anterior de CreateTablasCuentas.sql). Idempotente: se puede
-- correr varias veces sin error.
--
-- Qué es: marca las cuentas creadas desde la opción "Crear cuenta de
-- desarrollo" del registro. El código de verificación de esas cuentas
-- siempre se manda por el canal de consola (nunca por Brevo/Vonage, aunque
-- estén configurados) y siempre se regresa en la respuesta del endpoint,
-- para poder probar el flujo de verificación sin depender de un correo o
-- SMS real. Esa opción solo puede activarse mientras el backend corre en
-- el entorno de Development — ver CuentasController.Registro.
-- =====================================================================

USE [LUCCA];
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.RRHH_Reclutamiento_Usuarios')
      AND name = 'EsCuentaDesarrollo'
)
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Usuarios
        ADD EsCuentaDesarrollo BIT NOT NULL CONSTRAINT DF_Usuarios_EsCuentaDesarrollo DEFAULT (0);
END
GO
