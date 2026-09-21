/*
    Script de modificación de la tabla dbo.RRHH_Reclutamiento_Postulaciones
    ya existente (creada con CreatePostulacionesTable.sql o
    CreateTablasCuentas.sql).

    *** ESTA TABLA YA HABÍA CAMBIADO UNA VEZ (INE/RFC/Acta/Habilidades) Y
    AHORA VUELVE A CAMBIAR: *** se agrega también una columna
    UsuarioId (NULL) con llave foránea hacia
    dbo.RRHH_Reclutamiento_Usuarios, para poder saber, cuando quien
    postula tiene sesión iniciada, qué cuenta mandó esa postulación. Sigue
    siendo NULL para quien postula sin cuenta — eso sigue siendo válido.
    Refleja los cambios en Backend/Models/Postulacion.cs y
    Backend/Controllers/PostulacionesController.cs (ver también la
    propuesta "Postulacion para Aspirantes con Sesion Iniciada.md").

    Motor: SQL Server (compatible con SQL Server Management Studio).

    Qué hace con las filas que ya existen: los tres documentos nuevos se
    agregan como NOT NULL, así que a las postulaciones que ya tenías
    (registradas antes de este cambio, cuando el formulario no pedía
    estos archivos) se les rellena automáticamente con un valor "vacío"
    (nombre de archivo en blanco, contenido de 0 bytes) mediante el
    DEFAULT de cada columna — no se inventa un archivo real, simplemente
    se deja constancia de que esa postulación no tiene ese documento
    cargado. Toda postulación nueva, de aquí en adelante, sí los trae
    siempre porque el backend los exige. UsuarioId, en cambio, se agrega
    como NULL sin DEFAULT: todas las filas que ya existen simplemente
    quedan sin cuenta asociada (correcto, porque se registraron antes de
    que existiera esta relación).

    Es seguro volver a ejecutar este script: cada bloque revisa primero
    si la columna ya existe (con COL_LENGTH) antes de agregarla.

    Uso:
      1. Conéctate en SSMS a la base de datos indicada por DB_NAME en
         Backend/.env.
      2. Ejecuta este script completo (F5).
      3. Confirma que dbo.RRHH_Reclutamiento_Postulaciones ya tenga las
         columnas IneFileName, IneBytes, RfcFileName, RfcBytes,
         ActaNacimientoFileName, ActaNacimientoBytes, HabilidadesClave y
         UsuarioId.
*/

USE [LUCCA];
GO

IF COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'IneFileName') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones ADD
        IneFileName    NVARCHAR(255)  NOT NULL CONSTRAINT DF_Postulaciones_IneFileName DEFAULT (''),
        IneBytes       VARBINARY(MAX) NOT NULL CONSTRAINT DF_Postulaciones_IneBytes DEFAULT (0x);
END
GO

IF COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'RfcFileName') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones ADD
        RfcFileName    NVARCHAR(255)  NOT NULL CONSTRAINT DF_Postulaciones_RfcFileName DEFAULT (''),
        RfcBytes       VARBINARY(MAX) NOT NULL CONSTRAINT DF_Postulaciones_RfcBytes DEFAULT (0x);
END
GO

IF COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'ActaNacimientoFileName') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones ADD
        ActaNacimientoFileName NVARCHAR(255)  NOT NULL CONSTRAINT DF_Postulaciones_ActaNacimientoFileName DEFAULT (''),
        ActaNacimientoBytes    VARBINARY(MAX) NOT NULL CONSTRAINT DF_Postulaciones_ActaNacimientoBytes DEFAULT (0x);
END
GO

IF COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'HabilidadesClave') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones ADD
        HabilidadesClave NVARCHAR(1000) NULL;
END
GO

IF COL_LENGTH('dbo.RRHH_Reclutamiento_Postulaciones', 'UsuarioId') IS NULL
BEGIN
    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones ADD
        UsuarioId INT NULL;

    ALTER TABLE dbo.RRHH_Reclutamiento_Postulaciones ADD CONSTRAINT
        FK_Postulaciones_Usuarios FOREIGN KEY (UsuarioId)
            REFERENCES dbo.RRHH_Reclutamiento_Usuarios (Id)
            ON DELETE SET NULL;

    CREATE INDEX IX_Postulaciones_UsuarioId ON dbo.RRHH_Reclutamiento_Postulaciones (UsuarioId);
END
GO
