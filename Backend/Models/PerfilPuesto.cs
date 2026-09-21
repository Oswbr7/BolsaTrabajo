namespace Backend.Models
{
    /// <summary>
    /// Encabezado de un perfil de puesto (catálogo compartido con SIATEC —
    /// ver Documentacion/SE-137-Reclutamiento/conexionPerfilPuesto.md y
    /// RRHH_Reclutamiento_PerfilesPuesto.sql). SIATEC es quien crea, versiona,
    /// publica e inactiva estos registros; de este lado (Bolsa de Trabajo)
    /// solo se leen — no hay ningún endpoint de escritura para esta tabla.
    /// </summary>
    public class PerfilPuesto
    {
        public int Id { get; set; }

        public string CodigoPerfil { get; set; } = string.Empty;

        /// <summary>Referencia opcional a dbo.Nomina_Puestos (sin FK ni tabla presente en este proyecto).</summary>
        public int? PuestoCodigo { get; set; }

        /// <summary>
        /// FK opcional hacia dbo.RRHH_Reclutamiento_Areas (mismo catálogo que
        /// Postulacion.AreaId — ver Models/Area.cs).
        /// </summary>
        public int? AreaId { get; set; }

        /// <summary>
        /// Número de versión (RRHH_Reclutamiento_PerfilesPuesto_Versiones.NumeroVersion)
        /// que está vigente para este perfil.
        /// </summary>
        public int VersionActual { get; set; }

        /// <summary>Uno de: "borrador", "publicado", "inactivo".</summary>
        public string EstadoActual { get; set; } = string.Empty;

        public string CreadoPor { get; set; } = string.Empty;

        public string ModificadoPor { get; set; } = string.Empty;

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        public DateTime FechaModificacion { get; set; } = DateTime.UtcNow;
    }
}
