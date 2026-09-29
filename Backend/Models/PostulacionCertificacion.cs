namespace Backend.Models
{
    /// <summary>
    /// Certificación adjunta por el postulante en el formulario público de
    /// postulación (Postulacion.jsx), sección "Certificaciones" — debajo de
    /// "Comprobante de estudios máximos en PDF". Campo opcional y de varias
    /// filas: por eso vive en tabla propia en vez de columnas fijas en
    /// Postulacion, a diferencia de Cv/UltimoComprobanteEstudios/etc.
    ///
    /// No confundir con Certificacion.cs: esa es la certificación del
    /// PerfilAspirante (perfil editable de un aspirante con sesión
    /// iniciada, con Institución y fechas de obtención/vencimiento). Esta
    /// es la de una postulación puntual (pública, puede no tener sesión),
    /// solo Nombre + un archivo PDF.
    ///
    /// Sin navegación de EF hacia Postulacion (mismo criterio que el resto
    /// del proyecto): PostulacionId es un FK plano, resuelto con consultas
    /// aparte en PostulacionesController.
    /// </summary>
    public class PostulacionCertificacion
    {
        public int Id { get; set; }

        public int PostulacionId { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public string ArchivoFileName { get; set; } = string.Empty;

        public byte[] ArchivoBytes { get; set; } = Array.Empty<byte>();

        /// <summary>Orden en que el postulante las capturó, para mostrarlas siempre en el mismo orden.</summary>
        public int Orden { get; set; }
    }
}
