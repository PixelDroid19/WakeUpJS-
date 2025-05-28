import { createCustomConsole } from "./console-api";
import { createReactContext, createJSXRuntime } from "./react-context";
import { ModuleSystem } from "./module-system";

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
 * @returns Objeto con el contexto global completo
 */
export const createGlobalContext = () => {
  // Crear instancias de los diferentes contextos
  const React = createReactContext();
  const jsxRuntime = createJSXRuntime(React);
  const moduleSystem = new ModuleSystem();
  const customConsole = createCustomConsole();
  const dialogFunctions = createDialogFunctions();
  const webAPIs = createWebAPIs();
  const process = createProcess();

  // Registrar React en el sistema de módulos
  moduleSystem.registerReact(React, jsxRuntime);

  // Crear función require
  const customRequire = moduleSystem.createRequire();

  const globalObj = {
    // APIs básicas de JavaScript
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

    // APIs Web importantes
    ...webAPIs,

    // Funciones de diálogo
    alert: dialogFunctions.customAlert,
    confirm: dialogFunctions.customConfirm,
    prompt: dialogFunctions.customPrompt,

    // Constantes globales
    undefined,
    NaN,
    Infinity,

    // React disponible globalmente
    React,

    // Hooks disponibles globalmente para JSX sin imports
    useState: React.useState,
    useEffect: React.useEffect,
    useContext: React.useContext,
    useReducer: React.useReducer,
    useMemo: React.useMemo,
    useCallback: React.useCallback,
    useRef: React.useRef,

    // Sistema de módulos
    require: customRequire,
    module: { exports: {} },
    exports: {},

    // Variables de entorno personalizadas
    process,

    // Console personalizado completo
    console: customConsole,

    // Funciones de utilidad para el sistema de módulos
    __registerModule: (name: string, module: any) => 
      moduleSystem.registerModule(name, module),
    __getAvailableModules: () => moduleSystem.getAvailableModules(),
  };

  return globalObj;
}; 