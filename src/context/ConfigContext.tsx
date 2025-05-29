import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  AUTO_SAVE_CONFIG, 
  AUTO_EXECUTION_CONFIG, 
  EDITOR_CONFIG,
  EXECUTION_ADVANCED_CONFIG,
  GLOBAL_CONTEXT_CONFIG,
  DEBUG_CONFIG,
  STORAGE_KEYS
} from '../constants/config';

// Tipos para las configuraciones
interface AutoSaveConfig {
  enabled: boolean;
  interval: number; // en ms
  debounceDelay: number; // en ms
}

interface AutoExecutionConfig {
  enabled: boolean;
  debounceTime: number; // en ms
  enableSmartDebounce: boolean;
}

interface SmartDebounceConfig {
  enabled: boolean;
  typingPauseThreshold: number;
  sizeScalingFactor: number;
  maxSizeBonus: number;
  smallChangeThreshold: number;
  largeChangeThreshold: number;
  syntaxCheckDelay: number;
  typeCheckDelay: number;
  fullExecutionDelay: number;
  showLoadingAfter: number;
  showPendingAfter: number;
}

interface ExecutionAdvancedConfig {
  timeout: number;
  maxConcurrentExecutions: number;
  cacheSize: number;
  cacheTTL: number;
  enableCache: boolean;
  enableMetrics: boolean;
  enableSecurityChecks: boolean;
  memoryLimit: number;
  loopIterationLimit: number;
  asyncWaitTime: number;
  promiseTimeout: number;
}

interface GlobalContextConfig {
  sandboxLevel: 'low' | 'medium' | 'high';
}

interface DebugConfig {
  enableVerboseLogging: boolean;
  showExecutionMetrics: boolean;
  logPerformance: boolean;
}

// Interfaz completa de configuración
interface ConfigState {
  autoSave: AutoSaveConfig;
  autoExecution: AutoExecutionConfig;
  smartDebounce: SmartDebounceConfig;
  executionAdvanced: ExecutionAdvancedConfig;
  globalContext: GlobalContextConfig;
  debug: DebugConfig;
}

// Interfaz para el contexto
interface ConfigContextType {
  config: ConfigState;
  toggleAutoSave: () => void;
  toggleAutoExecution: () => void;
  toggleSmartDebounce: () => void;
  updateAutoSaveInterval: (interval: number) => void;
  updateDebounceTime: (time: number) => void;
  updateExecutionTimeout: (timeout: number) => void;
  updateSecurityLevel: (level: 'low' | 'medium' | 'high') => void;
  resetToDefaults: () => void;
  // Nuevas funciones para configuración dinámica
  updateConfig: <K extends keyof ConfigState>(section: K, updates: Partial<ConfigState[K]>) => void;
  saveConfigProfile: (profileName: string) => void;
  loadConfigProfile: (profileName: string) => boolean;
  getAvailableProfiles: () => string[];
  exportConfig: () => string;
  importConfig: (configJson: string) => boolean;
}

// Valores iniciales
const initialConfig: ConfigState = {
  autoSave: {
    enabled: AUTO_SAVE_CONFIG.ENABLED,
    interval: AUTO_SAVE_CONFIG.INTERVAL,
    debounceDelay: AUTO_SAVE_CONFIG.DEBOUNCE_DELAY,
  },
  autoExecution: {
    enabled: AUTO_EXECUTION_CONFIG.ENABLED,
    debounceTime: AUTO_EXECUTION_CONFIG.DEBOUNCE_TIME,
    enableSmartDebounce: AUTO_EXECUTION_CONFIG.ENABLE_SMART_DEBOUNCE,
  },
  smartDebounce: {
    enabled: AUTO_EXECUTION_CONFIG.ENABLE_SMART_DEBOUNCE,
    typingPauseThreshold: EDITOR_CONFIG.SMART_DEBOUNCE.TYPING_PAUSE_THRESHOLD,
    sizeScalingFactor: EDITOR_CONFIG.SMART_DEBOUNCE.SIZE_SCALING_FACTOR,
    maxSizeBonus: EDITOR_CONFIG.SMART_DEBOUNCE.MAX_SIZE_BONUS,
    smallChangeThreshold: EDITOR_CONFIG.SMART_DEBOUNCE.SMALL_CHANGE_THRESHOLD,
    largeChangeThreshold: EDITOR_CONFIG.SMART_DEBOUNCE.LARGE_CHANGE_THRESHOLD,
    syntaxCheckDelay: EDITOR_CONFIG.SMART_DEBOUNCE.SYNTAX_CHECK_DELAY,
    typeCheckDelay: EDITOR_CONFIG.SMART_DEBOUNCE.TYPE_CHECK_DELAY,
    fullExecutionDelay: EDITOR_CONFIG.SMART_DEBOUNCE.FULL_EXECUTION_DELAY,
    showLoadingAfter: EDITOR_CONFIG.SMART_DEBOUNCE.SHOW_LOADING_AFTER,
    showPendingAfter: EDITOR_CONFIG.SMART_DEBOUNCE.SHOW_PENDING_AFTER,
  },
  executionAdvanced: {
    timeout: EXECUTION_ADVANCED_CONFIG.TIMEOUT,
    maxConcurrentExecutions: EXECUTION_ADVANCED_CONFIG.MAX_CONCURRENT_EXECUTIONS,
    cacheSize: EXECUTION_ADVANCED_CONFIG.CACHE_SIZE,
    cacheTTL: EXECUTION_ADVANCED_CONFIG.CACHE_TTL,
    enableCache: EXECUTION_ADVANCED_CONFIG.ENABLE_CACHE,
    enableMetrics: EXECUTION_ADVANCED_CONFIG.ENABLE_METRICS,
    enableSecurityChecks: EXECUTION_ADVANCED_CONFIG.ENABLE_SECURITY_CHECKS,
    memoryLimit: EXECUTION_ADVANCED_CONFIG.MEMORY_LIMIT,
    loopIterationLimit: EXECUTION_ADVANCED_CONFIG.LOOP_ITERATION_LIMIT,
    asyncWaitTime: EXECUTION_ADVANCED_CONFIG.ASYNC_WAIT_TIME,
    promiseTimeout: EXECUTION_ADVANCED_CONFIG.PROMISE_TIMEOUT,
  },
  globalContext: {
    sandboxLevel: GLOBAL_CONTEXT_CONFIG.SANDBOX_LEVEL,
  },
  debug: {
    enableVerboseLogging: DEBUG_CONFIG.ENABLE_VERBOSE_LOGGING,
    showExecutionMetrics: DEBUG_CONFIG.SHOW_EXECUTION_METRICS,
    logPerformance: DEBUG_CONFIG.LOG_PERFORMANCE,
  },
};

// Crear el contexto
const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

// Clave para almacenar perfiles de configuración
const CONFIG_PROFILES_KEY = 'jsrunner-config-profiles';
const ACTIVE_PROFILE_KEY = 'jsrunner-active-profile';

// Provider
export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ConfigState>(() => {
    // Cargar configuración desde localStorage si existe
    try {
      // Intentar cargar desde perfil activo primero
      const activeProfile = localStorage.getItem(ACTIVE_PROFILE_KEY);
      if (activeProfile) {
        const profiles = JSON.parse(localStorage.getItem(CONFIG_PROFILES_KEY) || '{}');
        if (profiles[activeProfile]) {
          console.log(`📋 Cargando perfil de configuración: ${activeProfile}`);
          return JSON.parse(profiles[activeProfile]);
        }
      }
      
      // Cargar configuración individual si no hay perfil
      const savedAutoSaveEnabled = localStorage.getItem(STORAGE_KEYS.AUTO_SAVE_ENABLED);
      const savedAutoExecutionEnabled = localStorage.getItem(STORAGE_KEYS.AUTO_EXECUTION_ENABLED);
      const savedSmartDebounceEnabled = localStorage.getItem(STORAGE_KEYS.SMART_DEBOUNCE_ENABLED);
      
      // Mezclar valores guardados con la configuración inicial
      return {
        ...initialConfig,
        autoSave: {
          ...initialConfig.autoSave,
          enabled: savedAutoSaveEnabled !== null ? savedAutoSaveEnabled === 'true' : initialConfig.autoSave.enabled,
        },
        autoExecution: {
          ...initialConfig.autoExecution,
          enabled: savedAutoExecutionEnabled !== null ? savedAutoExecutionEnabled === 'true' : initialConfig.autoExecution.enabled,
          enableSmartDebounce: savedSmartDebounceEnabled !== null ? savedSmartDebounceEnabled === 'true' : initialConfig.autoExecution.enableSmartDebounce,
        },
        smartDebounce: {
          ...initialConfig.smartDebounce,
          enabled: savedSmartDebounceEnabled !== null ? savedSmartDebounceEnabled === 'true' : initialConfig.smartDebounce.enabled,
        }
      };
    } catch (error) {
      console.error('Error loading config from localStorage:', error);
      return initialConfig;
    }
  });

  // Guardar cambios en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTO_SAVE_ENABLED, String(config.autoSave.enabled));
      localStorage.setItem(STORAGE_KEYS.AUTO_EXECUTION_ENABLED, String(config.autoExecution.enabled));
      localStorage.setItem(STORAGE_KEYS.SMART_DEBOUNCE_ENABLED, String(config.smartDebounce.enabled));
      
      // Si hay un perfil activo, actualizarlo también
      const activeProfile = localStorage.getItem(ACTIVE_PROFILE_KEY);
      if (activeProfile) {
        const profiles = JSON.parse(localStorage.getItem(CONFIG_PROFILES_KEY) || '{}');
        if (profiles[activeProfile]) {
          profiles[activeProfile] = JSON.stringify(config);
          localStorage.setItem(CONFIG_PROFILES_KEY, JSON.stringify(profiles));
        }
      }
    } catch (error) {
      console.error('Error saving config to localStorage:', error);
    }
  }, [config]);

  // Funciones para modificar la configuración
  const toggleAutoSave = () => {
    setConfig(prev => ({
      ...prev,
      autoSave: {
        ...prev.autoSave,
        enabled: !prev.autoSave.enabled
      }
    }));
  };

  const toggleAutoExecution = () => {
    setConfig(prev => ({
      ...prev,
      autoExecution: {
        ...prev.autoExecution,
        enabled: !prev.autoExecution.enabled
      }
    }));
  };

  const toggleSmartDebounce = () => {
    setConfig(prev => ({
      ...prev,
      autoExecution: {
        ...prev.autoExecution,
        enableSmartDebounce: !prev.autoExecution.enableSmartDebounce
      },
      smartDebounce: {
        ...prev.smartDebounce,
        enabled: !prev.smartDebounce.enabled
      }
    }));
  };

  const updateAutoSaveInterval = (interval: number) => {
    setConfig(prev => ({
      ...prev,
      autoSave: {
        ...prev.autoSave,
        interval
      }
    }));
  };

  const updateDebounceTime = (time: number) => {
    setConfig(prev => ({
      ...prev,
      autoExecution: {
        ...prev.autoExecution,
        debounceTime: time
      }
    }));
  };

  const updateExecutionTimeout = (timeout: number) => {
    setConfig(prev => ({
      ...prev,
      executionAdvanced: {
        ...prev.executionAdvanced,
        timeout
      }
    }));
  };

  const updateSecurityLevel = (level: 'low' | 'medium' | 'high') => {
    setConfig(prev => ({
      ...prev,
      globalContext: {
        ...prev.globalContext,
        sandboxLevel: level
      }
    }));
  };

  const resetToDefaults = () => {
    setConfig(initialConfig);
  };

  // Función para actualizar cualquier sección de la configuración dinámicamente
  const updateConfig = useCallback(<K extends keyof ConfigState>(section: K, updates: Partial<ConfigState[K]>) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...updates
      }
    }));
  }, []);

  // Función para guardar un perfil de configuración
  const saveConfigProfile = useCallback((profileName: string) => {
    try {
      const profiles = JSON.parse(localStorage.getItem(CONFIG_PROFILES_KEY) || '{}');
      profiles[profileName] = JSON.stringify(config);
      localStorage.setItem(CONFIG_PROFILES_KEY, JSON.stringify(profiles));
      localStorage.setItem(ACTIVE_PROFILE_KEY, profileName);
      console.log(`💾 Perfil de configuración guardado: ${profileName}`);
    } catch (error) {
      console.error('Error guardando perfil de configuración:', error);
    }
  }, [config]);

  // Función para cargar un perfil de configuración
  const loadConfigProfile = useCallback((profileName: string): boolean => {
    try {
      const profiles = JSON.parse(localStorage.getItem(CONFIG_PROFILES_KEY) || '{}');
      if (profiles[profileName]) {
        const profileConfig = JSON.parse(profiles[profileName]);
        setConfig(profileConfig);
        localStorage.setItem(ACTIVE_PROFILE_KEY, profileName);
        console.log(`📋 Perfil de configuración cargado: ${profileName}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error cargando perfil de configuración:', error);
      return false;
    }
  }, []);

  // Función para obtener los perfiles disponibles
  const getAvailableProfiles = useCallback((): string[] => {
    try {
      const profiles = JSON.parse(localStorage.getItem(CONFIG_PROFILES_KEY) || '{}');
      return Object.keys(profiles);
    } catch (error) {
      console.error('Error obteniendo perfiles disponibles:', error);
      return [];
    }
  }, []);

  // Función para exportar la configuración actual
  const exportConfig = useCallback((): string => {
    return JSON.stringify(config, null, 2);
  }, [config]);

  // Función para importar configuración
  const importConfig = useCallback((configJson: string): boolean => {
    try {
      const importedConfig = JSON.parse(configJson);
      
      // Validación básica de la estructura
      if (!importedConfig.autoSave || !importedConfig.autoExecution || 
          !importedConfig.smartDebounce || !importedConfig.executionAdvanced) {
        console.error('Formato de configuración inválido');
        return false;
      }
      
      setConfig(importedConfig);
      return true;
    } catch (error) {
      console.error('Error importando configuración:', error);
      return false;
    }
  }, []);

  return (
    <ConfigContext.Provider
      value={{
        config,
        toggleAutoSave,
        toggleAutoExecution,
        toggleSmartDebounce,
        updateAutoSaveInterval,
        updateDebounceTime,
        updateExecutionTimeout,
        updateSecurityLevel,
        resetToDefaults,
        // Nuevas funciones
        updateConfig,
        saveConfigProfile,
        loadConfigProfile,
        getAvailableProfiles,
        exportConfig,
        importConfig
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

// Hooks para usar el contexto
export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}

// Hooks específicos para cada sección de configuración
export function useAutoSaveConfig() {
  const { config } = useConfig();
  return config.autoSave;
}

export function useAutoExecutionConfig() {
  const { config } = useConfig();
  return config.autoExecution;
}

export function useSmartDebounceConfig() {
  const { config } = useConfig();
  return config.smartDebounce;
}

export function useExecutionAdvancedConfig() {
  const { config } = useConfig();
  return config.executionAdvanced;
}

export function useGlobalContextConfig() {
  const { config } = useConfig();
  return config.globalContext;
}

export function useDebugConfig() {
  const { config } = useConfig();
  return config.debug;
}