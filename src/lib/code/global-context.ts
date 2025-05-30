import { createCustomConsole } from "./console-api";
import { GLOBAL_CONTEXT_CONFIG } from '../../constants/config';

/**
 * Sistema de gestión de módulos para el entorno de ejecución
 */
class ModuleSystem {
  private moduleRegistry = new Map<string, any>();

  constructor() {
    this.setupDefaultModules();
  }

  /**
   * Configura los módulos predeterminados del sistema
   */
  private setupDefaultModules() {
    // Paquetes adicionales comunes
    this.moduleRegistry.set("lodash", {
      map: (collection: any, iteratee: Function) => collection.map(iteratee),
      filter: (collection: any, predicate: Function) =>
        collection.filter(predicate),
      reduce: (collection: any, iteratee: Function, accumulator: any) =>
        collection.reduce(iteratee, accumulator),
      cloneDeep: (obj: any) => JSON.parse(JSON.stringify(obj)),
      isEqual: (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b),
      debounce: (func: Function, delay: number) => {
        let timeoutId: any;
        return (...args: any[]) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => func.apply(null, args), delay);
        };
      },
    });
  }

  /**
   * Registra React y su runtime en el sistema de módulos
   * @param React - Instancia de React
   * @param jsxRuntime - Runtime de JSX
   */
  registerReact(React: any, jsxRuntime: any) {
    this.moduleRegistry.set("react", React);
    this.moduleRegistry.set("react/jsx-runtime", jsxRuntime);
  }

  /**
   * Sistema de require/import personalizado
   * @param moduleName - Nombre del módulo a cargar
   * @returns Módulo solicitado
   */
  createRequire() {
    return (moduleName: string) => {
      console.log("📦 Cargando módulo:", moduleName);

      if (this.moduleRegistry.has(moduleName)) {
        return this.moduleRegistry.get(moduleName);
      }

      // Intentar cargar desde paquetes instalados
      const installedPackages = JSON.parse(
        localStorage.getItem("jsrunner-packages") || "{}"
      );
      if (installedPackages[moduleName]) {
        console.log("📦 Módulo encontrado en paquetes instalados:", moduleName);
        // En una implementación real, aquí cargaríamos desde CDN
        return installedPackages[moduleName];
      }

      throw new Error(
        `Cannot find module '${moduleName}'. Instálalo usando el gestor de paquetes.`
      );
    };
  }

  /**
   * Registra un nuevo módulo en el sistema
   * @param name - Nombre del módulo
   * @param module - Contenido del módulo
   */
  registerModule(name: string, module: any) {
    this.moduleRegistry.set(name, module);
    console.log("📦 Módulo registrado:", name);
  }

  /**
   * Obtiene la lista de módulos disponibles
   * @returns Array con los nombres de módulos disponibles
   */
  getAvailableModules(): string[] {
    return Array.from(this.moduleRegistry.keys());
  }
}

/**
 * Crea una simulación completa de React para el entorno de ejecución
 * @returns Objeto React con todos los métodos y componentes necesarios
 */
const createReactContext = () => {
  const React: any = {
    createElement: (type: any, props: any, ...children: any[]) => {
      return {
        type,
        props: {
          ...props,
          children: children.length === 1 ? children[0] : children,
        },
        $$typeof: Symbol.for("react.element"),
      };
    },
    Fragment: Symbol.for("react.fragment"),

    // Hooks completos
    useState: (initial: any) => {
      let state = initial;
      const setState = (newState: any) => {
        state = typeof newState === "function" ? newState(state) : newState;
        console.log("Estado actualizado:", state);
        return state;
      };
      return [state, setState];
    },

    useEffect: (effect: Function, _deps?: any[]) => {
      console.log("useEffect ejecutado");
      try {
        const cleanup = effect();
        if (typeof cleanup === "function") {
          console.log("useEffect cleanup registrado");
        }
        return cleanup;
      } catch (error) {
        console.error("Error en useEffect:", error);
      }
    },

    useContext: (context: any) => {
      console.log("useContext llamado");
      return context._currentValue || context.defaultValue;
    },

    useReducer: (reducer: Function, initialState: any) => {
      let state = initialState;
      const dispatch = (action: any) => {
        state = reducer(state, action);
        console.log("Estado reducer actualizado:", state);
        return state;
      };
      return [state, dispatch];
    },

    useMemo: (factory: Function, _deps?: any[]) => {
      console.log("useMemo ejecutado");
      return factory();
    },

    useCallback: (callback: Function, _deps?: any[]) => {
      console.log("useCallback ejecutado");
      return callback;
    },

    useRef: (initialValue?: any) => {
      return { current: initialValue };
    },

    // Utilidades adicionales
    createContext: (defaultValue?: any) => {
      return {
        Provider: ({ value, children }: any) => ({
          type: "Provider",
          props: { value, children },
          $$typeof: Symbol.for("react.element"),
        }),
        Consumer: ({ children }: any) => ({
          type: "Consumer",
          props: { children },
          $$typeof: Symbol.for("react.element"),
        }),
        _currentValue: defaultValue,
        defaultValue,
      };
    },
  };

  // Componentes básicos (definidos después de React para evitar referencias circulares)
  React.Component = class Component {
    props: any;
    constructor(props: any) {
      this.props = props;
    }
    render() {
      return null;
    }
  };

  React.PureComponent = class PureComponent extends React.Component {
    shouldComponentUpdate(nextProps: any) {
      // Shallow comparison
      return JSON.stringify(this.props) !== JSON.stringify(nextProps);
    }
  };

  return React;
};

/**
 * Crea el runtime de JSX para React
 * @param React - Instancia de React
 * @returns Objeto con funciones jsx y jsxs
 */
const createJSXRuntime = (React: any) => ({
  jsx: React.createElement,
  jsxs: React.createElement,
  Fragment: React.Fragment,
});

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