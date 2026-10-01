using System.Security.Claims;
using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    /// <summary>
    /// Postulaciones a un perfil de puesto ESPECÍFICO (formulario
    /// "Postularme" en PostularsePerfilPuesto.jsx). Distinto de
    /// PostulacionesController (el registro general y público de
    /// Postulacion.jsx): aquí sí se exige sesión iniciada — el propio
    /// frontend ya redirige a /login si no hay usuario — y la escolaridad
    /// no la elige el aspirante, la define el perfil de puesto.
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class PostulacionesPuestoController : ControllerBase
    {
        private const int RfcLongitud = 13;
        private const int CurpLongitud = 18;

        // Formatos que acepta "Documentación requerida" (PerfilPuestoDocumento):
        // los mismos tres que ya acepta Documentos.jsx/DocumentosController
        // (CU-04), porque ahora PostularsePerfilPuesto.jsx puede precargar
        // aquí un documento que el aspirante ya tenía cargado en su perfil, y
        // ese documento pudo haberse guardado como JPG/PNG, no solo PDF.
        // Comprobante de estudios y certificaciones NO cambian: siguen
        // exigiendo PDF, es una regla de negocio aparte que no se tocó.
        private static readonly string[] ExtensionesDocumentoPermitidas = { ".pdf", ".jpg", ".jpeg", ".png" };
        private static readonly string[] ContentTypesDocumentoPermitidos = { "application/pdf", "image/jpeg", "image/png" };

        private readonly AppDbContext _context;
        private readonly ILogger<PostulacionesPuestoController> _logger;

        public PostulacionesPuestoController(AppDbContext context, ILogger<PostulacionesPuestoController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpPost]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Registrar(
            [FromForm] int perfilPuestoId,
            [FromForm] string nombre,
            [FromForm] string apellidoPaterno,
            [FromForm] string estado,
            [FromForm] string telefono,
            [FromForm] string correo,
            [FromForm] string expectativasSalariales,
            [FromForm] string rfcTexto,
            [FromForm] string curpTexto,
            IFormFile comprobanteEstudios,
            [FromForm] string? apellidoMaterno = null,
            [FromForm] string? municipio = null,
            [FromForm] string? habilidadesClave = null,
            // Documentación requerida del perfil de puesto: listas paralelas,
            // un Id de PerfilPuestoDocumento por cada archivo, en el mismo
            // orden — mismo patrón que certificacionesNombres/Archivos en
            // PostulacionesController. Vacías si el perfil no pide ninguno.
            [FromForm] List<int>? documentosIds = null,
            List<IFormFile>? documentosArchivos = null,
            // Certificaciones que pide el perfil académico del perfil de
            // puesto (RRHH_Reclutamiento_PerfilesPuesto_Certificaciones):
            // mismas listas paralelas que documentosIds/Archivos, pero acá
            // TODAS son obligatorias (esa tabla no tiene columna
            // Obligatorio — es decisión del proyecto).
            [FromForm] List<int>? certificacionesIds = null,
            List<IFormFile>? certificacionesArchivos = null)
        {
            var usuarioId = ObtenerUsuarioIdActual();

            var perfilPuesto = await _context.PerfilesPuesto
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == perfilPuestoId);

            if (perfilPuesto == null)
            {
                return NotFound(new { mensaje = "No se encontró el perfil de puesto solicitado." });
            }

            // La "versión vigente" de un perfil de puesto se identifica por
            // NumeroVersion, no por Id — mismo criterio que
            // PerfilesPuestoController.ConstruirProyeccionAsync.
            var version = await _context.PerfilesPuestoVersiones
                .AsNoTracking()
                .FirstOrDefaultAsync(v => v.PerfilId == perfilPuesto.Id && v.NumeroVersion == perfilPuesto.VersionActual);

            if (version == null)
            {
                return BadRequest(new { mensaje = "Este perfil de puesto no tiene una versión vigente disponible." });
            }

            // Una sola postulación por usuario por vacante (ver el índice
            // único en CrearPostulacionesPuesto.sql).
            var yaSePostulo = await _context.PostulacionesPuesto
                .AsNoTracking()
                .AnyAsync(p => p.UsuarioId == usuarioId && p.PerfilPuestoId == perfilPuesto.Id);

            if (yaSePostulo)
            {
                return Conflict(new { mensaje = "Ya tienes una postulación registrada para esta vacante." });
            }

            if (string.IsNullOrWhiteSpace(nombre) ||
                string.IsNullOrWhiteSpace(apellidoPaterno) ||
                string.IsNullOrWhiteSpace(estado) ||
                string.IsNullOrWhiteSpace(telefono) ||
                string.IsNullOrWhiteSpace(correo) ||
                string.IsNullOrWhiteSpace(expectativasSalariales) ||
                string.IsNullOrWhiteSpace(rfcTexto) ||
                string.IsNullOrWhiteSpace(curpTexto))
            {
                return BadRequest(new { mensaje = "Completa todos los campos obligatorios." });
            }

            var rfcValor = rfcTexto.Trim().ToUpperInvariant();
            var curpValor = curpTexto.Trim().ToUpperInvariant();

            if (rfcValor.Length != RfcLongitud)
            {
                return BadRequest(new { mensaje = $"El RFC debe tener {RfcLongitud} caracteres." });
            }

            if (curpValor.Length != CurpLongitud)
            {
                return BadRequest(new { mensaje = $"El CURP debe tener {CurpLongitud} caracteres." });
            }

            if (comprobanteEstudios == null || comprobanteEstudios.Length == 0)
            {
                return BadRequest(new { mensaje = "El comprobante de estudios en PDF es obligatorio." });
            }

            if (!comprobanteEstudios.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ||
                comprobanteEstudios.ContentType != "application/pdf")
            {
                return BadRequest(new { mensaje = "El comprobante de estudios debe ser un archivo PDF." });
            }

            // Documentación requerida: solo los renglones vigentes (Activo)
            // de esta versión cuentan — mismo criterio que el filtro que ya
            // aplica PostularsePerfilPuesto.jsx sobre perfilPuesto.documentos.
            var documentosDeLaVersion = await _context.PerfilesPuestoDocumentos
                .AsNoTracking()
                .Where(d => d.VersionId == version.Id && d.Activo)
                .ToListAsync();

            var documentosPorId = documentosDeLaVersion.ToDictionary(d => d.Id);

            var idsRecibidos = documentosIds ?? new List<int>();
            var archivosRecibidos = documentosArchivos ?? new List<IFormFile>();

            if (idsRecibidos.Count != archivosRecibidos.Count)
            {
                return BadRequest(new { mensaje = "Cada documento debe tener su archivo correspondiente." });
            }

            var documentosAGuardar = new List<PostulacionPuestoDocumento>();
            var idsCubiertos = new HashSet<int>();

            for (var i = 0; i < idsRecibidos.Count; i++)
            {
                var documentoId = idsRecibidos[i];
                var archivo = archivosRecibidos[i];

                if (!documentosPorId.TryGetValue(documentoId, out var documentoDefinicion))
                {
                    return BadRequest(new { mensaje = "Uno de los documentos enviados no corresponde a este perfil de puesto." });
                }

                if (archivo == null || archivo.Length == 0)
                {
                    return BadRequest(new { mensaje = $"Falta el archivo del documento \"{documentoDefinicion.Nombre}\"." });
                }

                var extensionDocumento = Path.GetExtension(archivo.FileName).ToLowerInvariant();
                if (!ExtensionesDocumentoPermitidas.Contains(extensionDocumento) || !ContentTypesDocumentoPermitidos.Contains(archivo.ContentType))
                {
                    return BadRequest(new { mensaje = $"El documento \"{documentoDefinicion.Nombre}\" debe ser un archivo PDF, JPG o PNG." });
                }

                byte[] archivoBytes;
                using (var ms = new MemoryStream())
                {
                    await archivo.CopyToAsync(ms);
                    archivoBytes = ms.ToArray();
                }

                // Igual que DocumentosController: el Content-Type/extensión
                // declarados pueden mentir, así que se revisa la firma real
                // del contenido antes de aceptarlo.
                if (!FormatoRealCoincide(archivoBytes, extensionDocumento))
                {
                    return BadRequest(new
                    {
                        mensaje = $"El documento \"{documentoDefinicion.Nombre}\" parece estar dañado o no corresponde a un PDF/imagen válido."
                    });
                }

                documentosAGuardar.Add(new PostulacionPuestoDocumento
                {
                    PerfilPuestoDocumentoId = documentoId,
                    ArchivoFileName = archivo.FileName,
                    ArchivoBytes = archivoBytes
                });
                idsCubiertos.Add(documentoId);
            }

            // Todo documento Obligatorio (y Activo) de esta versión debe
            // venir cubierto — los opcionales pueden quedarse sin subir.
            var faltante = documentosDeLaVersion.FirstOrDefault(d => d.Obligatorio && !idsCubiertos.Contains(d.Id));
            if (faltante != null)
            {
                return BadRequest(new { mensaje = $"Falta el documento obligatorio \"{faltante.Nombre}\"." });
            }

            // Certificaciones que pide el perfil académico de esta versión:
            // a diferencia de los documentos, aquí TODAS las que liste el
            // perfil son obligatorias (esa tabla no distingue
            // obligatorias/opcionales — es decisión del proyecto).
            var certificacionesDeLaVersion = await _context.PerfilesPuestoCertificaciones
                .AsNoTracking()
                .Where(c => c.VersionId == version.Id)
                .ToListAsync();

            var certificacionesPorId = certificacionesDeLaVersion.ToDictionary(c => c.Id);

            var idsCertificacionesRecibidos = certificacionesIds ?? new List<int>();
            var archivosCertificacionesRecibidos = certificacionesArchivos ?? new List<IFormFile>();

            if (idsCertificacionesRecibidos.Count != archivosCertificacionesRecibidos.Count)
            {
                return BadRequest(new { mensaje = "Cada certificación debe tener su archivo correspondiente." });
            }

            var certificacionesAGuardar = new List<PostulacionPuestoCertificacion>();
            var idsCertificacionesCubiertos = new HashSet<int>();

            for (var i = 0; i < idsCertificacionesRecibidos.Count; i++)
            {
                var certificacionId = idsCertificacionesRecibidos[i];
                var archivo = archivosCertificacionesRecibidos[i];

                if (!certificacionesPorId.TryGetValue(certificacionId, out var certificacionDefinicion))
                {
                    return BadRequest(new { mensaje = "Una de las certificaciones enviadas no corresponde a este perfil de puesto." });
                }

                if (archivo == null || archivo.Length == 0)
                {
                    return BadRequest(new { mensaje = $"Falta el archivo de la certificación \"{certificacionDefinicion.Nombre}\"." });
                }

                if (!archivo.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ||
                    archivo.ContentType != "application/pdf")
                {
                    return BadRequest(new { mensaje = $"La certificación \"{certificacionDefinicion.Nombre}\" debe ser un archivo PDF." });
                }

                byte[] archivoCertificacionBytes;
                using (var ms = new MemoryStream())
                {
                    await archivo.CopyToAsync(ms);
                    archivoCertificacionBytes = ms.ToArray();
                }

                certificacionesAGuardar.Add(new PostulacionPuestoCertificacion
                {
                    PerfilPuestoCertificacionId = certificacionId,
                    ArchivoFileName = archivo.FileName,
                    ArchivoBytes = archivoCertificacionBytes
                });
                idsCertificacionesCubiertos.Add(certificacionId);
            }

            // Todas las certificaciones de esta versión son obligatorias.
            var certificacionFaltante = certificacionesDeLaVersion.FirstOrDefault(c => !idsCertificacionesCubiertos.Contains(c.Id));
            if (certificacionFaltante != null)
            {
                return BadRequest(new { mensaje = $"Falta la certificación \"{certificacionFaltante.Nombre}\"." });
            }

            byte[] comprobanteBytes;
            using (var ms = new MemoryStream())
            {
                await comprobanteEstudios.CopyToAsync(ms);
                comprobanteBytes = ms.ToArray();
            }

            var postulacionPuesto = new PostulacionPuesto
            {
                UsuarioId = usuarioId,
                PerfilPuestoId = perfilPuesto.Id,
                PerfilPuestoVersionId = version.Id,
                Nombre = nombre.Trim(),
                ApellidoPaterno = apellidoPaterno.Trim(),
                ApellidoMaterno = string.IsNullOrWhiteSpace(apellidoMaterno) ? null : apellidoMaterno.Trim(),
                Rfc = rfcValor,
                Curp = curpValor,
                Estado = estado.Trim(),
                Municipio = string.IsNullOrWhiteSpace(municipio) ? null : municipio.Trim(),
                Telefono = telefono.Trim(),
                Correo = correo.Trim(),
                ExpectativasSalariales = expectativasSalariales.Trim(),
                HabilidadesClave = string.IsNullOrWhiteSpace(habilidadesClave) ? null : habilidadesClave.Trim(),
                ComprobanteEstudiosFileName = comprobanteEstudios.FileName,
                ComprobanteEstudiosBytes = comprobanteBytes
            };

            _context.PostulacionesPuesto.Add(postulacionPuesto);
            await _context.SaveChangesAsync();

            if (documentosAGuardar.Count > 0)
            {
                foreach (var documento in documentosAGuardar)
                {
                    documento.PostulacionPuestoId = postulacionPuesto.Id;
                }

                _context.PostulacionesPuestoDocumentos.AddRange(documentosAGuardar);
                await _context.SaveChangesAsync();
            }

            if (certificacionesAGuardar.Count > 0)
            {
                foreach (var certificacion in certificacionesAGuardar)
                {
                    certificacion.PostulacionPuestoId = postulacionPuesto.Id;
                }

                _context.PostulacionesPuestoCertificaciones.AddRange(certificacionesAGuardar);
                await _context.SaveChangesAsync();
            }

            _logger.LogInformation("PostulacionPuesto registrada: usuario {UsuarioId}, perfil {PerfilPuestoId}", usuarioId, perfilPuesto.Id);

            return Ok(new { mensaje = "Postulación enviada correctamente.", id = postulacionPuesto.Id });
        }

        /// <summary>
        /// Le dice a PostularsePerfilPuesto.jsx (y en el futuro a
        /// PerfilPuestoDetalle.jsx/Vacantes.jsx) si el usuario en sesión ya
        /// se postuló a este perfil de puesto en particular, para
        /// deshabilitar el botón "Postularme" y mostrar la leyenda
        /// correspondiente.
        /// </summary>
        [HttpGet("mia/{perfilPuestoId:int}")]
        public async Task<IActionResult> MiPostulacion(int perfilPuestoId)
        {
            var usuarioId = ObtenerUsuarioIdActual();

            var existe = await _context.PostulacionesPuesto
                .AsNoTracking()
                .AnyAsync(p => p.UsuarioId == usuarioId && p.PerfilPuestoId == perfilPuestoId);

            return Ok(new { existe });
        }

        // Mismo criterio que DocumentosController: valida que el contenido
        // real del archivo (sus primeros bytes) corresponda a la extensión
        // declarada, en vez de confiar solo en el nombre/Content-Type.
        private static bool FormatoRealCoincide(byte[] contenido, string extensionDeclarada)
        {
            var formatoReal = DetectarFormatoReal(contenido);
            return extensionDeclarada switch
            {
                ".pdf" => formatoReal == "pdf",
                ".jpg" or ".jpeg" => formatoReal == "jpg",
                ".png" => formatoReal == "png",
                _ => false
            };
        }

        private static string? DetectarFormatoReal(byte[] contenido)
        {
            if (contenido.Length >= 4 && contenido[0] == 0x25 && contenido[1] == 0x50 && contenido[2] == 0x44 && contenido[3] == 0x46)
            {
                return "pdf"; // %PDF
            }

            if (contenido.Length >= 3 && contenido[0] == 0xFF && contenido[1] == 0xD8 && contenido[2] == 0xFF)
            {
                return "jpg";
            }

            if (contenido.Length >= 8 && contenido[0] == 0x89 && contenido[1] == 0x50 && contenido[2] == 0x4E && contenido[3] == 0x47
                && contenido[4] == 0x0D && contenido[5] == 0x0A && contenido[6] == 0x1A && contenido[7] == 0x0A)
            {
                return "png";
            }

            return null;
        }

        private int ObtenerUsuarioIdActual()
        {
            var valor = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.Parse(valor!);
        }
    }
}
