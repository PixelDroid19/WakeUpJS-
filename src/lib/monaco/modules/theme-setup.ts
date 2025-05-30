import { themeManager } from "../../themes/theme-manager";

/**
 * ========================
 * 🎨 MÓDULO DE CONFIGURACIÓN DE TEMAS
 * ========================
 * 
 * Este módulo maneja la configuración e integración de temas con Monaco Editor.
 * 
 * Responsabilidades:
 * - Establecer la instancia de Monaco en el themeManager
 * - Aplicar temas iniciales
 * - Manejar cambios de tema
 */

export function setupMonacoThemes(monaco: any): void {
  console.log("🎨 Configurando sistema de temas de Monaco");
  
  // Integrar el sistema de temas
  themeManager.setMonacoInstance(monaco);
  
  // Aplicar tema inicial si está disponible
  const currentTheme = themeManager.getCurrentTheme();
  if (currentTheme) {
    console.log(`🎨 Aplicando tema inicial: ${currentTheme.displayName}`);
    themeManager.applyCurrentTheme();
  } else {
    console.warn("⚠️ No se encontró tema inicial, usando tema por defecto");
  }
}

export function refreshTheme(monaco: any): void {
  if (!monaco) {
    console.warn("⚠️ Monaco no disponible para refrescar tema");
    return;
  }
  
  console.log("🔄 Refrescando tema de Monaco");
  themeManager.applyCurrentTheme();
}

export function setTheme(themeName: string): boolean {
  console.log(`🎨 Cambiando tema a: ${themeName}`);
  return themeManager.setTheme(themeName);
} 