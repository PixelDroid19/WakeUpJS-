import { useEffect, useCallback, useRef } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { detectLanguageFromContent } from "../lib/code/detectors";
import {
  setWorkspaceUpdateCallback,
  setWorkspaceUtils,
  syncMonacoWithWorkspace,
} from "../lib/monaco/monacoSetup";
import { LANGUAGE_DETECTION_CONFIG } from "../constants/config";

interface UseMonacoWorkspaceSyncParams {
  editorInstance?: any;
  monacoInstance?: any;
  onLanguageChange?: (language: string) => void;
}

interface UseMonacoWorkspaceSyncResult {
  syncLanguage: () => void;
  forceSync: () => void;
  isLanguageSynced: boolean;
}

export function useMonacoWorkspaceSync({
  editorInstance,
  monacoInstance,
  onLanguageChange,
}: UseMonacoWorkspaceSyncParams): UseMonacoWorkspaceSyncResult {
  const { state, actions, utils } = useWorkspace();
  const lastSyncedLanguageRef = useRef<string>("");
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Configurar las dependencias del workspace en Monaco
  useEffect(() => {
    if (utils) {
      setWorkspaceUtils(utils);
      console.log("✅ Workspace utils configurado para Monaco");
    }
  }, [utils]);

  // Configurar el callback de actualización del workspace
  useEffect(() => {
    const updateCallback = (fileId: string, language: string) => {
      console.log("📁 Actualizando lenguaje en workspace:", {
        fileId,
        language,
      });

      const file = state.files.find((f) => f.id === fileId);
      if (file) {
        const workspaceLanguage = language as
          | "javascript"
          | "typescript"
          | "html"
          | "css";
        actions.updateFileLanguage(fileId, workspaceLanguage);
        onLanguageChange?.(language);
        lastSyncedLanguageRef.current = language;
      }
    };

    setWorkspaceUpdateCallback(updateCallback);
    console.log("✅ Callback de workspace configurado");

    return () => {
      setWorkspaceUpdateCallback(() => {});
    };
  }, [state.files, actions, onLanguageChange]);

  // Función principal de sincronización que delega a la función central
  const syncLanguage = useCallback(() => {
    if (!editorInstance || !monacoInstance) {
      console.warn("⚠️ Editor o Monaco no disponibles para sincronización");
      return;
    }

    const model = editorInstance.getModel();
    if (!model) {
      console.warn("⚠️ No hay modelo de Monaco disponible");
      return;
    }

    console.log("🔄 Iniciando sincronización de lenguaje via hook");

    // Usar la función centralizada de sincronización
    const success = syncMonacoWithWorkspace(model, monacoInstance);

    if (success) {
      console.log("✅ Sincronización de lenguaje completada via hook");
    }
  }, [editorInstance, monacoInstance]);

  // Función para forzar sincronización inmediata
  const forceSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    console.log("🔄 Forzando sincronización inmediata");
    syncLanguage();
  }, [syncLanguage]);

  // Sincronizar cuando cambia el archivo activo
  useEffect(() => {
    if (state.activeFileId && editorInstance && monacoInstance) {
      console.log(
        "📂 Archivo activo cambió, sincronizando lenguaje:",
        state.activeFileId
      );

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(() => {
        syncLanguage();
      }, 150);
    }
  }, [state.activeFileId, syncLanguage, editorInstance, monacoInstance]);

  // Sincronizar cuando cambia el contenido del archivo activo (solo cambios significativos)
  useEffect(() => {
    const activeFile = utils.getActiveFile();
    if (activeFile && editorInstance && monacoInstance) {
      // Usar la función centralizada para detectar cambios significativos
      const hasSignificantChange =
        LANGUAGE_DETECTION_CONFIG.SIGNIFICANT_PATTERNS.some((pattern) =>
          pattern.test(activeFile.content || "")
        );

      if (hasSignificantChange) {
        console.log(
          "🔍 Sintaxis significativa detectada, verificando sincronización"
        );

        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }

        syncTimeoutRef.current = setTimeout(() => {
          syncLanguage();
        }, 300);
      }
    }
  }, [state.files, syncLanguage, utils, editorInstance, monacoInstance]);

  // Verificar si el lenguaje está sincronizado
  const isLanguageSynced = useCallback(() => {
    if (!editorInstance || !monacoInstance) return false;

    const model = editorInstance.getModel();
    const activeFile = utils.getActiveFile();

    if (!model || !activeFile) return false;

    const currentMonacoLanguage = model.getLanguageId();
    const detection = detectLanguageFromContent(activeFile.content || "");

    return currentMonacoLanguage === detection.languageId;
  }, [editorInstance, monacoInstance, utils]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    syncLanguage,
    forceSync,
    isLanguageSynced: isLanguageSynced(),
  };
}
