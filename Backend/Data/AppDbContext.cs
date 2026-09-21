using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Postulacion> Postulaciones { get; set; }

        public DbSet<Area> Areas { get; set; }

        public DbSet<Profesion> Profesiones { get; set; }

        public DbSet<Usuario> Usuarios { get; set; }

        public DbSet<CodigoVerificacion> CodigosVerificacion { get; set; }

        public DbSet<IntentoAcceso> IntentosAcceso { get; set; }

        public DbSet<PerfilAspirante> PerfilesAspirante { get; set; }

        public DbSet<ExperienciaLaboral> ExperienciaLaboral { get; set; }

        public DbSet<FormacionAcademica> FormacionAcademica { get; set; }

        public DbSet<Habilidad> Habilidades { get; set; }

        public DbSet<HistorialPerfil> HistorialPerfil { get; set; }

        public DbSet<Certificacion> Certificaciones { get; set; }

        public DbSet<DocumentoAspirante> Documentos { get; set; }

        public DbSet<PerfilPuesto> PerfilesPuesto { get; set; }

        public DbSet<PerfilPuestoVersion> PerfilesPuestoVersiones { get; set; }

        public DbSet<PerfilPuestoEscolaridad> PerfilesPuestoEscolaridades { get; set; }

        public DbSet<PerfilPuestoDocumento> PerfilesPuestoDocumentos { get; set; }

        public DbSet<PerfilPuestoFuncion> PerfilesPuestoFunciones { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // La base de datos es compartida con otros sistemas (nómina, contabilidad, etc.),
            // así que esta entidad se guarda en su propia tabla, claramente nombrada, en vez
            // de en una tabla genérica "Postulaciones" que podría confundirse o chocar con
            // algo existente.
            modelBuilder.Entity<Postulacion>().ToTable("RRHH_Reclutamiento_Postulaciones", schema: "dbo");

            // Catálogo compartido de áreas de interés (ver "Plan de Flujo -
            // Filtrado de Postulantes por Area en SIATEC.md"). El nombre es
            // único porque es lo que usa la migración de datos viejos
            // (CreateAreasCatalogoYMigrarPostulaciones.sql) para emparejar
            // el texto libre que tenían las postulaciones ya existentes.
            modelBuilder.Entity<Area>(entidad =>
            {
                entidad.ToTable("RRHH_Reclutamiento_Areas", schema: "dbo");
                entidad.HasIndex(a => a.Nombre).IsUnique();
            });

            // Catálogo de profesiones/carreras (independiente de Áreas): es
            // el criterio real de emparejamiento con vacantes, agrupado por
            // Nivel de estudios — ver el comentario en Models/Profesion.cs.
            modelBuilder.Entity<Profesion>(entidad =>
            {
                entidad.ToTable("RRHH_Reclutamiento_Profesiones", schema: "dbo");
                entidad.HasIndex(p => p.Nombre).IsUnique();
            });

            // Tablas de cuentas de aspirante (CU-01). Mismo criterio de nombrado que arriba:
            // namespaced bajo "RRHH_Reclutamiento_" para no chocar con nada existente en la
            // base compartida el día que se conecte a SQL Server real.
            modelBuilder.Entity<Usuario>(entidad =>
            {
                entidad.ToTable("RRHH_Reclutamiento_Usuarios", schema: "dbo");
                entidad.HasIndex(u => u.CorreoOTelefono).IsUnique();

                // Las columnas de estos dos enums son TINYINT en el script SQL
                // (CreateTablasCuentas.sql) para no gastar 4 bytes en un valor
                // que cabe en 1. Sin este HasConversion<byte>() explícito, EF
                // Core mapea el enum a INT por default y truena con
                // "Unable to cast object of type 'System.Byte' to type
                // 'System.Int32'" al leer de SQL Server real (el proveedor
                // InMemory no distingue tipos de columna, por eso no se veía
                // este error antes).
                entidad.Property(u => u.TipoContacto).HasConversion<byte>();
                entidad.Property(u => u.Estado).HasConversion<byte>();
            });

            modelBuilder.Entity<CodigoVerificacion>(entidad =>
            {
                entidad.ToTable("RRHH_Reclutamiento_CodigosVerificacion", schema: "dbo");
                entidad.Property(c => c.Proposito).HasConversion<byte>();
            });

            // CU-02: auditoría de intentos de inicio de sesión.
            modelBuilder.Entity<IntentoAcceso>(entidad =>
            {
                entidad.ToTable("RRHH_Reclutamiento_IntentosAcceso", schema: "dbo");
                entidad.Property(i => i.Resultado).HasConversion<byte>();
            });

            // CU-03: perfil del aspirante, separado de Usuario (que solo maneja
            // el acceso a la cuenta) mediante una relación 1 a 1 por UsuarioId.
            modelBuilder.Entity<PerfilAspirante>(entidad =>
            {
                entidad.ToTable("RRHH_Reclutamiento_PerfilesAspirante", schema: "dbo");
                entidad.HasIndex(p => p.UsuarioId).IsUnique();

                entidad.HasMany(p => p.ExperienciaLaboral)
                    .WithOne()
                    .HasForeignKey(e => e.PerfilAspiranteId)
                    .OnDelete(DeleteBehavior.Cascade);

                entidad.HasMany(p => p.FormacionAcademica)
                    .WithOne()
                    .HasForeignKey(f => f.PerfilAspiranteId)
                    .OnDelete(DeleteBehavior.Cascade);

                entidad.HasMany(p => p.Habilidades)
                    .WithOne()
                    .HasForeignKey(h => h.PerfilAspiranteId)
                    .OnDelete(DeleteBehavior.Cascade);

                entidad.HasMany(p => p.Certificaciones)
                    .WithOne()
                    .HasForeignKey(c => c.PerfilAspiranteId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<ExperienciaLaboral>()
                .ToTable("RRHH_Reclutamiento_ExperienciaLaboral", schema: "dbo");

            modelBuilder.Entity<FormacionAcademica>()
                .ToTable("RRHH_Reclutamiento_FormacionAcademica", schema: "dbo");

            modelBuilder.Entity<Habilidad>()
                .ToTable("RRHH_Reclutamiento_Habilidades", schema: "dbo");

            modelBuilder.Entity<HistorialPerfil>()
                .ToTable("RRHH_Reclutamiento_HistorialPerfil", schema: "dbo");

            modelBuilder.Entity<Certificacion>()
                .ToTable("RRHH_Reclutamiento_Certificaciones", schema: "dbo");

            // CU-04: documentos cargados por el aspirante. Un índice por
            // (UsuarioId, TipoDocumento) porque es exactamente como se
            // consulta el vigente de cada tipo en DocumentosController.
            modelBuilder.Entity<DocumentoAspirante>(entidad =>
            {
                entidad.ToTable("RRHH_Reclutamiento_DocumentosAspirante", schema: "dbo");
                entidad.Property(d => d.TipoDocumento).HasConversion<byte>();
                entidad.HasIndex(d => new { d.UsuarioId, d.TipoDocumento });
            });

            // Perfiles de puesto (catálogo de solo lectura de este lado —
            // SIATEC es quien crea/versiona/publica estos registros; ver
            // Documentacion/SE-137-Reclutamiento/conexionPerfilPuesto.md).
            // Sin navegación de EF entre estas tres tablas ni hacia
            // Areas/Profesiones, mismo criterio que el resto del proyecto:
            // PerfilesPuestoController las resuelve con consultas aparte.
            modelBuilder.Entity<PerfilPuesto>(entidad =>
            {
                entidad.ToTable("RRHH_Reclutamiento_PerfilesPuesto", schema: "dbo");
                entidad.HasIndex(p => p.CodigoPerfil).IsUnique();
            });

            modelBuilder.Entity<PerfilPuestoVersion>(entidad =>
            {
                entidad.ToTable("RRHH_Reclutamiento_PerfilesPuesto_Versiones", schema: "dbo");
                entidad.HasIndex(v => new { v.PerfilId, v.NumeroVersion }).IsUnique();
            });

            modelBuilder.Entity<PerfilPuestoEscolaridad>(entidad =>
            {
                entidad.ToTable("RRHH_Reclutamiento_PerfilesPuesto_Escolaridades", schema: "dbo");
                entidad.HasIndex(e => new { e.VersionId, e.ProfesionId }).IsUnique();
            });

            modelBuilder.Entity<PerfilPuestoDocumento>()
                .ToTable("RRHH_Reclutamiento_PerfilesPuesto_Documentos", schema: "dbo");

            modelBuilder.Entity<PerfilPuestoFuncion>()
                .ToTable("RRHH_Reclutamiento_PerfilesPuesto_Funciones", schema: "dbo");
        }
    }
}
