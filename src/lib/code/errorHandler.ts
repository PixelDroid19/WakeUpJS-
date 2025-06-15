import { transform } from "@babel/standalone";
import { type ErrorInfo } from "../../context/CodeContext";

// Re-export para conveniencia
export type { ErrorInfo } from "../../context/CodeContext";

// Importar configuración de Babel desde code-transformer para evitar duplicación
import { detectLanguageFromContent, detectLanguageFromFilename, type LanguageDetection } from "./detectors";

// Utilidad para extraer información de errores
export function parseError(error: any, phase: ErrorInfo['phase']): ErrorInfo {
  const errorMessage = error.message || error.toString();
  
  // Detectar tipo de error
  let errorType: ErrorInfo['type'] = 'Error'; // Default
  if (errorMessage.includes('Maximum call stack size exceeded')) {
    errorType = 'RangeError'; // Often a symptom of infinite recursion
  } else if (errorMessage.includes('Execution timeout:') || errorMessage.includes('tardó demasiado')) {
    errorType = 'TimeoutError';
  } else if (error instanceof SyntaxError || errorMessage.includes('SyntaxError')) {
    errorType = 'SyntaxError';
  } else if (error instanceof ReferenceError || errorMessage.includes('ReferenceError')) {
    errorType = 'ReferenceError';
  } else if (error instanceof TypeError || errorMessage.includes('TypeError')) {
    errorType = 'TypeError';
  } else if (error instanceof RangeError) { // Keep generic RangeError if not call stack
    errorType = 'RangeError';
  }


  // Extraer línea y columna del error si está disponible
  let line: number | undefined;
  let column: number | undefined;
  
  if (error.loc) {
    line = error.loc.line;
    column = error.loc.column;
  } else if (error.lineNumber) {
    line = error.lineNumber;
    column = error.columnNumber;
  } else {
    // Intentar extraer de mensaje de error de Babel
    const lineMatch = errorMessage.match(/\((\d+):(\d+)\)/);
    if (lineMatch) {
      line = parseInt(lineMatch[1]);
      column = parseInt(lineMatch[2]);
    }
  }

  return {
    type: errorType,
    message: cleanErrorMessage(errorMessage),
    line,
    column,
    stack: error.stack,
    phase,
  };
}

// Limpiar mensajes de error para mostrar solo lo relevante
function cleanErrorMessage(message: string): string {
  // Remover rutas de archivo de los errores de Babel
  let cleanMessage = message.replace(/\/index\.ts: /, '');
  
  // Remover información de posición redundante si ya la tenemos
  cleanMessage = cleanMessage.replace(/\(\d+:\d+\)/, '').trim();
  
  // Specific transformations / hints
  if (cleanMessage.includes('Maximum call stack size exceeded')) {
    cleanMessage = 'Maximum call stack size exceeded (potential infinite recursion).';
  } else if (cleanMessage.includes('Execution timeout:') || cleanMessage.includes('tardó demasiado')) {
    // Standardize timeout message, remove original prefix if present
    cleanMessage = 'The code took too long to execute.';
  } else {
    // Hints for common errors
    const referenceMatch = cleanMessage.match(/(\w+)\s+is\s+not\s+defined/);
    if (referenceMatch) {
      cleanMessage = `${cleanMessage.replace(/\.$/, '')} (ensure '${referenceMatch[1]}' is declared or imported).`;
    }

    const nullOrUndefinedReadMatch = cleanMessage.match(/Cannot read propert(?:ies|y)\s+'(?:\w+)'\s+of\s+(undefined|null)/);
    if (nullOrUndefinedReadMatch) {
      cleanMessage = `${cleanMessage.replace(/\.$/, '')} (check if the object is initialized before accessing its properties).`;
    }
  }
  
  // Asegurar que termine con punto, unless it already has one from the hints
  if (!cleanMessage.endsWith('.') && !cleanMessage.endsWith(').')) {
    cleanMessage += '.';
  }
  
  return cleanMessage;
}

// Configuración de Babel simplificada para validación (usa la misma base que transformCode)
function getValidationBabelConfig(hasJSX: boolean, hasTypeScript: boolean): { presets: any[] } {
  const presets: any[] = [];

  if (hasJSX) {
    presets.push("react");
  }

  if (hasTypeScript) {
    presets.push("typescript");
  }

  // Usar configuración moderna simplificada
  presets.push([
    "env",
    {
      targets: { esmodules: true },
      modules: false,
      loose: false,
      bugfixes: true
    }
  ]);

  return { presets };
}

// Validación de sintaxis básica antes de la transformación
export function validateSyntax(code: string, fileLanguage?: string): { isValid: boolean; error?: ErrorInfo } {
  if (!code || code.trim() === '') {
    return { isValid: true };
  }

  try {
    // Usar la misma lógica de detección que transformCode
    let detection: LanguageDetection;
    
    if (fileLanguage && fileLanguage.includes('.')) {
      detection = detectLanguageFromFilename(fileLanguage);
    } else if (fileLanguage) {
      // Mapeo simple de languageId
      switch (fileLanguage) {
        case 'typescript':
        case 'ts':
          detection = { extension: '.ts', languageId: 'typescript', hasJSX: false, hasTypeScript: true };
          break;
        case 'tsx':
        case 'typescriptreact':
          detection = { extension: '.tsx', languageId: 'typescriptreact', hasJSX: true, hasTypeScript: true };
          break;
        case 'jsx':
        case 'javascriptreact':
          detection = { extension: '.jsx', languageId: 'javascriptreact', hasJSX: true, hasTypeScript: false };
          break;
        default:
          detection = { extension: '.js', languageId: 'javascript', hasJSX: false, hasTypeScript: false };
          break;
      }
    } else {
      detection = detectLanguageFromContent(code);
    }

    const { hasJSX, hasTypeScript } = detection;
    const { presets } = getValidationBabelConfig(hasJSX, hasTypeScript);

    // Intentar parsear con Babel usando configuración simplificada
    transform(code, {
      filename: hasJSX
        ? hasTypeScript ? "validation.tsx" : "validation.jsx"
        : hasTypeScript ? "validation.ts" : "validation.js",
      presets,
      sourceType: 'module',
      parserOpts: {
        allowAwaitOutsideFunction: true,
        allowReturnOutsideFunction: true,
        strictMode: false,
        allowImportExportEverywhere: true,
        allowSuperOutsideMethod: true,
        allowUndeclaredExports: true
      },
      code: false, // Solo parsear, no generar código
    });
    
    return { isValid: true };
  } catch (error: any) {
    return {
      isValid: false,
      error: parseError(error, 'validation'),
    };
  }
}

// Crear mensaje de error formateado para mostrar al usuario
export function formatErrorForDisplay(errorInfo: ErrorInfo): string {
  const prefix = getErrorPrefix(errorInfo.type, errorInfo.message);
  const location = errorInfo.line ? ` (línea ${errorInfo.line}${errorInfo.column ? `:${errorInfo.column}` : ''})` : '';
  
  return `${prefix}${errorInfo.message}${location}`;
}

// Obtener prefijo con emoji para diferentes tipos de error
function getErrorPrefix(errorType: ErrorInfo['type'], message?: string): string {
  // Manejo especial para bucles infinitos (puede ser un RangeError o un TimeoutError en la práctica)
  // Se mantiene por si alguna detección específica de bucles se añade fuera del `errorType`
  if (message && (message.includes('Bucle detenido') || message.includes('bucle infinito'))) {
    return '🔄 Loop Error: '; // Consider if this should be part of cleanErrorMessage instead
  }
  
  switch (errorType) {
    case 'SyntaxError':
      return '🚫 SyntaxError: ';
    case 'ReferenceError':
      return '❓ ReferenceError: ';
    case 'TypeError':
      return '🔢 TypeError: ';
    case 'RangeError': // Covers "Maximum call stack size exceeded" as well
      return '📊 RangeError: ';
    case 'TimeoutError':
      return '⏱️ TimeoutError: ';
    default:
      return '❌ Error: '; // Genérico
  }
}

// Logger para depuración
export class CodeLogger {
  private static logs: Array<{
    timestamp: Date;
    level: 'info' | 'warn' | 'error';
    message: string;
    details?: any;
  }> = [];

  static log(level: 'info' | 'warn' | 'error', message: string, details?: any) {
    this.logs.push({
      timestamp: new Date(),
      level,
      message,
      details,
    });

    // Limitar el número de logs almacenados
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-50);
    }

    // Log en consola durante desarrollo
    if (process.env.NODE_ENV === 'development') {
      console[level](`[JSRunner] ${message}`, details || '');
    }
  }

  static getLogs() {
    return [...this.logs];
  }

  static clearLogs() {
    this.logs = [];
  }
} 