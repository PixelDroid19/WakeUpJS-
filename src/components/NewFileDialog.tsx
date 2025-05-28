import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface NewFileDialogProps {
  onClose: () => void;
  onCreate: (name: string, language: "javascript" | "typescript" | "html" | "css") => void;
}

function NewFileDialog({ onClose, onCreate }: NewFileDialogProps) {
  const [newFileName, setNewFileName] = useState("");
  const [newFileLanguage, setNewFileLanguage] = useState<
    "javascript" | "typescript" | "html" | "css"
  >("javascript");

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      // No añadir automáticamente extensiones
      onCreate(newFileName.trim(), newFileLanguage);
      setNewFileName("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-600 min-w-96 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">
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
              placeholder="script"
              className="w-full px-3 py-2 bg-gray-900/80 border border-gray-600 rounded-md text-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFile();
              }}
            />
            <p className="text-xs text-gray-400 mt-1">
              Puedes crear un archivo sin extensión o especificar una (.js, .ts, .jsx, etc.)
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Tipo de archivo:
            </label>
            <select
              value={newFileLanguage}
              onChange={(e) => setNewFileLanguage(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-900/80 border border-gray-600 rounded-md text-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleCreateFile}
            disabled={!newFileName.trim()}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 shadow-md
              ${newFileName.trim() 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white' 
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'}
            `}
          >
            <Plus size={16} />
            Crear
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

export default NewFileDialog; 