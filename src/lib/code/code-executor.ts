import { stringify, Colors } from "../elementParser";
import { EDITOR_CONFIG } from "../../constants/config";
import { parseError, formatErrorForDisplay, CodeLogger } from "./errorHandler";
import { createGlobalContext as originalCreateGlobalContext } from "./global-context";
import { getResultType, getColorForMethod } from "./result-helpers";
import type { UnparsedResult, Result, ModuleRef } from "./types";

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

// Wrapper para la función original
const createGlobalContext = (envVars?: Record<string, string>) => {
  // Guardar variables de entorno en el objeto global
  if (envVars && typeof window !== "undefined") {
    (window as any).__JSRUNNER_ENV_VARS__ = envVars;
  }

  // Llamar a la función original
  return originalCreateGlobalContext();
};

// Configuración simplificada del ejecutor
const EXECUTOR_CONFIG = {
  // Timeout fijo más predecible
  EXECUTION_TIMEOUT: EDITOR_CONFIG.EXECUTION_TIMEOUT || 10000,
  
  // Espera para operaciones asíncronas
  ASYNC_WAIT_TIME: EDITOR_CONFIG.ASYNC_WAIT_TIME || 3000,
  CHECK_INTERVAL: 100, // ms
  
  // Cache simple
  ENABLE_CACHE: true,
  MAX_CACHE_SIZE: 10,
  CACHE_TTL: 30000, // 30 segundos
};

// Caché simple de ejecuciones
const executionCache = new Map<string, {
  timestamp: number;
  results: Result[];
  jsxDetected?: boolean; // Añadir información sobre detección JSX
}>();

/**
 * Genera un hash simple para el código
 */
const generateCodeHash = (code: string): string => {
  return `${code.length}_${code.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)}`;
};

/**
 * Limpia el caché de ejecuciones (útil cuando cambia la detección JSX)
 */
export const clearExecutionCache = (): void => {
  executionCache.clear();
  CodeLogger.log("info", "Cache de ejecuciones limpiado");
};

/**
 * Fuerza una nueva ejecución invalidando cualquier cache existente
 */
export const forceNewExecution = (code: string): void => {
  const codeHash = generateCodeHash(code);
  executionCache.delete(codeHash);
  CodeLogger.log("info", "Cache invalidado para forzar nueva ejecución", { codeHash });
};

/**
 * Monitor de recursos simplificado
 */
class SimpleResourceMonitor {
  private abortController: AbortController;
  private startTime: number;

  constructor(timeoutMs: number, externalSignal?: AbortSignal) {
    this.startTime = performance.now();
    this.abortController = new AbortController();

    // Configurar timeout fijo
    const timeoutId = setTimeout(() => {
      this.abortController.abort(
        new Error(`Timeout: El código tardó más de ${timeoutMs / 1000} segundos en ejecutarse`) as any
      );
    }, timeoutMs);

    // Limpiar timeout si se aborta externamente
    if (externalSignal) {
      externalSignal.addEventListener("abort", () => {
        clearTimeout(timeoutId);
        this.abortController.abort(
          new Error("Ejecución cancelada por el usuario") as any
        );
      });
    }

    // Limpiar timeout cuando termine
    this.abortController.signal.addEventListener("abort", () => {
      clearTimeout(timeoutId);
    });
  }

  getElapsedTime(): number {
    return performance.now() - this.startTime;
  }

  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  abort(reason?: Error): void {
    if (reason) {
      this.abortController.abort(reason as any);
    } else {
      this.abortController.abort();
    }
  }
}

/**
 * Monitor mejorado para recursos con detección inteligente
 */
class EnhancedResourceMonitor extends SimpleResourceMonitor {
  private cancelled = false;
  private newCodeDetected = false;

  markNewCodeDetected(): void {
    this.newCodeDetected = true;
    this.cancelled = true;
  }

  isCancelled(): boolean {
    return this.cancelled || this.signal.aborted;
  }

  isNewCodeDetected(): boolean {
    return this.newCodeDetected;
  }
}

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
const processResults = async (
  unparsedResults: UnparsedResult[],
  signal?: AbortSignal
): Promise<Result[]> => {
  const results: Result[] = [];

  for (const result of unparsedResults) {
    // Verificar si se solicitó abortar
    if (signal?.aborted) {
      throw signal.reason || new Error("Procesamiento de resultados cancelado");
    }

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
 * Ejecuta código transformado en un entorno controlado simplificado
 * @param transformedCode - Código ya transformado por Babel
 * @param options - Opciones de ejecución
 * @returns Promesa con resultados de la ejecución o Error
 */
export const executeCode = async (
  transformedCode: string,
  options?: {
    signal?: AbortSignal;
    environmentVariables?: Record<string, string>;
    timeoutMs?: number;
    disableCache?: boolean;
    onNewCodeDetected?: () => void;
  }
): Promise<Result[] | Error> => {
  // Validación inicial
  if (!transformedCode || transformedCode.trim() === "") return [];

  const {
    signal: externalSignal,
    environmentVariables = {},
    timeoutMs = EXECUTOR_CONFIG.EXECUTION_TIMEOUT,
    disableCache = false,
    onNewCodeDetected,
  } = options || {};

  const codeHash = generateCodeHash(transformedCode);

  // Verificar caché simple - SOLO si no se está forzando nueva ejecución
  if (EXECUTOR_CONFIG.ENABLE_CACHE && !disableCache) {
    const cachedResult = executionCache.get(codeHash);

    // Verificar si el cache es válido y no muy antiguo
    if (cachedResult && Date.now() - cachedResult.timestamp < EXECUTOR_CONFIG.CACHE_TTL) {
      // IMPORTANTE: Solo usar cache si el hash no fue invalidado recientemente
      const cacheAge = Date.now() - cachedResult.timestamp;
      const isRecentlyInvalidated = cacheAge < 1000; // Menos de 1 segundo
      
      if (!isRecentlyInvalidated) {
        CodeLogger.log("info", "Resultado obtenido de caché", { 
          codeHash, 
          cacheAge: cacheAge + "ms" 
        });
        return cachedResult.results;
      } else {
        CodeLogger.log("info", "Cache ignorado - invalidación reciente", { 
          codeHash, 
          cacheAge: cacheAge + "ms" 
        });
        // Remover cache invalidado
        executionCache.delete(codeHash);
      }
    }
  }

  CodeLogger.log("info", "Iniciando ejecución de código FRESCA", {
    codeLength: transformedCode.length,
    timeout: timeoutMs,
    cacheDisabled: disableCache,
  });

  // Iniciar monitor mejorado
  const monitor = new EnhancedResourceMonitor(timeoutMs, externalSignal);

  // Listener para detectar nuevo código
  if (onNewCodeDetected && externalSignal) {
    externalSignal.addEventListener("abort", () => {
      monitor.markNewCodeDetected();
      onNewCodeDetected();
    });
  }

  try {
    let unparsedResults: UnparsedResult[] = [];

    // Obtener contexto global
    const globalContext = createGlobalContext(environmentVariables);
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
    try {
      await asyncFunction(debugFunction, ...globalValues);
      CodeLogger.log("info", "Código ejecutado sin errores");
    } catch (executionError: any) {
      // Verificar si es un error de aborto
      if (monitor.signal.aborted) {
        const abortReason = monitor.signal.reason instanceof Error
          ? monitor.signal.reason.message
          : "Ejecución abortada";

        const errorInfo = parseError(new Error(abortReason), "execution");
        return [{
          element: {
            content: formatErrorForDisplay(errorInfo),
            color: Colors.ERROR,
          },
          type: "error",
          errorInfo,
        }];
      }

      // Error normal de ejecución
      const errorInfo = parseError(executionError, "execution");
      CodeLogger.log("error", "Error durante ejecución", errorInfo);

      return [{
        element: {
          content: formatErrorForDisplay(errorInfo),
          color: Colors.ERROR,
        },
        type: "error",
        errorInfo,
      }];
    }

    // Espera inteligente para operaciones asíncronas - SIN TRACKING
    // CAMBIO IMPORTANTE: Timeout fijo sin tracking problemático
    const hasAsyncCode = transformedCode.includes("await") || transformedCode.includes("async") || transformedCode.includes("Promise");
    
    if (unparsedResults.length === 0 || hasAsyncCode) {
      let waitTime = 0;
      const maxWait = hasAsyncCode ? 3000 : 1000; // Timeout fijo reducido
      let lastResultCount = unparsedResults.length;
      let stableChecks = 0;
      const requiredStableChecks = 3;
      const checkInterval = 300;
      
      CodeLogger.log("info", "Iniciando espera con timeout fijo", {
        maxWait,
        hasAsyncCode,
        initialResultCount: lastResultCount
      });
      
      while (waitTime < maxWait && !monitor.isCancelled()) {
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
        waitTime += checkInterval;
        
        // Cancelación si se detecta nuevo código
        if (monitor.isNewCodeDetected()) {
          CodeLogger.log("info", "Nuevo código detectado, cancelando espera");
          break;
        }
        
        // Verificar si aparecieron nuevos resultados
        if (unparsedResults.length > lastResultCount) {
          const newResults = unparsedResults.length - lastResultCount;
          lastResultCount = unparsedResults.length;
          stableChecks = 0; // Resetear estabilidad
          CodeLogger.log("info", `Nuevos resultados: +${newResults} (total: ${unparsedResults.length})`);
          continue;
        }
        
        // Incrementar contador de estabilidad
        stableChecks++;
        
        // Si tenemos resultados y han sido estables por un tiempo
        if (unparsedResults.length > 0 && stableChecks >= requiredStableChecks) {
          CodeLogger.log("info", "Resultados estabilizados - finalizando", {
            resultCount: unparsedResults.length,
            waitTime,
            stableChecks
          });
          break;
        }
        
        // Log cada segundo
        if (waitTime % 1000 === 0) {
          CodeLogger.log("info", "Esperando resultados", {
            waitTime,
            maxWait,
            resultCount: unparsedResults.length,
            stableChecks
          });
        }
      }
      
      // Log final
      if (waitTime >= maxWait) {
        CodeLogger.log("info", "Timeout alcanzado - usando resultados disponibles", {
          maxWait,
          finalResultCount: unparsedResults.length
        });
      } else {
        CodeLogger.log("info", "Espera completada", {
          waitTime,
          resultCount: unparsedResults.length
        });
      }
    }

    if (unparsedResults.length === 0) {
      CodeLogger.log("info", "No hay resultados para mostrar");
      return [];
    }

    // Procesar resultados
    const parsedResults = await processResults(unparsedResults, monitor.signal);

    CodeLogger.log("info", "Ejecución completada", {
      resultCount: parsedResults.length,
      executionTime: monitor.getElapsedTime(),
    });

    // Guardar en caché simple
    if (EXECUTOR_CONFIG.ENABLE_CACHE && !disableCache) {
      const codeHash = generateCodeHash(transformedCode);

      // Limpiar cache si está lleno
      if (executionCache.size >= EXECUTOR_CONFIG.MAX_CACHE_SIZE) {
        const oldestKey = executionCache.keys().next().value;
        if (oldestKey) {
          executionCache.delete(oldestKey);
        }
      }

      executionCache.set(codeHash, {
        timestamp: Date.now(),
        results: parsedResults,
      });
    }

    return parsedResults;
  } catch (error: unknown) {
    // Manejo de errores simplificado
    if (monitor.signal.aborted || externalSignal?.aborted) {
      const abortReason = monitor.isNewCodeDetected() 
        ? "Ejecución cancelada por nuevo código"
        : "Ejecución cancelada";
      const errorInfo = parseError(new Error(abortReason), "execution");
      
      return [{
        element: {
          content: formatErrorForDisplay(errorInfo),
          color: Colors.ERROR,
        },
        type: "error",
        errorInfo,
      }];
    }

    // Error general
    const errorInfo = parseError(error, "execution");
    CodeLogger.log("error", "Error general durante ejecución", errorInfo);

    return [{
      element: {
        content: formatErrorForDisplay(errorInfo),
        color: Colors.ERROR,
      },
      type: "error",
      errorInfo,
    }];
  } finally {
    // Limpiar recursos
    if (!monitor.signal.aborted) {
      monitor.abort();
    }
  }
};
