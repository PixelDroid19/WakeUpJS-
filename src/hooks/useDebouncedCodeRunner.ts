import { useCallback, useRef, useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAutoExecutionConfig, useSmartDebounceConfig } from '../context/ConfigContext';

interface UseDebouncedCodeRunnerParams {
  runCode: (code: string) => Promise<void>;
  onStatusChange?: (status: ExecutionStatus) => void;
  onCodeClear?: () => void;
}

export interface ExecutionStatus {
  type: 'idle' | 'pending' | 'debouncing' | 'executing' | 'error' | 'cleared';
  message?: string;
  timeRemaining?: number;
  lastChangeSize?: number;
  estimatedDelay?: number;
  isTypingActive?: boolean;
}

export interface UseDebouncedCodeRunnerResult {
  debouncedRunner: (code: string) => void;
  handler: (value: string | undefined) => void;
  status: ExecutionStatus;
  cancelPending: () => void;
  forceExecute: () => void;
  executeImmediately: (code: string) => void;
  isAutoExecutionEnabled: boolean;
}

export const useDebouncedCodeRunner = ({ 
  runCode, 
  onStatusChange,
  onCodeClear,
}: UseDebouncedCodeRunnerParams): UseDebouncedCodeRunnerResult => {
  
  // Obtener acceso al workspace para validaciones
  const { utils } = useWorkspace();
  
  // Obtener configuraciones desde el contexto centralizado
  const autoExecutionConfig = useAutoExecutionConfig();
  const smartDebounceConfig = useSmartDebounceConfig();
  
  // Estado del ejecutor
  const [status, setStatus] = useState<ExecutionStatus>({ type: 'idle' });
  
  // Referencias para el control de timeouts y código
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCodeRef = useRef<string>('');
  const lastChangeTimeRef = useRef<number>(Date.now());
  const pendingCodeRef = useRef<string>(''); // Restaurar para mejor control
  const massiveChangeInProgressRef = useRef<boolean>(false);
  
  // Nueva referencia para detectar pegado
  const lastInputTimeRef = useRef<number>(Date.now());
  const previousCodeLengthRef = useRef<number>(0);

  // Función para detectar si es un pegado de código
  const isPasteOperation = useCallback((newCode: string, oldCode: string): boolean => {
    const now = Date.now();
    const timeSinceLastInput = now - lastInputTimeRef.current;
    const lengthDifference = Math.abs(newCode.length - oldCode.length);
    
    // Detectar pegado: cambio grande en poco tiempo (menos de 100ms y más de 50 caracteres)
    const isPaste = timeSinceLastInput < 100 && lengthDifference > 50;
    
    // También considerar como pegado si el código viene de estar vacío a tener contenido significativo
    const isFromEmpty = oldCode.trim() === '' && newCode.trim().length > 20;
    
    lastInputTimeRef.current = now;
    return isPaste || isFromEmpty;
  }, []);

  // Función para detectar si el código se vació completamente
  const isCodeCleared = useCallback((newCode: string, oldCode: string): boolean => {
    // Considerar como limpiado si:
    // 1. El código anterior tenía contenido y el nuevo está vacío
    // 2. O si el código nuevo está vacío y es la primera vez que se analiza (oldCode está vacío también)
    const wasNotEmpty = oldCode.trim().length > 0;
    const isNowEmpty = newCode.trim() === '';
    
    return (wasNotEmpty && isNowEmpty) || (isNowEmpty && oldCode === '');
  }, []);
  
  // Función para detectar cambios masivos (mejorada para mejor detección)
  const isMassiveChange = useCallback((newCode: string, oldCode: string): boolean => {
    const changeSize = Math.abs(newCode.length - oldCode.length);
    const maxLength = Math.max(newCode.length, oldCode.length);
    
    // Un cambio es masivo si:
    // 1. Cambia más del 30% del contenido Y es más de 10 caracteres
    // 2. O si es un cambio muy grande (más de 100 caracteres)
    const percentageChange = maxLength > 0 ? (changeSize / maxLength) : 0;
    const isMassiveByPercentage = percentageChange > 0.3 && changeSize > 10;
    const isMassiveBySize = changeSize > 100;
    
    return isMassiveByPercentage || isMassiveBySize;
  }, []);
  
  // Función para validar que el código sea consistente entre fuentes
  const validateCodeConsistency = useCallback((editorCode: string): string => {
    const activeFile = utils.getActiveFile();
    const workspaceCode = activeFile?.content || '';
    
    // Si hay un cambio masivo en progreso, confiar en el código del editor
    if (massiveChangeInProgressRef.current) {
      return editorCode;
    }
    
    // Si los códigos son muy diferentes, preferir el más reciente (editor)
    if (isMassiveChange(editorCode, workspaceCode)) {
      return editorCode;
    }
    
    // Para cambios pequeños, usar el código del workspace si está más actualizado
    // (esto ayuda con la sincronización de cambios menores)
    return workspaceCode.length !== editorCode.length ? editorCode : workspaceCode;
  }, [utils, isMassiveChange]);
  
  // Función para actualizar el estado
  const updateStatus = useCallback((newStatus: ExecutionStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  // Función para detectar si el usuario está escribiendo activamente
  const isActivelyTyping = useCallback((): boolean => {
    const now = Date.now();
    const timeSinceLastChange = now - lastChangeTimeRef.current;
    return timeSinceLastChange < smartDebounceConfig.typingPauseThreshold;
  }, [smartDebounceConfig.typingPauseThreshold]);

  // Función para calcular el delay inteligente basado en el cambio
  const calculateSmartDelay = useCallback((currentCode: string, previousCode: string): number => {
    // Si la auto ejecución está deshabilitada, usar un delay muy largo
    if (!autoExecutionConfig.enabled) {
      return 999999; // Prácticamente infinito - no ejecutar automáticamente
    }

    // Si smart debounce está deshabilitado, usar el debounce simple
    if (!smartDebounceConfig.enabled) {
      return autoExecutionConfig.debounceTime;
    }

    const changeSize = Math.abs(currentCode.length - previousCode.length);
    const codeSize = currentCode.length;
    const typingActive = isActivelyTyping();
    const isMassive = isMassiveChange(currentCode, previousCode);
    const isPaste = isPasteOperation(currentCode, previousCode);
    
    let baseDelay: number = autoExecutionConfig.debounceTime;
    
    // Para pegado de código, ejecutar inmediatamente si está habilitado
    if (isPaste) {
      return autoExecutionConfig.enabled ? 100 : 999999;
    }
    
    // Para cambios masivos, usar un delay más corto para respuesta rápida
    if (isMassive) {
      baseDelay = smartDebounceConfig.syntaxCheckDelay;
      massiveChangeInProgressRef.current = true;
    } else {
      // Ajustar delay basado en el tamaño del cambio
      if (changeSize <= smartDebounceConfig.smallChangeThreshold) {
        baseDelay = smartDebounceConfig.syntaxCheckDelay;
      } else if (changeSize >= smartDebounceConfig.largeChangeThreshold) {
        baseDelay = smartDebounceConfig.fullExecutionDelay;
      } else {
        baseDelay = smartDebounceConfig.typeCheckDelay;
      }
      
      // Si el usuario está escribiendo activamente, incrementar el delay
      if (typingActive) {
        baseDelay *= 1.5;
      }
    }
    
    // Bonus por tamaño del código (menos agresivo para cambios masivos)
    const sizeFactor = isMassive ? 0.1 : 1;
    const sizeBonus = Math.min(
      codeSize * smartDebounceConfig.sizeScalingFactor * sizeFactor,
      smartDebounceConfig.maxSizeBonus
    );
    
    const finalDelay = Math.round(baseDelay + sizeBonus);
    
    return finalDelay;
  }, [isActivelyTyping, isMassiveChange, isPasteOperation, autoExecutionConfig, smartDebounceConfig]);

  // Función principal de debounce inteligente
  const debouncedRunner = useCallback((code: string) => {
    // Si la auto ejecución está deshabilitada, no hacer nada
    if (!autoExecutionConfig.enabled) {
      updateStatus({
        type: 'idle',
        message: 'Auto ejecución deshabilitada',
      });
      return;
    }

    const now = Date.now();
    const previousCode = lastCodeRef.current;
    const typingActive = isActivelyTyping();
    const isMassive = isMassiveChange(code, previousCode);
    const isPaste = isPasteOperation(code, previousCode);
    const isCleared = isCodeCleared(code, previousCode);
    
    // Actualizar referencias de tiempo y longitud para detección
    previousCodeLengthRef.current = lastCodeRef.current.length;
    
    // Si el código se vació completamente, limpiar resultados inmediatamente
    if (isCleared || code.trim() === '') {
      // Limpiar timeouts anteriores
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
      
      // Limpiar referencias
      lastCodeRef.current = code;
      lastChangeTimeRef.current = now;
      massiveChangeInProgressRef.current = false;
      
      // Actualizar estado y limpiar resultados
      updateStatus({
        type: 'cleared',
        message: 'Código eliminado, resultados limpiados',
      });
      
      // Llamar callback para limpiar resultados
      onCodeClear?.();
      
      // Volver a idle después de un momento
      setTimeout(() => {
        updateStatus({
          type: 'idle',
          message: 'Listo para nuevo código',
        });
      }, 500);
      
      return;
    }
    
    // No ejecutar si el código está vacío (previene ejecuciones innecesarias)
    if (code.trim() === '') {
      console.log('📄 Código vacío, no ejecutando');
      return;
    }
    
    // Limpiar timeouts anteriores
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }
    
    // Actualizar referencias
    lastCodeRef.current = code;
    lastChangeTimeRef.current = now;
    pendingCodeRef.current = code; // Guardar el código específico de este debounce
    
    // Calcular delay inteligente
    const smartDelay = calculateSmartDelay(code, previousCode);
    const changeSize = Math.abs(code.length - previousCode.length);
    
    // Mensaje específico para diferentes tipos de cambio (simplificado)
    let pendingMessage = 'Preparando ejecución...';
    if (isPaste) {
      pendingMessage = '📋 Ejecutando código pegado...';
    } else if (isMassive) {
      pendingMessage = '📝 Procesando cambio grande...';
    } else if (typingActive) {
      pendingMessage = '⌨️ Esperando pausa...';
    }
    
    // Mostrar estado pending inmediatamente
    updateStatus({
      type: 'pending',
      message: pendingMessage,
      lastChangeSize: changeSize,
      estimatedDelay: smartDelay,
      isTypingActive: typingActive,
    });
    
    // Para pegado, ejecutar con delay mínimo
    if (isPaste) {
      debounceTimeoutRef.current = setTimeout(async () => {
        try {
          updateStatus({
            type: 'executing',
            message: '⚡ Ejecutando...',
            lastChangeSize: changeSize,
            isTypingActive: false,
          });
          
          const codeToExecute = pendingCodeRef.current;
          await runCode(codeToExecute);
          
          updateStatus({
            type: 'idle',
            message: '✅ Completado',
          });
          
        } catch (error) {
          updateStatus({
            type: 'error',
            message: error instanceof Error ? error.message : 'Error desconocido',
          });
        }
      }, smartDelay);
      
      return;
    }
    
    // Configurar timeout para mostrar estado de debouncing (simplificado)
    statusTimeoutRef.current = setTimeout(() => {
      updateStatus({
        type: 'debouncing',
        message: isMassive
          ? `Procesando... (${Math.round(smartDelay / 100) / 10}s)`
          : typingActive 
            ? `Esperando pausa... (${Math.round(smartDelay / 100) / 10}s)`
            : `Ejecutando en ${Math.round(smartDelay / 100) / 10}s...`,
        timeRemaining: smartDelay,
        lastChangeSize: changeSize,
        estimatedDelay: smartDelay,
        isTypingActive: typingActive,
      });
    }, smartDebounceConfig.showPendingAfter);
    
    // Configurar timeout principal de ejecución
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        updateStatus({
          type: 'executing',
          message: '⚡ Ejecutando...',
          lastChangeSize: changeSize,
          isTypingActive: false,
        });
        
        // Usar el código específico de este debounce para evitar restauraciones
        const codeToExecute = pendingCodeRef.current;
        
        // Validar consistencia solo para cambios no masivos
        const finalCode = isMassive ? codeToExecute : validateCodeConsistency(codeToExecute);
        
        // Actualizar referencia solo si no hay cambios masivos en progreso
        if (!massiveChangeInProgressRef.current) {
          lastCodeRef.current = finalCode;
        }
        
        await runCode(finalCode);
        
        // Limpiar flag de cambio masivo
        massiveChangeInProgressRef.current = false;
        
        updateStatus({
          type: 'idle',
          message: '✅ Completado',
        });
        
      } catch (error) {
        massiveChangeInProgressRef.current = false;
        updateStatus({
          type: 'error',
          message: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }, smartDelay);
    
  }, [runCode, updateStatus, calculateSmartDelay, isActivelyTyping, isMassiveChange, validateCodeConsistency, isPasteOperation, isCodeCleared, onCodeClear, autoExecutionConfig, smartDebounceConfig.showPendingAfter]);

  // Handler mejorado que incluye validación
  const handler = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      // Solo ejecutar si el código realmente cambió
      if (value !== lastCodeRef.current) {
        debouncedRunner(value);
      }
    }
  }, [debouncedRunner]);

  // Función para cancelar ejecución pendiente
  const cancelPending = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = null;
    }
    
    // Limpiar flags
    massiveChangeInProgressRef.current = false;
    
    updateStatus({
      type: 'idle',
      message: 'Ejecución cancelada',
    });
  }, [updateStatus]);

  // Función para forzar ejecución inmediata
  const forceExecute = useCallback(async () => {
    cancelPending();
    
    // Para ejecución forzada, usar el código más actual del workspace
    const activeFile = utils.getActiveFile();
    const codeToExecute = activeFile?.content || '';
    
    if (codeToExecute) {
      try {
        updateStatus({
          type: 'executing',
          message: '⚡ Ejecución forzada...',
        });
        
        // Actualizar referencias
        lastCodeRef.current = codeToExecute;
        pendingCodeRef.current = codeToExecute;
        
        await runCode(codeToExecute);
        
        updateStatus({
          type: 'idle',
          message: '✅ Completado',
        });
        
      } catch (error) {
        updateStatus({
          type: 'error',
          message: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }
  }, [runCode, cancelPending, updateStatus, utils]);

  // Función para ejecutar código inmediatamente sin debounce 
  // (útil para ejecución inicial al cargar la aplicación)
  const executeImmediately = useCallback(async (code: string) => {
    // Verificar si es el mismo código que la última ejecución
    if (code === lastCodeRef.current) {
      console.log('⏭️ Código ya ejecutado, evitando duplicación');
      
      // Actualizar estado a idle sin ejecutar de nuevo
      updateStatus({
        type: 'idle',
        message: 'Código ya ejecutado anteriormente',
      });
      
      return;
    }
    
    // Cancelar cualquier ejecución pendiente
    cancelPending();
    
    // Si el código está vacío, limpiar y salir
    if (!code || code.trim() === '') {
      updateStatus({
        type: 'cleared',
        message: 'Código vacío, resultados limpiados',
      });
      onCodeClear?.();
      return;
    }
    
    try {
      // Actualizar estado a ejecutando
      updateStatus({
        type: 'executing',
        message: '⚡ Ejecutando código inicial...',
      });
      
      // Guardar el código como último procesado
      lastCodeRef.current = code;
      pendingCodeRef.current = code;
      lastChangeTimeRef.current = Date.now();
      
      // Ejecutar sin delay
      await runCode(code);
      
      // Actualizar estado a completado
      updateStatus({
        type: 'idle',
        message: '✅ Ejecución inicial completada',
      });
    } catch (error) {
      updateStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error en ejecución inicial',
      });
    }
  }, [runCode, cancelPending, updateStatus, onCodeClear]);

  // Limpiar timeouts al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
      massiveChangeInProgressRef.current = false;
    };
  }, []);

  return {
    debouncedRunner,
    handler,
    status,
    cancelPending,
    forceExecute,
    executeImmediately,
    isAutoExecutionEnabled: autoExecutionConfig.enabled
  };
}; 