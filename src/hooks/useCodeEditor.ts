import { useState, useRef } from 'react';
import { run, transformCode } from '../lib/code/run';
import { CodeLogger } from '../lib/code/errorHandler';
import { EDITOR_CONFIG } from '../constants/config';
import type { ErrorInfo } from '../context/CodeContext';

interface UseCodeEditorResult {
  isRunning: boolean;
  isTransforming: boolean;
  runCode: (code: string) => Promise<void>;
  monacoRef: React.MutableRefObject<any>;
  error: string | null;
  errorInfo: ErrorInfo | null;
  clearError: () => void;
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
  const monacoRef = useRef<any>(null);

  const clearError = () => {
    setError(null);
    setErrorInfo(null);
  };

  const runCode = async (code: string) => {
    if (isRunning) return;
    
    // Si el código está vacío o solo contiene espacios, limpiar resultados y salir silenciosamente
    if (!code || code.trim() === "") {
      setIsRunning(false);
      setIsTransforming(false);
      clearError();
      onResult(""); // Limpiar resultados
      onCodeChange(code); // Actualizar código en contexto
      CodeLogger.log('info', 'Hook: Código vacío, limpiando resultados silenciosamente');
      return;
    }
    
    setIsRunning(true);
    setIsTransforming(true);
    clearError();
    onResult(""); // Limpiar resultados anteriores

    CodeLogger.log('info', 'Hook: Iniciando ejecución de código', { codeLength: code.length });

    try {
      // Transformar código
      const transformed = transformCode(code);
      setIsTransforming(false);

      // Ejecutar código
      const element = await run(transformed);
      
      // Procesar resultados
      if (element instanceof Error) {
        const errorMessage = element.message;
        setError(errorMessage);
        onResult([{ element: { content: errorMessage }, type: "error" }]);
        CodeLogger.log('error', 'Hook: Error en ejecución', { error: errorMessage });
      } else {
        // Verificar si hay errores en los resultados
        const hasErrors = Array.isArray(element) && element.some(item => item.type === 'error');
        if (hasErrors) {
          const errorResult = element.find(item => item.type === 'error');
          if (errorResult) {
            setError(errorResult.element.content);
            setErrorInfo(errorResult.errorInfo || null);
          }
        }
        
        onResult(element);
        CodeLogger.log('info', 'Hook: Ejecución completada exitosamente', { resultCount: Array.isArray(element) ? element.length : 1 });
      }
      
      // Actualizar código en contexto
      onCodeChange(code);
      
    } catch (error: any) {
      const errorMessage = error.message || 'Error desconocido';
      console.error('Error ejecutando código:', error);
      
      setError(errorMessage);
      onResult([{ element: { content: errorMessage }, type: "error" }]);
      setIsTransforming(false);
      
      CodeLogger.log('error', 'Hook: Error no capturado', { error: errorMessage, stack: error.stack });
    } finally {
      setIsRunning(false);
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
  };
}; 