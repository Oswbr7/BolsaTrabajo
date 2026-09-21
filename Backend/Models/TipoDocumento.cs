namespace Backend.Models
{
    /// <summary>
    /// Catálogo documental de CU-04. Los siete tipos son de "slot único" por
    /// aspirante: subir un archivo nuevo de un tipo reemplaza al vigente (la
    /// versión anterior queda en el historial, no vigente) — incluidas las
    /// dos cartas de recomendación, que se separaron en tipos independientes
    /// en vez de dejar "Cartas de Recomendación" como una lista abierta.
    /// </summary>
    public enum TipoDocumento
    {
        Ine = 1,
        Rfc = 2,
        ActaNacimiento = 3,
        CartillaMilitar = 4,
        RecomendacionLaboral = 5,
        RecomendacionPersonal = 6,
        ComprobanteEstudios = 7
    }
}
