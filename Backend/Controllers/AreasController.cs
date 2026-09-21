using Backend.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    /// <summary>
    /// Catálogo de áreas de interés (ver "Plan de Flujo - Filtrado de
    /// Postulantes por Area en SIATEC.md"). Es la misma tabla,
    /// dbo.RRHH_Reclutamiento_Areas, que SIATEC usará del lado de Puestos
    /// para filtrar candidatos por área — aquí solo se expone de lectura
    /// para que Postulacion.jsx pinte el <select> sin tener la lista fija
    /// escrita en el frontend.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class AreasController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AreasController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Listado()
        {
            var areas = await _context.Areas
                .AsNoTracking()
                .Where(a => a.Activa)
                .OrderBy(a => a.Nombre)
                .Select(a => new { a.Id, a.Nombre })
                .ToListAsync();

            return Ok(areas);
        }
    }
}
