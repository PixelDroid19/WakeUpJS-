import {
  detectLanguageFromContent,
  type LanguageDetection,
  detectLanguageIntelligent,
  detectTypeScript,
} from "../../code/detectors";
import { LANGUAGE_DETECTION_CONFIG } from "../../../constants/config";

/**
 * ========================
 * 🔄 MÓDULO DE SINCRONIZACIÓN DE LENGUAJES
 * ========================
 * 
 * Este módulo maneja la sincronización de lenguajes entre Monaco y el workspace.
 * 
 * Responsabilidades:
 * - Detectar lenguajes basado en contenido
 * - Sincronizar Monaco con el workspace
 * - Aplicar cambios de lenguaje
 * - Manejar callbacks de actualización
 */

// Variables para el callback del workspace
let workspaceUpdateCallback:
  | ((fileId: string, language: string) => void)
  | null = null;
let currentWorkspaceUtils: any = null;

function mapMonacoLanguageToWorkspace(
  languageId: string
): "javascript" | "typescript" | "html" | "css" {
  const mapping = LANGUAGE_DETECTION_CONFIG.LANGUAGE_MAPPING;
  return mapping[languageId as keyof typeof mapping] || "javascript";
}

export function setWorkspaceUpdateCallback(
  callback: (fileId: string, language: string) => void
): void {
  workspaceUpdateCallback = callback;
}

export function setWorkspaceUtils(utils: any): void {
  currentWorkspaceUtils = utils;
}

export function detectAndSetMonacoLanguage(
  model: any,
  monaco: any,
  filename?: string,
  fileId?: string
): LanguageDetection {
  console.log("🔍 Iniciando detección de lenguaje para Monaco", { filename, fileId });

  try {
    // Verificar si el modelo está dispuesto
    if (isModelDisposed(model)) {
      console.warn("⚠️ El modelo está dispuesto, no se puede detectar lenguaje");
      return {
        extension: '.js',
        languageId: 'javascript',
        hasJSX: false,
        hasTypeScript: false,
        confidence: 1.0
      };
    }
    
    const content = model.getValue();
    
    // Usar la nueva detección inteligente
    const detection = detectLanguageIntelligent(content, filename);
    
    console.log("🎯 Resultado de detección inteligente:", detection);

    // Verificar si necesitamos cambiar el lenguaje en Monaco
    const currentLanguage = model.getLanguageId();
    const targetLanguage = detection.languageId;

    if (currentLanguage !== targetLanguage) {
      console.log(`🔄 Cambiando lenguaje en Monaco: ${currentLanguage} → ${targetLanguage}`);
      
      // Aplicar el nuevo lenguaje usando la API directa de Monaco
      // en lugar de depender de applyLanguageToMonaco
      try {
        monaco.editor.setModelLanguage(model, targetLanguage);
        
        // Verificar inmediatamente si se aplicó el cambio
        const updatedLanguage = model.getLanguageId();
        if (updatedLanguage === targetLanguage) {
          console.log(`✅ Lenguaje aplicado exitosamente: ${targetLanguage}`);
          
          // Si es TypeScript, asegurarse de que el modelo se configure correctamente
          if (targetLanguage === 'typescript' || targetLanguage === 'typescriptreact') {
            if (monaco.languages?.typescript) {
              // Asegurarse de que el modelo está registrado en el servicio de TS
              const tsDefaults = monaco.languages.typescript.typescriptDefaults;
              const currentModels = tsDefaults.getExtraLibs() || {};
              
              // Forzar el reconocimiento del modelo como TypeScript
              if (!currentModels[model.uri.toString()]) {
                deepDiagnoseAndRepairTypeScriptModel(model, monaco, fileId);
              }
            }
          }
        } else {
          console.error(`✔ Error: Lenguaje no se aplicó correctamente. Esperado: ${targetLanguage}, Actual: ${updatedLanguage}`);
          
          // Intento de recuperación: recrear el modelo
          setTimeout(() => {
            try {
              // Intentar una vez más con la API directa
              monaco.editor.setModelLanguage(model, targetLanguage);
              console.log(`🔧 Segundo intento de aplicar lenguaje ${targetLanguage}`);
            } catch (err) {
              console.error('✔ Error en segundo intento:', err);
            }
          }, 200);
        }
      } catch (err) {
        console.error(`✔ Error aplicando lenguaje ${targetLanguage}:`, err);
        
        // Fallback: usar el método original
        applyLanguageToMonaco(model, monaco, targetLanguage, fileId);
      }
    } else {
      console.log(`ℹ️ El lenguaje ya es correcto: ${currentLanguage}`);
    }

    return detection;
    
  } catch (error) {
    console.error("✔ Error en detección de lenguaje:", error);
    
    // Fallback en caso de error
    return {
      extension: '.js',
      languageId: 'javascript',
      hasJSX: false,
      hasTypeScript: false,
      confidence: 1.0
    };
  }
}

export function syncMonacoWithWorkspace(model: any, monaco: any): boolean {
  if (!model || !monaco || !currentWorkspaceUtils) {
    console.warn("⚠️ No se puede sincronizar: faltan dependencias");
    return false;
  }

  const activeFile = currentWorkspaceUtils.getActiveFile();
  if (!activeFile) {
    console.warn("⚠️ No hay archivo activo para sincronizar");
    return false;
  }

  console.log("🔄 Sincronizando Monaco con workspace actual:", {
    activeFileId: activeFile.id,
    activeFileName: activeFile.name,
    workspaceLanguage: activeFile.language,
    currentContent: activeFile.content?.substring(0, 100),
  });

  // Detectar lenguaje basado en el contenido actual del workspace
  const detection = detectLanguageFromContent(activeFile.content || "");

  // Verificar si Monaco necesita actualización
  const currentMonacoLanguage = monaco.editor
    .getModel(model.uri)
    ?.getLanguageId();
  const needsUpdate = currentMonacoLanguage !== detection.languageId;

  console.log("🔍 Verificación de sincronización:", {
    currentMonacoLanguage,
    detectedLanguage: detection.languageId,
    needsUpdate,
    workspaceLanguage: activeFile.language,
  });

  if (needsUpdate) {
    const success = applyLanguageToMonaco(
      model,
      monaco,
      detection.languageId,
      activeFile.id
    );

    if (success && workspaceUpdateCallback) {
      const workspaceLanguage = mapMonacoLanguageToWorkspace(
        detection.languageId
      );
      workspaceUpdateCallback(activeFile.id, workspaceLanguage);
      console.log("✅ Sincronización completada:", {
        fileId: activeFile.id,
        monacoLanguage: detection.languageId,
        workspaceLanguage,
      });
    }

    return success;
  }

  console.log("ℹ️ Monaco ya está sincronizado con el workspace");
  return true;
}

function applyLanguageToMonaco(
  model: any,
  monaco: any,
  languageId: string,
  fileId?: string
): boolean {
  try {
    console.log(`🔄 Aplicando lenguaje ${languageId} al modelo Monaco`, { fileId });
    
    // Obtener el URI actual del modelo
    const currentUri = model.uri;
    const currentPath = currentUri?.path || '';
    
    // Determinar la extensión correcta basada en el lenguaje
    let targetExtension = '';
    switch (languageId) {
      case 'typescript':
        targetExtension = '.ts';
        break;
      case 'javascript':
        targetExtension = '.js';
        break;
      case 'typescriptreact':
        targetExtension = '.tsx';
        break;
      case 'javascriptreact':
        targetExtension = '.jsx';
        break;
      case 'html':
        targetExtension = '.html';
        break;
      case 'css':
        targetExtension = '.css';
        break;
      default:
        targetExtension = '.js';
    }
    
    // Verificar si necesitamos actualizar el URI
    const needsUriUpdate = !currentPath.endsWith(targetExtension);
    
    if (needsUriUpdate) {
      console.log(`📝 Actualizando URI del modelo: ${currentPath} -> extensión ${targetExtension}`);
      
      // Crear nuevo URI con la extensión correcta
      const basePath = currentPath.replace(/\.[^.]*$/, '') || `/file-${fileId || Date.now()}`;
      const newPath = basePath + targetExtension;
      const newUri = monaco.Uri.parse(`file://${newPath}`);
      
      try {
        // Intentar actualizar el URI del modelo
        // Nota: Monaco puede no permitir cambiar el URI directamente
        // En ese caso, necesitaremos recrear el modelo
        if (model._setUri && typeof model._setUri === 'function') {
          model._setUri(newUri);
          console.log(`✅ URI del modelo actualizado a: ${newPath}`);
        } else {
          console.log(`⚠️ No se puede cambiar URI directamente, aplicando solo lenguaje`);
        }
      } catch (uriError) {
        console.warn(`⚠️ Error actualizando URI del modelo:`, uriError);
        // Continuar con el cambio de lenguaje aunque falle el URI
      }
    }
    
    // Aplicar el lenguaje al modelo
    const previousLanguage = model.getLanguageId();
    
    if (previousLanguage !== languageId) {
      console.log(`🔧 Cambiando lenguaje: ${previousLanguage} -> ${languageId}`);
    monaco.editor.setModelLanguage(model, languageId);

      // Verificar que el cambio se aplicó correctamente
      const newLanguage = model.getLanguageId();
      if (newLanguage !== languageId) {
        console.error(`❌ Error: Lenguaje no se aplicó correctamente. Esperado: ${languageId}, Actual: ${newLanguage}`);
        return false;
      }
      
      console.log(`✅ Lenguaje aplicado correctamente: ${newLanguage}`);
      
      // Configuraciones específicas post-cambio de lenguaje
      if (languageId === 'typescript' || languageId === 'typescriptreact') {
        console.log(`🔧 Aplicando configuración específica de TypeScript`);
        
        // NUEVO: Aplicar diagnóstico profundo INMEDIATAMENTE para TypeScript
        console.log(`🚨 Aplicando diagnóstico inmediato para TypeScript...`);
        setTimeout(() => {
          deepDiagnoseAndRepairTypeScriptModel(model, monaco, fileId);
        }, 10); // Muy poco delay para ejecutar inmediatamente
        
        // Forzar reconfiguración de servicios de TypeScript
    setTimeout(() => {
          try {
            const tsWorker = monaco.languages.typescript;
            if (tsWorker && tsWorker.getTypeScriptWorker) {
              tsWorker.getTypeScriptWorker().then((worker: any) => {
                if (worker && worker.updateExtraLibs) {
                  console.log(`🔄 Actualizando bibliotecas TypeScript para el modelo`);
                  // Forzar actualización de las bibliotecas
                  worker.updateExtraLibs();
                }
              }).catch((error: any) => {
                console.warn(`⚠️ Error actualizando worker de TypeScript:`, error);
              });
            }
            
            // Forzar revalidación del modelo
      forceModelRevalidation(model, monaco);
          } catch (error) {
            console.warn(`⚠️ Error en configuración post-TypeScript:`, error);
          }
    }, 100);

      } else if (languageId === 'javascript' || languageId === 'javascriptreact') {
        console.log(`🔧 Aplicando configuración específica de JavaScript`);
        
        setTimeout(() => {
          try {
            const jsWorker = monaco.languages.typescript;
            if (jsWorker && jsWorker.getJavaScriptWorker) {
              jsWorker.getJavaScriptWorker().then((worker: any) => {
                if (worker) {
                  console.log(`🔄 Actualizando worker de JavaScript para el modelo`);
                }
              }).catch((error: any) => {
                console.warn(`⚠️ Error actualizando worker de JavaScript:`, error);
              });
            }
            
            // Forzar revalidación del modelo
            forceModelRevalidation(model, monaco);
          } catch (error) {
            console.warn(`⚠️ Error en configuración post-JavaScript:`, error);
          }
        }, 100);
      }
      
      // Sincronizar con workspace si hay callback disponible
      if (workspaceUpdateCallback && fileId) {
        const workspaceLanguage = mapMonacoLanguageToWorkspace(languageId);
        console.log(`📤 Sincronizando con workspace: ${workspaceLanguage}`);
        
        try {
          workspaceUpdateCallback(fileId, workspaceLanguage);
        } catch (error) {
          console.warn(`⚠️ Error sincronizando con workspace:`, error);
        }
      }
      
      // Validar que la configuración se aplicó correctamente
      setTimeout(() => {
        validateLanguageConfiguration(model, monaco, languageId);
      }, 200);
      
      return true;
    } else {
      console.log(`ℹ️ El lenguaje ya es ${languageId}, no se requiere cambio`);
    return true;
    }
    
  } catch (error) {
    console.error(`❌ Error aplicando lenguaje ${languageId}:`, error);
    return false;
  }
}

// Nueva función para validar que la configuración de lenguaje se aplicó correctamente
function validateLanguageConfiguration(model: any, monaco: any, expectedLanguage: string): void {
  try {
    const actualLanguage = model.getLanguageId();
    console.log(`🔍 Validando configuración de lenguaje: esperado=${expectedLanguage}, actual=${actualLanguage}`);
    
    if (actualLanguage !== expectedLanguage) {
      console.error(`❌ Error de validación: lenguaje no coincide`);
      return;
    }
    
    // Validaciones específicas para TypeScript
    if (expectedLanguage === 'typescript' || expectedLanguage === 'typescriptreact') {
      const tsWorker = monaco.languages.typescript;
      
      if (!tsWorker || !tsWorker.typescriptDefaults) {
        console.error(`❌ Servicios de TypeScript no disponibles`);
        return;
      }
      
      // Verificar configuración del compilador
      const compilerOptions = tsWorker.typescriptDefaults.getCompilerOptions();
      console.log(`🔍 Opciones del compilador TypeScript:`, {
        allowNonTsExtensions: compilerOptions.allowNonTsExtensions,
        allowJs: compilerOptions.allowJs,
        jsx: compilerOptions.jsx,
        target: compilerOptions.target
      });
      
      // Verificar que las interfaces estén permitidas
      const diagnosticsOptions = tsWorker.typescriptDefaults.getDiagnosticsOptions();
      console.log(`🔍 Opciones de diagnóstico TypeScript:`, {
        noSemanticValidation: diagnosticsOptions.noSemanticValidation,
        noSyntaxValidation: diagnosticsOptions.noSyntaxValidation,
        noSuggestionDiagnostics: diagnosticsOptions.noSuggestionDiagnostics
      });
      
      // NUEVO: Verificar si hay errores de interface y aplicar diagnóstico profundo
      setTimeout(() => {
        const currentMarkers = monaco.editor.getModelMarkers({ resource: model.uri });
        const hasInterfaceError = currentMarkers.some((marker: any) => 
          marker.message && marker.message.includes("can only be used in TypeScript files")
        );
        
        if (hasInterfaceError) {
          console.warn(`⚠️ Error de interface detectado - aplicando diagnóstico profundo...`);
          deepDiagnoseAndRepairTypeScriptModel(model, monaco);
        }
      }, 300);
    }
    
    console.log(`✅ Configuración de lenguaje validada correctamente`);
    
  } catch (error) {
    console.error(`❌ Error validando configuración de lenguaje:`, error);
  }
}

export function hasSignificantContentChange(
  newCode: string,
  oldCode: string
): boolean {
  const lengthDiff = Math.abs(newCode.length - oldCode.length);

  if (lengthDiff >= LANGUAGE_DETECTION_CONFIG.SIGNIFICANT_CHANGE_THRESHOLD) {
    return true;
  }

  // Verificar patrones significativos
  for (const pattern of LANGUAGE_DETECTION_CONFIG.SIGNIFICANT_PATTERNS) {
    const hadPattern = pattern.test(oldCode);
    const hasPattern = pattern.test(newCode);

    if (hadPattern !== hasPattern) {
      console.log("🔍 Cambio significativo detectado:", pattern.source);
      return true;
    }
  }

  return false;
}

export function autoUpdateLanguage(
  model: any,
  monaco: any,
  filename?: string,
  fileId?: string,
  setIsDetectingLanguage?: (isDetecting: boolean) => void
): void {
  if (!model || !monaco) {
    console.warn("⚠️ AutoUpdate: Monaco model o instance no disponible");
    return;
  }

  // Primero intentar sincronizar con el workspace actual
  const workspaceSynced = syncMonacoWithWorkspace(model, monaco);

  if (!workspaceSynced) {
    console.log(
      "⚠️ Sincronización con workspace falló, usando detección de contenido"
    );

    if (setIsDetectingLanguage) {
      setIsDetectingLanguage(true);
    }

    // Fallback: detectar basado en contenido actual
    setTimeout(() => {
      try {
        detectAndSetMonacoLanguage(model, monaco, filename, fileId);
      } finally {
        if (setIsDetectingLanguage) {
          setIsDetectingLanguage(false);
        }
      }
    }, 100);
  } else {
    console.log("✅ Sincronización con workspace exitosa");
  }
}

export function forceModelRevalidation(model: any, monaco: any): void {
  // Validaciones críticas antes de proceder
  if (!model || !monaco) {
    console.warn('⚠️ Modelo o Monaco no disponibles para revalidación');
    return;
  }

  // CRÍTICO: Verificar que el modelo no esté dispuesto
  if (isModelDisposed(model)) {
    console.warn('⚠️ No se puede revalidar: modelo ya dispuesto');
    return;
  }

  try {
    console.log(`🔄 Iniciando revalidación forzada del modelo...`);
    
    const currentLanguage = model.getLanguageId();
    const modelUri = model.uri;
    
    console.log(`📋 Estado del modelo:`, {
      language: currentLanguage,
      uri: modelUri?.toString(),
      isDisposed: isModelDisposed(model)
    });

    // Verificar nuevamente antes de acceder al contenido
    if (isModelDisposed(model)) {
      console.warn('⚠️ Modelo se dispuso durante la verificación inicial');
      return;
    }

    // Método 1: Forzar revalidación semántica para TypeScript
    if ((currentLanguage === 'typescript' || currentLanguage === 'typescriptreact') && 
        monaco.languages.typescript) {
      
      setTimeout(() => {
        try {
          // Verificar que el modelo siga disponible
          if (isModelDisposed(model)) {
            console.warn('⚠️ Modelo dispuesto durante revalidación TypeScript');
            return;
          }

          const tsDefaults = monaco.languages.typescript.typescriptDefaults;
          if (tsDefaults) {
            // Forzar revalidación
            tsDefaults.setEagerModelSync(false);
            setTimeout(() => {
              if (!isModelDisposed(model)) {
                tsDefaults.setEagerModelSync(true);
                console.log(`✅ Revalidación TypeScript completada`);
              }
            }, 50);
          }
        } catch (error) {
          console.warn(`⚠️ Error en revalidación de TypeScript:`, error);
        }
      }, 50);
    }

    // Método 1.5: Forzar revalidación para JavaScript
    if ((currentLanguage === 'javascript' || currentLanguage === 'javascriptreact') && 
        monaco.languages.typescript) {
      
      setTimeout(() => {
        try {
          // Verificar que el modelo siga disponible
          if (isModelDisposed(model)) {
            console.warn('⚠️ Modelo dispuesto durante revalidación JavaScript');
            return;
          }

          const jsDefaults = monaco.languages.typescript.javascriptDefaults;
          if (jsDefaults) {
            jsDefaults.setEagerModelSync(false);
            setTimeout(() => {
              if (!isModelDisposed(model)) {
                jsDefaults.setEagerModelSync(true);
                console.log(`✅ Revalidación JavaScript completada`);
              }
            }, 50);
          }
        } catch (error) {
          console.warn(`⚠️ Error en revalidación de JavaScript:`, error);
        }
      }, 50);
    }
    
    // Método 2: Forzar reparseo del contenido (más seguro)
    safeContentRevalidation(model);
    
  } catch (error) {
    console.error(`❌ Error forzando revalidación del modelo:`, error);
    
    // Intentar recuperación si el error es específico de modelo dispuesto
    if (error instanceof Error && error.message?.includes('disposed')) {
      console.log('🔄 Intentando recuperar modelo dispuesto...');
      attemptModelRecovery(model, monaco);
    }
  }
}

/**
 * Verifica si un modelo está dispuesto
 */
function isModelDisposed(model: any): boolean {
  try {
    if (!model) return true;
    
    // Verificar propiedades que indican que el modelo está dispuesto
    if (model._isDisposed === true) return true;
    if (model.isDisposed && typeof model.isDisposed === 'function' && model.isDisposed()) return true;
    
    // Intentar acceder a una propiedad básica
    const uri = model.uri;
    if (uri === undefined || uri === null) return true;
    
    // Si llegamos aquí, el modelo probablemente está disponible
    return false;
  } catch (error) {
    // Si hay error accediendo al modelo, probablemente está dispuesto
    console.warn('⚠️ Error verificando estado del modelo (probablemente dispuesto):', error);
    return true;
  }
}

/**
 * Revalidación segura del contenido
 */
function safeContentRevalidation(model: any): void {
  try {
    if (isModelDisposed(model)) {
      console.warn('⚠️ No se puede hacer revalidación de contenido: modelo dispuesto');
      return;
    }

    const content = model.getValue();
    if (content && content.trim() && !isModelDisposed(model)) {
      // Pequeño cambio temporal para forzar reparseo
      const tempValue = content + ' ';
      model.setValue(tempValue);
      
      setTimeout(() => {
        if (!isModelDisposed(model)) {
          model.setValue(content);
          console.log(`✅ Revalidación de contenido completada`);
        }
      }, 10);
    }
  } catch (error) {
    console.warn('⚠️ Error en revalidación segura de contenido:', error);
  }
}

/**
 * Intenta recuperar un modelo dispuesto
 */
function attemptModelRecovery(disposedModel: any, monaco: any): void {
  try {
    console.log('🔄 Intentando recuperación de modelo dispuesto...');
    
    // Si el modelo está dispuesto, no hay mucho que podamos hacer
    // Pero podemos intentar crear uno nuevo con la misma configuración
    
    if (!disposedModel || !monaco) {
      console.warn('⚠️ No se puede recuperar: falta información del modelo');
      return;
    }

    // Log del intento de recuperación para debugging
    console.log('ℹ️ Modelo dispuesto detectado - esto puede indicar que el editor fue desmontado');
    console.log('💡 Sugerencia: Verificar que el componente Editor no se esté desmontando prematuramente');
    
  } catch (error) {
    console.error('❌ Error durante intento de recuperación de modelo:', error);
  }
}

/**
 * 🔧 DIAGNÓSTICO PROFUNDO Y REPARACIÓN DE MODELOS TYPESCRIPT
 * 
 * Esta función resuelve el problema específico donde Monaco muestra
 * "Type annotations can only be used in TypeScript files" incluso cuando
 * el archivo está correctamente configurado como TypeScript.
 */
export function deepDiagnoseAndRepairTypeScriptModel(
  model: any, 
  monaco: any, 
  fileId?: string
): boolean {
  try {
    console.log(`🔍 Iniciando diagnóstico profundo del modelo TypeScript`, { fileId });
    
    if (!model || !monaco) {
      console.error(`❌ Modelo o Monaco no disponibles para diagnóstico`);
      return false;
    }
    
    const currentUri = model.uri;
    const currentLanguage = model.getLanguageId();
    const currentContent = model.getValue();
    
    console.log(`📋 Estado actual del modelo:`, {
      uri: currentUri?.toString(),
      language: currentLanguage,
      contentLength: currentContent?.length,
      hasTypeScriptContent: detectTypeScript(currentContent)
    });

    // 1. VERIFICAR SI EL URI TIENE EXTENSIÓN TYPESCRIPT
    const uriPath = currentUri?.path || currentUri?.toString() || '';
    const hasTypeScriptExtension = /\.(ts|tsx)$/i.test(uriPath);
    
    console.log(`🔍 Verificación de URI:`, {
      path: uriPath,
      hasTypeScriptExtension,
      shouldHaveTS: currentLanguage === 'typescript' || currentLanguage === 'typescriptreact'
    });
    
    // 2. VERIFICAR SI MONACO INTERNAMENTE RECONOCE EL ARCHIVO COMO TYPESCRIPT
    let isRecognizedAsTypeScript = false;
    try {
      const tsWorker = monaco.languages.typescript;
      if (tsWorker && tsWorker.getTypeScriptWorker) {
        // Verificar si el worker de TypeScript conoce este archivo
        tsWorker.getTypeScriptWorker().then((worker: any) => {
          if (worker) {
            const uriString = currentUri.toString();
            console.log(`🔍 Verificando reconocimiento del worker TS para:`, uriString);
            
            // Intentar obtener información del archivo desde el worker
            Promise.all([
              worker.getCompilerOptions?.(),
              worker.getScriptFileNames?.()
            ]).then(([options, fileNames]) => {
              console.log(`📋 Worker TS state:`, {
                compilerOptions: options,
                knowsFile: fileNames?.includes(uriString),
                totalFiles: fileNames?.length
              });
            }).catch((error: any) => {
              console.warn(`⚠️ Error verificando state del worker TS:`, error);
            });
          }
        }).catch((error: any) => {
          console.warn(`⚠️ Error obteniendo worker de TypeScript:`, error);
        });
      }
    } catch (error) {
      console.warn(`⚠️ Error verificando reconocimiento TypeScript:`, error);
    }
    
    // 3. VERIFICAR DIAGNÓSTICOS ACTUALES
    const currentMarkers = monaco.editor.getModelMarkers({ resource: currentUri });
    const hasInterfaceError = currentMarkers.some((marker: any) => 
      marker.message && marker.message.includes("can only be used in TypeScript files")
    );
    
    console.log(`🔍 Diagnósticos actuales:`, {
      totalMarkers: currentMarkers.length,
      hasInterfaceError,
      errorMessages: currentMarkers.map((m: any) => m.message).slice(0, 3)
    });

    // 4. APLICAR REPARACIONES SI ES NECESARIO
    if (hasInterfaceError || !hasTypeScriptExtension || currentLanguage === 'typescript' || currentLanguage === 'typescriptreact') {
      console.log(`🔧 Aplicando reparación profunda...`);
      
      // Reparación 1: Forzar URI correcto SIEMPRE para TypeScript
      if (!hasTypeScriptExtension && (currentLanguage === 'typescript' || currentLanguage === 'typescriptreact')) {
        const newExtension = currentLanguage === 'typescriptreact' ? '.tsx' : '.ts';
        const basePath = uriPath.replace(/\.[^.]*$/, '') || `/temp-ts-file-${fileId || Date.now()}`;
        const newPath = basePath + newExtension;
        const newUri = monaco.Uri.parse(`file://${newPath}`);
        
        console.log(`📝 Creando modelo con URI correcto: ${newPath}`);
        
        try {
          // NUEVO: Método más directo - actualizar el URI del modelo existente si es posible
          if (model._setLanguageId && model._setUri && typeof model._setUri === 'function') {
            console.log(`🔄 Actualizando URI del modelo existente`);
            model._setUri(newUri);
          } else {
            // Método de respaldo: crear nuevo modelo
            const newModel = monaco.editor.createModel(currentContent, currentLanguage, newUri);
            
            // Actualizar el editor para usar el nuevo modelo
            const editors = monaco.editor.getEditors();
            for (const editor of editors) {
              if (editor.getModel() === model) {
                console.log(`🔄 Actualizando editor con nuevo modelo`);
                editor.setModel(newModel);
                break;
              }
            }
            
            // Disponer del modelo anterior
            model.dispose();
            
            console.log(`✅ Modelo recreado con URI correcto: ${newPath}`);
            
            // Continuar con el nuevo modelo
            model = newModel;
          }
          
        } catch (modelError) {
          console.warn(`⚠️ Error recreando modelo, usando método alternativo:`, modelError);
          
          // Método alternativo: actualizar el lenguaje forzadamente
          monaco.editor.setModelLanguage(model, currentLanguage);
        }
      }
      
      // Reparación 2: SIEMPRE limpiar y reestablecer diagnósticos para TypeScript
      console.log(`🧹 Limpiando diagnósticos...`);
      monaco.editor.setModelMarkers(model, 'typescript', []);
      monaco.editor.setModelMarkers(model, 'javascript', []);

      // Reparación 3: SIEMPRE forzar reconfiguración del worker TypeScript
      setTimeout(() => {
        try {
          const tsDefaults = monaco.languages.typescript.typescriptDefaults;
          if (tsDefaults) {
            // Configuración específica para interfaces
            console.log(`🔧 Aplicando configuración específica para interfaces...`);
            
            // NUEVO: Configuración más agresiva para interfaces
            tsDefaults.setCompilerOptions({
              allowNonTsExtensions: true,
              allowJs: true,
              checkJs: false,
              isolatedModules: false,  // Permitir interfaces globales
              strict: false,           // Más permisivo
              noSemanticValidation: false,
              target: monaco.languages.typescript.ScriptTarget.ES2020,
              lib: ['es2020', 'dom'],
              module: monaco.languages.typescript.ModuleKind.ESNext,
              moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
              jsx: currentLanguage === 'typescriptreact' ? 
                   monaco.languages.typescript.JsxEmit.React : 
                   monaco.languages.typescript.JsxEmit.None,
              esModuleInterop: true,
              allowSyntheticDefaultImports: true,
              skipLibCheck: true,
              declaration: false,
              declarationMap: false,
              sourceMap: false,
            });
            
            // Forzar reconfiguración
            tsDefaults.setEagerModelSync(false);
            setTimeout(() => {
              tsDefaults.setEagerModelSync(true);
              console.log(`🔄 Worker TypeScript reconfigurado con configuración agresiva`);
              
              // Forzar nueva validación
              forceModelRevalidation(model, monaco);
              
            }, 50); // Delay más corto
          }
        } catch (workerError) {
          console.warn(`⚠️ Error reconfigurando worker TypeScript:`, workerError);
        }
      }, 50); // Delay más corto
      
      // Reparación 4: Validar después de un delay MÁS CORTO
      setTimeout(() => {
        validateTypeScriptModelRepair(model, monaco);
      }, 200); // Reducido de 500ms a 200ms
      
      return true;
    }
    
    console.log(`✅ Modelo ya está correctamente configurado`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error en diagnóstico profundo:`, error);
    return false;
  }
}

/**
 * Validar que la reparación del modelo TypeScript funcionó
 */
function validateTypeScriptModelRepair(model: any, monaco: any): void {
  try {
    console.log(`🔍 Validando reparación del modelo TypeScript...`);
    
    const currentUri = model.uri;
    const currentLanguage = model.getLanguageId();
    const currentMarkers = monaco.editor.getModelMarkers({ resource: currentUri });
    
    const hasInterfaceError = currentMarkers.some((marker: any) => 
      marker.message && marker.message.includes("can only be used in TypeScript files")
    );
    
    const uriPath = currentUri?.path || currentUri?.toString() || '';
    const hasCorrectExtension = /\.(ts|tsx)$/i.test(uriPath);
    
    console.log(`📋 Resultado de la validación:`, {
      language: currentLanguage,
      uriPath,
      hasCorrectExtension,
      totalMarkers: currentMarkers.length,
      hasInterfaceError,
      success: !hasInterfaceError && hasCorrectExtension
    });
    
    if (hasInterfaceError) {
      console.error(`❌ Reparación falló - aún hay errores de interface`);
      console.log(`🔧 Intentando reparación adicional...`);
      
      // Reparación adicional: método más agresivo
      setTimeout(() => {
        monaco.editor.setModelLanguage(model, 'typescript');
        forceModelRevalidation(model, monaco);
      }, 100);
      
    } else if (!hasCorrectExtension) {
      console.warn(`⚠️ URI no tiene extensión correcta pero no hay errores de interface`);
    } else {
      console.log(`✅ Reparación exitosa - modelo TypeScript funcionando correctamente`);
    }
    
  } catch (error) {
    console.error(`❌ Error validando reparación:`, error);
  }
} 