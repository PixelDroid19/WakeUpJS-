import { useState } from 'react';
import { X, Plus, Edit3 } from 'lucide-react';
import {
  getThemedButtonClasses,
  getThemedInputClasses,
  DIALOG_BACKGROUND_CLASSES,
  DIALOG_HEADER_CLASSES,
  DIALOG_BODY_CLASSES,
  DIALOG_FOOTER_CLASSES,
  TEXT_COLOR_PRIMARY,
  TEXT_COLOR_SECONDARY,
  TEXT_COLOR_ACCENT,
} from '../styles/commonStyles';

interface NewFileDialogProps {
  onClose: () => void;
  onCreate: (name: string, initialContent?: string) => void;
}

function NewFileDialog({ onClose, onCreate }: NewFileDialogProps) {
  const [newFileName, setNewFileName] = useState("");
  const [initialContent, setInitialContent] = useState("");

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      // Crear archivo SIN extensión - la detección será interna
      const cleanName = newFileName.trim().replace(/\.(js|jsx|ts|tsx|html|css)$/, '');
      onCreate(cleanName, initialContent || '');
      setNewFileName("");
      setInitialContent("");
    }
  };

  const handleQuickCreate = () => {
    if (newFileName.trim()) {
      // Crear archivo rápido sin contenido y sin extensión
      const cleanName = newFileName.trim().replace(/\.(js|jsx|ts|tsx|html|css)$/, '');
      onCreate(cleanName, '');
      setNewFileName("");
      setInitialContent("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`${DIALOG_BACKGROUND_CLASSES} p-6 min-w-[500px] max-w-2xl`}>
        <div className={`flex items-center justify-between mb-4 pb-4 ${DIALOG_HEADER_CLASSES.replace('p-4', '')}`}>
          <h3 className={`text-lg font-bold ${TEXT_COLOR_PRIMARY} flex items-center gap-2`}>
            <Plus size={20} className={TEXT_COLOR_ACCENT} />
            Crear Nuevo Archivo
          </h3>
          <button 
            onClick={onClose}
            className={getThemedButtonClasses({ variant: 'ghost', size: 'xs', customClasses: 'p-1 rounded-full' })}
          >
            <X size={18} className={TEXT_COLOR_SECONDARY} />
          </button>
        </div>

        <div className={DIALOG_BODY_CLASSES.replace('p-4 ', '')}>
          <div>
            <label className={`block text-sm mb-2 ${TEXT_COLOR_SECONDARY}`}>
              Nombre del archivo:
            </label>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="mi-componente"
              className={getThemedInputClasses()}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  if (initialContent.trim()) {
                    handleCreateFile();
                  } else {
                    handleQuickCreate();
                  }
                }
              }}
            />
            <p className={`text-xs mt-1 ${TEXT_COLOR_SECONDARY}`}>
              ✨ El sistema detectará automáticamente el tipo de código (JS/TS/JSX/TSX) para la configuración interna
            </p>
          </div>

          <div>
            <label className={`block text-sm mb-2 ${TEXT_COLOR_SECONDARY}`}>
              Contenido inicial (opcional):
            </label>
            <textarea
              value={initialContent}
              onChange={(e) => setInitialContent(e.target.value)}
              placeholder="// Escriba código aquí y el sistema detectará automáticamente el tipo
interface User {
  name: string;
}

function Welcome() {
  return <div>Hello World!</div>;
}"
              rows={6}
              className={`${getThemedInputClasses({customClasses: 'font-mono text-sm resize-none'})}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleCreateFile();
                }
              }}
            />
            <p className={`text-xs mt-1 flex items-center gap-1 ${TEXT_COLOR_SECONDARY}`}>
              🔍 El sistema analizará el código para configurar: TypeScript, JSX, ESLint y ejecución apropiada
            </p>
          </div>
        </div>

        <div className={`${DIALOG_FOOTER_CLASSES.replace('p-4 ', 'pt-6')}`}>
          {/* Botón crear con contenido */}
          <button
            onClick={handleCreateFile}
            disabled={!newFileName.trim()}
            className={getThemedButtonClasses({
              variant: 'primary',
              customClasses: 'flex-1 flex items-center gap-2 justify-center',
              disabled: !newFileName.trim()
            })}
            title="Crear archivo con detección automática interna"
          >
            <Plus size={16} />
            {initialContent.trim() ? 'Crear con Contenido' : 'Crear Vacío'}
          </button>

          {/* Botón crear rápido */}
          <button
            onClick={handleQuickCreate}
            disabled={!newFileName.trim()}
            className={getThemedButtonClasses({
              variant: 'success',
              customClasses: 'flex items-center gap-2 justify-center',
              disabled: !newFileName.trim()
            })}
            title="Crear archivo rápido"
          >
            <Edit3 size={16} />
            Rápido
          </button>

          <button
            onClick={onClose}
            className={getThemedButtonClasses({ variant: 'secondary' })}
          >
            Cancelar
          </button>
        </div>

        {/* Información simplificada */}
        <div className={`mt-4 p-3 rounded-md bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)]`}>
          <h4 className={`text-xs font-semibold mb-1 ${TEXT_COLOR_PRIMARY}`}>💡 Detección automática interna:</h4>
          <ul className={`text-xs space-y-1 ${TEXT_COLOR_SECONDARY}`}>
            <li>• Los archivos se crean <strong>sin extensión</strong> en el nombre visible</li>
            <li>• El sistema detecta <span className={TEXT_COLOR_ACCENT}>TypeScript</span>, <span className="text-[var(--theme-success)]">JSX</span>, etc. automáticamente</li>
            <li>• La configuración de Monaco, ESLint y ejecución se adapta al contenido</li>
            <li>• ¡Más limpio y funcional!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default NewFileDialog; 