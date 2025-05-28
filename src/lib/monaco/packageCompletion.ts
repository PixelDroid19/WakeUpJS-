import { languages, editor, Uri } from 'monaco-editor';
import { PACKAGE_DEFINITIONS, getPackageDefinition, getPackageExports, generateTypeDeclaration } from './packageDefinitions';
import type { Package } from '../../context/PackageManagerContext';

// Tipos para el autocompletado
interface CompletionItem {
  label: string;
  kind: languages.CompletionItemKind;
  detail?: string;
  documentation?: string;
  insertText: string;
  range?: any;
}

// Cache para evitar recálculos innecesarios
const completionCache = new Map<string, CompletionItem[]>();
const typeDeclarationCache = new Map<string, string>();

// Función para limpiar el cache
export function clearPackageCompletionCache(): void {
  completionCache.clear();
  typeDeclarationCache.clear();
}

// Función para obtener paquetes instalados desde localStorage
function getInstalledPackages(): Record<string, Package> {
  try {
    const stored = localStorage.getItem('jsrunner-packages');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Error al cargar paquetes instalados:', error);
    return {};
  }
}

// Función para obtener lista de paquetes disponibles
function getAvailablePackages(): string[] {
  const installedPackages = getInstalledPackages();
  const packageNames = new Set<string>();
  
  // Agregar paquetes instalados
  Object.keys(installedPackages).forEach(name => packageNames.add(name));
  
  // Agregar paquetes predefinidos
  Object.keys(PACKAGE_DEFINITIONS).forEach(name => packageNames.add(name));
  
  return Array.from(packageNames).sort();
}

// Función para detectar si estamos en un import statement
function isInImportStatement(model: editor.ITextModel, position: any): boolean {
  const lineContent = model.getLineContent(position.lineNumber);
  const beforeCursor = lineContent.substring(0, position.column - 1);
  
  // Detectar diferentes tipos de import
  const importPatterns = [
    /^\s*import\s+/,                           // import ...
    /^\s*import\s+\{[^}]*\}\s+from\s+$/,      // import { ... } from 
    /^\s*import\s+\*\s+as\s+\w+\s+from\s+$/,  // import * as name from 
    /^\s*import\s+\w+\s+from\s+$/,            // import defaultName from 
    /^\s*from\s+$/,                           // from ...
  ];
  
  return importPatterns.some(pattern => pattern.test(beforeCursor));
}

// Función para detectar si estamos escribiendo el nombre del paquete
function isWritingPackageName(model: editor.ITextModel, position: any): boolean {
  const lineContent = model.getLineContent(position.lineNumber);
  const beforeCursor = lineContent.substring(0, position.column - 1);
  
  // Buscar patrones donde se espera el nombre del paquete
  const packageNamePatterns = [
    /import\s+[^'"]*from\s+['"][^'"]*$/,      // import ... from "partial-name
    /import\s+['"][^'"]*$/,                   // import "partial-name
    /from\s+['"][^'"]*$/,                     // from "partial-name
  ];
  
  return packageNamePatterns.some(pattern => pattern.test(beforeCursor));
}

// Función para detectar si estamos escribiendo named imports
function isWritingNamedImports(model: editor.ITextModel, position: any): boolean {
  const lineContent = model.getLineContent(position.lineNumber);
  const beforeCursor = lineContent.substring(0, position.column - 1);
  
  // Buscar si estamos dentro de las llaves de un import
  const openBrace = beforeCursor.lastIndexOf('{');
  const closeBrace = beforeCursor.lastIndexOf('}');
  const fromKeyword = beforeCursor.lastIndexOf('from');
  
  // Estamos en named imports si hay una llave abierta después de import y antes de from
  return openBrace > -1 && (closeBrace === -1 || openBrace > closeBrace) && 
         (fromKeyword === -1 || openBrace < fromKeyword);
}

// Función para extraer el nombre del paquete de la línea actual
function extractPackageName(model: editor.ITextModel, position: any): string | null {
  const lineContent = model.getLineContent(position.lineNumber);
  
  // Buscar el patrón from "package-name"
  const fromMatch = lineContent.match(/from\s+['"]([^'"]*)['"]/);
  if (fromMatch) {
    return fromMatch[1];
  }
  
  // Buscar el patrón import "package-name"
  const importMatch = lineContent.match(/import\s+['"]([^'"]*)['"]/);
  if (importMatch) {
    return importMatch[1];
  }
  
  return null;
}

// Función para generar sugerencias de paquetes
function createPackageCompletions(availablePackages: string[]): CompletionItem[] {
  const cacheKey = 'packages:' + availablePackages.join(',');
  
  if (completionCache.has(cacheKey)) {
    return completionCache.get(cacheKey)!;
  }
  
  const completions: CompletionItem[] = availablePackages.map(packageName => {
    const definition = getPackageDefinition(packageName);
    const installedPackages = getInstalledPackages();
    const isInstalled = !!(installedPackages[packageName] || definition);
    const description = definition?.description || `Paquete ${packageName}`;
    
    return {
      label: packageName,
      kind: languages.CompletionItemKind.Module,
      detail: description,
      documentation: isInstalled ? 
        `✅ Instalado - ${description}` :
        `📦 Disponible para instalar - ${description}`,
      insertText: packageName,
    };
  });
  
  completionCache.set(cacheKey, completions);
  return completions;
}

// Función para generar sugerencias de exports de un paquete
function createExportCompletions(packageName: string): CompletionItem[] {
  const cacheKey = `exports:${packageName}`;
  
  if (completionCache.has(cacheKey)) {
    return completionCache.get(cacheKey)!;
  }
  
  const exports = getPackageExports(packageName);
  const completions: CompletionItem[] = exports.map(exp => {
    let kind: languages.CompletionItemKind;
    
    switch (exp.type) {
      case 'function':
        kind = languages.CompletionItemKind.Function;
        break;
      case 'class':
        kind = languages.CompletionItemKind.Class;
        break;
      case 'const':
        kind = languages.CompletionItemKind.Constant;
        break;
      case 'interface':
        kind = languages.CompletionItemKind.Interface;
        break;
      case 'type':
        kind = languages.CompletionItemKind.TypeParameter;
        break;
      default:
        kind = languages.CompletionItemKind.Variable;
    }
    
    return {
      label: exp.name,
      kind,
      detail: exp.signature ? `${exp.type}: ${exp.signature}` : exp.type,
      documentation: exp.description || `${exp.type} exportado de ${packageName}`,
      insertText: exp.name,
    };
  });
  
  completionCache.set(cacheKey, completions);
  return completions;
}

// Provider principal de autocompletado
export function createPackageCompletionProvider(): languages.CompletionItemProvider {
  return {
    triggerCharacters: ['"', "'", '{', ',', ' '],
    
    provideCompletionItems: (model, position, context, token) => {
      try {
        const suggestions: CompletionItem[] = [];
        
        // Verificar si estamos escribiendo el nombre de un paquete
        if (isWritingPackageName(model, position)) {
          const availablePackages = getAvailablePackages();
          suggestions.push(...createPackageCompletions(availablePackages));
        }
        
        // Verificar si estamos escribiendo named imports
        else if (isWritingNamedImports(model, position)) {
          const packageName = extractPackageName(model, position);
          if (packageName && getPackageDefinition(packageName)) {
            suggestions.push(...createExportCompletions(packageName));
          }
        }
        
        // Verificar si estamos en un import statement genérico
        else if (isInImportStatement(model, position)) {
          const availablePackages = getAvailablePackages();
          suggestions.push(...createPackageCompletions(availablePackages));
        }
        
        return {
          suggestions: suggestions.map(item => ({
            ...item,
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column,
              endColumn: position.column,
            }
          }))
        };
        
      } catch (error) {
        console.warn('Error en provider de autocompletado:', error);
        return { suggestions: [] };
      }
    }
  };
}

// Función para registrar definiciones de tipos en Monaco
export function registerPackageTypes(monaco: any): void {
  try {
    const availablePackages = getAvailablePackages();
    
    availablePackages.forEach(packageName => {
      const cacheKey = `types:${packageName}`;
      
      let typeDeclaration = typeDeclarationCache.get(cacheKey);
      if (!typeDeclaration) {
        typeDeclaration = generateTypeDeclaration(packageName);
        if (typeDeclaration) {
          typeDeclarationCache.set(cacheKey, typeDeclaration);
        }
      }
      
      if (typeDeclaration) {
        // Registrar las definiciones de tipos en Monaco
        monaco.languages.typescript.javascriptDefaults.addExtraLib(
          typeDeclaration,
          `file:///node_modules/@types/${packageName}/index.d.ts`
        );
        
        monaco.languages.typescript.typescriptDefaults.addExtraLib(
          typeDeclaration,
          `file:///node_modules/@types/${packageName}/index.d.ts`
        );
      }
    });
    
    
  } catch (error) {
    console.warn('Error registrando tipos de paquetes:', error);
  }
}

// Función para configurar el autocompletado de paquetes en Monaco
export function setupPackageCompletion(monaco: any): () => void {
  try {
    // Registrar el provider de autocompletado para JavaScript
    const jsDisposable = monaco.languages.registerCompletionItemProvider(
      'javascript',
      createPackageCompletionProvider()
    );
    
    // Registrar el provider de autocompletado para TypeScript
    const tsDisposable = monaco.languages.registerCompletionItemProvider(
      'typescript',
      createPackageCompletionProvider()
    );
    
    // Registrar tipos de paquetes
    registerPackageTypes(monaco);
    
    // Configurar opciones adicionales de TypeScript/JavaScript
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      allowJs: true,
      typeRoots: ["node_modules/@types"]
    });
    
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: "React",
      allowJs: true,
      typeRoots: ["node_modules/@types"]
    });
    
    console.log('🚀 Sistema de autocompletado de paquetes configurado exitosamente');
    
    // Función de limpieza
    return () => {
      jsDisposable.dispose();
      tsDisposable.dispose();
      clearPackageCompletionCache();
    };
    
  } catch (error) {
    console.error('Error configurando autocompletado de paquetes:', error);
    return () => {};
  }
}

// Función para actualizar el autocompletado cuando cambien los paquetes instalados
export function updatePackageCompletions(monaco: any): void {
  clearPackageCompletionCache();
  registerPackageTypes(monaco);
  console.log('🔄 Autocompletado de paquetes actualizado');
}

// Hook para escuchar cambios en localStorage y actualizar automáticamente
export function setupPackageUpdateListener(monaco: any): () => void {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'jsrunner-packages' || e.key === 'jsrunner-packages-list') {
      updatePackageCompletions(monaco);
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
} 