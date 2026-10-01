// Catálogo documental de CU-04, en el mismo orden en que el backend
// (`DocumentosController.OrdenCatalogo`) los regresa. El valor de `tipo`
// debe coincidir exactamente con el nombre del enum `TipoDocumento` en C#.
//
// Nota: `Rfc` conserva su `tipo` original (así llega/se guarda del lado del
// backend); solo se le cambió la `etiqueta` visible.

export const TIPOS_DOCUMENTO = [
  { tipo: 'Ine', etiqueta: 'INE' },
  { tipo: 'Rfc', etiqueta: 'Constancia de Situación Fiscal' },
  { tipo: 'ActaNacimiento', etiqueta: 'Acta de nacimiento' },
  { tipo: 'CartillaMilitar', etiqueta: 'Cartilla militar (hombres)' },
  { tipo: 'RecomendacionLaboral', etiqueta: 'Carta de recomendación laboral' },
  { tipo: 'RecomendacionPersonal', etiqueta: 'Carta de recomendación personal' },
  { tipo: 'ComprobanteEstudios', etiqueta: 'Comprobante de último grado de estudios' },
  { tipo: 'ComprobanteDomicilio', etiqueta: 'Comprobante de domicilio' },
  { tipo: 'Curp', etiqueta: 'CURP' },
  { tipo: 'CedulaProfesional', etiqueta: 'Cédula profesional' },
]

export const TAMANIO_MAXIMO_BYTES = 5 * 1024 * 1024 // 5 MB, igual que el backend

export const EXTENSIONES_PERMITIDAS = ['.pdf', '.jpg', '.jpeg', '.png']

export const ESTADO_DOCUMENTO_INFO = {
  sinCargar: { etiqueta: 'Sin cargar', clase: 'bg-[var(--surface)] text-[var(--muted)]' },
  vigente: { etiqueta: 'Vigente', clase: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  porVencer: { etiqueta: 'Por vencer', clase: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  vencido: { etiqueta: 'Vencido', clase: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
}

// Alias en texto libre para relacionar un renglón de "Documentación
// requerida" de un perfil de puesto (PerfilPuestoDocumento.Nombre /
// .TipoDocumento, texto libre que define SIATEC) con uno de los tipos fijos
// del catálogo de arriba, y así poder precargar en PostularsePerfilPuesto.jsx
// el documento que el aspirante ya tiene cargado en Documentos (CU-04) en
// vez de pedírselo de nuevo. Los alias están en minúsculas y sin acentos
// porque se comparan contra texto ya normalizado (ver normalizarTexto).
export const ALIAS_TIPO_DOCUMENTO = {
  Ine: ['ine', 'identificacion oficial'],
  Rfc: ['rfc', 'constancia de situacion fiscal'],
  ActaNacimiento: ['acta de nacimiento'],
  CartillaMilitar: ['cartilla militar', 'cartilla del servicio militar', 'servicio militar nacional'],
  RecomendacionLaboral: ['recomendacion laboral', 'referencia laboral', 'carta laboral'],
  RecomendacionPersonal: ['recomendacion personal', 'referencia personal', 'carta personal'],
  ComprobanteEstudios: ['comprobante de estudios', 'ultimo grado de estudios', 'comprobante de ultimo grado'],
  ComprobanteDomicilio: ['comprobante de domicilio'],
  Curp: ['curp'],
  CedulaProfesional: ['cedula profesional'],
}

// Quita acentos, pasa a minúsculas y deja solo letras/números separados por
// un único espacio, para poder comparar por palabra completa (evita, por
// ejemplo, que "ine" coincida dentro de otra palabra que no tenga espacio
// alrededor).
function normalizarTexto(texto) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Busca, entre los alias de ALIAS_TIPO_DOCUMENTO, cuál tipo del catálogo de
 * CU-04 corresponde a un renglón de "Documentación requerida" de un perfil
 * de puesto, comparando tanto su Nombre como su TipoDocumento (ambos texto
 * libre de SIATEC). Regresa la clave del tipo (p. ej. 'Curp') o null si
 * ningún alias coincide — en ese caso simplemente no hay nada que precargar
 * y el aspirante sigue subiendo el archivo a mano, como hoy.
 */
export function detectarTipoDocumentoPorNombre(nombre, tipoDocumentoTexto) {
  const normalizado = ` ${normalizarTexto(`${nombre || ''} ${tipoDocumentoTexto || ''}`)} `
  for (const [tipo, alias] of Object.entries(ALIAS_TIPO_DOCUMENTO)) {
    if (alias.some((frase) => normalizado.includes(` ${frase} `))) {
      return tipo
    }
  }
  return null
}
