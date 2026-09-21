namespace Backend.Models
{
    /// <summary>
    /// Una función/responsabilidad de una versión de perfil de puesto (ver
    /// Models/PerfilPuestoVersion.cs) — ver la sección "Funciones de una
    /// vacante" en conexionPerfilPuesto.md.
    /// </summary>
    public class PerfilPuestoFuncion
    {
        public int Id { get; set; }

        /// <summary>FK hacia PerfilPuestoVersion.Id.</summary>
        public int VersionId { get; set; }

        public int Orden { get; set; }

        public string Descripcion { get; set; } = string.Empty;

        public bool Obligatoria { get; set; }

        public bool Critica { get; set; }

        /// <summary>
        /// Permite que SIATEC deje de exigir una función sin borrar el
        /// historial del renglón. Este proyecto no filtra por este campo al
        /// listar — se muestra tal cual, igual que el resto de la
        /// información del perfil (ver PerfilesPuestoController).
        /// </summary>
        public bool Activa { get; set; }
    }
}
