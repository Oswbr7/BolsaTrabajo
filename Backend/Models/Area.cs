namespace Backend.Models
{
    /// <summary>
    /// Catálogo compartido de áreas de interés. Es la misma tabla,
    /// dbo.RRHH_Reclutamiento_Areas, que SIATEC usará del lado de Puestos
    /// (agregando su propio AreaId con FK hacia aquí) para poder filtrar
    /// candidatos por área — ver "Plan de Flujo - Filtrado de Postulantes
    /// por Area en SIATEC.md". Postulacion.AreaId apunta a esta tabla.
    /// </summary>
    public class Area
    {
        public int Id { get; set; }

        public string Nombre { get; set; } = string.Empty;

        /// <summary>
        /// Permite dejar de ofrecer un área nueva sin borrarla (las
        /// postulaciones ya guardadas con ese AreaId no se ven afectadas).
        /// GET /api/areas solo regresa las que tienen Activa = true.
        /// </summary>
        public bool Activa { get; set; } = true;
    }
}
