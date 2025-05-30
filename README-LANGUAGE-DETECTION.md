# 🔍 Detección Automática de Lenguaje (Simplificada)

JSRunner incluye un sistema avanzado de detección automática de lenguaje que funciona **internamente** sin modificar los nombres de archivos visibles.

## ✨ Nuevo Enfoque Simplificado

### Sin Extensiones Automáticas
- ✅ **Nombres limpios**: Los archivos se crean sin extensiones automáticas (ej: `mi-componente` en lugar de `mi-componente.jsx`)
- ✅ **Detección interna**: El sistema detecta TypeScript, JSX, etc. basándose en el contenido del código
- ✅ **Configuración automática**: Monaco Editor, ESLint y ejecución se configuran apropiadamente
- ✅ **UI más limpia**: Pestañas sin extensiones, más fácil de leer

### Detección Inteligente Interna
- **JavaScript/TypeScript**: Detecta sintaxis específica de TypeScript como interfaces, tipos, anotaciones
- **JSX/TSX**: Identifica componentes React, atributos JSX, y patrones de componentes
- **Prevención de Falsos Positivos**: Evita confundir comparaciones matemáticas o template strings con JSX

### Actualización Dinámica
- **Configuración Transparente**: Monaco se actualiza automáticamente al tipo de código detectado
- **Debounce Inteligente**: Solo re-evalúa cuando hay cambios significativos (500ms de debounce)
- **ESLint Dinámico**: Las reglas de ESLint se adaptan al tipo de código automáticamente

## 🎯 Casos de Uso

### Crear Nuevo Archivo
```
1. Click en "Nuevo archivo"
2. Nombre: "mi-componente" (sin extensión)
3. Contenido: 
   function Welcome() {
     return <div>Hello World!</div>;
   }
4. ✅ Sistema detecta JSX automáticamente
5. ✅ Monaco se configura para JavaScript React
6. ✅ Ejecución funciona correctamente
```

### Cambio de Código en Archivo Existente
```
1. Archivo llamado "utilidades"
2. Contenido inicial: console.log('test');
3. Agregar TypeScript:
   interface User { name: string; }
4. ✅ Sistema detecta TypeScript automáticamente
5. ✅ Monaco se reconfigura para TypeScript
6. ✅ ESLint usa reglas TypeScript
```

## 🔧 Funcionalidades Internas

### Detección de Patrones
El sistema busca estos patrones para determinar el tipo:

**TypeScript:**
- `interface ClassName`
- `type TypeName =`
- `: string`, `: number` (anotaciones de tipo)
- `as ClassName` (type assertions)

**JSX:**
- `<ComponentName>` (componentes con mayúscula)
- `className=` (atributos JSX)
- `onClick=` (eventos JSX)
- `return <div>` (JSX en returns)

**Prevención de Falsos Positivos:**
- Ignora `<` en comparaciones matemáticas
- Ignora `<` en regex
- Ignora `<` en template strings

### Configuración Automática

**Monaco Editor:**
- Syntax highlighting apropiado
- Autocompletado específico del lenguaje
- Validación de errores correcta
- Snippets contextuales

**Sistema de Ejecución:**
- Babel presets correctos
- TypeScript compilation si es necesario
- JSX transformation automática
- ES6+ features habilitadas

**ESLint (futuro):**
- Reglas JavaScript para .js detectado
- Reglas TypeScript para .ts detectado
- Reglas React para JSX detectado

## ⚡ Rendimiento y Eficiencia

### Optimizaciones Implementadas
- **Hash de contenido**: Evita re-detecciones innecesarias
- **Debounce inteligente**: Solo evalúa en cambios significativos
- **Cache de detección**: Reutiliza resultados cuando es posible
- **Detección progresiva**: Evaluación rápida de patrones comunes primero

### Escalabilidad
- **Añadir nuevos lenguajes**: Fácil extensión del sistema de detección
- **Configuraciones personalizadas**: Sistema modular para diferentes configuraciones
- **Performance**: Optimizado para archivos grandes y cambios frecuentes

## 🔄 Migración del Sistema Anterior

### Lo que cambió:
- ❌ **Antes**: Archivos con extensiones automáticas (`mi-archivo.jsx`)
- ✅ **Ahora**: Archivos sin extensiones (`mi-archivo`)

### Lo que se mantiene:
- ✅ **Detección automática**: Sigue funcionando, pero internamente
- ✅ **Configuración apropiada**: Monaco, ESLint, ejecución funcionan igual
- ✅ **Compatibilidad**: Archivos existentes siguen funcionando

### Beneficios de la migración:
- 🎨 **UI más limpia**: Pestañas sin extensiones largas
- 🚀 **Más rápido**: Menos lógica de nombre de archivo
- 🔧 **Más confiable**: Detección basada en contenido real
- 📱 **Mejor UX**: Más fácil crear y manejar archivos

## 🐛 Debugging y Logs

### Configuración de Logs
```javascript
// En constants/config.ts
DEBUG_CONFIG.ENABLE_VERBOSE_LOGGING = true;
```

### Información Disponible
- Tipo de contenido detectado
- Configuración de Monaco aplicada
- Presets de Babel utilizados
- Tiempos de detección
- Cache hits/misses

## 📝 Ejemplos de Flujo

### Ejemplo 1: Componente React
```javascript
// Archivo: "Header" (sin extensión)
// Contenido:
import { useState } from 'react';

function Header() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <nav className="header">
      <h1>Mi App</h1>
      <button onClick={() => setIsOpen(!isOpen)}>
        Menú
      </button>
    </nav>
  );
}

export default Header;

// ✅ Detectado como: JSX (javascript)
// ✅ Monaco: configurado para JavaScript React
// ✅ Babel: presets React + ES6
// ✅ Ejecución: funciona perfectamente
```

### Ejemplo 2: Utilidades TypeScript
```typescript
// Archivo: "utils" (sin extensión)
// Contenido:
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

class ApiClient {
  async get<T>(url: string): Promise<ApiResponse<T>> {
    const response = await fetch(url);
    return response.json();
  }
}

export const api = new ApiClient();

// ✅ Detectado como: TypeScript
// ✅ Monaco: configurado para TypeScript
// ✅ Babel: presets TypeScript + ES6
// ✅ Ejecución: transpilado correctamente
```

## 🌟 Ventajas del Nuevo Sistema

1. **Simplicidad**: Sin preocuparse por extensiones
2. **Automatización**: El sistema "entiende" el código automáticamente
3. **Flexibilidad**: Fácil cambiar entre tipos de código
4. **Limpieza**: UI más clara y profesional
5. **Eficiencia**: Mejor rendimiento y menos errores
6. **Escalabilidad**: Fácil agregar soporte para nuevos lenguajes

Este nuevo enfoque hace que JSRunner sea más intuitivo y eficiente, eliminando la complejidad innecesaria mientras mantiene toda la funcionalidad avanzada de detección automática.