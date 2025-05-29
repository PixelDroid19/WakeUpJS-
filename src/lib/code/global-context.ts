import { createCustomConsole } from "./console-api";
import { createReactContext, createJSXRuntime } from "./react-context";
import { ModuleSystem } from "./module-system";
import { GLOBAL_CONTEXT_CONFIG } from '../../constants/config';

/**
 * Implementación de funciones de diálogo personalizadas
 */
const createDialogFunctions = () => {
  const customAlert = (message: any) => {
    console.log("🔔 Alert:", message);
    if (typeof window !== "undefined") {
      window.alert(String(message));
    }
    return undefined;
  };

  const customConfirm = (message: any) => {
    console.log("❓ Confirm:", message);
    if (typeof window !== "undefined") {
      return window.confirm(String(message));
    }
    return false;
  };

  const customPrompt = (message: any, defaultValue?: string) => {
    console.log("✏️ Prompt:", message, "Default:", defaultValue);
    if (typeof window !== "undefined") {
      return window.prompt(String(message), defaultValue);
    }
    return null;
  };

  return { customAlert, customConfirm, customPrompt };
};

/**
 * Crea APIs Web básicas para el contexto global
 */
const createWebAPIs = () => ({
  fetch: globalThis.fetch || window.fetch || fetch,
  Headers: globalThis.Headers || window.Headers || Headers,
  Response: globalThis.Response || window.Response || Response,
  Request: globalThis.Request || window.Request || Request,
});

/**
 * Crea el proceso con variables de entorno
 */
const createProcess = () => ({
  env: {
    NODE_ENV: "development",
    REACT_APP_API_URL: "http://localhost:3000",
    REACT_APP_VERSION: "1.0.0",
    ...((globalThis as any).__JSRUNNER_ENV_VARS__ || {}),
  },
});

/**
 * Crea un contexto global completo para la ejecución de JavaScript
 * @param dynamicConfig - Configuraciones dinámicas opcionales
 * @returns Objeto con el contexto global completo
 */
export const createGlobalContext = (dynamicConfig?: {
  enableWebAPIs?: boolean;
  enableNodeAPIs?: boolean;
  enableReactAPIs?: boolean;
  strictMode?: boolean;
  sandboxLevel?: 'low' | 'medium' | 'high';
}) => {
  // Configuración por defecto usando los valores centralizados
  const config = {
    enableWebAPIs: true,
    enableNodeAPIs: true,
    enableReactAPIs: true,
    strictMode: false,
    sandboxLevel: GLOBAL_CONTEXT_CONFIG.SANDBOX_LEVEL,
    ...dynamicConfig,
  };

  // Crear instancias de los diferentes contextos
  const React = createReactContext();
  const jsxRuntime = createJSXRuntime(React);
  const moduleSystem = new ModuleSystem();
  const customConsole = createCustomConsole();
  const dialogFunctions = createDialogFunctions();
  const webAPIs = config.enableWebAPIs ? createWebAPIs() : {};
  const process = createProcess();

  // Registrar React en el sistema de módulos si está habilitado
  if (config.enableReactAPIs) {
    moduleSystem.registerReact(React, jsxRuntime);
  }

  // Crear función require
  const customRequire = moduleSystem.createRequire();

  const globalObj = {
    // APIs básicas de JavaScript (siempre disponibles)
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    Promise,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Date,
    Math,
    JSON,
    RegExp,
    Error,
    TypeError,
    ReferenceError,
    SyntaxError,
    RangeError,

    // APIs adicionales útiles
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    encodeURI,
    decodeURI,

    // Constantes globales
    undefined,
    NaN,
    Infinity,

    // Console personalizado completo
    console: customConsole,

    // APIs condicionales basadas en configuración
    ...(config.enableWebAPIs && webAPIs),

    // Funciones de diálogo (restringidas en sandbox alto)
    ...(config.sandboxLevel !== 'high' && {
      alert: dialogFunctions.customAlert,
      confirm: dialogFunctions.customConfirm,
      prompt: dialogFunctions.customPrompt,
    }),

    // React y hooks (condicionales)
    ...(config.enableReactAPIs && {
      React,
      useState: React.useState,
      useEffect: React.useEffect,
      useContext: React.useContext,
      useReducer: React.useReducer,
      useMemo: React.useMemo,
      useCallback: React.useCallback,
      useRef: React.useRef,
    }),

    // Sistema de módulos (condicional)
    ...(config.enableNodeAPIs && {
      require: customRequire,
      module: { exports: {} },
      exports: {},
      process,
    }),

    // Funciones de utilidad para el sistema de módulos
    __registerModule: (name: string, module: any) => 
      moduleSystem.registerModule(name, module),
    __getAvailableModules: () => moduleSystem.getAvailableModules(),
    
    // Información de configuración (solo en modo desarrollo)
    ...(config.sandboxLevel === 'low' && {
      __CONFIG__: config,
      __SANDBOX_LEVEL__: config.sandboxLevel,
    }),
  };

  return globalObj;
}; 