/**
 * ========================
 * 🔄 RESTAURADOR DE SESIONES
 * ========================
 * 
 * Maneja la restauración de sesiones con migración, validación y recuperación de errores
 */

import { SessionData, SessionRestoreOptions, MigrationResult, SessionError, WorkspaceFile, EditorSettings, CursorPosition } from './types';
import { BrowserStorageAdapter } from './StorageAdapter';

export class SessionRestorer {
  private storage: BrowserStorageAdapter;
  private currentVersion = '1.0.0';
  
  constructor(storage: BrowserStorageAdapter) {
    this.storage = storage;
  }

  /**
   * Restaura una sesión con todas las validaciones y migraciones necesarias
   */
  async restoreSession(options: SessionRestoreOptions = {}): Promise<SessionData | null> {
    const defaultOptions: SessionRestoreOptions = {
      lazy: false,
      validateIntegrity: true,
      fallbackToPartial: true,
      migrateIfNeeded: true,
      ...options
    };

    console.log('🔄 Iniciando restauración de sesión...', defaultOptions);

    try {
      // 1. Intentar cargar sesión principal
      let sessionData = await this.loadMainSession();
      
      // 2. Si no hay sesión principal, intentar sesión de emergencia
      if (!sessionData) {
        sessionData = await this.loadEmergencySession();
      }
      
      // 3. Si no hay datos, intentar migrar desde el sistema anterior
      if (!sessionData) {
        sessionData = await this.migrateLegacyData();
      }

      if (!sessionData) {
        console.log('ℹ️ No se encontró sesión anterior para restaurar');
        return null;
      }

      // 4. Validar integridad si está habilitado
      if (defaultOptions.validateIntegrity && sessionData) {
        const isValid = await this.validateSessionIntegrity(sessionData);
        if (!isValid) {
          console.warn('⚠️ Sesión con problemas de integridad detectada');
          
          if (defaultOptions.fallbackToPartial) {
            sessionData = await this.createPartialSession(sessionData);
          } else {
            throw new Error('Sesión corrupta y fallback deshabilitado');
          }
        }
      }

      // 5. Migrar si es necesario
      if (defaultOptions.migrateIfNeeded && sessionData && sessionData.version !== this.currentVersion) {
        console.log(`🔧 Migrando sesión de v${sessionData.version} a v${this.currentVersion}`);
        
        const migrationResult = await this.migrateSession(sessionData);
        
        if (migrationResult.success) {
          sessionData = await this.loadMainSession(); // Recargar después de migración
          console.log('✅ Migración exitosa');
        } else {
          console.warn('⚠️ Migración parcialmente exitosa:', migrationResult.errors);
          
          if (!defaultOptions.fallbackToPartial) {
            throw new Error('Migración falló y fallback deshabilitado');
          }
        }
      }

      // 6. Preparar sesión para restauración
      const preparedSession = await this.prepareSessionForRestore(sessionData, defaultOptions);

      console.log('✅ Sesión restaurada exitosamente:', {
        version: preparedSession.version,
        fileCount: preparedSession.workspace.files.length,
        activeFile: preparedSession.workspace.activeFileId,
        totalSize: preparedSession.metadata.totalSize
      });

      return preparedSession;

    } catch (error) {
      console.error('❌ Error durante restauración de sesión:', error);
      
      if (defaultOptions.fallbackToPartial) {
        console.log('🔄 Intentando crear sesión mínima de recuperación...');
        return await this.createMinimalSession();
      }
      
      throw error;
    }
  }

  /**
   * Carga la sesión principal desde el storage
   */
  private async loadMainSession(): Promise<SessionData | null> {
    try {
      const sessionData = await this.storage.load('session');
      
      if (sessionData && this.isValidSessionStructure(sessionData)) {
        console.log('📂 Sesión principal cargada');
        return sessionData;
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️ Error cargando sesión principal:', error);
      return null;
    }
  }

  /**
   * Carga la sesión de emergencia (guardada en beforeUnload)
   */
  private async loadEmergencySession(): Promise<SessionData | null> {
    try {
      const emergencyData = localStorage.getItem('jsrunner_emergency_session');
      
      if (emergencyData) {
        const parsed = JSON.parse(emergencyData);
        
        if (parsed.data && this.isValidSessionStructure(parsed.data)) {
          console.log('🚨 Sesión de emergencia cargada');
          
          // Limpiar sesión de emergencia después de cargar
          localStorage.removeItem('jsrunner_emergency_session');
          
          return parsed.data;
        }
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️ Error cargando sesión de emergencia:', error);
      return null;
    }
  }

  /**
   * Migra datos del sistema anterior (useAutoSave, etc.)
   */
  private async migrateLegacyData(): Promise<SessionData | null> {
    try {
      console.log('🔄 Intentando migrar datos del sistema anterior...');
      
      // Buscar datos del sistema anterior en localStorage
      const legacyKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('jsrunner_') && !key.includes('session_')
      );
      
      if (legacyKeys.length === 0) {
        return null;
      }

      // Crear sesión mínima y agregar datos migrados
      const migratedSession = await this.createMinimalSession();
      let migratedFiles = 0;

      for (const key of legacyKeys) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            // Intentar parsear y determinar qué tipo de dato es
            const parsed = JSON.parse(data);
            
            if (this.looksLikeFileData(parsed)) {
              const file = this.convertLegacyToFile(key, parsed);
              if (file) {
                migratedSession.workspace.files.push(file);
                migratedFiles++;
              }
            } else if (this.looksLikeSettings(parsed)) {
              // Migrar configuraciones del editor
              this.applyLegacySettings(migratedSession, parsed);
            }
          }
        } catch (error) {
          console.warn(`⚠️ Error migrando ${key}:`, error);
        }
      }

      if (migratedFiles > 0) {
        console.log(`✅ Migrados ${migratedFiles} archivos del sistema anterior`);
        
        // Establecer el primer archivo como activo
        if (migratedSession.workspace.files.length > 0) {
          migratedSession.workspace.activeFileId = migratedSession.workspace.files[0].id;
        }
        
        return migratedSession;
      }

      return null;
    } catch (error) {
      console.error('❌ Error durante migración de datos anteriores:', error);
      return null;
    }
  }

  /**
   * Valida la integridad de una sesión
   */
  private async validateSessionIntegrity(sessionData: SessionData): Promise<boolean> {
    try {
      const issues: string[] = [];

      // Validar estructura básica
      if (!this.isValidSessionStructure(sessionData)) {
        issues.push('Estructura de sesión inválida');
      }

      // Validar archivos
      if (sessionData.workspace?.files) {
        for (const file of sessionData.workspace.files) {
          if (!file.id || !file.name || typeof file.content !== 'string') {
            issues.push(`Archivo corrupto: ${file.name || 'sin nombre'}`);
          }
        }
      }

      // Validar archivo activo
      if (sessionData.workspace?.activeFileId) {
        const activeFileExists = sessionData.workspace.files.some(
          file => file.id === sessionData.workspace.activeFileId
        );
        
        if (!activeFileExists) {
          issues.push('Archivo activo no existe en la lista de archivos');
          // Auto-reparar: establecer primer archivo como activo
          if (sessionData.workspace.files.length > 0) {
            sessionData.workspace.activeFileId = sessionData.workspace.files[0].id;
            console.log('🔧 Auto-reparado: archivo activo establecido automáticamente');
          }
        }
      }

      // Validar posiciones de cursor
      if (sessionData.editor?.cursorPositions) {
        Object.entries(sessionData.editor.cursorPositions).forEach(([fileId, position]) => {
          if (!position || typeof position.line !== 'number' || typeof position.column !== 'number') {
            issues.push(`Posición de cursor inválida para archivo ${fileId}`);
            delete sessionData.editor.cursorPositions[fileId];
          }
        });
      }

      // Validar timestamps
      if (sessionData.timestamp && sessionData.timestamp > Date.now()) {
        issues.push('Timestamp de sesión en el futuro');
        sessionData.timestamp = Date.now();
      }

      // Log de issues pero no fallar por problemas menores
      if (issues.length > 0) {
        console.warn('⚠️ Problemas de integridad detectados:', issues);
        return issues.length <= 3; // Tolerar hasta 3 problemas menores
      }

      return true;
    } catch (error) {
      console.error('❌ Error validando integridad de sesión:', error);
      return false;
    }
  }

  /**
   * Migra una sesión a la versión actual
   */
  private async migrateSession(sessionData: SessionData): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      fromVersion: sessionData.version,
      toVersion: this.currentVersion,
      migratedFiles: 0,
      errors: []
    };

    try {
      console.log(`🔧 Migrando sesión desde v${sessionData.version} a v${this.currentVersion}`);

      // Crear backup antes de migrar
      await this.storage.createBackup('session');

      // Aplicar migraciones paso a paso
      let currentData = { ...sessionData };

      // Migración 0.x → 1.0.0
      if (sessionData.version < '1.0.0') {
        currentData = await this.migrateToV1(currentData);
        result.migratedFiles = currentData.workspace?.files?.length || 0;
      }

      // Aquí se pueden agregar más migraciones futuras
      // if (sessionData.version < '1.1.0') {
      //   currentData = await this.migrateToV1_1(currentData);
      // }

      // Actualizar versión y guardar
      currentData.version = this.currentVersion;
      currentData.timestamp = Date.now();

      await this.storage.save('session', currentData, true);

      result.success = true;
      console.log('✅ Migración completada exitosamente');

    } catch (error) {
      result.errors.push(`Error general de migración: ${error}`);
      console.error('❌ Error durante migración:', error);
    }

    return result;
  }

  /**
   * Migración específica a la versión 1.0.0
   */
  private async migrateToV1(sessionData: any): Promise<SessionData> {
    const migratedData: SessionData = {
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

    // Migrar datos si existen
    if (sessionData.workspace) {
      if (sessionData.workspace.files) {
        migratedData.workspace.files = sessionData.workspace.files.map((file: any) => ({
          id: file.id || this.generateFileId(),
          name: file.name || 'archivo.js',
          content: file.content || '',
          language: file.language || 'javascript',
          isUnsaved: file.isUnsaved || false,
          lastModified: file.lastModified || Date.now()
        }));
      }

      if (sessionData.workspace.activeFileId) {
        migratedData.workspace.activeFileId = sessionData.workspace.activeFileId;
        migratedData.workspace.layout.activeFileId = sessionData.workspace.activeFileId;
      }
    }

    if (sessionData.editor) {
      if (sessionData.editor.cursorPositions) {
        migratedData.editor.cursorPositions = sessionData.editor.cursorPositions;
      }
      
      if (sessionData.editor.settings) {
        migratedData.editor.settings = { ...migratedData.editor.settings, ...sessionData.editor.settings };
      }
    }

    // Actualizar metadata
    migratedData.metadata.fileCount = migratedData.workspace.files.length;
    migratedData.metadata.totalSize = JSON.stringify(migratedData).length;

    return migratedData;
  }

  /**
   * Crea una sesión parcial conservando solo los datos válidos
   */
  private async createPartialSession(corruptedData: SessionData): Promise<SessionData> {
    console.log('🔧 Creando sesión parcial a partir de datos corruptos...');
    
    const partialSession = await this.createMinimalSession();

    try {
      // Intentar rescatar archivos válidos
      if (corruptedData.workspace?.files) {
        const validFiles = corruptedData.workspace.files.filter(file => 
          file && file.id && file.name && typeof file.content === 'string'
        );
        
        partialSession.workspace.files = validFiles;
        
        // Establecer archivo activo si es válido
        if (corruptedData.workspace.activeFileId && 
            validFiles.some(f => f.id === corruptedData.workspace.activeFileId)) {
          partialSession.workspace.activeFileId = corruptedData.workspace.activeFileId;
        } else if (validFiles.length > 0) {
          partialSession.workspace.activeFileId = validFiles[0].id;
        }
      }

      // Intentar rescatar configuraciones del editor
      if (corruptedData.editor?.settings) {
        partialSession.editor.settings = {
          ...partialSession.editor.settings,
          ...corruptedData.editor.settings
        };
      }

      // Intentar rescatar posiciones de cursor válidas
      if (corruptedData.editor?.cursorPositions) {
        Object.entries(corruptedData.editor.cursorPositions).forEach(([fileId, position]) => {
          if (position && typeof position.line === 'number' && typeof position.column === 'number') {
            partialSession.editor.cursorPositions[fileId] = position;
          }
        });
      }

      console.log(`✅ Sesión parcial creada con ${partialSession.workspace.files.length} archivos válidos`);
      
    } catch (error) {
      console.warn('⚠️ Error creando sesión parcial, usando sesión mínima:', error);
    }

    return partialSession;
  }

  /**
   * Crea una sesión mínima de emergencia
   */
  private async createMinimalSession(): Promise<SessionData> {
    return {
      version: this.currentVersion,
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
   * Prepara la sesión para ser restaurada (lazy loading, etc.)
   */
  private async prepareSessionForRestore(
    sessionData: SessionData, 
    options: SessionRestoreOptions
  ): Promise<SessionData> {
    
    if (options.lazy && sessionData.workspace.files.length > 5) {
      console.log('⚡ Aplicando carga lazy para archivos grandes...');
      
      // Solo cargar el archivo activo completamente, los demás como placeholders
      const activeFileId = sessionData.workspace.activeFileId;
      
      sessionData.workspace.files = sessionData.workspace.files.map(file => {
        if (file.id !== activeFileId && file.content.length > 1000) {
          // Crear placeholder para archivos grandes
          return {
            ...file,
            content: `// Archivo ${file.name} - Contenido cargado bajo demanda\n// ${file.content.length} caracteres`,
            isLazyLoaded: true
          } as any;
        }
        return file;
      });
    }

    // Actualizar timestamps
    sessionData.metadata.lastAccess = Date.now();
    
    return sessionData;
  }

  /**
   * Utilidades para validación y conversión
   */
  private isValidSessionStructure(data: any): boolean {
    return data && 
           typeof data === 'object' &&
           data.version &&
           data.workspace &&
           data.editor &&
           data.execution &&
           data.metadata;
  }

  private looksLikeFileData(data: any): boolean {
    return data && 
           (data.content || data.code) &&
           typeof (data.content || data.code) === 'string';
  }

  private looksLikeSettings(data: any): boolean {
    return data &&
           (data.theme || data.fontSize || data.autoSave);
  }

  private convertLegacyToFile(key: string, data: any): WorkspaceFile | null {
    try {
      return {
        id: this.generateFileId(),
        name: this.extractFileNameFromKey(key),
        content: data.content || data.code || '',
        language: 'javascript',
        isUnsaved: false,
        lastModified: Date.now()
      };
    } catch (error) {
      return null;
    }
  }

  private applyLegacySettings(session: SessionData, data: any): void {
    if (data.theme) session.editor.settings.theme = data.theme;
    if (data.fontSize) session.editor.settings.fontSize = data.fontSize;
    // Agregar más mapeos según sea necesario
  }

  private extractFileNameFromKey(key: string): string {
    const cleaned = key.replace('jsrunner_', '').replace('_', '.');
    return cleaned || 'archivo.js';
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Limpia sesiones anteriores y datos obsoletos
   */
  async cleanupOldSessions(): Promise<void> {
    try {
      console.log('🧹 Limpiando sesiones anteriores...');
      
      const keys = await this.storage.getKeys();
      const currentTime = Date.now();
      const thirtyDaysAgo = currentTime - (30 * 24 * 60 * 60 * 1000);
      
      for (const key of keys) {
        if (key.includes('backup') || key.includes('legacy')) {
          try {
            const data = await this.storage.load(key);
            if (data && data.timestamp && data.timestamp < thirtyDaysAgo) {
              await this.storage.remove(key);
              console.log(`🗑️ Sesión antigua eliminada: ${key}`);
            }
          } catch (error) {
            // Si no se puede cargar, probablemente esté corrupto, eliminarlo
            await this.storage.remove(key);
            console.log(`🗑️ Sesión corrupta eliminada: ${key}`);
          }
        }
      }
      
      console.log('✅ Limpieza de sesiones completada');
    } catch (error) {
      console.error('❌ Error durante limpieza de sesiones:', error);
    }
  }
} 