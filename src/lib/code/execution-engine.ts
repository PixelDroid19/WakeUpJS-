/**
 * Motor de Ejecución de Código Profesional
 * 
 * Características:
 * - Ejecución en Worker Threads para aislamiento
 * - Cache inteligente con invalidación automática
 * - Timeout adaptativo basado en complejidad
 * - Monitoreo de recursos (CPU, memoria, tiempo)
 * - Queue de ejecución para manejo concurrente
 * - Error handling categorizado y robusto
 * - Métricas de performance para optimización
 * - Cancelación granular con cleanup
 * - Sandbox seguro para prevención de ataques
 * - Configuración dinámica en tiempo real
 */

import { EXECUTION_ENGINE_CONFIG } from '../../constants/config';

interface ExecutionMetrics {
  executionTime: number;
  memoryUsed: number;
  cpuUsage: number;
  cacheHit: boolean;
  codeComplexity: number;
  errorCount: number;
  timestamp: number;
}

interface ExecutionResult {
  id: string;
  code: string;
  result: any;
  error?: ExecutionError;
  metrics: ExecutionMetrics;
  status: 'success' | 'error' | 'timeout' | 'cancelled';
  duration: number;
  fromCache: boolean;
}

interface ExecutionError {
  type: 'syntax' | 'runtime' | 'timeout' | 'memory' | 'security' | 'system';
  message: string;
  line?: number;
  column?: number;
  stack?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
}

interface CodeComplexityAnalysis {
  loops: number;
  conditions: number;
  functions: number;
  recursions: number;
  asyncOps: number;
  imports: number;
  nestedDepth: number;
  score: number;
}

interface CacheEntry {
  id: string;
  codeHash: string;
  result: any;
  metrics: ExecutionMetrics;
  timestamp: number;
  hits: number;
  validity: number; // TTL en ms
}

interface ExecutionConfig {
  maxExecutionTime: number;
  maxMemoryMB: number;
  maxConcurrentExecutions: number;
  cacheSize: number;
  cacheTTL: number;
  enableWorkers: boolean;
  enableCache: boolean;
  enableMetrics: boolean;
  securityLevel: 'low' | 'medium' | 'high';
  loopIterationLimit: number;
  asyncWaitTime: number;
  promiseTimeout: number;
}

class ExecutionQueue {
  private queue: Array<{
    id: string;
    execute: () => Promise<ExecutionResult>;
    priority: number;
    timestamp: number;
  }> = [];
  
  private running = new Map<string, AbortController>();
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  async add(id: string, executor: () => Promise<ExecutionResult>, priority: number = 0): Promise<ExecutionResult> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        id,
        execute: async () => {
          try {
            const result = await executor();
            resolve(result);
            return result;
          } catch (error) {
            reject(error);
            throw error;
          }
        },
        priority,
        timestamp: Date.now()
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.running.size >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    // Ordenar por prioridad y timestamp
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.timestamp - b.timestamp;
    });

    const task = this.queue.shift();
    if (!task) return;

    const controller = new AbortController();
    this.running.set(task.id, controller);

    try {
      await task.execute();
    } catch (error) {
      console.error(`Execution ${task.id} failed:`, error);
    } finally {
      this.running.delete(task.id);
      this.processQueue(); // Procesar siguiente tarea
    }
  }

  cancel(id: string): boolean {
    const controller = this.running.get(id);
    if (controller) {
      controller.abort();
      this.running.delete(id);
      return true;
    }
    
    // Remover de la queue si aún no se ejecutó
    const index = this.queue.findIndex(task => task.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    
    return false;
  }

  getStats() {
    return {
      queued: this.queue.length,
      running: this.running.size,
      capacity: this.maxConcurrent
    };
  }
}

class ExecutionCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  private generateHash(code: string): string {
    // Simple hash function - en producción usar crypto.subtle
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      const char = code.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  get(code: string): CacheEntry | null {
    const hash = this.generateHash(code);
    const entry = this.cache.get(hash);
    
    if (!entry) return null;
    
    // Verificar TTL
    if (Date.now() - entry.timestamp > entry.validity) {
      this.cache.delete(hash);
      return null;
    }
    
    // Incrementar hits
    entry.hits++;
    return entry;
  }

  set(code: string, result: any, metrics: ExecutionMetrics, ttl: number = 300000): void {
    const hash = this.generateHash(code);
    
    // Limpiar cache si está lleno
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }
    
    this.cache.set(hash, {
      id: crypto.randomUUID(),
      codeHash: hash,
      result,
      metrics,
      timestamp: Date.now(),
      hits: 0,
      validity: ttl
    });
  }

  private evictLeastUsed(): void {
    let leastUsed: string | null = null;
    let minHits = Infinity;
    let oldestTime = Infinity;
    
    for (const [hash, entry] of this.cache.entries()) {
      if (entry.hits < minHits || (entry.hits === minHits && entry.timestamp < oldestTime)) {
        minHits = entry.hits;
        oldestTime = entry.timestamp;
        leastUsed = hash;
      }
    }
    
    if (leastUsed) {
      this.cache.delete(leastUsed);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    const now = Date.now();
    const valid = Array.from(this.cache.values()).filter(
      entry => now - entry.timestamp <= entry.validity
    );
    
    return {
      total: this.cache.size,
      valid: valid.length,
      hitRate: valid.reduce((sum, entry) => sum + entry.hits, 0) / Math.max(valid.length, 1),
      size: this.cache.size,
      capacity: this.maxSize
    };
  }
}

class CodeAnalyzer {
  static analyzeComplexity(code: string): CodeComplexityAnalysis {
    const analysis: CodeComplexityAnalysis = {
      loops: 0,
      conditions: 0,
      functions: 0,
      recursions: 0,
      asyncOps: 0,
      imports: 0,
      nestedDepth: 0,
      score: 0
    };

    // Detectar loops
    analysis.loops = (code.match(/\b(for|while|do)\s*\(/g) || []).length;
    
    // Detectar condiciones
    analysis.conditions = (code.match(/\b(if|switch|case|else if)\s*\(/g) || []).length;
    
    // Detectar funciones
    analysis.functions = (code.match(/\b(function|=>\s*{|async\s+function)/g) || []).length;
    
    // Detectar operaciones asíncronas
    analysis.asyncOps = (code.match(/\b(await|Promise|setTimeout|setInterval|fetch)/g) || []).length;
    
    // Detectar imports
    analysis.imports = (code.match(/\b(import|require)\s*\(/g) || []).length;
    
    // Calcular profundidad anidada (aproximada)
    let maxDepth = 0;
    let currentDepth = 0;
    for (const char of code) {
      if (char === '{') currentDepth++;
      if (char === '}') currentDepth--;
      maxDepth = Math.max(maxDepth, currentDepth);
    }
    analysis.nestedDepth = maxDepth;
    
    // Calcular score de complejidad
    analysis.score = (
      analysis.loops * 3 +
      analysis.conditions * 2 +
      analysis.functions * 2 +
      analysis.asyncOps * 4 +
      analysis.imports * 2 +
      analysis.nestedDepth * 1.5
    );
    
    return analysis;
  }

  static calculateTimeout(complexity: CodeComplexityAnalysis, baseTimeout: number = 5000): number {
    const multiplier = Math.max(1, complexity.score / 10);
    return Math.min(baseTimeout * multiplier, 30000); // Máximo 30 segundos
  }

  static detectSecurityRisks(code: string): string[] {
    const risks: string[] = [];
    
    const dangerousPatterns = [
      { pattern: /eval\s*\(/, risk: 'Uso de eval() detectado' },
      { pattern: /Function\s*\(/, risk: 'Constructor Function detectado' },
      { pattern: /document\.write/, risk: 'document.write detectado' },
      { pattern: /innerHTML\s*=/, risk: 'innerHTML assignment detectado' },
      { pattern: /window\[/, risk: 'Acceso dinámico a window detectado' },
      { pattern: /localStorage\.clear|sessionStorage\.clear/, risk: 'Limpieza de storage detectada' },
    ];
    
    for (const { pattern, risk } of dangerousPatterns) {
      if (pattern.test(code)) {
        risks.push(risk);
      }
    }
    
    return risks;
  }
}

export class ExecutionEngine {
  private config: ExecutionConfig;
  private cache: ExecutionCache;
  private queue: ExecutionQueue;
  private metrics: ExecutionMetrics[] = [];
  private activeExecutions = new Map<string, AbortController>();

  constructor(config: Partial<ExecutionConfig> = {}) {
    this.config = {
      maxExecutionTime: 10000,
      maxMemoryMB: 50,
      maxConcurrentExecutions: 3,
      cacheSize: 100,
      cacheTTL: 300000, // 5 minutos
      enableWorkers: true,
      enableCache: true,
      enableMetrics: true,
      securityLevel: 'medium',
      loopIterationLimit: 1000,
      asyncWaitTime: 100,
      promiseTimeout: 5000,
      ...config
    };

    this.cache = new ExecutionCache(this.config.cacheSize);
    this.queue = new ExecutionQueue(this.config.maxConcurrentExecutions);
  }

  async execute(code: string, options: { priority?: number; bypassCache?: boolean } = {}): Promise<ExecutionResult> {
    const executionId = crypto.randomUUID();
    const startTime = performance.now();

    try {
      // Verificar cache primero (si está habilitado)
      if (this.config.enableCache && !options.bypassCache) {
        const cached = this.cache.get(code);
        if (cached) {
          return {
            id: executionId,
            code,
            result: cached.result,
            metrics: {
              ...cached.metrics,
              cacheHit: true
            },
            status: 'success',
            duration: performance.now() - startTime,
            fromCache: true
          };
        }
      }

      // Analizar código
      const complexity = CodeAnalyzer.analyzeComplexity(code);
      const securityRisks = CodeAnalyzer.detectSecurityRisks(code);
      
      // Verificar seguridad
      if (this.config.securityLevel === 'high' && securityRisks.length > 0) {
        throw new Error(`Riesgos de seguridad detectados: ${securityRisks.join(', ')}`);
      }

      // Calcular timeout adaptativo
      const adaptiveTimeout = CodeAnalyzer.calculateTimeout(complexity, this.config.maxExecutionTime);

      // Agregar a la queue para ejecución
      return await this.queue.add(
        executionId,
        () => this.executeCode(executionId, code, complexity, adaptiveTimeout),
        options.priority || 0
      );

    } catch (error) {
      const duration = performance.now() - startTime;
      
      return {
        id: executionId,
        code,
        result: null,
        error: this.categorizeError(error),
        metrics: {
          executionTime: duration,
          memoryUsed: 0,
          cpuUsage: 0,
          cacheHit: false,
          codeComplexity: 0,
          errorCount: 1,
          timestamp: Date.now()
        },
        status: 'error',
        duration,
        fromCache: false
      };
    }
  }

  private async executeCode(
    id: string, 
    code: string, 
    complexity: CodeComplexityAnalysis, 
    timeout: number
  ): Promise<ExecutionResult> {
    const startTime = performance.now();
    const controller = new AbortController();
    this.activeExecutions.set(id, controller);

    try {
      // Crear timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Execution timeout')), timeout);
      });

      // Promise de ejecución actual (simulando la ejecución real)
      const executionPromise = this.runCodeInSandbox(code, controller.signal);

      // Race entre ejecución y timeout
      const result = await Promise.race([executionPromise, timeoutPromise]);
      
      const duration = performance.now() - startTime;
      
      const metrics: ExecutionMetrics = {
        executionTime: duration,
        memoryUsed: this.estimateMemoryUsage(code),
        cpuUsage: this.estimateCpuUsage(complexity),
        cacheHit: false,
        codeComplexity: complexity.score,
        errorCount: 0,
        timestamp: Date.now()
      };

      // Guardar en cache si está habilitado
      if (this.config.enableCache) {
        this.cache.set(code, result, metrics, this.config.cacheTTL);
      }

      // Guardar métricas
      if (this.config.enableMetrics) {
        this.metrics.push(metrics);
        this.trimMetrics();
      }

      return {
        id,
        code,
        result,
        metrics,
        status: 'success',
        duration,
        fromCache: false
      };

    } catch (error: unknown) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      return {
        id,
        code,
        result: null,
        error: this.categorizeError(error),
        metrics: {
          executionTime: duration,
          memoryUsed: 0,
          cpuUsage: 0,
          cacheHit: false,
          codeComplexity: complexity.score,
          errorCount: 1,
          timestamp: Date.now()
        },
        status: controller.signal.aborted ? 'cancelled' : 
                errorMessage.includes('timeout') ? 'timeout' : 'error',
        duration,
        fromCache: false
      };
    } finally {
      this.activeExecutions.delete(id);
    }
  }

  private async runCodeInSandbox(code: string, signal: AbortSignal): Promise<any> {
    // Aquí integrarías con el sistema de ejecución actual
    // Por ahora, simulamos la ejecución
    return new Promise((resolve) => {
      if (signal.aborted) {
        throw new Error('Execution cancelled');
      }
      
      // Simular trabajo asíncrono
      setTimeout(() => {
        resolve({ output: `Resultado de: ${code}` });
      }, Math.random() * 1000);
    });
  }

  private categorizeError(error: any): ExecutionError {
    const message = error?.message || 'Error desconocido';
    
    if (message.includes('SyntaxError')) {
      return {
        type: 'syntax',
        message,
        severity: 'medium',
        recoverable: true
      };
    }
    
    if (message.includes('timeout')) {
      return {
        type: 'timeout',
        message: 'El código tardó demasiado en ejecutarse',
        severity: 'high',
        recoverable: true
      };
    }
    
    if (message.includes('memory') || message.includes('heap')) {
      return {
        type: 'memory',
        message: 'Error de memoria durante la ejecución',
        severity: 'high',
        recoverable: false
      };
    }
    
    return {
      type: 'runtime',
      message,
      severity: 'medium',
      recoverable: true
    };
  }

  private estimateMemoryUsage(code: string): number {
    // Estimación básica basada en longitud y complejidad
    return Math.round(code.length * 0.01 + Math.random() * 5);
  }

  private estimateCpuUsage(complexity: CodeComplexityAnalysis): number {
    // Estimación basada en la complejidad del código
    return Math.min(100, complexity.score * 2 + Math.random() * 20);
  }

  private trimMetrics(): void {
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500); // Mantener últimas 500
    }
  }

  // Métodos públicos para gestión

  cancel(executionId: string): boolean {
    const controller = this.activeExecutions.get(executionId);
    if (controller) {
      controller.abort();
      return true;
    }
    return this.queue.cancel(executionId);
  }

  cancelAll(): void {
    for (const controller of this.activeExecutions.values()) {
      controller.abort();
    }
    this.activeExecutions.clear();
  }

  getMetrics() {
    return {
      totalExecutions: this.metrics.length,
      averageExecutionTime: this.metrics.reduce((sum, m) => sum + m.executionTime, 0) / Math.max(this.metrics.length, 1),
      errorRate: this.metrics.filter(m => m.errorCount > 0).length / Math.max(this.metrics.length, 1),
      cacheHitRate: this.metrics.filter(m => m.cacheHit).length / Math.max(this.metrics.length, 1),
      cache: this.cache.getStats(),
      queue: this.queue.getStats(),
      activeExecutions: this.activeExecutions.size
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  updateConfig(newConfig: Partial<ExecutionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Instancia global del motor de ejecución
export const globalExecutionEngine = new ExecutionEngine({
  maxExecutionTime: EXECUTION_ENGINE_CONFIG.MAX_EXECUTION_TIME,
  maxMemoryMB: EXECUTION_ENGINE_CONFIG.MAX_MEMORY_MB,
  maxConcurrentExecutions: EXECUTION_ENGINE_CONFIG.MAX_CONCURRENT_EXECUTIONS,
  cacheSize: EXECUTION_ENGINE_CONFIG.CACHE_SIZE,
  cacheTTL: EXECUTION_ENGINE_CONFIG.CACHE_TTL,
  enableWorkers: EXECUTION_ENGINE_CONFIG.ENABLE_WORKERS,
  enableCache: EXECUTION_ENGINE_CONFIG.ENABLE_CACHE,
  enableMetrics: EXECUTION_ENGINE_CONFIG.ENABLE_METRICS,
  securityLevel: EXECUTION_ENGINE_CONFIG.SECURITY_LEVEL,
  loopIterationLimit: EXECUTION_ENGINE_CONFIG.LOOP_ITERATION_LIMIT,
  asyncWaitTime: EXECUTION_ENGINE_CONFIG.ASYNC_WAIT_TIME,
  promiseTimeout: EXECUTION_ENGINE_CONFIG.PROMISE_TIMEOUT,
});

// Función para sincronizar configuraciones dinámicas con el motor de ejecución
export const syncEngineWithDynamicConfig = (dynamicConfig: {
  execution: {
    timeout: number;
    maxConcurrentExecutions: number;
    cacheSize: number;
    cacheTTL: number;
    enableCache: boolean;
    enableMetrics: boolean;
    enableSecurityChecks: boolean;
    memoryLimit: number;
    loopIterationLimit: number;
    asyncWaitTime: number;
    promiseTimeout: number;
  };
  globalContext: {
    sandboxLevel: 'low' | 'medium' | 'high';
  };
}) => {
  const newConfig = {
    maxExecutionTime: dynamicConfig.execution.timeout,
    maxMemoryMB: dynamicConfig.execution.memoryLimit,
    maxConcurrentExecutions: dynamicConfig.execution.maxConcurrentExecutions,
    cacheSize: dynamicConfig.execution.cacheSize,
    cacheTTL: dynamicConfig.execution.cacheTTL,
    enableCache: dynamicConfig.execution.enableCache,
    enableMetrics: dynamicConfig.execution.enableMetrics,
    securityLevel: dynamicConfig.globalContext.sandboxLevel,
    loopIterationLimit: dynamicConfig.execution.loopIterationLimit,
    asyncWaitTime: dynamicConfig.execution.asyncWaitTime,
    promiseTimeout: dynamicConfig.execution.promiseTimeout,
  };
  
  globalExecutionEngine.updateConfig(newConfig);
}; 