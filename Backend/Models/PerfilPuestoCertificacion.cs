namespace Backend.Models
{
    /// <summary>
    /// Una certificación que pide el perfil académico de una versión de
    /// perfil de puesto (ver Models/PerfilPuestoVersion.cs) — p. ej.
    /// "Certificación en Excel Avanzado". Tabla de la otra plataforma
    /// (SIATEC) — ver la entrada 17 de "Bolsa de Trabajo - SQL.md" —, este
    /// proyecto solo la lee para mostrar qué certificaciones pide cada
    /// puesto y dejar que el aspirante adjunte el archivo correspondiente
    /// al postularse (PostularsePerfilPuesto.jsx). No hay ningún endpoint
    /// de escritura para esta tabla de este lado.
    ///
    /// A diferencia de PerfilPuestoDocumento, esta tabla no tiene columna
    /// Obligatorio ni Activo: por decisión del proyecto, toda certificación
    /// listada aquí se trata como obligatoria de adjuntar al postularse.
    /// </summary>
    public class PerfilPuestoCertificacion
    {
        public int Id { get; set; }

        /// <summary>FK hacia PerfilPuestoVersion.Id.</summary>
        public int VersionId { get; set; }

        public string Nombre { get; set; } = string.Empty;

        /// <summary>Quién la emite (institución, plataforma, colegio, etc.).</summary>
        public string Institucion { get; set; } = string.Empty;

        /// <summary>Texto libre (p. ej. "Vigente", "2 años") — no es una fecha, se conserva tal cual la captura SIATEC.</summary>
        public string Vigencia { get; set; } = string.Empty;

        public int Orden { get; set; }
    }
}
