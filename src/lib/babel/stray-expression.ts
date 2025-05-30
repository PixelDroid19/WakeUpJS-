import type { TraverseOptions, Node } from '@babel/traverse';

export default function ({ types: t }: any): { visitor: TraverseOptions<Node> } {

	function shouldSkipExpression(path: any): boolean {
		// Saltar si está en una declaración de variable
		if (path.parentPath.node.type === 'VariableDeclarator') return true;
		
		// Saltar si no es una ExpressionStatement (línea independiente)
		if (path.parentPath.node.type !== 'ExpressionStatement') return true;
		
		// Saltar si es dentro de un loop, condicional, función, clase, etc.
		if (path.parentPath.parentPath?.node?.type === 'WhileStatement') return true;
		if (path.parentPath.parentPath?.node?.type === 'ForStatement') return true;
		if (path.parentPath.parentPath?.node?.type === 'IfStatement') return true;
		if (path.parentPath.parentPath?.node?.type === 'FunctionDeclaration') return true;
		if (path.parentPath.parentPath?.node?.type === 'FunctionExpression') return true;
		if (path.parentPath.parentPath?.node?.type === 'ArrowFunctionExpression') return true;
		if (path.parentPath.parentPath?.node?.type === 'MethodDefinition') return true;
		if (path.parentPath.parentPath?.node?.type === 'ClassDeclaration') return true;
		if (path.parentPath.parentPath?.node?.type === 'ObjectExpression') return true;
		if (path.parentPath.parentPath?.node?.type === 'ArrayExpression') return true;
		if (path.parentPath.parentPath?.node?.type === 'TryStatement') return true;
		if (path.parentPath.parentPath?.node?.type === 'CatchClause') return true;
		if (path.parentPath.parentPath?.node?.type === 'BlockStatement') return true;
		
		// Saltar si ya es una llamada debug
		if (path.node.callee && 'name' in path.node.callee && path.node.callee.name === 'debug') return true;
		
		// Saltar si no tiene información de línea
		if (!path.node.loc?.start?.line) return true;
		
		// Solo permitir expresiones en el nivel superior del programa
		let currentPath = path.parentPath;
		while (currentPath) {
			if (currentPath.node.type === 'Program') {
				// Estamos en el nivel superior, esto es válido
				break;
			}
			if (currentPath.node.type === 'FunctionDeclaration' ||
			    currentPath.node.type === 'FunctionExpression' ||
			    currentPath.node.type === 'ArrowFunctionExpression' ||
			    currentPath.node.type === 'ClassDeclaration' ||
			    currentPath.node.type === 'ObjectExpression' ||
			    currentPath.node.type === 'ArrayExpression' ||
			    currentPath.node.type === 'BlockStatement') {
				// Estamos dentro de una estructura, saltar
				return true;
			}
			currentPath = currentPath.parentPath;
		}
		
		return false;
	}

	function _replaceWithDebug(path: any, expression?: any) {
		const lineNumber = path.node.loc.start.line;
		const expr = expression || path.node;
		
		return t.callExpression(t.identifier('debug'), [
			t.numericLiteral(lineNumber),
			t.stringLiteral('log'), 
			expr
		]);
	}

	return {
		visitor: {
			// Capturar SOLO expresiones independientes en el nivel superior
			ExpressionStatement(path) {
				// Solo procesar si es realmente independiente y en nivel superior
				if (path.parentPath?.node?.type !== 'Program') return;
				
				// Saltar si es una declaración de función o clase
				if (path.node.expression?.type === 'FunctionExpression' ||
				    path.node.expression?.type === 'ClassExpression') return;
				
				// Saltar si es console.log (ya manejado por log-babel)
				if (path.node.expression?.type === 'CallExpression' &&
				    path.node.expression.callee?.type === 'MemberExpression' &&
				    'name' in path.node.expression.callee.object &&
				    path.node.expression.callee.object?.name === 'console') return;
				
				// Saltar si ya es una llamada debug
				if (path.node.expression?.type === 'CallExpression' &&
				    'name' in path.node.expression.callee &&
				    path.node.expression.callee?.name === 'debug') return;
				
				// Solo transformar expresiones simples que estén sueltas
				const expr = path.node.expression;
				if (expr && path.node.loc?.start?.line) {
					const debugCall = _replaceWithDebug(path, expr);
					path.replaceWith(t.expressionStatement(debugCall));
				}
			}
		}
	};
}

