# 🚀 Instalación Rápida - Selector de Pacientes

## ✅ Ya Está Instalado

El selector de pacientes ya está completamente integrado en tu aplicación. No necesitas hacer nada más.

## 🎯 Cómo Probarlo

### Opción 1: En la Aplicación (Recomendado)

1. Abre tu navegador
2. Ve a la sección de **Cirugías**
3. Haz clic en **"Nueva Cirugía"**
4. Haz clic en el campo **"Paciente"**
5. ¡El modal se abrirá automáticamente!

### Opción 2: Demo Independiente

1. Abre `demo-selector-pacientes.html` en tu navegador
2. Haz clic en **"Abrir Selector de Pacientes"**
3. Explora todas las características

## 📋 Archivos Incluidos

```
proyecto/
├── Componentes/
│   ├── css/
│   │   └── PatientSelector.css          ← Estilos del modal
│   └── js/
│       └── PatientSelector.js           ← Lógica del selector
├── Secciones/
│   └── Cirugias.html                    ← Integrado aquí
├── demo-selector-pacientes.html         ← Demo independiente
├── SELECTOR_PACIENTES_README.md         ← Documentación completa
├── IMPLEMENTACION_COMPLETADA.md         ← Resumen de implementación
└── INSTALACION_RAPIDA.md                ← Este archivo
```

## 🎨 Características Principales

✅ **Búsqueda en tiempo real** - Encuentra pacientes al instante  
✅ **Tarjetas visuales** - Con avatar, nombre, documento, teléfono y email  
✅ **Diseño responsive** - Funciona en desktop, tablet y móvil  
✅ **Integración con Firestore** - Carga automática de pacientes  
✅ **Animaciones suaves** - Experiencia de usuario profesional  

## 🔧 Integración Automática

El selector ya está integrado en:

- ✅ **Cirugías** - Al crear o editar una cirugía
- ⚠️ **Otras secciones** - Puedes integrarlo fácilmente (ver abajo)

## 🚀 Usar en Otras Secciones

Si quieres usar el selector en otras partes de tu aplicación:

### 1. Agregar CSS y JS

```html
<!-- En el <head> -->
<link rel="stylesheet" href="../Componentes/css/PatientSelector.css">

<!-- Antes de cerrar </body> -->
<script src="../Componentes/js/PatientSelector.js"></script>
```

### 2. Cambiar el HTML

```html
<!-- Reemplaza tu select actual -->
<div style="position: relative;">
    <input 
        type="text" 
        id="pacienteDisplay" 
        class="form-input" 
        placeholder="Haz clic para seleccionar un paciente" 
        readonly 
        required
        style="cursor: pointer;"
    >
    <input type="hidden" id="pacienteId" required>
    <button 
        type="button" 
        id="openPatientSelector" 
        style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #D11A5C; cursor: pointer;"
    >
        <i class="fas fa-search"></i>
    </button>
</div>
```

### 3. Agregar JavaScript

```javascript
// Configurar Firestore (si no está ya configurado)
window.patientSelector.setFirestore(db);

// Agregar event listener
document.getElementById('openPatientSelector').addEventListener('click', () => {
    window.patientSelector.open((selectedPatient) => {
        document.getElementById('pacienteId').value = selectedPatient.id;
        document.getElementById('pacienteDisplay').value = 
            `${selectedPatient.nombre} - ${selectedPatient.documento || 'Sin documento'}`;
    });
});

// También permitir clic en el input
document.getElementById('pacienteDisplay').addEventListener('click', () => {
    window.patientSelector.open((selectedPatient) => {
        document.getElementById('pacienteId').value = selectedPatient.id;
        document.getElementById('pacienteDisplay').value = 
            `${selectedPatient.nombre} - ${selectedPatient.documento || 'Sin documento'}`;
    });
});
```

## 🎯 Ejemplo Completo

Ver `Secciones/Cirugias.html` y `Componentes/js/Cirugias.js` para un ejemplo completo de implementación.

## 📚 Más Información

- **Documentación completa**: `SELECTOR_PACIENTES_README.md`
- **Resumen de implementación**: `IMPLEMENTACION_COMPLETADA.md`
- **Demo visual**: `demo-selector-pacientes.html`

## 🐛 Problemas Comunes

### El modal no se abre
```javascript
// Asegúrate de que PatientSelector.js esté cargado
console.log(window.patientSelector); // Debe mostrar el objeto
```

### No se muestran pacientes
```javascript
// Verifica que Firestore esté configurado
window.patientSelector.setFirestore(db);
```

### Error de Firestore
```javascript
// Asegúrate de que 'db' esté disponible
import { getFirestore } from "firebase/firestore";
const db = getFirestore(app);
window.patientSelector.setFirestore(db);
```

## ✨ ¡Eso es Todo!

El selector está listo para usar. Disfruta de una experiencia mucho mejor al seleccionar pacientes.

**¿Preguntas?** Revisa `SELECTOR_PACIENTES_README.md` para más detalles.
