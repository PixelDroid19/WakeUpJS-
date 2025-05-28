import * as monaco from 'monaco-editor';
import { Snippet } from '../../types/snippets';

// Instancia para el listener de snippets
let snippetsDisposable: monaco.IDisposable | null = null;

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
function createSnippetSuggestion(snippet: Snippet): monaco.languages.CompletionItem {
  const processedBody = processSnippetVariables(snippet.body);
  
  return {
    label: {
      label: snippet.prefix,
      description: snippet.name,
      detail: snippet.description || '',
    },
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: processedBody,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: {
      value: `**${snippet.name}**\n\n${snippet.description || ''}\n\n\`\`\`${snippet.language}\n${processedBody}\n\`\`\``,
      isTrusted: true,
    },
    // Dar alta prioridad a los snippets en el autocompletado
    sortText: `a_snippet_${snippet.prefix}`, // El prefijo 'a_' hace que aparezcan primero
    filterText: snippet.prefix,
    detail: `${snippet.name} (snippet)${snippet.isBuiltIn ? ' • integrado' : ' • personalizado'}`,
    range: new monaco.Range(1, 1, 1, 1), // Se sobreescribirá automáticamente
    // Hacer que aparezcan en el autocompletado incluso con texto parcial
    command: {
      id: 'editor.action.triggerSuggest',
      title: 'Trigger Suggest'
    },
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

// Configurar provider de snippets para un lenguaje específico
export function setupSnippetProvider(
  monacoInstance: typeof monaco,
  language: string,
  getSnippets: () => Snippet[]
): monaco.IDisposable {
  return monacoInstance.languages.registerCompletionItemProvider(language, {
    triggerCharacters: [],
    
    provideCompletionItems: (model, position, context, token) => {
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
export function setupSnippetProviders(
  monacoInstance: typeof monaco,
  getSnippets: () => Snippet[]
): monaco.IDisposable[] {
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
    setupSnippetProvider(monacoInstance, language, getSnippets)
  );
  
  return disposables;
}

// Actualizar snippets en Monaco
export function updateSnippetProviders(
  monacoInstance: typeof monaco,
  getSnippets: () => Snippet[]
): void {
  // Limpiar provider anterior si existe
  if (snippetsDisposable) {
    snippetsDisposable.dispose();
  }
  
  // Crear nuevo provider compuesto
  const disposables = setupSnippetProviders(monacoInstance, getSnippets);
  
  // Crear un disposable compuesto
  snippetsDisposable = {
    dispose: () => {
      disposables.forEach(d => d.dispose());
    }
  };
}

// Limpiar providers
export function cleanupSnippetProviders(): void {
  if (snippetsDisposable) {
    snippetsDisposable.dispose();
    snippetsDisposable = null;
  }
}

// Registrar comando para insertar snippet por ID
export function registerSnippetCommands(
  monacoInstance: typeof monaco,
  editor: monaco.editor.IStandaloneCodeEditor,
  getSnippets: () => Snippet[]
): monaco.IDisposable[] {
  const disposables: monaco.IDisposable[] = [];
  
  // Comando para abrir paleta de snippets
  try {
    const paletteCommand = editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.KeyP,
      () => {
        // Trigger de la paleta de snippets
        const snippets = getSnippets();
        const currentLanguage = editor.getModel()?.getLanguageId() || 'javascript';
        const languageSnippets = getSnippetsForLanguage(snippets, currentLanguage);
        
        // Mostrar quick pick (esto se puede integrar con un modal personalizado)
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

// Insertar snippet manualmente en el editor
export function insertSnippet(
  editor: monaco.editor.IStandaloneCodeEditor,
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
    // Fallback: simplemente insertar el texto
    console.log('📦 Snippet insertado como texto plano');
  }
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