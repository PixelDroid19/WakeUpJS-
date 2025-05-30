# Sistema de Temas Profesional de JSRunner

## Descripción

JSRunner cuenta con un sistema de temas profesional y extensible que permite la personalización completa de la interfaz del editor Monaco y los componentes de la aplicación mediante archivos JSON.

## Características Principales

### ✅ Funcionalidades Implementadas

- **Carga Dinámica de Temas**: Los temas se cargan desde archivos JSON externos
- **Aplicación Una Sola Vez**: Los temas se aplican una vez y se mantienen hasta que se cambien
- **Persistencia**: El tema seleccionado se guarda en localStorage
- **Variables CSS**: Sistema de variables CSS para componentes UI
- **Integración Monaco**: Integración completa con Monaco Editor
- **Temas Base**: Incluye One Dark (desde JSON) y Light por defecto
- **Selector Visual**: Componente dropdown para cambiar temas fácilmente

### 🎨 Estructura de Archivos de Tema

Los temas se definen en archivos JSON con la siguiente estructura:

```json
{
  "displayName": "One Dark",
  "base": "vs-dark",
  "inherit": true,
  "rules": [
    {
      "background": "282a36",
      "token": ""
    },
    {
      "foreground": "6272a4",
      "token": "comment"
    }
  ],
  "colors": {
    "editor.foreground": "#f8f8f2",
    "editor.background": "#282a36",
    "editor.selectionBackground": "#44475a"
  },
  "ui": {
    "background": "#282a36",
    "foreground": "#f8f8f2",
    "accent": "#bd93f9",
    "success": "#50fa7b",
    "error": "#ff5555",
    "warning": "#ffb86c",
    "info": "#8be9fd"
  }
}
```

## Uso del Sistema

### 📁 Ubicación de Temas

Los archivos de temas se ubican en:
- `src/components/onedark.json` - Tema One Dark principal
- `src/lib/themes/theme-manager.ts` - Gestor de temas
- `src/styles/theme-variables.css` - Variables CSS

### 🔧 Cambiar Tema

1. **Mediante Selector**: Click en el botón 🎨 en el editor
2. **Programáticamente**: 
   ```typescript
   import { themeManager } from '../lib/themes/theme-manager';
   themeManager.setTheme('onedark');
   ```

### 🎯 Componentes que Usan Temas

- **Monaco Editor**: Sintaxis highlighting y colores de editor
- **Panel de Resultados**: Colores de output y errores
- **UI Components**: Botones, inputs y elementos de interfaz

## Variables CSS Disponibles

```css
--theme-bg           /* Fondo principal */
--theme-fg           /* Texto principal */
--theme-accent       /* Color de acento */
--theme-success      /* Color de éxito */
--theme-error        /* Color de error */
--theme-warning      /* Color de advertencia */
--theme-info         /* Color de información */
--theme-border       /* Color de bordes */
--theme-shadow       /* Color de sombras */
```

## Crear Temas Personalizados

### 📝 Método 1: Archivo JSON

1. Crear un nuevo archivo JSON siguiendo la estructura base
2. Ubicarlo en el directorio accesible por la aplicación
3. Cargar usando el ThemeManager:

```typescript
// Cargar tema desde archivo
const response = await fetch('/path/to/custom-theme.json');
const themeData = await response.json();
await themeManager.loadCustomTheme(themeData, 'custom-theme-name');
```

### 🔨 Método 2: Programático

```typescript
const customTheme = {
  name: 'mi-tema',
  displayName: 'Mi Tema Personalizado',
  monaco: {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '008000' },
      { token: 'keyword', foreground: '0000ff' }
    ],
    colors: {
      'editor.background': '#1a1a1a',
      'editor.foreground': '#ffffff'
    }
  },
  ui: {
    background: '#1a1a1a',
    foreground: '#ffffff',
    accent: '#007acc',
    success: '#4caf50',
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196f3'
  }
};

await themeManager.loadCustomTheme(customTheme, 'mi-tema');
themeManager.setTheme('mi-tema');
```

## API del ThemeManager

### Métodos Principales

```typescript
// Obtener instancia singleton
const themeManager = ThemeManager.getInstance();

// Establecer instancia de Monaco
themeManager.setMonacoInstance(monaco);

// Cambiar tema
themeManager.setTheme('nombre-tema');

// Obtener tema actual
const currentTheme = themeManager.getCurrentTheme();

// Obtener temas disponibles
const themes = themeManager.getAvailableThemes();

// Cargar tema personalizado
await themeManager.loadCustomTheme(jsonData, 'nombre');

// Exportar tema actual
const themeJson = themeManager.exportCurrentTheme();

// Obtener colores para componentes
const colors = themeManager.getThemeColors();
```

### Eventos y Callbacks

El sistema aplica automáticamente:
- **Variables CSS** al documento
- **Clase de tema** al body
- **Configuración Monaco** al editor
- **Persistencia** en localStorage

## Clases CSS para Componentes

### Aplicación Automática

```css
.theme-onedark .result-panel { /* Estilos automáticos */ }
.theme-light .result-panel { /* Estilos automáticos */ }
```

### Clases Utilitarias

```css
.themed-background    /* Fondo temático */
.themed-secondary     /* Fondo secundario */
.themed-border        /* Borde temático */
.themed-shadow        /* Sombra temática */
.themed-button        /* Botón temático */
.themed-input         /* Input temático */
```

## Integración con Componentes

### Uso en React Components

```tsx
import { themeManager } from '../lib/themes/theme-manager';

function MyComponent() {
  const colors = themeManager.getThemeColors();
  
  return (
    <div 
      className="themed-background themed-border"
      style={{ 
        borderColor: colors.accent,
        backgroundColor: colors.background 
      }}
    >
      Content
    </div>
  );
}
```

## Configuración Técnica

### Archivos Principales

- `src/lib/themes/theme-manager.ts` - Gestor principal
- `src/components/ThemeSelector.tsx` - Selector UI
- `src/styles/theme-variables.css` - Variables CSS
- `src/index.css` - Importación de estilos
- `src/components/onedark.json` - Tema base

### Inicialización

El sistema se inicializa automáticamente:
1. **ThemeManager**: Se carga al importar
2. **Monaco Integration**: Se conecta en `setupMonacoEditor()`
3. **CSS Variables**: Se aplican dinámicamente
4. **Persistencia**: Se restaura desde localStorage

## Beneficios del Sistema

### ✅ Ventajas

- **Profesional**: Basado en estándares de Monaco Editor
- **Extensible**: Fácil agregar nuevos temas
- **Mantenible**: Configuración centralizada
- **Performante**: Aplicación única sin re-renders
- **Consistente**: Variables CSS unificadas
- **Persistent**: Guarda preferencias del usuario

### 🎯 Casos de Uso

- **Desarrolladores**: Crear temas personalizados para branding
- **Usuarios**: Cambiar entre modo claro/oscuro fácilmente
- **Equipos**: Mantener consistencia visual
- **Accesibilidad**: Crear temas de alto contraste

## Solución de Problemas

### Problemas Comunes

1. **Tema no se aplica**: Verificar que Monaco esté inicializado
2. **Variables CSS no funcionan**: Verificar importación en index.css
3. **Tema no persiste**: Verificar localStorage disponible
4. **Colores incorrectos**: Verificar formato hex en JSON

### Debug

```typescript
// Verificar tema actual
console.log(themeManager.getCurrentThemeName());

// Verificar colores
console.log(themeManager.getThemeColors());

// Verificar temas disponibles
console.log(themeManager.getAvailableThemes());
```

## Mejoras Futuras

### Posibles Extensiones

- **Editor de Temas**: Interfaz para crear temas visualmente
- **Importar/Exportar**: Funcionalidad de compartir temas
- **Temas de Sistema**: Detectar modo oscuro/claro del OS
- **Animaciones**: Transiciones suaves entre temas
- **Templates**: Plantillas base para diferentes casos

Este sistema proporciona una base sólida y profesional para la personalización visual de JSRunner, manteniendo la simplicidad de uso mientras ofrece potencia y flexibilidad para usuarios avanzados. 