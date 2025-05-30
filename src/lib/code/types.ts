import { Colors, type ColoredElement } from "../elementParser";
import { type ErrorInfo } from "./errorHandler";

export interface UnparsedResult {
  lineNumber?: number;
  method?: string;
  content: ColoredElement;
}

export interface Result {
  lineNumber?: number;
  element: {
    content: string;
    color?: Colors | string;
  };
  type: "execution" | "error" | "warning" | "info";
  method?: string;
  errorInfo?: ErrorInfo;
}

export interface ModuleRef {
  type: "method" | "object";
  object: string;
  method?: string;
}

export interface MultipleArgs {
  _isMultipleArgs: true;
  args: any[];
}

export interface ConsoleObject {
  _isConsoleObject: true;
  methods: string[];
  memory: {
    totalJSHeapSize: number;
    usedJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

export interface ProcessedContent {
  _isReference?: boolean;
  _isMultipleArgs?: boolean;
  _isConsoleObject?: boolean;
  [key: string]: any;
}

export type ResultType = "execution" | "error" | "warning" | "info";

// ===============================
// FUNCIONES DE RESULTADO (consolidadas desde result-helpers.ts)
// ===============================

/**
 * Determina el tipo de resultado basado en el método de console
 * @param method - Método de console utilizado
 * @returns Tipo de resultado correspondiente
 */
export const getResultType = (method: string): ResultType => {
  switch (method) {
    case "error":
    case "exception": // Deprecated alias for error
      return "error";
    case "warn":
      return "warning";
    case "info":
    case "debug":
    case "trace":
      return "info";
    default:
      return "execution";
  }
};

/**
 * Obtiene el color apropiado según el método de console
 * @param method - Método de console utilizado
 * @param defaultColor - Color por defecto si no hay específico
 * @returns Color correspondiente al método
 */
export const getColorForMethod = (method: string, defaultColor?: Colors): Colors => {
  switch (method) {
    // Métodos de error
    case "error":
    case "exception": // Deprecated alias for error
    case "assert":
      return Colors.ERROR;
    
    // Métodos de advertencia
    case "warn":
      return Colors.WARNING;
    
    // Métodos informativos
    case "info":
    case "debug":
    case "trace":
      return Colors.INFO;
    
    // Métodos de visualización avanzada
    case "table":
    case "dir":
    case "dirxml":
      return Colors.BLUE;
    
    // Métodos de agrupación
    case "group":
    case "groupCollapsed":
    case "groupEnd":
      return Colors.PURPLE;
    
    // Métodos de conteo
    case "count":
    case "countReset":
      return Colors.CYAN;
    
    // Métodos de tiempo
    case "time":
    case "timeEnd":
    case "timeLog":
    case "timeStamp":
      return Colors.YELLOW;
    
    // Métodos de profiling
    case "profile":
    case "profileEnd":
      return Colors.MAGENTA;
    
    // Método de limpieza
    case "clear":
      return Colors.GRAY;
    
    // Métodos experimentales/específicos de Chrome
    case "context":
    case "createTask":
      return Colors.GREEN;
    
    // Método básico por defecto
    case "log":
    default:
      return defaultColor || Colors.GRAY;
  }
}; 