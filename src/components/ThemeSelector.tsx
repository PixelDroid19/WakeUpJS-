import { useState, useEffect } from "react";
import { themeManager } from "../lib/themes/theme-manager";

interface ThemeSelectorProps {
  className?: string;
}

export function ThemeSelector({ className = "" }: ThemeSelectorProps) {
  const [currentTheme, setCurrentTheme] = useState(themeManager.getCurrentThemeName());
  const [availableThemes, setAvailableThemes] = useState(themeManager.getAvailableThemes());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Actualizar temas disponibles si cambian
    const themes = themeManager.getAvailableThemes();
    setAvailableThemes(themes);
  }, []);

  const handleThemeChange = (themeName: string) => {
    const success = themeManager.setTheme(themeName);
    if (success) {
      setCurrentTheme(themeName);
      setIsOpen(false);
    }
  };

  const currentThemeData = availableThemes.find(theme => theme.name === currentTheme);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-sm transition-colors"
        title="Cambiar tema"
      >
        <span>🎨</span>
        <span>{currentThemeData?.displayName || 'Tema'}</span>
        <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ⌄
        </span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full right-0 mt-1 w-48 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50">
            <div className="py-1">
              {availableThemes.map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => handleThemeChange(theme.name)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition-colors ${
                    theme.name === currentTheme 
                      ? 'bg-gray-700 text-blue-400' 
                      : 'text-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{theme.displayName}</span>
                    {theme.name === currentTheme && (
                      <span className="text-blue-400">✓</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {getThemeDescription(theme.name)}
                  </div>
                </button>
              ))}
            </div>
            
            <div className="border-t border-gray-600 py-1">
              <div className="px-4 py-2 text-xs text-gray-400">
                Los temas se cargan desde archivos JSON personalizables
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function getThemeDescription(themeName: string): string {
  switch (themeName) {
    case 'onedark':
      return 'Tema oscuro inspirado en Atom One Dark';
    case 'light':
      return 'Tema claro clásico para mejor legibilidad';
    case 'dark-fallback':
      return 'Tema oscuro de respaldo';
    default:
      return 'Tema personalizado';
  }
}

export default ThemeSelector; 