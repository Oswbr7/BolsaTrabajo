using Backend.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    /// <summary>
    /// Perfiles de puesto (catálogo compartido con SIATEC — ver
    /// Documentacion/SE-137-Reclutamiento/conexionPerfilPuesto.md). Solo
    /// lectura: SIATEC es quien crea, versiona, publica e inactiva estos
    /// registros; este proyecto únicamente los lista/detalla para
    /// Vacantes.jsx y PerfilPuestoDetalle.jsx.
    ///
    /// PARTE 1 (esta entrega): se listan/detallan TODOS los perfiles de
    /// puesto sin importar su EstadoActual (borrador/publicado/inactivo) y
    /// sin ningún cruce contra la formación académica del usuario que
    /// consulta. La comparación por ProfesionId contra el aspirante en
    /// sesión — documentada en conexionPerfilPuesto.md — es la parte 2,
    /// todavía no implementada a propósito.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class PerfilesPuestoController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PerfilesPuestoController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Listado()
        {
            var datos = await ConstruirProyeccionAsync(idFiltro: null);
            return Ok(datos);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Detalle(int id)
        {
            var datos = await ConstruirProyeccionAsync(idFiltro: id);
            var perfil = datos.FirstOrDefault();

            if (perfil == null)
            {
                return NotFound(new { mensaje = "No se encontró el perfil de puesto solicitado." });
            }

            return Ok(perfil);
        }

        /// <summary>
        /// Arma la misma proyección (perfil + su versión vigente + las
        /// profesiones que acepta como escolaridad) para Listado y Detalle,
        /// filtrando por Id cuando se pide un solo perfil. Sin navegación de
        /// EF, mismo criterio que el resto del proyecto: las FK son columnas
        /// planas y los catálogos relacionados (Areas, Profesiones) se
        /// resuelven aparte.
        /// </summary>
        private async Task<List<PerfilPuestoResumen>> ConstruirProyeccionAsync(int? idFiltro)
        {
            var consultaPerfiles = _context.PerfilesPuesto.AsNoTracking().AsQueryable();
            if (idFiltro.HasValue)
            {
                consultaPerfiles = consultaPerfiles.Where(p => p.Id == idFiltro.Value);
            }

            var perfiles = await consultaPerfiles.ToListAsync();
            if (perfiles.Count == 0)
            {
                return new List<PerfilPuestoResumen>();
            }

            var versiones = await _context.PerfilesPuestoVersiones
                .AsNoTracking()
                .ToListAsync();

            var escolaridades = await _context.PerfilesPuestoEscolaridades
                .AsNoTracking()
                .ToListAsync();

            var documentos = await _context.PerfilesPuestoDocumentos
                .AsNoTracking()
                .ToListAsync();

            var funciones = await _context.PerfilesPuestoFunciones
                .AsNoTracking()
                .ToListAsync();

            var certificaciones = await _context.PerfilesPuestoCertificaciones
                .AsNoTracking()
                .ToListAsync();

            // Catálogos completos traídos aparte: son chicos y no crecen lo
            // suficiente como para que valga la pena filtrar por id.
            var areasPorId = await _context.Areas
                .AsNoTracking()
                .ToDictionaryAsync(a => a.Id, a => a.Nombre);

            var profesionesPorId = await _context.Profesiones
                .AsNoTracking()
                .ToDictionaryAsync(p => p.Id, p => new { p.Nombre, p.Nivel });

            var versionPorPerfilYNumero = versiones
                .ToDictionary(v => (v.PerfilId, v.NumeroVersion));

            var escolaridadesPorVersion = escolaridades
                .GroupBy(e => e.VersionId)
                .ToDictionary(g => g.Key, g => g.OrderBy(e => e.Orden).ToList());

            var documentosPorVersion = documentos
                .GroupBy(d => d.VersionId)
                .ToDictionary(g => g.Key, g => g.OrderBy(d => d.Orden).ToList());

            var funcionesPorVersion = funciones
                .GroupBy(f => f.VersionId)
                .ToDictionary(g => g.Key, g => g.OrderBy(f => f.Orden).ToList());

            var certificacionesPorVersion = certificaciones
                .GroupBy(c => c.VersionId)
                .ToDictionary(g => g.Key, g => g.OrderBy(c => c.Orden).ToList());

            var datos = perfiles
                .Select(pp =>
                {
                    versionPorPerfilYNumero.TryGetValue((pp.Id, pp.VersionActual), out var version);

                    var escolaridadesDeLaVersion = version != null && escolaridadesPorVersion.TryGetValue(version.Id, out var lista)
                        ? lista
                        : new List<Models.PerfilPuestoEscolaridad>();

                    var documentosDeLaVersion = version != null && documentosPorVersion.TryGetValue(version.Id, out var listaDocumentos)
                        ? listaDocumentos
                        : new List<Models.PerfilPuestoDocumento>();

                    var funcionesDeLaVersion = version != null && funcionesPorVersion.TryGetValue(version.Id, out var listaFunciones)
                        ? listaFunciones
                        : new List<Models.PerfilPuestoFuncion>();

                    var certificacionesDeLaVersion = version != null && certificacionesPorVersion.TryGetValue(version.Id, out var listaCertificaciones)
                        ? listaCertificaciones
                        : new List<Models.PerfilPuestoCertificacion>();

                    return new PerfilPuestoResumen
                    {
                        Id = pp.Id,
                        CodigoPerfil = pp.CodigoPerfil,
                        AreaId = pp.AreaId,
                        AreaNombre = pp.AreaId.HasValue && areasPorId.TryGetValue(pp.AreaId.Value, out var areaNombre)
                            ? areaNombre
                            : null,
                        VersionActual = pp.VersionActual,
                        EstadoActual = pp.EstadoActual,
                        FechaCreacion = pp.FechaCreacion,
                        FechaModificacion = pp.FechaModificacion,
                        Version = version == null
                            ? null
                            : new PerfilPuestoVersionResumen
                            {
                                NumeroVersion = version.NumeroVersion,
                                Estado = version.Estado,
                                NombrePuesto = version.NombrePuesto,
                                Rama = version.Rama,
                                Familia = version.Familia,
                                GrupoCategoria = version.GrupoCategoria,
                                NivelOrganizacional = version.NivelOrganizacional,
                                TipoPersonal = version.TipoPersonal,
                                AreaFuncional = version.AreaFuncional,
                                PuestoSuperior = version.PuestoSuperior,
                                VigenciaInicio = version.VigenciaInicio,
                                VigenciaFin = version.VigenciaFin,
                                ObjetivoGeneral = version.ObjetivoGeneral,
                                Observaciones = version.Observaciones,
                            },
                        Escolaridades = escolaridadesDeLaVersion.Select(e =>
                        {
                            profesionesPorId.TryGetValue(e.ProfesionId, out var profesion);
                            return new PerfilPuestoEscolaridadResumen
                            {
                                ProfesionId = e.ProfesionId,
                                ProfesionNombre = profesion?.Nombre,
                                Nivel = profesion?.Nivel,
                                Orden = e.Orden,
                            };
                        }).ToList(),
                        Documentos = documentosDeLaVersion.Select(d => new PerfilPuestoDocumentoResumen
                        {
                            Id = d.Id,
                            Orden = d.Orden,
                            TipoDocumento = d.TipoDocumento,
                            Nombre = d.Nombre,
                            Obligatorio = d.Obligatorio,
                            Activo = d.Activo,
                            Observaciones = d.Observaciones,
                        }).ToList(),
                        Funciones = funcionesDeLaVersion.Select(f => new PerfilPuestoFuncionResumen
                        {
                            Orden = f.Orden,
                            Descripcion = f.Descripcion,
                            Obligatoria = f.Obligatoria,
                            Critica = f.Critica,
                            Activa = f.Activa,
                        }).ToList(),
                        Certificaciones = certificacionesDeLaVersion.Select(c => new PerfilPuestoCertificacionResumen
                        {
                            Id = c.Id,
                            Nombre = c.Nombre,
                            Institucion = c.Institucion,
                            Vigencia = c.Vigencia,
                            Orden = c.Orden,
                        }).ToList(),
                    };
                })
                // Sin perfil vigente encontrado (VersionActual apunta a un
                // NumeroVersion que no existe en la tabla de versiones) va al
                // final en vez de romper el orden de los que sí lo tienen.
                .OrderBy(x => x.Version == null)
                .ThenBy(x => x.Version?.NombrePuesto)
                .ThenBy(x => x.CodigoPerfil)
                .ToList();

            return datos;
        }

        private sealed class PerfilPuestoResumen
        {
            public int Id { get; set; }
            public string CodigoPerfil { get; set; } = string.Empty;
            public int? AreaId { get; set; }
            public string? AreaNombre { get; set; }
            public int VersionActual { get; set; }
            public string EstadoActual { get; set; } = string.Empty;
            public DateTime FechaCreacion { get; set; }
            public DateTime FechaModificacion { get; set; }
            public PerfilPuestoVersionResumen? Version { get; set; }
            public List<PerfilPuestoEscolaridadResumen> Escolaridades { get; set; } = new();
            public List<PerfilPuestoDocumentoResumen> Documentos { get; set; } = new();
            public List<PerfilPuestoFuncionResumen> Funciones { get; set; } = new();
            public List<PerfilPuestoCertificacionResumen> Certificaciones { get; set; } = new();
        }

        private sealed class PerfilPuestoVersionResumen
        {
            public int NumeroVersion { get; set; }
            public string Estado { get; set; } = string.Empty;
            public string NombrePuesto { get; set; } = string.Empty;
            public string Rama { get; set; } = string.Empty;
            public string Familia { get; set; } = string.Empty;
            public string GrupoCategoria { get; set; } = string.Empty;
            public string NivelOrganizacional { get; set; } = string.Empty;
            public string TipoPersonal { get; set; } = string.Empty;
            public string AreaFuncional { get; set; } = string.Empty;
            public string? PuestoSuperior { get; set; }
            public string VigenciaInicio { get; set; } = string.Empty;
            public string? VigenciaFin { get; set; }
            public string ObjetivoGeneral { get; set; } = string.Empty;
            public string Observaciones { get; set; } = string.Empty;
        }

        private sealed class PerfilPuestoEscolaridadResumen
        {
            public int ProfesionId { get; set; }
            public string? ProfesionNombre { get; set; }
            public string? Nivel { get; set; }
            public int Orden { get; set; }
        }

        private sealed class PerfilPuestoDocumentoResumen
        {
            public int Id { get; set; }
            public int Orden { get; set; }
            public string TipoDocumento { get; set; } = string.Empty;
            public string Nombre { get; set; } = string.Empty;
            public bool Obligatorio { get; set; }
            public bool Activo { get; set; }
            public string Observaciones { get; set; } = string.Empty;
        }

        private sealed class PerfilPuestoFuncionResumen
        {
            public int Orden { get; set; }
            public string Descripcion { get; set; } = string.Empty;
            public bool Obligatoria { get; set; }
            public bool Critica { get; set; }
            public bool Activa { get; set; }
        }

        private sealed class PerfilPuestoCertificacionResumen
        {
            public int Id { get; set; }
            public string Nombre { get; set; } = string.Empty;
            public string Institucion { get; set; } = string.Empty;
            public string Vigencia { get; set; } = string.Empty;
            public int Orden { get; set; }
        }
    }
}
