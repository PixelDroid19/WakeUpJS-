import { STORAGE_KEYS } from "../../constants/config";

// Interfaz para definir un tema
export interface Theme {
  name: string;
  displayName: string;
  monaco: {
    base: "vs" | "vs-dark" | "hc-black";
    inherit: boolean;
    rules: Array<{
      token: string;
      foreground?: string;
      background?: string;
      fontStyle?: string;
    }>;
    colors: Record<string, string>;
  };
  ui?: {
    // Colores para la UI del resultado y otros componentes
    background?: string;
    foreground?: string;
    accent?: string;
    success?: string;
    error?: string;
    warning?: string;
    info?: string;
  };
}

// Temas disponibles en el sistema
export class ThemeManager {
  private static instance: ThemeManager;
  private themes: Map<string, Theme> = new Map();
  private currentTheme: string = 'onedark';
  private monacoInstance: any = null;

  private constructor() {
    this.loadBuiltInThemes();
  }

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  // Cargar temas integrados
  private async loadBuiltInThemes() {
    try {
      // Cargar OneDark desde JSON
      const oneDarkResponse = await fetch('/src/components/onedark.json');
      const oneDarkData = await oneDarkResponse.json();
      
      const oneDarkTheme: Theme = {
        name: 'onedark',
        displayName: 'One Dark',
        monaco: {
          base: oneDarkData.base,
          inherit: oneDarkData.inherit,
          rules: oneDarkData.rules,
          colors: oneDarkData.colors
        },
        ui: {
          background: oneDarkData.colors['editor.background'] || '#282a36',
          foreground: oneDarkData.colors['editor.foreground'] || '#f8f8f2',
          accent: '#bd93f9',
          success: '#50fa7b',
          error: '#ff5555',
          warning: '#ffb86c',
          info: '#8be9fd'
        }
      };

      this.themes.set('onedark', oneDarkTheme);

      // Tema claro por defecto
      const lightTheme: Theme = {
        name: 'light',
        displayName: 'Light',
        monaco: {
          base: 'vs',
          inherit: true,
          rules: [
            { token: '', foreground: '000000', background: 'ffffff' },
            { token: 'comment', foreground: '008000' },
            { token: 'keyword', foreground: '0000ff' },
            { token: 'string', foreground: 'a31515' },
            { token: 'number', foreground: '09885a' }
          ],
          colors: {
            'editor.background': '#ffffff',
            'editor.foreground': '#000000',
            'editor.lineHighlightBackground': '#f0f0f0',
            'editorLineNumber.foreground': '#237893',
            'editorLineNumber.activeForeground': '#0b216f'
          }
        },
        ui: {
          background: '#ffffff',
          foreground: '#000000',
          accent: '#0078d4',
          success: '#107c10',
          error: '#d13438',
          warning: '#ff8c00',
          info: '#0078d4'
        }
      };

      this.themes.set('light', lightTheme);

      // Cargar tema guardado
      const savedTheme = localStorage.getItem(STORAGE_KEYS.EDITOR_THEME);
      if (savedTheme && this.themes.has(savedTheme)) {
        this.currentTheme = savedTheme;
      }

      console.log('✅ Temas cargados:', Array.from(this.themes.keys()));

    } catch (error) {
      console.warn('⚠️ Error cargando temas, usando tema por defecto:', error);
      this.setupFallbackTheme();
    }
  }

  // Tema de respaldo si no se pueden cargar los archivos
  private setupFallbackTheme() {
    const fallbackTheme: Theme = {
      name: 'dark-fallback',
      displayName: 'Dark (Fallback)',
      monaco: {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#1e1e1e',
          'editor.foreground': '#d4d4d4'
        }
      },
      ui: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        accent: '#007acc',
        success: '#4caf50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196f3'
      }
    };

    this.themes.set('dark-fallback', fallbackTheme);
    this.currentTheme = 'dark-fallback';
  }

  // Establecer instancia de Monaco
  setMonacoInstance(monaco: any): void {
    this.monacoInstance = monaco;
    this.applyCurrentTheme();
  }

  // Aplicar tema actual
  applyCurrentTheme(): void {
    if (!this.monacoInstance) {
      console.warn('⚠️ Monaco no disponible para aplicar tema');
      return;
    }

    const theme = this.getCurrentTheme();
    if (!theme) {
      console.warn('⚠️ Tema actual no encontrado');
      return;
    }

    try {
      // Definir tema en Monaco
      const themeId = `custom-${theme.name}`;
      this.monacoInstance.editor.defineTheme(themeId, theme.monaco);
      
      // Aplicar tema
      this.monacoInstance.editor.setTheme(themeId);
      
      // Aplicar estilos CSS para la UI
      this.applyUIStyles(theme);
      
      console.log(`✅ Tema '${theme.displayName}' aplicado correctamente`);

    } catch (error) {
      console.error('❌ Error aplicando tema:', error);
    }
  }

  // Aplicar estilos CSS para componentes UI
  private applyUIStyles(theme: Theme): void {
    if (!theme.ui) return;

    // Crear o actualizar variables CSS para el tema
    const root = document.documentElement;
    
    if (theme.ui.background) {
      root.style.setProperty('--theme-bg', theme.ui.background);
    }
    if (theme.ui.foreground) {
      root.style.setProperty('--theme-fg', theme.ui.foreground);
    }
    if (theme.ui.accent) {
      root.style.setProperty('--theme-accent', theme.ui.accent);
    }
    if (theme.ui.success) {
      root.style.setProperty('--theme-success', theme.ui.success);
    }
    if (theme.ui.error) {
      root.style.setProperty('--theme-error', theme.ui.error);
    }
    if (theme.ui.warning) {
      root.style.setProperty('--theme-warning', theme.ui.warning);
    }
    if (theme.ui.info) {
      root.style.setProperty('--theme-info', theme.ui.info);
    }

    // Aplicar clase del tema al body
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${theme.name}`);
  }

  // Cambiar tema
  setTheme(themeName: string): boolean {
    if (!this.themes.has(themeName)) {
      console.warn(`⚠️ Tema '${themeName}' no encontrado`);
      return false;
    }

    this.currentTheme = themeName;
    localStorage.setItem(STORAGE_KEYS.EDITOR_THEME, themeName);
    
    // Aplicar inmediatamente si Monaco está disponible
    if (this.monacoInstance) {
      this.applyCurrentTheme();
    }

    console.log(`🎨 Tema cambiado a: ${themeName}`);
    return true;
  }

  // Obtener tema actual
  getCurrentTheme(): Theme | null {
    return this.themes.get(this.currentTheme) || null;
  }

  // Obtener nombre del tema actual
  getCurrentThemeName(): string {
    return this.currentTheme;
  }

  // Obtener todos los temas disponibles
  getAvailableThemes(): Array<{ name: string; displayName: string }> {
    return Array.from(this.themes.values()).map(theme => ({
      name: theme.name,
      displayName: theme.displayName
    }));
  }

  // Cargar tema personalizado desde JSON
  async loadCustomTheme(jsonData: any, themeName: string): Promise<boolean> {
    try {
      const customTheme: Theme = {
        name: themeName,
        displayName: jsonData.displayName || themeName,
        monaco: {
          base: jsonData.base || 'vs-dark',
          inherit: jsonData.inherit || true,
          rules: jsonData.rules || [],
          colors: jsonData.colors || {}
        },
        ui: jsonData.ui || {}
      };

      this.themes.set(themeName, customTheme);
      console.log(`✅ Tema personalizado '${themeName}' cargado`);
      return true;

    } catch (error) {
      console.error('❌ Error cargando tema personalizado:', error);
      return false;
    }
  }

  // Exportar tema actual como JSON
  exportCurrentTheme(): string {
    const theme = this.getCurrentTheme();
    if (!theme) {
      throw new Error('No hay tema actual para exportar');
    }

    return JSON.stringify(theme, null, 2);
  }

  // Obtener colores del tema actual para uso en componentes
  getThemeColors(): Record<string, string> {
    const theme = this.getCurrentTheme();
    return {
      background: theme?.ui?.background || '#1e1e1e',
      foreground: theme?.ui?.foreground || '#d4d4d4',
      accent: theme?.ui?.accent || '#007acc',
      success: theme?.ui?.success || '#4caf50',
      error: theme?.ui?.error || '#f44336',
      warning: theme?.ui?.warning || '#ff9800',
      info: theme?.ui?.info || '#2196f3'
    };
  }
}

// Instancia singleton
export const themeManager = ThemeManager.getInstance(); 