# 🧩 Sistema de Snippets Personalizados - JSRunner

## 📋 Descripción

JSRunner incluye un sistema completo de snippets personalizados que permite crear, gestionar y utilizar fragmentos de código reutilizables directamente integrados con el editor Monaco.

## ✨ Características Principales

### 🔧 Gestión Completa de Snippets
- **Crear** snippets personalizados con sintaxis VS Code
- **Editar** snippets existentes
- **Eliminar** snippets no necesarios
- **Duplicar** snippets para crear variaciones
- **Categorizar** snippets para mejor organización
- **Buscar y filtrar** por nombre, lenguaje, categoría

### 🌍 Soporte Multi-lenguaje
- JavaScript/TypeScript
- HTML/CSS
- JSON
- Markdown
- Texto plano
- Snippets universales (*)

### 💾 Persistencia y Portabilidad
- **Autoguardado** en localStorage
- **Exportar** snippets a archivo JSON
- **Importar** snippets desde archivo JSON
- **Snippets integrados** predefinidos

### 🔗 Integración con Monaco Editor
- **Autocompletado** inteligente (Ctrl+Space)
- **Variables de snippet** con soporte VS Code
- **Inserción automática** con expansión de prefijo
- **Comandos de teclado** para gestión rápida

## 🚀 Cómo Usar

### Acceder al Gestor de Snippets

1. **Menú Contextual**: Click derecho → "Gestionar Snippets"
2. **Teclado**: `Ctrl+Shift+P` → "Snippets"

### Crear un Snippet

1. Abrir el Gestor de Snippets
2. Click en "Crear Snippet"
3. Completar el formulario:
   - **Nombre**: Descripción del snippet
   - **Prefijo**: Palabra clave para activar
   - **Descripción**: Opcional, ayuda contextual
   - **Lenguaje**: JavaScript, TypeScript, HTML, etc.
   - **Categoría**: Para organización
   - **Cuerpo**: El código del snippet

### Variables de Snippet

JSRunner soporta variables de snippet siguiendo la sintaxis VS Code:

```javascript
// Ejemplo de snippet con variables
function ${1:functionName}(${2:params}) {
  ${3:// TODO: Implementar}
  $0
}
```

**Variables soportadas:**
- `$1`, `$2`, `$3`, etc. - Posiciones de tabulación
- `$0` - Posición final del cursor
- `${1:defaultText}` - Placeholder con texto por defecto
- `${1|option1,option2,option3|}` - Lista de opciones

### Usar Snippets en el Editor

1. **Autocompletado**: Escribir el prefijo y presionar `Ctrl+Space`
2. **Expansión directa**: Escribir el prefijo y presionar `Tab`
3. **Búsqueda**: `Ctrl+Shift+P` → buscar por nombre

## 📂 Snippets Integrados

### JavaScript/TypeScript

- `log` - console.log()
- `func` - Función básica
- `afunc` - Función async
- `iife` - Immediately Invoked Function Expression
- `tryc` - Try-catch block
- `forof` - For...of loop
- `foreach` - Array.forEach()
- `map` - Array.map()
- `filter` - Array.filter()
- `reduce` - Array.reduce()

### React

- `rfc` - React Functional Component
- `useState` - useState Hook
- `useEffect` - useEffect Hook
- `props` - Props destructuring
- `context` - useContext Hook

### HTML

- `html5` - Estructura HTML5 básica
- `div` - Div con className
- `form` - Formulario básico
- `btn` - Botón

### CSS

- `flex` - Flexbox container
- `grid` - CSS Grid container
- `center` - Centrar elemento
- `media` - Media query

## 🎨 Categorías Predefinidas

- **JavaScript**: Snippets básicos de JS
- **React**: Componentes y hooks
- **HTML**: Estructuras HTML
- **CSS**: Estilos y layouts
- **Utils**: Utilidades generales
- **Custom**: Snippets personalizados

## 📊 Estadísticas y Filtros

El gestor incluye:
- **Contador total** de snippets
- **Distribución por lenguaje**
- **Filtros avanzados** por categoría, lenguaje, tipo
- **Búsqueda en tiempo real**
- **Ordenamiento** por nombre, fecha, categoría

## 🔧 Configuración Avanzada

### Formato de Importación/Exportación

```json
{
  "version": "1.0.0",
  "snippets": [
    {
      "id": "unique-id",
      "name": "Mi Snippet",
      "prefix": "mysnip",
      "description": "Descripción opcional",
      "body": ["línea 1", "línea 2"],
      "language": "javascript",
      "category": "custom",
      "isBuiltIn": false,
      "createdAt": 1703123456789,
      "updatedAt": 1703123456789
    }
  ],
  "categories": [
    {
      "id": "custom",
      "name": "Personalizado",
      "description": "Snippets personalizados",
      "color": "#3b82f6"
    }
  ],
  "exportedAt": 1703123456789
}
```

### Integración con Monaco

Los snippets se integran automáticamente con:
- Sistema de autocompletado de Monaco
- Validation de sintaxis
- Highlighting de código
- IntelliSense mejorado

## 🐛 Solución de Problemas

### Snippets no aparecen en autocompletado
- Verificar que el lenguaje coincida con el archivo actual
- Comprobar que el prefijo no tenga espacios
- Reiniciar el editor si es necesario

### Error al importar snippets
- Verificar formato JSON válido
- Comprobar estructura de datos
- Ver consola para errores específicos

### Snippets duplicados
- Usar función "Duplicar" en lugar de copiar manualmente
- Verificar prefijos únicos por lenguaje

## 💡 Tips y Mejores Prácticas

1. **Prefijos únicos**: Usar prefijos cortos pero únicos
2. **Descripciones claras**: Ayudan en el autocompletado
3. **Categorización**: Mantener snippets organizados
4. **Variables útiles**: Usar posiciones de tabulación lógicas
5. **Backup regular**: Exportar snippets importantes
6. **Snippets simples**: Evitar lógica compleja en snippets

## 🎯 Casos de Uso Comunes

### Para Desarrollo Web
- Templates HTML rápidos
- Estructuras CSS comunes
- Patterns JavaScript frecuentes

### Para React
- Componentes base
- Hooks personalizados
- Patrones de estado

### Para APIs
- Fetch patterns
- Error handling
- Response formatting

### Para Testing
- Test structures
- Mock objects
- Assertion patterns 