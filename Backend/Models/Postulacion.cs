namespace Backend.Models
{
    public class Postulacion
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string ApellidoPaterno { get; set; } = string.Empty;
        public string ApellidoMaterno { get; set; } = string.Empty;
        public string Correo { get; set; } = string.Empty;
        public string Estado { get; set; } = string.Empty;
        public string Municipio { get; set; } = string.Empty;
        public string Telefono { get; set; } = string.Empty;

        /// <summary>
        /// RFC como texto (código alfanumérico, 13 caracteres para persona
        /// física), capturado directamente en el formulario. Opcional —
        /// independiente del documento PDF subido en RfcFileName/RfcBytes
        /// (ver más abajo): uno es el código, el otro es el archivo escaneado.
        /// </summary>
        public string Rfc { get; set; } = string.Empty;

        /// <summary>CURP como texto (código alfanumérico, 18 caracteres). Opcional.</summary>
        public string Curp { get; set; } = string.Empty;

        public string MaximaFormacionAcademica { get; set; } = string.Empty;

        /// <summary>
        /// FK hacia dbo.RRHH_Reclutamiento_Profesiones — qué profesión/carrera
        /// concreta corresponde a MaximaFormacionAcademica (p. ej. "Diplomado"
        /// + "Diplomado en Recursos Humanos"). Igual que en
        /// FormacionAcademica.ProfesionId (ver ese archivo): nulo únicamente en
        /// postulaciones registradas antes de que existiera este catálogo;
        /// toda postulación nueva siempre lo trae, porque
        /// PostulacionesController.Registrar lo exige y valida que el Nivel de
        /// la profesión elegida coincida con MaximaFormacionAcademica.
        /// </summary>
        public int? ProfesionId { get; set; }

        /// <summary>
        /// Columna histórica: texto libre con el nombre del área elegida.
        /// Ya no es la fuente de verdad (eso es AreaId) — PostulacionesController
        /// la sigue llenando automáticamente con Area.Nombre al registrar,
        /// solo para no romper nada que todavía la lea directamente.
        /// </summary>
        public string AreasInteres { get; set; } = string.Empty;

        /// <summary>
        /// FK hacia dbo.RRHH_Reclutamiento_Areas (catálogo compartido con
        /// SIATEC). Nulo únicamente en postulaciones creadas antes de este
        /// catálogo cuyo AreasInteres viejo no pudo emparejarse por nombre
        /// durante la migración (ver CreateAreasCatalogoYMigrarPostulaciones.sql);
        /// toda postulación nueva siempre lo trae, porque el backend lo exige.
        /// </summary>
        public int? AreaId { get; set; }

        public string ExpectativasSalariales { get; set; } = string.Empty;
        public string CvFileName { get; set; } = string.Empty;
        public byte[] CvBytes { get; set; } = Array.Empty<byte>();
        public string UltimoComprobanteEstudiosFileName { get; set; } = string.Empty;
        public byte[] UltimoComprobanteEstudiosBytes { get; set; } = Array.Empty<byte>();
        public string? CartaPresentacionFileName { get; set; }
        public byte[]? CartaPresentacionBytes { get; set; }

        // Documentos obligatorios agregados después de la entrega original.
        // Las filas creadas antes de este cambio se rellenaron con valores
        // vacíos (ver AlterPostulacionesDocumentosYHabilidades.sql) porque en
        // ese momento este documento no existía; toda postulación nueva sí
        // los trae siempre, exigidos por PostulacionesController.Registrar.
        public string IneFileName { get; set; } = string.Empty;
        public byte[] IneBytes { get; set; } = Array.Empty<byte>();
        public string RfcFileName { get; set; } = string.Empty;
        public byte[] RfcBytes { get; set; } = Array.Empty<byte>();
        public string ActaNacimientoFileName { get; set; } = string.Empty;
        public byte[] ActaNacimientoBytes { get; set; } = Array.Empty<byte>();

        /// <summary>Texto libre, opcional, con las habilidades clave del postulante.</summary>
        public string? HabilidadesClave { get; set; }

        /// <summary>
        /// Nulo si quien postuló no tenía sesión iniciada (el formulario sigue
        /// siendo público). Si la tenía, PostulacionesController.Registrar lo
        /// rellena solo, leyendo el identificador de la cookie de sesión — el
        /// aspirante no lo captura ni lo ve. Es una copia de en ese momento:
        /// si el aspirante corrige algo autocompletado antes de enviar, ese
        /// cambio no se refleja en su PerfilAspirante ni viceversa.
        /// </summary>
        public int? UsuarioId { get; set; }

        public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;
    }
}
