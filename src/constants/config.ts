// Configuración centralizada de JSRunner
// Este archivo contiene todas las configuraciones por defecto para la aplicación

// Configuraciones del editor
export const EDITOR_CONFIG = {
  // Configuraciones de debounce optimizadas para mejor UX
  DEBOUNCE_TIME: 400, // ms - reducido de 800 para respuesta más rápida
  DEBOUNCE_TIME_FAST: 150, // ms - reducido de 300 para validación ultra rápida
  DEBOUNCE_TIME_SLOW: 800, // ms - reducido de 1500 para operaciones costosas
  
  // Configuraciones de ejecución
  ASYNC_WAIT_TIME: 10000, // ms para console.log asíncronos (aumentado dramáticamente para captura completa)
  PROMISE_TIMEOUT: 5000, // ms para promesas
  EXECUTION_TIMEOUT: 10000, // ms para timeout de ejecución (10 segundos)
  LOOP_ITERATION_LIMIT: 100000, // máximo número de iteraciones en bucles
  
  // Configuraciones de UI
  FONT_SIZE: 19,
  TAB_SIZE: 2,
  PROMISE_TRUNCATE_LENGTH: 500,
  
  // Configuraciones de debounce inteligente optimizadas
  SMART_DEBOUNCE: {
    // Tiempo mínimo de escritura antes de considerar que el usuario pausó
    TYPING_PAUSE_THRESHOLD: 150, // ms - reducido de 200 para detección más rápida
    
    // Factor de escalado para código más grande (reducido para menos impacto)
    SIZE_SCALING_FACTOR: 0.05, // reducido de 0.1 para menos penalización por tamaño
    MAX_SIZE_BONUS: 1000, // reducido de 2000 para máximo tiempo adicional
    
    // Detección de tipo de cambio mejorada
    SMALL_CHANGE_THRESHOLD: 3, // reducido de 5 - cambios de 1-3 chars son pequeños
    LARGE_CHANGE_THRESHOLD: 25, // reducido de 50 - cambios >25 chars son grandes
    
    // Tiempos específicos por tipo de operación optimizados
    SYNTAX_CHECK_DELAY: 150, // ms - reducido de 300 para validación ultra rápida
    TYPE_CHECK_DELAY: 250, // ms - reducido de 600 para verificación rápida
    FULL_EXECUTION_DELAY: 400, // ms - reducido de 1000 para ejecución rápida
    
    // Configuración de UI de retroalimentación optimizada
    SHOW_LOADING_AFTER: 200, // ms - reducido de 400 para mostrar indicador más rápido
    SHOW_PENDING_AFTER: 100, // ms - reducido de 150 para estado pendiente inmediato
  }
} as const;

// Configuraciones del layout
export const LAYOUT_CONFIG = {
  DEFAULT_SPLIT_SIZES: [50, 50],
  GUTTER_SIZE: 4,
  DEFAULT_DIRECTION: 'horizontal' as const,
} as const;

// Temas del editor
export const EDITOR_THEMES = {
  DARK: 'vs-dark',
  LIGHT: 'vs-light',
} as const;

// Storage keys
export const STORAGE_KEYS = {
  SPLIT_DIRECTION: 'split-direction',
  SPLIT_SIZES: 'split-sizes',
  EDITOR_THEME: 'editor-theme',
  AUTO_SAVE_ENABLED: 'auto-save-enabled',
  AUTO_EXECUTION_ENABLED: 'auto-execution-enabled',
  SMART_DEBOUNCE_ENABLED: 'smart-debounce-enabled',
} as const;

// Configuración de Auto-Guardado
export const AUTO_SAVE_CONFIG = {
  ENABLED: true,
  INTERVAL: 5000, // ms - cada 5 segundos
  DEBOUNCE_DELAY: 1000, // ms - después de 1 segundo de inactividad
  FORCE_SAVE_ON_EXIT: true,
} as const;

// Configuración de Auto-Ejecución
export const AUTO_EXECUTION_CONFIG = {
  ENABLED: true,
  DEBOUNCE_TIME: 400, // ms - tiempo base para debounce
  ENABLE_SMART_DEBOUNCE: true, // usar debounce inteligente basado en contexto
} as const;

// Configuración del Motor de Ejecución
export const EXECUTION_ENGINE_CONFIG = {
  // Límites y timeouts
  MAX_EXECUTION_TIME: 15000, // ms - 15 segundos máximo
  MAX_MEMORY_MB: 100, // MB - 100MB máximo
  MAX_CONCURRENT_EXECUTIONS: 5, // máximo 5 ejecuciones simultáneas
  
  // Cache
  CACHE_SIZE: 200, // entradas máximas en caché
  CACHE_TTL: 600000, // ms - 10 minutos de vida para entradas de caché
  ENABLE_CACHE: true,
  
  // Seguridad y monitoreo
  SECURITY_LEVEL: 'medium' as 'low' | 'medium' | 'high',
  ENABLE_METRICS: true,
  ENABLE_WORKERS: true,
  
  // Límites de ejecución
  LOOP_ITERATION_LIMIT: 100000,
  ASYNC_WAIT_TIME: 10000, // ms
  PROMISE_TIMEOUT: 5000, // ms
} as const;

// Configuración avanzada del sistema de ejecución
export const EXECUTION_ADVANCED_CONFIG = {
  // Timeouts
  TIMEOUT: 15000, // ms - timeout general
  MAX_CONCURRENT_EXECUTIONS: 5,
  CACHE_SIZE: 200,
  CACHE_TTL: 600000, // ms - 10 minutos
  ENABLE_CACHE: true,
  ENABLE_METRICS: true,
  ENABLE_SECURITY_CHECKS: true,
  MEMORY_LIMIT: 100, // MB
  LOOP_ITERATION_LIMIT: 100000,
  ASYNC_WAIT_TIME: 10000, // ms
  PROMISE_TIMEOUT: 5000, // ms
} as const;

// Configuración de contexto global
export const GLOBAL_CONTEXT_CONFIG = {
  SANDBOX_LEVEL: 'medium' as 'low' | 'medium' | 'high',
} as const;

// Configuración del sistema de debugging
export const DEBUG_CONFIG = {
  ENABLE_VERBOSE_LOGGING: false,
  SHOW_EXECUTION_METRICS: true,
  LOG_PERFORMANCE: true,
} as const; 