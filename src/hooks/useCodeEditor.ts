import { useState, useRef, useEffect } from 'react';
import { run, transformCode } from '../lib/code/run';
import { globalExecutionEngine, syncEngineWithDynamicConfig } from '../lib/code/execution-engine';
import { useExecutionAdvancedConfig, useGlobalContextConfig } from '../context/ConfigContext';
import { CodeLogger } from '../lib/code/errorHandler';
import type { ErrorInfo } from '../context/CodeContext';

interface UseCodeEditorResult {
  isRunning: boolean;
  isTransforming: boolean;
  runCode: (code: string) => Promise<void>;
  monacoRef: React.MutableRefObject<any>;
  error: string | null;
  errorInfo: ErrorInfo | null;
  clearError: () => void;
  executionMetrics: any; // Métricas del motor de ejecución
  cancelExecution: (id?: string) => void;
}

interface UseCodeEditorParams {
  onResult: (result: any) => void;
  onCodeChange: (code: string) => void;
}

export const useCodeEditor = ({ onResult, onCodeChange }: UseCodeEditorParams): UseCodeEditorResult => {
  const [isRunning, setIsRunning] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [executionMetrics, setExecutionMetrics] = useState<any>(null);
  const monacoRef = useRef<any>(null);
  const currentExecutionIdRef = useRef<string | null>(null);

  // Configuraciones dinámicas
  const executionConfig = useExecutionAdvancedConfig();
  const globalContextConfig = useGlobalContextConfig();

  // Sincronizar configuraciones con el motor de ejecución
  useEffect(() => {
    syncEngineWithDynamicConfig({
      execution: executionConfig,
      globalContext: globalContextConfig,
    });
  }, [executionConfig, globalContextConfig]);

  const clearError = () => {
    setError(null);
    setErrorInfo(null);
  };

  const cancelExecution = (id?: string) => {
    if (id) {
      globalExecutionEngine.cancel(id);
    } else if (currentExecutionIdRef.current) {
      globalExecutionEngine.cancel(currentExecutionIdRef.current);
    }
    setIsRunning(false);
    setIsTransforming(false);
  };

  const runCode = async (code: string) => {
    if (isRunning) {
      // Si ya hay una ejecución en curso, cancelarla
      cancelExecution();
    }
    
    // Si el código está vacío o solo contiene espacios, limpiar resultados y salir silenciosamente
    if (!code || code.trim() === "") {
      setIsRunning(false);
      setIsTransforming(false);
      clearError();
      onResult(""); // Limpiar resultados
      setExecutionMetrics(null);
      CodeLogger.log('info', 'Hook: Código vacío, limpiando resultados silenciosamente');
      return;
    }
    
   
    setIsRunning(true);
    setIsTransforming(true);
    clearError();
    onResult(""); 

    CodeLogger.log('info', 'Hook: Iniciando ejecución ', { 
      codeLength: code.length,
      engineMetrics: globalExecutionEngine.getMetrics()
    });

    try {
  
      const executionResult = await globalExecutionEngine.execute(code, {
        priority: 1, // Alta prioridad para ejecuciones del editor
        bypassCache: false // Usar cache para optimizar rendimiento
      });

      currentExecutionIdRef.current = executionResult.id;
      setExecutionMetrics(executionResult.metrics);
      setIsTransforming(false);

      // Procesar resultados según el estado de la ejecución
      if (executionResult.status === 'success') {
        if (executionResult.fromCache) {
          CodeLogger.log('info', 'Hook: Resultado obtenido desde cache', {
            executionId: executionResult.id,
            cacheHit: true,
            duration: executionResult.duration
          });
        }

        // Para mantener compatibilidad, transformar el resultado al formato esperado
        const transformedResult = await transformResultForCompatibility(code, executionResult.result);
        onResult(transformedResult);
        
        CodeLogger.log('info', 'Hook: Ejecución completada exitosamente', { 
          executionId: executionResult.id,
          duration: executionResult.duration,
          fromCache: executionResult.fromCache,
          complexity: executionResult.metrics.codeComplexity
        });
        
      } else if (executionResult.status === 'error' && executionResult.error) {
        const errorMessage = executionResult.error.message;
        setError(errorMessage);
        onResult([{ element: { content: errorMessage }, type: "error" }]);
        
        CodeLogger.log('error', 'Hook: Error en ejecución', { 
          error: errorMessage,
          errorType: executionResult.error.type,
          severity: executionResult.error.severity,
          recoverable: executionResult.error.recoverable
        });
        
      } else if (executionResult.status === 'timeout') {
        const timeoutMessage = 'La ejecución fue cancelada por timeout';
        setError(timeoutMessage);
        onResult([{ element: { content: timeoutMessage }, type: "error" }]);
        
        CodeLogger.log('warn', 'Hook: Timeout en ejecución', {
          executionId: executionResult.id,
          duration: executionResult.duration
        });
        
      } else if (executionResult.status === 'cancelled') {
        const cancelMessage = 'La ejecución fue cancelada';
        onResult([{ element: { content: cancelMessage }, type: "info" }]);
        
        CodeLogger.log('info', 'Hook: Ejecución cancelada', {
          executionId: executionResult.id
        });
      }
      
    } catch (error: any) {
      const errorMessage = error.message || 'Error desconocido en motor de ejecución';
      console.error('Error en motor de ejecución:', error);
      
      setError(errorMessage);
      onResult([{ element: { content: errorMessage }, type: "error" }]);
      setIsTransforming(false);
      
      CodeLogger.log('error', 'Hook: Error crítico en motor', { 
        error: errorMessage, 
        stack: error.stack 
      });
    } finally {
      setIsRunning(false);
      currentExecutionIdRef.current = null;
    }
  };

  // Método para mantener compatibilidad con el sistema anterior
  const transformResultForCompatibility = async (code: string, engineResult: any) => {
    try {
      // Si el resultado del motor es simple, usar el sistema de transformación actual
      if (engineResult && typeof engineResult === 'object' && engineResult.output) {
        // El motor devuelve un resultado simulado, usar el sistema real
        const transformed = transformCode(code);
        return await run(transformed);
      }
      
      return engineResult;
    } catch (error) {
      // Fallback al sistema anterior en caso de problemas
      CodeLogger.log('warn', 'Fallback al sistema de ejecución anterior', { error });
      const transformed = transformCode(code);
      return await run(transformed);
    }
  };

  return {
    isRunning,
    isTransforming,
    runCode,
    monacoRef,
    error,
    errorInfo,
    clearError,
    executionMetrics,
    cancelExecution,
  };
}; 