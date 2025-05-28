import { useEffect, useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToolbar } from '../context/ToolbarContext';
import { useSplitLayout } from './useSplitLayout';
import { MenuItem, ContextMenuProps } from '../components/ContextMenu';

interface UseContextMenuProps {
  onClearResults?: () => void;
  onShowEnvironmentVariables?: () => void;
  onShowPackageManager?: () => void;
  onShowSnippetManager?: () => void;
}

export function useContextMenu({ 
  onClearResults, 
  onShowEnvironmentVariables, 
  onShowPackageManager,
  onShowSnippetManager
}: UseContextMenuProps = {}) {
  const { actions } = useWorkspace();
  const { toggleSettings } = useToolbar();
  const { changeDirection } = useSplitLayout();
  const [contextMenuProps, setContextMenuProps] = useState<ContextMenuProps>({
    isOpen: false,
    x: 0,
    y: 0,
    items: [],
    onClose: () => setContextMenuProps(prev => ({ ...prev, isOpen: false }))
  });

  useEffect(() => {
    const handleContextMenuCommand = async (event: any, command: string) => {
      console.log('Context menu command:', command);

      switch (command) {
        // Templates
        case 'load-template-react-basic':
          actions.loadTemplate('react-basic');
          break;
        case 'load-template-vanilla-dom':
          actions.loadTemplate('vanilla-dom');
          break;
        case 'load-template-algorithms':
          actions.loadTemplate('algorithms');
          break;
        case 'load-template-api-fetch':
          actions.loadTemplate('api-fetch');
          break;

        // Archivo
        case 'save-all-files':
          actions.saveAllFiles();
          break;
        case 'export-workspace':
          await handleExportWorkspace();
          break;
        case 'import-workspace':
          await handleImportWorkspace();
          break;

        // Herramientas
        case 'show-environment-variables':
          onShowEnvironmentVariables?.();
          break;
        case 'show-package-manager':
          onShowPackageManager?.();
          break;
        case 'show-snippet-manager':
          onShowSnippetManager?.();
          break;
        case 'clear-history':
          actions.clearHistory();
          break;
        case 'clear-results':
          onClearResults?.();
          break;

        // Vista
        case 'toggle-layout':
          changeDirection();
          break;
        case 'show-toolbar-settings':
          toggleSettings();
          break;

        // Acerca de
        case 'show-about':
          // El diálogo se maneja en el proceso principal
          if (window.electronAPI) {
            window.electronAPI.send('show-about-dialog');
          }
          break;

        default:
          console.warn('Comando de menú no reconocido:', command);
      }
    };

    const handleExportWorkspace = async () => {
      try {
        const workspaceData = actions.exportWorkspace();
        
        if (window.electronAPI) {
          const success = await window.electronAPI.invoke('export-workspace-dialog', workspaceData);
          if (success) {
            console.log('Workspace exportado exitosamente');
          } else {
            console.log('Exportación cancelada o falló');
          }
        } else {
          // Fallback para web (descarga directa)
          const blob = new Blob([workspaceData], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `jsrunner-workspace-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error('Error exportando workspace:', error);
      }
    };

    const handleImportWorkspace = async () => {
      try {
        if (window.electronAPI) {
          const workspaceData = await window.electronAPI.invoke('import-workspace-dialog');
          if (workspaceData) {
            actions.importWorkspace(workspaceData);
            console.log('Workspace importado exitosamente');
          } else {
            console.log('Importación cancelada');
          }
        } else {
          // Fallback para web (input file)
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json';
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const content = event.target?.result as string;
                actions.importWorkspace(content);
              };
              reader.readAsText(file);
            }
          };
          input.click();
        }
      } catch (error) {
        console.error('Error importando workspace:', error);
      }
    };

    // Registrar el listener si estamos en Electron
    if (window.electronAPI) {
      window.electronAPI.on('context-menu-command', handleContextMenuCommand);
    }

    // Cerrar el menú contextual al hacer clic fuera
    const handleClickOutside = () => {
      if (contextMenuProps.isOpen) {
        contextMenuProps.onClose();
      }
    };

    document.addEventListener('click', handleClickOutside);

    // Cleanup
    return () => {
      if (window.electronAPI && window.electronAPI.removeListener) {
        window.electronAPI.removeListener('context-menu-command', handleContextMenuCommand);
      }
      document.removeEventListener('click', handleClickOutside);
    };
  }, [actions, toggleSettings, changeDirection, onClearResults, onShowEnvironmentVariables, onShowPackageManager, onShowSnippetManager, contextMenuProps]);

  // Función para mostrar el menú contextual nativo de Electron
  const showNativeContextMenu = () => {
    if (window.electronAPI) {
      window.electronAPI.send('show-context-menu');
    }
  };

  // Función para mostrar un menú contextual personalizado
  const showContextMenu = (e: React.MouseEvent, items: MenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();

    // Calcular la posición del menú
    let x = e.clientX;
    let y = e.clientY;

    // Ajustar posición si está cerca del borde
    const menuWidth = 220; // Ancho aproximado del menú
    const menuHeight = items.length * 36; // Altura aproximada del menú

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth;
    }

    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight;
    }

    setContextMenuProps({
      isOpen: true,
      x,
      y,
      items,
      onClose: () => setContextMenuProps(prev => ({ ...prev, isOpen: false }))
    });
  };

  return {
    showContextMenu,
    showNativeContextMenu,
    contextMenuProps
  };
}

// Tipos para window.electronAPI
declare global {
  interface Window {
    electronAPI?: {
      send: (channel: string, data?: any) => void;
      invoke: (channel: string, data?: any) => Promise<any>;
      on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
      removeListener: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    };
  }
} 