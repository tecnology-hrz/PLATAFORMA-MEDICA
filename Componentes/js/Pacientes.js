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

// ImgBB API Key
const IMGBB_API_KEY = '2e40e99a54d9185b904e9667b2658747';

let allPatients = [];
let filteredPatients = [];
let allUsuarios = [];
let uploadedPhotoUrl = '';
let editingPatientId = null;

// Check authentication
window.addEventListener('DOMContentLoaded', () => {
    const sessionData = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
    
    if (!sessionData) {
        window.location.href = '../Login.html';
        return;
    }
    
    setTimeout(() => {
        loadUsuarios();
        loadPatients();
    }, 100);
});

// Load usuarios (para asesores)
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

        populateUsuarioSelects();
    } catch (error) {
        console.error('Error loading usuarios:', error);
    }
}

function populateUsuarioSelects() {
    const asesorSelect = document.getElementById('asesorComercial');
    const atendidoSelect = document.getElementById('atendidoPor');
    
    if (!asesorSelect || !atendidoSelect) return;
    
    asesorSelect.innerHTML = '<option value="">Seleccionar asesor</option>';
    atendidoSelect.innerHTML = '<option value="">Seleccionar persona</option>';

    allUsuarios.forEach(usuario => {
        const especialidad = usuario.especialidad || usuario.rol || usuario.tipoUsuario || 'Usuario';
        const option = `<option value="${usuario.id}">${usuario.nombre} - ${especialidad}</option>`;
        asesorSelect.innerHTML += option;
        atendidoSelect.innerHTML += option;
    });
}

// Load all patients
async function loadPatients() {
    try {
        const querySnapshot = await getDocs(collection(db, 'pacientes'));
        allPatients = [];
        
        querySnapshot.forEach((doc) => {
            allPatients.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        filteredPatients = [...allPatients];
        updateStats();
        renderPatients();
    } catch (error) {
        console.error('Error loading patients:', error);
    }
}

// Update statistics
function updateStats() {
    const totalPatients = allPatients.length;
    document.getElementById('totalPatients').textContent = totalPatients;
}

// Render patients table
function renderPatients() {
    const tbody = document.getElementById('patientsTableBody');
    const resultsCount = document.getElementById('resultsCount');
    
    resultsCount.textContent = `${filteredPatients.length} paciente${filteredPatients.length !== 1 ? 's' : ''}`;
    
    if (filteredPatients.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fas fa-user-injured"></i></div>
                        <h3 class="empty-title">No se encontraron pacientes</h3>
                        <p class="empty-message">Agrega tu primer paciente haciendo clic en "Nuevo Paciente"</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredPatients.map(patient => {
        const avatarHtml = patient.foto 
            ? `<img src="${patient.foto}" alt="${patient.nombre}">`
            : `<i class="fas fa-user"></i>`;
        
        // Badge de nivel de intención
        let nivelBadge = '<span style="color: #6c757d;">Sin definir</span>';
        if (patient.nivelIntencion) {
            const nivelClass = patient.nivelIntencion.toLowerCase();
            const nivelColors = {
                'alta': '#dc3545',
                'media': '#ffc107',
                'baja': '#6c757d'
            };
            const color = nivelColors[nivelClass] || '#6c757d';
            nivelBadge = `<span style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; background: ${color}15; color: ${color}; border-radius: 12px; font-size: 12px; font-weight: 600;">
                <i class="fas fa-circle" style="font-size: 6px;"></i>
                ${patient.nivelIntencion}
            </span>`;
        }
        
        // Badge de estado de seguimiento
        let estadoBadge = '<span style="color: #6c757d;">Sin estado</span>';
        if (patient.estadoSeguimiento) {
            const estadoColors = {
                'Pendiente': '#ffc107',
                'En Proceso': '#17a2b8',
                'Completado': '#28a745'
            };
            const color = estadoColors[patient.estadoSeguimiento] || '#6c757d';
            estadoBadge = `<span style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; background: ${color}15; color: ${color}; border-radius: 12px; font-size: 12px; font-weight: 600;">
                <i class="fas fa-circle" style="font-size: 6px;"></i>
                ${patient.estadoSeguimiento}
            </span>`;
        }
        
        // Construir información expandida
        const asesor = allUsuarios.find(u => u.id === patient.asesorComercial);
        const atendido = allUsuarios.find(u => u.id === patient.atendidoPor);
        
        const expandedContent = `
            <tr class="expanded-row" id="expanded-${patient.id}" style="display: none;">
                <td colspan="8">
                    <div class="expanded-content">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
                            <!-- Información Personal -->
                            <div>
                                <h4 style="color: #D11A5C; font-size: 16px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                                    <i class="fas fa-user"></i> Información Personal
                                </h4>
                                <div style="display: grid; gap: 12px;">
                                    <div style="background: white; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between;">
                                        <span style="color: #6c757d; font-weight: 600;"><i class="fas fa-id-card" style="margin-right: 8px; color: #D11A5C;"></i>Cédula:</span>
                                        <span style="color: #2B3545;">${patient.cedula}</span>
                                    </div>
                                    <div style="background: white; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between;">
                                        <span style="color: #6c757d; font-weight: 600;"><i class="fas fa-birthday-cake" style="margin-right: 8px; color: #D11A5C;"></i>Fecha Nacimiento:</span>
                                        <span style="color: #2B3545;">${patient.fechaNacimiento ? formatDate(patient.fechaNacimiento) : 'No especificado'}</span>
                                    </div>
                                    <div style="background: white; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between;">
                                        <span style="color: #6c757d; font-weight: 600;"><i class="fas fa-venus-mars" style="margin-right: 8px; color: #D11A5C;"></i>Género:</span>
                                        <span style="color: #2B3545;">${patient.genero || 'No especificado'}</span>
                                    </div>
                                    <div style="background: white; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between;">
                                        <span style="color: #6c757d; font-weight: 600;"><i class="fas fa-map-marker-alt" style="margin-right: 8px; color: #D11A5C;"></i>Dirección:</span>
                                        <span style="color: #2B3545;">${patient.direccion || 'No especificada'}</span>
                                    </div>
                                    <div style="background: white; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between;">
                                        <span style="color: #6c757d; font-weight: 600;"><i class="fas fa-city" style="margin-right: 8px; color: #D11A5C;"></i>Ciudad:</span>
                                        <span style="color: #2B3545;">${patient.ciudad || 'No especificada'}</span>
                                    </div>
                                    <div style="background: white; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between;">
                                        <span style="color: #6c757d; font-weight: 600;"><i class="fas fa-phone-alt" style="margin-right: 8px; color: #D11A5C;"></i>Contacto Emergencia:</span>
                                        <span style="color: #2B3545;">${patient.contactoEmergencia || 'No especificado'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Información CRM -->
                            <div>
                                <h4 style="color: #D11A5C; font-size: 16px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                                    <i class="fas fa-user-friends"></i> Seguimiento CRM
                                </h4>
                                <div style="display: grid; gap: 12px;">
                                    ${patient.asesorComercial ? `
                                    <div style="background: white; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between;">
                                        <span style="color: #6c757d; font-weight: 600;"><i class="fas fa-user-tie" style="margin-right: 8px; color: #D11A5C;"></i>Asesor Comercial:</span>
                                        <span style="color: #2B3545;">${asesor ? asesor.nombre : 'No asignado'}</span>
                                    </div>` : ''}
                                    ${patient.atendidoPor ? `
                                    <div style="background: white; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between;">
                                        <span style="color: #6c757d; font-weight: 600;"><i class="fas fa-user-nurse" style="margin-right: 8px; color: #D11A5C;"></i>Atendido Por:</span>
                                        <span style="color: #2B3545;">${atendido ? atendido.nombre : 'No especificado'}</span>
                                    </div>` : ''}
                                    ${patient.fechaValoracion ? `
                                    <div style="background: white; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between;">
                                        <span style="color: #6c757d; font-weight: 600;"><i class="fas fa-calendar-check" style="margin-right: 8px; color: #D11A5C;"></i>Fecha Valoración:</span>
                                        <span style="color: #2B3545;">${formatDate(patient.fechaValoracion)}</span>
                                    </div>` : ''}
                                    ${patient.asistencia ? `
                                    <div style="background: white; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between;">
                                        <span style="color: #6c757d; font-weight: 600;"><i class="fas fa-clipboard-check" style="margin-right: 8px; color: #D11A5C;"></i>Asistencia:</span>
                                        <span style="color: #2B3545;">${patient.asistencia}</span>
                                    </div>` : ''}
                                    ${patient.resultadoMedico ? `
                                    <div style="background: white; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between;">
                                        <span style="color: #6c757d; font-weight: 600;"><i class="fas fa-heartbeat" style="margin-right: 8px; color: #D11A5C;"></i>Resultado Médico:</span>
                                        <span style="color: #2B3545;">${patient.resultadoMedico}</span>
                                    </div>` : ''}
                                    ${patient.sensacionPaciente ? `
                                    <div style="background: white; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between;">
                                        <span style="color: #6c757d; font-weight: 600;"><i class="fas fa-smile" style="margin-right: 8px; color: #D11A5C;"></i>Sensación:</span>
                                        <span style="color: #2B3545;">${patient.sensacionPaciente}</span>
                                    </div>` : ''}
                                    ${patient.proximoPaso ? `
                                    <div style="background: white; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between;">
                                        <span style="color: #6c757d; font-weight: 600;"><i class="fas fa-directions" style="margin-right: 8px; color: #D11A5C;"></i>Próximo Paso:</span>
                                        <span style="color: #2B3545;">${patient.proximoPaso}</span>
                                    </div>` : ''}
                                    ${patient.fechaSeguimiento ? `
                                    <div style="background: white; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between;">
                                        <span style="color: #6c757d; font-weight: 600;"><i class="fas fa-calendar-alt" style="margin-right: 8px; color: #D11A5C;"></i>Fecha Seguimiento:</span>
                                        <span style="color: #2B3545;">${formatDate(patient.fechaSeguimiento)}</span>
                                    </div>` : ''}
                                    ${!patient.asesorComercial && !patient.atendidoPor && !patient.fechaValoracion && !patient.asistencia ? `
                                    <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; color: #6c757d;">
                                        <i class="fas fa-info-circle" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                                        Sin información de seguimiento CRM
                                    </div>` : ''}
                                </div>
                            </div>
                        </div>
                        
                        ${patient.insightEmocional || patient.observacionesMedicas || patient.observaciones ? `
                        <div style="margin-top: 20px;">
                            <h4 style="color: #D11A5C; font-size: 16px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-clipboard"></i> Observaciones
                            </h4>
                            <div style="display: grid; gap: 12px;">
                                ${patient.insightEmocional ? `
                                <div style="background: white; padding: 15px; border-radius: 8px;">
                                    <span style="color: #6c757d; font-weight: 600; display: block; margin-bottom: 8px;"><i class="fas fa-lightbulb" style="margin-right: 8px; color: #D11A5C;"></i>Insight Emocional:</span>
                                    <span style="color: #2B3545; line-height: 1.6;">${patient.insightEmocional}</span>
                                </div>` : ''}
                                ${patient.observacionesMedicas ? `
                                <div style="background: white; padding: 15px; border-radius: 8px;">
                                    <span style="color: #6c757d; font-weight: 600; display: block; margin-bottom: 8px;"><i class="fas fa-notes-medical" style="margin-right: 8px; color: #D11A5C;"></i>Observaciones Médicas:</span>
                                    <span style="color: #2B3545; line-height: 1.6;">${patient.observacionesMedicas}</span>
                                </div>` : ''}
                                ${patient.observaciones ? `
                                <div style="background: white; padding: 15px; border-radius: 8px;">
                                    <span style="color: #6c757d; font-weight: 600; display: block; margin-bottom: 8px;"><i class="fas fa-file-alt" style="margin-right: 8px; color: #D11A5C;"></i>Observaciones Generales:</span>
                                    <span style="color: #2B3545; line-height: 1.6;">${patient.observaciones}</span>
                                </div>` : ''}
                            </div>
                        </div>` : ''}
                    </div>
                </td>
            </tr>
        `;
        
        return `
            <tr class="patient-row" data-patient-id="${patient.id}">
                <td style="text-align: center;">
                    <button class="btn-expand" onclick="togglePatientRow('${patient.id}')" title="Ver detalles">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </td>
                <td>
                    <div class="patient-cell">
                        <div class="patient-avatar">${avatarHtml}</div>
                        <div class="patient-info">
                            <h4>${patient.nombre}</h4>
                            <p>Cédula: ${patient.cedula}</p>
                        </div>
                    </div>
                </td>
                <td>${patient.telefono || 'N/A'}</td>
                <td>${patient.email || 'N/A'}</td>
                <td>${nivelBadge}</td>
                <td>${estadoBadge}</td>
                <td>${formatDate(patient.fechaRegistro)}</td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-action btn-edit" onclick="editPatient('${patient.id}')" title="Editar paciente">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-history" onclick="viewPatientHistorias('${patient.id}')" title="Ver historias clínicas">
                            <i class="fas fa-file-medical"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="deletePatient('${patient.id}')" title="Eliminar paciente">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
            ${expandedContent}
        `;
    }).join('');
}

// Toggle patient row expansion
window.togglePatientRow = function(patientId) {
    const expandedRow = document.getElementById(`expanded-${patientId}`);
    const patientRow = document.querySelector(`[data-patient-id="${patientId}"]`);
    const btn = document.querySelector(`[data-patient-id="${patientId}"] .btn-expand i`);
    
    if (expandedRow.style.display === 'none') {
        expandedRow.style.display = 'table-row';
        patientRow.classList.add('active');
        btn.classList.remove('fa-chevron-down');
        btn.classList.add('fa-chevron-up');
    } else {
        expandedRow.style.display = 'none';
        patientRow.classList.remove('active');
        btn.classList.remove('fa-chevron-up');
        btn.classList.add('fa-chevron-down');
    }
}

// Search and filter functionality
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const filterGenero = document.getElementById('filterGenero');
const filterNivelIntencion = document.getElementById('filterNivelIntencion');
const filterEstadoSeguimiento = document.getElementById('filterEstadoSeguimiento');

searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    
    if (searchTerm) {
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

filterGenero.addEventListener('change', applyFilters);
filterNivelIntencion.addEventListener('change', applyFilters);
filterEstadoSeguimiento.addEventListener('change', applyFilters);

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const generoFilter = filterGenero.value;
    const nivelIntencionFilter = filterNivelIntencion.value;
    const estadoSeguimientoFilter = filterEstadoSeguimiento.value;
    
    filteredPatients = allPatients.filter(patient => {
        const matchSearch = !searchTerm || 
            patient.nombre.toLowerCase().includes(searchTerm) ||
            patient.cedula.includes(searchTerm) ||
            (patient.email && patient.email.toLowerCase().includes(searchTerm)) ||
            (patient.telefono && patient.telefono.includes(searchTerm));
        
        const matchGenero = !generoFilter || patient.genero === generoFilter;
        const matchNivelIntencion = !nivelIntencionFilter || patient.nivelIntencion === nivelIntencionFilter;
        const matchEstadoSeguimiento = !estadoSeguimientoFilter || patient.estadoSeguimiento === estadoSeguimientoFilter;
        
        return matchSearch && matchGenero && matchNivelIntencion && matchEstadoSeguimiento;
    });
    
    renderPatients();
}

// Open add patient modal
document.getElementById('addPatientBtn').addEventListener('click', () => {
    editingPatientId = null;
    document.getElementById('modalTitle').textContent = 'Nuevo Paciente';
    document.getElementById('patientForm').reset();
    document.getElementById('photoPreview').innerHTML = '<i class="fas fa-user"></i>';
    uploadedPhotoUrl = '';
    document.getElementById('patientModal').classList.add('active');
});

// Photo upload
const photoInput = document.getElementById('patientPhotoInput');
const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');

uploadPhotoBtn.addEventListener('click', () => {
    photoInput.click();
});

photoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showErrorModal('Por favor, selecciona un archivo de imagen válido');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showErrorModal('La imagen no debe superar los 5MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('photoPreview').innerHTML = `<img src="${e.target.result}" alt="Foto">`;
    };
    reader.readAsDataURL(file);
    
    showLoadingModal('Subiendo foto...');
    
    try {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            uploadedPhotoUrl = data.data.url;
            hideLoadingModal();
            showSuccessModal('Foto subida exitosamente');
        } else {
            throw new Error('Error al subir la imagen');
        }
    } catch (error) {
        hideLoadingModal();
        console.error('Error uploading photo:', error);
        showErrorModal('Error al subir la foto');
        document.getElementById('photoPreview').innerHTML = '<i class="fas fa-user"></i>';
        uploadedPhotoUrl = '';
    }
});

// Save patient
document.getElementById('patientForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nombre = document.getElementById('nombre').value.trim();
    const cedula = document.getElementById('cedula').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const email = document.getElementById('email').value.trim();
    const direccion = document.getElementById('direccion').value.trim();
    const ciudad = document.getElementById('ciudad').value.trim();
    const pais = document.getElementById('pais').value.trim();
    const codigoPostal = document.getElementById('codigoPostal').value.trim();
    const estadoCivil = document.getElementById('estadoCivil').value;
    const ocupacion = document.getElementById('ocupacion').value.trim();
    const contactoEmergencia = document.getElementById('contactoEmergencia').value.trim();
    const fechaNacimiento = document.getElementById('fechaNacimiento').value;
    const genero = document.getElementById('genero').value;
    const observaciones = document.getElementById('observaciones').value.trim();
    
    if (!nombre || !cedula) {
        showErrorModal('El nombre y la cédula son obligatorios');
        return;
    }
    
    showLoadingModal(editingPatientId ? 'Actualizando paciente...' : 'Guardando paciente...');
    
    try {
        const patientData = {
            nombre,
            cedula,
            telefono,
            email,
            direccion,
            ciudad,
            pais,
            codigoPostal,
            estadoCivil,
            ocupacion,
            contactoEmergencia,
            fechaNacimiento,
            genero,
            observaciones,
            foto: uploadedPhotoUrl || '',
            // Campos CRM
            asesorComercial: document.getElementById('asesorComercial').value,
            atendidoPor: document.getElementById('atendidoPor').value,
            fechaValoracion: document.getElementById('fechaValoracion').value,
            asistencia: document.getElementById('asistencia').value,
            resultadoMedico: document.getElementById('resultadoMedico').value,
            nivelIntencion: document.getElementById('nivelIntencion').value,
            sensacionPaciente: document.getElementById('sensacionPaciente').value,
            proximoPaso: document.getElementById('proximoPaso').value,
            fechaSeguimiento: document.getElementById('fechaSeguimiento').value,
            estadoSeguimiento: document.getElementById('estadoSeguimiento').value,
            insightEmocional: document.getElementById('insightEmocional').value.trim(),
            observacionesMedicas: document.getElementById('observacionesMedicas').value.trim(),
            fechaRegistro: editingPatientId ? allPatients.find(p => p.id === editingPatientId).fechaRegistro : new Date().toISOString()
        };
        
        if (editingPatientId) {
            await updateDoc(doc(db, 'pacientes', editingPatientId), patientData);
        } else {
            await addDoc(collection(db, 'pacientes'), patientData);
        }
        
        document.getElementById('patientModal').classList.remove('active');
        hideLoadingModal();
        showSuccessModal(editingPatientId ? 'Paciente actualizado exitosamente' : 'Paciente registrado exitosamente');
        
        await loadPatients();
    } catch (error) {
        hideLoadingModal();
        console.error('Error saving patient:', error);
        showErrorModal('Error al guardar el paciente');
    }
});

// Edit patient
window.editPatient = async function(patientId) {
    const patient = allPatients.find(p => p.id === patientId);
    if (!patient) return;
    
    editingPatientId = patientId;
    document.getElementById('modalTitle').textContent = 'Editar Paciente';
    
    document.getElementById('nombre').value = patient.nombre;
    document.getElementById('cedula').value = patient.cedula;
    document.getElementById('telefono').value = patient.telefono || '';
    document.getElementById('email').value = patient.email || '';
    document.getElementById('direccion').value = patient.direccion || '';
    document.getElementById('ciudad').value = patient.ciudad || '';
    document.getElementById('pais').value = patient.pais || '';
    document.getElementById('codigoPostal').value = patient.codigoPostal || '';
    document.getElementById('estadoCivil').value = patient.estadoCivil || '';
    document.getElementById('ocupacion').value = patient.ocupacion || '';
    document.getElementById('contactoEmergencia').value = patient.contactoEmergencia || '';
    document.getElementById('fechaNacimiento').value = patient.fechaNacimiento || '';
    document.getElementById('genero').value = patient.genero || '';
    document.getElementById('observaciones').value = patient.observaciones || '';
    
    // Campos CRM
    document.getElementById('asesorComercial').value = patient.asesorComercial || '';
    document.getElementById('atendidoPor').value = patient.atendidoPor || '';
    document.getElementById('fechaValoracion').value = patient.fechaValoracion || '';
    document.getElementById('asistencia').value = patient.asistencia || '';
    document.getElementById('resultadoMedico').value = patient.resultadoMedico || '';
    document.getElementById('nivelIntencion').value = patient.nivelIntencion || '';
    document.getElementById('sensacionPaciente').value = patient.sensacionPaciente || '';
    document.getElementById('proximoPaso').value = patient.proximoPaso || '';
    document.getElementById('fechaSeguimiento').value = patient.fechaSeguimiento || '';
    document.getElementById('estadoSeguimiento').value = patient.estadoSeguimiento || 'Pendiente';
    document.getElementById('insightEmocional').value = patient.insightEmocional || '';
    document.getElementById('observacionesMedicas').value = patient.observacionesMedicas || '';
    
    if (patient.foto) {
        document.getElementById('photoPreview').innerHTML = `<img src="${patient.foto}" alt="${patient.nombre}">`;
        uploadedPhotoUrl = patient.foto;
    } else {
        document.getElementById('photoPreview').innerHTML = '<i class="fas fa-user"></i>';
        uploadedPhotoUrl = '';
    }
    
    document.getElementById('patientModal').classList.add('active');
};

// View patient details
window.viewPatient = function(patientId) {
    const patient = allPatients.find(p => p.id === patientId);
    if (!patient) return;
    
    const modal = document.getElementById('viewPatientModal');
    
    // Set avatar
    const avatarEl = document.getElementById('viewPatientAvatar');
    if (patient.foto) {
        avatarEl.innerHTML = `<img src="${patient.foto}" alt="${patient.nombre}">`;
    } else {
        avatarEl.innerHTML = '<i class="fas fa-user"></i>';
    }
    
    // Set patient info
    document.getElementById('viewPatientName').textContent = patient.nombre;
    document.getElementById('viewPatientCedula').textContent = patient.cedula;
    document.getElementById('viewPatientTelefono').textContent = patient.telefono || 'No especificado';
    document.getElementById('viewPatientEmail').textContent = patient.email || 'No especificado';
    document.getElementById('viewPatientDireccion').textContent = patient.direccion || 'No especificado';
    document.getElementById('viewPatientCiudad').textContent = patient.ciudad || 'No especificado';
    document.getElementById('viewPatientPais').textContent = patient.pais || 'No especificado';
    document.getElementById('viewPatientCodigoPostal').textContent = patient.codigoPostal || 'No especificado';
    document.getElementById('viewPatientEstadoCivil').textContent = patient.estadoCivil || 'No especificado';
    document.getElementById('viewPatientOcupacion').textContent = patient.ocupacion || 'No especificado';
    document.getElementById('viewPatientContactoEmergencia').textContent = patient.contactoEmergencia || 'No especificado';
    document.getElementById('viewPatientFechaNacimiento').textContent = patient.fechaNacimiento ? formatDate(patient.fechaNacimiento) : 'No especificado';
    document.getElementById('viewPatientGenero').textContent = patient.genero || 'No especificado';
    document.getElementById('viewPatientFechaRegistro').textContent = formatDate(patient.fechaRegistro);
    document.getElementById('viewPatientObservaciones').textContent = patient.observaciones || 'Sin observaciones';
    
    // Mostrar información CRM si existe
    const crmSection = document.getElementById('crmInfoSection');
    const hasCRMData = patient.asesorComercial || patient.atendidoPor || patient.fechaValoracion || 
                       patient.asistencia || patient.resultadoMedico || patient.nivelIntencion || 
                       patient.sensacionPaciente || patient.proximoPaso || patient.estadoSeguimiento;
    
    if (hasCRMData) {
        crmSection.style.display = 'block';
        
        // Obtener nombres de usuarios
        const asesor = allUsuarios.find(u => u.id === patient.asesorComercial);
        const atendido = allUsuarios.find(u => u.id === patient.atendidoPor);
        
        document.getElementById('viewAsesorComercial').textContent = asesor ? asesor.nombre : 'No asignado';
        document.getElementById('viewAtendidoPor').textContent = atendido ? atendido.nombre : 'No especificado';
        document.getElementById('viewFechaValoracion').textContent = patient.fechaValoracion ? formatDate(patient.fechaValoracion) : 'No especificada';
        document.getElementById('viewAsistencia').textContent = patient.asistencia || 'No especificada';
        document.getElementById('viewResultadoMedico').textContent = patient.resultadoMedico || 'No especificado';
        document.getElementById('viewNivelIntencion').textContent = patient.nivelIntencion || 'No especificado';
        document.getElementById('viewSensacionPaciente').textContent = patient.sensacionPaciente || 'No especificada';
        document.getElementById('viewProximoPaso').textContent = patient.proximoPaso || 'No especificado';
        document.getElementById('viewFechaSeguimiento').textContent = patient.fechaSeguimiento ? formatDate(patient.fechaSeguimiento) : 'No especificada';
        document.getElementById('viewEstadoSeguimiento').textContent = patient.estadoSeguimiento || 'Sin estado';
        document.getElementById('viewInsightEmocional').textContent = patient.insightEmocional || 'Sin insight';
        document.getElementById('viewObservacionesMedicas').textContent = patient.observacionesMedicas || 'Sin observaciones médicas';
    } else {
        crmSection.style.display = 'none';
    }
    
    modal.classList.add('active');
};

// Delete patient
window.deletePatient = function(patientId) {
    const patient = allPatients.find(p => p.id === patientId);
    if (!patient) return;
    
    showConfirmModal(
        '¿Eliminar Paciente?',
        `¿Estás seguro de que deseas eliminar a ${patient.nombre}? Esta acción no se puede deshacer.`,
        async () => {
            showLoadingModal('Eliminando paciente...');
            
            try {
                await deleteDoc(doc(db, 'pacientes', patientId));
                hideLoadingModal();
                showSuccessModal('Paciente eliminado exitosamente');
                await loadPatients();
            } catch (error) {
                hideLoadingModal();
                console.error('Error deleting patient:', error);
                showErrorModal('Error al eliminar el paciente');
            }
        }
    );
};

// Close modal
document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('patientModal').classList.remove('active');
});

document.getElementById('cancelBtn').addEventListener('click', () => {
    document.getElementById('patientModal').classList.remove('active');
});

document.getElementById('patientModal').addEventListener('click', (e) => {
    if (e.target.id === 'patientModal') {
        document.getElementById('patientModal').classList.remove('active');
    }
});

// Modal functions
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

document.getElementById('closeSuccess').addEventListener('click', () => {
    document.getElementById('successModal').classList.remove('active');
});

document.getElementById('closeError').addEventListener('click', () => {
    document.getElementById('errorModal').classList.remove('active');
});

document.getElementById('cancelDelete').addEventListener('click', () => {
    document.getElementById('confirmModal').classList.remove('active');
});

// Close view patient modal
document.getElementById('closeViewModal').addEventListener('click', () => {
    document.getElementById('viewPatientModal').classList.remove('active');
});

document.getElementById('viewPatientModal').addEventListener('click', (e) => {
    if (e.target.id === 'viewPatientModal') {
        document.getElementById('viewPatientModal').classList.remove('active');
    }
});

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Export functionality
document.getElementById('exportBtn').addEventListener('click', () => {
    const csvContent = generateCSV();
    downloadCSV(csvContent, 'pacientes.csv');
});

function generateCSV() {
    const headers = ['Nombre', 'Cédula', 'Teléfono', 'Email', 'Fecha Nacimiento', 'Género', 'Fecha Registro'];
    const rows = filteredPatients.map(patient => [
        patient.nombre,
        patient.cedula,
        patient.telefono || '',
        patient.email || '',
        patient.fechaNacimiento || '',
        patient.genero || '',
        formatDate(patient.fechaRegistro)
    ]);
    
    const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    
    return csv;
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// View patient historias
window.viewPatientHistorias = function(patientId) {
    window.location.href = `HistoriasClinicas.html?pacienteId=${patientId}`;
};
