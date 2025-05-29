/**
 * Dashboard de Monitoreo del Motor de Ejecución
 * 
 * Muestra métricas en tiempo real del sistema de ejecución:
 * - Performance general
 * - Estadísticas de cache
 * - Queue de ejecución
 * - Métricas de complejidad
 * - Controles de gestión
 */

import React, { useState, useEffect } from 'react';
import { globalExecutionEngine } from '../lib/code/execution-engine';
import { useDebugConfig, useConfig, useExecutionAdvancedConfig } from '../context/ConfigContext';

interface MetricsData {
  totalExecutions: number;
  averageExecutionTime: number;
  errorRate: number;
  cacheHitRate: number;
  cache: {
    total: number;
    valid: number;
    hitRate: number;
    size: number;
    capacity: number;
  };
  queue: {
    queued: number;
    running: number;
    capacity: number;
  };
  activeExecutions: number;
}

interface ExecutionDashboardProps {
  isVisible: boolean;
  onClose: () => void;
  currentMetrics?: any;
}

const ExecutionDashboard: React.FC<ExecutionDashboardProps> = ({ 
  isVisible, 
  onClose, 
  currentMetrics 
}) => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const debugConfig = useDebugConfig();
  const executionConfig = useExecutionAdvancedConfig();
  const { resetToDefaults } = useConfig();

  const refreshMetrics = async () => {
    setIsRefreshing(true);
    try {
      const newMetrics = globalExecutionEngine.getMetrics();
      setMetrics(newMetrics);
    } catch (error) {
      console.error('Error refreshing metrics:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const clearCache = () => {
    if (confirm('¿Estás seguro de que quieres limpiar el cache? Esto puede afectar el rendimiento temporalmente.')) {
      globalExecutionEngine.clearCache();
      refreshMetrics();
    }
  };

  const cancelAllExecutions = () => {
    if (confirm('¿Estás seguro de que quieres cancelar todas las ejecuciones activas?')) {
      globalExecutionEngine.cancelAll();
      refreshMetrics();
    }
  };

  const toggleCache = () => {
    if (metrics) {
      globalExecutionEngine.updateConfig({
        enableCache: !executionConfig.enableCache,
      });
      refreshMetrics();
    }
  };

  // Resetear todas las configuraciones a valores predeterminados
  const handleResetAllConfigs = () => {
    if (confirm('¿Estás seguro de que quieres restablecer todas las configuraciones a sus valores predeterminados?')) {
      resetToDefaults();
      refreshMetrics();
    }
  };

  useEffect(() => {
    if (isVisible) {
      refreshMetrics();
    }
  }, [isVisible]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isVisible && autoRefresh) {
      interval = setInterval(refreshMetrics, 2000); // Refresh cada 2 segundos
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isVisible, autoRefresh]);

  // Mostrar métricas solo si está habilitado en la configuración
  if (!isVisible || !debugConfig.showExecutionMetrics) {
    return null;
  }

  const formatNumber = (num: number, decimals: number = 2): string => {
    return num.toFixed(decimals);
  };

  const formatPercentage = (num: number): string => {
    return `${(num * 100).toFixed(1)}%`;
  };

  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }): string => {
    if (value <= thresholds.good) return 'text-green-500';
    if (value <= thresholds.warning) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getCacheEfficiencyColor = (hitRate: number): string => {
    if (hitRate >= 0.8) return 'text-green-500';
    if (hitRate >= 0.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1e1e1e] text-white rounded-lg shadow-2xl w-full max-w-5xl h-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-[#2d2d2d] px-6 py-4 border-b border-gray-600 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">📊 Motor de Ejecución - Dashboard</h2>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${metrics?.activeExecutions ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
              <span className="text-sm text-gray-400">
                {metrics?.activeExecutions ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh
            </label>
            
            <button
              onClick={refreshMetrics}
              disabled={isRefreshing}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm disabled:opacity-50"
            >
              {isRefreshing ? '🔄' : '↻'} Actualizar
            </button>
            
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-full">
          {metrics ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Performance General */}
              <div className="bg-[#2d2d2d] rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  ⚡ Performance General
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Total de Ejecuciones:</span>
                    <span className="font-mono font-bold text-blue-400">
                      {metrics.totalExecutions.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Tiempo Promedio:</span>
                    <span className={`font-mono font-bold ${getPerformanceColor(metrics.averageExecutionTime, { good: 100, warning: 500 })}`}>
                      {formatNumber(metrics.averageExecutionTime)}ms
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Tasa de Errores:</span>
                    <span className={`font-mono font-bold ${getPerformanceColor(metrics.errorRate * 100, { good: 5, warning: 15 })}`}>
                      {formatPercentage(metrics.errorRate)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Ejecuciones Activas:</span>
                    <span className="font-mono font-bold text-yellow-400">
                      {metrics.activeExecutions}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cache Statistics */}
              <div className="bg-[#2d2d2d] rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  🗄️ Estadísticas de Cache
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Entradas Totales:</span>
                    <span className="font-mono font-bold text-blue-400">
                      {metrics.cache.total} / {metrics.cache.capacity}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Entradas Válidas:</span>
                    <span className="font-mono font-bold text-green-400">
                      {metrics.cache.valid}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Tasa de Aciertos Global:</span>
                    <span className={`font-mono font-bold ${getCacheEfficiencyColor(metrics.cacheHitRate)}`}>
                      {formatPercentage(metrics.cacheHitRate)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Eficiencia del Cache:</span>
                    <span className={`font-mono font-bold ${getCacheEfficiencyColor(metrics.cache.hitRate)}`}>
                      {formatPercentage(metrics.cache.hitRate)}
                    </span>
                  </div>
                  
                  {/* Progress bar para uso del cache */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Uso del Cache</span>
                      <span>{formatPercentage(metrics.cache.size / metrics.cache.capacity)}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(metrics.cache.size / metrics.cache.capacity) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Queue Status */}
              <div className="bg-[#2d2d2d] rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  📋 Estado de la Cola
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>En Cola:</span>
                    <span className="font-mono font-bold text-yellow-400">
                      {metrics.queue.queued}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Ejecutándose:</span>
                    <span className="font-mono font-bold text-green-400">
                      {metrics.queue.running}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Capacidad:</span>
                    <span className="font-mono font-bold text-blue-400">
                      {metrics.queue.capacity}
                    </span>
                  </div>
                  
                  {/* Progress bar para uso de la cola */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Uso de Capacidad</span>
                      <span>{formatPercentage(metrics.queue.running / metrics.queue.capacity)}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(metrics.queue.running / metrics.queue.capacity) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Execution Metrics */}
              {currentMetrics && (
                <div className="bg-[#2d2d2d] rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    🔬 Ejecución Actual
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Tiempo de Ejecución:</span>
                      <span className="font-mono font-bold text-green-400">
                        {formatNumber(currentMetrics.executionTime)}ms
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Memoria Usada:</span>
                      <span className="font-mono font-bold text-blue-400">
                        {formatNumber(currentMetrics.memoryUsed)}MB
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Complejidad:</span>
                      <span className="font-mono font-bold text-yellow-400">
                        {formatNumber(currentMetrics.codeComplexity, 0)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Cache Hit:</span>
                      <span className={`font-mono font-bold ${currentMetrics.cacheHit ? 'text-green-400' : 'text-gray-400'}`}>
                        {currentMetrics.cacheHit ? '✅ Sí' : '❌ No'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Controles de Gestión */}
              <div className="bg-[#2d2d2d] rounded-lg p-4 lg:col-span-2">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  🎛️ Controles de Gestión
                </h3>
                
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={clearCache}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded text-sm font-medium transition-colors"
                  >
                    🗑️ Limpiar Cache
                  </button>
                  
                  <button
                    onClick={cancelAllExecutions}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors"
                  >
                    🚫 Cancelar Todas las Ejecuciones
                  </button>
                  
                  <button
                    onClick={toggleCache}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium transition-colors"
                  >
                    ⚙️ {executionConfig.enableCache ? 'Desactivar' : 'Activar'} Cache
                  </button>

                  <button
                    onClick={handleResetAllConfigs}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
                  >
                    🔄 Restaurar Configuración
                  </button>
                </div>
                
                <div className="mt-4 p-3 bg-gray-800 rounded text-xs text-gray-300">
                  <p><strong>Notas:</strong></p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>El cache mejora el rendimiento para código repetido</li>
                    <li>La cola gestiona ejecuciones concurrentes automáticamente</li>
                    <li>Las métricas se actualizan cada 2 segundos cuando auto-refresh está activo</li>
                    <li>Los timeouts son adaptativos basados en la complejidad del código</li>
                  </ul>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">Cargando métricas...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExecutionDashboard; 