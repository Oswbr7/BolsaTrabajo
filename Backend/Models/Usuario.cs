namespace Backend.Models
{
    public enum TipoContacto
    {
        Correo = 0,
        Telefono = 1
    }

    public enum EstadoCuenta
    {
        PendienteVerificacion = 0,
        Activa = 1,
        Bloqueada = 2
    }

    /// <summary>
    /// Cuenta de un aspirante (CU-01). Pensado para funcionar igual sobre
    /// InMemory que sobre SQL Server: nada aquí depende de una característica
    /// exclusiva de un proveedor.
    /// </summary>
    public class Usuario
    {
        public int Id { get; set; }

        public string Nombre { get; set; } = string.Empty;

        /// <summary>
        /// Correo electrónico o número de teléfono, según TipoContacto.
        /// Se guarda también en minúsculas/normalizado para poder validar
        /// unicidad sin depender de collation específico del motor.
        /// </summary>
        public string CorreoOTelefono { get; set; } = string.Empty;

        public TipoContacto TipoContacto { get; set; }

        public string PasswordHash { get; set; } = string.Empty;

        public string PaisResidencia { get; set; } = string.Empty;

        /// <summary>Fijo en "Aspirante" para CU-01; el modelo deja espacio para más roles a futuro.</summary>
        public string Rol { get; set; } = "Aspirante";

        public EstadoCuenta Estado { get; set; } = EstadoCuenta.PendienteVerificacion;

        public DateTime AceptoTerminosEn { get; set; }

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        public DateTime? FechaVerificacion { get; set; }

        // --- CU-02: inicio de sesión ---

        /// <summary>
        /// Contador de contraseñas incorrectas consecutivas al iniciar sesión.
        /// Es independiente de los intentos fallidos de código de verificación
        /// (CU-01): ese contador vive en CodigoVerificacion y bloquea la cuenta
        /// hasta pedir un código nuevo; este contador aquí genera un bloqueo
        /// temporal (ver BloqueadoHasta) que se levanta solo, pasado el tiempo.
        /// </summary>
        public int IntentosFallidosLogin { get; set; }

        /// <summary>
        /// Si tiene valor y es mayor a la fecha actual, el login está
        /// temporalmente bloqueado (CU-02, flujo alterno A2). Null = sin bloqueo.
        /// </summary>
        public DateTime? BloqueadoHasta { get; set; }

        /// <summary>
        /// Cuenta creada desde la opción "solo para desarrollo" del registro
        /// (ver Registro.jsx y CuentasController.Registro). Cuando es true,
        /// el código de verificación de esta cuenta SIEMPRE se manda por el
        /// canal de consola (nunca por Brevo/Vonage, aunque estén
        /// configurados) y siempre se regresa en la respuesta del endpoint
        /// para poder probar el flujo sin depender de un correo/SMS real.
        /// Solo se puede activar al registrar mientras el backend corre en
        /// el entorno de Development (IsDevelopment()); fuera de ahí,
        /// CuentasController rechaza la solicitud.
        /// </summary>
        public bool EsCuentaDesarrollo { get; set; }
    }
}
