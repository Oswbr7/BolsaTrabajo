namespace Backend.Models
{
    /// <summary>
    /// Un renglón por cada vez que se guarda el asistente de perfil completo
    /// (CU-03, postcondición "historial de cambios disponible"). Deliberadamente
    /// simple: un resumen legible, no un diff campo por campo.
    /// </summary>
    public class HistorialPerfil
    {
        public int Id { get; set; }

        public int PerfilAspiranteId { get; set; }

        public DateTime FechaHora { get; set; } = DateTime.UtcNow;

        public string Resumen { get; set; } = string.Empty;
    }
}
