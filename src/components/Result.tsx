import { useContext } from "react";
import { CodeResultContext, ResultElement } from "../context/CodeContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { useToolbar } from "../context/ToolbarContext";
import Editor from "@monaco-editor/react";
import { Colors } from "../lib/elementParser";
import { EDITOR_THEMES, EDITOR_CONFIG } from "../constants/config";

function Result() {
  const { result } = useContext(CodeResultContext);
  const { utils } = useWorkspace();
  const { config } = useToolbar();

  // Obtener archivo activo para mostrar información contextual
  const activeFile = utils.getActiveFile();

  // Asegurar que elements sea un array de ResultElement
  let elements: ResultElement[] = Array.isArray(result) ? result : [];

  // Filtrar valores undefined si la opción está activada
  if (config.hideUndefined) {
    elements = elements.filter((element) => {
      // Filtrar elementos que sean undefined o que contengan solo "undefined"
      const content = element.element.content;
      return content !== 'undefined' && content !== undefined && content !== '';
    });
  }

  function handleEditorWillMount(monaco: any) {
    // Configurar el tema personalizado
    import("./onedark.json")
      .then((data) => {
        monaco.editor.defineTheme(EDITOR_THEMES.DARK, data);
      })
      .catch((e) => console.log(e));

    monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
  }

  // Función para obtener el prefijo y color según el tipo de resultado
  function getResultPrefix(
    type: string,
    method?: string
  ): { prefix: string; color: string } {
    switch (type) {
      case "error":
        return { prefix: "❌ ", color: Colors.ERROR };
      case "warning":
        return { prefix: "⚠️ ", color: Colors.WARNING };
      case "info":
        return { prefix: "ℹ️ ", color: Colors.INFO };
      default:
        // Para diferentes métodos de console - Soporte completo
        switch (method) {
          // Métodos básicos
          case "log":
            return { prefix: "📝 ", color: Colors.GRAY };
          case "warn":
            return { prefix: "⚠️ ", color: Colors.WARNING };
          case "error":
            return { prefix: "❌ ", color: Colors.ERROR };
          case "info":
            return { prefix: "ℹ️ ", color: Colors.INFO };
          case "debug":
            return { prefix: "🐛 ", color: Colors.GRAY };
          
          // Métodos avanzados
          case "table":
            return { prefix: "📋 ", color: Colors.BLUE };
          case "dir":
            return { prefix: "📁 ", color: Colors.BLUE };
          case "dirxml":
            return { prefix: "🌐 ", color: Colors.BLUE };
          case "trace":
            return { prefix: "🔍 ", color: Colors.INFO };
          
          // Métodos de agrupación
          case "group":
            return { prefix: "📂 ", color: Colors.PURPLE };
          case "groupCollapsed":
            return { prefix: "📁 ", color: Colors.PURPLE };
          case "groupEnd":
            return { prefix: "📪 ", color: Colors.PURPLE };
          
          // Métodos de conteo y tiempo
          case "count":
            return { prefix: "🔢 ", color: Colors.CYAN };
          case "countReset":
            return { prefix: "🔄 ", color: Colors.CYAN };
          case "time":
            return { prefix: "⏱️ ", color: Colors.YELLOW };
          case "timeEnd":
            return { prefix: "⏹️ ", color: Colors.YELLOW };
          case "timeLog":
            return { prefix: "📊 ", color: Colors.YELLOW };
          case "timeStamp":
            return { prefix: "🕐 ", color: Colors.YELLOW };
          
          // Métodos de profiling
          case "profile":
            return { prefix: "📈 ", color: Colors.MAGENTA };
          case "profileEnd":
            return { prefix: "📉 ", color: Colors.MAGENTA };
          
          // Otros métodos
          case "assert":
            return { prefix: "✅ ", color: Colors.ERROR };
          case "clear":
            return { prefix: "🧹 ", color: Colors.GRAY };
          case "context":
            return { prefix: "🌍 ", color: Colors.GREEN };
          case "createTask":
            return { prefix: "⚙️ ", color: Colors.GREEN };
          
          default:
            return { prefix: "📝 ", color: Colors.GRAY };
        }
    }
  }

  // Función para formatear el resultado con colores apropiados
  function formatResult(element: ResultElement): string {
    const { prefix, color } = getResultPrefix(element.type, element.method);
    const content = element.element.content;

    // Si el contenido ya tiene color definido, respetarlo
    const resultColor = element.element.color || color;

    return `${prefix}${content}`;
  }

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
        </div>
      </div>
    );
  }

  // Procesar resultados y agrupar por línea - MANTENER TODOS LOS LOGS
  const resultsByLine = new Map<number, string[]>();
  const errorsWithoutLine: string[] = [];

  elements.forEach((data) => {
    const { lineNumber } = data;
    const formattedResult = formatResult(data);

    if (lineNumber && lineNumber > 0) {
      // Acumular logs de la misma línea en lugar de sobrescribirlos
      if (!resultsByLine.has(lineNumber)) {
        resultsByLine.set(lineNumber, []);
      }
      resultsByLine.get(lineNumber)!.push(formattedResult);
    } else {
      // Para errores sin línea específica (como ReferenceError, SyntaxError, etc.)
      errorsWithoutLine.push(formattedResult);
    }
  });

  // Crear array con errores sin línea primero, luego resultados por línea
  const resultLines: string[] = [...errorsWithoutLine];

  if (resultsByLine.size > 0) {
    const maxLineNumber = Math.max(...Array.from(resultsByLine.keys()));

    for (let i = 1; i <= maxLineNumber; i++) {
      const results = resultsByLine.get(i);
      if (results && results.length > 0) {
        // Agregar todos los logs de esta línea
        resultLines.push(...results);
      }
    }
  }

  const resultText = resultLines.join("\n");

  return (
    <div className="text-cyan-50 bg-[#1e1e1e] relative h-full">
      <Editor
        theme={EDITOR_THEMES.DARK}
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
          fontSize: EDITOR_CONFIG.FONT_SIZE - 2, // Ligeramente más pequeño que el editor
          fontFamily:
            "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
          wordWrap: "on",
          readOnly: true,
          lineNumbers: "on",
          renderLineHighlight: "none",
          showUnused: false,
          suggest: {
            selectionMode: "never",
            previewMode: "prefix",
          },
          padding: {
            top: activeFile ? 35 : 10, // Más espacio si hay header
            bottom: 10,
          },
          renderWhitespace: "selection",
          colorDecorators: true,
          // Mejorar la legibilidad
          lineHeight: 1.5,
          letterSpacing: 0.5,
        }}
        defaultLanguage="javascript"
        value={resultText}
        beforeMount={handleEditorWillMount}
      />

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
                {elements.filter((e) => e.type === "error").length} error
                {elements.filter((e) => e.type === "error").length !== 1
                  ? "es"
                  : ""}
              </span>
            )}
            {elements.filter((e) => e.type === "warning").length > 0 && (
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                {elements.filter((e) => e.type === "warning").length} warning
                {elements.filter((e) => e.type === "warning").length !== 1
                  ? "s"
                  : ""}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

export default Result;
