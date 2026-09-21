using System.Security.Claims;
using Backend.Data;
using Backend.Models;
using Backend.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    /// <summary>
    /// CU-04: carga y mantenimiento de documentación. Protegido por la misma
    /// sesión de cookie de CU-02 — nadie puede leer, subir o eliminar un
    /// documento que no sea el propio.
    ///
    /// Los siete tipos documentales son de "slot único" por aspirante: subir
    /// un archivo nuevo del mismo tipo marca el anterior como no vigente
    /// (conserva la versión) y crea uno nuevo.
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("api/documentos")]
    public class DocumentosController : ControllerBase
    {
        private const long TamanioMaximoBytes = 5 * 1024 * 1024; // 5 MB
        private const int DiasAvisoVencimiento = 30;

        private static readonly string[] ExtensionesPermitidas = { ".pdf", ".jpg", ".jpeg", ".png" };
        private static readonly string[] ContentTypesPermitidos = { "application/pdf", "image/jpeg", "image/png" };

        // Nombres legibles en el orden en que se muestran en el frontend.
        private static readonly TipoDocumento[] OrdenCatalogo =
        {
            TipoDocumento.Ine,
            TipoDocumento.Rfc,
            TipoDocumento.ActaNacimiento,
            TipoDocumento.CartillaMilitar,
            TipoDocumento.RecomendacionLaboral,
            TipoDocumento.RecomendacionPersonal,
            TipoDocumento.ComprobanteEstudios
        };

        private readonly AppDbContext _context;
        private readonly byte[] _llaveCifrado;

        public DocumentosController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;

            var llaveBase64 = configuration["CifradoDocumentos:Llave"]
                ?? throw new InvalidOperationException("Falta configurar CifradoDocumentos:Llave en appsettings.");
            _llaveCifrado = Convert.FromBase64String(llaveBase64);
        }

        public class SubirDocumentoRequest
        {
            public string TipoDocumento { get; set; } = string.Empty;
            public IFormFile? Archivo { get; set; }
            public string? FechaVigencia { get; set; }
        }

        [HttpGet]
        public async Task<IActionResult> Listado()
        {
            var usuarioId = ObtenerUsuarioIdActual();

            var vigentes = await _context.Documentos
                .Where(d => d.UsuarioId == usuarioId && d.Vigente && d.FechaEliminacion == null)
                .ToListAsync();

            var porTipo = vigentes.ToDictionary(d => d.TipoDocumento);

            var resultado = OrdenCatalogo.Select(tipo =>
            {
                porTipo.TryGetValue(tipo, out var documento);
                return new
                {
                    tipoDocumento = tipo.ToString(),
                    id = documento?.Id,
                    nombreArchivo = documento?.NombreArchivoOriginal,
                    // Postulacion.jsx la usa para decidir si puede reutilizar
                    // este documento (solo acepta PDF; Documentos también
                    // permite JPG/PNG).
                    contentType = documento?.ContentType,
                    tamanioBytes = documento?.TamanioBytes,
                    fechaCarga = documento?.FechaCarga,
                    fechaVigencia = documento?.FechaVigencia,
                    numeroVersion = documento?.NumeroVersion,
                    estado = CalcularEstado(documento)
                };
            });

            return Ok(resultado);
        }

        [HttpPost]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Subir([FromForm] SubirDocumentoRequest request)
        {
            var usuarioId = ObtenerUsuarioIdActual();

            if (!Enum.TryParse<TipoDocumento>(request.TipoDocumento, ignoreCase: true, out var tipo))
            {
                return BadRequest(new { mensaje = "Tipo documental no válido." });
            }

            // A1: archivo inválido (ausente, demasiado grande, o formato/extensión no permitidos).
            var archivo = request.Archivo;
            if (archivo is null || archivo.Length == 0)
            {
                return BadRequest(new { campo = "archivo", mensaje = "Selecciona un archivo." });
            }

            if (archivo.Length > TamanioMaximoBytes)
            {
                return BadRequest(new { campo = "archivo", mensaje = "El archivo no debe pesar más de 5 MB." });
            }

            var extension = Path.GetExtension(archivo.FileName).ToLowerInvariant();
            if (!ExtensionesPermitidas.Contains(extension) || !ContentTypesPermitidos.Contains(archivo.ContentType))
            {
                return BadRequest(new { campo = "archivo", mensaje = "Solo se permiten archivos PDF, JPG o PNG." });
            }

            byte[] contenidoOriginal;
            using (var ms = new MemoryStream())
            {
                await archivo.CopyToAsync(ms);
                contenidoOriginal = ms.ToArray();
            }

            // A3: el contenido real del archivo no corresponde a ningún formato
            // reconocido (aunque la extensión/Content-Type declarados sí lo sean) —
            // es lo más parecido a "documento ilegible o dañado" que se puede
            // verificar del lado del servidor sin abrir visualmente el archivo.
            if (!FormatoRealCoincide(contenidoOriginal, extension))
            {
                return BadRequest(new
                {
                    campo = "archivo",
                    mensaje = "El archivo parece estar dañado o no corresponde a un PDF/imagen válido. Intenta cargar el archivo de nuevo."
                });
            }

            DateTime? fechaVigencia = null;
            if (!string.IsNullOrWhiteSpace(request.FechaVigencia))
            {
                if (!DateTime.TryParse(request.FechaVigencia, out var fechaParseada))
                {
                    return BadRequest(new { campo = "fechaVigencia", mensaje = "La fecha de vigencia no es válida." });
                }
                fechaVigencia = fechaParseada.Date;
            }

            var anterior = await _context.Documentos
                .Where(d => d.UsuarioId == usuarioId && d.TipoDocumento == tipo && d.Vigente)
                .FirstOrDefaultAsync();

            if (anterior is not null)
            {
                anterior.Vigente = false;
            }

            var nuevoDocumento = new DocumentoAspirante
            {
                UsuarioId = usuarioId,
                TipoDocumento = tipo,
                NombreArchivoOriginal = archivo.FileName,
                ContentType = archivo.ContentType,
                TamanioBytes = archivo.Length,
                ContenidoCifrado = CifradoArchivos.Cifrar(contenidoOriginal, _llaveCifrado),
                HashSha256 = CifradoArchivos.CalcularHashSha256(contenidoOriginal),
                FechaVigencia = fechaVigencia,
                NumeroVersion = (anterior?.NumeroVersion ?? 0) + 1,
                Vigente = true,
                FechaCarga = DateTime.UtcNow
            };

            _context.Documentos.Add(nuevoDocumento);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Documento cargado correctamente.",
                id = nuevoDocumento.Id,
                numeroVersion = nuevoDocumento.NumeroVersion,
                estado = CalcularEstado(nuevoDocumento)
            });
        }

        [HttpGet("{id:int}/archivo")]
        public async Task<IActionResult> ObtenerArchivo(int id)
        {
            var usuarioId = ObtenerUsuarioIdActual();

            var documento = await _context.Documentos
                .FirstOrDefaultAsync(d => d.Id == id && d.UsuarioId == usuarioId && d.FechaEliminacion == null);

            if (documento is null)
            {
                return NotFound(new { mensaje = "Documento no encontrado." });
            }

            var contenido = CifradoArchivos.Descifrar(documento.ContenidoCifrado, _llaveCifrado);

            // Verificación básica de integridad: si el hash del contenido ya
            // descifrado no coincide con el que se calculó al momento de la
            // carga, algo corrompió el dato guardado (no la llave: si la
            // llave fuera incorrecta, Descifrar ya habría fallado antes).
            if (CifradoArchivos.CalcularHashSha256(contenido) != documento.HashSha256)
            {
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { mensaje = "El documento almacenado parece estar dañado. Vuelve a cargarlo." });
            }

            // Sin fileDownloadName: no se fuerza Content-Disposition: attachment,
            // así el navegador puede mostrarlo directamente (PDF o imagen) si se
            // abre en una pestaña nueva, en vez de descargarlo siempre.
            return File(contenido, documento.ContentType);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Eliminar(int id)
        {
            var usuarioId = ObtenerUsuarioIdActual();

            var documento = await _context.Documentos
                .FirstOrDefaultAsync(d => d.Id == id && d.UsuarioId == usuarioId && d.FechaEliminacion == null);

            if (documento is null)
            {
                return NotFound(new { mensaje = "Documento no encontrado." });
            }

            // Nota: CU-04 (A5) contempla restringir la eliminación cuando el
            // aspirante tiene un "proceso activo". Se deja fuera de este
            // alcance a propósito — ver "Pendientes por resolver fuera de
            // los casos de uso.md" — porque hoy no existe ningún concepto de
            // proceso de selección ligado a la cuenta contra el cual validar
            // esta restricción.
            documento.FechaEliminacion = DateTime.UtcNow;
            documento.Vigente = false;
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Documento eliminado." });
        }

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

        private static string CalcularEstado(DocumentoAspirante? documento)
        {
            if (documento is null)
            {
                return "sinCargar";
            }

            if (documento.FechaVigencia is null)
            {
                return "vigente";
            }

            var hoy = DateTime.UtcNow.Date;
            var vigencia = documento.FechaVigencia.Value.Date;

            if (vigencia < hoy)
            {
                return "vencido";
            }

            if ((vigencia - hoy).TotalDays <= DiasAvisoVencimiento)
            {
                return "porVencer";
            }

            return "vigente";
        }

        private int ObtenerUsuarioIdActual()
        {
            var valor = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.Parse(valor!);
        }
    }
}
