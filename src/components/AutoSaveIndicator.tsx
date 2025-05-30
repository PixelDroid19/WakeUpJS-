import { Save, Clock, AlertCircle } from 'lucide-react';

interface AutoSaveIndicatorProps {
  lastSaved: number;
  isEnabled: boolean;
  hasUnsavedChanges: boolean;
  onManualSave?: () => void;
}

export function AutoSaveIndicator({ 
  lastSaved, 
  isEnabled, 
  hasUnsavedChanges, 
  onManualSave 
}: AutoSaveIndicatorProps) {
  
  const formatTimestamp = (timestamp: number): string => {
    if (!timestamp) return 'Sin guardar';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 5000) return 'Guardado ahora';
    if (diff < 60000) return `Guardado hace ${Math.floor(diff / 1000)}s`;
    if (diff < 3600000) return `Guardado hace ${Math.floor(diff / 60000)}m`;
    
    const date = new Date(timestamp);
    return `Guardado a las ${date.toLocaleTimeString()}`;
  };

  const getStatusColor = (): string => {
    if (!isEnabled) return 'text-gray-400';
    if (hasUnsavedChanges) return 'text-orange-400';
    if (lastSaved && Date.now() - lastSaved < 10000) return 'text-green-400';
    return 'text-blue-400';
  };

  const getStatusIcon = () => {
    if (!isEnabled) return <AlertCircle className="w-3 h-3" />;
    if (hasUnsavedChanges) return <Clock className="w-3 h-3" />;
    return <Save className="w-3 h-3" />;
  };

  const getTooltipText = (): string => {
    if (!isEnabled) return 'Autosave deshabilitado';
    if (hasUnsavedChanges) return 'Hay cambios sin guardar - Ctrl+S para guardar manualmente';
    if (lastSaved) return `${formatTimestamp(lastSaved)} - Autosave cada 5 segundos`;
    return 'Autosave habilitado';
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onManualSave}
        disabled={!isEnabled}
        className={`
          flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors
          ${getStatusColor()}
          ${isEnabled ? 'hover:bg-gray-700/50 cursor-pointer' : 'cursor-not-allowed'}
          ${hasUnsavedChanges ? 'animate-pulse' : ''}
        `}
        title={getTooltipText()}
      >
        {getStatusIcon()}
        <span className="hidden sm:inline">
          {isEnabled ? formatTimestamp(lastSaved) : 'Deshabilitado'}
        </span>
      </button>
      
      {/* Indicador de estado visual */}
      <div className={`
        w-2 h-2 rounded-full transition-colors
        ${isEnabled ? (hasUnsavedChanges ? 'bg-orange-400' : 'bg-green-400') : 'bg-gray-400'}
        ${hasUnsavedChanges ? 'animate-pulse' : ''}
      `} />
    </div>
  );
}

// Componente más simple para usar en línea
export function SimpleAutoSaveIndicator({ lastSaved, isEnabled }: { lastSaved: number; isEnabled: boolean }) {
  if (!isEnabled) return null;
  
  const formatTime = (timestamp: number): string => {
    if (!timestamp) return '';
    
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'hace unos segundos';
    if (diff < 3600000) return `hace ${Math.floor(diff / 60000)}m`;
    return `hace ${Math.floor(diff / 3600000)}h`;
  };

  return (
    <div className="flex items-center gap-1 text-xs text-gray-400">
      <Save className="w-3 h-3" />
      <span>💾 {lastSaved ? formatTime(lastSaved) : 'Sin guardar'}</span>
    </div>
  );
} 