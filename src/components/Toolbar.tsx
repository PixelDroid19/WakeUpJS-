/**
 * Toolbar Component
 * 
 * Componente de barra de herramientas configurable que soporta múltiples modos:
 * - normal: Barra completa con toda la información
 * - floating: Barra flotante posicionable
 * - minimal: Solo iconos esenciales
 * - compact: Iconos compactos en círculos
 * 
 * Configuración por defecto: modo flotante en la parte inferior
 * 
 */

import { useSplitLayout } from "../hooks/useSplitLayout";
import { useToolbar } from "../context/ToolbarContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { useSnippets } from "../context/SnippetsContext";
import { insertSnippet } from "../lib/monaco/snippetProvider";
import {
  ArrowRightLeft,
  RotateCcw,
  Settings,
  Play,
  Hash,
  FileText,
  Save,
  X,
  Pause,
  Code2,
  EyeOff,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import React from "react";

interface ToolbarProps {
  onClearResults?: () => void;
  resultCount?: number;
  errorCount?: number;
  isExecuting?: boolean;
  canCancel?: boolean;
  onCancelExecution?: () => void;
  onShowSnippetManager?: () => void;
  editorRef?: React.MutableRefObject<any>;
  executionStats?: {
    resultsCount: number;
    lastExecution: number;
    isThrottled: boolean;
  };
}

function Toolbar({
  onClearResults,
  resultCount = 0,
  errorCount = 0,
  isExecuting = false,
  canCancel = false,
  onCancelExecution,
  onShowSnippetManager,
  editorRef,
  executionStats,
}: ToolbarProps) {
  const { direction, changeDirection } = useSplitLayout();
  const { config, toggleSettings } = useToolbar();
  const { state, actions, utils } = useWorkspace();
  const { state: snippetsState, actions: snippetsActions } = useSnippets();

  // Obtener información del workspace
  const activeFile = utils.getActiveFile();
  const unsavedFiles = utils.getUnsavedFiles();
  const hasUnsavedChanges = utils.hasUnsavedChanges();

  // Estado para QuickSnippetPicker
  const [showQuickSnippets, setShowQuickSnippets] = useState(false);

  // Funciones para manejar snippets
  const handleOpenQuickSnippets = () => {
    setShowQuickSnippets(true);
  };

  const handleCloseQuickSnippets = () => {
    setShowQuickSnippets(false);
  };

  const handleInsertSnippet = (snippet: any) => {
    if (editorRef?.current) {
      try {
        insertSnippet(editorRef.current, snippet);
        console.log(`📦 Snippet "${snippet.name}" insertado`);
      } catch (error) {
        console.error('Error insertando snippet:', error);
      }
    }
  };

  const handleDeleteSnippet = (snippet: any) => {
    // Solo permitir borrar snippets personalizados, no los built-in
    if (!snippet.isBuiltIn) {
      if (confirm(`¿Estás seguro de que quieres eliminar el snippet "${snippet.name}"?`)) {
        snippetsActions.deleteSnippet(snippet.id);
        console.log(`🗑️ Snippet "${snippet.name}" eliminado`);
      }
    } else {
      alert('No se pueden eliminar snippets integrados del sistema.');
    }
  };

  // Shortcut global para abrir QuickSnippetPicker (Ctrl+Shift+Space)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'Space') {
        e.preventDefault();
        handleOpenQuickSnippets();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Clases base según el tema
  const getThemeClasses = () => {
    if (config.theme === "custom" && config.customColors) {
      return {
        backgroundColor: config.customColors.background,
        color: config.customColors.text,
        borderColor: config.customColors.accent,
      };
    }

    switch (config.theme) {
      case "light":
        return "bg-white text-gray-800 border-gray-200";
      case "blue":
        return "bg-blue-600 text-white border-blue-700";
      case "purple":
        return "bg-purple-600 text-white border-purple-700";
      case "green":
        return "bg-green-600 text-white border-green-700";
      default:
        return "bg-gray-800 text-white border-gray-700";
    }
  };

  // Clases de tamaño
  const getSizeClasses = () => {
    switch (config.size) {
      case "sm":
        return "px-3 py-2 text-xs";
      case "lg":
        return "px-6 py-4 text-base";
      default:
        return "px-4 py-3 text-sm";
    }
  };

  // Tamaño de iconos según el tamaño del toolbar
  const getIconSize = () => {
    switch (config.size) {
      case "sm":
        return 14;
      case "lg":
        return 20;
      default:
        return 16;
    }
  };

  // Clases de posición para modos flotantes
  const getPositionClasses = () => {
    if (config.mode !== "floating" && config.mode !== "compact") return "";

    const baseFloating = "fixed z-30 backdrop-blur-md bg-opacity-90 shadow-2xl";

    switch (config.position) {
      case "bottom":
        return `${baseFloating} bottom-4 left-1/2 transform -translate-x-1/2 rounded-2xl`;
      case "left":
        return `${baseFloating} left-4 top-1/2 transform -translate-y-1/2 rounded-2xl flex-col`;
      case "right":
        return `${baseFloating} right-4 top-1/2 transform -translate-y-1/2 rounded-2xl flex-col`;
      default:
        return `${baseFloating} top-4 left-1/2 transform -translate-x-1/2 rounded-2xl`;
    }
  };

  // Clases del botón según el tema
  const getButtonClasses = (
    variant: "primary" | "secondary" | "danger" | "success" = "primary"
  ) => {
    const padding =
      config.size === "sm" ? "p-1.5" : config.size === "lg" ? "p-3" : "p-2";
    const baseClasses = `${padding} rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 relative group border`;

    if (config.theme === "custom" && config.customColors) {
      const hoverBg = config.customColors.hover;
      return `${baseClasses} hover:bg-opacity-80 border-opacity-30`;
    }

    if (config.theme === "light") {
      switch (variant) {
        case "danger":
          return `${baseClasses} bg-red-50 hover:bg-red-100 text-red-600 border-red-200 hover:border-red-300`;
        case "success":
          return `${baseClasses} bg-green-50 hover:bg-green-100 text-green-600 border-green-200 hover:border-green-300`;
        case "secondary":
          return `${baseClasses} bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200 hover:border-gray-300`;
        default:
          return `${baseClasses} bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200 hover:border-blue-300`;
      }
    } else {
      switch (variant) {
        case "danger":
          return `${baseClasses} bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/30 hover:border-red-500/50`;
        case "success":
          return `${baseClasses} bg-green-500/20 hover:bg-green-500/30 text-green-300 border-green-500/30 hover:border-green-500/50`;
        case "secondary":
          return `${baseClasses} bg-white/10 hover:bg-white/20 text-white/80 border-white/20 hover:border-white/30`;
        default:
          return `${baseClasses} bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-blue-500/30 hover:border-blue-500/50`;
      }
    }
  };

  // Componente de tooltip inteligente
  const SmartTooltip = ({
    children,
    text,
  }: {
    children: React.ReactNode;
    text: string;
  }) => {
    const [tooltipPosition, setTooltipPosition] = useState<
      "top" | "bottom" | "left" | "right"
    >("top");
    const triggerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const updateTooltipPosition = () => {
        if (!triggerRef.current) return;

        const rect = triggerRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const spaceTop = rect.top;
        const spaceBottom = viewportHeight - rect.bottom;
        const spaceLeft = rect.left;
        const spaceRight = viewportWidth - rect.right;

        if (spaceTop > 60 && spaceTop > spaceBottom) {
          setTooltipPosition("top");
        } else if (spaceBottom > 60) {
          setTooltipPosition("bottom");
        } else if (spaceLeft > 100) {
          setTooltipPosition("left");
        } else if (spaceRight > 100) {
          setTooltipPosition("right");
        } else {
          setTooltipPosition("top");
        }
      };

      updateTooltipPosition();
      window.addEventListener("resize", updateTooltipPosition);
      window.addEventListener("scroll", updateTooltipPosition);

      return () => {
        window.removeEventListener("resize", updateTooltipPosition);
        window.removeEventListener("scroll", updateTooltipPosition);
      };
    }, []);

    const getTooltipClasses = () => {
      const baseClasses =
        "absolute z-50 px-2 py-1 bg-gray-900 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap";

      switch (tooltipPosition) {
        case "bottom":
          return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 mt-2`;
        case "left":
          return `${baseClasses} right-full top-1/2 transform -translate-y-1/2 mr-2`;
        case "right":
          return `${baseClasses} left-full top-1/2 transform -translate-y-1/2 ml-2`;
        default:
          return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
      }
    };

    const getArrowClasses = () => {
      switch (tooltipPosition) {
        case "bottom":
          return "absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900";
        case "left":
          return "absolute left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-900";
        case "right":
          return "absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900";
        default:
          return "absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900";
      }
    };

    return (
      <div ref={triggerRef} className="relative group">
        {children}
        <div className={getTooltipClasses()}>
          {text}
          <div className={getArrowClasses()}></div>
        </div>
      </div>
    );
  };

  const iconSize = getIconSize();
  const themeClasses = getThemeClasses();
  const sizeClasses = getSizeClasses();

  // Renderizado condicional según el modo
  if (config.mode === "minimal") {
    return (
      <>
        <div
          className={`${
            typeof themeClasses === "string" ? themeClasses : ""
          } ${sizeClasses} border-b flex items-center justify-center`}
        >
          <div className="flex items-center gap-3">
            {/* Solo iconos esenciales en modo minimal */}
            {canCancel && onCancelExecution && (
              <SmartTooltip text="Detener ejecución">
                <button
                  onClick={onCancelExecution}
                  className={getButtonClasses("danger")}
                >
                  <Pause size={iconSize} />
                </button>
              </SmartTooltip>
            )}

            <SmartTooltip
              text={`Layout ${
                direction === "horizontal" ? "vertical" : "horizontal"
              }`}
            >
              <button
                onClick={changeDirection}
                className={getButtonClasses("primary")}
              >
                <ArrowRightLeft
                  size={iconSize}
                  className={direction === "vertical" ? "rotate-90" : ""}
                />
              </button>
            </SmartTooltip>

            {onClearResults && (
              <SmartTooltip text="Limpiar resultados">
                <button
                  onClick={onClearResults}
                  className={getButtonClasses("secondary")}
                >
                  <RotateCcw size={iconSize} />
                </button>
              </SmartTooltip>
            )}

            {onShowSnippetManager && (
              <SmartTooltip text="Gestionar snippets">
                <button
                  onClick={onShowSnippetManager}
                  className={getButtonClasses("primary")}
                >
                  <Code2 size={iconSize} />
                </button>
              </SmartTooltip>
            )}

            {/* Botón para snippets rápidos */}
            <SmartTooltip text="Insertar snippet (Ctrl+Shift+Space)">
              <button
                onClick={handleOpenQuickSnippets}
                className={getButtonClasses("primary")}
              >
                <Code2 size={iconSize} />
              </button>
            </SmartTooltip>

            <SmartTooltip text="Configuración">
              <button
                onClick={toggleSettings}
                className={getButtonClasses("secondary")}
              >
                <Settings size={iconSize} />
              </button>
            </SmartTooltip>
          </div>
        </div>

        {/* QuickSnippetPicker Modal */}
        <QuickSnippetPicker
          isOpen={showQuickSnippets}
          onClose={handleCloseQuickSnippets}
          onInsertSnippet={handleInsertSnippet}
          onDeleteSnippet={handleDeleteSnippet}
          snippets={snippetsState.snippets}
          activeLanguage={activeFile?.language || 'javascript'}
          onShowSnippetManager={onShowSnippetManager}
        />
      </>
    );
  }

  if (config.mode === "compact") {
    return (
      <>
        <div
          className={`${getPositionClasses()} ${
            typeof themeClasses === "string" ? themeClasses : ""
          } ${sizeClasses} flex items-center gap-2`}
        >
          {/* Iconos en círculos compactos */}
          <div className="flex items-center gap-1">
            {canCancel && onCancelExecution && (
              <SmartTooltip text="Detener">
                <button
                  onClick={onCancelExecution}
                  className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 flex items-center justify-center transition-all"
                >
                  <Pause size={12} />
                </button>
              </SmartTooltip>
            )}

            <SmartTooltip text="Layout">
              <button
                onClick={changeDirection}
                className="w-8 h-8 rounded-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 flex items-center justify-center transition-all"
              >
                <ArrowRightLeft
                  size={12}
                  className={direction === "vertical" ? "rotate-90" : ""}
                />
              </button>
            </SmartTooltip>

            {resultCount > 0 && (
              <SmartTooltip text={`${resultCount} resultados`}>
                <div className="w-8 h-8 rounded-full bg-gray-500/20 border border-gray-500/30 flex items-center justify-center">
                  <span className="text-xs font-mono">
                    {resultCount > 99 ? "99+" : resultCount}
                  </span>
                </div>
              </SmartTooltip>
            )}

            {/* Indicador de undefined ocultos en modo compact */}
            {config.hideUndefined && (
              <SmartTooltip text="Valores undefined ocultos">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                  <EyeOff size={12} className="text-orange-300" />
                </div>
              </SmartTooltip>
            )}

            {onShowSnippetManager && (
              <SmartTooltip text="Snippets">
                <button
                  onClick={onShowSnippetManager}
                  className="w-8 h-8 rounded-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 flex items-center justify-center transition-all"
                >
                  <Code2 size={12} />
                </button>
              </SmartTooltip>
            )}

            {/* Botón para snippets rápidos en modo compact */}
            <SmartTooltip text="Insertar snippet (Ctrl+Shift+Space)">
              <button
                onClick={handleOpenQuickSnippets}
                className="w-8 h-8 rounded-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 flex items-center justify-center transition-all"
              >
                <Code2 size={12} />
              </button>
            </SmartTooltip>

            <SmartTooltip text="Configuración">
              <button
                onClick={toggleSettings}
                className="w-8 h-8 rounded-full bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 border border-gray-500/30 flex items-center justify-center transition-all"
              >
                <Settings size={12} />
              </button>
            </SmartTooltip>
          </div>
        </div>

        {/* QuickSnippetPicker Modal */}
        <QuickSnippetPicker
          isOpen={showQuickSnippets}
          onClose={handleCloseQuickSnippets}
          onInsertSnippet={handleInsertSnippet}
          onDeleteSnippet={handleDeleteSnippet}
          snippets={snippetsState.snippets}
          activeLanguage={activeFile?.language || 'javascript'}
          onShowSnippetManager={onShowSnippetManager}
        />
      </>
    );
  }

  if (config.mode === "floating") {
    return (
      <>
        <div
          className={`${getPositionClasses()} ${
            typeof themeClasses === "string" ? themeClasses : ""
          } ${sizeClasses} flex ${
            config.position === "left" || config.position === "right"
              ? "flex-col"
              : "flex-row"
          } items-center gap-3`}
        >
          {/* Estado de ejecución */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isExecuting ? "bg-yellow-400 animate-pulse" : "bg-green-400"
              }`}
            ></div>
            {config.showResultCount && resultCount > 0 && (
              <SmartTooltip text={`${resultCount} resultados`}>
                <div className="bg-white/10 rounded-full px-2 py-1 text-xs font-mono">
                  {resultCount}
                </div>
              </SmartTooltip>
            )}
            
            {/* Indicador de undefined ocultos */}
            {config.hideUndefined && (
              <SmartTooltip text="Valores undefined ocultos">
                <div className="bg-orange-500/20 border border-orange-500/30 rounded-full p-1">
                  <EyeOff size={10} className="text-orange-300" />
                </div>
              </SmartTooltip>
            )}
          </div>

          {/* Separador */}
          <div
            className={`${
              config.position === "left" || config.position === "right"
                ? "w-full h-px"
                : "h-4 w-px"
            } bg-current opacity-30`}
          ></div>

          {/* Controles principales */}
          <div
            className={`flex ${
              config.position === "left" || config.position === "right"
                ? "flex-col"
                : "flex-row"
            } items-center gap-2`}
          >
            {canCancel && onCancelExecution && (
              <SmartTooltip text="Detener ejecución">
                <button
                  onClick={onCancelExecution}
                  className={getButtonClasses("danger")}
                >
                  <Pause size={iconSize} />
                </button>
              </SmartTooltip>
            )}

            {onClearResults && (
              <SmartTooltip text="Limpiar resultados">
                <button
                  onClick={onClearResults}
                  className={getButtonClasses("secondary")}
                >
                  <RotateCcw size={iconSize} />
                </button>
              </SmartTooltip>
            )}

            {onShowSnippetManager && (
              <SmartTooltip text="Gestionar snippets">
                <button
                  onClick={onShowSnippetManager}
                  className={getButtonClasses("primary")}
                >
                  <Code2 size={iconSize} />
                </button>
              </SmartTooltip>
            )}

            {/* Botón para snippets rápidos */}
            <SmartTooltip text="Insertar snippet (Ctrl+Shift+Space)">
              <button
                onClick={handleOpenQuickSnippets}
                className={getButtonClasses("secondary")}
              >
                <Code2 size={iconSize} />
              </button>
            </SmartTooltip>

            <SmartTooltip text="Configuración">
              <button
                onClick={toggleSettings}
                className={getButtonClasses("secondary")}
              >
                <Settings size={iconSize} />
              </button>
            </SmartTooltip>
          </div>
        </div>

        {/* QuickSnippetPicker Modal */}
        <QuickSnippetPicker
          isOpen={showQuickSnippets}
          onClose={handleCloseQuickSnippets}
          onInsertSnippet={handleInsertSnippet}
          onDeleteSnippet={handleDeleteSnippet}
          snippets={snippetsState.snippets}
          activeLanguage={activeFile?.language || 'javascript'}
          onShowSnippetManager={onShowSnippetManager}
        />
      </>
    );
  }

  // Modo normal (completo)
  return (
    <>
      <div
        className={`${
          typeof themeClasses === "string" ? themeClasses : ""
        } ${sizeClasses} border-b flex items-center justify-between`}
      >
        <div className="flex items-center gap-4">
          {config.showTitle && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isExecuting ? "bg-yellow-400 animate-pulse" : "bg-green-400"
                  }`}
                ></div>
                <Play
                  size={iconSize}
                  className={isExecuting ? "text-yellow-400" : "text-green-400"}
                />
              </div>
              <div className="h-5 w-px bg-current opacity-30" />
            </div>
          )}

          {/* Información del archivo activo */}
          {activeFile && (
            <SmartTooltip
              text={`Archivo activo: ${activeFile.name} (${activeFile.language})`}
            >
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 backdrop-blur-sm">
                <FileText size={iconSize - 2} />
                <span className="font-mono text-sm">{activeFile.name}</span>
                {activeFile.isUnsaved && (
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                )}
              </div>
            </SmartTooltip>
          )}

          {config.showResultCount && (
            <SmartTooltip text={`Total de resultados: ${resultCount}`}>
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 backdrop-blur-sm">
                <Hash size={iconSize - 2} />
                <span className="font-mono font-bold">{resultCount}</span>
              </div>
            </SmartTooltip>
          )}

          {errorCount > 0 && (
            <SmartTooltip text={`Errores encontrados: ${errorCount}`}>
              <div className="flex items-center gap-2 bg-red-500/20 rounded-full px-3 py-1 border border-red-500/30 backdrop-blur-sm">
                <X size={iconSize - 2} className="text-red-300" />
                <span className="font-mono font-bold text-red-300">
                  {errorCount}
                </span>
              </div>
            </SmartTooltip>
          )}

          {/* Información del workspace */}
          <SmartTooltip
            text={`Workspace: ${state.files.length} archivos, ${unsavedFiles.length} sin guardar`}
          >
            <div className="flex items-center gap-2 bg-blue-500/20 rounded-full px-3 py-1 border border-blue-500/30 backdrop-blur-sm">
              <span className="text-blue-300 text-sm">📁</span>
              <span className="font-mono text-xs text-blue-300">
                {state.files.length}
              </span>
              {unsavedFiles.length > 0 && (
                <>
                  <span className="text-blue-300/50">•</span>
                  <span className="font-mono text-xs text-orange-300">
                    {unsavedFiles.length}
                  </span>
                </>
              )}
            </div>
          </SmartTooltip>

          {/* Indicador de throttling */}
          {executionStats?.isThrottled && (
            <SmartTooltip text="Ejecución throttled - esperando...">
              <div className="flex items-center gap-2 bg-orange-500/20 rounded-full px-3 py-1 border border-orange-500/30 backdrop-blur-sm">
                <span className="text-orange-300 text-sm">⏳</span>
              </div>
            </SmartTooltip>
          )}

          {/* Indicador de undefined ocultos en modo normal */}
          {config.hideUndefined && (
            <SmartTooltip text="Valores undefined ocultos">
              <div className="flex items-center gap-2 bg-orange-500/20 rounded-full px-3 py-1 border border-orange-500/30 backdrop-blur-sm">
                <EyeOff size={iconSize - 2} className="text-orange-300" />
                <span className="font-mono text-xs text-orange-300">
                  Sin undefined
                </span>
              </div>
            </SmartTooltip>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Botón de guardar todo si hay cambios sin guardar */}
          {hasUnsavedChanges && (
            <SmartTooltip
              text={`Guardar todos los archivos (${unsavedFiles.length} sin guardar)`}
            >
              <button
                onClick={() => actions.saveAllFiles()}
                className={getButtonClasses("success")}
              >
                <Save size={iconSize} />
                {config.size !== "sm" && (
                  <span className="ml-2">Guardar Todo</span>
                )}
              </button>
            </SmartTooltip>
          )}

          {/* Botón de cancelación */}
          {canCancel && onCancelExecution && (
            <SmartTooltip text="Cancelar ejecución">
              <button
                onClick={onCancelExecution}
                className={getButtonClasses("danger")}
              >
                <Pause size={iconSize} />
                {config.size !== "sm" && <span className="ml-2">Detener</span>}
              </button>
            </SmartTooltip>
          )}

          <SmartTooltip
            text={`Cambiar a layout ${
              direction === "horizontal" ? "vertical" : "horizontal"
            }`}
          >
            <button
              onClick={changeDirection}
              className={getButtonClasses("primary")}
            >
              <ArrowRightLeft
                size={iconSize}
                className={direction === "vertical" ? "rotate-90" : ""}
              />
            </button>
          </SmartTooltip>

          {onClearResults && (
            <SmartTooltip text="Limpiar todos los resultados">
              <button
                onClick={onClearResults}
                className={getButtonClasses("danger")}
              >
                <RotateCcw size={iconSize} />
              </button>
            </SmartTooltip>
          )}

          {onShowSnippetManager && (
            <SmartTooltip text="Gestionar snippets">
              <button
                onClick={onShowSnippetManager}
                className={getButtonClasses("primary")}
              >
                <Code2 size={iconSize} />
              </button>
            </SmartTooltip>
          )}

          {/* Botón para snippets rápidos */}
          <SmartTooltip text="Insertar snippet (Ctrl+Shift+Space)">
            <button
              onClick={handleOpenQuickSnippets}
              className={getButtonClasses("secondary")}
            >
              <Code2 size={iconSize} />
            </button>
          </SmartTooltip>

          <SmartTooltip text="Abrir configuración">
            <button
              onClick={toggleSettings}
              className={getButtonClasses("secondary")}
            >
              <Settings size={iconSize} />
            </button>
          </SmartTooltip>
        </div>
      </div>

      {/* QuickSnippetPicker Modal */}
      <QuickSnippetPicker
        isOpen={showQuickSnippets}
        onClose={handleCloseQuickSnippets}
        onInsertSnippet={handleInsertSnippet}
        onDeleteSnippet={handleDeleteSnippet}
        snippets={snippetsState.snippets}
        activeLanguage={activeFile?.language || 'javascript'}
        onShowSnippetManager={onShowSnippetManager}
      />
    </>
  );
}

// Componente QuickSnippetPicker para inserción rápida de snippets
interface QuickSnippetPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertSnippet: (snippet: any) => void;
  onDeleteSnippet: (snippet: any) => void;
  snippets: any[];
  activeLanguage: string;
  onShowSnippetManager?: () => void;
}

const QuickSnippetPicker = ({ 
  isOpen, 
  onClose, 
  onInsertSnippet, 
  onDeleteSnippet, 
  snippets, 
  activeLanguage, 
  onShowSnippetManager
}: QuickSnippetPickerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // Filtrar snippets por lenguaje y búsqueda (ahora como useMemo para evitar recálculos)
  const filteredSnippets = React.useMemo(() => {
    return snippets.filter(snippet => {
      const matchesLanguage = snippet.language === activeLanguage || 
                             snippet.language === 'javascript' || 
                             snippet.language === '*';
      const matchesSearch = searchQuery === "" || 
                           snippet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           snippet.prefix.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLanguage && matchesSearch;
    }).slice(0, 10); // Limitar a 10 resultados
  }, [snippets, activeLanguage, searchQuery]);

  // Función para confirmar borrado
  const handleConfirmDelete = (snippet: any) => {
    if (deleteConfirm === snippet.id) {
      onDeleteSnippet(snippet);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(snippet.id);
      // Auto-cancelar después de 3 segundos
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  // Manejar eventos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredSnippets.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredSnippets[selectedIndex]) {
            onInsertSnippet(filteredSnippets[selectedIndex]);
            onClose();
          }
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          if (filteredSnippets[selectedIndex]) {
            handleConfirmDelete(filteredSnippets[selectedIndex]);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredSnippets, selectedIndex, onInsertSnippet, onDeleteSnippet, onClose, handleConfirmDelete]);

  // Resetear selección cuando cambian los snippets filtrados
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // AHORA SÍ podemos hacer el return condicional después de todos los hooks
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-gray-900 border border-gray-600 rounded-lg shadow-xl z-50 w-80 max-h-96 overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 size={16} className="text-blue-400" />
              <span className="text-sm font-medium text-gray-200">Insertar Snippet</span>
            </div>
            {onShowSnippetManager && (
              <button
                onClick={() => {
                  onClose();
                  onShowSnippetManager();
                }}
                className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
                title="Abrir gestor de snippets"
              >
                <Settings size={14} />
              </button>
            )}
          </div>
          <input
            type="text"
            placeholder="Buscar snippets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full mt-2 px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
        </div>
        
        {/* Lista de snippets */}
        <div className="max-h-64 overflow-y-auto">
          {filteredSnippets.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No se encontraron snippets para "{activeLanguage}"
            </div>
          ) : (
            filteredSnippets.map((snippet, index) => (
              <div
                key={snippet.id}
                className={`flex items-center justify-between border-b border-gray-800 last:border-b-0 transition-colors ${
                  index === selectedIndex 
                    ? 'bg-blue-600/20 border-blue-500/30' 
                    : 'hover:bg-gray-800'
                }`}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <button
                  onClick={() => {
                    onInsertSnippet(snippet);
                    onClose();
                  }}
                  className="flex-1 p-3 text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-200">{snippet.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{snippet.description}</div>
                      <div className="text-xs text-blue-400 mt-1 font-mono">{snippet.prefix}</div>
                    </div>
                    <div className={`text-xs px-2 py-0.5 rounded ${
                      snippet.isBuiltIn ? 'bg-green-500/20 text-green-300' : 'bg-purple-500/20 text-purple-300'
                    }`}>
                      {snippet.isBuiltIn ? 'Built-in' : 'Custom'}
                    </div>
                  </div>
                </button>
                
                {/* Botón de borrar (solo para snippets personalizados) */}
                {!snippet.isBuiltIn && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmDelete(snippet);
                    }}
                    className={`p-2 rounded transition-colors mr-2 ${
                      deleteConfirm === snippet.id
                        ? 'text-white bg-red-500 hover:bg-red-600'
                        : 'text-red-400 hover:text-red-300 hover:bg-red-500/20'
                    }`}
                    title={deleteConfirm === snippet.id 
                      ? "Click nuevamente para confirmar eliminación" 
                      : "Eliminar snippet (Delete/Backspace)"
                    }
                  >
                    {deleteConfirm === snippet.id ? '✓' : <X size={14} />}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className="p-2 border-t border-gray-700 bg-gray-850">
          <div className="text-xs text-gray-500 text-center space-y-1">
            <div>↑↓ Navegar • Enter Insertar • Esc Cerrar • Ctrl+Shift+Space Abrir</div>
            <div>Delete/Backspace Eliminar snippet • 🗑️ Click botón rojo para borrar</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Toolbar;
