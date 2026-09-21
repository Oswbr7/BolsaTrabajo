# Guía de Instalación — Bolsa de Trabajo SIATEC

Este proyecto no tiene un único archivo tipo `requirements.txt` (eso es específico de Python), porque en realidad son **dos ecosistemas distintos**, cada uno con su propio manifiesto de dependencias que ya existe en el repositorio:

| Parte | Manifiesto ya existente | Comando que instala todo |
|---|---|---|
| Frontend (React + Vite) | `Frontend/package.json` | `npm install` |
| Backend (ASP.NET Core) | `Backend/Backend.csproj` | `dotnet restore` |

Es decir: **no hay que crear nada nuevo para las dependencias de código**, `npm install` y `dotnet restore` ya leen esos archivos y descargan exactamente las versiones que este proyecto usa. Esta guía cubre todo lo demás que una computadora nueva necesita: software base, variables de entorno y base de datos.

---

## 1. Software que debe estar instalado en la computadora nueva

- **Node.js** — versión 18 o superior (recomendado LTS más reciente). Incluye `npm`.
- **.NET SDK 10** — el proyecto usa `<TargetFramework>net10.0</TargetFramework>` en `Backend.csproj`, así que se necesita el SDK de .NET 10 (no basta con el Runtime).
- **Acceso a SQL Server** — no es necesario instalar SQL Server en la misma máquina; basta con poder alcanzar por red la base de datos compartida (`LUCCA`) que ya usan Bolsa de Trabajo y SIATEC. Si se va a levantar una base nueva/local, sí se necesita una instancia de SQL Server (Express sirve).
- **Git** (opcional pero recomendado) si el proyecto se va a clonar desde un repositorio en lugar de copiarse manualmente.

---

## 2. Copiar el proyecto

Copia las carpetas `Frontend/` y `Backend/` completas a la computadora nueva. No es necesario copiar `node_modules/`, `bin/`, `obj/` ni `Frontend/dist` — se regeneran solos en el paso 3. Tampoco se copia el archivo `.env` real por correo/USB sin cuidado: trátalo como una credencial (ver sección 4).

---

## 3. Instalar dependencias

```bash
# Frontend
cd Frontend
npm install

# Backend
cd ../Backend
dotnet restore
```

---

## 4. Variables de entorno (`Backend/.env`)

El backend **no** usa `appsettings.json` para la conexión a base de datos real ni para las credenciales de Brevo — todo eso se lee de un archivo `Backend/.env` (ignorado por git a propósito, porque contiene credenciales reales). Ese archivo no se copia tal cual entre computadoras si cambian las credenciales; en la computadora nueva crea `Backend/.env` con esta plantilla y rellena los valores reales:

```env
# --- Conexión a SQL Server ---
DB_HOST=
DB_PORT=1433
DB_NAME=
DB_USER=
DB_PASSWORD=
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# --- Envío de correo de verificación (Brevo) ---
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NOMBRE=Bolsa de Trabajo SIATEC
```

Notas:

- Si `BREVO_API_KEY` se deja vacía, el backend cae automáticamente al modo de consola (`ServicioVerificacionConsola`) y no envía correos reales — útil para desarrollo, pero en producción debe tener el valor real.
- `BREVO_SENDER_EMAIL` debe ser un correo real y verificado en la cuenta de Brevo (Brevo lo verifica con un código de 6 dígitos), no puede ser inventado.
- El bloque `ConnectionStrings.DefaultConnection` que aparece en `appsettings.json` **no se usa**; es un valor de ejemplo que quedó del scaffolding inicial. La cadena de conexión real se arma en tiempo de ejecución en `Program.cs` a partir de las variables `DB_*` de arriba.
- `appsettings.json` también contiene `CifradoDocumentos.Llave` (una llave AES-256 usada para cifrar documentos de CU-04). Si la computadora nueva es para producción, esa llave debería moverse a un manejo de secretos real y no quedarse en el archivo — hay un comentario en el propio `appsettings.json` recordándolo.

---

## 5. Base de datos

Los scripts SQL viven en `Backend/*.sql`. Cuál ejecutar depende del estado de la base de datos destino:

- **Base de datos nueva / vacía** → ejecutar `CreateTablasCuentas.sql`. Este script ya crea todo desde cero: cuentas, postulaciones, el catálogo de áreas (`RRHH_Reclutamiento_Areas`) y sus relaciones.
- **Base de datos existente/compartida con SIATEC** (por ejemplo, si ya tenía datos de una instalación previa) → ejecutar en orden los scripts incrementales, en lugar del script maestro:
  1. `AlterPostulacionesDocumentosYHabilidades.sql`
  2. `CreateAreasCatalogoYMigrarPostulaciones.sql`

Todos estos scripts son idempotentes (verifican si sus tablas/columnas ya existen antes de crearlas), así que ejecutarlos de más no debería romper nada, pero de todas formas conviene hacer un respaldo antes en una base con datos reales.

---

## 6. Levantar el proyecto

```bash
# Backend (queda escuchando en el puerto 5053)
cd Backend
dotnet run

# Frontend (queda escuchando en el puerto 5173, y su proxy de /api
# ya apunta a http://localhost:5053 — ver vite.config.js)
cd Frontend
npm run dev
```

Abre `http://localhost:5173` en el navegador. Si el frontend muestra errores de conexión rechazada (`ECONNREFUSED`) hacia `/api/...`, normalmente significa solo que el backend (`dotnet run`) no está corriendo todavía o no terminó de arrancar.

---

## 7. Checklist rápido

- [ ] Node.js y .NET SDK 10 instalados
- [ ] Carpetas `Frontend/` y `Backend/` copiadas
- [ ] `npm install` ejecutado en `Frontend/`
- [ ] `dotnet restore` ejecutado en `Backend/`
- [ ] `Backend/.env` creado con las credenciales reales (DB + Brevo)
- [ ] Script(s) SQL correspondientes ejecutados contra la base de datos
- [ ] `dotnet run` (backend) y `npm run dev` (frontend) corriendo sin errores
