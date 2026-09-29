namespace Backend.Models
{
    /// <summary>
    /// Un documento subido por el aspirante en respuesta a un requisito
    /// concreto de "Documentación requerida" del perfil de puesto (ver
    /// Models/PerfilPuestoDocumento.cs) — una fila por cada documento que
    /// entregó al postularse a esa vacante en PostularsePerfilPuesto.jsx.
    ///
    /// Sin navegación de EF hacia PostulacionPuesto ni PerfilPuestoDocumento
    /// (mismo criterio del proyecto): PostulacionPuestoId y
    /// PerfilPuestoDocumentoId son FK planas, resueltas con consultas
    /// aparte en PostulacionesPuestoController.
    /// </summary>
    public class PostulacionPuestoDocumento
    {
        public int Id { get; set; }

        public int PostulacionPuestoId { get; set; }

        /// <summary>A qué renglón de "Documentación requerida" del perfil de puesto responde este archivo.</summary>
        public int PerfilPuestoDocumentoId { get; set; }

        public string ArchivoFileName { get; set; } = string.Empty;

        public byte[] ArchivoBytes { get; set; } = Array.Empty<byte>();
    }
}
