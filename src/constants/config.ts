// Configuración centralizada de JSRunner
// Este archivo contiene todas las configuraciones por defecto para la aplicación

// Configuración completa del Editor Monaco
export const MONACO_EDITOR_CONFIG = {
  fontSize: 14,
  lineHeight: 20,
  fontFamily: "Monaco, 'Menlo', 'Ubuntu Mono', monospace",
  fontWeight: "400",
  letterSpacing: 0.5,
  wordWrap: "on" as const,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  insertSpaces: true,
  renderWhitespace: "selection" as const,
  lineNumbers: "on" as const,
  lineDecorationsWidth: 10,
  lineNumbersMinChars: 3,
  glyphMargin: false,
  folding: true,
  foldingStrategy: "auto" as const,
  showFoldingControls: "mouseover" as const,
  foldingHighlight: true,
  unfoldOnClickAfterEndOfLine: false,
  selectionHighlight: true,
  occurrencesHighlight: "singleFile" as const,
  codeLens: false,
  renderLineHighlight: "line" as const,
  renderLineHighlightOnlyWhenFocus: false,
  hideCursorInOverviewRuler: false,
  scrollbar: {
    useShadows: false,
    verticalHasArrows: false,
    horizontalHasArrows: false,
    vertical: "visible" as const,
    horizontal: "visible" as const,
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
    arrowSize: 30
  },
  overviewRulerLanes: 2,
  overviewRulerBorder: false,
  cursorBlinking: "blink" as const,
  mouseWheelZoom: false,
  cursorSmoothCaretAnimation: "off" as const,
  cursorStyle: "line" as const,
  cursorWidth: 2,
  fontLigatures: false,
  disableLayerHinting: false,
  disableMonospaceOptimizations: false,
  renderControlCharacters: false,
  renderIndentGuides: true,
  renderValidationDecorations: "editable" as const,
  rulers: [],
  wordSeparators: "`~!@#$%^&*()-=+[{]}\\|;:'\",.<>/?",
  wordWrapBreakAfterCharacters: "\t})]?|&,;",
  wordWrapBreakBeforeCharacters: "{([+",
  wordWrapBreakObtrusiveCharacters: ".",
  stopRenderingLineAfter: 10000,
  hover: { enabled: true, delay: 300, sticky: true },
  links: true,
  colorDecorators: true,
  contextmenu: true,
  mouseWheelScrollSensitivity: 1,
  fastScrollSensitivity: 5,
  scrollPredominantAxis: true,
  columnSelection: false,
  multiCursorModifier: "alt" as const,
  multiCursorMergeOverlapping: true,
  multiCursorPaste: "spread" as const,
  accessibilitySupport: "auto" as const,
  suggest: {
    insertMode: "insert" as const,
    filterGraceful: true,
    snippetsPreventQuickSuggestions: false,
    localityBonus: false,
    shareSuggestSelections: false,
    selectionMode: "always" as const,
    showIcons: true,
    showStatusBar: false,
    preview: false,
    previewMode: "subwordSmart" as const,
    showInlineDetails: true,
    showMethods: true,
    showFunctions: true,
    showConstructors: true,
    showDeprecated: true,
    showFields: true,
    showVariables: true,
    showClasses: true,
    showStructs: true,
    showInterfaces: true,
    showModules: true,
    showProperties: true,
    showEvents: true,
    showOperators: true,
    showUnits: true,
    showValues: true,
    showConstants: true,
    showEnums: true,
    showEnumMembers: true,
    showKeywords: true,
    showWords: true,
    showColors: true,
    showFiles: true,
    showReferences: true,
    showFolders: true,
    showTypeParameters: true,
    showIssues: true,
    showUsers: true,
    showSnippets: true
  },
  quickSuggestions: {
    other: true,
    comments: false,
    strings: false
  },
  quickSuggestionsDelay: 10,
  parameterHints: { enabled: true, cycle: false },
  autoClosingBrackets: "languageDefined" as const,
  autoClosingQuotes: "languageDefined" as const,
  autoClosingDelete: "auto" as const,
  autoClosingOvertype: "auto" as const,
  autoSurround: "languageDefined" as const,
  autoIndent: "advanced" as const,
  formatOnType: false,
  formatOnPaste: false,
  dragAndDrop: true,
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: "on" as const,
  acceptSuggestionOnCommitCharacter: true,
  snippetSuggestions: "top" as const,
  emptySelectionClipboard: true,
  copyWithSyntaxHighlighting: true,
  suggestSelection: "first" as const,
  suggestFontSize: 0,
  suggestLineHeight: 0,
  tabCompletion: "off" as const,
  wordBasedSuggestions: "matchingDocuments" as const,
  wordBasedSuggestionsMode: "matchingDocuments" as const,
  semanticHighlighting: true,
  guides: {
    bracketPairs: false,
    bracketPairsHorizontal: "active" as const,
    highlightActiveBracketPair: true,
    indentation: true,
    highlightActiveIndentation: true
  },
  bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: false },
  detectIndentation: true,
  trimAutoWhitespace: false,
  largeFileOptimizations: true,
  readOnly: false,
  domReadOnly: false,
  find: {
    cursorMoveOnType: false,
    seedSearchStringFromSelection: "always" as const,
    autoFindInSelection: "never" as const,
    addExtraSpaceOnTop: true,
    loop: true
  },
  gotoLocation: {
    multiple: "peek" as const,
    multipleDefinitions: "peek" as const,
    multipleTypeDefinitions: "peek" as const,
    multipleDeclarations: "peek" as const,
    multipleImplementations: "peek" as const,
    multipleReferences: "peek" as const,
    alternativeDefinitionCommand: "editor.action.goToReferences",
    alternativeTypeDefinitionCommand: "editor.action.goToReferences",
    alternativeDeclarationCommand: "editor.action.goToReferences",
    alternativeImplementationCommand: "",
    alternativeReferenceCommand: ""
  },
  padding: { top: 0, bottom: 0 },
  experimentalWhitespaceRendering: "svg" as const,
  definitionLinkOpensInPeek: false,
  showUnused: true,
  showDeprecated: true
} as const;

// Configuraciones del editor
export const EDITOR_CONFIG = {
  // Referencia a las configuraciones de Monaco
  FONT_SIZE: MONACO_EDITOR_CONFIG.fontSize,
  TAB_SIZE: MONACO_EDITOR_CONFIG.tabSize,
  
  // Configuraciones de debounce optimizadas para mejor UX
  DEBOUNCE_TIME: 400, // ms - tiempo base para debounce
  DEBOUNCE_TIME_FAST: 150, // ms - validación ultra rápida
  DEBOUNCE_TIME_SLOW: 800, // ms - operaciones costosas
  
  // Configuraciones de ejecución
  ASYNC_WAIT_TIME: 10000, // ms para console.log asíncronos
  PROMISE_TIMEOUT: 5000, // ms para promesas
  EXECUTION_TIMEOUT: 10000, // ms para timeout de ejecución (10 segundos)
  LOOP_ITERATION_LIMIT: 100000, // máximo número de iteraciones en bucles
  PROMISE_TRUNCATE_LENGTH: 500,
  
  // Configuraciones de debounce inteligente optimizadas
  SMART_DEBOUNCE: {
    // Tiempo mínimo de escritura antes de considerar que el usuario pausó
    TYPING_PAUSE_THRESHOLD: 250, // ms
    
    // Factor de escalado para código más grande
    SIZE_SCALING_FACTOR: 0.05,
    MAX_SIZE_BONUS: 1000,
    
    // Detección de tipo de cambio mejorada
    SMALL_CHANGE_THRESHOLD: 3, // cambios de 1-3 chars son pequeños
    LARGE_CHANGE_THRESHOLD: 25, // cambios >25 chars son grandes
    
    // Tiempos específicos por tipo de operación
    SYNTAX_CHECK_DELAY: 300, // ms
    TYPE_CHECK_DELAY: 500, // ms
    FULL_EXECUTION_DELAY: 800, // ms
    
    // Configuración de UI de retroalimentación
    SHOW_LOADING_AFTER: 200, // ms
    SHOW_PENDING_AFTER: 100, // ms
  }
} as const;

// Configuraciones del layout
export const LAYOUT_CONFIG = {
  DEFAULT_SPLIT_SIZES: [50, 50],
  GUTTER_SIZE: 4,
  DEFAULT_DIRECTION: 'horizontal' as const,
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
  INTERVAL: 1000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 500,
  COMPRESSION_THRESHOLD: 1024,
  STORAGE_KEY_PREFIX: "jsrunner_",
  CLEANUP_INTERVAL: 300000, // 5 minutos
  MAX_STORAGE_SIZE: 10 * 1024 * 1024, // 10MB
  WARNING_THRESHOLD: 0.8,
  CRITICAL_THRESHOLD: 0.95,
  FORCE_SAVE_ON_EXIT: true,
  DEBOUNCE_DELAY: 500, // Agregada propiedad faltante
} as const;

// Configuración de Auto-Ejecución
export const AUTO_EXECUTION_CONFIG = {
  ENABLED: true,
  DEBOUNCE_TIME: 400, // ms - tiempo base para debounce
  ENABLE_SMART_DEBOUNCE: true, // usar debounce inteligente basado en contexto
} as const;

// Configuración del Motor de Ejecución (consolidada)
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
  ENABLE_SECURITY_CHECKS: true,
  
  // Límites de ejecución (usa valores de EDITOR_CONFIG)
  LOOP_ITERATION_LIMIT: EDITOR_CONFIG.LOOP_ITERATION_LIMIT,
  ASYNC_WAIT_TIME: EDITOR_CONFIG.ASYNC_WAIT_TIME,
  PROMISE_TIMEOUT: EDITOR_CONFIG.PROMISE_TIMEOUT,
  EXECUTION_TIMEOUT: EDITOR_CONFIG.EXECUTION_TIMEOUT,
} as const;

// Configuración de contexto global
export const GLOBAL_CONTEXT_CONFIG = {
  SANDBOX_LEVEL: 'medium' as 'low' | 'medium' | 'high',
} as const;

// Configuración del sistema de debugging
export const DEBUG_CONFIG = {
  ENABLE_CONSOLE_LOGS: true,
  ENABLE_PERFORMANCE_LOGS: true,
  ENABLE_ERROR_DETAILS: true,
  ENABLE_BABEL_LOGS: false,
  ENABLE_DETECTION_LOGS: true,
  LOG_LEVEL: "info" as const,
  // Propiedades agregadas para compatibilidad
  ENABLE_VERBOSE_LOGGING: true,
  SHOW_EXECUTION_METRICS: true,
  LOG_PERFORMANCE: true,
} as const;

// Configuración de Sesión y Carga
export const SESSION_CONFIG = {
  AUTO_SAVE_ENABLED: true,
  AUTO_SAVE_INTERVAL: 1000,
  DEBOUNCE_DELAY: 500,
  MAX_HISTORY_ENTRIES: 50,
  COMPRESSION_ENABLED: true,
  STORAGE_QUOTA_WARNING: 0.8,
  CLEANUP_THRESHOLD: 0.9,
  AUTO_RESTORE_CURSOR: true
} as const;

// Configuración de Indicadores UI
export const UI_FEEDBACK_CONFIG = {
  LOADING_SPINNER_DELAY: 200, // ms - tiempo antes de mostrar spinner
  TOAST_DURATION: 3000, // ms - duración de notificaciones
  ANIMATION_DURATION: 300, // ms - duración de animaciones
  DEBOUNCE_VISUAL_DELAY: 100, // ms - tiempo antes de mostrar estado de debounce
  LANGUAGE_DETECTION_UI_DELAY: 1000, // ms - tiempo para mostrar indicador de detección
} as const;

// Configuración de Keybindings del Editor
export const EDITOR_KEYBINDINGS = {
  FORCE_SAVE: 'Ctrl+S',
  FORCE_EXECUTE: 'Ctrl+Enter', 
  CANCEL_EXECUTION: 'Escape',
} as const;

// Configuración de mensajes del sistema
export const SYSTEM_MESSAGES = {
  WELCOME: "¡Bienvenido a JSRunner! Escribe tu código JavaScript, TypeScript, JSX o TSX.",
  LOADING: "Cargando...",
  EXECUTING: "Ejecutando código...",
  ERROR: "Error en el código",
  SUCCESS: "Código ejecutado exitosamente",
  TIMEOUT: "El código tardó demasiado en ejecutarse",
  DETECTION_IN_PROGRESS: "Detectando lenguaje...",
  SAVE_SUCCESS: "Guardado automáticamente",
  SAVE_ERROR: "Error al guardar",
  COMPILE_SUCCESS: "Compilación exitosa",
  COMPILE_ERROR: "Error de compilación",
  SESSION_RESTORED: "Sesión anterior restaurada",
  AVOIDING_REEXECUTION: "Evitando re-ejecución duplicada",
  AUTO_EXECUTING: "Auto-ejecutando código cargado",
  AUTO_EXECUTING_DEBOUNCE: "Auto-ejecutando con debounce",
  EDITOR_EMPTY: "Editor vacío, limpiando resultados",
  SESSION_SAVED_FORCED: "Sesión guardada forzadamente",
  CODE_CLEARED: "Código limpiado", // Agregado mensaje faltante
} as const;

// Configuración de detección de lenguaje consolidada
export const LANGUAGE_DETECTION_CONFIG = {
  // Umbrales y delays
  DEBOUNCE_DELAY: 500,
  SIGNIFICANT_CHANGE_THRESHOLD: 50,
  MIN_CONTENT_LENGTH: 5,
  
  // Patrones de detección consolidados
  SIGNIFICANT_PATTERNS: [
    /interface\s+\w+/,           // TypeScript interfaces
    /type\s+\w+\s*=/,            // TypeScript types
    /:\s*\w+/,                   // Type annotations
    /<[A-Z][a-zA-Z0-9]*/,        // JSX components
    /React\./,                   // React usage
    /import.*from/,              // ES6 imports
    /export\s+(default\s+)?/,    // ES6 exports
    /async\s+function/,          // Async functions
    /const\s+\w+\s*=\s*\(/,      // Arrow functions
    /\.\w+<.*>/,                 // Generic usage
    /extends\s+\w+/,             // Class inheritance
    /implements\s+\w+/           // Interface implementation
  ],
  
  // Mapeo de lenguajes entre Monaco y Workspace
  LANGUAGE_MAPPING: {
    'javascript': 'javascript',
    'javascriptreact': 'javascript',
    'typescript': 'typescript',
    'typescriptreact': 'typescript',
    'html': 'html',
    'css': 'css'
  } as const,
  
  // Extensiones de archivo soportadas
  SUPPORTED_EXTENSIONS: {
    '.js': 'javascript',
    '.jsx': 'javascriptreact',
    '.ts': 'typescript',
    '.tsx': 'typescriptreact',
    '.mjs': 'javascript',
    '.cjs': 'javascript',
    '.html': 'html',
    '.css': 'css'
  } as const,
  
  // Configuración de preferencias
  PREFERENCES: {
    PREFER_TYPESCRIPT_OVER_JAVASCRIPT: true,
    PREFER_JSX_VARIANTS: true,
    STRICT_TYPE_DETECTION: false,
    AUTO_DETECT_ON_PASTE: true,
    AUTO_DETECT_ON_SIGNIFICANT_CHANGE: true
  } as const
} as const;

// Funciones de configuración simplificadas
export const CONFIG_UTILS = {
  isVerboseLoggingEnabled: () => DEBUG_CONFIG.ENABLE_CONSOLE_LOGS,
  isDebugEnabled: () => DEBUG_CONFIG.ENABLE_ERROR_DETAILS,
  getAutoSaveInterval: () => AUTO_SAVE_CONFIG.INTERVAL,
  getSessionLoadDelay: () => SESSION_CONFIG.DEBOUNCE_DELAY,
  getDebounceDelay: () => SESSION_CONFIG.DEBOUNCE_DELAY,
  getMonacoConfig: () => MONACO_EDITOR_CONFIG,
  getSystemMessage: (key: keyof typeof SYSTEM_MESSAGES) => SYSTEM_MESSAGES[key],
  getLanguageDetectionConfig: () => LANGUAGE_DETECTION_CONFIG
} as const; 