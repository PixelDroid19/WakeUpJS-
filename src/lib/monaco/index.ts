// Exportar todas las funciones principales del sistema Monaco
export {
  setupPackageCompletion,
  updatePackageCompletions,
  setupPackageUpdateListener,
  clearPackageCompletionCache
} from './modules/package-completion';

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
  refreshPackageCompletions,
  detectAndSetMonacoLanguage,
  autoUpdateLanguage,
  forceModelRevalidation,
  deepDiagnoseAndRepairTypeScriptModel,
  // Nuevas exportaciones para workers
  setupMonacoWorkers,
  validateWorkers,
  restartTypeScriptWorkers,
  setupWorkerRecovery,
} from './monacoSetup';

export {
  setupCustomHoverProviders,
  addCustomDefinition,
  clearHoverCache
} from './modules/hover-providers';

export {
  setupSnippets,
  refreshSnippets,
  insertSnippet,
  registerSnippetCommands,
  validateSnippet
} from './modules/snippets-setup';

// Exportar funciones de detección de lenguajes
export {
  detectLanguageFromContent,
  detectLanguageFromFilename,
  getMonacoLanguageId,
  generateAutoFilename,
  detectJSX,
  detectTypeScript,
  detectLanguageIntelligent,
  requiresTypeScriptMode,
  type LanguageDetection
} from '../code/detectors'; 