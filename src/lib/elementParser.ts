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
  GREEN = "#008000"
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
export async function stringify(element: any): Promise<{
  content: string;
  color?: Colors;
}> {
  if (element === null) {
    return {
      content: "null",
      color: Colors.GRAY,
    };
  }

  if (element === undefined) {
    return {
      content: "undefined",
      color: Colors.GRAY,
    };
  }

  // Manejar referencias especiales del nuevo plugin de Babel
  if (typeof element === 'string' && element.startsWith('ƒ ')) {
    return {
      content: element,
      color: Colors.INFO,
    };
  }

  // Manejar objeto console especial
  if (typeof element === 'object' && element !== null && element._isConsoleObject) {
    let content = "console {\n";
    element.methods.forEach((method: string) => {
      content += `  ${method}: ƒ ${method}(),\n`;
    });
    // Agregar algunas propiedades útiles de console
    content += "  [native code]\n}";
    
    return {
      content,
      color: Colors.GRAY,
    };
  }

  // Manejar múltiples argumentos
  if (typeof element === 'object' && element !== null && element._isMultipleArgs) {
    const stringifiedArgs = await Promise.all(
      element.args.map(async (arg: any) => {
        const result = await stringify(arg);
        return result.content;
      })
    );
    
    return {
      content: stringifiedArgs.join(' '),
      color: Colors.GRAY,
    };
  }

  if (typeof element == "string") {
    return {
      content: JSON.stringify(element),
      color: Colors.STRING,
    };
  }

  if (typeof element == "function") {
    const funcStr = element.toString();
    
    // Si es una función nativa
    if (funcStr.includes('[native code]')) {
      // Extraer el nombre de la función si es posible
      const funcName = element.name || 'function';
      return {
        content: `ƒ ${funcName}()`,
        color: Colors.INFO,
      };
    }
    
    // Si es una función definida por el usuario
    const lines = funcStr.split('\n');
    if (lines.length <= 3) {
      // Función corta, mostrar completa
      return {
        content: funcStr,
        color: Colors.INFO,
      };
    } else {
      // Función larga, mostrar solo la declaración
      const firstLine = lines[0];
      return {
        content: `${firstLine} { ... }`,
        color: Colors.INFO,
      };
    }
  }

  if (Array.isArray(element)) {
    return {
      content: ObjetToString(jc.decycle(element), {
        indent: "  ",
        singleQuotes: false,
        inlineCharacterLimit: 20,
      }),
    };
  }
  
  // Mejorar el manejo de promesas - FIX BUG: promises no-await
  if (isPromise(element)) {
    try {
      // Para promesas de fetch y otras APIs asíncronas
      if (element && typeof element.then === 'function') {
        
        // Usar un enfoque más robusto para promesas
        let isResolved = false;
        let resolvedValue: any = null;
        let rejectedReason: any = null;
        let isRejected = false;
        
        // Intentar resolver la promesa con un timeout más largo para fetch
        const timeoutDuration = 5000; // 5 segundos para APIs
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), timeoutDuration)
        );
        
        try {
          // Intentar resolver la promesa
          const result = await Promise.race([element, timeoutPromise]);
          
          // Manejar diferentes tipos de respuestas
          if (result && typeof result === 'object') {
            // Si es una Response de fetch
            if (result.constructor?.name === 'Response' || 
                (result.status !== undefined && result.ok !== undefined)) {
              return {
                content: `Response {\n  status: ${result.status},\n  ok: ${result.ok},\n  statusText: "${result.statusText}",\n  url: "${result.url}"\n}`,
                color: Colors.INFO,
              };
            }
            
            // Si es un objeto JSON (datos de API)
            if (result.constructor === Object || Array.isArray(result)) {
              const jsonString = JSON.stringify(result, null, 2);
              // Truncar si es muy largo
              const truncatedJson = jsonString.length > 500 
                ? jsonString.substring(0, 500) + '\n  ...\n}'
                : jsonString;
              
              return {
                content: truncatedJson,
                color: Colors.STRING,
              };
            }
          }
          
          // Para otros tipos de resultados
          return {
            content: `Promise { <resolved: ${JSON.stringify(result)}> }`,
            color: Colors.STRING,
          };
          
        } catch (error: any) {
          if (error.message === 'timeout') {
            return {
              content: 'Promise { <pending> }',
              color: Colors.STRING,
            };
          } else {
            // Error real de la promesa
            const errorMsg = error.message || error.toString();
            return {
              content: `Promise { <rejected: ${errorMsg}> }`,
              color: Colors.ERROR,
            };
          }
        }
      }
    } catch (error: any) {
      return {
        content: `Promise { <error: ${error.message}> }`,
        color: Colors.ERROR,
      };
    }
  }

  if (element === true) {
    return {
      content: "true",
      color: Colors.TRUE,
    };
  }

  if (element === false) {
    return {
      content: "false",
      color: Colors.FALSE,
    };
  }

  if (typeof element == "number") {
    return {
      content: element.toString(),
      color: Colors.NUMBER,
    };
  }

  // Mejorar el manejo de objetos para mostrar métodos
  if (typeof element == "object" && element !== null) {
    try {
      // Para objetos especiales como Math
      if (element === Math) {
        const mathMethods = [
          'abs', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atanh', 'atan2',
          'ceil', 'cbrt', 'clz32', 'cos', 'cosh', 'exp', 'expm1', 'floor',
          'fround', 'hypot', 'imul', 'log', 'log1p', 'log2', 'log10',
          'max', 'min', 'pow', 'random', 'round', 'sign', 'sin', 'sinh',
          'sqrt', 'tan', 'tanh', 'trunc'
        ];
        
        const mathConstants = [
          'E', 'LN10', 'LN2', 'LOG10E', 'LOG2E', 'PI', 'SQRT1_2', 'SQRT2'
        ];
        
        let content = "Math {\n";
        
        // Agregar constantes
        mathConstants.forEach(constant => {
          content += `  ${constant}: ${(Math as any)[constant]},\n`;
        });
        
        // Agregar métodos
        mathMethods.forEach(method => {
          content += `  ${method}: f ${method}(),\n`;
        });
        
        content += "}";
        
        return {
          content,
          color: Colors.GRAY,
        };
      }
      
      // Para objetos especiales como console, document, etc.
      if (element === console) {
        return {
          content: "Object [console] {\n" + 
            Object.getOwnPropertyNames(element)
              .filter(prop => typeof element[prop] === 'function')
              .map(prop => `  ${prop}: f ${prop}()`)
              .join(',\n') + 
            "\n}",
          color: Colors.GRAY,
        };
      }
      
      if (element === document && typeof document !== 'undefined') {
        const documentProps: string[] = [];
        const proto = Object.getPrototypeOf(element);
        
        // Agregar algunas propiedades importantes del document
        ['head', 'body', 'title', 'URL', 'domain', 'readyState'].forEach(prop => {
          if (prop in element) {
            const value = element[prop];
            if (typeof value === 'function') {
              documentProps.push(`  ${prop}: f ${prop}()`);
            } else if (typeof value === 'object' && value !== null) {
              documentProps.push(`  ${prop}: ${value.constructor?.name || 'Object'}`);
            } else {
              documentProps.push(`  ${prop}: ${JSON.stringify(value)}`);
            }
          }
        });
        
        return {
          content: "Document {\n" + documentProps.slice(0, 10).join(',\n') + 
                   (documentProps.length > 10 ? ',\n  ...' : '') + "\n}",
          color: Colors.GRAY,
        };
      }
      
      // Para objetos regulares, mostrar con información de métodos
      const obj = jc.decycle(element);
      const hasOwnMethods = Object.getOwnPropertyNames(element).some(prop => 
        typeof element[prop] === 'function'
      );
      
      if (hasOwnMethods) {
        const methods = Object.getOwnPropertyNames(element)
          .filter(prop => typeof element[prop] === 'function')
          .slice(0, 5); // Límite para evitar salidas muy largas
          
        const regularProps = Object.getOwnPropertyNames(element)
          .filter(prop => typeof element[prop] !== 'function')
          .slice(0, 5);
        
        let content = "{\n";
        
        // Agregar propiedades regulares
        regularProps.forEach(prop => {
          try {
            const value = element[prop];
            content += `  ${prop}: ${JSON.stringify(value)},\n`;
          } catch (e) {
            content += `  ${prop}: [object],\n`;
          }
        });
        
        // Agregar métodos
        methods.forEach(prop => {
          content += `  ${prop}: f ${prop}(),\n`;
        });
        
        if (Object.getOwnPropertyNames(element).length > 10) {
          content += "  ...\n";
        }
        
        content += "}";
        
        return {
          content,
          color: Colors.GRAY,
        };
      }
      
      // Objeto regular sin métodos
      return {
        content: ObjetToString(obj, {
          indent: "  ",
          singleQuotes: false,
          inlineCharacterLimit: 40,
        }),
        color: Colors.GRAY,
      };
    } catch (error) {
      return {
        content: "[object Object]",
        color: Colors.GRAY,
      };
    }
  }

  if (typeof element == "symbol") {
    const symbolDesc = await stringify(element.description);
    return {
      content: `Symbol(${symbolDesc.content})`,
      color: Colors.GRAY,
    };
  }

  if (typeof element == "bigint") {
    return {
      content: `${element}n`,
      color: Colors.NUMBER,
    };
  }

  return {
    content: element.toString(),
    color: Colors.GRAY,
  };
}
