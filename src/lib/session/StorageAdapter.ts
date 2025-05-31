/**
 * ========================
 * 💾 ADAPTADOR DE ALMACENAMIENTO
 * ========================
 * 
 * Maneja el almacenamiento con compresión, validación y fallbacks
 */

import { StorageAdapter, StorageMetrics, SessionError } from './types';

// Importar LZ-string dinámicamente para compresión
const importLZString = async () => {
  try {
    // @ts-ignore - Importación dinámica para evitar errores de bundle
    const LZString = await import('lz-string');
    return LZString.default || LZString;
  } catch {
    console.warn('⚠️ LZ-string no disponible, usando JSON sin compresión');
    return null;
  }
};

export class BrowserStorageAdapter implements StorageAdapter {
  private static instance: BrowserStorageAdapter | null = null;
  private LZString: any = null;
  private metrics: StorageMetrics = {
    totalSize: 0,
    usedSize: 0,
    compressionRatio: 1,
    operationCount: 0,
    lastCleanup: Date.now()
  };

  private constructor(private prefix: string = 'jsrunner_session_') {
    this.initializeCompression();
  }

  static getInstance(prefix?: string): BrowserStorageAdapter {
    if (!BrowserStorageAdapter.instance) {
      BrowserStorageAdapter.instance = new BrowserStorageAdapter(prefix);
    }
    return BrowserStorageAdapter.instance;
  }

  private async initializeCompression(): Promise<void> {
    try {
      this.LZString = await importLZString();
      console.log('✅ Compresión LZ-string inicializada');
    } catch (error) {
      console.warn('⚠️ Error inicializando compresión:', error);
    }
  }

  async save(key: string, data: any, compress: boolean = true): Promise<void> {
    const fullKey = this.prefix + key;
    this.metrics.operationCount++;

    try {
      // Serializar datos
      let serializedData = JSON.stringify(data);
      const originalSize = new Blob([serializedData]).size;

      // Comprimir si está habilitado y disponible
      if (compress && this.LZString && originalSize > 1024) {
        try {
          const compressed = this.LZString.compress(serializedData);
          if (compressed && compressed.length < serializedData.length) {
            serializedData = compressed;
            this.metrics.compressionRatio = originalSize / new Blob([compressed]).size;
            console.log(`🗜️ Compresión aplicada: ${originalSize}B → ${new Blob([compressed]).size}B (${this.metrics.compressionRatio.toFixed(2)}x)`);
          }
        } catch (compressionError) {
          console.warn('⚠️ Error en compresión, guardando sin comprimir:', compressionError);
        }
      }

      // Verificar espacio disponible
      await this.ensureStorageSpace(serializedData.length);

      // Guardar con versionado para recuperación
      const versionedData = {
        data: serializedData,
        compressed: compress && this.LZString && originalSize > 1024,
        timestamp: Date.now(),
        version: '1.0.0',
        originalSize,
        checksum: this.generateChecksum(serializedData)
      };

      // Intentar localStorage primero
      try {
        localStorage.setItem(fullKey, JSON.stringify(versionedData));
        this.updateMetrics();
        console.log(`💾 Guardado exitoso: ${key} (${new Blob([serializedData]).size}B)`);
      } catch (localStorageError) {
        // Fallback a sessionStorage si localStorage falla
        console.warn('⚠️ localStorage lleno, usando sessionStorage como fallback');
        sessionStorage.setItem(fullKey, JSON.stringify(versionedData));
      }

    } catch (error) {
      const sessionError: SessionError = new Error(`Error guardando ${key}: ${error}`) as SessionError;
      sessionError.type = 'storage';
      sessionError.recoverable = true;
      sessionError.context = { key, dataSize: JSON.stringify(data).length };
      throw sessionError;
    }
  }

  async load(key: string, decompress: boolean = true): Promise<any> {
    const fullKey = this.prefix + key;
    this.metrics.operationCount++;

    try {
      // Intentar localStorage primero
      let rawData = localStorage.getItem(fullKey);
      
      // Fallback a sessionStorage
      if (!rawData) {
        rawData = sessionStorage.getItem(fullKey);
      }

      if (!rawData) {
        return null;
      }

      // Parsear datos versionados
      const versionedData = JSON.parse(rawData);
      let data = versionedData.data || rawData; // Retrocompatibilidad

      // Validar checksum si está disponible
      if (versionedData.checksum) {
        const currentChecksum = this.generateChecksum(data);
        if (currentChecksum !== versionedData.checksum) {
          console.warn('⚠️ Checksum no coincide, datos posiblemente corruptos');
          // Intentar recuperar desde backup
          const backupData = await this.loadBackup(key);
          if (backupData) {
            console.log('✅ Recuperado desde backup');
            return backupData;
          }
        }
      }

      // Descomprimir si es necesario
      if (decompress && versionedData.compressed && this.LZString) {
        try {
          data = this.LZString.decompress(data);
          if (!data) {
            throw new Error('Descompresión falló');
          }
          console.log(`🗜️ Descompresión exitosa: ${key}`);
        } catch (decompressionError) {
          console.warn('⚠️ Error en descompresión:', decompressionError);
          throw decompressionError;
        }
      }

      // Parsear JSON final
      const result = JSON.parse(data);
      console.log(`📂 Cargado exitoso: ${key}`);
      return result;

    } catch (error) {
      const sessionError: SessionError = new Error(`Error cargando ${key}: ${error}`) as SessionError;
      sessionError.type = 'storage';
      sessionError.recoverable = true;
      sessionError.context = { key };
      throw sessionError;
    }
  }

  async remove(key: string): Promise<void> {
    const fullKey = this.prefix + key;
    
    try {
      localStorage.removeItem(fullKey);
      sessionStorage.removeItem(fullKey);
      
      // Remover también el backup
      localStorage.removeItem(fullKey + '_backup');
      
      this.updateMetrics();
      console.log(`🗑️ Eliminado: ${key}`);
    } catch (error) {
      console.warn(`⚠️ Error eliminando ${key}:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.getKeys();
      
      for (const key of keys) {
        await this.remove(key.replace(this.prefix, ''));
      }
      
      this.metrics = {
        totalSize: 0,
        usedSize: 0,
        compressionRatio: 1,
        operationCount: 0,
        lastCleanup: Date.now()
      };
      
      console.log('🧹 Storage limpiado completamente');
    } catch (error) {
      console.error('❌ Error limpiando storage:', error);
    }
  }

  async getSize(): Promise<number> {
    try {
      let totalSize = 0;
      const keys = await this.getKeys();
      
      for (const key of keys) {
        const data = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (data) {
          totalSize += new Blob([data]).size;
        }
      }
      
      this.metrics.usedSize = totalSize;
      return totalSize;
    } catch (error) {
      console.warn('⚠️ Error calculando tamaño de storage:', error);
      return 0;
    }
  }

  async getKeys(): Promise<string[]> {
    const keys: string[] = [];
    
    // Obtener keys de localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key);
      }
    }
    
    // Obtener keys de sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(this.prefix) && !keys.includes(key)) {
        keys.push(key);
      }
    }
    
    return keys;
  }

  // Crear backup antes de operaciones críticas
  async createBackup(key: string): Promise<void> {
    try {
      const data = await this.load(key, false);
      if (data) {
        const backupKey = key + '_backup';
        await this.save(backupKey, data, false);
        console.log(`💾 Backup creado: ${backupKey}`);
      }
    } catch (error) {
      console.warn(`⚠️ Error creando backup para ${key}:`, error);
    }
  }

  // Cargar desde backup
  private async loadBackup(key: string): Promise<any> {
    try {
      const backupKey = key + '_backup';
      return await this.load(backupKey, false);
    } catch (error) {
      console.warn(`⚠️ No se pudo cargar backup para ${key}:`, error);
      return null;
    }
  }

  // Gestión de espacio de almacenamiento
  private async ensureStorageSpace(requiredSize: number): Promise<void> {
    const currentSize = await this.getSize();
    const maxSize = 50 * 1024 * 1024; // 50MB límite
    
    if (currentSize + requiredSize > maxSize) {
      console.warn('⚠️ Espacio de almacenamiento casi lleno, limpiando datos antiguos...');
      await this.cleanupOldData();
    }
  }

  // Limpieza de datos antiguos
  private async cleanupOldData(): Promise<void> {
    try {
      const keys = await this.getKeys();
      const dataWithTimestamps: Array<{ key: string; timestamp: number; size: number }> = [];
      
      for (const key of keys) {
        try {
          const rawData = localStorage.getItem(key) || sessionStorage.getItem(key);
          if (rawData) {
            const versionedData = JSON.parse(rawData);
            const timestamp = versionedData.timestamp || 0;
            const size = new Blob([rawData]).size;
            
            dataWithTimestamps.push({ key, timestamp, size });
          }
        } catch (error) {
          // Si no se puede parsear, marcarlo para eliminación
          dataWithTimestamps.push({ key, timestamp: 0, size: 0 });
        }
      }
      
      // Ordenar por timestamp (más antiguos primero)
      dataWithTimestamps.sort((a, b) => a.timestamp - b.timestamp);
      
      // Eliminar los más antiguos hasta liberar suficiente espacio
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      let freedSpace = 0;
      const targetFreeSpace = 10 * 1024 * 1024; // 10MB
      
      for (const item of dataWithTimestamps) {
        if (item.timestamp < thirtyDaysAgo || freedSpace < targetFreeSpace) {
          const cleanKey = item.key.replace(this.prefix, '');
          await this.remove(cleanKey);
          freedSpace += item.size;
          console.log(`🗑️ Limpiado dato antiguo: ${cleanKey} (${item.size}B)`);
        }
      }
      
      this.metrics.lastCleanup = Date.now();
      console.log(`✅ Limpieza completada, liberados ${freedSpace}B`);
      
    } catch (error) {
      console.error('❌ Error durante limpieza de datos antiguos:', error);
    }
  }

  // Actualizar métricas
  private updateMetrics(): void {
    this.getSize().then(size => {
      this.metrics.usedSize = size;
    });
  }

  // Generar checksum simple para validación
  private generateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32-bit integer
    }
    return hash.toString(16);
  }

  // Obtener métricas actuales
  getMetrics(): StorageMetrics {
    return { ...this.metrics };
  }

  // Validar integridad del storage
  async validateIntegrity(): Promise<boolean> {
    try {
      const keys = await this.getKeys();
      let validItems = 0;
      let totalItems = keys.length;
      
      for (const key of keys) {
        try {
          const data = localStorage.getItem(key) || sessionStorage.getItem(key);
          if (data) {
            JSON.parse(data); // Verificar que se puede parsear
            validItems++;
          }
        } catch (error) {
          console.warn(`⚠️ Elemento corrupto detectado: ${key}`);
        }
      }
      
      const integrityRatio = totalItems > 0 ? validItems / totalItems : 1;
      const isIntegritySufficient = integrityRatio >= 0.9; // 90% de elementos válidos
      
      console.log(`🔍 Validación de integridad: ${validItems}/${totalItems} válidos (${(integrityRatio * 100).toFixed(1)}%)`);
      
      return isIntegritySufficient;
    } catch (error) {
      console.error('❌ Error validando integridad del storage:', error);
      return false;
    }
  }
} 