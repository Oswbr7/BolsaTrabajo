namespace Backend.Models
{
    public enum ResultadoAcceso
    {
        Exitoso = 0,
        CredencialesInvalidas = 1,
        CuentaNoVerificada = 2,
        CuentaBloqueada = 3
    }

    /// <summary>
    /// Registro de auditoría de un intento de inicio de sesión (CU-02,
    /// postcondición "evento de seguridad registrado"). Deliberadamente
    /// simple por ahora: solo lo esencial para dejar rastro de qué pasó y
    /// cuándo, sin IP/user-agent todavía — se puede ampliar después sin
    /// romper nada de lo que ya usa esta tabla.
    /// </summary>
    public class IntentoAcceso
    {
        public int Id { get; set; }

        public string CorreoOTelefonoIngresado { get; set; } = string.Empty;

        /// <summary>Nulo si el identificador ingresado no corresponde a ninguna cuenta.</summary>
        public int? UsuarioId { get; set; }

        public ResultadoAcceso Resultado { get; set; }

        public DateTime FechaHora { get; set; } = DateTime.UtcNow;
    }
}
