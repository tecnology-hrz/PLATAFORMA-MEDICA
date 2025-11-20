// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let allUsers = [];
let filteredUsers = [];

// Check authentication
window.addEventListener('DOMContentLoaded', () => {
    const sessionData = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
    
    if (!sessionData) {
        window.location.href = '../Login.html';
        return;
    }
    
    // Wait a bit for Sidebar.js to load user data
    setTimeout(() => {
        loadUsers();
        initializeEventListeners();
    }, 100);
});

// Load all users
async function loadUsers() {
    try {
        const querySnapshot = await getDocs(collection(db, 'usuarios'));
        allUsers = [];
        
        querySnapshot.forEach((doc) => {
            allUsers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        filteredUsers = [...allUsers];
        updateStats();
        renderUsers();
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Update statistics
function updateStats() {
    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter(u => u.activo !== false).length;
    const inactiveUsers = totalUsers - activeUsers;
    
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('activeUsers').textContent = activeUsers;
    document.getElementById('inactiveUsers').textContent = inactiveUsers;
}

// Render users table
function renderUsers() {
    const tbody = document.getElementById('usersTableBody');
    const resultsCount = document.getElementById('resultsCount');
    
    resultsCount.textContent = `${filteredUsers.length} usuario${filteredUsers.length !== 1 ? 's' : ''}`;
    
    if (filteredUsers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fas fa-users-slash"></i></div>
                        <h3 class="empty-title">No se encontraron usuarios</h3>
                        <p class="empty-message">Intenta ajustar los filtros de búsqueda</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredUsers.map(user => {
        const initials = user.nombre.split(' ').map(n => n[0]).join('').substring(0, 2);
        const isActive = user.activo !== false;
        const avatarHtml = user.fotoPerfil 
            ? `<img src="${user.fotoPerfil}" alt="${user.nombre}">`
            : initials;
        
        return `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar">${avatarHtml}</div>
                        <div class="user-info">
                            <h4>${user.nombre}</h4>
                            <p>${user.email}</p>
                        </div>
                    </div>
                </td>
                <td>${user.especialidad || 'N/A'}</td>
                <td>${user.telefono || 'N/A'}</td>
                <td>
                    <span class="status-badge ${isActive ? 'active' : 'inactive'}">
                        <i class="fas fa-circle"></i>
                        ${isActive ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-action btn-view" onclick="viewUser('${user.id}')" title="Ver detalles del usuario">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action btn-toggle ${isActive ? '' : 'inactive'}" 
                                onclick="toggleUserStatus('${user.id}', ${isActive})" 
                                title="${isActive ? 'Desactivar usuario' : 'Activar usuario'}">
                            <i class="fas fa-${isActive ? 'ban' : 'check'}"></i>
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

// Filter functionality
const especialidadFilter = document.getElementById('especialidadFilter');
const statusFilter = document.getElementById('statusFilter');

especialidadFilter.addEventListener('change', applyFilters);
statusFilter.addEventListener('change', applyFilters);

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const especialidad = especialidadFilter.value;
    const status = statusFilter.value;
    
    filteredUsers = allUsers.filter(user => {
        const matchesSearch = !searchTerm || 
            user.nombre.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm) ||
            (user.telefono && user.telefono.includes(searchTerm));
        
        const matchesEspecialidad = !especialidad || user.especialidad === especialidad;
        
        const isActive = user.activo !== false;
        const matchesStatus = status === 'all' || 
            (status === 'active' && isActive) ||
            (status === 'inactive' && !isActive);
        
        return matchesSearch && matchesEspecialidad && matchesStatus;
    });
    
    renderUsers();
}

// View user details
window.viewUser = function(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const modal = document.getElementById('userModal');
    const avatarEl = document.getElementById('modalUserAvatar');
    const nameEl = document.getElementById('modalUserName');
    const emailEl = document.getElementById('modalUserEmail');
    
    // Set avatar
    if (user.fotoPerfil) {
        avatarEl.innerHTML = `<img src="${user.fotoPerfil}" alt="${user.nombre}">`;
    } else {
        const initials = user.nombre.split(' ').map(n => n[0]).join('').substring(0, 2);
        avatarEl.innerHTML = initials;
    }
    
    nameEl.textContent = user.nombre;
    emailEl.textContent = user.email;
    
    document.getElementById('detailEspecialidad').textContent = user.especialidad || 'N/A';
    document.getElementById('detailTelefono').textContent = user.telefono || 'N/A';
    document.getElementById('detailFechaRegistro').textContent = formatDate(user.fechaRegistro);
    document.getElementById('detailEstado').textContent = user.activo !== false ? 'Activo' : 'Inactivo';
    
    modal.classList.add('active');
};

// Toggle user status
window.toggleUserStatus = function(userId, currentStatus) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const action = currentStatus ? 'desactivar' : 'activar';
    showConfirmModal(user, action, userId, currentStatus);
};

// Show confirmation modal
function showConfirmModal(user, action, userId, currentStatus) {
    const modal = document.getElementById('confirmModal');
    const modalTitle = document.getElementById('confirmModalTitle');
    const modalMessage = document.getElementById('confirmModalMessage');
    const modalIcon = document.getElementById('confirmModalIcon');
    const confirmBtn = document.getElementById('confirmActionBtn');
    
    // Set icon and colors based on action
    if (action === 'desactivar') {
        modalIcon.innerHTML = '<i class="fas fa-user-slash"></i>';
        modalIcon.style.background = 'linear-gradient(135deg, #dc3545 0%, #bd2130 100%)';
        confirmBtn.style.background = 'linear-gradient(135deg, #dc3545 0%, #bd2130 100%)';
        modalTitle.textContent = '¿Desactivar Usuario?';
    } else {
        modalIcon.innerHTML = '<i class="fas fa-user-check"></i>';
        modalIcon.style.background = 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)';
        confirmBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)';
        modalTitle.textContent = '¿Activar Usuario?';
    }
    
    modalMessage.textContent = `¿Estás seguro de que deseas ${action} a ${user.nombre}? ${action === 'desactivar' ? 'El usuario no podrá iniciar sesión.' : 'El usuario podrá iniciar sesión nuevamente.'}`;
    
    // Set confirm button action
    confirmBtn.onclick = async () => {
        modal.classList.remove('active');
        await executeToggleStatus(userId, currentStatus, action);
    };
    
    modal.classList.add('active');
}

// Execute toggle status
async function executeToggleStatus(userId, currentStatus, action) {
    showLoadingModal('Actualizando estado...');
    
    try {
        const userRef = doc(db, 'usuarios', userId);
        await updateDoc(userRef, {
            activo: !currentStatus
        });
        
        // Update local data
        const user = allUsers.find(u => u.id === userId);
        user.activo = !currentStatus;
        updateStats();
        applyFilters();
        
        hideLoadingModal();
        showSuccessModal(`Usuario ${action === 'desactivar' ? 'desactivado' : 'activado'} exitosamente`);
    } catch (error) {
        console.error('Error updating user status:', error);
        hideLoadingModal();
        showErrorModal('Error al actualizar el estado del usuario');
    }
}

// Close modals
document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('userModal').classList.remove('active');
});

document.getElementById('userModal').addEventListener('click', (e) => {
    if (e.target.id === 'userModal') {
        document.getElementById('userModal').classList.remove('active');
    }
});

// Confirm modal handlers
document.getElementById('cancelConfirm').addEventListener('click', () => {
    document.getElementById('confirmModal').classList.remove('active');
});

document.getElementById('confirmModal').addEventListener('click', (e) => {
    if (e.target.id === 'confirmModal') {
        document.getElementById('confirmModal').classList.remove('active');
    }
});

// Success modal handler
document.getElementById('closeSuccess').addEventListener('click', () => {
    document.getElementById('successModal').classList.remove('active');
});

// Error modal handler
document.getElementById('closeError').addEventListener('click', () => {
    document.getElementById('errorModal').classList.remove('active');
});

// Show/hide loading modal
function showLoadingModal(message) {
    const modal = document.getElementById('loadingModal');
    modal.querySelector('p').textContent = message;
    modal.classList.add('active');
}

function hideLoadingModal() {
    document.getElementById('loadingModal').classList.remove('active');
}

// Show success modal
function showSuccessModal(message) {
    const modal = document.getElementById('successModal');
    modal.querySelector('.message-text').textContent = message;
    modal.classList.add('active');
}

// Show error modal
function showErrorModal(message) {
    const modal = document.getElementById('errorModal');
    modal.querySelector('.message-text').textContent = message;
    modal.classList.add('active');
}

// Security password for new user
const SECURITY_PASSWORD = 'evagrupomedico-2026';

// Initialize event listeners
function initializeEventListeners() {
    // Add new user button
    const addUsuarioBtn = document.getElementById('addUsuarioBtn');
    if (addUsuarioBtn) {
        addUsuarioBtn.addEventListener('click', () => {
            document.getElementById('securityModal').classList.add('active');
            document.getElementById('securityPassword').value = '';
        });
    }

    // Close security modal
    const closeSecurityModal = document.getElementById('closeSecurityModal');
    if (closeSecurityModal) {
        closeSecurityModal.addEventListener('click', () => {
            document.getElementById('securityModal').classList.remove('active');
        });
    }

    const cancelSecurityBtn = document.getElementById('cancelSecurityBtn');
    if (cancelSecurityBtn) {
        cancelSecurityBtn.addEventListener('click', () => {
            document.getElementById('securityModal').classList.remove('active');
        });
    }

    // Security form submit
    const securityForm = document.getElementById('securityForm');
    if (securityForm) {
        securityForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const password = document.getElementById('securityPassword').value;
            
            console.log('Password entered:', password);
            console.log('Expected password:', SECURITY_PASSWORD);
            
            if (password === SECURITY_PASSWORD) {
                document.getElementById('securityModal').classList.remove('active');
                // Redirect to registration page
                window.location.href = '../Registro.html';
            } else {
                showErrorModal('Contraseña de seguridad incorrecta');
                document.getElementById('securityPassword').value = '';
            }
        });
    }
}

// Export functionality
document.getElementById('exportBtn').addEventListener('click', () => {
    const csvContent = generateCSV();
    downloadCSV(csvContent, 'usuarios.csv');
});

function generateCSV() {
    const headers = ['Nombre', 'Email', 'Especialidad', 'Teléfono', 'Estado', 'Fecha Registro'];
    const rows = filteredUsers.map(user => [
        user.nombre,
        user.email,
        user.especialidad || '',
        user.telefono || '',
        user.activo !== false ? 'Activo' : 'Inactivo',
        formatDate(user.fechaRegistro)
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

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}
