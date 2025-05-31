/**
 * ========================
 * 🎯 GESTOR PRINCIPAL DE SESIONES
 * ========================
 * 
 * Orquesta todo el sistema de autoguardado y restauración de sesiones
 */

import { 
  SessionData, 
  SessionSaveOptions, 
  SessionRestoreOptions, 
  AutoSaveConfig, 
  SessionEvent, 
  SessionEventHandler,
  SessionChange,
  WorkspaceFile,
  EditorSettings,
  CursorPosition,
  LayoutState,
  ExecutionState
} from './types';
import { BrowserStorageAdapter } from './StorageAdapter';
import { AutoSaveManager } from './AutoSaveManager';
import { SessionRestorer } from './SessionRestorer';

export class SessionManager {
  private static instance: SessionManager | null = null;
  private storage: BrowserStorageAdapter;
  private autoSave: AutoSaveManager;
  private restorer: SessionRestorer;
  private isInitialized = false;
  private currentSession: SessionData | null = null;
  private eventHandlers: Set<SessionEventHandler> = new Set();

  // Referencias a los contextos de la aplicación
  private workspaceActions: any = null;
  private workspaceUtils: any = null;
  private themeManager: any = null;

  private constructor() {
    this.storage = BrowserStorageAdapter.getInstance();
    this.autoSave = new AutoSaveManager(this.storage, this.getDefaultAutoSaveConfig());
    this.restorer = new SessionRestorer(this.storage);
    this.setupEventHandlers();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Inicializa el sistema de sesiones
   */
  async initialize(options: {
    workspaceActions?: any;
    workspaceUtils?: any;
    themeManager?: any;
  } = {}): Promise<SessionData | null> {
    if (this.isInitialized) {
      console.warn('⚠️ SessionManager ya está inicializado');
      return this.currentSession;
    }

    console.log('🚀 Inicializando SessionManager...');

    try {
      // Configurar referencias a contextos
      this.workspaceActions = options.workspaceActions;
      this.workspaceUtils = options.workspaceUtils;
      this.themeManager = options.themeManager;

      // Configurar provider de datos para el AutoSaveManager
      this.autoSave.setSessionDataProvider(async () => {
        return await this.getCurrentSessionData();
      });

      // Configurar event listeners de la aplicación
      this.setupApplicationEventHandlers();

      // Intentar restaurar sesión anterior
      const restoredSession = await this.restoreSession();

      if (restoredSession) {
        await this.applySessionToApplication(restoredSession);
        this.currentSession = restoredSession;
        console.log('✅ Sesión restaurada y aplicada exitosamente');
      } else {
        // Crear sesión nueva
        this.currentSession = await this.createNewSession();
        console.log('ℹ️ Nueva sesión creada');
      }

      this.isInitialized = true;

      // Emit evento de inicialización
      this.emit({
        type: 'restore',
        timestamp: Date.now(),
        data: { 
          restored: !!restoredSession,
          fileCount: this.currentSession?.workspace.files.length || 0
        }
      });

      return this.currentSession;

    } catch (error) {
      console.error('❌ Error inicializando SessionManager:', error);
      
      // Crear sesión mínima de emergencia
      this.currentSession = await this.createNewSession();
      this.isInitialized = true;
      
      this.emit({
        type: 'error',
        timestamp: Date.now(),
        error: `Error en inicialización: ${error}`
      });

      return this.currentSession;
    }
  }

  /**
   * Guarda la sesión actual
   */
  async saveSession(options: SessionSaveOptions = {}): Promise<boolean> {
    if (!this.isInitialized) {
      console.warn('⚠️ SessionManager no está inicializado');
      return false;
    }

    try {
      const sessionData = await this.getCurrentSessionData();
      if (!sessionData) {
        console.warn('⚠️ No hay datos de sesión para guardar');
        return false;
      }

      if (options.immediate) {
        return await this.autoSave.saveImmediate('manual');
      } else {
        // Usar autoguardado con debounce
        this.autoSave.saveWithDebounce(sessionData);
        return true;
      }
    } catch (error) {
      console.error('❌ Error guardando sesión:', error);
      return false;
    }
  }

  /**
   * Restaura una sesión
   */
  async restoreSession(options: SessionRestoreOptions = {}): Promise<SessionData | null> {
    try {
      console.log('🔄 Restaurando sesión...');
      
      const sessionData = await this.restorer.restoreSession(options);
      
      if (sessionData) {
        this.currentSession = sessionData;
        console.log('✅ Sesión restaurada exitosamente');
        
        this.emit({
          type: 'restore',
          timestamp: Date.now(),
          data: { 
            fileCount: sessionData.workspace.files.length,
            version: sessionData.version
          }
        });
      }

      return sessionData;
    } catch (error) {
      console.error('❌ Error restaurando sesión:', error);
      
      this.emit({
        type: 'error',
        timestamp: Date.now(),
        error: `Error restaurando sesión: ${error}`
      });

      return null;
    }
  }

  /**
   * Registra un cambio en la aplicación para optimizar el autoguardado
   */
  registerChange(change: SessionChange): void {
    if (!this.isInitialized) return;

    console.log(`📝 Cambio registrado: ${change.type}`, change);
    
    // Actualizar sesión actual si es necesario
    this.updateCurrentSessionFromChange(change);
    
    // Notificar al autoguardado
    this.autoSave.registerChange(change);
  }

  /**
   * Obtiene los datos actuales de la sesión desde la aplicación
   */
  private async getCurrentSessionData(): Promise<SessionData | null> {
    try {
      if (!this.workspaceUtils) {
        console.warn('⚠️ workspaceUtils no está disponible');
        return this.currentSession;
      }

      // Obtener estado actual del workspace
      const workspaceState = this.workspaceUtils.getState();
      const activeFile = this.workspaceUtils.getActiveFile();

      // Obtener configuraciones del editor
      const editorSettings = this.getCurrentEditorSettings();

      // Crear datos de sesión actualizados
      const sessionData: SessionData = {
        version: '1.0.0',
        timestamp: Date.now(),
        sessionId: this.currentSession?.sessionId || this.generateSessionId(),
        workspace: {
          activeFileId: activeFile?.id || null,
          files: workspaceState.files || [],
          layout: {
            splitDirection: this.getCurrentSplitDirection(),
            splitSizes: this.getCurrentSplitSizes(),
            activeFileId: activeFile?.id || null
          }
        },
        editor: {
          cursorPositions: this.getCurrentCursorPositions(),
          scrollPositions: this.getCurrentScrollPositions(),
          settings: editorSettings
        },
        execution: {
          lastResults: null, // Se puede agregar desde el contexto
          installedPackages: this.getCurrentInstalledPackages(),
          lastExecutionTime: Date.now()
        },
        metadata: {
          totalSize: 0, // Se calculará al guardar
          fileCount: workspaceState.files?.length || 0,
          lastAccess: Date.now()
        }
      };

      return sessionData;
    } catch (error) {
      console.error('❌ Error obteniendo datos de sesión actuales:', error);
      return this.currentSession;
    }
  }

  /**
   * Aplica una sesión restaurada a la aplicación
   */
  private async applySessionToApplication(sessionData: SessionData): Promise<void> {
    try {
      console.log('🔄 Aplicando sesión a la aplicación...');

      // 1. Restaurar archivos del workspace
      if (this.workspaceActions && sessionData.workspace.files.length > 0) {
        console.log(`📂 Restaurando ${sessionData.workspace.files.length} archivos...`);
        
        // Limpiar archivos existentes
        const currentState = this.workspaceUtils?.getState();
        if (currentState?.files) {
          for (const file of currentState.files) {
            this.workspaceActions.removeFile(file.id);
          }
        }

        // Agregar archivos restaurados
        for (const file of sessionData.workspace.files) {
          this.workspaceActions.addFile(
            file.name,
            file.language,
            file.content,
            file.id
          );
        }

        // Establecer archivo activo
        if (sessionData.workspace.activeFileId) {
          this.workspaceActions.setActiveFile(sessionData.workspace.activeFileId);
        }
      }

      // 2. Restaurar configuraciones del editor
      if (sessionData.editor.settings && this.themeManager) {
        console.log('🎨 Restaurando configuraciones del editor...');
        
        if (sessionData.editor.settings.theme) {
          this.themeManager.setTheme(sessionData.editor.settings.theme);
        }
      }

      // 3. Restaurar layout
      if (sessionData.workspace.layout) {
        console.log('📏 Restaurando layout...');
        this.applySplitLayout(sessionData.workspace.layout);
      }

      // 4. Programar restauración de posiciones de cursor (después de que Monaco se monte)
      if (Object.keys(sessionData.editor.cursorPositions).length > 0) {
        console.log('📍 Programando restauración de cursores...');
        
        setTimeout(() => {
          this.restoreCursorPositions(sessionData.editor.cursorPositions);
        }, 1000); // Esperar a que Monaco se monte
      }

      console.log('✅ Sesión aplicada exitosamente a la aplicación');

    } catch (error) {
      console.error('❌ Error aplicando sesión a la aplicación:', error);
    }
  }

  /**
   * Crea una nueva sesión vacía
   */
  private async createNewSession(): Promise<SessionData> {
    return {
      version: '1.0.0',
      timestamp: Date.now(),
      sessionId: this.generateSessionId(),
      workspace: {
        activeFileId: null,
        files: [],
        layout: {
          splitDirection: 'horizontal',
          splitSizes: [50, 50],
          activeFileId: null
        }
      },
      editor: {
        cursorPositions: {},
        scrollPositions: {},
        settings: {
          theme: 'vs-dark',
          fontSize: 14,
          wordWrap: true,
          minimap: false,
          lineNumbers: true
        }
      },
      execution: {
        lastResults: null,
        installedPackages: [],
        lastExecutionTime: 0
      },
      metadata: {
        totalSize: 0,
        fileCount: 0,
        lastAccess: Date.now()
      }
    };
  }

  /**
   * Configuración por defecto del autoguardado
   */
  private getDefaultAutoSaveConfig(): AutoSaveConfig {
    return {
      enabled: true,
      debounceTime: 1000,
      maxRetries: 3,
      retryDelay: 500,
      adaptiveFrequency: true,
      pauseOnTyping: true
    };
  }

  /**
   * Configura los event handlers del sistema
   */
  private setupEventHandlers(): void {
    // Handler para eventos del autoguardado
    this.autoSave.addEventListener((event: SessionEvent) => {
      this.emit(event);
    });
  }

  /**
   * Configura los event handlers de la aplicación
   */
  private setupApplicationEventHandlers(): void {
    // Handler para beforeunload
    window.addEventListener('beforeunload', () => {
      console.log('🚪 Detectado beforeunload, guardando sesión de emergencia...');
      this.autoSave.onBeforeUnload();
    });

    // Handler para visibilitychange (usuario cambia de pestaña)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        console.log('👁️ Aplicación oculta, guardando sesión...');
        this.saveSession({ immediate: true });
      }
    });
  }

  /**
   * Actualiza la sesión actual basado en un cambio
   */
  private updateCurrentSessionFromChange(change: SessionChange): void {
    if (!this.currentSession) return;

    switch (change.type) {
      case 'cursor-moved':
        if (change.fileId && change.data.position) {
          this.currentSession.editor.cursorPositions[change.fileId] = change.data.position;
        }
        break;
        
      case 'layout-changed':
        if (change.data.layout) {
          this.currentSession.workspace.layout = { ...this.currentSession.workspace.layout, ...change.data.layout };
        }
        break;
        
      case 'settings-changed':
        if (change.data.settings) {
          this.currentSession.editor.settings = { ...this.currentSession.editor.settings, ...change.data.settings };
        }
        break;
    }

    this.currentSession.timestamp = Date.now();
    this.currentSession.metadata.lastAccess = Date.now();
  }

  /**
   * Métodos auxiliares para obtener estado actual de la aplicación
   */
  private getCurrentEditorSettings(): EditorSettings {
    // Implementar según el sistema de configuración actual
    return {
      theme: this.themeManager?.getCurrentTheme() || 'vs-dark',
      fontSize: 14,
      wordWrap: true,
      minimap: false,
      lineNumbers: true
    };
  }

  private getCurrentSplitDirection(): 'horizontal' | 'vertical' {
    // Implementar según el sistema de layout actual
    return localStorage.getItem('split-direction') as 'horizontal' | 'vertical' || 'horizontal';
  }

  private getCurrentSplitSizes(): number[] {
    // Implementar según el sistema de layout actual
    const saved = localStorage.getItem('split-sizes');
    return saved ? JSON.parse(saved) : [50, 50];
  }

  private getCurrentCursorPositions(): Record<string, CursorPosition> {
    // Se mantiene en memoria durante la sesión
    return this.currentSession?.editor.cursorPositions || {};
  }

  private getCurrentScrollPositions(): Record<string, number> {
    // Se mantiene en memoria durante la sesión
    return this.currentSession?.editor.scrollPositions || {};
  }

  private getCurrentInstalledPackages(): string[] {
    // Implementar según el sistema de paquetes actual
    return [];
  }

  private applySplitLayout(layout: LayoutState): void {
    // Implementar según el sistema de layout actual
    localStorage.setItem('split-direction', layout.splitDirection);
    localStorage.setItem('split-sizes', JSON.stringify(layout.splitSizes));
  }

  private restoreCursorPositions(positions: Record<string, CursorPosition>): void {
    // Implementar restauración de cursores con Monaco
    console.log('📍 Restaurando posiciones de cursor:', positions);
    // Esta función será conectada con el editor Monaco
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * API pública para componentes
   */

  // Configuración del autoguardado
  setAutoSaveEnabled(enabled: boolean): void {
    this.autoSave.setEnabled(enabled);
  }

  updateAutoSaveConfig(config: Partial<AutoSaveConfig>): void {
    this.autoSave.updateConfig(config);
  }

  // Gestión de eventos
  addEventListener(handler: SessionEventHandler): void {
    this.eventHandlers.add(handler);
  }

  removeEventListener(handler: SessionEventHandler): void {
    this.eventHandlers.delete(handler);
  }

  // Estado del sistema
  getStats(): any {
    return {
      autoSave: this.autoSave.getStats(),
      storage: this.storage.getMetrics(),
      currentSession: this.currentSession ? {
        fileCount: this.currentSession.workspace.files.length,
        lastAccess: this.currentSession.metadata.lastAccess,
        size: this.currentSession.metadata.totalSize
      } : null
    };
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  getCurrentSession(): SessionData | null {
    return this.currentSession;
  }

  // Limpieza
  async cleanup(): Promise<void> {
    console.log('🧹 Limpiando SessionManager...');
    
    // Guardar sesión final
    await this.saveSession({ immediate: true });
    
    // Limpiar recursos
    this.autoSave.cleanup();
    await this.restorer.cleanupOldSessions();
    
    // Limpiar event handlers
    this.eventHandlers.clear();
    
    console.log('✅ SessionManager limpiado');
  }

  /**
   * Emitir evento a todos los handlers
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
} 