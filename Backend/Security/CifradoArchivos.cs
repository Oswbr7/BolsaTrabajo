using System.Security.Cryptography;

namespace Backend.Security
{
    /// <summary>
    /// Cifra y descifra el contenido de los documentos de CU-04 con AES-256
    /// en modo CBC, usando únicamente clases del BCL de .NET
    /// (System.Security.Cryptography), sin agregar ningún paquete NuGet
    /// nuevo — mismo criterio que <see cref="PasswordHasher"/>.
    ///
    /// La llave (32 bytes, Base64) vive en configuración
    /// (<c>CifradoDocumentos:Llave</c> en appsettings.json). Es una llave de
    /// desarrollo generada para este entorno; antes de producción debe
    /// moverse a un manejo de secretos real (Azure Key Vault, variables de
    /// entorno del servidor, etc.), igual que ya se advierte para otras
    /// piezas sensibles del proyecto.
    ///
    /// El IV (16 bytes, distinto en cada cifrado) se genera al azar y se
    /// antepone al resultado, así no hace falta guardarlo aparte.
    /// </summary>
    public static class CifradoArchivos
    {
        public static byte[] Cifrar(byte[] datosOriginales, byte[] llave)
        {
            using var aes = Aes.Create();
            aes.Key = llave;
            aes.GenerateIV();

            using var encriptador = aes.CreateEncryptor();
            var datosCifrados = encriptador.TransformFinalBlock(datosOriginales, 0, datosOriginales.Length);

            // IV + datos cifrados, en un solo arreglo.
            var resultado = new byte[aes.IV.Length + datosCifrados.Length];
            Buffer.BlockCopy(aes.IV, 0, resultado, 0, aes.IV.Length);
            Buffer.BlockCopy(datosCifrados, 0, resultado, aes.IV.Length, datosCifrados.Length);
            return resultado;
        }

        public static byte[] Descifrar(byte[] datosCifradosConIv, byte[] llave)
        {
            using var aes = Aes.Create();
            aes.Key = llave;

            var iv = new byte[aes.IV.Length];
            Buffer.BlockCopy(datosCifradosConIv, 0, iv, 0, iv.Length);
            aes.IV = iv;

            var datosCifrados = new byte[datosCifradosConIv.Length - iv.Length];
            Buffer.BlockCopy(datosCifradosConIv, iv.Length, datosCifrados, 0, datosCifrados.Length);

            using var desencriptador = aes.CreateDecryptor();
            return desencriptador.TransformFinalBlock(datosCifrados, 0, datosCifrados.Length);
        }

        public static string CalcularHashSha256(byte[] datos)
        {
            var hash = SHA256.HashData(datos);
            return Convert.ToHexString(hash).ToLowerInvariant();
        }
    }
}
