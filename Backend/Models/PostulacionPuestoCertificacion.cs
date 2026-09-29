namespace Backend.Models
{
    /// <summary>
    /// Archivo que el aspirante adjunta por cada certificación que pide el
    /// perfil académico del perfil de puesto al que se postula (ver
    /// Models/PerfilPuestoCertificacion.cs) — una fila por cada
    /// certificación entregada en PostularsePerfilPuesto.jsx, sección
    /// "Certificaciones requeridas". Todas son obligatorias (decisión del
    /// proyecto: la tabla de SIATEC no distingue obligatorias/opcionales).
    ///
    /// Sin navegación de EF hacia PostulacionPuesto ni
    /// PerfilPuestoCertificacion (mismo criterio del proyecto):
    /// PostulacionPuestoId y PerfilPuestoCertificacionId son FK planas,
    /// resueltas con consultas aparte en PostulacionesPuestoController.
    /// </summary>
    public class PostulacionPuestoCertificacion
    {
        public int Id { get; set; }

        public int PostulacionPuestoId { get; set; }

        /// <summary>A qué certificación de "Certificaciones requeridas" del perfil de puesto responde este archivo.</summary>
        public int PerfilPuestoCertificacionId { get; set; }

        public string ArchivoFileName { get; set; } = string.Empty;

        public byte[] ArchivoBytes { get; set; } = Array.Empty<byte>();
    }
}
