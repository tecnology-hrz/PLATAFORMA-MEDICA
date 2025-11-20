// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let currentUser = null;
let isEditMode = false;

// Check authentication and load user data
window.addEventListener('DOMContentLoaded', async () => {
    const sessionData = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
    
    if (!sessionData) {
        window.location.href = '../Login.html';
        return;
    }
    
    currentUser = JSON.parse(sessionData);
    
    // Wait a bit for Sidebar.js to load user data
    setTimeout(async () => {
        await loadUserProfile();
    }, 100);
});

// Load user profile
async function loadUserProfile() {
    try {
        const userDoc = await getDoc(doc(db, 'usuarios', currentUser.userId));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            displayUserProfile(userData);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showMessage('Error al cargar el perfil', 'error');
    }
}

// Display user profile
function displayUserProfile(userData) {
    // Profile card
    const profileAvatar = document.getElementById('profileAvatar');
    const profileName = document.getElementById('profileName');
    const profileRole = document.getElementById('profileRole');
    
    // Set avatar
    if (userData.fotoPerfil) {
        profileAvatar.innerHTML = `<img src="${userData.fotoPerfil}" alt="${userData.nombre}">`;
    } else {
        const initials = userData.nombre.split(' ').map(n => n[0]).join('').substring(0, 2);
        profileAvatar.textContent = initials;
    }
    
    profileName.textContent = userData.nombre;
    profileRole.textContent = userData.especialidad || 'Usuario';
    
    // Profile info
    document.getElementById('infoEmail').textContent = userData.email;
    document.getElementById('infoTelefono').textContent = userData.telefono || 'No especificado';
    document.getElementById('infoEspecialidad').textContent = userData.especialidad || 'No especificado';
    document.getElementById('infoFechaRegistro').textContent = formatDate(userData.fechaRegistro);
    
    // Form fields
    document.getElementById('nombre').value = userData.nombre || '';
    document.getElementById('email').value = userData.email || '';
    document.getElementById('telefono').value = userData.telefono || '';
    document.getElementById('especialidad').value = userData.especialidad || '';
}

// Photo upload
const photoInput = document.getElementById('photoInput');
const changePhotoBtn = document.getElementById('changePhotoBtn');

changePhotoBtn.addEventListener('click', () => {
    photoInput.click();
});

photoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Validate file
    if (!file.type.startsWith('image/')) {
        showMessage('Por favor, selecciona un archivo de imagen válido', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showMessage('La imagen no debe superar los 5MB', 'error');
        return;
    }
    
    showLoading('Subiendo foto de perfil...');
    
    try {
        // Upload to ImgBB
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            const photoUrl = data.data.url;
            
            // Update in Firestore
            await updateDoc(doc(db, 'usuarios', currentUser.userId), {
                fotoPerfil: photoUrl
            });
            
            // Update session
            currentUser.fotoPerfil = photoUrl;
            const sessionKey = localStorage.getItem('userSession') ? 'userSession' : 'userSession';
            if (localStorage.getItem('userSession')) {
                localStorage.setItem('userSession', JSON.stringify(currentUser));
            } else {
                sessionStorage.setItem('userSession', JSON.stringify(currentUser));
            }
            
            // Update UI
            document.getElementById('profileAvatar').innerHTML = `<img src="${photoUrl}" alt="${currentUser.nombre}">`;
            
            hideLoading();
            showMessage('Foto de perfil actualizada exitosamente', 'success');
        } else {
            throw new Error('Error al subir la imagen');
        }
    } catch (error) {
        hideLoading();
        console.error('Error uploading photo:', error);
        showMessage('Error al subir la foto. Inténtalo de nuevo.', 'error');
    }
});

// Edit mode toggle
const editModeToggle = document.getElementById('editModeToggle');
const formInputs = document.querySelectorAll('.form-input, .form-select');
const formActions = document.querySelector('.form-actions');

editModeToggle.addEventListener('click', () => {
    isEditMode = !isEditMode;
    editModeToggle.classList.toggle('active');
    
    formInputs.forEach(input => {
        if (input.id !== 'email') { // Email no se puede editar
            input.disabled = !isEditMode;
        }
    });
    
    formActions.style.display = isEditMode ? 'flex' : 'none';
});

// Cancel edit
document.getElementById('cancelBtn').addEventListener('click', () => {
    isEditMode = false;
    editModeToggle.classList.remove('active');
    
    formInputs.forEach(input => {
        input.disabled = true;
    });
    
    formActions.style.display = 'none';
    
    // Reload original data
    loadUserProfile();
});

// Save profile
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nombre = document.getElementById('nombre').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const especialidad = document.getElementById('especialidad').value;
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validations
    if (!nombre) {
        showMessage('El nombre es obligatorio', 'error');
        return;
    }
    
    // Password change validation
    if (newPassword || confirmPassword) {
        if (!currentPassword) {
            showMessage('Debes ingresar tu contraseña actual para cambiarla', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showMessage('Las contraseñas nuevas no coinciden', 'error');
            return;
        }
        
        if (newPassword.length < 6) {
            showMessage('La nueva contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }
    }
    
    showLoading('Guardando cambios...');
    
    try {
        const updateData = {
            nombre: nombre,
            telefono: telefono,
            especialidad: especialidad
        };
        
        // If changing password, verify current password first
        if (newPassword) {
            const userDoc = await getDoc(doc(db, 'usuarios', currentUser.userId));
            const userData = userDoc.data();
            const hashedCurrentPassword = hashPassword(currentPassword);
            
            if (userData.password !== hashedCurrentPassword) {
                hideLoading();
                showMessage('La contraseña actual es incorrecta', 'error');
                return;
            }
            
            updateData.password = hashPassword(newPassword);
        }
        
        // Update in Firestore
        await updateDoc(doc(db, 'usuarios', currentUser.userId), updateData);
        
        // Update session
        currentUser.nombre = nombre;
        currentUser.especialidad = especialidad;
        
        const sessionKey = localStorage.getItem('userSession') ? 'userSession' : 'userSession';
        if (localStorage.getItem('userSession')) {
            localStorage.setItem('userSession', JSON.stringify(currentUser));
        } else {
            sessionStorage.setItem('userSession', JSON.stringify(currentUser));
        }
        
        // Reset edit mode
        isEditMode = false;
        editModeToggle.classList.remove('active');
        formInputs.forEach(input => input.disabled = true);
        formActions.style.display = 'none';
        
        // Clear password fields
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        
        hideLoading();
        showMessage('Perfil actualizado exitosamente', 'success');
        
        // Reload profile
        await loadUserProfile();
    } catch (error) {
        hideLoading();
        console.error('Error updating profile:', error);
        showMessage('Error al actualizar el perfil', 'error');
    }
});

// Toggle password visibility
document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = btn.previousElementSibling;
        const type = input.type === 'password' ? 'text' : 'password';
        input.type = type;
        
        const icon = btn.querySelector('i');
        if (type === 'password') {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        } else {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        }
    });
});

// Hash password
function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
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

// Show loading
function showLoading(message = 'Procesando...') {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.querySelector('p').textContent = message;
    loadingOverlay.classList.add('active');
}

// Hide loading
function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

// Show message
function showMessage(message, type = 'error') {
    const messageModal = document.getElementById('messageModal');
    const messageText = messageModal.querySelector('.message-text');
    const messageIcon = messageModal.querySelector('.message-icon');
    
    messageText.textContent = message;
    messageIcon.className = `message-icon ${type}`;
    
    if (type === 'success') {
        messageIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
    } else {
        messageIcon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
    }
    
    messageModal.classList.add('active');
}

// Close message modal
document.querySelector('.btn-close-message').addEventListener('click', () => {
    document.getElementById('messageModal').classList.remove('active');
});
