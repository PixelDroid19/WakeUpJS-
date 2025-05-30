import { Snippet } from "../../types/snippets";

// Importar módulos especializados
import { setupMonacoThemes } from "./modules/theme-setup";
import {
  setupTypeScriptConfiguration,
  configureTypeScriptWorker,
} from "./modules/typescript-setup";
import { setupCustomHoverProviders } from "./modules/hover-providers";
import {
  setupSnippets as setupSnippetsModule,
  refreshSnippets as refreshSnippetsModule,
  setupPackageCompletion,
  setupCustomValidation,
  refreshPackageCompletions as refreshPackageCompletionsModule,
  cleanupSnippets,
} from "./modules/snippets-setup";
import {
  setupPackageCompletion as setupPackageCompletionModule,
  updatePackageCompletions,
  setupPackageUpdateListener,
  clearPackageCompletionCache,
} from "./modules/package-completion";
import {
  setWorkspaceUpdateCallback,
  setWorkspaceUtils,
  detectAndSetMonacoLanguage,
  syncMonacoWithWorkspace,
  hasSignificantContentChange,
  autoUpdateLanguage,
  forceModelRevalidation,
} from "./modules/language-sync";

/**
 * ========================
 * 🚀 CONFIGURACIÓN PRINCIPAL DE MONACO EDITOR
 * ========================
 *
 * Este es el archivo principal que orquesta todos los módulos de Monaco.
 * Mantiene la misma API externa para compatibilidad.
 *
 * Módulos utilizados:
 * - theme-setup: Configuración de temas
 * - typescript-setup: Configuración de TypeScript/JavaScript
 * - hover-providers: Providers de hover personalizados
 * - snippets-setup: Configuración de snippets y completions
 * - package-completion: Autocompletado de paquetes e imports
 * - language-sync: Sincronización de lenguajes con workspace
 */

export function setupMonacoEditor(monaco: any): () => void {
  console.log("🚀 Iniciando configuración completa de Monaco Editor");

  // 1. Configurar TypeScript y JavaScript
  setupTypeScriptConfiguration(monaco);

  // 2. Configurar sistema de temas
  setupMonacoThemes(monaco);

  // 3. Configurar hover providers personalizados
  setupCustomHoverProviders(monaco);

  // 4. Configurar validadores personalizados
  setupCustomValidation(monaco);

  // 5. Configurar package completion avanzado
  setupPackageCompletionModule(monaco);

  // 6. Configurar listener de actualizaciones de paquetes
  setupPackageUpdateListener(monaco);

  // 7. Configurar worker de TypeScript
  configureTypeScriptWorker(monaco);

  console.log(
    "✅ Monaco Editor configurado completamente con todos los módulos"
  );

  // Función de limpieza
  return () => {
    console.log("🧹 Limpiando configuración de Monaco Editor");
    cleanupSnippets();
    clearPackageCompletionCache();
  };
}

export function setupSnippets(monaco: any, getSnippets: () => Snippet[]): void {
  setupSnippetsModule(monaco, getSnippets);
}

export function refreshSnippets(monaco: any): void {
  refreshSnippetsModule(monaco);
}

export function handleEditorWillMount(monaco: any): () => void {
  const cleanup = setupMonacoEditor(monaco);
  console.log("🚀 Monaco Editor configurado en willMount");
  return cleanup;
}

export function handleEditorDidMount(
  editor: any,
  monaco: any,
  fileId?: string,
  filename?: string
): void {
  console.log("🎯 Monaco Editor montado:", { fileId, filename });

  // Configurar el modelo inicial
  const model = editor.getModel();
  if (model && fileId) {
    // Sincronizar inmediatamente con el workspace
    setTimeout(() => {
      syncMonacoWithWorkspace(model, monaco);
    }, 100);
  }

  // Configurar clean up cuando el editor se desmonta
  editor._disposeOnUnmount = () => {
    // Clean up específico del editor
  };
}

export function refreshPackageCompletions(monaco: any): void {
  updatePackageCompletions(monaco);
}

export {
  setWorkspaceUpdateCallback,
  setWorkspaceUtils,
  detectAndSetMonacoLanguage,
  syncMonacoWithWorkspace,
  hasSignificantContentChange,
  autoUpdateLanguage,
  forceModelRevalidation,
};
