/*
    Script de creación de la tabla RRHH_Reclutamiento_Postulaciones.
    Motor: SQL Server (compatible con SQL Server Management Studio).

    Refleja el modelo Backend/Models/Postulacion.cs.

    NOTA: este script quedó superado por CreateTablasCuentas.sql, que ya
    incluye esta misma tabla (sección 1) junto con todas las demás hechas
    hasta CU-04. Se actualiza aquí únicamente para que el nombre de la
    tabla no quede desactualizado si alguien lo llegara a ejecutar, pero
    lo normal de aquí en adelante es usar solo CreateTablasCuentas.sql.

    IMPORTANTE: este script NO crea la base de datos ni la borra si ya
    existe — la base de datos (definida por DB_NAME en Backend/.env) es
    una base compartida con otros sistemas (nómina, contabilidad, etc.),
    así que este script solo agrega la tabla nueva si no existe todavía,
    sin tocar nada más de lo que ya haya ahí.

    Uso:
      1. Conéctate en SSMS a la base de datos indicada por DB_NAME en
         Backend/.env (revisa ese archivo, no lo compartas).
      2. Ejecuta este script completo (F5) en esa base de datos.
      3. Confirma que la tabla dbo.RRHH_Reclutamiento_Postulaciones
         se haya creado correctamente.
*/

IF OBJECT_ID(N'dbo.RRHH_Reclutamiento_Postulaciones', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RRHH_Reclutamiento_Postulaciones
    (
        Id                                  INT             IDENTITY(1,1) NOT NULL,
        Nombre                              NVARCHAR(100)   NOT NULL,
        ApellidoPaterno                     NVARCHAR(100)   NOT NULL,
        ApellidoMaterno                     NVARCHAR(100)   NOT NULL,
        Correo                              NVARCHAR(255)   NOT NULL,
        Estado                              NVARCHAR(100)   NOT NULL,
        Municipio                           NVARCHAR(100)   NOT NULL,
        Telefono                            NVARCHAR(20)    NOT NULL,
        MaximaFormacionAcademica            NVARCHAR(100)   NOT NULL,
        AreasInteres                        NVARCHAR(100)   NOT NULL,
        ExpectativasSalariales              NVARCHAR(50)    NOT NULL,
        CvFileName                          NVARCHAR(255)   NOT NULL,
        CvBytes                             VARBINARY(MAX)  NOT NULL,
        UltimoComprobanteEstudiosFileName   NVARCHAR(255)   NOT NULL,
        UltimoComprobanteEstudiosBytes      VARBINARY(MAX)  NOT NULL,
        CartaPresentacionFileName           NVARCHAR(255)   NULL,
        CartaPresentacionBytes              VARBINARY(MAX)  NULL,
        FechaRegistro                       DATETIME2       NOT NULL DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT PK_RRHH_Reclutamiento_Postulaciones PRIMARY KEY CLUSTERED (Id ASC),
        CONSTRAINT CK_RRHH_Reclutamiento_Postulaciones_Municipio
            CHECK (Municipio NOT LIKE '%[^A-Za-zÁÉÍÓÚáéíóúÑñÜü ]%')
    );

    -- Un índice independiente por cada campo que se use como filtro de
    -- búsqueda (ver la explicación de por qué no un solo índice compuesto
    -- en la conversación previa sobre este script).
    CREATE INDEX IX_RRHH_Reclutamiento_Postulaciones_FechaRegistro
        ON dbo.RRHH_Reclutamiento_Postulaciones (FechaRegistro DESC);
    CREATE INDEX IX_RRHH_Reclutamiento_Postulaciones_MaximaFormacionAcademica
        ON dbo.RRHH_Reclutamiento_Postulaciones (MaximaFormacionAcademica);
    CREATE INDEX IX_RRHH_Reclutamiento_Postulaciones_AreasInteres
        ON dbo.RRHH_Reclutamiento_Postulaciones (AreasInteres);
    CREATE INDEX IX_RRHH_Reclutamiento_Postulaciones_Municipio
        ON dbo.RRHH_Reclutamiento_Postulaciones (Municipio);
END
GO
