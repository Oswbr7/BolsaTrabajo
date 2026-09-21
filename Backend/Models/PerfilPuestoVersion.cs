namespace Backend.Models
{
    /// <summary>
    /// Versión de un perfil de puesto (ver Models/PerfilPuesto.cs). Contiene
    /// la información descriptiva real del puesto — el encabezado solo
    /// guarda cuál número de versión está vigente (VersionActual).
    /// </summary>
    public class PerfilPuestoVersion
    {
        public int Id { get; set; }

        /// <summary>FK hacia PerfilPuesto.Id.</summary>
        public int PerfilId { get; set; }

        public int NumeroVersion { get; set; }

        /// <summary>Uno de: "borrador", "publicado", "inactivo".</summary>
        public string Estado { get; set; } = string.Empty;

        public string NombrePuesto { get; set; } = string.Empty;

        public string Rama { get; set; } = string.Empty;

        public string Familia { get; set; } = string.Empty;

        public string GrupoCategoria { get; set; } = string.Empty;

        public string NivelOrganizacional { get; set; } = string.Empty;

        public string TipoPersonal { get; set; } = string.Empty;

        public string AreaFuncional { get; set; } = string.Empty;

        public string? PuestoSuperior { get; set; }

        /// <summary>
        /// Fecha en formato de texto "YYYY-MM-DD" (columna VARCHAR(10) en la
        /// base de datos, no DATETIME) — se conserva como string tal cual la
        /// captura SIATEC, sin parsear a DateTime.
        /// </summary>
        public string VigenciaInicio { get; set; } = string.Empty;

        /// <summary>Igual que VigenciaInicio; nula si el puesto no tiene fecha de fin definida.</summary>
        public string? VigenciaFin { get; set; }

        public string Observaciones { get; set; } = string.Empty;

        public string ObjetivoGeneral { get; set; } = string.Empty;

        public DateTime? PublicadoEn { get; set; }

        public DateTime? InactivadoEn { get; set; }

        public string CreadoPor { get; set; } = string.Empty;

        public string ModificadoPor { get; set; } = string.Empty;

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        public DateTime FechaModificacion { get; set; } = DateTime.UtcNow;

        /// <summary>Control de concurrencia optimista, manejado por SIATEC — no se usa de este lado.</summary>
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }
}
