import React, { useContext, useMemo, useRef, useEffect } from "react";
import { CodeResultContext } from "../context/CodeContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { useToolbar } from "../context/ToolbarContext";
import Editor from "@monaco-editor/react";
import { EDITOR_THEMES, EDITOR_CONFIG } from "../constants/config";
import {
  ResultType,
  ConsoleMethod,
  Colors,
  ResultElement,
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
  const editorRef = useRef<any>(null); // Referencia al editor de Monaco

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
    import("./onedark.json")
      .then((data) => {
        monaco.editor.defineTheme(EDITOR_THEMES.DARK, data);
      })
      .catch((e) => console.error("Error al cargar el tema:", e)); // Mejorar el log de error

    monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
  }

  function handleEditorDidMount(editor: any) {
    editorRef.current = editor;
  }

  // Función para obtener el prefijo y color según el tipo de resultado
  const getResultPrefix = React.useCallback(
    (
      type: ResultType,
      method?: ConsoleMethod
    ): { prefix: string; color: Colors } => {
      if (method && CONSOLE_METHOD_PREFIXES[method]) {
        return CONSOLE_METHOD_PREFIXES[method];
      }

      switch (type) {
        case ResultType.ERROR:
          return { prefix: "❌ ", color: Colors.ERROR };
        case ResultType.WARNING:
          return { prefix: "⚠️ ", color: Colors.WARNING };
        case ResultType.INFO:
          return { prefix: "ℹ️ ", color: Colors.INFO };
        default:
          return { prefix: "📝 ", color: Colors.GRAY };
      }
    },
    []
  );

  // Función para formatear el resultado con colores apropiados
  const formatResult = React.useCallback(
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
          fontSize: EDITOR_CONFIG.FONT_SIZE - 2,
          fontFamily:
            "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
          wordWrap: "on",
          readOnly: true,
          lineNumbers: "on", // Muestra los números de línea
          renderLineHighlight: "none",
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
          occurrencesHighlight: false,
        }}
        defaultLanguage="javascript" // Ajusta si se necesita otro lenguaje por defecto
        value={resultText}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount} // Obtener la referencia al editor
      />

      {/* Estadísticas en la parte inferior */}
      {elements.length > 0 && (
        <div className="absolute bottom-2 left-2 z-10 bg-gray-800/90 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-400">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
              {elements.length} resultado{elements.length !== 1 ? "s" : ""}
            </span>
            {elements.filter((e) => e.type === ResultType.ERROR).length > 0 && (
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                {
                  elements.filter((e) => e.type === ResultType.ERROR).length
                }{" "}
                error
                {elements.filter((e) => e.type === ResultType.ERROR).length !==
                1
                  ? "es"
                  : ""}
              </span>
            )}
            {elements.filter((e) => e.type === ResultType.WARNING).length >
              0 && (
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                {
                  elements.filter((e) => e.type === ResultType.WARNING).length
                }{" "}
                warning
                {elements.filter((e) => e.type === ResultType.WARNING)
                  .length !== 1
                  ? "s"
                  : ""}
              </span>
            )}
          </span>
        </div>
      )}

      {/* Botón para copiar al portapapeles (ejemplo) */}
      {resultText && (
        <button
          onClick={() => navigator.clipboard.writeText(resultText)}
          className="absolute bottom-2 right-2 z-10 bg-gray-800/90 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-gray-700"
          title="Copiar resultados"
        >
          📋 Copiar
        </button>
      )}
    </div>
  );
}

export default Result;
