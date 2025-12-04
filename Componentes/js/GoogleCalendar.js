// Google Calendar API Configuration
const GOOGLE_CLIENT_ID = '496403685340-6idtgbostkm7oqbv114t7ucegl7euu21.apps.googleusercontent.com';
const GOOGLE_API_KEY = 'AIzaSyCi7Ug9mNVQR8RCNWQsakQKkelJCOnitzQ';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

let tokenClient;
let gapiInited = false;
let gisInited = false;

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
}

// Request authorization and create event
async function createCalendarEvent(eventDetails) {
    return new Promise((resolve, reject) => {
        tokenClient.callback = async (resp) => {
            if (resp.error !== undefined) {
                reject(resp);
                return;
            }

            try {
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
                resolve(request.result);
            } catch (error) {
                console.error('❌ Error al crear evento:', error);
                reject(error);
            }
        };

        // Check if user is already authorized
        if (gapi.client.getToken() === null) {
            // Prompt the user to select a Google Account and ask for consent
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            // Skip display of account chooser and consent dialog
            tokenClient.requestAccessToken({ prompt: '' });
        }
    });
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

// Export functions
window.GoogleCalendar = {
    gapiLoaded,
    gisLoaded,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    formatDateTimeForCalendar,
    calculateEndTime,
    isReady: () => gapiInited && gisInited
};
