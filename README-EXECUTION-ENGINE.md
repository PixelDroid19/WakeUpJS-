# 🚀 Motor de Ejecución de Código Profesional

## 📋 Resumen

El **Motor de Ejecución de Código Profesional** es un sistema avanzado y escalable diseñado para ejecutar código JavaScript de manera eficiente, segura y robusta. Incorpora las mejores prácticas de la industria para el manejo de ejecución de código en tiempo real.

## ✨ Características Principales

### 🏗️ **Arquitectura Escalable**
- **Ejecución en Queue**: Sistema de colas con prioridades para manejo concurrente
- **Worker Threads Ready**: Preparado para aislamiento en workers
- **Gestión de Recursos**: Monitoreo de CPU, memoria y tiempo de ejecución
- **Timeout Adaptativo**: Ajuste automático basado en complejidad del código

### 💾 **Sistema de Cache Inteligente**
- **Cache LRU**: Eviction automático de entradas menos usadas
- **TTL Configurable**: Invalidación automática por tiempo
- **Hash-based**: Identificación eficiente de código repetido
- **Métricas de Hit Rate**: Monitoreo de eficiencia del cache

### 🔒 **Seguridad y Sandbox**
- **Detección de Riesgos**: Análisis automático de patrones peligrosos
- **Niveles de Seguridad**: Configuración flexible (low/medium/high)
- **Sandbox Isolation**: Ejecución aislada del contexto principal
- **Resource Limits**: Límites de memoria y tiempo de ejecución

### 📊 **Monitoreo y Métricas**
- **Performance Tracking**: Métricas detalladas de rendimiento
- **Error Categorization**: Clasificación inteligente de errores
- **Real-time Dashboard**: Visualización en tiempo real
- **Historical Data**: Mantenimiento de historial de ejecuciones

## 🎯 **Análisis de Complejidad de Código**

El sistema analiza automáticamente la complejidad del código para optimizar la ejecución:

### Factores Analizados
- **Loops**: `for`, `while`, `do-while` (peso: 3x)
- **Condiciones**: `if`, `switch`, `case` (peso: 2x)
- **Funciones**: `function`, `=>`, `async function` (peso: 2x)
- **Operaciones Asíncronas**: `await`, `Promise`, `setTimeout` (peso: 4x)
- **Imports**: `import`, `require` (peso: 2x)
- **Profundidad Anidada**: Nivel de llaves `{}` (peso: 1.5x)

### Timeout Adaptativo
```typescript
timeout = baseTimeout * max(1, complexity.score / 10)
// Máximo: 30 segundos
```

## 🏭 **Sistema de Cola de Ejecución**

### Características
- **Concurrencia Configurable**: Número máximo de ejecuciones simultáneas
- **Sistema de Prioridades**: Ejecución basada en prioridad y timestamp
- **Cancelación Granular**: Cancelación individual o masiva
- **Auto-procesamiento**: Gestión automática de la cola

### Estados de Ejecución
- `success`: Ejecución exitosa
- `error`: Error durante la ejecución
- `timeout`: Tiempo límite excedido
- `cancelled`: Cancelado por el usuario

## 📈 **Dashboard de Métricas**

### Performance General
- **Total de Ejecuciones**: Contador acumulativo
- **Tiempo Promedio**: Media de tiempos de ejecución
- **Tasa de Errores**: Porcentaje de ejecuciones fallidas
- **Ejecuciones Activas**: Número actual de ejecuciones en curso

### Estadísticas de Cache
- **Entradas Totales/Válidas**: Estado del cache
- **Tasa de Aciertos**: Eficiencia del cache
- **Uso de Capacidad**: Visualización del espacio utilizado

### Estado de la Cola
- **En Cola**: Tareas esperando ejecución
- **Ejecutándose**: Tareas en proceso
- **Capacidad**: Límite de concurrencia

## 🛠️ **Configuración**

### Configuración por Defecto
```typescript
{
  maxExecutionTime: 15000,      // 15 segundos
  maxMemoryMB: 100,             // 100 MB
  maxConcurrentExecutions: 5,   // 5 ejecuciones paralelas
  cacheSize: 200,               // 200 entradas en cache
  cacheTTL: 600000,             // 10 minutos TTL
  enableWorkers: true,          // Worker threads habilitados
  enableCache: true,            // Cache habilitado
  enableMetrics: true,          // Métricas habilitadas
  securityLevel: 'medium'       // Nivel de seguridad medio
}
```

### Configuración Personalizada
```typescript
globalExecutionEngine.updateConfig({
  maxExecutionTime: 30000,
  securityLevel: 'high',
  cacheSize: 500
});
```

## 🔧 **API del Motor de Ejecución**

### Métodos Principales

#### `execute(code: string, options?)`
Ejecuta código con opciones configurables.

```typescript
const result = await globalExecutionEngine.execute(code, {
  priority: 1,           // Prioridad alta
  bypassCache: false     // Usar cache
});
```

#### `cancel(executionId: string)`
Cancela una ejecución específica.

```typescript
const cancelled = globalExecutionEngine.cancel(executionId);
```

#### `cancelAll()`
Cancela todas las ejecuciones activas.

```typescript
globalExecutionEngine.cancelAll();
```

#### `getMetrics()`
Obtiene métricas actuales del sistema.

```typescript
const metrics = globalExecutionEngine.getMetrics();
```

#### `clearCache()`
Limpia completamente el cache.

```typescript
globalExecutionEngine.clearCache();
```

### Resultado de Ejecución
```typescript
interface ExecutionResult {
  id: string;                    // ID único de ejecución
  code: string;                  // Código ejecutado
  result: any;                   // Resultado de la ejecución
  error?: ExecutionError;        // Error si ocurrió
  metrics: ExecutionMetrics;     // Métricas de la ejecución
  status: ExecutionStatus;       // Estado final
  duration: number;              // Tiempo total en ms
  fromCache: boolean;            // Si vino del cache
}
```

## 🚨 **Manejo de Errores**

### Categorización Automática
- **`syntax`**: Errores de sintaxis (recuperable)
- **`runtime`**: Errores de ejecución (recuperable)
- **`timeout`**: Tiempo límite excedido (recuperable)
- **`memory`**: Errores de memoria (no recuperable)
- **`security`**: Riesgos de seguridad (crítico)
- **`system`**: Errores del sistema (crítico)

### Niveles de Severidad
- **`low`**: Advertencias menores
- **`medium`**: Errores estándar
- **`high`**: Errores graves
- **`critical`**: Errores que requieren intervención inmediata

## 🔍 **Detección de Seguridad**

### Patrones Detectados
```typescript
- eval()                    // Ejecución de código dinámico
- Function()               // Constructor de funciones
- document.write           // Escritura directa al DOM
- innerHTML =              // Asignación HTML directa
- window[...]              // Acceso dinámico a window
- localStorage.clear       // Limpieza de almacenamiento
```

## 📊 **Integración con useCodeEditor**

### Nuevas Características
```typescript
const {
  isRunning,
  isTransforming,
  runCode,
  executionMetrics,        // ✨ Nuevo: métricas de ejecución
  cancelExecution,         // ✨ Nuevo: cancelación manual
  // ... otros campos existentes
} = useCodeEditor({ ... });
```

### Fallback Automático
El sistema incluye fallback automático al motor anterior en caso de problemas, garantizando continuidad del servicio.

## 🎮 **Dashboard Interactivo**

### Acceso
- **Botón**: "📊 Métricas" en la esquina superior derecha del editor
- **Actualización**: Auto-refresh cada 2 segundos (configurable)
- **Controles**: Limpiar cache, cancelar ejecuciones, toggle configuraciones

### Visualización
- **Gráficos de Progreso**: Uso de cache y cola
- **Colores Dinámicos**: Verde/Amarillo/Rojo según rendimiento
- **Métricas en Tiempo Real**: Actualización automática
- **Historial**: Mantiene datos históricos para análisis

## ⚡ **Optimizaciones de Rendimiento**

### Cache Strategy
1. **Hash-based identification**: Identificación rápida de código repetido
2. **LRU eviction**: Eliminación inteligente de entradas antiguas
3. **TTL management**: Invalidación automática por tiempo
4. **Hit rate optimization**: Monitoreo continuo de eficiencia

### Queue Management
1. **Priority-based execution**: Ejecución por prioridad
2. **Load balancing**: Distribución equilibrada de carga
3. **Resource monitoring**: Monitoreo de recursos del sistema
4. **Adaptive timeouts**: Ajuste automático de timeouts

## 🔮 **Escalabilidad Futura**

### Preparado para:
- **Worker Threads**: Aislamiento completo de ejecución
- **WebAssembly**: Ejecución de alto rendimiento
- **Distributed Execution**: Ejecución distribuida
- **Machine Learning**: Predicción de complejidad
- **Advanced Caching**: Estrategias de cache más sofisticadas

## 📝 **Logging y Debugging**

### Niveles de Log
```typescript
CodeLogger.log('info', 'Ejecución iniciada', { executionId, complexity });
CodeLogger.log('error', 'Error de ejecución', { error, recoverable });
CodeLogger.log('warn', 'Timeout detectado', { duration, limit });
```

### Debugging
- **Execution IDs**: Trazabilidad completa de ejecuciones
- **Performance Metrics**: Métricas detalladas por ejecución
- **Error Context**: Contexto completo de errores
- **Cache Analytics**: Análisis detallado del cache

## 🎯 **Casos de Uso**

### Desarrollo
- **Prototipado Rápido**: Ejecución instantánea de código
- **Testing Interactivo**: Pruebas en tiempo real
- **Performance Analysis**: Análisis de rendimiento de código

### Producción
- **Code Playgrounds**: Entornos de código interactivos
- **Educational Platforms**: Plataformas educativas
- **Live Coding**: Sesiones de programación en vivo
- **API Testing**: Pruebas de APIs en tiempo real

## 📋 **Roadmap**

### v2.0 - Worker Threads
- [ ] Implementación completa de Worker Threads
- [ ] Sandbox de seguridad avanzado
- [ ] Aislamiento completo de memoria

### v2.1 - Machine Learning
- [ ] Predicción de complejidad con ML
- [ ] Optimización automática de timeouts
- [ ] Detección inteligente de patrones

### v2.2 - Distributed Computing
- [ ] Ejecución distribuida
- [ ] Load balancing avanzado
- [ ] Clustering automático

---

## 🤝 **Contribución**

Para contribuir al desarrollo del motor de ejecución:

1. **Fork** del repositorio
2. **Crear branch** para tu feature
3. **Implementar** con tests
4. **Documentar** cambios
5. **Pull Request** con descripción detallada

---

**Desarrollado con ❤️ para JSRunner - Ejecución de código profesional y escalable** 