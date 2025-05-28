import { createContext, useContext, useState, ReactNode } from 'react';

export type ToolbarTheme = 'dark' | 'light' | 'blue' | 'purple' | 'green' | 'custom';
export type ToolbarSize = 'sm' | 'md' | 'lg';
export type ToolbarMode = 'normal' | 'floating' | 'minimal' | 'compact';
export type ToolbarPosition = 'top' | 'bottom' | 'left' | 'right';

interface ToolbarConfig {
  theme: ToolbarTheme;
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
}

const defaultConfig: ToolbarConfig = {
  theme: 'dark',
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

  const updateConfig = (updates: Partial<ToolbarConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const toggleSettings = () => {
    setShowSettings(prev => !prev);
  };

  return (
    <ToolbarContext.Provider value={{
      config,
      updateConfig,
      showSettings,
      toggleSettings
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