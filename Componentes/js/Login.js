// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// DOM Elements
const loginForm = document.getElementById('loginForm');
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const loadingOverlay = document.getElementById('loadingOverlay');
const messageModal = document.getElementById('messageModal');

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

// Show Loading
function showLoading() {
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

// Hash Password (Simple hash for demo - in production use bcrypt or similar)
function hashPassword(password) {
    // Simple hash - in production use a proper hashing library
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

// Login Form Submit
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    // Validation
    if (!email || !password) {
        showMessage('Por favor, completa todos los campos', 'error');
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

    showLoading();

    try {
        // Query Firestore for user
        const usuariosRef = collection(db, 'usuarios');
        const q = query(usuariosRef, where('email', '==', email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            hideLoading();
            showMessage('Usuario no encontrado. Verifica tu correo electrónico.', 'error');
            return;
        }

        // Check password
        let userFound = false;
        let userData = null;

        querySnapshot.forEach((doc) => {
            const user = doc.data();
            const hashedPassword = hashPassword(password);

            if (user.password === hashedPassword) {
                userFound = true;
                userData = {
                    id: doc.id,
                    ...user
                };
            }
        });

        if (!userFound) {
            hideLoading();
            showMessage('Contraseña incorrecta. Inténtalo de nuevo.', 'error');
            return;
        }

        // Check if user is active
        if (userData.activo === false) {
            hideLoading();
            showMessage('Tu cuenta ha sido desactivada. Contacta al administrador.', 'error');
            return;
        }

        // Save email if "Remember Me" is checked
        if (rememberMe) {
            localStorage.setItem('rememberedEmail', email);
            localStorage.setItem('rememberMe', 'true');
        } else {
            localStorage.removeItem('rememberedEmail');
            localStorage.removeItem('rememberMe');
        }

        // Save session
        const sessionData = {
            userId: userData.id,
            email: userData.email,
            nombre: userData.nombre,
            especialidad: userData.especialidad,
            fotoPerfil: userData.fotoPerfil || '',
            loginTime: new Date().toISOString()
        };

        if (rememberMe) {
            localStorage.setItem('userSession', JSON.stringify(sessionData));
        } else {
            sessionStorage.setItem('userSession', JSON.stringify(sessionData));
        }

        hideLoading();
        showMessage('¡Inicio de sesión exitoso! Redirigiendo...', 'success');

        // Redirect after 1.5 seconds
        setTimeout(() => {
            window.location.href = 'Secciones/PanelPrincipal.html';
        }, 1500);

    } catch (error) {
        hideLoading();
        console.error('Error al iniciar sesión:', error);
        showMessage('Error al iniciar sesión. Por favor, inténtalo de nuevo.', 'error');
    }
});

// Email Validation
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Check if user is already logged in and load saved email
window.addEventListener('DOMContentLoaded', () => {
    const sessionData = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');

    if (sessionData) {
        // User is already logged in, redirect to dashboard
        window.location.href = 'Secciones/PanelPrincipal.html';
        return;
    }

    // Load saved email if "Remember Me" was checked
    const savedEmail = localStorage.getItem('rememberedEmail');
    const rememberMe = localStorage.getItem('rememberMe') === 'true';

    if (savedEmail && rememberMe) {
        document.getElementById('email').value = savedEmail;
        document.getElementById('rememberMe').checked = true;
    }
});
