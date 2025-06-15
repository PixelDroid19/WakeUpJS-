import { useState } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { usePackageManager } from "../context/PackageManagerContext";
import { useToolbar } from "../context/ToolbarContext";
import { useContextMenu } from "../hooks/useContextMenu";
import EnvironmentVariables from "./EnvironmentVariables";
import { PackageManager } from "./PackageManager";
import { ContextMenu } from "./ContextMenu";
import {
  Plus,
  X,
  FileText,
  Save,
  Copy,
  Edit,
  Code2,
  FileCode,
  Globe,
  Palette,
  Settings,
  Package,
  RotateCcw,
} from "lucide-react";
import NewFileDialog from "./NewFileDialog";
import SettingsDialog from "./SettingsDialog";

interface FileTabProps {
  file: any;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  onRename: (newName: string) => void;
  onDuplicate: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  // Add actions for reordering from WorkspaceContext, passed down from FileManager
  onReorder: (draggedId: string, targetId: string) => void;
}

function FileTab({
  file,
  isActive,
  onSelect,
  onClose,
  onRename,
  onDuplicate,
  onContextMenu,
  onReorder,
}: FileTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(file.name);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false); // For visual feedback
  const { currentTheme } = useToolbar();
  const { actions } = useWorkspace(); // Direct access if preferred, or pass onReorder

  const handleRename = () => {
    if (editName.trim() && editName !== file.name) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const getFileIcon = () => {
    // Iconos basados en el lenguaje detectado internamente, no en extensión
    switch (file.language) {
      case "typescript":
        return <FileCode size={14} className="text-blue-400" />;
      case "javascript":
        return <Code2 size={14} className="text-yellow-400" />;
      case "html":
        return <Globe size={14} className="text-orange-400" />;
      case "css":
        return <Palette size={14} className="text-blue-300" />;
      default:
        return <FileText size={14} className="text-gray-400" />;
    }
  };

  const getFileTypeGradient = () => {
    // Gradientes adaptativos basados en el tema actual
    const isLightTheme = currentTheme.id === 'light-unified';
    
    switch (file.language) {
      case "typescript":
        return isLightTheme 
          ? "from-blue-100/50 to-cyan-100/50 border-blue-400/50"
          : "from-blue-500/10 to-cyan-500/10 border-blue-500/30";
      case "javascript":
        return isLightTheme
          ? "from-yellow-100/50 to-orange-100/50 border-yellow-400/50"
          : "from-yellow-500/10 to-orange-500/10 border-yellow-500/30";
      case "html":
        return isLightTheme
          ? "from-orange-100/50 to-red-100/50 border-orange-400/50"
          : "from-orange-500/10 to-red-500/10 border-orange-500/30";
      case "css":
        return isLightTheme
          ? "from-blue-100/50 to-purple-100/50 border-blue-400/50"
          : "from-blue-400/10 to-purple-500/10 border-blue-400/30";
      default:
        return isLightTheme
          ? "from-gray-100/50 to-gray-200/50 border-gray-400/50"
          : "from-gray-500/10 to-gray-600/10 border-gray-500/30";
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', file.id);
    e.dataTransfer.effectAllowed = 'move';
    // Optional: style the dragged tab
    // e.currentTarget.style.opacity = '0.5';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const draggedFileId = e.dataTransfer.getData('text/plain');
    const targetFileId = file.id;
    if (draggedFileId && targetFileId && draggedFileId !== targetFileId) {
      // Use the passed down onReorder or directly call actions.reorderFile
      // For this example, assuming actions is available or onReorder is correctly passed
      actions.reorderFile(draggedFileId, targetFileId);
    }
    setIsDragOver(false);
    // Optional: reset opacity if changed in onDragStart
    // e.currentTarget.style.opacity = '1';
  };

  // Reset opacity if drag ends elsewhere (e.g. outside a valid drop target)
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    // e.currentTarget.style.opacity = '1';
  };

  return (
    <div
      draggable="true"
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      className={`
        group relative flex items-center gap-2 px-4 py-3 cursor-pointer transition-all duration-200 min-w-0 max-w-48
        border-r border-opacity-50 backdrop-blur-sm
        ${isActive ? `bg-gradient-to-b ${getFileTypeGradient()} border-b-2 shadow-lg`
            : `hover:shadow-md ${isHovered ? "transform scale-[1.02]" : ""}`}
        ${isDragOver ? 'ring-2 ring-[var(--theme-accent)] ring-inset' : ''}
      `}
      style={{
        backgroundColor: isActive ? undefined : 'var(--toolbar-hover)',
        borderColor: isDragOver ? 'var(--theme-accent)' : 'color-mix(in srgb, var(--toolbar-text) 30%, transparent)',
        color: 'var(--toolbar-text)',
      }}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsDragOver(false); /* Ensure drag over resets if mouse leaves */ }}
      onContextMenu={onContextMenu}
      data-file-id={file.id} // Useful for direct DOM manipulation if needed elsewhere (like rename)
    >
      {/* Visual cue for drop target */}
      {/* {isDragOver && <div className="absolute inset-0 border-2 border-dashed border-[var(--theme-accent)] rounded-md pointer-events-none"></div>} */}

      {/* Indicador de estado */}
      <div className="flex items-center gap-2 min-w-0 flex-1 pointer-events-none"> {/* pointer-events-none for children during drag */}
        {getFileIcon()}

        {isEditing ? (
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setIsEditing(false);
            }}
            style={{
              backgroundColor: 'var(--toolbar-bg)',
              borderColor: 'var(--toolbar-accent)',
              color: 'var(--toolbar-text)',
            }}
            className="border px-2 py-1 text-sm min-w-0 flex-1 rounded focus:outline-none focus:ring-1"
            autoFocus
          />
        ) : (
          <span
            className={`text-sm truncate min-w-0 flex-1 transition-colors ${
              isActive ? "font-medium" : ""
            } ${file.isUnsaved ? "italic" : ""}`}
            style={{ color: isActive ? 'var(--toolbar-text)' : 'color-mix(in srgb, var(--toolbar-text) 80%, transparent)' }}
            onDoubleClick={() => setIsEditing(true)}
            title={`${file.name} (${file.language})`}
          >
            {file.name}
          </span>
        )}

        {/* Indicador de archivo sin guardar */}
        {file.isUnsaved && (
          <div
            className="w-2 h-2 rounded-full transition-colors"
            style={{
              backgroundColor: isActive ? '#f59e0b' : 'color-mix(in srgb, #f59e0b 60%, transparent)'
            }}
            title="Archivo sin guardar"
          />
        )}
      </div>

      {/* Controles de acción con estilos adaptativos */}
      <div
        className={`flex items-center gap-1 transition-all duration-200 ${
          isHovered || isActive ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="p-1 hover:bg-white/20 rounded transition-colors"
          style={{ color: 'color-mix(in srgb, var(--toolbar-text) 70%, transparent)' }}
          title="Duplicar archivo"
        >
          <Copy size={12} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="p-1 hover:bg-white/20 rounded transition-colors"
          style={{ color: 'color-mix(in srgb, var(--toolbar-text) 70%, transparent)' }}
          title="Renombrar archivo"
        >
          <Edit size={12} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 hover:bg-red-500/30 rounded transition-colors"
          style={{ color: 'color-mix(in srgb, var(--toolbar-text) 70%, transparent)' }}
          title="Cerrar archivo"
        >
          <X size={12} />
        </button>
      </div>

      {/* Efecto de brillo sutil */}
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
      )}
    </div>
  );
}

function FileManager() {
  const { state, actions, utils } = useWorkspace();
  const { totalInstalled, updatesAvailable } = usePackageManager();
  const { currentTheme } = useToolbar();
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showPackageManager, setShowPackageManager] = useState(false);
  const [showEnvVars, setShowEnvVars] = useState(false);

  // Menú contextual para la barra de pestañas
  const { showContextMenu, contextMenuProps } = useContextMenu();

  const handleTabContextMenu = (e: React.MouseEvent, fileId: string) => {
    e.preventDefault();
    showContextMenu(e, [
      {
        label: "Cerrar",
        icon: <X size={14} />,
        onClick: () => actions.deleteFile(fileId),
      },
      {
        label: "Cerrar otros",
        icon: <X size={14} />,
        onClick: () => {
          state.files
            .filter((f) => f.id !== fileId)
            .forEach((f) => actions.deleteFile(f.id));
        },
      },
      {
        label: "Cerrar todos",
        icon: <X size={14} />,
        onClick: () => {
          state.files.forEach((f) => actions.deleteFile(f.id));
        },
      },
      { type: "separator" },
      {
        label: "Duplicar",
        icon: <Copy size={14} />,
        onClick: () => actions.duplicateFile(fileId),
      },
      {
        label: "Renombrar",
        icon: <Edit size={14} />,
        onClick: () => {
          // Implementación de renombrado in-line ya existente
          const fileTab = document.querySelector(`[data-file-id="${fileId}"]`);
          if (fileTab) {
            const nameElement = fileTab.querySelector(".file-name");
            if (nameElement) {
              nameElement.dispatchEvent(new MouseEvent("dblclick"));
            }
          }
        },
      },
      { type: "separator" },
      {
        label: "Guardar",
        icon: <Save size={14} />,
        onClick: () => actions.saveFile(fileId),
        disabled: !state.files.find((f) => f.id === fileId)?.isUnsaved,
      },
      {
        label: "Guardar todo",
        icon: <Save size={14} />,
        onClick: () => actions.saveAllFiles(),
        disabled: !utils.hasUnsavedChanges(),
      },
    ]);
  };

  // Menú contextual para el área de trabajo
  const handleWorkspaceContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    showContextMenu(e, [
      {
        label: "Nuevo archivo",
        icon: <Plus size={14} />,
        onClick: () => setShowNewFileDialog(true),
      },
      {
        label: "Reabrir pestaña cerrada",
        icon: <RotateCcw size={14} />,
        onClick: () => actions.reopenClosedTab(),
        disabled: !utils.hasClosedTabs(),
      },
      { type: "separator" },
      {
        label: "Guardar todo",
        icon: <Save size={14} />,
        onClick: () => actions.saveAllFiles(),
        disabled: !utils.hasUnsavedChanges(),
      },
      { type: "separator" },
      {
        label: "Configuración",
        icon: <Settings size={14} />,
        onClick: () => setShowSettingsDialog(true),
      },
      {
        label: "Gestor de paquetes",
        icon: <Package size={14} />,
        onClick: () => setShowPackageManager(true),
      },
      {
        label: "Variables de entorno",
        icon: <Globe size={14} />,
        onClick: () => setShowEnvVars(true),
      },
    ]);
  };

  // Función simplificada para crear archivo sin lógica de detección de extensiones
  const createNewFile = (name: string, initialContent: string = '') => {
    // Crear archivo directamente sin extensión automática
    // La detección será manejada internamente por el sistema
    actions.createFile(name, initialContent);
    setShowNewFileDialog(false);
  };

  return (
    <div 
      className="border-b shadow-lg"
      style={{
        backgroundColor: 'var(--toolbar-bg)',
        borderColor: 'color-mix(in srgb, var(--toolbar-text) 30%, transparent)',
      }}
      onContextMenu={handleWorkspaceContextMenu}
    >
      {/* Barra de pestañas mejorada con estilos adaptativos */}
      <div className="flex items-center overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500">
        {state.files.map((file) => (
          <FileTab
            key={file.id}
            file={file}
            isActive={file.id === state.activeFileId}
            onSelect={() => actions.setActiveFile(file.id)}
            onClose={() => actions.deleteFile(file.id)}
            onRename={(newName) => actions.renameFile(file.id, newName)}
            onDuplicate={() => actions.duplicateFile(file.id)}
            onContextMenu={(e) => handleTabContextMenu(e, file.id)}
            onReorder={actions.reorderFile} // Pass the action
          />
        ))}

        {/* Botón para nuevo archivo con estilos adaptativos */}
        <button
          onClick={() => setShowNewFileDialog(true)}
          className="flex items-center gap-2 px-4 py-3 hover:shadow-sm transition-all duration-200 border-r min-w-fit"
          style={{
            color: 'color-mix(in srgb, var(--toolbar-text) 70%, transparent)',
            borderColor: 'color-mix(in srgb, var(--toolbar-text) 30%, transparent)',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--toolbar-hover)';
            e.currentTarget.style.color = 'var(--toolbar-text)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'color-mix(in srgb, var(--toolbar-text) 70%, transparent)';
          }}
          title="Nuevo archivo (sin extensión automática)"
        >
          <Plus size={16} style={{ color: 'var(--toolbar-accent)' }} />
          <span className="text-sm font-medium">Nuevo</span>
        </button>

        {/* Botón para reabrir pestañas cerradas */}
        {utils.hasClosedTabs() && (
          <button
            onClick={() => actions.reopenClosedTab()}
            className="flex items-center gap-2 px-4 py-3 hover:shadow-sm transition-all duration-200 border-r min-w-fit"
            style={{
              color: 'color-mix(in srgb, var(--toolbar-text) 70%, transparent)',
              borderColor: 'color-mix(in srgb, var(--toolbar-text) 30%, transparent)',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--toolbar-hover)';
              e.currentTarget.style.color = 'var(--toolbar-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'color-mix(in srgb, var(--toolbar-text) 70%, transparent)';
            }}
            title="Reabrir pestaña cerrada"
          >
            <RotateCcw size={16} style={{ color: 'var(--toolbar-accent)' }} />
            <span className="text-sm font-medium">Reabrir</span>
          </button>
        )}

        {/* Espacio flexible con gradiente adaptativo */}
        <div 
          className="flex-1 h-12"
          style={{
            background: `linear-gradient(to right, color-mix(in srgb, var(--toolbar-bg) 50%, transparent), transparent)`
          }}
        />

        {/* Información del workspace con estilos adaptativos */}
        <div className="flex items-center gap-3 px-4">
          {/* Indicador de paquetes */}
          <button
            onClick={() => setShowPackageManager(true)}
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: 'color-mix(in srgb, var(--toolbar-text) 70%, transparent)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--toolbar-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'color-mix(in srgb, var(--toolbar-text) 70%, transparent)';
            }}
            title="Gestor de paquetes"
          >
            <Package size={14} style={{ color: 'var(--toolbar-accent)' }} />
            <span>{totalInstalled} paquetes</span>
            {updatesAvailable > 0 && (
              <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {updatesAvailable}
              </span>
            )}
          </button>

          {/* Botón de configuración */}
          <button
            onClick={() => setShowSettingsDialog(true)}
            className="p-1.5 hover:bg-opacity-50 rounded transition-colors"
            style={{ 
              color: 'color-mix(in srgb, var(--toolbar-text) 70%, transparent)',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--toolbar-hover)';
              e.currentTarget.style.color = 'var(--toolbar-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'color-mix(in srgb, var(--toolbar-text) 70%, transparent)';
            }}
            title="Configuración"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Diálogos */}
      {showNewFileDialog && (
        <NewFileDialog
          onClose={() => setShowNewFileDialog(false)}
          onCreate={createNewFile}
        />
      )}

      {showSettingsDialog && (
        <SettingsDialog onClose={() => setShowSettingsDialog(false)} />
      )}

      {showPackageManager && (
        <PackageManager
          isOpen={showPackageManager}
          onClose={() => setShowPackageManager(false)}
        />
      )}

      {showEnvVars && (
        <EnvironmentVariables
          isOpen={showEnvVars}
          onClose={() => setShowEnvVars(false)}
        />
      )}

      {/* Menú contextual */}
      {contextMenuProps.isOpen && (
        <ContextMenu {...contextMenuProps} />
      )}
    </div>
  );
}

export default FileManager;
