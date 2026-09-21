namespace Backend.Models
{
    /// <summary>
    /// Perfil del aspirante (CU-03). Relación 1 a 1 con Usuario: separa los
    /// datos de "quién es la persona" (nombre completo, contacto, residencia,
    /// experiencia) de los datos de "cómo entra a la cuenta" (correo/teléfono
    /// de acceso, contraseña) que ya vive en Usuario desde CU-01. Así, cambios
    /// en el perfil nunca afectan cómo la persona inicia sesión.
    /// </summary>
    public class PerfilAspirante
    {
        public int Id { get; set; }

        public int UsuarioId { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public string ApellidoPaterno { get; set; } = string.Empty;

        /// <summary>Opcional: no todas las personas tienen segundo apellido.</summary>
        public string? ApellidoMaterno { get; set; }

        public DateTime FechaNacimiento { get; set; }

        /// <summary>
        /// RFC (código alfanumérico, 13 caracteres para persona física).
        /// Opcional. Texto plano — no confundir con ningún documento cargado.
        /// </summary>
        public string Rfc { get; set; } = string.Empty;

        /// <summary>CURP (código alfanumérico, 18 caracteres). Opcional.</summary>
        public string Curp { get; set; } = string.Empty;

        /// <summary>
        /// Datos de contacto del perfil. Son independientes del correo/teléfono
        /// de acceso a la cuenta (Usuario.CorreoOTelefono) — ver CU-03 sección 3.3.
        /// </summary>
        public string Telefono { get; set; } = string.Empty;

        public string Correo { get; set; } = string.Empty;

        public string Estado { get; set; } = string.Empty;

        public string Municipio { get; set; } = string.Empty;

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        public DateTime FechaActualizacion { get; set; } = DateTime.UtcNow;

        public List<ExperienciaLaboral> ExperienciaLaboral { get; set; } = new();

        public List<FormacionAcademica> FormacionAcademica { get; set; } = new();

        public List<Habilidad> Habilidades { get; set; } = new();

        public List<Certificacion> Certificaciones { get; set; } = new();
    }
}
