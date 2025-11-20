// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCcNM1AiR8Xn0N-jQokhsbqXyHJi1ozm0w",
    authDomain: "plataformamedica-d1a7d.firebaseapp.com",
    projectId: "plataformamedica-d1a7d",
    storageBucket: "plataformamedica-d1a7d.firebasestorage.app",
    messagingSenderId: "17741817268",
    appId: "1:17741817268:web:4556073290256d65c73ee1",
    measurementId: "G-5W16CTQECZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ImgBB API Key
const IMGBB_API_KEY = '2e40e99a54d9185b904e9667b2658747';

// DOM Elements
const registroForm = document.getElementById('registroForm');
const photoInput = document.getElementById('photoInput');
const profilePhotoPreview = document.getElementById('profilePhotoPreview');
const togglePassword = document.getElementById('togglePassword');
const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const passwordStrengthBar = document.getElementById('passwordStrengthBar');
const loadingOverlay = document.getElementById('loadingOverlay');
const messageModal = document.getElementById('messageModal');

let uploadedPhotoUrl = '';

// Profile Photo Upload
photoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showMessage('Por favor, selecciona un archivo de imagen válido', 'error');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showMessage('La imagen no debe superar los 5MB', 'error');
        return;
    }
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        profilePhotoPreview.innerHTML = `<img src="${e.target.result}" alt="Foto de perfil">`;
    };
    reader.readAsDataURL(file);
    
    // Upload to ImgBB
    showLoading('Subiendo foto de perfil...');
    
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
            hideLoading();
            showMessage('Foto de perfil subida exitosamente', 'success');
        } else {
            throw new Error('Error al subir la imagen');
        }
    } catch (error) {
        hideLoading();
        console.error('Error al subir imagen:', error);
        showMessage('Error al subir la foto. Inténtalo de nuevo.', 'error');
        profilePhotoPreview.innerHTML = '<i class="fas fa-user"></i>';
        uploadedPhotoUrl = '';
    }
});

// Toggle Password Visibility
togglePassword.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    
    const icon = togglePassword.querySelector('i');
    if (type === 'password') {
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    } else {
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    }
});

toggleConfirmPassword.addEventListener('click', () => {
    const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
    confirmPasswordInput.type = type;
    
    const icon = toggleConfirmPassword.querySelector('i');
    if (type === 'password') {
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    } else {
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    }
});

// Password Strength Checker
passwordInput.addEventListener('input', () => {
    const password = passwordInput.value;
    const strength = checkPasswordStrength(password);
    
    passwordStrengthBar.className = 'password-strength-bar';
    
    if (password.length === 0) {
        passwordStrengthBar.classList.remove('weak', 'medium', 'strong');
    } else if (strength < 3) {
        passwordStrengthBar.classList.add('weak');
    } else if (strength < 5) {
        passwordStrengthBar.classList.add('medium');
    } else {
        passwordStrengthBar.classList.add('strong');
    }
});

function checkPasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    return strength;
}

// Show Loading
function showLoading(message = 'Procesando...') {
    loadingOverlay.querySelector('p').textContent = message;
    loadingOverlay.classList.add('active');
}

// Hide Loading
function hideLoading() {
    loadingOverlay.classList.remove('active');
}

// Show Message
function showMessage(message, type = 'error') {
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

// Close Message Modal
document.querySelector('.btn-close-message').addEventListener('click', () => {
    messageModal.classList.remove('active');
});

// Hash Password
function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

// Email Validation
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Check if email exists
async function emailExists(email) {
    const usuariosRef = collection(db, 'usuarios');
    const q = query(usuariosRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
}

// Registro Form Submit
registroForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const especialidad = document.getElementById('especialidad').value;
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const acceptTerms = document.getElementById('acceptTerms').checked;
    
    // Validations
    if (!nombre || !email || !telefono || !especialidad || !password || !confirmPassword) {
        showMessage('Por favor, completa todos los campos obligatorios', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showMessage('Por favor, ingresa un correo electrónico válido', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('Las contraseñas no coinciden', 'error');
        return;
    }
    
    if (!acceptTerms) {
        showMessage('Debes aceptar los términos y condiciones', 'error');
        return;
    }
    
    if (especialidad === '') {
        showMessage('Por favor, selecciona una especialidad', 'error');
        return;
    }
    
    showLoading('Creando cuenta...');
    
    try {
        // Check if email already exists
        const exists = await emailExists(email);
        
        if (exists) {
            hideLoading();
            showMessage('Este correo electrónico ya está registrado', 'error');
            return;
        }
        
        // Create user object
        const userData = {
            nombre: nombre,
            email: email,
            telefono: telefono,
            especialidad: especialidad,
            password: hashPassword(password),
            fotoPerfil: uploadedPhotoUrl || '',
            fechaRegistro: new Date().toISOString(),
            activo: true
        };
        
        // Add to Firestore
        const docRef = await addDoc(collection(db, 'usuarios'), userData);
        
        hideLoading();
        showMessage('¡Cuenta creada exitosamente! Redirigiendo al login...', 'success');
        
        // Redirect to Gestión de Usuarios after 2 seconds
        setTimeout(() => {
            window.location.href = 'Secciones/GestionUsuarios.html';
        }, 2000);
        
    } catch (error) {
        hideLoading();
        console.error('Error al crear cuenta:', error);
        showMessage('Error al crear la cuenta. Por favor, inténtalo de nuevo.', 'error');
    }
});

// Note: Registration is now done from within the platform (Gestión de Usuarios)
// No need to check for existing session since only authenticated users can access this page
