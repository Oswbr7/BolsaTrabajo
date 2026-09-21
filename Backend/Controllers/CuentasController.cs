using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Backend.Data;
using Backend.Models;
using Backend.Security;
using Backend.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/cuentas")]
    public class CuentasController : ControllerBase
    {
        private const int MinutosVigenciaCodigo = 15;
        private const int MaxIntentosFallidos = 5;
        private const int SegundosEntreReenvios = 60;

        // CU-02: bloqueo temporal por intentos fallidos de LOGIN. Es un
        // contador y una ventana de tiempo distintos a los de arriba, que son
        // sobre el código de verificación (CU-01).
        private const int MaxIntentosFallidosLogin = 5;
        private const int MinutosBloqueoLogin = 15;

        private static readonly Regex RegexCorreo = new(
            @"^[^@\s]+@[^@\s]+\.[^@\s]+$",
            RegexOptions.Compiled);

        private static readonly Regex RegexTelefono = new(
            @"^\d{10,12}$",
            RegexOptions.Compiled);

        // Mínimo 8 caracteres, al menos una letra y un número. Queda en un
        // solo lugar para poder ajustarse sin tocar el resto del flujo.
        private static readonly Regex RegexPasswordValida = new(
            @"^(?=.*[A-Za-z])(?=.*\d).{8,}$",
            RegexOptions.Compiled);

        private readonly AppDbContext _context;
        private readonly IServicioVerificacion _servicioVerificacion;
        private readonly ServicioVerificacionConsola _servicioVerificacionConsola;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<CuentasController> _logger;

        public CuentasController(
            AppDbContext context,
            IServicioVerificacion servicioVerificacion,
            ServicioVerificacionConsola servicioVerificacionConsola,
            IWebHostEnvironment environment,
            ILogger<CuentasController> logger)
        {
            _context = context;
            _servicioVerificacion = servicioVerificacion;
            _servicioVerificacionConsola = servicioVerificacionConsola;
            _environment = environment;
            _logger = logger;
        }

        public class RegistroRequest
        {
            public string Nombre { get; set; } = string.Empty;
            public string CorreoOTelefono { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
            public string PaisResidencia { get; set; } = string.Empty;
            public bool AceptoTerminos { get; set; }

            /// <summary>
            /// Casilla "Crear cuenta de desarrollo" del formulario de registro.
            /// Solo tiene efecto si el backend corre en Development — ver
            /// CuentasController.Registro.
            /// </summary>
            public bool EsCuentaDesarrollo { get; set; }
        }

        public class VerificarRequest
        {
            public string CorreoOTelefono { get; set; } = string.Empty;
            public string Codigo { get; set; } = string.Empty;
        }

        public class ReenviarCodigoRequest
        {
            public string CorreoOTelefono { get; set; } = string.Empty;
        }

        public class LoginRequest
        {
            public string CorreoOTelefono { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }

        public class RecuperarAccesoRequest
        {
            public string CorreoOTelefono { get; set; } = string.Empty;
        }

        public class RestablecerContrasenaRequest
        {
            public string CorreoOTelefono { get; set; } = string.Empty;
            public string Codigo { get; set; } = string.Empty;
            public string NuevaPassword { get; set; } = string.Empty;
            public string ConfirmarPassword { get; set; } = string.Empty;
        }

        [HttpPost("registro")]
        public async Task<IActionResult> Registro([FromBody] RegistroRequest request)
        {
            if (request is null)
            {
                return BadRequest(new { mensaje = "Solicitud inválida." });
            }

            var nombre = (request.Nombre ?? string.Empty).Trim();
            var identificador = (request.CorreoOTelefono ?? string.Empty).Trim();
            var password = request.Password ?? string.Empty;
            var paisResidencia = (request.PaisResidencia ?? string.Empty).Trim();

            if (string.IsNullOrWhiteSpace(nombre))
            {
                return BadRequest(new { campo = "nombre", mensaje = "El nombre es obligatorio." });
            }

            if (string.IsNullOrWhiteSpace(paisResidencia))
            {
                return BadRequest(new { campo = "paisResidencia", mensaje = "El país de residencia es obligatorio." });
            }

            if (!request.AceptoTerminos)
            {
                // A3: no acepta términos -> el registro no se completa.
                return BadRequest(new { campo = "aceptoTerminos", mensaje = "Debes aceptar los términos de uso y el aviso de privacidad para continuar." });
            }

            if (request.EsCuentaDesarrollo && !_environment.IsDevelopment())
            {
                // La opción "solo para desarrollo" no debe poder usarse fuera
                // de Development: es lo que impide que alguien la use para
                // saltarse la verificación real en un entorno productivo.
                return BadRequest(new { campo = "esCuentaDesarrollo", mensaje = "La opción de cuenta de desarrollo no está disponible en este entorno." });
            }

            TipoContacto tipoContacto;
            if (RegexCorreo.IsMatch(identificador))
            {
                tipoContacto = TipoContacto.Correo;
                identificador = identificador.ToLowerInvariant();
            }
            else if (RegexTelefono.IsMatch(identificador))
            {
                tipoContacto = TipoContacto.Telefono;
            }
            else
            {
                return BadRequest(new { campo = "correoOTelefono", mensaje = "Ingresa un correo electrónico válido o un teléfono a 10 dígitos." });
            }

            if (!RegexPasswordValida.IsMatch(password))
            {
                return BadRequest(new { campo = "password", mensaje = "La contraseña debe tener al menos 8 caracteres, con al menos una letra y un número." });
            }

            var yaExiste = await _context.Usuarios
                .AnyAsync(u => u.CorreoOTelefono == identificador);

            if (yaExiste)
            {
                // A1: correo o teléfono existente -> se ofrece iniciar sesión o recuperar acceso.
                return Conflict(new
                {
                    mensaje = "Ya existe una cuenta con ese correo o teléfono.",
                    accion = "iniciar-sesion"
                });
            }

            var usuario = new Usuario
            {
                Nombre = nombre,
                CorreoOTelefono = identificador,
                TipoContacto = tipoContacto,
                PasswordHash = PasswordHasher.HashPassword(password),
                PaisResidencia = paisResidencia,
                Rol = "Aspirante",
                Estado = EstadoCuenta.PendienteVerificacion,
                AceptoTerminosEn = DateTime.UtcNow,
                FechaCreacion = DateTime.UtcNow,
                EsCuentaDesarrollo = request.EsCuentaDesarrollo
            };

            _context.Usuarios.Add(usuario);
            await _context.SaveChangesAsync();

            string? codigoVerificacionDev;
            try
            {
                codigoVerificacionDev = await GenerarYEnviarCodigoAsync(usuario, PropositoCodigo.VerificacionCuenta);
            }
            catch (EnvioCodigoFallidoException)
            {
                // No se pudo enviar el código de verdad: no dejamos la cuenta
                // creada a medias (sin forma de verificarla). Se revierte
                // para que la persona pueda volver a registrarse con el
                // mismo correo/teléfono más tarde, en vez de toparse con
                // "ya existe una cuenta" sin poder usarla nunca.
                _context.Usuarios.Remove(usuario);
                await _context.SaveChangesAsync();

                return StatusCode(500, new { mensaje = "Ocurrió un error inesperado, vuelva a intentar más tarde." });
            }

            return Ok(new
            {
                mensaje = usuario.EsCuentaDesarrollo
                    ? "Cuenta de desarrollo creada. Usa el código que aparece en esta pantalla para verificarla."
                    : "Cuenta creada. Revisa tu correo/teléfono para el código de verificación.",
                usuarioId = usuario.Id,
                correoOTelefono = usuario.CorreoOTelefono,
                // Null en cuanto el canal tenga un proveedor real conectado
                // (ver IServicioVerificacion.EnviaCodigoDeVerdad): mientras
                // no lo tenga, aquí viaja el código para poder probar el
                // flujo de forma visual. Para cuentas de desarrollo siempre
                // viaja, sin importar qué proveedor real esté configurado.
                codigoVerificacionDev
            });
        }

        [HttpPost("verificar")]
        public async Task<IActionResult> Verificar([FromBody] VerificarRequest request)
        {
            if (request is null)
            {
                return BadRequest(new { mensaje = "Solicitud inválida." });
            }

            var identificador = NormalizarIdentificador(request.CorreoOTelefono);
            var codigoIngresado = (request.Codigo ?? string.Empty).Trim();

            var usuario = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.CorreoOTelefono == identificador);

            if (usuario is null)
            {
                return NotFound(new { mensaje = "No se encontró una cuenta con ese correo o teléfono." });
            }

            if (usuario.Estado == EstadoCuenta.Activa)
            {
                return Ok(new { mensaje = "La cuenta ya estaba verificada.", yaVerificada = true });
            }

            if (usuario.Estado == EstadoCuenta.Bloqueada)
            {
                return BadRequest(new { mensaje = "La cuenta está bloqueada por demasiados intentos fallidos. Solicita un nuevo código." });
            }

            var codigoVigente = await _context.CodigosVerificacion
                .Where(c => c.UsuarioId == usuario.Id && !c.Usado && c.Proposito == PropositoCodigo.VerificacionCuenta)
                .OrderByDescending(c => c.FechaCreacion)
                .FirstOrDefaultAsync();

            if (codigoVigente is null)
            {
                return BadRequest(new { mensaje = "No hay un código activo. Solicita uno nuevo." });
            }

            if (codigoVigente.FechaExpiracion < DateTime.UtcNow)
            {
                // A2: código vencido -> se permite solicitar uno nuevo.
                return BadRequest(new { mensaje = "El código expiró. Solicita uno nuevo.", expirado = true });
            }

            if (codigoVigente.Codigo != codigoIngresado)
            {
                // A2: código incorrecto -> límite de intentos.
                codigoVigente.IntentosFallidos += 1;

                if (codigoVigente.IntentosFallidos >= MaxIntentosFallidos)
                {
                    codigoVigente.Usado = true;
                    usuario.Estado = EstadoCuenta.Bloqueada;
                    await _context.SaveChangesAsync();

                    return BadRequest(new
                    {
                        mensaje = "Demasiados intentos fallidos. La cuenta quedó bloqueada; solicita un nuevo código.",
                        bloqueada = true
                    });
                }

                await _context.SaveChangesAsync();

                return BadRequest(new
                {
                    mensaje = "Código incorrecto.",
                    intentosRestantes = MaxIntentosFallidos - codigoVigente.IntentosFallidos
                });
            }

            codigoVigente.Usado = true;
            usuario.Estado = EstadoCuenta.Activa;
            usuario.FechaVerificacion = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Cuenta verificada correctamente.", verificada = true });
        }

        [HttpPost("reenviar-codigo")]
        public async Task<IActionResult> ReenviarCodigo([FromBody] ReenviarCodigoRequest request)
        {
            if (request is null)
            {
                return BadRequest(new { mensaje = "Solicitud inválida." });
            }

            var identificador = NormalizarIdentificador(request.CorreoOTelefono);

            var usuario = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.CorreoOTelefono == identificador);

            if (usuario is null)
            {
                return NotFound(new { mensaje = "No se encontró una cuenta con ese correo o teléfono." });
            }

            if (usuario.Estado == EstadoCuenta.Activa)
            {
                return BadRequest(new { mensaje = "La cuenta ya está verificada." });
            }

            var ultimoCodigo = await _context.CodigosVerificacion
                .Where(c => c.UsuarioId == usuario.Id && c.Proposito == PropositoCodigo.VerificacionCuenta)
                .OrderByDescending(c => c.FechaCreacion)
                .FirstOrDefaultAsync();

            if (ultimoCodigo is not null)
            {
                var segundosDesdeUltimo = (DateTime.UtcNow - ultimoCodigo.FechaCreacion).TotalSeconds;
                if (segundosDesdeUltimo < SegundosEntreReenvios)
                {
                    return StatusCode(429, new
                    {
                        mensaje = "Espera un poco antes de solicitar otro código.",
                        segundosRestantes = (int)Math.Ceiling(SegundosEntreReenvios - segundosDesdeUltimo)
                    });
                }

                ultimoCodigo.Usado = true;
            }

            // Un reenvío exitoso desbloquea la cuenta si se había bloqueado
            // por intentos fallidos del código anterior.
            if (usuario.Estado == EstadoCuenta.Bloqueada)
            {
                usuario.Estado = EstadoCuenta.PendienteVerificacion;
            }

            string? codigoVerificacionDev;
            try
            {
                codigoVerificacionDev = await GenerarYEnviarCodigoAsync(usuario, PropositoCodigo.VerificacionCuenta);
            }
            catch (EnvioCodigoFallidoException)
            {
                return StatusCode(500, new { mensaje = "Ocurrió un error inesperado, vuelva a intentar más tarde." });
            }

            return Ok(new
            {
                mensaje = "Se generó un nuevo código.",
                codigoVerificacionDev
            });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (request is null)
            {
                return BadRequest(new { mensaje = "Solicitud inválida." });
            }

            var identificador = NormalizarIdentificador(request.CorreoOTelefono);
            var password = request.Password ?? string.Empty;

            var usuario = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.CorreoOTelefono == identificador);

            // Mensaje genérico: no revela si el usuario existe o si fue la
            // contraseña la que falló (A1).
            var credencialesInvalidas = new ObjectResult(new { mensaje = "Correo/teléfono o contraseña incorrectos." })
            {
                StatusCode = StatusCodes.Status401Unauthorized
            };

            // A2: cuenta con bloqueo temporal vigente por intentos fallidos de login.
            if (usuario is not null && usuario.BloqueadoHasta is DateTime bloqueadoHasta && bloqueadoHasta > DateTime.UtcNow)
            {
                await RegistrarIntentoAccesoAsync(identificador, usuario.Id, ResultadoAcceso.CuentaBloqueada);

                var minutosRestantes = Math.Max(1, (int)Math.Ceiling((bloqueadoHasta - DateTime.UtcNow).TotalMinutes));
                return BadRequest(new
                {
                    mensaje = $"Demasiados intentos fallidos. Intenta de nuevo en {minutosRestantes} minuto(s) o recupera tu acceso.",
                    bloqueadaTemporalmente = true
                });
            }

            if (usuario is null || !PasswordHasher.VerifyPassword(password, usuario.PasswordHash))
            {
                if (usuario is not null)
                {
                    usuario.IntentosFallidosLogin += 1;

                    if (usuario.IntentosFallidosLogin >= MaxIntentosFallidosLogin)
                    {
                        usuario.BloqueadoHasta = DateTime.UtcNow.AddMinutes(MinutosBloqueoLogin);
                    }

                    await _context.SaveChangesAsync();
                }

                await RegistrarIntentoAccesoAsync(identificador, usuario?.Id, ResultadoAcceso.CredencialesInvalidas);

                return credencialesInvalidas;
            }

            if (usuario.Estado == EstadoCuenta.PendienteVerificacion)
            {
                await RegistrarIntentoAccesoAsync(identificador, usuario.Id, ResultadoAcceso.CuentaNoVerificada);
                return BadRequest(new { mensaje = "Tu cuenta aún no ha sido verificada.", requiereVerificacion = true });
            }

            if (usuario.Estado == EstadoCuenta.Bloqueada)
            {
                await RegistrarIntentoAccesoAsync(identificador, usuario.Id, ResultadoAcceso.CuentaBloqueada);
                return BadRequest(new { mensaje = "Tu cuenta está bloqueada. Solicita un nuevo código de verificación." });
            }

            // Login exitoso: se resetea el contador de intentos y se crea la sesión.
            usuario.IntentosFallidosLogin = 0;
            usuario.BloqueadoHasta = null;
            await _context.SaveChangesAsync();

            await IniciarSesionAsync(usuario);
            await RegistrarIntentoAccesoAsync(identificador, usuario.Id, ResultadoAcceso.Exitoso);

            return Ok(new
            {
                mensaje = "Inicio de sesión exitoso.",
                usuarioId = usuario.Id,
                nombre = usuario.Nombre,
                rol = usuario.Rol
            });
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Ok(new { mensaje = "Sesión cerrada." });
        }

        [Authorize]
        [HttpGet("sesion")]
        public IActionResult Sesion()
        {
            var nombre = User.FindFirstValue(ClaimTypes.Name);
            var rol = User.FindFirstValue(ClaimTypes.Role);
            var usuarioId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            return Ok(new
            {
                usuarioId,
                nombre,
                rol
            });
        }

        [HttpPost("recuperar-acceso")]
        public async Task<IActionResult> RecuperarAcceso([FromBody] RecuperarAccesoRequest request)
        {
            if (request is null)
            {
                return BadRequest(new { mensaje = "Solicitud inválida." });
            }

            var identificador = NormalizarIdentificador(request.CorreoOTelefono);

            var usuario = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.CorreoOTelefono == identificador);

            // Por privacidad, la respuesta es la misma exista o no la cuenta:
            // a diferencia del registro (donde decir "ya existe" es útil),
            // aquí confirmar o negar la existencia de una cuenta por este
            // canal sí sería un problema de seguridad.
            var respuestaGenerica = Ok(new
            {
                mensaje = "Si existe una cuenta con ese correo o teléfono, se generó un código de recuperación."
            });

            if (usuario is null)
            {
                return respuestaGenerica;
            }

            string? codigoVerificacionDev;
            try
            {
                codigoVerificacionDev = await GenerarYEnviarCodigoAsync(usuario, PropositoCodigo.RecuperacionContrasena);
            }
            catch (EnvioCodigoFallidoException)
            {
                return StatusCode(500, new { mensaje = "Ocurrió un error inesperado, vuelva a intentar más tarde." });
            }

            // Nota: aquí sí regresamos el código en la respuesta (modo de
            // prueba visual, igual que en CU-01) porque en un escenario real
            // esta llamada la hace la propia persona intentando recuperar su
            // cuenta, así que no hay problema de privacidad en mostrárselo a
            // ella directamente en pantalla mientras no haya envío real para
            // ese canal (una vez que lo hay, EnviaCodigoDeVerdad hace que
            // este campo viaje en null, igual que en CU-01).
            return Ok(new
            {
                mensaje = "Si existe una cuenta con ese correo o teléfono, se generó un código de recuperación.",
                correoOTelefono = usuario.CorreoOTelefono,
                codigoVerificacionDev
            });
        }

        [HttpPost("restablecer-contrasena")]
        public async Task<IActionResult> RestablecerContrasena([FromBody] RestablecerContrasenaRequest request)
        {
            if (request is null)
            {
                return BadRequest(new { mensaje = "Solicitud inválida." });
            }

            var identificador = NormalizarIdentificador(request.CorreoOTelefono);
            var codigoIngresado = (request.Codigo ?? string.Empty).Trim();
            var nuevaPassword = request.NuevaPassword ?? string.Empty;
            var confirmarPassword = request.ConfirmarPassword ?? string.Empty;

            if (nuevaPassword != confirmarPassword)
            {
                return BadRequest(new { campo = "confirmarPassword", mensaje = "Las contraseñas no coinciden." });
            }

            if (!RegexPasswordValida.IsMatch(nuevaPassword))
            {
                return BadRequest(new { campo = "nuevaPassword", mensaje = "La contraseña debe tener al menos 8 caracteres, con al menos una letra y un número." });
            }

            var usuario = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.CorreoOTelefono == identificador);

            if (usuario is null)
            {
                return NotFound(new { mensaje = "No se encontró una cuenta con ese correo o teléfono." });
            }

            var codigoVigente = await _context.CodigosVerificacion
                .Where(c => c.UsuarioId == usuario.Id && !c.Usado && c.Proposito == PropositoCodigo.RecuperacionContrasena)
                .OrderByDescending(c => c.FechaCreacion)
                .FirstOrDefaultAsync();

            if (codigoVigente is null)
            {
                return BadRequest(new { mensaje = "No hay un código de recuperación activo. Solicita uno nuevo." });
            }

            if (codigoVigente.FechaExpiracion < DateTime.UtcNow)
            {
                return BadRequest(new { mensaje = "El código expiró. Solicita uno nuevo.", expirado = true });
            }

            if (codigoVigente.Codigo != codigoIngresado)
            {
                codigoVigente.IntentosFallidos += 1;

                if (codigoVigente.IntentosFallidos >= MaxIntentosFallidos)
                {
                    codigoVigente.Usado = true;
                    await _context.SaveChangesAsync();

                    return BadRequest(new
                    {
                        mensaje = "Demasiados intentos fallidos. Solicita un nuevo código de recuperación.",
                        bloqueado = true
                    });
                }

                await _context.SaveChangesAsync();

                return BadRequest(new
                {
                    mensaje = "Código incorrecto.",
                    intentosRestantes = MaxIntentosFallidos - codigoVigente.IntentosFallidos
                });
            }

            codigoVigente.Usado = true;
            usuario.PasswordHash = PasswordHasher.HashPassword(nuevaPassword);

            // Recuperar la contraseña es una prueba fuerte de que la persona es
            // dueña de la cuenta: de paso se levanta cualquier bloqueo temporal
            // de login que hubiera por intentos fallidos previos.
            usuario.IntentosFallidosLogin = 0;
            usuario.BloqueadoHasta = null;

            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Contraseña restablecida correctamente. Ya puedes iniciar sesión." });
        }

        private static string NormalizarIdentificador(string? valor)
        {
            var limpio = (valor ?? string.Empty).Trim();
            return RegexCorreo.IsMatch(limpio) ? limpio.ToLowerInvariant() : limpio;
        }

        /// <summary>
        /// Se lanza cuando IServicioVerificacion.EnviarCodigoAsync truena de
        /// verdad (proveedor real configurado y el envío falló). Cada
        /// endpoint que llama a GenerarYEnviarCodigoAsync decide qué revertir
        /// (ver los catch de Registro/ReenviarCodigo/RecuperarAcceso) y
        /// responde con el mismo mensaje genérico en pantalla.
        /// </summary>
        private sealed class EnvioCodigoFallidoException : Exception
        {
        }

        /// <summary>
        /// Genera el código, lo guarda y lo manda por el canal de la cuenta.
        /// Regresa el código solo si el proveedor activo todavía no manda de
        /// verdad para ese canal (ver IServicioVerificacion.EnviaCodigoDeVerdad) —
        /// así CuentasController puede seguir regresándolo en la respuesta
        /// nada más mientras haga falta para probar el flujo sin envío real.
        /// Si el envío falla, se revierte el CodigoVerificacion recién creado
        /// y se propaga EnvioCodigoFallidoException para que el endpoint que
        /// llamó decida qué más revertir.
        /// </summary>
        private async Task<string?> GenerarYEnviarCodigoAsync(Usuario usuario, PropositoCodigo proposito)
        {
            var codigo = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");

            var codigoVerificacion = new CodigoVerificacion
            {
                UsuarioId = usuario.Id,
                Codigo = codigo,
                Proposito = proposito,
                FechaCreacion = DateTime.UtcNow,
                FechaExpiracion = DateTime.UtcNow.AddMinutes(MinutosVigenciaCodigo),
                IntentosFallidos = 0,
                Usado = false
            };

            _context.CodigosVerificacion.Add(codigoVerificacion);
            await _context.SaveChangesAsync();

            // Las cuentas de desarrollo (ver Registro.jsx y el guard en
            // Registro más arriba) siempre usan el canal de consola, sin
            // importar qué proveedor real esté configurado — así el código
            // nunca sale de la base de datos/el log de este servidor.
            IServicioVerificacion servicio = usuario.EsCuentaDesarrollo
                ? _servicioVerificacionConsola
                : _servicioVerificacion;

            try
            {
                await servicio.EnviarCodigoAsync(usuario.CorreoOTelefono, codigo, usuario.TipoContacto, usuario.PaisResidencia);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "No se pudo enviar el código de verificación a {Destino}.", usuario.CorreoOTelefono);

                _context.CodigosVerificacion.Remove(codigoVerificacion);
                await _context.SaveChangesAsync();

                throw new EnvioCodigoFallidoException();
            }

            return servicio.EnviaCodigoDeVerdad(usuario.TipoContacto, usuario.PaisResidencia) ? null : codigo;
        }

        private async Task IniciarSesionAsync(Usuario usuario)
        {
            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
                new(ClaimTypes.Name, usuario.Nombre),
                new(ClaimTypes.Role, usuario.Rol),
            };

            var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            var principal = new ClaimsPrincipal(identity);

            await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);
        }

        private async Task RegistrarIntentoAccesoAsync(string identificadorIngresado, int? usuarioId, ResultadoAcceso resultado)
        {
            _context.IntentosAcceso.Add(new IntentoAcceso
            {
                CorreoOTelefonoIngresado = identificadorIngresado,
                UsuarioId = usuarioId,
                Resultado = resultado,
                FechaHora = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
        }
    }
}
