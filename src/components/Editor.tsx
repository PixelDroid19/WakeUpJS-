import { useContext, useEffect, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { CodeResultContext } from "../context/CodeContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { usePackageManager } from "../context/PackageManagerContext";
import { useSnippets } from "../context/SnippetsContext";
import { useCodeEditor } from "../hooks/useCodeEditor";
import { useDebouncedCodeRunner } from "../hooks/useDebouncedCodeRunner";
import { useAutoSave } from "../hooks/useAutoSave";
import { EDITOR_CONFIG, EDITOR_THEMES } from "../constants/config";
import {
  handleEditorWillMount,
  handleEditorDidMount,
  refreshPackageCompletions,
  setupSnippets,
  refreshSnippets,
} from "../lib/monaco/monacoSetup";
import ExecutionStatusIndicator from "./ExecutionStatusIndicator";

interface EditorProps {
  editorRef?: React.MutableRefObject<any>;
}

function EDITOR({ editorRef }: EditorProps = {}) {
  const { setResult } = useContext(CodeResultContext);
  const { actions, utils } = useWorkspace();
  const { installedPackages } = usePackageManager();
  const { state: snippetsState, actions: snippetsActions } = useSnippets();

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
  } = useCodeEditor({
    onResult: setResult,
    onCodeChange: (code: string) => {
      if (activeFile) {
        actions.updateFileContent(activeFile.id, code);
      }
    },
  });

  // Hook de debounce inteligente con estado visual
  const { handler, status, cancelPending, forceExecute } =
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

  // Hook de autosave con integración al debounce inteligente
  const {
    saveSession,
    loadSession,
    saveCursorPosition,
    getCursorPosition,
    lastSaved,
    isAutoSaveEnabled,
    isLoadingSession,
  } = useAutoSave({
    enabled: true,
    interval: 5000, // Guardar cada 5 segundos
    debounceDelay: 1000, // Delay de 1 segundo tras parar de escribir
    executionStatus: status, // 🔄 Nuevo: integración con debounce inteligente
  });

  // Referencia para evitar cargas múltiples
  const hasLoadedSessionRef = useRef(false);

  // Referencias adicionales para controlar ejecución automática
  const isInitialLoadRef = useRef(true);
  const sessionJustLoadedRef = useRef(false);

  // Cargar sesión al montar el componente (solo una vez)
  useEffect(() => {
    if (!hasLoadedSessionRef.current && !isLoadingSession) {
      hasLoadedSessionRef.current = true;
      const sessionLoaded = loadSession();
      if (sessionLoaded) {
        console.log("🔄 Sesión anterior restaurada");
        // Limpiar resultados anteriores al cargar sesión para evitar confusión
        setResult("");
        sessionJustLoadedRef.current = true;
        // Después de un tiempo, permitir ejecución automática nuevamente
        setTimeout(() => {
          sessionJustLoadedRef.current = false;
        }, 1000);
      } else {
        // Si no se cargó una sesión, también limpiar resultados
        setResult("");
      }
      // Marcar que la carga inicial ha terminado
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 500);
    }
  }, [loadSession, isLoadingSession, setResult]);

  // Ejecutar código cuando cambie el archivo activo (pero no en carga inicial)
  useEffect(() => {
    // No ejecutar en la carga inicial o si acabamos de cargar una sesión
    if (isInitialLoadRef.current || sessionJustLoadedRef.current) {
      // Solo restaurar posición del cursor sin ejecutar
      if (activeFile && editorInstanceRef.current && monacoInstanceRef.current) {
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

    // Solo ejecutar si hay contenido y no estamos en carga inicial
    if (activeFile?.content && activeFile.content.trim() !== "") {
      runCode(activeFile.content);

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
    }
  }, [activeFile?.id, getCursorPosition, runCode]); // Solo cuando cambie de archivo, no el contenido

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
