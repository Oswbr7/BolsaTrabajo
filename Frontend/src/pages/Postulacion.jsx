import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import axios from 'axios'
import { FORMACION_OPTIONS, ESTADOS_MEXICO } from '../constants/catalogos.js'
import { useSesion } from '../context/SesionContext.jsx'

const API_URL = '/api/postulaciones'

// Solo para el botón de desarrollo "Cargar 5 candidatos" (ver
// handleCargarCandidatosAleatorios más abajo): apunta directo al backend
// (mismo destino que el proxy "/api" de vite.config.js) en vez de la ruta
// relativa de arriba. Es a propósito — con la ruta relativa, el navegador ve
// la petición como del MISMO origen que esta página (localhost:5175), y en
// same-origin el navegador manda la cookie de sesión sin importar lo que diga
// "withCredentials" (esa bandera solo aplica a peticiones cross-origin). Al
// pegarle directo al puerto del backend, sí es cross-origin de verdad, y ahí
// "withCredentials: false" si evita que se mande la cookie.
const API_URL_BACKEND_DIRECTO_DEV = 'http://localhost:5053/api/postulaciones'

const NOMBRES_ALEATORIOS = ['Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Sofía', 'Miguel', 'Laura', 'Jorge', 'Fernanda']

const APELLIDOS_ALEATORIOS = ['García', 'Martínez', 'López', 'Hernández', 'González', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores']

const MUNICIPIOS_ALEATORIOS = ['Guadalajara', 'Zapopan', 'Monterrey', 'Puebla', 'Toluca', 'Mérida', 'Querétaro', 'León', 'Tijuana', 'Cancún']

// RFC (persona física) y CURP: códigos alfanuméricos de longitud fija.
// Mismo criterio que AsistentePerfil.jsx — se limpia todo lo que no sea
// letra/número, se fuerza a mayúsculas y se recorta al límite.
const RFC_LONGITUD = 13
const CURP_LONGITUD = 18
const soloAlfanumerico = (valor, limite) => valor.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, limite)

// Autocompletado (aspirantes con sesión iniciada): de entre las formaciones
// académicas del perfil, se toma la de mayor jerarquía según FORMACION_OPTIONS
// (el mismo catálogo que usa el asistente de perfil, ver constants/catalogos.js),
// junto con su Profesión — así ambos campos quedan precargados de forma
// coherente entre sí. Si ninguna coincide con el catálogo, no se autocompleta.
const derivarMejorFormacion = (formacionAcademica = []) => {
  let mejorIndice = -1
  let mejor = { nivel: '', profesionId: '' }
  formacionAcademica.forEach((formacion) => {
    const indice = FORMACION_OPTIONS.indexOf(formacion.nivelEstudios)
    if (indice !== -1 && indice > mejorIndice) {
      mejorIndice = indice
      mejor = {
        nivel: formacion.nivelEstudios,
        profesionId: formacion.profesionId != null ? String(formacion.profesionId) : '',
      }
    }
  })
  return mejor
}

function Postulacion() {
  const { usuario, cargando } = useSesion()
  const [perfilPrecargado, setPerfilPrecargado] = useState(false)
  const [documentosPrecargados, setDocumentosPrecargados] = useState([])
  const [yaTienePostulacion, setYaTienePostulacion] = useState(false)
  // Catálogo de áreas de interés, compartido con SIATEC (ver "Plan de Flujo -
  // Filtrado de Postulantes por Area en SIATEC.md"). Ya no es una lista fija
  // escrita aquí: se pide a GET /api/areas para que ambas plataformas
  // siempre usen exactamente el mismo catálogo.
  const [areas, setAreas] = useState([])
  // Catálogo de profesiones/carreras (ver ProfesionesController y
  // "Catalogo de Profesiones - Bolsa de Trabajo y SIATEC.md"): mismo
  // catálogo que usa AsistentePerfil.jsx para la formación académica del
  // perfil. Aquí se usa para que, según la "Máxima formación académica"
  // elegida, aparezca un segundo selector con las profesiones/carreras
  // concretas de ese nivel (incluye 3 renglones "genéricos" para
  // Secundaria/Preparatoria/Diplomado, así que siempre hay opciones).
  const [profesiones, setProfesiones] = useState([])
  const [form, setForm] = useState({
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    correo: '',
    confirmarCorreo: '',
    estado: '',
    municipio: '',
    telefono: '',
    rfc: '',
    curp: '',
    maximaFormacionAcademica: '',
    profesionId: '',
    areaId: '',
    expectativasSalariales: '',
    habilidadesClave: '',
  })
  const [cv, setCv] = useState(null)
  const [comprobante, setComprobante] = useState(null)
  const [carta, setCarta] = useState(null)
  const [ine, setIne] = useState(null)
  const [rfc, setRfc] = useState(null)
  const [actaNacimiento, setActaNacimiento] = useState(null)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [cargandoAleatorios, setCargandoAleatorios] = useState(false)
  // Área de estudio elegida (ej. "Ciencias Sociales y Administrativas"):
  // solo es un filtro para el <select> de "Profesión / carrera" — ayuda a
  // encontrarla más fácil entre las más de mil que trajo el catálogo de
  // carreras, en vez de una sola lista larga. No se manda al backend (el
  // formulario sigue mandando nada más profesionId y maximaFormacionAcademica,
  // igual que antes). Mismo filtro de tres niveles que ya usa SIATEC del
  // lado de Puestos: Nivel → Área de estudio → Especialidad/Profesión.
  const [areaEstudioFiltro, setAreaEstudioFiltro] = useState('')

  // Catálogo de áreas: se pide una sola vez al montar, sin depender de la
  // sesión (el formulario sigue siendo público). Si falla, el select queda
  // vacío y el aspirante no puede enviar el formulario hasta que se pueda
  // recargar la página — es preferible a dejarlo mandar un área inválida.
  useEffect(() => {
    let cancelado = false

    const cargarAreas = async () => {
      try {
        const response = await axios.get('/api/areas')
        if (!cancelado) {
          setAreas(response.data)
        }
      } catch (err) {
        // Sin catálogo no hay forma de mandar un área válida; el mensaje se
        // ve reflejado en el propio <select> (queda sin opciones).
      }
    }

    cargarAreas()

    return () => {
      cancelado = true
    }
  }, [])

  // Catálogo de profesiones: igual que areas, se pide una sola vez al
  // montar, sin depender de la sesión.
  useEffect(() => {
    let cancelado = false

    const cargarProfesiones = async () => {
      try {
        const response = await axios.get('/api/profesiones')
        if (!cancelado) {
          setProfesiones(response.data)
        }
      } catch (err) {
        // Sin catálogo, el select de Profesión queda sin opciones — el
        // aspirante no puede enviar el formulario hasta que se pueda
        // recargar la página, igual que con Área de interés.
      }
    }

    cargarProfesiones()

    return () => {
      cancelado = true
    }
  }, [])

  // Backfill del filtro de Área de estudio cuando el profesionId se
  // autocompletó solo (aspirante con sesión iniciada, ver el
  // "precargarDesdePerfil" de abajo, que fija profesionId directo sin pasar
  // por el <select> de Área): en cuanto llega el catálogo de profesiones, si
  // ya hay un profesionId elegido pero el filtro de área sigue vacío, se
  // rellena buscando a qué Área pertenece — así el <select> de Área de
  // estudio no se queda vacío y "Profesión / carrera" se sigue viendo con la
  // opción ya elegida marcada.
  useEffect(() => {
    if (!form.profesionId || areaEstudioFiltro || profesiones.length === 0) return
    const encontrada = profesiones.find((p) => String(p.id) === String(form.profesionId))
    if (encontrada?.areaEstudio) {
      setAreaEstudioFiltro(encontrada.areaEstudio)
    }
  }, [profesiones, form.profesionId])

  // Autocompletado para aspirantes con sesión iniciada: el formulario sigue
  // siendo el mismo para todos (sin sesión se comporta exactamente igual que
  // antes). Si hay sesión, se pide el perfil (CU-03) y se precargan los
  // campos de texto que tengan equivalente ahí; los campos autocompletados
  // quedan editables como cualquier otro y no se guarda nada de vuelta en el
  // perfil — es una copia independiente al momento de postular.
  useEffect(() => {
    if (cargando || !usuario) return

    let cancelado = false

    const precargarDesdePerfil = async () => {
      try {
        const response = await axios.get('/api/perfil')
        if (cancelado || !response.data.existe) return

        const perfil = response.data
        const mejorFormacion = derivarMejorFormacion(perfil.formacionAcademica)
        setForm((formActual) => ({
          ...formActual,
          nombre: formActual.nombre || perfil.nombre || '',
          apellidoPaterno: formActual.apellidoPaterno || perfil.apellidoPaterno || '',
          apellidoMaterno: formActual.apellidoMaterno || perfil.apellidoMaterno || '',
          correo: formActual.correo || perfil.correo || '',
          confirmarCorreo: formActual.confirmarCorreo || perfil.correo || '',
          telefono: formActual.telefono || perfil.telefono || '',
          rfc: formActual.rfc || perfil.rfc || '',
          curp: formActual.curp || perfil.curp || '',
          estado: formActual.estado || perfil.estado || '',
          municipio: formActual.municipio || perfil.municipio || '',
          maximaFormacionAcademica: formActual.maximaFormacionAcademica || mejorFormacion.nivel || '',
          profesionId: formActual.profesionId || mejorFormacion.profesionId || '',
          habilidadesClave: formActual.habilidadesClave || (perfil.habilidades || []).join(', '),
        }))
        setPerfilPrecargado(true)
      } catch (err) {
        // Si falla la precarga, el formulario se comporta como si no hubiera
        // sesión: el aspirante llena todo a mano, igual que siempre.
      }
    }

    precargarDesdePerfil()

    return () => {
      cancelado = true
    }
  }, [cargando, usuario])

  // Autocompletado de documentos (CU-04, sección "Documentos" del panel):
  // si la cuenta ya tiene un PDF vigente para INE, RFC, acta de nacimiento o
  // comprobante de estudios, se reutiliza aquí en automático — mismo
  // espíritu que el autocompletado de texto de arriba. El CV no tiene
  // equivalente en Documentos (ese catálogo no incluye ningún tipo "Cv"), así
  // que siempre se sube manual. Solo se reutilizan los que ya son PDF:
  // Documentos también acepta JPG/PNG, pero Postulación solo acepta PDF.
  // Cada campo queda editable después: subir un archivo distinto reemplaza
  // el precargado sin tocar lo que haya guardado en Documentos.
  useEffect(() => {
    if (cargando || !usuario) return

    let cancelado = false

    const ETIQUETAS_DOCUMENTO = {
      Ine: 'INE',
      Rfc: 'RFC',
      ActaNacimiento: 'Acta de nacimiento',
      ComprobanteEstudios: 'Comprobante de estudios',
    }

    const precargarDocumentos = async () => {
      try {
        const response = await axios.get('/api/documentos')
        if (cancelado) return

        const SETTERS_POR_TIPO = {
          Ine: setIne,
          Rfc: setRfc,
          ActaNacimiento: setActaNacimiento,
          ComprobanteEstudios: setComprobante,
        }

        const precargados = []

        for (const documento of response.data) {
          const setter = SETTERS_POR_TIPO[documento.tipoDocumento]
          if (!setter || !documento.id || documento.contentType !== 'application/pdf') {
            continue
          }

          try {
            const archivoResponse = await axios.get(`/api/documentos/${documento.id}/archivo`, {
              responseType: 'blob',
            })
            if (cancelado) return

            const archivo = new File(
              [archivoResponse.data],
              documento.nombreArchivo || 'documento.pdf',
              { type: 'application/pdf' }
            )
            // Actualización funcional: si el aspirante ya había elegido un
            // archivo a mano justo antes de que esto terminara de cargar, no
            // se le pisa esa selección.
            setter((actual) => actual || archivo)
            precargados.push(ETIQUETAS_DOCUMENTO[documento.tipoDocumento])
          } catch (err) {
            // Si un documento en particular falla al traerse, no se bloquea
            // el resto: ese campo se queda para subirse manual, como siempre.
          }
        }

        if (!cancelado && precargados.length > 0) {
          setDocumentosPrecargados(precargados)
        }
      } catch (err) {
        // Sin acceso a Documentos, el formulario se comporta como siempre:
        // cada archivo se sube manual.
      }
    }

    precargarDocumentos()

    return () => {
      cancelado = true
    }
  }, [cargando, usuario])

  // Una cuenta solo puede tener una postulación registrada. Si hay sesión,
  // se pregunta al backend (GET /api/postulaciones/mia) si ya existe una;
  // de ser así, el botón de envío se deshabilita y se muestra la leyenda
  // correspondiente arriba del formulario. Sin sesión, esto no aplica (no
  // hay forma de saber si "ya postuló" sin una cuenta que lo identifique).
  useEffect(() => {
    if (cargando || !usuario) {
      setYaTienePostulacion(false)
      return
    }

    let cancelado = false

    const verificarPostulacionExistente = async () => {
      try {
        const response = await axios.get(`${API_URL}/mia`)
        if (!cancelado) {
          setYaTienePostulacion(Boolean(response.data.existe))
        }
      } catch (err) {
        // Si falla la verificación, no se bloquea el formulario por un error
        // de red: el backend igual rechaza un duplicado al enviar.
      }
    }

    verificarPostulacionExistente()

    return () => {
      cancelado = true
    }
  }, [cargando, usuario])

  // La postulación ahora requiere cuenta con sesión iniciada: sin eso, se
  // manda directo a "Iniciar sesión" en vez de mostrar el formulario. Va
  // después de todos los hooks de arriba (nunca antes) para no romper las
  // reglas de hooks de React.
  if (cargando) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center shadow-sm md:p-10">
        <p className="text-[var(--muted)]">Cargando…</p>
      </section>
    )
  }

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSalaryChange = (e) => {
    const onlyDigits = e.target.value.replace(/\D/g, '')
    setForm({ ...form, [e.target.name]: onlyDigits })
  }

  const handleLettersOnlyChange = (e) => {
    const onlyLetters = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '')
    setForm({ ...form, [e.target.name]: onlyLetters })
  }

  const handlePhoneChange = (e) => {
    const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 12)
    setForm({ ...form, [e.target.name]: onlyDigits })
  }

  const handleRfcChange = (e) => {
    setForm({ ...form, rfc: soloAlfanumerico(e.target.value, RFC_LONGITUD) })
  }

  const handleCurpChange = (e) => {
    setForm({ ...form, curp: soloAlfanumerico(e.target.value, CURP_LONGITUD) })
  }

  // Al cambiar la Máxima formación académica, se limpia la Profesión elegida
  // (si la había) y el filtro de Área de estudio: las opciones de esos
  // selectores dependen del nivel, así que una profesión o área de un nivel
  // distinto ya no sería válida.
  const handleNivelChange = (e) => {
    setForm({ ...form, maximaFormacionAcademica: e.target.value, profesionId: '' })
    setAreaEstudioFiltro('')
  }

  // Al cambiar el Área de estudio, se limpia la Profesión elegida (si la
  // había): las opciones de ese selector también dependen del área.
  const handleAreaEstudioChange = (e) => {
    setAreaEstudioFiltro(e.target.value)
    setForm({ ...form, profesionId: '' })
  }

  // Profesiones agrupadas por Nivel de estudios, para que el selector de
  // "Profesión / carrera" solo muestre las del nivel ya elegido en
  // "Máxima formación académica" (mismo patrón que AsistentePerfil.jsx).
  const profesionesPorNivel = {}
  for (const p of profesiones) {
    if (!profesionesPorNivel[p.nivel]) profesionesPorNivel[p.nivel] = []
    profesionesPorNivel[p.nivel].push(p)
  }

  // Áreas de estudio disponibles para el Nivel ya elegido (ver el mismo
  // comentario en AsistentePerfil.jsx) — filtro intermedio opcional para
  // encontrar la profesión más fácil entre las más de mil del catálogo.
  const areasDelNivel = [
    ...new Set(
      (profesionesPorNivel[form.maximaFormacionAcademica] || [])
        .map((p) => p.areaEstudio)
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, 'es'))

  // Profesiones a mostrar en el selector final: del Nivel elegido, y además
  // filtradas por Área de estudio cuando ese Nivel sí tiene áreas capturadas
  // y el aspirante ya eligió una (si el catálogo no trae áreas para ese
  // nivel, no se bloquea el formulario — se muestran todas las del nivel,
  // igual que antes de este cambio).
  const profesionesAMostrar = areaEstudioFiltro
    ? (profesionesPorNivel[form.maximaFormacionAcademica] || []).filter((p) => p.areaEstudio === areaEstudioFiltro)
    : (profesionesPorNivel[form.maximaFormacionAcademica] || [])

  // --- Utilidades solo para desarrollo: generar candidatos de prueba ---

  const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)]

  const sinAcentos = (texto) =>
    texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  const generarPdfFalso = (nombreArchivo) => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]) // %PDF-1.4
    return new File([bytes], nombreArchivo, { type: 'application/pdf' })
  }

  const generarFormDataAleatorio = () => {
    const nombre = pickRandom(NOMBRES_ALEATORIOS)
    const apellidoPaterno = pickRandom(APELLIDOS_ALEATORIOS)
    const apellidoMaterno = pickRandom(APELLIDOS_ALEATORIOS)
    const sufijo = Math.floor(Math.random() * 100000)
    const correo = `${sinAcentos(nombre)}.${sinAcentos(apellidoPaterno)}${sufijo}@ejemplo.com`.toLowerCase()
    const telefono = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('')
    const expectativasSalariales = String(Math.floor(Math.random() * 30000) + 8000)

    // Nivel y Profesión deben corresponder (el backend lo valida), así que
    // se elige un nivel de entre los que sí tienen profesiones cargadas y
    // luego una profesión concreta de ese mismo nivel.
    const nivelesConProfesion = Object.keys(profesionesPorNivel)
    const nivelElegido = pickRandom(nivelesConProfesion)
    const profesionElegida = pickRandom(profesionesPorNivel[nivelElegido])

    const data = new FormData()
    data.append('nombre', nombre)
    data.append('apellidoPaterno', apellidoPaterno)
    data.append('apellidoMaterno', apellidoMaterno)
    data.append('correo', correo)
    data.append('estado', pickRandom(ESTADOS_MEXICO))
    data.append('municipio', pickRandom(MUNICIPIOS_ALEATORIOS))
    data.append('telefono', telefono)
    data.append('rfcTexto', soloAlfanumerico(`${sinAcentos(apellidoPaterno)}${sufijo}AAAAAAAAA`, RFC_LONGITUD))
    data.append('curpTexto', soloAlfanumerico(`${sinAcentos(apellidoPaterno)}${sufijo}AAAAAAAAAAAAAA`, CURP_LONGITUD))
    data.append('maximaFormacionAcademica', nivelElegido)
    data.append('profesionId', String(profesionElegida.id))
    data.append('areaId', String(pickRandom(areas).id))
    data.append('expectativasSalariales', expectativasSalariales)
    data.append('cv', generarPdfFalso('cv-prueba.pdf'))
    data.append('ultimoComprobanteEstudios', generarPdfFalso('comprobante-prueba.pdf'))
    data.append('ine', generarPdfFalso('ine-prueba.pdf'))
    data.append('rfc', generarPdfFalso('rfc-prueba.pdf'))
    data.append('actaNacimiento', generarPdfFalso('acta-nacimiento-prueba.pdf'))
    data.append('habilidadesClave', 'Trabajo en equipo, atención al detalle, manejo de Excel')
    // Carta de presentación: sigue siendo opcional en el formulario real, así
    // que aquí también se manda solo la mitad de las veces, para ejercitar
    // ambos casos (con y sin carta) en las mismas 5 pruebas.
    if (Math.random() < 0.5) {
      data.append('cartaPresentacion', generarPdfFalso('carta-presentacion-prueba.pdf'))
    }

    return data
  }

  const handleCargarCandidatosAleatorios = async () => {
    if (areas.length === 0 || profesiones.length === 0) {
      setFeedback({ type: 'error', message: 'Todavía no se cargó el catálogo de áreas/profesiones; espera un momento y vuelve a intentar.' })
      return
    }

    setCargandoAleatorios(true)
    setFeedback({ type: '', message: '' })

    let exitosos = 0
    let fallidos = 0

    for (let i = 0; i < 5; i++) {
      const datos = generarFormDataAleatorio()
      try {
        // API_URL_BACKEND_DIRECTO_DEV + withCredentials: false a propósito
        // (ver el comentario junto a esa constante, arriba del componente):
        // el backend atribuye toda postulación nueva a la cookie de sesión
        // que reciba y solo permite una por cuenta (PostulacionesController
        // .Registrar). Si estas 5 postulaciones de prueba mandaran la cookie,
        // todas se atribuirían a la cuenta con la que entraste y fallarían
        // con 409 después de la primera (o de entrada, si esa cuenta ya
        // tiene una). Sin la cookie, el backend las trata como anónimas —
        // igual que un postulante real sin cuenta — y las 5 se registran
        // como candidatos independientes entre sí.
        await axios.post(API_URL_BACKEND_DIRECTO_DEV, datos, {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: false,
        })
        exitosos++
      } catch (err) {
        fallidos++
        // Log detallado solo para diagnóstico de esta herramienta de
        // desarrollo: sin esto, cuando un candidato falla no hay forma de
        // saber cuál de los 5 fue ni con qué datos exactos se mandó (el
        // Network tab del navegador acumula peticiones de corridas
        // anteriores y no es obvio cuál es la que realmente falló). Se
        // imprime el candidato (1-5), los campos que más importan para este
        // tipo de error (profesionId/maximaFormacionAcademica/areaId) y la
        // respuesta completa que mandó el backend.
        console.error(
          `[Cargar candidatos] Candidato ${i + 1} de 5 falló — ` +
          `profesionId: ${datos.get('profesionId')}, ` +
          `maximaFormacionAcademica: ${datos.get('maximaFormacionAcademica')}, ` +
          `areaId: ${datos.get('areaId')}`,
          err.response?.data ?? err.message,
        )
      }
    }

    setFeedback({
      type: fallidos === 0 ? 'success' : 'error',
      message: fallidos === 0
        ? `Se generaron ${exitosos} candidatos aleatorios de prueba.`
        : `Se generaron ${exitosos} de 5 candidatos aleatorios. ${fallidos} fallaron.`,
    })
    setCargandoAleatorios(false)
  }

  const validatePdf = (file) => {
    return file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
  }

  const handleFileChange = (setter, required = false) => (e) => {
    const file = e.target.files[0]
    if (!file) {
      setter(null)
      return
    }
    if (!validatePdf(file)) {
      setFeedback({ type: 'error', message: 'Solo se permiten archivos PDF.' })
      setter(null)
      e.target.value = ''
      return
    }
    setter(file)
    setFeedback({ type: '', message: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (yaTienePostulacion) {
      setFeedback({ type: 'error', message: 'Ya tienes una postulación registrada con esta cuenta.' })
      return
    }

    if (
      !form.nombre ||
      !form.apellidoPaterno ||
      !form.apellidoMaterno ||
      !form.correo ||
      !form.confirmarCorreo ||
      !form.estado ||
      !form.municipio ||
      !form.telefono ||
      !form.rfc ||
      !form.curp ||
      !form.maximaFormacionAcademica ||
      !form.profesionId ||
      !form.areaId ||
      !form.expectativasSalariales ||
      !cv ||
      !comprobante ||
      !ine ||
      !rfc ||
      !actaNacimiento
    ) {
      setFeedback({ type: 'error', message: 'Completa todos los campos obligatorios y adjunta los PDF requeridos.' })
      return
    }

    if (form.correo !== form.confirmarCorreo) {
      setFeedback({ type: 'error', message: 'El correo electrónico y su confirmación no coinciden.' })
      return
    }

    // RFC y CURP son obligatorios y deben tener la longitud exacta del
    // documento real — mismo criterio que AsistentePerfil.jsx.
    if (form.rfc.length !== RFC_LONGITUD) {
      setFeedback({ type: 'error', message: `El RFC debe tener ${RFC_LONGITUD} caracteres.` })
      return
    }

    if (form.curp.length !== CURP_LONGITUD) {
      setFeedback({ type: 'error', message: `El CURP debe tener ${CURP_LONGITUD} caracteres.` })
      return
    }

    const data = new FormData()
    data.append('nombre', form.nombre)
    data.append('apellidoPaterno', form.apellidoPaterno)
    data.append('apellidoMaterno', form.apellidoMaterno)
    data.append('correo', form.correo)
    data.append('estado', form.estado)
    data.append('municipio', form.municipio)
    data.append('telefono', form.telefono)
    // Nombres distintos a "rfc" en el FormData porque esa clave ya la usa el
    // archivo PDF del RFC (ver <FileField id="rfc">, más abajo) — el backend
    // los recibe como parámetros separados (rfcTexto/curpTexto) precisamente
    // para no chocar con los IFormFile del mismo nombre.
    data.append('rfcTexto', form.rfc)
    data.append('curpTexto', form.curp)
    data.append('maximaFormacionAcademica', form.maximaFormacionAcademica)
    data.append('profesionId', form.profesionId)
    data.append('areaId', form.areaId)
    data.append('expectativasSalariales', form.expectativasSalariales)
    data.append('cv', cv)
    data.append('ultimoComprobanteEstudios', comprobante)
    data.append('ine', ine)
    data.append('rfc', rfc)
    data.append('actaNacimiento', actaNacimiento)
    if (carta) {
      data.append('cartaPresentacion', carta)
    }
    if (form.habilidadesClave) {
      data.append('habilidadesClave', form.habilidadesClave)
    }

    setLoading(true)
    setFeedback({ type: '', message: '' })

    try {
      await axios.post(API_URL, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setFeedback({ type: 'success', message: '¡Registro enviado correctamente!' })
      setForm({
        nombre: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        correo: '',
        confirmarCorreo: '',
        estado: '',
        municipio: '',
        telefono: '',
        rfc: '',
        curp: '',
        maximaFormacionAcademica: '',
        profesionId: '',
        areaId: '',
        expectativasSalariales: '',
        habilidadesClave: '',
      })
      setCv(null)
      setComprobante(null)
      setCarta(null)
      setIne(null)
      setRfc(null)
      setActaNacimiento(null)
      setPerfilPrecargado(false)
      setDocumentosPrecargados([])
      e.target.reset()
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Ocurrió un error al enviar el registro.'
      setFeedback({ type: 'error', message: msg })
    } finally {
      setLoading(false)
    }
  }

  const FileField = ({ id, label, required, file, onChange, colorClass }) => (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-[var(--text)]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-6 shadow-sm transition hover:border-siatec-500 hover:bg-siatec-50 dark:hover:bg-transparent">
        <input
          id={id}
          name={id}
          type="file"
          accept=".pdf,application/pdf"
          onChange={onChange}
          className={`text-sm text-[var(--text)] file:mr-4 file:rounded-md file:border-0 ${colorClass} file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white`}
        />
      </div>
      {file && <p className="mt-2 text-xs text-[var(--muted)]">Archivo seleccionado: {file.name}</p>}
    </div>
  )

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-siatec-600 to-slate-700 px-6 py-12 text-white shadow-lg md:px-12 md:py-16">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-slate-200">Bienvenido a</p>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl">SIATEC</h1>
          <p className="text-lg leading-relaxed text-slate-100">
            Plataforma de registro para oportunidades laborales. Completa tus datos, selecciona tu área de interés y adjunta tu CV y comprobante de estudios.
          </p>
        </div>
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-slate-900/10 blur-3xl" />
      </section>

      {/* Formulario */}
      <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm md:p-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[var(--text)]">Registro de postulante</h2>
          <p className="text-[var(--muted)]">Ingresa tu información y sube los archivos en formato PDF. INE, RFC, acta de nacimiento, CV y comprobante de estudios son obligatorios; las habilidades clave son opcionales.</p>
        </div>

        {yaTienePostulacion && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            Ya tienes una postulación registrada con esta cuenta. No es posible enviar otra.
          </div>
        )}

        {perfilPrecargado && (
          <div className="mb-6 rounded-lg border border-siatec-200 bg-siatec-50 px-4 py-3 text-sm text-siatec-700 dark:border-siatec-800 dark:bg-siatec-900/30 dark:text-siatec-300">
            Precargamos algunos campos con la información de tu perfil. Puedes editarlos libremente antes de enviar; los cambios que hagas aquí no modifican tu perfil.
          </div>
        )}

        {documentosPrecargados.length > 0 && (
          <div className="mb-6 rounded-lg border border-siatec-200 bg-siatec-50 px-4 py-3 text-sm text-siatec-700 dark:border-siatec-800 dark:bg-siatec-900/30 dark:text-siatec-300">
            También reutilizamos estos documentos ya guardados en tu perfil: {documentosPrecargados.join(', ')}. Si quieres usar otro archivo, solo súbelo y reemplaza al precargado.
          </div>
        )}

        {feedback.message && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="nombre" className="mb-1 block text-sm font-medium text-[var(--text)]">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                value={form.nombre}
                onChange={handleLettersOnlyChange}
                placeholder="Ej. Juan"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
              />
            </div>

            <div>
              <label htmlFor="apellidoPaterno" className="mb-1 block text-sm font-medium text-[var(--text)]">
                Apellido paterno <span className="text-red-500">*</span>
              </label>
              <input
                id="apellidoPaterno"
                name="apellidoPaterno"
                type="text"
                value={form.apellidoPaterno}
                onChange={handleLettersOnlyChange}
                placeholder="Ej. Pérez"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
              />
            </div>

            <div>
              <label htmlFor="apellidoMaterno" className="mb-1 block text-sm font-medium text-[var(--text)]">Apellido materno</label>
              <input
                id="apellidoMaterno"
                name="apellidoMaterno"
                type="text"
                value={form.apellidoMaterno}
                onChange={handleLettersOnlyChange}
                placeholder="Ej. García"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
              />
            </div>
          </div>

          <div className="grid gap-5 border-t border-[var(--border)] pt-6 md:grid-cols-2">
            <div>
              <label htmlFor="estado" className="mb-1 block text-sm font-medium text-[var(--text)]">
                Estado <span className="text-red-500">*</span>
              </label>
              <select
                id="estado"
                name="estado"
                value={form.estado}
                onChange={handleChange}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
              >
                <option value="">Selecciona un estado</option>
                {ESTADOS_MEXICO.map((estado) => (
                  <option key={estado} value={estado}>{estado}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="municipio" className="mb-1 block text-sm font-medium text-[var(--text)]">Municipio</label>
              <input
                id="municipio"
                name="municipio"
                type="text"
                autoComplete="off"
                value={form.municipio}
                onChange={handleLettersOnlyChange}
                placeholder="Ej. Zapopan"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
              />
            </div>
          </div>

          <div className="grid gap-5 border-t border-[var(--border)] pt-6 md:grid-cols-2">
            <div>
              <label htmlFor="telefono" className="mb-1 block text-sm font-medium text-[var(--text)]">
                Número de teléfono <span className="text-red-500">*</span>
              </label>
              <input
                id="telefono"
                name="telefono"
                type="tel"
                inputMode="numeric"
                maxLength={12}
                autoComplete="off"
                value={form.telefono}
                onChange={handlePhoneChange}
                placeholder="Ej. 3331234567"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
              />
            </div>

            <div>
              <label htmlFor="rfcTexto" className="mb-1 block text-sm font-medium text-[var(--text)]">
                RFC <span className="text-red-500">*</span>
              </label>
              <input
                id="rfcTexto"
                name="rfcTexto"
                type="text"
                maxLength={RFC_LONGITUD}
                autoComplete="off"
                value={form.rfc}
                onChange={handleRfcChange}
                placeholder={`${RFC_LONGITUD} caracteres`}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
              />
            </div>

            <div>
              <label htmlFor="curpTexto" className="mb-1 block text-sm font-medium text-[var(--text)]">
                CURP <span className="text-red-500">*</span>
              </label>
              <input
                id="curpTexto"
                name="curpTexto"
                type="text"
                maxLength={CURP_LONGITUD}
                autoComplete="off"
                value={form.curp}
                onChange={handleCurpChange}
                placeholder={`${CURP_LONGITUD} caracteres`}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
              />
            </div>
          </div>

          <div className="grid gap-5 border-t border-[var(--border)] pt-6 md:grid-cols-2">
            <div>
              <label htmlFor="correo" className="mb-1 block text-sm font-medium text-[var(--text)]">
                Correo electrónico <span className="text-red-500">*</span>
              </label>
              <input
                id="correo"
                name="correo"
                type="email"
                value={form.correo}
                onChange={handleChange}
                placeholder="Ej. correo@ejemplo.com"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
              />
            </div>

            <div>
              <label htmlFor="confirmarCorreo" className="mb-1 block text-sm font-medium text-[var(--text)]">Confirmar correo electrónico</label>
              <input
                id="confirmarCorreo"
                name="confirmarCorreo"
                type="email"
                autoComplete="off"
                value={form.confirmarCorreo}
                onChange={handleChange}
                placeholder="Repite tu correo electrónico"
                className={`w-full rounded-lg border bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:ring-2 ${
                  form.confirmarCorreo && form.confirmarCorreo !== form.correo
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-[var(--border)] focus:border-siatec-500 focus:ring-siatec-500/20'
                }`}
              />
              {form.confirmarCorreo && form.confirmarCorreo !== form.correo && (
                <p className="mt-1 text-xs text-red-500">Los correos electrónicos no coinciden.</p>
              )}
            </div>
          </div>

          <div className="grid gap-5 border-t border-[var(--border)] pt-6 md:grid-cols-2">
            <div>
              <label htmlFor="maximaFormacionAcademica" className="mb-1 block text-sm font-medium text-[var(--text)]">
                Máxima formación académica <span className="text-red-500">*</span>
              </label>
              <select
                id="maximaFormacionAcademica"
                name="maximaFormacionAcademica"
                value={form.maximaFormacionAcademica}
                onChange={handleNivelChange}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
              >
                <option value="">Selecciona una opción</option>
                {FORMACION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="areaId" className="mb-1 block text-sm font-medium text-[var(--text)]">
                Área de interés <span className="text-red-500">*</span>
              </label>
              <select
                id="areaId"
                name="areaId"
                value={form.areaId}
                onChange={handleChange}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
              >
                <option value="">{areas.length === 0 ? 'Cargando áreas...' : 'Selecciona un área'}</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>{area.nombre}</option>
                ))}
              </select>
            </div>

            {form.maximaFormacionAcademica && areasDelNivel.length > 0 && (
              <div>
                <label htmlFor="areaEstudioFiltro" className="mb-1 block text-sm font-medium text-[var(--text)]">
                  Área de estudio
                </label>
                <select
                  id="areaEstudioFiltro"
                  name="areaEstudioFiltro"
                  value={areaEstudioFiltro}
                  onChange={handleAreaEstudioChange}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
                >
                  <option value="">Todas (para buscar más fácil tu profesión)</option>
                  {areasDelNivel.map((area) => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>
            )}

            {form.maximaFormacionAcademica && (
              <div className="md:col-span-2">
                <label htmlFor="profesionId" className="mb-1 block text-sm font-medium text-[var(--text)]">
                  Profesión / carrera <span className="text-red-500">*</span>
                </label>
                <select
                  id="profesionId"
                  name="profesionId"
                  value={form.profesionId}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
                >
                  <option value="">
                    {profesiones.length === 0 ? 'Cargando profesiones...' : 'Selecciona tu profesión/carrera'}
                  </option>
                  {profesionesAMostrar.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="md:col-span-2">
              <label htmlFor="expectativasSalariales" className="mb-1 block text-sm font-medium text-[var(--text)]">
                Expectativas Salariales <span className="text-red-500">*</span>
              </label>
              <input
                id="expectativasSalariales"
                name="expectativasSalariales"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={form.expectativasSalariales}
                onChange={handleSalaryChange}
                placeholder="Ej. 15000"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="habilidadesClave" className="mb-1 block text-sm font-medium text-[var(--text)]">Habilidades clave</label>
              <textarea
                id="habilidadesClave"
                name="habilidadesClave"
                rows={3}
                value={form.habilidadesClave}
                onChange={handleChange}
                placeholder="Ej. Trabajo en equipo, atención al detalle, manejo de Excel"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm outline-none transition focus:border-siatec-500 focus:ring-2 focus:ring-siatec-500/20"
              />
            </div>
          </div>

          <div className="grid gap-5 border-t border-[var(--border)] pt-6 md:grid-cols-2">
            <FileField
              id="ine"
              label="INE en PDF"
              required
              file={ine}
              onChange={handleFileChange(setIne, true)}
              colorClass="file:bg-siatec-600 hover:file:bg-siatec-700"
            />

            <FileField
              id="rfc"
              label="RFC en PDF"
              required
              file={rfc}
              onChange={handleFileChange(setRfc, true)}
              colorClass="file:bg-siatec-600 hover:file:bg-siatec-700"
            />

            <FileField
              id="actaNacimiento"
              label="Acta de nacimiento en PDF"
              required
              file={actaNacimiento}
              onChange={handleFileChange(setActaNacimiento, true)}
              colorClass="file:bg-siatec-600 hover:file:bg-siatec-700"
            />
          </div>

          <div className="grid gap-5 border-t border-[var(--border)] pt-6 md:grid-cols-2">
            <FileField
              id="cv"
              label="CV en PDF"
              required
              file={cv}
              onChange={handleFileChange(setCv, true)}
              colorClass="file:bg-siatec-600 hover:file:bg-siatec-700"
            />

            <FileField
              id="ultimoComprobanteEstudios"
              label="Comprobante de estudios en PDF"
              required
              file={comprobante}
              onChange={handleFileChange(setComprobante, true)}
              colorClass="file:bg-siatec-600 hover:file:bg-siatec-700"
            />
          </div>

          <button
            type="submit"
            disabled={loading || yaTienePostulacion}
            className="w-full rounded-lg bg-siatec-600 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-siatec-700 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
          >
            {loading ? 'Enviando...' : 'Enviar registro'}
          </button>
        </form>

        {import.meta.env.DEV && (
          <div className="mt-6 border-t border-dashed border-amber-400 pt-6">
            <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">
              Herramienta solo para desarrollo — no aparece en producción. Genera postulantes anónimos (no usa tu sesión iniciada), aunque esta página solo se vea estando dentro de una cuenta.
            </p>
            <button
              type="button"
              onClick={handleCargarCandidatosAleatorios}
              disabled={cargandoAleatorios}
              className="w-full rounded-lg border border-dashed border-amber-400 bg-amber-50 px-6 py-3 text-base font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30 md:w-auto"
            >
              {cargandoAleatorios ? 'Generando...' : 'Cargar 5 candidatos'}
            </button>
          </div>
        )}
      </section>
    </>
  )
}

export default Postulacion
