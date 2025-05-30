import { useState } from 'react';
import { X, Check, Save, Moon, Type, AlignLeft } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

interface SettingsDialogProps {
  onClose: () => void;
}

function SettingsDialog({ onClose }: SettingsDialogProps) {
  const { state, actions } = useWorkspace();
  const [settings, setSettings] = useState({
    autoSave: state.settings.autoSave,
    theme: state.settings.theme,
    fontSize: state.settings.fontSize,
    showMinimap: state.settings.showMinimap,
    wordWrap: state.settings.wordWrap,
  });

  const handleSaveSettings = () => {
    actions.updateSettings(settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-600 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">
            Configuración
          </h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X size={18} className="text-gray-400 hover:text-white" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Tema */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <Moon size={16} />
              Tema
            </h4>
            <div className="flex gap-3">
              <button
                onClick={() => setSettings({ ...settings, theme: 'dark' })}
                className={`
                  flex-1 p-3 rounded-lg border transition-all
                  ${settings.theme === 'dark' 
                    ? 'border-blue-500 bg-gray-700/50' 
                    : 'border-gray-600 bg-gray-800/30 hover:border-gray-500'}
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">Oscuro</span>
                  {settings.theme === 'dark' && <Check size={16} className="text-blue-400" />}
                </div>
                <div className="h-12 bg-gray-900 rounded-md border border-gray-700"></div>
              </button>
              
              <button
                onClick={() => setSettings({ ...settings, theme: 'light' })}
                className={`
                  flex-1 p-3 rounded-lg border transition-all
                  ${settings.theme === 'light' 
                    ? 'border-blue-500 bg-gray-700/50' 
                    : 'border-gray-600 bg-gray-800/30 hover:border-gray-500'}
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">Claro</span>
                  {settings.theme === 'light' && <Check size={16} className="text-blue-400" />}
                </div>
                <div className="h-12 bg-gray-100 rounded-md border border-gray-300"></div>
              </button>
            </div>
          </div>

          {/* Tamaño de fuente */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <Type size={16} />
              Tamaño de fuente
            </h4>
            <div className="flex items-center">
              <input
                type="range"
                min="10"
                max="24"
                value={settings.fontSize}
                onChange={(e) => setSettings({ ...settings, fontSize: parseInt(e.target.value) })}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="ml-3 text-white font-mono w-8 text-center">{settings.fontSize}</span>
            </div>
          </div>

          {/* Opciones de editor */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <AlignLeft size={16} />
              Opciones de editor
            </h4>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-700/30 rounded-lg">
                <span className="text-sm text-gray-300">Guardado automático</span>
                <div 
                  className={`
                    w-10 h-5 rounded-full relative transition-colors
                    ${settings.autoSave ? 'bg-blue-500' : 'bg-gray-600'}
                  `}
                  onClick={() => setSettings({ ...settings, autoSave: !settings.autoSave })}
                >
                  <span 
                    className={`
                      absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all
                      ${settings.autoSave ? 'left-[1.35rem]' : 'left-0.5'}
                    `}
                  />
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-700/30 rounded-lg">
                <span className="text-sm text-gray-300">Mostrar minimapa</span>
                <div 
                  className={`
                    w-10 h-5 rounded-full relative transition-colors
                    ${settings.showMinimap ? 'bg-blue-500' : 'bg-gray-600'}
                  `}
                  onClick={() => setSettings({ ...settings, showMinimap: !settings.showMinimap })}
                >
                  <span 
                    className={`
                      absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all
                      ${settings.showMinimap ? 'left-[1.35rem]' : 'left-0.5'}
                    `}
                  />
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-700/30 rounded-lg">
                <span className="text-sm text-gray-300">Ajuste de línea</span>
                <div 
                  className={`
                    w-10 h-5 rounded-full relative transition-colors
                    ${settings.wordWrap ? 'bg-blue-500' : 'bg-gray-600'}
                  `}
                  onClick={() => setSettings({ ...settings, wordWrap: !settings.wordWrap })}
                >
                  <span 
                    className={`
                      absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all
                      ${settings.wordWrap ? 'left-[1.35rem]' : 'left-0.5'}
                    `}
                  />
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSaveSettings}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-md transition-all duration-200 shadow-md"
          >
            <Save size={16} />
            Guardar
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-md transition-all duration-200"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsDialog; 