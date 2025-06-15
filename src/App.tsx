import {
  useContext,
  useCallback,
  useEffect,
  useState,
  useRef,
  Suspense,
  Component,
  ErrorInfo,
  ReactNode,
} from "react";
import Editor from "./components/Editor";
import {
  CodeContext,
  CodeResultContext,
  type ResultElement,
} from "./context/CodeContext";
import Result from "./components/Result";
import Toolbar from "./components/Toolbar";
import ToolbarSettings from "./components/ToolbarSettings";
import FileManager from "./components/FileManager";
import { PackageManager } from "./components/PackageManager";
import EnvironmentVariables from "./components/EnvironmentVariables";
import SnippetManager from "./components/SnippetManager";
import { ToolbarProvider } from "./context/ToolbarContext";
import { ConfigProvider, useConfig } from "./context/ConfigContext";
import { WorkspaceProvider, useWorkspace } from "./context/WorkspaceContext";
import { PackageManagerProvider, usePackageManager } from "./context/PackageManagerContext";
import { SnippetsProvider } from "./context/SnippetsContext";
import { NotificationProvider } from "./components/SmartNotification";
import { useCodeEditor } from "./hooks/useCodeEditor";
import { useContextMenu } from "./hooks/useContextMenu";
import Split from "react-split";
import { useSplitLayout } from "./hooks/useSplitLayout";

// Error Boundary para capturar errores de contexto
class ContextErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Context Error Boundary:", error, errorInfo);

    // Si es un error de contexto, intentar recuperarse automáticamente
    if (
      error.message.includes("useWorkspace") ||
      error.message.includes("Context")
    ) {
      setTimeout(() => {
        this.setState({ hasError: false, error: null });
      }, 1000);
    }
  }

  render() {
    if (this.state.hasError) {
      return <ContextErrorFallback />;
    }

    return this.props.children;
  }
}

// Componente de error fallback para contexto
function ContextErrorFallback() {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <h2 className="text-xl mb-4">🔄 Recargando contexto...</h2>
        <p className="text-gray-400">
          Detectado hot reload, reinicializando aplicación
        </p>
      </div>
    </div>
  );
}

function AppContent() {
  const { result, setResult } = useContext(CodeResultContext);
  const { state, actions } = useWorkspace();
  const { direction, sizes, gutterSize, handleDragEnd } = useSplitLayout();
  const [showPackageManager, setShowPackageManager] = useState(false);
  const [showEnvVars, setShowEnvVars] = useState(false);
  const [showSnippetManager, setShowSnippetManager] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<any>(null);

  const editorRef = useRef<any>(null);

  // Obtener archivo activo y sus estadísticas
  const activeFile = state.files.find(f => f.id === state.activeFileId);

  // Hook para ejecución de código integrado con workspace
  const { isRunning, isTransforming, error, clearError, runCode } =
    useCodeEditor({
      onResult: setResult,
      onCodeChange: (code: string) => {
        if (activeFile) {
          actions.updateFileContent(activeFile.id, code);
        }
      },
    });

  // Variables derivadas para compatibilidad con Toolbar
  const isExecuting = isRunning || isTransforming;
  const canCancel = false; // El hook actual no soporta cancelación
  const executionStats = {
    resultsCount: Array.isArray(result) ? result.length : 0,
    lastExecution: Date.now(),
    isThrottled: false,
  };

  // Función para limpiar resultados
  const clearResults = useCallback(() => {
    setResult("");
    clearError(); // Usar clearError del hook
  }, [setResult, clearError]);

  // Callbacks para mostrar las pestañas
  const handleShowPackageManager = useCallback(() => {
    setShowPackageManager(true);
  }, []);

  const handleShowEnvironmentVariables = useCallback(() => {
    setShowEnvVars(true);
  }, []);

  const handleShowSnippetManager = useCallback(() => {
    setShowSnippetManager(true);
  }, []);

  // Hook para el menú contextual global
  const { showNativeContextMenu: globalShowNativeContextMenu } = useContextMenu({
    onClearResults: clearResults,
    onShowPackageManager: handleShowPackageManager,
    onShowEnvironmentVariables: handleShowEnvironmentVariables,
    onShowSnippetManager: handleShowSnippetManager,
  });

  // Listener global para click derecho
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      // Usar el menú nativo de Electron si está disponible
      globalShowNativeContextMenu();
    };

    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [globalShowNativeContextMenu]);

  // Función para cancelar ejecución (placeholder ya que no está soportado)
  const handleCancelExecution = useCallback(() => {
    console.log("Cancelación no soportada en la versión actual");
  }, []);

  // Función para ejecutar código usando el hook
  const handleRunCode = useCallback(() => {
    if (activeFile && activeFile.content) {
      runCode(activeFile.content);
    }
  }, [activeFile, runCode]);

  return (
    <div className="h-screen flex flex-col relative bg-gray-900">
      {/* Toolbar integrado con workspace */}
      <Toolbar
        onClearResults={clearResults}
        resultCount={executionStats.resultsCount}
        errorCount={error ? 1 : 0}
        isExecuting={isExecuting}
        canCancel={canCancel}
        onCancelExecution={handleCancelExecution}
        onShowSnippetManager={handleShowSnippetManager}
        editorRef={editorRef}
        executionStats={executionStats}
        executionStatus={executionStatus}
      />

      {/* FileManager con pestañas mejoradas */}
      <FileManager />

      {/* Layout principal con split */}
      <Split
        className={`flex ${direction} flex-1 overflow-hidden`}
        sizes={sizes}
        gutterSize={gutterSize}
        cursor="col-resize"
        onDragEnd={handleDragEnd}
      >
        <div className="relative overflow-hidden">
          <Editor editorRef={editorRef} onStatusChange={setExecutionStatus} />

          {/* Indicador de estado del archivo activo */}
          {activeFile && !isExecuting && (
            <div className="absolute bottom-2 left-2 z-10 bg-gray-800/90 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-300">
              <span className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    activeFile.isUnsaved ? "bg-orange-400" : "bg-green-400"
                  }`}
                ></div>
                {activeFile.language} • {activeFile.content.length} caracteres
                {activeFile.isUnsaved && (
                  <span className="text-orange-400">• Sin guardar</span>
                )}
              </span>
            </div>
          )}

          {/* Botón para ejecutar código */}
          {activeFile && (
            <div className="absolute bottom-2 right-2 z-10">
              <button
                onClick={handleRunCode}
                disabled={isExecuting}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs rounded-md transition-colors"
              >
                {isExecuting ? "Ejecutando..." : "Ejecutar"}
              </button>
            </div>
          )}
        </div>

        <div className="relative overflow-hidden">
          <Result editorRef={editorRef} />

          {/* Información de resultados en la parte inferior */}
          {executionStats.resultsCount > 0 && (
            <div className="absolute bottom-2 right-2 z-10 bg-gray-800/90 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-300">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                {executionStats.resultsCount} resultado
                {executionStats.resultsCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Mostrar errores si existen */}
          {error && (
            <div className="absolute top-2 right-2 z-10 bg-red-800/90 border border-red-700 rounded-md px-2 py-1 text-xs text-red-300">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                Error en ejecución
              </span>
            </div>
          )}
        </div>
      </Split>

      {/* Settings del toolbar */}
      <ToolbarSettings />

      {/* Gestor de Paquetes */}
      {showPackageManager && (
        <PackageManager
          isOpen={showPackageManager}
          onClose={() => setShowPackageManager(false)}
        />
      )}

      {/* Variables de Entorno */}
      {showEnvVars && (
        <EnvironmentVariables
          isOpen={showEnvVars}
          onClose={() => setShowEnvVars(false)}
        />
      )}

      {/* Gestor de Snippets */}
      {showSnippetManager && (
        <SnippetManager
          isOpen={showSnippetManager}
          onClose={() => setShowSnippetManager(false)}
        />
      )}

      {/* Indicador global de estado si no hay archivos */}
      {state.files.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm z-40">
          <div className="text-center text-gray-400">
            <p className="text-xl mb-4">🚀 Bienvenido a JSRunner</p>
            <p className="text-sm mb-6">
              Crea tu primer archivo para comenzar a programar
            </p>
            <div className="space-y-3">
              <button
                onClick={() => actions.createFile("main.js", "javascript")}
                className="block mx-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Crear archivo
              </button>
              <p className="text-xs text-gray-500">
                O haz click derecho para acceder a templates y más opciones
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapper seguro para AppContent que maneja errores de contexto
function SafeAppContent() {
  try {
    return <AppContent />;
  } catch (error) {
    // Si hay error de contexto, mostrar fallback
    if (error instanceof Error && error.message.includes("useWorkspace")) {
      console.warn("Context error detected, reloading...", error);
      return <ContextErrorFallback />;
    }
    // Re-lanzar otros errores
    throw error;
  }
}

function App() {
  const [code, setCode] = useState<string>("");
  const [result, setResult] = useState<ResultElement[] | string>("");

  return (
    <>
      <CodeContext.Provider value={{ code, setCode }}>
        <CodeResultContext.Provider value={{ result, setResult }}>
          <ConfigProvider>
            <WorkspaceProvider>
              <ToolbarProvider>
                <PackageManagerProvider>
                  <SnippetsProvider>
                    <NotificationProvider>
                      <Suspense fallback={<ContextErrorFallback />}>
                        <ContextErrorBoundary>
                          <SafeAppContent />
                        </ContextErrorBoundary>
                      </Suspense>
                    </NotificationProvider>
                  </SnippetsProvider>
                </PackageManagerProvider>
              </ToolbarProvider>
            </WorkspaceProvider>
          </ConfigProvider>
        </CodeResultContext.Provider>
      </CodeContext.Provider>
    </>
  );
}

export default App;
