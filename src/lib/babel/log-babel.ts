// Transforma todas las instancias de console.* para usar la función debug(line, method, ...params)
// Soporte completo para todos los métodos de console y referencias sin llamar

import type { TraverseOptions, Node } from '@babel/traverse';

export default function ({ types: t }: { types: any }): { visitor: TraverseOptions<Node> } {
	return {
		visitor: {
			// Manejar llamadas a console.method()
			CallExpression(path: any) {
				const { node } = path;
				if (!node.callee) return;
				
				// Verificar si es una llamada a console.method()
				if (node.callee.type === 'MemberExpression' &&
					node.callee.object && 
					node.callee.object.name === 'console' &&
					node.callee.property) {
					
					const methodName = node.callee.property.name;
					
					// Lista completa de métodos de console soportados
					const supportedMethods = [
						'log', 'warn', 'error', 'info', 'debug', 
						'table', 'dir', 'dirxml', 'trace', 'group', 
						'groupCollapsed', 'groupEnd', 'count', 
						'countReset', 'time', 'timeEnd', 'timeLog',
						'assert', 'clear', 'profile', 'profileEnd',
						'timeStamp', 'context', 'createTask'
					];

					if (!supportedMethods.includes(methodName)) return;

					const lineNumber = node.loc?.start?.line || 0;
					
					// Reemplazar argumentos con línea, método y argumentos originales
					node.arguments = [
						t.numericLiteral(lineNumber),
						t.stringLiteral(methodName),
						...node.arguments
					];
					
					// Reemplazar callee con 'debug'
					node.callee = t.identifier('debug');
				}
			},

			// Manejar referencias a console.method (sin llamar)
			MemberExpression(path: any) {
				const { node } = path;
				if (!node.object || !node.property) return;
				
				// Solo procesar si el objeto es 'console'
				if (node.object.name !== 'console') return;

				// Skip si es parte de una llamada (ya manejado en CallExpression)
				if (path.parentPath && path.parentPath.isCallExpression() && 
					path.parentPath.node.callee === node) {
					return;
				}

				const methodName = node.property.name;
				
				// Lista completa de métodos de console soportados
				const supportedMethods = [
					'log', 'warn', 'error', 'info', 'debug', 
					'table', 'dir', 'dirxml', 'trace', 'group', 
					'groupCollapsed', 'groupEnd', 'count', 
					'countReset', 'time', 'timeEnd', 'timeLog',
					'assert', 'clear', 'profile', 'profileEnd',
					'timeStamp', 'context', 'createTask'
				];

				if (!supportedMethods.includes(methodName)) return;

				const lineNumber = node.loc?.start?.line || 0;
				
				// Es una referencia sin llamar: console.log
				// Crear una expresión que retorne información del método
				const replacement = t.callExpression(
					t.identifier('debug'),
					[
						t.numericLiteral(lineNumber),
						t.stringLiteral('_reference'),
						t.objectExpression([
							t.objectProperty(t.identifier('type'), t.stringLiteral('method')),
							t.objectProperty(t.identifier('object'), t.stringLiteral('console')),
							t.objectProperty(t.identifier('method'), t.stringLiteral(methodName))
						])
					]
				);
				path.replaceWith(replacement);
			},

			// Manejar referencias al objeto console completo
			Identifier(path: any) {
				// Solo si el identificador es 'console' y no es parte de un MemberExpression
				if (path.node.name === 'console' && 
					!path.isMemberExpression() && 
					!path.isObjectProperty() &&
					path.parentPath && 
					!path.parentPath.isMemberExpression() && 
					!path.parentPath.isObjectProperty()) {
					
					const lineNumber = path.node.loc?.start?.line || 0;
					
					// Crear expresión que retorne información del objeto console
					const replacement = t.callExpression(
						t.identifier('debug'),
						[
							t.numericLiteral(lineNumber),
							t.stringLiteral('_reference'),
							t.objectExpression([
								t.objectProperty(t.identifier('type'), t.stringLiteral('object')),
								t.objectProperty(t.identifier('object'), t.stringLiteral('console'))
							])
						]
					);
					path.replaceWith(replacement);
				}
			}
		}
	};
}