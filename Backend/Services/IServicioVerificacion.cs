using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// Abstracción para el envío del código de verificación de cuenta.
    /// ServicioVerificacionConsola es el fallback de desarrollo (no manda
    /// nada real, solo lo registra en el log). ServicioVerificacionBrevo
    /// manda de verdad para correo (ver "Plan de Implementacion -
    /// Integracion Brevo para Verificacion por Correo.md") y
    /// ServicioVerificacionVonage manda de verdad por SMS para teléfono
    /// (ver "Plan de Implementacion - Integracion Vonage SMS para
    /// Verificacion.md"). ServicioVerificacionEnrutador combina ambas
    /// cuando las dos están configuradas — ver Program.cs.
    /// </summary>
    public interface IServicioVerificacion
    {
        /// <param name="paisResidencia">
        /// País de residencia capturado en el registro (Usuario.PaisResidencia).
        /// Solo lo usa ServicioVerificacionVonage, para inferir el código de
        /// marcación internacional del teléfono (Opción A del plan de Vonage);
        /// las demás implementaciones lo ignoran.
        /// </param>
        Task EnviarCodigoAsync(string destino, string codigo, TipoContacto tipoContacto, string paisResidencia);

        /// <summary>
        /// True si esta implementación realmente entrega el código para ese
        /// canal Y esa cuenta puntual. CuentasController lo usa para decidir
        /// si sigue regresando "codigoVerificacionDev" en la respuesta o no:
        /// una vez que el envío real funciona, seguir regresándolo sería un
        /// problema de seguridad (cualquiera que vea la respuesta se saltaría
        /// la verificación).
        /// </summary>
        /// <param name="paisResidencia">
        /// Necesario para Telefono: ServicioVerificacionVonage solo manda de
        /// verdad si el país está en su mapeo de códigos — si no, esa cuenta
        /// puntual cayó a consola y esto debe regresar false aunque Vonage
        /// esté configurado. Las demás implementaciones lo ignoran.
        /// </param>
        bool EnviaCodigoDeVerdad(TipoContacto tipoContacto, string paisResidencia);
    }
}
