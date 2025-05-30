/**
 * ========================
 * 🔷 MÓDULO DE CONFIGURACIÓN DE TYPESCRIPT
 * ========================
 * 
 * Este módulo maneja toda la configuración específica de TypeScript/JavaScript en Monaco.
 * 
 * Responsabilidades:
 * - Configurar compilador TypeScript
 * - Configurar diagnósticos
 * - Configurar opciones de IntelliSense
 * - Agregar definiciones de tipos comunes
 */

export function setupTypeScriptConfiguration(monaco: any): void {
  console.log("🔷 Configurando TypeScript en Monaco");
  
  if (!monaco.languages.typescript) {
    console.warn("⚠️ TypeScript no disponible en Monaco");
    return;
  }

  const tsDefaults = monaco.languages.typescript.typescriptDefaults;
  const jsDefaults = monaco.languages.typescript.javascriptDefaults;

  // Configuración unificada para TypeScript y JavaScript
  const compilerOptions = {
    target: monaco.languages.typescript.ScriptTarget.ES2022,
    lib: ["ES2022", "DOM", "DOM.Iterable"],
    allowJs: true,
    allowSyntheticDefaultImports: true,
    allowUmdGlobalAccess: true,
    esModuleInterop: true,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    isolatedModules: false,
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    jsxFactory: "React.createElement",
    jsxFragmentFactory: "React.Fragment",
    jsxImportSource: "react",
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    resolveJsonModule: true,
    skipLibCheck: true,
    strict: false,
    noImplicitAny: false,
    strictNullChecks: false,
    strictFunctionTypes: false,
    noImplicitReturns: false,
    noFallthroughCasesInSwitch: false,
    noUncheckedIndexedAccess: false,
    exactOptionalPropertyTypes: false,
    noImplicitOverride: false,
    noPropertyAccessFromIndexSignature: false,
    useUnknownInCatchVariables: false,
    allowUnreachableCode: true,
    allowUnusedLabels: true,
    declaration: false,
    declarationMap: false,
    sourceMap: false,
    inlineSourceMap: false,
    removeComments: false,
    typeRoots: ["node_modules/@types"],
    types: ["react", "node"],
  };

  // Aplicar configuración a TypeScript
  tsDefaults.setCompilerOptions(compilerOptions);

  // Aplicar configuración similar a JavaScript con JSX
  jsDefaults.setCompilerOptions({
    ...compilerOptions,
    allowJs: true,
    checkJs: false,
    strict: false,
    noImplicitAny: false,
  });

  setupDiagnostics(tsDefaults, jsDefaults);
  setupIntelliSense(tsDefaults, jsDefaults);
  addCommonTypeDefinitions(tsDefaults, jsDefaults);
  
  console.log("✅ Configuración avanzada de TypeScript aplicada");
}

function setupDiagnostics(tsDefaults: any, jsDefaults: any): void {
  const diagnosticsOptions = {
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false, // Habilitar para mejor hover
    diagnosticCodesToIgnore: [],
  };

  tsDefaults.setDiagnosticsOptions(diagnosticsOptions);
  jsDefaults.setDiagnosticsOptions(diagnosticsOptions);
  
  console.log("✅ Configuración de diagnósticos aplicada");
}

function setupIntelliSense(tsDefaults: any, jsDefaults: any): void {
  // Configurar opciones de hover para TypeScript
  tsDefaults.setInlayHintsOptions({
    includeInlayParameterNameHints: 'all',
    includeInlayParameterNameHintsWhenArgumentMatchesName: true,
    includeInlayFunctionParameterTypeHints: true,
    includeInlayVariableTypeHints: true,
    includeInlayPropertyDeclarationTypeHints: true,
    includeInlayFunctionLikeReturnTypeHints: true,
    includeInlayEnumMemberValueHints: true,
  });

  // Configurar eagerly model sync para mejor IntelliSense
  tsDefaults.setEagerModelSync(true);
  jsDefaults.setEagerModelSync(true);

  // Configurar worker options para mejor rendimiento de hover
  tsDefaults.setWorkerOptions({
    configFilePath: undefined,
    typescriptVersion: undefined,
  });
  
  console.log("✅ Configuración de IntelliSense aplicada");
}

function addCommonTypeDefinitions(tsDefaults: any, jsDefaults: any): void {
  // Definiciones básicas de JavaScript/Node.js
  const basicDefinitions = `
/**
 * Console object provides access to the browser's debugging console
 */
declare var console: {
  /**
   * Prints to stdout with newline. Multiple arguments can be passed, with the first used as the primary message and all additional used as substitution values similar to printf(3) (the arguments are all passed to util.format()).
   * @param message The message to log
   * @param optionalParams Additional parameters to log
   */
  log(message?: any, ...optionalParams: any[]): void;
  
  /**
   * Prints to stderr with newline. Multiple arguments can be passed.
   * @param message The error message to log
   * @param optionalParams Additional parameters to log
   */
  error(message?: any, ...optionalParams: any[]): void;
  
  /**
   * Prints a warning to the console.
   * @param message The warning message to log
   * @param optionalParams Additional parameters to log
   */
  warn(message?: any, ...optionalParams: any[]): void;
  
  /**
   * Prints an informational message to the console.
   * @param message The info message to log
   * @param optionalParams Additional parameters to log
   */
  info(message?: any, ...optionalParams: any[]): void;
  
  /**
   * Displays tabular data as a table.
   * @param tabularData The data to display in table format
   * @param properties The properties to include in the table
   */
  table(tabularData?: any, properties?: string[]): void;
  
  /**
   * Clears the console.
   */
  clear(): void;
};

/**
 * Sets a timer which executes a function once the timer expires.
 * @param callback The function to execute when the timer expires
 * @param delay The time, in milliseconds, the timer should wait before the specified function is executed
 * @param args Additional arguments which are passed through to the function specified by callback
 * @returns A positive integer value which identifies the timer created by the call to setTimeout()
 */
declare function setTimeout<TArgs extends any[]>(
  callback: (...args: TArgs) => void,
  delay: number,
  ...args: TArgs
): NodeJS.Timeout;

/**
 * Sets an interval which executes a function repeatedly with a fixed time delay between each call.
 * @param callback The function to execute repeatedly
 * @param delay The time, in milliseconds, the timer should delay in between executions
 * @param args Additional arguments which are passed through to the function specified by callback
 * @returns A numeric value which identifies the timer created by the call to setInterval()
 */
declare function setInterval<TArgs extends any[]>(
  callback: (...args: TArgs) => void,
  delay: number,
  ...args: TArgs
): NodeJS.Timeout;

/**
 * Cancels a timeout previously established by calling setTimeout().
 * @param timeoutId The identifier of the timeout you want to cancel
 */
declare function clearTimeout(timeoutId: NodeJS.Timeout | undefined): void;

/**
 * Cancels an interval previously established by calling setInterval().
 * @param intervalId The identifier of the repeated action you want to cancel
 */
declare function clearInterval(intervalId: NodeJS.Timeout | undefined): void;

/**
 * Promise represents the eventual completion (or failure) of an asynchronous operation and its resulting value.
 */
declare class Promise<T> {
  /**
   * Creates a new Promise.
   * @param executor A callback used to initialize the promise
   */
  constructor(executor: (
    resolve: (value: T | PromiseLike<T>) => void,
    reject: (reason?: any) => void
  ) => void);
  
  /**
   * Attaches callbacks for the resolution and/or rejection of the Promise.
   * @param onfulfilled The callback to execute when the Promise is resolved
   * @param onrejected The callback to execute when the Promise is rejected
   * @returns A Promise for the completion of which ever callback is executed
   */
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2>;
  
  /**
   * Attaches a callback for only the rejection of the Promise.
   * @param onrejected The callback to execute when the Promise is rejected
   * @returns A Promise for the completion of the callback
   */
  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
  ): Promise<T | TResult>;
  
  /**
   * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected).
   * @param onfinally The callback to execute when the Promise is settled
   * @returns A Promise for the completion of the callback
   */
  finally(onfinally?: (() => void) | undefined | null): Promise<T>;
  
  /**
   * Creates a Promise that is resolved with an array of results when all of the provided Promises resolve, or rejected when any Promise rejects.
   * @param values An iterable of Promises
   * @returns A new Promise
   */
  static all<T extends readonly unknown[] | []>(values: T): Promise<{
    -readonly [P in keyof T]: Awaited<T[P]>
  }>;
  
  /**
   * Creates a Promise that is resolved or rejected when any of the provided Promises are resolved or rejected.
   * @param values An iterable of Promises
   * @returns A new Promise
   */
  static race<T extends readonly unknown[] | []>(values: T): Promise<Awaited<T[number]>>;
  
  /**
   * Returns a Promise object that is resolved with a given value.
   * @param value A value to be resolved by this Promise
   * @returns A Promise that is resolved with the given value
   */
  static resolve<T>(value: T | PromiseLike<T>): Promise<T>;
  
  /**
   * Returns a Promise object that is rejected with a given reason.
   * @param reason The reason for rejection
   * @returns A Promise that is rejected with the given reason
   */
  static reject<T = never>(reason?: any): Promise<T>;
}

/**
 * Array represents a resizable list of elements of type T.
 */
interface Array<T> {
  /**
   * Returns the number of elements in the array.
   */
  readonly length: number;
  
  /**
   * Adds one or more elements to the end of an array and returns the new length of the array.
   * @param items New elements to add to the array
   * @returns The new length of the array
   */
  push(...items: T[]): number;
  
  /**
   * Removes the last element from an array and returns it.
   * @returns The element that was removed from the array; undefined if the array is empty
   */
  pop(): T | undefined;
  
  /**
   * Calls a function for each element in the array.
   * @param callbackfn A function that accepts up to three arguments
   * @param thisArg An object to which the this keyword can refer in the callbackfn function
   */
  forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg?: any): void;
  
  /**
   * Calls a defined callback function on each element of an array, and returns an array that contains the results.
   * @param callbackfn A function that accepts up to three arguments
   * @param thisArg An object to which the this keyword can refer in the callbackfn function
   * @returns A new array with each element being the result of the callback function
   */
  map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[];
  
  /**
   * Returns the elements of an array that meet the condition specified in a callback function.
   * @param predicate A function that accepts up to three arguments
   * @param thisArg An object to which the this keyword can refer in the predicate function
   * @returns A new array with all elements that pass the test
   */
  filter<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): S[];
  filter(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): T[];
  
  /**
   * Calls the specified callback function for all the elements in an array.
   * @param callbackfn A function that accepts up to four arguments
   * @param initialValue If initialValue is specified, it is used as the initial value
   * @returns The final accumulated value
   */
  reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
  reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T): T;
  
  /**
   * Returns the value of the first element in the array where predicate is true, and undefined otherwise.
   * @param predicate A function to execute for each element in the array
   * @param thisArg Object to use as this when executing predicate
   * @returns The first element in the array that satisfies the provided testing function
   */
  find<S extends T>(predicate: (this: void, value: T, index: number, obj: T[]) => value is S, thisArg?: any): S | undefined;
  find(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): T | undefined;
}

/**
 * JSON provides functionality to convert JavaScript values to and from the JavaScript Object Notation (JSON) format.
 */
declare var JSON: {
  /**
   * Converts a JavaScript Object Notation (JSON) string into an object.
   * @param text A valid JSON string
   * @param reviver A function that transforms the results
   * @returns The JavaScript value converted from the JSON string
   */
  parse(text: string, reviver?: (this: any, key: string, value: any) => any): any;
  
  /**
   * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
   * @param value A JavaScript value to be converted
   * @param replacer A function that transforms the results
   * @param space Adds indentation, white space, and line break characters to the return-value JSON text
   * @returns A JSON string representing the given value
   */
  stringify(value: any, replacer?: (this: any, key: string, value: any) => any, space?: string | number): string;
  stringify(value: any, replacer?: (number | string)[] | null, space?: string | number): string;
};

/**
 * Math provides properties and methods for mathematical constants and functions.
 */
declare var Math: {
  /** The mathematical constant e. This is Euler's number, the base of natural logarithms. */
  readonly E: number;
  /** The natural logarithm of 10. */
  readonly LN10: number;
  /** The natural logarithm of 2. */
  readonly LN2: number;
  /** The base-2 logarithm of e. */
  readonly LOG2E: number;
  /** The base-10 logarithm of e. */
  readonly LOG10E: number;
  /** The mathematical constant π (pi). */
  readonly PI: number;
  /** The square root of 0.5, or, equivalently, one divided by the square root of 2. */
  readonly SQRT1_2: number;
  /** The square root of 2. */
  readonly SQRT2: number;
  
  /**
   * Returns the absolute value of a number (the value without regard to whether it is positive or negative).
   * @param x A numeric expression for which the absolute value is needed
   * @returns The absolute value of the given number
   */
  abs(x: number): number;
  
  /**
   * Returns the smallest integer greater than or equal to its numeric argument.
   * @param x A numeric expression
   * @returns The smallest integer greater than or equal to its numeric argument
   */
  ceil(x: number): number;
  
  /**
   * Returns the largest integer less than or equal to its numeric argument.
   * @param x A numeric expression
   * @returns The largest integer less than or equal to its numeric argument
   */
  floor(x: number): number;
  
  /**
   * Returns the larger of a set of supplied numeric expressions.
   * @param values Numeric expressions to be evaluated
   * @returns The largest of the given numbers
   */
  max(...values: number[]): number;
  
  /**
   * Returns the smaller of a set of supplied numeric expressions.
   * @param values Numeric expressions to be evaluated
   * @returns The smallest of the given numbers
   */
  min(...values: number[]): number;
  
  /**
   * Returns a pseudorandom number between 0 and 1.
   * @returns A pseudorandom number between 0 and 1
   */
  random(): number;
  
  /**
   * Returns a supplied numeric expression rounded to the nearest integer.
   * @param x The value to be rounded to the nearest integer
   * @returns The value rounded to the nearest integer
   */
  round(x: number): number;
};`;

  // Definiciones específicas de DOM para JavaScript del navegador
  const domDefinitions = `
/**
 * Document represents any web page loaded in the browser and serves as an entry point into the web page's content.
 */
declare var document: {
  /**
   * Gets an element by its ID.
   * @param elementId String that specifies the ID value
   * @returns Element object that represents the element, or null if no element with the specified ID exists
   */
  getElementById(elementId: string): HTMLElement | null;
  
  /**
   * Creates an element with the specified tag name.
   * @param tagName String that specifies the type of element to be created
   * @returns The new element
   */
  createElement<K extends keyof HTMLElementTagNameMap>(tagName: K): HTMLElementTagNameMap[K];
  createElement(tagName: string): HTMLElement;
  
  /**
   * Returns the first element that is a descendant of the document that matches the specified selectors.
   * @param selectors CSS selector string
   * @returns The first Element within the document that matches the specified selectors
   */
  querySelector<K extends keyof HTMLElementTagNameMap>(selectors: K): HTMLElementTagNameMap[K] | null;
  querySelector<E extends Element = Element>(selectors: string): E | null;
  
  /**
   * Returns a list of all elements descendant of the document that match the specified selectors.
   * @param selectors CSS selector string
   * @returns A list of matching elements
   */
  querySelectorAll<K extends keyof HTMLElementTagNameMap>(selectors: K): NodeListOf<HTMLElementTagNameMap[K]>;
  querySelectorAll<E extends Element = Element>(selectors: string): NodeListOf<E>;
};

/**
 * Window represents a window containing a DOM document.
 */
declare var window: {
  /**
   * Gets/sets the text of the window's location URL.
   */
  location: Location;
  
  /**
   * Shows an alert dialog with the specified message.
   * @param message The string to display in the alert dialog
   */
  alert(message?: any): void;
  
  /**
   * Shows a confirm dialog with the specified message.
   * @param message The string to display in the confirm dialog
   * @returns true if the user clicked OK, false otherwise
   */
  confirm(message?: string): boolean;
  
  /**
   * Shows a prompt dialog with the specified message and default text.
   * @param message The string to display to the user
   * @param defaultText A string containing the default text to display in the text input field
   * @returns A string containing the user's input, or null if the user cancelled the input
   */
  prompt(message?: string, defaultText?: string): string | null;
};

/**
 * Fetch API provides a JavaScript interface for accessing and manipulating HTTP requests and responses.
 * @param input URL or Request object
 * @param init RequestInit options
 * @returns Promise that resolves to the Response to that request
 */
declare function fetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response>;`;

  // Agregar las definiciones a TypeScript
  tsDefaults.addExtraLib(basicDefinitions, 'ts:lib.basic.d.ts');
  tsDefaults.addExtraLib(domDefinitions, 'ts:lib.dom.d.ts');
  
  // También agregar a JavaScript para mejor hover
  jsDefaults.addExtraLib(basicDefinitions, 'js:lib.basic.d.ts');
  jsDefaults.addExtraLib(domDefinitions, 'js:lib.dom.d.ts');
  
  console.log("✅ Archivos de definición de tipos agregados");
}

export function configureTypeScriptWorker(monaco: any): void {
  if (!monaco.languages.typescript) return;
  
  monaco.languages.typescript.getTypeScriptWorker().then((worker: any) => {
    console.log("✅ TypeScript worker configurado correctamente");
  }).catch((error: any) => {
    console.error("❌ Error configurando TypeScript worker:", error);
  });
} 