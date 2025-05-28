import { EDITOR_CONFIG } from "../../constants/config";

// Plugin de Babel para proteger contra bucles infinitos
export default function loopProtectionPlugin() {
  return {
    visitor: {
      WhileStatement(path: any) {
        // Solo agregar protección si no es async/await
        if (!hasAsyncInside(path.node)) {
          addLoopProtection(path, 'while');
        }
      },
      
      ForStatement(path: any) {
        if (!hasAsyncInside(path.node)) {
          addLoopProtection(path, 'for');
        }
      },
      
      DoWhileStatement(path: any) {
        if (!hasAsyncInside(path.node)) {
          addLoopProtection(path, 'do-while');
        }
      }
    }
  };
}

// Función para agregar protección a los bucles
function addLoopProtection(path: any, loopType: string) {
  const counter = path.scope.generateUidIdentifier('loopCounter');
  const maxIterations = EDITOR_CONFIG.LOOP_ITERATION_LIMIT;
  
  // Crear la declaración del contador
  const counterDeclaration = {
    type: 'VariableDeclaration',
    kind: 'var',
    declarations: [{
      type: 'VariableDeclarator',
      id: counter,
      init: { type: 'NumericLiteral', value: 0 }
    }]
  };
  
  // Insertar la declaración antes del bucle
  path.insertBefore(counterDeclaration);
  
  // Crear la protección contra bucle infinito
  const protection = {
    type: 'IfStatement',
    test: {
      type: 'BinaryExpression',
      operator: '>',
      left: {
        type: 'UpdateExpression',
        operator: '++',
        prefix: true,
        argument: counter
      },
      right: {
        type: 'NumericLiteral',
        value: maxIterations
      }
    },
    consequent: {
      type: 'ThrowStatement',
      argument: {
        type: 'NewExpression',
        callee: { type: 'Identifier', name: 'Error' },
        arguments: [{
          type: 'StringLiteral',
          value: `🔄 Bucle detenido: Se ejecutaron más de ${maxIterations.toLocaleString()} iteraciones en un bucle ${loopType}. Posible bucle infinito detectado.`
        }]
      }
    }
  };
  
  // Agregar la protección al cuerpo del bucle
  if (path.node.body.type === 'BlockStatement') {
    path.node.body.body.unshift(protection);
  } else {
    path.node.body = {
      type: 'BlockStatement',
      body: [protection, path.node.body]
    };
  }
}

// Función auxiliar para detectar si hay async/await dentro del bucle
function hasAsyncInside(node: any): boolean {
  // Implementación básica - evitar instrumentar bucles que ya manejan async
  const nodeString = JSON.stringify(node);
  return nodeString.includes('await') || 
         nodeString.includes('async') ||
         nodeString.includes('Promise') ||
         nodeString.includes('setTimeout') ||
         nodeString.includes('setInterval');
} 