// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCcNM1AiR8Xn0N-jQokhsbqXyHJi1ozm0w",
    authDomain: "plataformamedica-d1a7d.firebaseapp.com",
    projectId: "plataformamedica-d1a7d",
    storageBucket: "plataformamedica-d1a7d.firebasestorage.app",
    messagingSenderId: "17741817268",
    appId: "1:17741817268:web:4556073290256d65c73ee1",
    measurementId: "G-5W16CTQECZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let allCirugias = [];
let filteredCirugias = [];
let allPacientes = [];
let allUsuarios = [];
let editingCirugiaId = null;
let currentView = 'list';
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Check authentication
window.addEventListener('DOMContentLoaded', () => {
    const sessionData = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');

    if (!sessionData) {
        window.location.href = '../Login.html';
        return;
    }

    // Configurar PatientSelector con Firestore
    if (window.patientSelector) {
        window.patientSelector.setFirestore(db, { getDocs, collection });
    }

    // Configurar el trigger del selector de pacientes
    setupPatientSelector();

    // Configurar botón de conexión de Google Calendar
    setupGoogleCalendarButton();

    setTimeout(() => {
        loadPacientes();
        loadUsuarios();
        loadCirugias();
        startAutoUpdateStates();
    }, 100);
});

// Setup Patient Selector
function setupPatientSelector() {
    const trigger = document.getElementById('patientSelectorTrigger');
    const inputNombre = document.getElementById('pacienteNombre');
    const inputId = document.getElementById('pacienteId');
    const btnSelect = trigger.querySelector('.btn-select-patient');

    // Abrir modal al hacer clic en el input o el botón
    const openSelector = () => {
        if (window.patientSelector) {
            window.patientSelector.open((selectedPatient) => {
                // Actualizar los campos con el paciente seleccionado
                inputNombre.value = selectedPatient.nombre || 'Sin nombre';
                inputId.value = selectedPatient.id;
            });
        }
    };

    inputNombre.addEventListener('click', openSelector);
    btnSelect.addEventListener('click', openSelector);
}

// Setup Google Calendar connection button
function setupGoogleCalendarButton() {
    const connectBtn = document.getElementById('connectGoogleCalendar');

    if (!connectBtn) return;

    connectBtn.addEventListener('click', async () => {
        try {
            // Si la API no está lista, esperamos hasta que lo esté
            if (!window.GoogleCalendar || !window.GoogleCalendar.isReady()) {
                showLoadingModal('Esperando que Google Calendar API se cargue...');

                // Esperamos hasta 10 segundos para que la API se cargue
                let intentosEspera = 0;
                const maxIntentosEspera = 20; // 20 * 500ms = 10 segundos

                while ((!window.GoogleCalendar || !window.GoogleCalendar.isReady()) && intentosEspera < maxIntentosEspera) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    intentosEspera++;
                    console.log(`⏳ Esperando carga de API (intento ${intentosEspera}/${maxIntentosEspera})...`);
                }

                if (!window.GoogleCalendar || !window.GoogleCalendar.isReady()) {
                    hideLoadingModal();
                    showErrorModal('Google Calendar API no se pudo cargar. Por favor, recarga la página e inténtalo de nuevo.');
                    return;
                }
            }

            showLoadingModal('Conectando con Google Calendar...');

            await window.GoogleCalendar.authorize();

            hideLoadingModal();
            showSuccessModal('¡Google Calendar conectado exitosamente! Ahora las cirugías se agregarán automáticamente al calendario.');

        } catch (error) {
            hideLoadingModal();
            console.error('Error al conectar Google Calendar:', error);
            showErrorModal('Error al conectar con Google Calendar. Por favor, inténtalo de nuevo.');
        }
    });

    // Mostrar estado de carga inicial
    updateCalendarLoadingStatus();

    // Intentar restaurar token al cargar la página - múltiples intentos
    let intentos = 0;
    const maxIntentos = 10; // Aumentado a 10 intentos

    const intentarRestaurar = setInterval(() => {
        intentos++;
        console.log(`🔄 Intento ${intentos} de restaurar token...`);

        if (window.GoogleCalendar && window.GoogleCalendar.isReady()) {
            console.log('✅ Google Calendar API está lista, restaurando token...');
            const restaurado = window.GoogleCalendar.restoreToken();

            clearInterval(intentarRestaurar);
            console.log(restaurado ? '✅ Token restaurado' : '⚠️ No hay token guardado');
            updateCalendarLoadingStatus(true);
        } else {
            console.log('⏳ Esperando que Google Calendar API esté lista...');
            updateCalendarLoadingStatus();
        }

        if (intentos >= maxIntentos) {
            clearInterval(intentarRestaurar);
            console.log('⏹️ Alcanzado máximo de intentos para restaurar token');
            updateCalendarLoadingStatus(true);
        }
    }, 1000); // Aumentado a 1 segundo entre intentos

    // Check status periodically
    setInterval(() => {
        if (window.GoogleCalendar && window.GoogleCalendar.isReady()) {
            window.GoogleCalendar.updateAuthStatus();
        }
    }, 3000);
}

// Actualizar estado de carga de Google Calendar
function updateCalendarLoadingStatus(loaded = false) {
    const statusElement = document.getElementById('googleCalendarStatus');
    if (!statusElement) return;

    if (!loaded && (!window.GoogleCalendar || !window.GoogleCalendar.isReady())) {
        statusElement.innerHTML = `
            <i class="fas fa-spinner fa-spin" style="color: #3498db;"></i>
            Cargando API...
        `;
        statusElement.className = 'calendar-status loading';
    }
}

// Load pacientes
async function loadPacientes() {
    try {
        const querySnapshot = await getDocs(collection(db, 'pacientes'));
        allPacientes = [];

        querySnapshot.forEach((doc) => {
            allPacientes.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Ya no necesitamos populatePacienteSelect porque usamos el modal
    } catch (error) {
        console.error('Error loading pacientes:', error);
    }
}

// Load usuarios (cirujanos)
async function loadUsuarios() {
    try {
        const querySnapshot = await getDocs(collection(db, 'usuarios'));
        allUsuarios = [];

        querySnapshot.forEach((doc) => {
            allUsuarios.push({
                id: doc.id,
                ...doc.data()
            });
        });

        populateCirujanoSelect();
    } catch (error) {
        console.error('Error loading usuarios:', error);
    }
}

function populateCirujanoSelect() {
    const select = document.getElementById('cirujanoId');
    select.innerHTML = '<option value="">Seleccionar cirujano</option>';

    // Filtrar SOLO cirujanos (que tengan "Cirujano" o "Director Médico" en su especialidad)
    const cirujanos = allUsuarios.filter(usuario => {
        const especialidad = usuario.especialidad || usuario.rol || usuario.tipoUsuario || '';
        const especialidadLower = especialidad.toLowerCase();
        return especialidadLower.includes('cirujano') || especialidadLower.includes('director médico') || especialidadLower.includes('director medico');
    });

    cirujanos.forEach(usuario => {
        const especialidad = usuario.especialidad || usuario.rol || usuario.tipoUsuario || 'Médico';
        select.innerHTML += `<option value="${usuario.id}">${usuario.nombre} - ${especialidad}</option>`;
    });

    // Si no hay cirujanos registrados, mostrar mensaje
    if (cirujanos.length === 0) {
        select.innerHTML += '<option value="" disabled>No hay cirujanos registrados</option>';
    }
}

// Load cirugias
async function loadCirugias() {
    try {
        const querySnapshot = await getDocs(collection(db, 'cirugias'));
        allCirugias = [];

        querySnapshot.forEach((doc) => {
            allCirugias.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Update states automatically
        await updateCirugiasStates();

        allCirugias.sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));

        filteredCirugias = [...allCirugias];
        updateStats();
        renderCirugias();
    } catch (error) {
        console.error('Error loading cirugias:', error);
    }
}

// Auto update states based on date/time
async function updateCirugiasStates() {
    const now = new Date();
    let updated = false;

    for (const cirugia of allCirugias) {
        const cirugiaDateTime = new Date(cirugia.fechaHora);
        const duracionMs = (cirugia.duracion || 2) * 60 * 60 * 1000;
        const endTime = new Date(cirugiaDateTime.getTime() + duracionMs);

        let newEstado = cirugia.estado;

        // Si la cirugía está programada y ya llegó la hora
        if (cirugia.estado === 'Programada' && now >= cirugiaDateTime && now < endTime) {
            newEstado = 'En Proceso';
        }
        // Si la cirugía está en proceso y ya pasó el tiempo estimado
        else if ((cirugia.estado === 'En Proceso' || cirugia.estado === 'Programada') && now >= endTime) {
            newEstado = 'Realizada';
        }

        // Update if changed
        if (newEstado !== cirugia.estado) {
            try {
                await updateDoc(doc(db, 'cirugias', cirugia.id), { estado: newEstado });
                cirugia.estado = newEstado;
                updated = true;
            } catch (error) {
                console.error('Error updating cirugia state:', error);
            }
        }
    }

    return updated;
}

// Start auto update every minute
function startAutoUpdateStates() {
    setInterval(async () => {
        const updated = await updateCirugiasStates();
        if (updated) {
            updateStats();
            renderCirugias();
            if (currentView === 'calendar') {
                renderCalendar();
            }
        }
    }, 60000); // Check every minute
}

function updateStats() {
    const programadas = allCirugias.filter(c => c.estado === 'Programada').length;
    const enProceso = allCirugias.filter(c => c.estado === 'En Proceso').length;
    const realizadas = allCirugias.filter(c => c.estado === 'Realizada').length;

    document.getElementById('totalProgramadas').textContent = programadas;
    document.getElementById('totalEnProceso').textContent = enProceso;
    document.getElementById('totalRealizadas').textContent = realizadas;
}

function renderCirugias() {
    const tbody = document.getElementById('cirugiasTableBody');
    const resultsCount = document.getElementById('resultsCount');

    resultsCount.textContent = `${filteredCirugias.length} cirugía${filteredCirugias.length !== 1 ? 's' : ''}`;

    if (filteredCirugias.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fas fa-procedures"></i></div>
                        <h3 class="empty-title">No se encontraron cirugías</h3>
                        <p class="empty-message">Programa la primera cirugía haciendo clic en "Nueva Cirugía"</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredCirugias.map(cirugia => {
        const paciente = allPacientes.find(p => p.id === cirugia.pacienteId);
        const cirujano = allUsuarios.find(u => u.id === cirugia.cirujanoId);

        const pacienteNombre = paciente ? paciente.nombre : 'Paciente no encontrado';
        const pacienteFoto = paciente ? paciente.foto : '';
        const cirujanoNombre = cirujano ? cirujano.nombre : 'No asignado';

        const avatarHtml = pacienteFoto
            ? `<img src="${pacienteFoto}" alt="${pacienteNombre}">`
            : `<i class="fas fa-user"></i>`;

        const estadoClass = cirugia.estado.toLowerCase().replace(' ', '-');

        return `
            <tr>
                <td>
                    <div class="patient-cell">
                        <div class="patient-avatar">${avatarHtml}</div>
                        <div class="patient-info">
                            <h4>${pacienteNombre}</h4>
                            <p>${paciente ? paciente.cedula : ''}</p>
                        </div>
                    </div>
                </td>
                <td>${cirugia.tipoCirugia}</td>
                <td>${formatDateTime(cirugia.fechaHora)}</td>
                <td>${cirujanoNombre}</td>
                <td>
                    <span class="estado-badge ${estadoClass}">
                        <i class="fas fa-circle" style="font-size: 8px;"></i>
                        ${cirugia.estado}
                    </span>
                </td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-action btn-view" onclick="viewCirugia('${cirugia.id}')" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${cirugia.estado === 'Realizada' && !cirugia.resultadoPostQuirurgico ? `
                        <button class="btn-action btn-complete" onclick="registrarResultadoCirugia('${cirugia.id}')" title="Registrar resultado post-quirúrgico" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);">
                            <i class="fas fa-notes-medical"></i>
                        </button>
                        ` : cirugia.estado !== 'Realizada' ? `
                        <button class="btn-action btn-complete" onclick="markAsCompleted('${cirugia.id}')" title="Marcar como realizada">
                            <i class="fas fa-check"></i>
                        </button>
                        ` : ''}
                        <button class="btn-action btn-edit" onclick="editCirugia('${cirugia.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="deleteCirugia('${cirugia.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}


// Search and filter
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const filterTipoCirugia = document.getElementById('filterTipoCirugia');
const filterEstado = document.getElementById('filterEstado');

searchInput.addEventListener('input', (e) => {
    if (e.target.value) {
        clearSearchBtn.classList.add('active');
    } else {
        clearSearchBtn.classList.remove('active');
    }
    applyFilters();
});

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.classList.remove('active');
    applyFilters();
});

filterTipoCirugia.addEventListener('input', applyFilters);
filterEstado.addEventListener('change', applyFilters);

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const tipoCirugiaFilter = filterTipoCirugia.value.toLowerCase();
    const estadoFilter = filterEstado.value;

    filteredCirugias = allCirugias.filter(cirugia => {
        const paciente = allPacientes.find(p => p.id === cirugia.pacienteId);
        const pacienteNombre = paciente ? paciente.nombre.toLowerCase() : '';

        const matchSearch = !searchTerm || pacienteNombre.includes(searchTerm);

        const matchTipoCirugia = !tipoCirugiaFilter || cirugia.tipoCirugia.toLowerCase().includes(tipoCirugiaFilter);

        const matchEstado = !estadoFilter || cirugia.estado === estadoFilter;

        return matchSearch && matchTipoCirugia && matchEstado;
    });

    renderCirugias();

    // Update calendar if in calendar view
    if (currentView === 'calendar') {
        renderCalendar();
    }
}

// Toggle view
document.getElementById('toggleView').addEventListener('click', () => {
    const listView = document.getElementById('listView');
    const calendarView = document.getElementById('calendarView');
    const toggleBtn = document.getElementById('toggleView');

    if (currentView === 'list') {
        currentView = 'calendar';
        listView.style.display = 'none';
        calendarView.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-list"></i> Vista Lista';
        renderCalendar();
    } else {
        currentView = 'list';
        listView.style.display = 'block';
        calendarView.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-calendar-alt"></i> Vista Calendario';
    }
});

// Calendar functions
function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const title = document.getElementById('calendarTitle');

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    title.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const prevLastDay = new Date(currentYear, currentMonth, 0);

    const firstDayIndex = firstDay.getDay();
    const lastDayDate = lastDay.getDate();
    const prevLastDayDate = prevLastDay.getDate();

    let html = '';

    // Day headers
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    dayNames.forEach(day => {
        html += `<div class="calendar-day-header">${day}</div>`;
    });

    // Previous month days
    for (let i = firstDayIndex; i > 0; i--) {
        html += `<div class="calendar-day other-month">
            <div class="day-number">${prevLastDayDate - i + 1}</div>
        </div>`;
    }

    // Current month days
    const today = new Date();
    for (let day = 1; day <= lastDayDate; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = date.toDateString() === today.toDateString();

        const dayCirugias = allCirugias.filter(c => {
            // Extraer solo la fecha sin conversión de zona horaria
            const cirugiaDate = c.fechaHora.split('T')[0];
            return cirugiaDate === dateStr;
        });

        html += `<div class="calendar-day ${isToday ? 'today' : ''}">
            <div class="day-number">${day}</div>
            <div class="day-cirugias">
                ${dayCirugias.map(c => {
            const paciente = allPacientes.find(p => p.id === c.pacienteId);
            const estadoClass = c.estado.toLowerCase().replace(' ', '-');
            const time = new Date(c.fechaHora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            return `<div class="cirugia-item ${estadoClass}" onclick="viewCirugia('${c.id}')" title="${c.tipoCirugia}">
                        ${time} - ${paciente ? paciente.nombre.split(' ')[0] : 'N/A'}
                    </div>`;
        }).join('')}
            </div>
        </div>`;
    }

    // Next month days
    const remainingDays = 42 - (firstDayIndex + lastDayDate);
    for (let day = 1; day <= remainingDays; day++) {
        html += `<div class="calendar-day other-month">
            <div class="day-number">${day}</div>
        </div>`;
    }

    grid.innerHTML = html;
}

document.getElementById('prevMonth').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
});

document.getElementById('nextMonth').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
});

// Open add cirugia modal
document.getElementById('addCirugiaBtn').addEventListener('click', () => {
    editingCirugiaId = null;
    document.getElementById('modalTitle').textContent = 'Nueva Cirugía';
    document.getElementById('submitBtnText').textContent = 'Programar Cirugía';
    document.getElementById('cirugiaForm').reset();
    document.getElementById('estado').value = 'Programada';
    
    // Limpiar campos de paciente
    document.getElementById('pacienteNombre').value = '';
    document.getElementById('pacienteId').value = '';
    
    // Habilitar validación del checklist (agregar required)
    enableChecklistValidation();
    
    document.getElementById('cirugiaModal').classList.add('active');

    // Resetear checklist y progreso
    updateChecklistProgress();
});

// Save cirugia
document.getElementById('cirugiaForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const pacienteId = document.getElementById('pacienteId').value;
    const tipoCirugia = document.getElementById('tipoCirugia').value;
    const cirujanoId = document.getElementById('cirujanoId').value;
    const lugarCirugia = document.getElementById('lugarCirugia').value;
    const fechaCirugia = document.getElementById('fechaCirugia').value;
    const hora = document.getElementById('horaSelect').value;
    const minuto = document.getElementById('minutoSelect').value;
    const periodo = document.getElementById('periodoSelect').value;
    const duracion = document.getElementById('duracion').value;
    const estado = document.getElementById('estado').value;

    if (!pacienteId || !tipoCirugia || !cirujanoId || !lugarCirugia || !fechaCirugia || !hora || !minuto || !periodo || !duracion) {
        showErrorModal('Por favor, completa todos los campos obligatorios');
        return;
    }

    // Validar que todos los items del checklist estén marcados como SÍ SOLO al crear una nueva cirugía
    if (!editingCirugiaId) {
        const checklistItemNames = [
            'checkValoracion',
            'checkHistoriaClinica',
            'checkExamenes',
            'checkRevisionExamenes',
            'checkPlanTrabajo',
            'checkPagoCirugia',
            'checkProgramacionCirugia',
            'checkFormulaMedica',
            'checkKitCancelado',
            'checkKitEntregado',
            'checkAsesoriaPreQuirurgica',
            'checkRecomendaciones',
            'checkDatosClinica',
            'checkProtesis',
            'checkPoliza',
            'checkPrimerMasaje',
            'checkCitaControlPrimera'
        ];

        const allMarkedYes = checklistItemNames.every(itemName => {
            const radioSi = document.querySelector(`input[name="${itemName}"][value="si"]`);
            return radioSi && radioSi.checked;
        });

        if (!allMarkedYes) {
            showErrorModal('⚠️ AUTORIZACIÓN REQUERIDA\n\nTodos los items del Check List de Cirugía deben estar marcados como SÍ para autorizar la cirugía.\n\nPor favor, verifica que todos los requisitos hayan sido completados.');
            return;
        }
    }

    // Convertir hora 12h a 24h
    let hora24 = parseInt(hora);
    if (periodo === 'PM' && hora24 !== 12) {
        hora24 += 12;
    } else if (periodo === 'AM' && hora24 === 12) {
        hora24 = 0;
    }

    const horaCirugia = `${String(hora24).padStart(2, '0')}:${minuto}`;
    const fechaHora = `${fechaCirugia}T${horaCirugia}`;

    showLoadingModal(editingCirugiaId ? 'Actualizando cirugía y calendario...' : 'Programando cirugía y creando evento en calendario...');

    try {
        const cirugiaData = {
            pacienteId,
            tipoCirugia,
            cirujanoId,
            lugarCirugia,
            fechaHora,
            duracion: parseFloat(duracion),
            estado,
            anestesiologo: document.getElementById('anestesiologo').value.trim(),
            instrumentista: document.getElementById('instrumentista').value.trim(),
            enfermera: document.getElementById('enfermera').value.trim(),
            cirujanoAsistente: document.getElementById('cirujanoAsistente').value.trim(),
            otrosMiembros: document.getElementById('otrosMiembros').value.trim(),
            descripcion: document.getElementById('descripcion').value.trim(),
            // Campos CRM
            sensacionPaciente: document.getElementById('sensacionPaciente').value,
            nivelIntencion: document.getElementById('nivelIntencion').value,
            resultadoEsperado: document.getElementById('resultadoEsperado').value,
            asistencia: document.getElementById('asistencia').value,
            observacionesSeguimiento: document.getElementById('observacionesSeguimiento').value.trim(),
            // Check List de Autorización con Realizado Por
            checklistAutorizacion: {
                valoracion: document.querySelector('input[name="checkValoracion"][value="si"]')?.checked || false,
                valoracionRealizadoPor: document.getElementById('realizadoPorValoracion')?.value.trim() || '',
                historiaClinica: document.querySelector('input[name="checkHistoriaClinica"][value="si"]')?.checked || false,
                historiaClinicaRealizadoPor: document.getElementById('realizadoPorHistoriaClinica')?.value.trim() || '',
                examenes: document.querySelector('input[name="checkExamenes"][value="si"]')?.checked || false,
                examenesRealizadoPor: document.getElementById('realizadoPorExamenes')?.value.trim() || '',
                revisionExamenes: document.querySelector('input[name="checkRevisionExamenes"][value="si"]')?.checked || false,
                revisionExamenesRealizadoPor: document.getElementById('realizadoPorRevisionExamenes')?.value.trim() || '',
                planTrabajo: document.querySelector('input[name="checkPlanTrabajo"][value="si"]')?.checked || false,
                planTrabajoRealizadoPor: document.getElementById('realizadoPorPlanTrabajo')?.value.trim() || '',
                pagoCirugia: document.querySelector('input[name="checkPagoCirugia"][value="si"]')?.checked || false,
                pagoCirugiaRealizadoPor: document.getElementById('realizadoPorPagoCirugia')?.value.trim() || '',
                programacionCirugia: document.querySelector('input[name="checkProgramacionCirugia"][value="si"]')?.checked || false,
                programacionCirugiaRealizadoPor: document.getElementById('realizadoPorProgramacionCirugia')?.value.trim() || '',
                formulaMedica: document.querySelector('input[name="checkFormulaMedica"][value="si"]')?.checked || false,
                formulaMedicaRealizadoPor: document.getElementById('realizadoPorFormulaMedica')?.value.trim() || '',
                kitCancelado: document.querySelector('input[name="checkKitCancelado"][value="si"]')?.checked || false,
                kitCanceladoRealizadoPor: document.getElementById('realizadoPorKitCancelado')?.value.trim() || '',
                kitEntregado: document.querySelector('input[name="checkKitEntregado"][value="si"]')?.checked || false,
                kitEntregadoRealizadoPor: document.getElementById('realizadoPorKitEntregado')?.value.trim() || '',
                asesoriaPreQuirurgica: document.querySelector('input[name="checkAsesoriaPreQuirurgica"][value="si"]')?.checked || false,
                asesoriaPreQuirurgicaRealizadoPor: document.getElementById('realizadoPorAsesoriaPreQuirurgica')?.value.trim() || '',
                recomendaciones: document.querySelector('input[name="checkRecomendaciones"][value="si"]')?.checked || false,
                recomendacionesRealizadoPor: document.getElementById('realizadoPorRecomendaciones')?.value.trim() || '',
                datosClinica: document.querySelector('input[name="checkDatosClinica"][value="si"]')?.checked || false,
                datosClinicaRealizadoPor: document.getElementById('realizadoPorDatosClinica')?.value.trim() || '',
                protesis: document.querySelector('input[name="checkProtesis"][value="si"]')?.checked || false,
                protesisRealizadoPor: document.getElementById('realizadoPorProtesis')?.value.trim() || '',
                poliza: document.querySelector('input[name="checkPoliza"][value="si"]')?.checked || false,
                polizaRealizadoPor: document.getElementById('realizadoPorPoliza')?.value.trim() || '',
                primerMasaje: document.querySelector('input[name="checkPrimerMasaje"][value="si"]')?.checked || false,
                primerMasajeRealizadoPor: document.getElementById('realizadoPorPrimerMasaje')?.value.trim() || '',
                citaControlPrimera: document.querySelector('input[name="checkCitaControlPrimera"][value="si"]')?.checked || false,
                citaControlPrimeraRealizadoPor: document.getElementById('realizadoPorCitaControlPrimera')?.value.trim() || '',
                fechaAutorizacion: new Date().toISOString(),
                // Campos de firmas
                firmaResponsable: document.getElementById('firmaResponsable')?.value.trim() || '',
                revisadoPor: document.getElementById('revisadoPor')?.value.trim() || '',
                aprobadoPor: document.getElementById('aprobadoPor')?.value.trim() || ''
            },
            fechaCreacion: editingCirugiaId ? allCirugias.find(c => c.id === editingCirugiaId).fechaCreacion : new Date().toISOString()
        };

        let cirugiaId;
        if (editingCirugiaId) {
            await updateDoc(doc(db, 'cirugias', editingCirugiaId), cirugiaData);
            cirugiaId = editingCirugiaId;
        } else {
            const cirugiaRef = await addDoc(collection(db, 'cirugias'), cirugiaData);
            cirugiaId = cirugiaRef.id;
        }

        // Obtener datos del paciente y cirujano para el evento
        const paciente = allPacientes.find(p => p.id === pacienteId);
        const cirujano = allUsuarios.find(u => u.id === cirujanoId);

        // Gestionar evento en Google Calendar automáticamente si está autorizado
        let calendarSuccess = false;
        let calendarAction = '';
        try {
            if (window.GoogleCalendar && window.GoogleCalendar.isReady() && window.GoogleCalendar.isAuthorized()) {
                const startDateTime = window.GoogleCalendar.formatDateTimeForCalendar(fechaCirugia, horaCirugia);
                const duracionHoras = parseFloat(duracion);
                const duracionMinutos = Math.round(duracionHoras * 60);
                const endDateTime = window.GoogleCalendar.calculateEndTime(startDateTime, duracionMinutos);

                // Construir descripción detallada
                let descripcionCompleta = `Paciente: ${paciente ? paciente.nombre : 'N/A'}`;
                if (paciente && paciente.cedula) descripcionCompleta += `\nCédula: ${paciente.cedula}`;
                if (paciente && paciente.telefono) descripcionCompleta += `\nTeléfono: ${paciente.telefono}`;
                descripcionCompleta += `\n\nTipo de Cirugía: ${tipoCirugia}`;
                descripcionCompleta += `\nLugar: ${lugarCirugia}`;
                descripcionCompleta += `\nCirujano Principal: ${cirujano ? cirujano.nombre : 'No asignado'}`;
                descripcionCompleta += `\nDuración Estimada: ${duracion} horas`;

                if (cirugiaData.anestesiologo) descripcionCompleta += `\n\nEquipo Quirúrgico:\nAnestesiólogo: ${cirugiaData.anestesiologo}`;
                if (cirugiaData.instrumentista) descripcionCompleta += `\nInstrumentista: ${cirugiaData.instrumentista}`;
                if (cirugiaData.enfermera) descripcionCompleta += `\nEnfermera Circulante: ${cirugiaData.enfermera}`;
                if (cirugiaData.cirujanoAsistente) descripcionCompleta += `\nCirujano Asistente: ${cirugiaData.cirujanoAsistente}`;
                if (cirugiaData.descripcion) descripcionCompleta += `\n\nNotas: ${cirugiaData.descripcion}`;

                // Preparar lista de asistentes
                const attendees = [];
                if (paciente && paciente.email) attendees.push({ email: paciente.email });
                if (cirujano && cirujano.email) attendees.push({ email: cirujano.email });

                // Si estamos editando y ya existe un evento de Google Calendar, actualizarlo
                if (editingCirugiaId) {
                    const cirugiaExistente = allCirugias.find(c => c.id === editingCirugiaId);
                    
                    if (cirugiaExistente && cirugiaExistente.googleCalendarEventId) {
                        // ACTUALIZAR evento existente
                        const updates = {
                            summary: `Cirugía: ${tipoCirugia} - ${paciente ? paciente.nombre : 'Paciente'}`,
                            description: descripcionCompleta,
                            start: {
                                dateTime: startDateTime,
                                timeZone: 'America/Bogota',
                            },
                            end: {
                                dateTime: endDateTime,
                                timeZone: 'America/Bogota',
                            },
                            attendees: attendees
                        };

                        await window.GoogleCalendar.updateCalendarEvent(cirugiaExistente.googleCalendarEventId, updates);
                        console.log('✅ Evento actualizado en Google Calendar');
                        calendarSuccess = true;
                        calendarAction = 'actualizado';
                    } else {
                        // No tiene evento previo, crear uno nuevo
                        const eventDetails = {
                            summary: `Cirugía: ${tipoCirugia} - ${paciente ? paciente.nombre : 'Paciente'}`,
                            description: descripcionCompleta,
                            startDateTime: startDateTime,
                            endDateTime: endDateTime,
                            attendees: attendees
                        };

                        const calendarEvent = await window.GoogleCalendar.createCalendarEvent(eventDetails);

                        // Guardar el ID del evento de Google Calendar en Firebase
                        await updateDoc(doc(db, 'cirugias', cirugiaId), {
                            googleCalendarEventId: calendarEvent.id
                        });

                        console.log('✅ Evento creado en Google Calendar');
                        calendarSuccess = true;
                        calendarAction = 'creado';
                    }
                } else {
                    // CREAR nuevo evento para cirugía nueva
                    const eventDetails = {
                        summary: `Cirugía: ${tipoCirugia} - ${paciente ? paciente.nombre : 'Paciente'}`,
                        description: descripcionCompleta,
                        startDateTime: startDateTime,
                        endDateTime: endDateTime,
                        attendees: attendees
                    };

                    const calendarEvent = await window.GoogleCalendar.createCalendarEvent(eventDetails);

                    // Guardar el ID del evento de Google Calendar en Firebase
                    await updateDoc(doc(db, 'cirugias', cirugiaId), {
                        googleCalendarEventId: calendarEvent.id
                    });

                    console.log('✅ Evento creado en Google Calendar');
                    calendarSuccess = true;
                    calendarAction = 'creado';
                }
            } else {
                console.log('⚠️ Google Calendar no está autorizado. La cirugía se guardó pero no se agregó al calendario.');
            }
        } catch (calendarError) {
            console.error('⚠️ Error al gestionar evento en calendario:', calendarError);
            // No bloqueamos el flujo si falla el calendario
        }

        document.getElementById('cirugiaModal').classList.remove('active');
        hideLoadingModal();

        // Mostrar resultado según el calendario
        let mensaje = editingCirugiaId ? '✅ Cirugía actualizada exitosamente' : '✅ Cirugía programada exitosamente';

        if (calendarSuccess) {
            if (calendarAction === 'actualizado') {
                mensaje += ' y evento actualizado en Google Calendar';
            } else {
                mensaje += ' y agregada a Google Calendar';
            }
        } else if (window.GoogleCalendar && window.GoogleCalendar.isReady() && !window.GoogleCalendar.isAuthorized()) {
            mensaje += '. ⚠️ Para agregar al calendario, primero debes conectar Google Calendar';
        }

        showSuccessModal(mensaje);

        await loadCirugias();
        if (currentView === 'calendar') {
            renderCalendar();
        }
    } catch (error) {
        hideLoadingModal();
        console.error('Error saving cirugia:', error);
        showErrorModal('Error al guardar la cirugía');
    }
});


// Edit cirugia
window.editCirugia = function (cirugiaId) {
    const cirugia = allCirugias.find(c => c.id === cirugiaId);
    if (!cirugia) return;

    editingCirugiaId = cirugiaId;
    document.getElementById('modalTitle').textContent = 'Editar Cirugía';
    document.getElementById('submitBtnText').textContent = 'Guardar Cambios';
    
    // Deshabilitar validación del checklist (quitar required)
    disableChecklistValidation();

    // Actualizar campos de paciente
    const paciente = allPacientes.find(p => p.id === cirugia.pacienteId);
    if (paciente) {
        document.getElementById('pacienteNombre').value = paciente.nombre || 'Sin nombre';
    }
    document.getElementById('pacienteId').value = cirugia.pacienteId;
    
    document.getElementById('tipoCirugia').value = cirugia.tipoCirugia;
    document.getElementById('cirujanoId').value = cirugia.cirujanoId;
    document.getElementById('lugarCirugia').value = cirugia.lugarCirugia || '';

    // Separar fecha y hora
    if (cirugia.fechaHora) {
        const [fecha, hora] = cirugia.fechaHora.split('T');
        document.getElementById('fechaCirugia').value = fecha;

        // Convertir hora 24h a 12h con AM/PM
        if (hora) {
            const [horaStr, minutoStr] = hora.split(':');
            let hora24 = parseInt(horaStr);
            const minuto = minutoStr || '00';

            let periodo = 'AM';
            let hora12 = hora24;

            if (hora24 >= 12) {
                periodo = 'PM';
                if (hora24 > 12) {
                    hora12 = hora24 - 12;
                }
            }
            if (hora24 === 0) {
                hora12 = 12;
            }

            document.getElementById('horaSelect').value = String(hora12).padStart(2, '0');
            document.getElementById('minutoSelect').value = minuto;
            document.getElementById('periodoSelect').value = periodo;
        }
    }

    document.getElementById('duracion').value = cirugia.duracion;
    document.getElementById('estado').value = cirugia.estado;
    document.getElementById('anestesiologo').value = cirugia.anestesiologo || '';
    document.getElementById('instrumentista').value = cirugia.instrumentista || '';
    document.getElementById('enfermera').value = cirugia.enfermera || '';
    document.getElementById('cirujanoAsistente').value = cirugia.cirujanoAsistente || '';
    document.getElementById('otrosMiembros').value = cirugia.otrosMiembros || '';
    document.getElementById('descripcion').value = cirugia.descripcion || '';

    // Campos CRM
    document.getElementById('sensacionPaciente').value = cirugia.sensacionPaciente || '';
    document.getElementById('nivelIntencion').value = cirugia.nivelIntencion || '';
    document.getElementById('resultadoEsperado').value = cirugia.resultadoEsperado || '';
    document.getElementById('asistencia').value = cirugia.asistencia || '';
    document.getElementById('observacionesSeguimiento').value = cirugia.observacionesSeguimiento || '';

    document.getElementById('cirugiaModal').classList.add('active');
};

// View cirugia
window.viewCirugia = function (cirugiaId) {
    const cirugia = allCirugias.find(c => c.id === cirugiaId);
    if (!cirugia) return;

    const paciente = allPacientes.find(p => p.id === cirugia.pacienteId);
    const cirujano = allUsuarios.find(u => u.id === cirugia.cirujanoId);

    const estadoClass = cirugia.estado.toLowerCase().replace(' ', '-');

    const content = document.getElementById('viewCirugiaContent');
    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
            <span class="estado-badge ${estadoClass}" style="font-size: 16px; padding: 10px 20px;">
                <i class="fas fa-circle" style="font-size: 10px;"></i>
                ${cirugia.estado}
            </span>
        </div>
        
        <div class="form-section">
            <h3 class="section-title"><i class="fas fa-info-circle"></i> Información General</h3>
            <div class="form-grid">
                <div>
                    <div class="form-label">Paciente</div>
                    <div style="font-size: 15px; color: #2B3545; font-weight: 500;">${paciente ? paciente.nombre : 'N/A'}</div>
                </div>
                <div>
                    <div class="form-label">Tipo de Cirugía</div>
                    <div style="font-size: 15px; color: #2B3545; font-weight: 500;">${cirugia.tipoCirugia}</div>
                </div>
                <div>
                    <div class="form-label">Lugar de la Cirugía</div>
                    <div style="font-size: 15px; color: #2B3545; font-weight: 500;">${cirugia.lugarCirugia || 'No especificado'}</div>
                </div>
                <div>
                    <div class="form-label">Fecha y Hora</div>
                    <div style="font-size: 15px; color: #2B3545; font-weight: 500;">${formatDateTime(cirugia.fechaHora)}</div>
                </div>
                <div>
                    <div class="form-label">Duración Estimada</div>
                    <div style="font-size: 15px; color: #2B3545; font-weight: 500;">${cirugia.duracion} hora${cirugia.duracion > 1 ? 's' : ''}</div>
                </div>
                <div>
                    <div class="form-label">Cirujano Principal</div>
                    <div style="font-size: 15px; color: #2B3545; font-weight: 500;">${cirujano ? cirujano.nombre : 'No asignado'}</div>
                </div>
            </div>
        </div>
        
        ${cirugia.anestesiologo || cirugia.instrumentista || cirugia.enfermera || cirugia.cirujanoAsistente || cirugia.otrosMiembros ? `
        <div class="form-section">
            <h3 class="section-title"><i class="fas fa-users-cog"></i> Equipo Quirúrgico</h3>
            <div class="form-grid">
                ${cirugia.anestesiologo ? `
                <div>
                    <div class="form-label">Anestesiólogo</div>
                    <div style="font-size: 15px; color: #2B3545; font-weight: 500;">${cirugia.anestesiologo}</div>
                </div>
                ` : ''}
                ${cirugia.instrumentista ? `
                <div>
                    <div class="form-label">Instrumentista</div>
                    <div style="font-size: 15px; color: #2B3545; font-weight: 500;">${cirugia.instrumentista}</div>
                </div>
                ` : ''}
                ${cirugia.enfermera ? `
                <div>
                    <div class="form-label">Enfermera Circulante</div>
                    <div style="font-size: 15px; color: #2B3545; font-weight: 500;">${cirugia.enfermera}</div>
                </div>
                ` : ''}
                ${cirugia.cirujanoAsistente ? `
                <div>
                    <div class="form-label">Cirujano Asistente</div>
                    <div style="font-size: 15px; color: #2B3545; font-weight: 500;">${cirugia.cirujanoAsistente}</div>
                </div>
                ` : ''}
            </div>
            ${cirugia.otrosMiembros ? `
            <div style="margin-top: 15px;">
                <div class="form-label">Otros Miembros del Equipo</div>
                <div style="font-size: 15px; color: #2B3545; font-weight: 500; line-height: 1.6;">${cirugia.otrosMiembros}</div>
            </div>
            ` : ''}
        </div>
        ` : ''}
        
        ${cirugia.descripcion ? `
        <div class="form-section">
            <h3 class="section-title"><i class="fas fa-notes-medical"></i> Descripción y Notas</h3>
            <div style="font-size: 15px; color: #2B3545; font-weight: 500; line-height: 1.6;">${cirugia.descripcion}</div>
        </div>
        ` : ''}
        
        ${cirugia.sensacionPaciente || cirugia.nivelIntencion || cirugia.resultadoEsperado || cirugia.asistencia || cirugia.observacionesSeguimiento ? `
        <div class="form-section">
            <h3 class="section-title"><i class="fas fa-chart-line"></i> Seguimiento y Evaluación del Paciente</h3>
            <div class="form-grid">
                ${cirugia.sensacionPaciente ? `
                <div>
                    <div class="form-label">Sensación del Paciente</div>
                    <div style="font-size: 15px; color: #2B3545; font-weight: 500;">${cirugia.sensacionPaciente}</div>
                </div>
                ` : ''}
                ${cirugia.nivelIntencion ? `
                <div>
                    <div class="form-label">Nivel de Intención</div>
                    <div style="font-size: 15px; color: #2B3545; font-weight: 500;">${cirugia.nivelIntencion}</div>
                </div>
                ` : ''}
                ${cirugia.resultadoEsperado ? `
                <div>
                    <div class="form-label">Resultado Médico Esperado</div>
                    <div style="font-size: 15px; color: #2B3545; font-weight: 500;">${cirugia.resultadoEsperado}</div>
                </div>
                ` : ''}
                ${cirugia.asistencia ? `
                <div>
                    <div class="form-label">Asistencia</div>
                    <div style="font-size: 15px; color: #2B3545; font-weight: 500;">${cirugia.asistencia}</div>
                </div>
                ` : ''}
            </div>
            ${cirugia.observacionesSeguimiento ? `
            <div style="margin-top: 15px;">
                <div class="form-label">Observaciones de Seguimiento</div>
                <div style="font-size: 15px; color: #2B3545; font-weight: 500; line-height: 1.6;">${cirugia.observacionesSeguimiento}</div>
            </div>
            ` : ''}
        </div>
        ` : ''}
        
        ${cirugia.checklistAutorizacion ? `
        <div class="form-section">
            <h3 class="section-title"><i class="fas fa-clipboard-check"></i> Check List Cirugía - Autorización</h3>
            <div style="display: grid; grid-template-columns: 1fr; gap: 0; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                ${Object.entries({
        'VALORACIÓN': 'valoracion',
        'HISTORIA CLÍNICA': 'historiaClinica',
        'EXÁMENES': 'examenes',
        'REVISIÓN DE EXÁMENES': 'revisionExamenes',
        'PLAN DE TRABAJO': 'planTrabajo',
        'PAGO CIRUGÍA': 'pagoCirugia',
        'PROGRAMACIÓN CIRUGÍA': 'programacionCirugia',
        'FÓRMULA MÉDICA': 'formulaMedica',
        'KIT CANCELADO': 'kitCancelado',
        'KIT ENTREGADO': 'kitEntregado',
        'ASESORÍA PRE QUIRÚRGICA': 'asesoriaPreQuirurgica',
        'RECOMENDACIONES': 'recomendaciones',
        'DATOS DE CLÍNICA': 'datosClinica',
        'PRÓTESIS': 'protesis',
        'PÓLIZA': 'poliza',
        'PRIMER MASAJE POSQUIRÚRGICO': 'primerMasaje',
        'CITA DE CONTROL PRIMERA VEZ': 'citaControlPrimera'
    }).map(([label, key]) => {
        const isChecked = cirugia.checklistAutorizacion[key];
        const realizadoPor = cirugia.checklistAutorizacion[key + 'RealizadoPor'];
        const bgColor = isChecked ? '#f0f8f5' : '#fff5f5';
        const iconColor = isChecked ? '#28a745' : '#dc3545';
        const icon = isChecked ? 'fa-check' : 'fa-times';

        return `
                    <div style="display: grid; grid-template-columns: 1fr 100px 180px; gap: 10px; padding: 10px 15px; background: ${bgColor}; border-bottom: 1px solid #e0e0e0; align-items: center;">
                        <div style="font-weight: 600; font-size: 13px; color: ${iconColor}; display: flex; align-items: center; gap: 8px;">
                            <i class="fas ${icon}"></i> ${label}
                        </div>
                        <div style="font-size: 12px; font-weight: 700; color: ${iconColor}; text-align: center;">
                            ${isChecked ? 'SÍ' : 'NO'}
                        </div>
                        <div style="font-size: 12px; color: #6c757d; font-style: italic; border-left: 1px solid #dee2e6; padding-left: 10px;">
                            ${realizadoPor ? `<i class="fas fa-user-edit" style="margin-right: 5px;"></i>${realizadoPor}` : '<span style="opacity: 0.5;">No especificado</span>'}
                        </div>
                    </div>`;
    }).join('')}
            </div>
            
            <div style="margin-top: 25px; padding: 20px; background: #f8f9fa; border-radius: 12px; border: 2px solid #e0e0e0;">
                <h4 style="font-size: 14px; font-weight: 600; color: #2B3545; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e0e0e0;">
                    <i class="fas fa-signature" style="color: #D11A5C; margin-right: 8px;"></i>Autorización y Firmas
                </h4>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                    <div>
                        <div style="font-size: 11px; font-weight: 700; color: #D11A5C; text-transform: uppercase;">Firma Responsable</div>
                        <div style="font-size: 14px; margin-top: 5px; font-weight: 500;">${cirugia.checklistAutorizacion.firmaResponsable || '<span style="color: #adb5bd; font-style: italic;">Sin firma</span>'}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; font-weight: 700; color: #D11A5C; text-transform: uppercase;">Revisado Por</div>
                        <div style="font-size: 14px; margin-top: 5px; font-weight: 500;">${cirugia.checklistAutorizacion.revisadoPor || '<span style="color: #adb5bd; font-style: italic;">Sin firmar</span>'}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; font-weight: 700; color: #D11A5C; text-transform: uppercase;">Aprobado Por</div>
                        <div style="font-size: 14px; margin-top: 5px; font-weight: 500;">${cirugia.checklistAutorizacion.aprobadoPor || '<span style="color: #adb5bd; font-style: italic;">Sin firmar</span>'}</div>
                    </div>
                </div>
                ${cirugia.checklistAutorizacion.fechaAutorizacion ? `
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px dashed #e0e0e0; text-align: center; font-size: 12px; color: #6c757d;">
                    Autorizado digitalmente el ${new Date(cirugia.checklistAutorizacion.fechaAutorizacion).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                ` : ''}
            </div>
        </div>
        ` : ''}
    `;

    document.getElementById('viewCirugiaModal').classList.add('active');
};

// Mark as completed
window.markAsCompleted = function (cirugiaId) {
    showConfirmModal(
        '¿Marcar como Realizada?',
        '¿Confirmas que esta cirugía ha sido completada exitosamente? Se creará automáticamente una historia clínica.',
        async () => {
            showLoadingModal('Actualizando estado y creando historia clínica...');

            try {
                const cirugia = allCirugias.find(c => c.id === cirugiaId);
                if (!cirugia) {
                    throw new Error('Cirugía no encontrada');
                }

                // Actualizar estado de la cirugía
                await updateDoc(doc(db, 'cirugias', cirugiaId), { estado: 'Realizada' });

                // Crear historia clínica automáticamente
                const cirujano = allUsuarios.find(u => u.id === cirugia.cirujanoId);
                const cirujanoNombre = cirujano ? cirujano.nombre : 'No especificado';

                // Construir descripción del equipo quirúrgico
                let equipoQuirurgico = `Cirujano Principal: ${cirujanoNombre}`;
                if (cirugia.anestesiologo) equipoQuirurgico += `\nAnestesiólogo: ${cirugia.anestesiologo}`;
                if (cirugia.instrumentista) equipoQuirurgico += `\nInstrumentista: ${cirugia.instrumentista}`;
                if (cirugia.enfermera) equipoQuirurgico += `\nEnfermera Circulante: ${cirugia.enfermera}`;
                if (cirugia.cirujanoAsistente) equipoQuirurgico += `\nCirujano Asistente: ${cirugia.cirujanoAsistente}`;
                if (cirugia.otrosMiembros) equipoQuirurgico += `\nOtros: ${cirugia.otrosMiembros}`;

                const historiaData = {
                    pacienteId: cirugia.pacienteId,
                    fechaConsulta: cirugia.fechaHora.split('T')[0],
                    diagnostico: `Cirugía: ${cirugia.tipoCirugia}`,
                    motivoConsulta: `Cirugía programada de ${cirugia.tipoCirugia}`,
                    lugarCirugia: cirugia.lugarCirugia || '',
                    antecedentesPersonales: '',
                    antecedentesFamiliares: '',
                    peso: '',
                    altura: '',
                    presionArterial: '',
                    frecuenciaCardiaca: '',
                    examenFisico: equipoQuirurgico,
                    planTratamiento: `Cirugía realizada el ${formatDateTime(cirugia.fechaHora)}\nLugar: ${cirugia.lugarCirugia || 'No especificado'}\nDuración: ${cirugia.duracion} horas\n\n${cirugia.descripcion || ''}`,
                    observaciones: `Historia clínica generada automáticamente desde cirugía realizada.\nID Cirugía: ${cirugiaId}`,
                    imagenes: [],
                    fechaCreacion: new Date().toISOString()
                };

                await addDoc(collection(db, 'historiasClinicas'), historiaData);

                hideLoadingModal();
                showSuccessModal('Cirugía marcada como realizada e historia clínica creada exitosamente');
                await loadCirugias();
                if (currentView === 'calendar') {
                    renderCalendar();
                }
            } catch (error) {
                hideLoadingModal();
                console.error('Error updating cirugia:', error);
                showErrorModal('Error al actualizar la cirugía: ' + error.message);
            }
        },
        {
            icon: 'fas fa-check-circle',
            iconColor: '#28a745',
            confirmText: 'Confirmar',
            confirmIcon: 'fas fa-check',
            confirmColor: '#28a745'
        }
    );
};

// Registrar resultado post-quirúrgico
window.registrarResultadoCirugia = function (cirugiaId) {
    const cirugia = allCirugias.find(c => c.id === cirugiaId);
    if (!cirugia) return;

    const paciente = allPacientes.find(p => p.id === cirugia.pacienteId);
    const cirujano = allUsuarios.find(u => u.id === cirugia.cirujanoId);

    // Mostrar información de la cirugía
    const cirugiaInfo = `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <p style="margin: 5px 0;"><strong>Paciente:</strong> ${paciente ? paciente.nombre : 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Tipo de Cirugía:</strong> ${cirugia.tipoCirugia}</p>
            <p style="margin: 5px 0;"><strong>Fecha:</strong> ${formatDateTime(cirugia.fechaHora)}</p>
            <p style="margin: 5px 0;"><strong>Cirujano:</strong> ${cirujano ? cirujano.nombre : 'N/A'}</p>
        </div>
    `;

    document.getElementById('cirugiaInfoResumen').innerHTML = cirugiaInfo;
    document.getElementById('resultadoCirugiaModal').classList.add('active');

    // Guardar el ID de la cirugía para usarlo al enviar el formulario
    document.getElementById('resultadoCirugiaForm').dataset.cirugiaId = cirugiaId;
};

// Manejar el envío del formulario de resultado post-quirúrgico
document.getElementById('resultadoCirugiaForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const cirugiaId = e.target.dataset.cirugiaId;
    const cirugia = allCirugias.find(c => c.id === cirugiaId);
    if (!cirugia) return;

    const paciente = allPacientes.find(p => p.id === cirugia.pacienteId);
    if (!paciente) {
        showErrorModal('No se encontró el paciente asociado a esta cirugía');
        return;
    }

    // Recopilar datos del formulario
    const resultadoData = {
        estadoCirugia: document.getElementById('estadoCirugia').value,
        descripcionProcedimiento: document.getElementById('descripcionProcedimiento').value,
        hallazgos: document.getElementById('hallazgos').value,
        presionArterialPost: document.getElementById('presionArterialPost').value,
        frecuenciaCardiacaPost: document.getElementById('frecuenciaCardiacaPost').value,
        temperaturaPost: document.getElementById('temperaturaPost').value,
        sangradoEstimado: document.getElementById('sangradoEstimado').value,
        complicaciones: document.getElementById('complicaciones').value,
        indicacionesPost: document.getElementById('indicacionesPost').value,
        planSeguimiento: document.getElementById('planSeguimiento').value,
        observacionesPostQuirurgicas: document.getElementById('observacionesPostQuirurgicas').value,
        proximaCitaControl: document.getElementById('proximaCitaControl').value,
        fechaRegistro: new Date().toISOString()
    };

    showLoadingModal('Guardando resultado y creando historia clínica...');

    try {
        // 1. Actualizar la cirugía con el resultado post-quirúrgico
        await updateDoc(doc(db, 'cirugias', cirugiaId), {
            resultadoPostQuirurgico: resultadoData
        });

        // 2. Crear historia clínica con la información de la cirugía y el resultado
        const cirujano = allUsuarios.find(u => u.id === cirugia.cirujanoId);

        const historiaClinicaData = {
            pacienteId: cirugia.pacienteId,
            fechaConsulta: new Date(cirugia.fechaHora).toISOString().split('T')[0],
            diagnostico: `Post-Quirúrgico: ${cirugia.tipoCirugia}`,
            motivoConsulta: `Seguimiento post-operatorio de ${cirugia.tipoCirugia}`,
            lugarCirugia: cirugia.lugarCirugia || '',
            antecedentesPersonales: '',
            antecedentesFamiliares: '',
            peso: '',
            altura: '',
            presionArterial: resultadoData.presionArterialPost || '',
            frecuenciaCardiaca: resultadoData.frecuenciaCardiacaPost || '',
            examenFisico: `
**CIRUGÍA REALIZADA**
Tipo: ${cirugia.tipoCirugia}
Lugar: ${cirugia.lugarCirugia || 'No especificado'}
Fecha: ${formatDateTime(cirugia.fechaHora)}
Cirujano: ${cirujano ? cirujano.nombre : 'N/A'}
Estado: ${resultadoData.estadoCirugia}

**PROCEDIMIENTO**
${resultadoData.descripcionProcedimiento}

${resultadoData.hallazgos ? `**HALLAZGOS**\n${resultadoData.hallazgos}\n\n` : ''}

**SIGNOS VITALES POST-OPERATORIOS**
${resultadoData.presionArterialPost ? `Presión Arterial: ${resultadoData.presionArterialPost}\n` : ''}
${resultadoData.frecuenciaCardiacaPost ? `Frecuencia Cardíaca: ${resultadoData.frecuenciaCardiacaPost}\n` : ''}
${resultadoData.temperaturaPost ? `Temperatura: ${resultadoData.temperaturaPost}\n` : ''}
${resultadoData.sangradoEstimado ? `Sangrado Estimado: ${resultadoData.sangradoEstimado}\n` : ''}

${resultadoData.complicaciones ? `**COMPLICACIONES**\n${resultadoData.complicaciones}\n\n` : ''}
            `.trim(),
            planTratamiento: `
**INDICACIONES POST-OPERATORIAS**
${resultadoData.indicacionesPost}

${resultadoData.planSeguimiento ? `**PLAN DE SEGUIMIENTO**\n${resultadoData.planSeguimiento}\n\n` : ''}

${resultadoData.proximaCitaControl ? `**PRÓXIMA CITA DE CONTROL**\n${new Date(resultadoData.proximaCitaControl).toLocaleDateString('es-ES')}\n\n` : ''}
            `.trim(),
            observaciones: resultadoData.observacionesPostQuirurgicas || '',
            imagenes: [],
            fechaCreacion: new Date().toISOString(),
            tipo: 'post-quirurgico',
            cirugiaId: cirugiaId
        };

        await addDoc(collection(db, 'historiasClinicas'), historiaClinicaData);

        hideLoadingModal();
        showSuccessModal('Resultado post-quirúrgico guardado e historia clínica creada exitosamente');

        document.getElementById('resultadoCirugiaModal').classList.remove('active');
        document.getElementById('resultadoCirugiaForm').reset();

        await loadCirugias();
        if (currentView === 'calendar') {
            renderCalendar();
        }
    } catch (error) {
        hideLoadingModal();
        console.error('Error al guardar resultado:', error);
        showErrorModal('Error al guardar el resultado post-quirúrgico');
    }
});

// Cerrar modal de resultado
document.getElementById('closeResultadoCirugiaModal').addEventListener('click', () => {
    document.getElementById('resultadoCirugiaModal').classList.remove('active');
});

document.getElementById('cancelResultadoCirugiaBtn').addEventListener('click', () => {
    document.getElementById('resultadoCirugiaModal').classList.remove('active');
});

document.getElementById('resultadoCirugiaModal').addEventListener('click', (e) => {
    if (e.target.id === 'resultadoCirugiaModal') {
        document.getElementById('resultadoCirugiaModal').classList.remove('active');
    }
});

// Delete cirugia
window.deleteCirugia = function (cirugiaId) {
    const cirugia = allCirugias.find(c => c.id === cirugiaId);
    if (!cirugia) return;

    const paciente = allPacientes.find(p => p.id === cirugia.pacienteId);
    const pacienteNombre = paciente ? paciente.nombre : 'este paciente';

    showConfirmModal(
        '¿Eliminar Cirugía?',
        `¿Estás seguro de que deseas eliminar la cirugía de ${pacienteNombre}? Esta acción no se puede deshacer y también se eliminará del calendario.`,
        async () => {
            showLoadingModal('Eliminando cirugía y evento del calendario...');

            try {
                // Eliminar evento de Google Calendar si existe
                if (cirugia.googleCalendarEventId && window.GoogleCalendar && window.GoogleCalendar.isReady() && window.GoogleCalendar.isAuthorized()) {
                    try {
                        await window.GoogleCalendar.deleteCalendarEvent(cirugia.googleCalendarEventId);
                        console.log('✅ Evento eliminado de Google Calendar');
                    } catch (calendarError) {
                        console.warn('⚠️ No se pudo eliminar el evento del calendario:', calendarError);
                        // No bloqueamos el flujo si falla eliminar del calendario
                    }
                }

                await deleteDoc(doc(db, 'cirugias', cirugiaId));
                hideLoadingModal();
                showSuccessModal('Cirugía eliminada exitosamente');
                await loadCirugias();
                if (currentView === 'calendar') {
                    renderCalendar();
                }
            } catch (error) {
                hideLoadingModal();
                console.error('Error deleting cirugia:', error);
                showErrorModal('Error al eliminar la cirugía');
            }
        }
    );
};

// Modal controls
document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('cirugiaModal').classList.remove('active');
});

document.getElementById('cancelBtn').addEventListener('click', () => {
    document.getElementById('cirugiaModal').classList.remove('active');
});

document.getElementById('cirugiaModal').addEventListener('click', (e) => {
    if (e.target.id === 'cirugiaModal') {
        document.getElementById('cirugiaModal').classList.remove('active');
    }
});

document.getElementById('closeViewModal').addEventListener('click', () => {
    document.getElementById('viewCirugiaModal').classList.remove('active');
});

document.getElementById('closeViewBtn').addEventListener('click', () => {
    document.getElementById('viewCirugiaModal').classList.remove('active');
});

document.getElementById('viewCirugiaModal').addEventListener('click', (e) => {
    if (e.target.id === 'viewCirugiaModal') {
        document.getElementById('viewCirugiaModal').classList.remove('active');
    }
});

document.getElementById('closeSuccess').addEventListener('click', () => {
    document.getElementById('successModal').classList.remove('active');
});

document.getElementById('closeError').addEventListener('click', () => {
    document.getElementById('errorModal').classList.remove('active');
});

document.getElementById('cancelDelete').addEventListener('click', () => {
    document.getElementById('confirmModal').classList.remove('active');
});

// Helper functions
function formatDateTime(dateTimeString) {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
    return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showLoadingModal(message) {
    const modal = document.getElementById('loadingModal');
    modal.querySelector('p').textContent = message;
    modal.classList.add('active');
}

function hideLoadingModal() {
    document.getElementById('loadingModal').classList.remove('active');
}

function showSuccessModal(message) {
    const modal = document.getElementById('successModal');
    modal.querySelector('.message-text').textContent = message;
    modal.classList.add('active');
}

function showErrorModal(message) {
    const modal = document.getElementById('errorModal');
    modal.querySelector('.message-text').textContent = message;
    modal.classList.add('active');
}

function showConfirmModal(title, message, onConfirm, options = {}) {
    const modal = document.getElementById('confirmModal');
    const modalTitle = document.getElementById('confirmModalTitle');
    const modalMessage = document.getElementById('confirmModalMessage');
    const modalIcon = document.getElementById('confirmModalIcon');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const confirmBtnIcon = document.getElementById('confirmBtnIcon');
    const confirmBtnText = document.getElementById('confirmBtnText');

    // Set title and message
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    // Set icon and color
    const iconClass = options.icon || 'fas fa-exclamation-triangle';
    const iconColor = options.iconColor || '#dc3545';
    modalIcon.innerHTML = `<i class="${iconClass}"></i>`;
    modalIcon.style.color = iconColor;

    // Set button text, icon and style
    const btnText = options.confirmText || 'Eliminar';
    const btnIcon = options.confirmIcon || 'fas fa-trash';
    const btnColor = options.confirmColor || '#dc3545';

    confirmBtnIcon.className = btnIcon;
    confirmBtnText.textContent = btnText;
    confirmBtn.style.background = btnColor;
    confirmBtn.style.color = 'white';

    confirmBtn.onclick = () => {
        modal.classList.remove('active');
        onConfirm();
    };

    modal.classList.add('active');
}

// Time Picker functionality
let selectedHour = 12;
let selectedMinute = 0;
let selectedPeriod = 'PM';
let selectingHour = true;

const timePickerModal = document.getElementById('timePickerModal');
const timeInputWrapper = document.getElementById('timeInputWrapper');
const timeDisplay = document.getElementById('timeDisplay');
const displayHour = document.getElementById('displayHour');
const displayMinute = document.getElementById('displayMinute');
const amBtn = document.getElementById('amBtn');
const pmBtn = document.getElementById('pmBtn');
const timeCancelBtn = document.getElementById('timeCancelBtn');
const timeOkBtn = document.getElementById('timeOkBtn');
const clockHand = document.getElementById('clockHand');
const clockHandEnd = document.getElementById('clockHandEnd');

// Open time picker
timeInputWrapper.addEventListener('click', () => {
    timePickerModal.classList.add('active');
    selectingHour = true;
    updateTimeDisplay();
    updateClockHand();
});

// Close time picker
timeCancelBtn.addEventListener('click', () => {
    timePickerModal.classList.remove('active');
});

timeOkBtn.addEventListener('click', () => {
    // Set hidden inputs
    document.getElementById('horaSelect').value = String(selectedHour).padStart(2, '0');
    document.getElementById('minutoSelect').value = String(selectedMinute).padStart(2, '0');
    document.getElementById('periodoSelect').value = selectedPeriod;

    // Update display
    timeDisplay.value = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')} ${selectedPeriod}`;

    timePickerModal.classList.remove('active');
});

// Period toggle
amBtn.addEventListener('click', () => {
    selectedPeriod = 'AM';
    amBtn.classList.add('active');
    pmBtn.classList.remove('active');
    updateTimeDisplay();
});

pmBtn.addEventListener('click', () => {
    selectedPeriod = 'PM';
    pmBtn.classList.add('active');
    amBtn.classList.remove('active');
    updateTimeDisplay();
});

// Toggle between hour and minute selection
displayHour.addEventListener('click', () => {
    selectingHour = true;
    displayHour.classList.add('active');
    displayMinute.classList.remove('active');
    updateClockNumbers();
    updateClockHand();
});

displayMinute.addEventListener('click', () => {
    selectingHour = false;
    displayMinute.classList.add('active');
    displayHour.classList.remove('active');
    updateClockNumbers();
    updateClockHand();
});

// Clock interaction
const clockFace = document.querySelector('.clock-face');
clockFace.addEventListener('click', (e) => {
    const rect = clockFace.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = e.clientX - rect.left - centerX;
    const y = e.clientY - rect.top - centerY;

    let angle = Math.atan2(y, x) * (180 / Math.PI);
    angle = (angle + 90 + 360) % 360;

    if (selectingHour) {
        selectedHour = Math.round(angle / 30);
        if (selectedHour === 0) selectedHour = 12;
        selectingHour = false;
        displayHour.classList.remove('active');
        displayMinute.classList.add('active');
        updateClockNumbers();
    } else {
        // Redondear a intervalos de 5 minutos
        selectedMinute = Math.round(angle / 30) * 5;
        if (selectedMinute === 60) selectedMinute = 0;
    }

    updateTimeDisplay();
    updateClockHand();
});

function updateTimeDisplay() {
    displayHour.textContent = String(selectedHour).padStart(2, '0');
    displayMinute.textContent = String(selectedMinute).padStart(2, '0');
}

function updateClockHand() {
    let angle;
    if (selectingHour) {
        angle = (selectedHour % 12) * 30 - 90;
        displayHour.classList.add('active');
        displayMinute.classList.remove('active');
    } else {
        angle = selectedMinute * 6 - 90;
        displayMinute.classList.add('active');
        displayHour.classList.remove('active');
    }

    const radians = angle * (Math.PI / 180);
    const endX = 150 + 100 * Math.cos(radians);
    const endY = 150 + 100 * Math.sin(radians);

    clockHand.setAttribute('x2', endX);
    clockHand.setAttribute('y2', endY);
    clockHandEnd.setAttribute('cx', endX);
    clockHandEnd.setAttribute('cy', endY);
}

function updateClockNumbers() {
    const clockNumbers = document.querySelectorAll('.clock-number');

    if (selectingHour) {
        // Mostrar horas 1-12
        const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
        clockNumbers.forEach((num, index) => {
            num.textContent = hours[index];
        });
    } else {
        // Mostrar minutos 00, 05, 10, 15, etc.
        const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
        clockNumbers.forEach((num, index) => {
            num.textContent = String(minutes[index]).padStart(2, '0');
        });
    }
}

// Initialize
updateTimeDisplay();
updateClockNumbers();
updateClockHand();

// ===== CHECKLIST PROGRESS FUNCTIONS =====
// Función para actualizar el progreso del checklist
function updateChecklistProgress() {
    const checklistItemNames = [
        'checkValoracion',
        'checkHistoriaClinica',
        'checkExamenes',
        'checkRevisionExamenes',
        'checkPlanTrabajo',
        'checkPagoCirugia',
        'checkProgramacionCirugia',
        'checkFormulaMedica',
        'checkKitCancelado',
        'checkKitEntregado',
        'checkAsesoriaPreQuirurgica',
        'checkRecomendaciones',
        'checkDatosClinica',
        'checkProtesis',
        'checkPoliza',
        'checkPrimerMasaje',
        'checkCitaControlPrimera'
    ];

    let completedCount = 0;

    checklistItemNames.forEach(itemName => {
        const radioSi = document.querySelector(`input[name="${itemName}"][value="si"]`);
        if (radioSi && radioSi.checked) {
            completedCount++;
        }
    });

    const progressBar = document.getElementById('checklistProgress');
    const checklistCount = document.getElementById('checklistCount');

    if (progressBar && checklistCount) {
        const percentage = (completedCount / checklistItemNames.length) * 100;
        progressBar.style.width = `${percentage}%`;
        checklistCount.textContent = completedCount;
    }
}

// Agregar event listeners para actualizar el progreso cuando se seleccionen los radio buttons
document.addEventListener('change', function (e) {
    if (e.target.classList.contains('checklist-radio')) {
        updateChecklistProgress();
    }
});

// Función para deshabilitar validación del checklist (al editar)
function disableChecklistValidation() {
    const checklistItemNames = [
        'checkValoracion',
        'checkHistoriaClinica',
        'checkExamenes',
        'checkRevisionExamenes',
        'checkPlanTrabajo',
        'checkPagoCirugia',
        'checkProgramacionCirugia',
        'checkFormulaMedica',
        'checkKitCancelado',
        'checkKitEntregado',
        'checkAsesoriaPreQuirurgica',
        'checkRecomendaciones',
        'checkDatosClinica',
        'checkProtesis',
        'checkPoliza',
        'checkPrimerMasaje',
        'checkCitaControlPrimera'
    ];

    checklistItemNames.forEach(itemName => {
        const radioSi = document.querySelector(`input[name="${itemName}"][value="si"]`);
        const radioNo = document.querySelector(`input[name="${itemName}"][value="no"]`);
        
        if (radioSi) radioSi.removeAttribute('required');
        if (radioNo) radioNo.removeAttribute('required');
    });
}

// Función para habilitar validación del checklist (al crear nueva)
function enableChecklistValidation() {
    const checklistItemNames = [
        'checkValoracion',
        'checkHistoriaClinica',
        'checkExamenes',
        'checkRevisionExamenes',
        'checkPlanTrabajo',
        'checkPagoCirugia',
        'checkProgramacionCirugia',
        'checkFormulaMedica',
        'checkKitCancelado',
        'checkKitEntregado',
        'checkAsesoriaPreQuirurgica',
        'checkRecomendaciones',
        'checkDatosClinica',
        'checkProtesis',
        'checkPoliza',
        'checkPrimerMasaje',
        'checkCitaControlPrimera'
    ];

    checklistItemNames.forEach(itemName => {
        const radioSi = document.querySelector(`input[name="${itemName}"][value="si"]`);
        
        if (radioSi) radioSi.setAttribute('required', 'required');
    });
}
