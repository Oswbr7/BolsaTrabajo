using Backend.Models;
using Vonage;
using Vonage.Messaging;
using Vonage.Request;

namespace Backend.Services
{
    /// <summary>
    /// Envía el código de verificación por SMS de verdad usando Vonage (ver
    /// "Plan de Implementacion - Integracion Vonage SMS para Verificacion.md").
    /// Solo se le pide manejar Telefono: ServicioVerificacionEnrutador es
    /// quien decide, según lo que esté configurado, si el correo lo maneja
    /// Brevo o el fallback de consola — pero esta clase igual sabe resolver
    /// Correo por su cuenta (delegando a consola) para poder usarse sola,
    /// sin enrutador, si algún día solo Vonage estuviera configurado.
    ///
    /// Opción A del plan: el código de país se infiere del país de
    /// residencia capturado en el registro (mapeo fijo de PaisesACodigo). Si
    /// el país no está en el mapeo (p. ej. "Otro"), se cae al fallback de
    /// consola para esa cuenta puntual — no bloquea el registro, solo no
    /// llega el SMS todavía.
    /// </summary>
    public class ServicioVerificacionVonage : IServicioVerificacion
    {
        /// <summary>
        /// Mapeo fijo de "País de residencia" (tal como lo manda Registro.jsx)
        /// a su código de marcación internacional. Cubre las 6 opciones
        /// concretas del selector; "Otro" queda fuera a propósito (ver punto 4
        /// del plan de Vonage).
        /// </summary>
        private static readonly Dictionary<string, string> PaisesACodigo = new()
        {
            ["México"] = "52",
            ["Estados Unidos"] = "1",
            ["Guatemala"] = "502",
            ["Colombia"] = "57",
            ["Argentina"] = "54",
            ["España"] = "34",
        };

        private readonly VonageClient _cliente;
        private readonly string? _remitente;
        private readonly ServicioVerificacionConsola _fallbackConsola;
        private readonly ILogger<ServicioVerificacionVonage> _logger;

        public ServicioVerificacionVonage(
            string apiKey,
            string apiSecret,
            string? remitente,
            ServicioVerificacionConsola fallbackConsola,
            ILogger<ServicioVerificacionVonage> logger)
        {
            var credenciales = Credentials.FromApiKeyAndSecret(apiKey, apiSecret);
            _cliente = new VonageClient(credenciales);

            // Sin VONAGE_SMS_FROM configurado, se deja null: Vonage asigna un
            // número local aleatorio por defecto (suficiente para pruebas,
            // según el plan).
            _remitente = string.IsNullOrWhiteSpace(remitente) ? null : remitente;

            _fallbackConsola = fallbackConsola;
            _logger = logger;
        }

        public async Task EnviarCodigoAsync(string destino, string codigo, TipoContacto tipoContacto, string paisResidencia)
        {
            if (tipoContacto == TipoContacto.Correo)
            {
                // Esta clase solo sabe mandar SMS. Si alguna vez se usa sin
                // pasar por ServicioVerificacionEnrutador (p. ej. Vonage
                // configurado y Brevo no), Correo cae aquí a consola.
                await _fallbackConsola.EnviarCodigoAsync(destino, codigo, tipoContacto, paisResidencia);
                return;
            }

            if (!PaisesACodigo.TryGetValue(paisResidencia, out var codigoPais))
            {
                _logger.LogWarning(
                    "No hay código de país mapeado para '{PaisResidencia}'; el SMS a {Destino} no se manda de verdad, se cae a modo consola.",
                    paisResidencia,
                    destino);
                await _fallbackConsola.EnviarCodigoAsync(destino, codigo, tipoContacto, paisResidencia);
                return;
            }

            // Registro.jsx ya valida el teléfono como puros dígitos
            // (^\d{10,12}$), sin código de país — se antepone aquí.
            var numeroInternacional = $"{codigoPais}{destino}";

            var solicitud = new SendSmsRequest
            {
                To = numeroInternacional,
                From = _remitente ?? numeroInternacional,
                Text = $"Tu código de verificación de Bolsa de Trabajo SIATEC es: {codigo}. Vence en 15 minutos.",
            };

            // Igual que con Brevo: si esto truena o Vonage responde con un
            // estatus de error, se deja propagar — CuentasController decide
            // qué revertir y muestra el error genérico en pantalla. El código
            // ya quedó guardado en la base de datos, así que "reenviar
            // código" puede reintentar sin perder nada.
            try
            {
                var respuesta = await _cliente.SmsClient.SendAnSmsAsync(solicitud);
                var mensaje = respuesta.Messages.FirstOrDefault();

                // La API de SMS de Vonage regresa Status = "0" cuando el
                // mensaje se aceptó correctamente; cualquier otro valor es un
                // código de error (crédito insuficiente, número inválido, etc.).
                // Se compara con Convert.ToString(...) en vez de contra el
                // valor directo porque el tipo exacto de Status (string vs.
                // numérico) puede variar entre versiones del SDK.
                if (mensaje is null || Convert.ToString(mensaje.Status) != "0")
                {
                    throw new InvalidOperationException(
                        $"Vonage rechazó el SMS (status={mensaje?.Status}, error={mensaje?.ErrorText}).");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Vonage no pudo enviar el código de verificación por SMS a {Destino}.", numeroInternacional);
                throw;
            }
        }

        public bool EnviaCodigoDeVerdad(TipoContacto tipoContacto, string paisResidencia) =>
            tipoContacto == TipoContacto.Telefono && PaisesACodigo.ContainsKey(paisResidencia);
    }
}
