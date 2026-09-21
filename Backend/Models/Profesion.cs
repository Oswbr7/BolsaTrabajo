namespace Backend.Models
{
    /// <summary>
    /// Catálogo de profesiones/carreras, agrupado por Nivel de estudios (los
    /// mismos ocho valores que FORMACION_OPTIONS en el frontend: Secundaria,
    /// Preparatoria, Técnico, Ingeniería, Licenciatura, Diplomado, Maestría,
    /// Doctorado). Es independiente del catálogo de Áreas de interés
    /// (RRHH_Reclutamiento_Areas) — Área sigue siendo un dato del perfil y de
    /// la postulación, pero el emparejamiento con vacantes ahora se hace por
    /// Profesión, no por Área.
    ///
    /// Los niveles sin una carrera específica (Secundaria, Preparatoria,
    /// Diplomado) tienen una sola fila "genérica" con el mismo nombre que el
    /// nivel — así toda FormacionAcademica siempre tiene una Profesión, y una
    /// vacante que busque "gente con Secundaria" se filtra exactamente igual
    /// que una que busca "Ingeniería en Sistemas Computacionales".
    /// </summary>
    public class Profesion
    {
        public int Id { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public string Nivel { get; set; } = string.Empty;

        /// <summary>
        /// Área de Estudio académica (ej. "Ciencias Sociales y
        /// Administrativas") del "Catálogo de Carreras" — NO es lo mismo que
        /// el área de interés laboral (dbo.RRHH_Reclutamiento_Areas /
        /// AreaId en Postulaciones, que es para filtrar vacantes); son dos
        /// catálogos independientes. Nulo únicamente en profesiones
        /// registradas antes de que existiera esta columna (ver
        /// AgregarAreaEstudioYCarreraGenerica.sql) — toda profesión nueva
        /// debería traerlo.
        /// </summary>
        public string? AreaEstudio { get; set; }

        /// <summary>
        /// Carrera Genérica (ej. "Administración") del mismo catálogo —
        /// intermedia entre AreaEstudio y Nombre (que es la Carrera
        /// Específica, ej. "Administración de Hoteles y Restaurantes").
        /// Mismo criterio de nulabilidad que AreaEstudio.
        /// </summary>
        public string? CarreraGenerica { get; set; }

        /// <summary>
        /// Permite dejar de ofrecer una profesión nueva sin borrarla (las
        /// formaciones académicas ya guardadas con ese ProfesionId no se ven
        /// afectadas). GET /api/profesiones solo regresa las que tienen
        /// Activa = true.
        /// </summary>
        public bool Activa { get; set; } = true;
    }
}
