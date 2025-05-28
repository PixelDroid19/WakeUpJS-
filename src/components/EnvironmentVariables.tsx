import { useState } from 'react';
import { useWorkspace, type EnvironmentVariables } from '../context/WorkspaceContext';
import { X, Plus, Save, RotateCcw, Settings } from 'lucide-react';

interface EnvironmentVariablesProps {
  isOpen: boolean;
  onClose: () => void;
}

function EnvironmentVariables({ isOpen, onClose }: EnvironmentVariablesProps) {
  const { state, actions } = useWorkspace();
  const [editingVars, setEditingVars] = useState<EnvironmentVariables>(state.environmentVariables);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    actions.updateEnvironmentVariables(editingVars);
    onClose();
  };

  const handleReset = () => {
    setEditingVars(state.environmentVariables);
  };

  const handleAddVariable = () => {
    if (newKey.trim() && !editingVars[newKey]) {
      setEditingVars({
        ...editingVars,
        [newKey.trim()]: newValue.trim()
      });
      setNewKey('');
      setNewValue('');
    }
  };

  const handleRemoveVariable = (key: string) => {
    const newVars = { ...editingVars };
    delete newVars[key];
    setEditingVars(newVars);
  };

  const handleUpdateVariable = (key: string, value: string) => {
    setEditingVars({
      ...editingVars,
      [key]: value
    });
  };

  const isSystemVariable = (key: string) => {
    return ['NODE_ENV'].includes(key);
  };

  const hasChanges = JSON.stringify(editingVars) !== JSON.stringify(state.environmentVariables);

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-600 rounded-xl shadow-2xl z-50 w-[600px] max-w-[90vw] max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-gray-400" />
              <h3 className="text-sm font-medium text-gray-200">Variables de Entorno</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-200 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(80vh-140px)] text-gray-300">
          {/* Descripción */}
          <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-300 mb-2">
              <strong>💡 Variables de Entorno Personalizadas</strong>
            </p>
            <p className="text-xs text-blue-200/80">
              Las variables configuradas aquí estarán disponibles en tu código como <code className="bg-gray-700 px-1 rounded">process.env.VARIABLE_NAME</code>
            </p>
          </div>

          {/* Variables existentes */}
          <div className="space-y-3 mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-3 uppercase tracking-wide">
              Variables Configuradas
            </label>
            
            {Object.entries(editingVars).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      value={key}
                      disabled={isSystemVariable(key)}
                      className={`w-full px-3 py-2 text-sm bg-gray-900/80 border border-gray-600 rounded-md text-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                        isSystemVariable(key) ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                      placeholder="VARIABLE_NAME"
                    />
                    {isSystemVariable(key) && (
                      <span className="text-xs text-gray-500 mt-1">Sistema</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleUpdateVariable(key, e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-900/80 border border-gray-600 rounded-md text-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    placeholder="valor"
                  />
                </div>
                
                {!isSystemVariable(key) && (
                  <button
                    onClick={() => handleRemoveVariable(key)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-md transition-colors"
                    title="Eliminar variable"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}

            {Object.keys(editingVars).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Settings size={24} className="mx-auto mb-2 opacity-50" />
                <p>No hay variables configuradas</p>
              </div>
            )}
          </div>

          {/* Agregar nueva variable */}
          <div className="border-t border-gray-700 pt-6">
            <label className="block text-sm font-medium text-gray-400 mb-3 uppercase tracking-wide">
              Agregar Nueva Variable
            </label>
            
            <div className="flex items-center gap-3 p-3 bg-gray-800/30 border border-gray-700 rounded-lg">
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                className="flex-1 px-3 py-2 text-sm bg-gray-900/80 border border-gray-600 rounded-md text-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="NOMBRE_VARIABLE"
              />
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-gray-900/80 border border-gray-600 rounded-md text-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="valor"
              />
              <button
                onClick={handleAddVariable}
                disabled={!newKey.trim() || !!editingVars[newKey]}
                className="p-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors"
                title="Agregar variable"
              >
                <Plus size={14} />
              </button>
            </div>
            
            <div className="mt-2 text-xs text-gray-500">
              <p>• Los nombres deben estar en MAYÚSCULAS y usar guiones bajos</p>
              <p>• Las variables estarán disponibles como process.env.NOMBRE_VARIABLE</p>
            </div>
          </div>

          {/* Ejemplos comunes */}
          <div className="mt-6 p-3 bg-gray-800/30 border border-gray-600 rounded-lg">
            <h4 className="text-sm font-medium text-gray-300 mb-2">📝 Ejemplos Comunes:</h4>
            <div className="space-y-1 text-xs text-gray-400">
              <p><code>REACT_APP_API_URL</code> → URL de tu API</p>
              <p><code>REACT_APP_VERSION</code> → Versión de tu aplicación</p>
              <p><code>DEBUG_MODE</code> → Activar modo debug</p>
              <p><code>APP_TITLE</code> → Título de tu aplicación</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-800 border-t border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
              >
                <RotateCcw size={12} />
                Descartar
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors"
            >
              <Save size={14} />
              Guardar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default EnvironmentVariables; 