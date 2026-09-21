namespace Backend.Models
{
    /// <summary>
    /// Para qué se generó un código de 6 dígitos. Permite reutilizar la misma
    /// tabla y la misma lógica de expiración/intentos tanto para verificar una
    /// cuenta nueva (CU-01) como para recuperar el acceso (CU-02), en vez de
    /// crear una tabla aparte para cada caso de uso.
    /// </summary>
    public enum PropositoCodigo
    {
        VerificacionCuenta = 0,
        RecuperacionContrasena = 1
    }

    /// <summary>
    /// Código de verificación de 6 dígitos asociado a un Usuario. Se usa tanto
    /// en el flujo de verificación de cuenta (CU-01) como en el de recuperación
    /// de acceso (CU-02); el campo Proposito distingue para cuál es cada uno.
    /// </summary>
    public class CodigoVerificacion
    {
        public int Id { get; set; }

        public int UsuarioId { get; set; }

        public string Codigo { get; set; } = string.Empty;

        public PropositoCodigo Proposito { get; set; } = PropositoCodigo.VerificacionCuenta;

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        public DateTime FechaExpiracion { get; set; }

        public int IntentosFallidos { get; set; }

        public bool Usado { get; set; }
    }
}
