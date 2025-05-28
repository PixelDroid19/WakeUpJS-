import { useCallback, useRef, useState, useEffect } from 'react';
import { EDITOR_CONFIG } from '../constants/config';
import { useWorkspace } from '../context/WorkspaceContext';

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

interface UseDebouncedCodeRunnerResult {
  debouncedRunner: (code: string) => void;
  handler: (value: string | undefined) => void;
  status: ExecutionStatus;
  cancelPending: () => void;
  forceExecute: () => void;
}

export const useDebouncedCodeRunner = ({ 
  runCode, 
  onStatusChange,
  onCodeClear,
}: UseDebouncedCodeRunnerParams): UseDebouncedCodeRunnerResult => {
  
  // Obtener acceso al workspace para validaciones
  const { utils } = useWorkspace();
  
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
  
  // Función para detectar cambios masivos (más del 20% del contenido)
  const isMassiveChange = useCallback((newCode: string, oldCode: string): boolean => {
    const changeSize = Math.abs(newCode.length - oldCode.length);
    const maxLength = Math.max(newCode.length, oldCode.length);
    return maxLength > 0 && (changeSize / maxLength) > 0.2;
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
    return timeSinceLastChange < EDITOR_CONFIG.SMART_DEBOUNCE.TYPING_PAUSE_THRESHOLD;
  }, []);

  // Función para calcular el delay inteligente basado en el cambio
  const calculateSmartDelay = useCallback((currentCode: string, previousCode: string): number => {
    const changeSize = Math.abs(currentCode.length - previousCode.length);
    const codeSize = currentCode.length;
    const config = EDITOR_CONFIG.SMART_DEBOUNCE;
    const typingActive = isActivelyTyping();
    const isMassive = isMassiveChange(currentCode, previousCode);
    const isPaste = isPasteOperation(currentCode, previousCode);
    
    let baseDelay: number = EDITOR_CONFIG.DEBOUNCE_TIME;
    
    // Para pegado de código, ejecutar inmediatamente
    if (isPaste) {
      return 100; // Delay mínimo para pegado
    }
    
    // Para cambios masivos, usar un delay más corto para respuesta rápida
    if (isMassive) {
      baseDelay = config.SYNTAX_CHECK_DELAY; // Respuesta rápida para cambios masivos
      massiveChangeInProgressRef.current = true;
    } else {
      // Ajustar delay basado en el tamaño del cambio
      if (changeSize <= config.SMALL_CHANGE_THRESHOLD) {
        baseDelay = config.SYNTAX_CHECK_DELAY;
      } else if (changeSize >= config.LARGE_CHANGE_THRESHOLD) {
        baseDelay = config.FULL_EXECUTION_DELAY;
      } else {
        baseDelay = config.TYPE_CHECK_DELAY;
      }
      
      // Si el usuario está escribiendo activamente, incrementar el delay
      if (typingActive) {
        baseDelay *= 1.5;
      }
    }
    
    // Bonus por tamaño del código (menos agresivo para cambios masivos)
    const sizeFactor = isMassive ? 0.1 : 1; // Reducir impacto del tamaño en cambios masivos
    const sizeBonus = Math.min(
      codeSize * config.SIZE_SCALING_FACTOR * sizeFactor,
      config.MAX_SIZE_BONUS
    );
    
    const finalDelay = Math.round(baseDelay + sizeBonus);
    
    return finalDelay;
  }, [isActivelyTyping, isMassiveChange, isPasteOperation]);

  // Función principal de debounce inteligente
  const debouncedRunner = useCallback((code: string) => {
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
    
    // Mensaje específico para diferentes tipos de cambio
    let pendingMessage = 'Cambio detectado...';
    if (isPaste) {
      pendingMessage = '📋 Código pegado, ejecutando automáticamente...';
    } else if (isMassive) {
      pendingMessage = '📝 Cambio masivo detectado...';
    } else if (typingActive) {
      pendingMessage = '⌨️ Escribiendo activamente...';
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
            message: '⚡ Ejecutando código pegado...',
            lastChangeSize: changeSize,
            isTypingActive: false,
          });
          
          const codeToExecute = pendingCodeRef.current;
          await runCode(codeToExecute);
          
          updateStatus({
            type: 'idle',
            message: '✅ Código ejecutado exitosamente',
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
    
    // Configurar timeout para mostrar estado de debouncing
    statusTimeoutRef.current = setTimeout(() => {
      updateStatus({
        type: 'debouncing',
        message: isMassive
          ? `Procesando cambio masivo (${Math.round(smartDelay / 100) / 10}s)...`
          : typingActive 
            ? `Esperando pausa en escritura (${Math.round(smartDelay / 100) / 10}s)...`
            : `Esperando ${Math.round(smartDelay / 100) / 10}s...`,
        timeRemaining: smartDelay,
        lastChangeSize: changeSize,
        estimatedDelay: smartDelay,
        isTypingActive: typingActive,
      });
    }, EDITOR_CONFIG.SMART_DEBOUNCE.SHOW_PENDING_AFTER);
    
    // Configurar timeout principal de ejecución
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        updateStatus({
          type: 'executing',
          message: 'Ejecutando código...',
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
          message: 'Ejecución completada',
        });
        
      } catch (error) {
        massiveChangeInProgressRef.current = false;
        updateStatus({
          type: 'error',
          message: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }, smartDelay);
    
  }, [runCode, updateStatus, calculateSmartDelay, isActivelyTyping, isMassiveChange, validateCodeConsistency, isPasteOperation, isCodeCleared, onCodeClear]);

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
          message: 'Ejecución forzada...',
        });
        
        // Actualizar referencias
        lastCodeRef.current = codeToExecute;
        pendingCodeRef.current = codeToExecute;
        
        await runCode(codeToExecute);
        
        updateStatus({
          type: 'idle',
          message: 'Ejecución forzada completada',
        });
        
      } catch (error) {
        updateStatus({
          type: 'error',
          message: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }
  }, [runCode, cancelPending, updateStatus, utils]);

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
  };
}; 