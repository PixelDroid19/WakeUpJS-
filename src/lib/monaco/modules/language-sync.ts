import {
  detectLanguageFromContent,
  type LanguageDetection,
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
  if (!model || !monaco) {
    console.warn("⚠️ Monaco model o instance no disponible");
    return {
      extension: ".js",
      languageId: "javascript",
      hasJSX: false,
      hasTypeScript: false,
    };
  }

  const currentContent = model.getValue();
  const detection = detectLanguageFromContent(currentContent);

  console.log("🔍 Detección inicial de lenguaje:", {
    fileId,
    filename,
    detectedLanguage: detection.languageId,
    currentMonacoLanguage: monaco.editor.getModel(model.uri)?.getLanguageId(),
    hasJSX: detection.hasJSX,
    hasTypeScript: detection.hasTypeScript,
    contentPreview: currentContent.substring(0, 100),
  });

  // Aplicar el lenguaje detectado a Monaco inmediatamente
  const success = applyLanguageToMonaco(
    model,
    monaco,
    detection.languageId,
    fileId
  );

  if (success && fileId && workspaceUpdateCallback) {
    const workspaceLanguage = mapMonacoLanguageToWorkspace(
      detection.languageId
    );
    workspaceUpdateCallback(fileId, workspaceLanguage);
    console.log("✅ Workspace actualizado:", { fileId, workspaceLanguage });
  }

  return detection;
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
    const currentLanguage = monaco.editor.getModel(model.uri)?.getLanguageId();

    if (currentLanguage === languageId) {
      console.log("ℹ️ Monaco ya tiene el lenguaje correcto:", languageId);
      return true;
    }

    console.log("🔧 Aplicando lenguaje a Monaco:", {
      from: currentLanguage,
      to: languageId,
      fileId,
      modelUri: model.uri.toString(),
    });

    // Aplicar el lenguaje usando el método correcto de Monaco
    monaco.editor.setModelLanguage(model, languageId);

    // Forzar revalidación del modelo para que Monaco reconozca el nuevo lenguaje
    setTimeout(() => {
      forceModelRevalidation(model, monaco);
    }, 100);

    console.log("✅ Lenguaje aplicado exitosamente:", languageId);
    return true;
  } catch (error) {
    console.error("❌ Error aplicando lenguaje a Monaco:", error);
    return false;
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
  if (!model || !monaco) return;

  try {
    // Forzar revalidación mediante cambio temporal
    const currentValue = model.getValue();
    const currentLanguage = monaco.editor.getModel(model.uri)?.getLanguageId();

    console.log("🔄 Forzando revalidación del modelo:", {
      language: currentLanguage,
      contentLength: currentValue.length,
    });

    // Trigger revalidation by forcing Monaco to re-evaluate the model
    model.pushEditOperations(
      [],
      [
        {
          range: new monaco.Range(1, 1, 1, 1),
          text: "",
        },
      ],
      () => null
    );

    // Ensure TypeScript service recognizes the change
    setTimeout(() => {
      if (
        currentLanguage === "typescript" ||
        currentLanguage === "typescriptreact"
      ) {
        console.log("🔧 Forzando reconocimiento de TypeScript");

        // Force TypeScript worker to re-evaluate
        monaco.languages.typescript
          .getTypeScriptWorker()
          .then((worker: any) => {
            worker(model.uri).then((client: any) => {
              if (
                client &&
                typeof client.getSemanticDiagnostics === "function"
              ) {
                client.getSemanticDiagnostics(model.uri.toString());
              }
            });
          });
      }
    }, 200);
  } catch (error) {
    console.error("❌ Error en revalidación forzada:", error);
  }
} 