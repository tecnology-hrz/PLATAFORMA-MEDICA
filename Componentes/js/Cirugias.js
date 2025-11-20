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

    setTimeout(() => {
        loadPacientes();
        loadUsuarios();
        loadCirugias();
        startAutoUpdateStates();
    }, 100);
});

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

        populatePacienteSelect();
    } catch (error) {
        console.error('Error loading pacientes:', error);
    }
}


function populatePacienteSelect() {
    const select = document.getElementById('pacienteId');
    select.innerHTML = '<option value="">Seleccionar paciente</option>';

    allPacientes.forEach(paciente => {
        select.innerHTML += `<option value="${paciente.id}">${paciente.nombre} - ${paciente.cedula}</option>`;
    });
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

    // Filtrar SOLO cirujanos (que tengan "Cirujano" en su especialidad)
    const cirujanos = allUsuarios.filter(usuario => {
        const especialidad = usuario.especialidad || usuario.rol || usuario.tipoUsuario || '';
        return especialidad.toLowerCase().includes('cirujano');
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
                        ${cirugia.estado !== 'Realizada' ? `
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

filterTipoCirugia.addEventListener('change', applyFilters);
filterEstado.addEventListener('change', applyFilters);

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const tipoCirugiaFilter = filterTipoCirugia.value;
    const estadoFilter = filterEstado.value;

    filteredCirugias = allCirugias.filter(cirugia => {
        const paciente = allPacientes.find(p => p.id === cirugia.pacienteId);
        const pacienteNombre = paciente ? paciente.nombre.toLowerCase() : '';

        const matchSearch = !searchTerm || pacienteNombre.includes(searchTerm);

        const matchTipoCirugia = !tipoCirugiaFilter || cirugia.tipoCirugia === tipoCirugiaFilter;

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
    document.getElementById('cirugiaForm').reset();
    document.getElementById('estado').value = 'Programada';
    document.getElementById('cirugiaModal').classList.add('active');
});

// Save cirugia
document.getElementById('cirugiaForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const pacienteId = document.getElementById('pacienteId').value;
    const tipoCirugia = document.getElementById('tipoCirugia').value;
    const cirujanoId = document.getElementById('cirujanoId').value;
    const fechaCirugia = document.getElementById('fechaCirugia').value;
    const hora = document.getElementById('horaSelect').value;
    const minuto = document.getElementById('minutoSelect').value;
    const periodo = document.getElementById('periodoSelect').value;
    const duracion = document.getElementById('duracion').value;
    const estado = document.getElementById('estado').value;

    if (!pacienteId || !tipoCirugia || !cirujanoId || !fechaCirugia || !hora || !minuto || !periodo || !duracion) {
        showErrorModal('Por favor, completa todos los campos obligatorios');
        return;
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

    showLoadingModal(editingCirugiaId ? 'Actualizando cirugía...' : 'Programando cirugía...');

    try {
        const cirugiaData = {
            pacienteId,
            tipoCirugia,
            cirujanoId,
            fechaHora,
            duracion: parseFloat(duracion),
            estado,
            anestesiologo: document.getElementById('anestesiologo').value.trim(),
            instrumentista: document.getElementById('instrumentista').value.trim(),
            enfermera: document.getElementById('enfermera').value.trim(),
            cirujanoAsistente: document.getElementById('cirujanoAsistente').value.trim(),
            otrosMiembros: document.getElementById('otrosMiembros').value.trim(),
            descripcion: document.getElementById('descripcion').value.trim(),
            fechaCreacion: editingCirugiaId ? allCirugias.find(c => c.id === editingCirugiaId).fechaCreacion : new Date().toISOString()
        };

        if (editingCirugiaId) {
            await updateDoc(doc(db, 'cirugias', editingCirugiaId), cirugiaData);
        } else {
            await addDoc(collection(db, 'cirugias'), cirugiaData);
        }

        document.getElementById('cirugiaModal').classList.remove('active');
        hideLoadingModal();
        showSuccessModal(editingCirugiaId ? 'Cirugía actualizada exitosamente' : 'Cirugía programada exitosamente');

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

    document.getElementById('pacienteId').value = cirugia.pacienteId;
    document.getElementById('tipoCirugia').value = cirugia.tipoCirugia;
    document.getElementById('cirujanoId').value = cirugia.cirujanoId;

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
                    antecedentesPersonales: '',
                    antecedentesFamiliares: '',
                    peso: '',
                    altura: '',
                    presionArterial: '',
                    frecuenciaCardiaca: '',
                    examenFisico: equipoQuirurgico,
                    planTratamiento: `Cirugía realizada el ${formatDateTime(cirugia.fechaHora)}\nDuración: ${cirugia.duracion} horas\n\n${cirugia.descripcion || ''}`,
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
        }
    );
};

// Delete cirugia
window.deleteCirugia = function (cirugiaId) {
    const cirugia = allCirugias.find(c => c.id === cirugiaId);
    if (!cirugia) return;

    const paciente = allPacientes.find(p => p.id === cirugia.pacienteId);
    const pacienteNombre = paciente ? paciente.nombre : 'este paciente';

    showConfirmModal(
        '¿Eliminar Cirugía?',
        `¿Estás seguro de que deseas eliminar la cirugía de ${pacienteNombre}? Esta acción no se puede deshacer.`,
        async () => {
            showLoadingModal('Eliminando cirugía...');

            try {
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

function showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    modal.querySelector('.modal-title').textContent = title;
    modal.querySelector('.message-text').textContent = message;

    const confirmBtn = modal.querySelector('#confirmDeleteBtn');
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
