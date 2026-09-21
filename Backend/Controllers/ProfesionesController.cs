using Backend.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    /// <summary>
    /// Catálogo de profesiones/carreras (ver Models/Profesion.cs) — el
    /// criterio real de emparejamiento con vacantes, independiente del
    /// catálogo de Áreas. Calcado de AreasController: solo lectura, para que
    /// AsistentePerfil.jsx arme los <select> de "Profesión" sin tener la
    /// lista fija escrita ahí.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class ProfesionesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ProfesionesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Listado()
        {
            var profesiones = await _context.Profesiones
                .AsNoTracking()
                .Where(p => p.Activa)
                .OrderBy(p => p.Nivel)
                .ThenBy(p => p.AreaEstudio)
                .ThenBy(p => p.CarreraGenerica)
                .ThenBy(p => p.Nombre)
                .Select(p => new { p.Id, p.Nombre, p.Nivel, p.AreaEstudio, p.CarreraGenerica })
                .ToListAsync();

            return Ok(profesiones);
        }
    }
}
