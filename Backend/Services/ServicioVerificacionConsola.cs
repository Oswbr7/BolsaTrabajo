using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// Implementación de desarrollo/pruebas de IServicioVerificacion: no
    /// manda nada por correo ni SMS de verdad, solo lo registra en el log
    /// del backend. El código real de todos modos se regresa también en la
    /// respuesta del endpoint de registro/reenvío (campo "codigoVerificacionDev")
    /// para poder probar el flujo completo de forma puramente visual, sin
    /// depender de una cuenta de correo/SMS real. También se usa como
    /// fallback: dentro de ServicioVerificacionEnrutador para el canal que
    /// no tenga proveedor configurado, y dentro de ServicioVerificacionVonage
    /// para teléfonos cuyo país de residencia no está en el mapeo de
    /// códigos de marcación.
    /// </summary>
    public class ServicioVerificacionConsola : IServicioVerificacion
    {
        private readonly ILogger<ServicioVerificacionConsola> _logger;

        public ServicioVerificacionConsola(ILogger<ServicioVerificacionConsola> logger)
        {
            _logger = logger;
        }

        public Task EnviarCodigoAsync(string destino, string codigo, TipoContacto tipoContacto, string paisResidencia)
        {
            _logger.LogInformation(
                "[Verificación de cuenta - modo consola] Código {Codigo} para {Destino} (válido por tiempo limitado).",
                codigo,
                destino);

            return Task.CompletedTask;
        }

        public bool EnviaCodigoDeVerdad(TipoContacto tipoContacto, string paisResidencia) => false;
    }
}
