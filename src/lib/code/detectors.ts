import { CodeLogger } from "./errorHandler";

/**
 * Detecta si el código contiene sintaxis JSX
 * @param code - Código a analizar
 * @returns true si contiene JSX, false en caso contrario
 */
export const detectJSX = (code: string): boolean => {
  CodeLogger.log("info", "Iniciando detección de JSX", {
    codeLength: code.length,
    codePreview: code.substring(0, 100),
  });

  // Patrones específicos de JSX más precisos
  const jsxPatterns = [
    /<[A-Z][a-zA-Z0-9]*(\s[^>]*)?\s*\/?>/, // Componentes React (PascalCase): <MyComponent />
    /<[a-z][a-zA-Z0-9]*(\s[^>]*)?\s*\/?>/, // Elementos HTML: <div>, <button>, etc.
    /<\/[a-zA-Z][a-zA-Z0-9]*>/, // Closing tags: </div>
    /className\s*=/, // Atributo específico de React
    /onClick\s*=/, // Eventos de React
    /return\s*\(\s*</, // return ( seguido de JSX
    /\{\s*[\w.]+\s*\}/, // Interpolación JSX {variable} o {obj.prop}
    /useState|useEffect|useContext|useReducer/, // Hooks de React
    /React\./, // Uso directo de React
    /<>\s*.*\s*<\/>/, // React fragments
    /jsx|JSX/, // Comentarios o menciones de JSX
  ];

  // Verificar si al menos uno de los patrones coincide
  const hasJSXPattern = jsxPatterns.some((pattern, index) => {
    const match = pattern.test(code);
    if (match) {
      CodeLogger.log(
        "info",
        `Patrón JSX ${index + 1} detectado: ${pattern.source}`
      );
    }
    return match;
  });

  // También verificar si el código tiene la estructura típica de un componente React
  const componentPatterns = [
    /function\s+[A-Z]\w*\s*\([^)]*\)\s*\{[\s\S]*return\s*\([\s\S]*</,
    /const\s+[A-Z]\w*\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*return\s*\([\s\S]*</,
    /const\s+[A-Z]\w*\s*=\s*\([^)]*\)\s*=>\s*\([\s\S]*</,
  ];

  const hasReactComponent = componentPatterns.some((pattern, index) => {
    const match = pattern.test(code);
    if (match) {
      CodeLogger.log(
        "info",
        `Componente React ${index + 1} detectado por estructura`
      );
    }
    return match;
  });

  const result = hasJSXPattern || hasReactComponent;
  CodeLogger.log("info", `Detección JSX final: ${result}`, {
    hasJSXPattern,
    hasReactComponent,
    codeContainsDiv: code.includes("<div>"),
    codeContainsButton: code.includes("<button"),
    codeContainsReturn: code.includes("return ("),
    codeContainsUseState: code.includes("useState"),
  });

  return result;
};

/**
 * Detecta si el código contiene sintaxis TypeScript
 * @param code - Código a analizar
 * @returns true si contiene TypeScript, false en caso contrario
 */
export const detectTypeScript = (code: string): boolean => {
  const tsPatterns = [
    /:\s*\w+(\[\]|\|\w+)*\s*[=;,)]/, // Type annotations: variable: string
    /interface\s+\w+/, // Interfaces
    /type\s+\w+\s*=/, // Type aliases
    /as\s+\w+/, // Type assertions
    /<\w+>/, // Generic types
    /enum\s+\w+/, // Enums
  ];

  return tsPatterns.some((pattern) => pattern.test(code));
};

/**
 * Detecta patrones de código potencialmente infinito
 * @param code - Código a analizar
 * @returns true si detecta patrones de bucles infinitos
 */
export const detectInfiniteLoops = (code: string): boolean => {
  // Patrones básicos de bucles infinitos
  const infiniteLoopPatterns = [
    /while\s*\(\s*true\s*\)/i,
    /for\s*\(\s*;\s*;\s*\)/i,
    /while\s*\(\s*1\s*\)/i,
    /for\s*\(\s*;;.*\)/i,
  ];

  // Verificar si hay patrones de bucles infinitos
  const hasInfiniteLoop = infiniteLoopPatterns.some((pattern) => pattern.test(code));
  
  if (!hasInfiniteLoop) {
    return false;
  }

  CodeLogger.log("info", "Patrón de bucle infinito detectado, analizando contexto...");

  // Verificaciones de contextos seguros:
  
  // 1. Verificar si el código contiene funciones generadoras
  const hasGeneratorFunction = /function\s*\*|=>\s*{[^}]*yield|\*\s*\([^)]*\)|yield\s+/i.test(code);
  if (hasGeneratorFunction) {
    CodeLogger.log("info", "Código contiene generadores, permitiendo bucles infinitos");
    return false;
  }

  // 2. Verificar si hay async/await que indica control de flujo asíncrono
  const hasAsyncPattern = /async\s+function|await\s+/i.test(code);
  if (hasAsyncPattern) {
    // En funciones async, revisar si hay await dentro del bucle potencialmente infinito
    const codeNormalized = code.replace(/\s+/g, ' ');
    const whileWithAwaitPattern = /while\s*\(\s*true\s*\)[^{}]*{[^}]*await[^}]*}/i;
    if (whileWithAwaitPattern.test(codeNormalized)) {
      CodeLogger.log("info", "Bucle infinito con await detectado (patrón válido)");
      return false;
    }
  }

  // 3. Verificar si hay break, return, throw, o yield en el contexto del bucle
  const potentiallyInfiniteLoops = [
    ...code.matchAll(/while\s*\(\s*true\s*\)\s*{([^{}]*)}/gi),
    ...code.matchAll(/for\s*\(\s*;\s*;\s*\)\s*{([^{}]*)}/gi)
  ];

  for (const match of potentiallyInfiniteLoops) {
    const loopBody = match[1];
    if (/\b(break|return|throw|yield|await)\b/.test(loopBody)) {
      CodeLogger.log("info", "Bucle con palabra clave de escape detectado (break/return/throw/yield/await)");
      return false;
    }
  }

  // 4. Verificar patrones de módulos IIFE (Immediately Invoked Function Expression)
  const iifePattern = /\(\s*\(\s*\)\s*=>\s*{|\(\s*function\s*\(\s*\)\s*{/i;
  if (iifePattern.test(code)) {
    CodeLogger.log("info", "Patrón IIFE detectado, probablemente código modular seguro");
    return false;
  }

  // 5. Verificar si es un web worker o service worker pattern
  const workerPattern = /self\.|postMessage|onmessage/i;
  if (workerPattern.test(code)) {
    CodeLogger.log("info", "Patrón de Worker detectado, permitiendo bucles infinitos");
    return false;
  }

  // 6. Verificar si hay event listeners o callbacks que sugieren control asíncrono
  const eventPattern = /addEventListener|setTimeout|setInterval|Promise|then\(|catch\(/i;
  if (eventPattern.test(code)) {
    CodeLogger.log("info", "Patrón de eventos/async detectado, probablemente seguro");
    return false;
  }

  // Si llegamos aquí, es probable que sea un bucle infinito peligroso
  CodeLogger.log("warn", "Bucle infinito potencialmente peligroso detectado");
  return true;
}; 