import { useEffect, useRef, useCallback } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAutoSaveConfig } from '../context/ConfigContext';
import type { ExecutionStatus } from './useDebouncedCodeRunner';

interface AutoSaveOptions {
  executionStatus?: ExecutionStatus; // Estado del debounce
}

interface SessionData {
  files: any[];
  activeFileId: string | null;
  lastSaved: number;
  cursorPositions: Record<string, { line: number; column: number }>;
  scrollPositions: Record<string, { scrollTop: number; scrollLeft: number }>;
  editorState: {
    theme: string;
    fontSize: number;
    wordWrap: boolean;
  };
}

export function useAutoSave(options: Partial<AutoSaveOptions> = {}) {
  const { state, actions, utils } = useWorkspace();
  const autoSaveConfig = useAutoSaveConfig();
  
  // Configuración mezclada con valores de la configuración centralizada
  const config = {
    enabled: autoSaveConfig.enabled,
    interval: autoSaveConfig.interval,
    debounceDelay: autoSaveConfig.debounceDelay,
    ...options
  };

  // Referencias para manejar el estado entre renderizados
  const lastSaveRef = useRef<number>(Date.now());
  const debounceTimerRef = useRef<number | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);
  const isLoadingSessionRef = useRef<boolean>(false);
  const initialLoadRef = useRef<boolean>(true);
  const lastFilesCountRef = useRef<number>(0);
  const lastActiveFileRef = useRef<string | null>(null);
  const lastContentHashRef = useRef<Record<string, number>>({});
  const saveSessionCallCountRef = useRef<number>(0);
  const infiniteLoopThresholdRef = useRef<number>(10);
  const infiniteLoopTimeWindowRef = useRef<number>(2000);
  const lastInfiniteLoopCheckRef = useRef<number>(Date.now());

  // Función para verificar si es seguro guardar
  const isSafeToSave = useCallback((): boolean => {
    const executionStatus = config.executionStatus;
    
    // No guardar si estamos cargando sesión
    if (isLoadingSessionRef.current) {
      return false;
    }
    
    // No guardar durante escritura activa o estados de debounce
    if (executionStatus) {
      // Evitar guardar durante escritura activa o debounce
      if (executionStatus.isTypingActive || 
          executionStatus.type === 'pending' || 
          executionStatus.type === 'debouncing') {
        return false;
      }
    }
    
    return true;
  }, [config.executionStatus]);

  // Función para verificar bucles infinitos
  const checkForInfiniteLoop = useCallback((): boolean => {
    const now = Date.now();
    const timeSinceLastCheck = now - lastInfiniteLoopCheckRef.current;
    
    // Reiniciar contador si ha pasado suficiente tiempo
    if (timeSinceLastCheck > infiniteLoopTimeWindowRef.current) {
      saveSessionCallCountRef.current = 1;
      lastInfiniteLoopCheckRef.current = now;
      return false;
    }
    
    // Detectar bucle infinito
    if (saveSessionCallCountRef.current > infiniteLoopThresholdRef.current) {
      console.error('⚠️ Posible bucle infinito detectado en autoSave. Abortando operación.');
      return true;
    }
    
    return false;
  }, []);

  // Función para guardar la sesión
  const saveSession = useCallback((force: boolean = false) => {
    // Verificar bucle infinito
    saveSessionCallCountRef.current++;
    if (checkForInfiniteLoop()) {
      return;
    }

    // Verificar si es seguro guardar (a menos que sea forzado)
    if (!force && !isSafeToSave()) {
      console.log('⏸️ Guardado pausado - no es seguro guardar ahora');
      return;
    }

    try {
      const sessionData: SessionData = {
        files: state.files.map(file => ({
          ...file,
          lastModified: Date.now()
        })),
        activeFileId: state.activeFileId,
        lastSaved: Date.now(),
        cursorPositions: {}, // Se actualizará desde el editor
        scrollPositions: {},
        editorState: {
          theme: state.settings.theme,
          fontSize: state.settings.fontSize,
          wordWrap: state.settings.wordWrap
        }
      };

      localStorage.setItem('jsrunner-session', JSON.stringify(sessionData));
      localStorage.setItem('jsrunner-session-timestamp', Date.now().toString());
      
      lastSaveRef.current = Date.now();
      console.log('💾 Sesión guardada automáticamente');
      
    } catch (error) {
      console.error('Error guardando sesión:', error);
    }
  }, [state, checkForInfiniteLoop, isSafeToSave]);

  // Función para limpiar la sesión
  const clearSession = useCallback(() => {
    localStorage.removeItem('jsrunner-session');
    localStorage.removeItem('jsrunner-session-timestamp');
    console.log('🗑️ Sesión limpiada');
  }, []);

  const loadSession = useCallback((): boolean => {
    // Verificar bucle infinito en carga
    if (checkForInfiniteLoop()) {
      return false;
    }

    try {
      isLoadingSessionRef.current = true;
      
      const sessionStr = localStorage.getItem('jsrunner-session');
      if (!sessionStr) {
        isLoadingSessionRef.current = false;
        return false;
      }

      const session: SessionData = JSON.parse(sessionStr);
      
      // Validar datos mínimos
      if (!session || !session.files || !Array.isArray(session.files) || session.files.length === 0) {
        console.warn('Sesión inválida o vacía');
        isLoadingSessionRef.current = false;
        return false;
      }

      // Actualizar estado con los archivos de la sesión
      const filesWithCorrectTypes = session.files.map(file => ({
        ...file,
        isUnsaved: false // Marcar como guardados al cargar
      }));
      
      // Si solo hay el archivo por defecto con "Hola mundo", considerarlo como inicio limpio
      const isDefaultSession = filesWithCorrectTypes.length === 1 && 
        filesWithCorrectTypes[0].name === 'script' &&
        filesWithCorrectTypes[0].content.includes('console.log(\'Hola mundo\')');
      
      if (isDefaultSession) {
        console.log('📝 Detectada sesión por defecto, iniciando limpio');
        // No cargar la sesión, dejar que se use el estado inicial
        isLoadingSessionRef.current = false;
        return false;
      }
      
      // Actualizar referencias
      lastActiveFileRef.current = session.activeFileId;
      lastFilesCountRef.current = filesWithCorrectTypes.length;
      
      // Crear hash de contenido para cada archivo
      filesWithCorrectTypes.forEach(file => {
        lastContentHashRef.current[file.id] = hashString(file.content || '');
      });
      
      console.log('📂 Sesión cargada:', filesWithCorrectTypes.length, 'archivos');
      
      // Actualizar timestamp de última carga
      lastSaveRef.current = session.lastSaved || Date.now();
      
      isLoadingSessionRef.current = false;
      return true;
    } catch (error) {
      console.error('Error cargando sesión:', error);
      clearSession();
      isLoadingSessionRef.current = false;
      return false;
    }
  }, [actions, state.files, checkForInfiniteLoop, clearSession]);

  // Función para guardar posición del cursor
  const saveCursorPosition = useCallback((fileId: string, line: number, column: number) => {
    try {
      const positions = JSON.parse(localStorage.getItem('jsrunner-cursor-positions') || '{}');
      positions[fileId] = { line, column };
      localStorage.setItem('jsrunner-cursor-positions', JSON.stringify(positions));
    } catch (error) {
      console.error('Error guardando posición del cursor:', error);
    }
  }, []);

  // Función para obtener posición del cursor
  const getCursorPosition = useCallback((fileId: string): { line: number; column: number } | null => {
    try {
      const positions = JSON.parse(localStorage.getItem('jsrunner-cursor-positions') || '{}');
      return positions[fileId] || null;
    } catch (error) {
      console.error('Error obteniendo posición del cursor:', error);
      return null;
    }
  }, []);

  // Función para calcular un hash simple de una cadena
  const hashString = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a entero de 32 bits
    }
    return hash;
  };

  // Debounced save - ahora respeta el estado de escritura y reduce logging
  const debouncedSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = window.setTimeout(() => {
      // Solo guardar si es seguro (no durante escritura activa)
      if (isSafeToSave()) {
        saveSession();
      } else {
        // Reprogramar para más tarde cuando sea seguro
        setTimeout(() => {
          if (isSafeToSave()) {
            saveSession();
          }
        }, 1000); // Reintentar en 1 segundo
      }
    }, config.debounceDelay);
  }, [saveSession, config.debounceDelay, isSafeToSave]);

  // Auto save periódico - ahora solo como respaldo
  useEffect(() => {
    if (!config.enabled) return;

    autoSaveTimerRef.current = window.setInterval(() => {
      const timeSinceLastSave = Date.now() - lastSaveRef.current;
      
      // Solo guardar si ha pasado suficiente tiempo, es seguro, y hay cambios sin guardar
      if (timeSinceLastSave >= config.interval && isSafeToSave() && utils.hasUnsavedChanges()) {
        saveSession();
      }
    }, config.interval);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [config.enabled, config.interval, saveSession, utils, isSafeToSave]);

  // Guardar cuando hay cambios en el contenido
  useEffect(() => {
    // Skip durante la carga inicial
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      lastFilesCountRef.current = state.files.length;
      
      // Inicializar hashes de contenido
      state.files.forEach(file => {
        lastContentHashRef.current[file.id] = hashString(file.content || '');
      });
      
      return;
    }

    // Skip si estamos cargando sesión
    if (isLoadingSessionRef.current) {
      return;
    }

    // Solo guardar si hay archivos y si realmente hubo cambios
    if (config.enabled && state.files.length > 0) {
      const filesChanged = state.files.length !== lastFilesCountRef.current;
      const activeFileChanged = state.activeFileId !== lastActiveFileRef.current;
      
      // Verificar cambios en el contenido
      let contentChanged = false;
      for (const file of state.files) {
        const currentHash = hashString(file.content || '');
        const previousHash = lastContentHashRef.current[file.id];
        
        if (previousHash === undefined || currentHash !== previousHash) {
          contentChanged = true;
          lastContentHashRef.current[file.id] = currentHash;
        }
      }
      
      if (filesChanged || activeFileChanged || contentChanged) {
        console.log('📝 Detectados cambios, guardando...', { 
          filesChanged, 
          activeFileChanged, 
          contentChanged 
        });
        debouncedSave();
      }
      
      lastFilesCountRef.current = state.files.length;
      lastActiveFileRef.current = state.activeFileId;
    }
  }, [state.files, state.activeFileId, config.enabled, debouncedSave]);

  // Guardar antes de cerrar la ventana
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Forzar guardado al cerrar (crítico)
      saveSession(true);
      
      // Mostrar advertencia si hay cambios sin guardar
      const hasUnsavedChanges = state.files.some(file => file.isUnsaved);
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '¿Estás seguro de que quieres salir? Hay cambios sin guardar.';
        return e.returnValue;
      }
    };

    const handleUnload = () => {
      // Forzar guardado al descargar (crítico)
      saveSession(true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [saveSession, state.files]);

  // Limpiar timers al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, []);

  return {
    saveSession,
    loadSession,
    clearSession,
    saveCursorPosition,
    getCursorPosition,
    lastSaved: lastSaveRef.current,
    isAutoSaveEnabled: config.enabled,
    isLoadingSession: isLoadingSessionRef.current
  };
} 