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
import { detectJSX, detectTypeScript } from "./detectors";

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
    (match, importClause, moduleName) => {
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
    (match, exports) => {
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
 * @param fileLanguage - Lenguaje del archivo especificado externamente
 * @returns Configuración de presets y plugins
 */
const getBabelConfig = (
  hasJSX: boolean, 
  hasTypeScript: boolean, 
  fileLanguage?: string
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

  if (hasTypeScript || fileLanguage === "typescript") {
    presets.push("typescript");
    CodeLogger.log("info", "Preset TypeScript agregado");
  }

  // Preset env como base (siempre)
  presets.push("env");
  CodeLogger.log("info", "Preset env agregado como base");

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
 * @param fileLanguage - Lenguaje del archivo (opcional)
 * @returns Código transformado
 */
export const transformCode = (code: string, fileLanguage?: string): string => {
  CodeLogger.log("info", "Iniciando transformación de código", {
    codeLength: code.length,
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

  // Detectar automáticamente el tipo de contenido
  const hasJSX = detectJSX(processedCode);
  const hasTypeScript = detectTypeScript(processedCode);

  CodeLogger.log("info", "Detección de contenido", {
    hasJSX,
    hasTypeScript,
    fileLanguage,
  });

  // Determinar configuración de Babel
  const { presets, plugins } = getBabelConfig(hasJSX, hasTypeScript, fileLanguage);

  try {
    CodeLogger.log("info", "Configuración final de Babel", {
      presets: presets.map((p) => (typeof p === "string" ? p : p[0])),
      plugins: plugins,
      hasJSX,
      hasTypeScript,
      hasModules: code.includes("import") || code.includes("export"),
    });

    const result = transform(processedCode, {
      filename: hasJSX
        ? hasTypeScript
          ? "index.tsx"
          : "index.jsx"
        : hasTypeScript
        ? "index.ts"
        : "index.js",
      presets,
      sourceType: "module",
      parserOpts: {
        allowAwaitOutsideFunction: true,
        allowReturnOutsideFunction: true,
        strictMode: false,
        allowImportExportEverywhere: true,
        allowSuperOutsideMethod: true,
        allowUndeclaredExports: true,
      },
      targets: {
        esmodules: true,
      },
      sourceMaps: true,
      plugins,
      assumptions: {
        setPublicClassFields: true,
        privateFieldsAsProperties: true,
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