// Exportar todas las funciones principales del sistema Monaco
export {
  setupPackageCompletion,
  updatePackageCompletions,
  setupPackageUpdateListener,
  clearPackageCompletionCache
} from './packageCompletion';

export {
  getPackageDefinition,
  getPackageExports,
  generateTypeDeclaration,
  PACKAGE_DEFINITIONS
} from './packageDefinitions';

export {
  setupMonacoEditor,
  handleEditorWillMount,
  handleEditorDidMount,
  refreshPackageCompletions
} from './monacoSetup';

export {
  setupContextualHelp,
  createHoverProvider,
  createDefinitionProvider,
  createSignatureHelpProvider,
  addCustomDefinition,
  clearHoverCache
} from './contextualHelp'; 