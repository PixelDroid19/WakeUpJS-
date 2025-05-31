import { LANGUAGE_DETECTION_CONFIG, DEBUG_CONFIG } from "../../constants/config";

// Variable para el execution engine con tipo más específico
let globalExecutionEngine: { clearCache?: () => void } | null = null;

// Cache para optimizar detecciones repetidas
const detectionCache = new Map<string, LanguageDetection>();
const maxCacheSize = 100;

// Función de logging condicional para producción
const debugLog = (message: string, data?: any) => {
  if (DEBUG_CONFIG.ENABLE_DETECTION_LOGS) {
    console.log(message, data);
  }
};

// Importación lazy para evitar dependencias circulares
const _importCacheFunctions = async (): Promise<void> => {
  if (!globalExecutionEngine) {
    try {
      const engineModule = await import("./execution-engine");
      globalExecutionEngine = engineModule.globalExecutionEngine;
    } catch (error) {
      if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
      console.warn("No se pudieron importar funciones del execution engine", error);
      }
    }
  }
};

export interface LanguageDetection {
  extension: string;
  languageId: string;
  hasJSX: boolean;
  hasTypeScript: boolean;
  confidence: number;
}

type Language = 'javascript' | 'typescript' | 'html' | 'css' | 'javascriptreact' | 'typescriptreact';

interface LanguagePattern {
  language: Language;
  patterns: RegExp[];
  keywords: string[];
  weight: number;
}

// Sistema de patrones mejorado basado en el ejemplo del usuario
const languagePatterns: LanguagePattern[] = [
  {
    language: 'typescript',
    patterns: [
      /interface\s+\w+/i,
      /type\s+\w+\s*=/i,
      /:\s*(string|number|boolean|any|void|object|Date|Promise|Array)/i,
      /function\s+\w+\s*\([^)]*\)\s*:\s*\w+/i,
      /<.*>\s*\(/i, // Generic types
      /as\s+\w+/i,
      /export\s+(interface|type|enum)/i,
      /import\s+.*\s+from\s+['"][^'"]+['"];?\s*$/m,
      /abstract\s+class/i,
      /public\s+readonly/i,
      /private\s+/i,
      /protected\s+/i,
      /constructor\s*\(/i,
      /:\s*string\[\]/i,
      /\w+\?\s*:/i, // Optional properties
      /extends\s+\w+/i,
      /implements\s+\w+/i,
      /namespace\s+\w+/i,
      /declare\s+(const|function|class|module)/i,
      /enum\s+\w+/i,
      /@\w+\s*\(/i, // Decorators
      /readonly\s+\w+/i,
      /keyof\s+\w+/i,
      /typeof\s+\w+/i,
      /Record<.*>/i,
      /Partial<.*>/i,
      /Required<.*>/i,
      /Pick<.*>/i,
      /Omit<.*>/i,
    ],
    keywords: [
      'interface', 'type', 'enum', 'implements', 'extends', 'namespace', 
      'declare', 'readonly', 'abstract', 'public', 'private', 'protected',
      'keyof', 'typeof', 'infer', 'never', 'unknown'
    ],
    weight: 20
  },
  {
    language: 'html',
    patterns: [
      /<(!DOCTYPE|html|head|body|div|span|p|h[1-6]|a|img|ul|ol|li|table|tr|td|th|nav|section|article|aside|header|footer|main)\b[^>]*>/i,
      /<\/[a-zA-Z][a-zA-Z0-9]*>/,
      /<!DOCTYPE\s+html>/i,
      /<meta\s+[^>]*>/i,
      /<link\s+[^>]*>/i,
      /<script\s+[^>]*>/i,
      /<style\s*>/i,
      /<form\s+[^>]*>/i,
      /<input\s+[^>]*>/i,
      /<button\s+[^>]*>/i,
      /class\s*=\s*["'][^"']*["']/i,
      /id\s*=\s*["'][^"']*["']/i,
      /href\s*=\s*["'][^"']*["']/i,
      /src\s*=\s*["'][^"']*["']/i,
    ],
    keywords: [
      'DOCTYPE', 'html', 'head', 'body', 'meta', 'link', 'script', 'style',
      'div', 'span', 'section', 'article', 'nav', 'aside', 'header', 'footer'
    ],
    weight: 25
  },
  {
    language: 'css',
    patterns: [
      /[.#]?[a-zA-Z][a-zA-Z0-9_-]*\s*\{[^}]*\}/,
      /@(media|import|keyframes|font-face|supports|namespace)/i,
      /[a-zA-Z-]+\s*:\s*[^;]+;/,
      /\/\*.*?\*\//s,
      /:[a-zA-Z-]+\([^)]*\)/,
      /rgba?\([^)]+\)/i,
      /#[0-9a-fA-F]{3,6}/,
      /\d+(px|em|rem|vh|vw|%|pt|pc|in|mm|cm|ex|ch|vmin|vmax)/i,
      /calc\([^)]+\)/i,
      /var\(--[^)]+\)/i,
      /linear-gradient\([^)]+\)/i,
      /radial-gradient\([^)]+\)/i,
      /@media\s*\([^)]+\)/i,
      /transform\s*:/i,
      /transition\s*:/i,
      /animation\s*:/i,
    ],
    keywords: [
      'background', 'color', 'margin', 'padding', 'border', 'font', 'display', 
      'position', 'width', 'height', 'flex', 'grid', 'transform', 'transition',
      'animation', 'media', 'keyframes', 'hover', 'active', 'focus'
    ],
    weight: 18
  },
  {
    language: 'javascript',
    patterns: [
      /function\s+\w+\s*\(/i,
      /const\s+\w+\s*=/i,
      /let\s+\w+\s*=/i,
      /var\s+\w+\s*=/i,
      /=>\s*[{(]/,
      /console\.(log|error|warn|info|debug|trace)/i,
      /require\s*\(/i,
      /module\.exports/i,
      /import\s+.*\s+from\s+['"][^'"]+['"];?\s*$/m,
      /export\s+(default|const|function|class)/i,
      /async\s+function/i,
      /await\s+/i,
      /Promise\.(resolve|reject|all|race)/i,
      /\.then\s*\(/i,
      /\.catch\s*\(/i,
      /try\s*\{/i,
      /catch\s*\([^)]*\)/i,
      /throw\s+new\s+Error/i,
      /JSON\.(parse|stringify)/i,
      /Array\.(from|isArray)/i,
      /Object\.(keys|values|entries|assign)/i,
      /Math\.(floor|ceil|round|random)/i,
      /parseInt\s*\(/i,
      /parseFloat\s*\(/i,
      /isNaN\s*\(/i,
      /typeof\s+\w+\s*===/i,
      /instanceof\s+/i,
    ],
    keywords: [
      'function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'do',
      'return', 'import', 'export', 'default', 'class', 'extends', 'super',
      'this', 'new', 'try', 'catch', 'throw', 'async', 'await', 'Promise',
      'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'
    ],
    weight: 8
  }
];

/**
 * Detecta el lenguaje basado en el contenido del código con alta precisión
 * Basado en el sistema robusto del ejemplo del usuario
 */
export const detectLanguageAdvanced = (code: string): LanguageDetection => {
  if (!code || code.trim().length === 0) {
    return {
      extension: '.js',
      languageId: 'javascript',
      hasJSX: false,
      hasTypeScript: false,
      confidence: 0
    };
  }

  const scores: Record<Language, number> = {
    javascript: 0,
    typescript: 0,
    html: 0,
    css: 0,
    javascriptreact: 0,
    typescriptreact: 0
  };

  let totalScore = 0;

  // Analizar patrones regex
  languagePatterns.forEach(({ language, patterns, weight }) => {
    patterns.forEach(pattern => {
      const matches = code.match(pattern);
      if (matches) {
        const score = weight * matches.length;
        scores[language] += score;
        totalScore += score;
      }
    });
  });

  // Analizar palabras clave
  languagePatterns.forEach(({ language, keywords, weight }) => {
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = code.match(regex);
      if (matches) {
        const score = (weight / 2) * matches.length;
        scores[language] += score;
        totalScore += score;
      }
    });
  });

  // Verificaciones específicas adicionales

  // HTML: presencia de tags
  if (/<[a-zA-Z][a-zA-Z0-9]*[^>]*>/.test(code)) {
    scores.html += 30;
    totalScore += 30;
  }

  // CSS: bloques de estilo
  if (/\{[^{}]*[a-zA-Z-]+\s*:[^;]+;[^{}]*\}/.test(code)) {
    scores.css += 25;
    totalScore += 25;
  }

  // TypeScript: tipado explícito más fuerte
  if (/:\s*(string|number|boolean|any|void|object|Date)\b/.test(code)) {
    scores.typescript += 15;
    totalScore += 15;
  }

  // TypeScript: unión de tipos
  if (/\|\s*'[^']+'/g.test(code)) {
    scores.typescript += 12;
    totalScore += 12;
  }

  // TypeScript: interfaces y tipos
  if (/(interface|type)\s+\w+/.test(code)) {
    scores.typescript += 18;
    totalScore += 18;
  }

  // JavaScript: características específicas (pero solo si no hay TypeScript fuerte)
  if (/console\.(log|error|warn)/.test(code) && scores.typescript < 15) {
    scores.javascript += 5;
    totalScore += 5;
  }

  // Detección de JSX/React
  const hasJSX = detectJSX(code);
  if (hasJSX) {
    if (scores.typescript > scores.javascript) {
      scores.typescript += 10;
      totalScore += 10;
    } else {
      scores.javascript += 8;
      totalScore += 8;
    }
  }

  // Encontrar el lenguaje con mayor puntuación
  const detectedResult = Object.entries(scores).reduce((max, [lang, score]) => {
    return score > max.score ? { language: lang as Language, score } : max;
  }, { language: 'javascript' as Language, score: 0 });

  // Calcular confianza
  const confidence = totalScore > 0 ? Math.min((detectedResult.score / totalScore) * 100, 100) : 0;

  const hasTypeScript = detectedResult.language === 'typescript' || 
                      scores.typescript > 10;

  console.log('🔍 Language detection scores:', {
    scores,
    detected: detectedResult.language,
    confidence: confidence.toFixed(1) + '%',
    hasJSX,
    hasTypeScript
  });

  // Mapear a lenguajes de Monaco
  let monacoLanguageId = detectedResult.language;
  if (hasJSX && detectedResult.language === 'typescript') {
    monacoLanguageId = 'typescriptreact';
  } else if (hasJSX && detectedResult.language === 'javascript') {
    monacoLanguageId = 'javascriptreact';
  }

  return {
    extension: getExtensionFromLanguage(monacoLanguageId),
    languageId: monacoLanguageId,
    hasJSX,
    hasTypeScript,
    confidence
  };
};

/**
 * Función principal de detección inteligente mejorada
 */
export function detectLanguageIntelligent(
  content: string, 
  filename?: string
): LanguageDetection {
  // Si tenemos filename, usarlo como hint inicial
  if (filename) {
    const filenameDetection = detectLanguageFromFilename(filename);
    const contentDetection = detectLanguageAdvanced(content);
    
    // Si la confianza del contenido es baja, confiar más en el filename
    if (contentDetection.confidence < 30) {
      return {
        ...filenameDetection,
        confidence: Math.max(contentDetection.confidence, 60)
      };
    }
    
    // Si filename y contenido coinciden, aumentar confianza
    if (filenameDetection.languageId === contentDetection.languageId) {
      return {
        ...contentDetection,
        confidence: Math.min(contentDetection.confidence + 20, 100)
      };
    }
    
    // Si hay conflicto, usar el de mayor confianza
    return contentDetection.confidence > 50 ? contentDetection : filenameDetection;
  }
  
  // Solo contenido
  return detectLanguageAdvanced(content);
}

/**
 * Verifica si hay cambios significativos que requieran re-detección
 */
export function hasSignificantContentChange(
  newCode: string,
  oldCode: string
): boolean {
  const lengthDiff = Math.abs(newCode.length - oldCode.length);

  // Umbral de cambio más bajo para detección más sensible
  if (lengthDiff >= 50) { // Reducido de threshold config
    return true;
  }

  // Verificar patrones significativos específicos
  const significantPatterns = [
    /interface\s+\w+/i,
    /type\s+\w+\s*=/i,
    /<[a-zA-Z][a-zA-Z0-9]*[^>]*>/,
    /\{[^{}]*[a-zA-Z-]+\s*:[^;]+;/,
    /console\./i,
    /function\s+\w+/i,
    /const\s+\w+\s*=/i,
    /class\s+\w+/i,
    /import\s+.*from/i,
    /export\s+(default|const|function|class)/i
  ];

  for (const pattern of significantPatterns) {
    const hadPattern = pattern.test(oldCode);
    const hasPattern = pattern.test(newCode);

    if (hadPattern !== hasPattern) {
      console.log("🔍 Cambio significativo detectado:", pattern.source);
      return true;
    }
  }

  return false;
}

// Funciones de detección consolidadas usando configuración centralizada
export function detectLanguageFromContent(content: string): LanguageDetection {
  // Validación de entrada más robusta
  if (typeof content !== 'string') {
    debugLog('⚠️ Contenido inválido recibido en detectLanguageFromContent', typeof content);
    return getDefaultDetection();
  }

  const trimmedContent = content.trim();
  
  if (!trimmedContent || trimmedContent.length < LANGUAGE_DETECTION_CONFIG.MIN_CONTENT_LENGTH) {
    return getDefaultDetection();
  }

  // Verificar cache para evitar re-detecciones costosas
  const cacheKey = generateCacheKey(trimmedContent);
  if (detectionCache.has(cacheKey)) {
    debugLog('🔄 Usando detección desde cache');
    return detectionCache.get(cacheKey)!;
  }

  const hasJSX = detectJSX(trimmedContent);
  
  // NUEVA LÓGICA: Usar requiresTypeScriptMode en lugar de detectTypeScript directamente
  const actuallyNeedsTypeScript = requiresTypeScriptMode(trimmedContent);
  
  // También verificar detectTypeScript para compatibilidad, pero dar prioridad a requiresTypeScriptMode
  const hasTypeScriptFeatures = detectTypeScript(trimmedContent);

  debugLog('📊 Análisis de contenido:', {
    hasJSX,
    hasTypeScriptFeatures,
    actuallyNeedsTypeScript,
    contentLength: trimmedContent.length
  });

  // Lógica de prioridad basada en configuración (más conservadora)
  const preferences = LANGUAGE_DETECTION_CONFIG.PREFERENCES;
  
  let detection: LanguageDetection;

  // Solo usar TypeScript si REALMENTE lo necesita
  if (actuallyNeedsTypeScript && hasJSX) {
    detection = {
      extension: '.tsx',
      languageId: 'typescriptreact',
      hasJSX: true,
      hasTypeScript: true,
      confidence: 90
    };
  } else if (actuallyNeedsTypeScript && preferences.PREFER_TYPESCRIPT_OVER_JAVASCRIPT) {
    detection = {
      extension: '.ts',
      languageId: 'typescript',
      hasJSX: false,
      hasTypeScript: true,
      confidence: 85
    };
  } else if (hasJSX && preferences.PREFER_JSX_VARIANTS) {
    detection = {
      extension: '.jsx',
      languageId: 'javascriptreact',
      hasJSX: true,
      hasTypeScript: false,
      confidence: 80
    };
  } else {
    // Por defecto, usar JavaScript (más conservador)
    detection = getDefaultDetection();
  }

  // Guardar en cache con límite de tamaño
  if (detectionCache.size >= maxCacheSize) {
    const firstKey = detectionCache.keys().next().value;
    if (firstKey) {
      detectionCache.delete(firstKey);
    }
  }
  detectionCache.set(cacheKey, detection);

  return detection;
}

// Función helper para generar clave de cache
function generateCacheKey(content: string): string {
  // Usar hash simple para content que es demasiado grande
  if (content.length > 1000) {
    return `hash_${content.length}_${content.substring(0, 100)}`;
  }
  return content;
}

// Función helper para detección por defecto
function getDefaultDetection(): LanguageDetection {
  return {
    extension: '.js',
    languageId: 'javascript',
    hasJSX: false,
    hasTypeScript: false,
    confidence: 0
  };
}

export function detectLanguageFromFilename(filename: string): LanguageDetection {
  if (typeof filename !== 'string') {
    debugLog('⚠️ Filename inválido recibido', typeof filename);
    return getDefaultDetection();
  }

  const extension = getFileExtension(filename);
  const mapping = LANGUAGE_DETECTION_CONFIG.SUPPORTED_EXTENSIONS;
  const languageId = mapping[extension as keyof typeof mapping] || 'javascript';
  
  const hasJSX = ['javascriptreact', 'typescriptreact'].includes(languageId);
  const hasTypeScript = ['typescript', 'typescriptreact'].includes(languageId);

  return {
    extension,
    languageId,
    hasJSX,
    hasTypeScript,
    confidence: 80 // Alta confianza cuando se basa en el nombre del archivo
  };
}

// Cache para patrones JSX compilados (optimización)
let jsxPatternsCache: {
  positive: RegExp[];
  negative: RegExp[];
} | null = null;

// Detección mejorada de JSX con menos falsos positivos y cache
export function detectJSX(content: string): boolean {
  if (!content || typeof content !== 'string') return false;

  // Inicializar cache de patrones si no existe
  if (!jsxPatternsCache) {
    jsxPatternsCache = {
      positive: [
        /<[A-Z][a-zA-Z0-9]*\s*(?:\w+\s*=\s*{[^}]*}|\w+\s*=\s*"[^"]*"|\w+)*\s*\/?>/, 
        /<[A-Z][a-zA-Z0-9]*>[\s\S]*?<\/[A-Z][a-zA-Z0-9]*>/, 
        /className\s*=\s*{/, 
        /onClick\s*=\s*{/, 
        /React\.createElement/, 
        /{[^}]*}\s*<[A-Z]/, 
        /return\s*\(\s*<[A-Z]/, 
        /jsx\s*:\s*true/, 
      ],
      negative: [
        /<\s*[\w\s]*\s*<=?\s*/, 
        /<\s*\w+\s*>\s*\w+\s*</, 
        /template\s*</, 
        /\w+\s*<\s*\w+\s*>/, 
      ]
    };
  }

  // Verificar patrones negativos primero (más eficiente)
  for (const pattern of jsxPatternsCache.negative) {
    if (pattern.test(content)) {
      return false;
    }
  }

  // Verificar patrones positivos
  return jsxPatternsCache.positive.some(pattern => pattern.test(content));
}

// Detección robusta de TypeScript
export function detectTypeScript(content: string): boolean {
  if (!content) return false;

  // PASO 1: Verificar patrones que SOLO existen en TypeScript (más conservadores)
  const criticalTypeScriptPatterns = [
    // Interfaces - patrón más específico y robusto
    /interface\s+[A-Z][a-zA-Z0-9_]*\s*(<[^>]*>)?\s*{[\s\S]*?}/, // Interfaces completas
    /interface\s+[A-Z][a-zA-Z0-9_]*\s*(<[^>]*>)?\s*extends/, // Interfaces con herencia
    
    // Type aliases explícitos (más específicos)
    /type\s+[A-Z][a-zA-Z0-9_]*\s*(<[^>]*>)?\s*=\s*(?!string|number|boolean|object|function|any)/, // Type aliases no primitivos
    
    // Enums
    /enum\s+[A-Z][a-zA-Z0-9_]*\s*{/, // Enums
    
    // Namespaces y modules
    /namespace\s+[A-Z][a-zA-Z0-9_]*\s*{/, // Namespaces
    /declare\s+(module|namespace|class|function|var|let|const|interface|type|enum)/, // Declaraciones ambient
    
    // Modificadores de acceso específicos de TypeScript (MÁS ESPECÍFICOS)
    /(?:public|private|protected|readonly)\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*[:=]/, // Modificadores con tipos o asignación
    
    // Características avanzadas de tipos
    /keyof\s+[A-Z]/, // Keyof operator
    /typeof\s+[A-Z]/, // Typeof operator usado en tipos
    /infer\s+[A-Z]/, // Infer keyword
    /asserts\s+/, // Assertion signatures
    
    // Utility types comunes que son específicos de TypeScript
    /:\s*(?:Partial|Required|Readonly|Record|Pick|Omit|Exclude|Extract|NonNullable|ReturnType|InstanceType)</, // Utility types
    
    // Mapped types
    /{\s*\[K\s+in\s+keyof/, // Mapped types
    
    // Conditional types
    /\?\s*[A-Z][a-zA-Z0-9_]*\s*:\s*[A-Z][a-zA-Z0-9_]*/, // Conditional types en contexto de tipo
  ];

  // PASO 2: Anotaciones de tipos EXPLÍCITAS (más conservadoras)
  const explicitTypeAnnotationPatterns = [
    // Funciones con tipos explícitos complejos (no primitivos simples)
    /function\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*\([^)]*:\s*[A-Z][a-zA-Z0-9_<>[\]|&,\s]+\)/, // Funciones con tipos complejos
    
    // Variables con tipos explícitos NO primitivos
    /(?:let|const|var)\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*:\s*[A-Z][a-zA-Z0-9_<>[\]|&,\s]+\s*=/, // Variables con tipos complejos
    
    // Arrow functions con tipos de parámetros COMPLEJOS
    /\([^)]*:\s*[A-Z][a-zA-Z0-9_<>[\]|&,\s]+\)\s*=>/, // Arrow functions con tipos complejos
    
    // Return types explícitos COMPLEJOS
    /\)\s*:\s*[A-Z][a-zA-Z0-9_<>[\]|&,\s]+\s*{/, // Return types complejos
    
    // Propiedades opcionales en objetos (específico de TS)
    /[a-zA-Z_$][a-zA-Z0-9_$]*\?\s*:\s*[A-Z]/, // Propiedades opcionales
    
    // Type assertions específicas
    /\w+\s+as\s+[A-Z][a-zA-Z0-9_<>[\]|&,\s]+/, // Type assertions
    
    // Generic constraints
    /extends\s+[A-Z][a-zA-Z0-9_]*(?:\s*<[^>]*>)?/, // Generic constraints
  ];

  // PASO 3: Generics ESPECÍFICOS (más restrictivos)
  const specificGenericPatterns = [
    // Funciones genéricas
    /function\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*<[A-Z][a-zA-Z0-9_,\s]*>/, // Generic functions
    
    // Clases genéricas
    /class\s+[A-Z][a-zA-Z0-9_]*\s*<[A-Z][a-zA-Z0-9_,\s]*>/, // Generic classes
    
    // Interfaces genéricas
    /interface\s+[A-Z][a-zA-Z0-9_]*\s*<[A-Z][a-zA-Z0-9_,\s]*>/, // Generic interfaces
    
    // Types genéricos
    /type\s+[A-Z][a-zA-Z0-9_]*\s*<[A-Z][a-zA-Z0-9_,\s]*>/, // Generic types
  ];

  // Combinar todos los patrones críticos
  const allCriticalPatterns = [
    ...criticalTypeScriptPatterns,
    ...explicitTypeAnnotationPatterns,
    ...specificGenericPatterns
  ];

  // VERIFICACIÓN CRÍTICA: Solo si hay patrones realmente específicos de TypeScript
  const hasTypeScriptFeatures = allCriticalPatterns.some(pattern => pattern.test(content));
  
  if (hasTypeScriptFeatures) {
    console.log('🔍 Características de TypeScript detectadas en el contenido');
    return true;
  }

  // ELIMINAR verificación de "estructuras complejas" que causaba falsos positivos
  // La verificación anterior de class, export, import era demasiado amplia
  
  console.log('ℹ️ No se detectaron características específicas de TypeScript');
  return false;
}

// Nueva función para validar si el contenido REALMENTE necesita TypeScript
export function requiresTypeScriptMode(content: string): boolean {
  if (!content || content.trim().length === 0) {
    return false;
  }

  // Características que REQUIEREN TypeScript (no son compatibles con JavaScript)
  // VERSIÓN CORREGIDA - patrones más amplios pero precisos
  const typeScriptOnlyFeatures = [
    // Interfaces (crítico) - REQUIERE TypeScript - PATRÓN MEJORADO
    /\binterface\s+[A-Z][a-zA-Z0-9_]*\s*(?:<[^>]*>)?\s*(?:extends\s+[^{]*)?{/,
    
    // Type aliases (crítico) - REQUIERE TypeScript - PATRÓN MEJORADO  
    /\btype\s+[A-Z][a-zA-Z0-9_]*\s*(?:<[^>]*>)?\s*=/, 
    
    // Enums (crítico) - REQUIERE TypeScript
    /\benum\s+[A-Z][a-zA-Z0-9_]*\s*{/, 
    
    // Namespaces (crítico) - REQUIERE TypeScript
    /\bnamespace\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*{/, 
    
    // Modificadores de acceso explícitos (crítico) - REQUIERE TypeScript
    /\b(?:public|private|protected|readonly)\s+(?:static\s+)?[a-zA-Z_$]/, 
    
    // Declaraciones ambient (crítico) - REQUIERE TypeScript
    /\bdeclare\s+(?:module|namespace|class|function|var|let|const|interface|type|enum)/, 
    
    // Constructores con parámetros tipados - REQUIERE TypeScript - NUEVO PATRÓN
    /constructor\s*\(\s*[^)]*:\s*[a-zA-Z_$][a-zA-Z0-9_$<>[\]|&,\s]*\s*\)/, 
    
    // Funciones con tipos de retorno explícitos - REQUIERE TypeScript
    /\):\s*Promise<[^>]+>/, 
    /\):\s*[A-Z][a-zA-Z0-9_<>[\]|&,\s]*\s*{/, 
    
    // Parámetros de función con tipos complejos - REQUIERE TypeScript  
    /\([^)]*:\s*[A-Z][a-zA-Z0-9_<>[\]|&,\s]+\s*[,)]/, 
    
    // Variables con tipos explícitos complejos - REQUIERE TypeScript
    /\b(?:let|const|var)\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*:\s*[A-Z][a-zA-Z0-9_<>[\]|&,\s]+/, 
    
    // Type assertions específicas - REQUIERE TypeScript
    /\w+\s+as\s+[A-Z][a-zA-Z0-9_<>[\]|&,\s]+/, 
    
    // Generics en definiciones - REQUIERE TypeScript
    /\b(?:function|class|interface|type)\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*<[A-Z]/, 
    
    // Utility types específicos - REQUIERE TypeScript
    /:\s*(?:Partial|Required|Readonly|Record|Pick|Omit|Exclude|Extract|NonNullable|ReturnType|InstanceType|Promise)</, 
    
    // Mapped types - REQUIERE TypeScript
    /{\s*\[K\s+in\s+keyof/, 
    
    // Conditional types - REQUIERE TypeScript
    /[A-Z]\s+extends\s+[A-Z].*\?.*:/, 
    
    // Generic constraints - REQUIERE TypeScript
    /<[A-Z]\s+extends\s+[^>]+>/, 
    
    // Async function con tipos de retorno - REQUIERE TypeScript
    /async\s+\w+\s*\([^)]*\):\s*Promise</,
  ];

  // NUEVA VERIFICACIÓN: Excluir casos comunes de JavaScript que no necesitan TypeScript
  const javascriptCommonPatterns = [
    // console.log simple
    /^console\.log\s*\(/,
    // Funciones simples sin tipos
    /^function\s+[a-z]/,
    // Variables simples sin tipos
    /^(?:let|const|var)\s+[a-z]/,
    // Strings y números simples
    /^['"`]\w*['"`]$/,
    /^\d+$/,
    // Comentarios
    /^\/\//,
    /^\/\*/,
  ];

  // Si es código JavaScript muy simple, definitivamente no necesita TypeScript
  const contentLines = content.trim().split('\n');
  const isSimpleJavaScript = contentLines.length <= 5 && 
    contentLines.every(line => {
      const trimmedLine = line.trim();
      return !trimmedLine || 
             javascriptCommonPatterns.some(pattern => pattern.test(trimmedLine)) ||
             trimmedLine.length < 50; // Líneas muy cortas probablemente son JS simple
    });

  if (isSimpleJavaScript) {
    debugLog('ℹ️ Código JavaScript simple detectado - no requiere TypeScript');
    return false;
  }

  const requiresTS = typeScriptOnlyFeatures.some(pattern => pattern.test(content));
  
  if (requiresTS) {
    debugLog('✅ Contenido requiere modo TypeScript - características incompatibles con JavaScript detectadas');
  } else {
    debugLog('ℹ️ Contenido es compatible con JavaScript - no requiere modo TypeScript');
  }
  
  return requiresTS;
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

/**
 * Limpia el caché de ejecuciones (útil cuando cambia la detección JSX)
 */
export const clearExecutionCache = async (): Promise<void> => {
  await _importCacheFunctions();
  if (globalExecutionEngine && globalExecutionEngine.clearCache) {
    globalExecutionEngine.clearCache();
    debugLog("Cache del execution engine limpiado");
  }
};

/**
 * Limpia el cache de detección de lenguajes
 */
export const clearDetectionCache = (): void => {
  detectionCache.clear();
  debugLog("🧹 Cache de detección limpiado");
};

/**
 * Fuerza una nueva ejecución invalidando cualquier cache existente
 */
export const forceNewExecution = async (code: string): Promise<void> => {
  await _importCacheFunctions();
  if (globalExecutionEngine) {
    // Usar bypass cache en la próxima ejecución
    debugLog("Cache invalidado para forzar nueva ejecución");
  }
};

// Función para obtener la extensión de archivo basada en el identificador de lenguaje
function getExtensionFromLanguage(languageId: string): string {
  switch (languageId) {
    case 'typescript':
      return '.ts';
    case 'typescriptreact':
      return '.tsx';
    case 'javascriptreact':
      return '.jsx';
    case 'html':
      return '.html';
    case 'css':
      return '.css';
    default:
      return '.js';
  }
} 