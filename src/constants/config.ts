// Configuraciones del editor
export const EDITOR_CONFIG = {
  // Configuraciones de debounce avanzadas
  DEBOUNCE_TIME: 800, // ms - tiempo principal de debounce (aumentado para mejor UX)
  DEBOUNCE_TIME_FAST: 300, // ms - para operaciones rápidas (validación de sintaxis)
  DEBOUNCE_TIME_SLOW: 1500, // ms - para operaciones costosas (código complejo)
  
  // Configuraciones de ejecución
  ASYNC_WAIT_TIME: 10000, // ms para console.log asíncronos (aumentado dramáticamente para captura completa)
  PROMISE_TIMEOUT: 5000, // ms para promesas
  EXECUTION_TIMEOUT: 10000, // ms para timeout de ejecución (10 segundos)
  LOOP_ITERATION_LIMIT: 100000, // máximo número de iteraciones en bucles
  
  // Configuraciones de UI
  FONT_SIZE: 19,
  TAB_SIZE: 2,
  PROMISE_TRUNCATE_LENGTH: 500,
  
  // Configuraciones de debounce inteligente
  SMART_DEBOUNCE: {
    // Tiempo mínimo de escritura antes de considerar que el usuario pausó
    TYPING_PAUSE_THRESHOLD: 200, // ms
    
    // Factor de escalado para código más grande (más debounce para código más complejo)
    SIZE_SCALING_FACTOR: 0.1, // ms por caracter
    MAX_SIZE_BONUS: 2000, // máximo tiempo adicional por tamaño
    
    // Detección de tipo de cambio
    SMALL_CHANGE_THRESHOLD: 5, // caracteres - considerado cambio pequeño
    LARGE_CHANGE_THRESHOLD: 50, // caracteres - considerado cambio grande
    
    // Tiempos específicos por tipo de operación
    SYNTAX_CHECK_DELAY: 300, // ms - validación de sintaxis rápida
    TYPE_CHECK_DELAY: 600, // ms - verificación de tipos TypeScript
    FULL_EXECUTION_DELAY: 1000, // ms - ejecución completa del código
    
    // Configuración de UI de retroalimentación
    SHOW_LOADING_AFTER: 400, // ms - mostrar indicador de carga después de este tiempo
    SHOW_PENDING_AFTER: 150, // ms - mostrar estado "pendiente" inmediatamente
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
} as const; 