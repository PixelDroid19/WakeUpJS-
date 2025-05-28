import { Colors } from "../elementParser";
import { CodeLogger } from "./errorHandler";
import { detectInfiniteLoops } from "./detectors";
import { transformCode } from "./code-transformer";
import { executeCode } from "./code-executor";
import type { Result } from "./types";

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
    
    // Ejecutar código transformado
    const results = await executeCode(transformedCode);
    
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
export { executeCode } from "./code-executor";
export { detectJSX, detectTypeScript, detectInfiniteLoops } from "./detectors";
export { createGlobalContext } from "./global-context";
export type { Result, UnparsedResult, ResultType } from "./types";
