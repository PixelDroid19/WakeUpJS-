import { useCallback, useRef, useState } from 'react';
import { EDITOR_CONFIG } from '../constants/config';

interface ExecutionResult {
  lineNumber?: number;
  method?: string;
  content: any;
  timestamp?: number;
}

interface ExecutionProgress {
  progress: number;
  message: string;
  result?: ExecutionResult;
}

interface ExecutionState {
  isExecuting: boolean;
  isCancelling: boolean;
  progress: ExecutionProgress | null;
  error: string | null;
  results: ExecutionResult[];
}

export function useWorkerCodeExecutor() {
  const workerRef = useRef<Worker | null>(null);
  const currentExecutionId = useRef<string | null>(null);
  
  const [state, setState] = useState<ExecutionState>({
    isExecuting: false,
    isCancelling: false,
    progress: null,
    error: null,
    results: []
  });

  // Inicializar worker
  const initializeWorker = useCallback(() => {
    if (workerRef.current) return;

    try {
      // Crear worker desde un blob para evitar problemas de archivos
      const workerBlob = new Blob([`
        // Web Worker code para ejecución segura
        let currentExecution = null;
        let shouldCancel = false;
        
        // Función simulada de ejecución (versión simplificada)
        async function executeCode(message) {
          const { id, code, config } = message;
          currentExecution = id;
          shouldCancel = false;
          
          try {
            // Progreso inicial
            self.postMessage({
              type: 'PROGRESS',
              id,
              progress: 10,
              data: 'Iniciando ejecución...'
            });
            
            // Simular transformación
            await new Promise(resolve => setTimeout(resolve, 100));
            
            self.postMessage({
              type: 'PROGRESS',
              id,
              progress: 30,
              data: 'Ejecutando código...'
            });
            
            // Función para capturar console.log
            const results = [];
            const originalConsole = console;
            
            // Interceptar console methods - Soporte completo
            const createConsoleMethod = (methodName) => {
              return (...args) => {
                if (shouldCancel) return;
                const result = {
                  lineNumber: 1,
                  method: methodName,
                  content: args.length === 1 ? args[0] : args,
                  timestamp: Date.now()
                };
                results.push(result);
                
                self.postMessage({
                  type: 'PROGRESS',
                  id,
                  progress: Math.min(50 + results.length * 10, 90),
                  data: { type: 'result', ...result }
                });
              };
            };
            
            const mockConsole = {
              // Métodos básicos
              log: createConsoleMethod('log'),
              warn: createConsoleMethod('warn'),
              error: createConsoleMethod('error'),
              info: createConsoleMethod('info'),
              debug: createConsoleMethod('debug'),
              
              // Métodos avanzados
              dir: createConsoleMethod('dir'),
              dirxml: createConsoleMethod('dirxml'),
              table: createConsoleMethod('table'),
              trace: createConsoleMethod('trace'),
              
              // Métodos de agrupación
              group: createConsoleMethod('group'),
              groupCollapsed: createConsoleMethod('groupCollapsed'),
              groupEnd: createConsoleMethod('groupEnd'),
              
              // Métodos de conteo y tiempo
              count: createConsoleMethod('count'),
              countReset: createConsoleMethod('countReset'),
              time: createConsoleMethod('time'),
              timeEnd: createConsoleMethod('timeEnd'),
              timeLog: createConsoleMethod('timeLog'),
              timeStamp: createConsoleMethod('timeStamp'),
              
              // Métodos de profiling
              profile: createConsoleMethod('profile'),
              profileEnd: createConsoleMethod('profileEnd'),
              
              // Otros métodos
              assert: createConsoleMethod('assert'),
              clear: createConsoleMethod('clear'),
              context: createConsoleMethod('context'),
              createTask: createConsoleMethod('createTask'),
              
              // Propiedad memory
              get memory() {
                return {
                  totalJSHeapSize: 24500000,
                  usedJSHeapSize: 17100000,
                  jsHeapSizeLimit: 3760000000
                };
              }
            };
            
            // Ejecutar código en contexto controlado
            try {
              const func = new Function('console', code);
              func(mockConsole);
            } catch (execError) {
              throw new Error('Execution error: ' + execError.message);
            }
            
            // Resultado final
            self.postMessage({
              type: 'RESULT',
              id,
              data: {
                success: true,
                results,
                executionTime: Date.now()
              }
            });
            
          } catch (error) {
            if (error.message.includes('cancelled')) {
              self.postMessage({ type: 'CANCELLED', id });
            } else {
              self.postMessage({
                type: 'ERROR',
                id,
                data: {
                  message: error.message,
                  type: error.constructor.name
                }
              });
            }
          } finally {
            currentExecution = null;
            shouldCancel = false;
          }
        }
        
        self.onmessage = function(event) {
          const message = event.data;
          
          switch (message.type) {
            case 'EXECUTE_CODE':
              executeCode(message);
              break;
              
            case 'CANCEL':
              if (currentExecution === message.id) {
                shouldCancel = true;
              }
              break;
          }
        };
      `], { type: 'application/javascript' });
      
      workerRef.current = new Worker(URL.createObjectURL(workerBlob));
      
      // Manejar mensajes del worker
      workerRef.current.onmessage = (event) => {
        const { type, id, data, progress } = event.data;
        
        // Verificar que el mensaje es de la ejecución actual
        if (id !== currentExecutionId.current) return;
        
        switch (type) {
          case 'PROGRESS':
            setState(prev => ({
              ...prev,
              progress: {
                progress: progress || 0,
                message: typeof data === 'string' ? data : 'Procesando...',
                result: data?.type === 'result' ? data : undefined
              }
            }));
            
            // Si es un resultado, agregarlo inmediatamente
            if (data?.type === 'result') {
              setState(prev => ({
                ...prev,
                results: [...prev.results, data]
              }));
            }
            break;
            
          case 'RESULT':
            setState(prev => ({
              ...prev,
              isExecuting: false,
              progress: { progress: 100, message: 'Completado' },
              results: data.results || prev.results
            }));
            currentExecutionId.current = null;
            break;
            
          case 'ERROR':
            setState(prev => ({
              ...prev,
              isExecuting: false,
              error: data.message || 'Error desconocido',
              progress: null
            }));
            currentExecutionId.current = null;
            break;
            
          case 'CANCELLED':
            setState(prev => ({
              ...prev,
              isExecuting: false,
              isCancelling: false,
              progress: null
            }));
            currentExecutionId.current = null;
            break;
        }
      };
      
      workerRef.current.onerror = (error) => {
        console.error('Worker error:', error);
        setState(prev => ({
          ...prev,
          isExecuting: false,
          error: 'Error del worker: ' + error.message
        }));
      };
      
    } catch (error) {
      console.error('Failed to create worker:', error);
      setState(prev => ({
        ...prev,
        error: 'No se pudo crear el worker para ejecución segura'
      }));
    }
  }, []);

  // Ejecutar código
  const executeCode = useCallback((code: string) => {
    if (!code.trim()) {
      setState(prev => ({ ...prev, results: [], error: null }));
      return;
    }
    
    initializeWorker();
    
    if (!workerRef.current) {
      setState(prev => ({
        ...prev,
        error: 'Worker no disponible'
      }));
      return;
    }
    
    // Cancelar ejecución anterior si existe
    if (currentExecutionId.current) {
      cancelExecution();
    }
    
    const executionId = Date.now().toString();
    currentExecutionId.current = executionId;
    
    setState({
      isExecuting: true,
      isCancelling: false,
      progress: { progress: 0, message: 'Iniciando...' },
      error: null,
      results: []
    });
    
    workerRef.current.postMessage({
      type: 'EXECUTE_CODE',
      id: executionId,
      code,
      config: {
        timeout: EDITOR_CONFIG.EXECUTION_TIMEOUT,
        iterationLimit: EDITOR_CONFIG.LOOP_ITERATION_LIMIT
      }
    });
  }, [initializeWorker]);

  // Cancelar ejecución
  const cancelExecution = useCallback(() => {
    if (!currentExecutionId.current || !workerRef.current) return;
    
    setState(prev => ({ ...prev, isCancelling: true }));
    
    workerRef.current.postMessage({
      type: 'CANCEL',
      id: currentExecutionId.current
    });
  }, []);

  // Limpiar resultados
  const clearResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      results: [],
      error: null,
      progress: null
    }));
  }, []);

  // Cleanup al desmontar
  const cleanup = useCallback(() => {
    if (currentExecutionId.current && workerRef.current) {
      cancelExecution();
    }
    
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, [cancelExecution]);

  return {
    ...state,
    executeCode,
    cancelExecution,
    clearResults,
    cleanup,
    canCancel: state.isExecuting && !state.isCancelling
  };
}