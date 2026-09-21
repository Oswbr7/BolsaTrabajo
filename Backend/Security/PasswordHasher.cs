using System.Security.Cryptography;

namespace Backend.Security
{
    /// <summary>
    /// Hash y verificación de contraseñas con PBKDF2 (HMAC-SHA256), usando
    /// únicamente clases del BCL de .NET (System.Security.Cryptography), sin
    /// agregar ningún paquete NuGet nuevo.
    ///
    /// El resultado se guarda como un solo string con el formato:
    ///   {iteraciones}.{saltBase64}.{hashBase64}
    /// para no necesitar columnas separadas ni reprocesar nada si en el
    /// futuro se decide subir el número de iteraciones.
    /// </summary>
    public static class PasswordHasher
    {
        private const int TamanoSalBytes = 16;
        private const int TamanoHashBytes = 32;
        private const int Iteraciones = 100_000;

        public static string HashPassword(string password)
        {
            if (string.IsNullOrEmpty(password))
            {
                throw new ArgumentException("La contraseña no puede estar vacía.", nameof(password));
            }

            var salt = RandomNumberGenerator.GetBytes(TamanoSalBytes);
            var hash = Rfc2898DeriveBytes.Pbkdf2(
                password,
                salt,
                Iteraciones,
                HashAlgorithmName.SHA256,
                TamanoHashBytes);

            return $"{Iteraciones}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
        }

        public static bool VerifyPassword(string password, string hashAlmacenado)
        {
            if (string.IsNullOrEmpty(password) || string.IsNullOrEmpty(hashAlmacenado))
            {
                return false;
            }

            var partes = hashAlmacenado.Split('.', 3);
            if (partes.Length != 3)
            {
                return false;
            }

            if (!int.TryParse(partes[0], out var iteraciones))
            {
                return false;
            }

            byte[] salt;
            byte[] hashEsperado;
            try
            {
                salt = Convert.FromBase64String(partes[1]);
                hashEsperado = Convert.FromBase64String(partes[2]);
            }
            catch (FormatException)
            {
                return false;
            }

            var hashCalculado = Rfc2898DeriveBytes.Pbkdf2(
                password,
                salt,
                iteraciones,
                HashAlgorithmName.SHA256,
                hashEsperado.Length);

            return CryptographicOperations.FixedTimeEquals(hashCalculado, hashEsperado);
        }
    }
}
