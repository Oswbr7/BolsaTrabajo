namespace Backend.Models
{
    /// <summary>
    /// Postulación de un aspirante (con sesión iniciada) a un perfil de
    /// puesto ESPECÍFICO — formulario "Postularme" en
    /// PostularsePerfilPuesto.jsx, llegando desde Vacantes.jsx o
    /// PerfilPuestoDetalle.jsx. Distinta de Postulacion.cs (el registro
    /// general y público de Postulacion.jsx): esta exige sesión, no
    /// captura formación académica/área de interés (la escolaridad ya la
    /// define el propio perfil de puesto) y no permite más de una
    /// postulación del mismo usuario al mismo puesto (ver el índice único
    /// en CrearPostulacionesPuesto.sql).
    ///
    /// Sin navegación de EF hacia Usuario/PerfilPuesto/PerfilPuestoVersion
    /// (mismo criterio del proyecto): los FK son columnas planas,
    /// resueltas con consultas aparte en PostulacionesPuestoController.
    /// </summary>
    public class PostulacionPuesto
    {
        public int Id { get; set; }

        public int UsuarioId { get; set; }

        public int PerfilPuestoId { get; set; }

        /// <summary>
        /// FK hacia PerfilPuestoVersion.Id — no hacia el NumeroVersion.
        /// Es una "foto" de a qué versión concreta del perfil se postuló,
        /// para conservar el historial exacto (documentos/escolaridad
        /// pedidos en ese momento) aunque SIATEC publique una versión
        /// nueva después.
        /// </summary>
        public int PerfilPuestoVersionId { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public string ApellidoPaterno { get; set; } = string.Empty;

        /// <summary>Opcional en este formulario (a diferencia de Postulacion.cs, donde sí es obligatorio).</summary>
        public string? ApellidoMaterno { get; set; }

        public string Rfc { get; set; } = string.Empty;

        public string Curp { get; set; } = string.Empty;

        public string Estado { get; set; } = string.Empty;

        /// <summary>Opcional en este formulario.</summary>
        public string? Municipio { get; set; }

        public string Telefono { get; set; } = string.Empty;

        public string Correo { get; set; } = string.Empty;

        public string ExpectativasSalariales { get; set; } = string.Empty;

        /// <summary>Opcional.</summary>
        public string? HabilidadesClave { get; set; }

        public string ComprobanteEstudiosFileName { get; set; } = string.Empty;

        public byte[] ComprobanteEstudiosBytes { get; set; } = Array.Empty<byte>();

        public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;
    }
}
