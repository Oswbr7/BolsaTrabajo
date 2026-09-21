namespace Backend.Models
{
    /// <summary>
    /// Certificación del aspirante (distinta de Formación académica: una
    /// certificación no es un grado escolar, es una constancia de un curso o
    /// examen concreto — p. ej. "Certificación en Excel Avanzado"). Mismo
    /// patrón que ExperienciaLaboral/FormacionAcademica/Habilidad: tabla
    /// propia, FK a PerfilAspirante con ON DELETE CASCADE, y la lista
    /// completa se reemplaza en cada guardado del asistente de perfil.
    /// </summary>
    public class Certificacion
    {
        public int Id { get; set; }

        public int PerfilAspiranteId { get; set; }

        public string Nombre { get; set; } = string.Empty;

        /// <summary>Quién la emitió (institución, plataforma, colegio, etc.).</summary>
        public string Institucion { get; set; } = string.Empty;

        public DateTime FechaObtencion { get; set; }

        /// <summary>Nulo si la certificación no vence.</summary>
        public DateTime? FechaVencimiento { get; set; }
    }
}
