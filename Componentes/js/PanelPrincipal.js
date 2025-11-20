// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let allPacientes = [];
let allCirugias = [];
let allCitas = [];

// Check if user is logged in
window.addEventListener('DOMContentLoaded', () => {
    const sessionData = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
    
    if (!sessionData) {
        window.location.href = '../Login.html';
        return;
    }
    
    // Load user data
    const userData = JSON.parse(sessionData);
    loadPageUserData(userData);
    
    // Wait for Sidebar.js to load
    setTimeout(() => {
        loadDashboardData();
    }, 100);
});

// Load user data into page-specific UI
function loadPageUserData(userData) {
    const pageUserName = document.getElementById('pageUserName');
    
    if (pageUserName) {
        pageUserName.textContent = userData.nombre.split(' ')[0];
    }
}

// Load all dashboard data from Firebase
async function loadDashboardData() {
    try {
        // Load pacientes
        const pacientesSnapshot = await getDocs(collection(db, 'pacientes'));
        allPacientes = [];
        pacientesSnapshot.forEach((doc) => {
            allPacientes.push({ id: doc.id, ...doc.data() });
        });

        // Load cirugias
        const cirugiasSnapshot = await getDocs(collection(db, 'cirugias'));
        allCirugias = [];
        cirugiasSnapshot.forEach((doc) => {
            allCirugias.push({ id: doc.id, ...doc.data() });
        });

        // Load citas
        const citasSnapshot = await getDocs(collection(db, 'citas'));
        allCitas = [];
        citasSnapshot.forEach((doc) => {
            allCitas.push({ id: doc.id, ...doc.data() });
        });

        // Update stats
        updateStats();
        
        // Update recent appointments
        updateRecentCitas();
        
        // Update surgeries by type
        updateCirugiasByType();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Update statistics cards
function updateStats() {
    // Total pacientes
    document.getElementById('totalPacientes').textContent = allPacientes.length;

    // Cirugías realizadas
    const cirugiasRealizadas = allCirugias.filter(c => c.estado === 'Realizada').length;
    document.getElementById('cirugiasRealizadas').textContent = cirugiasRealizadas;

    // Citas hoy
    const today = new Date().toISOString().split('T')[0];
    const citasHoy = allCitas.filter(c => c.fechaCita === today).length;
    document.getElementById('citasHoy').textContent = citasHoy;

    // Citas pendientes
    const citasPendientes = allCitas.filter(c => c.estado === 'pendiente' || c.estado === 'confirmada').length;
    document.getElementById('citasPendientes').textContent = citasPendientes;
}

// Update recent appointments
function updateRecentCitas() {
    const citasRecientesContainer = document.querySelector('.content-card:first-child .card-body');
    
    // Get recent citas (last 5)
    const recentCitas = [...allCitas]
        .sort((a, b) => {
            const dateA = new Date(`${a.fechaCita} ${a.horaCita}`);
            const dateB = new Date(`${b.fechaCita} ${b.horaCita}`);
            return dateB - dateA;
        })
        .slice(0, 5);

    if (recentCitas.length === 0) {
        citasRecientesContainer.innerHTML = `
            <p style="color: #6c757d; text-align: center; padding: 20px;">
                No hay citas recientes
            </p>
        `;
        return;
    }

    citasRecientesContainer.innerHTML = recentCitas.map(cita => {
        let pacienteNombre;
        if (cita.tipoPaciente === 'externo') {
            pacienteNombre = cita.nombreExterno;
        } else {
            const paciente = allPacientes.find(p => p.id === cita.pacienteId);
            pacienteNombre = paciente ? paciente.nombre : 'Paciente no encontrado';
        }

        const estadoClass = `status-${cita.estado}`;
        const estadoText = {
            'pendiente': 'Pendiente',
            'confirmada': 'Confirmada',
            'completada': 'Completada',
            'cancelada': 'Cancelada'
        }[cita.estado] || cita.estado;

        return `
            <div class="cita-item" onclick="window.location.href='Citas.html'">
                <div class="cita-info">
                    <div class="cita-paciente">${pacienteNombre}</div>
                    <div class="cita-details">
                        <span><i class="fas fa-calendar"></i> ${formatDate(cita.fechaCita)}</span>
                        <span><i class="fas fa-clock"></i> ${formatTime(cita.horaCita)}</span>
                    </div>
                </div>
                <span class="cita-status ${estadoClass}">${estadoText}</span>
            </div>
        `;
    }).join('');
}

// Update surgeries by type
function updateCirugiasByType() {
    const cirugiasByTypeContainer = document.querySelector('.content-card:last-child .card-body');
    
    // Count surgeries by type
    const cirugiasByType = {};
    allCirugias.forEach(cirugia => {
        const tipo = cirugia.tipoCirugia;
        cirugiasByType[tipo] = (cirugiasByType[tipo] || 0) + 1;
    });

    // Sort by count
    const sortedTypes = Object.entries(cirugiasByType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Top 5

    if (sortedTypes.length === 0) {
        cirugiasByTypeContainer.innerHTML = `
            <p style="color: #6c757d; text-align: center; padding: 20px;">
                No hay cirugías registradas
            </p>
        `;
        return;
    }

    cirugiasByTypeContainer.innerHTML = `
        <div style="padding: 20px;">
            ${sortedTypes.map(([tipo, count]) => `
                <div class="cirugia-type-item">
                    <span class="cirugia-type-name">${tipo}</span>
                    <span class="cirugia-type-count">${count}</span>
                </div>
            `).join('')}
        </div>
    `;
}

// Helper functions
function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const options = { day: 'numeric', month: 'short' };
    return date.toLocaleDateString('es-ES', options);
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}
