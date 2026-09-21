import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { FORMACION_OPTIONS, ESTADOS_MEXICO } from '../constants/catalogos.js'

const CLAVE_BORRADOR = 'asistentePerfilBorrador'

const PASOS = [
  'Datos personales',
  'Contacto y residencia',
  'Experiencia laboral',
  'Formación académica',
  'Certificaciones',
  'Habilidades',
  'Revisar y confirmar',
]

const soloLetras = (valor) => valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '')
const soloDigitos = (valor) => valor.replace(/\D/g, '').slice(0, 12)

// RFC (persona física) y CURP son códigos alfanuméricos de longitud fija:
// se limpia todo lo que no sea letra/número, se fuerza a mayúsculas (como
// se ven en el documento oficial) y se recorta al límite correspondiente.
const RFC_LONGITUD = 13
const CURP_LONGITUD = 18
const soloAlfanumerico = (valor, limite) => valor.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, limite)

// Mismas reglas que valida PerfilController.GuardarPerfil del lado del
// servidor (RegexCorreo, RegexTelefono, EdadMinimaAnios, fechas de
// experiencia/formación). Se repiten aquí para poder avisar paso por paso,
// en vez de que el aspirante se entere de un dato mal capturado hasta que
// intenta guardar todo al final en el paso de revisión.
const REGEX_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const REGEX_TELEFONO = /^\d{10,12}$/
const EDAD_MINIMA_ANIOS = 16

const calcularEdad = (fechaNacimientoStr) => {
  const fechaNacimiento = new Date(fechaNacimientoStr)
  const hoy = new Date()
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear()
  const noHaCumplidoAnios =
    hoy.getMonth() < fechaNacimiento.getMonth() ||
    (hoy.getMonth() === fechaNacimiento.getMonth() && hoy.getDate() < fechaNacimiento.getDate())
  if (noHaCumplidoAnios) {
    edad--
  }
  return edad
}

// YYYY-MM-DD, listo para un <input type="date">. Acepta ISO completo o vacío.
const aFechaInput = (valor) => (valor ? String(valor).slice(0, 10) : '')

function formularioVacio() {
  return {
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    fechaNacimiento: '',
    rfc: '',
    curp: '',
    telefono: '',
    correo: '',
    estado: '',
    municipio: '',
    experienciaLaboral: [],
    formacionAcademica: [],
    habilidades: [],
    certificaciones: [],
  }
}

function formularioDesdePerfil(perfil) {
  if (!perfil || !perfil.existe) {
    return formularioVacio()
  }

  return {
    nombre: perfil.nombre || '',
    apellidoPaterno: perfil.apellidoPaterno || '',
    apellidoMaterno: perfil.apellidoMaterno || '',
    fechaNacimiento: aFechaInput(perfil.fechaNacimiento),
    rfc: perfil.rfc || '',
    curp: perfil.curp || '',
    telefono: perfil.telefono || '',
    correo: perfil.correo || '',
    estado: perfil.estado || '',
    municipio: perfil.municipio || '',
    experienciaLaboral: (perfil.experienciaLaboral || []).map((e) => ({
      empresa: e.empresa || '',
      puesto: e.puesto || '',
      fechaInicio: aFechaInput(e.fechaInicio),
      fechaFin: aFechaInput(e.fechaFin),
      trabajaActualmente: !e.fechaFin,
      descripcion: e.descripcion || '',
    })),
    formacionAcademica: (perfil.formacionAcademica || []).map((f) => ({
      institucion: f.institucion || '',
      nivelEstudios: f.nivelEstudios || '',
      // Área de estudio: solo es un filtro para el <select> de Profesión (no
      // se manda al backend), así que al cargar un perfil ya guardado se
      // deja vacía aquí — el useEffect que carga el catálogo de profesiones
      // la rellena en cuanto sabe a qué Área pertenece el profesionId ya
      // guardado (ver más abajo).
      areaEstudio: '',
      profesionId: f.profesionId != null ? String(f.profesionId) : '',
      fechaInicio: aFechaInput(f.fechaInicio),
      fechaFin: aFechaInput(f.fechaFin),
      enCurso: !f.fechaFin,
    })),
    habilidades: perfil.habilidades || [],
    certificaciones: (perfil.certificaciones || []).map((c) => ({
      nombre: c.nombre || '',
      institucion: c.institucion || '',
      fechaObtencion: aFechaInput(c.fechaObtencion),
      fechaVencimiento: aFechaInput(c.fechaVencimiento),
      sinVencimiento: !c.fechaVencimiento,
    })),
  }
}

function AsistentePerfil({ datosIniciales, onGuardado }) {
  const [paso, setPaso] = useState(0)
  const [form, setForm] = useState(formularioVacio)
  const [habilidadNueva, setHabilidadNueva] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [avisoBorrador, setAvisoBorrador] = useState(false)
  const [profesiones, setProfesiones] = useState([])

  // Catálogo de Profesiones/Carreras (ver ProfesionesController): se agrupa
  // por Nivel de estudios para armar, en el paso de Formación académica, un
  // segundo <select> de "Profesión" que solo muestra las opciones del nivel
  // ya elegido en esa misma fila. Se pide una sola vez porque no cambia
  // durante el llenado del asistente.
  useEffect(() => {
    axios
      .get('/api/profesiones')
      .then((res) => setProfesiones(res.data || []))
      .catch(() => setProfesiones([]))
  }, [])

  // Backfill de Área de estudio para formaciones que ya traían un
  // profesionId guardado (perfil existente): en cuanto llega el catálogo de
  // profesiones, se busca a qué Área pertenece cada profesionId ya elegido
  // y se rellena esa fila — así el <select> de Área de estudio aparece
  // seleccionado en vez de vacío al editar un perfil ya guardado, y el
  // <select> de Profesión no se queda oculto esperando que el aspirante
  // vuelva a elegir el área a mano.
  useEffect(() => {
    if (profesiones.length === 0) return

    const areaPorId = {}
    for (const p of profesiones) {
      areaPorId[String(p.id)] = p.areaEstudio || ''
    }

    setForm((formActual) => {
      let cambio = false
      const formacionAcademica = formActual.formacionAcademica.map((f) => {
        if (f.profesionId && !f.areaEstudio && areaPorId[f.profesionId]) {
          cambio = true
          return { ...f, areaEstudio: areaPorId[f.profesionId] }
        }
        return f
      })
      return cambio ? { ...formActual, formacionAcademica } : formActual
    })
  }, [profesiones])

  // Al montar: si hay un borrador local (flujo alterno A7 — sesión expirada
  // a medias), se restaura y se avisa; si no, se parte de lo que ya esté
  // guardado en el servidor (o de un formulario vacío si es la primera vez).
  useEffect(() => {
    try {
      const borradorGuardado = localStorage.getItem(CLAVE_BORRADOR)
      if (borradorGuardado) {
        const borrador = JSON.parse(borradorGuardado)
        setForm(borrador.form)
        setPaso(borrador.paso || 0)
        setAvisoBorrador(true)
        return
      }
    } catch (err) {
      // Borrador corrupto o localStorage no disponible: se ignora y se sigue como si no existiera.
    }

    setForm(formularioDesdePerfil(datosIniciales))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const guardarBorradorLocal = (siguienteForm, siguientePaso) => {
    try {
      localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ form: siguienteForm, paso: siguientePaso }))
    } catch (err) {
      // Si el navegador bloquea localStorage, el asistente sigue funcionando,
      // solo que sin protección ante una sesión que expire a medias.
    }
  }

  const actualizarForm = (cambios) => {
    setForm((actual) => {
      const siguiente = { ...actual, ...cambios }
      guardarBorradorLocal(siguiente, paso)
      return siguiente
    })
  }

  const descartarBorrador = () => {
    localStorage.removeItem(CLAVE_BORRADOR)
    setForm(formularioDesdePerfil(datosIniciales))
    setPaso(0)
    setAvisoBorrador(false)
  }

  const irAPaso = (siguientePaso) => {
    setPaso(siguientePaso)
    guardarBorradorLocal(form, siguientePaso)
  }

  // --- Experiencia laboral ---

  const agregarExperiencia = () => {
    actualizarForm({
      experienciaLaboral: [
        ...form.experienciaLaboral,
        { empresa: '', puesto: '', fechaInicio: '', fechaFin: '', trabajaActualmente: false, descripcion: '' },
      ],
    })
  }

  const actualizarExperiencia = (indice, cambios) => {
    const lista = form.experienciaLaboral.map((item, i) => (i === indice ? { ...item, ...cambios } : item))
    actualizarForm({ experienciaLaboral: lista })
  }

  const quitarExperiencia = (indice) => {
    actualizarForm({ experienciaLaboral: form.experienciaLaboral.filter((_, i) => i !== indice) })
  }

  // --- Formación académica ---

  const agregarFormacion = () => {
    actualizarForm({
      formacionAcademica: [
        ...form.formacionAcademica,
        { institucion: '', nivelEstudios: '', areaEstudio: '', profesionId: '', fechaInicio: '', fechaFin: '', enCurso: false },
      ],
    })
  }

  const actualizarFormacion = (indice, cambios) => {
    const lista = form.formacionAcademica.map((item, i) => (i === indice ? { ...item, ...cambios } : item))
    actualizarForm({ formacionAcademica: lista })
  }

  const quitarFormacion = (indice) => {
    actualizarForm({ formacionAcademica: form.formacionAcademica.filter((_, i) => i !== indice) })
  }

  // --- Habilidades ---

  const agregarHabilidad = () => {
    const nombre = habilidadNueva.trim()
    if (nombre.length === 0 || form.habilidades.includes(nombre)) {
      setHabilidadNueva('')
      return
    }
    actualizarForm({ habilidades: [...form.habilidades, nombre] })
    setHabilidadNueva('')
  }

  const quitarHabilidad = (nombre) => {
    actualizarForm({ habilidades: form.habilidades.filter((h) => h !== nombre) })
  }

  // --- Certificaciones ---

  const agregarCertificacion = () => {
    actualizarForm({
      certificaciones: [
        ...form.certificaciones,
        { nombre: '', institucion: '', fechaObtencion: '', fechaVencimiento: '', sinVencimiento: false },
      ],
    })
  }

  const actualizarCertificacion = (indice, cambios) => {
    const lista = form.certificaciones.map((item, i) => (i === indice ? { ...item, ...cambios } : item))
    actualizarForm({ certificaciones: lista })
  }

  const quitarCertificacion = (indice) => {
    actualizarForm({ certificaciones: form.certificaciones.filter((_, i) => i !== indice) })
  }

  // Profesiones agrupadas por Nivel de estudios, para filtrar el <select>
  // de "Profesión" del paso de Formación académica según el nivel elegido
  // en esa misma fila (ver comentario del useEffect que las carga).
  const profesionesPorNivel = useMemo(() => {
    const mapa = {}
    for (const p of profesiones) {
      if (!mapa[p.nivel]) mapa[p.nivel] = []
      mapa[p.nivel].push(p)
    }
    return mapa
  }, [profesiones])

  // Áreas de estudio disponibles por Nivel (ej. "Ciencias Sociales y
  // Administrativas", "Ingeniería y Tecnología" — ver AreaEstudio en
  // ProfesionesController), para el <select> intermedio que ayuda a
  // encontrar una profesión más fácil entre las más de mil que trajo el
  // catálogo de carreras, en vez de buscarla a ojo en una sola lista larga
  // (mismo filtro de tres niveles que ya usa SIATEC del lado de Puestos:
  // Nivel → Área de estudio → Especialidad/Profesión). Si un Nivel no tiene
  // ninguna profesión con AreaEstudio capturada (catálogo viejo sin migrar
  // todavía), la lista sale vacía y el formulario se cae de vuelta al
  // comportamiento anterior (Profesión sin filtrar por área).
  const areasPorNivel = useMemo(() => {
    const mapa = {}
    for (const p of profesiones) {
      if (!p.areaEstudio) continue
      if (!mapa[p.nivel]) mapa[p.nivel] = new Set()
      mapa[p.nivel].add(p.areaEstudio)
    }
    const ordenado = {}
    for (const nivel of Object.keys(mapa)) {
      ordenado[nivel] = [...mapa[nivel]].sort((a, b) => a.localeCompare(b, 'es'))
    }
    return ordenado
  }, [profesiones])

  // Profesiones de un Nivel, filtradas además por Área de estudio cuando esa
  // Área existe para el Nivel elegido (si no hay Áreas capturadas para ese
  // Nivel, se regresan todas las del Nivel sin filtrar, para no bloquear el
  // formulario con datos viejos).
  const profesionesFiltradas = (nivel, areaEstudio) => {
    const delNivel = profesionesPorNivel[nivel] || []
    if (!areaEstudio || !(areasPorNivel[nivel] || []).length) return delNivel
    return delNivel.filter((p) => p.areaEstudio === areaEstudio)
  }

  // Id (como string, porque los <select> siempre entregan string) → Nombre,
  // para mostrar la profesión elegida en el resumen de "Revisar y confirmar"
  // sin tener que volver a consultar el catálogo.
  const profesionesPorId = useMemo(() => {
    const mapa = {}
    for (const p of profesiones) {
      mapa[String(p.id)] = p.nombre
    }
    return mapa
  }, [profesiones])

  const validarPaso = (indicePaso) => {
    if (indicePaso === 0) {
      if (!form.nombre || !form.apellidoPaterno || !form.fechaNacimiento || !form.rfc || !form.curp) {
        return 'Completa nombre, apellido paterno, fecha de nacimiento, RFC y CURP.'
      }

      const fechaNacimiento = new Date(form.fechaNacimiento)
      if (fechaNacimiento > new Date()) {
        return 'La fecha de nacimiento no puede ser futura.'
      }

      if (calcularEdad(form.fechaNacimiento) < EDAD_MINIMA_ANIOS) {
        return `Debes tener al menos ${EDAD_MINIMA_ANIOS} años registrados en el perfil.`
      }

      // RFC y CURP son obligatorios y deben tener la longitud exacta del
      // documento real (13 y 18 caracteres) — igual que valida
      // PerfilController.GuardarPerfil del lado del servidor.
      if (form.rfc.length !== RFC_LONGITUD) {
        return `El RFC debe tener ${RFC_LONGITUD} caracteres.`
      }

      if (form.curp.length !== CURP_LONGITUD) {
        return `El CURP debe tener ${CURP_LONGITUD} caracteres.`
      }
    }

    if (indicePaso === 1) {
      if (!form.telefono || !form.correo || !form.estado || !form.municipio) {
        return 'Completa teléfono, correo, estado y municipio.'
      }

      if (!REGEX_TELEFONO.test(form.telefono)) {
        return 'Ingresa un teléfono válido (10 a 12 dígitos).'
      }

      if (!REGEX_CORREO.test(form.correo)) {
        return 'Ingresa un correo electrónico válido.'
      }
    }

    if (indicePaso === 2) {
      for (const experiencia of form.experienciaLaboral) {
        // Misma razón que en Formación académica: el backend recibe
        // FechaInicio como DateTime no-nullable, así que dejarla vacía
        // rompe el guardado con un 400 genérico en vez de un mensaje claro.
        if (!experiencia.fechaInicio) {
          return `Ingresa la fecha de inicio de "${experiencia.empresa || experiencia.puesto || 'una experiencia laboral'}".`
        }

        if (
          !experiencia.trabajaActualmente &&
          experiencia.fechaInicio &&
          experiencia.fechaFin &&
          new Date(experiencia.fechaFin) < new Date(experiencia.fechaInicio)
        ) {
          return `La fecha de fin de "${experiencia.empresa || 'una experiencia laboral'}" no puede ser anterior a la fecha de inicio.`
        }
      }
    }

    if (indicePaso === 3) {
      for (const formacion of form.formacionAcademica) {
        if (!formacion.institucion || !formacion.nivelEstudios) {
          return 'Completa institución y nivel de estudios en cada formación académica.'
        }

        // La fecha de inicio es obligatoria: el backend la recibe como
        // DateTime no-nullable (FormacionAcademicaRequest.FechaInicio), así
        // que enviarla vacía no genera un mensaje de validación amigable
        // sino un 400 genérico de ASP.NET al fallar el model binding.
        if (!formacion.fechaInicio) {
          return `Ingresa la fecha de inicio de "${formacion.institucion || 'una formación académica'}".`
        }

        // La Profesión/carrera es obligatoria para toda formación académica
        // (incluidos niveles sin carrera específica como Secundaria o
        // Preparatoria: el catálogo trae un renglón genérico para esos
        // casos) porque es el criterio real de emparejamiento con vacantes
        // — ver PerfilController.GuardarPerfil.
        if (!formacion.profesionId) {
          return `Selecciona la profesión/nivel de "${formacion.institucion || 'una formación académica'}".`
        }

        if (
          !formacion.enCurso &&
          formacion.fechaInicio &&
          formacion.fechaFin &&
          new Date(formacion.fechaFin) < new Date(formacion.fechaInicio)
        ) {
          return `La fecha de fin de "${formacion.institucion || 'una formación académica'}" no puede ser anterior a la fecha de inicio.`
        }
      }
    }

    if (indicePaso === 4) {
      for (const cert of form.certificaciones) {
        if (!cert.nombre || !cert.institucion || !cert.fechaObtencion) {
          return 'Completa nombre, institución y fecha de obtención en cada certificación.'
        }

        if (new Date(cert.fechaObtencion) > new Date()) {
          return `La fecha de obtención de "${cert.nombre}" no puede ser futura.`
        }

        if (
          !cert.sinVencimiento &&
          cert.fechaVencimiento &&
          new Date(cert.fechaVencimiento) < new Date(cert.fechaObtencion)
        ) {
          return `La fecha de vencimiento de "${cert.nombre}" no puede ser anterior a la fecha de obtención.`
        }
      }
    }

    return null
  }

  const siguientePaso = () => {
    const error = validarPaso(paso)
    if (error) {
      setFeedback({ type: 'error', message: error })
      return
    }
    setFeedback({ type: '', message: '' })
    irAPaso(Math.min(paso + 1, PASOS.length - 1))
  }

  const pasoAnterior = () => {
    setFeedback({ type: '', message: '' })
    irAPaso(Math.max(paso - 1, 0))
  }

  const handleGuardar = async () => {
    setFeedback({ type: '', message: '' })
    setGuardando(true)

    try {
      const payload = {
        nombre: form.nombre,
        apellidoPaterno: form.apellidoPaterno,
        apellidoMaterno: form.apellidoMaterno || null,
        fechaNacimiento: form.fechaNacimiento,
        rfc: form.rfc || null,
        curp: form.curp || null,
        telefono: form.telefono,
        correo: form.correo,
        estado: form.estado,
        municipio: form.municipio,
        experienciaLaboral: form.experienciaLaboral.map((e) => ({
          empresa: e.empresa,
          puesto: e.puesto,
          fechaInicio: e.fechaInicio,
          fechaFin: e.trabajaActualmente ? null : e.fechaFin || null,
          descripcion: e.descripcion || null,
        })),
        formacionAcademica: form.formacionAcademica.map((f) => ({
          institucion: f.institucion,
          nivelEstudios: f.nivelEstudios,
          profesionId: Number(f.profesionId),
          fechaInicio: f.fechaInicio,
          fechaFin: f.enCurso ? null : f.fechaFin || null,
        })),
        habilidades: form.habilidades,
        certificaciones: form.certificaciones.map((c) => ({
          nombre: c.nombre,
          institucion: c.institucion,
          fechaObtencion: c.fechaObtencion,
          fechaVencimiento: c.sinVencimiento ? null : c.fechaVencimiento || null,
        })),
      }

      await axios.put('/api/perfil', payload)
      localStorage.removeItem(CLAVE_BORRADOR)
      onGuardado?.()
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Ocurrió un error al guardar el perfil.'
      setFeedback({ type: 'error', message: msg })
    } finally {
      setGuardando(false)
    }
  }

  const inputClase =
    'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20'

  const resumenExperiencia = useMemo(
    () => form.experienciaLaboral.map((e) => `${e.puesto || 'Puesto sin especificar'} en ${e.empresa || 'empresa sin especificar'}`),
    [form.experienciaLaboral]
  )

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm md:p-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--text)]">Completa tu perfil</h2>
        <p className="text-[var(--muted)]">Paso {paso + 1} de {PASOS.length}: {PASOS[paso]}</p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--surface)]">
          <div
            className="h-2 rounded-full bg-siatec-600 transition-all"
            style={{ width: `${((paso + 1) / PASOS.length) * 100}%` }}
          />
        </div>
      </div>

      {avisoBorrador && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-300">
          <span>Se restauró un borrador que habías dejado sin terminar.</span>
          <button type="button" onClick={descartarBorrador} className="font-semibold underline">
            Descartar borrador
          </button>
        </div>
      )}

      {feedback.message && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          {feedback.message}
        </div>
      )}

      {paso === 0 && (
        <div className="grid gap-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text)]">Nombre</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => actualizarForm({ nombre: soloLetras(e.target.value) })}
              placeholder="Ej. Juan"
              className={inputClase}
            />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text)]">Apellido paterno</label>
              <input
                type="text"
                value={form.apellidoPaterno}
                onChange={(e) => actualizarForm({ apellidoPaterno: soloLetras(e.target.value) })}
                placeholder="Ej. Pérez"
                className={inputClase}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text)]">Apellido materno (opcional)</label>
              <input
                type="text"
                value={form.apellidoMaterno}
                onChange={(e) => actualizarForm({ apellidoMaterno: soloLetras(e.target.value) })}
                placeholder="Ej. García"
                className={inputClase}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text)]">Fecha de nacimiento</label>
            <input
              type="date"
              value={form.fechaNacimiento}
              onChange={(e) => actualizarForm({ fechaNacimiento: e.target.value })}
              className={inputClase}
            />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text)]">RFC</label>
              <input
                type="text"
                value={form.rfc}
                maxLength={RFC_LONGITUD}
                onChange={(e) => actualizarForm({ rfc: soloAlfanumerico(e.target.value, RFC_LONGITUD) })}
                placeholder={`${RFC_LONGITUD} caracteres`}
                className={inputClase}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text)]">CURP</label>
              <input
                type="text"
                value={form.curp}
                maxLength={CURP_LONGITUD}
                onChange={(e) => actualizarForm({ curp: soloAlfanumerico(e.target.value, CURP_LONGITUD) })}
                placeholder={`${CURP_LONGITUD} caracteres`}
                className={inputClase}
              />
            </div>
          </div>
        </div>
      )}

      {paso === 1 && (
        <div className="grid gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text)]">Número de teléfono</label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={12}
                value={form.telefono}
                onChange={(e) => actualizarForm({ telefono: soloDigitos(e.target.value) })}
                placeholder="Ej. 3331234567"
                className={inputClase}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text)]">Correo electrónico</label>
              <input
                type="email"
                value={form.correo}
                onChange={(e) => actualizarForm({ correo: e.target.value })}
                placeholder="Ej. correo@ejemplo.com"
                className={inputClase}
              />
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text)]">Estado</label>
              <select
                value={form.estado}
                onChange={(e) => actualizarForm({ estado: e.target.value })}
                className={inputClase}
              >
                <option value="">Selecciona un estado</option>
                {ESTADOS_MEXICO.map((estado) => (
                  <option key={estado} value={estado}>{estado}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text)]">Municipio</label>
              <input
                type="text"
                value={form.municipio}
                onChange={(e) => actualizarForm({ municipio: soloLetras(e.target.value) })}
                placeholder="Ej. Zapopan"
                className={inputClase}
              />
            </div>
          </div>
        </div>
      )}

      {paso === 2 && (
        <div className="space-y-5">
          {form.experienciaLaboral.length === 0 && (
            <p className="text-sm text-[var(--muted)]">Todavía no agregas experiencia laboral. Es opcional, pero puedes agregar la que tengas.</p>
          )}
          {form.experienciaLaboral.map((exp, indice) => (
            <div key={indice} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text)]">Experiencia {indice + 1}</span>
                <button type="button" onClick={() => quitarExperiencia(indice)} className="text-xs font-semibold text-red-500 hover:underline">
                  Quitar
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={exp.empresa}
                  onChange={(e) => actualizarExperiencia(indice, { empresa: e.target.value })}
                  placeholder="Empresa"
                  className={inputClase}
                />
                <input
                  type="text"
                  value={exp.puesto}
                  onChange={(e) => actualizarExperiencia(indice, { puesto: e.target.value })}
                  placeholder="Puesto"
                  className={inputClase}
                />
                <div>
                  <label className="mb-1 block text-xs text-[var(--muted)]">
                    Fecha de inicio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={exp.fechaInicio}
                    onChange={(e) => actualizarExperiencia(indice, { fechaInicio: e.target.value })}
                    className={inputClase}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--muted)]">Fecha de fin</label>
                  <input
                    type="date"
                    value={exp.fechaFin}
                    disabled={exp.trabajaActualmente}
                    onChange={(e) => actualizarExperiencia(indice, { fechaFin: e.target.value })}
                    className={`${inputClase} disabled:cursor-not-allowed disabled:opacity-50`}
                  />
                </div>
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={exp.trabajaActualmente}
                  onChange={(e) => actualizarExperiencia(indice, { trabajaActualmente: e.target.checked, fechaFin: '' })}
                  className="h-4 w-4 rounded border-[var(--border)] text-siatec-600 focus:ring-siatec-500/40"
                />
                Trabajo aquí actualmente
              </label>
              <textarea
                value={exp.descripcion}
                onChange={(e) => actualizarExperiencia(indice, { descripcion: e.target.value })}
                placeholder="Descripción breve (opcional)"
                rows={2}
                className={`${inputClase} mt-3`}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={agregarExperiencia}
            className="w-full rounded-lg border border-dashed border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-siatec-600 transition hover:border-siatec-400"
          >
            + Agregar experiencia laboral
          </button>
        </div>
      )}

      {paso === 3 && (
        <div className="space-y-5">
          {form.formacionAcademica.length === 0 && (
            <p className="text-sm text-[var(--muted)]">Todavía no agregas formación académica.</p>
          )}
          {form.formacionAcademica.map((formacion, indice) => (
            <div key={indice} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text)]">Formación {indice + 1}</span>
                <button type="button" onClick={() => quitarFormacion(indice)} className="text-xs font-semibold text-red-500 hover:underline">
                  Quitar
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={formacion.institucion}
                  onChange={(e) => actualizarFormacion(indice, { institucion: e.target.value })}
                  placeholder="Institución"
                  className={inputClase}
                />
                <select
                  value={formacion.nivelEstudios}
                  onChange={(e) => actualizarFormacion(indice, { nivelEstudios: e.target.value, areaEstudio: '', profesionId: '' })}
                  className={inputClase}
                >
                  <option value="">Nivel de estudios</option>
                  {FORMACION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {(areasPorNivel[formacion.nivelEstudios] || []).length > 0 && (
                  <select
                    value={formacion.areaEstudio}
                    onChange={(e) => actualizarFormacion(indice, { areaEstudio: e.target.value, profesionId: '' })}
                    disabled={!formacion.nivelEstudios}
                    className={`${inputClase} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <option value="">Área de estudio (opcional, para filtrar)</option>
                    {areasPorNivel[formacion.nivelEstudios].map((area) => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                )}
                <select
                  value={formacion.profesionId}
                  onChange={(e) => actualizarFormacion(indice, { profesionId: e.target.value })}
                  disabled={!formacion.nivelEstudios}
                  className={`${inputClase} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <option value="">
                    {formacion.nivelEstudios ? 'Profesión / carrera' : 'Elige primero un nivel de estudios'}
                  </option>
                  {profesionesFiltradas(formacion.nivelEstudios, formacion.areaEstudio).map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                <div>
                  <label className="mb-1 block text-xs text-[var(--muted)]">
                    Fecha de inicio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formacion.fechaInicio}
                    onChange={(e) => actualizarFormacion(indice, { fechaInicio: e.target.value })}
                    className={inputClase}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--muted)]">Fecha de fin</label>
                  <input
                    type="date"
                    value={formacion.fechaFin}
                    disabled={formacion.enCurso}
                    onChange={(e) => actualizarFormacion(indice, { fechaFin: e.target.value })}
                    className={`${inputClase} disabled:cursor-not-allowed disabled:opacity-50`}
                  />
                </div>
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={formacion.enCurso}
                  onChange={(e) => actualizarFormacion(indice, { enCurso: e.target.checked, fechaFin: '' })}
                  className="h-4 w-4 rounded border-[var(--border)] text-siatec-600 focus:ring-siatec-500/40"
                />
                Sigo estudiando aquí
              </label>
            </div>
          ))}
          <button
            type="button"
            onClick={agregarFormacion}
            className="w-full rounded-lg border border-dashed border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-siatec-600 transition hover:border-siatec-400"
          >
            + Agregar formación académica
          </button>
        </div>
      )}

      {paso === 4 && (
        <div className="space-y-5">
          {form.certificaciones.length === 0 && (
            <p className="text-sm text-[var(--muted)]">Todavía no agregas certificaciones. Es opcional, pero puedes agregar las que tengas.</p>
          )}
          {form.certificaciones.map((cert, indice) => (
            <div key={indice} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text)]">Certificación {indice + 1}</span>
                <button type="button" onClick={() => quitarCertificacion(indice)} className="text-xs font-semibold text-red-500 hover:underline">
                  Quitar
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={cert.nombre}
                  onChange={(e) => actualizarCertificacion(indice, { nombre: e.target.value })}
                  placeholder="Nombre de la certificación"
                  className={inputClase}
                />
                <input
                  type="text"
                  value={cert.institucion}
                  onChange={(e) => actualizarCertificacion(indice, { institucion: e.target.value })}
                  placeholder="Institución que la emite"
                  className={inputClase}
                />
                <div>
                  <label className="mb-1 block text-xs text-[var(--muted)]">Fecha de obtención</label>
                  <input
                    type="date"
                    value={cert.fechaObtencion}
                    onChange={(e) => actualizarCertificacion(indice, { fechaObtencion: e.target.value })}
                    className={inputClase}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--muted)]">Fecha de vencimiento</label>
                  <input
                    type="date"
                    value={cert.fechaVencimiento}
                    disabled={cert.sinVencimiento}
                    onChange={(e) => actualizarCertificacion(indice, { fechaVencimiento: e.target.value })}
                    className={`${inputClase} disabled:cursor-not-allowed disabled:opacity-50`}
                  />
                </div>
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={cert.sinVencimiento}
                  onChange={(e) => actualizarCertificacion(indice, { sinVencimiento: e.target.checked, fechaVencimiento: '' })}
                  className="h-4 w-4 rounded border-[var(--border)] text-siatec-600 focus:ring-siatec-500/40"
                />
                No vence
              </label>
            </div>
          ))}
          <button
            type="button"
            onClick={agregarCertificacion}
            className="w-full rounded-lg border border-dashed border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-siatec-600 transition hover:border-siatec-400"
          >
            + Agregar certificación
          </button>
        </div>
      )}

      {paso === 5 && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={habilidadNueva}
              onChange={(e) => setHabilidadNueva(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  agregarHabilidad()
                }
              }}
              placeholder="Ej. Excel, atención a clientes, soldadura..."
              className={inputClase}
            />
            <button
              type="button"
              onClick={agregarHabilidad}
              className="rounded-lg bg-siatec-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-siatec-700"
            >
              Agregar
            </button>
          </div>

          {form.habilidades.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Agrega las habilidades que quieras destacar en tu perfil.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {form.habilidades.map((habilidad) => (
                <span
                  key={habilidad}
                  className="flex items-center gap-2 rounded-full bg-siatec-600/10 px-3 py-1.5 text-sm font-medium text-siatec-700 dark:text-siatec-300"
                >
                  {habilidad}
                  <button type="button" onClick={() => quitarHabilidad(habilidad)} className="text-siatec-600 hover:text-red-500">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {paso === 6 && (
        <div className="space-y-5 text-sm">
          <div>
            <h3 className="font-semibold text-[var(--text)]">Datos personales</h3>
            <p className="text-[var(--muted)]">
              {form.nombre} {form.apellidoPaterno} {form.apellidoMaterno} — nacimiento: {form.fechaNacimiento || 'sin especificar'}
            </p>
            <p className="text-[var(--muted)]">
              RFC: {form.rfc || 'sin especificar'} · CURP: {form.curp || 'sin especificar'}
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text)]">Contacto y residencia</h3>
            <p className="text-[var(--muted)]">{form.telefono} · {form.correo} · {form.municipio}, {form.estado}</p>
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text)]">Experiencia laboral</h3>
            {resumenExperiencia.length === 0 ? (
              <p className="text-[var(--muted)]">Sin experiencia registrada.</p>
            ) : (
              <ul className="list-inside list-disc text-[var(--muted)]">
                {resumenExperiencia.map((linea, i) => <li key={i}>{linea}</li>)}
              </ul>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text)]">Formación académica</h3>
            {form.formacionAcademica.length === 0 ? (
              <p className="text-[var(--muted)]">Sin formación registrada.</p>
            ) : (
              <ul className="list-inside list-disc text-[var(--muted)]">
                {form.formacionAcademica.map((f, i) => (
                  <li key={i}>
                    {f.nivelEstudios || 'Nivel sin especificar'}
                    {' — '}
                    {profesionesPorId[String(f.profesionId)] || 'profesión sin especificar'}
                    {' — '}
                    {f.institucion || 'institución sin especificar'}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text)]">Certificaciones</h3>
            {form.certificaciones.length === 0 ? (
              <p className="text-[var(--muted)]">Sin certificaciones registradas.</p>
            ) : (
              <ul className="list-inside list-disc text-[var(--muted)]">
                {form.certificaciones.map((c, i) => (
                  <li key={i}>{c.nombre || 'Certificación sin nombre'} — {c.institucion || 'institución sin especificar'}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text)]">Habilidades</h3>
            <p className="text-[var(--muted)]">{form.habilidades.length > 0 ? form.habilidades.join(', ') : 'Sin habilidades registradas.'}</p>
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between border-t border-[var(--border)] pt-6">
        <button
          type="button"
          onClick={pasoAnterior}
          disabled={paso === 0}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--text)] shadow-sm transition hover:border-siatec-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Atrás
        </button>

        {paso < PASOS.length - 1 ? (
          <button
            type="button"
            onClick={siguientePaso}
            className="rounded-lg bg-siatec-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-siatec-700"
          >
            Siguiente
          </button>
        ) : (
          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando}
            className="rounded-lg bg-siatec-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-siatec-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Confirmar y guardar'}
          </button>
        )}
      </div>
    </section>
  )
}

export default AsistentePerfil
