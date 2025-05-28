import { useState } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { usePackageManager } from "../context/PackageManagerContext";
import { useContextMenu } from "../hooks/useContextMenu";
import EnvironmentVariables from "./EnvironmentVariables";
import { PackageManager } from "./PackageManager";
import { ContextMenu } from "./ContextMenu";
import {
  Plus,
  X,
  FileText,
  Save,
  Download,
  Upload,
  Copy,
  Edit,
  FolderOpen,
  Code2,
  FileCode,
  Globe,
  Palette,
  Settings,
  Package,
  Menu,
  MousePointer,
  RotateCcw,
  AlertCircle,
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
}

function FileTab({
  file,
  isActive,
  onSelect,
  onClose,
  onRename,
  onDuplicate,
  onContextMenu,
}: FileTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(file.name);
  const [isHovered, setIsHovered] = useState(false);

  const handleRename = () => {
    if (editName.trim() && editName !== file.name) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const getFileIcon = () => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "js":
      case "jsx":
        return <Code2 size={14} className="text-yellow-400" />;
      case "ts":
      case "tsx":
        return <FileCode size={14} className="text-blue-400" />;
      case "html":
        return <Globe size={14} className="text-orange-400" />;
      case "css":
        return <Palette size={14} className="text-blue-300" />;
      default:
        return <FileText size={14} className="text-gray-400" />;
    }
  };

  const getFileTypeGradient = () => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "js":
      case "jsx":
        return "from-yellow-500/10 to-orange-500/10 border-yellow-500/30";
      case "ts":
      case "tsx":
        return "from-blue-500/10 to-cyan-500/10 border-blue-500/30";
      case "html":
        return "from-orange-500/10 to-red-500/10 border-orange-500/30";
      case "css":
        return "from-blue-400/10 to-purple-500/10 border-blue-400/30";
      default:
        return "from-gray-500/10 to-gray-600/10 border-gray-500/30";
    }
  };

  return (
    <div
      className={`
        group relative flex items-center gap-2 px-4 py-3 cursor-pointer transition-all duration-200 min-w-0 max-w-48
        border-r border-gray-600/50 backdrop-blur-sm
        ${
          isActive
            ? `bg-gradient-to-b ${getFileTypeGradient()} border-b-2 border-b-blue-400 shadow-lg`
            : `bg-gradient-to-b from-gray-800/50 to-gray-800/30 hover:from-gray-700/60 hover:to-gray-700/40 
             ${isHovered ? "transform scale-[1.02] shadow-md" : ""}`
        }
      `}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={onContextMenu}
    >
      {/* Indicador de estado */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
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
            className="bg-gray-900/80 border border-blue-400 px-2 py-1 text-sm min-w-0 flex-1 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
            autoFocus
          />
        ) : (
          <span
            className={`text-sm truncate min-w-0 flex-1 transition-colors ${
              isActive
                ? "text-white font-medium"
                : "text-gray-300 group-hover:text-white"
            } ${file.isUnsaved ? "italic" : ""}`}
            onDoubleClick={() => setIsEditing(true)}
            title={file.name}
          >
            {file.name}
          </span>
        )}

        {/* Indicador de archivo sin guardar */}
        {file.isUnsaved && (
          <div
            className={`w-2 h-2 rounded-full transition-colors ${
              isActive ? "bg-orange-400" : "bg-orange-500/60"
            }`}
            title="Archivo sin guardar"
          />
        )}
      </div>

      {/* Controles de acción */}
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
          title="Duplicar archivo"
        >
          <Copy size={12} className="text-gray-400 hover:text-white" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="p-1 hover:bg-white/20 rounded transition-colors"
          title="Renombrar archivo"
        >
          <Edit size={12} className="text-gray-400 hover:text-white" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 hover:bg-red-500/30 rounded transition-colors"
          title="Cerrar archivo"
        >
          <X size={12} className="text-gray-400 hover:text-red-400" />
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

  const createNewFile = (name: string, language: any) => {
    actions.createFile(name, language);
    setShowNewFileDialog(false);
  };

  return (
    <div 
      className="bg-gradient-to-b from-gray-800 to-gray-850 border-b border-gray-600/50 shadow-lg"
      onContextMenu={handleWorkspaceContextMenu}
    >
      {/* Barra de pestañas mejorada */}
      <div className="flex items-center overflow-x-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500">
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
          />
        ))}

        {/* Botón para nuevo archivo mejorado */}
        <button
          onClick={() => setShowNewFileDialog(true)}
          className="flex items-center gap-2 px-4 py-3 text-gray-400 hover:text-white hover:bg-gradient-to-b hover:from-gray-700/60 hover:to-gray-700/40 transition-all duration-200 border-r border-gray-600/50 min-w-fit"
          title="Nuevo archivo"
        >
          <Plus size={16} className="text-green-400" />
          <span className="text-sm font-medium">Nuevo</span>
        </button>

        {/* Botón para reabrir pestañas cerradas */}
        {utils.hasClosedTabs() && (
          <button
            onClick={() => actions.reopenClosedTab()}
            className="flex items-center gap-2 px-4 py-3 text-gray-400 hover:text-white hover:bg-gradient-to-b hover:from-gray-700/60 hover:to-gray-700/40 transition-all duration-200 border-r border-gray-600/50 min-w-fit"
            title="Reabrir pestaña cerrada"
          >
            <RotateCcw size={16} className="text-blue-400" />
            <span className="text-sm font-medium">Reabrir</span>
          </button>
        )}

        {/* Espacio flexible */}
        <div className="flex-1 bg-gradient-to-r from-gray-800/20 to-transparent h-12" />

        {/* Información del workspace */}
        <div className="flex items-center gap-3 px-4">
          {/* Indicador de paquetes */}
          <button
            onClick={() => setShowPackageManager(true)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
            title="Gestor de paquetes"
          >
            <Package size={14} className="text-blue-400" />
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
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors"
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
