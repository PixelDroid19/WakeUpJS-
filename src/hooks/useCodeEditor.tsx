import { useCallback, useRef, useState, useEffect } from "react";
import { transformCode } from "../lib/code/run";
import { useWorkerCodeExecutor } from "./useWorkerCodeExecutor";
import { useWorkspace } from "../context/WorkspaceContext";
import { EDITOR_CONFIG } from "../constants/config";
import { parseError, formatErrorForDisplay, type ErrorInfo } from "../lib/code/errorHandler";

interface UseCodeEditorProps {
  onResult?: (result: any) => void;
  onCodeChange?: (code: string) => void;
}

interface ExecutionProgress {
  progress: number;
  message: string;
}

interface UseCodeEditorResult {
  // Estados de ejecución optimizados
  isRunning: boolean;
  isTransforming: boolean;
  isExecuting: boolean;
  isCancelling: boolean;
  canCancel: boolean;
  
  // Progreso en tiempo real
  progress: ExecutionProgress | null;
  
  // Funciones
  runCode: (code: string) => Promise<void>;
  cancelExecution: () => void;
  clearError: () => void;
  
  // Referencias
  monacoRef: React.MutableRefObject<any>;
  
  // Estados de error
  error: string | null;
  errorInfo: ErrorInfo | null;
  
  // Estadísticas
  executionStats: {
    resultsCount: number;
    lastExecution: number;
    isThrottled: boolean;
  };
}

export function useCodeEditor({ onResult, onCodeChange }: UseCodeEditorProps): UseCodeEditorResult {
  const monacoRef = useRef<any>(null);
  const lastExecutionTimeRef = useRef<number>(0);
  const throttleTimeoutRef = useRef<number | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);

  // Obtener workspace para información del archivo activo
  const { utils } = useWorkspace();

  // Usar el nuevo hook del worker
  const {
    isExecuting,
    isCancelling,
    progress,
    error: workerError,
    results,
    executeCode: executeWithWorker,
    cancelExecution,
    clearResults,
    cleanup,
    canCancel
  } = useWorkerCodeExecutor();

  // Estados derivados
  const isTransforming = progress?.message?.includes('Transformando') || false;
  const isRunning = isExecuting && !isTransforming;

  // Sincronizar errores del worker
  useEffect(() => {
    if (workerError) {
      setError(workerError);
      setErrorInfo({
        type: 'Error',
        message: workerError,
        phase: 'execution'
      });
    } else {
      setError(null);
      setErrorInfo(null);
    }
  }, [workerError]);

  // Sincronizar resultados
  useEffect(() => {
    if (results.length > 0) {
      // Convertir resultados del worker al formato esperado
      const formattedResults = results.map(result => ({
        lineNumber: result.lineNumber,
        element: {
          content: typeof result.content === 'string' ? result.content : JSON.stringify(result.content),
          color: undefined
        },
        type: "execution" as const,
        method: result.method
      }));
      
      onResult?.(formattedResults);
    }
  }, [results, onResult]);

  // Función optimizada para ejecutar código con throttling
  const runCodeThrottled = useCallback((code: string) => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecutionTimeRef.current;
    const minInterval = EDITOR_CONFIG.DEBOUNCE_TIME;

    // Limpiar timeout anterior
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }

    // Si ha pasado suficiente tiempo, ejecutar inmediatamente
    if (timeSinceLastExecution >= minInterval) {
      lastExecutionTimeRef.current = now;
      executeWithWorker(code);
    } else {
      // Caso contrario, esperar el tiempo restante
      const delay = minInterval - timeSinceLastExecution;
      throttleTimeoutRef.current = setTimeout(() => {
        lastExecutionTimeRef.current = Date.now();
        executeWithWorker(code);
      }, delay);
    }
  }, [executeWithWorker]);

  // Función principal para ejecutar código
  const runCode = useCallback(async (code: string) => {
    if (!code || code.trim() === "") {
      clearResults();
      setError(null);
      setErrorInfo(null);
      onResult?.([]);
      return;
    }

    // Limpiar errores anteriores
    setError(null);
    setErrorInfo(null);

    // Obtener información del archivo activo
    const activeFile = utils.getActiveFile();

    try {
      // Validación y transformación síncronas para errores rápidos
      // Pasar el language del archivo para mejor detección de JSX/TS
      const transformedCode = transformCode(code, activeFile?.language);
      
      // Si la transformación es exitosa, ejecutar con worker
      runCodeThrottled(transformedCode);
      
    } catch (transformError: any) {
      // Manejar errores de transformación inmediatamente
      const errorInfo = parseError(transformError, 'transformation');
      const formattedError = formatErrorForDisplay(errorInfo);
      
      setError(formattedError);
      setErrorInfo(errorInfo);
      
      // Enviar error como resultado
      onResult?.([{
        element: { 
          content: formattedError, 
          color: 'error'
        },
        type: "error",
        errorInfo
      }]);
    }
  }, [runCodeThrottled, onResult, clearResults, utils]);

  // Función para cancelar ejecución
  const cancelCurrentExecution = useCallback(() => {
    if (canCancel) {
      cancelExecution();
    }
    
    // Limpiar throttle timeout
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
      throttleTimeoutRef.current = null;
    }
  }, [canCancel, cancelExecution]);

  // Función para limpiar errores
  const clearError = useCallback(() => {
    setError(null);
    setErrorInfo(null);
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      cleanup();
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, [cleanup]);

  return {
    // Estados de ejecución optimizados
    isRunning,
    isTransforming,
    isExecuting,
    isCancelling,
    canCancel,
    
    // Progreso en tiempo real
    progress,
    
    // Funciones
    runCode,
    cancelExecution: cancelCurrentExecution,
    clearError,
    
    // Referencias
    monacoRef,
    
    // Estados de error
    error,
    errorInfo,
    
    // Estadísticas
    executionStats: {
      resultsCount: results.length,
      lastExecution: lastExecutionTimeRef.current,
      isThrottled: throttleTimeoutRef.current !== null
    }
  };
} 