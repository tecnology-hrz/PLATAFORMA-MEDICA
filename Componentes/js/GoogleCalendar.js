// Google Calendar API Configuration
const GOOGLE_CLIENT_ID = '496403685340-6idtgbostkm7oqbv114t7ucegl7euu21.apps.googleusercontent.com';
const GOOGLE_API_KEY = 'AIzaSyCi7Ug9mNVQR8RCNWQsakQKkelJCOnitzQ';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

let tokenClient;
let gapiInited = false;
let gisInited = false;
let isAuthorized = false;

// Initialize Google API
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: GOOGLE_API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    console.log('✅ Google API Client initialized');
    
    // Intentar restaurar token guardado
    if (gisInited) {
        restoreToken();
    }
    
    updateAuthStatus();
}

// Initialize Google Identity Services
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });
    gisInited = true;
    console.log('✅ Google Identity Services initialized');
    
    // Intentar restaurar token guardado
    if (gapiInited) {
        restoreToken();
    }
    
    updateAuthStatus();
}

// Check if user is authorized
function checkAuthStatus() {
    if (!gapiInited) return false;
    
    const token = gapi.client.getToken();
    isAuthorized = token !== null;
    
    // Si hay token, guardarlo en localStorage para persistencia (dura más que sessionStorage)
    if (token) {
        try {
            // Agregar timestamp de expiración si no existe (tokens suelen durar 1 hora)
            if (!token.expires_at && token.expires_in) {
                token.expires_at = Date.now() + (token.expires_in * 1000);
            }
            localStorage.setItem('google_calendar_token', JSON.stringify(token));
            console.log('💾 Token guardado en localStorage');
        } catch (e) {
            console.warn('No se pudo guardar el token:', e);
        }
    }
    
    return isAuthorized;
}

// Restore token from localStorage
function restoreToken() {
    if (!gapiInited || !gisInited) {
        console.log('⏳ APIs no están listas aún');
        return false;
    }
    
    try {
        const savedToken = localStorage.getItem('google_calendar_token');
        console.log('🔍 Buscando token guardado...', savedToken ? 'Encontrado' : 'No encontrado');
        
        if (savedToken) {
            const token = JSON.parse(savedToken);
            
            // Verificar si el token no ha expirado
            const now = Date.now();
            const expiresAt = token.expires_at || 0;
            
            console.log('⏰ Verificando expiración:', {
                now: new Date(now).toLocaleString(),
                expires: expiresAt ? new Date(expiresAt).toLocaleString() : 'No definido',
                isValid: expiresAt > now
            });
            
            if (expiresAt > now) {
                gapi.client.setToken(token);
                isAuthorized = true;
                console.log('✅ Token restaurado exitosamente');
                updateAuthStatus();
                return true;
            } else {
                // Token expirado, limpiarlo
                localStorage.removeItem('google_calendar_token');
                console.log('⚠️ Token expirado, se eliminó');
            }
        }
    } catch (e) {
        console.error('❌ Error al restaurar token:', e);
        localStorage.removeItem('google_calendar_token');
    }
    
    return false;
}

// Update UI with auth status
function updateAuthStatus() {
    if (!gapiInited || !gisInited) return;
    
    checkAuthStatus();
    const statusElement = document.getElementById('googleCalendarStatus');
    const connectBtn = document.getElementById('connectGoogleCalendar');
    
    if (!statusElement || !connectBtn) return;
    
    if (isAuthorized) {
        statusElement.innerHTML = `
            <i class="fas fa-check-circle" style="color: #28a745;"></i>
            Google Calendar conectado
        `;
        statusElement.className = 'calendar-status connected';
        connectBtn.innerHTML = `
            <i class="fas fa-sync-alt"></i>
            Reconectar Google Calendar
        `;
        connectBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
    } else {
        statusElement.innerHTML = `
            <i class="fas fa-exclamation-circle" style="color: #ffc107;"></i>
            Google Calendar no conectado
        `;
        statusElement.className = 'calendar-status disconnected';
        connectBtn.innerHTML = `
            <i class="fas fa-calendar-plus"></i>
            Conectar Google Calendar
        `;
        connectBtn.style.background = 'linear-gradient(135deg, #D11A5C 0%, #a01548 100%)';
    }
}

// Authorize user - to be called from button
function authorizeGoogleCalendar() {
    return new Promise((resolve, reject) => {
        tokenClient.callback = (resp) => {
            if (resp.error !== undefined) {
                console.error('❌ Error en autorización:', resp);
                reject(resp);
                return;
            }
            
            console.log('✅ Autorización exitosa, respuesta:', resp);
            
            // Esperar un momento para que el token se establezca
            setTimeout(() => {
                isAuthorized = true;
                
                // Guardar el token inmediatamente después de la autorización
                const savedToken = checkAuthStatus();
                console.log('💾 Token guardado después de autorización:', savedToken);
                
                updateAuthStatus();
                resolve(resp);
            }, 500);
        };

        // Always show consent screen to select account
        tokenClient.requestAccessToken({ prompt: 'consent' });
    });
}

// Create calendar event (requires prior authorization)
async function createCalendarEvent(eventDetails) {
    try {
        // Verificar si está autorizado
        if (!checkAuthStatus()) {
            throw new Error('No autorizado. Por favor, conecta Google Calendar primero.');
        }

        const event = {
            summary: eventDetails.summary,
            location: eventDetails.location || 'Av. Roosevelt, Puente Calle 6 #26-59, Cali, Valle del Cauca',
            description: eventDetails.description,
            start: {
                dateTime: eventDetails.startDateTime,
                timeZone: 'America/Bogota',
            },
            end: {
                dateTime: eventDetails.endDateTime,
                timeZone: 'America/Bogota',
            },
            attendees: eventDetails.attendees || [],
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 }, // 1 día antes
                    { method: 'popup', minutes: 60 }, // 1 hora antes
                    { method: 'popup', minutes: 15 }, // 15 minutos antes
                ],
            },
            colorId: '11', // Rojo para eventos médicos
        };

        const request = await gapi.client.calendar.events.insert({
            calendarId: 'primary',
            resource: event,
            sendUpdates: 'all', // Enviar notificaciones a los asistentes
        });

        console.log('✅ Evento creado en Google Calendar:', request.result);
        return request.result;
    } catch (error) {
        console.error('❌ Error al crear evento:', error);
        throw error;
    }
}

// Update calendar event
async function updateCalendarEvent(eventId, updates) {
    try {
        const request = await gapi.client.calendar.events.patch({
            calendarId: 'primary',
            eventId: eventId,
            resource: updates,
            sendUpdates: 'all',
        });
        console.log('✅ Evento actualizado:', request.result);
        return request.result;
    } catch (error) {
        console.error('❌ Error al actualizar evento:', error);
        throw error;
    }
}

// Delete calendar event
async function deleteCalendarEvent(eventId) {
    try {
        await gapi.client.calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId,
            sendUpdates: 'all',
        });
        console.log('✅ Evento eliminado del calendario');
        return true;
    } catch (error) {
        console.error('❌ Error al eliminar evento:', error);
        throw error;
    }
}

// Helper function to format date for Google Calendar
function formatDateTimeForCalendar(date, time) {
    // date format: YYYY-MM-DD
    // time format: HH:MM
    return `${date}T${time}:00`;
}

// Helper function to calculate end time
function calculateEndTime(startDateTime, durationMinutes) {
    const start = new Date(startDateTime);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    return end.toISOString().slice(0, 19);
}

// Disconnect/revoke token
function disconnectGoogleCalendar() {
    try {
        const token = gapi.client.getToken();
        if (token) {
            google.accounts.oauth2.revoke(token.access_token, () => {
                console.log('Token revocado');
            });
            gapi.client.setToken(null);
        }
        localStorage.removeItem('google_calendar_token');
        isAuthorized = false;
        updateAuthStatus();
        console.log('✅ Sesión de Google Calendar cerrada');
    } catch (e) {
        console.warn('Error al desconectar:', e);
    }
}

// Export functions
window.GoogleCalendar = {
    gapiLoaded,
    gisLoaded,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    formatDateTimeForCalendar,
    calculateEndTime,
    isReady: () => gapiInited && gisInited,
    isAuthorized: () => checkAuthStatus(),
    authorize: authorizeGoogleCalendar,
    disconnect: disconnectGoogleCalendar,
    restoreToken,
    updateAuthStatus
};
