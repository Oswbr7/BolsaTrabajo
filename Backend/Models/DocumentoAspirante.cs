namespace Backend.Models
{
    /// <summary>
    /// Un documento cargado por un aspirante (CU-04). Cada fila es una
    /// versión: al reemplazar un documento del mismo tipo, la fila anterior
    /// se conserva con <see cref="Vigente"/> en false (satisface la
    /// postcondición "versión ... registrada") en vez de sobrescribirse o
    /// borrarse. El contenido se guarda cifrado en la misma fila (igual
    /// criterio que <see cref="Postulacion"/>, que ya guarda sus PDF como
    /// <c>byte[]</c> en la tabla), no en un archivo aparte en disco.
    /// </summary>
    public class DocumentoAspirante
    {
        public int Id { get; set; }

        public int UsuarioId { get; set; }

        public TipoDocumento TipoDocumento { get; set; }

        public string NombreArchivoOriginal { get; set; } = string.Empty;

        public string ContentType { get; set; } = string.Empty;

        public long TamanioBytes { get; set; }

        /// <summary>Contenido del archivo ya cifrado (AES-256). Ver <see cref="Security.CifradoArchivos"/>.</summary>
        public byte[] ContenidoCifrado { get; set; } = Array.Empty<byte>();

        /// <summary>Hash SHA-256 del contenido original (antes de cifrar), para una verificación básica de integridad.</summary>
        public string HashSha256 { get; set; } = string.Empty;

        /// <summary>
        /// Fecha de vigencia del documento, opcional para los diez tipos.
        /// Si es nulo, el documento no participa en el cálculo de "por vencer"
        /// (CU-04, flujo alterno A4) y se considera vigente mientras no se
        /// reemplace.
        /// </summary>
        public DateTime? FechaVigencia { get; set; }

        /// <summary>1, 2, 3... por cada reemplazo del mismo tipo para el mismo aspirante.</summary>
        public int NumeroVersion { get; set; } = 1;

        /// <summary>True mientras sea la versión actual de su tipo (antes de ser reemplazada).</summary>
        public bool Vigente { get; set; } = true;

        public DateTime FechaCarga { get; set; } = DateTime.UtcNow;

        /// <summary>Borrado lógico: si tiene valor, el aspirante lo eliminó y ya no se muestra ni cuenta como vigente.</summary>
        public DateTime? FechaEliminacion { get; set; }
    }
}
