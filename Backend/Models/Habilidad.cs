namespace Backend.Models
{
    public class Habilidad
    {
        public int Id { get; set; }

        public int PerfilAspiranteId { get; set; }

        public string Nombre { get; set; } = string.Empty;
    }
}
