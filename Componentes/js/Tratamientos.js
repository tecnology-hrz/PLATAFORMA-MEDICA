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

let allTratamientos = [];
let filteredTratamientos = [];
let allPacientes = [];
let editingTratamientoId = null;

// Check authentication
window.addEventListener('DOMContentLoaded', () => {
    const sessionData = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');

    if (!sessionData) {
        window.location.href = '../Login.html';
        return;
    }

    setTimeout(() => {
        loadPacientes();
        loadTratamientos();
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

// Load tratamientos
async function loadTratamientos() {
    try {
        const querySnapshot = await getDocs(collection(db, 'tratamientos'));
        allTratamientos = [];

        querySnapshot.forEach((doc) => {
            allTratamientos.push({
                id: doc.id,
                ...doc.data()
            });
        });

        allTratamientos.sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));

        filteredTratamientos = [...allTratamientos];
        updateStats();
        renderTratamientos();
    } catch (error) {
        console.error('Error loading tratamientos:', error);
    }
}

function updateStats() {
    const totalTratamientos = allTratamientos.length;
    const tratamientosEnCurso = allTratamientos.filter(t => t.estado === 'En Curso').length;
    const tratamientosCompletados = allTratamientos.filter(t => t.estado === 'Completado').length;
    
    // Contar pacientes únicos con tratamientos activos
    const pacientesActivos = new Set(
        allTratamientos
            .filter(t => t.estado === 'En Curso')
            .map(t => t.pacienteId)
    ).size;

    document.getElementById('totalTratamientos').textContent = totalTratamientos;
    document.getElementById('tratamientosEnCurso').textContent = tratamientosEnCurso;
    document.getElementById('tratamientosCompletados').textContent = tratamientosCompletados;
    document.getElementById('pacientesActivos').textContent = pacientesActivos;
}

function renderTratamientos() {
    const tbody = document.getElementById('tratamientosTableBody');
    const resultsCount = document.getElementById('resultsCount');

    resultsCount.textContent = `${filteredTratamientos.length} tratamiento${filteredTratamientos.length !== 1 ? 's' : ''}`;

    if (filteredTratamientos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fas fa-syringe"></i></div>
                        <h3 class="empty-title">No se encontraron tratamientos</h3>
                        <p class="empty-message">Crea el primer tratamiento haciendo clic en "Nuevo Tratamiento"</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredTratamientos.map(tratamiento => {
        const paciente = allPacientes.find(p => p.id === tratamiento.pacienteId);
        const pacienteNombre = paciente ? paciente.nombre : 'Paciente no encontrado';
        const pacienteFoto = paciente ? paciente.foto : '';

        const avatarHtml = pacienteFoto
            ? `<img src="${pacienteFoto}" alt="${pacienteNombre}">`
            : `<i class="fas fa-user"></i>`;

        const estadoClass = `status-${tratamiento.estado.toLowerCase().replace(' ', '-')}`;
        const estadoIcon = {
            'En Curso': 'fa-hourglass-half',
            'Completado': 'fa-check-circle',
            'Suspendido': 'fa-pause-circle'
        }[tratamiento.estado] || 'fa-question';

        return `
            <tr>
                <td>
                    <div class="patient-cell">
                        <div class="patient-avatar">${avatarHtml}</div>
                        <div class="patient-info">
                            <h4>${pacienteNombre}</h4>
                            <p>Cédula: ${paciente ? paciente.cedula : 'N/A'}</p>
                        </div>
                    </div>
                </td>
                <td>${tratamiento.tipoTratamiento}</td>
                <td>${formatDate(tratamiento.fechaInicio)}</td>
                <td>${tratamiento.duracion} sesiones (${tratamiento.frecuencia})</td>
                <td>
                    <span class="status-badge ${estadoClass}">
                        <i class="fas ${estadoIcon}"></i>
                        ${tratamiento.estado}
                    </span>
                </td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-action btn-view" onclick="viewTratamiento('${tratamiento.id}')" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action btn-edit" onclick="editTratamiento('${tratamiento.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${tratamiento.estado === 'En Curso' ? `
                            <button class="btn-action btn-complete" onclick="completarTratamiento('${tratamiento.id}')" title="Marcar como completado">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        <button class="btn-action btn-delete" onclick="deleteTratamiento('${tratamiento.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('es-ES', options);
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

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const estado = filterEstado.value;

    filteredTratamientos = allTratamientos.filter(tratamiento => {
        const paciente = allPacientes.find(p => p.id === tratamiento.pacienteId);
        const pacienteNombre = paciente ? paciente.nombre.toLowerCase() : '';

        const matchSearch = !searchTerm ||
            pacienteNombre.includes(searchTerm) ||
            tratamiento.tipoTratamiento.toLowerCase().includes(searchTerm);

        const matchEstado = !estado || tratamiento.estado === estado;

        return matchSearch && matchEstado;
    });

    renderTratamientos();
}

// Open add tratamiento modal
document.getElementById('addTratamientoBtn').addEventListener('click', () => {
    editingTratamientoId = null;
    document.getElementById('modalTitle').textContent = 'Nuevo Tratamiento';
    document.getElementById('tratamientoForm').reset();
    document.getElementById('fechaInicio').value = getLocalDateString();
    document.getElementById('tratamientoModal').classList.add('active');
});

// Close modals
document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('tratamientoModal').classList.remove('active');
});

document.getElementById('cancelBtn').addEventListener('click', () => {
    document.getElementById('tratamientoModal').classList.remove('active');
});

document.getElementById('closeViewModal').addEventListener('click', () => {
    document.getElementById('viewTratamientoModal').classList.remove('active');
});

document.getElementById('closeViewBtn').addEventListener('click', () => {
    document.getElementById('viewTratamientoModal').classList.remove('active');
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

// Save tratamiento
document.getElementById('tratamientoForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const pacienteId = document.getElementById('pacienteId').value;
    const tipoTratamiento = document.getElementById('tipoTratamiento').value;
    const fechaInicio = document.getElementById('fechaInicio').value;
    const duracion = document.getElementById('duracion').value;
    const frecuencia = document.getElementById('frecuencia').value;
    const descripcion = document.getElementById('descripcion').value.trim();
    const indicaciones = document.getElementById('indicaciones').value.trim();
    const observaciones = document.getElementById('observaciones').value.trim();

    if (!pacienteId || !tipoTratamiento || !fechaInicio || !duracion || !descripcion) {
        showErrorModal('Por favor, completa todos los campos obligatorios');
        return;
    }

    showLoadingModal(editingTratamientoId ? 'Actualizando tratamiento...' : 'Guardando tratamiento...');

    try {
        const tratamientoData = {
            pacienteId,
            tipoTratamiento,
            fechaInicio,
            duracion: parseInt(duracion),
            frecuencia,
            descripcion,
            indicaciones,
            observaciones,
            estado: editingTratamientoId ? 
                allTratamientos.find(t => t.id === editingTratamientoId).estado : 
                'En Curso',
            fechaCreacion: editingTratamientoId ? 
                allTratamientos.find(t => t.id === editingTratamientoId).fechaCreacion : 
                new Date().toISOString()
        };

        if (editingTratamientoId) {
            await updateDoc(doc(db, 'tratamientos', editingTratamientoId), tratamientoData);
        } else {
            await addDoc(collection(db, 'tratamientos'), tratamientoData);
        }

        document.getElementById('tratamientoModal').classList.remove('active');
        hideLoadingModal();
        showSuccessModal(editingTratamientoId ? 'Tratamiento actualizado exitosamente' : 'Tratamiento registrado exitosamente');

        await loadTratamientos();
    } catch (error) {
        hideLoadingModal();
        console.error('Error saving tratamiento:', error);
        showErrorModal('Error al guardar el tratamiento');
    }
});

// Edit tratamiento
window.editTratamiento = function(tratamientoId) {
    const tratamiento = allTratamientos.find(t => t.id === tratamientoId);
    if (!tratamiento) return;

    editingTratamientoId = tratamientoId;
    document.getElementById('modalTitle').textContent = 'Editar Tratamiento';

    document.getElementById('pacienteId').value = tratamiento.pacienteId;
    document.getElementById('tipoTratamiento').value = tratamiento.tipoTratamiento;
    document.getElementById('fechaInicio').value = tratamiento.fechaInicio;
    document.getElementById('duracion').value = tratamiento.duracion;
    document.getElementById('frecuencia').value = tratamiento.frecuencia;
    document.getElementById('descripcion').value = tratamiento.descripcion;
    document.getElementById('indicaciones').value = tratamiento.indicaciones || '';
    document.getElementById('observaciones').value = tratamiento.observaciones || '';

    document.getElementById('tratamientoModal').classList.add('active');
};

// View tratamiento
window.viewTratamiento = function(tratamientoId) {
    const tratamiento = allTratamientos.find(t => t.id === tratamientoId);
    if (!tratamiento) return;

    const paciente = allPacientes.find(p => p.id === tratamiento.pacienteId);
    const pacienteNombre = paciente ? paciente.nombre : 'Paciente no encontrado';
    const pacienteCedula = paciente ? paciente.cedula : '';

    const content = document.getElementById('viewTratamientoContent');

    content.innerHTML = `
        <div class="tratamiento-detail-section">
            <h3><i class="fas fa-user-injured"></i> Información del Paciente</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Paciente</div>
                    <div class="detail-value">${pacienteNombre}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Cédula</div>
                    <div class="detail-value">${pacienteCedula}</div>
                </div>
            </div>
        </div>
        
        <div class="tratamiento-detail-section">
            <h3><i class="fas fa-syringe"></i> Información del Tratamiento</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Tipo</div>
                    <div class="detail-value">${tratamiento.tipoTratamiento}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Fecha de Inicio</div>
                    <div class="detail-value">${formatDate(tratamiento.fechaInicio)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Duración</div>
                    <div class="detail-value">${tratamiento.duracion} sesiones</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Frecuencia</div>
                    <div class="detail-value">${tratamiento.frecuencia}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Estado</div>
                    <div class="detail-value">${tratamiento.estado}</div>
                </div>
            </div>
        </div>
        
        <div class="tratamiento-detail-section">
            <h3><i class="fas fa-file-alt"></i> Descripción</h3>
            <div class="detail-value">${tratamiento.descripcion}</div>
        </div>
        
        ${tratamiento.indicaciones ? `
        <div class="tratamiento-detail-section">
            <h3><i class="fas fa-notes-medical"></i> Indicaciones para el Paciente</h3>
            <div class="detail-value">${tratamiento.indicaciones}</div>
        </div>
        ` : ''}
        
        ${tratamiento.observaciones ? `
        <div class="tratamiento-detail-section">
            <h3><i class="fas fa-sticky-note"></i> Observaciones Médicas</h3>
            <div class="detail-value">${tratamiento.observaciones}</div>
        </div>
        ` : ''}
    `;

    document.getElementById('viewTratamientoModal').classList.add('active');
};

// Completar tratamiento
window.completarTratamiento = async function(tratamientoId) {
    showLoadingModal('Completando tratamiento...');

    try {
        await updateDoc(doc(db, 'tratamientos', tratamientoId), {
            estado: 'Completado'
        });

        hideLoadingModal();
        showSuccessModal('Tratamiento marcado como completado');
        await loadTratamientos();
    } catch (error) {
        hideLoadingModal();
        console.error('Error completing tratamiento:', error);
        showErrorModal('Error al completar el tratamiento');
    }
};

// Delete tratamiento
window.deleteTratamiento = function(tratamientoId) {
    document.getElementById('confirmModal').classList.add('active');

    document.getElementById('confirmDeleteBtn').onclick = async () => {
        document.getElementById('confirmModal').classList.remove('active');
        showLoadingModal('Eliminando tratamiento...');

        try {
            await deleteDoc(doc(db, 'tratamientos', tratamientoId));

            hideLoadingModal();
            showSuccessModal('Tratamiento eliminado exitosamente');
            await loadTratamientos();
        } catch (error) {
            hideLoadingModal();
            console.error('Error deleting tratamiento:', error);
            showErrorModal('Error al eliminar el tratamiento');
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
