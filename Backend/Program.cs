using Backend.Data;
using Backend.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Swashbuckle.AspNetCore.SwaggerGen;
using Swashbuckle.AspNetCore.SwaggerUI;

// Base de datos real: SQL Server, base compartida AI-LUCCA-SEP. Las tablas
// del módulo (RRHH_Reclutamiento_*) ya se crearon con CreateTablasCuentas.sql
// y las credenciales de conexión se leen de Backend/.env (DB_HOST, DB_PORT,
// DB_NAME, DB_USER, DB_PASSWORD, DB_ENCRYPT, DB_TRUST_SERVER_CERTIFICATE).
// Se deja la línea de InMemory comentada abajo por si hiciera falta volver
// a ella temporalmente, sin tener que reescribir nada de esto.
LoadDotEnv(
    Path.Combine(Directory.GetCurrentDirectory(), ".env"),
    Path.Combine(AppContext.BaseDirectory, "..", "..", "..", ".env"));

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

var connectionString = BuildSqlServerConnectionString();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));
// builder.Services.AddDbContext<AppDbContext>(options =>
//     options.UseInMemoryDatabase("BolsaTrabajoDb"));

// CU-01: envío del código de verificación de cuenta.
// - Correo manda de verdad con Brevo cuando hay BREVO_API_KEY configurada
//   (ver "Plan de Implementacion - Integracion Brevo para Verificacion por
//   Correo.md").
// - Teléfono manda de verdad por SMS con Vonage cuando hay
//   VONAGE_API_KEY/VONAGE_API_SECRET configuradas (ver "Plan de
//   Implementacion - Integracion Vonage SMS para Verificacion.md").
// El canal sin proveedor configurado sigue cayendo a la versión de consola
// de siempre (solo registra el código en el log y se regresa en la
// respuesta para poder probar el flujo de forma visual). Si ninguno de los
// dos está configurado, todo sigue exactamente como antes de estos planes.
var brevoApiKey = Environment.GetEnvironmentVariable("BREVO_API_KEY");
var vonageApiKey = Environment.GetEnvironmentVariable("VONAGE_API_KEY");
var vonageApiSecret = Environment.GetEnvironmentVariable("VONAGE_API_SECRET");

builder.Services.AddSingleton<ServicioVerificacionConsola>();

// Se resuelve en una sola fábrica (en vez de decidir aquí arriba con un
// ServiceProvider aparte) para poder usar el mismo ServiceProvider real de
// la app al pedir los ILogger<T> de cada proveedor.
builder.Services.AddScoped<IServicioVerificacion>(sp =>
{
    var fallbackConsola = sp.GetRequiredService<ServicioVerificacionConsola>();

    IServicioVerificacion? servicioCorreo = null;
    if (!string.IsNullOrWhiteSpace(brevoApiKey))
    {
        var brevoRemitenteCorreo = Environment.GetEnvironmentVariable("BREVO_SENDER_EMAIL")
            ?? throw new InvalidOperationException("Falta la variable de entorno 'BREVO_SENDER_EMAIL' (requerida junto con BREVO_API_KEY; revisa tu archivo .env).");
        var brevoRemitenteNombre = Environment.GetEnvironmentVariable("BREVO_SENDER_NOMBRE") ?? "Bolsa de Trabajo SIATEC";

        servicioCorreo = new ServicioVerificacionBrevo(
            brevoApiKey,
            brevoRemitenteCorreo,
            brevoRemitenteNombre,
            fallbackConsola,
            sp.GetRequiredService<ILogger<ServicioVerificacionBrevo>>());
    }

    IServicioVerificacion? servicioTelefono = null;
    if (!string.IsNullOrWhiteSpace(vonageApiKey))
    {
        var vonageSecret = vonageApiSecret
            ?? throw new InvalidOperationException("Falta la variable de entorno 'VONAGE_API_SECRET' (requerida junto con VONAGE_API_KEY; revisa tu archivo .env).");
        var vonageRemitente = Environment.GetEnvironmentVariable("VONAGE_SMS_FROM");

        servicioTelefono = new ServicioVerificacionVonage(
            vonageApiKey,
            vonageSecret,
            vonageRemitente,
            fallbackConsola,
            sp.GetRequiredService<ILogger<ServicioVerificacionVonage>>());
    }

    // Si ninguno de los dos está configurado, se sigue regresando el
    // fallback de consola directo — cero cambio de comportamiento frente a
    // como estaba antes de este plan.
    if (servicioCorreo is null && servicioTelefono is null)
    {
        return fallbackConsola;
    }

    return new ServicioVerificacionEnrutador(servicioCorreo, servicioTelefono, fallbackConsola);
});

// CU-02: sesión de usuario mediante cookie de autenticación. Es parte del
// framework de ASP.NET Core (Microsoft.AspNetCore.Authentication.Cookies),
// no requiere agregar ningún paquete NuGet nuevo. En desarrollo (HTTP, sin
// TLS) Cookie.SecurePolicy debe permitir HTTP; en producción, con HTTPS,
// esto se ajusta a SameAsRequest o Always sin tocar el resto del flujo.
//
// Aislamiento de la cookie por ambiente: las cookies se guardan por DOMINIO
// (localhost), no por puerto — si en la misma máquina corren dos backends
// (p. ej. uno de pruebas y otro "de verdad") con el mismo nombre de cookie,
// el navegador les manda la misma cookie a ambos. Sin el SetApplicationName
// de abajo, ambos backends comparten el mismo propósito de cifrado (mismo
// perfil de usuario de Windows = mismas llaves DPAPI) y cada uno descifra
// la cookie del otro, atribuyendo peticiones a un UsuarioId que NO existe
// en su propia base de datos — eso rompía el FK de Postulaciones.UsuarioId
// con error 547 ("The INSERT statement conflicted with the FOREIGN KEY
// constraint") al postular. Con un ApplicationName distinto por DB_NAME, la
// cookie del otro ambiente simplemente no descifra y la petición se trata
// como anónima (como debe ser).
// aislamiento también cubre el caso de dos servidores distintos que usen
// el mismo nombre de base de datos.
builder.Services.AddDataProtection()
    .SetApplicationName(
        $"BolsaTrabajo-{Environment.GetEnvironmentVariable("DB_HOST") ?? "localhost"}-" +
        $"{Environment.GetEnvironmentVariable("DB_NAME") ?? "local"}");

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "BolsaTrabajo.Sesion";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.SlidingExpiration = true;

        // La API se consume desde una SPA, no queremos que el middleware
        // redirija a una pantalla de login inexistente: en vez de eso,
        // responde 401/403 tal cual para que el frontend decida qué hacer.
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");

// SPA compilada (frontend): el ejecutable de pruebas sirve tanto la API como
// el frontend desde este mismo proceso, así que el build de Vite se copia a
// wwwroot antes de publicar (ver publicar-pruebas.bat en la raíz del repo).
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Cualquier ruta que no sea /api/* ni un archivo estático existente devuelve
// index.html y deja que react-router resuelva — sin esto, refrescar /panel o
// /login en el ejecutable daba 404.
app.MapFallbackToFile("index.html");

app.Run();

// Carga variables desde un archivo .env (formato KEY=VALUE, una por línea,
// líneas vacías y las que empiezan con # se ignoran) hacia variables de
// entorno del proceso. No sobreescribe una variable que ya exista (por
// ejemplo, si se define a nivel de sistema o en el entorno de despliegue).
static void LoadDotEnv(params string[] candidatePaths)
{
    var path = candidatePaths.FirstOrDefault(File.Exists);
    if (path is null)
    {
        return;
    }

    foreach (var rawLine in File.ReadAllLines(path))
    {
        var line = rawLine.Trim();
        if (line.Length == 0 || line.StartsWith('#'))
        {
            continue;
        }

        var separatorIndex = line.IndexOf('=');
        if (separatorIndex <= 0)
        {
            continue;
        }

        var key = line[..separatorIndex].Trim();
        var value = line[(separatorIndex + 1)..].Trim().Trim('"');

        if (Environment.GetEnvironmentVariable(key) is null)
        {
            Environment.SetEnvironmentVariable(key, value);
        }
    }
}

// Arma la cadena de conexión a SQL Server a partir de las variables
// DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_ENCRYPT y
// DB_TRUST_SERVER_CERTIFICATE (cargadas desde .env arriba, o ya presentes
// como variables de entorno reales).
static string BuildSqlServerConnectionString()
{
    string Require(string key) =>
        Environment.GetEnvironmentVariable(key)
            ?? throw new InvalidOperationException($"Falta la variable de entorno '{key}' (revisa tu archivo .env).");

    var host = Require("DB_HOST");
    var port = Environment.GetEnvironmentVariable("DB_PORT") ?? "1433";
    var database = Require("DB_NAME");
    var user = Require("DB_USER");
    var password = Require("DB_PASSWORD");
    var encrypt = Environment.GetEnvironmentVariable("DB_ENCRYPT") ?? "false";
    var trustServerCertificate = Environment.GetEnvironmentVariable("DB_TRUST_SERVER_CERTIFICATE") ?? "true";

    // Seguridad: si las credenciales apuntan a una base del sistema de SQL
    // Server (p. ej. porque el .env quedó mal o alguien corrió la app desde
    // una conexión por defecto), la app NO debe arrancar "funcionando" en
    // silencio contra la base equivocada — las tablas RRHH_Reclutamiento_*
    // llegaron a crearse en master de esa forma una vez, y las postulaciones
    // fallaban con violaciones de FK contra un catálogo inexistente. Mejor
    // caer al arrancar con un mensaje inequívoco.
    var basesDelSistema = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "master", "model", "msdb", "tempdb"
    };
    if (basesDelSistema.Contains(database))
    {
        throw new InvalidOperationException(
            $"DB_NAME no puede ser '{database}': es una base de datos del sistema de SQL Server. " +
            "Revisa el archivo .env del backend (debe apuntar a la base del módulo, p. ej. LUCCA).");
    }

    return $"Server={host},{port};Database={database};User Id={user};Password={password};" +
           $"Encrypt={encrypt};TrustServerCertificate={trustServerCertificate};";
}
