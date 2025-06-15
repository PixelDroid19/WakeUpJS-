import { useState } from 'react';
import { X, Check, Save, Moon, Type, AlignLeft } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  getThemedButtonClasses,
  // getThemedInputClasses, // Not directly used for range, but could be for other inputs
  getToggleSwitchClasses,
  DIALOG_BACKGROUND_CLASSES,
  DIALOG_HEADER_CLASSES, // For header structure, text inside uses specific constants
  DIALOG_BODY_CLASSES,
  DIALOG_FOOTER_CLASSES,
  TEXT_COLOR_PRIMARY,
  TEXT_COLOR_SECONDARY,
  TEXT_COLOR_ACCENT,
} from '../styles/commonStyles';

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`${DIALOG_BACKGROUND_CLASSES} p-6 w-full max-w-md`}>
        <div className={`flex items-center justify-between mb-6 pb-4 ${DIALOG_HEADER_CLASSES.replace('p-4', '')}`}>
          <h3 className={`text-lg font-bold ${TEXT_COLOR_PRIMARY}`}>
            Configuración
          </h3>
          <button
            onClick={onClose}
            className={getThemedButtonClasses({ variant: 'ghost', size: 'xs', customClasses: 'p-1 rounded-full' })}
          >
            <X size={18} className={TEXT_COLOR_SECONDARY} />
          </button>
        </div>

        <div className={`${DIALOG_BODY_CLASSES.replace('p-4 ', '')} space-y-6`}>
          {/* Tema */}
          <div>
            <h4 className={`text-sm font-medium mb-3 flex items-center gap-2 ${TEXT_COLOR_SECONDARY}`}>
              <Moon size={16} />
              Tema
            </h4>
            <div className="flex gap-3">
              {/* Theme Dark Button */}
              <button
                onClick={() => setSettings({ ...settings, theme: 'dark' })}
                className={`flex-1 p-3 rounded-lg border transition-all
                  ${settings.theme === 'dark' 
                    ? 'border-[var(--theme-accent)] bg-[var(--theme-bg-secondary)] ring-2 ring-[var(--theme-accent)]'
                    : 'border-[var(--theme-border)] bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-fg)]'
                  }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${TEXT_COLOR_PRIMARY}`}>Oscuro</span>
                  {settings.theme === 'dark' && <Check size={16} className={TEXT_COLOR_ACCENT} />}
                </div>
                <div className="h-12 bg-[var(--theme-bg)] rounded-md border border-[var(--theme-border)]"></div>
              </button>
              
              {/* Theme Light Button */}
              <button
                onClick={() => setSettings({ ...settings, theme: 'light' })}
                className={`flex-1 p-3 rounded-lg border transition-all
                  ${settings.theme === 'light' 
                    ? 'border-[var(--theme-accent)] bg-[var(--theme-bg-secondary)] ring-2 ring-[var(--theme-accent)]'
                    : 'border-[var(--theme-border)] bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-fg)]'
                  }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${TEXT_COLOR_PRIMARY}`}>Claro</span>
                  {settings.theme === 'light' && <Check size={16} className={TEXT_COLOR_ACCENT} />}
                </div>
                {/* Preview for light theme needs to be distinct if the button bg is also light */}
                <div className="h-12 bg-[#f0f0f0] rounded-md border border-[#cccccc]"></div>
              </button>
            </div>
          </div>

          {/* Tamaño de fuente */}
          <div>
            <h4 className={`text-sm font-medium mb-3 flex items-center gap-2 ${TEXT_COLOR_SECONDARY}`}>
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
                className="flex-1 h-2 bg-[var(--theme-bg-tertiary)] rounded-lg appearance-none cursor-pointer
                           focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] focus:ring-offset-2 focus:ring-offset-[var(--theme-bg)]
                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[var(--theme-accent)] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                           [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-[var(--theme-accent)] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none"
              />
              <span className={`ml-3 font-mono w-8 text-center ${TEXT_COLOR_PRIMARY}`}>{settings.fontSize}</span>
            </div>
          </div>

          {/* Opciones de editor */}
          <div>
            <h4 className={`text-sm font-medium mb-3 flex items-center gap-2 ${TEXT_COLOR_SECONDARY}`}>
              <AlignLeft size={16} />
              Opciones de editor
            </h4>
            <div className="space-y-1">
              {[
                { key: 'autoSave', label: 'Guardado automático' },
                { key: 'showMinimap', label: 'Mostrar minimapa' },
                { key: 'wordWrap', label: 'Ajuste de línea' },
              ].map(opt => {
                const isChecked = settings[opt.key as keyof typeof settings] as boolean;
                const toggleClasses = getToggleSwitchClasses(isChecked);
                return (
                  <label
                    key={opt.key}
                    className="flex items-center justify-between cursor-pointer p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg"
                    onClick={(e) => { // Allow clicking the whole row
                      e.preventDefault();
                      setSettings(s => ({ ...s, [opt.key]: !s[opt.key as keyof typeof settings] }));
                    }}
                  >
                    <span className={`text-sm ${TEXT_COLOR_SECONDARY}`}>{opt.label}</span>
                    <div className={toggleClasses.switch}>
                      <span className={toggleClasses.knob} />
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className={DIALOG_FOOTER_CLASSES.replace('p-4 ', 'pt-6 mt-6')}>
          <button
            onClick={handleSaveSettings}
            className={getThemedButtonClasses({ variant: 'primary', customClasses: 'flex items-center gap-2' })}
          >
            <Save size={16} />
            Guardar
          </button>
          <button
            onClick={onClose}
            className={getThemedButtonClasses({ variant: 'secondary' })}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsDialog; 