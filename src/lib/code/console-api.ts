/**
 * Interfaz extendida para Console que incluye métodos experimentales
 * Esto resuelve los errores de TypeScript con console.context
 */
interface ExtendedConsole extends Console {
  context?: (name?: string) => Console;
  createTask?: (name: string) => { run: (fn: Function) => any };
  exception?: (...args: any[]) => void; // Deprecated alias for error
  memory?: {
    totalJSHeapSize: number;
    usedJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

/**
 * Almacén interno para contadores y timers
 */
const internalStorage = {
  counters: new Map<string, number>(),
  timers: new Map<string, number>(),
  groups: [] as string[],
};

/**
 * Crea una API de console personalizada con todos los métodos estándar y experimentales según MDN
 * @returns Objeto console personalizado completamente compatible con MDN Web API
 */
export const createCustomConsole = () => {
  return {
    // ===============================
    // MÉTODOS BÁSICOS DE LOGGING
    // ===============================

    /**
     * Outputs a message to the console
     */
    log: (...args: any[]) => console.log(...args),

    /**
     * Outputs a message to the console with the warning log level
     */
    warn: (...args: any[]) => console.warn(...args),

    /**
     * Outputs a message to the console with the error log level
     */
    error: (...args: any[]) => console.error(...args),

    /**
     * Outputs a message to the console with the info log level
     */
    info: (...args: any[]) => console.info(...args),

    /**
     * Outputs a message to the console with the debug log level
     */
    debug: (...args: any[]) => console.debug(...args),

    // ===============================
    // MÉTODOS DE VISUALIZACIÓN AVANZADA
    // ===============================

    /**
     * Displays an interactive listing of the properties of a specified JavaScript object
     */
    dir: (obj: any, options?: any) =>
      console.dir ? console.dir(obj, options) : console.log(obj),

    /**
     * Displays an XML/HTML Element representation of the specified object if possible
     */
    dirxml: (...args: any[]) =>
      console.dirxml ? console.dirxml(...args) : console.log(...args),

    /**
     * Displays tabular data as a table
     */
    table: (data: any, columns?: string[]) =>
      console.table ? console.table(data, columns) : console.log(data),

    // ===============================
    // MÉTODOS DE TRACING Y DEBUGGING
    // ===============================

    /**
     * Outputs a stack trace
     */
    trace: (...args: any[]) =>
      console.trace ? console.trace(...args) : console.log("Trace:", ...args),

    /**
     * Log an error message to console if the first argument is false
     */
    assert: (condition: any, ...args: any[]) => {
      if (console.assert) {
        console.assert(condition, ...args);
      } else if (!condition) {
        console.error("Assertion failed:", ...args);
      }
    },

    // ===============================
    // MÉTODOS DE AGRUPACIÓN
    // ===============================

    /**
     * Creates a new inline group, indenting all following output by another level
     */
    group: (...args: any[]) => {
      const label = args.length > 0 ? args.join(" ") : "default";
      internalStorage.groups.push(label);
      
      if (console.group) {
        console.group(...args);
      } else {
        const indent = "  ".repeat(internalStorage.groups.length - 1);
        console.log(`${indent}▼ Group:`, ...args);
      }
    },

    /**
     * Creates a new inline group, but collapsed requiring the use of a disclosure button to expand it
     */
    groupCollapsed: (...args: any[]) => {
      const label = args.length > 0 ? args.join(" ") : "default";
      internalStorage.groups.push(label);
      
      if (console.groupCollapsed) {
        console.groupCollapsed(...args);
      } else {
        const indent = "  ".repeat(internalStorage.groups.length - 1);
        console.log(`${indent}▶ Group (collapsed):`, ...args);
      }
    },

    /**
     * Exits the current inline group
     */
    groupEnd: () => {
      if (internalStorage.groups.length > 0) {
        internalStorage.groups.pop();
      }
      
      if (console.groupEnd) {
        console.groupEnd();
      } else {
        const indent = "  ".repeat(internalStorage.groups.length);
        console.log(`${indent}▲ Group End`);
      }
    },

    // ===============================
    // MÉTODOS DE CONTEO
    // ===============================

    /**
     * Log the number of times this line has been called with the given label
     */
    count: (label: string = "default") => {
      if (console.count) {
        console.count(label);
      } else {
        const currentCount = (internalStorage.counters.get(label) || 0) + 1;
        internalStorage.counters.set(label, currentCount);
        console.log(`${label}: ${currentCount}`);
      }
    },

    /**
     * Resets the value of the counter with the given label
     */
    countReset: (label: string = "default") => {
      if (console.countReset) {
        console.countReset(label);
      } else {
        internalStorage.counters.delete(label);
        console.log(`${label}: 0`);
      }
    },

    // ===============================
    // MÉTODOS DE TIEMPO
    // ===============================

    /**
     * Starts a timer with a name specified as an input parameter
     */
    time: (label: string = "default") => {
      if (console.time) {
        console.time(label);
      } else {
        internalStorage.timers.set(label, Date.now());
        console.log(`Timer '${label}' started`);
      }
    },

    /**
     * Stops the specified timer and logs the elapsed time in milliseconds since it started
     */
    timeEnd: (label: string = "default") => {
      if (console.timeEnd) {
        console.timeEnd(label);
      } else {
        const startTime = internalStorage.timers.get(label);
        if (startTime) {
          const elapsed = Date.now() - startTime;
          internalStorage.timers.delete(label);
          console.log(`${label}: ${elapsed}ms`);
        } else {
          console.warn(`Timer '${label}' does not exist`);
        }
      }
    },

    /**
     * Logs the value of the specified timer to the console
     */
    timeLog: (label: string = "default", ...args: any[]) => {
      if (console.timeLog) {
        console.timeLog(label, ...args);
      } else {
        const startTime = internalStorage.timers.get(label);
        if (startTime) {
          const elapsed = Date.now() - startTime;
          console.log(`${label}: ${elapsed}ms`, ...args);
        } else {
          console.warn(`Timer '${label}' does not exist`);
        }
      }
    },

    /**
     * Adds a marker to the browser performance tool's timeline (Non-standard)
     */
    timeStamp: (label?: string) => {
      if (console.timeStamp) {
        console.timeStamp(label);
      } else {
        const timestamp = Date.now();
        const timeLabel = label || "timestamp";
        console.log(`Timestamp '${timeLabel}': ${timestamp} (${new Date(timestamp).toISOString()})`);
      }
    },

    // ===============================
    // MÉTODOS DE PROFILING (Non-standard)
    // ===============================

    /**
     * Starts the browser's built-in profiler (Non-standard)
     */
    profile: (label?: string) => {
      if (console.profile) {
        console.profile(label);
      } else {
        const profileLabel = label || "Profile";
        console.log(`🔍 Profile started: ${profileLabel}`);
      }
    },

    /**
     * Stops the profiler (Non-standard)
     */
    profileEnd: (label?: string) => {
      if (console.profileEnd) {
        console.profileEnd(label);
      } else {
        const profileLabel = label || "Profile";
        console.log(`🔍 Profile ended: ${profileLabel}`);
      }
    },

    // ===============================
    // MÉTODO DE LIMPIEZA
    // ===============================

    /**
     * Clear the console
     */
    clear: () => {
      // Reset internal storage when clearing console
      internalStorage.counters.clear();
      internalStorage.timers.clear();
      internalStorage.groups.length = 0;
      
      if (console.clear) {
        console.clear();
      } else {
        console.log("Console cleared");
      }
    },

    // ===============================
    // MÉTODOS DE DEPRECATED/LEGACY
    // ===============================

    /**
     * An alias for console.error() (Non-standard, Deprecated)
     */
    exception: (...args: any[]) => {
      const extendedConsole = console as ExtendedConsole;
      if (extendedConsole.exception) {
        extendedConsole.exception(...args);
      } else {
        console.error("Exception:", ...args);
      }
    },

    // ===============================
    // MÉTODOS EXPERIMENTALES/ESPECÍFICOS DE CHROME
    // ===============================

    /**
     * Creates a new console context (Chrome DevTools experimental)
     */
    context: (name?: string) => {
      const extendedConsole = console as ExtendedConsole;
      if (extendedConsole.context) {
        return extendedConsole.context(name);
      }
      
      const contextName = name || "default";
      console.log(`🌐 Console context created: ${contextName}`);
      
      // Return a proxy console that prefixes all messages with the context name
      return new Proxy(console, {
        get(target, prop) {
          if (typeof target[prop as keyof Console] === 'function') {
            return (...args: any[]) => {
              const method = target[prop as keyof Console] as any;
              return method.call(target, `[${contextName}]`, ...args);
            };
          }
          return target[prop as keyof Console];
        }
      });
    },

    /**
     * Creates a task for performance monitoring (Chrome DevTools experimental)
     */
    createTask: (name: string) => {
      const extendedConsole = console as ExtendedConsole;
      if (extendedConsole.createTask) {
        return extendedConsole.createTask(name);
      }
      
      console.log(`📋 Task created: ${name}`);
      return { 
        run: (fn: Function) => {
          console.log(`🏃 Running task: ${name}`);
          const startTime = Date.now();
          try {
            const result = fn();
            const endTime = Date.now();
            console.log(`✅ Task completed: ${name} (${endTime - startTime}ms)`);
            return result;
          } catch (error) {
            const endTime = Date.now();
            console.error(`❌ Task failed: ${name} (${endTime - startTime}ms)`, error);
            throw error;
          }
        }
      };
    },

    // ===============================
    // PROPIEDADES ESPECIALES
    // ===============================

    /**
     * Memory usage information (Non-standard, Chrome specific)
     */
    get memory() {
      const extendedConsole = console as ExtendedConsole;
      if (extendedConsole.memory) {
        return extendedConsole.memory;
      }
      
      // Try to get real memory info from performance.memory
      const performanceMemory = (performance as any).memory;
      if (performanceMemory) {
        return {
          totalJSHeapSize: performanceMemory.totalJSHeapSize || 0,
          usedJSHeapSize: performanceMemory.usedJSHeapSize || 0,
          jsHeapSizeLimit: performanceMemory.jsHeapSizeLimit || 0,
        };
      }
      
      // Fallback with realistic mock values
      return {
        totalJSHeapSize: 24500000,
        usedJSHeapSize: 17100000,
        jsHeapSizeLimit: 3760000000,
      };
    },

    // ===============================
    // MÉTODOS DE UTILIDAD INTERNA
    // ===============================

    /**
     * Get internal storage state (for debugging)
     */
    __getInternalState: () => ({
      counters: Object.fromEntries(internalStorage.counters),
      timers: Object.fromEntries(internalStorage.timers),
      groups: [...internalStorage.groups],
    }),

    /**
     * Reset internal storage (for testing)
     */
    __resetInternalState: () => {
      internalStorage.counters.clear();
      internalStorage.timers.clear();
      internalStorage.groups.length = 0;
    },
  };
}; 