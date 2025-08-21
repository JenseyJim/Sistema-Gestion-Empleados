// ===================== Estado Global =====================
let empleados = []
let solicitudesVacaciones = []
let usuarioActual = null
let paginaActual = "dashboard"

const configuracion = {
  empresaNombre: "HRPro Empresa Demo S.A.",
  moneda: "RD$",
  afp: 2.87,
  ars: 3.04,
  isr: 10,
}

const STORAGE_KEYS = {
  empleados: "hrpro_empleados",
  solicitudes: "hrpro_solicitudes_vacaciones",
  config: "hrpro_configuracion",
  dataLoaded: "hrpro_data_loaded",
}

// ===================== Utils localStorage =====================
function loadJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function saveJSON(key, value) {
  try {
    const serialized = JSON.stringify(value)
    localStorage.setItem(key, serialized)
    return true
  } catch (error) {
    console.error("Error guardando en localStorage:", error)
    showToast("Error de almacenamiento", "No se pudieron guardar los datos", "error")
    return false
  }
}

// ===================== Carga Inicial =====================
async function cargarDatosDesdeJSON() {
  try {
    console.log("🔄 Cargando datos desde archivo JSON...")
    const response = await fetch("./data/empleados.json")
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const data = await response.json()

    empleados = data.empleados || []
    solicitudesVacaciones = data.solicitudesVacaciones || []
    if (data.configuracion) Object.assign(configuracion, data.configuracion)

    saveJSON(STORAGE_KEYS.empleados, empleados)
    saveJSON(STORAGE_KEYS.solicitudes, solicitudesVacaciones)
    saveJSON(STORAGE_KEYS.config, configuracion)
    saveJSON(STORAGE_KEYS.dataLoaded, true)

    console.log(`✅ Datos cargados: ${empleados.length} empleados, ${solicitudesVacaciones.length} solicitudes`)
    return true
  } catch (error) {
    console.error("❌ Error cargando datos desde JSON:", error)
    console.log("🔄 Cargando datos de ejemplo como respaldo...")
    cargarDatosEjemplo()
    return false
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  inicializarApp()
  await cargarEstadoDesdeStorageOJSON()
})

async function cargarEstadoDesdeStorageOJSON() {
  const dataLoaded = loadJSON(STORAGE_KEYS.dataLoaded, false)
  const storedEmpleados = loadJSON(STORAGE_KEYS.empleados, null)
  const storedSolicitudes = loadJSON(STORAGE_KEYS.solicitudes, null)
  const storedConfig = loadJSON(STORAGE_KEYS.config, null)

  if (dataLoaded && Array.isArray(storedEmpleados) && storedEmpleados.length > 0) {
    console.log("📦 Cargando datos desde localStorage...")
    empleados = storedEmpleados
    solicitudesVacaciones = Array.isArray(storedSolicitudes) ? storedSolicitudes : []
    if (storedConfig && typeof storedConfig === "object") Object.assign(configuracion, storedConfig)
  } else {
    const ok = await cargarDatosDesdeJSON()
    if (!ok && empleados.length === 0) {
      cargarDatosEjemplo()
      saveJSON(STORAGE_KEYS.empleados, empleados)
      saveJSON(STORAGE_KEYS.solicitudes, solicitudesVacaciones)
      saveJSON(STORAGE_KEYS.config, configuracion)
    }
  }

  actualizarDashboard()
  actualizarTablaEmpleados()
  actualizarNomina()
  actualizarVacaciones()
  mostrarEstadisticasCarga()
}

function mostrarEstadisticasCarga() {
  const totalEmpleados = empleados.length
  const totalSolicitudes = solicitudesVacaciones.length
  const empleadosActivos = empleados.filter((e) => e.estado === "Activo").length
  console.log("📊 Estadísticas del sistema:")
  console.log(`   👥 Total empleados: ${totalEmpleados}`)
  console.log(`   ✅ Empleados activos: ${empleadosActivos}`)
  console.log(`   📅 Solicitudes de vacaciones: ${totalSolicitudes}`)
  console.log(`   💰 Empresa: ${configuracion.empresaNombre}`)
}

// ===================== Inicialización UI =====================
function inicializarApp() {
  document.getElementById("loginForm").addEventListener("submit", handleLogin)
  document.getElementById("sidebarToggle").addEventListener("click", toggleSidebar)

  document.querySelectorAll(".menu-item").forEach((item) => {
    item.addEventListener("click", function () {
      const page = this.dataset.page
      if (page) navigateTo(page)
    })
  })

  document.getElementById("searchEmpleados")?.addEventListener("input", filtrarEmpleados)
  document.getElementById("filterDepartamento")?.addEventListener("change", filtrarEmpleados)
  document.getElementById("filterEstado")?.addEventListener("change", filtrarEmpleados)
  document.getElementById("filterEstadoVacaciones")?.addEventListener("change", actualizarVacaciones)

  document.addEventListener("click", (e) => {
    if (e.target.classList?.contains("modal")) closeModal(e.target.id)
  })

  setupFormEvents()
  document.addEventListener("keydown", handleKeyboardShortcuts)
}

// ===================== Login / Logout =====================
function handleLogin(e) {
  e.preventDefault()
  const usuario = document.getElementById("loginUser").value.trim()
  const password = document.getElementById("loginPassword").value

  const credenciales = {
    admin: { password: "admin123", role: "admin", nombre: "Administrador" },
    supervisor: { password: "super123", role: "supervisor", nombre: "Supervisor" },
    empleado: { password: "emp123", role: "empleado", nombre: "Empleado" },
  }

  const registro = credenciales[usuario]
  if (registro && registro.password === password) {
    usuarioActual = { usuario, role: registro.role, nombre: registro.nombre }

    document.getElementById("loginScreen").classList.add("d-none")
    document.getElementById("mainApp").classList.remove("d-none")

    document.getElementById("currentUserName").textContent = usuarioActual.nombre
    document.getElementById("currentUserRole").textContent =
      usuarioActual.role.charAt(0).toUpperCase() + usuarioActual.role.slice(1)
    document.getElementById("profileName").textContent = usuarioActual.nombre
    document.getElementById("profileRole").textContent = usuarioActual.role

    aplicarPermisos()
    navigateTo("dashboard")
    showToast("Bienvenido al sistema", `Sesión iniciada como ${usuarioActual.nombre}`, "success")
  } else {
    showToast("Error de autenticación", "Credenciales incorrectas", "error")
  }
}

function fillDemo(user, pass) {
  document.getElementById("loginUser").value = user
  document.getElementById("loginPassword").value = pass
}

function logout() {
  usuarioActual = null
  document.getElementById("loginScreen").classList.remove("d-none")
  document.getElementById("mainApp").classList.add("d-none")
  document.getElementById("loginForm").reset()
  showToast("Sesión cerrada", "Has cerrado sesión exitosamente", "info")
}

// ===================== Navegación =====================
function navigateTo(page) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"))
  document.getElementById(page).classList.add("active")

  document.querySelectorAll(".menu-item").forEach((i) => i.classList.remove("active"))
  document.querySelector(`[data-page="${page}"]`)?.classList.add("active")

  const titles = {
    dashboard: { title: "Dashboard", subtitle: "Resumen general del sistema" },
    empleados: { title: "Empleados", subtitle: "Gestión de empleados" },
    nomina: { title: "Nómina", subtitle: "Cálculos de nómina" },
    vacaciones: { title: "Vacaciones", subtitle: "Solicitudes de vacaciones" },
    reportes: { title: "Reportes", subtitle: "Generación de reportes" },
    analytics: { title: "Analytics", subtitle: "Análisis y métricas" },
    configuracion: { title: "Configuración", subtitle: "Configuración del sistema" },
    perfil: { title: "Mi Perfil", subtitle: "Información personal" },
  }
  if (titles[page]) {
    document.getElementById("pageTitle").textContent = titles[page].title
    document.getElementById("pageSubtitle").textContent = titles[page].subtitle
  }

  paginaActual = page

  switch (page) {
    case "dashboard": actualizarDashboard(); break
    case "empleados": actualizarTablaEmpleados(); break
    case "nomina": actualizarNomina(); break
    case "vacaciones": actualizarVacaciones(); break
    case "analytics": actualizarAnalytics(); break
  }
}

function toggleSidebar() { document.querySelector(".sidebar").classList.toggle("active") }

// ===================== Permisos por Rol =====================
function aplicarPermisos() {
  const items = document.querySelectorAll(".menu-item")
  items.forEach((it) => (it.style.display = ""))

  if (usuarioActual?.role === "empleado") {
    items.forEach((it) => {
      const page = it.dataset.page
      if (!["dashboard", "vacaciones", "perfil"].includes(page)) it.style.display = "none"
    })
  } else if (usuarioActual?.role === "supervisor") {
    items.forEach((it) => {
      const page = it.dataset.page
      if (page === "configuracion") it.style.display = "none"
    })
  }
  // admin ve todo
}

// ===================== Dashboard =====================
function actualizarDashboard() {
  const totalEmpleados = empleados.length
  const empleadosActivos = empleados.filter((e) => e.estado === "Activo").length
  const solicitudesPendientes = solicitudesVacaciones.filter((s) => s.estado === "Pendiente").length
  const nominaTotal = empleados.reduce((acc, emp) => {
    if (emp.estado === "Activo") {
      const sueldoBase = emp.sueldoBase
      const afp = sueldoBase * (configuracion.afp / 100)
      const ars = sueldoBase * (configuracion.ars / 100)
      const isr = sueldoBase > 34685 ? sueldoBase * (configuracion.isr / 100) : 0
      const descuentos = afp + ars + isr
      const bonificaciones = 3500
      return acc + (sueldoBase - descuentos + bonificaciones)
    }
    return acc
  }, 0)

  document.getElementById("totalEmpleadosStat").textContent = totalEmpleados
  document.getElementById("empleadosActivosStat").textContent = empleadosActivos
  document.getElementById("solicitudesPendientesStat").textContent = solicitudesPendientes
  document.getElementById("nominaTotalStat").textContent = `${configuracion.moneda}${nominaTotal.toLocaleString()}`

  document.getElementById("empleadosBadge").textContent = totalEmpleados
  document.getElementById("vacacionesBadge").textContent = solicitudesPendientes

  // Empleados recientes
  const recientes = empleados.slice(-5).reverse()
  const cont = document.getElementById("empleadosRecientes")
  cont.innerHTML =
    recientes.length === 0
      ? `<div class="empty-state"><i class="fas fa-users"></i><p>No hay empleados registrados</p></div>`
      : recientes
          .map(
            (emp) => `
        <div class="recent-item">
          <div class="recent-avatar">${emp.nombre.charAt(0)}</div>
          <div class="recent-info">
            <h6>${emp.nombre}</h6>
            <p>${emp.puesto} - ${emp.departamento}</p>
          </div>
        </div>`
          )
          .join("")

  // Solicitudes recientes
  const recSol = solicitudesVacaciones.slice(-5).reverse()
  const contSol = document.getElementById("solicitudesRecientes")
  contSol.innerHTML =
    recSol.length === 0
      ? `<div class="empty-state"><i class="fas fa-calendar-alt"></i><p>No hay solicitudes pendientes</p></div>`
      : recSol
          .map((sol) => {
            const emp = empleados.find((e) => e.id === sol.empleadoId)
            return `
        <div class="recent-item">
          <div class="recent-avatar">${emp ? emp.nombre.charAt(0) : "U"}</div>
          <div class="recent-info">
            <h6>${emp ? emp.nombre : "Usuario"}</h6>
            <p>${sol.dias} días - ${sol.estado}</p>
          </div>
        </div>`
          })
          .join("")
}

// ===================== Empleados =====================
function actualizarTablaEmpleados() {
  const tbody = document.getElementById("empleadosTableBody")
  if (empleados.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="8">
          <div class="empty-state">
            <i class="fas fa-users"></i>
            <h6>No hay empleados registrados</h6>
            <p>Comienza agregando tu primer empleado</p>
            <button class="btn-primary" onclick="openModal('empleadoModal')">
              <i class="fas fa-plus"></i>
              Agregar Empleado
            </button>
          </div>
        </td>
      </tr>`
    return
  }

  tbody.innerHTML = empleados
    .map(
      (emp) => `
    <tr>
      <td><input type="checkbox" value="${emp.id}"/></td>
      <td>
        <div class="employee-info">
          <div class="employee-avatar">${emp.nombre.charAt(0)}</div>
          <div class="employee-details">
            <h6>${emp.nombre}</h6>
            <p>${emp.email}</p>
          </div>
        </div>
      </td>
      <td>${emp.cedula}</td>
      <td>${emp.departamento}</td>
      <td>${emp.puesto}</td>
      <td>${configuracion.moneda}${emp.sueldoBase.toLocaleString()}</td>
      <td><span class="status-badge ${emp.estado.toLowerCase()}">${emp.estado}</span></td>
      <td>
        <div class="action-buttons">
          <button class="action-btn view" onclick="verEmpleado(${emp.id})" title="Ver detalles">
            <i class="fas fa-eye"></i>
          </button>
          <button class="action-btn edit" onclick="editarEmpleado(${emp.id})" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button class="action-btn delete" onclick="eliminarEmpleado(${emp.id})" title="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>`
    )
    .join("")

  actualizarFiltros()
}

function actualizarFiltros() {
  const departamentos = [...new Set(empleados.map((e) => e.departamento))]
  const filterDepartamento = document.getElementById("filterDepartamento")
  if (filterDepartamento) {
    filterDepartamento.innerHTML =
      '<option value="">Todos los departamentos</option>' +
      departamentos.map((dep) => `<option value="${dep}">${dep}</option>`).join("")
  }
}

function filtrarEmpleados() {
  const searchTerm = document.getElementById("searchEmpleados")?.value.toLowerCase() || ""
  const filterDep = document.getElementById("filterDepartamento")?.value || ""
  const filterEst = document.getElementById("filterEstado")?.value || ""

  const filtered = empleados.filter((emp) => {
    const matchSearch =
      emp.nombre.toLowerCase().includes(searchTerm) ||
      emp.cedula.includes(searchTerm) ||
      emp.email.toLowerCase().includes(searchTerm)
    const matchDep = !filterDep || emp.departamento === filterDep
    const matchEst = !filterEst || emp.estado === filterEst
    return matchSearch && matchDep && matchEst
  })

  const tbody = document.getElementById("empleadosTableBody")
  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="8">
          <div class="empty-state">
            <i class="fas fa-search"></i>
            <h6>No se encontraron empleados</h6>
            <p>Intenta con otros criterios de búsqueda</p>
          </div>
        </td>
      </tr>`
  } else {
    tbody.innerHTML = filtered
      .map(
        (emp) => `
      <tr>
        <td><input type="checkbox" value="${emp.id}"/></td>
        <td>
          <div class="employee-info">
            <div class="employee-avatar">${emp.nombre.charAt(0)}</div>
            <div class="employee-details">
              <h6>${emp.nombre}</h6>
              <p>${emp.email}</p>
            </div>
          </div>
        </td>
        <td>${emp.cedula}</td>
        <td>${emp.departamento}</td>
        <td>${emp.puesto}</td>
        <td>${configuracion.moneda}${emp.sueldoBase.toLocaleString()}</td>
        <td><span class="status-badge ${emp.estado.toLowerCase()}">${emp.estado}</span></td>
        <td>
          <div class="action-buttons">
            <button class="action-btn view" onclick="verEmpleado(${emp.id})" title="Ver detalles">
              <i class="fas fa-eye"></i>
            </button>
            <button class="action-btn edit" onclick="editarEmpleado(${emp.id})" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete" onclick="eliminarEmpleado(${emp.id})" title="Eliminar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>`
      )
      .join("")
  }
}

function verEmpleado(id) {
  const empleado = empleados.find((e) => e.id === id)
  if (!empleado) return
  showToast("Información del empleado", `Mostrando detalles de ${empleado.nombre}`, "info")
}

function editarEmpleado(id) {
  const empleado = empleados.find((e) => e.id === id)
  if (!empleado) return

  document.getElementById("empNombre").value = empleado.nombre
  document.getElementById("empCedula").value = empleado.cedula
  document.getElementById("empFechaNacimiento").value = empleado.fechaNacimiento
  document.getElementById("empTelefono").value = empleado.telefono
  document.getElementById("empEmail").value = empleado.email
  document.getElementById("empDireccion").value = empleado.direccion

  // selects (si no existe la opción, se agrega temporalmente y se selecciona)
  setSelectValue("empDepartamento", empleado.departamento)
  setSelectValue("empPuesto", empleado.puesto)
  setSelectValue("empProfesion", empleado.profesion)

  document.getElementById("empSueldo").value = empleado.sueldoBase
  document.getElementById("empFechaIngreso").value = empleado.fechaIngreso
  document.getElementById("empEstado").value = empleado.estado

  document.querySelector("#empleadoModal .modal-header h5").textContent = "Editar Empleado"
  document.getElementById("empleadoForm").dataset.editId = id
  openModal("empleadoModal")
}

function eliminarEmpleado(id) {
  const empleado = empleados.find((e) => e.id === id)
  if (!empleado) return
  if (confirm(`¿Estás seguro de que deseas eliminar a ${empleado.nombre}?`)) {
    empleados = empleados.filter((e) => e.id !== id)
    saveJSON(STORAGE_KEYS.empleados, empleados)
    actualizarTablaEmpleados()
    actualizarDashboard()
    cargarEmpleadosEnSelects()
    showToast("Empleado eliminado", `${empleado.nombre} ha sido eliminado del sistema`, "success")
  }
}

function guardarEmpleado() {
  const form = document.getElementById("empleadoForm")
  const editId = form.dataset.editId

  const empleadoData = {
    nombre: document.getElementById("empNombre").value,
    cedula: document.getElementById("empCedula").value,
    fechaNacimiento: document.getElementById("empFechaNacimiento").value,
    telefono: document.getElementById("empTelefono").value,
    email: document.getElementById("empEmail").value,
    direccion: document.getElementById("empDireccion").value,
    departamento: document.getElementById("empDepartamento").value,
    puesto: document.getElementById("empPuesto").value,
    profesion: document.getElementById("empProfesion").value,
    sueldoBase: Number.parseFloat(document.getElementById("empSueldo").value),
    fechaIngreso: document.getElementById("empFechaIngreso").value,
    estado: document.getElementById("empEstado").value,
  }

  if (!empleadoData.nombre || !empleadoData.cedula || !empleadoData.email) {
    showToast("Error de validación", "Por favor completa todos los campos requeridos", "error")
    return
  }

  if (editId) {
    const index = empleados.findIndex((e) => e.id == editId)
    if (index !== -1) {
      empleados[index] = { ...empleados[index], ...empleadoData }
      saveJSON(STORAGE_KEYS.empleados, empleados)
      showToast("Empleado actualizado", `${empleadoData.nombre} ha sido actualizado`, "success")
    }
  } else {
    if (empleados.some((e) => e.cedula === empleadoData.cedula)) {
      showToast("Error", "Ya existe un empleado con esta cédula", "error")
      return
    }
    const nuevoEmpleado = {
      id: Date.now(),
      ...empleadoData,
      fechaRegistro: new Date().toISOString(),
    }
    empleados.push(nuevoEmpleado)
    saveJSON(STORAGE_KEYS.empleados, empleados)
    showToast("Empleado creado", `${empleadoData.nombre} ha sido agregado al sistema`, "success")
  }

  form.reset()
  delete form.dataset.editId
  document.querySelector("#empleadoModal .modal-header h5").textContent = "Nuevo Empleado"
  closeModal("empleadoModal")

  actualizarTablaEmpleados()
  actualizarDashboard()
  cargarEmpleadosEnSelects()
}

function setSelectValue(selectId, value) {
  const sel = document.getElementById(selectId)
  if (!sel) return
  const has = Array.from(sel.options).some((o) => o.value === value)
  if (!has && value) {
    sel.insertBefore(new Option(value, value, true, true), sel.firstChild)
  } else {
    sel.value = value || ""
  }
}

// ===================== Nómina =====================
function actualizarNomina() {
  const activos = empleados.filter((e) => e.estado === "Activo")
  let totalBruto = 0
  let totalDescuentos = 0
  let totalNeto = 0

  const tbody = document.getElementById("nominaTableBody")
  if (activos.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">
          <div class="empty-state">
            <i class="fas fa-calculator"></i>
            <h6>No hay empleados activos</h6>
            <p>Agrega empleados activos para procesar la nómina</p>
          </div>
        </td>
      </tr>`
  } else {
    tbody.innerHTML = activos
      .map((emp) => {
        const sueldoBase = emp.sueldoBase
        const afp = sueldoBase * (configuracion.afp / 100)
        const ars = sueldoBase * (configuracion.ars / 100)
        const isr = sueldoBase > 34685 ? sueldoBase * (configuracion.isr / 100) : 0
        const descuentos = afp + ars + isr
        const bonificaciones = 3500
        const sueldoNeto = sueldoBase - descuentos + bonificaciones

        totalBruto += sueldoBase
        totalDescuentos += descuentos
        totalNeto += sueldoNeto

        return `
        <tr>
          <td>
            <div class="employee-info">
              <div class="employee-avatar">${emp.nombre.charAt(0)}</div>
              <div class="employee-details">
                <h6>${emp.nombre}</h6>
                <p>${emp.puesto}</p>
              </div>
            </div>
          </td>
          <td>${configuracion.moneda}${sueldoBase.toLocaleString()}</td>
          <td>${configuracion.moneda}${bonificaciones.toLocaleString()}</td>
          <td>${configuracion.moneda}${descuentos.toLocaleString()}</td>
          <td class="fw-bold">${configuracion.moneda}${sueldoNeto.toLocaleString()}</td>
          <td><span class="status-badge active">Procesado</span></td>
          <td>
            <div class="action-buttons">
              <button class="action-btn view" onclick="verDetalleNomina(${emp.id})" title="Ver detalle">
                <i class="fas fa-eye"></i>
              </button>
            </div>
          </td>
        </tr>`
      })
      .join("")
  }

  document.getElementById("totalBruto").textContent = `${configuracion.moneda}${totalBruto.toLocaleString()}`
  document.getElementById("totalDescuentos").textContent = `${configuracion.moneda}${totalDescuentos.toLocaleString()}`
  document.getElementById("totalNeto").textContent = `${configuracion.moneda}${totalNeto.toLocaleString()}`
  document.getElementById("totalEmpleadosNomina").textContent = activos.length
}

function procesarNomina() {
  const activos = empleados.filter((e) => e.estado === "Activo")
  if (activos.length === 0) {
    showToast("Error", "No hay empleados activos para procesar", "error")
    return
  }
  if (!confirm(`¿Está seguro de procesar la nómina para ${activos.length} empleados?`)) return

  showToast("Procesando nómina", "Iniciando procesamiento de nómina...", "info")
  let procesados = 0
  const totalEmpleados = activos.length

  const interval = setInterval(() => {
    procesados++
    const progreso = Math.round((procesados / totalEmpleados) * 100)
    if (procesados < totalEmpleados) {
      showToast("Procesando", `Procesando empleado ${procesados} de ${totalEmpleados} (${progreso}%)`, "info")
    } else {
      clearInterval(interval)
      actualizarNomina()
      actualizarDashboard()
      showToast("¡Nómina Procesada!", `Se procesaron ${totalEmpleados} empleados.`, "success")
    }
  }, 200)
}

function exportarNomina() {
  const activos = empleados.filter((e) => e.estado === "Activo")
  let csv = "Empleado,Cédula,Sueldo Base,Bonificaciones,Descuentos,Sueldo Neto\n"
  activos.forEach((emp) => {
    const sueldoBase = emp.sueldoBase
    const descuentos = (sueldoBase * (configuracion.afp + configuracion.ars + configuracion.isr)) / 100
    const bonificaciones = 3500
    const sueldoNeto = sueldoBase - descuentos + bonificaciones
    csv += `${emp.nombre},${emp.cedula},${sueldoBase},${bonificaciones},${descuentos.toFixed(2)},${sueldoNeto.toFixed(2)}\n`
  })

  const blob = new Blob([csv], { type: "text/csv" })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `nomina_${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  window.URL.revokeObjectURL(url)

  showToast("Exportación exitosa", "La nómina ha sido exportada a CSV", "success")
}

function verDetalleNomina(id) {
  const emp = empleados.find((e) => e.id === id)
  if (!emp) return

  const sueldoBase = emp.sueldoBase
  const afp = sueldoBase * (configuracion.afp / 100)
  const ars = sueldoBase * (configuracion.ars / 100)
  const isr = sueldoBase > 34685 ? sueldoBase * (configuracion.isr / 100) : 0
  const bonificaciones = 3500
  const sueldoNeto = sueldoBase - (afp + ars + isr) + bonificaciones

  const detalle = `
Empleado: ${emp.nombre}
Sueldo Base: ${configuracion.moneda}${sueldoBase.toLocaleString()}
AFP (${configuracion.afp}%): ${configuracion.moneda}${afp.toFixed(2)}
ARS (${configuracion.ars}%): ${configuracion.moneda}${ars.toFixed(2)}
ISR (${configuracion.isr}%): ${configuracion.moneda}${isr.toFixed(2)}
Bonificaciones: ${configuracion.moneda}${bonificaciones.toLocaleString()}
Sueldo Neto: ${configuracion.moneda}${sueldoNeto.toLocaleString()}
  `
  showToast("Detalle de Nómina", detalle, "info")
}

// ===================== Vacaciones =====================
function actualizarVacaciones() {
  const filtro = document.getElementById("filterEstadoVacaciones")?.value || ""
  const solicitudes = filtro ? solicitudesVacaciones.filter((s) => s.estado === filtro) : solicitudesVacaciones

  const pendientes = solicitudesVacaciones.filter((s) => s.estado === "Pendiente").length
  const aprobadas = solicitudesVacaciones.filter((s) => s.estado === "Aprobado").length
  const rechazadas = solicitudesVacaciones.filter((s) => s.estado === "Rechazado").length

  document.getElementById("vacacionesPendientes").textContent = pendientes
  document.getElementById("vacacionesAprobadas").textContent = aprobadas
  document.getElementById("vacacionesRechazadas").textContent = rechazadas

  const tbody = document.getElementById("vacacionesTableBody")
  if (solicitudes.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="8">
          <div class="empty-state">
            <i class="fas fa-calendar-alt"></i>
            <h6>No hay solicitudes de vacaciones</h6>
            <p>Las solicitudes aparecerán aquí</p>
          </div>
        </td>
      </tr>`
    return
  }

  tbody.innerHTML = solicitudes
    .map((sol) => {
      const emp = empleados.find((e) => e.id === sol.empleadoId)
      const isEmpleado = usuarioActual?.role === "empleado"
      const motivoDecision = sol.decisionMotivo ? escapeHTML(sol.decisionMotivo) : "—"

      return `
      <tr>
        <td>
          <div class="employee-info">
            <div class="employee-avatar">${emp ? emp.nombre.charAt(0) : "U"}</div>
            <div class="employee-details">
              <h6>${emp ? emp.nombre : "Usuario"}</h6>
              <p>${emp ? emp.puesto : "N/A"}</p>
            </div>
          </div>
        </td>
        <td>${formatearFecha(sol.fechaInicio)}</td>
        <td>${formatearFecha(sol.fechaFin)}</td>
        <td>${sol.dias}</td>
        <td>${escapeHTML(sol.motivo)}</td>
        <td><span class="status-badge ${sol.estado.toLowerCase()}">${sol.estado}</span></td>
        <td>${motivoDecision}</td>
        ${
          !isEmpleado
            ? `<td>
          <div class="action-buttons">
            ${
              sol.estado === "Pendiente"
                ? `
              <button class="action-btn approve" onclick="aprobarVacaciones(${sol.id})" title="Aprobar">
                <i class="fas fa-check"></i>
              </button>
              <button class="action-btn delete" onclick="rechazarVacaciones(${sol.id})" title="Rechazar">
                <i class="fas fa-times"></i>
              </button>`
                : `
              <button class="action-btn view" onclick="verVacaciones(${sol.id})" title="Ver detalles">
                <i class="fas fa-eye"></i>
              </button>`
            }
          </div>
        </td>`
            : ""
        }
      </tr>`
    })
    .join("")

  cargarEmpleadosEnSelects()

  // Ocultar/mostrar columna de acciones según el rol
  const accionesHeader = document.getElementById("accionesHeader")
  const isEmpleado = usuarioActual?.role === "empleado"
  if (accionesHeader) accionesHeader.style.display = isEmpleado ? "none" : ""

  // Ajustar colspan de empty state
  const emptyRow = document.querySelector("#vacacionesTableBody .empty-row td")
  if (emptyRow) emptyRow.setAttribute("colspan", isEmpleado ? "7" : "8")
}

function cargarEmpleadosEnSelects() {
  const activos = empleados.filter((e) => e.estado === "Activo")
  const select = document.getElementById("vacEmpleado")
  if (select) {
    select.innerHTML =
      '<option value="">Seleccionar empleado...</option>' +
      activos.map((e) => `<option value="${e.id}">${e.nombre} - ${e.puesto}</option>`).join("")
  }
}

function guardarVacaciones() {
  const empleadoId = Number.parseInt(document.getElementById("vacEmpleado").value)
  const fechaInicio = document.getElementById("vacFechaInicio").value
  const fechaFin = document.getElementById("vacFechaFin").value
  const motivo = document.getElementById("vacMotivo").value

  if (!empleadoId || !fechaInicio || !fechaFin || !motivo) {
    showToast("Error de validación", "Por favor completa todos los campos", "error")
    return
  }

  const inicio = new Date(fechaInicio)
  const fin = new Date(fechaFin)
  const dias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)) + 1

  if (dias > 15) {
    showToast("Error", "No se pueden solicitar más de 15 días de vacaciones", "error")
    return
  }
  if (dias <= 0) {
    showToast("Error", "Las fechas seleccionadas no son válidas", "error")
    return
  }

  const nueva = {
    id: Date.now(),
    empleadoId,
    fechaInicio,
    fechaFin,
    dias,
    motivo,
    estado: "Pendiente",
    fechaSolicitud: new Date().toISOString(),
    decisionMotivo: null,
    decisionFecha: null,
  }

  solicitudesVacaciones.push(nueva)
  saveJSON(STORAGE_KEYS.solicitudes, solicitudesVacaciones)

  document.getElementById("vacacionesForm").reset()
  closeModal("vacacionesModal")

  actualizarVacaciones()
  actualizarDashboard()

  const emp = empleados.find((e) => e.id === empleadoId)
  showToast("Solicitud enviada", `Solicitud de vacaciones para ${emp?.nombre ?? "Empleado"} enviada`, "success")
}

// === Nuevo flujo con modal de decisión ===
function openDecisionModal(solicitudId, accion) {
  const sol = solicitudesVacaciones.find((s) => s.id === solicitudId)
  if (!sol) return
  document.getElementById("decisionSolicitudId").value = solicitudId
  document.getElementById("decisionAccion").value = accion
  document.getElementById("decisionMotivo").value = ""
  document.getElementById("decisionModalTitle").textContent =
    accion === "Aprobado" ? "Aprobar Solicitud" : "Rechazar Solicitud"
  document.getElementById("decisionLabel").textContent =
    accion === "Aprobado" ? "Motivo de aprobación *" : "Motivo de rechazo *"
  openModal("decisionModal")
}

function confirmarDecision() {
  const id = Number(document.getElementById("decisionSolicitudId").value)
  const accion = document.getElementById("decisionAccion").value
  const motivo = document.getElementById("decisionMotivo").value.trim()
  if (!id || !accion || !motivo) {
    showToast("Error de validación", "Debes indicar el motivo de la decisión", "error")
    return
  }
  const sol = solicitudesVacaciones.find((s) => s.id === id)
  if (!sol) return
  sol.estado = accion
  sol.decisionMotivo = motivo
  sol.decisionFecha = new Date().toISOString()
  saveJSON(STORAGE_KEYS.solicitudes, solicitudesVacaciones)

  closeModal("decisionModal")
  actualizarVacaciones()
  actualizarDashboard()

  const emp = empleados.find((e) => e.id === sol.empleadoId)
  showToast(
    `Solicitud ${accion.toLowerCase()}`,
    `${emp ? emp.nombre : "Empleado"}: ${motivo}`,
    accion === "Aprobado" ? "success" : "warning"
  )
}

// Reemplazo de las funciones existentes para abrir el modal:
function aprobarVacaciones(id) { openDecisionModal(id, "Aprobado") }
function rechazarVacaciones(id) { openDecisionModal(id, "Rechazado") }

function verVacaciones(id) {
  const sol = solicitudesVacaciones.find((s) => s.id === id)
  if (sol) {
    const emp = empleados.find((e) => e.id === sol.empleadoId)
    const fechaInicio = formatearFecha(sol.fechaInicio)
    const fechaFin = formatearFecha(sol.fechaFin)
    const detalle = `
Empleado: ${emp ? emp.nombre : "Empleado"}
Departamento: ${emp ? emp.departamento : "N/A"}
Puesto: ${emp ? emp.puesto : "N/A"}
Período: ${fechaInicio} - ${fechaFin}
Días solicitados: ${sol.dias}
Estado: ${sol.estado}
Motivo (Solicitud): ${sol.motivo}
Motivo (Decisión): ${sol.decisionMotivo ? sol.decisionMotivo : "—"}
Fecha de solicitud: ${formatearFecha(sol.fechaSolicitud)}
${sol.decisionFecha ? "Fecha de decisión: " + formatearFecha(sol.decisionFecha) : ""}
    `
    showToast("Detalles de Solicitud de Vacaciones", detalle, "info")
  }
}

// ===================== Reportes =====================
function generarReporte(tipo) {
  let contenido = ""
  let filename = ""

  switch (tipo) {
    case "empleados":
      contenido = "Nombre,Cédula,Departamento,Puesto,Sueldo,Estado,Fecha Ingreso\n"
      empleados.forEach((e) => {
        contenido += `${e.nombre},${e.cedula},${e.departamento},${e.puesto},${e.sueldoBase},${e.estado},${e.fechaIngreso}\n`
      })
      filename = "reporte_empleados.csv"
      break

    case "nomina":
      contenido = "Empleado,Sueldo Base,Descuentos,Bonificaciones,Sueldo Neto\n"
      empleados
        .filter((e) => e.estado === "Activo")
        .forEach((e) => {
          const descuentos = (e.sueldoBase * (configuracion.afp + configuracion.ars + configuracion.isr)) / 100
          const bonificaciones = 3500
          const neto = e.sueldoBase - descuentos + bonificaciones
          contenido += `${e.nombre},${e.sueldoBase},${descuentos.toFixed(2)},${bonificaciones},${neto.toFixed(2)}\n`
        })
      filename = "reporte_nomina.csv"
      break

    case "vacaciones":
      contenido = "Empleado,Fecha Inicio,Fecha Fin,Días,Estado,Motivo Solicitud,Motivo Decisión\n"
      solicitudesVacaciones.forEach((s) => {
        const emp = empleados.find((e) => e.id === s.empleadoId)
        contenido += `${emp ? emp.nombre : "N/A"},${s.fechaInicio},${s.fechaFin},${s.dias},${s.estado},"${s.motivo}","${s.decisionMotivo || ""}"\n`
      })
      filename = "reporte_vacaciones.csv"
      break

    case "analytics":
      const totalEmpleados = empleados.length
      const empleadosActivos = empleados.filter((e) => e.estado === "Activo").length
      const nominaTotal = empleados.reduce((acc, e) => acc + e.sueldoBase, 0)
      contenido = `Reporte Analítico - ${new Date().toLocaleDateString()}\n\n`
      contenido += `Total de Empleados: ${totalEmpleados}\n`
      contenido += `Empleados Activos: ${empleadosActivos}\n`
      contenido += `Nómina Total: ${configuracion.moneda}${nominaTotal.toLocaleString()}\n`
      contenido += `Solicitudes de Vacaciones: ${solicitudesVacaciones.length}\n`
      filename = "reporte_analytics.txt"
      break
  }

  const blob = new Blob([contenido], { type: "text/plain" })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)

  showToast("Reporte generado", `El reporte ${tipo} ha sido descargado`, "success")
}

// ===================== Configuración =====================
function guardarConfiguracion() {
  configuracion.empresaNombre = document.getElementById("empresaNombre").value
  configuracion.moneda = document.getElementById("moneda").value
  configuracion.afp = Number.parseFloat(document.getElementById("afpPorcentaje").value)
  configuracion.ars = Number.parseFloat(document.getElementById("arsPorcentaje").value)
  configuracion.isr = Number.parseFloat(document.getElementById("isrPorcentaje").value)

  saveJSON(STORAGE_KEYS.config, configuracion)
  showToast("Configuración guardada", "Los cambios han sido guardados exitosamente", "success")
  actualizarNomina()
  actualizarDashboard()
}

function resetearConfiguracion() {
  document.getElementById("empresaNombre").value = "HRPro Empresa Demo S.A."
  document.getElementById("moneda").value = "RD$"
  document.getElementById("afpPorcentaje").value = "2.87"
  document.getElementById("arsPorcentaje").value = "3.04"
  document.getElementById("isrPorcentaje").value = "10"

  configuracion.empresaNombre = "HRPro Empresa Demo S.A."
  configuracion.moneda = "RD$"
  configuracion.afp = 2.87
  configuracion.ars = 3.04
  configuracion.isr = 10

  saveJSON(STORAGE_KEYS.config, configuracion)
  showToast("Configuración restablecida", "Los valores por defecto han sido restaurados", "info")
  actualizarNomina()
  actualizarDashboard()
}

// ===================== Perfil =====================
function actualizarPerfil() {
  const nombre = document.getElementById("profileFullName").value
  document.getElementById("profileName").textContent = nombre
  document.getElementById("currentUserName").textContent = nombre
  document.getElementById("currentPassword").value = ""
  document.getElementById("newPassword").value = ""
  document.getElementById("confirmPassword").value = ""
  showToast("Perfil actualizado", "Tu información ha sido actualizada exitosamente", "success")
}

// ===================== Modales =====================
function openModal(modalId) {
  document.getElementById(modalId).classList.add("active")
  document.body.style.overflow = "hidden"
}
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active")
  document.body.style.overflow = ""
  const form = document.querySelector(`#${modalId} form`)
  if (form) { form.reset(); delete form.dataset.editId }
}

// ===================== Formularios y Validaciones =====================
function setupFormEvents() {
  // Vacaciones: cálculo de días
  const fechaInicio = document.getElementById("vacFechaInicio")
  const fechaFin = document.getElementById("vacFechaFin")
  const diasInput = document.getElementById("vacDias")
  if (fechaInicio && fechaFin && diasInput) {
    const calcularDias = () => {
      if (fechaInicio.value && fechaFin.value) {
        const ini = new Date(fechaInicio.value)
        const fin = new Date(fechaFin.value)
        const dias = Math.ceil((fin - ini) / (1000 * 60 * 60 * 24)) + 1
        diasInput.value = dias > 0 ? dias : 0
      }
    }
    fechaInicio.addEventListener("change", calcularDias)
    fechaFin.addEventListener("change", calcularDias)
    const today = new Date().toISOString().split("T")[0]
    fechaInicio.min = today
    fechaFin.min = today
  }

  // Sembrar valores iniciales en formularios
  const fechaIngresoInput = document.getElementById("empFechaIngreso")
  if (fechaIngresoInput) fechaIngresoInput.value = new Date().toISOString().split("T")[0]

  setupValidations()
}

function setupValidations() {
  const cedulaInput = document.getElementById("empCedula")
  if (cedulaInput) {
    cedulaInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "")
      if (value.length >= 3) value = value.substring(0, 3) + "-" + value.substring(3)
      if (value.length >= 11) value = value.substring(0, 11) + "-" + value.substring(11, 12)
      e.target.value = value.substring(0, 13)
    })
  }

  const telInput = document.getElementById("empTelefono")
  if (telInput) {
    telInput.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^\d+\-\s()]/g, "")
    })
  }
}

// ===================== Helpers / Varios =====================
function handleKeyboardShortcuts(e) {
  // Ejemplo: N = Nueva Solicitud de Vacaciones si estás en la pestaña
  if (e.key.toLowerCase() === "n" && paginaActual === "vacaciones") openModal("vacacionesModal")
}

function formatearFecha(iso) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d)) return iso
  return d.toLocaleDateString()
}

function escapeHTML(str) {
  if (str == null) return ""
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function showToast(title, message, type = "info") {
  const container = document.getElementById("toastContainer")
  const toast = document.createElement("div")
  toast.className = `toast ${type}`
  toast.innerHTML = `
    <div class="toast-icon"><i class="fas ${type === "success" ? "fa-check" : type === "error" ? "fa-times" : type === "warning" ? "fa-exclamation" : "fa-info"}"></i></div>
    <div class="toast-content">
      <div class="toast-title">${escapeHTML(title)}</div>
      <div class="toast-message" style="white-space:pre-line">${escapeHTML(message)}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
  `
  container.appendChild(toast)
  setTimeout(() => toast.remove(), 4500)
}

function actualizarAnalytics() {
  // Placeholder (tu gráfico real iría aquí)
}

// Datos de ejemplo de respaldo
function cargarDatosEjemplo() {
  empleados = [
    {
      id: 1,
      nombre: "Ana Pérez",
      cedula: "001-1234567-8",
      fechaNacimiento: "1994-05-12",
      telefono: "+1 809-555-0001",
      email: "ana.perez@empresa.com",
      direccion: "Calle 1 #23",
      departamento: "Tecnología",
      puesto: "Desarrollador/a Backend",
      profesion: "Ing. en Sistemas",
      sueldoBase: 55000,
      fechaIngreso: "2023-03-01",
      estado: "Activo",
      fechaRegistro: new Date().toISOString(),
    },
    {
      id: 2,
      nombre: "Luis Gómez",
      cedula: "001-7654321-0",
      fechaNacimiento: "1989-09-20",
      telefono: "+1 809-555-0002",
      email: "luis.gomez@empresa.com",
      direccion: "Av. Principal 100",
      departamento: "Recursos Humanos",
      puesto: "RRHH Generalista",
      profesion: "Psicólogo/a Organizacional",
      sueldoBase: 42000,
      fechaIngreso: "2022-07-15",
      estado: "Activo",
      fechaRegistro: new Date().toISOString(),
    },
  ]

  solicitudesVacaciones = [
    {
      id: 101,
      empleadoId: 1,
      fechaInicio: "2025-09-01",
      fechaFin: "2025-09-10",
      dias: 10,
      motivo: "Vacaciones anuales",
      estado: "Pendiente",
      fechaSolicitud: "2025-08-15",
      decisionMotivo: null,
      decisionFecha: null,
    },
    {
      id: 102,
      empleadoId: 2,
      fechaInicio: "2025-08-25",
      fechaFin: "2025-08-28",
      dias: 4,
      motivo: "Asuntos personales",
      estado: "Aprobado",
      fechaSolicitud: "2025-08-10",
      decisionMotivo: "Cubre plan de vacaciones anual",
      decisionFecha: "2025-08-12",
    },
  ]
}
