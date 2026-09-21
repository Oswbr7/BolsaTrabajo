namespace Backend.Models
{
    public class FormacionAcademica
    {
        public int Id { get; set; }

        public int PerfilAspiranteId { get; set; }

        public string Institucion { get; set; } = string.Empty;

        /// <summary>Mismo catálogo que MaximaFormacionAcademica en Postulacion (texto libre validado en el frontend).</summary>
        public string NivelEstudios { get; set; } = string.Empty;

        /// <summary>
        /// FK hacia RRHH_Reclutamiento_Profesiones. Nulo únicamente en
        /// renglones guardados antes de que existiera este catálogo — toda
        /// formación académica nueva siempre lo trae, porque
        /// PerfilController.GuardarPerfil lo exige (y de paso valida que su
        /// Nivel coincida con NivelEstudios de este mismo renglón).
        /// </summary>
        public int? ProfesionId { get; set; }

        public DateTime FechaInicio { get; set; }

        /// <summary>Nulo si sigue en curso.</summary>
        public DateTime? FechaFin { get; set; }
    }
}
