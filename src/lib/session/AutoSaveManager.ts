/**
 * ========================
 * 💾 GESTOR DE AUTOGUARDADO INTELIGENTE
 * ========================
 * 
 * Maneja el autoguardado con debounce adaptativo y detección de patrones de uso
 */

import { SessionData, SessionSaveOptions, AutoSaveConfig, SessionEvent, SessionEventHandler, SessionChange, SessionChangeType } from './types';
import { BrowserStorageAdapter } from './StorageAdapter';

export class AutoSaveManager {
  private storage: BrowserStorageAdapter;
  private config: AutoSaveConfig;
  private saveTimeout: NodeJS.Timeout | null = null;
  private inactivityTimeout: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();
  private lastSave: number = 0;
  private isUserTyping: boolean = false;
  private typingTimeout: NodeJS.Timeout | null = null;
  private pendingChanges: SessionChange[] = [];
  private eventHandlers: Set<SessionEventHandler> = new Set();
  private stats = {
    totalSaves: 0,
    failedSaves: 0,
    averageSaveTime: 0,
    lastSaveSize: 0
  };

  constructor(
    storage: BrowserStorageAdapter,
    config: AutoSaveConfig
  ) {
    this.storage = storage;
    this.config = config;
    this.setupInactivityDetection();
  }

  /**
   * Configura la detección de inactividad para optimizar el autoguardado
   */
  private setupInactivityDetection(): void {
    // Detectar actividad global del usuario
    const activityEvents = ['keydown', 'mousemove', 'click', 'scroll'];
    
    const handleActivity = () => {
      this.lastActivity = Date.now();
      
      // Si el usuario estaba inactivo, puede que sea buen momento para guardar
      if (this.inactivityTimeout) {
        clearTimeout(this.inactivityTimeout);
      }
      
      // Reiniciar timer de inactividad
      this.inactivityTimeout = setTimeout(() => {
        this.onUserInactive();
      }, 5000); // 5 segundos de inactividad
    };

    // Agregar listeners globales
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Detectar cuando el usuario deja de escribir
    document.addEventListener('keydown', (e) => {
      // Solo para teclas de escritura (no navegación)
      if (e.key.length === 1 || ['Backspace', 'Delete', 'Enter'].includes(e.key)) {
        this.markUserTyping();
      }
    }, { passive: true });
  }

  /**
   * Marca al usuario como escribiendo activamente
   */
  private markUserTyping(): void {
    this.isUserTyping = true;
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    // Después de 1.5 segundos sin escribir, considerar que ya no está escribiendo
    this.typingTimeout = setTimeout(() => {
      this.isUserTyping = false;
      this.emit({
        type: 'save',
        timestamp: Date.now(),
        data: { reason: 'typing_stopped' }
      });
      
      // Guardar inmediatamente cuando deja de escribir
      this.triggerSaveAfterTyping();
    }, 1500);
  }

  /**
   * Se ejecuta cuando el usuario está inactivo
   */
  private onUserInactive(): void {
    console.log('👤 Usuario inactivo detectado, guardando sesión...');
    this.saveImmediate('user_inactive');
  }

  /**
   * Programa un autoguardado con debounce inteligente
   */
  saveWithDebounce(sessionData: SessionData, change?: SessionChange): void {
    if (!this.config.enabled) return;

    // Agregar cambio a la cola
    if (change) {
      this.pendingChanges.push(change);
      
      // Mantener solo los últimos 50 cambios
      if (this.pendingChanges.length > 50) {
        this.pendingChanges = this.pendingChanges.slice(-50);
      }
    }

    // Calcular debounce adaptativo
    const debounceTime = this.calculateAdaptiveDebounce(change);
    
    // Si el usuario está escribiendo y configurado para pausar, esperar
    if (this.config.pauseOnTyping && this.isUserTyping) {
      console.log('⏸️ Pausando autoguardado - usuario escribiendo');
      return;
    }

    // Limpiar timeout anterior
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Programar nuevo guardado
    this.saveTimeout = setTimeout(async () => {
      await this.performSave(sessionData, 'debounced');
    }, debounceTime);

    console.log(`⏰ Autoguardado programado en ${debounceTime}ms (cambio: ${change?.type || 'general'})`);
  }

  /**
   * Calcula el tiempo de debounce basado en el tipo de cambio y actividad del usuario
   */
  private calculateAdaptiveDebounce(change?: SessionChange): number {
    if (!this.config.adaptiveFrequency) {
      return this.config.debounceTime;
    }

    let baseTime = this.config.debounceTime;
    
    // Ajustar según tipo de cambio
    if (change) {
      switch (change.type) {
        case 'file-content':
          // Contenido de archivo - más frecuente si son cambios pequeños
          const changeSize = JSON.stringify(change.data).length;
          if (changeSize < 50) {
            baseTime *= 1.5; // Cambios pequeños, esperar más
          } else if (changeSize > 500) {
            baseTime *= 0.6; // Cambios grandes, guardar más rápido
          }
          break;
          
        case 'cursor-moved':
          baseTime *= 3; // Movimientos de cursor, menos prioritario
          break;
          
        case 'file-created':
        case 'file-deleted':
          baseTime *= 0.3; // Operaciones de archivo, muy prioritario
          break;
          
        case 'layout-changed':
          baseTime *= 0.8; // Cambios de layout, prioritario medio
          break;
          
        case 'settings-changed':
          baseTime *= 0.5; // Configuraciones, bastante prioritario
          break;
      }
    }

    // Ajustar según actividad reciente
    const timeSinceLastActivity = Date.now() - this.lastActivity;
    if (timeSinceLastActivity > 10000) { // 10 segundos sin actividad
      baseTime *= 0.5; // Usuario inactivo, guardar más rápido
    }

    // Ajustar según frecuencia de guardados recientes
    const timeSinceLastSave = Date.now() - this.lastSave;
    if (timeSinceLastSave < 5000) { // Guardado muy reciente
      baseTime *= 1.3; // Espaciar más los guardados
    }

    // Límites mínimos y máximos
    return Math.max(200, Math.min(5000, baseTime));
  }

  /**
   * Guarda inmediatamente sin debounce
   */
  async saveImmediate(reason: string = 'manual'): Promise<boolean> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    // Obtener datos actuales de la sesión
    const sessionData = await this.getCurrentSessionData();
    if (!sessionData) {
      console.warn('⚠️ No se pudieron obtener datos de sesión para guardado inmediato');
      return false;
    }

    return this.performSave(sessionData, reason);
  }

  /**
   * Se ejecuta cuando el usuario deja de escribir
   */
  private async triggerSaveAfterTyping(): Promise<void> {
    if (this.pendingChanges.length > 0) {
      console.log('💾 Guardando cambios pendientes después de escribir...');
      const sessionData = await this.getCurrentSessionData();
      if (sessionData) {
        await this.performSave(sessionData, 'typing_finished');
      }
    }
  }

  /**
   * Realiza el guardado efectivo
   */
  private async performSave(sessionData: SessionData, reason: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      this.stats.totalSaves++;
      
      const saveOptions: SessionSaveOptions = {
        immediate: true,
        compress: true,
        createBackup: this.stats.totalSaves % 10 === 0 // Backup cada 10 guardados
      };

      // Crear backup si es necesario
      if (saveOptions.createBackup) {
        await this.storage.createBackup('session');
      }

      // Actualizar timestamp y metadata
      sessionData.timestamp = Date.now();
      sessionData.metadata.lastAccess = Date.now();
      sessionData.metadata.totalSize = JSON.stringify(sessionData).length;

      // Guardar
      await this.storage.save('session', sessionData, saveOptions.compress);
      
      // Actualizar estadísticas
      const saveTime = Date.now() - startTime;
      this.stats.averageSaveTime = (this.stats.averageSaveTime + saveTime) / 2;
      this.stats.lastSaveSize = sessionData.metadata.totalSize;
      this.lastSave = Date.now();
      
      // Limpiar cambios pendientes
      this.pendingChanges = [];
      
      // Emitir evento de guardado exitoso
      this.emit({
        type: 'save',
        timestamp: Date.now(),
        data: { 
          reason, 
          size: sessionData.metadata.totalSize,
          duration: saveTime,
          changeCount: this.pendingChanges.length
        }
      });

      console.log(`✅ Sesión guardada exitosamente (${reason}) - ${sessionData.metadata.totalSize}B en ${saveTime}ms`);
      return true;

    } catch (error) {
      this.stats.failedSaves++;
      
      // Emitir evento de error
      this.emit({
        type: 'error',
        timestamp: Date.now(),
        error: `Error guardando sesión (${reason}): ${error}`
      });

      console.error(`❌ Error guardando sesión (${reason}):`, error);
      
      // Intentar reintento con backoff exponencial
      if (this.stats.failedSaves <= this.config.maxRetries) {
        const retryDelay = this.config.retryDelay * Math.pow(2, this.stats.failedSaves - 1);
        console.log(`🔄 Reintentando guardado en ${retryDelay}ms...`);
        
        setTimeout(() => {
          this.performSave(sessionData, `${reason}_retry_${this.stats.failedSaves}`);
        }, retryDelay);
      }

      return false;
    }
  }

  /**
   * Obtiene los datos actuales de la sesión (debe ser implementado por el SessionManager)
   */
  private async getCurrentSessionData(): Promise<SessionData | null> {
    // Esta función será implementada por el SessionManager
    // que tiene acceso al estado completo de la aplicación
    console.warn('⚠️ getCurrentSessionData debe ser implementado por SessionManager');
    return null;
  }

  /**
   * Registra un cambio específico para optimizar el autoguardado
   */
  registerChange(change: SessionChange): void {
    this.lastActivity = Date.now();
    
    // Determinar si es un cambio crítico que requiere guardado inmediato
    const criticalChanges: SessionChangeType[] = ['file-created', 'file-deleted'];
    
    if (criticalChanges.includes(change.type)) {
      console.log(`🚨 Cambio crítico detectado: ${change.type}, guardando inmediatamente`);
      this.saveImmediate(`critical_${change.type}`);
    } else {
      // Usar debounce normal para otros cambios
      console.log(`📝 Cambio registrado: ${change.type}`);
    }
  }

  /**
   * Configura el callback para obtener datos de sesión
   */
  setSessionDataProvider(provider: () => Promise<SessionData | null>): void {
    this.getCurrentSessionData = provider;
  }

  /**
   * Manejo de eventos del ciclo de vida de la aplicación
   */
  onBeforeUnload(): void {
    console.log('🚪 Detectado cierre de aplicación, guardando sesión...');
    
    // Guardado síncrono para before unload (limitado)
    try {
      const sessionData = this.getCurrentSessionData();
      if (sessionData) {
        // Usar localStorage directamente para guardado síncrono de emergencia
        localStorage.setItem('jsrunner_emergency_session', JSON.stringify({
          timestamp: Date.now(),
          data: sessionData
        }));
        console.log('💾 Sesión de emergencia guardada');
      }
    } catch (error) {
      console.error('❌ Error guardando sesión de emergencia:', error);
    }
  }

  /**
   * Habilitar/deshabilitar autoguardado
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    
    if (!enabled && this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    
    console.log(`🔄 Autoguardado ${enabled ? 'habilitado' : 'deshabilitado'}`);
  }

  /**
   * Actualizar configuración
   */
  updateConfig(newConfig: Partial<AutoSaveConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Configuración de autoguardado actualizada:', newConfig);
  }

  /**
   * Obtener estadísticas del autoguardado
   */
  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * Agregar listener de eventos
   */
  addEventListener(handler: SessionEventHandler): void {
    this.eventHandlers.add(handler);
  }

  /**
   * Remover listener de eventos
   */
  removeEventListener(handler: SessionEventHandler): void {
    this.eventHandlers.delete(handler);
  }

  /**
   * Emitir evento
   */
  private emit(event: SessionEvent): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('❌ Error en handler de evento de sesión:', error);
      }
    });
  }

  /**
   * Limpieza de recursos
   */
  cleanup(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
    }
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    this.eventHandlers.clear();
    console.log('🧹 AutoSaveManager limpiado');
  }
} 