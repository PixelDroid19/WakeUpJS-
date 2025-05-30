import jc from "json-cycle";
import ObjetToString from "stringify-object";

export enum Colors {
  TRUE = "#1f924a",
  FALSE = "#f55442",
  NUMBER = "#368aa3",
  STRING = "#c3e88d",
  GRAY = "#807b7a",
  ERROR = "#ff0000",
  WARNING = "#ff9800",
  INFO = "#2196f3",

  BLUE = "#0000ff",
  PURPLE = "#800080",
  CYAN = "#00ffff",
  YELLOW = "#ffff00",
  MAGENTA = "#ff00ff",
  GREEN = "#008000",
}

export type ColoredElement = RecursiveColoredElement | StringColoredElement;

export interface RecursiveColoredElement {
  content: ColoredElement[];
  color?: Colors;
}

export interface StringColoredElement {
  content: string;
  color?: Colors;
}

// ============================================
// CONFIGURACIÓN
// ============================================

interface SecurityConfig {
  maxIterations: number;
  maxDepth: number;
  timeoutMs: number;
  maxStringLength: number;
  allowedPrototypeMethods: string[];
  blacklistedProperties: string[];
}

interface FormatterConfig {
  maxEntries: number;
  maxMethods: number;
  maxProperties: number;
  truncateAfter: number;
}

class ElementParserConfig {
  static readonly SECURITY: SecurityConfig = {
    maxIterations: 1000,
    maxDepth: 10,
    timeoutMs: 100, // 100ms max per operation
    maxStringLength: 10000,
    allowedPrototypeMethods: [
      "valueOf",
      "toString",
      "hasOwnProperty",
      "isPrototypeOf",
      "propertyIsEnumerable",
      "toLocaleString",
    ],
    blacklistedProperties: [
      "__proto__",
      "constructor",
      "prototype",
      "__defineGetter__",
      "__defineSetter__",
      "__lookupGetter__",
      "__lookupSetter__",
    ],
  };

  static readonly FORMATTER: FormatterConfig = {
    maxEntries: 10,
    maxMethods: 8,
    maxProperties: 5,
    truncateAfter: 500,
  };
}

// ============================================
// SISTEMA DE VALIDACIÓN Y SEGURIDAD
// ============================================

class SecurityValidator {
  /**
   * Valida que un objeto sea seguro para introspección
   */
  static validateObject(obj: any): boolean {
    if (obj === null || obj === undefined) return false;

    // Verificar que no sea un objeto malicioso
    if (typeof obj !== "object" && typeof obj !== "function") return false;

    // Verificar que tenga un prototipo válido
    try {
      const proto = Object.getPrototypeOf(obj);
      if (proto === null) return true; // Objects sin prototipo son seguros
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Sanitiza nombres de propiedades para evitar prototype pollution
   */
  static sanitizePropertyName(prop: string): boolean {
    const blacklisted = ElementParserConfig.SECURITY.blacklistedProperties;
    return !blacklisted.includes(prop.toLowerCase());
  }

  /**
   * Valida que una operación no exceda límites de tiempo
   */
  static withTimeout<T>(operation: () => T, timeoutMs: number): T | null {
    const startTime = performance.now();

    try {
      const result = operation();

      // Verificar tiempo transcurrido
      if (performance.now() - startTime > timeoutMs) {
        console.warn("[SecurityValidator] Operation timed out");
        return null;
      }

      return result;
    } catch (error) {
      console.warn("[SecurityValidator] Operation failed:", error);
      return null;
    }
  }

  /**
   * Trunca strings largos para evitar memory exhaustion
   */
  static truncateString(
    str: string,
    maxLength: number = ElementParserConfig.SECURITY.maxStringLength
  ): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + "... [truncated]";
  }
}

// ============================================
// MANEJO ROBUSTO DE ERRORES
// ============================================

class _FormatterError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = "FormatterError";
  }
}

class ErrorBoundary {
  static safeExecute<T>(operation: () => T, fallback: T, context: string): T {
    try {
      return (
        SecurityValidator.withTimeout(
          operation,
          ElementParserConfig.SECURITY.timeoutMs
        ) ?? fallback
      );
    } catch (error) {
      console.warn(`[ErrorBoundary] ${context} failed:`, error);
      return fallback;
    }
  }

  static safePropertyAccess<T>(obj: any, prop: string, fallback: T): T {
    try {
      if (!SecurityValidator.sanitizePropertyName(prop)) {
        return fallback;
      }

      const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
      if (!descriptor) return fallback;

      return obj[prop] ?? fallback;
    } catch (error) {
      return fallback;
    }
  }
}

// ============================================
// INTROSPECCIÓN
// ============================================

interface IntrospectionResult {
  properties: Array<{ name: string; type: string; safe: boolean }>;
  methods: Array<{ name: string; safe: boolean }>;
  prototypeInfo: {
    constructor: string;
    methods: string[];
    safeToShow: boolean;
  };
  metadata: {
    isSecure: boolean;
    truncated: boolean;
    processingTime: number;
  };
}

class SecureObjectIntrospector {
  /**
   * Realiza introspección segura de un objeto
   */
  static inspect(obj: any): IntrospectionResult {
    const startTime = performance.now();

    if (!SecurityValidator.validateObject(obj)) {
      return this.createEmptyResult(performance.now() - startTime, false);
    }

    return ErrorBoundary.safeExecute(
      () => {
        const properties = this.getSecureProperties(obj);
        const methods = this.getSecureMethods(obj);
        const prototypeInfo = this.getSecurePrototypeInfo(obj);

        const processingTime = performance.now() - startTime;

        return {
          properties,
          methods,
          prototypeInfo,
          metadata: {
            isSecure: true,
            truncated:
              properties.length >= ElementParserConfig.FORMATTER.maxProperties,
            processingTime,
          },
        };
      },
      this.createEmptyResult(performance.now() - startTime, false),
      "object introspection"
    );
  }

  private static createEmptyResult(
    processingTime: number,
    isSecure: boolean
  ): IntrospectionResult {
    return {
      properties: [],
      methods: [],
      prototypeInfo: {
        constructor: "Unknown",
        methods: [],
        safeToShow: false,
      },
      metadata: {
        isSecure,
        truncated: false,
        processingTime,
      },
    };
  }

  private static getSecureProperties(
    obj: any
  ): Array<{ name: string; type: string; safe: boolean }> {
    const properties: Array<{ name: string; type: string; safe: boolean }> = [];

    try {
      const ownProps = Object.getOwnPropertyNames(obj);
      let iterations = 0;

      for (const prop of ownProps) {
        if (iterations++ >= ElementParserConfig.SECURITY.maxIterations) break;

        const isSafe = SecurityValidator.sanitizePropertyName(prop);
        if (!isSafe) continue;

        const value = ErrorBoundary.safePropertyAccess(obj, prop, undefined);
        const type = typeof value;

        if (type !== "function") {
          properties.push({ name: prop, type, safe: isSafe });
        }

        if (properties.length >= ElementParserConfig.FORMATTER.maxProperties)
          break;
      }
    } catch (error) {
      console.warn(
        "[SecureObjectIntrospector] Property inspection failed:",
        error
      );
    }

    return properties;
  }

  private static getSecureMethods(
    obj: any
  ): Array<{ name: string; safe: boolean }> {
    const methods: Array<{ name: string; safe: boolean }> = [];

    try {
      const ownProps = Object.getOwnPropertyNames(obj);
      let iterations = 0;

      for (const prop of ownProps) {
        if (iterations++ >= ElementParserConfig.SECURITY.maxIterations) break;

        const isSafe = SecurityValidator.sanitizePropertyName(prop);
        if (!isSafe) continue;

        const value = ErrorBoundary.safePropertyAccess(obj, prop, undefined);

        if (typeof value === "function") {
          methods.push({ name: prop, safe: isSafe });
        }

        if (methods.length >= ElementParserConfig.FORMATTER.maxMethods) break;
      }
    } catch (error) {
      console.warn(
        "[SecureObjectIntrospector] Method inspection failed:",
        error
      );
    }

    return methods;
  }

  private static getSecurePrototypeInfo(
    obj: any
  ): IntrospectionResult["prototypeInfo"] {
    try {
      const prototype = Object.getPrototypeOf(obj);
      if (!prototype || prototype === Object.prototype) {
        return {
          constructor: "Object",
          methods: [],
          safeToShow: false,
        };
      }

      const constructor = ErrorBoundary.safePropertyAccess(
        prototype,
        "constructor",
        null
      );
      const constructorName = (constructor as any)?.name || "Unknown";

      const prototypeMethods: string[] = [];
      const protoProps = Object.getOwnPropertyNames(prototype);

      let iterations = 0;
      for (const prop of protoProps) {
        if (iterations++ >= ElementParserConfig.SECURITY.maxIterations) break;

        if (prop === "constructor") continue;
        if (!SecurityValidator.sanitizePropertyName(prop)) continue;

        const value = ErrorBoundary.safePropertyAccess(
          prototype,
          prop,
          undefined
        );
        if (typeof value === "function") {
          prototypeMethods.push(prop);
        }

        if (prototypeMethods.length >= ElementParserConfig.FORMATTER.maxMethods)
          break;
      }

      return {
        constructor: constructorName,
        methods: prototypeMethods,
        safeToShow: true,
      };
    } catch (error) {
      return {
        constructor: "Unknown",
        methods: [],
        safeToShow: false,
      };
    }
  }
}

// ============================================
// FORMATTERS SEGUROS
// ============================================

// Función utilitaria mejorada para formatear valores
function formatValueSafely(value: any): string {
  try {
    if (value === null) return "null";
    if (value === undefined) return "undefined";

    const type = typeof value;
    switch (type) {
      case "string":
        return `'${SecurityValidator.truncateString(value, 50)}'`;
      case "number":
      case "boolean":
        return String(value);
      case "object":
        return "[object]";
      case "function":
        return "[function]";
      default:
        return "[unknown]";
    }
  } catch (error) {
    return "[error]";
  }
}

class SecureTypeFormatters {
  static formatMap(element: Map<any, any>): { content: string; color: Colors } {
    return ErrorBoundary.safeExecute(
      () => {
        const mapSize = element.size;
        let content = `Map(${mapSize})`;

        if (mapSize === 0) {
          content += " {}";
        } else {
          content += " {\n";
          let entryCount = 0;
          const maxEntries = ElementParserConfig.FORMATTER.maxEntries;

          for (const [key, value] of element.entries()) {
            if (entryCount >= maxEntries) {
              content += `  ... ${mapSize - maxEntries} more entries\n`;
              break;
            }

            const keyStr = formatValueSafely(key);
            const valueStr = formatValueSafely(value);
            content += `  ${keyStr} => ${valueStr},\n`;
            entryCount++;
          }

          // Información del prototipo de forma segura
          const introspection = SecureObjectIntrospector.inspect(element);
          if (
            introspection.metadata.isSecure &&
            introspection.prototypeInfo.safeToShow
          ) {
            content += `  [Prototype]: ${introspection.prototypeInfo.constructor}.prototype {\n`;
            content += `    constructor: ƒ ${introspection.prototypeInfo.constructor}(),\n`;

            introspection.prototypeInfo.methods
              .slice(0, 4)
              .forEach((method) => {
                content += `    ${method}: ƒ ${method}(),\n`;
              });

            if (introspection.prototypeInfo.methods.length > 4) {
              content += `    ... ${
                introspection.prototypeInfo.methods.length - 4
              } more methods\n`;
            }

            content += `    size: ${mapSize}\n`;
            content += "  }\n";
          }

          content += "}";
        }

        return { content, color: Colors.GRAY };
      },
      { content: "Map { [inspection failed] }", color: Colors.GRAY },
      "Map formatting"
    );
  }

  static formatSet(element: Set<any>): { content: string; color: Colors } {
    return ErrorBoundary.safeExecute(
      () => {
        const setSize = element.size;
        let content = `Set(${setSize})`;

        if (setSize === 0) {
          content += " {}";
        } else {
          content += " {\n";
          let entryCount = 0;
          const maxEntries = ElementParserConfig.FORMATTER.maxEntries;

          for (const value of element.values()) {
            if (entryCount >= maxEntries) {
              content += `  ... ${setSize - maxEntries} more entries\n`;
              break;
            }

            const valueStr = formatValueSafely(value);
            content += `  ${valueStr},\n`;
            entryCount++;
          }

          const introspection = SecureObjectIntrospector.inspect(element);
          if (
            introspection.metadata.isSecure &&
            introspection.prototypeInfo.safeToShow
          ) {
            content += `  [Prototype]: ${introspection.prototypeInfo.constructor}.prototype {\n`;
            content += `    constructor: ƒ ${introspection.prototypeInfo.constructor}(),\n`;

            introspection.prototypeInfo.methods
              .slice(0, 4)
              .forEach((method) => {
                content += `    ${method}: ƒ ${method}(),\n`;
              });

            content += `    size: ${setSize}\n`;
            content += "  }\n";
          }

          content += "}";
        }

        return { content, color: Colors.GRAY };
      },
      { content: "Set { [inspection failed] }", color: Colors.GRAY },
      "Set formatting"
    );
  }

  static formatDate(element: Date): { content: string; color: Colors } {
    return ErrorBoundary.safeExecute(
      () => {
        const dateStr = SecurityValidator.truncateString(
          element.toString(),
          100
        );
        const isoStr = SecurityValidator.truncateString(
          element.toISOString(),
          50
        );
        const timeValue = element.getTime();

        let content = `Date {\n`;
        content += `  toString: "${dateStr}",\n`;
        content += `  toISOString: "${isoStr}",\n`;
        content += `  getTime: ${timeValue},\n`;

        const introspection = SecureObjectIntrospector.inspect(element);
        if (
          introspection.metadata.isSecure &&
          introspection.prototypeInfo.safeToShow
        ) {
          content += `  [Prototype]: ${introspection.prototypeInfo.constructor}.prototype {\n`;
          content += `    constructor: ƒ ${introspection.prototypeInfo.constructor}(),\n`;

          introspection.prototypeInfo.methods.slice(0, 3).forEach((method) => {
            content += `    ${method}: ƒ ${method}(),\n`;
          });

          content += "  }\n";
        }

        content += "}";

        return { content, color: Colors.GRAY };
      },
      { content: "Date { [inspection failed] }", color: Colors.GRAY },
      "Date formatting"
    );
  }

  static formatRegExp(element: RegExp): { content: string; color: Colors } {
    return ErrorBoundary.safeExecute(
      () => {
        let content = `RegExp {\n`;
        content += `  source: "${SecurityValidator.truncateString(
          element.source,
          100
        )}",\n`;
        content += `  flags: "${element.flags}",\n`;
        content += `  global: ${element.global},\n`;
        content += `  ignoreCase: ${element.ignoreCase},\n`;
        content += `  multiline: ${element.multiline},\n`;

        const introspection = SecureObjectIntrospector.inspect(element);
        if (
          introspection.metadata.isSecure &&
          introspection.prototypeInfo.safeToShow
        ) {
          content += `  [Prototype]: ${introspection.prototypeInfo.constructor}.prototype {\n`;
          content += `    constructor: ƒ ${introspection.prototypeInfo.constructor}(),\n`;

          introspection.prototypeInfo.methods.slice(0, 3).forEach((method) => {
            content += `    ${method}: ƒ ${method}(),\n`;
          });

          content += "  }\n";
        }

        content += "}";

        return { content, color: Colors.GRAY };
      },
      { content: "RegExp { [inspection failed] }", color: Colors.GRAY },
      "RegExp formatting"
    );
  }

  static formatError(element: Error): { content: string; color: Colors } {
    return ErrorBoundary.safeExecute(
      () => {
        let content = `${element.constructor.name} {\n`;
        content += `  message: "${SecurityValidator.truncateString(
          element.message,
          200
        )}",\n`;
        content += `  name: "${element.name}",\n`;

        if (element.stack) {
          const stackLines = element.stack.split("\n").slice(0, 3);
          const truncatedStack = stackLines
            .map((line) => SecurityValidator.truncateString(line, 100))
            .join("\\n");
          content += `  stack: "${truncatedStack}...",\n`;
        }

        const introspection = SecureObjectIntrospector.inspect(element);
        if (
          introspection.metadata.isSecure &&
          introspection.prototypeInfo.safeToShow
        ) {
          content += `  [Prototype]: ${introspection.prototypeInfo.constructor}.prototype {\n`;
          content += `    constructor: ƒ ${introspection.prototypeInfo.constructor}(),\n`;
          content += `    toString: ƒ toString()\n`;
          content += "  }\n";
        }

        content += "}";

        return { content, color: Colors.GRAY };
      },
      { content: "Error { [inspection failed] }", color: Colors.GRAY },
      "Error formatting"
    );
  }

  static formatArrayBuffer(element: ArrayBuffer): {
    content: string;
    color: Colors;
  } {
    return ErrorBoundary.safeExecute(
      () => {
        let content = `ArrayBuffer {\n`;
        content += `  byteLength: ${element.byteLength},\n`;

        const introspection = SecureObjectIntrospector.inspect(element);
        if (
          introspection.metadata.isSecure &&
          introspection.prototypeInfo.safeToShow
        ) {
          content += `  [Prototype]: ${introspection.prototypeInfo.constructor}.prototype {\n`;
          content += `    constructor: ƒ ${introspection.prototypeInfo.constructor}(),\n`;
          content += `    slice: ƒ slice()\n`;
          content += "  }\n";
        }

        content += "}";

        return { content, color: Colors.GRAY };
      },
      { content: "ArrayBuffer { [inspection failed] }", color: Colors.GRAY },
      "ArrayBuffer formatting"
    );
  }

  static formatTypedArray(
    element: any,
    typeName: string
  ): { content: string; color: Colors } {
    return ErrorBoundary.safeExecute(
      () => {
        const length = Math.min(
          element.length || 0,
          ElementParserConfig.FORMATTER.maxEntries
        );

        let content = `${typeName} {\n`;
        content += `  length: ${element.length},\n`;

        if (element.buffer && element.buffer.byteLength !== undefined) {
          content += `  buffer: ArrayBuffer { byteLength: ${element.buffer.byteLength} },\n`;
        }

        if (length > 0) {
          content += `  values: [`;
          for (let i = 0; i < length; i++) {
            content += element[i];
            if (i < length - 1) content += ", ";
          }
          if (element.length > length) {
            content += `, ...${element.length - length} more`;
          }
          content += `],\n`;
        }

        const introspection = SecureObjectIntrospector.inspect(element);
        if (
          introspection.metadata.isSecure &&
          introspection.prototypeInfo.safeToShow
        ) {
          content += `  [Prototype]: ${introspection.prototypeInfo.constructor}.prototype {\n`;
          content += `    constructor: ƒ ${introspection.prototypeInfo.constructor}()\n`;
          content += "  }\n";
        }

        content += "}";

        return { content, color: Colors.GRAY };
      },
      { content: `${typeName} { [inspection failed] }`, color: Colors.GRAY },
      "TypedArray formatting"
    );
  }

  static formatMath(): { content: string; color: Colors } {
    return ErrorBoundary.safeExecute(
      () => {
        let content = "Math {\n";

        const introspection = SecureObjectIntrospector.inspect(Math);

        // Mostrar constantes matemáticas
        const constants = introspection.properties
          .filter((prop) => prop.type === "number")
          .slice(0, 6);

        constants.forEach((prop) => {
          const value = ErrorBoundary.safePropertyAccess(
            Math,
            prop.name,
            "unknown"
          );
          content += `  ${prop.name}: ${value},\n`;
        });

        // Mostrar métodos
        const methods = introspection.methods.slice(0, 6);
        methods.forEach((method) => {
          content += `  ${method.name}: ƒ ${method.name}(),\n`;
        });

        if (introspection.methods.length > 6) {
          content += `  ... ${introspection.methods.length - 6} more methods\n`;
        }

        content += "}";

        return { content, color: Colors.GRAY };
      },
      { content: "Math { [inspection failed] }", color: Colors.GRAY },
      "Math formatting"
    );
  }

  static formatConsole(): { content: string; color: Colors } {
    return ErrorBoundary.safeExecute(
      () => {
        let content = "Console {\n";

        const introspection = SecureObjectIntrospector.inspect(console);
        const methods = introspection.methods.slice(0, 6);

        methods.forEach((method) => {
          content += `  ${method.name}: ƒ ${method.name}(),\n`;
        });

        if (introspection.methods.length > 6) {
          content += `  ... ${introspection.methods.length - 6} more methods\n`;
        }

        content += "}";

        return { content, color: Colors.GRAY };
      },
      { content: "Console { [inspection failed] }", color: Colors.GRAY },
      "Console formatting"
    );
  }
}

// ============================================
// SISTEMA DE DETECCIÓN DE TIPOS
// ============================================

/**
 * Detector robusto de tipos JavaScript usando Object.prototype.toString.call()
 * y verificaciones adicionales para maximum compatibilidad cross-browser
 */
class TypeDetector {
  private static readonly TYPE_MAP = new Map([
    ["[object Array]", "Array"],
    ["[object Object]", "Object"],
    ["[object Map]", "Map"],
    ["[object Set]", "Set"],
    ["[object WeakMap]", "WeakMap"],
    ["[object WeakSet]", "WeakSet"],
    ["[object Date]", "Date"],
    ["[object RegExp]", "RegExp"],
    ["[object Error]", "Error"],
    ["[object Promise]", "Promise"],
    ["[object ArrayBuffer]", "ArrayBuffer"],
    ["[object DataView]", "DataView"],
    ["[object Int8Array]", "Int8Array"],
    ["[object Uint8Array]", "Uint8Array"],
    ["[object Uint8ClampedArray]", "Uint8ClampedArray"],
    ["[object Int16Array]", "Int16Array"],
    ["[object Uint16Array]", "Uint16Array"],
    ["[object Int32Array]", "Int32Array"],
    ["[object Uint32Array]", "Uint32Array"],
    ["[object Float32Array]", "Float32Array"],
    ["[object Float64Array]", "Float64Array"],
    ["[object BigInt64Array]", "BigInt64Array"],
    ["[object BigUint64Array]", "BigUint64Array"],
  ]);

  static detect(element: any): string {
    if (element === null) return "null";
    if (element === undefined) return "undefined";

    const primitiveType = typeof element;
    if (primitiveType !== "object" && primitiveType !== "function") {
      return primitiveType;
    }

    if (primitiveType === "function") return "function";

    // Usar Object.prototype.toString.call() para detección robusta
    const objectType = Object.prototype.toString.call(element);
    const detectedType = this.TYPE_MAP.get(objectType);

    if (detectedType) {
      return detectedType;
    }

    // Detección especial para tipos custom o casos edge
    if (element && element._isConsoleObject) return "ConsoleObject";
    if (element && element._isMultipleArgs) return "MultipleArgs";
    if (element === Math) return "Math";
    if (element === console) return "Console";
    if (typeof document !== "undefined" && element === document)
      return "Document";

    return "Object";
  }
}

// ============================================
// REGISTRO DE FORMATTERS
// ============================================

type FormatterFunction = (element: any) => { content: string; color: Colors };

const TYPE_FORMATTER_REGISTRY = new Map<string, FormatterFunction>([
  ["Map", SecureTypeFormatters.formatMap as FormatterFunction],
  ["Set", SecureTypeFormatters.formatSet as FormatterFunction],
  ["Date", SecureTypeFormatters.formatDate as FormatterFunction],
  ["RegExp", SecureTypeFormatters.formatRegExp as FormatterFunction],
  ["Error", SecureTypeFormatters.formatError as FormatterFunction],
  ["ArrayBuffer", SecureTypeFormatters.formatArrayBuffer as FormatterFunction],
  ["Math", SecureTypeFormatters.formatMath as FormatterFunction],
  ["Console", SecureTypeFormatters.formatConsole as FormatterFunction],
  // TypedArrays
  [
    "Int8Array",
    (el: any) => SecureTypeFormatters.formatTypedArray(el, "Int8Array"),
  ],
  [
    "Uint8Array",
    (el: any) => SecureTypeFormatters.formatTypedArray(el, "Uint8Array"),
  ],
  [
    "Uint8ClampedArray",
    (el: any) => SecureTypeFormatters.formatTypedArray(el, "Uint8ClampedArray"),
  ],
  [
    "Int16Array",
    (el: any) => SecureTypeFormatters.formatTypedArray(el, "Int16Array"),
  ],
  [
    "Uint16Array",
    (el: any) => SecureTypeFormatters.formatTypedArray(el, "Uint16Array"),
  ],
  [
    "Int32Array",
    (el: any) => SecureTypeFormatters.formatTypedArray(el, "Int32Array"),
  ],
  [
    "Uint32Array",
    (el: any) => SecureTypeFormatters.formatTypedArray(el, "Uint32Array"),
  ],
  [
    "Float32Array",
    (el: any) => SecureTypeFormatters.formatTypedArray(el, "Float32Array"),
  ],
  [
    "Float64Array",
    (el: any) => SecureTypeFormatters.formatTypedArray(el, "Float64Array"),
  ],
  [
    "BigInt64Array",
    (el: any) => SecureTypeFormatters.formatTypedArray(el, "BigInt64Array"),
  ],
  [
    "BigUint64Array",
    (el: any) => SecureTypeFormatters.formatTypedArray(el, "BigUint64Array"),
  ],
]);

// ============================================
// UTILIDADES EXISTENTES
// ============================================

const isPromise = (promiseToCheck: Promise<any>) => {
  return (
    !!promiseToCheck &&
    (typeof promiseToCheck === "object" ||
      typeof promiseToCheck === "function") &&
    typeof promiseToCheck.then === "function"
  );
};

export function flattenColoredElement(
  element: ColoredElement
): StringColoredElement[] {
  if (typeof element.content == "string")
    return [
      {
        content: element.content,
        color: element.color,
      },
    ];

  return element.content
    .map((it) => {
      if (typeof it.content == "string") return it as StringColoredElement;

      return (it as RecursiveColoredElement).content
        .map((recursive) => flattenColoredElement(recursive))
        .flat();
    })
    .flat();
}

// ============================================
// FUNCIÓN PRINCIPAL STRINGIFY REFACTORIZADA
// ============================================

export async function stringify(element: any): Promise<{
  content: string;
  color?: Colors;
}> {
  // Detección de tipos
  const detectedType = TypeDetector.detect(element);

  // Manejo de tipos primitivos
  if (detectedType === "null") {
    return { content: "null", color: Colors.GRAY };
  }

  if (detectedType === "undefined") {
    return { content: "undefined", color: Colors.GRAY };
  }

  if (detectedType === "string") {
    // Manejar referencias especiales del nuevo plugin de Babel
    if (element.startsWith("ƒ ")) {
      return { content: element, color: Colors.INFO };
    }
    return { content: JSON.stringify(element), color: Colors.STRING };
  }

  if (detectedType === "boolean") {
    return {
      content: element.toString(),
      color: element ? Colors.TRUE : Colors.FALSE,
    };
  }

  if (detectedType === "number") {
    return { content: element.toString(), color: Colors.NUMBER };
  }

  if (detectedType === "bigint") {
    return { content: `${element}n`, color: Colors.NUMBER };
  }

  if (detectedType === "symbol") {
    const symbolDesc = await stringify(element.description);
    return { content: `Symbol(${symbolDesc.content})`, color: Colors.GRAY };
  }

  if (detectedType === "function") {
    const funcStr = element.toString();

    if (funcStr.includes("[native code]")) {
      const funcName = element.name || "function";
      return { content: `ƒ ${funcName}()`, color: Colors.INFO };
    }

    const lines = funcStr.split("\n");
    if (lines.length <= 3) {
      return { content: funcStr, color: Colors.INFO };
    } else {
      const firstLine = lines[0];
      return { content: `${firstLine} { ... }`, color: Colors.INFO };
    }
  }

  // Manejo de tipos especiales (objetos custom de JSRunner)
  if (detectedType === "ConsoleObject") {
    let content = "console {\n";
    element.methods.forEach((method: string) => {
      content += `  ${method}: ƒ ${method}(),\n`;
    });
    content += "  [native code]\n}";
    return { content, color: Colors.GRAY };
  }

  if (detectedType === "MultipleArgs") {
    const stringifiedArgs = await Promise.all(
      element.args.map(async (arg: any) => {
        const result = await stringify(arg);
        return result.content;
      })
    );
    return { content: stringifiedArgs.join(" "), color: Colors.GRAY };
  }

  // Uso del registry de formatters para tipos built-in
  const formatter = TYPE_FORMATTER_REGISTRY.get(detectedType);
  if (formatter) {
    return formatter(element);
  }

  // Manejo especial de arrays
  if (detectedType === "Array") {
    return {
      content: ObjetToString(jc.decycle(element), {
        indent: "  ",
        singleQuotes: false,
        inlineCharacterLimit: 20,
      }),
    };
  }

  // Manejo de promesas
  if (detectedType === "Promise" || isPromise(element)) {
    try {
      if (element && typeof element.then === "function") {
        const timeoutDuration = 5000;
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), timeoutDuration)
        );

        try {
          const result = await Promise.race([element, timeoutPromise]);

          if (result && typeof result === "object") {
            if (
              result.constructor?.name === "Response" ||
              (result.status !== undefined && result.ok !== undefined)
            ) {
              return {
                content: `Response {\n  status: ${result.status},\n  ok: ${result.ok},\n  statusText: "${result.statusText}",\n  url: "${result.url}"\n}`,
                color: Colors.INFO,
              };
            }

            if (result.constructor === Object || Array.isArray(result)) {
              const jsonString = JSON.stringify(result, null, 2);
              const truncatedJson =
                jsonString.length > 500
                  ? jsonString.substring(0, 500) + "\n  ...\n}"
                  : jsonString;

              return { content: truncatedJson, color: Colors.STRING };
            }
          }

          return {
            content: `Promise { <resolved: ${JSON.stringify(result)}> }`,
            color: Colors.STRING,
          };
        } catch (error: any) {
          if (error.message === "timeout") {
            return { content: "Promise { <pending> }", color: Colors.STRING };
          } else {
            const errorMsg = error.message || error.toString();
            return {
              content: `Promise { <rejected: ${errorMsg}> }`,
              color: Colors.GRAY,
            };
          }
        }
      }
    } catch (error: any) {
      return {
        content: `Promise { <error: ${error.message}> }`,
        color: Colors.GRAY,
      };
    }
  }

  // Manejo de objetos regulares con métodos
  if (detectedType === "Object") {
    try {
      const obj = jc.decycle(element);
      const hasOwnMethods = Object.getOwnPropertyNames(element).some(
        (prop) => typeof element[prop] === "function"
      );

      if (hasOwnMethods) {
        const methods = Object.getOwnPropertyNames(element)
          .filter((prop) => typeof element[prop] === "function")
          .slice(0, 5);

        const regularProps = Object.getOwnPropertyNames(element)
          .filter((prop) => typeof element[prop] !== "function")
          .slice(0, 5);

        let content = "{\n";

        regularProps.forEach((prop) => {
          try {
            const value = element[prop];
            content += `  ${prop}: ${JSON.stringify(value)},\n`;
          } catch (e) {
            content += `  ${prop}: [object],\n`;
          }
        });

        methods.forEach((prop) => {
          content += `  ${prop}: ƒ ${prop}(),\n`;
        });

        if (Object.getOwnPropertyNames(element).length > 10) {
          content += "  ...\n";
        }

        content += "}";

        return { content, color: Colors.GRAY };
      }

      return {
        content: ObjetToString(obj, {
          indent: "  ",
          singleQuotes: false,
          inlineCharacterLimit: 40,
        }),
        color: Colors.GRAY,
      };
    } catch (error) {
      return { content: "[object Object]", color: Colors.GRAY };
    }
  }

  // Fallback para tipos no reconocidos
  return { content: element.toString(), color: Colors.GRAY };
}
