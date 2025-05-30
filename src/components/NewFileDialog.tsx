import { useState } from 'react';
import { X, Plus, Edit3 } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-600 min-w-[500px] max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus size={20} className="text-blue-400" />
            Crear Nuevo Archivo
          </h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X size={18} className="text-gray-400 hover:text-white" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Nombre del archivo:
            </label>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="mi-componente"
              className="w-full px-3 py-2 bg-gray-900/80 border border-gray-600 rounded-md text-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
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
            <p className="text-xs text-gray-400 mt-1">
              ✨ El sistema detectará automáticamente el tipo de código (JS/TS/JSX/TSX) para la configuración interna
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">
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
              className="w-full px-3 py-2 bg-gray-900/80 border border-gray-600 rounded-md text-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono text-sm resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleCreateFile();
                }
              }}
            />
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              🔍 El sistema analizará el código para configurar: TypeScript, JSX, ESLint y ejecución apropiada
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          {/* Botón crear con contenido */}
          <button
            onClick={handleCreateFile}
            disabled={!newFileName.trim()}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 shadow-md flex-1
              ${newFileName.trim() 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white' 
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'}
            `}
            title="Crear archivo con detección automática interna"
          >
            <Plus size={16} />
            {initialContent.trim() ? 'Crear con Contenido' : 'Crear Vacío'}
          </button>

          {/* Botón crear rápido */}
          <button
            onClick={handleQuickCreate}
            disabled={!newFileName.trim()}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 shadow-md
              ${newFileName.trim() 
                ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white' 
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'}
            `}
            title="Crear archivo rápido"
          >
            <Edit3 size={16} />
            Rápido
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-md transition-all duration-200"
          >
            Cancelar
          </button>
        </div>

        {/* Información simplificada */}
        <div className="mt-4 p-3 bg-gray-900/50 rounded-md border border-gray-700">
          <h4 className="text-xs font-semibold text-gray-300 mb-1">💡 Detección automática interna:</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Los archivos se crean <strong>sin extensión</strong> en el nombre visible</li>
            <li>• El sistema detecta <span className="text-blue-300">TypeScript</span>, <span className="text-green-300">JSX</span>, etc. automáticamente</li>
            <li>• La configuración de Monaco, ESLint y ejecución se adapta al contenido</li>
            <li>• ¡Más limpio y funcional!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default NewFileDialog; 