using System.Security.Claims;
using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PostulacionesController : ControllerBase
    {
        private const int RfcLongitud = 13;
        private const int CurpLongitud = 18;

        private readonly AppDbContext _context;
        private readonly ILogger<PostulacionesController> _logger;

        public PostulacionesController(AppDbContext context, ILogger<PostulacionesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpPost]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Registrar(
            [FromForm] string nombre,
            [FromForm] string apellidoPaterno,
            [FromForm] string apellidoMaterno,
            [FromForm] string correo,
            [FromForm] string estado,
            [FromForm] string municipio,
            [FromForm] string telefono,
            [FromForm] string maximaFormacionAcademica,
            [FromForm] int profesionId,
            [FromForm] int areaId,
            [FromForm] string expectativasSalariales,
            IFormFile cv,
            IFormFile ultimoComprobanteEstudios,
            IFormFile ine,
            IFormFile rfc,
            IFormFile actaNacimiento,
            IFormFile? cartaPresentacion = null,
            [FromForm] string? habilidadesClave = null,
            // Nombres "rfcTexto"/"curpTexto" (no "rfc"/"curp") a propósito:
            // "rfc" ya lo usa el IFormFile de arriba (el PDF escaneado) — estos
            // son el código alfanumérico capturado como texto, algo distinto.
            [FromForm] string? rfcTexto = null,
            [FromForm] string? curpTexto = null,
            // Certificaciones (opcional, varias filas): el formulario manda
            // un par "certificacionesNombres"/"certificacionesArchivos" por
            // cada fila que el postulante haya llenado, en el mismo orden en
            // que las agregó. Ambas listas llegan vacías si no capturó
            // ninguna — es un campo no obligatorio.
            [FromForm] List<string>? certificacionesNombres = null,
            List<IFormFile>? certificacionesArchivos = null)
        {
            // El formulario sigue siendo público (sin [Authorize]): esto no
            // exige sesión, solo la aprovecha si ya existe. La cookie de
            // autenticación se procesa igual en cada request aunque el
            // endpoint no la exija, así que si quien postula ya inició
            // sesión, User.Identity.IsAuthenticated viene en true sin que el
            // formulario tenga que mandar nada extra.
            int? usuarioId = null;
            if (User.Identity?.IsAuthenticated == true)
            {
                var claimUsuarioId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (int.TryParse(claimUsuarioId, out var usuarioIdParseado))
                {
                    usuarioId = usuarioIdParseado;
                }
            }

            // No se permite más de una postulación por cuenta: si quien envía
            // el formulario tiene sesión iniciada y ya tiene una postulación
            // registrada, se rechaza aquí. Esto respalda del lado del
            // servidor el bloqueo que ya hace Postulacion.jsx (botón
            // deshabilitado + leyenda) — sin esto, alguien podría saltarse
            // ese bloqueo llamando al endpoint directamente.
            if (usuarioId.HasValue)
            {
                var yaTienePostulacion = await _context.Postulaciones
                    .AsNoTracking()
                    .AnyAsync(p => p.UsuarioId == usuarioId.Value);

                if (yaTienePostulacion)
                {
                    return Conflict(new { mensaje = "Ya tienes una postulación registrada con esta cuenta." });
                }
            }

            if (string.IsNullOrWhiteSpace(nombre) ||
                string.IsNullOrWhiteSpace(apellidoPaterno) ||
                string.IsNullOrWhiteSpace(apellidoMaterno) ||
                string.IsNullOrWhiteSpace(correo) ||
                string.IsNullOrWhiteSpace(estado) ||
                string.IsNullOrWhiteSpace(municipio) ||
                string.IsNullOrWhiteSpace(telefono) ||
                string.IsNullOrWhiteSpace(rfcTexto) ||
                string.IsNullOrWhiteSpace(curpTexto) ||
                string.IsNullOrWhiteSpace(maximaFormacionAcademica) ||
                string.IsNullOrWhiteSpace(expectativasSalariales))
            {
                return BadRequest(new { mensaje = "Todos los campos son obligatorios excepto la carta de presentación y las habilidades clave." });
            }

            if (!System.Text.RegularExpressions.Regex.IsMatch(municipio, @"^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$"))
            {
                return BadRequest(new { mensaje = "El municipio no debe contener caracteres especiales ni números." });
            }

            // RFC y CURP (texto) son obligatorios y deben tener la longitud
            // exacta del documento real.
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

            // El área ya no es texto libre: viene como el Id de una fila del
            // catálogo compartido con SIATEC (dbo.RRHH_Reclutamiento_Areas).
            // Se valida que exista y siga activa antes de guardar nada.
            var area = await _context.Areas
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == areaId && a.Activa);

            if (area == null)
            {
                return BadRequest(new { mensaje = "Selecciona un área de interés válida." });
            }

            // Igual que ProfesionId en FormacionAcademica (ver
            // PerfilController.GuardarPerfil): la profesión/carrera concreta
            // es obligatoria y debe existir, estar activa, y tener el mismo
            // Nivel que maximaFormacionAcademica — el catálogo incluye
            // renglones "genéricos" (Secundaria, Preparatoria, Diplomado) para
            // los niveles sin carrera concreta, así que esto aplica siempre,
            // sin excepción por nivel.
            var profesion = await _context.Profesiones
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == profesionId && p.Activa);

            if (profesion == null)
            {
                return BadRequest(new { mensaje = "Selecciona una profesión/carrera válida." });
            }

            if (!string.Equals(profesion.Nivel, maximaFormacionAcademica.Trim(), StringComparison.Ordinal))
            {
                return BadRequest(new { mensaje = "La profesión/carrera elegida no corresponde a la máxima formación académica seleccionada." });
            }

            if (cv == null || cv.Length == 0)
            {
                return BadRequest(new { mensaje = "El CV en PDF es obligatorio." });
            }

            if (!cv.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ||
                cv.ContentType != "application/pdf")
            {
                return BadRequest(new { mensaje = "El CV debe ser un archivo PDF." });
            }

            if (ultimoComprobanteEstudios == null || ultimoComprobanteEstudios.Length == 0)
            {
                return BadRequest(new { mensaje = "El último comprobante de estudios en PDF es obligatorio." });
            }

            if (!ultimoComprobanteEstudios.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ||
                ultimoComprobanteEstudios.ContentType != "application/pdf")
            {
                return BadRequest(new { mensaje = "El comprobante de estudios debe ser un archivo PDF." });
            }

            if (ine == null || ine.Length == 0)
            {
                return BadRequest(new { mensaje = "El INE en PDF es obligatorio." });
            }

            if (!ine.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ||
                ine.ContentType != "application/pdf")
            {
                return BadRequest(new { mensaje = "El INE debe ser un archivo PDF." });
            }

            if (rfc == null || rfc.Length == 0)
            {
                return BadRequest(new { mensaje = "El RFC en PDF es obligatorio." });
            }

            if (!rfc.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ||
                rfc.ContentType != "application/pdf")
            {
                return BadRequest(new { mensaje = "El RFC debe ser un archivo PDF." });
            }

            if (actaNacimiento == null || actaNacimiento.Length == 0)
            {
                return BadRequest(new { mensaje = "El acta de nacimiento en PDF es obligatoria." });
            }

            if (!actaNacimiento.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ||
                actaNacimiento.ContentType != "application/pdf")
            {
                return BadRequest(new { mensaje = "El acta de nacimiento debe ser un archivo PDF." });
            }

            // Certificaciones: campo opcional, pero si el postulante llenó
            // alguna fila, esa fila debe venir completa (nombre + archivo
            // PDF) — no se aceptan filas a medias. Cero filas es válido.
            var certificacionesNombresRecibidas = certificacionesNombres ?? new List<string>();
            var certificacionesArchivosRecibidos = certificacionesArchivos ?? new List<IFormFile>();

            if (certificacionesNombresRecibidas.Count != certificacionesArchivosRecibidos.Count)
            {
                return BadRequest(new { mensaje = "Cada certificación debe tener un nombre y un archivo PDF." });
            }

            var certificacionesAGuardar = new List<PostulacionCertificacion>();
            for (var i = 0; i < certificacionesNombresRecibidas.Count; i++)
            {
                var nombreCertificacion = certificacionesNombresRecibidas[i];
                var archivoCertificacion = certificacionesArchivosRecibidos[i];

                if (string.IsNullOrWhiteSpace(nombreCertificacion))
                {
                    return BadRequest(new { mensaje = "Cada certificación debe tener un nombre." });
                }

                if (archivoCertificacion == null || archivoCertificacion.Length == 0)
                {
                    return BadRequest(new { mensaje = $"Falta el archivo PDF de la certificación \"{nombreCertificacion.Trim()}\"." });
                }

                if (!archivoCertificacion.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ||
                    archivoCertificacion.ContentType != "application/pdf")
                {
                    return BadRequest(new { mensaje = $"La certificación \"{nombreCertificacion.Trim()}\" debe ser un archivo PDF." });
                }

                byte[] archivoCertificacionBytes;
                using (var ms = new MemoryStream())
                {
                    await archivoCertificacion.CopyToAsync(ms);
                    archivoCertificacionBytes = ms.ToArray();
                }

                certificacionesAGuardar.Add(new PostulacionCertificacion
                {
                    Nombre = nombreCertificacion.Trim(),
                    ArchivoFileName = archivoCertificacion.FileName,
                    ArchivoBytes = archivoCertificacionBytes,
                    Orden = i + 1
                });
            }

            byte[] cvBytes;
            using (var ms = new MemoryStream())
            {
                await cv.CopyToAsync(ms);
                cvBytes = ms.ToArray();
            }

            byte[] comprobanteBytes;
            using (var ms = new MemoryStream())
            {
                await ultimoComprobanteEstudios.CopyToAsync(ms);
                comprobanteBytes = ms.ToArray();
            }

            byte[] ineBytes;
            using (var ms = new MemoryStream())
            {
                await ine.CopyToAsync(ms);
                ineBytes = ms.ToArray();
            }

            byte[] rfcBytes;
            using (var ms = new MemoryStream())
            {
                await rfc.CopyToAsync(ms);
                rfcBytes = ms.ToArray();
            }

            byte[] actaNacimientoBytes;
            using (var ms = new MemoryStream())
            {
                await actaNacimiento.CopyToAsync(ms);
                actaNacimientoBytes = ms.ToArray();
            }

            string? cartaFileName = null;
            byte[]? cartaBytes = null;
            if (cartaPresentacion != null && cartaPresentacion.Length > 0)
            {
                if (!cartaPresentacion.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ||
                    cartaPresentacion.ContentType != "application/pdf")
                {
                    return BadRequest(new { mensaje = "La carta de presentación debe ser un archivo PDF." });
                }

                using var ms = new MemoryStream();
                await cartaPresentacion.CopyToAsync(ms);
                cartaBytes = ms.ToArray();
                cartaFileName = cartaPresentacion.FileName;
            }

            var postulacion = new Postulacion
            {
                Nombre = nombre.Trim(),
                ApellidoPaterno = apellidoPaterno.Trim(),
                ApellidoMaterno = apellidoMaterno.Trim(),
                Correo = correo.Trim(),
                Estado = estado.Trim(),
                Municipio = municipio.Trim(),
                Telefono = telefono.Trim(),
                Rfc = rfcValor,
                Curp = curpValor,
                MaximaFormacionAcademica = maximaFormacionAcademica.Trim(),
                ProfesionId = profesion.Id,
                AreaId = area.Id,
                // Se sigue llenando por compatibilidad (columna histórica,
                // ver el comentario en Models/Postulacion.cs): se copia el
                // nombre del área ya validada, no lo que mande el cliente.
                AreasInteres = area.Nombre,
                ExpectativasSalariales = expectativasSalariales.Trim(),
                CvFileName = cv.FileName,
                CvBytes = cvBytes,
                UltimoComprobanteEstudiosFileName = ultimoComprobanteEstudios.FileName,
                UltimoComprobanteEstudiosBytes = comprobanteBytes,
                CartaPresentacionFileName = cartaFileName,
                CartaPresentacionBytes = cartaBytes,
                IneFileName = ine.FileName,
                IneBytes = ineBytes,
                RfcFileName = rfc.FileName,
                RfcBytes = rfcBytes,
                ActaNacimientoFileName = actaNacimiento.FileName,
                ActaNacimientoBytes = actaNacimientoBytes,
                HabilidadesClave = string.IsNullOrWhiteSpace(habilidadesClave) ? null : habilidadesClave.Trim(),
                UsuarioId = usuarioId
            };

            _context.Postulaciones.Add(postulacion);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (EsViolacionDeLlaveForanea(ex))
            {
                // 547 = violación de FOREIGN KEY: el ProfesionId/AreaId no
                // existe en el catálogo de ESTA base de datos. Pasa cuando la
                // página cargó el catálogo de otro backend (p. ej. con dos
                // instancias corriendo y el botón de desarrollo apuntando al
                // puerto equivocado) o cuando el catálogo cambió mientras la
                // página estaba abierta. Es un conflicto de estado, no un
                // error interno: se responde 409 con una acción clara.
                _logger.LogWarning(ex,
                    "Violación de FK al guardar la postulación de {Correo} (ProfesionId {ProfesionId}, AreaId {AreaId}). El catálogo de este servidor no coincide con el que usó el cliente.",
                    correo, profesion.Id, area.Id);
                return Conflict(new
                {
                    mensaje = "La profesión o área elegida no existe en el catálogo de este servidor (la página pudo cargarse desde otro servidor o el catálogo cambió). Recarga la página e inténtalo de nuevo."
                });
            }
            catch (DbUpdateException ex)
            {
                // Sin este try/catch, cualquier SqlException (p. ej. "Invalid
                // column name" porque la tabla quedó desactualizada en algún
                // ambiente) salía como HTTP 500 vacío e indiagnóstico. Así se
                // registra la causa real en el log del backend y el cliente
                // recibe un mensaje accionable.
                _logger.LogError(ex, "Error al guardar la postulación de {Correo}. Posible esquema desactualizado de dbo.RRHH_Reclutamiento_Postulaciones (correr Backend/SyncPostulacionesSchema.sql).", correo);
                return StatusCode(500, new { mensaje = "No se pudo guardar la postulación. Es probable que la base de datos esté desactualizada en este servidor; avisa al administrador." });
            }

            if (certificacionesAGuardar.Count > 0)
            {
                foreach (var certificacion in certificacionesAGuardar)
                {
                    certificacion.PostulacionId = postulacion.Id;
                }

                _context.PostulacionesCertificaciones.AddRange(certificacionesAGuardar);
                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Error al guardar las certificaciones de la postulación {PostulacionId} de {Correo}. Posible tabla faltante dbo.RRHH_Reclutamiento_Postulaciones_Certificaciones (correr Backend/SyncPostulacionesSchema.sql).", postulacion.Id, correo);
                    return StatusCode(500, new { mensaje = "La postulación se guardó, pero falló el guardado de sus certificaciones. Avisa al administrador." });
                }
            }

            _logger.LogInformation("Postulacion registrada: {Correo}", postulacion.Correo);

            return Ok(new { mensaje = "Registro guardado correctamente.", id = postulacion.Id });
        }

        /// <summary>
        /// Le dice al formulario (Postulacion.jsx) si quien tiene la sesión
        /// activa ya tiene una postulación registrada, para deshabilitar el
        /// botón de envío y mostrar la leyenda correspondiente. Sin sesión
        /// siempre responde que no existe: postular sin cuenta sigue sin
        /// ninguna restricción de este tipo.
        /// </summary>
        [HttpGet("mia")]
        public async Task<IActionResult> MiPostulacion()
        {
            if (User.Identity?.IsAuthenticated != true)
            {
                return Ok(new { existe = false });
            }

            var claimUsuarioId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(claimUsuarioId, out var usuarioId))
            {
                return Ok(new { existe = false });
            }

            var existe = await _context.Postulaciones
                .AsNoTracking()
                .AnyAsync(p => p.UsuarioId == usuarioId);

            return Ok(new { existe });
        }

        // 547 es el número de error de SQL Server para violación de FOREIGN
        // KEY (INSERT/UPDATE con un Id que no existe en la tabla
        // referenciada). EF lo envuelve en DbUpdateException con el
        // SqlException original como InnerException.
        private static bool EsViolacionDeLlaveForanea(DbUpdateException ex)
            => ex.InnerException is Microsoft.Data.SqlClient.SqlException sqlEx && sqlEx.Number == 547;

        [HttpGet]
        public async Task<IActionResult> Listado()
        {
            var postulaciones = await _context.Postulaciones
                .AsNoTracking()
                .ToListAsync();

            // Sin navegación de EF hacia Profesiones (mismo criterio que el
            // resto del proyecto: las FK son columnas planas) — se resuelve el
            // nombre con una sola consulta aparte, igual que ObtenerPerfil hace
            // para FormacionAcademica.ProfesionId en PerfilController.
            //
            // OJO: se trae el catálogo completo (77 filas) en vez de filtrar
            // con `.Where(p => ids.Contains(p.Id))` a propósito — ese patrón
            // hace que EF Core traduzca la lista de ids con OPENJSON, lo cual
            // requiere nivel de compatibilidad 130+ de SQL Server y en esta
            // base de datos truena con "Incorrect syntax near '$'". El
            // catálogo es chico y no crece, así que traerlo completo no tiene
            // ningún costo real.
            var profesionesPorId = await _context.Profesiones
                .AsNoTracking()
                .ToDictionaryAsync(p => p.Id, p => p.Nombre);

            var datos = postulaciones.Select(p => new
            {
                p.Id,
                p.Nombre,
                p.ApellidoPaterno,
                p.ApellidoMaterno,
                p.Correo,
                p.Estado,
                p.Municipio,
                p.Telefono,
                p.Rfc,
                p.Curp,
                p.MaximaFormacionAcademica,
                p.ProfesionId,
                ProfesionNombre = p.ProfesionId.HasValue && profesionesPorId.TryGetValue(p.ProfesionId.Value, out var nombreProfesion)
                    ? nombreProfesion
                    : null,
                p.AreaId,
                p.AreasInteres,
                p.ExpectativasSalariales,
                p.CvFileName,
                p.UltimoComprobanteEstudiosFileName,
                p.CartaPresentacionFileName,
                p.IneFileName,
                p.RfcFileName,
                p.ActaNacimientoFileName,
                p.HabilidadesClave,
                p.UsuarioId,
                p.FechaRegistro
            });

            return Ok(datos);
        }
    }
}
