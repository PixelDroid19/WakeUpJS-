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
import { useConfig } from "../context/ConfigContext";
import { insertSnippet } from "../lib/monaco/modules/snippets-setup";
import { SmartTooltip } from "./SmartTooltip";
import { SmartDropdown } from "./SmartDropdown";
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  FileText,
  Save,
  EyeOff,
  ArrowRightLeft,
  Code2,
  Hash,
  X,
  SaveAll,
  PlayCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
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
  executionStatus?: {
    type: 'idle' | 'pending' | 'debouncing' | 'executing' | 'error' | 'cleared' | 'paste-priority';
    message?: string;
    timeRemaining?: number;
    lastChangeSize?: number;
    estimatedDelay?: number;
    isTypingActive?: boolean;
    operationType?: 'paste' | 'typing' | 'manual';
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
  executionStatus,
}: ToolbarProps) {
  const { direction, changeDirection } = useSplitLayout();
  const { config, currentTheme, availableThemes, setUnifiedTheme } = useToolbar();
  const { state, actions, utils } = useWorkspace();
  const { state: snippetsState, actions: snippetsActions } = useSnippets();
  const {
    config: configState,
    toggleAutoSave,
    toggleAutoExecution,
  } = useConfig();

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
        console.error("Error insertando snippet:", error);
      }
    }
  };

  const handleDeleteSnippet = (snippet: any) => {
    // Solo permitir borrar snippets personalizados, no los built-in
    if (!snippet.isBuiltIn) {
      if (
        confirm(
          `¿Estás seguro de que quieres eliminar el snippet "${snippet.name}"?`
        )
      ) {
        snippetsActions.deleteSnippet(snippet.id);
        console.log(`🗑️ Snippet "${snippet.name}" eliminado`);
      }
    } else {
      alert("No se pueden eliminar snippets integrados del sistema.");
    }
  };

  // Shortcut global para abrir QuickSnippetPicker (Ctrl+Shift+Space)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === "Space") {
        e.preventDefault();
        handleOpenQuickSnippets();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Clases base según el tema
  const getThemeClasses = () => {
    // Usar variables CSS del tema unificado
    return {
      backgroundColor: 'var(--toolbar-bg, #1f2937)',
      color: 'var(--toolbar-text, #ffffff)',
      borderColor: 'var(--toolbar-accent, #374151)',
    };
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

  // Función para renderizar notificaciones integradas
  const renderExecutionNotification = () => {
    if (!executionStatus || !executionStatus.type || 
        (executionStatus.type === 'idle' && executionStatus.message && 
         (executionStatus.message.includes('completada') || executionStatus.message.includes('Completado')))) {
      return null;
    }

    const getStatusConfig = () => {
      switch (executionStatus.type) {
        case 'pending':
          return {
            icon: executionStatus.isTypingActive ? '⌨️' : '⏳',
            color: executionStatus.isTypingActive 
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
              : 'bg-blue-500/20 text-blue-300 border-blue-500/30',
            iconColor: executionStatus.isTypingActive 
              ? 'text-purple-400'
              : 'text-blue-400',
          };
        case 'debouncing':
          return {
            icon: executionStatus.isTypingActive ? '⌨️' : '⏱️',
            color: executionStatus.isTypingActive
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
              : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
            iconColor: executionStatus.isTypingActive
              ? 'text-purple-400'
              : 'text-yellow-400',
          };
        case 'executing':
          return {
            icon: '⚡',
            color: 'bg-green-500/20 text-green-300 border-green-500/30',
            iconColor: 'text-green-400',
          };
        case 'error':
          return {
            icon: '❌',
            color: 'bg-red-500/20 text-red-300 border-red-500/30',
            iconColor: 'text-red-400',
          };
        case 'cleared':
          return {
            icon: '🧹',
            color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
            iconColor: 'text-cyan-400',
          };
        case 'paste-priority':
          return {
            icon: '📋',
            color: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
            iconColor: 'text-orange-400',
          };
        default:
          return {
            icon: '✅',
            color: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
            iconColor: 'text-gray-400',
          };
      }
    };

    const statusConfig = getStatusConfig();

    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${statusConfig.color} transition-all duration-200`}>
        <span className={`text-sm ${statusConfig.iconColor}`}>
          {statusConfig.icon}
        </span>
        <span className="text-xs font-medium truncate max-w-[200px]">
          {executionStatus.message || 'Estado desconocido'}
        </span>
        {executionStatus.lastChangeSize !== undefined && (
          <span className="text-xs opacity-70">
            {executionStatus.lastChangeSize} chars
          </span>
        )}
      </div>
    );
  };

  const iconSize = getIconSize();
  const themeClasses = getThemeClasses();
  const sizeClasses = getSizeClasses();

  // Componente de selector de temas mejorado con SmartDropdown
  const ThemeSelector = () => {
    const dropdownContent = (
      <div className="w-64">
        <div className="p-3 border-b border-gray-600">
          <h3 className="text-sm font-medium text-gray-200 mb-1">
            🎨 Seleccionar Tema
          </h3>
          <p className="text-xs text-gray-400">
            Temas unificados para editor y toolbar
          </p>
        </div>
        
        <div className="py-2 max-h-64 overflow-y-auto custom-scrollbar">
          {availableThemes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => {
                setUnifiedTheme(theme.id);
              }}
              className={`w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors ${
                theme.id === currentTheme.id 
                  ? 'bg-gray-700 border-l-2 border-blue-400' 
                  : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-200">
                  {theme.name}
                </span>
                {theme.id === currentTheme.id && (
                  <span className="text-blue-400 text-xs">✓</span>
                )}
              </div>
              <div className="text-xs text-gray-400 mb-2">
                {theme.description}
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className={`w-4 h-4 rounded ${theme.preview}`}
                  style={{ backgroundColor: theme.toolbar.background }}
                />
                <span className="text-xs text-gray-500">
                  Editor: {theme.editor.displayName}
                </span>
              </div>
            </button>
          ))}
        </div>
        
        <div className="border-t border-gray-600 p-3">
          <div className="text-xs text-gray-400">
            Los temas se sincronizan automáticamente entre el editor y la interfaz
          </div>
        </div>
      </div>
    );

    return (
      <SmartTooltip content={`Tema actual: ${currentTheme.name}`}>
        <SmartDropdown
          content={dropdownContent}
          position="bottom"
          closeOnClickOutside={true}
          closeOnEscape={true}
        >
          <button
            className={getButtonClasses("secondary")}
            style={{
              backgroundColor: 'var(--toolbar-hover, #374151)',
              color: 'var(--toolbar-text, #ffffff)',
            }}
          >
            <span className="text-sm">🎨</span>
            {config.size !== "sm" && (
              <span className="ml-2 text-xs">{currentTheme.name}</span>
            )}
          </button>
        </SmartDropdown>
      </SmartTooltip>
    );
  };

  // Renderizado condicional según el modo
  if (config.mode === "minimal") {
    return (
      <>
        <div
          className={`${sizeClasses} border-b flex items-center justify-center toolbar-themed`}
          style={typeof themeClasses === "object" ? themeClasses : {}}
        >
          <div className="flex items-center gap-3">
            {/* Solo iconos esenciales en modo minimal */}
            {canCancel && onCancelExecution && (
              <SmartTooltip content="Detener ejecución">
                <button
                  onClick={onCancelExecution}
                  className={getButtonClasses("danger")}
                >
                  <Pause size={iconSize} />
                </button>
              </SmartTooltip>
            )}

            <SmartTooltip
              content={`Layout ${
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
              <SmartTooltip content="Limpiar resultados">
                <button
                  onClick={onClearResults}
                  className={getButtonClasses("secondary")}
                >
                  <RotateCcw size={iconSize} />
                </button>
              </SmartTooltip>
            )}

            {onShowSnippetManager && (
              <SmartTooltip content="Gestionar snippets">
                <button
                  onClick={onShowSnippetManager}
                  className={getButtonClasses("primary")}
                >
                  <Code2 size={iconSize} />
                </button>
              </SmartTooltip>
            )}

            {/* Botón para snippets rápidos */}
            <SmartTooltip content="Insertar snippet (Ctrl+Shift+Space)">
              <button
                onClick={handleOpenQuickSnippets}
                className={getButtonClasses("primary")}
              >
                <Code2 size={iconSize} />
              </button>
            </SmartTooltip>

            <ThemeSelector />
          </div>
        </div>

        {/* QuickSnippetPicker Modal */}
        <QuickSnippetPicker
          isOpen={showQuickSnippets}
          onClose={handleCloseQuickSnippets}
          onInsertSnippet={handleInsertSnippet}
          onDeleteSnippet={handleDeleteSnippet}
          snippets={snippetsState.snippets}
          activeLanguage={activeFile?.language || "javascript"}
          onShowSnippetManager={onShowSnippetManager}
        />
      </>
    );
  }

  if (config.mode === "compact") {
    return (
      <>
        <div
          className={`${getPositionClasses()} ${sizeClasses} flex items-center gap-2 toolbar-themed`}
          style={typeof themeClasses === "object" ? themeClasses : {}}
        >
          {/* Iconos en círculos compactos */}
          <div className="flex items-center gap-1">
            {canCancel && onCancelExecution && (
              <SmartTooltip content="Detener">
                <button
                  onClick={onCancelExecution}
                  className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 flex items-center justify-center transition-all"
                >
                  <Pause size={12} />
                </button>
              </SmartTooltip>
            )}

            <SmartTooltip content="Layout">
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
              <SmartTooltip content={`${resultCount} resultados`}>
                <div className="w-8 h-8 rounded-full bg-gray-500/20 border border-gray-500/30 flex items-center justify-center">
                  <span className="text-xs font-mono">
                    {resultCount > 99 ? "99+" : resultCount}
                  </span>
                </div>
              </SmartTooltip>
            )}

            {/* Indicador de undefined ocultos en modo compact */}
            {config.hideUndefined && (
              <SmartTooltip content="Valores undefined ocultos">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                  <EyeOff size={12} className="text-orange-300" />
                </div>
              </SmartTooltip>
            )}

            {onShowSnippetManager && (
              <SmartTooltip content="Snippets">
                <button
                  onClick={onShowSnippetManager}
                  className="w-8 h-8 rounded-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 flex items-center justify-center transition-all"
                >
                  <Code2 size={12} />
                </button>
              </SmartTooltip>
            )}

            {/* Botón para snippets rápidos en modo compact */}
            <SmartTooltip content="Insertar snippet (Ctrl+Shift+Space)">
              <button
                onClick={handleOpenQuickSnippets}
                className="w-8 h-8 rounded-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 flex items-center justify-center transition-all"
              >
                <Code2 size={12} />
              </button>
            </SmartTooltip>

            <ThemeSelector />
          </div>
        </div>

        {/* QuickSnippetPicker Modal */}
        <QuickSnippetPicker
          isOpen={showQuickSnippets}
          onClose={handleCloseQuickSnippets}
          onInsertSnippet={handleInsertSnippet}
          onDeleteSnippet={handleDeleteSnippet}
          snippets={snippetsState.snippets}
          activeLanguage={activeFile?.language || "javascript"}
          onShowSnippetManager={onShowSnippetManager}
        />
      </>
    );
  }

  if (config.mode === "floating") {
    return (
      <>
        <div
          className={`${getPositionClasses()} ${sizeClasses} flex ${
            config.position === "left" || config.position === "right"
              ? "flex-col"
              : "flex-row"
          } items-center gap-3 toolbar-themed`}
          style={typeof themeClasses === "object" ? themeClasses : {}}
        >
          {/* Estado de ejecución */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isExecuting ? "bg-yellow-400 animate-pulse" : "bg-green-400"
              }`}
            ></div>
            {config.showResultCount && resultCount > 0 && (
              <SmartTooltip content={`${resultCount} resultados`}>
                <div className="bg-white/10 rounded-full px-2 py-1 text-xs font-mono">
                  {resultCount}
                </div>
              </SmartTooltip>
            )}

            {/* Indicador de undefined ocultos */}
            {config.hideUndefined && (
              <SmartTooltip content="Valores undefined ocultos">
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
              <SmartTooltip content="Detener ejecución">
                <button
                  onClick={onCancelExecution}
                  className={getButtonClasses("danger")}
                >
                  <Pause size={iconSize} />
                </button>
              </SmartTooltip>
            )}

            {onClearResults && (
              <SmartTooltip content="Limpiar resultados">
                <button
                  onClick={onClearResults}
                  className={getButtonClasses("secondary")}
                >
                  <RotateCcw size={iconSize} />
                </button>
              </SmartTooltip>
            )}

            {onShowSnippetManager && (
              <SmartTooltip content="Gestionar snippets">
                <button
                  onClick={onShowSnippetManager}
                  className={getButtonClasses("primary")}
                >
                  <Code2 size={iconSize} />
                </button>
              </SmartTooltip>
            )}

            {/* Botón para snippets rápidos */}
            <SmartTooltip content="Insertar snippet (Ctrl+Shift+Space)">
              <button
                onClick={handleOpenQuickSnippets}
                className={getButtonClasses("secondary")}
              >
                <Code2 size={iconSize} />
              </button>
            </SmartTooltip>

            <ThemeSelector />
          </div>
        </div>

        {/* QuickSnippetPicker Modal */}
        <QuickSnippetPicker
          isOpen={showQuickSnippets}
          onClose={handleCloseQuickSnippets}
          onInsertSnippet={handleInsertSnippet}
          onDeleteSnippet={handleDeleteSnippet}
          snippets={snippetsState.snippets}
          activeLanguage={activeFile?.language || "javascript"}
          onShowSnippetManager={onShowSnippetManager}
        />
      </>
    );
  }

  // Modo normal (completo)
  return (
    <>
      <div
        className={`${sizeClasses} border-b flex items-center justify-between toolbar-themed`}
        style={typeof themeClasses === "object" ? themeClasses : {}}
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
              content={`Archivo activo: ${activeFile.name} (${activeFile.language})`}
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
            <SmartTooltip content={`Total de resultados: ${resultCount}`}>
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 backdrop-blur-sm">
                <Hash size={iconSize - 2} />
                <span className="font-mono font-bold">{resultCount}</span>
              </div>
            </SmartTooltip>
          )}

          {errorCount > 0 && (
            <SmartTooltip content={`Errores encontrados: ${errorCount}`}>
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
            content={`Workspace: ${state.files.length} archivos, ${unsavedFiles.length} sin guardar`}
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
            <SmartTooltip content="Ejecución throttled - esperando...">
              <div className="flex items-center gap-2 bg-orange-500/20 rounded-full px-3 py-1 border border-orange-500/30 backdrop-blur-sm">
                <span className="text-orange-300 text-sm">⏳</span>
              </div>
            </SmartTooltip>
          )}

          {/* Indicador de undefined ocultos en modo normal */}
          {config.hideUndefined && (
            <SmartTooltip content="Valores undefined ocultos">
              <div className="flex items-center gap-2 bg-orange-500/20 rounded-full px-3 py-1 border border-orange-500/30 backdrop-blur-sm">
                <EyeOff size={iconSize - 2} className="text-orange-300" />
                <span className="font-mono text-xs text-orange-300">
                  Sin undefined
                </span>
              </div>
            </SmartTooltip>
          )}

          {/* Notificaciones de ejecución integradas */}
          {renderExecutionNotification()}
        </div>

        <div className="flex items-center gap-2">
          {/* Botón de guardar todo si hay cambios sin guardar */}
          {hasUnsavedChanges && (
            <SmartTooltip
              content={`Guardar todos los archivos (${unsavedFiles.length} sin guardar)`}
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

          {/* Toggle Auto Guardado */}
          <SmartTooltip
            content={`Auto Guardado: ${
              configState.autoSave.enabled ? "Activado" : "Desactivado"
            }`}
          >
            <button
              onClick={toggleAutoSave}
              className={getButtonClasses(
                configState.autoSave.enabled ? "success" : "secondary"
              )}
            >
              <SaveAll
                size={iconSize}
                className={
                  configState.autoSave.enabled
                    ? "text-green-300"
                    : "text-gray-400"
                }
              />
              {config.size !== "sm" && (
                <span className="ml-2">
                  {configState.autoSave.enabled ? "Auto Save" : "Save Off"}
                </span>
              )}
            </button>
          </SmartTooltip>

          {/* Toggle Auto Ejecución */}
          <SmartTooltip
            content={`Auto Ejecución: ${
              configState.autoExecution.enabled ? "Activado" : "Desactivado"
            }`}
          >
            <button
              onClick={toggleAutoExecution}
              className={getButtonClasses(
                configState.autoExecution.enabled ? "primary" : "secondary"
              )}
            >
              <PlayCircle
                size={iconSize}
                className={
                  configState.autoExecution.enabled
                    ? "text-blue-300"
                    : "text-gray-400"
                }
              />
              {config.size !== "sm" && (
                <span className="ml-2">
                  {configState.autoExecution.enabled ? "Auto Run" : "Run Off"}
                </span>
              )}
            </button>
          </SmartTooltip>

          {/* Botón de cancelación */}
          {canCancel && onCancelExecution && (
            <SmartTooltip content="Cancelar ejecución">
              <button
                onClick={onCancelExecution}
                className={getButtonClasses("danger")}
              >
                <Pause size={iconSize} />
                {config.size !== "sm" && <span className="ml-2">Detener</span>}
              </button>
            </SmartTooltip>
          )}

          <ThemeSelector />

          <SmartTooltip
            content={`Cambiar a layout ${
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
            <SmartTooltip content="Limpiar todos los resultados">
              <button
                onClick={onClearResults}
                className={getButtonClasses("danger")}
              >
                <RotateCcw size={iconSize} />
              </button>
            </SmartTooltip>
          )}

          {onShowSnippetManager && (
            <SmartTooltip content="Gestionar snippets">
              <button
                onClick={onShowSnippetManager}
                className={getButtonClasses("primary")}
              >
                <Code2 size={iconSize} />
              </button>
            </SmartTooltip>
          )}

          {/* Botón para snippets rápidos */}
          <SmartTooltip content="Insertar snippet (Ctrl+Shift+Space)">
            <button
              onClick={handleOpenQuickSnippets}
              className={getButtonClasses("secondary")}
            >
              <Code2 size={iconSize} />
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
        activeLanguage={activeFile?.language || "javascript"}
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
  onShowSnippetManager,
}: QuickSnippetPickerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Filtrar snippets por lenguaje y búsqueda (ahora como useMemo para evitar recálculos)
  const filteredSnippets = React.useMemo(() => {
    return snippets
      .filter((snippet) => {
        const matchesLanguage =
          snippet.language === activeLanguage ||
          snippet.language === "javascript" ||
          snippet.language === "*";
        const matchesSearch =
          searchQuery === "" ||
          snippet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          snippet.prefix.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesLanguage && matchesSearch;
      })
      .slice(0, 10); // Limitar a 10 resultados
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
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            Math.min(prev + 1, filteredSnippets.length - 1)
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredSnippets[selectedIndex]) {
            onInsertSnippet(filteredSnippets[selectedIndex]);
            onClose();
          }
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          if (filteredSnippets[selectedIndex]) {
            handleConfirmDelete(filteredSnippets[selectedIndex]);
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    filteredSnippets,
    selectedIndex,
    onInsertSnippet,
    onDeleteSnippet,
    onClose,
    handleConfirmDelete,
  ]);

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
              <span className="text-sm font-medium text-gray-200">
                Insertar Snippet
              </span>
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
                    ? "bg-blue-600/20 border-blue-500/30"
                    : "hover:bg-gray-800"
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
                      <div className="text-sm font-medium text-gray-200">
                        {snippet.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {snippet.description}
                      </div>
                      <div className="text-xs text-blue-400 mt-1 font-mono">
                        {snippet.prefix}
                      </div>
                    </div>
                    <div
                      className={`text-xs px-2 py-0.5 rounded ${
                        snippet.isBuiltIn
                          ? "bg-green-500/20 text-green-300"
                          : "bg-purple-500/20 text-purple-300"
                      }`}
                    >
                      {snippet.isBuiltIn ? "Built-in" : "Custom"}
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
                        ? "text-white bg-red-500 hover:bg-red-600"
                        : "text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    }`}
                    title={
                      deleteConfirm === snippet.id
                        ? "Click nuevamente para confirmar eliminación"
                        : "Eliminar snippet (Delete/Backspace)"
                    }
                  >
                    {deleteConfirm === snippet.id ? "✓" : <X size={14} />}
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-gray-700 bg-gray-850">
          <div className="text-xs text-gray-500 text-center space-y-1">
            <div>
              ↑↓ Navegar • Enter Insertar • Esc Cerrar • Ctrl+Shift+Space Abrir
            </div>
            <div>
              Delete/Backspace Eliminar snippet • 🗑️ Click botón rojo para
              borrar
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Toolbar;