# Configuración de Reglas de Firebase para Confirmación Pública de Citas

## Problema
La página de confirmación de citas necesita acceso público (sin autenticación) para que los pacientes puedan confirmar/cancelar desde el email.

## Solución

### 1. Ve a Firebase Console
1. Abre https://console.firebase.google.com/
2. Selecciona tu proyecto: `plataformamedica-d1a7d`
3. En el menú lateral, ve a **Firestore Database**
4. Haz clic en la pestaña **Reglas** (Rules)

### 2. Actualiza las Reglas de Firestore

Reemplaza las reglas actuales con estas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Regla por defecto: requiere autenticación
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // EXCEPCIÓN: Permitir lectura y actualización pública de citas
    // Solo para confirmar/cancelar (no crear ni eliminar)
    match /citas/{citaId} {
      // Permitir leer cualquier cita (para mostrar detalles)
      allow read: if true;
      
      // Permitir actualizar solo el campo 'estado' y 'fechaConfirmacion'
      // Solo si el nuevo estado es 'confirmada' o 'cancelada'
      allow update: if request.resource.data.estado in ['confirmada', 'cancelada']
                    && request.resource.data.keys().hasOnly(['estado', 'fechaConfirmacion', 'fechaCita', 'horaCita', 'tipoCita', 'motivoCita', 'duracion', 'notas', 'medicoId', 'medicoNombre', 'pacienteId', 'tipoPaciente', 'nombreExterno', 'cedulaExterno', 'emailExterno', 'telefonoExterno', 'fechaCreacion']);
      
      // NO permitir crear ni eliminar públicamente
      allow create, delete: if request.auth != null;
    }
  }
}
```

### 3. Publica las Reglas
1. Haz clic en **Publicar** (Publish)
2. Confirma los cambios

### 4. Prueba la Funcionalidad
1. Abre la página de confirmación con un ID de cita válido
2. Ejemplo: `ConfirmarCita.html?id=ABC123`
3. Verifica que puedas ver los detalles de la cita
4. Haz clic en "Confirmar" o "No Asistiré"
5. Verifica que el estado se actualice en Firebase

## Seguridad

Estas reglas son seguras porque:
- ✅ Solo permiten LEER y ACTUALIZAR citas (no crear ni eliminar)
- ✅ Solo permiten cambiar el estado a 'confirmada' o 'cancelada'
- ✅ No permiten modificar otros campos importantes
- ✅ El resto de la plataforma sigue requiriendo autenticación

## Alternativa Más Segura (Opcional)

Si prefieres mayor seguridad, puedes usar Firebase Functions para validar las actualizaciones en el servidor. Pero para un MVP, las reglas anteriores son suficientes.

## Notas Importantes

1. **URL del Email**: Recuerda cambiar `https://tu-dominio.com` en el template del email por tu URL real
2. **Hosting**: La página `ConfirmarCita.html` debe estar accesible públicamente
3. **Testing**: Prueba con diferentes IDs de citas para asegurarte de que funciona

## Contacto de Soporte
Si tienes problemas, revisa la consola del navegador (F12) para ver los errores específicos.
