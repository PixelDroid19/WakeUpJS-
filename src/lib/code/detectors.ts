import { LANGUAGE_DETECTION_CONFIG } from "../../constants/config";

// Importar las funciones de limpieza de cache
let clearExecutionCache: (() => void) | null = null;
let forceNewExecution: ((code: string) => void) | null = null;

// Importación lazy para evitar dependencias circulares
const _importCacheFunctions = async () => {
  if (!clearExecutionCache || !forceNewExecution) {
    try {
      const cacheModule = await import("./code-executor");
      clearExecutionCache = cacheModule.clearExecutionCache;
      forceNewExecution = cacheModule.forceNewExecution;
    } catch (error) {
      console.warn("No se pudieron importar funciones de cache", error);
    }
  }
};

export interface LanguageDetection {
  extension: string;
  languageId: string;
  hasJSX: boolean;
  hasTypeScript: boolean;
}

// Funciones de detección consolidadas usando configuración centralizada
export function detectLanguageFromContent(content: string): LanguageDetection {
  const trimmedContent = content.trim();
  
  if (!trimmedContent || trimmedContent.length < LANGUAGE_DETECTION_CONFIG.MIN_CONTENT_LENGTH) {
    return {
      extension: '.js',
      languageId: 'javascript',
      hasJSX: false,
      hasTypeScript: false
    };
  }

  const hasJSX = detectJSX(trimmedContent);
  const hasTypeScript = detectTypeScript(trimmedContent);

  // Lógica de prioridad basada en configuración
  const preferences = LANGUAGE_DETECTION_CONFIG.PREFERENCES;
  
  if (hasTypeScript && hasJSX) {
    return {
      extension: '.tsx',
      languageId: 'typescriptreact',
      hasJSX: true,
      hasTypeScript: true
    };
  }
  
  if (hasTypeScript && preferences.PREFER_TYPESCRIPT_OVER_JAVASCRIPT) {
    return {
      extension: '.ts',
      languageId: 'typescript',
      hasJSX: false,
      hasTypeScript: true
    };
  }
  
  if (hasJSX && preferences.PREFER_JSX_VARIANTS) {
    return {
      extension: '.jsx',
      languageId: 'javascriptreact',
      hasJSX: true,
      hasTypeScript: false
    };
  }

  return {
    extension: '.js',
    languageId: 'javascript',
    hasJSX: false,
    hasTypeScript: false
  };
}

export function detectLanguageFromFilename(filename: string): LanguageDetection {
  const extension = getFileExtension(filename);
  const mapping = LANGUAGE_DETECTION_CONFIG.SUPPORTED_EXTENSIONS;
  const languageId = mapping[extension as keyof typeof mapping] || 'javascript';
  
  const hasJSX = ['javascriptreact', 'typescriptreact'].includes(languageId);
  const hasTypeScript = ['typescript', 'typescriptreact'].includes(languageId);

  return {
    extension,
    languageId,
    hasJSX,
    hasTypeScript
  };
}

// Detección mejorada de JSX con menos falsos positivos
export function detectJSX(content: string): boolean {
  if (!content) return false;

  // Patrones positivos para JSX
  const jsxPositivePatterns = [
    /<[A-Z][a-zA-Z0-9]*\s*(?:\w+\s*=\s*{[^}]*}|\w+\s*=\s*"[^"]*"|\w+)*\s*\/?>/, // Componentes con props
    /<[A-Z][a-zA-Z0-9]*>[\s\S]*?<\/[A-Z][a-zA-Z0-9]*>/, // Componentes con contenido
    /className\s*=\s*{/, // JSX className
    /onClick\s*=\s*{/, // JSX events
    /React\.createElement/, // React.createElement calls
    /{[^}]*}\s*<[A-Z]/, // Expresiones JSX dentro de JSX
    /return\s*\(\s*<[A-Z]/, // Return JSX
    /jsx\s*:\s*true/, // Configuración JSX
  ];

  // Patrones negativos para evitar falsos positivos
  const jsxNegativePatterns = [
    /<\s*[\w\s]*\s*<=?\s*/, // Comparaciones matemáticas con <
    /<\s*\w+\s*>\s*\w+\s*</, // Comparaciones entre variables
    /template\s*</, // Template strings con TypeScript generics
    /\w+\s*<\s*\w+\s*>/, // Generic types simples
  ];

  // Verificar patrones negativos primero
  for (const pattern of jsxNegativePatterns) {
    if (pattern.test(content)) {
      return false;
    }
  }

  // Verificar patrones positivos
  return jsxPositivePatterns.some(pattern => pattern.test(content));
}

// Detección robusta de TypeScript
export function detectTypeScript(content: string): boolean {
  if (!content) return false;

  const typeScriptPatterns = [
    /interface\s+[A-Z]\w*\s*{/, // Interfaces con nombre capitalizado
    /type\s+[A-Z]\w*\s*=/, // Type aliases
    /:\s*[A-Z]\w*(?:\[\])?(?:\s*\|\s*[A-Z]\w*(?:\[\])?)*\s*[=;,)]/, // Type annotations precisas
    /as\s+[A-Z]\w*/, // Type assertions
    /implements\s+[A-Z]\w*/, // Implementaciones de interfaces
    /extends\s+[A-Z]\w*</, // Herencia genérica
    /public\s+\w+\s*:/, // Propiedades públicas
    /private\s+\w+\s*:/, // Propiedades privadas
    /protected\s+\w+\s*:/, // Propiedades protegidas
    /readonly\s+\w+\s*:/, // Propiedades readonly
    /\?\s*:/, // Propiedades opcionales
    /enum\s+[A-Z]\w*/, // Enums
    /namespace\s+\w+/, // Namespaces
    /declare\s+(module|namespace|class|function|var|let|const)/, // Declaraciones ambient
    /<[A-Z]\w*(?:\s*,\s*[A-Z]\w*)*>/, // Generics
    /function\s+\w+<[A-Z]/, // Funciones genéricas
    /keyof\s+/, // Keyof operator
    /typeof\s+\w+/, // Typeof operator
    /\w+\s*:\s*Array</, // Array types
    /\w+\s*:\s*Promise</, // Promise types
    /\w+\s*:\s*Record</, // Record types
    /\w+\s*:\s*Partial</, // Utility types
  ];

  return typeScriptPatterns.some(pattern => pattern.test(content));
}

// Función auxiliar para obtener extensión de archivo
function getFileExtension(filename: string): string {
  const match = filename.match(/\.([^.]+)$/);
  return match ? `.${match[1]}` : '.js';
}

/**
 * Genera un nombre de archivo automático basado en el contenido
 * @param baseName - Nombre base sin extensión
 * @param code - Contenido del código
 * @returns Nombre completo del archivo con extensión apropiada
 */
export const generateAutoFilename = (baseName: string, code: string): string => {
  // Si el baseName ya tiene extensión, respetarla
  if (baseName.includes('.')) {
    return baseName;
  }

  const detection = detectLanguageFromContent(code);
  return `${baseName}${detection.extension}`;
};

/**
 * Obtiene el languageId para Monaco Editor basado en el nombre del archivo
 * @param filename - Nombre del archivo
 * @returns languageId para Monaco Editor
 */
export const getMonacoLanguageId = (filename: string): string => {
  const detection = detectLanguageFromFilename(filename);
  return detection.languageId;
};

/**
 * Detecta patrones de código potencialmente infinito
 * @param code - Código a analizar
 * @returns true si detecta patrones de bucles infinitos
 */
export const detectInfiniteLoops = (code: string): boolean => {
  // Patrones básicos de bucles infinitos
  const infiniteLoopPatterns = [
    /while\s*\(\s*true\s*\)/i,
    /for\s*\(\s*;\s*;\s*\)/i,
    /while\s*\(\s*1\s*\)/i,
    /for\s*\(\s*;;.*\)/i,
  ];

  // Verificar si hay patrones de bucles infinitos
  const hasInfiniteLoop = infiniteLoopPatterns.some((pattern) => pattern.test(code));
  
  if (!hasInfiniteLoop) {
    return false;
  }

  console.info("Patrón de bucle infinito detectado, analizando contexto...");

  // Verificaciones de contextos seguros:
  
  // 1. Verificar si el código contiene funciones generadoras
  const hasGeneratorFunction = /function\s*\*|=>\s*{[^}]*yield|\*\s*\([^)]*\)|yield\s+/i.test(code);
  if (hasGeneratorFunction) {
    console.info("Código contiene generadores, permitiendo bucles infinitos");
    return false;
  }

  // 2. Verificar si hay async/await que indica control de flujo asíncrono
  const hasAsyncPattern = /async\s+function|await\s+/i.test(code);
  if (hasAsyncPattern) {
    // En funciones async, revisar si hay await dentro del bucle potencialmente infinito
    const codeNormalized = code.replace(/\s+/g, ' ');
    const whileWithAwaitPattern = /while\s*\(\s*true\s*\)[^{}]*{[^}]*await[^}]*}/i;
    if (whileWithAwaitPattern.test(codeNormalized)) {
      console.info("Bucle infinito con await detectado (patrón válido)");
      return false;
    }
  }

  // 3. Verificar si hay break, return, throw, o yield en el contexto del bucle
  const potentiallyInfiniteLoops = [
    ...code.matchAll(/while\s*\(\s*true\s*\)\s*{([^{}]*)}/gi),
    ...code.matchAll(/for\s*\(\s*;\s*;\s*\)\s*{([^{}]*)}/gi)
  ];

  for (const match of potentiallyInfiniteLoops) {
    const loopBody = match[1];
    if (/\b(break|return|throw|yield|await)\b/.test(loopBody)) {
      console.info("Bucle con palabra clave de escape detectado (break/return/throw/yield/await)");
      return false;
    }
  }

  // 4. Verificar patrones de módulos IIFE (Immediately Invoked Function Expression)
  const iifePattern = /\(\s*\(\s*\)\s*=>\s*{|\(\s*function\s*\(\s*\)\s*{/i;
  if (iifePattern.test(code)) {
    console.info("Patrón IIFE detectado, probablemente código modular seguro");
    return false;
  }

  // 5. Verificar si es un web worker o service worker pattern
  const workerPattern = /self\.|postMessage|onmessage/i;
  if (workerPattern.test(code)) {
    console.info("Patrón de Worker detectado, permitiendo bucles infinitos");
    return false;
  }

  // 6. Verificar si hay event listeners o callbacks que sugieren control asíncrono
  const eventPattern = /addEventListener|setTimeout|setInterval|Promise|then\(|catch\(/i;
  if (eventPattern.test(code)) {
    console.info("Patrón de eventos/async detectado, probablemente seguro");
    return false;
  }

  // Si llegamos aquí, es probable que sea un bucle infinito peligroso
  console.warn("Bucle infinito potencialmente peligroso detectado");
  return true;
}; 