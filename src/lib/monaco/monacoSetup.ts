import { setupPackageCompletion, setupPackageUpdateListener, updatePackageCompletions } from './packageCompletion';
import { setupContextualHelp } from './contextualHelp';
import { setupSnippetProviders, cleanupSnippetProviders, updateSnippetProviders, registerSnippetCommands } from './snippetProvider';
import { EDITOR_THEMES } from '../../constants/config';
import { Snippet } from '../../types/snippets';

// Referencias globales para el sistema de snippets
let snippetProvidersDisposables: any[] = [];
let getSnippetsCallback: (() => Snippet[]) | null = null;

// Función principal para configurar Monaco Editor
export function setupMonacoEditor(monaco: any): () => void {
  // Configurar el tema personalizado
  import("../../components/onedark.json")
    .then((data) => {
      monaco.editor.defineTheme(EDITOR_THEMES.DARK, data);
    })
    .catch((e) => console.log('Error cargando tema:', e));

  // Configurar TypeScript/JavaScript
  monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);

  // Configurar diagnósticos
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false
  });

  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false
  });

  // Configurar opciones del compilador
  const compilerOptions = {
    target: monaco.languages.typescript.ScriptTarget.Latest,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.CommonJS,
    noEmit: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    allowJs: true,
    checkJs: false,
    allowUmdGlobalAccess: true,
    typeRoots: ["node_modules/@types"],
    lib: ["es2020", "dom", "dom.iterable"]
  };

  monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);
  
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    ...compilerOptions,
    jsx: monaco.languages.typescript.JsxEmit.React,
    reactNamespace: "React",
    checkJs: true
  });

  // Configurar el sistema de autocompletado de paquetes
  const packageCompletionCleanup = setupPackageCompletion(monaco);
  
  // Configurar sistema de ayuda contextual
  const contextualHelpCleanup = setupContextualHelp(monaco);
  
  // Configurar listener para actualizaciones automáticas
  const updateListenerCleanup = setupPackageUpdateListener(monaco);

  // Función de limpieza combinada
  return () => {
    packageCompletionCleanup();
    contextualHelpCleanup();
    updateListenerCleanup();
    cleanupSnippetProviders();
    
    // Limpiar disposables de snippets
    snippetProvidersDisposables.forEach(d => {
      if (d && typeof d.dispose === 'function') {
        d.dispose();
      }
    });
    snippetProvidersDisposables = [];
  };
}

// Configurar snippets
export function setupSnippets(monaco: any, getSnippets: () => Snippet[]): void {
  getSnippetsCallback = getSnippets;
  
  // Limpiar providers anteriores
  cleanupSnippetProviders();
  snippetProvidersDisposables.forEach(d => {
    if (d && typeof d.dispose === 'function') {
      d.dispose();
    }
  });
  snippetProvidersDisposables = [];
  
  // Configurar nuevos providers
  const newDisposables = setupSnippetProviders(monaco, getSnippets);
  snippetProvidersDisposables.push(...newDisposables);
  
  // Log para verificar que se configuraron correctamente
  const allSnippets = getSnippets();
  console.log(`📦 Configurados ${allSnippets.length} snippets en Monaco Editor:`, 
    allSnippets.map(s => `${s.prefix} (${s.language})`).join(', '));
}

// Actualizar snippets
export function refreshSnippets(monaco: any): void {
  if (getSnippetsCallback) {
    updateSnippetProviders(monaco, getSnippetsCallback);
  }
}

// Función para manejar la configuración cuando Monaco está listo
export function handleEditorWillMount(monaco: any): () => void {
  return setupMonacoEditor(monaco);
}

// Función para manejar cuando el editor se monta
export function handleEditorDidMount(editor: any, monaco: any): void {
  // Configuraciones adicionales del editor una vez montado
  if (editor) {
    // Configurar acciones personalizadas del editor si es necesario
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Comando para guardar - esto se puede integrar con el workspace
      console.log('💾 Comando de guardar ejecutado');
    });

    // Registrar listeners para actualizaciones de paquetes
    const updatePackagesOnChange = () => {
      updatePackageCompletions(monaco);
    };

    // Escuchar cambios en el contenido para detectar nuevos imports
    editor.onDidChangeModelContent(updatePackagesOnChange);

    // Configurar comandos de snippets si hay callback disponible
    if (getSnippetsCallback) {
      const snippetCommands = registerSnippetCommands(monaco, editor, getSnippetsCallback);
      snippetProvidersDisposables.push(...snippetCommands);
    }

    // Habilitar hover automático
    editor.updateOptions({
      hover: {
        enabled: true,
        delay: 300,
        sticky: true
      },
      // Mejorar la experiencia de autocompletado
      quickSuggestions: {
        other: true,
        comments: true,
        strings: true
      },
      quickSuggestionsDelay: 10,
      suggestSelection: "first",
      tabCompletion: "on",
      wordBasedSuggestions: true,
      // Habilitar ayuda de parámetros
      parameterHints: {
        enabled: true,
        cycle: true
      },
      // Configuración específica para snippets
      suggest: {
        showSnippets: true,
        snippetsPreventQuickSuggestions: false,
        insertMode: 'insert',
        filterGraceful: true,
        localityBonus: true,
        shareSuggestSelections: false,
        showStatusBar: true,
        preview: true,
        previewMode: 'subwordSmart',
      },
      // Mejorar navegación por sugerencias
      acceptSuggestionOnCommitCharacter: true,
      acceptSuggestionOnEnter: "on",
    });
  }
}

// Función para actualizar el autocompletado manualmente
export function refreshPackageCompletions(monaco: any): void {
  updatePackageCompletions(monaco);
} 