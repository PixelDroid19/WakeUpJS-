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
  deepDiagnoseAndRepairTypeScriptModel,
} from "./modules/language-sync";
import {
  setupMonacoWorkers,
  validateWorkers,
  restartTypeScriptWorkers,
  setupWorkerRecovery,
} from "./modules/worker-setup";

/**
 * ========================
 * 🚀 CONFIGURACIÓN PRINCIPAL DE MONACO EDITOR
 * ========================
 *
 * Este es el archivo principal que orquesta todos los módulos de Monaco.
 * Mantiene la misma API externa para compatibilidad.
 *
 * Módulos utilizados:
 * - worker-setup: Configuración de workers y MonacoEnvironment
 * - theme-setup: Configuración de temas
 * - typescript-setup: Configuración de TypeScript/JavaScript
 * - hover-providers: Providers de hover personalizados
 * - snippets-setup: Configuración de snippets y completions
 * - package-completion: Autocompletado de paquetes e imports
 * - language-sync: Sincronización de lenguajes con workspace
 */

export function setupMonacoEditor(monaco: any): () => void {
  console.log("🚀 Iniciando configuración completa de Monaco Editor");

  try {
    // Verificar que Monaco esté disponible
    if (!monaco || !monaco.languages || !monaco.editor) {
      throw new Error("Monaco Editor no está disponible o no está completamente cargado");
    }

    console.log("📋 Monaco Editor detectado:", {
      version: monaco.version || 'unknown',
      hasTypeScript: !!monaco.languages.typescript,
      hasLanguages: !!monaco.languages,
      hasEditor: !!monaco.editor
    });

    // 0. Configurar workers PRIMERO (crítico para evitar errores de registro)
    console.log("🔧 Paso 0: Configurando workers de Monaco...");
    setupMonacoWorkers();

    // 1. Configurar TypeScript y JavaScript DESPUÉS de los workers
    console.log("🔧 Paso 1: Configurando TypeScript y JavaScript...");
    setupTypeScriptConfiguration(monaco);
    
    // 2. Configurar worker de TypeScript con validación robusta
    console.log("🔧 Paso 2: Configurando worker de TypeScript...");
    configureTypeScriptWorker(monaco).then((workerReady) => {
      if (workerReady) {
        console.log("✅ Worker de TypeScript configurado exitosamente");
        
        // Validar workers después de la configuración
        validateWorkers(monaco).then((valid) => {
          if (valid) {
            console.log("✅ Validación de workers completada");
          } else {
            console.warn("⚠️ Validación de workers falló, configurando recuperación...");
            setupWorkerRecovery(monaco);
          }
        });
      } else {
        console.warn("⚠️ Worker de TypeScript no se configuró correctamente, configurando recuperación...");
        setupWorkerRecovery(monaco);
      }
    }).catch((error) => {
      console.error("❌ Error configurando worker de TypeScript:", error);
      setupWorkerRecovery(monaco);
    });

    // 3. Configurar sistema de temas
    console.log("🔧 Paso 3: Configurando temas...");
    setupMonacoThemes(monaco);

    // 4. Configurar hover providers personalizados
    console.log("🔧 Paso 4: Configurando hover providers...");
    setupCustomHoverProviders(monaco);

    // 5. Configurar validadores personalizados
    console.log("🔧 Paso 5: Configurando validadores personalizados...");
    setupCustomValidation(monaco);

    // 6. Configurar package completion avanzado
    console.log("🔧 Paso 6: Configurando autocompletado de paquetes...");
    setupPackageCompletionModule(monaco);

    // 7. Configurar listener de actualizaciones de paquetes
    console.log("🔧 Paso 7: Configurando listener de actualizaciones...");
    setupPackageUpdateListener(monaco);

    // 8. Configuración post-inicialización para asegurar que todo funcione
    setTimeout(() => {
      console.log("🔧 Paso 8: Validación post-inicialización...");
      validateMonacoSetup(monaco);
    }, 250);

    console.log("✅ Monaco Editor configurado completamente con todos los módulos");

    // Función de limpieza
    return () => {
      console.log("🧹 Limpiando configuración de Monaco Editor");
      try {
        cleanupSnippets();
        clearPackageCompletionCache();
      } catch (error) {
        console.error("❌ Error durante la limpieza:", error);
      }
    };
    
  } catch (error) {
    console.error("❌ Error crítico configurando Monaco Editor:", error);
    
    // Retornar función de limpieza vacía en caso de error
    return () => {
      console.log("🧹 Limpieza tras error de configuración");
    };
  }
}

// Nueva función para validar la configuración de Monaco
function validateMonacoSetup(monaco: any): void {
  try {
    console.log("🔍 Validando configuración completa de Monaco...");
    
    const issues = [];
    
    // Verificar TypeScript
    const tsService = monaco.languages.typescript;
    if (!tsService) {
      issues.push("Servicio de TypeScript no disponible");
    } else {
      const tsDefaults = tsService.typescriptDefaults;
      const jsDefaults = tsService.javascriptDefaults;
      
      if (!tsDefaults || !jsDefaults) {
        issues.push("Defaults de TypeScript/JavaScript no disponibles");
      } else {
        const tsOptions = tsDefaults.getCompilerOptions();
        const tsDiagnostics = tsDefaults.getDiagnosticsOptions();
        
        if (!tsOptions.allowNonTsExtensions) {
          issues.push("allowNonTsExtensions no habilitado en TypeScript");
        }
        
        if (tsDiagnostics.noSemanticValidation) {
          issues.push("Validación semántica deshabilitada en TypeScript");
        }
        
        console.log("📋 Estado TypeScript:", {
          allowNonTsExtensions: tsOptions.allowNonTsExtensions,
          allowJs: tsOptions.allowJs,
          jsx: tsOptions.jsx,
          noSemanticValidation: tsDiagnostics.noSemanticValidation,
          noSyntaxValidation: tsDiagnostics.noSyntaxValidation
        });
      }
    }
    
    // Verificar lenguajes disponibles
    const availableLanguages = monaco.languages.getLanguages();
    const requiredLanguages = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'];
    const missingLanguages = requiredLanguages.filter(lang => 
      !availableLanguages.find((available: any) => available.id === lang)
    );
    
    if (missingLanguages.length > 0) {
      issues.push(`Lenguajes faltantes: ${missingLanguages.join(', ')}`);
    }
    
    // Verificar proveedores de completion
    const hasCompletionProvider = monaco.languages.getLanguages().some((lang: any) => {
      try {
        const providers = monaco.languages.getCompletionProviders && 
                         monaco.languages.getCompletionProviders(lang.id);
        return providers && providers.length > 0;
      } catch {
        return false;
      }
    });
    
    if (!hasCompletionProvider) {
      console.warn("⚠️ No se detectaron proveedores de completion");
    }
    
    // Reportar resultados
    if (issues.length === 0) {
      console.log("✅ Validación de Monaco completada - Todo correcto");
    } else {
      console.warn("⚠️ Problemas encontrados en la validación:", issues);
      
      // Intentar auto-reparación para problemas críticos
      if (issues.some(issue => issue.includes("allowNonTsExtensions"))) {
        console.log("🔧 Intentando auto-reparación de allowNonTsExtensions...");
        try {
          const tsDefaults = monaco.languages.typescript.typescriptDefaults;
          const currentOptions = tsDefaults.getCompilerOptions();
          tsDefaults.setCompilerOptions({
            ...currentOptions,
            allowNonTsExtensions: true
          });
          console.log("✅ Auto-reparación completada");
        } catch (repairError) {
          console.error("❌ Error en auto-reparación:", repairError);
        }
      }
    }
    
  } catch (error) {
    console.error("❌ Error validando configuración de Monaco:", error);
  }
}

export function setupSnippets(monaco: any, getSnippets: () => Snippet[]): void {
  setupSnippetsModule(monaco, getSnippets);
}

export function refreshSnippets(monaco: any): void {
  refreshSnippetsModule(monaco);
}

export function handleEditorWillMount(monaco: any): () => void {
  console.log("🎯 Preparando Monaco Editor antes del montaje");

  try {
    // Configurar workers ANTES de que Monaco se monte completamente
    console.log("🛠️ Configurando workers pre-montaje...");
    setupMonacoWorkers();

    // Verificar que Monaco esté en buen estado
    if (!monaco?.languages?.typescript) {
      console.warn("⚠️ Servicio TypeScript no disponible durante pre-montaje");
    } else {
      console.log("✅ Servicio TypeScript disponible durante pre-montaje");
    }

    // Configurar recuperación de errores desde el inicio
    setupWorkerRecovery(monaco);

    // Configurar el sistema completo
    return setupMonacoEditor(monaco);
    
  } catch (error) {
    console.error("❌ Error durante pre-montaje de Monaco:", error);
    
    // Función de limpieza de emergencia
    return () => {
      console.log("🧹 Limpieza de emergencia tras error de pre-montaje");
    };
  }
}

export function handleEditorDidMount(
  editor: any,
  monaco: any,
  fileId?: string,
  filename?: string
): void {
  console.log("🎯 Monaco Editor montado:", { fileId, filename });

  try {
    // Configurar el modelo inicial
    const model = editor.getModel();
    if (model && fileId) {
      console.log("🔄 Configurando modelo inicial para archivo:", fileId);
      
      // Detectar y aplicar lenguaje inmediatamente
      const detection = detectAndSetMonacoLanguage(model, monaco, filename, fileId);
      console.log("🔍 Detección inicial de lenguaje:", detection);
      
      // Sincronizar con el workspace después de un breve delay para asegurar estabilidad
      setTimeout(() => {
        try {
          const syncResult = syncMonacoWithWorkspace(model, monaco);
          console.log("🔄 Sincronización con workspace:", syncResult ? "exitosa" : "falló");
          
          // Forzar revalidación si el modelo es TypeScript
          const currentLanguage = model.getLanguageId();
          if (currentLanguage === 'typescript' || currentLanguage === 'typescriptreact') {
            console.log("🔧 Forzando revalidación para TypeScript...");
            forceModelRevalidation(model, monaco);
          }
        } catch (syncError) {
          console.error("❌ Error en sincronización con workspace:", syncError);
        }
      }, 150);
    }

    // Configurar eventos del modelo para detectar cambios de contenido
    if (model) {
      const disposable = model.onDidChangeContent(() => {
        const content = model.getValue();
        const currentLanguage = model.getLanguageId();
        
        // Verificar si necesitamos cambiar el lenguaje basado en el contenido
        if (hasSignificantContentChange(content, '')) {
          console.log("📝 Cambio significativo detectado, verificando lenguaje...");
          autoUpdateLanguage(model, monaco, filename, fileId);
        }
      });
      
      // Limpiar listener cuando se desmonte
      if (!editor._disposeOnUnmount) {
        editor._disposeOnUnmount = [];
      }
      editor._disposeOnUnmount.push(disposable);
    }

    // Configurar clean up cuando el editor se desmonta
    if (!editor._disposeOnUnmount) {
      editor._disposeOnUnmount = [];
    }

    editor._disposeOnUnmount.push(() => {
      console.log("🧹 Limpiando recursos del editor montado");
    });
    
  } catch (error) {
    console.error("❌ Error configurando editor montado:", error);
  }
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
  deepDiagnoseAndRepairTypeScriptModel,
  // Nuevas exportaciones para workers
  setupMonacoWorkers,
  validateWorkers,
  restartTypeScriptWorkers,
  setupWorkerRecovery,
};
