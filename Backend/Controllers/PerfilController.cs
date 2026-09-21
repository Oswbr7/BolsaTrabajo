using System.Security.Claims;
using System.Text.RegularExpressions;
using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    /// <summary>
    /// CU-03: perfil del aspirante. Todo protegido por sesión (la misma
    /// cookie de autenticación de CU-02) — nadie puede leer o modificar un
    /// perfil que no sea el propio.
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("api/perfil")]
    public class PerfilController : ControllerBase
    {
        private const int EdadMinimaAnios = 16;
        private const int RfcLongitud = 13;
        private const int CurpLongitud = 18;

        private static readonly Regex RegexCorreo = new(
            @"^[^@\s]+@[^@\s]+\.[^@\s]+$",
            RegexOptions.Compiled);

        private static readonly Regex RegexTelefono = new(
            @"^\d{10,12}$",
            RegexOptions.Compiled);

        private readonly AppDbContext _context;

        public PerfilController(AppDbContext context)
        {
            _context = context;
        }

        public class ExperienciaLaboralRequest
        {
            public string Empresa { get; set; } = string.Empty;
            public string Puesto { get; set; } = string.Empty;
            public DateTime FechaInicio { get; set; }
            public DateTime? FechaFin { get; set; }
            public string? Descripcion { get; set; }
        }

        public class FormacionAcademicaRequest
        {
            public string Institucion { get; set; } = string.Empty;
            public string NivelEstudios { get; set; } = string.Empty;
            public int ProfesionId { get; set; }
            public DateTime FechaInicio { get; set; }
            public DateTime? FechaFin { get; set; }
        }

        public class CertificacionRequest
        {
            public string Nombre { get; set; } = string.Empty;
            public string Institucion { get; set; } = string.Empty;
            public DateTime FechaObtencion { get; set; }
            public DateTime? FechaVencimiento { get; set; }
        }

        public class GuardarPerfilRequest
        {
            public string Nombre { get; set; } = string.Empty;
            public string ApellidoPaterno { get; set; } = string.Empty;
            public string? ApellidoMaterno { get; set; }
            public DateTime FechaNacimiento { get; set; }
            public string? Rfc { get; set; }
            public string? Curp { get; set; }
            public string Telefono { get; set; } = string.Empty;
            public string Correo { get; set; } = string.Empty;
            public string Estado { get; set; } = string.Empty;
            public string Municipio { get; set; } = string.Empty;
            public List<ExperienciaLaboralRequest> ExperienciaLaboral { get; set; } = new();
            public List<FormacionAcademicaRequest> FormacionAcademica { get; set; } = new();
            public List<string> Habilidades { get; set; } = new();
            public List<CertificacionRequest> Certificaciones { get; set; } = new();
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerPerfil()
        {
            var usuarioId = ObtenerUsuarioIdActual();

            var perfil = await _context.PerfilesAspirante
                .Include(p => p.ExperienciaLaboral)
                .Include(p => p.FormacionAcademica)
                .Include(p => p.Habilidades)
                .Include(p => p.Certificaciones)
                .FirstOrDefaultAsync(p => p.UsuarioId == usuarioId);

            if (perfil is null)
            {
                // Perfil todavía no creado: el frontend interpreta esto como
                // "mostrar el asistente desde cero" (CU-01 lo llama "abrir el
                // asistente de perfil").
                return Ok(new { existe = false });
            }

            // El modelo no declara una relación de navegación hacia Profesion
            // (mismo criterio que el resto del proyecto: las FK se tratan como
            // columna simple, sin .HasOne()/.WithOne()), así que se resuelve
            // con una consulta aparte en vez de un Include().
            //
            // OJO: se trae el catálogo completo (77 filas, no crece con el
            // tiempo) en vez de filtrar con `.Where(p => ids.Contains(p.Id))`
            // a propósito — ese patrón hace que EF Core traduzca la lista de
            // ids a un parámetro JSON y la cruce con OPENJSON, algo que
            // requiere nivel de compatibilidad 130+ de SQL Server; en esta
            // base de datos truena con "Incorrect syntax near '$'". Traer
            // todo el catálogo evita ese problema y, siendo tan chico, no
            // tiene ningún costo real.
            var profesionesPorId = await _context.Profesiones
                .AsNoTracking()
                .ToDictionaryAsync(p => p.Id, p => p.Nombre);

            return Ok(new
            {
                existe = true,
                nombre = perfil.Nombre,
                apellidoPaterno = perfil.ApellidoPaterno,
                apellidoMaterno = perfil.ApellidoMaterno,
                fechaNacimiento = perfil.FechaNacimiento,
                rfc = perfil.Rfc,
                curp = perfil.Curp,
                telefono = perfil.Telefono,
                correo = perfil.Correo,
                estado = perfil.Estado,
                municipio = perfil.Municipio,
                fechaActualizacion = perfil.FechaActualizacion,
                experienciaLaboral = perfil.ExperienciaLaboral.Select(e => new
                {
                    e.Id,
                    e.Empresa,
                    e.Puesto,
                    e.FechaInicio,
                    e.FechaFin,
                    e.Descripcion
                }),
                formacionAcademica = perfil.FormacionAcademica.Select(f => new
                {
                    f.Id,
                    f.Institucion,
                    f.NivelEstudios,
                    profesionId = f.ProfesionId,
                    profesionNombre = f.ProfesionId.HasValue && profesionesPorId.TryGetValue(f.ProfesionId.Value, out var nombreProfesion)
                        ? nombreProfesion
                        : null,
                    f.FechaInicio,
                    f.FechaFin
                }),
                habilidades = perfil.Habilidades.Select(h => h.Nombre),
                certificaciones = perfil.Certificaciones.Select(c => new
                {
                    c.Id,
                    c.Nombre,
                    c.Institucion,
                    c.FechaObtencion,
                    c.FechaVencimiento
                })
            });
        }

        [HttpPut]
        public async Task<IActionResult> GuardarPerfil([FromBody] GuardarPerfilRequest request)
        {
            if (request is null)
            {
                return BadRequest(new { mensaje = "Solicitud inválida." });
            }

            var usuarioId = ObtenerUsuarioIdActual();

            var nombre = (request.Nombre ?? string.Empty).Trim();
            var apellidoPaterno = (request.ApellidoPaterno ?? string.Empty).Trim();
            var apellidoMaterno = string.IsNullOrWhiteSpace(request.ApellidoMaterno) ? null : request.ApellidoMaterno.Trim();
            var telefono = (request.Telefono ?? string.Empty).Trim();
            var correo = (request.Correo ?? string.Empty).Trim().ToLowerInvariant();
            var estado = (request.Estado ?? string.Empty).Trim();
            var municipio = (request.Municipio ?? string.Empty).Trim();
            var rfc = string.IsNullOrWhiteSpace(request.Rfc) ? string.Empty : request.Rfc.Trim().ToUpperInvariant();
            var curp = string.IsNullOrWhiteSpace(request.Curp) ? string.Empty : request.Curp.Trim().ToUpperInvariant();

            // A1: falta una parte obligatoria del nombre completo.
            if (string.IsNullOrWhiteSpace(nombre))
            {
                return BadRequest(new { campo = "nombre", mensaje = "El nombre es obligatorio." });
            }

            if (string.IsNullOrWhiteSpace(apellidoPaterno))
            {
                return BadRequest(new { campo = "apellidoPaterno", mensaje = "El apellido paterno es obligatorio." });
            }

            if (string.IsNullOrWhiteSpace(estado))
            {
                return BadRequest(new { campo = "estado", mensaje = "El estado es obligatorio." });
            }

            if (string.IsNullOrWhiteSpace(municipio))
            {
                return BadRequest(new { campo = "municipio", mensaje = "El municipio es obligatorio." });
            }

            if (!RegexCorreo.IsMatch(correo))
            {
                return BadRequest(new { campo = "correo", mensaje = "Ingresa un correo electrónico válido." });
            }

            if (!RegexTelefono.IsMatch(telefono))
            {
                return BadRequest(new { campo = "telefono", mensaje = "Ingresa un teléfono válido (10 a 12 dígitos)." });
            }

            // RFC y CURP son obligatorios y deben tener la longitud exacta del
            // documento real.
            if (string.IsNullOrWhiteSpace(rfc))
            {
                return BadRequest(new { campo = "rfc", mensaje = "El RFC es obligatorio." });
            }

            if (rfc.Length != RfcLongitud)
            {
                return BadRequest(new { campo = "rfc", mensaje = $"El RFC debe tener {RfcLongitud} caracteres." });
            }

            if (string.IsNullOrWhiteSpace(curp))
            {
                return BadRequest(new { campo = "curp", mensaje = "El CURP es obligatorio." });
            }

            if (curp.Length != CurpLongitud)
            {
                return BadRequest(new { campo = "curp", mensaje = $"El CURP debe tener {CurpLongitud} caracteres." });
            }

            // A5: fecha de nacimiento razonable (no futura, edad mínima).
            var hoy = DateTime.UtcNow.Date;
            var edad = hoy.Year - request.FechaNacimiento.Year;
            if (request.FechaNacimiento.Date > hoy.AddYears(-edad)) edad--;

            if (request.FechaNacimiento.Date > hoy)
            {
                return BadRequest(new { campo = "fechaNacimiento", mensaje = "La fecha de nacimiento no puede ser futura." });
            }

            if (edad < EdadMinimaAnios)
            {
                return BadRequest(new { campo = "fechaNacimiento", mensaje = $"Debes tener al menos {EdadMinimaAnios} años registrados en el perfil." });
            }

            // A5: fechas de experiencia laboral consistentes.
            foreach (var experiencia in request.ExperienciaLaboral)
            {
                if (experiencia.FechaFin is DateTime finExperiencia && finExperiencia.Date < experiencia.FechaInicio.Date)
                {
                    return BadRequest(new
                    {
                        campo = "experienciaLaboral",
                        mensaje = $"La fecha de fin de \"{experiencia.Empresa}\" no puede ser anterior a la fecha de inicio."
                    });
                }
            }

            // A5: fechas de formación académica consistentes, y la profesión
            // elegida existe, está activa y corresponde al mismo Nivel de
            // estudios de ese renglón (evita, por ejemplo, capturar
            // "Preparatoria" y elegir una profesión de Maestría). Los niveles
            // sin carrera específica (Secundaria, Preparatoria, Diplomado)
            // también exigen Profesión — el catálogo trae una fila genérica
            // con el mismo nombre que el nivel, para que participen del
            // emparejamiento igual que cualquier otra profesión.
            var profesionesActivas = await _context.Profesiones
                .Where(p => p.Activa)
                .ToDictionaryAsync(p => p.Id);

            foreach (var formacion in request.FormacionAcademica)
            {
                if (formacion.FechaFin is DateTime finFormacion && finFormacion.Date < formacion.FechaInicio.Date)
                {
                    return BadRequest(new
                    {
                        campo = "formacionAcademica",
                        mensaje = $"La fecha de fin de \"{formacion.Institucion}\" no puede ser anterior a la fecha de inicio."
                    });
                }

                if (!profesionesActivas.TryGetValue(formacion.ProfesionId, out var profesionElegida))
                {
                    return BadRequest(new
                    {
                        campo = "formacionAcademica",
                        mensaje = $"Selecciona una profesión válida para \"{formacion.Institucion}\"."
                    });
                }

                if (!string.Equals(profesionElegida.Nivel, (formacion.NivelEstudios ?? string.Empty).Trim(), StringComparison.Ordinal))
                {
                    return BadRequest(new
                    {
                        campo = "formacionAcademica",
                        mensaje = $"La profesión elegida para \"{formacion.Institucion}\" no corresponde a su nivel de estudios."
                    });
                }
            }

            // Certificaciones: nombre/institución obligatorios y fechas
            // razonables (misma exigencia que ya se aplica a Experiencia
            // laboral y Formación académica).
            foreach (var certificacion in request.Certificaciones)
            {
                if (string.IsNullOrWhiteSpace(certificacion.Nombre) || string.IsNullOrWhiteSpace(certificacion.Institucion))
                {
                    return BadRequest(new
                    {
                        campo = "certificaciones",
                        mensaje = "Cada certificación necesita nombre e institución."
                    });
                }

                if (certificacion.FechaObtencion.Date > hoy)
                {
                    return BadRequest(new
                    {
                        campo = "certificaciones",
                        mensaje = $"La fecha de obtención de \"{certificacion.Nombre}\" no puede ser futura."
                    });
                }

                if (certificacion.FechaVencimiento is DateTime vencimiento && vencimiento.Date < certificacion.FechaObtencion.Date)
                {
                    return BadRequest(new
                    {
                        campo = "certificaciones",
                        mensaje = $"La fecha de vencimiento de \"{certificacion.Nombre}\" no puede ser anterior a la de obtención."
                    });
                }
            }

            // A6: correo/teléfono de contacto del perfil ya usado por otro aspirante.
            // Es independiente del correo/teléfono de acceso a la cuenta (Usuario).
            var contactoDuplicado = await _context.PerfilesAspirante
                .Where(p => p.UsuarioId != usuarioId && (p.Correo == correo || p.Telefono == telefono))
                .AnyAsync();

            if (contactoDuplicado)
            {
                return Conflict(new { mensaje = "Ese correo o teléfono de contacto ya está registrado en el perfil de otro aspirante." });
            }

            var perfil = await _context.PerfilesAspirante
                .Include(p => p.ExperienciaLaboral)
                .Include(p => p.FormacionAcademica)
                .Include(p => p.Habilidades)
                .Include(p => p.Certificaciones)
                .FirstOrDefaultAsync(p => p.UsuarioId == usuarioId);

            var esNuevo = perfil is null;

            if (perfil is null)
            {
                perfil = new PerfilAspirante
                {
                    UsuarioId = usuarioId,
                    FechaCreacion = DateTime.UtcNow
                };
                _context.PerfilesAspirante.Add(perfil);
            }

            perfil.Nombre = nombre;
            perfil.ApellidoPaterno = apellidoPaterno;
            perfil.ApellidoMaterno = apellidoMaterno;
            perfil.FechaNacimiento = request.FechaNacimiento.Date;
            perfil.Rfc = rfc;
            perfil.Curp = curp;
            perfil.Telefono = telefono;
            perfil.Correo = correo;
            perfil.Estado = estado;
            perfil.Municipio = municipio;
            perfil.FechaActualizacion = DateTime.UtcNow;

            // Reemplazo completo de las listas hijas: más simple que ir
            // agregando endpoints sueltos por cada renglón, y suficiente para
            // el caso de uso (el asistente siempre manda el conjunto completo).
            perfil.ExperienciaLaboral.Clear();
            foreach (var experiencia in request.ExperienciaLaboral)
            {
                perfil.ExperienciaLaboral.Add(new ExperienciaLaboral
                {
                    Empresa = (experiencia.Empresa ?? string.Empty).Trim(),
                    Puesto = (experiencia.Puesto ?? string.Empty).Trim(),
                    FechaInicio = experiencia.FechaInicio.Date,
                    FechaFin = experiencia.FechaFin?.Date,
                    Descripcion = string.IsNullOrWhiteSpace(experiencia.Descripcion) ? null : experiencia.Descripcion.Trim()
                });
            }

            perfil.FormacionAcademica.Clear();
            foreach (var formacion in request.FormacionAcademica)
            {
                perfil.FormacionAcademica.Add(new FormacionAcademica
                {
                    Institucion = (formacion.Institucion ?? string.Empty).Trim(),
                    NivelEstudios = (formacion.NivelEstudios ?? string.Empty).Trim(),
                    ProfesionId = formacion.ProfesionId,
                    FechaInicio = formacion.FechaInicio.Date,
                    FechaFin = formacion.FechaFin?.Date
                });
            }

            perfil.Habilidades.Clear();
            foreach (var habilidad in request.Habilidades)
            {
                var nombreHabilidad = (habilidad ?? string.Empty).Trim();
                if (nombreHabilidad.Length > 0)
                {
                    perfil.Habilidades.Add(new Habilidad { Nombre = nombreHabilidad });
                }
            }

            perfil.Certificaciones.Clear();
            foreach (var certificacion in request.Certificaciones)
            {
                perfil.Certificaciones.Add(new Certificacion
                {
                    Nombre = certificacion.Nombre.Trim(),
                    Institucion = certificacion.Institucion.Trim(),
                    FechaObtencion = certificacion.FechaObtencion.Date,
                    FechaVencimiento = certificacion.FechaVencimiento?.Date
                });
            }

            await _context.SaveChangesAsync();

            _context.HistorialPerfil.Add(new HistorialPerfil
            {
                PerfilAspiranteId = perfil.Id,
                FechaHora = DateTime.UtcNow,
                Resumen = esNuevo
                    ? "Perfil creado."
                    : $"Perfil actualizado ({request.ExperienciaLaboral.Count} experiencia(s), {request.FormacionAcademica.Count} formación(es), {request.Habilidades.Count} habilidad(es), {request.Certificaciones.Count} certificación(es))."
            });
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Perfil guardado correctamente.", fechaActualizacion = perfil.FechaActualizacion });
        }

        private int ObtenerUsuarioIdActual()
        {
            var valor = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.Parse(valor!);
        }
    }
}
