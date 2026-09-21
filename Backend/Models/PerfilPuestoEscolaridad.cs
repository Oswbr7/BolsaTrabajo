namespace Backend.Models
{
    /// <summary>
    /// Una profesión/carrera que una versión de perfil de puesto acepta como
    /// escolaridad requerida (ver Models/PerfilPuestoVersion.cs). Varias filas
    /// por versión = coincidencia de tipo "cualquiera": basta con que el
    /// aspirante tenga UNA de las profesiones listadas — ver la sección
    /// "Regla de compatibilidad" en conexionPerfilPuesto.md. Esa comparación
    /// contra la formación académica del usuario es la parte 2, todavía no
    /// implementada; por ahora esta tabla solo se lee para mostrar qué pide
    /// cada perfil.
    /// </summary>
    public class PerfilPuestoEscolaridad
    {
        public int Id { get; set; }

        /// <summary>FK hacia PerfilPuestoVersion.Id.</summary>
        public int VersionId { get; set; }

        /// <summary>FK hacia dbo.RRHH_Reclutamiento_Profesiones (Models/Profesion.cs).</summary>
        public int ProfesionId { get; set; }

        public int Orden { get; set; }
    }
}
