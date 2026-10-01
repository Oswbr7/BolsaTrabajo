/*
    Script de modificación de la tabla
    dbo.RRHH_Reclutamiento_DocumentosAspirante ya existente (creada con
    CreateTablasCuentas.sql, sección 12).

    Amplía el catálogo documental de CU-04 de siete a diez tipos, agregando
    tres "slots" nuevos (mismo criterio de "slot único" que los siete ya
    existentes: subir un archivo nuevo del mismo tipo reemplaza al vigente,
    sin perder la versión anterior). Refleja los cambios en
    Backend/Models/TipoDocumento.cs y Backend/Controllers/DocumentosController.cs:

        8  = ComprobanteDomicilio ("Comprobante de domicilio")
        9  = Curp                 ("CURP", como archivo — distinto del
                                    campo de texto Curp que ya existe en
                                    PerfilAspirante/Postulacion)
        10 = CedulaProfesional    ("Cédula profesional")

    Nota aparte sobre el tipo 2 (Rfc): en el frontend ahora se muestra como
    "Constancia de Situación Fiscal", pero es solo un cambio de etiqueta
    visible (Frontend/src/constants/documentos.js) — el nombre del enum, su
    valor numérico y todo lo que ya está guardado en esta tabla con
    TipoDocumento = 2 siguen exactamente igual. Esta tabla no necesita
    ningún cambio por ese punto.

    Lo único que se modifica aquí es la restricción CHECK que limitaba
    TipoDocumento a 1-7 (CK_DocumentosAspirante_TipoDocumento): se
    reemplaza por una que permite 1-10. No se agrega ninguna columna nueva
    porque los tres tipos nuevos usan exactamente las mismas columnas que
    los siete ya existentes.

    Es seguro volver a ejecutar este script: primero revisa si la
    restricción ya permite hasta el 10 antes de tocar nada.

    Uso:
      1. Conéctate en SSMS a la base de datos indicada por DB_NAME en
         Backend/.env.
      2. Ejecuta este script completo (F5).
      3. Confirma que CK_DocumentosAspirante_TipoDocumento ahora sea
         CHECK (TipoDocumento BETWEEN 1 AND 10).
*/

USE [LUCCA];
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_DocumentosAspirante_TipoDocumento'
      AND definition LIKE '%<=(10)%'
)
BEGIN
    IF EXISTS (
        SELECT 1 FROM sys.check_constraints WHERE name = 'CK_DocumentosAspirante_TipoDocumento'
    )
    BEGIN
        ALTER TABLE dbo.RRHH_Reclutamiento_DocumentosAspirante
            DROP CONSTRAINT CK_DocumentosAspirante_TipoDocumento;
    END

    ALTER TABLE dbo.RRHH_Reclutamiento_DocumentosAspirante WITH CHECK ADD CONSTRAINT
        CK_DocumentosAspirante_TipoDocumento CHECK (TipoDocumento BETWEEN 1 AND 10);

    ALTER TABLE dbo.RRHH_Reclutamiento_DocumentosAspirante
        CHECK CONSTRAINT CK_DocumentosAspirante_TipoDocumento;
END
GO
