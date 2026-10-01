namespace Backend.Models
{
    /// <summary>
    /// Catálogo documental de CU-04. Los diez tipos son de "slot único" por
    /// aspirante: subir un archivo nuevo de un tipo reemplaza al vigente (la
    /// versión anterior queda en el historial, no vigente) — incluidas las
    /// dos cartas de recomendación, que se separaron en tipos independientes
    /// en vez de dejar "Cartas de Recomendación" como una lista abierta.
    ///
    /// Rfc (2) se muestra en el frontend como "Constancia de Situación
    /// Fiscal" (solo cambió el nombre visible; el nombre del enum y su valor
    /// numérico se dejaron igual a propósito, para no afectar los
    /// documentos ya guardados con ese tipo).
    ///
    /// Los tres últimos (8, 9 y 10) se agregaron al final del enum a
    /// propósito: el valor numérico es lo que se guarda como TINYINT en
    /// dbo.RRHH_Reclutamiento_DocumentosAspirante, así que insertarlos en
    /// medio del listado correría los valores de los tipos que ya existen
    /// y corrompería los documentos ya cargados. Curp aquí es un archivo
    /// (la CURP subida como documento), distinto del campo de texto Curp
    /// que ya existe en PerfilAspirante/Postulacion.
    /// </summary>
    public enum TipoDocumento
    {
        Ine = 1,
        Rfc = 2,
        ActaNacimiento = 3,
        CartillaMilitar = 4,
        RecomendacionLaboral = 5,
        RecomendacionPersonal = 6,
        ComprobanteEstudios = 7,
        ComprobanteDomicilio = 8,
        Curp = 9,
        CedulaProfesional = 10
    }
}
