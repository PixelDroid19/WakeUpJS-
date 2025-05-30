import { useCallback, useRef, useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAutoExecutionConfig } from '../context/ConfigContext';
import { SYSTEM_MESSAGES, EDITOR_CONFIG } from '../constants/config';

interface UseDebouncedCodeRunnerParams {
  runCode: (code: string) => Promise<void>;
  onStatusChange?: (status: ExecutionStatus) => void;
  onCodeClear?: () => void;
}

export interface ExecutionStatus {
  type: 'idle' | 'pending' | 'debouncing' | 'executing' | 'error' | 'cleared' | 'paste-priority';
  message?: string;
  timeRemaining?: number;
  lastChangeSize?: number;
  estimatedDelay?: number;
  isTypingActive?: boolean;
  operationType?: 'paste' | 'typing' | 'manual';
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

// Configuración simplificada
const PASTE_CONFIG = {
  detectionWindow: 300,
  priorityThreshold: 100,
  executionDelay: 200,
};

// Usar configuración desde config.ts
const TYPING_DELAY = EDITOR_CONFIG.DEBOUNCE_TIME * 2; // 2 segundos

export const useDebouncedCodeRunner = ({ 
  runCode, 
  onStatusChange,
  onCodeClear,
}: UseDebouncedCodeRunnerParams): UseDebouncedCodeRunnerResult => {
  
  const { utils } = useWorkspace();
  const autoExecutionConfig = useAutoExecutionConfig();
  
  const [status, setStatus] = useState<ExecutionStatus>({ type: 'idle' });
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCodeRef = useRef<string>('');
  const lastChangeTimeRef = useRef<number>(Date.now());
  const pendingCodeRef = useRef<string>('');
  
  const lastInputTimeRef = useRef<number>(Date.now());
  const pasteSequenceRef = useRef<number>(0);
  const lastPasteTimeRef = useRef<number>(0);
  const pendingPasteRef = useRef<string | null>(null);

  const isPasteOperation = useCallback((newCode: string, oldCode: string): boolean => {
    const now = Date.now();
    const timeSinceLastInput = now - lastInputTimeRef.current;
    const lengthDifference = Math.abs(newCode.length - oldCode.length);
    
    const isPaste = timeSinceLastInput < 100 && lengthDifference > 50;
    const isFromEmpty = oldCode.trim() === '' && newCode.trim().length > 20;
    
    if (isPaste || isFromEmpty) {
      const timeSinceLastPaste = now - lastPasteTimeRef.current;
      const isSequentialPaste = timeSinceLastPaste < PASTE_CONFIG.detectionWindow;
      
      if (isSequentialPaste) {
        pasteSequenceRef.current++;
      } else {
        pasteSequenceRef.current = 1;
      }
      
      lastPasteTimeRef.current = now;
    }
    
    lastInputTimeRef.current = now;
    return isPaste || isFromEmpty;
  }, []);

  const isCodeCleared = useCallback((newCode: string, oldCode: string): boolean => {
    const wasNotEmpty = oldCode.trim().length > 0;
    const isNowEmpty = newCode.trim() === '';
    
    if (wasNotEmpty && isNowEmpty) {
      pasteSequenceRef.current = 0;
      pendingPasteRef.current = null;
    }
    
    return (wasNotEmpty && isNowEmpty) || (isNowEmpty && oldCode === '');
  }, []);

  const cancelPending = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = null;
    }
  }, []);
  
  const updateStatus = useCallback((newStatus: ExecutionStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  const debouncedRunner = useCallback((code: string) => {
    if (!autoExecutionConfig.enabled) {
      updateStatus({
        type: 'idle',
        message: 'Auto ejecución deshabilitada',
      });
      return;
    }

    const now = Date.now();
    const previousCode = lastCodeRef.current;
    const isPaste = isPasteOperation(code, previousCode);
    const isCleared = isCodeCleared(code, previousCode);
    
    // Calcular changeSize para uso general
    const changeSize = Math.abs(code.length - previousCode.length);
    
    // Detectar si hay código limpio
    if (isCleared || code.trim() === '') {
      cancelPending();
      
      lastCodeRef.current = code;
      lastChangeTimeRef.current = now;
      
      updateStatus({
        type: 'cleared',
        message: SYSTEM_MESSAGES.CODE_CLEARED,
      });
      
      onCodeClear?.();
      
      setTimeout(() => {
        updateStatus({
          type: 'idle',
          message: 'Listo para nuevo código',
        });
      }, 500);
      
      return;
    }

    if (code.trim() === '') {
      return;
    }

    // Para pegadas, usar sistema de agrupación rápida
    if (isPaste) {
      cancelPending();
      
      pendingCodeRef.current = code;
      pendingPasteRef.current = code;
      lastCodeRef.current = code;
      lastChangeTimeRef.current = now;
      
      const groupingMessage = pasteSequenceRef.current > 1 
        ? `📋 Agrupando pegadas (${pasteSequenceRef.current})...`
        : '📋 Procesando pegada...';
      
      updateStatus({
        type: 'paste-priority',
        message: groupingMessage,
        operationType: 'paste',
        lastChangeSize: changeSize,
        estimatedDelay: PASTE_CONFIG.executionDelay,
      });
      
      // Delay corto para pegadas (200ms)
      debounceTimeoutRef.current = setTimeout(async () => {
        try {
          updateStatus({
            type: 'executing',
            message: `⚡ Ejecutando pegada...`,
            lastChangeSize: changeSize,
            isTypingActive: false,
            operationType: 'paste',
          });
          
          const codeToExecute = pendingPasteRef.current || pendingCodeRef.current;
          await runCode(codeToExecute);
          
          pasteSequenceRef.current = 0;
          pendingPasteRef.current = null;
          
          updateStatus({
            type: 'idle',
            message: '✅ Pegada ejecutada',
          });
          
        } catch (error) {
          pasteSequenceRef.current = 0;
          pendingPasteRef.current = null;
          updateStatus({
            type: 'error',
            message: error instanceof Error ? error.message : 'Error desconocido',
          });
        }
      }, PASTE_CONFIG.executionDelay);
      
      return;
    }

    // SISTEMA SIMPLE: Para typing normal, siempre usar 2 segundos
    // Cancelar cualquier ejecución pendiente
    cancelPending();
    
    // Actualizar referencias
    lastCodeRef.current = code;
    lastChangeTimeRef.current = now;
    pendingCodeRef.current = code;
    
    // Mostrar estado de espera
    updateStatus({
      type: 'pending',
      message: '⌨️ Esperando que termines de escribir...',
      lastChangeSize: changeSize,
      estimatedDelay: TYPING_DELAY,
      isTypingActive: true,
      operationType: 'typing',
    });
    
    // Timeout de 500ms para mostrar mensaje de debounce
    statusTimeoutRef.current = setTimeout(() => {
      updateStatus({
        type: 'debouncing',
        message: '⏳ Ejecutando en 2.0s (se reinicia si continúas escribiendo)...',
        timeRemaining: TYPING_DELAY,
        lastChangeSize: changeSize,
        estimatedDelay: TYPING_DELAY,
        isTypingActive: true,
        operationType: 'typing',
      });
    }, 500);
    
    // Timeout principal de 2 segundos
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        updateStatus({
          type: 'executing',
          message: '⚡ Ejecutando código...',
          lastChangeSize: changeSize,
          isTypingActive: false,
          operationType: 'typing',
        });
        
        // Usar el código más actual
        const finalCode = pendingCodeRef.current;
        
        await runCode(finalCode);
        
        updateStatus({
          type: 'idle',
          message: '✅ Ejecución completada',
        });
        
      } catch (error) {
        updateStatus({
          type: 'error',
          message: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }, TYPING_DELAY);
    
  }, [runCode, updateStatus, isPasteOperation, isCodeCleared, onCodeClear, autoExecutionConfig, cancelPending]);

  const handler = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      if (value !== lastCodeRef.current) {
        debouncedRunner(value);
      }
    }
  }, [debouncedRunner]);

  const cancelPendingPublic = useCallback(() => {
    cancelPending();
    
    pasteSequenceRef.current = 0;
    pendingPasteRef.current = null;
    
    updateStatus({
      type: 'idle',
      message: 'Ejecución cancelada',
    });
  }, [updateStatus, cancelPending]);

  const forceExecute = useCallback(async () => {
    cancelPending();
    
    const activeFile = utils.getActiveFile();
    const codeToExecute = activeFile?.content || '';
    
    if (codeToExecute) {
      try {
        updateStatus({
          type: 'executing',
          message: '⚡ Ejecución forzada...',
          operationType: 'manual',
        });
        
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
  
  const executeImmediately = useCallback(async (code: string) => {
    if (code === lastCodeRef.current) {
      updateStatus({
        type: 'idle',
        message: 'Código ya ejecutado anteriormente',
      });
      return;
    }
    
    cancelPending();
    
    if (!code || code.trim() === '') {
      updateStatus({
        type: 'cleared',
        message: 'Código vacío, resultados limpiados',
      });
      onCodeClear?.();
      return;
    }
    
    try {
      updateStatus({
        type: 'executing',
        message: '⚡ Ejecutando código inicial...',
        operationType: 'manual',
      });
      
      lastCodeRef.current = code;
      pendingCodeRef.current = code;
      lastChangeTimeRef.current = Date.now();
      
      await runCode(code);
      
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

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
      pasteSequenceRef.current = 0;
    };
  }, []);

  return {
    debouncedRunner,
    handler,
    status,
    cancelPending: cancelPendingPublic,
    forceExecute,
    executeImmediately,
    isAutoExecutionEnabled: autoExecutionConfig.enabled
  };
}; 