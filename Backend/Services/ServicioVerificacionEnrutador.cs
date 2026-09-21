using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// Combina las implementaciones reales de IServicioVerificacion cuando
    /// hay más de un proveedor configurado a la vez: Correo va a
    /// ServicioVerificacionBrevo (si BREVO_API_KEY está en .env) y Telefono
    /// va a ServicioVerificacionVonage (si VONAGE_API_KEY/SECRET están en
    /// .env). El canal que no tenga proveedor configurado cae al fallback de
    /// consola. Program.cs decide qué combinación registrar; esta clase solo
    /// se usa cuando hace falta enrutar entre dos proveedores reales — si
    /// solo uno está configurado, ese se registra directamente como
    /// IServicioVerificacion sin pasar por aquí.
    /// </summary>
    public class ServicioVerificacionEnrutador : IServicioVerificacion
    {
        private readonly IServicioVerificacion? _servicioCorreo;
        private readonly IServicioVerificacion? _servicioTelefono;
        private readonly ServicioVerificacionConsola _fallbackConsola;

        public ServicioVerificacionEnrutador(
            IServicioVerificacion? servicioCorreo,
            IServicioVerificacion? servicioTelefono,
            ServicioVerificacionConsola fallbackConsola)
        {
            _servicioCorreo = servicioCorreo;
            _servicioTelefono = servicioTelefono;
            _fallbackConsola = fallbackConsola;
        }

        private IServicioVerificacion ResolverPara(TipoContacto tipoContacto) => tipoContacto switch
        {
            TipoContacto.Correo => _servicioCorreo ?? _fallbackConsola,
            TipoContacto.Telefono => _servicioTelefono ?? _fallbackConsola,
            _ => _fallbackConsola,
        };

        public Task EnviarCodigoAsync(string destino, string codigo, TipoContacto tipoContacto, string paisResidencia) =>
            ResolverPara(tipoContacto).EnviarCodigoAsync(destino, codigo, tipoContacto, paisResidencia);

        public bool EnviaCodigoDeVerdad(TipoContacto tipoContacto, string paisResidencia) =>
            ResolverPara(tipoContacto).EnviaCodigoDeVerdad(tipoContacto, paisResidencia);
    }
}
