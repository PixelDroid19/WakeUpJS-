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

// Configuración avanzada del ejecutor
const EXECUTOR_CONFIG = {
  // Timeouts
  BASE_TIMEOUT: EDITOR_CONFIG.EXECUTION_TIMEOUT || 10000,
  MAX_TIMEOUT: 30000,
  MINIMUM_STABLE_TIME: 2000,

  // Monitoreo de recursos
  MEMORY_LIMIT: 100 * 1024 * 1024, // 100MB

  // Detección de actividad
  REQUIRED_STABLE_CHECKS: 20,
  CHECK_INTERVAL: 100, // ms
  MAX_WAIT_TIME: EDITOR_CONFIG.ASYNC_WAIT_TIME || 5000,

  // Cache
  ENABLE_EXECUTION_CACHE: true,
  MAX_CACHE_SIZE: 20,
};

// Caché de ejecuciones recientes
const executionCache = new Map<
  string,
  {
    timestamp: number;
    results: Result[];
    hash: string;
  }
>();

/**
 * Genera un hash simple para el código
 */
const generateCodeHash = (
  code: string,
  envVars: Record<string, any> = {}
): string => {
  const envHash = Object.entries(envVars).sort().join("|");
  return `${code.length}_${code
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)}_${envHash}`;
};

/**
 * Estima la complejidad del código para determinar el timeout adaptativo
 */
const estimateCodeComplexity = (code: string): number => {
  const loops = (
    code.match(/for|while|do\s+{|forEach|map|reduce|filter/g) || []
  ).length;
  const conditionals = (code.match(/if|switch|catch|ternary|\?.*:/g) || [])
    .length;
  const asyncOps = (
    code.match(/await|setTimeout|setInterval|fetch|Promise|async/g) || []
  ).length;
  const recursion = (code.match(/function\s*(\w+)[\s\S]*?\1\s*\(/g) || [])
    .length;

  return 1 + loops * 1.5 + conditionals + asyncOps * 2 + recursion * 3;
};

/**
 * Calcula un timeout adaptativo basado en la complejidad del código
 */
const calculateAdaptiveTimeout = (code: string): number => {
  const complexity = estimateCodeComplexity(code);
  const adaptiveTimeout =
    EXECUTOR_CONFIG.BASE_TIMEOUT * Math.log10(1 + complexity);
  return Math.min(
    Math.max(EXECUTOR_CONFIG.BASE_TIMEOUT, adaptiveTimeout),
    EXECUTOR_CONFIG.MAX_TIMEOUT
  );
};

/**
 * Monitor de recursos para el ejecutor de código
 */
class ResourceMonitor {
  private startTime: number;
  private checkpoints: { time: number; operation: string }[] = [];
  private abortController: AbortController;

  constructor(timeoutMs: number, abortSignal?: AbortSignal) {
    this.startTime = performance.now();
    this.abortController = new AbortController();

    // Configurar timeout
    const timeoutId = setTimeout(() => {
      this.abortController.abort(
        new Error(
          `Execution timeout: El código tardó demasiado en ejecutarse (límite: ${
            timeoutMs / 1000
          } segundos)`
        ) as any
      );
    }, timeoutMs);

    // Limpiar timeout si se aborta externamente
    if (abortSignal) {
      abortSignal.addEventListener("abort", () => {
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

  checkpoint(operation: string): void {
    this.checkpoints.push({
      time: performance.now() - this.startTime,
      operation,
    });
  }

  getElapsedTime(): number {
    return performance.now() - this.startTime;
  }

  getStats(): {
    executionTime: number;
    checkpoints: { time: number; operation: string }[];
  } {
    return {
      executionTime: this.getElapsedTime(),
      checkpoints: this.checkpoints,
    };
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
            "log",
            "warn",
            "error",
            "info",
            "debug",
            "table",
            "dir",
            "dirxml",
            "trace",
            "group",
            "groupCollapsed",
            "groupEnd",
            "count",
            "countReset",
            "time",
            "timeEnd",
            "timeLog",
            "timeStamp",
            "assert",
            "clear",
            "profile",
            "profileEnd",
            "context",
            "createTask",
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
  // Creamos array para ir almacenando promesas resueltas
  const results: Result[] = [];

  // Procesamos secuencialmente para mejor control
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
 * Detecta actividad asíncrona pendiente en el código
 */
const detectPendingAsyncActivity = (): boolean => {
  // Detección de timers activos
  const hasActiveTimers =
    typeof window !== "undefined" &&
    // @ts-ignore - Acceso a propiedad interna para detectar timers activos
    ((window as any).__timeoutIds?.size > 0 ||
      (window as any).__intervalIds?.size > 0);

  // Detección de promesas pendientes
  const pendingPromisesCount =
    typeof process !== "undefined"
      ? // @ts-ignore - Node.js solo
        process._getActivePromiseCount?.() || 0
      : 0;

  // Detección de peticiones de red pendientes
  const hasPendingFetch =
    typeof window !== "undefined" &&
    // @ts-ignore - Propiedad para detectar fetches activos
    (window as any).__activeFetchCount > 0;

  return hasActiveTimers || pendingPromisesCount > 0 || hasPendingFetch;
};

/**
 * Ejecuta código transformado en un entorno controlado con capacidad de cancelación
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
  }
): Promise<Result[] | Error> => {
  // Validación inicial - aborto temprano si código vacío
  if (!transformedCode || transformedCode.trim() === "") return [];

  const {
    signal: externalSignal,
    environmentVariables = {},
    timeoutMs,
    disableCache = false,
  } = options || {};

  // Calcular timeout adaptativo basado en la complejidad del código
  const adaptiveTimeout =
    timeoutMs || calculateAdaptiveTimeout(transformedCode);

  // Verificar caché si está habilitada
  if (EXECUTOR_CONFIG.ENABLE_EXECUTION_CACHE && !disableCache) {
    const codeHash = generateCodeHash(transformedCode, environmentVariables);
    const cachedResult = executionCache.get(codeHash);

    if (
      cachedResult &&
      Date.now() - cachedResult.timestamp < 30000 && // 30 segundos de validez
      cachedResult.hash === codeHash
    ) {
      CodeLogger.log("info", "Resultado obtenido de caché", { codeHash });
      return cachedResult.results;
    }
  }

  CodeLogger.log("info", "Iniciando ejecución de código", {
    transformedCodeLength: transformedCode.length,
    timeout: adaptiveTimeout,
  });

  // Iniciar monitor de recursos con timeout adaptativo
  const resourceMonitor = new ResourceMonitor(adaptiveTimeout, externalSignal);
  resourceMonitor.checkpoint("inicio");

  try {
    let unparsedResults: UnparsedResult[] = [];

    // Obtener contexto global
    const globalContext = createGlobalContext(environmentVariables || {});
    const globalKeys = Object.keys(globalContext);
    const globalValues = Object.values(globalContext);

    // Crear función debug
    const debugFunction = createDebugFunction(unparsedResults);

    // Crear función async con contexto global expandido
    const asyncFunction = AsyncFunction(
      "debug",
      ...globalKeys,
      transformedCode
    );

    resourceMonitor.checkpoint("preparación_completada");

    // Ejecutar el código y capturar el resultado
    try {
      // Ejecutar con capacidad de aborto
      await asyncFunction(debugFunction, ...globalValues);
      resourceMonitor.checkpoint("ejecución_completada");
      CodeLogger.log("info", "Código ejecutado sin errores");
    } catch (executionError: any) {
      // Verificar si es un error de aborto
      if (resourceMonitor.signal.aborted) {
        const abortReason =
          resourceMonitor.signal.reason instanceof Error
            ? resourceMonitor.signal.reason.message
            : "Ejecución abortada";

        const errorInfo = parseError(new Error(abortReason), "execution");
        CodeLogger.log("warn", "Ejecución abortada", errorInfo);

        return [
          {
            element: {
              content: formatErrorForDisplay(errorInfo),
              color: Colors.ERROR,
            },
            type: "error",
            errorInfo,
          },
        ];
      }

      // Capturar errores normales de ejecución
      const errorInfo = parseError(executionError, "execution");
      CodeLogger.log("error", "Error durante ejecución", errorInfo);

      return [
        {
          element: {
            content: formatErrorForDisplay(errorInfo),
            color: Colors.ERROR,
          },
          type: "error",
          errorInfo,
        },
      ];
    }

    // Espera inteligente para logs asíncronos con detección de actividad
    resourceMonitor.checkpoint("iniciando_espera_asíncrona");

    let waitTime = 0;
    const checkInterval = EXECUTOR_CONFIG.CHECK_INTERVAL;
    const maxWaitTime = EXECUTOR_CONFIG.MAX_WAIT_TIME;
    let lastResultCount = unparsedResults.length;
    let stableCount = 0;
    const requiredStableChecks = EXECUTOR_CONFIG.REQUIRED_STABLE_CHECKS;

    // Espera adaptativa para operaciones asíncronas
    while (waitTime < maxWaitTime && !resourceMonitor.signal.aborted) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waitTime += checkInterval;

      // Verificar si hay nuevos resultados
      if (unparsedResults.length > lastResultCount) {
        lastResultCount = unparsedResults.length;
        stableCount = 0; // Reiniciar contador de estabilidad
        resourceMonitor.checkpoint("nuevos_resultados_detectados");
      } else {
        stableCount++;
      }

      // Detección de actividad asíncrona pendiente
      const hasPendingActivity = detectPendingAsyncActivity();
      if (hasPendingActivity) {
        stableCount = 0; // Reiniciar si hay actividad pendiente
      }

      // Para código con delays, esperar más tiempo antes de considerar estable
      const minimumWaitTime = EXECUTOR_CONFIG.MINIMUM_STABLE_TIME;

      if (
        stableCount >= requiredStableChecks &&
        unparsedResults.length > 0 &&
        waitTime >= minimumWaitTime &&
        !hasPendingActivity
      ) {
        resourceMonitor.checkpoint("logs_asincronos_estabilizados");
        CodeLogger.log("info", "Logs asíncronos estabilizados, continuando", {
          waitTime,
          finalResultCount: unparsedResults.length,
        });
        break;
      }
    }

    if (waitTime >= maxWaitTime) {
      resourceMonitor.checkpoint("timeout_espera_asincrona");
      CodeLogger.log("warn", "Timeout alcanzado esperando logs asíncronos", {
        maxWaitTime,
        finalResultCount: unparsedResults.length,
      });
    }

    if (unparsedResults.length === 0) {
      CodeLogger.log("info", "No hay resultados para mostrar");
      return [];
    }

    // Procesar resultados con capacidad de cancelación
    resourceMonitor.checkpoint("procesando_resultados");
    const parsedResults = await processResults(
      unparsedResults,
      resourceMonitor.signal
    );

    resourceMonitor.checkpoint("procesamiento_completado");
    CodeLogger.log("info", "Procesamiento de resultados completado", {
      resultCount: parsedResults.length,
      executionStats: resourceMonitor.getStats(),
    });

    // Guardar en caché si está habilitado
    if (EXECUTOR_CONFIG.ENABLE_EXECUTION_CACHE && !disableCache) {
      const codeHash = generateCodeHash(transformedCode, environmentVariables);

      // Gestionar tamaño máximo de caché
      if (executionCache.size >= EXECUTOR_CONFIG.MAX_CACHE_SIZE) {
        // Eliminar entrada más antigua
        const oldestKey = executionCache.keys().next().value;
        if (oldestKey) {
          executionCache.delete(oldestKey);
        }
      }

      executionCache.set(codeHash, {
        timestamp: Date.now(),
        results: parsedResults,
        hash: codeHash,
      });
    }

    return parsedResults;
  } catch (error: unknown) {
    // Si el error es por cancelación, mostrar mensaje apropiado
    if (resourceMonitor.signal.aborted || externalSignal?.aborted) {
      const abortReason =
        (resourceMonitor.signal.reason || externalSignal?.reason) instanceof
        Error
          ? (resourceMonitor.signal.reason || externalSignal?.reason).message
          : "Ejecución cancelada";

      const errorInfo = parseError(new Error(abortReason), "execution");
      return [
        {
          element: {
            content: formatErrorForDisplay(errorInfo),
            color: Colors.ERROR,
          },
          type: "error",
          errorInfo,
        },
      ];
    }

    // Error general durante la ejecución
    const errorInfo = parseError(error, "execution");
    CodeLogger.log("error", "Error general durante ejecución", errorInfo);

    return [
      {
        element: {
          content: formatErrorForDisplay(errorInfo),
          color: Colors.ERROR,
        },
        type: "error",
        errorInfo,
      },
    ];
  } finally {
    // Asegurar que se aborte el monitor de recursos
    if (!resourceMonitor.signal.aborted) {
      resourceMonitor.abort();
    }
  }
};
