import {
  registerPlugins,
  transform,
  availablePresets,
} from "@babel/standalone";
import logPlugin from "../babel/log-babel";
import strayExpression from "../babel/stray-expression";
import loopProtectionPlugin from "../babel/loop-protection";
import {
  parseError,
  validateSyntax,
  formatErrorForDisplay,
  CodeLogger,
} from "./errorHandler";
import { 
  detectLanguageFromContent,
} from "./detectors";

// Registrar plugins de Babel
registerPlugins({
  "stray-expression-babel": strayExpression,
  "log-transform": logPlugin,
  "loop-protection": loopProtectionPlugin,
});

/**
 * Preprocesa el código para convertir imports/exports ES6 a CommonJS
 * @param code - Código a preprocesar
 * @returns Código preprocesado
 */
const preprocessImportsExports = (code: string): string => {
  let processedCode = code;

  // Convertir imports de ES6 a requires
  processedCode = processedCode.replace(
    /import\s+(.+?)\s+from\s+['"`]([^'"`]+)['"`];?/g,
    (_match, importClause, moduleName) => {
      // Manejar diferentes tipos de imports
      if (importClause.includes("{")) {
        // Named imports: import { useState, useEffect } from 'react'
        const namedImports = importClause.replace(/[{}]/g, "").trim();
        return `const { ${namedImports} } = require('${moduleName}');`;
      } else if (importClause.includes("*")) {
        // Namespace imports: import * as React from 'react'
        const [, alias] = importClause.split(" as ");
        return `const ${alias.trim()} = require('${moduleName}');`;
      } else {
        // Default imports: import React from 'react'
        return `const ${importClause.trim()} = require('${moduleName}');`;
      }
    }
  );

  // Convertir export default
  processedCode = processedCode.replace(
    /export\s+default\s+(.+);?$/gm,
    "module.exports = $1;"
  );

  // Convertir named exports
  processedCode = processedCode.replace(
    /export\s+\{([^}]+)\};?/g,
    (_match, exports) => {
      const exportItems = exports.split(",").map((item: string) => {
        const trimmed = item.trim();
        if (trimmed.includes(" as ")) {
          const [original, alias] = trimmed.split(" as ");
          return `${alias.trim()}: ${original.trim()}`;
        }
        return `${trimmed}: ${trimmed}`;
      });
      return `module.exports = { ${exportItems.join(", ")} };`;
    }
  );

  // Convertir export function/const/let/var
  processedCode = processedCode.replace(
    /export\s+(const|let|var|function|class)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    "$1 $2"
  );

  return processedCode;
};

/**
 * Determina la configuración de Babel basada en el tipo de código
 * @param hasJSX - Si el código contiene JSX
 * @param hasTypeScript - Si el código contiene TypeScript
 * @param languageHint - Sugerencia de lenguaje desde el sistema (opcional)
 * @returns Configuración de presets y plugins
 */
const getBabelConfig = (
  hasJSX: boolean, 
  hasTypeScript: boolean, 
  languageHint?: string
) => {
  const presets: any[] = [];
  const plugins: any[] = [
    "loop-protection",
    "log-transform", 
    // "stray-expression-babel", // TEMPORALMENTE DESHABILITADO para debug
  ];

  if (hasJSX) {
    presets.push("react");
    CodeLogger.log("info", "Preset React agregado para JSX");
  }

  if (hasTypeScript || languageHint === "typescript") {
    presets.push("typescript");
    CodeLogger.log("info", "Preset TypeScript agregado");
  }

  // Usar configuración moderna específica en lugar de preset genérico "env"
  // Esto garantiza soporte para async/await, top-level await, ES2022+
  const modernPreset = [
    "env",
    {
      targets: {
        esmodules: true,
        // Configuración específica para ES2022+ que incluye top-level await
        chrome: "91",     // Chrome 91+ (2021) - soporte completo ES2022
        firefox: "89",    // Firefox 89+ (2021) - soporte ES2022
        safari: "15",     // Safari 15+ (2021) - soporte top-level await
        edge: "91"        // Edge 91+ (2021) - basado en Chromium
      },
      modules: false,     // Preservar ES modules para top-level await
      loose: false,       // Transformaciones precisas
      bugfixes: true,     // Correcciones de bugs habilitadas
      debug: false,       // Sin debug verbose
      // Solo incluir características que están confirmadas
      include: [
        // Características básicas que están confirmadas
        "proposal-object-rest-spread", 
        "proposal-optional-chaining",
        "proposal-nullish-coalescing-operator",
        "proposal-numeric-separator",
        "proposal-class-properties",
        "proposal-private-methods"
      ],
      exclude: [
        // Excluir transformaciones que no necesitamos
        "transform-typeof-symbol"
      ]
    }
  ];
  
  presets.push(modernPreset);
  CodeLogger.log("info", "Preset env moderno agregado con soporte ES2022+");

  return { presets, plugins };
};

/**
 * Genera mensajes de error específicos según el tipo de error
 * @param error - Error capturado
 * @param hasJSX - Si el código tiene JSX
 * @param hasTypeScript - Si el código tiene TypeScript
 * @param presets - Presets utilizados
 * @param code - Código original
 * @returns Mensaje de error formateado
 */
const generateSpecificErrorMessage = (
  error: any,
  hasJSX: boolean,
  hasTypeScript: boolean,
  presets: any[],
  code: string
): string => {
  // Error de módulo
  if (error.message?.includes("Cannot find module")) {
    return `❌ Error de módulo: ${error.message}

🔧 Sugerencias para solucionarlo:
1. Usa el gestor de paquetes para instalar el módulo
2. Verifica que el nombre del módulo sea correcto
3. Para React, está disponible automáticamente

📦 Módulos disponibles:
- react (con todos los hooks)
- lodash (utilidades)

🐛 Debug info:
- Módulos detectados en código: ${code.includes("import") ? "Sí" : "No"}
- JSX detectado: ${hasJSX}
- TypeScript detectado: ${hasTypeScript}`;
  }

  // Error de JSX
  if (error.message?.includes("jsx") || error.message?.includes("JSX")) {
    return `❌ Error de JSX: ${error.message}

🔧 Sugerencias para solucionarlo:
1. Asegúrate de que el archivo contiene código JSX válido
2. Revisa que todas las etiquetas JSX estén correctamente cerradas
3. Verifica que los componentes empiecen con mayúscula
4. Si usas fragmentos, envuelve múltiples elementos en <> </> o <div>

📝 Ejemplo de JSX válido:
function App() {
  return (
    <div>
      <h1>Hello World</h1>
    </div>
  );
}

🐛 Debug info:
- JSX detectado: ${hasJSX}
- TypeScript detectado: ${hasTypeScript}
- Presets utilizados: ${presets.map((p) => (typeof p === "string" ? p : p[0])).join(", ")}
- Presets disponibles: ${Object.keys(availablePresets).join(", ")}`;
  }

  return formatErrorForDisplay(parseError(error, "transformation"));
};

/**
 * Transforma código JavaScript/TypeScript/JSX usando Babel
 * @param code - Código a transformar
 * @param languageHint - Sugerencia de lenguaje desde el sistema (opcional)
 * @returns Código transformado
 */
export const transformCode = (code: string, languageHint?: string): string => {
  CodeLogger.log("info", "Iniciando transformación de código", {
    codeLength: code.length,
    languageHint,
  });

  // Verificar presets disponibles para debug
  try {
    const available = Object.keys(availablePresets);
    CodeLogger.log("info", "Presets disponibles en Babel standalone", available);
  } catch (error) {
    CodeLogger.log("warn", "Error al obtener presets disponibles", error);
  }

  // Preprocesar imports para convertirlos en requires
  const processedCode = preprocessImportsExports(code);

  CodeLogger.log("info", "Código preprocesado para módulos", {
    originalLength: code.length,
    processedLength: processedCode.length,
    hasImports: code.includes("import"),
    hasExports: code.includes("export"),
  });

  // Validación previa de sintaxis
  const validation = validateSyntax(processedCode);
  if (!validation.isValid && validation.error) {
    CodeLogger.log("error", "Error de validación de sintaxis", validation.error);
    throw new Error(formatErrorForDisplay(validation.error));
  }

  // Detectar automáticamente el tipo de contenido - OPTIMIZADO para eficiencia
  const detection = detectLanguageFromContent(processedCode);
  const { hasJSX, hasTypeScript } = detection;

  CodeLogger.log("info", "Detección de contenido completada", {
    hasJSX,
    hasTypeScript,
    languageHint,
    detectedLanguageId: detection.languageId,
  });

  // Determinar configuración de Babel
  const { presets, plugins } = getBabelConfig(hasJSX, hasTypeScript, languageHint);

  try {
    CodeLogger.log("info", "Configuración final de Babel", {
      presets: presets.map((p) => (typeof p === "string" ? p : p[0])),
      plugins: plugins,
      hasJSX,
      hasTypeScript,
      hasModules: code.includes("import") || code.includes("export"),
      detectedLanguage: detection.languageId,
    });

    // Determinar filename para babel basado en la detección de contenido, no en extensión de archivo
    let filename = "index.js";
    if (hasJSX && hasTypeScript) {
      filename = "index.tsx";
    } else if (hasJSX) {
      filename = "index.jsx";
    } else if (hasTypeScript) {
      filename = "index.ts";
    }

    const result = transform(processedCode, {
      filename,
      presets,
      sourceType: "module",
      parserOpts: {
        allowAwaitOutsideFunction: true,           // Permitir top-level await
        allowReturnOutsideFunction: true,         // Permitir return en módulos
        strictMode: false,                        // No modo estricto
        allowImportExportEverywhere: true,        // Imports/exports flexibles
        allowSuperOutsideMethod: true,           // Super fuera de métodos
        allowUndeclaredExports: true            // Exports no declarados
      },
      targets: {
        esmodules: true,
        chrome: "90",
        firefox: "88", 
        safari: "14.1",
        edge: "90"
      },
      sourceMaps: true,
      plugins,
      assumptions: {
        // Campos públicos y privados (ES2022)
        setPublicClassFields: true,             // Usar asignación directa para campos públicos
        privateFieldsAsProperties: true,        // Campos privados como propiedades no-enumerables (mejor para debug)
        
        // Async/await y Promises optimizados
        constantSuper: true,                    // Super es constante (mejora async en clases)
        constantReexports: true,                // Re-exports son constantes
        enumerableModuleMeta: true,            // Meta de módulo enumerable
        
        // Iteradores y generadores
        iterableIsArray: false,                 // No asumir que iterables son arrays (importante para generadores)
        skipForOfIteratorClosing: false,       // NO omitir cierre de iteradores (importante para generadores)
        
        // Optimizaciones de funciones
        ignoreFunctionLength: true,             // Ignorar longitud de función (optimización)
        ignoreToPrimitiveHint: true,           // Ignorar hint toPrimitive
        noClassCalls: true,                    // No llamadas a clase como función
        noNewArrows: true,                     // No new con arrow functions
        superIsCallableConstructor: true,      // Super es constructor llamable
        
        // Optimizaciones de objetos y propiedades
        mutableTemplateObject: true,           // Template objects mutables (mejor rendimiento)
        objectRestNoSymbols: false,            // Rest puede incluir symbols (más preciso)
        setSpreadProperties: true,             // Spread establece propiedades directamente
        setComputedProperties: true,           // Propiedades computadas como asignación
        setClassMethods: true,                 // Métodos de clase como asignación
        
        // Compatibilidad moderna
        noDocumentAll: true,                   // No hay document.all (navegadores modernos)
        pureGetters: true,                     // Getters son puros (sin efectos secundarios)
        
        // Configuración específica para async/await con setTimeout
        arrayLikeIsIterable: true,             // Array-like objects son iterables
        noUninitializedPrivateFieldAccess: true // No acceso a campos privados no inicializados
      },
    });

    if (!result || !result.code) {
      throw new Error("Babel no pudo generar código transformado");
    }

    CodeLogger.log("info", "Transformación completada exitosamente", {
      hasJSX,
      hasTypeScript,
      presetsUsed: presets.map((p) => (typeof p === "string" ? p : p[0])),
      outputLength: result.code.length,
      hasModules: code.includes("import") || code.includes("export"),
      finalLanguage: detection.languageId,
      usedFilename: filename,
    });

    return result.code;
  } catch (error: any) {
    const errorInfo = parseError(error, "transformation");
    CodeLogger.log("error", "Error durante transformación", errorInfo);

    throw new Error(
      generateSpecificErrorMessage(error, hasJSX, hasTypeScript, presets, code)
    );
  }
}; 