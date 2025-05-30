import { useContext, useMemo, useRef, useEffect, useCallback } from "react";
import { CodeResultContext, ResultElement } from "../context/CodeContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { useToolbar } from "../context/ToolbarContext";
import { useAutoExecutionConfig } from "../context/ConfigContext";
import { useCodeEditor } from "../hooks/useCodeEditor";
import Editor from "@monaco-editor/react";
import { EDITOR_CONFIG } from "../constants/config";
import { themeManager } from "../lib/themes/theme-manager";
import {
  ConsoleMethod,
  Colors,
} from "../types/result";

const CONSOLE_METHOD_PREFIXES: {
  [key in ConsoleMethod]: { prefix: string; color: Colors };
} = {
  [ConsoleMethod.LOG]: { prefix: "📝 ", color: Colors.GRAY },
  [ConsoleMethod.WARN]: { prefix: "⚠️ ", color: Colors.WARNING },
  [ConsoleMethod.ERROR]: { prefix: "❌ ", color: Colors.ERROR },
  [ConsoleMethod.INFO]: { prefix: "ℹ️ ", color: Colors.INFO },
  [ConsoleMethod.DEBUG]: { prefix: "🐛 ", color: Colors.GRAY },
  [ConsoleMethod.TABLE]: { prefix: "📋 ", color: Colors.BLUE },
  [ConsoleMethod.DIR]: { prefix: "📁 ", color: Colors.BLUE },
  [ConsoleMethod.DIRXML]: { prefix: "🌐 ", color: Colors.BLUE },
  [ConsoleMethod.TRACE]: { prefix: "🔍 ", color: Colors.INFO },
  [ConsoleMethod.GROUP]: { prefix: "📂 ", color: Colors.PURPLE },
  [ConsoleMethod.GROUP_COLLAPSED]: { prefix: "📁 ", color: Colors.PURPLE },
  [ConsoleMethod.GROUP_END]: { prefix: "📪 ", color: Colors.PURPLE },
  [ConsoleMethod.COUNT]: { prefix: "🔢 ", color: Colors.CYAN },
  [ConsoleMethod.COUNT_RESET]: { prefix: "🔄 ", color: Colors.CYAN },
  [ConsoleMethod.TIME]: { prefix: "⏱️ ", color: Colors.YELLOW },
  [ConsoleMethod.TIME_END]: { prefix: "⏹️ ", color: Colors.YELLOW },
  [ConsoleMethod.TIME_LOG]: { prefix: "📊 ", color: Colors.YELLOW },
  [ConsoleMethod.TIME_STAMP]: { prefix: "🕐 ", color: Colors.YELLOW },
  [ConsoleMethod.PROFILE]: { prefix: "📈 ", color: Colors.MAGENTA },
  [ConsoleMethod.PROFILE_END]: { prefix: "📉 ", color: Colors.MAGENTA },
  [ConsoleMethod.ASSERT]: { prefix: "✅ ", color: Colors.ERROR },
  [ConsoleMethod.CLEAR]: { prefix: "🧹 ", color: Colors.GRAY },
  [ConsoleMethod.CONTEXT]: { prefix: "🌍 ", color: Colors.GREEN },
  [ConsoleMethod.CREATE_TASK]: { prefix: "⚙️ ", color: Colors.GREEN },
};

function Result() {
  const { result } = useContext(CodeResultContext);
  const { utils } = useWorkspace();
  const { config } = useToolbar();
  const autoExecutionConfig = useAutoExecutionConfig();
  const editorRef = useRef<any>(null); // Referencia al editor de Monaco

  // Obtener elementos de useCodeEditor para mostrar errores y control de ejecución
  const { 
    error, 
    errorInfo, 
    clearError, 
    cancelExecution,
    isRunning,
    isTransforming
  } = useCodeEditor({
    onResult: () => {}, // No necesitamos manejar resultados aquí, ya que lo hace CodeResultContext
    onCodeChange: () => {}, // No necesitamos manejar cambios de código aquí
  });

  const activeFile = utils.getActiveFile();

  // Asegurar que elements sea un array de ResultElement
  let elements: ResultElement[] = useMemo(
    () => (Array.isArray(result) ? result : []),
    [result]
  );

  // Filtrar valores undefined si la opción está activada
  if (config.hideUndefined) {
    elements = elements.filter((element) => {
      const content = String(element.element.content); // Convertir a string para una comparación segura
      return content !== "undefined" && content.trim() !== "";
    });
  }

  function handleEditorWillMount(monaco: any) {
    // El sistema de temas se maneja automáticamente por el themeManager
    // Solo necesitamos establecer la instancia de Monaco si no está ya configurada
    if (!themeManager.getCurrentTheme()) {
      themeManager.setMonacoInstance(monaco);
    }
    
    monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
  }

  function handleEditorDidMount(editor: any) {
    editorRef.current = editor;
  }

  // Función para obtener el prefijo y color según el tipo de resultado
  const getResultPrefix = useCallback(
    (
      type: string,
      method?: string
    ): { prefix: string; color: Colors } => {
      if (method && CONSOLE_METHOD_PREFIXES[method as ConsoleMethod]) {
        return CONSOLE_METHOD_PREFIXES[method as ConsoleMethod];
      }

      switch (type) {
        case "error":
          return { prefix: "❌ ", color: Colors.ERROR };
        case "warning":
          return { prefix: "⚠️ ", color: Colors.WARNING };
        case "info":
          return { prefix: "ℹ️ ", color: Colors.INFO };
        default:
          return { prefix: "📝 ", color: Colors.GRAY };
      }
    },
    []
  );

  // Función para formatear el resultado con colores apropiados
  const formatResult = useCallback(
    (element: ResultElement): string => {
      const { prefix } = getResultPrefix(element.type, element.method);
      let content = element.element.content;

      // Convertir objetos a JSON legible si no son primitivos
      if (typeof content === "object" && content !== null) {
        try {
          content = JSON.stringify(content, null, 2); // Formato legible con 2 espacios de indentación
        } catch (e) {
          content = String(content); // Fallback a string si JSON.stringify falla
        }
      } else if (content === undefined || content === null) {
        content = config.hideUndefined ? "" : "[undefined]"; // Mostrar algo si no se ocultan
      } else {
        content = String(content); // Asegurarse de que sea string
      }

      // El color se manejará en el componente que renderice el span o en el propio monaco theme
      return `${prefix}${content}`;
    },
    [getResultPrefix, config.hideUndefined]
  );

  // Procesar resultados y agrupar por línea - MANTENER TODOS LOS LOGS
  const resultText = useMemo(() => {
    const resultsByLine = new Map<number, string[]>();
    const errorsWithoutLine: string[] = [];

    elements.forEach((data) => {
      const { lineNumber } = data;
      const formattedResult = formatResult(data);

      if (lineNumber && lineNumber > 0) {
        if (!resultsByLine.has(lineNumber)) {
          resultsByLine.set(lineNumber, []);
        }
        resultsByLine.get(lineNumber)!.push(formattedResult);
      } else {
        errorsWithoutLine.push(formattedResult);
      }
    });

    const lines: string[] = [];

    // Errores sin línea primero
    errorsWithoutLine.forEach((error) => lines.push(error));

    // Resultados por línea, ordenados
    const sortedLineNumbers = Array.from(resultsByLine.keys()).sort(
      (a, b) => a - b
    );
    sortedLineNumbers.forEach((lineNumber) => {
      const results = resultsByLine.get(lineNumber);
      if (results) {
        results.forEach((res) => lines.push(res));
      }
    });

    return lines.join("\n");
  }, [elements, formatResult]); // Dependencias para recalcular

  // Scroll automático al final del editor cuando cambian los resultados
  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        const lineCount = model.getLineCount();
        editorRef.current.revealLineInCenterIfOutsideViewport(lineCount);
      }
    }
  }, [resultText]);

  // Función para formatear un error específico
  const formatErrorMessage = (errorMessage: string, info?: any): string => {
    if (!errorMessage) return '';
    
    // Quitar prefijos comunes de errores para simplificar
    let cleanMessage = errorMessage
      .replace(/^Error: /, '')
      .replace(/^SyntaxError: /, 'Syntax: ');
    
    // Formatear ubicación del error si está disponible
    let location = '';
    if (info && info.line) {
      location = ` (línea ${info.line}${info.column ? `, columna ${info.column}` : ''})`;
    }
    
    return `❌ Error${info?.type ? ` de ${info.type}` : ''}: ${cleanMessage}${location}`;
  };

  // Efecto para manejar errores específicos del motor de ejecución
  useEffect(() => {
    if (error && !elements.some(e => e.type === "error")) {
      // Si hay un error del motor pero no está en los elementos de resultado,
      // podríamos añadirlo manualmente si tuviéramos acceso directo a la actualización
      console.error("Error detectado por el motor:", error);
    }
  }, [error, elements]);

  if (!elements || elements.length === 0) {
    return (
      <div className="text-cyan-50 bg-[#1e1e1e] flex items-center justify-center h-full">
        <div className="text-gray-400 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚡</span>
            </div>
          </div>
          <p className="text-lg font-medium">Resultados de Ejecución</p>
          
          {/* Mostrar error del motor si existe y no hay otros resultados */}
          {error && (
            <div className="mt-3 text-red-400 border border-red-800 rounded-md p-3 mx-auto max-w-md bg-red-900/20">
              <div className="text-sm font-medium mb-1">Error detectado:</div>
              <div className="text-xs overflow-auto max-h-32">
                {formatErrorMessage(error, errorInfo)}
              </div>
              <button 
                onClick={clearError}
                className="mt-2 px-2 py-1 text-xs bg-red-800/40 hover:bg-red-800/60 rounded"
              >
                Limpiar Error
              </button>
            </div>
          )}
          
          <p className="text-sm mt-2 opacity-75">
            {activeFile
              ? `Ejecuta código en ${activeFile.name}`
              : "Selecciona un archivo y ejecuta código"}
          </p>
          {activeFile && (
            <div className="mt-4 text-xs bg-gray-800/50 rounded-md px-3 py-2 inline-block">
              <span className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                {activeFile.name} ({activeFile.language})
              </span>
            </div>
          )}
          {autoExecutionConfig.enabled && (
            <div className="mt-3 text-xs text-green-400">
              <span className="flex items-center gap-1 justify-center">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                Ejecución automática activa
              </span>
            </div>
          )}
          
          {/* Mostrar estado de ejecución actual */}
          {(isRunning || isTransforming) && (
            <div className="mt-3 flex flex-col items-center">
              <div className="animate-pulse text-blue-400 text-xs flex items-center gap-1">
                <div className="animate-spin w-3 h-3 border border-blue-400 border-t-transparent rounded-full"></div>
                {isTransforming ? "Transformando código..." : "Ejecutando..."}
              </div>
              <button 
                onClick={() => cancelExecution()}
                className="mt-2 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="text-cyan-50 bg-[#1e1e1e] relative h-full">
      <Editor
        theme={`custom-${themeManager.getCurrentThemeName()}`}
        options={{
          domReadOnly: true,
          experimentalWhitespaceRendering: "svg",
          dragAndDrop: false,
          minimap: {
            enabled: false,
          },
          overviewRulerLanes: 0,
          scrollbar: {
            vertical: "auto",
            horizontal: "auto",
          },
          fontSize: EDITOR_CONFIG.FONT_SIZE - 2,
          fontFamily:
            "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
          wordWrap: "on",
          readOnly: true,
          lineNumbers: "on" as const, // Muestra los números de línea
          renderLineHighlight: "none" as const,
          showUnused: false,
          suggest: {
            selectionMode: "never",
            previewMode: "prefix",
          },
          padding: {
            top: activeFile ? 35 : 10,
            bottom: 10,
          },
          renderWhitespace: "selection",
          colorDecorators: true,
          lineHeight: 1.5,
          letterSpacing: 0.5,
          // Quitar borde de selección para mejorar la estética de solo lectura
          selectionHighlight: false,
          occurrencesHighlight: "off",
        }}
        defaultLanguage="javascript" // Ajusta si se necesita otro lenguaje por defecto
        value={resultText}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount} // Obtener la referencia al editor
      />

      {/* Panel de control de errores */}
      {error && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20 bg-red-900/90 text-white px-3 py-2 rounded-lg shadow-lg max-w-md">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="font-medium overflow-hidden text-ellipsis whitespace-nowrap">
              {formatErrorMessage(error, errorInfo)}
            </span>
            <button 
              onClick={clearError}
              className="ml-auto bg-red-800/50 hover:bg-red-800 px-2 py-1 rounded text-xs"
            >
              Limpiar
            </button>
          </div>
        </div>
      )}

      {/* Estadísticas en la parte inferior */}
      {elements.length > 0 && (
        <div className="absolute bottom-2 left-2 z-10 bg-gray-800/90 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-400">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
              {elements.length} resultado{elements.length !== 1 ? "s" : ""}
            </span>
            {elements.filter((e) => e.type === "error").length > 0 && (
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                {
                  elements.filter((e) => e.type === "error").length
                }{" "}
                error
                {elements.filter((e) => e.type === "error").length !==
                1
                  ? "es"
                  : ""}
              </span>
            )}
            {elements.filter((e) => e.type === "warning").length >
              0 && (
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                {
                  elements.filter((e) => e.type === "warning").length
                }{" "}
                warning
                {elements.filter((e) => e.type === "warning")
                  .length !== 1
                  ? "s"
                  : ""}
              </span>
            )}
          </span>
        </div>
      )}

      {/* Panel de controles (copiar y cancelar ejecución) */}
      <div className="absolute bottom-2 right-2 z-10 flex gap-2">
        {/* Botón para cancelar ejecución en progreso */}
        {(isRunning || isTransforming) && (
          <button
            onClick={() => cancelExecution()}
            className="bg-red-800/90 hover:bg-red-700 border border-red-700 rounded-md px-2 py-1 text-xs text-white"
            title="Cancelar ejecución"
          >
            ⏹️ Cancelar
          </button>
        )}
        
        {/* Botón para limpiar errores si hay alguno */}
        {error && (
          <button
            onClick={clearError}
            className="bg-yellow-800/90 hover:bg-yellow-700 border border-yellow-700 rounded-md px-2 py-1 text-xs text-white"
            title="Limpiar errores"
          >
            🧹 Limpiar errores
          </button>
        )}
        
        {/* Botón para copiar al portapapeles */}
        {resultText && (
          <button
            onClick={() => navigator.clipboard.writeText(resultText)}
            className="bg-gray-800/90 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-gray-700"
            title="Copiar resultados"
          >
            📋 Copiar
          </button>
        )}
      </div>
    </div>
  );
}

export default Result;
