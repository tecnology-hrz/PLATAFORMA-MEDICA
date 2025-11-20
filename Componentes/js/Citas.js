// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// EmailJS Configuration
const EMAILJS_PUBLIC_KEY = 'ftJ_yzM9vFYMWh7c9';
const EMAILJS_SERVICE_ID = 'service_05gh2s1';
const EMAILJS_TEMPLATE_ID = 'template_ch80ert';

let allCitas = [];
let filteredCitas = [];
let allPacientes = [];
let allUsuarios = [];
let editingCitaId = null;

// Check authentication
window.addEventListener('DOMContentLoaded', () => {
    const sessionData = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');

    if (!sessionData) {
        window.location.href = '../Login.html';
        return;
    }

    // Verificar que EmailJS esté cargado
    if (typeof emailjs === 'undefined') {
        console.error('EmailJS no está cargado. Verifica que el script esté incluido en el HTML.');
    } else {
        console.log('EmailJS cargado correctamente');
    }

    setTimeout(() => {
        loadPacientes();
        loadUsuarios();
        loadCitas();
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
    const pacienteSelect = document.getElementById('pacienteId');

    pacienteSelect.innerHTML = '<option value="">Seleccionar paciente...</option>';

    allPacientes.forEach(paciente => {
        pacienteSelect.innerHTML += `<option value="${paciente.id}">${paciente.nombre} - ${paciente.cedula}</option>`;
    });
}

// Load usuarios (médicos)
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

        populateUsuarioSelect();
    } catch (error) {
        console.error('Error loading usuarios:', error);
    }
}

function populateUsuarioSelect() {
    const medicoSelect = document.getElementById('medicoId');

    medicoSelect.innerHTML = '<option value="">Seleccionar médico...</option>';

    allUsuarios.forEach(usuario => {
        const especialidad = usuario.especialidad || 'Médico General';
        medicoSelect.innerHTML += `<option value="${usuario.id}">${usuario.nombre} - ${especialidad}</option>`;
    });
}

// Load citas
async function loadCitas() {
    try {
        const querySnapshot = await getDocs(collection(db, 'citas'));
        allCitas = [];

        querySnapshot.forEach((doc) => {
            allCitas.push({
                id: doc.id,
                ...doc.data()
            });
        });

        allCitas.sort((a, b) => {
            const dateA = new Date(`${a.fechaCita} ${a.horaCita}`);
            const dateB = new Date(`${b.fechaCita} ${b.horaCita}`);
            return dateB - dateA;
        });

        filteredCitas = [...allCitas];
        updateStats();
        renderCitas();
    } catch (error) {
        console.error('Error loading citas:', error);
    }
}

function updateStats() {
    const today = new Date().toISOString().split('T')[0];

    const totalCitas = allCitas.length;
    const citasPendientes = allCitas.filter(c => c.estado === 'pendiente').length;
    const citasConfirmadas = allCitas.filter(c => c.estado === 'confirmada').length;
    const citasHoy = allCitas.filter(c => c.fechaCita === today).length;

    document.getElementById('totalCitas').textContent = totalCitas;
    document.getElementById('citasPendientes').textContent = citasPendientes;
    document.getElementById('citasConfirmadas').textContent = citasConfirmadas;
    document.getElementById('citasHoy').textContent = citasHoy;
}

function renderCitas() {
    const tbody = document.getElementById('citasTableBody');
    const resultsCount = document.getElementById('resultsCount');

    resultsCount.textContent = `${filteredCitas.length} cita${filteredCitas.length !== 1 ? 's' : ''}`;

    if (filteredCitas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fas fa-calendar-alt"></i></div>
                        <h3 class="empty-title">No se encontraron citas</h3>
                        <p class="empty-message">Crea la primera cita haciendo clic en "Nueva Cita"</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredCitas.map(cita => {
        let pacienteNombre, pacienteCedula, pacienteFoto;

        if (cita.tipoPaciente === 'externo') {
            pacienteNombre = cita.nombreExterno;
            pacienteCedula = cita.cedulaExterno;
            pacienteFoto = '';
        } else {
            const paciente = allPacientes.find(p => p.id === cita.pacienteId);
            pacienteNombre = paciente ? paciente.nombre : 'Paciente no encontrado';
            pacienteCedula = paciente ? paciente.cedula : '';
            pacienteFoto = paciente ? paciente.foto : '';
        }

        const avatarHtml = pacienteFoto
            ? `<img src="${pacienteFoto}" alt="${pacienteNombre}">`
            : `<i class="fas fa-user"></i>`;

        const estadoClass = `status-${cita.estado}`;
        const estadoIcon = {
            'pendiente': 'fa-clock',
            'confirmada': 'fa-check-circle',
            'completada': 'fa-calendar-check',
            'cancelada': 'fa-ban'
        }[cita.estado] || 'fa-question';

        const estadoText = {
            'pendiente': 'Pendiente',
            'confirmada': 'Confirmada',
            'completada': 'Completada',
            'cancelada': 'Cancelada'
        }[cita.estado] || cita.estado;

        return `
            <tr>
                <td>
                    <div class="patient-cell">
                        <div class="patient-avatar">${avatarHtml}</div>
                        <div class="patient-info">
                            <h4>${pacienteNombre}</h4>
                            <p>Cédula: ${pacienteCedula}</p>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="datetime-cell">
                        <span class="date-text">${formatDate(cita.fechaCita)}</span>
                        <span class="time-text">${formatTime(cita.horaCita)}</span>
                    </div>
                </td>
                <td>${getTipoCitaText(cita.tipoCita)}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-user-md" style="color: #D11A5C;"></i>
                        <span>${cita.medicoNombre || 'No asignado'}</span>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${estadoClass}">
                        <i class="fas ${estadoIcon}"></i>
                        ${estadoText}
                    </span>
                </td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-action btn-view" onclick="viewCita('${cita.id}')" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${cita.estado === 'confirmada' ? `
                            <button class="btn-action" onclick="registrarResultado('${cita.id}')" title="Registrar Resultado" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);">
                                <i class="fas fa-file-medical"></i>
                            </button>
                        ` : ''}
                        ${cita.estado !== 'completada' && cita.estado !== 'cancelada' ? `
                            <button class="btn-action btn-confirm" onclick="confirmarCita('${cita.id}')" title="Confirmar">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn-action btn-cancel" onclick="cancelarCita('${cita.id}')" title="Cancelar">
                                <i class="fas fa-ban"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getTipoCitaText(tipo) {
    const tipos = {
        'consulta': 'Consulta General',
        'valoracion': 'Valoración Pre-Quirúrgica',
        'control': 'Control Post-Operatorio',
        'procedimiento': 'Procedimiento',
        'seguimiento': 'Seguimiento'
    };
    return tipos[tipo] || tipo;
}

function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('es-ES', options);
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

function getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Search and filter
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const filterEstado = document.getElementById('filterEstado');
const filterFecha = document.getElementById('filterFecha');

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

filterEstado.addEventListener('change', applyFilters);
filterFecha.addEventListener('change', applyFilters);

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const estado = filterEstado.value;
    const fecha = filterFecha.value;

    filteredCitas = allCitas.filter(cita => {
        let pacienteNombre;

        if (cita.tipoPaciente === 'externo') {
            pacienteNombre = cita.nombreExterno.toLowerCase();
        } else {
            const paciente = allPacientes.find(p => p.id === cita.pacienteId);
            pacienteNombre = paciente ? paciente.nombre.toLowerCase() : '';
        }

        const matchSearch = !searchTerm ||
            pacienteNombre.includes(searchTerm) ||
            cita.motivoCita.toLowerCase().includes(searchTerm);

        const matchEstado = !estado || cita.estado === estado;
        const matchFecha = !fecha || cita.fechaCita === fecha;

        return matchSearch && matchEstado && matchFecha;
    });

    renderCitas();
}

// Patient type toggle
const tipoPacienteRadios = document.querySelectorAll('input[name="tipoPaciente"]');
const pacienteRegistradoSection = document.getElementById('pacienteRegistradoSection');
const pacienteExternoSection = document.getElementById('pacienteExternoSection');

tipoPacienteRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'registrado') {
            pacienteRegistradoSection.style.display = 'block';
            pacienteExternoSection.style.display = 'none';
            // Clear external patient fields
            document.getElementById('nombreExterno').value = '';
            document.getElementById('cedulaExterno').value = '';
            document.getElementById('emailExterno').value = '';
            document.getElementById('telefonoExterno').value = '';
        } else {
            pacienteRegistradoSection.style.display = 'none';
            pacienteExternoSection.style.display = 'block';
            // Clear registered patient selection
            document.getElementById('pacienteId').value = '';
        }
    });
});

// Open add cita modal
document.getElementById('addCitaBtn').addEventListener('click', () => {
    editingCitaId = null;
    document.getElementById('modalTitle').textContent = 'Nueva Cita';
    document.getElementById('citaForm').reset();
    document.getElementById('fechaCita').value = getLocalDateString();

    // Reset to registered patient
    document.querySelector('input[name="tipoPaciente"][value="registrado"]').checked = true;
    pacienteRegistradoSection.style.display = 'block';
    pacienteExternoSection.style.display = 'none';

    document.getElementById('citaModal').classList.add('active');
});

// Close modals
document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('citaModal').classList.remove('active');
});

document.getElementById('cancelBtn').addEventListener('click', () => {
    document.getElementById('citaModal').classList.remove('active');
});

document.getElementById('closeViewModal').addEventListener('click', () => {
    document.getElementById('viewCitaModal').classList.remove('active');
});

document.getElementById('closeViewBtn').addEventListener('click', () => {
    document.getElementById('viewCitaModal').classList.remove('active');
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

document.getElementById('cancelConfirmCita').addEventListener('click', () => {
    document.getElementById('confirmCitaModal').classList.remove('active');
});

// Send email using EmailJS
async function sendAppointmentEmail(citaData, pacienteData) {
    try {
        // Verificar que EmailJS esté disponible
        if (typeof emailjs === 'undefined') {
            throw new Error('EmailJS no está cargado');
        }

        // Preparar los parámetros del template
        const templateParams = {
            to_email: pacienteData.email,
            paciente_nombre: pacienteData.nombre,
            fecha_cita: formatDate(citaData.fechaCita),
            hora_cita: formatTime(citaData.horaCita),
            tipo_cita: getTipoCitaText(citaData.tipoCita),
            motivo_cita: citaData.motivoCita,
            duracion: citaData.duracion,
            medico_nombre: citaData.medicoNombre || 'Por asignar'
        };

        console.log('📧 Enviando email con EmailJS...');
        console.log('Service ID:', EMAILJS_SERVICE_ID);
        console.log('Template ID:', EMAILJS_TEMPLATE_ID);
        console.log('To:', pacienteData.email);

        // Enviar email usando EmailJS
        const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            templateParams,
            EMAILJS_PUBLIC_KEY
        );

        console.log('✅ Email enviado exitosamente:', response);
        return { success: true, data: response };
    } catch (error) {
        console.error('❌ Error al enviar email:', error);
        return { success: false, error: error.text || error.message || 'Error desconocido' };
    }
}

// Save cita
document.getElementById('citaForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const tipoPaciente = document.querySelector('input[name="tipoPaciente"]:checked').value;
    const fechaCita = document.getElementById('fechaCita').value;
    const horaCita = document.getElementById('horaCita').value;
    const tipoCita = document.getElementById('tipoCita').value;
    const motivoCita = document.getElementById('motivoCita').value.trim();
    const duracion = document.getElementById('duracion').value;
    const notas = document.getElementById('notas').value.trim();
    const medicoId = document.getElementById('medicoId').value;

    // Validaciones
    if (!fechaCita || !horaCita) {
        showErrorModal('Por favor, completa la fecha y hora de la cita');
        return;
    }

    if (!tipoCita) {
        showErrorModal('Por favor, selecciona el tipo de cita');
        return;
    }

    if (!motivoCita) {
        showErrorModal('Por favor, describe el motivo de la cita');
        return;
    }

    if (!medicoId) {
        showErrorModal('Por favor, selecciona un médico para la cita');
        return;
    }

    let pacienteData = {};
    let medicoData = allUsuarios.find(u => u.id === medicoId);
    
    let citaData = {
        tipoPaciente,
        fechaCita,
        horaCita,
        tipoCita,
        motivoCita,
        duracion,
        notas,
        medicoId,
        medicoNombre: medicoData ? medicoData.nombre : '',
        estado: 'pendiente',
        fechaCreacion: new Date().toISOString()
    };

    if (tipoPaciente === 'registrado') {
        const pacienteId = document.getElementById('pacienteId').value;
        if (!pacienteId) {
            showErrorModal('Por favor, selecciona un paciente');
            return;
        }
        citaData.pacienteId = pacienteId;

        const paciente = allPacientes.find(p => p.id === pacienteId);
        pacienteData = {
            nombre: paciente.nombre,
            email: paciente.email,
            cedula: paciente.cedula
        };
    } else {
        const nombreExterno = document.getElementById('nombreExterno').value.trim();
        const cedulaExterno = document.getElementById('cedulaExterno').value.trim();
        const emailExterno = document.getElementById('emailExterno').value.trim();
        const telefonoExterno = document.getElementById('telefonoExterno').value.trim();

        if (!nombreExterno || !cedulaExterno || !emailExterno || !telefonoExterno) {
            showErrorModal('Por favor, completa todos los campos del paciente externo');
            return;
        }

        citaData.nombreExterno = nombreExterno;
        citaData.cedulaExterno = cedulaExterno;
        citaData.emailExterno = emailExterno;
        citaData.telefonoExterno = telefonoExterno;

        pacienteData = {
            nombre: nombreExterno,
            email: emailExterno,
            cedula: cedulaExterno
        };
    }

    showLoadingModal('Agendando cita y enviando correo...');

    try {
        // Save to Firebase
        await addDoc(collection(db, 'citas'), citaData);

        // Send email
        const emailResult = await sendAppointmentEmail(citaData, pacienteData);

        document.getElementById('citaModal').classList.remove('active');
        hideLoadingModal();

        if (emailResult.success) {
            showSuccessModal('Cita agendada exitosamente y correo enviado al paciente');
        } else {
            showSuccessModal('Cita agendada exitosamente, pero hubo un error al enviar el correo: ' + emailResult.error);
        }

        await loadCitas();
    } catch (error) {
        hideLoadingModal();
        console.error('Error saving cita:', error);
        showErrorModal('Error al agendar la cita');
    }
});

// View cita
window.viewCita = function (citaId) {
    const cita = allCitas.find(c => c.id === citaId);
    if (!cita) return;

    let pacienteNombre, pacienteCedula, pacienteEmail, pacienteTelefono;

    if (cita.tipoPaciente === 'externo') {
        pacienteNombre = cita.nombreExterno;
        pacienteCedula = cita.cedulaExterno;
        pacienteEmail = cita.emailExterno;
        pacienteTelefono = cita.telefonoExterno;
    } else {
        const paciente = allPacientes.find(p => p.id === cita.pacienteId);
        pacienteNombre = paciente ? paciente.nombre : 'Paciente no encontrado';
        pacienteCedula = paciente ? paciente.cedula : '';
        pacienteEmail = paciente ? paciente.email : '';
        pacienteTelefono = paciente ? paciente.telefono : '';
    }

    const content = document.getElementById('viewCitaContent');

    const estadoText = {
        'pendiente': 'Pendiente',
        'confirmada': 'Confirmada',
        'completada': 'Completada',
        'cancelada': 'Cancelada'
    }[cita.estado] || cita.estado;

    content.innerHTML = `
        <div class="cita-detail-section">
            <h3><i class="fas fa-user-injured"></i> Información del Paciente</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Nombre</div>
                    <div class="detail-value">${pacienteNombre}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Cédula</div>
                    <div class="detail-value">${pacienteCedula}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Email</div>
                    <div class="detail-value">${pacienteEmail}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Teléfono</div>
                    <div class="detail-value">${pacienteTelefono}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Tipo de Paciente</div>
                    <div class="detail-value">${cita.tipoPaciente === 'externo' ? 'Externo' : 'Registrado'}</div>
                </div>
            </div>
        </div>
        
        <div class="cita-detail-section">
            <h3><i class="fas fa-calendar-alt"></i> Información de la Cita</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Fecha</div>
                    <div class="detail-value">${formatDate(cita.fechaCita)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Hora</div>
                    <div class="detail-value">${formatTime(cita.horaCita)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Tipo de Cita</div>
                    <div class="detail-value">${getTipoCitaText(cita.tipoCita)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Duración</div>
                    <div class="detail-value">${cita.duracion} minutos</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Estado</div>
                    <div class="detail-value">${estadoText}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Médico Asignado</div>
                    <div class="detail-value">${cita.medicoNombre || 'No asignado'}</div>
                </div>
            </div>
        </div>
        
        <div class="cita-detail-section">
            <h3><i class="fas fa-comment-medical"></i> Motivo de la Cita</h3>
            <div class="detail-value">${cita.motivoCita}</div>
        </div>
        
        ${cita.notas ? `
        <div class="cita-detail-section">
            <h3><i class="fas fa-sticky-note"></i> Notas Internas</h3>
            <div class="detail-value">${cita.notas}</div>
        </div>
        ` : ''}
        
        ${cita.resultado ? `
        <div class="cita-detail-section" style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
            <h3 style="color: #28a745;"><i class="fas fa-file-medical"></i> Resultado de la Cita</h3>
            
            <div style="margin-top: 15px;">
                <h4 style="font-size: 14px; color: #2B3545; margin-bottom: 10px;">Diagnóstico</h4>
                <div class="detail-value" style="background: white; padding: 12px; border-radius: 8px;">${cita.resultado.diagnostico}</div>
            </div>
            
            <div style="margin-top: 15px;">
                <h4 style="font-size: 14px; color: #2B3545; margin-bottom: 10px;">Tratamiento</h4>
                <div class="detail-value" style="background: white; padding: 12px; border-radius: 8px;">${cita.resultado.tratamiento}</div>
            </div>
            
            ${cita.resultado.presionArterial || cita.resultado.frecuenciaCardiaca || cita.resultado.temperatura || cita.resultado.peso ? `
            <div style="margin-top: 15px;">
                <h4 style="font-size: 14px; color: #2B3545; margin-bottom: 10px;">Signos Vitales</h4>
                <div class="detail-grid" style="background: white; padding: 12px; border-radius: 8px;">
                    ${cita.resultado.presionArterial ? `
                    <div class="detail-item">
                        <div class="detail-label">Presión Arterial</div>
                        <div class="detail-value">${cita.resultado.presionArterial}</div>
                    </div>
                    ` : ''}
                    ${cita.resultado.frecuenciaCardiaca ? `
                    <div class="detail-item">
                        <div class="detail-label">Frecuencia Cardíaca</div>
                        <div class="detail-value">${cita.resultado.frecuenciaCardiaca}</div>
                    </div>
                    ` : ''}
                    ${cita.resultado.temperatura ? `
                    <div class="detail-item">
                        <div class="detail-label">Temperatura</div>
                        <div class="detail-value">${cita.resultado.temperatura}</div>
                    </div>
                    ` : ''}
                    ${cita.resultado.peso ? `
                    <div class="detail-item">
                        <div class="detail-label">Peso</div>
                        <div class="detail-value">${cita.resultado.peso}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
            
            ${cita.resultado.observaciones ? `
            <div style="margin-top: 15px;">
                <h4 style="font-size: 14px; color: #2B3545; margin-bottom: 10px;">Observaciones</h4>
                <div class="detail-value" style="background: white; padding: 12px; border-radius: 8px;">${cita.resultado.observaciones}</div>
            </div>
            ` : ''}
            
            ${cita.resultado.proximaCita ? `
            <div style="margin-top: 15px;">
                <h4 style="font-size: 14px; color: #2B3545; margin-bottom: 10px;">Próxima Cita Recomendada</h4>
                <div class="detail-value" style="background: white; padding: 12px; border-radius: 8px;">${formatDate(cita.resultado.proximaCita)}</div>
            </div>
            ` : ''}
        </div>
        ` : ''}
    `;

    document.getElementById('viewCitaModal').classList.add('active');
};

// Confirmar cita
window.confirmarCita = function (citaId) {
    document.getElementById('confirmCitaModal').classList.add('active');

    document.getElementById('confirmCitaBtn').onclick = async () => {
        document.getElementById('confirmCitaModal').classList.remove('active');
        showLoadingModal('Confirmando cita...');

        try {
            await updateDoc(doc(db, 'citas', citaId), {
                estado: 'confirmada'
            });

            hideLoadingModal();
            showSuccessModal('Cita confirmada exitosamente');
            await loadCitas();
        } catch (error) {
            hideLoadingModal();
            console.error('Error confirming cita:', error);
            showErrorModal('Error al confirmar la cita');
        }
    };
};

// Cancelar cita
window.cancelarCita = function (citaId) {
    document.getElementById('confirmModal').classList.add('active');

    document.getElementById('confirmDeleteBtn').onclick = async () => {
        document.getElementById('confirmModal').classList.remove('active');
        showLoadingModal('Cancelando cita...');

        try {
            await updateDoc(doc(db, 'citas', citaId), {
                estado: 'cancelada'
            });

            hideLoadingModal();
            showSuccessModal('Cita cancelada exitosamente');
            await loadCitas();
        } catch (error) {
            hideLoadingModal();
            console.error('Error canceling cita:', error);
            showErrorModal('Error al cancelar la cita');
        }
    };
};

// Modal helpers
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

// Logout
document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('logoutModal').classList.add('active');
});

document.getElementById('cancelLogout').addEventListener('click', () => {
    document.getElementById('logoutModal').classList.remove('active');
});

document.getElementById('confirmLogout').addEventListener('click', () => {
    localStorage.removeItem('userSession');
    sessionStorage.removeItem('userSession');
    window.location.href = '../Login.html';
});

// Registrar resultado de cita
let citaActualParaResultado = null;

window.registrarResultado = function(citaId) {
    const cita = allCitas.find(c => c.id === citaId);
    if (!cita) return;

    // Validar que la cita tenga médico asignado
    if (!cita.medicoId) {
        showErrorModal('Esta cita no tiene un médico asignado. Por favor, edita la cita y asigna un médico antes de registrar el resultado.');
        return;
    }

    citaActualParaResultado = cita;

    // Obtener información del paciente
    let pacienteNombre, pacienteCedula;
    if (cita.tipoPaciente === 'externo') {
        pacienteNombre = cita.nombreExterno;
        pacienteCedula = cita.cedulaExterno;
    } else {
        const paciente = allPacientes.find(p => p.id === cita.pacienteId);
        pacienteNombre = paciente ? paciente.nombre : 'Paciente no encontrado';
        pacienteCedula = paciente ? paciente.cedula : '';
    }

    // Mostrar resumen de la cita
    document.getElementById('citaInfoResumen').innerHTML = `
        <div class="detail-grid" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <div class="detail-item">
                <div class="detail-label">Paciente</div>
                <div class="detail-value">${pacienteNombre}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Fecha</div>
                <div class="detail-value">${formatDate(cita.fechaCita)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Tipo de Cita</div>
                <div class="detail-value">${getTipoCitaText(cita.tipoCita)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Motivo</div>
                <div class="detail-value">${cita.motivoCita}</div>
            </div>
        </div>
    `;

    // Limpiar formulario
    document.getElementById('resultadoCitaForm').reset();

    // Mostrar modal
    document.getElementById('resultadoCitaModal').classList.add('active');
};

// Cerrar modal de resultado
document.getElementById('closeResultadoModal').addEventListener('click', () => {
    document.getElementById('resultadoCitaModal').classList.remove('active');
    citaActualParaResultado = null;
});

document.getElementById('cancelResultadoBtn').addEventListener('click', () => {
    document.getElementById('resultadoCitaModal').classList.remove('active');
    citaActualParaResultado = null;
});

// Guardar resultado y crear historia clínica
document.getElementById('resultadoCitaForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!citaActualParaResultado) return;

    const diagnostico = document.getElementById('diagnostico').value.trim();
    const tratamiento = document.getElementById('tratamiento').value.trim();
    const presionArterial = document.getElementById('presionArterial').value.trim();
    const frecuenciaCardiaca = document.getElementById('frecuenciaCardiaca').value.trim();
    const temperatura = document.getElementById('temperatura').value.trim();
    const peso = document.getElementById('peso').value.trim();
    const observacionesResultado = document.getElementById('observacionesResultado').value.trim();
    const proximaCita = document.getElementById('proximaCita').value;

    if (!diagnostico || !tratamiento) {
        showErrorModal('El diagnóstico y tratamiento son obligatorios');
        return;
    }

    showLoadingModal('Guardando resultado y creando historia clínica...');

    try {
        // Actualizar la cita con el resultado
        await updateDoc(doc(db, 'citas', citaActualParaResultado.id), {
            estado: 'completada',
            resultado: {
                diagnostico,
                tratamiento,
                presionArterial,
                frecuenciaCardiaca,
                temperatura,
                peso,
                observaciones: observacionesResultado,
                proximaCita,
                fechaRegistro: new Date().toISOString()
            }
        });

        // Crear historia clínica solo si es paciente registrado
        if (citaActualParaResultado.tipoPaciente === 'registrado') {
            const paciente = allPacientes.find(p => p.id === citaActualParaResultado.pacienteId);
            
            const historiaClinicaData = {
                pacienteId: citaActualParaResultado.pacienteId || '',
                pacienteNombre: paciente ? paciente.nombre : '',
                pacienteCedula: paciente ? paciente.cedula : '',
                citaId: citaActualParaResultado.id || '',
                tipoCita: citaActualParaResultado.tipoCita || '',
                fechaCita: citaActualParaResultado.fechaCita || '',
                medicoId: citaActualParaResultado.medicoId || '',
                medicoNombre: citaActualParaResultado.medicoNombre || 'No asignado',
                motivoConsulta: citaActualParaResultado.motivoCita || '',
                diagnostico: diagnostico,
                tratamiento: tratamiento,
                signosVitales: {
                    presionArterial: presionArterial || '',
                    frecuenciaCardiaca: frecuenciaCardiaca || '',
                    temperatura: temperatura || '',
                    peso: peso || ''
                },
                observaciones: observacionesResultado || '',
                proximaCita: proximaCita || '',
                fechaCreacion: new Date().toISOString()
            };

            await addDoc(collection(db, 'historiasClinicas'), historiaClinicaData);
        }

        document.getElementById('resultadoCitaModal').classList.remove('active');
        hideLoadingModal();
        showSuccessModal('Resultado guardado y historia clínica creada exitosamente');
        
        citaActualParaResultado = null;
        await loadCitas();
    } catch (error) {
        hideLoadingModal();
        console.error('Error saving resultado:', error);
        showErrorModal('Error al guardar el resultado');
    }
});

// Calendar functionality
let currentView = 'list';
let currentCalendarDate = new Date();

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

// Calendar navigation
document.getElementById('prevMonth').addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById('nextMonth').addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
});

function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    // Update title
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    document.getElementById('calendarTitle').textContent = `${monthNames[month]} ${year}`;
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Get previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });
    
    // Add previous month days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        const dayElement = createCalendarDay(day, year, month - 1, true);
        calendarGrid.appendChild(dayElement);
    }
    
    // Add current month days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = day === today.getDate() && 
                       month === today.getMonth() && 
                       year === today.getFullYear();
        const dayElement = createCalendarDay(day, year, month, false, isToday);
        calendarGrid.appendChild(dayElement);
    }
    
    // Add next month days to complete the grid
    const totalCells = calendarGrid.children.length - 7; // Subtract headers
    const remainingCells = 42 - totalCells; // 6 weeks * 7 days
    for (let day = 1; day <= remainingCells; day++) {
        const dayElement = createCalendarDay(day, year, month + 1, true);
        calendarGrid.appendChild(dayElement);
    }
}

function createCalendarDay(day, year, month, isOtherMonth, isToday = false) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    if (isOtherMonth) dayElement.classList.add('other-month');
    if (isToday) dayElement.classList.add('today');
    
    const dayNumber = document.createElement('div');
    dayNumber.className = 'calendar-day-number';
    dayNumber.textContent = day;
    dayElement.appendChild(dayNumber);
    
    // Get citas for this day
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayCitas = allCitas.filter(cita => cita.fechaCita === dateStr);
    
    // Add citas to day
    dayCitas.forEach(cita => {
        const citaElement = document.createElement('div');
        citaElement.className = `calendar-cita-item ${cita.estado}`;
        
        let pacienteNombre;
        if (cita.tipoPaciente === 'externo') {
            pacienteNombre = cita.nombreExterno;
        } else {
            const paciente = allPacientes.find(p => p.id === cita.pacienteId);
            pacienteNombre = paciente ? paciente.nombre.split(' ')[0] : 'Paciente';
        }
        
        citaElement.textContent = `${formatTime(cita.horaCita)} - ${pacienteNombre}`;
        citaElement.onclick = (e) => {
            e.stopPropagation();
            viewCita(cita.id);
        };
        dayElement.appendChild(citaElement);
    });
    
    return dayElement;
}
