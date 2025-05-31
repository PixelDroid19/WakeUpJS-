import { useContext, useEffect, useRef, useCallback, useState } from "react";
import Editor from "@monaco-editor/react";
import { CodeResultContext } from "../context/CodeContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { usePackageManager } from "../context/PackageManagerContext";
import { useSnippets } from "../context/SnippetsContext";
import { useCodeEditor } from "../hooks/useCodeEditor";
import { useDebouncedCodeRunner } from "../hooks/useDebouncedCodeRunner";
import { useAutoSave } from "../hooks/useAutoSave";
import { useMonacoWorkspaceSync } from "../hooks/useMonacoWorkspaceSync";
import {
  SESSION_CONFIG,
  MONACO_EDITOR_CONFIG,
  SYSTEM_MESSAGES,
  DEBUG_CONFIG,
  AUTO_SAVE_CONFIG,
  LANGUAGE_DETECTION_CONFIG
} from "../constants/config";
import {
  handleEditorWillMount,
  handleEditorDidMount,
  refreshPackageCompletions,
  setupSnippets,
} from "../lib/monaco/monacoSetup";
import { themeManager } from "../lib/themes/theme-manager";
import ExecutionStatusIndicator from "./ExecutionStatusIndicator";
import ExecutionDashboard from "./ExecutionDashboard";
import ThemeSelector from "./ThemeSelector";

interface EditorProps {
  editorRef?: React.MutableRefObject<any>;
}

// Función de logging condicional para producción
const debugLog = (message: string, data?: any) => {
  if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
    console.log(message, data);
  }
};

// Cache para patrones de detección significativa
let significantPatternsCache: readonly RegExp[] | null = null;

function EDITOR({ editorRef }: EditorProps = {}) {
  const { setResult } = useContext(CodeResultContext);
  const { actions, utils } = useWorkspace();
  const { installedPackages } = usePackageManager();
  const { state: snippetsState } = useSnippets();
  const [isDashboardVisible, setIsDashboardVisible] = useState(false);
  const [isDetectingLanguage, setIsDetectingLanguage] = useState(false);

  const monacoInstanceRef = useRef<any>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const editorInstanceRef = useRef<any>(null);
  
  // Refs para cleanup de timeouts (prevenir memory leaks)
  const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  
  // ✅ NUEVO: Refs para debounce del workspace y prevenir interferencias con el cursor
  const workspaceUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingActiveRef = useRef<boolean>(false);
  const lastWorkspaceUpdateRef = useRef<string>('');
  const typingInactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null); // ✅ NUEVO: Limpiar flag después de inactividad
  const isExecutingRef = useRef<boolean>(false); // ✅ NUEVO: Track si se está ejecutando código

  const activeFile = utils.getActiveFile();

  const {
    isRunning,
    isTransforming,
    runCode,
    monacoRef,
    executionMetrics,
  } = useCodeEditor({
    onResult: setResult,
  });

  // Hook de sincronización Monaco-Workspace
  const { syncLanguage, forceSync, isLanguageSynced } = useMonacoWorkspaceSync({
    editorInstance: editorInstanceRef.current,
    monacoInstance: monacoInstanceRef.current,
    onLanguageChange: (language) => {
      debugLog('🔄 Lenguaje cambiado en Monaco:', language);
      setIsDetectingLanguage(false);
    }
  });

  const { handler, status, cancelPending, forceExecute, executeImmediately, isAutoExecutionEnabled } =
    useDebouncedCodeRunner({
      runCode: (code: string) => runCode(code),
      onStatusChange: (status) => {
        debugLog("🔄 Estado de ejecución:", status);
      },
      onCodeClear: () => {
        setResult("");
        debugLog("🧹 Código eliminado, resultados limpiados");
      },
    });

  const {
    saveSession,
    loadSession,
    saveCursorPosition,
    getCursorPosition,
    isAutoSaveEnabled,
    isLoadingSession,
  } = useAutoSave({
    executionStatus: status,
  });

  const sessionLoadAttemptedRef = useRef(false);
  const lastExecutedCodeRef = useRef<string>('');
  const initialExecutionDoneRef = useRef<boolean>(false);
  const sessionJustLoadedRef = useRef<boolean>(false);
  const hasExecutableContentRef = useRef<boolean>(false);

  // Función helper para manejar timeouts con cleanup automático
  const createTimeout = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const timeoutId = setTimeout(() => {
      callback();
      timeoutsRef.current.delete(timeoutId);
    }, delay);
    
    timeoutsRef.current.add(timeoutId);
    return timeoutId;
  }, []);

  // Función optimizada para detectar cambios significativos con cache
  const hasSignificantChange = useCallback((value: string): boolean => {
    if (!significantPatternsCache) {
      significantPatternsCache = LANGUAGE_DETECTION_CONFIG.SIGNIFICANT_PATTERNS;
    }
    
    // significantPatternsCache is guaranteed to be non-null here
    return significantPatternsCache!.some(pattern => pattern.test(value));
  }, []);

  useEffect(() => {
    if (!sessionLoadAttemptedRef.current && !isLoadingSession) {
      sessionLoadAttemptedRef.current = true;
      const hasExecutableContent = loadSession();

      if (hasExecutableContent) {
        debugLog(SYSTEM_MESSAGES.SESSION_RESTORED);
        setResult("");
        sessionJustLoadedRef.current = true;
        hasExecutableContentRef.current = true;

        createTimeout(() => {
          sessionJustLoadedRef.current = false;
        }, SESSION_CONFIG.DEBOUNCE_DELAY);
      } else {
        setResult("");
      }
    }
  }, [loadSession, isLoadingSession, setResult, createTimeout]);

  useEffect(() => {
    if (!activeFile || isLoadingSession) return;

    const currentCode = activeFile.content || '';

    if (currentCode === lastExecutedCodeRef.current && initialExecutionDoneRef.current) {
      debugLog(SYSTEM_MESSAGES.AVOIDING_REEXECUTION);
      return;
    }

    if (sessionJustLoadedRef.current) {
      if (isAutoExecutionEnabled && hasExecutableContentRef.current && currentCode.trim() !== '') {
        debugLog(SYSTEM_MESSAGES.AUTO_EXECUTING);
        executeImmediately(currentCode);
        lastExecutedCodeRef.current = currentCode;
        initialExecutionDoneRef.current = true;
      }

      // ✅ MEJORADO: Solo restaurar cursor al cargar sesión y si no se está escribiendo NI ejecutando
      if (SESSION_CONFIG.AUTO_RESTORE_CURSOR && 
          editorInstanceRef.current && 
          monacoInstanceRef.current && 
          !isTypingActiveRef.current && 
          !isExecutingRef.current) {
        const savedPosition = getCursorPosition(activeFile.id);
        if (savedPosition) {
          debugLog('🔄 Restaurando posición del cursor al cargar sesión:', savedPosition);
          editorInstanceRef.current.setPosition({
            lineNumber: savedPosition.line,
            column: savedPosition.column,
          });
        }
      }
      return;
    }

    if (currentCode.trim() !== '' && currentCode !== lastExecutedCodeRef.current) {
      debugLog(SYSTEM_MESSAGES.AUTO_EXECUTING_DEBOUNCE);
      handler(currentCode);
      lastExecutedCodeRef.current = currentCode;
      initialExecutionDoneRef.current = true;
    } else if (currentCode.trim() === '') {
      debugLog(SYSTEM_MESSAGES.EDITOR_EMPTY);
      setResult("");
      lastExecutedCodeRef.current = '';
    }
  }, [activeFile, getCursorPosition, setResult, executeImmediately, isAutoExecutionEnabled, isLoadingSession, handler]);

  useEffect(() => {
    if (monacoInstanceRef.current) {
      refreshPackageCompletions(monacoInstanceRef.current);
    }
  }, [installedPackages]);

  useEffect(() => {
    if (monacoInstanceRef.current) {
      setupSnippets(monacoInstanceRef.current, () => snippetsState.snippets);
    }
  }, [snippetsState.snippets]);

  function handleEditorWillMountWrapper(monaco: any) {
    monacoInstanceRef.current = monaco;
    
    // Asegurarse de que monaco esté completamente configurado antes de cualquier otra operación
    console.log('⚙️ Configurando Monaco con @monaco-editor/react...');
    
    // Importante: registrar TypeScript explícitamente
    if (monaco.languages && !monaco.languages.typescript) {
      console.warn('⚠️ TypeScript no está registrado, intentando registrarlo explícitamente');
      // Este es solo un registro de advertencia, @monaco-editor/react debería manejarlo automáticamente
    }
    
    cleanupRef.current = handleEditorWillMount(monaco);
  }

  function handleEditorDidMountWrapper(editor: any, monaco: any) {
    monacoRef.current = monaco;
    monacoInstanceRef.current = monaco;
    editorInstanceRef.current = editor;

    if (editorRef) {
      editorRef.current = editor;
    }

    handleEditorDidMount(
      editor,
      monaco,
      activeFile?.id,
      activeFile?.name
    );

    // Sincronizar lenguaje inmediatamente después del mount
    createTimeout(() => {
      if (activeFile && activeFile.content) {
        debugLog('🔄 Sincronizando lenguaje después del mount');
        syncLanguage();
      }
    }, 200);

    // Mejorar tipado del evento del cursor
    editor.onDidChangeCursorPosition((e: { position: { lineNumber: number; column: number } }) => {
      if (activeFile && e.position) {
        saveCursorPosition(
          activeFile.id,
          e.position.lineNumber,
          e.position.column
        );
      }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveSession(AUTO_SAVE_CONFIG.FORCE_SAVE_ON_EXIT);
      debugLog(SYSTEM_MESSAGES.SESSION_SAVED_FORCED);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (status.type === "pending" || status.type === "debouncing") {
        forceExecute();
      }
    });

    editor.addCommand(monaco.KeyCode.Escape, () => {
      if (status.type === "pending" || status.type === "debouncing") {
        cancelPending();
      }
    });

    // Comando para forzar sincronización de lenguaje (Ctrl+Shift+L)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL, () => {
      debugLog('🔄 Forzando sincronización de lenguaje (Ctrl+Shift+L)');
      setIsDetectingLanguage(true);
      forceSync();
    });
  }

  // Cleanup mejorado con limpieza de timeouts
  useEffect(() => {
    return () => {
      // Limpiar todos los timeouts
      timeoutsRef.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      timeoutsRef.current.clear();

      // ✅ NUEVO: Limpiar timeouts del workspace
      if (workspaceUpdateTimeoutRef.current) {
        clearTimeout(workspaceUpdateTimeoutRef.current);
      }
      if (typingInactivityTimeoutRef.current) {
        clearTimeout(typingInactivityTimeoutRef.current);
      }

      // ✅ NUEVO: Limpiar referencias de estado
      isTypingActiveRef.current = false;
      isExecutingRef.current = false;

      // Limpiar otros recursos
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  // ✅ NUEVO: Función helper para actualizar workspace de forma debounced
  const updateWorkspaceContent = useCallback((value: string, immediate: boolean = false) => {
    if (!activeFile) return;

    // Si es una actualización inmediata o el contenido no ha cambiado, actualizar directamente
    if (immediate || value === lastWorkspaceUpdateRef.current) {
      actions.updateFileContent(activeFile.id, value);
      lastWorkspaceUpdateRef.current = value;
      return;
    }

    // Limpiar timeouts anteriores
    if (workspaceUpdateTimeoutRef.current) {
      clearTimeout(workspaceUpdateTimeoutRef.current);
    }
    if (typingInactivityTimeoutRef.current) {
      clearTimeout(typingInactivityTimeoutRef.current);
    }

    // Marcar que se está escribiendo
    isTypingActiveRef.current = true;

    // Debounce la actualización del workspace para evitar interferencias con el cursor
    workspaceUpdateTimeoutRef.current = setTimeout(() => {
      actions.updateFileContent(activeFile.id, value);
      lastWorkspaceUpdateRef.current = value;
      isTypingActiveRef.current = false; // ✅ Limpiar flag al completar actualización
    }, 150); // 150ms de debounce para actualizaciones del workspace

    // ✅ NUEVO: Timeout de seguridad para limpiar flag después de inactividad prolongada
    typingInactivityTimeoutRef.current = setTimeout(() => {
      if (isTypingActiveRef.current) {
        debugLog('⏱️ Limpiando flag de escritura activa por inactividad prolongada');
        isTypingActiveRef.current = false;
      }
    }, 2000); // 2 segundos de inactividad para limpiar flag
  }, [activeFile, actions]);

  // ✅ NUEVO: Trackear estado de ejecución para evitar interferencias con el cursor
  useEffect(() => {
    const wasExecuting = isExecutingRef.current;
    const isCurrentlyExecuting = isRunning || isTransforming || 
                                 status.type === 'executing' || 
                                 status.type === 'pending' || 
                                 status.type === 'debouncing';
    
    isExecutingRef.current = isCurrentlyExecuting;
    
    // Log para debugging
    if (wasExecuting !== isCurrentlyExecuting) {
      debugLog(`🔄 Estado de ejecución cambió: ${wasExecuting} → ${isCurrentlyExecuting}`, {
        isRunning,
        isTransforming,
        statusType: status.type,
        isTypingActive: isTypingActiveRef.current
      });
    }
  }, [isRunning, isTransforming, status.type]);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined && activeFile) {
        // ✅ MEJORADO: Usar debounce para actualizaciones del workspace
        updateWorkspaceContent(value);
        
        // Handler para ejecución (mantener inmediato para responsividad)
        handler(value);
        
        // Usar la detección optimizada con cache (solo si no se está escribiendo activamente)
        if (hasSignificantChange(value) && !isLanguageSynced && !isTypingActiveRef.current) {
          debugLog('🔍 Sintaxis significativa detectada durante edición, sincronizando...');
          setIsDetectingLanguage(true);
          
          createTimeout(() => {
            // Verificar nuevamente que no se esté escribiendo antes de sincronizar
            if (!isTypingActiveRef.current) {
              syncLanguage();
            }
          }, 800); // Delay mayor para sincronización durante escritura
        }
      }
    },
    [activeFile, updateWorkspaceContent, handler, syncLanguage, isLanguageSynced, hasSignificantChange, createTimeout]
  );

  // Sincronizar cuando cambia el archivo activo
  useEffect(() => {
    if (activeFile && editorInstanceRef.current && monacoInstanceRef.current) {
      debugLog('📂 Archivo activo cambió, verificando sincronización:', {
        fileId: activeFile.id,
        fileName: activeFile.name,
        language: activeFile.language
      });
      
      // ✅ MEJORADO: Solo sincronizar si no se está escribiendo activamente
      if (!isTypingActiveRef.current) {
        createTimeout(() => {
          // Verificar nuevamente antes de sincronizar
          if (!isTypingActiveRef.current) {
            forceSync();
          } else {
            debugLog('⏸️ Sincronización pospuesta - usuario escribiendo activamente');
          }
        }, 300);
      } else {
        debugLog('⏸️ Archivo cambió pero usuario está escribiendo - sincronización pospuesta');
      }
    }
  }, [activeFile?.id, forceSync, createTimeout]);

  // Convertir configuración de Monaco para evitar errores de tipo
  const editorOptions = {
    ...MONACO_EDITOR_CONFIG,
    rulers: [...MONACO_EDITOR_CONFIG.rulers], // Convertir a mutable array
  };

  if (!activeFile) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--theme-bg)] text-[var(--theme-fg)]">
        <div className="text-center">
          {isLoadingSession ? (
            <>
              <div className="animate-spin w-8 h-8 border-2 border-[var(--theme-accent)] border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-lg mb-2">🔄 Cargando sesión...</p>
              <p className="text-sm">Restaurando archivos anteriores</p>
            </>
          ) : (
            <>
              <p className="text-lg mb-2">📁 No hay archivo seleccionado</p>
              <p className="text-sm">
                Selecciona un archivo desde las pestañas superiores
              </p>
              {isAutoSaveEnabled && (
                <p className="text-xs mt-4 opacity-70">💾 Autosave activado</p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Controles superiores */}
      <div className="absolute top-2 right-4 z-20 flex items-center gap-2">
        <ThemeSelector />
        
        <button
          onClick={() => setIsDashboardVisible(true)}
          className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
          title="Abrir Dashboard de Métricas"
        >
          📊 Métricas
        </button>
      </div>

      {/* Botón de sincronización de lenguaje */}
      <button
        onClick={() => {
          setIsDetectingLanguage(true);
          forceSync();
        }}
        className={`absolute top-2 right-48 z-20 px-3 py-1 rounded text-sm transition-colors ${
          isLanguageSynced 
            ? 'bg-green-600 hover:bg-green-700 text-white' 
            : 'bg-orange-600 hover:bg-orange-700 text-white'
        }`}
        title={`Lenguaje ${isLanguageSynced ? 'sincronizado' : 'no sincronizado'} - Click para forzar sync (Ctrl+Shift+L)`}
      >
        {isLanguageSynced ? '✅' : '🔄'} Lang
      </button>

      <ExecutionDashboard
        isVisible={isDashboardVisible}
        onClose={() => setIsDashboardVisible(false)}
        currentMetrics={executionMetrics}
      />

      {isDetectingLanguage && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20 bg-purple-500/90 text-white px-3 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="animate-pulse w-4 h-4 bg-white rounded-full"></div>
            <span className="text-sm font-medium">🔍 Sincronizando lenguaje...</span>
          </div>
        </div>
      )}

      <ExecutionStatusIndicator
        status={status}
        onCancel={cancelPending}
        onForceExecute={forceExecute}
      />

      {isLoadingSession && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20 bg-blue-500/90 text-white px-3 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            <span className="text-sm font-medium">🔄 Cargando sesión...</span>
          </div>
        </div>
      )}

      {(isTransforming || isRunning) && (
        <div className="absolute top-2 left-4 z-10 bg-blue-500/90 text-white px-3 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            <span className="text-sm font-medium">
              {isTransforming ? "🔄 Transformando..." : "⚡ Ejecutando..."}
            </span>
          </div>
        </div>
      )}

      <Editor
        height="100%"
        language={activeFile.language}
        value={activeFile.content}
        theme={`custom-${themeManager.getCurrentThemeName()}`}
        onChange={handleEditorChange}
        beforeMount={handleEditorWillMountWrapper}
        onMount={handleEditorDidMountWrapper}
        options={editorOptions}
      />
    </div>
  );
}

export default EDITOR;