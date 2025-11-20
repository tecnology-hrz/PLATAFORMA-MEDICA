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
        loadPatients();
    }, 100);
});

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
                <td colspan="6">
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
        
        return `
            <tr>
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
                <td>${formatDate(patient.fechaRegistro)}</td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-action btn-view" onclick="viewPatient('${patient.id}')" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action btn-history" onclick="viewPatientHistorias('${patient.id}')" title="Ver historias clínicas">
                            <i class="fas fa-file-medical"></i>
                        </button>
                        <button class="btn-action btn-edit" onclick="editPatient('${patient.id}')" title="Editar paciente">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="deletePatient('${patient.id}')" title="Eliminar paciente">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Search functionality
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');

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

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    
    filteredPatients = allPatients.filter(patient => {
        return !searchTerm || 
            patient.nombre.toLowerCase().includes(searchTerm) ||
            patient.cedula.includes(searchTerm) ||
            (patient.email && patient.email.toLowerCase().includes(searchTerm)) ||
            (patient.telefono && patient.telefono.includes(searchTerm));
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
