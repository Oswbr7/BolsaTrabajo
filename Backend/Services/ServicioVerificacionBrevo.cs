using Backend.Models;
using brevo_csharp.Api;
using brevo_csharp.Client;
// OJO: a propósito NO hay "using brevo_csharp.Model;" aquí. Ese namespace
// trae varias clases con nombres genéricos (Task, Configuration, ...) que
// chocan con System.Threading.Tasks.Task y con brevo_csharp.Client.Configuration
// que sí usamos arriba. En vez de ir agregando un alias por cada choque que
// aparezca, los tres tipos de brevo_csharp.Model que sí se usan abajo
// (SendSmtpEmail y compañía) se referencian con su nombre completo.

namespace Backend.Services
{
    /// <summary>
    /// Envía el código de verificación por correo de verdad usando Brevo
    /// (ver "Plan de Implementacion - Integracion Brevo para Verificacion
    /// por Correo.md"). Solo se le pide manejar Correo: ServicioVerificacionEnrutador
    /// es quien decide, según lo que esté configurado, si el teléfono lo maneja
    /// Vonage o el fallback de consola — pero esta clase igual sabe resolver
    /// Telefono por su cuenta (delegando a consola) para poder usarse sola,
    /// sin enrutador, si algún día solo Brevo estuviera configurado.
    /// </summary>
    public class ServicioVerificacionBrevo : IServicioVerificacion
    {
        private readonly TransactionalEmailsApi _api;
        private readonly ServicioVerificacionConsola _fallbackConsola;
        private readonly string _remitenteCorreo;
        private readonly string _remitenteNombre;
        private readonly ILogger<ServicioVerificacionBrevo> _logger;

        public ServicioVerificacionBrevo(
            string apiKey,
            string remitenteCorreo,
            string remitenteNombre,
            ServicioVerificacionConsola fallbackConsola,
            ILogger<ServicioVerificacionBrevo> logger)
        {
            // Se arma una Configuration propia en vez de usar el
            // Configuration.Default estático que sugiere el ejemplo básico
            // del SDK de Brevo, para no depender de un singleton global
            // mutable — más en línea con cómo el resto del proyecto usa
            // inyección de dependencias.
            var configuracion = new Configuration();
            configuracion.ApiKey.Add("api-key", apiKey);
            _api = new TransactionalEmailsApi(configuracion);

            _remitenteCorreo = remitenteCorreo;
            _remitenteNombre = remitenteNombre;
            _fallbackConsola = fallbackConsola;
            _logger = logger;
        }

        public async Task EnviarCodigoAsync(string destino, string codigo, TipoContacto tipoContacto, string paisResidencia)
        {
            if (tipoContacto == TipoContacto.Telefono)
            {
                // Esta clase solo sabe mandar Correo. Si alguna vez se usa sin
                // pasar por ServicioVerificacionEnrutador (p. ej. Brevo
                // configurado y Vonage no), Telefono cae aquí a consola.
                await _fallbackConsola.EnviarCodigoAsync(destino, codigo, tipoContacto, paisResidencia);
                return;
            }

            var correo = new brevo_csharp.Model.SendSmtpEmail(
                sender: new brevo_csharp.Model.SendSmtpEmailSender(name: _remitenteNombre, email: _remitenteCorreo),
                to: new List<brevo_csharp.Model.SendSmtpEmailTo> { new brevo_csharp.Model.SendSmtpEmailTo(email: destino) },
                subject: "Tu código de verificación — Bolsa de Trabajo SIATEC",
                htmlContent: $"<p>Tu código de verificación de Bolsa de Trabajo SIATEC es: <strong>{codigo}</strong>.</p><p>Vence en 15 minutos.</p>");

            // Si esto truena (cuota diaria agotada, API key inválida, error
            // de red), se deja propagar tal cual: CuentasController decide
            // qué hacer (hoy: revertir el registro/reenvío y mostrar un
            // error genérico en pantalla) — aquí solo se deja registrado en
            // el log para poder diagnosticarlo después.
            try
            {
                await _api.SendTransacEmailAsync(correo);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Brevo no pudo enviar el código de verificación a {Destino}.", destino);
                throw;
            }
        }

        public bool EnviaCodigoDeVerdad(TipoContacto tipoContacto, string paisResidencia) => tipoContacto == TipoContacto.Correo;
    }
}
