// Common Sidebar functionality for all pages

// Firebase imports for checking user status
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Check if user is logged in
function checkAuth() {
    const sessionData = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
    
    if (!sessionData) {
        const currentPath = window.location.pathname;
        if (currentPath.includes('Secciones/')) {
            window.location.href = '../Login.html';
        } else {
            window.location.href = 'Login.html';
        }
        return null;
    }
    
    return JSON.parse(sessionData);
}

// Check if user is still active in database
async function checkUserStatus() {
    const userData = checkAuth();
    if (!userData) return;
    
    try {
        const userDoc = await getDoc(doc(db, 'usuarios', userData.userId));
        
        if (userDoc.exists()) {
            const currentUserData = userDoc.data();
            
            // If user has been deactivated, logout
            if (currentUserData.activo === false) {
                localStorage.removeItem('userSession');
                sessionStorage.removeItem('userSession');
                
                // Show deactivation message
                showDeactivationMessage();
            }
        }
    } catch (error) {
        console.error('Error checking user status:', error);
    }
}

// Load user data into sidebar
function loadSidebarUserData() {
    const userData = checkAuth();
    if (!userData) return;
    
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userName) userName.textContent = userData.nombre;
    if (userRole) userRole.textContent = userData.especialidad || 'Usuario';
    
    // Set avatar
    if (userAvatar) {
        if (userData.fotoPerfil) {
            userAvatar.innerHTML = `<img src="${userData.fotoPerfil}" alt="${userData.nombre}">`;
        } else {
            const initials = userData.nombre.split(' ').map(n => n[0]).join('').substring(0, 2);
            userAvatar.innerHTML = initials;
        }
    }
}

// Show deactivation message
function showDeactivationMessage() {
    // Create modal if it doesn't exist
    let modal = document.getElementById('deactivationModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'deactivationModal';
        modal.className = 'logout-modal active';
        modal.innerHTML = `
            <div class="logout-modal-content">
                <div class="logout-icon" style="background: linear-gradient(135deg, #dc3545 0%, #bd2130 100%);">
                    <i class="fas fa-user-slash"></i>
                </div>
                <h2 class="logout-title">Cuenta Desactivada</h2>
                <p class="logout-message">
                    Tu cuenta ha sido desactivada por un administrador. Por favor, contacta al administrador para más información.
                </p>
                <div class="logout-actions">
                    <button class="btn-confirm" onclick="redirectToLogin()">
                        <i class="fas fa-sign-in-alt"></i> Ir al Login
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        modal.classList.add('active');
    }
}

// Redirect to login
window.redirectToLogin = function() {
    const currentPath = window.location.pathname;
    if (currentPath.includes('Secciones/')) {
        window.location.href = '../Login.html';
    } else {
        window.location.href = 'Login.html';
    }
};

// Initialize sidebar on page load
document.addEventListener('DOMContentLoaded', () => {
    loadSidebarUserData();
    initializeSidebar();
    initializeLogoutModal();
    checkUserStatus(); // Check if user is still active
    
    // Check user status every 30 seconds
    setInterval(checkUserStatus, 30000);
});

// Initialize sidebar functionality
function initializeSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    // Desktop toggle
    if (sidebarToggle && sidebar && mainContent) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
            
            const icon = sidebarToggle.querySelector('i');
            if (sidebar.classList.contains('collapsed')) {
                icon.classList.remove('fa-chevron-left');
                icon.classList.add('fa-chevron-right');
            } else {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-left');
            }
        });
    }
    
    // Mobile menu
    if (mobileMenuBtn && sidebar && sidebarOverlay) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.add('mobile-open');
            sidebarOverlay.classList.add('active');
        });
        
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            sidebarOverlay.classList.remove('active');
        });
    }
    
    // Close mobile menu when clicking a link
    const menuLinks = document.querySelectorAll('.menu-link');
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768 && sidebar && sidebarOverlay) {
                sidebar.classList.remove('mobile-open');
                sidebarOverlay.classList.remove('active');
            }
        });
    });
}

// Initialize logout modal
function initializeLogoutModal() {
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutModal = document.getElementById('logoutModal');
    const cancelLogoutBtn = document.getElementById('cancelLogout');
    const confirmLogoutBtn = document.getElementById('confirmLogout');
    
    if (logoutBtn && logoutModal) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logoutModal.classList.add('active');
        });
    }
    
    if (cancelLogoutBtn && logoutModal) {
        cancelLogoutBtn.addEventListener('click', () => {
            logoutModal.classList.remove('active');
        });
    }
    
    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', () => {
            // Only remove session, keep remembered email
            localStorage.removeItem('userSession');
            sessionStorage.removeItem('userSession');
            
            const currentPath = window.location.pathname;
            if (currentPath.includes('Secciones/')) {
                window.location.href = '../Login.html';
            } else {
                window.location.href = 'Login.html';
            }
        });
    }
    
    // Close modal when clicking outside
    if (logoutModal) {
        logoutModal.addEventListener('click', (e) => {
            if (e.target === logoutModal) {
                logoutModal.classList.remove('active');
            }
        });
    }
}
