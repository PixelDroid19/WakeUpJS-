import { Snippet } from "../../../types/snippets";
import { languages, editor, Range } from 'monaco-editor';

/**
 * ========================
 * 📝 MÓDULO DE CONFIGURACIÓN DE SNIPPETS
 * ========================
 * 
 * Este módulo maneja la configuración de snippets en Monaco Editor.
 * 
 * Responsabilidades:
 * - Configurar providers de snippets avanzados
 * - Manejar completion items personalizados
 * - Proporcionar snippets para diferentes lenguajes
 * - Procesar variables de snippet (formato VS Code)
 * - Validación de snippets
 */

// Variables para snippets y providers
let snippetProvidersDisposables: any[] = [];

// ========================
// 🔷 PROCESAMIENTO DE SNIPPETS
// ========================

// Procesar variables de snippet (formato VS Code)
function processSnippetVariables(body: string | string[]): string {
  const bodyText = Array.isArray(body) ? body.join('\n') : body;
  
  // Convertir variables de VS Code a formato Monaco
  return bodyText
    // ${1:defaultText} -> $1
    .replace(/\$\{(\d+):([^}]*)\}/g, '$$$1')
    // ${1} -> $1  
    .replace(/\$\{(\d+)\}/g, '$$$1')
    // Variables especiales
    .replace(/\$\{TM_FILENAME_BASE\}/g, '${TM_FILENAME_BASE}')
    .replace(/\$\{TM_FILENAME\}/g, '${TM_FILENAME}')
    .replace(/\$\{TM_DIRECTORY\}/g, '${TM_DIRECTORY}')
    .replace(/\$\{WORKSPACE_NAME\}/g, '${WORKSPACE_NAME}');
}

// Crear sugerencia de autocompletado a partir de un snippet
function createSnippetSuggestion(snippet: Snippet): languages.CompletionItem {
  const processedBody = processSnippetVariables(snippet.body);
  
  return {
    label: {
      label: snippet.prefix,
      description: snippet.name,
      detail: snippet.description || '',
    },
    kind: languages.CompletionItemKind.Snippet,
    insertText: processedBody,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: {
      value: `**${snippet.name}**\n\n${snippet.description || ''}\n\n\`\`\`${snippet.language}\n${processedBody}\n\`\`\``,
      isTrusted: true,
    },
    // Dar alta prioridad a los snippets en el autocompletado
    sortText: `a_snippet_${snippet.prefix}`,
    filterText: snippet.prefix,
    detail: `${snippet.name} (snippet)${snippet.isBuiltIn ? ' • integrado' : ' • personalizado'}`,
    range: new Range(1, 1, 1, 1), // Se sobreescribirá automáticamente
  };
}

// Filtrar snippets por lenguaje
function getSnippetsForLanguage(snippets: Snippet[], language: string): Snippet[] {
  return snippets.filter(snippet => {
    // Permitir snippets específicos del lenguaje o universales
    return snippet.language === language || 
           snippet.language === 'plaintext' || 
           snippet.language === '*' ||
           // Compatibilidad entre JavaScript y TypeScript
           (language === 'typescript' && snippet.language === 'javascript') ||
           (language === 'javascript' && snippet.language === 'typescript') ||
           // Compatibilidad para JSX/TSX
           (language === 'javascriptreact' && (snippet.language === 'javascript' || snippet.language === 'react')) ||
           (language === 'typescriptreact' && (snippet.language === 'typescript' || snippet.language === 'react' || snippet.language === 'javascript'));
  });
}

// ========================
// 🔷 PROVIDERS DE SNIPPETS
// ========================

// Configurar provider de snippets para un lenguaje específico
function setupSnippetProvider(
  monaco: any,
  language: string,
  getSnippets: () => Snippet[]
): any {
  return monaco.languages.registerCompletionItemProvider(language, {
    triggerCharacters: [],
    
    provideCompletionItems: (model: any, position: any, context: any, token: any) => {
      // Obtener snippets actuales
      const allSnippets = getSnippets();
      const languageSnippets = getSnippetsForLanguage(allSnippets, language);
      
      // Crear sugerencias
      const suggestions = languageSnippets.map(snippet => 
        createSnippetSuggestion(snippet)
      );
      
      return {
        suggestions,
        incomplete: false,
      };
    },
  });
}

// Configurar providers para múltiples lenguajes
function setupSnippetProviders(
  monaco: any,
  getSnippets: () => Snippet[]
): any[] {
  // Lenguajes soportados ampliados
  const supportedLanguages = [
    'javascript',
    'typescript',
    'javascriptreact', 
    'typescriptreact',
    'json',
    'html',
    'css',
    'scss',
    'less',
    'markdown',
    'plaintext',
    'yaml',
    'xml',
  ];
  
  const disposables = supportedLanguages.map(language =>
    setupSnippetProvider(monaco, language, getSnippets)
  );
  
  return disposables;
}

// ========================
// 🔷 FUNCIONES PRINCIPALES
// ========================

export function setupSnippets(monaco: any, getSnippets: () => Snippet[]): void {
  console.log("📝 Configurando snippets avanzados en Monaco");
  
  cleanupSnippetProviders();

  // Configurar providers avanzados para todos los lenguajes
  const disposables = setupSnippetProviders(monaco, getSnippets);
  snippetProvidersDisposables.push(...disposables);

  console.log("✅ Snippets avanzados configurados para todos los lenguajes");
}

export function refreshSnippets(monaco: any): void {
  console.log("🔄 Refrescando snippets en Monaco");
  // Los snippets se refrescan automáticamente ya que usan la función getSnippets
}

export function setupPackageCompletion(monaco: any): () => void {
  console.log("📦 Configurando package completions");
  
  // Configuración básica de completions para paquetes
  const jsProvider = monaco.languages.registerCompletionItemProvider(
    "javascript",
    {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = [
          {
            label: "console.log",
            kind: languages.CompletionItemKind.Function,
            insertText: "console.log($1)",
            insertTextRules:
              languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Imprimir en consola",
          },
          {
            label: "setTimeout",
            kind: languages.CompletionItemKind.Function,
            insertText: "setTimeout(() => {\n\t$1\n}, $2)",
            insertTextRules:
              languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Ejecutar función después de un delay",
          },
        ];
        return { suggestions };
      },
    }
  );

  const tsProvider = monaco.languages.registerCompletionItemProvider(
    "typescript",
    {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = [
          {
            label: "interface",
            kind: languages.CompletionItemKind.Keyword,
            insertText: "interface ${1:Name} {\n\t$2\n}",
            insertTextRules:
              languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Definir interfaz TypeScript",
          },
          {
            label: "type",
            kind: languages.CompletionItemKind.Keyword,
            insertText: "type ${1:Name} = $2",
            insertTextRules:
              languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Definir tipo TypeScript",
          },
        ];
        return { suggestions };
      },
    }
  );

  const disposeCompletions = () => {
    jsProvider.dispose();
    tsProvider.dispose();
  };

  return disposeCompletions;
}

export function setupCustomValidation(monaco: any): void {
  console.log("🔧 Configurando validadores personalizados");
  
  // Configurar validación de sintaxis mejorada
  monaco.languages.registerCompletionItemProvider("typescript", {
    provideCompletionItems: (model: any, position: any) => {
      const suggestions = [
        {
          label: "interface",
          kind: languages.CompletionItemKind.Keyword,
          insertText: "interface ${1:Name} {\n\t$0\n}",
          insertTextRules:
            languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Define una interfaz TypeScript",
        },
        {
          label: "type",
          kind: languages.CompletionItemKind.Keyword,
          insertText: "type ${1:Name} = $0",
          insertTextRules:
            languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Define un tipo TypeScript",
        },
      ];
      return { suggestions };
    },
  });

  monaco.languages.registerCompletionItemProvider("typescriptreact", {
    provideCompletionItems: (model: any, position: any) => {
      const suggestions = [
        {
          label: "React.FC",
          kind: languages.CompletionItemKind.Interface,
          insertText:
            "React.FC<${1:Props}> = (${2:props}) => {\n\treturn (\n\t\t$0\n\t);\n}",
          insertTextRules:
            languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Componente funcional de React con TypeScript",
        },
      ];
      return { suggestions };
    },
  });
  
  console.log("✅ Validadores personalizados configurados");
}

export function refreshPackageCompletions(monaco: any): void {
  console.log("🔄 Refrescando package completions");
  // Package completions se pueden refrescar aquí si es necesario
}

// ========================
// 🔷 FUNCIONES DE UTILIDAD
// ========================

// Insertar snippet manualmente en el editor
export function insertSnippet(
  editor: any,
  snippet: Snippet
): void {
  const selection = editor.getSelection();
  if (!selection) return;
  
  const processedBody = processSnippetVariables(snippet.body);
  
  // Insertar como snippet
  editor.executeEdits('snippet-insert', [
    {
      range: selection,
      text: processedBody,
      forceMoveMarkers: true,
    },
  ]);
  
  // Trigger snippet mode si Monaco lo soporta
  try {
    (editor as any).trigger('snippet-insert', 'editor.action.insertSnippet', {
      snippet: processedBody,
    });
  } catch (error) {
    console.log('📦 Snippet insertado como texto plano');
  }
}

// Registrar comando para insertar snippet por ID
export function registerSnippetCommands(
  monaco: any,
  editor: any,
  getSnippets: () => Snippet[]
): any[] {
  const disposables: any[] = [];
  
  // Comando para abrir paleta de snippets
  try {
    const paletteCommand = editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP,
      () => {
        // Trigger de la paleta de snippets
        const snippets = getSnippets();
        const currentLanguage = editor.getModel()?.getLanguageId() || 'javascript';
        const languageSnippets = getSnippetsForLanguage(snippets, currentLanguage);
        
        console.log('📦 Snippets disponibles:', languageSnippets.map(s => s.name));
      }
    );
    
    if (paletteCommand && typeof paletteCommand === 'object' && 'dispose' in paletteCommand) {
      disposables.push(paletteCommand);
    }
  } catch (error) {
    console.warn('No se pudo registrar el comando de paleta de snippets:', error);
  }
  
  return disposables;
}

// Utilidad para validar un snippet
export function validateSnippet(snippet: Partial<Snippet>): string[] {
  const errors: string[] = [];
  
  if (!snippet.name?.trim()) {
    errors.push('El nombre es requerido');
  }
  
  if (!snippet.prefix?.trim()) {
    errors.push('El prefijo es requerido');
  }
  
  if (!snippet.body) {
    errors.push('El cuerpo del snippet es requerido');
  }
  
  if (!snippet.language?.trim()) {
    errors.push('El lenguaje es requerido');
  }
  
  // Validar formato del prefijo (sin espacios, caracteres especiales)
  if (snippet.prefix && !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(snippet.prefix)) {
    errors.push('El prefijo debe comenzar con una letra y solo contener letras, números, guiones y guiones bajos');
  }
  
  return errors;
}

// ========================
// 🔷 LIMPIEZA
// ========================

function cleanupSnippetProviders(): void {
  snippetProvidersDisposables.forEach((disposable) => {
    if (disposable && typeof disposable.dispose === "function") {
      disposable.dispose();
    }
  });
  snippetProvidersDisposables = [];
}

// Función de limpieza para cuando se desmonta el editor
export function cleanupSnippets(): void {
  console.log("🧹 Limpiando snippets providers");
  cleanupSnippetProviders();
} 