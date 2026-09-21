// Catálogo documental de CU-04, en el mismo orden en que el backend
// (`DocumentosController.OrdenCatalogo`) los regresa. El valor de `tipo`
// debe coincidir exactamente con el nombre del enum `TipoDocumento` en C#.

export const TIPOS_DOCUMENTO = [
  { tipo: 'Ine', etiqueta: 'INE' },
  { tipo: 'Rfc', etiqueta: 'RFC' },
  { tipo: 'ActaNacimiento', etiqueta: 'Acta de nacimiento' },
  { tipo: 'CartillaMilitar', etiqueta: 'Cartilla militar (hombres)' },
  { tipo: 'RecomendacionLaboral', etiqueta: 'Carta de recomendación laboral' },
  { tipo: 'RecomendacionPersonal', etiqueta: 'Carta de recomendación personal' },
  { tipo: 'ComprobanteEstudios', etiqueta: 'Comprobante de último grado de estudios' },
]

export const TAMANIO_MAXIMO_BYTES = 5 * 1024 * 1024 // 5 MB, igual que el backend

export const EXTENSIONES_PERMITIDAS = ['.pdf', '.jpg', '.jpeg', '.png']

export const ESTADO_DOCUMENTO_INFO = {
  sinCargar: { etiqueta: 'Sin cargar', clase: 'bg-[var(--surface)] text-[var(--muted)]' },
  vigente: { etiqueta: 'Vigente', clase: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  porVencer: { etiqueta: 'Por vencer', clase: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  vencido: { etiqueta: 'Vencido', clase: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
}
