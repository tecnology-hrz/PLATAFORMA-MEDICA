/**
 * PatientSelector - Modal dinámico para selección de pacientes
 * Proporciona una interfaz visual con búsqueda y tarjetas de pacientes
 * 
 * NOTA: Este módulo requiere que Firestore esté disponible globalmente.
 * Asegúrate de que el archivo que lo use tenga acceso a la instancia de Firestore.
 */

class PatientSelector {
    constructor() {
        this.modal = null;
        this.searchInput = null;
        this.patientGrid = null;
        this.selectedPatient = null;
        this.patients = [];
        this.filteredPatients = [];
        this.onSelectCallback = null;
        this.firestoreDb = null; // Se establecerá externamente
        this.firestoreModules = null; // Para almacenar getDocs y collection

        this.init();
    }

    // Método para establecer la instancia de Firestore y los módulos necesarios
    setFirestore(db, modules) {
        this.firestoreDb = db;
        this.firestoreModules = modules; // { getDocs, collection }
    }

    init() {
        // Crear el modal si no existe
        if (!document.getElementById('patientSelectorModal')) {
            this.createModal();
        }

        this.modal = document.getElementById('patientSelectorModal');
        this.searchInput = document.getElementById('patientSearchInput');
        this.patientGrid = document.getElementById('patientGrid');

        this.attachEventListeners();
    }

    createModal() {
        const modalHTML = `
            <div class="patient-selector-modal" id="patientSelectorModal">
                <div class="patient-selector-content">
                    <div class="patient-selector-header">
                        <h2 class="patient-selector-title">
                            <i class="fas fa-user-injured"></i>
                            Seleccionar Paciente
                        </h2>
                        <button class="btn-close-patient-selector" id="closePatientSelector">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="patient-selector-search">
                        <div class="patient-search-box">
                            <i class="fas fa-search patient-search-icon"></i>
                            <input 
                                type="text" 
                                id="patientSearchInput" 
                                placeholder="Buscar por nombre, documento, teléfono o email..."
                                autocomplete="off"
                            >
                            <button class="patient-search-clear" id="clearPatientSearch">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <div class="patient-selector-body">
                        <div class="patient-results-info" id="patientResultsInfo">
                            Cargando pacientes...
                        </div>
                        <div class="patient-grid" id="patientGrid">
                            <div class="patient-loading">
                                <div class="patient-loading-spinner"></div>
                                <p>Cargando pacientes...</p>
                            </div>
                        </div>
                    </div>

                    <div class="patient-selector-footer">
                        <div class="selected-patient-info" id="selectedPatientInfo">
                            <i class="fas fa-info-circle"></i>
                            <span>Selecciona un paciente de la lista</span>
                        </div>
                        <div class="patient-selector-actions">
                            <button class="btn-patient-action btn-patient-cancel" id="cancelPatientSelection">
                                <i class="fas fa-times"></i>
                                Cancelar
                            </button>
                            <button class="btn-patient-action btn-patient-select" id="confirmPatientSelection" disabled>
                                <i class="fas fa-check"></i>
                                Seleccionar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    attachEventListeners() {
        // Cerrar modal
        document.getElementById('closePatientSelector').addEventListener('click', () => this.close());
        document.getElementById('cancelPatientSelection').addEventListener('click', () => this.close());

        // Búsqueda
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

        // Limpiar búsqueda
        document.getElementById('clearPatientSearch').addEventListener('click', () => {
            this.searchInput.value = '';
            this.handleSearch('');
            document.getElementById('clearPatientSearch').classList.remove('visible');
        });

        // Mostrar/ocultar botón de limpiar
        this.searchInput.addEventListener('input', (e) => {
            const clearBtn = document.getElementById('clearPatientSearch');
            if (e.target.value.length > 0) {
                clearBtn.classList.add('visible');
            } else {
                clearBtn.classList.remove('visible');
            }
        });

        // Confirmar selección
        document.getElementById('confirmPatientSelection').addEventListener('click', () => this.confirmSelection());

        // Cerrar al hacer clic fuera
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
    }

    async open(callback) {
        this.onSelectCallback = callback;
        this.selectedPatient = null;
        this.searchInput.value = '';
        document.getElementById('clearPatientSearch').classList.remove('visible');

        // Mostrar modal
        this.modal.classList.add('active');

        // Cargar pacientes
        await this.loadPatients();

        // Focus en búsqueda
        setTimeout(() => this.searchInput.focus(), 100);
    }

    close() {
        this.modal.classList.remove('active');
        this.selectedPatient = null;
        this.searchInput.value = '';
    }

    async loadPatients() {
        try {
            // Mostrar loading
            this.patientGrid.innerHTML = `
                <div class="patient-loading">
                    <div class="patient-loading-spinner"></div>
                    <p>Cargando pacientes...</p>
                </div>
            `;

            // Verificar que Firestore esté disponible
            if (!this.firestoreDb || !this.firestoreModules) {
                throw new Error('Firestore no está configurado. Usa setFirestore(db, modules) primero.');
            }

            // Obtener pacientes de Firestore usando la API modular
            const { getDocs, collection } = this.firestoreModules;
            const pacientesRef = collection(this.firestoreDb, 'pacientes');
            const snapshot = await getDocs(pacientesRef);

            this.patients = [];

            if (!snapshot.empty) {
                snapshot.forEach((doc) => {
                    const paciente = doc.data();
                    this.patients.push({
                        id: doc.id,
                        ...paciente
                    });
                });

                // Ordenar por nombre
                this.patients.sort((a, b) => {
                    const nameA = (a.nombre || '').toLowerCase();
                    const nameB = (b.nombre || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                });
            }

            this.filteredPatients = [...this.patients];
            this.renderPatients();

        } catch (error) {
            console.error('Error al cargar pacientes:', error);
            this.patientGrid.innerHTML = `
                <div class="no-patients-found">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error al cargar pacientes: ${error.message}</p>
                </div>
            `;
        }
    }

    handleSearch(query) {
        const searchTerm = query.toLowerCase().trim();

        if (searchTerm === '') {
            this.filteredPatients = [...this.patients];
        } else {
            this.filteredPatients = this.patients.filter(patient => {
                const nombre = (patient.nombre || '').toLowerCase();
                const documento = (patient.documento || '').toLowerCase();
                const telefono = (patient.telefono || '').toLowerCase();
                const email = (patient.email || '').toLowerCase();

                return nombre.includes(searchTerm) ||
                    documento.includes(searchTerm) ||
                    telefono.includes(searchTerm) ||
                    email.includes(searchTerm);
            });
        }

        this.renderPatients();
    }

    renderPatients() {
        const resultsInfo = document.getElementById('patientResultsInfo');

        if (this.filteredPatients.length === 0) {
            resultsInfo.innerHTML = 'No se encontraron pacientes';
            this.patientGrid.innerHTML = `
                <div class="no-patients-found">
                    <i class="fas fa-user-slash"></i>
                    <p>No se encontraron pacientes con ese criterio de búsqueda</p>
                </div>
            `;
            return;
        }

        resultsInfo.innerHTML = `Mostrando <strong>${this.filteredPatients.length}</strong> ${this.filteredPatients.length === 1 ? 'paciente' : 'pacientes'}`;

        this.patientGrid.innerHTML = this.filteredPatients.map(patient => this.createPatientCard(patient)).join('');

        // Agregar event listeners a las tarjetas
        this.patientGrid.querySelectorAll('.patient-card').forEach(card => {
            card.addEventListener('click', () => {
                const patientId = card.dataset.patientId;
                this.selectPatient(patientId);
            });
        });
    }

    createPatientCard(patient) {
        const initials = this.getInitials(patient.nombre || 'Paciente');
        const documento = patient.documento || 'Sin documento';
        const telefono = patient.telefono || 'Sin teléfono';
        const email = patient.email || 'Sin email';

        const isSelected = this.selectedPatient && this.selectedPatient.id === patient.id;

        return `
            <div class="patient-card ${isSelected ? 'selected' : ''}" data-patient-id="${patient.id}">
                <div class="patient-avatar">
                    ${patient.fotoPerfil ?
                `<img src="${patient.fotoPerfil}" alt="${patient.nombre}">` :
                `<span class="patient-avatar-initials">${initials}</span>`
            }
                </div>
                <div class="patient-info">
                    <div class="patient-name">${patient.nombre || 'Sin nombre'}</div>
                    <div class="patient-document">
                        <i class="fas fa-id-card"></i>
                        ${documento}
                    </div>
                    <div class="patient-contact">
                        <i class="fas fa-phone"></i>
                        ${telefono}
                    </div>
                    <div class="patient-email">${email}</div>
                </div>
            </div>
        `;
    }

    getInitials(name) {
        if (!name) return '?';

        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    selectPatient(patientId) {
        this.selectedPatient = this.patients.find(p => p.id === patientId);

        // Actualizar UI
        this.patientGrid.querySelectorAll('.patient-card').forEach(card => {
            if (card.dataset.patientId === patientId) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });

        // Actualizar footer
        const selectedInfo = document.getElementById('selectedPatientInfo');
        const confirmBtn = document.getElementById('confirmPatientSelection');

        if (this.selectedPatient) {
            selectedInfo.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span>Seleccionado: <span class="selected-patient-name">${this.selectedPatient.nombre}</span></span>
            `;
            confirmBtn.disabled = false;
        } else {
            selectedInfo.innerHTML = `
                <i class="fas fa-info-circle"></i>
                <span>Selecciona un paciente de la lista</span>
            `;
            confirmBtn.disabled = true;
        }
    }

    confirmSelection() {
        if (this.selectedPatient && this.onSelectCallback) {
            this.onSelectCallback(this.selectedPatient);
            this.close();
        }
    }
}

// Crear instancia global
window.patientSelector = new PatientSelector();
