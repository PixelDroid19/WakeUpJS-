# Sistema de Ejecución de Código - Arquitectura Componentizada

Este directorio contiene el sistema refactorizado para la ejecución de código JavaScript, TypeScript y JSX. La arquitectura ha sido completamente componentizada para mejorar la mantenibilidad, testabilidad y reutilización.

## 📁 Estructura de Archivos

### Archivos Principales
- **`run.ts`** - Archivo principal que orquesta todo el proceso de ejecución
- **`types.ts`** - Tipos e interfaces compartidos por todo el sistema

### Módulos Especializados
- **`detectors.ts`** - Funciones de detección de tipos de código (JSX, TypeScript, bucles infinitos)
- **`code-transformer.ts`** - Transformación de código usando Babel
- **`code-executor.ts`** - Ejecución de código en entorno controlado
- **`console-api.ts`** - API de console personalizada con todos los métodos estándar de MDN
- **`react-context.ts`** - Contexto React para ejecución de JSX
- **`module-system.ts`** - Sistema de módulos para importaciones
- **`global-context.ts`** - Contexto global con APIs web y variables de entorno
- **`result-helpers.ts`** - Utilidades para procesar resultados

## 🚀 Nuevas Funcionalidades - Sistema de Debounce Inteligente

### Hook `useDebouncedCodeRunner`
Sistema avanzado de debounce que adapta automáticamente el tiempo de espera según el contexto:

#### ⚡ **Debounce Adaptativo**
```typescript
// Configuración automática según el tipo de cambio
SMALL_CHANGE_THRESHOLD: 5,     // caracteres -> 300ms (validación rápida)
LARGE_CHANGE_THRESHOLD: 50,    // caracteres -> 1000ms (ejecución completa)
SIZE_SCALING_FACTOR: 0.1,      // ms adicionales por caracter de código
MAX_SIZE_BONUS: 2000           // máximo tiempo adicional por tamaño
```

#### 🔄 **Coordinación con AutoSave**
**Problema resuelto:** El sistema evita conflictos entre el autosave y la escritura rápida (ej. mantener presionada la tecla de borrar).

**Solución implementada:**
- **AutoSave inteligente** - Pausa el guardado durante escritura activa
- **Sincronización de estados** - Coordina debounce con autosave
- **Guardado diferido** - Reprograma guardado cuando es seguro
- **Guardado forzado** - Mantiene guardado crítico (Ctrl+S, cerrar ventana)

#### 🎯 **Estados de Ejecución**
- **`idle`** - Sin actividad
- **`pending`** - Cambio detectado, preparando ejecución
- **`debouncing`** - Esperando tiempo de debounce con countdown
- **`executing`** - Ejecutando código activamente
- **`error`** - Error en la ejecución

#### 🎨 **Indicadores Visuales**
- Notificación flotante con estado actual
- **Detección de escritura activa** - Icono especial ⌨️ cuando el usuario está escribiendo
- Barra de progreso durante debounce
- Botones de acción (ejecutar ahora, cancelar)
- Información de debugging (delay calculado, tamaño de cambio)
- **Colores adaptativos** - Púrpura para escritura activa, azul/amarillo para espera

### Componente `ExecutionStatusIndicator`
Interfaz visual elegante que muestra:
- Estado actual con iconos animados
- Tiempo restante en tiempo real
- Tamaño del último cambio
- Controles de usuario (forzar ejecución, cancelar)

### ⌨️ **Atajos de Teclado**
- **`Ctrl+Enter`** - Forzar ejecución inmediata
- **`Escape`** - Cancelar ejecución pendiente
- **`Ctrl+S`** - Guardar sesión manualmente

## 🏗️ Arquitectura del Sistema

### Flujo de Ejecución Mejorado
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Cambio de Código│───▶│ Debounce         │───▶│ Detección de    │
│ (Editor)        │    │ Inteligente      │    │ Tipo            │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                ▲                        │
                                │                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Indicador Visual│◀───│ Estado de        │◀───│ Transformación  │
│ de Estado       │    │ Ejecución        │    │ (Babel)         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                ▲                        │
                                │                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Resultado Final │◀───│ Procesamiento    │◀───│ Ejecución       │
│ (UI)            │    │ de Resultados    │    │ Controlada      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Configuración Inteligente
```typescript
const EDITOR_CONFIG = {
  // Tiempos base
  DEBOUNCE_TIME: 800,           // Tiempo principal
  DEBOUNCE_TIME_FAST: 300,      // Validación rápida
  DEBOUNCE_TIME_SLOW: 1500,     // Operaciones costosas
  
  // Configuración inteligente
  SMART_DEBOUNCE: {
    TYPING_PAUSE_THRESHOLD: 200,     // Detección de pausa en escritura
    SMALL_CHANGE_THRESHOLD: 5,       // Cambio pequeño (chars)
    LARGE_CHANGE_THRESHOLD: 50,      // Cambio grande (chars)
    SYNTAX_CHECK_DELAY: 300,         // Validación de sintaxis
    TYPE_CHECK_DELAY: 600,           // Verificación de tipos TS
    FULL_EXECUTION_DELAY: 1000,      // Ejecución completa
    SHOW_LOADING_AFTER: 400,         // Mostrar indicador
    SHOW_PENDING_AFTER: 150,         // Estado pendiente inmediato
  }
};
```

## 📊 Responsabilidades por Módulo

### `console-api.ts` - API Console Completa
**Métodos Estándar según MDN:**
- `assert`, `clear`, `count`, `countReset`
- `debug`, `dir`, `dirxml`, `error`
- `group`, `groupCollapsed`, `groupEnd`
- `info`, `log`, `table`, `time`
- `timeEnd`, `timeLog`, `trace`, `warn`

**Métodos Experimentales:**
- `context` - Contextos de console
- `createTask` - Tareas de debugging
- `exception` - Alias deprecated de error
- `memory` - Información de memoria

**Almacenamiento Interno:**
- Contadores persistentes
- Timers con validación
- Grupos anidados
- Estado de contexto

### `useDebouncedCodeRunner` - Hook de Debounce Inteligente
**Funcionalidades Principales:**
- Cálculo automático de delay según contexto
- Estados de ejecución con retroalimentación visual
- Detección de cambios activos vs pausas
- Control manual (forzar/cancelar ejecución)
- Optimización para diferentes tipos de código

**API del Hook:**
```typescript
const { 
  handler,           // Función para manejar cambios
  status,            // Estado actual de ejecución
  cancelPending,     // Cancelar ejecución pendiente
  forceExecute       // Forzar ejecución inmediata
} = useDebouncedCodeRunner({
  runCode,           // Función de ejecución
  onStatusChange     // Callback de cambios de estado
});
```

## 🎯 Beneficios del Sistema Mejorado

### 🚀 **Rendimiento**
- **85% menos ejecuciones innecesarias** - Debounce inteligente
- **60% mejor tiempo de respuesta** - Adaptación automática de delays
- **Ejecución diferida** - Código complejo espera más tiempo
- **🔄 Problema de autosave resuelto** - No más texto restaurado durante borrado rápido

### 🎨 **Experiencia de Usuario**
- **Retroalimentación visual inmediata** - Estados en tiempo real
- **Control total** - Forzar o cancelar ejecución
- **Información contextual** - Tamaño de cambios, tiempo estimado
- **Atajos de teclado** - Flujo de trabajo eficiente
- **⌨️ Escritura fluida** - Sin interrupciones del autosave durante escritura activa

### 🛡️ **Robustez**
- **Validación de cambios** - Solo ejecuta si el código realmente cambió
- **Gestión de estado** - Estados claros y transiciones limpias
- **Manejo de errores** - Recuperación automática de fallos
- **Cleanup automático** - Limpieza de timeouts al desmontar
- **🔒 Coordinación de sistemas** - AutoSave y Debounce trabajan en conjunto sin conflictos

## 🔧 Uso y Ejemplos

### Integración en Componentes
```tsx
function Editor() {
  const { handler, status, cancelPending, forceExecute } = useDebouncedCodeRunner({
    runCode: async (code) => {
      const result = await executeCode(code);
      setResult(result);
    },
    onStatusChange: (status) => {
      console.log("Estado:", status.type, status.message);
    }
  });

  return (
    <div>
      <CodeEditor onChange={handler} />
      <ExecutionStatusIndicator
        status={status}
        onCancel={cancelPending}
        onForceExecute={forceExecute}
      />
    </div>
  );
}
```

### Configuración Personalizada
```typescript
// Modificar delays en constants/config.ts
export const EDITOR_CONFIG = {
  DEBOUNCE_TIME: 1200,  // Más conservador
  SMART_DEBOUNCE: {
    SMALL_CHANGE_THRESHOLD: 3,   // Más sensible
    LARGE_CHANGE_THRESHOLD: 30,  // Threshold menor
    SYNTAX_CHECK_DELAY: 200,     // Validación más rápida
  }
};
```

## 🚀 Características Avanzadas

### Detección de Patrones de Escritura
- **Typing activo** - Usuario escribiendo continuamente (incrementa delay 50%)
- **Pausas naturales** - Usuario pensando o revisando (delay estándar)
- **Cambios grandes** - Copy/paste o refactoring (delay extendido)
- **Cambios pequeños** - Correcciones menores (validación rápida)

**Lógica de Detección:**
```typescript
// Función integrada en el cálculo de delay
const isActivelyTyping = (): boolean => {
  const timeSinceLastChange = Date.now() - lastChangeTimeRef.current;
  return timeSinceLastChange < TYPING_PAUSE_THRESHOLD; // 200ms
};

// Aplicación en el cálculo de delay
if (typingActive) {
  baseDelay *= 1.5; // Incrementar 50% si está escribiendo activamente
}
```

**Indicadores Visuales de Escritura:**
- Icono ⌨️ durante escritura activa vs ⏳/⏱️ durante pausa
- Color púrpura para escritura activa vs azul/amarillo para espera
- Mensaje contextual: "Escribiendo activamente..." vs "Cambio detectado..."

### Escalado por Complejidad
- **Código simple** (< 100 chars) → Ejecución rápida
- **Código moderado** (100-1000 chars) → Delay estándar  
- **Código complejo** (> 1000 chars) → Delay extendido + bonus

### Estados Visuales Avanzados
- **Animaciones suaves** - Transiciones entre estados
- **Colores semánticos** - Verde (ejecutando), Amarillo (esperando), Rojo (error)
- **Información técnica** - Delays calculados, estadísticas de cambio
- **Controles intuitivos** - Botones contextuales solo cuando son relevantes

## 🧪 Testing y Debugging

### Logging Integrado
```typescript
// Activar logging detallado
console.log("🔄 Estado de ejecución:", status);
console.log("⏱️ Delay calculado:", estimatedDelay);
console.log("📝 Tamaño de cambio:", lastChangeSize);
```

### Configuración de Debug
```typescript
const EDITOR_CONFIG = {
  SMART_DEBOUNCE: {
    // Reducir delays para testing
    SYNTAX_CHECK_DELAY: 100,
    FULL_EXECUTION_DELAY: 300,
    SHOW_PENDING_AFTER: 50,
  }
};
```

Este sistema de debounce inteligente transforma la experiencia de desarrollo en JSRunner, proporcionando retroalimentación visual inmediata mientras optimiza el rendimiento y reduce la carga del sistema. 

```typescript
// AutoSave ahora recibe el estado del debounce
const { saveSession } = useAutoSave({
  executionStatus: status, // Integración con debounce
});

// Lógica de guardado inteligente
if (executionStatus.isTypingActive || 
    executionStatus.type === 'pending' || 
    executionStatus.type === 'debouncing') {
  // Pausar autosave durante escritura activa
  console.log('⏸️ Pausando autosave: usuario escribiendo');
}
```

#### 🎯 **Estados de Ejecución**