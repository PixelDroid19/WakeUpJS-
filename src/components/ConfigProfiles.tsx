/**
 * ConfigProfiles Component
 *
 * Componente para gestionar perfiles de configuración:
 * - Guardar configuración actual como perfil
 * - Cargar perfiles guardados
 * - Exportar/importar configuración
 * - Gestionar perfiles (renombrar, eliminar)
 */

import { useState, useEffect } from "react";
import { useConfig } from "../context/ConfigContext";
import { Upload, Download, Trash2, Plus, Check, X } from "lucide-react";

interface ConfigProfilesProps {
  onClose?: () => void;
}

export function ConfigProfiles({ onClose }: ConfigProfilesProps) {
  const {
    config,
    saveConfigProfile,
    loadConfigProfile,
    getAvailableProfiles,
    exportConfig,
    importConfig,
  } = useConfig();

  const [profiles, setProfiles] = useState<string[]>([]);
  const [newProfileName, setNewProfileName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);

  // Cargar perfiles disponibles
  useEffect(() => {
    const availableProfiles = getAvailableProfiles();
    setProfiles(availableProfiles);

    // Detectar perfil activo
    try {
      const active = localStorage.getItem("jsrunner-active-profile");
      if (active) {
        setActiveProfile(active);
      }
    } catch (error) {
      console.error("Error obteniendo perfil activo:", error);
    }
  }, [getAvailableProfiles]);

  // Guardar perfil
  const handleSaveProfile = () => {
    if (newProfileName.trim() === "") return;

    saveConfigProfile(newProfileName);
    setProfiles(getAvailableProfiles());
    setActiveProfile(newProfileName);
    setNewProfileName("");
    setIsCreating(false);
  };

  // Cargar perfil
  const handleLoadProfile = (profileName: string) => {
    if (loadConfigProfile(profileName)) {
      setActiveProfile(profileName);
    }
  };

  // Eliminar perfil
  const handleDeleteProfile = (profileName: string) => {
    try {
      const profiles = JSON.parse(
        localStorage.getItem("jsrunner-config-profiles") || "{}"
      );
      if (profiles[profileName]) {
        delete profiles[profileName];
        localStorage.setItem(
          "jsrunner-config-profiles",
          JSON.stringify(profiles)
        );

        // Si era el perfil activo, limpiar
        if (activeProfile === profileName) {
          localStorage.removeItem("jsrunner-active-profile");
          setActiveProfile(null);
        }

        setProfiles(Object.keys(profiles));
      }
    } catch (error) {
      console.error("Error eliminando perfil:", error);
    }
  };

  // Exportar configuración
  const handleExportConfig = () => {
    const configStr = exportConfig();
    const blob = new Blob([configStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `jsrunner-config-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Importar configuración
  const handleImportConfig = () => {
    if (importText.trim() === "") return;

    if (importConfig(importText)) {
      setShowImport(false);
      setImportText("");
    }
  };

  // Función para cerrar el panel de perfiles
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  // Mostrar información del perfil actual
  const renderCurrentConfigInfo = () => {
    return (
      <div className="mt-4 pt-3 border-t border-gray-700">
        <h4 className="text-xs font-medium text-gray-400 mb-2">Configuración actual:</h4>
        <div className="text-xs text-gray-500">
          <div>Auto-guardado: {config.autoSave.enabled ? "Activado" : "Desactivado"}</div>
          <div>Auto-ejecución: {config.autoExecution.enabled ? "Activado" : "Desactivado"}</div>
          <div>Debounce: {config.autoExecution.debounceTime}ms</div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">
          Perfiles de Configuración
        </h3>
        {onClose && (
          <button 
            onClick={handleClose}
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-200"
            title="Cerrar"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Lista de perfiles */}
      {profiles.length > 0 ? (
        <div className="space-y-2 mb-4">
          {profiles.map((profile) => (
            <div
              key={profile}
              className={`flex items-center justify-between p-2 rounded ${
                activeProfile === profile
                  ? "bg-blue-900/30 border border-blue-700"
                  : "bg-gray-700"
              }`}
            >
              <div className="flex items-center">
                {activeProfile === profile && (
                  <Check size={14} className="text-blue-400 mr-2" />
                )}
                <span className="text-sm text-gray-300">{profile}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleLoadProfile(profile)}
                  className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-blue-400"
                  title="Cargar perfil"
                >
                  <Upload size={14} />
                </button>
                <button
                  onClick={() => handleDeleteProfile(profile)}
                  className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-red-400"
                  title="Eliminar perfil"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500 mb-4">
          No hay perfiles guardados
        </div>
      )}

      {/* Crear nuevo perfil */}
      {isCreating ? (
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            placeholder="Nombre del perfil"
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSaveProfile}
            className="p-1 bg-green-600 hover:bg-green-700 rounded text-white"
            title="Guardar"
          >
            <Check size={14} />
          </button>
          <button
            onClick={() => setIsCreating(false)}
            className="p-1 bg-gray-600 hover:bg-gray-700 rounded text-white"
            title="Cancelar"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 mb-4 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300"
        >
          <Plus size={14} />
          <span>Nuevo perfil</span>
        </button>
      )}

      {/* Importar/Exportar */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleExportConfig}
          className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300 flex-1"
          title="Exportar configuración"
        >
          <Download size={14} />
          <span>Exportar</span>
        </button>
        <button
          onClick={() => setShowImport(!showImport)}
          className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300 flex-1"
          title="Importar configuración"
        >
          <Upload size={14} />
          <span>Importar</span>
        </button>
      </div>

      {/* Panel de importación */}
      {showImport && (
        <div className="mt-3 p-3 bg-gray-700 rounded border border-gray-600">
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Pega aquí la configuración JSON..."
            className="w-full h-24 bg-gray-800 border border-gray-600 rounded p-2 text-xs text-gray-300 font-mono focus:outline-none focus:border-blue-500"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleImportConfig}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white"
            >
              Importar
            </button>
          </div>
        </div>
      )}

      {/* Mostrar información de la configuración actual */}
      {renderCurrentConfigInfo()}
    </div>
  );
}
