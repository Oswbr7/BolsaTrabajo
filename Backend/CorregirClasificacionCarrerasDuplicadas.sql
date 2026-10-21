-- =====================================================================================================
-- CorregirClasificacionCarrerasDuplicadas.sql
--
-- CONTEXTO
-- -------
-- AgregarAreaEstudioYCarreraGenerica.sql agrego las columnas AreaEstudio y
-- CarreraGenerica al catalogo dbo.RRHH_Reclutamiento_Profesiones (ver
-- Models/Profesion.cs). Al revisar ese script carrera por carrera se encontraron
-- 32 casos donde EL MISMO NOMBRE DE CARRERA aparece dos veces en el catalogo --
-- una vez escrito CON acentos y otra vez SIN acentos (o con alguna variante menor
-- de puntuacion) -- y cada aparicion quedo clasificada con una CarreraGenerica
-- distinta (en 6 de los 32 casos, tambien con un AreaEstudio distinto).
--
-- El caso que origino esta revision fue el que reporto el usuario: "Contaduria
-- Publica" (sin acentos) quedo en CarreraGenerica = 'Contaduria', mientras que
-- "Contaduria Publica" CON acentos quedo en CarreraGenerica = 'Administracion'.
-- Por eso un aspirante con "Licenciatura en Contaduria" (CarreraGenerica =
-- 'Contaduria') no empataba en "Para ti" con una vacante que pedia la variante
-- acentuada de "Contaduria Publica" -- son, en los hechos, DOS renglones
-- distintos (dos ProfesionId distintos) para lo que deberia ser la misma carrera.
--
-- QUE HACE ESTE SCRIPT (y que NO hace)
-- ------------------------------------
-- PARTE 1: Diagnostico de solo lectura (SELECT). Muestra el estado VIVO de los
--          64 nombres involucrados en tu base de datos real -- incluyendo cuantas
--          FormacionAcademica, PerfilesPuesto_Escolaridades y Postulaciones ya
--          hacen referencia a cada ProfesionId -- para que puedas ver el impacto
--          real ANTES de decidir si corregir algo. Esto es seguro de ejecutar en
--          cualquier momento, no modifica nada.
--
-- PARTE 2: Un bloque de UPDATE comentado por caso (64 opciones en total, 2 por
--          caso). NINGUN UPDATE se ejecuta por defecto -- estan comentados a
--          proposito. Cada UPDATE solo toca las columnas AreaEstudio y
--          CarreraGenerica de UN renglon ya existente (identificado por su Nombre
--          exacto) para alinearlo con la clasificacion del otro renglon del par.
--          Nunca borra, nunca mueve ProfesionId, nunca toca FormacionAcademica,
--          Postulaciones ni PerfilesPuesto_Escolaridades -- esas tablas siguen
--          apuntando al mismo Id de siempre, solo cambia como se clasifica ese Id.
--
-- COMO USARLO
-- -----------
-- 1) Corre la PARTE 1 primero y revisa los resultados: confirma que el nombre que
--    tu base de datos usa de verdad sea el que esperas, y mira la columna de
--    conteos para entender si ya hay formaciones academicas o perfiles de puesto
--    usando alguno de los dos renglones del par.
-- 2) Para cada caso que te interese corregir, elige UNA de las dos opciones
--    (dejar la variante SIN acentos como esta y actualizar la CON acentos, o al
--    reves) y descomenta solo esa UPDATE. La eleccion de cual variante es la
--    'correcta' es una decision de negocio (que tan fiel quieras ser a la
--    clasificacion original de SEP 2022) que no puedo tomar por ti -- por eso se
--    dejan ambas opciones en vez de una sola.
-- 3) Varios casos tienen una nota adicional (marcada con [NOTA]) senalando algo
--    que vale la pena revisar con mas cuidado antes de aplicar el cambio (por
--    ejemplo, cuando el Nivel tambien difiere, lo que podria significar que son
--    dos carreras distintas y no un duplicado real).
-- 4) Este script NO se ejecuta solo -- es para que tu lo corras manualmente en
--    SSMS cuando decidas que lo necesitas, caso por caso.
--
-- METODOLOGIA
-- -----------
-- Los 32 casos se encontraron por analisis estatico del archivo
-- AgregarAreaEstudioYCarreraGenerica.sql (las VALUES de sus bloques INSERT y
-- UPDATE), agrupando nombres que son iguales al quitarles acentos/mayusculas.
-- Esto refleja lo que ESE SCRIPT pondria en una instalacion nueva -- no es una
-- consulta en vivo contra tu base de datos (por eso la PARTE 1 de abajo si lo es:
-- para que compares contra la realidad antes de tocar nada).
-- =====================================================================================================

SET NOCOUNT ON;

-- =====================================================================================================
-- PARTE 1: DIAGNOSTICO (solo lectura, segura de ejecutar en cualquier momento)
-- =====================================================================================================

-- 1a) Estado vivo de los 64 nombres involucrados en los 32 casos.
SELECT
    p.Id,
    p.Nombre,
    p.Nivel,
    p.AreaEstudio,
    p.CarreraGenerica,
    p.Activa
FROM dbo.RRHH_Reclutamiento_Profesiones AS p
WHERE p.Nombre IN (
    N'Agronomo Administrador',
    N'Agrónomo Administrador',
    N'Archivonomía',
    N'Archivonomia',
    N'Ciencias Atmosfericas',
    N'Ciencias Atmosféricas',
    N'Ciencias y Tecnicas de la Comunicacion',
    N'Ciencias y Técnicas de la Comunicación',
    N'Comercialización Internacional',
    N'Comercializacion Internacional',
    N'Comunicación',
    N'Comunicacion',
    N'Comunicaciones y Electronica',
    N'Comunicaciones y Electrónica',
    N'Contaduria Publica',
    N'Contaduría Pública',
    N'Diseño Grafico',
    N'Diseño Gráfico',
    N'Electrica',
    N'Eléctrica',
    N'Estudios de Poblacion',
    N'Estudios de Población',
    N'Fisico Matematico',
    N'Físico Matemático',
    N'Geofísica',
    N'Geofisica',
    N'Geotécnia',
    N'Geotecnia',
    N'Gestion y Administracion Publica',
    N'Gestión y Administración Pública',
    N'Hidráulica',
    N'Hidraulica',
    N'Hidrobiología',
    N'Hidrobiologia',
    N'Industrial para la Direccion',
    N'Industrial para la Dirección',
    N'Ingenieria Ambiental',
    N'Ingeniería Ambiental',
    N'Ingenieria Civil',
    N'Ingeniería Civil',
    N'Ingenieria Civil en Construccion Urbana',
    N'Ingenieria Civil en Construcción Urbana',
    N'Ingenieria en Energias Renovables',
    N'Ingeniería en Energías Renovables',
    N'Ingenieria en Gestion Empresarial',
    N'Ingeniería en Gestión Empresarial',
    N'Ingenieria en Informatica',
    N'Ingenieria en Informática',
    N'Ingenieria Quimica',
    N'Ingeniería Química',
    N'Mecánica',
    N'Mecanica',
    N'Politicas Publicas',
    N'Políticas Públicas',
    N'Psicología Organizacional',
    N'Psicologia Organizacional',
    N'Relaciones Economicas Internacionales',
    N'Relaciones Económicas Internacionales',
    N'Relaciones Turísticas',
    N'Relaciones Turisticas',
    N'Restauracion de Bienes Muebles',
    N'Restauración de Bienes Muebles',
    N'Sociología',
    N'Sociologia'
)
ORDER BY p.Nombre;

-- 1b) Para los que SI existen en tu base, cuantos registros de otras tablas ya
--     apuntan a cada ProfesionId -- para medir el impacto de cada posible cambio
--     (ninguno de estos conteos se modifica con los UPDATE de la Parte 2, es solo
--     informativo).
SELECT
    p.Id,
    p.Nombre,
    p.CarreraGenerica,
    (SELECT COUNT(*) FROM dbo.RRHH_Reclutamiento_FormacionAcademica fa WHERE fa.ProfesionId = p.Id) AS EnFormacionAcademica,
    (SELECT COUNT(*) FROM dbo.RRHH_Reclutamiento_PerfilesPuesto_Escolaridades pe WHERE pe.ProfesionId = p.Id) AS EnPerfilesPuestoEscolaridad,
    (SELECT COUNT(*) FROM dbo.RRHH_Reclutamiento_Postulaciones po WHERE po.ProfesionId = p.Id) AS EnPostulaciones
FROM dbo.RRHH_Reclutamiento_Profesiones AS p
WHERE p.Nombre IN (
    N'Agronomo Administrador',
    N'Agrónomo Administrador',
    N'Archivonomía',
    N'Archivonomia',
    N'Ciencias Atmosfericas',
    N'Ciencias Atmosféricas',
    N'Ciencias y Tecnicas de la Comunicacion',
    N'Ciencias y Técnicas de la Comunicación',
    N'Comercialización Internacional',
    N'Comercializacion Internacional',
    N'Comunicación',
    N'Comunicacion',
    N'Comunicaciones y Electronica',
    N'Comunicaciones y Electrónica',
    N'Contaduria Publica',
    N'Contaduría Pública',
    N'Diseño Grafico',
    N'Diseño Gráfico',
    N'Electrica',
    N'Eléctrica',
    N'Estudios de Poblacion',
    N'Estudios de Población',
    N'Fisico Matematico',
    N'Físico Matemático',
    N'Geofísica',
    N'Geofisica',
    N'Geotécnia',
    N'Geotecnia',
    N'Gestion y Administracion Publica',
    N'Gestión y Administración Pública',
    N'Hidráulica',
    N'Hidraulica',
    N'Hidrobiología',
    N'Hidrobiologia',
    N'Industrial para la Direccion',
    N'Industrial para la Dirección',
    N'Ingenieria Ambiental',
    N'Ingeniería Ambiental',
    N'Ingenieria Civil',
    N'Ingeniería Civil',
    N'Ingenieria Civil en Construccion Urbana',
    N'Ingenieria Civil en Construcción Urbana',
    N'Ingenieria en Energias Renovables',
    N'Ingeniería en Energías Renovables',
    N'Ingenieria en Gestion Empresarial',
    N'Ingeniería en Gestión Empresarial',
    N'Ingenieria en Informatica',
    N'Ingenieria en Informática',
    N'Ingenieria Quimica',
    N'Ingeniería Química',
    N'Mecánica',
    N'Mecanica',
    N'Politicas Publicas',
    N'Políticas Públicas',
    N'Psicología Organizacional',
    N'Psicologia Organizacional',
    N'Relaciones Economicas Internacionales',
    N'Relaciones Económicas Internacionales',
    N'Relaciones Turísticas',
    N'Relaciones Turisticas',
    N'Restauracion de Bienes Muebles',
    N'Restauración de Bienes Muebles',
    N'Sociología',
    N'Sociologia'
)
ORDER BY p.Nombre;

-- =====================================================================================================
-- PARTE 2: CORRECCIONES SUGERIDAS (32 casos, 2 opciones cada uno -- TODO comentado
--          por defecto; descomenta UNA opcion por caso, solo para los casos que
--          decidas corregir)
-- =====================================================================================================

-- --------------------------------------------------------------------------------------------------
-- CASO 1: 'Agronomo Administrador' / 'Agrónomo Administrador'
--   Variante A: Nombre='Agronomo Administrador'  Nivel=Licenciatura  AreaEstudio='Ciencias Agropecuarias'  CarreraGenerica='Agronomia'
--   Variante B: Nombre='Agrónomo Administrador'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Administracion'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ciencias Agropecuarias', CarreraGenerica = N'Agronomia'
--  WHERE Nombre = N'Agrónomo Administrador';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Administracion'
 WHERE Nombre = N'Agronomo Administrador';

-- --------------------------------------------------------------------------------------------------
-- CASO 2: 'Archivonomía' / 'Archivonomia'
--   Variante A: Nombre='Archivonomía'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Archivonomía'
--   Variante B: Nombre='Archivonomia'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Biblioteconomia'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Archivonomía'
 WHERE Nombre = N'Archivonomia';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Biblioteconomia'
--  WHERE Nombre = N'Archivonomía';

-- --------------------------------------------------------------------------------------------------
-- CASO 3: 'Ciencias Atmosfericas' / 'Ciencias Atmosféricas'
--   Variante A: Nombre='Ciencias Atmosfericas'  Nivel=Licenciatura  AreaEstudio='Ciencias Naturales y Exactas'  CarreraGenerica='Biologia'
--   Variante B: Nombre='Ciencias Atmosféricas'  Nivel=Licenciatura  AreaEstudio='Ciencias Naturales y Exactas'  CarreraGenerica='Ciencias Atmosféricas'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ciencias Naturales y Exactas', CarreraGenerica = N'Biologia'
--  WHERE Nombre = N'Ciencias Atmosféricas';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ciencias Naturales y Exactas', CarreraGenerica = N'Ciencias Atmosféricas'
 WHERE Nombre = N'Ciencias Atmosfericas';

-- --------------------------------------------------------------------------------------------------
-- CASO 4: 'Ciencias y Tecnicas de la Comunicacion' / 'Ciencias y Técnicas de la Comunicación'
--   Variante A: Nombre='Ciencias y Tecnicas de la Comunicacion'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Ciencias y Tecnicas de la Comunicacion'
--   Variante B: Nombre='Ciencias y Técnicas de la Comunicación'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Comunicacion'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Ciencias y Tecnicas de la Comunicacion'
--  WHERE Nombre = N'Ciencias y Técnicas de la Comunicación';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Comunicacion'
 WHERE Nombre = N'Ciencias y Tecnicas de la Comunicacion';

-- --------------------------------------------------------------------------------------------------
-- CASO 5: 'Comercialización Internacional' / 'Comercializacion Internacional'
--   Variante A: Nombre='Comercialización Internacional'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Comercio Internacional'
--   Variante B: Nombre='Comercializacion Internacional'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Mercadotecnia y Comercio'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Comercio Internacional'
 WHERE Nombre = N'Comercializacion Internacional';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Mercadotecnia y Comercio'
--  WHERE Nombre = N'Comercialización Internacional';

-- --------------------------------------------------------------------------------------------------
-- CASO 6: 'Comunicación' / 'Comunicacion'
--   Variante A: Nombre='Comunicación'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Comunicacion'
--   Variante B: Nombre='Comunicacion'  Nivel=Licenciatura  AreaEstudio='Educacion y Humanidades'  CarreraGenerica='Educacion'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Comunicacion'
 WHERE Nombre = N'Comunicacion';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Educacion y Humanidades', CarreraGenerica = N'Educacion'
--  WHERE Nombre = N'Comunicación';

-- --------------------------------------------------------------------------------------------------
-- CASO 7: 'Comunicaciones y Electronica' / 'Comunicaciones y Electrónica'
--   Variante A: Nombre='Comunicaciones y Electronica'  Nivel=Ingeniería  AreaEstudio='Ingenieria y Tecnologia'  CarreraGenerica='Electrica y Electronica'
--   Variante B: Nombre='Comunicaciones y Electrónica'  Nivel=Ingeniería  AreaEstudio='Ingenieria y Tecnologia'  CarreraGenerica='Ingenieria'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ingenieria y Tecnologia', CarreraGenerica = N'Electrica y Electronica'
--  WHERE Nombre = N'Comunicaciones y Electrónica';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ingenieria y Tecnologia', CarreraGenerica = N'Ingenieria'
 WHERE Nombre = N'Comunicaciones y Electronica';

-- --------------------------------------------------------------------------------------------------
-- CASO 8: 'Contaduria Publica' / 'Contaduría Pública'
--   Variante A: Nombre='Contaduria Publica'  Nivel=Licenciatura  AreaEstudio='Ciencias Naturales y Exactas'  CarreraGenerica='Contaduria'
--   Variante B: Nombre='Contaduría Pública'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Administracion'
--   [NOTA] Caso original reportado por el usuario. Nota: AreaEstudio de 'Contaduria Publica' (Ciencias Naturales y Exactas) tampoco coincide con el resto del grupo 'Contaduria' (que normalmente cae en Ciencias Sociales y Administrativas) -- revisar con cuidado.
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ciencias Naturales y Exactas', CarreraGenerica = N'Contaduria'
 WHERE Nombre = N'Contaduría Pública';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Administracion'
--  WHERE Nombre = N'Contaduria Publica';

-- --------------------------------------------------------------------------------------------------
-- CASO 9: 'Diseño Grafico' / 'Diseño Gráfico'
--   Variante A: Nombre='Diseño Grafico'  Nivel=Licenciatura  AreaEstudio='Educacion y Humanidades'  CarreraGenerica='Artes'
--   Variante B: Nombre='Diseño Gráfico'  Nivel=Ingeniería  AreaEstudio='Ingenieria y Tecnologia'  CarreraGenerica='Diseño Gráfico'
--   [NOTA] Aquí también difiere el Nivel (Licenciatura vs Ingeniería) -- probablemente sean dos carreras legítimamente distintas (una Licenciatura en Artes/Diseño y una Ingeniería en Diseño Gráfico), no necesariamente un duplicado por acentos. Revisar con más cuidado que los demás casos antes de unificar.
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Educacion y Humanidades', CarreraGenerica = N'Artes'
--  WHERE Nombre = N'Diseño Gráfico';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ingenieria y Tecnologia', CarreraGenerica = N'Diseño Gráfico'
 WHERE Nombre = N'Diseño Grafico';

-- --------------------------------------------------------------------------------------------------
-- CASO 10: 'Electrica' / 'Eléctrica'
--   Variante A: Nombre='Electrica'  Nivel=Ingeniería  AreaEstudio='Ingenieria y Tecnologia'  CarreraGenerica='Electrica y Electronica'
--   Variante B: Nombre='Eléctrica'  Nivel=Ingeniería  AreaEstudio='Ingenieria y Tecnologia'  CarreraGenerica='Ingenieria'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ingenieria y Tecnologia', CarreraGenerica = N'Electrica y Electronica'
--  WHERE Nombre = N'Eléctrica';
--
Opcion 2: alinear A hacia B (A toma la clasificacion de B)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ingenieria y Tecnologia', CarreraGenerica = N'Ingenieria'
 WHERE Nombre = N'Electrica';

-- --------------------------------------------------------------------------------------------------
-- CASO 11: 'Estudios de Poblacion' / 'Estudios de Población'
--   Variante A: Nombre='Estudios de Poblacion'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Ciencias Sociales'
--   Variante B: Nombre='Estudios de Población'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Estudios de Población'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Ciencias Sociales'
 WHERE Nombre = N'Estudios de Población';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Estudios de Población'
--  WHERE Nombre = N'Estudios de Poblacion';

-- --------------------------------------------------------------------------------------------------
-- CASO 12: 'Fisico Matematico' / 'Físico Matemático'
--   Variante A: Nombre='Fisico Matematico'  Nivel=Licenciatura  AreaEstudio='Ciencias Naturales y Exactas'  CarreraGenerica='Fisica'
--   Variante B: Nombre='Físico Matemático'  Nivel=Licenciatura  AreaEstudio='Ciencias Naturales y Exactas'  CarreraGenerica='Físico Matemático'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ciencias Naturales y Exactas', CarreraGenerica = N'Fisica'
 WHERE Nombre = N'Físico Matemático';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ciencias Naturales y Exactas', CarreraGenerica = N'Físico Matemático'
--  WHERE Nombre = N'Fisico Matematico';

-- --------------------------------------------------------------------------------------------------
-- CASO 13: 'Geofísica' / 'Geofisica'
--   Variante A: Nombre='Geofísica'  Nivel=Ingeniería  AreaEstudio='Ingenieria y Tecnologia'  CarreraGenerica='Geografia'
--   Variante B: Nombre='Geofisica'  Nivel=Ingeniería  AreaEstudio='Ingenieria y Tecnologia'  CarreraGenerica='Ingenieria'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ingenieria y Tecnologia', CarreraGenerica = N'Geografia'
--  WHERE Nombre = N'Geofisica';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ingenieria y Tecnologia', CarreraGenerica = N'Ingenieria'
 WHERE Nombre = N'Geofísica';

-- --------------------------------------------------------------------------------------------------
-- CASO 14: 'Geotécnia' / 'Geotecnia'
--   Variante A: Nombre='Geotécnia'  Nivel=Ingeniería  AreaEstudio='Ingenieria y Tecnologia'  CarreraGenerica='Geotécnia'
--   Variante B: Nombre='Geotecnia'  Nivel=Ingeniería  AreaEstudio='Ingenieria y Tecnologia'  CarreraGenerica='Ingenieria'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ingenieria y Tecnologia', CarreraGenerica = N'Geotécnia'
--  WHERE Nombre = N'Geotecnia';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ingenieria y Tecnologia', CarreraGenerica = N'Ingenieria'
 WHERE Nombre = N'Geotécnia';

-- --------------------------------------------------------------------------------------------------
-- CASO 15: 'Gestion y Administracion Publica' / 'Gestión y Administración Pública'
--   Variante A: Nombre='Gestion y Administracion Publica'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Administracion'
--   Variante B: Nombre='Gestión y Administración Pública'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Ciencias Politicas y Administracion Publica'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Administracion'
 WHERE Nombre = N'Gestión y Administración Pública';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Ciencias Politicas y Administracion Publica'
--  WHERE Nombre = N'Gestion y Administracion Publica';

-- --------------------------------------------------------------------------------------------------
-- CASO 16: 'Hidráulica' / 'Hidraulica'
--   Variante A: Nombre='Hidráulica'  Nivel=Ingeniería  AreaEstudio='Ingenieria y Tecnologia'  CarreraGenerica='Hidráulica'
--   Variante B: Nombre='Hidraulica'  Nivel=Ingeniería  AreaEstudio='Ingenieria y Tecnologia'  CarreraGenerica='Ingenieria'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ingenieria y Tecnologia', CarreraGenerica = N'Hidráulica'
--  WHERE Nombre = N'Hidraulica';
--
Opcion 2: alinear A hacia B (A toma la clasificacion de B)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ingenieria y Tecnologia', CarreraGenerica = N'Ingenieria'
 WHERE Nombre = N'Hidráulica';

-- --------------------------------------------------------------------------------------------------
-- CASO 17: 'Hidrobiología' / 'Hidrobiologia'
--   Variante A: Nombre='Hidrobiología'  Nivel=Licenciatura  AreaEstudio='Ciencias Agropecuarias'  CarreraGenerica='Biologia'
--   Variante B: Nombre='Hidrobiologia'  Nivel=Licenciatura  AreaEstudio='Ciencias Naturales y Exactas'  CarreraGenerica='Hidrobiologia'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ciencias Agropecuarias', CarreraGenerica = N'Biologia'
--  WHERE Nombre = N'Hidrobiologia';
--
Opcion 2: alinear A hacia B (A toma la clasificacion de B)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ciencias Naturales y Exactas', CarreraGenerica = N'Hidrobiologia'
 WHERE Nombre = N'Hidrobiología';

-- --------------------------------------------------------------------------------------------------
-- CASO 18: 'Industrial para la Direccion' / 'Industrial para la Dirección'
--   Variante A: Nombre='Industrial para la Direccion'  Nivel=Ingeniería  AreaEstudio='Ingenieria y Tecnologia'  CarreraGenerica='Ingenieria'
--   Variante B: Nombre='Industrial para la Dirección'  Nivel=Ingeniería  AreaEstudio='Ingenieria y Tecnologia'  CarreraGenerica='Ingeniería Industrial'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ingenieria y Tecnologia', CarreraGenerica = N'Ingenieria'
--  WHERE Nombre = N'Industrial para la Dirección';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ingenieria y Tecnologia', CarreraGenerica = N'Ingeniería Industrial'
 WHERE Nombre = N'Industrial para la Direccion';

-- --------------------------------------------------------------------------------------------------
-- CASO 19: 'Ingenieria Ambiental' / 'Ingeniería Ambiental'
--   Variante A: Nombre='Ingenieria Ambiental'  Nivel=Ingeniería  AreaEstudio='Ingenieria y Tecnologia'  CarreraGenerica='Ingenieria Ambiental'
--   Variante B: Nombre='Ingeniería Ambiental'  Nivel=(sin especificar -- bloque UPDATE que aplica por Nombre, no por Nivel)  AreaEstudio='Ingeniería y Tecnología'  CarreraGenerica='Ingeniería Ambiental'
--   [NOTA] El renglón con acentos viene de un bloque UPDATE (sin Nivel, filtra solo por Nombre) -- probablemente pensado para clasificar un registro que ya existía con ese nombre acentuado en bases de datos previas, no para crear uno nuevo. Nota también la ligera diferencia de ortografía en AreaEstudio ('Ingenieria y Tecnologia' vs 'Ingeniería y Tecnología') -- mismo valor, dos formas de escribirlo en el catálogo.
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ingenieria y Tecnologia', CarreraGenerica = N'Ingenieria Ambiental'
 WHERE Nombre = N'Ingeniería Ambiental';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ingeniería y Tecnología', CarreraGenerica = N'Ingeniería Ambiental'
--  WHERE Nombre = N'Ingenieria Ambiental';

-- --------------------------------------------------------------------------------------------------
-- CASO 20: 'Ingenieria Civil' / 'Ingeniería Civil'
--   Variante A: Nombre='Ingenieria Civil'  Nivel=Ingeniería  AreaEstudio='Ingenieria y Tecnologia'  CarreraGenerica='Ingenieria'
--   Variante B: Nombre='Ingeniería Civil'  Nivel=(sin especificar -- bloque UPDATE que aplica por Nombre, no por Nivel)  AreaEstudio='Ingeniería y Tecnología'  CarreraGenerica='Ingeniería Civil'
--   [NOTA] Mismo patrón que 'Ingenieria Ambiental' arriba: el renglón acentuado viene de un bloque UPDATE sin Nivel.
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ingenieria y Tecnologia', CarreraGenerica = N'Ingenieria'
 WHERE Nombre = N'Ingeniería Civil';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ingeniería y Tecnología', CarreraGenerica = N'Ingeniería Civil'
--  WHERE Nombre = N'Ingenieria Civil';

-- --------------------------------------------------------------------------------------------------
-- CASO 21: 'Ingenieria Civil en Construccion Urbana' / 'Ingenieria Civil en Construcción Urbana'
--   Variante A: Nombre='Ingenieria Civil en Construccion Urbana'  Nivel=Ingeniería  AreaEstudio='Ingenieria y Tecnologia'  CarreraGenerica='Ingenieria'
--   Variante B: Nombre='Ingenieria Civil en Construcción Urbana'  Nivel=Ingeniería  AreaEstudio='Ingenieria y Tecnologia'  CarreraGenerica='Ingenieria Civil en Construccion Urbana'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ingenieria y Tecnologia', CarreraGenerica = N'Ingenieria'
 WHERE Nombre = N'Ingenieria Civil en Construcción Urbana';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ingenieria y Tecnologia', CarreraGenerica = N'Ingenieria Civil en Construccion Urbana'
--  WHERE Nombre = N'Ingenieria Civil en Construccion Urbana';

-- --------------------------------------------------------------------------------------------------
-- CASO 22: 'Ingenieria en Energias Renovables' / 'Ingeniería en Energías Renovables'
--   Variante A: Nombre='Ingenieria en Energias Renovables'  Nivel=Ingeniería  AreaEstudio='Ingenieria y Tecnologia'  CarreraGenerica='Ingenieria'
--   Variante B: Nombre='Ingeniería en Energías Renovables'  Nivel=(sin especificar -- bloque UPDATE que aplica por Nombre, no por Nivel)  AreaEstudio='Ingeniería y Tecnología'  CarreraGenerica='Ingeniería'
--   [NOTA] Mismo patrón de bloque UPDATE sin Nivel que los dos casos anteriores.
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ingenieria y Tecnologia', CarreraGenerica = N'Ingenieria'
--  WHERE Nombre = N'Ingeniería en Energías Renovables';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ingeniería y Tecnología', CarreraGenerica = N'Ingeniería'
 WHERE Nombre = N'Ingenieria en Energias Renovables';

-- --------------------------------------------------------------------------------------------------
-- CASO 23: 'Ingenieria en Gestion Empresarial' / 'Ingeniería en Gestión Empresarial'
--   Variante A: Nombre='Ingenieria en Gestion Empresarial'  Nivel=Ingeniería  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Administracion'
--   Variante B: Nombre='Ingeniería en Gestión Empresarial'  Nivel=(sin especificar -- bloque UPDATE que aplica por Nombre, no por Nivel)  AreaEstudio='Ingeniería y Tecnología'  CarreraGenerica='Administración'
--   [NOTA] Aquí también cambia AreaEstudio de forma más marcada (Ciencias Sociales y Administrativas vs Ingeniería y Tecnología) -- revisar con cuidado cuál de las dos clasificaciones es la vigente.
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Administracion'
--  WHERE Nombre = N'Ingeniería en Gestión Empresarial';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ingeniería y Tecnología', CarreraGenerica = N'Administración'
 WHERE Nombre = N'Ingenieria en Gestion Empresarial';

-- --------------------------------------------------------------------------------------------------
-- CASO 24: 'Ingenieria en Informatica' / 'Ingenieria en Informática'
--   Variante A: Nombre='Ingenieria en Informatica'  Nivel=Ingeniería  AreaEstudio='Ciencias Naturales y Exactas'  CarreraGenerica='Computacion e Informatica'
--   Variante B: Nombre='Ingenieria en Informática'  Nivel=Ingeniería  AreaEstudio='Ingenieria y Tecnologia'  CarreraGenerica='Ingenieria'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ciencias Naturales y Exactas', CarreraGenerica = N'Computacion e Informatica'
--  WHERE Nombre = N'Ingenieria en Informática';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ingenieria y Tecnologia', CarreraGenerica = N'Ingenieria'
 WHERE Nombre = N'Ingenieria en Informatica';

-- --------------------------------------------------------------------------------------------------
-- CASO 25: 'Ingenieria Quimica' / 'Ingeniería Química'
--   Variante A: Nombre='Ingenieria Quimica'  Nivel=Ingeniería  AreaEstudio='Ingenieria y Tecnologia'  CarreraGenerica='Quimica'
--   Variante B: Nombre='Ingeniería Química'  Nivel=(sin especificar -- bloque UPDATE que aplica por Nombre, no por Nivel)  AreaEstudio='Ingeniería y Tecnología'  CarreraGenerica='Ingeniería Química'
--   [NOTA] Mismo patrón de bloque UPDATE sin Nivel que los casos de Ingeniería Ambiental / Civil / Energías Renovables.
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ingenieria y Tecnologia', CarreraGenerica = N'Quimica'
--  WHERE Nombre = N'Ingeniería Química';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ingeniería y Tecnología', CarreraGenerica = N'Ingeniería Química'
 WHERE Nombre = N'Ingenieria Quimica';

-- --------------------------------------------------------------------------------------------------
-- CASO 26: 'Mecánica' / 'Mecanica'
--   Variante A: Nombre='Mecánica'  Nivel=Ingeniería  AreaEstudio='Ingenieria y Tecnologia'  CarreraGenerica='Ingenieria'
--   Variante B: Nombre='Mecanica'  Nivel=Ingeniería  AreaEstudio='Ingenieria y Tecnologia'  CarreraGenerica='Mecanica'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ingenieria y Tecnologia', CarreraGenerica = N'Ingenieria'
 WHERE Nombre = N'Mecanica';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ingenieria y Tecnologia', CarreraGenerica = N'Mecanica'
--  WHERE Nombre = N'Mecánica';

-- --------------------------------------------------------------------------------------------------
-- CASO 27: 'Politicas Publicas' / 'Políticas Públicas'
--   Variante A: Nombre='Politicas Publicas'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Ciencias Politicas y Administracion Publica'
--   Variante B: Nombre='Políticas Públicas'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Políticas Públicas'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Ciencias Politicas y Administracion Publica'
 WHERE Nombre = N'Políticas Públicas';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Políticas Públicas'
--  WHERE Nombre = N'Politicas Publicas';

-- --------------------------------------------------------------------------------------------------
-- CASO 28: 'Psicología Organizacional' / 'Psicologia Organizacional'
--   Variante A: Nombre='Psicología Organizacional'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Administracion'
--   Variante B: Nombre='Psicologia Organizacional'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Relaciones Industriales'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Administracion'
 WHERE Nombre = N'Psicologia Organizacional';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Relaciones Industriales'
--  WHERE Nombre = N'Psicología Organizacional';

-- --------------------------------------------------------------------------------------------------
-- CASO 29: 'Relaciones Economicas Internacionales' / 'Relaciones Económicas Internacionales'
--   Variante A: Nombre='Relaciones Economicas Internacionales'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Economia'
--   Variante B: Nombre='Relaciones Económicas Internacionales'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Relaciones Internacionales'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Economia'
--  WHERE Nombre = N'Relaciones Económicas Internacionales';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Relaciones Internacionales'
 WHERE Nombre = N'Relaciones Economicas Internacionales';

-- --------------------------------------------------------------------------------------------------
-- CASO 30: 'Relaciones Turísticas' / 'Relaciones Turisticas'
--   Variante A: Nombre='Relaciones Turísticas'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Administracion'
--   Variante B: Nombre='Relaciones Turisticas'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Turismo'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Administracion'
--  WHERE Nombre = N'Relaciones Turisticas';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Turismo'
 WHERE Nombre = N'Relaciones Turísticas';

-- --------------------------------------------------------------------------------------------------
-- CASO 31: 'Restauracion de Bienes Muebles' / 'Restauración de Bienes Muebles'
--   Variante A: Nombre='Restauracion de Bienes Muebles'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Antropologia'
--   Variante B: Nombre='Restauración de Bienes Muebles'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Restauración de Bienes Muebles'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Antropologia'
 WHERE Nombre = N'Restauración de Bienes Muebles';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Restauración de Bienes Muebles'
--  WHERE Nombre = N'Restauracion de Bienes Muebles';

-- --------------------------------------------------------------------------------------------------
-- CASO 32: 'Sociología' / 'Sociologia'
--   Variante A: Nombre='Sociología'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Ciencias Politicas y Administracion Publica'
--   Variante B: Nombre='Sociologia'  Nivel=Licenciatura  AreaEstudio='Ciencias Sociales y Administrativas'  CarreraGenerica='Ciencias Sociales'
--
-- Opcion 1: alinear B hacia A (B toma la clasificacion de A)
UPDATE dbo.RRHH_Reclutamiento_Profesiones
   SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Ciencias Politicas y Administracion Publica'
 WHERE Nombre = N'Sociologia';
--
-- Opcion 2: alinear A hacia B (A toma la clasificacion de B)
-- UPDATE dbo.RRHH_Reclutamiento_Profesiones
--    SET AreaEstudio = N'Ciencias Sociales y Administrativas', CarreraGenerica = N'Ciencias Sociales'
--  WHERE Nombre = N'Sociología';

