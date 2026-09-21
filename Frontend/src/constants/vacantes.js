// Catálogo de vacantes precargado. Por ahora es información estática (no
// viene de la base de datos ni de ningún endpoint): basta con editar este
// arreglo para agregar, quitar o modificar vacantes. El día que se quiera
// que esto salga de una tabla real, aquí es donde se reemplazaría el
// arreglo por la llamada al backend correspondiente, sin tocar Vacantes.jsx
// más que para el fetch.
export const VACANTES_PRECARGADAS = [
  {
    id: 1,
    nombreVacante: 'Enfermería General - Turno Matutino',
    puestoAsociado: 'Enfermero(a) General',
    area: 'Salud',
    escolaridadMinima: 'Licenciatura en Enfermería',
  },
  {
    id: 2,
    nombreVacante: 'Auxiliar Administrativo - Recepción',
    puestoAsociado: 'Auxiliar Administrativo',
    area: 'Administrativo',
    escolaridadMinima: 'Bachillerato',
  },
  {
    id: 3,
    nombreVacante: 'Analista de Sistemas Jr.',
    puestoAsociado: 'Analista de Sistemas',
    area: 'Tecnologías de la Información',
    escolaridadMinima: 'Licenciatura en Sistemas Computacionales o afín',
  },
  {
    id: 4,
    nombreVacante: 'Técnico de Laboratorio Clínico',
    puestoAsociado: 'Técnico en Laboratorio',
    area: 'Salud',
    escolaridadMinima: 'Técnico Superior Universitario en Laboratorio Clínico',
  },
  {
    id: 5,
    nombreVacante: 'Contador Junior - Nóminas',
    puestoAsociado: 'Contador',
    area: 'Contabilidad',
    escolaridadMinima: 'Licenciatura en Contaduría Pública',
  },
  {
    id: 6,
    nombreVacante: 'Generalista de Recursos Humanos',
    puestoAsociado: 'Generalista de RH',
    area: 'Recursos Humanos',
    escolaridadMinima: 'Licenciatura en Psicología, Administración o afín',
  },
]
