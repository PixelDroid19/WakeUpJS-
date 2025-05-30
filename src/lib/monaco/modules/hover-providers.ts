/**
 * ========================
 * 🔍 MÓDULO DE HOVER PROVIDERS
 * ========================
 * 
 * Este módulo maneja los providers de hover personalizados y documentación.
 * 
 * Responsabilidades:
 * - Configurar hover providers para cada lenguaje
 * - Proporcionar documentación personalizada
 * - Manejar documentación específica de React
 * - Documentación de objetos nativos JavaScript
 * - Definition y signature help providers
 */

import { languages, editor, Range } from "monaco-editor";
import {
  getPackageDefinition,
  PACKAGE_DEFINITIONS,
} from "../packageDefinitions";

// ========================
// 🔷 OBJETOS NATIVOS JAVASCRIPT
// ========================

const NATIVE_OBJECTS: Record<string, any> = {
  Math: {
    description:
      "An intrinsic object that provides basic mathematics functionality and constants.",
    signature: "var Math: Math",
    documentation:
      "The Math object provides mathematical constants and functions. Unlike other global objects, Math is not a constructor.",
  },
  console: {
    description: "Provides access to the browser's debugging console.",
    signature: "var console: Console",
    documentation:
      "The console object provides access to the browser's debugging console, enabling you to output information and debug your code.",
  },
  window: {
    description: "The global window object represents the browser window.",
    signature: "var window: Window",
    documentation:
      "The Window interface represents a window containing a DOM document.",
  },
  document: {
    description:
      "The Document interface represents any web page loaded in the browser.",
    signature: "var document: Document",
    documentation:
      "The Document interface represents the entire HTML or XML document.",
  },
  Array: {
    description:
      "The Array object is used to store multiple values in a single variable.",
    signature: "var Array: ArrayConstructor",
    documentation:
      "The Array object is used to store multiple values in a single variable.",
  },
  Object: {
    description: "The Object constructor creates an object wrapper.",
    signature: "var Object: ObjectConstructor",
    documentation:
      "The Object constructor creates an object wrapper for the given value.",
  },
  String: {
    description:
      "The String object is used to represent and manipulate a sequence of characters.",
    signature: "var String: StringConstructor",
    documentation:
      "The String object is used to represent and manipulate a sequence of characters.",
  },
  Number: {
    description:
      "The Number object is a wrapper object allowing you to work with numerical values.",
    signature: "var Number: NumberConstructor",
    documentation:
      "The Number JavaScript object is a wrapper object allowing you to work with numerical values.",
  },
  Date: {
    description:
      "The Date object represents a single moment in time in a platform-independent format.",
    signature: "var Date: DateConstructor",
    documentation:
      "JavaScript Date objects represent a single moment in time in a platform-independent format.",
  },
  JSON: {
    description:
      "An intrinsic object that provides functions to convert JavaScript values to and from JSON.",
    signature: "var JSON: JSON",
    documentation:
      "The JSON object contains methods for parsing JSON and converting values to JSON.",
  },
  Promise: {
    description:
      "The Promise object represents the eventual completion (or failure) of an asynchronous operation.",
    signature: "var Promise: PromiseConstructor",
    documentation:
      "The Promise object represents the eventual completion (or failure) of an asynchronous operation and its resulting value.",
  },
  setTimeout: {
    description:
      "Sets a timer which executes a function once the timer expires.",
    signature:
      "function setTimeout(handler: Function, timeout?: number): number",
    documentation:
      "The global setTimeout() method sets a timer which executes a function or specified piece of code once the timer expires.",
  },
  setInterval: {
    description:
      "Repeatedly calls a function, with a fixed time delay between each call.",
    signature:
      "function setInterval(handler: Function, timeout?: number): number",
    documentation:
      "The setInterval() method repeatedly calls a function or executes a code snippet, with a fixed time delay between each call.",
  },
  fetch: {
    description:
      "The fetch() method starts the process of fetching a resource from the network.",
    signature:
      "function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>",
    documentation:
      "The fetch() method starts the process of fetching a resource from the network, returning a promise which is fulfilled once the response is available.",
  },
};

// Cache para hover information
const hoverCache = new Map<string, any>();

// ========================
// 🔷 FUNCIONES DE DOCUMENTACIÓN
// ========================

// Función para obtener información contextual de una palabra
function getContextualInfo(word: string, context?: string): any {
  const cacheKey = `${word}:${context || "default"}`;

  if (hoverCache.has(cacheKey)) {
    return hoverCache.get(cacheKey);
  }

  let info = null;

  // 1. Verificar objetos nativos de JavaScript
  if (NATIVE_OBJECTS[word]) {
    info = NATIVE_OBJECTS[word];
  }

  // 2. Verificar en paquetes definidos
  else {
    const packageDef = getPackageDefinition(word);
    if (packageDef) {
      info = {
        description: packageDef.description,
        signature: `module ${word}`,
        documentation: `Package: ${packageDef.name}@${packageDef.version}\n${packageDef.description}`,
      };
    }

    // 3. Verificar exports específicos de paquetes
    else {
      for (const [packageName, definition] of Object.entries(
        PACKAGE_DEFINITIONS
      )) {
        const exportDef = definition.exports.find((exp) => exp.name === word);
        if (exportDef) {
          info = {
            description: exportDef.description,
            signature: exportDef.signature
              ? `${exportDef.type} ${word}${exportDef.signature.replace(
                  /^[^(]*/,
                  ""
                )}`
              : `${exportDef.type} ${word}`,
            documentation: `From package: ${packageName}\n${exportDef.description}`,
          };
          break;
        }
      }
    }
  }

  // 4. Fallback para variables/funciones personalizadas
  if (!info && context) {
    // Intentar detectar el tipo basado en el contexto
    if (context.includes("function")) {
      info = {
        description: `User-defined function: ${word}`,
        signature: `function ${word}(...args: any[]): any`,
        documentation: `Custom function defined in your code.`,
      };
    } else if (
      context.includes("const") ||
      context.includes("let") ||
      context.includes("var")
    ) {
      info = {
        description: `User-defined variable: ${word}`,
        signature: `var ${word}: any`,
        documentation: `Variable defined in your code.`,
      };
    }
  }

  if (info) {
    hoverCache.set(cacheKey, info);
  }

  return info;
}

function getCustomDocumentation(word: string): string | null {
  const docs: Record<string, string> = {
    // JavaScript básico
    'console': `
**Console API**
\`\`\`typescript
interface Console {
  log(message?: any, ...optionalParams: any[]): void;
  error(message?: any, ...optionalParams: any[]): void;
  warn(message?: any, ...optionalParams: any[]): void;
  info(message?: any, ...optionalParams: any[]): void;
  table(tabularData?: any, properties?: string[]): void;
  clear(): void;
}
\`\`\`
Objeto global que proporciona acceso a la consola de depuración del navegador.

**Métodos principales:**
- \`console.log()\` - Imprime mensaje general
- \`console.error()\` - Imprime mensaje de error  
- \`console.warn()\` - Imprime advertencia
- \`console.table()\` - Muestra datos en formato tabla`,

    'setTimeout': `
**setTimeout(callback, delay, ...args)**
\`\`\`typescript
function setTimeout<TArgs extends any[]>(
  callback: (...args: TArgs) => void,
  delay: number,
  ...args: TArgs
): NodeJS.Timeout
\`\`\`
Ejecuta una función después de un retraso especificado.

**Parámetros:**
- \`callback\` - Función a ejecutar
- \`delay\` - Tiempo en milisegundos
- \`...args\` - Argumentos para la función

**Retorna:** ID del timeout para cancelarlo con \`clearTimeout()\``,

    'setInterval': `
**setInterval(callback, delay, ...args)**
\`\`\`typescript
function setInterval<TArgs extends any[]>(
  callback: (...args: TArgs) => void,
  delay: number,
  ...args: TArgs
): NodeJS.Timeout
\`\`\`
Ejecuta una función repetidamente con un intervalo fijo.

**Parámetros:**
- \`callback\` - Función a ejecutar
- \`delay\` - Intervalo en milisegundos
- \`...args\` - Argumentos para la función

**Retorna:** ID del intervalo para cancelarlo con \`clearInterval()\``,

    'Promise': `
**Promise<T>**
\`\`\`typescript
class Promise<T> {
  constructor(executor: (resolve: (value: T) => void, reject: (reason: any) => void) => void);
  then<U>(onFulfilled?: (value: T) => U | Promise<U>): Promise<U>;
  catch<U>(onRejected?: (reason: any) => U | Promise<U>): Promise<U>;
  finally(onFinally?: () => void): Promise<T>;
}
\`\`\`
Representa la eventual finalización (o falla) de una operación asíncrona.

**Métodos estáticos:**
- \`Promise.all()\` - Espera todas las promesas
- \`Promise.race()\` - Primera promesa en resolverse
- \`Promise.resolve()\` - Promesa resuelta
- \`Promise.reject()\` - Promesa rechazada`,

    'async': `
**async function**
\`\`\`typescript
async function myFunction(): Promise<ReturnType> {
  // código asíncrono
}
\`\`\`
Declara una función asíncrona que retorna una Promise.

**Características:**
- Permite usar \`await\` dentro de la función
- Automáticamente envuelve el valor de retorno en una Promise
- Manejo de errores con try/catch`,

    'await': `
**await expression**
\`\`\`typescript
const result = await promise;
\`\`\`
Pausa la ejecución de una función \`async\` hasta que la Promise se resuelva.

**Uso:**
- Solo se puede usar dentro de funciones \`async\`
- Retorna el valor resuelto de la Promise
- Si la Promise se rechaza, lanza una excepción`,

    'fetch': `
**fetch(input, init?)**
\`\`\`typescript
function fetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response>
\`\`\`
API moderna para realizar peticiones HTTP.

**Parámetros:**
- \`input\` - URL o objeto Request
- \`init\` - Opciones de configuración (método, headers, body, etc.)

**Retorna:** Promise que se resuelve con el objeto Response

**Ejemplo:**
\`\`\`javascript
const response = await fetch('/api/data');
const data = await response.json();
\`\`\``,

    'JSON': `
**JSON Object**
\`\`\`typescript
interface JSON {
  parse(text: string, reviver?: (key: string, value: any) => any): any;
  stringify(value: any, replacer?: any, space?: string | number): string;
}
\`\`\`
Objeto global para trabajar con JSON (JavaScript Object Notation).

**Métodos:**
- \`JSON.parse()\` - Convierte string JSON a objeto JavaScript
- \`JSON.stringify()\` - Convierte objeto JavaScript a string JSON`,

    'Math': `
**Math Object**
\`\`\`typescript
interface Math {
  readonly PI: number;
  readonly E: number;
  abs(x: number): number;
  ceil(x: number): number;
  floor(x: number): number;
  round(x: number): number;
  max(...values: number[]): number;
  min(...values: number[]): number;
  random(): number;
}
\`\`\`
Objeto global con propiedades y métodos matemáticos.

**Constantes:** PI, E, LN2, LN10, etc.
**Métodos:** abs, ceil, floor, round, max, min, random, sin, cos, etc.`,

    'Array': `
**Array<T>**
\`\`\`typescript
interface Array<T> {
  length: number;
  push(...items: T[]): number;
  pop(): T | undefined;
  forEach(callback: (value: T, index: number) => void): void;
  map<U>(callback: (value: T, index: number) => U): U[];
  filter(predicate: (value: T, index: number) => boolean): T[];
  find(predicate: (value: T, index: number) => boolean): T | undefined;
  reduce<U>(callback: (acc: U, current: T, index: number) => U, initial: U): U;
}
\`\`\`
Representa una lista resizable de elementos.

**Métodos principales:**
- \`push/pop\` - Agregar/quitar elementos al final
- \`map\` - Transformar elementos
- \`filter\` - Filtrar elementos
- \`reduce\` - Reducir a un valor`,

    'document': `
**Document Interface**
\`\`\`typescript
interface Document {
  getElementById(id: string): HTMLElement | null;
  createElement(tagName: string): HTMLElement;
  querySelector(selectors: string): Element | null;
  querySelectorAll(selectors: string): NodeListOf<Element>;
}
\`\`\`
Representa el documento HTML cargado en el navegador.

**Métodos principales:**
- \`getElementById()\` - Buscar por ID
- \`querySelector()\` - Buscar por selector CSS
- \`createElement()\` - Crear elemento HTML`,

    'window': `
**Window Interface**
\`\`\`typescript
interface Window {
  location: Location;
  document: Document;
  alert(message?: any): void;
  confirm(message?: string): boolean;
  prompt(message?: string, defaultText?: string): string | null;
}
\`\`\`
Representa la ventana del navegador.

**Propiedades principales:**
- \`location\` - Información de la URL
- \`document\` - Referencia al documento

**Métodos:**
- \`alert()\` - Mostrar alerta
- \`confirm()\` - Mostrar confirmación
- \`prompt()\` - Solicitar entrada`,
  };

  return docs[word] || null;
}

function getReactDocumentation(word: string): string | null {
  const reactDocs: Record<string, string> = {
    'useState': `
**useState Hook**
\`\`\`typescript
function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>]
\`\`\`
Hook de React para agregar estado a componentes funcionales.

**Parámetros:**
- \`initialState\` - Estado inicial o función que lo retorne

**Retorna:** Array con \`[state, setState]\`

**Ejemplo:**
\`\`\`javascript
const [count, setCount] = useState(0);
setCount(count + 1);
\`\`\``,

    'useEffect': `
**useEffect Hook**
\`\`\`typescript
function useEffect(effect: EffectCallback, deps?: DependencyList): void
\`\`\`
Hook para manejar efectos secundarios en componentes funcionales.

**Parámetros:**
- \`effect\` - Función de efecto
- \`deps\` - Array de dependencias (opcional)

**Tipos de efectos:**
- Sin deps: Se ejecuta en cada render
- Array vacío: Solo en mount/unmount
- Con deps: Cuando las dependencias cambian`,

    'useCallback': `
**useCallback Hook**
\`\`\`typescript
function useCallback<T extends Function>(callback: T, deps: DependencyList): T
\`\`\`
Hook para memorizar funciones y evitar re-creaciones innecesarias.

**Parámetros:**
- \`callback\` - Función a memorizar
- \`deps\` - Array de dependencias

**Uso:** Optimización de rendimiento en componentes que reciben funciones como props`,

    'useMemo': `
**useMemo Hook**
\`\`\`typescript
function useMemo<T>(factory: () => T, deps: DependencyList): T
\`\`\`
Hook para memorizar valores computados y evitar cálculos costosos.

**Parámetros:**
- \`factory\` - Función que retorna el valor a memorizar
- \`deps\` - Array de dependencias

**Uso:** Optimización para cálculos costosos que dependen de ciertos valores`,

    'React': `
**React Library**
\`\`\`typescript
namespace React {
  type FC<P = {}> = FunctionComponent<P>;
  interface Component<P = {}, S = {}> {}
  function createElement<P extends any>(type: any, props?: P, ...children: any[]): ReactElement<P>;
}
\`\`\`
Biblioteca principal de React para construir interfaces de usuario.

**Principales exports:**
- \`React.FC\` - Tipo para componentes funcionales
- \`React.Component\` - Clase base para componentes
- \`React.createElement\` - Crear elementos React`,
  };

  return reactDocs[word] || null;
}

// Función para obtener el contexto de una línea
function getLineContext(model: editor.ITextModel, lineNumber: number): string {
  const lineContent = model.getLineContent(lineNumber);
  const prevLineContent =
    lineNumber > 1 ? model.getLineContent(lineNumber - 1) : "";
  return `${prevLineContent} ${lineContent}`.trim();
}

// ========================
// 🔷 PROVIDERS DE HOVER
// ========================

// Provider de hover unificado
function createUnifiedHoverProvider(): languages.HoverProvider {
  return {
    provideHover: (model, position, _token) => {
      try {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const lineContext = getLineContext(model, position.lineNumber);
        
        // Obtener información contextual (objetos nativos y paquetes)
        let info = getContextualInfo(word.word, lineContext);
        
        // Si no se encontró, buscar en documentación personalizada
        if (!info) {
          const customDoc = getCustomDocumentation(word.word);
          if (customDoc) {
            info = {
              description: `Documentación de ${word.word}`,
              signature: word.word,
              documentation: customDoc,
            };
          }
        }
        
        // Si aún no se encontró, buscar en documentación de React
        if (!info) {
          const reactDoc = getReactDocumentation(word.word);
          if (reactDoc) {
            info = {
              description: `React Hook: ${word.word}`,
              signature: word.word,
              documentation: reactDoc,
            };
          }
        }

        if (!info) return null;

        // Crear el contenido del hover
        const hoverContent = {
          value: info.documentation || `\`\`\`typescript\n${info.signature}\n\`\`\`\n\n${info.description}`,
          isTrusted: true
        };

        return {
          range: new Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn
          ),
          contents: [hoverContent],
        };
      } catch (error) {
        console.warn("Error en hover provider:", error);
        return null;
      }
    },
  };
}

// Provider de definiciones
function createDefinitionProvider(): languages.DefinitionProvider {
  return {
    provideDefinition: (model, position, _token) => {
      try {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        // Para objetos nativos, no proporcionamos definición
        if (NATIVE_OBJECTS[word.word]) {
          return null;
        }

        // Para paquetes, podríamos redirigir a documentación
        const packageDef = getPackageDefinition(word.word);
        if (packageDef) {
          console.log(`📖 Ver documentación de ${word.word}`);
          return null;
        }

        return null;
      } catch (error) {
        console.warn("Error en definition provider:", error);
        return null;
      }
    },
  };
}

// Provider de signature help
function createSignatureHelpProvider(): languages.SignatureHelpProvider {
  return {
    signatureHelpTriggerCharacters: ["(", ","],
    signatureHelpRetriggerCharacters: [")"],

    provideSignatureHelp: (model, position, _token, context) => {
      try {
        // Buscar la función en la línea actual
        const lineContent = model.getLineContent(position.lineNumber);
        const beforeCursor = lineContent.substring(0, position.column - 1);

        // Buscar el último identificador seguido de (
        const functionMatch = beforeCursor.match(/(\w+)\s*\([^)]*$/);
        if (!functionMatch) return null;

        const functionName = functionMatch[1];
        const info = getContextualInfo(functionName);

        if (!info || !info.signature) return null;

        return {
          value: {
            signatures: [
              {
                label: info.signature,
                documentation: info.description,
                parameters: [],
              },
            ],
            activeSignature: 0,
            activeParameter: 0,
          },
          dispose: () => {},
        };
      } catch (error) {
        console.warn("Error en signature help provider:", error);
        return null;
      }
    },
  };
}

// ========================
// 🔷 CONFIGURACIÓN PRINCIPAL
// ========================

export function setupCustomHoverProviders(monaco: any): void {
  console.log("🔍 Configurando hover providers personalizados");
  
  const languages = ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'];
  
  languages.forEach(language => {
    // Registrar hover provider unificado
    monaco.languages.registerHoverProvider(language, createUnifiedHoverProvider());
    
    // Registrar definition provider
    monaco.languages.registerDefinitionProvider(language, createDefinitionProvider());
    
    // Registrar signature help provider
    monaco.languages.registerSignatureHelpProvider(language, createSignatureHelpProvider());
  });

  console.log("✅ Hover providers personalizados configurados");
}

// Función para agregar definiciones personalizadas
export function addCustomDefinition(word: string, definition: any): void {
  hoverCache.set(`${word}:default`, definition);
}

// Función para limpiar cache
export function clearHoverCache(): void {
  hoverCache.clear();
} 