namespace Backend.Models
{
    public class ExperienciaLaboral
    {
        public int Id { get; set; }

        public int PerfilAspiranteId { get; set; }

        public string Empresa { get; set; } = string.Empty;

        public string Puesto { get; set; } = string.Empty;

        public DateTime FechaInicio { get; set; }

        /// <summary>Nulo si es el empleo actual ("Trabajo aquí actualmente").</summary>
        public DateTime? FechaFin { get; set; }

        public string? Descripcion { get; set; }
    }
}
