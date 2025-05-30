import { Colors } from "../elementParser";
import { CodeLogger, parseError, formatErrorForDisplay } from "./errorHandler";
import { detectInfiniteLoops } from "./detectors";
import { transformCode } from "./code-transformer";
import { createGlobalContext } from "./global-context";
import { getResultType, getColorForMethod, type Result, type UnparsedResult, type ModuleRef } from "./types";
import { stringify } from "../elementParser";

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

// Configuración de ejecución temporal
const EXECUTOR_CONFIG = {
  EXECUTION_TIMEOUT: 10000,
  ASYNC_WAIT_TIME: 3000,
  CHECK_INTERVAL: 100,
};

/**
 * Crea función debug para capturar salidas de console
 * @param unparsedResults - Array para almacenar resultados
 * @returns Función debug para inyectar en el código
 */
const createDebugFunction = (unparsedResults: UnparsedResult[]) => {
  return (lineNumber: number, method: string = "log", ...content: any[]) => {
    let processedContent;

    // Manejar referencias especiales (cuando no se llama la función)
    if (
      method === "_reference" &&
      content.length === 1 &&
      typeof content[0] === "object"
    ) {
      const ref = content[0] as ModuleRef;

      if (ref.type === "method" && ref.object === "console") {
        // console.log sin llamar -> mostrar como función
        processedContent = `ƒ ${ref.method}()`;
      } else if (ref.type === "object" && ref.object === "console") {
        // console sin más -> mostrar objeto console completo
        processedContent = {
          _isConsoleObject: true,
          methods: [
            "log", "warn", "error", "info", "debug", "table", "dir", "dirxml",
            "trace", "group", "groupCollapsed", "groupEnd", "count", "countReset",
            "time", "timeEnd", "timeLog", "timeStamp", "assert", "clear",
            "profile", "profileEnd", "context", "createTask",
          ],
          memory: {
            totalJSHeapSize: 24500000,
            usedJSHeapSize: 17100000,
            jsHeapSizeLimit: 3760000000,
          },
        };
      } else {
        processedContent = content[0];
      }
    } else if (content.length === 0) {
      processedContent = undefined;
    } else if (content.length === 1) {
      processedContent = content[0];
    } else {
      // Para múltiples argumentos, mantenerlos como array pero marcarlos para procesamiento especial
      processedContent = {
        _isMultipleArgs: true,
        args: content,
      };
    }

    unparsedResults.push({
      lineNumber,
      method: method === "_reference" ? "log" : method,
      content: processedContent,
    });
  };
};

/**
 * Procesa los resultados sin parsear en resultados finales
 * @param unparsedResults - Resultados sin procesar
 * @returns Promesa con resultados procesados
 */
const processResults = async (unparsedResults: UnparsedResult[]): Promise<Result[]> => {
  const results: Result[] = [];

  for (const result of unparsedResults) {
    try {
      const stringifiedContent = await stringify(result.content);
      if (!stringifiedContent) {
        throw new Error("No se pudo convertir el contenido");
      }

      const resultType = getResultType(result.method || "log");

      results.push({
        lineNumber: result.lineNumber,
        element: {
          content: stringifiedContent.content,
          color: getColorForMethod(
            result.method || "log",
            stringifiedContent.color
          ),
        },
        type: resultType,
        method: result.method,
      });
    } catch (error: any) {
      const errorInfo = parseError(error, "execution");
      CodeLogger.log("error", "Error procesando resultado", errorInfo);

      results.push({
        lineNumber: result.lineNumber,
        element: {
          content: formatErrorForDisplay(errorInfo),
          color: Colors.ERROR,
        },
        type: "error" as const,
        errorInfo,
      });
    }
  }

  return results;
};

/**
 * Ejecuta código transformado directamente (funcionalidad restaurada temporalmente)
 */
const executeCodeDirect = async (transformedCode: string): Promise<Result[]> => {
  let unparsedResults: UnparsedResult[] = [];

  try {
    // Obtener contexto global
    const globalContext = createGlobalContext();
    const globalKeys = Object.keys(globalContext);
    const globalValues = Object.values(globalContext);

    // Crear función debug
    const debugFunction = createDebugFunction(unparsedResults);

    // Crear función async con contexto global
    const asyncFunction = AsyncFunction(
      "debug",
      ...globalKeys,
      transformedCode
    );

    // Ejecutar el código
    await asyncFunction(debugFunction, ...globalValues);
    
    // Espera para operaciones asíncronas
    const hasAsyncCode = transformedCode.includes("await") || transformedCode.includes("async") || transformedCode.includes("Promise");
    
    if (unparsedResults.length === 0 || hasAsyncCode) {
      let waitTime = 0;
      const maxWait = hasAsyncCode ? 3000 : 1000;
      let lastResultCount = unparsedResults.length;
      let stableChecks = 0;
      const requiredStableChecks = 3;
      const checkInterval = 300;
      
      while (waitTime < maxWait) {
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
        waitTime += checkInterval;
        
        // Verificar si aparecieron nuevos resultados
        if (unparsedResults.length > lastResultCount) {
          const newResults = unparsedResults.length - lastResultCount;
          lastResultCount = unparsedResults.length;
          stableChecks = 0;
          continue;
        }
        
        // Incrementar contador de estabilidad
        stableChecks++;
        
        // Si tenemos resultados y han sido estables
        if (unparsedResults.length > 0 && stableChecks >= requiredStableChecks) {
          break;
        }
      }
    }

    // Procesar resultados
    return await processResults(unparsedResults);

  } catch (error: any) {
    const errorInfo = parseError(error, "execution");
    return [{
      element: {
        content: formatErrorForDisplay(errorInfo),
        color: Colors.ERROR,
      },
      type: "error",
      errorInfo,
    }];
  }
};

/**
 * Transforma y ejecuta código JavaScript/TypeScript/JSX
 * @param code - Código fuente a ejecutar
 * @param fileLanguage - Lenguaje del archivo (opcional)
 * @returns Promesa con resultados de la ejecución o Error
 */
export async function run(
  code: string,
  fileLanguage?: string
): Promise<Result[] | Error> {
  if (code.trim() === "") return [];

  CodeLogger.log("info", "Iniciando proceso de ejecución completo", {
    codeLength: code.length,
    fileLanguage,
  });

  // Detectar patrones de código potencialmente infinito
  const hasInfiniteLoop = detectInfiniteLoops(code);
  if (hasInfiniteLoop) {
    CodeLogger.log("warn", "Detectado posible bucle infinito");
    return [
      {
        element: {
          content:
            "⚠️ Código bloqueado: Se detectó un posible bucle infinito (while(true), for(;;), etc.). Estos patrones pueden congelar la aplicación.",
          color: Colors.WARNING,
        },
        type: "error",
        errorInfo: {
          type: "Error",
          message: "Posible bucle infinito detectado",
          phase: "validation",
        },
      },
    ];
  }

  try {
    // Transformar código
    const transformedCode = transformCode(code, fileLanguage);
    
    // Ejecutar código directamente (restaurado temporalmente)
    const results = await executeCodeDirect(transformedCode);
    
    CodeLogger.log("info", "Proceso de ejecución completado exitosamente");
    return results;
  } catch (error: unknown) {
    CodeLogger.log("error", "Error en el proceso de ejecución", error);
    
    // Si es un error de transformación, ya viene formateado
    if (error instanceof Error) {
      return [
        {
          element: {
            content: error.message,
            color: Colors.ERROR,
          },
          type: "error",
          errorInfo: {
            type: "Error",
            message: error.message,
            phase: "transformation",
          },
        },
      ];
    }

    return [
      {
        element: {
          content: "Error desconocido durante la ejecución",
          color: Colors.ERROR,
        },
        type: "error",
        errorInfo: {
          type: "Error",
          message: "Error desconocido",
          phase: "execution",
        },
      },
    ];
  }
}

/**
 * Función para configurar variables de entorno personalizadas
 * @param envVars - Objeto con variables de entorno
 */
export function setEnvironmentVariables(envVars: Record<string, string>) {
  (globalThis as any).__JSRUNNER_ENV_VARS__ = envVars;
  CodeLogger.log("info", "Variables de entorno configuradas", {
    count: Object.keys(envVars).length,
  });
}

// Re-exportar funciones útiles de los módulos
export { transformCode } from "./code-transformer";
export { detectJSX, detectTypeScript, detectInfiniteLoops } from "./detectors";
export { createGlobalContext } from "./global-context";
export type { Result, UnparsedResult, ResultType } from "./types";
