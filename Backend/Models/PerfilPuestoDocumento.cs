namespace Backend.Models
{
    /// <summary>
    /// Un documento requerido por una versión de perfil de puesto (ver
    /// Models/PerfilPuestoVersion.cs) — no es un archivo binario, sino un
    /// renglón que describe un requisito documental (p. ej. "Cédula
    /// profesional", "Identificación oficial"). Ver la sección "Documentos
    /// requeridos" en conexionPerfilPuesto.md.
    /// </summary>
    public class PerfilPuestoDocumento
    {
        public int Id { get; set; }

        /// <summary>FK hacia PerfilPuestoVersion.Id.</summary>
        public int VersionId { get; set; }

        public int Orden { get; set; }

        public string TipoDocumento { get; set; } = string.Empty;

        public string Nombre { get; set; } = string.Empty;

        public bool Obligatorio { get; set; }

        /// <summary>
        /// Permite que SIATEC deje de exigir un documento sin borrar el
        /// historial del renglón. Este proyecto no filtra por este campo al
        /// listar — se muestra tal cual, igual que el resto de la
        /// información del perfil (ver PerfilesPuestoController).
        /// </summary>
        public bool Activo { get; set; }

        public string Observaciones { get; set; } = string.Empty;
    }
}
