/**
 * ========================
 * 🔐 TIPOS PARA SISTEMA DE SESIONES
 * ========================
 */

export interface CursorPosition {
  line: number;
  column: number;
}

export interface EditorSettings {
  theme: string;
  fontSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
}

export interface WorkspaceFile {
  id: string;
  name: string;
  content: string;
  language: 'javascript' | 'typescript' | 'html' | 'css';
  isUnsaved: boolean;
  lastModified: number;
}

export interface LayoutState {
  splitDirection: 'horizontal' | 'vertical';
  splitSizes: number[];
  activeFileId: string | null;
}

export interface ExecutionState {
  lastResults: any;
  installedPackages: string[];
  lastExecutionTime: number;
}

export interface SessionData {
  version: string;
  timestamp: number;
  sessionId: string;
  workspace: {
    activeFileId: string | null;
    files: WorkspaceFile[];
    layout: LayoutState;
  };
  editor: {
    cursorPositions: Record<string, CursorPosition>;
    scrollPositions: Record<string, number>;
    settings: EditorSettings;
  };
  execution: ExecutionState;
  metadata: {
    totalSize: number;
    fileCount: number;
    lastAccess: number;
  };
}

export interface SessionSaveOptions {
  immediate?: boolean;
  force?: boolean;
  compress?: boolean;
  createBackup?: boolean;
}

export interface SessionRestoreOptions {
  lazy?: boolean;
  validateIntegrity?: boolean;
  fallbackToPartial?: boolean;
  migrateIfNeeded?: boolean;
}

export interface AutoSaveConfig {
  enabled: boolean;
  debounceTime: number;
  maxRetries: number;
  retryDelay: number;
  adaptiveFrequency: boolean;
  pauseOnTyping: boolean;
}

export interface StorageMetrics {
  totalSize: number;
  usedSize: number;
  compressionRatio: number;
  operationCount: number;
  lastCleanup: number;
}

export interface SessionEvent {
  type: 'save' | 'restore' | 'error' | 'cleanup';
  timestamp: number;
  data?: any;
  error?: string;
}

// Tipos para eventos del sistema
export type SessionEventHandler = (event: SessionEvent) => void;

// Tipos para el storage adapter
export interface StorageAdapter {
  save(key: string, data: any, compress?: boolean): Promise<void>;
  load(key: string, decompress?: boolean): Promise<any>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  getSize(): Promise<number>;
  getKeys(): Promise<string[]>;
}

// Tipos para manejo de errores
export interface SessionError extends Error {
  type: 'storage' | 'compression' | 'validation' | 'migration';
  recoverable: boolean;
  context?: any;
}

// Tipos para migración de datos
export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  migratedFiles: number;
  errors: string[];
}

export type SessionChangeType = 'file-content' | 'file-created' | 'file-deleted' | 'cursor-moved' | 'layout-changed' | 'settings-changed';

export interface SessionChange {
  type: SessionChangeType;
  fileId?: string;
  timestamp: number;
  data: any;
} 