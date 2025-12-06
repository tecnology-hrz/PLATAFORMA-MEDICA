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

// ImgBB API Key
const IMGBB_API_KEY = '2e40e99a54d9185b904e9667b2658747';

let allHistorias = [];
let filteredHistorias = [];
let allPacientes = [];
let allTratamientos = [];
let uploadedImages = [];
let editingHistoriaId = null;

// Check authentication
window.addEventListener('DOMContentLoaded', () => {
    const sessionData = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
    
    if (!sessionData) {
        window.location.href = '../Login.html';
        return;
    }
    
    // Check if filtering by patient from URL
    const urlParams = new URLSearchParams(window.location.search);
    const pacienteIdFromUrl = urlParams.get('pacienteId');
    
    setTimeout(() => {
        loadPacientes();
        loadHistorias().then(() => {
            if (pacienteIdFromUrl) {
                document.getElementById('filterPaciente').value = pacienteIdFromUrl;
                applyFilters();
                
                // Show patient name in header
                const paciente = allPacientes.find(p => p.id === pacienteIdFromUrl);
                if (paciente) {
                    document.querySelector('.page-title').textContent = `Historias Clínicas - ${paciente.nombre}`;
                }
            }
        });
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
        
        populatePacienteSelects();
        
        // Load tratamientos
        await loadTratamientos();
    } catch (error) {
        console.error('Error loading pacientes:', error);
    }
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
    } catch (error) {
        console.error('Error loading tratamientos:', error);
    }
}

function populatePacienteSelects() {
    const pacienteSelect = document.getElementById('pacienteId');
    const filterSelect = document.getElementById('filterPaciente');
    
    pacienteSelect.innerHTML = '<option value="">Seleccionar paciente...</option>';
    filterSelect.innerHTML = '<option value="">Todos los Pacientes</option>';
    
    allPacientes.forEach(paciente => {
        pacienteSelect.innerHTML += `<option value="${paciente.id}">${paciente.nombre} - ${paciente.cedula}</option>`;
        filterSelect.innerHTML += `<option value="${paciente.id}">${paciente.nombre}</option>`;
    });
}

// Load historias
async function loadHistorias() {
    try {
        const querySnapshot = await getDocs(collection(db, 'historiasClinicas'));
        allHistorias = [];
        
        querySnapshot.forEach((doc) => {
            allHistorias.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        allHistorias.sort((a, b) => {
            const fechaA = new Date(a.fechaConsulta || a.fechaCita);
            const fechaB = new Date(b.fechaConsulta || b.fechaCita);
            return fechaB - fechaA;
        });
        
        filteredHistorias = [...allHistorias];
        updateStats();
        renderHistorias();
    } catch (error) {
        console.error('Error loading historias:', error);
    }
}

function updateStats() {
    document.getElementById('totalHistorias').textContent = allHistorias.length;
}

function renderHistorias() {
    const tbody = document.getElementById('historiasTableBody');
    const resultsCount = document.getElementById('resultsCount');
    
    resultsCount.textContent = `${filteredHistorias.length} historia${filteredHistorias.length !== 1 ? 's' : ''}`;
    
    if (filteredHistorias.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fas fa-file-medical"></i></div>
                        <h3 class="empty-title">No se encontraron historias clínicas</h3>
                        <p class="empty-message">Crea la primera historia clínica haciendo clic en "Nueva Historia Clínica"</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Group histories by patient
    const groupedHistorias = {};
    filteredHistorias.forEach(historia => {
        if (!groupedHistorias[historia.pacienteId]) {
            groupedHistorias[historia.pacienteId] = [];
        }
        groupedHistorias[historia.pacienteId].push(historia);
    });
    
    // Render grouped histories
    let html = '';
    Object.keys(groupedHistorias).forEach(pacienteId => {
        const historias = groupedHistorias[pacienteId];
        const paciente = allPacientes.find(p => p.id === pacienteId);
        const pacienteNombre = paciente ? paciente.nombre : 'Paciente no encontrado';
        const pacienteCedula = paciente ? paciente.cedula : '';
        const pacienteFoto = paciente ? paciente.foto : '';
        
        const avatarHtml = pacienteFoto 
            ? `<img src="${pacienteFoto}" alt="${pacienteNombre}">`
            : `<i class="fas fa-user"></i>`;
        
        // Main patient row (collapsed by default)
        const totalImages = historias.reduce((sum, h) => sum + (h.imagenes ? h.imagenes.length : 0), 0);
        const latestHistoria = historias[0]; // Already sorted by date
        
        html += `
            <tr class="patient-group-row" data-patient-id="${pacienteId}" onclick="togglePatientHistorias('${pacienteId}')">
                <td>
                    <div class="patient-cell">
                        <i class="fas fa-chevron-right expand-icon" id="expand-icon-${pacienteId}"></i>
                        <div class="patient-avatar">${avatarHtml}</div>
                        <div class="patient-info">
                            <h4>${pacienteNombre}</h4>
                            <p>Cédula: ${pacienteCedula}</p>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="historias-count-badge">
                        <i class="fas fa-file-medical"></i> ${historias.length} historia${historias.length !== 1 ? 's' : ''}
                    </span>
                </td>
                <td>${formatDate(latestHistoria.fechaConsulta || latestHistoria.fechaCita)}</td>
                <td>
                    ${totalImages > 0 ? `<span class="images-badge"><i class="fas fa-images"></i> ${totalImages}</span>` : '<span style="color: #6c757d;">Sin imágenes</span>'}
                </td>
                <td>
                    <span style="color: #6c757d; font-size: 12px;">Click para expandir</span>
                </td>
            </tr>
        `;
        
        // Individual history rows (hidden by default)
        historias.forEach((historia, index) => {
            const imageCount = historia.imagenes ? historia.imagenes.length : 0;
            
            html += `
                <tr class="historia-detail-row" data-patient-id="${pacienteId}" style="display: none;">
                    <td style="padding-left: 60px;">
                        <div class="historia-number">
                            <i class="fas fa-file-medical"></i> Historia #${index + 1}
                        </div>
                    </td>
                    <td>${historia.diagnostico}</td>
                    <td>${formatDate(historia.fechaConsulta || historia.fechaCita)}</td>
                    <td>
                        ${imageCount > 0 ? `<span class="images-badge"><i class="fas fa-images"></i> ${imageCount}</span>` : '<span style="color: #6c757d;">Sin imágenes</span>'}
                    </td>
                    <td>
                        <div class="actions-cell">
                            <button class="btn-action btn-view" onclick="event.stopPropagation(); viewHistoria('${historia.id}')" title="Ver detalles">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-action btn-pdf" onclick="event.stopPropagation(); downloadHistoriaPDF('${historia.id}')" title="Descargar PDF">
                                <i class="fas fa-file-pdf"></i>
                            </button>
                            <button class="btn-action btn-edit" onclick="event.stopPropagation(); editHistoria('${historia.id}')" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="event.stopPropagation(); deleteHistoria('${historia.id}')" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
    });
    
    tbody.innerHTML = html;
}

// Toggle patient histories visibility
window.togglePatientHistorias = function(pacienteId) {
    const detailRows = document.querySelectorAll(`.historia-detail-row[data-patient-id="${pacienteId}"]`);
    const expandIcon = document.getElementById(`expand-icon-${pacienteId}`);
    const isExpanded = detailRows[0].style.display !== 'none';
    
    detailRows.forEach(row => {
        row.style.display = isExpanded ? 'none' : 'table-row';
    });
    
    if (expandIcon) {
        if (isExpanded) {
            expandIcon.classList.remove('fa-chevron-down');
            expandIcon.classList.add('fa-chevron-right');
        } else {
            expandIcon.classList.remove('fa-chevron-right');
            expandIcon.classList.add('fa-chevron-down');
        }
    }
};

// Search and filter
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const filterPaciente = document.getElementById('filterPaciente');

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

filterPaciente.addEventListener('change', applyFilters);

const filterMes = document.getElementById('filterMes');
filterMes.addEventListener('change', applyFilters);

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const pacienteId = filterPaciente.value;
    const mesSeleccionado = filterMes.value;
    
    filteredHistorias = allHistorias.filter(historia => {
        const paciente = allPacientes.find(p => p.id === historia.pacienteId);
        const pacienteNombre = paciente ? paciente.nombre.toLowerCase() : '';
        
        const matchSearch = !searchTerm || 
            pacienteNombre.includes(searchTerm) ||
            historia.diagnostico.toLowerCase().includes(searchTerm);
        
        const matchPaciente = !pacienteId || historia.pacienteId === pacienteId;
        
        // Filtro por mes
        let matchMes = true;
        if (mesSeleccionado) {
            const fechaHistoria = historia.fechaConsulta || historia.fechaCita;
            if (fechaHistoria) {
                const fechaMes = fechaHistoria.substring(0, 7); // Formato YYYY-MM
                matchMes = fechaMes === mesSeleccionado;
            } else {
                matchMes = false;
            }
        }
        
        return matchSearch && matchPaciente && matchMes;
    });
    
    renderHistorias();
}

// Open add historia modal
document.getElementById('addHistoriaBtn').addEventListener('click', () => {
    editingHistoriaId = null;
    document.getElementById('modalTitle').textContent = 'Nueva Historia Clínica';
    document.getElementById('historiaForm').reset();
    document.getElementById('fechaConsulta').value = getLocalDateString();
    uploadedImages = [];
    document.getElementById('imagesPreview').innerHTML = '';
    document.getElementById('historiaModal').classList.add('active');
});

// Image upload handling
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const imagesPreview = document.getElementById('imagesPreview');

uploadArea.addEventListener('click', () => {
    imageInput.click();
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files);
    handleImageFiles(files);
});

imageInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    handleImageFiles(files);
});

async function handleImageFiles(files) {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        showErrorModal('Por favor, selecciona solo archivos de imagen');
        return;
    }
    
    for (const file of imageFiles) {
        if (file.size > 5 * 1024 * 1024) {
            showErrorModal(`La imagen ${file.name} supera los 5MB`);
            continue;
        }
        
        await uploadImage(file);
    }
}

async function uploadImage(file) {
    showLoadingModal('Subiendo imagen...');
    
    try {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            uploadedImages.push(data.data.url);
            renderImagePreview();
            hideLoadingModal();
        } else {
            throw new Error('Error al subir la imagen');
        }
    } catch (error) {
        hideLoadingModal();
        console.error('Error uploading image:', error);
        showErrorModal('Error al subir la imagen');
    }
}

function renderImagePreview() {
    imagesPreview.innerHTML = uploadedImages.map((url, index) => `
        <div class="image-preview-item">
            <img src="${url}" alt="Imagen ${index + 1}">
            <button type="button" class="remove-image" onclick="removeImage(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

window.removeImage = function(index) {
    uploadedImages.splice(index, 1);
    renderImagePreview();
};

// Save historia
document.getElementById('historiaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const pacienteId = document.getElementById('pacienteId').value;
    const fechaConsulta = document.getElementById('fechaConsulta').value;
    const diagnostico = document.getElementById('diagnostico').value.trim();
    
    if (!pacienteId || !fechaConsulta || !diagnostico) {
        showErrorModal('Por favor, completa los campos obligatorios');
        return;
    }
    
    showLoadingModal(editingHistoriaId ? 'Actualizando historia...' : 'Guardando historia...');
    
    try {
        const historiaData = {
            pacienteId,
            fechaConsulta,
            diagnostico,
            motivoConsulta: document.getElementById('motivoConsulta').value.trim(),
            antecedentesPersonales: document.getElementById('antecedentesPersonales').value.trim(),
            antecedentesFamiliares: document.getElementById('antecedentesFamiliares').value.trim(),
            peso: document.getElementById('peso').value,
            altura: document.getElementById('altura').value,
            presionArterial: document.getElementById('presionArterial').value.trim(),
            frecuenciaCardiaca: document.getElementById('frecuenciaCardiaca').value.trim(),
            examenFisico: document.getElementById('examenFisico').value.trim(),
            planTratamiento: document.getElementById('planTratamiento').value.trim(),
            observaciones: document.getElementById('observaciones').value.trim(),
            imagenes: uploadedImages,
            fechaCreacion: editingHistoriaId ? allHistorias.find(h => h.id === editingHistoriaId).fechaCreacion : new Date().toISOString()
        };
        
        if (editingHistoriaId) {
            await updateDoc(doc(db, 'historiasClinicas', editingHistoriaId), historiaData);
        } else {
            await addDoc(collection(db, 'historiasClinicas'), historiaData);
        }
        
        document.getElementById('historiaModal').classList.remove('active');
        hideLoadingModal();
        showSuccessModal(editingHistoriaId ? 'Historia actualizada exitosamente' : 'Historia registrada exitosamente');
        
        await loadHistorias();
    } catch (error) {
        hideLoadingModal();
        console.error('Error saving historia:', error);
        showErrorModal('Error al guardar la historia');
    }
});


// Edit historia
window.editHistoria = async function(historiaId) {
    const historia = allHistorias.find(h => h.id === historiaId);
    if (!historia) return;
    
    editingHistoriaId = historiaId;
    document.getElementById('modalTitle').textContent = 'Editar Historia Clínica';
    
    document.getElementById('pacienteId').value = historia.pacienteId;
    document.getElementById('fechaConsulta').value = historia.fechaConsulta;
    document.getElementById('diagnostico').value = historia.diagnostico;
    document.getElementById('motivoConsulta').value = historia.motivoConsulta || '';
    document.getElementById('antecedentesPersonales').value = historia.antecedentesPersonales || '';
    document.getElementById('antecedentesFamiliares').value = historia.antecedentesFamiliares || '';
    document.getElementById('peso').value = historia.peso || '';
    document.getElementById('altura').value = historia.altura || '';
    document.getElementById('presionArterial').value = historia.presionArterial || '';
    document.getElementById('frecuenciaCardiaca').value = historia.frecuenciaCardiaca || '';
    document.getElementById('examenFisico').value = historia.examenFisico || '';
    document.getElementById('planTratamiento').value = historia.planTratamiento || '';
    document.getElementById('observaciones').value = historia.observaciones || '';
    
    uploadedImages = historia.imagenes || [];
    renderImagePreview();
    
    document.getElementById('historiaModal').classList.add('active');
};

// Get tratamientos HTML for patient
function getTratamientosHTML(pacienteId) {
    const tratamientosPaciente = allTratamientos.filter(t => t.pacienteId === pacienteId);
    
    if (tratamientosPaciente.length === 0) {
        return '';
    }
    
    return `
        <div class="historia-detail-section">
            <h3><i class="fas fa-syringe"></i> Tratamientos del Paciente</h3>
            ${tratamientosPaciente.map(tratamiento => `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">Tipo</div>
                            <div class="detail-value">${tratamiento.tipoTratamiento}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Fecha Inicio</div>
                            <div class="detail-value">${formatDate(tratamiento.fechaInicio)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Duración</div>
                            <div class="detail-value">${tratamiento.duracion} sesiones</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Estado</div>
                            <div class="detail-value">${tratamiento.estado}</div>
                        </div>
                    </div>
                    ${tratamiento.descripcion ? `
                        <div style="margin-top: 10px;">
                            <div class="detail-label">Descripción</div>
                            <div class="detail-value">${tratamiento.descripcion}</div>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

// View historia
window.viewHistoria = function(historiaId) {
    const historia = allHistorias.find(h => h.id === historiaId);
    if (!historia) return;
    
    const paciente = allPacientes.find(p => p.id === historia.pacienteId);
    const pacienteNombre = paciente ? paciente.nombre : (historia.pacienteNombre || 'Paciente no encontrado');
    const pacienteCedula = paciente ? paciente.cedula : (historia.pacienteCedula || '');
    
    const content = document.getElementById('viewHistoriaContent');
    
    // Determinar la fecha de consulta (puede venir como fechaConsulta o fechaCita)
    const fechaConsulta = historia.fechaConsulta || historia.fechaCita;
    
    content.innerHTML = `
        <div class="historia-detail-section">
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
                <div class="detail-item">
                    <div class="detail-label">Fecha de Consulta</div>
                    <div class="detail-value">${fechaConsulta ? formatDate(fechaConsulta) : 'No especificada'}</div>
                </div>
                ${historia.medicoNombre ? `
                <div class="detail-item">
                    <div class="detail-label">Médico</div>
                    <div class="detail-value">${historia.medicoNombre}</div>
                </div>
                ` : ''}
                ${historia.tipoCita ? `
                <div class="detail-item">
                    <div class="detail-label">Tipo de Consulta</div>
                    <div class="detail-value">${getTipoCitaText(historia.tipoCita)}</div>
                </div>
                ` : ''}
            </div>
        </div>
        
        ${historia.motivoConsulta ? `
        <div class="historia-detail-section">
            <h3><i class="fas fa-comment-medical"></i> Motivo de Consulta</h3>
            <div class="detail-value">${historia.motivoConsulta}</div>
        </div>
        ` : ''}
        
        ${historia.diagnostico ? `
        <div class="historia-detail-section">
            <h3><i class="fas fa-stethoscope"></i> Diagnóstico</h3>
            <div class="detail-value">${historia.diagnostico}</div>
        </div>
        ` : ''}
        
        ${historia.tratamiento ? `
        <div class="historia-detail-section">
            <h3><i class="fas fa-prescription"></i> Tratamiento</h3>
            <div class="detail-value">${historia.tratamiento}</div>
        </div>
        ` : ''}
        
        ${historia.signosVitales && (historia.signosVitales.presionArterial || historia.signosVitales.frecuenciaCardiaca || historia.signosVitales.temperatura || historia.signosVitales.peso) ? `
        <div class="historia-detail-section">
            <h3><i class="fas fa-heartbeat"></i> Signos Vitales</h3>
            <div class="detail-grid">
                ${historia.signosVitales.presionArterial ? `
                <div class="detail-item">
                    <div class="detail-label">Presión Arterial</div>
                    <div class="detail-value">${historia.signosVitales.presionArterial}</div>
                </div>
                ` : ''}
                ${historia.signosVitales.frecuenciaCardiaca ? `
                <div class="detail-item">
                    <div class="detail-label">Frecuencia Cardíaca</div>
                    <div class="detail-value">${historia.signosVitales.frecuenciaCardiaca}</div>
                </div>
                ` : ''}
                ${historia.signosVitales.temperatura ? `
                <div class="detail-item">
                    <div class="detail-label">Temperatura</div>
                    <div class="detail-value">${historia.signosVitales.temperatura}</div>
                </div>
                ` : ''}
                ${historia.signosVitales.peso ? `
                <div class="detail-item">
                    <div class="detail-label">Peso</div>
                    <div class="detail-value">${historia.signosVitales.peso}</div>
                </div>
                ` : ''}
            </div>
        </div>
        ` : ''}
        
        ${historia.antecedentesPersonales || historia.antecedentesFamiliares ? `
        <div class="historia-detail-section">
            <h3><i class="fas fa-history"></i> Antecedentes</h3>
            ${historia.antecedentesPersonales ? `
                <div style="margin-bottom: 15px;">
                    <div class="detail-label">Antecedentes Personales</div>
                    <div class="detail-value">${historia.antecedentesPersonales}</div>
                </div>
            ` : ''}
            ${historia.antecedentesFamiliares ? `
                <div>
                    <div class="detail-label">Antecedentes Familiares</div>
                    <div class="detail-value">${historia.antecedentesFamiliares}</div>
                </div>
            ` : ''}
        </div>
        ` : ''}
        
        ${historia.peso || historia.altura || historia.presionArterial || historia.frecuenciaCardiaca || historia.examenFisico ? `
        <div class="historia-detail-section">
            <h3><i class="fas fa-user-md"></i> Examen Físico</h3>
            <div class="detail-grid">
                ${historia.peso ? `
                <div class="detail-item">
                    <div class="detail-label">Peso</div>
                    <div class="detail-value">${historia.peso} kg</div>
                </div>
                ` : ''}
                ${historia.altura ? `
                <div class="detail-item">
                    <div class="detail-label">Altura</div>
                    <div class="detail-value">${historia.altura} cm</div>
                </div>
                ` : ''}
                ${historia.presionArterial ? `
                <div class="detail-item">
                    <div class="detail-label">Presión Arterial</div>
                    <div class="detail-value">${historia.presionArterial}</div>
                </div>
                ` : ''}
                ${historia.frecuenciaCardiaca ? `
                <div class="detail-item">
                    <div class="detail-label">Frecuencia Cardíaca</div>
                    <div class="detail-value">${historia.frecuenciaCardiaca}</div>
                </div>
                ` : ''}
            </div>
            ${historia.examenFisico ? `
                <div style="margin-top: 15px;">
                    <div class="detail-label">Observaciones del Examen</div>
                    <div class="detail-value" style="white-space: pre-wrap;">${formatTextWithBold(historia.examenFisico)}</div>
                </div>
            ` : ''}
        </div>
        ` : ''}
        
        ${historia.planTratamiento ? `
        <div class="historia-detail-section">
            <h3><i class="fas fa-notes-medical"></i> Plan de Tratamiento</h3>
            <div class="detail-value" style="white-space: pre-wrap;">${formatTextWithBold(historia.planTratamiento)}</div>
        </div>
        ` : ''}
        
        ${historia.proximaCita ? `
        <div class="historia-detail-section">
            <h3><i class="fas fa-calendar-check"></i> Próxima Cita Recomendada</h3>
            <div class="detail-value" style="font-size: 16px; color: #D11A5C; font-weight: 600;">
                ${formatDate(historia.proximaCita)}
            </div>
        </div>
        ` : ''}
        
        ${getTratamientosHTML(historia.pacienteId)}
        
        ${historia.imagenes && historia.imagenes.length > 0 ? `
        <div class="historia-detail-section">
            <h3><i class="fas fa-images"></i> Imágenes Clínicas (${historia.imagenes.length})</h3>
            <div class="historia-images-grid">
                ${historia.imagenes.map(url => `
                    <div class="historia-image-item" onclick="window.open('${url}', '_blank')">
                        <img src="${url}" alt="Imagen clínica">
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        ${historia.observaciones ? `
        <div class="historia-detail-section">
            <h3><i class="fas fa-sticky-note"></i> Observaciones Adicionales</h3>
            <div class="detail-value">${historia.observaciones}</div>
        </div>
        ` : ''}
    `;
    
    document.getElementById('viewHistoriaModal').classList.add('active');
    
    // Set download button handler
    document.getElementById('downloadPdfBtn').onclick = () => downloadHistoriaPDF(historiaId);
};

// Helper function para obtener el texto del tipo de cita
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

// Delete historia
window.deleteHistoria = function(historiaId) {
    const historia = allHistorias.find(h => h.id === historiaId);
    if (!historia) return;
    
    const paciente = allPacientes.find(p => p.id === historia.pacienteId);
    const pacienteNombre = paciente ? paciente.nombre : 'este paciente';
    
    showConfirmModal(
        '¿Eliminar Historia Clínica?',
        `¿Estás seguro de que deseas eliminar la historia clínica de ${pacienteNombre}? Esta acción no se puede deshacer.`,
        async () => {
            showLoadingModal('Eliminando historia...');
            
            try {
                await deleteDoc(doc(db, 'historiasClinicas', historiaId));
                hideLoadingModal();
                showSuccessModal('Historia eliminada exitosamente');
                await loadHistorias();
            } catch (error) {
                hideLoadingModal();
                console.error('Error deleting historia:', error);
                showErrorModal('Error al eliminar la historia');
            }
        }
    );
};

// Download PDF functions
window.downloadHistoriaPDF = async function(historiaId) {
    const historia = allHistorias.find(h => h.id === historiaId);
    if (!historia) return;
    
    const paciente = allPacientes.find(p => p.id === historia.pacienteId);
    
    showLoadingModal('Generando PDF profesional...');
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        let yPos = 20;
        const lineHeight = 7;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;
        const pageWidth = doc.internal.pageSize.width;
        
        // Header with logo and branding
        doc.setFillColor(209, 26, 92);
        doc.rect(0, 0, pageWidth, 35, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont(undefined, 'bold');
        doc.text('EVA', margin, 15);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('Cirugía Corporal', margin, 22);
        
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('HISTORIA CLÍNICA', pageWidth - margin, 20, { align: 'right' });
        
        yPos = 45;
        
        // Patient info box
        doc.setFillColor(248, 249, 250);
        doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 35, 3, 3, 'F');
        
        yPos += 8;
        doc.setFontSize(12);
        doc.setTextColor(209, 26, 92);
        doc.setFont(undefined, 'bold');
        doc.text('INFORMACIÓN DEL PACIENTE', margin + 5, yPos);
        yPos += 8;
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Paciente: ${paciente ? paciente.nombre : 'N/A'}`, margin + 5, yPos);
        doc.text(`Cédula: ${paciente ? paciente.cedula : 'N/A'}`, pageWidth / 2 + 5, yPos);
        yPos += lineHeight;
        doc.text(`Fecha de Consulta: ${formatDate(historia.fechaConsulta || historia.fechaCita)}`, margin + 5, yPos);
        doc.text(`Diagnóstico: ${historia.diagnostico}`, pageWidth / 2 + 5, yPos);
        yPos += 15;
        
        // Información adicional de la cita
        if (historia.medicoNombre || historia.tipoCita) {
            if (yPos > pageHeight - 30) {
                doc.addPage();
                yPos = margin;
            }
            doc.setFillColor(248, 249, 250);
            doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 15, 2, 2, 'F');
            yPos += 7;
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            if (historia.medicoNombre) {
                doc.setFont(undefined, 'bold');
                doc.text('Médico:', margin + 5, yPos);
                doc.setFont(undefined, 'normal');
                doc.text(historia.medicoNombre, margin + 25, yPos);
            }
            if (historia.tipoCita) {
                const tipoCitaText = getTipoCitaText(historia.tipoCita);
                doc.setFont(undefined, 'bold');
                doc.text('Tipo:', pageWidth / 2 + 5, yPos);
                doc.setFont(undefined, 'normal');
                doc.text(tipoCitaText, pageWidth / 2 + 20, yPos);
            }
            yPos += 13;
        }

        // Motivo de consulta
        if (historia.motivoConsulta) {
            if (yPos > pageHeight - 40) {
                doc.addPage();
                yPos = margin;
            }
            doc.setFillColor(209, 26, 92);
            doc.rect(margin, yPos, 3, 8, 'F');
            doc.setFont(undefined, 'bold');
            doc.setFontSize(12);
            doc.setTextColor(209, 26, 92);
            doc.text('MOTIVO DE CONSULTA', margin + 6, yPos + 6);
            yPos += 12;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            const motivoLines = doc.splitTextToSize(historia.motivoConsulta, 170);
            doc.text(motivoLines, margin, yPos);
            yPos += motivoLines.length * lineHeight + 8;
        }
        
        // Tratamiento (de citas)
        if (historia.tratamiento) {
            if (yPos > pageHeight - 40) {
                doc.addPage();
                yPos = margin;
            }
            doc.setFillColor(209, 26, 92);
            doc.rect(margin, yPos, 3, 8, 'F');
            doc.setFont(undefined, 'bold');
            doc.setFontSize(12);
            doc.setTextColor(209, 26, 92);
            doc.text('TRATAMIENTO', margin + 6, yPos + 6);
            yPos += 12;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            const tratamientoLines = doc.splitTextToSize(historia.tratamiento, 170);
            doc.text(tratamientoLines, margin, yPos);
            yPos += tratamientoLines.length * lineHeight + 8;
        }
        
        // Signos vitales (de citas)
        if (historia.signosVitales && (historia.signosVitales.presionArterial || historia.signosVitales.frecuenciaCardiaca || historia.signosVitales.temperatura || historia.signosVitales.peso)) {
            if (yPos > pageHeight - 40) {
                doc.addPage();
                yPos = margin;
            }
            doc.setFillColor(209, 26, 92);
            doc.rect(margin, yPos, 3, 8, 'F');
            doc.setFont(undefined, 'bold');
            doc.setFontSize(12);
            doc.setTextColor(209, 26, 92);
            doc.text('SIGNOS VITALES', margin + 6, yPos + 6);
            yPos += 12;
            
            doc.setFillColor(248, 249, 250);
            doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 20, 2, 2, 'F');
            yPos += 7;
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            let xPos = margin + 5;
            
            if (historia.signosVitales.presionArterial) {
                doc.setFont(undefined, 'bold');
                doc.text('Presión Arterial:', xPos, yPos);
                doc.setFont(undefined, 'normal');
                doc.text(historia.signosVitales.presionArterial, xPos, yPos + 5);
                xPos += 45;
            }
            if (historia.signosVitales.frecuenciaCardiaca) {
                doc.setFont(undefined, 'bold');
                doc.text('Frecuencia Cardíaca:', xPos, yPos);
                doc.setFont(undefined, 'normal');
                doc.text(historia.signosVitales.frecuenciaCardiaca, xPos, yPos + 5);
                xPos += 50;
            }
            if (historia.signosVitales.temperatura) {
                doc.setFont(undefined, 'bold');
                doc.text('Temperatura:', xPos, yPos);
                doc.setFont(undefined, 'normal');
                doc.text(historia.signosVitales.temperatura, xPos, yPos + 5);
            }
            
            yPos += 8;
            xPos = margin + 5;
            
            if (historia.signosVitales.peso) {
                doc.setFont(undefined, 'bold');
                doc.text('Peso:', xPos, yPos);
                doc.setFont(undefined, 'normal');
                doc.text(historia.signosVitales.peso, xPos, yPos + 5);
            }
            
            yPos += 13;
        }
        
        // Próxima cita recomendada
        if (historia.proximaCita) {
            if (yPos > pageHeight - 30) {
                doc.addPage();
                yPos = margin;
            }
            doc.setFillColor(209, 26, 92);
            doc.rect(margin, yPos, 3, 8, 'F');
            doc.setFont(undefined, 'bold');
            doc.setFontSize(12);
            doc.setTextColor(209, 26, 92);
            doc.text('PRÓXIMA CITA RECOMENDADA', margin + 6, yPos + 6);
            yPos += 12;
            
            doc.setFillColor(255, 240, 245);
            doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 12, 2, 2, 'F');
            yPos += 8;
            
            doc.setFont(undefined, 'bold');
            doc.setFontSize(11);
            doc.setTextColor(209, 26, 92);
            doc.text(formatDate(historia.proximaCita), margin + 5, yPos);
            yPos += 10;
        }
        
        // Antecedentes
        if (historia.antecedentesPersonales || historia.antecedentesFamiliares) {
            if (yPos > pageHeight - 40) {
                doc.addPage();
                yPos = margin;
            }
            doc.setFillColor(209, 26, 92);
            doc.rect(margin, yPos, 3, 8, 'F');
            doc.setFont(undefined, 'bold');
            doc.setFontSize(12);
            doc.setTextColor(209, 26, 92);
            doc.text('ANTECEDENTES', margin + 6, yPos + 6);
            yPos += 12;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            
            if (historia.antecedentesPersonales) {
                doc.setFont(undefined, 'bold');
                doc.text('Personales:', margin, yPos);
                yPos += lineHeight;
                doc.setFont(undefined, 'normal');
                const antPersLines = doc.splitTextToSize(historia.antecedentesPersonales, 170);
                doc.text(antPersLines, margin, yPos);
                yPos += antPersLines.length * lineHeight + 5;
            }
            
            if (historia.antecedentesFamiliares) {
                if (yPos > pageHeight - 40) {
                    doc.addPage();
                    yPos = margin;
                }
                doc.setFont(undefined, 'bold');
                doc.text('Familiares:', margin, yPos);
                yPos += lineHeight;
                doc.setFont(undefined, 'normal');
                const antFamLines = doc.splitTextToSize(historia.antecedentesFamiliares, 170);
                doc.text(antFamLines, margin, yPos);
                yPos += antFamLines.length * lineHeight + 8;
            }
        }
        
        // Examen físico
        if (historia.peso || historia.altura || historia.presionArterial || historia.frecuenciaCardiaca || historia.examenFisico) {
            if (yPos > pageHeight - 50) {
                doc.addPage();
                yPos = margin;
            }
            doc.setFillColor(209, 26, 92);
            doc.rect(margin, yPos, 3, 8, 'F');
            doc.setFont(undefined, 'bold');
            doc.setFontSize(12);
            doc.setTextColor(209, 26, 92);
            doc.text('EXAMEN FÍSICO', margin + 6, yPos + 6);
            yPos += 12;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            
            // Signos vitales en tabla
            if (historia.peso || historia.altura || historia.presionArterial || historia.frecuenciaCardiaca) {
                doc.setFillColor(248, 249, 250);
                doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 20, 2, 2, 'F');
                yPos += 7;
                
                let xPos = margin + 5;
                if (historia.peso) {
                    doc.setFont(undefined, 'bold');
                    doc.text('Peso:', xPos, yPos);
                    doc.setFont(undefined, 'normal');
                    doc.text(`${historia.peso} kg`, xPos, yPos + 5);
                    xPos += 40;
                }
                if (historia.altura) {
                    doc.setFont(undefined, 'bold');
                    doc.text('Altura:', xPos, yPos);
                    doc.setFont(undefined, 'normal');
                    doc.text(`${historia.altura} cm`, xPos, yPos + 5);
                    xPos += 40;
                }
                if (historia.presionArterial) {
                    doc.setFont(undefined, 'bold');
                    doc.text('P/A:', xPos, yPos);
                    doc.setFont(undefined, 'normal');
                    doc.text(historia.presionArterial, xPos, yPos + 5);
                    xPos += 40;
                }
                if (historia.frecuenciaCardiaca) {
                    doc.setFont(undefined, 'bold');
                    doc.text('F/C:', xPos, yPos);
                    doc.setFont(undefined, 'normal');
                    doc.text(historia.frecuenciaCardiaca, xPos, yPos + 5);
                }
                yPos += 18;
            }
            
            if (historia.examenFisico) {
                yPos = addFormattedTextToPDF(doc, historia.examenFisico, margin, yPos, 170, lineHeight, pageHeight);
            }
        }
        
        // Plan de tratamiento
        if (historia.planTratamiento) {
            if (yPos > pageHeight - 40) {
                doc.addPage();
                yPos = margin;
            }
            doc.setFillColor(209, 26, 92);
            doc.rect(margin, yPos, 3, 8, 'F');
            doc.setFont(undefined, 'bold');
            doc.setFontSize(12);
            doc.setTextColor(209, 26, 92);
            doc.text('PLAN DE TRATAMIENTO', margin + 6, yPos + 6);
            yPos += 12;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            yPos = addFormattedTextToPDF(doc, historia.planTratamiento, margin, yPos, 170, lineHeight, pageHeight);
        }
        
        // Imágenes clínicas
        if (historia.imagenes && historia.imagenes.length > 0) {
            if (yPos > pageHeight - 40) {
                doc.addPage();
                yPos = margin;
            }
            doc.setFillColor(209, 26, 92);
            doc.rect(margin, yPos, 3, 8, 'F');
            doc.setFont(undefined, 'bold');
            doc.setFontSize(12);
            doc.setTextColor(209, 26, 92);
            doc.text(`IMÁGENES CLÍNICAS (${historia.imagenes.length})`, margin + 6, yPos + 6);
            yPos += 15;
            
            const imgWidth = 80;
            const imgHeight = 80;
            const imgSpacing = 10;
            
            // Add images to PDF
            for (let i = 0; i < historia.imagenes.length; i++) {
                try {
                    const imgUrl = historia.imagenes[i];
                    const imgData = await loadImageAsBase64(imgUrl);
                    
                    // Check if we need a new page
                    if (yPos > pageHeight - 100) {
                        doc.addPage();
                        yPos = margin;
                    }
                    
                    // Calculate position (2 images per row)
                    const isFirstInRow = i % 2 === 0;
                    const xPos = isFirstInRow ? margin : margin + imgWidth + imgSpacing;
                    
                    // Add image
                    doc.addImage(imgData, 'JPEG', xPos, yPos, imgWidth, imgHeight);
                    
                    // Add label
                    doc.setFontSize(9);
                    doc.setTextColor(100, 100, 100);
                    doc.text(`Imagen ${i + 1}`, xPos, yPos + imgHeight + 5);
                    
                    // Move to next row after every 2 images
                    if (!isFirstInRow || i === historia.imagenes.length - 1) {
                        yPos += imgHeight + 15;
                    }
                } catch (error) {
                    console.error('Error adding image to PDF:', error);
                }
            }
            yPos += 8;
        }
        
        // Observaciones
        if (historia.observaciones) {
            if (yPos > pageHeight - 40) {
                doc.addPage();
                yPos = margin;
            }
            doc.setFillColor(209, 26, 92);
            doc.rect(margin, yPos, 3, 8, 'F');
            doc.setFont(undefined, 'bold');
            doc.setFontSize(12);
            doc.setTextColor(209, 26, 92);
            doc.text('OBSERVACIONES ADICIONALES', margin + 6, yPos + 6);
            yPos += 12;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            const obsLines = doc.splitTextToSize(historia.observaciones, 170);
            doc.text(obsLines, margin, yPos);
        }
        
        // Footer
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFillColor(248, 249, 250);
            doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(`EVA Cirugía Corporal - Historia Clínica`, margin, pageHeight - 8);
            doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
            doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
        }
        
        // Save PDF
        const fechaFormateada = formatDate(historia.fechaConsulta || historia.fechaCita).replace(/\//g, '-');
        const fileName = `Historia_Clinica_${paciente ? paciente.nombre.replace(/\s+/g, '_') : 'Paciente'}_${fechaFormateada}.pdf`;
        doc.save(fileName);
        
        hideLoadingModal();
        showSuccessModal('PDF generado exitosamente');
    } catch (error) {
        hideLoadingModal();
        console.error('Error generating PDF:', error);
        showErrorModal('Error al generar el PDF');
    }
};

// Export all historias
document.getElementById('exportAllBtn').addEventListener('click', async () => {
    const historiasToExport = filteredHistorias.length > 0 ? filteredHistorias : allHistorias;
    
    if (historiasToExport.length === 0) {
        showErrorModal('No hay historias clínicas para exportar');
        return;
    }
    
    // Check if filtering by patient
    const filterPacienteId = document.getElementById('filterPaciente').value;
    const pacienteSeleccionado = filterPacienteId ? allPacientes.find(p => p.id === filterPacienteId) : null;
    
    const titulo = pacienteSeleccionado 
        ? `Generando historias completas de ${pacienteSeleccionado.nombre}...`
        : `Generando ${historiasToExport.length} historias completas...`;
    
    showLoadingModal(titulo);
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;
        const lineHeight = 7;
        
        for (let histIndex = 0; histIndex < historiasToExport.length; histIndex++) {
            if (histIndex > 0) doc.addPage();
            
            const historia = historiasToExport[histIndex];
            const paciente = allPacientes.find(p => p.id === historia.pacienteId);
            
            let yPos = 20;
            let currentPage = doc.internal.getCurrentPageInfo().pageNumber;
            
            // Header with logo and branding
            doc.setFillColor(209, 26, 92);
            doc.rect(0, 0, pageWidth, 35, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont(undefined, 'bold');
            doc.text('EVA', margin, 15);
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text('Cirugia Corporal', margin, 22);
            
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text('HISTORIA CLINICA', pageWidth - margin, 20, { align: 'right' });
            
            doc.setFontSize(10);
            doc.text(`${histIndex + 1} de ${historiasToExport.length}`, pageWidth - margin, 28, { align: 'right' });
            
            yPos = 45;
            
            // Patient info box
            doc.setFillColor(248, 249, 250);
            doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 35, 3, 3, 'F');
            
            yPos += 8;
            doc.setFontSize(12);
            doc.setTextColor(209, 26, 92);
            doc.setFont(undefined, 'bold');
            doc.text('INFORMACION DEL PACIENTE', margin + 5, yPos);
            yPos += 8;
            
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Paciente: ${paciente ? paciente.nombre : 'N/A'}`, margin + 5, yPos);
            doc.text(`Cedula: ${paciente ? paciente.cedula : 'N/A'}`, pageWidth / 2 + 5, yPos);
            yPos += lineHeight;
            doc.text(`Fecha de Consulta: ${formatDate(historia.fechaConsulta || historia.fechaCita)}`, margin + 5, yPos);
            doc.text(`Diagnostico: ${historia.diagnostico}`, pageWidth / 2 + 5, yPos);
            yPos += 15;
            
            // Helper function to check page space
            const checkPageSpace = (neededSpace) => {
                if (yPos + neededSpace > pageHeight - 30) {
                    doc.addPage();
                    yPos = margin;
                    return true;
                }
                return false;
            };
            
            // Motivo de consulta
            if (historia.motivoConsulta) {
                checkPageSpace(20);
                doc.setFillColor(209, 26, 92);
                doc.rect(margin, yPos, 3, 8, 'F');
                doc.setFont(undefined, 'bold');
                doc.setFontSize(12);
                doc.setTextColor(209, 26, 92);
                doc.text('MOTIVO DE CONSULTA', margin + 6, yPos + 6);
                yPos += 12;
                doc.setFont(undefined, 'normal');
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                const motivoLines = doc.splitTextToSize(historia.motivoConsulta, 170);
                doc.text(motivoLines, margin, yPos);
                yPos += motivoLines.length * lineHeight + 8;
            }
            
            // Antecedentes
            if (historia.antecedentesPersonales || historia.antecedentesFamiliares) {
                checkPageSpace(20);
                doc.setFillColor(209, 26, 92);
                doc.rect(margin, yPos, 3, 8, 'F');
                doc.setFont(undefined, 'bold');
                doc.setFontSize(12);
                doc.setTextColor(209, 26, 92);
                doc.text('ANTECEDENTES', margin + 6, yPos + 6);
                yPos += 12;
                doc.setFont(undefined, 'normal');
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                
                if (historia.antecedentesPersonales) {
                    doc.setFont(undefined, 'bold');
                    doc.text('Personales:', margin, yPos);
                    yPos += lineHeight;
                    doc.setFont(undefined, 'normal');
                    const antPersLines = doc.splitTextToSize(historia.antecedentesPersonales, 170);
                    doc.text(antPersLines, margin, yPos);
                    yPos += antPersLines.length * lineHeight + 5;
                }
                
                if (historia.antecedentesFamiliares) {
                    checkPageSpace(15);
                    doc.setFont(undefined, 'bold');
                    doc.text('Familiares:', margin, yPos);
                    yPos += lineHeight;
                    doc.setFont(undefined, 'normal');
                    const antFamLines = doc.splitTextToSize(historia.antecedentesFamiliares, 170);
                    doc.text(antFamLines, margin, yPos);
                    yPos += antFamLines.length * lineHeight + 8;
                }
            }
            
            // Examen fisico
            if (historia.peso || historia.altura || historia.presionArterial || historia.frecuenciaCardiaca || historia.examenFisico) {
                checkPageSpace(30);
                doc.setFillColor(209, 26, 92);
                doc.rect(margin, yPos, 3, 8, 'F');
                doc.setFont(undefined, 'bold');
                doc.setFontSize(12);
                doc.setTextColor(209, 26, 92);
                doc.text('EXAMEN FISICO', margin + 6, yPos + 6);
                yPos += 12;
                doc.setFont(undefined, 'normal');
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                
                if (historia.peso || historia.altura || historia.presionArterial || historia.frecuenciaCardiaca) {
                    doc.setFillColor(248, 249, 250);
                    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 20, 2, 2, 'F');
                    yPos += 7;
                    
                    let xPos = margin + 5;
                    if (historia.peso) {
                        doc.setFont(undefined, 'bold');
                        doc.text('Peso:', xPos, yPos);
                        doc.setFont(undefined, 'normal');
                        doc.text(`${historia.peso} kg`, xPos, yPos + 5);
                        xPos += 40;
                    }
                    if (historia.altura) {
                        doc.setFont(undefined, 'bold');
                        doc.text('Altura:', xPos, yPos);
                        doc.setFont(undefined, 'normal');
                        doc.text(`${historia.altura} cm`, xPos, yPos + 5);
                        xPos += 40;
                    }
                    if (historia.presionArterial) {
                        doc.setFont(undefined, 'bold');
                        doc.text('P/A:', xPos, yPos);
                        doc.setFont(undefined, 'normal');
                        doc.text(historia.presionArterial, xPos, yPos + 5);
                        xPos += 40;
                    }
                    if (historia.frecuenciaCardiaca) {
                        doc.setFont(undefined, 'bold');
                        doc.text('F/C:', xPos, yPos);
                        doc.setFont(undefined, 'normal');
                        doc.text(historia.frecuenciaCardiaca, xPos, yPos + 5);
                    }
                    yPos += 18;
                }
                
                if (historia.examenFisico) {
                    yPos = addFormattedTextToPDF(doc, historia.examenFisico, margin, yPos, 170, lineHeight, pageHeight);
                }
            }
            
            // Plan de tratamiento
            if (historia.planTratamiento) {
                checkPageSpace(20);
                doc.setFillColor(209, 26, 92);
                doc.rect(margin, yPos, 3, 8, 'F');
                doc.setFont(undefined, 'bold');
                doc.setFontSize(12);
                doc.setTextColor(209, 26, 92);
                doc.text('PLAN DE TRATAMIENTO', margin + 6, yPos + 6);
                yPos += 12;
                doc.setFont(undefined, 'normal');
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                yPos = addFormattedTextToPDF(doc, historia.planTratamiento, margin, yPos, 170, lineHeight, pageHeight);
            }
            
            // Imagenes clinicas
            if (historia.imagenes && historia.imagenes.length > 0) {
                checkPageSpace(30);
                doc.setFillColor(209, 26, 92);
                doc.rect(margin, yPos, 3, 8, 'F');
                doc.setFont(undefined, 'bold');
                doc.setFontSize(12);
                doc.setTextColor(209, 26, 92);
                doc.text(`IMAGENES CLINICAS (${historia.imagenes.length})`, margin + 6, yPos + 6);
                yPos += 15;
                
                const imgWidth = 80;
                const imgHeight = 80;
                const imgSpacing = 10;
                
                for (let i = 0; i < historia.imagenes.length; i++) {
                    try {
                        const imgUrl = historia.imagenes[i];
                        const imgData = await loadImageAsBase64(imgUrl);
                        
                        // Check if we need a new page
                        if (yPos > pageHeight - 100) {
                            doc.addPage();
                            yPos = margin;
                        }
                        
                        // Calculate position (2 images per row)
                        const isFirstInRow = i % 2 === 0;
                        const xPos = isFirstInRow ? margin : margin + imgWidth + imgSpacing;
                        
                        // Add image
                        doc.addImage(imgData, 'JPEG', xPos, yPos, imgWidth, imgHeight);
                        
                        // Add label
                        doc.setFontSize(9);
                        doc.setTextColor(100, 100, 100);
                        doc.text(`Imagen ${i + 1}`, xPos, yPos + imgHeight + 5);
                        
                        // Move to next row after every 2 images
                        if (!isFirstInRow || i === historia.imagenes.length - 1) {
                            yPos += imgHeight + 15;
                        }
                    } catch (error) {
                        console.error('Error adding image to PDF:', error);
                    }
                }
                yPos += 8;
            }
            
            // Observaciones
            if (historia.observaciones) {
                checkPageSpace(20);
                doc.setFillColor(209, 26, 92);
                doc.rect(margin, yPos, 3, 8, 'F');
                doc.setFont(undefined, 'bold');
                doc.setFontSize(12);
                doc.setTextColor(209, 26, 92);
                doc.text('OBSERVACIONES ADICIONALES', margin + 6, yPos + 6);
                yPos += 12;
                doc.setFont(undefined, 'normal');
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                const obsLines = doc.splitTextToSize(historia.observaciones, 170);
                doc.text(obsLines, margin, yPos);
            }
        }
        
        // Add footers to all pages
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFillColor(248, 249, 250);
            doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text('EVA Cirugia Corporal - Historia Clinica', margin, pageHeight - 8);
            doc.text(`Pagina ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
            doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
        }
        
        const fileName = pacienteSeleccionado
            ? `Historias_Completas_${pacienteSeleccionado.nombre.replace(/\s+/g, '_')}_${getLocalDateString()}.pdf`
            : `Historias_Clinicas_Completas_${getLocalDateString()}.pdf`;
        
        doc.save(fileName);
        
        hideLoadingModal();
        showSuccessModal(`PDF completo con ${historiasToExport.length} historia${historiasToExport.length > 1 ? 's' : ''} generado exitosamente`);
    } catch (error) {
        hideLoadingModal();
        console.error('Error generating PDF:', error);
        showErrorModal('Error al generar el PDF: ' + error.message);
    }
});

// Modal controls
document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('historiaModal').classList.remove('active');
});

document.getElementById('cancelBtn').addEventListener('click', () => {
    document.getElementById('historiaModal').classList.remove('active');
});

document.getElementById('historiaModal').addEventListener('click', (e) => {
    if (e.target.id === 'historiaModal') {
        document.getElementById('historiaModal').classList.remove('active');
    }
});

document.getElementById('closeViewModal').addEventListener('click', () => {
    document.getElementById('viewHistoriaModal').classList.remove('active');
});

document.getElementById('closeViewBtn').addEventListener('click', () => {
    document.getElementById('viewHistoriaModal').classList.remove('active');
});

document.getElementById('viewHistoriaModal').addEventListener('click', (e) => {
    if (e.target.id === 'viewHistoriaModal') {
        document.getElementById('viewHistoriaModal').classList.remove('active');
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
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    // Si es una fecha en formato YYYY-MM-DD, la tratamos como fecha local
    if (dateString.includes('-') && !dateString.includes('T')) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }
    // Si es un timestamp ISO, lo convertimos
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function formatTextWithBold(text) {
    if (!text) return '';
    // Convertir **texto** a <strong>texto</strong>
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

// Función para agregar texto con formato de negritas al PDF
function addFormattedTextToPDF(doc, text, xPos, yPos, maxWidth, lineHeight, pageHeight) {
    if (!text) return yPos;
    
    const margin = 20;
    
    // Dividir el texto en líneas
    const lines = text.split('\n');
    
    lines.forEach(line => {
        // Verificar si necesitamos una nueva página
        if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = margin;
        }
        
        // Buscar patrones **texto** para negritas
        const parts = [];
        let currentPos = 0;
        const boldPattern = /\*\*(.*?)\*\*/g;
        let match;
        
        while ((match = boldPattern.exec(line)) !== null) {
            // Agregar texto normal antes de la negrita
            if (match.index > currentPos) {
                parts.push({
                    text: line.substring(currentPos, match.index),
                    bold: false
                });
            }
            // Agregar texto en negrita
            parts.push({
                text: match[1],
                bold: true
            });
            currentPos = match.index + match[0].length;
        }
        
        // Agregar el resto del texto normal
        if (currentPos < line.length) {
            parts.push({
                text: line.substring(currentPos),
                bold: false
            });
        }
        
        // Si no hay partes con formato, es una línea simple
        if (parts.length === 0) {
            parts.push({
                text: line,
                bold: false
            });
        }
        
        // Renderizar cada parte
        let currentX = xPos;
        parts.forEach(part => {
            if (part.text) {
                doc.setFont(undefined, part.bold ? 'bold' : 'normal');
                
                // Dividir en múltiples líneas si es necesario
                const textLines = doc.splitTextToSize(part.text, maxWidth - (currentX - xPos));
                
                textLines.forEach((textLine, index) => {
                    if (index > 0) {
                        yPos += lineHeight;
                        currentX = xPos;
                        
                        // Verificar nueva página
                        if (yPos > pageHeight - 30) {
                            doc.addPage();
                            yPos = margin;
                        }
                    }
                    
                    doc.text(textLine, currentX, yPos);
                    currentX += doc.getTextWidth(textLine);
                });
            }
        });
        
        yPos += lineHeight;
    });
    
    return yPos + 3; // Agregar un pequeño espacio extra
}

function getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function loadImageAsBase64(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
        img.src = url;
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
