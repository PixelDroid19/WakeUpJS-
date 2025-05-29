import { useContext, useEffect, useRef, useCallback, useState } from "react";
import Editor from "@monaco-editor/react";
import { CodeResultContext } from "../context/CodeContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { usePackageManager } from "../context/PackageManagerContext";
import { useSnippets } from "../context/SnippetsContext";
import { useCodeEditor } from "../hooks/useCodeEditor";
import { useDebouncedCodeRunner } from "../hooks/useDebouncedCodeRunner";
import { useAutoSave } from "../hooks/useAutoSave";
import { useAutoExecutionConfig } from "../context/ConfigContext";
import { EDITOR_CONFIG, EDITOR_THEMES } from "../constants/config";
import {
  handleEditorWillMount,
  handleEditorDidMount,
  refreshPackageCompletions,
  setupSnippets,
  refreshSnippets,
} from "../lib/monaco/monacoSetup";
import ExecutionStatusIndicator from "./ExecutionStatusIndicator";
import ExecutionDashboard from "./ExecutionDashboard";

interface EditorProps {
  editorRef?: React.MutableRefObject<any>;
}

function EDITOR({ editorRef }: EditorProps = {}) {
  const { setResult } = useContext(CodeResultContext);
  const { actions, utils } = useWorkspace();
  const { installedPackages } = usePackageManager();
  const { state: snippetsState, actions: snippetsActions } = useSnippets();
  const [isDashboardVisible, setIsDashboardVisible] = useState(false);
  const autoExecutionConfig = useAutoExecutionConfig();

  // Referencia para Monaco y el editor
  const monacoInstanceRef = useRef<any>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const editorInstanceRef = useRef<any>(null);

  // Obtener el archivo activo
  const activeFile = utils.getActiveFile();

  // Hook para manejar la lógica del editor con integración de workspace
  const {
    isRunning,
    isTransforming,
    runCode,
    monacoRef,
    error,
    errorInfo,
    clearError,
    executionMetrics,
    cancelExecution,
  } = useCodeEditor({
    onResult: setResult,
    onCodeChange: (code: string) => {
      if (activeFile) {
        actions.updateFileContent(activeFile.id, code);
      }
    },
  });

  // Hook de debounce inteligente con estado visual
  const { handler, status, cancelPending, forceExecute, executeImmediately, isAutoExecutionEnabled } =
    useDebouncedCodeRunner({
      runCode: (code: string) => runCode(code),
      onStatusChange: (status) => {
        // Opcional: logging para debugging
        console.log("🔄 Estado de ejecución:", status);
      },
      onCodeClear: () => {
        // Limpiar resultados cuando se borre todo el código
        setResult("");
        console.log("🧹 Código eliminado, resultados limpiados");
      },
    });

  // Hook de autosave con integración al debounce inteligente optimizado
  const {
    saveSession,
    loadSession,
    saveCursorPosition,
    getCursorPosition,
    lastSaved,
    isAutoSaveEnabled,
    isLoadingSession,
  } = useAutoSave({
    executionStatus: status, 
  });

  // Referencia para evitar cargas múltiples
  const sessionLoadAttemptedRef = useRef(false);

  // Referencias adicionales para controlar ejecución automática
  const sessionJustLoadedRef = useRef(false);
  const hasExecutableContentRef = useRef(false);
  const runCodeRef = useRef(runCode);
  const lastExecutedCodeRef = useRef<string>('');
  const initialExecutionDoneRef = useRef(false);

  // Actualizar la ref cuando runCode cambie
  useEffect(() => {
    runCodeRef.current = runCode;
  }, [runCode]);

  // Cargar sesión al montar el componente (solo una vez)
  useEffect(() => {
    if (!sessionLoadAttemptedRef.current && !isLoadingSession) {
      sessionLoadAttemptedRef.current = true;
      const hasExecutableContent = loadSession();
      
      if (hasExecutableContent) {
        console.log("🔄 Sesión anterior restaurada con contenido ejecutable");
        // Limpiar resultados anteriores al cargar sesión para evitar confusión
        setResult("");
        sessionJustLoadedRef.current = true;
        hasExecutableContentRef.current = true;
        
        // Después de un tiempo, permitir ejecución automática nuevamente
        setTimeout(() => {
          sessionJustLoadedRef.current = false;
          // En este punto, el useEffect de activeFile debería ejecutar el código automáticamente
        }, 1000);
      } else {
        // Si no se cargó una sesión o no hay contenido ejecutable, limpiar resultados
        setResult("");
      }
    }
  }, [loadSession, isLoadingSession, setResult]);

  // Ejecutar código cuando cambie el archivo activo o al iniciar la aplicación
  useEffect(() => {
    // No ejecutar si no hay archivo activo o si está cargando sesión
    if (!activeFile || isLoadingSession) return;
    
    const currentCode = activeFile.content || '';
    
    // Si el código es el mismo que ya ejecutamos, evitar ejecutarlo de nuevo
    if (currentCode === lastExecutedCodeRef.current && initialExecutionDoneRef.current) {
      console.log("⏭️ Evitando re-ejecución del mismo código");
      return;
    }
    
    // Si estamos justo después de cargar sesión
    if (sessionJustLoadedRef.current) {
      // Si hay auto ejecución activa y contenido ejecutable, ejecutar una sola vez
      if (isAutoExecutionEnabled && hasExecutableContentRef.current && currentCode.trim() !== '') {
        console.log("⚡ Ejecutando código inicial automáticamente");
        executeImmediately(currentCode);
        lastExecutedCodeRef.current = currentCode;
        initialExecutionDoneRef.current = true;
      }
      
      // Restaurar posición del cursor sin importar si se ejecuta o no
      if (editorInstanceRef.current && monacoInstanceRef.current) {
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

    // Para cambios normales de archivo activo (solo si el contenido ha cambiado)
    if (currentCode.trim() !== '' && currentCode !== lastExecutedCodeRef.current) {
      console.log("🔄 Auto-ejecutando código existente");
      runCodeRef.current(currentCode);
      lastExecutedCodeRef.current = currentCode;
      initialExecutionDoneRef.current = true;

      // Restaurar posición del cursor
      if (editorInstanceRef.current && monacoInstanceRef.current) {
        const savedPosition = getCursorPosition(activeFile.id);
        if (savedPosition) {
          editorInstanceRef.current.setPosition({
            lineNumber: savedPosition.line,
            column: savedPosition.column,
          });
        }
      }
    } else if (currentCode.trim() === '') {
      // Si hay un archivo activo pero está vacío, limpiar resultados
      console.log("📄 Editor vacío, limpiando resultados");
      setResult("");
      lastExecutedCodeRef.current = '';
    }
  }, [activeFile, getCursorPosition, setResult, executeImmediately, isAutoExecutionEnabled, isLoadingSession]);

  // Actualizar autocompletado cuando cambien los paquetes instalados
  useEffect(() => {
    if (monacoInstanceRef.current) {
      refreshPackageCompletions(monacoInstanceRef.current);
    }
  }, [installedPackages]);

  // Configurar snippets cuando cambien
  useEffect(() => {
    if (monacoInstanceRef.current) {
      setupSnippets(monacoInstanceRef.current, () => snippetsState.snippets);
    }
  }, [snippetsState.snippets]);

  // Función para actualizar snippets
  const updateSnippets = useCallback(() => {
    if (monacoInstanceRef.current) {
      refreshSnippets(monacoInstanceRef.current);
    }
  }, []);

  function handleEditorWillMountWrapper(monaco: any) {
    monacoInstanceRef.current = monaco;
    cleanupRef.current = handleEditorWillMount(monaco);
  }

  function handleEditorDidMountWrapper(editor: any, monaco: any) {
    // Almacenar la instancia de monaco para uso futuro
    monacoRef.current = monaco;
    monacoInstanceRef.current = monaco;
    editorInstanceRef.current = editor;

    // Establecer la referencia externa si se proporciona
    if (editorRef) {
      editorRef.current = editor;
    }

    // Configurar el editor con el nuevo sistema
    handleEditorDidMount(editor, monaco);

    // Escuchar cambios de posición del cursor para autosave
    editor.onDidChangeCursorPosition((e: any) => {
      if (activeFile) {
        saveCursorPosition(
          activeFile.id,
          e.position.lineNumber,
          e.position.column
        );
      }
    });

    // Configurar comando personalizado de guardado
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveSession(true); // Forzar guardado manual
      console.log("💾 Sesión guardada manualmente (forzada)");
    });

    // Agregar comando para ejecución forzada (Ctrl+Enter)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (status.type === "pending" || status.type === "debouncing") {
        forceExecute();
      }
    });

    // Agregar comando para cancelar ejecución (Escape)
    editor.addCommand(monaco.KeyCode.Escape, () => {
      if (status.type === "pending" || status.type === "debouncing") {
        cancelPending();
      }
    });
  }

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  // Manejar cambios en el editor con debounce inteligente
  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined && activeFile) {
        actions.updateFileContent(activeFile.id, value);
        handler(value); // Usar el handler del debounce inteligente
      }
    },
    [activeFile, actions, handler]
  );

  // Función para formatear el tiempo de último guardado
  const formatLastSaved = (timestamp: number): string => {
    if (!timestamp) return "Sin guardar";

    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return "Guardado hace unos segundos";
    if (diff < 3600000) return `Guardado hace ${Math.floor(diff / 60000)} min`;
    return `Guardado hace ${Math.floor(diff / 3600000)} h`;
  };

  // Si no hay archivo activo, mostrar mensaje
  if (!activeFile) {
    return (
      <div className="h-full flex items-center justify-center bg-[#1e1e1e] text-gray-400">
        <div className="text-center">
          {isLoadingSession ? (
            <>
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
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
      {/* Botón del Dashboard */}
      <button
        onClick={() => setIsDashboardVisible(true)}
        className="absolute top-2 right-4 z-20 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
        title="Abrir Dashboard de Métricas"
      >
        📊 Métricas
      </button>

      {/* Dashboard Modal */}
      <ExecutionDashboard
        isVisible={isDashboardVisible}
        onClose={() => setIsDashboardVisible(false)}
        currentMetrics={executionMetrics}
      />

      {/* Indicador de estado de ejecución */}
      <ExecutionStatusIndicator
        status={status}
        onCancel={cancelPending}
        onForceExecute={forceExecute}
      />

      {/* Indicador de carga de sesión */}
      {isLoadingSession && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20 bg-blue-500/90 text-white px-3 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            <span className="text-sm font-medium">🔄 Cargando sesión...</span>
          </div>
        </div>
      )}

      {/* Indicador de estado de transformación/ejecución (secundario) */}
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

      {/* Editor principal */}
      <Editor
        height="100%"
        language={activeFile.language}
        value={activeFile.content}
        onChange={handleEditorChange}
        theme={EDITOR_THEMES.DARK}
        beforeMount={handleEditorWillMountWrapper}
        onMount={handleEditorDidMountWrapper}
        options={{
          fontSize: EDITOR_CONFIG.FONT_SIZE,
          tabSize: EDITOR_CONFIG.TAB_SIZE,
          wordWrap: "on",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          lineNumbers: "on",
          renderWhitespace: "selection",
          glyphMargin: true,
          folding: true,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
          scrollbar: {
            vertical: "visible",
            horizontal: "visible",
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showFunctions: true,
          },
        }}
      />
    </div>
  );
}

export default EDITOR;
