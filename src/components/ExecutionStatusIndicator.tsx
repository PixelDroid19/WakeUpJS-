import React, { useEffect, useState } from 'react';
import type { ExecutionStatus } from '../hooks/useDebouncedCodeRunner';

interface ExecutionStatusIndicatorProps {
  status: ExecutionStatus;
  onCancel?: () => void;
  onForceExecute?: () => void;
  className?: string;
}

export const ExecutionStatusIndicator: React.FC<ExecutionStatusIndicatorProps> = ({
  status,
  onCancel,
  onForceExecute,
  className = '',
}) => {
  const [countdown, setCountdown] = useState<number>(0);

  // Efecto para el countdown en tiempo real
  useEffect(() => {
    if (status.type === 'debouncing' && status.estimatedDelay) {
      setCountdown(status.estimatedDelay);
      
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 100) {
            clearInterval(interval);
            return 0;
          }
          return prev - 100;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [status.type, status.estimatedDelay]);

  // No mostrar nada si está idle sin mensaje
  if (status.type === 'idle' && !status.message) {
    return null;
  }

  const getStatusConfig = () => {
    switch (status.type) {
      case 'pending':
        return {
          icon: status.isTypingActive ? '⌨️' : '⏳',
          color: status.isTypingActive 
            ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
            : 'bg-blue-500/10 border-blue-500/30 text-blue-300',
          iconColor: status.isTypingActive 
            ? 'text-purple-400 animate-pulse'
            : 'text-blue-400',
          showProgress: false,
        };
      case 'debouncing':
        return {
          icon: status.isTypingActive ? '⌨️' : '⏱️',
          color: status.isTypingActive
            ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
            : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
          iconColor: status.isTypingActive
            ? 'text-purple-400 animate-pulse'
            : 'text-yellow-400',
          showProgress: true,
        };
      case 'executing':
        return {
          icon: '⚡',
          color: 'bg-green-500/10 border-green-500/30 text-green-300',
          iconColor: 'text-green-400 animate-pulse',
          showProgress: false,
        };
      case 'error':
        return {
          icon: '❌',
          color: 'bg-red-500/10 border-red-500/30 text-red-300',
          iconColor: 'text-red-400',
          showProgress: false,
        };
      case 'cleared':
        return {
          icon: '🧹',
          color: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
          iconColor: 'text-cyan-400',
          showProgress: false,
        };
      default:
        return {
          icon: '✅',
          color: 'bg-gray-500/10 border-gray-500/30 text-gray-300',
          iconColor: 'text-gray-400',
          showProgress: false,
        };
    }
  };

  const statusConfig = getStatusConfig();
  const progressPercentage = status.estimatedDelay 
    ? Math.max(0, Math.min(100, (countdown / status.estimatedDelay) * 100))
    : 0;

  return (
    <div className={`
      fixed top-4 right-4 z-50 
      bg-gray-900/95 backdrop-blur-sm 
      border rounded-lg shadow-lg 
      px-4 py-3 min-w-[280px] max-w-[400px]
      transition-all duration-200 ease-in-out
      ${statusConfig.color} ${className}
    `}>
      {/* Encabezado con icono y mensaje */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`text-lg ${statusConfig.iconColor}`}>
            {statusConfig.icon}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {status.message || 'Estado desconocido'}
            </p>
            {status.lastChangeSize !== undefined && (
              <p className="text-xs opacity-70">
                Cambio: {status.lastChangeSize} caracteres
              </p>
            )}
          </div>
        </div>

        {/* Botones de acción */}
        {(status.type === 'pending' || status.type === 'debouncing') && (
          <div className="flex gap-1">
            {onForceExecute && (
              <button
                onClick={onForceExecute}
                className="
                  px-2 py-1 text-xs 
                  bg-green-600/20 hover:bg-green-600/30 
                  text-green-300 hover:text-green-200
                  border border-green-600/30 hover:border-green-600/50
                  rounded transition-all duration-150
                "
                title="Ejecutar ahora (Ctrl+Enter)"
              >
                ▶️
              </button>
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                className="
                  px-2 py-1 text-xs 
                  bg-red-600/20 hover:bg-red-600/30 
                  text-red-300 hover:text-red-200
                  border border-red-600/30 hover:border-red-600/50
                  rounded transition-all duration-150
                "
                title="Cancelar ejecución"
              >
                ✖️
              </button>
            )}
          </div>
        )}
      </div>

      {/* Barra de progreso para debouncing */}
      {statusConfig.showProgress && status.estimatedDelay && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs opacity-70 mb-1">
            <span>Tiempo restante</span>
            <span>{Math.ceil(countdown / 1000)}s</span>
          </div>
          <div className="w-full bg-gray-700/50 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-yellow-500 to-yellow-400 h-1.5 rounded-full transition-all duration-100 ease-linear"
              style={{ width: `${100 - progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Información adicional para desarrolladores */}
      {status.estimatedDelay && status.type === 'debouncing' && (
        <div className="mt-2 pt-2 border-t border-gray-700/50">
          <div className="flex justify-between text-xs opacity-60">
            <span>Delay calculado:</span>
            <span>{status.estimatedDelay}ms</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutionStatusIndicator; 