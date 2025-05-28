import { languages, editor, Position, CancellationToken } from 'monaco-editor';
import { getPackageDefinition, getPackageExports, PACKAGE_DEFINITIONS } from './packageDefinitions';

// Definiciones para objetos JavaScript nativos
const NATIVE_OBJECTS: Record<string, any> = {
  'Math': {
    description: 'An intrinsic object that provides basic mathematics functionality and constants.',
    signature: 'var Math: Math',
    documentation: 'The Math object provides mathematical constants and functions. Unlike other global objects, Math is not a constructor.'
  },
  'console': {
    description: 'Provides access to the browser\'s debugging console.',
    signature: 'var console: Console',
    documentation: 'The console object provides access to the browser\'s debugging console, enabling you to output information and debug your code.'
  },
  'window': {
    description: 'The global window object represents the browser window.',
    signature: 'var window: Window',
    documentation: 'The Window interface represents a window containing a DOM document.'
  },
  'document': {
    description: 'The Document interface represents any web page loaded in the browser.',
    signature: 'var document: Document',
    documentation: 'The Document interface represents the entire HTML or XML document.'
  },
  'Array': {
    description: 'The Array object is used to store multiple values in a single variable.',
    signature: 'var Array: ArrayConstructor',
    documentation: 'The Array object is used to store multiple values in a single variable.'
  },
  'Object': {
    description: 'The Object constructor creates an object wrapper.',
    signature: 'var Object: ObjectConstructor',
    documentation: 'The Object constructor creates an object wrapper for the given value.'
  },
  'String': {
    description: 'The String object is used to represent and manipulate a sequence of characters.',
    signature: 'var String: StringConstructor',
    documentation: 'The String object is used to represent and manipulate a sequence of characters.'
  },
  'Number': {
    description: 'The Number object is a wrapper object allowing you to work with numerical values.',
    signature: 'var Number: NumberConstructor',
    documentation: 'The Number JavaScript object is a wrapper object allowing you to work with numerical values.'
  },
  'Date': {
    description: 'The Date object represents a single moment in time in a platform-independent format.',
    signature: 'var Date: DateConstructor',
    documentation: 'JavaScript Date objects represent a single moment in time in a platform-independent format.'
  },
  'JSON': {
    description: 'An intrinsic object that provides functions to convert JavaScript values to and from JSON.',
    signature: 'var JSON: JSON',
    documentation: 'The JSON object contains methods for parsing JSON and converting values to JSON.'
  },
  'Promise': {
    description: 'The Promise object represents the eventual completion (or failure) of an asynchronous operation.',
    signature: 'var Promise: PromiseConstructor',
    documentation: 'The Promise object represents the eventual completion (or failure) of an asynchronous operation and its resulting value.'
  },
  'setTimeout': {
    description: 'Sets a timer which executes a function once the timer expires.',
    signature: 'function setTimeout(handler: Function, timeout?: number): number',
    documentation: 'The global setTimeout() method sets a timer which executes a function or specified piece of code once the timer expires.'
  },
  'setInterval': {
    description: 'Repeatedly calls a function, with a fixed time delay between each call.',
    signature: 'function setInterval(handler: Function, timeout?: number): number',
    documentation: 'The setInterval() method repeatedly calls a function or executes a code snippet, with a fixed time delay between each call.'
  }
};

// Cache para hover information
const hoverCache = new Map<string, any>();

// Función para obtener información contextual de una palabra
function getContextualInfo(word: string, context?: string): any {
  const cacheKey = `${word}:${context || 'default'}`;
  
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
        documentation: `Package: ${packageDef.name}@${packageDef.version}\n${packageDef.description}`
      };
    }
    
    // 3. Verificar exports específicos de paquetes
    else {
      for (const [packageName, definition] of Object.entries(PACKAGE_DEFINITIONS)) {
        const exportDef = definition.exports.find(exp => exp.name === word);
        if (exportDef) {
          info = {
            description: exportDef.description,
            signature: exportDef.signature ? `${exportDef.type} ${word}${exportDef.signature.replace(/^[^(]*/, '')}` : `${exportDef.type} ${word}`,
            documentation: `From package: ${packageName}\n${exportDef.description}`
          };
          break;
        }
      }
    }
  }

  // 4. Fallback para variables/funciones personalizadas
  if (!info && context) {
    // Intentar detectar el tipo basado en el contexto
    if (context.includes('function')) {
      info = {
        description: `User-defined function: ${word}`,
        signature: `function ${word}(...args: any[]): any`,
        documentation: `Custom function defined in your code.`
      };
    } else if (context.includes('const') || context.includes('let') || context.includes('var')) {
      info = {
        description: `User-defined variable: ${word}`,
        signature: `var ${word}: any`,
        documentation: `Variable defined in your code.`
      };
    }
  }

  if (info) {
    hoverCache.set(cacheKey, info);
  }

  return info;
}

// Función para obtener el contexto de una línea
function getLineContext(model: editor.ITextModel, lineNumber: number): string {
  const lineContent = model.getLineContent(lineNumber);
  const prevLineContent = lineNumber > 1 ? model.getLineContent(lineNumber - 1) : '';
  return `${prevLineContent} ${lineContent}`.trim();
}

// Provider de hover para mostrar información contextual
export function createHoverProvider(): languages.HoverProvider {
  return {
    provideHover: (model, position, token) => {
      try {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const lineContext = getLineContext(model, position.lineNumber);
        const info = getContextualInfo(word.word, lineContext);

        if (!info) return null;

        // Crear el contenido del hover con estilo similar a VS Code
        const hoverContent = {
          value: `\`\`\`typescript\n${info.signature}\n\`\`\`\n\n${info.description}`,
        };

        return {
          range: new (model.constructor as any).Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn
          ),
          contents: [hoverContent]
        };

      } catch (error) {
        console.warn('Error en hover provider:', error);
        return null;
      }
    }
  };
}

// Provider de definiciones para ir a la definición
export function createDefinitionProvider(): languages.DefinitionProvider {
  return {
    provideDefinition: (model, position, token) => {
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
          // En un entorno real, esto podría abrir la documentación del paquete
          console.log(`📖 Ver documentación de ${word.word}`);
          return null;
        }

        return null;
      } catch (error) {
        console.warn('Error en definition provider:', error);
        return null;
      }
    }
  };
}

// Provider de firma de ayuda para funciones
export function createSignatureHelpProvider(): languages.SignatureHelpProvider {
  return {
    signatureHelpTriggerCharacters: ['(', ','],
    signatureHelpRetriggerCharacters: [')'],
    
    provideSignatureHelp: (model, position, token, context) => {
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
            signatures: [{
              label: info.signature,
              documentation: info.description,
              parameters: [] // Se podrían extraer de la signatura
            }],
            activeSignature: 0,
            activeParameter: 0
          },
          dispose: () => {}
        };

      } catch (error) {
        console.warn('Error en signature help provider:', error);
        return null;
      }
    }
  };
}

// Función para configurar todos los providers de ayuda contextual
export function setupContextualHelp(monaco: any): () => void {
  try {
    // Registrar hover provider para JavaScript y TypeScript
    const jsHoverDisposable = monaco.languages.registerHoverProvider(
      'javascript',
      createHoverProvider()
    );
    
    const tsHoverDisposable = monaco.languages.registerHoverProvider(
      'typescript',
      createHoverProvider()
    );

    // Registrar definition provider
    const jsDefinitionDisposable = monaco.languages.registerDefinitionProvider(
      'javascript',
      createDefinitionProvider()
    );
    
    const tsDefinitionDisposable = monaco.languages.registerDefinitionProvider(
      'typescript',
      createDefinitionProvider()
    );

    // Registrar signature help provider
    const jsSignatureDisposable = monaco.languages.registerSignatureHelpProvider(
      'javascript',
      createSignatureHelpProvider()
    );
    
    const tsSignatureDisposable = monaco.languages.registerSignatureHelpProvider(
      'typescript',
      createSignatureHelpProvider()
    );

    console.log('🔍 Sistema de ayuda contextual configurado');

    // Función de limpieza
    return () => {
      jsHoverDisposable.dispose();
      tsHoverDisposable.dispose();
      jsDefinitionDisposable.dispose();
      tsDefinitionDisposable.dispose();
      jsSignatureDisposable.dispose();
      tsSignatureDisposable.dispose();
      hoverCache.clear();
    };

  } catch (error) {
    console.error('Error configurando ayuda contextual:', error);
    return () => {};
  }
}

// Función para agregar definiciones personalizadas
export function addCustomDefinition(word: string, definition: any): void {
  hoverCache.set(`${word}:default`, definition);
}

// Función para limpiar cache
export function clearHoverCache(): void {
  hoverCache.clear();
} 