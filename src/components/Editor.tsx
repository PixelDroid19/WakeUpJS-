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

  const activeFile = utils.getActiveFile();

  const {
    isRunning,
    isTransforming,
    runCode,
    monacoRef,
    executionMetrics,
  } = useCodeEditor({
    onResult: setResult,
    onCodeChange: (code: string) => {
      if (activeFile) {
        actions.updateFileContent(activeFile.id, code);
      }
    },
  });

  // Hook de sincronización Monaco-Workspace
  const { syncLanguage, forceSync, isLanguageSynced } = useMonacoWorkspaceSync({
    editorInstance: editorInstanceRef.current,
    monacoInstance: monacoInstanceRef.current,
    onLanguageChange: (language) => {
      console.log('🔄 Lenguaje cambiado en Monaco:', language);
      setIsDetectingLanguage(false);
    }
  });

  const { handler, status, cancelPending, forceExecute, executeImmediately, isAutoExecutionEnabled } =
    useDebouncedCodeRunner({
      runCode: (code: string) => runCode(code),
      onStatusChange: (status) => {
        if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
          console.log("🔄 Estado de ejecución:", status);
        }
      },
      onCodeClear: () => {
        setResult("");
        if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
          console.log("🧹 Código eliminado, resultados limpiados");
        }
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

  useEffect(() => {
    if (!sessionLoadAttemptedRef.current && !isLoadingSession) {
      sessionLoadAttemptedRef.current = true;
      const hasExecutableContent = loadSession();

      if (hasExecutableContent) {
        if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
          console.log(SYSTEM_MESSAGES.SESSION_RESTORED);
        }
        setResult("");
        sessionJustLoadedRef.current = true;
        hasExecutableContentRef.current = true;

        setTimeout(() => {
          sessionJustLoadedRef.current = false;
        }, SESSION_CONFIG.DEBOUNCE_DELAY);
      } else {
        setResult("");
      }
    }
  }, [loadSession, isLoadingSession, setResult]);

  useEffect(() => {
    if (!activeFile || isLoadingSession) return;

    const currentCode = activeFile.content || '';

    if (currentCode === lastExecutedCodeRef.current && initialExecutionDoneRef.current) {
      if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
        console.log(SYSTEM_MESSAGES.AVOIDING_REEXECUTION);
      }
      return;
    }

    if (sessionJustLoadedRef.current) {
      if (isAutoExecutionEnabled && hasExecutableContentRef.current && currentCode.trim() !== '') {
        if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
          console.log(SYSTEM_MESSAGES.AUTO_EXECUTING);
        }
        executeImmediately(currentCode);
        lastExecutedCodeRef.current = currentCode;
        initialExecutionDoneRef.current = true;
      }

      if (SESSION_CONFIG.AUTO_RESTORE_CURSOR && editorInstanceRef.current && monacoInstanceRef.current) {
        const savedPosition = getCursorPosition(activeFile.id);
        if (savedPosition) {
          editorInstanceRef.current.setPosition({
            lineNumber: savedPosition.line,
            column: savedPosition.column,
          });
        }
      }
      return;
    }

    if (currentCode.trim() !== '' && currentCode !== lastExecutedCodeRef.current) {
      if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
        console.log(SYSTEM_MESSAGES.AUTO_EXECUTING_DEBOUNCE);
      }
      handler(currentCode);
      lastExecutedCodeRef.current = currentCode;
      initialExecutionDoneRef.current = true;

      if (SESSION_CONFIG.AUTO_RESTORE_CURSOR && editorInstanceRef.current && monacoInstanceRef.current) {
        const savedPosition = getCursorPosition(activeFile.id);
        if (savedPosition) {
          editorInstanceRef.current.setPosition({
            lineNumber: savedPosition.line,
            column: savedPosition.column,
          });
        }
      }
    } else if (currentCode.trim() === '') {
      if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
        console.log(SYSTEM_MESSAGES.EDITOR_EMPTY);
      }
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
    setTimeout(() => {
      if (activeFile && activeFile.content) {
        console.log('🔄 Sincronizando lenguaje después del mount');
        syncLanguage();
      }
    }, 200);

    editor.onDidChangeCursorPosition((e: any) => {
      if (activeFile) {
        saveCursorPosition(
          activeFile.id,
          e.position.lineNumber,
          e.position.column
        );
      }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveSession(AUTO_SAVE_CONFIG.FORCE_SAVE_ON_EXIT);
      if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
        console.log(SYSTEM_MESSAGES.SESSION_SAVED_FORCED);
      }
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
      console.log('🔄 Forzando sincronización de lenguaje (Ctrl+Shift+L)');
      setIsDetectingLanguage(true);
      forceSync();
    });
  }

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined && activeFile) {
        actions.updateFileContent(activeFile.id, value);
        handler(value);
        
        // Usar la detección centralizada para cambios significativos
        const hasSignificantChange = LANGUAGE_DETECTION_CONFIG.SIGNIFICANT_PATTERNS.some(pattern => 
          pattern.test(value)
        );
        
        if (hasSignificantChange && !isLanguageSynced) {
          console.log('🔍 Sintaxis significativa detectada durante edición, sincronizando...');
          setIsDetectingLanguage(true);
          
          setTimeout(() => {
            syncLanguage();
          }, 500);
        }
      }
    },
    [activeFile, actions, handler, syncLanguage, isLanguageSynced]
  );

  // Sincronizar cuando cambia el archivo activo
  useEffect(() => {
    if (activeFile && editorInstanceRef.current && monacoInstanceRef.current) {
      console.log('📂 Archivo activo cambió, verificando sincronización:', {
        fileId: activeFile.id,
        fileName: activeFile.name,
        language: activeFile.language
      });
      
      // Forzar sincronización después de un pequeño delay
      setTimeout(() => {
        forceSync();
      }, 300);
    }
  }, [activeFile?.id, forceSync]);

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