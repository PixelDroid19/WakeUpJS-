import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { themeManager } from '../lib/themes/theme-manager';

export type ToolbarTheme = 'dark' | 'light' | 'blue' | 'purple' | 'green' | 'custom';
export type ToolbarSize = 'sm' | 'md' | 'lg';
export type ToolbarMode = 'normal' | 'floating' | 'minimal' | 'compact';
export type ToolbarPosition = 'top' | 'bottom' | 'left' | 'right';

// Temas unificados que combinan toolbar y editor
export interface UnifiedTheme {
  id: string;
  name: string;
  description: string;
  toolbar: {
    background: string;
    text: string;
    accent: string;
    hover: string;
  };
  editor: {
    name: string; // Nombre del tema en ThemeManager
    displayName: string;
  };
  preview: string;
}

// Definición de temas unificados
export const UNIFIED_THEMES: UnifiedTheme[] = [
  {
    id: 'onedark-unified',
    name: 'One Dark',
    description: 'Tema oscuro inspirado en Atom One Dark',
    toolbar: {
      background: '#282c34',
      text: '#abb2bf',
      accent: '#61afef',
      hover: '#3e4451'
    },
    editor: {
      name: 'onedark',
      displayName: 'One Dark'
    },
    preview: 'bg-gray-800'
  },
  {
    id: 'light-unified',
    name: 'Light',
    description: 'Tema claro clásico para mejor legibilidad',
    toolbar: {
      background: '#ffffff',
      text: '#24292e',
      accent: '#0366d6',
      hover: '#f6f8fa'
    },
    editor: {
      name: 'light',
      displayName: 'Light'
    },
    preview: 'bg-white border border-gray-300'
  },
  {
    id: 'blue-unified',
    name: 'Blue Professional',
    description: 'Tema azul profesional',
    toolbar: {
      background: '#1e3a8a',
      text: '#ffffff',
      accent: '#60a5fa',
      hover: '#1e40af'
    },
    editor: {
      name: 'onedark', // Usar onedark como base
      displayName: 'Blue Dark'
    },
    preview: 'bg-blue-600'
  },
  {
    id: 'purple-unified',
    name: 'Purple Creative',
    description: 'Tema púrpura creativo',
    toolbar: {
      background: '#7c3aed',
      text: '#ffffff',
      accent: '#a78bfa',
      hover: '#8b5cf6'
    },
    editor: {
      name: 'onedark', // Usar onedark como base
      displayName: 'Purple Dark'
    },
    preview: 'bg-purple-600'
  },
  {
    id: 'green-unified',
    name: 'Green Natural',
    description: 'Tema verde natural',
    toolbar: {
      background: '#059669',
      text: '#ffffff',
      accent: '#34d399',
      hover: '#047857'
    },
    editor: {
      name: 'onedark', // Usar onedark como base
      displayName: 'Green Dark'
    },
    preview: 'bg-green-600'
  }
];

interface ToolbarConfig {
  theme: string; // ID del tema unificado
  size: ToolbarSize;
  mode: ToolbarMode;
  position: ToolbarPosition;
  showResultCount: boolean;
  showTitle: boolean;
  hideUndefined: boolean;
  customColors: {
    background: string;
    text: string;
    accent: string;
    hover: string;
  } | null;
}

interface ToolbarContextType {
  config: ToolbarConfig;
  updateConfig: (updates: Partial<ToolbarConfig>) => void;
  showSettings: boolean;
  toggleSettings: () => void;
  // Nuevas funciones para temas unificados
  currentTheme: UnifiedTheme;
  availableThemes: UnifiedTheme[];
  setUnifiedTheme: (themeId: string) => void;
}

const defaultConfig: ToolbarConfig = {
  theme: 'onedark-unified',
  size: 'md',
  mode: 'floating',
  position: 'bottom',
  showResultCount: true,
  showTitle: true,
  hideUndefined: true,
  customColors: null
};

const ToolbarContext = createContext<ToolbarContextType | undefined>(undefined);

export function ToolbarProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ToolbarConfig>(defaultConfig);
  const [showSettings, setShowSettings] = useState(false);

  // Obtener tema actual
  const currentTheme = UNIFIED_THEMES.find(t => t.id === config.theme) || UNIFIED_THEMES[0];

  const updateConfig = (updates: Partial<ToolbarConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const toggleSettings = () => {
    setShowSettings(prev => !prev);
  };

  // Función para cambiar tema unificado
  const setUnifiedTheme = (themeId: string) => {
    const theme = UNIFIED_THEMES.find(t => t.id === themeId);
    if (!theme) return;

    // Actualizar configuración del toolbar
    updateConfig({ theme: themeId });

    // Aplicar tema al editor a través del ThemeManager
    themeManager.setTheme(theme.editor.name);

    // Aplicar estilos CSS para el toolbar
    applyToolbarTheme(theme);

    console.log(`🎨 Tema unificado aplicado: ${theme.name}`);
  };

  // Aplicar estilos del toolbar
  const applyToolbarTheme = (theme: UnifiedTheme) => {
    const root = document.documentElement;
    
    // Variables CSS para el toolbar
    root.style.setProperty('--toolbar-bg', theme.toolbar.background);
    root.style.setProperty('--toolbar-text', theme.toolbar.text);
    root.style.setProperty('--toolbar-accent', theme.toolbar.accent);
    root.style.setProperty('--toolbar-hover', theme.toolbar.hover);
    
    // Aplicar clase del tema
    document.body.className = document.body.className.replace(/unified-theme-\w+/g, '');
    document.body.classList.add(`unified-theme-${theme.id}`);
  };

  // Aplicar tema inicial
  useEffect(() => {
    setUnifiedTheme(config.theme);
  }, []);

  return (
    <ToolbarContext.Provider value={{
      config,
      updateConfig,
      showSettings,
      toggleSettings,
      currentTheme,
      availableThemes: UNIFIED_THEMES,
      setUnifiedTheme
    }}>
      {children}
    </ToolbarContext.Provider>
  );
}

export function useToolbar() {
  const context = useContext(ToolbarContext);
  if (!context) {
    throw new Error('useToolbar must be used within a ToolbarProvider');
  }
  return context;
}