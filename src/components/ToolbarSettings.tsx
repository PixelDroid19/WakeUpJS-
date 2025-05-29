/**
 * ToolbarSettings Component
 *
 * Panel de configuración del toolbar con múltiples opciones:
 * - Temas (dark, light, blue, purple, green, custom)
 * - Tamaños (sm, md, lg)
 * - Modos (normal, floating, minimal, compact)
 * - Posiciones (top, bottom, left, right)
 * - Opciones de visibilidad
 *
 * Configuración por defecto: tema dark, tamaño md, modo floating, posición bottom
 *
 */

import {
  useToolbar,
  ToolbarTheme,
  ToolbarSize,
  ToolbarMode,
  ToolbarPosition,
} from "../context/ToolbarContext";
import { useConfig } from "../context/ConfigContext";
import {
  X,
  Palette,
  Monitor,
  Smartphone,
  Tablet,
  Layout,
  Minimize2,
  Square,
  Circle,
  Eye,
  EyeOff,
  Hash,
  Save,
  Play,
  Zap,
  Settings,
} from "lucide-react";
import { ConfigProfiles } from "./ConfigProfiles";
import { useState } from "react";

const themes: {
  value: ToolbarTheme;
  label: string;
  colors: string;
  preview: string;
  description: string;
}[] = [
  {
    value: "dark",
    label: "Oscuro",
    colors: "bg-gray-800 text-white",
    preview: "bg-gray-800",
    description: "Tema oscuro clásico",
  },
  {
    value: "light",
    label: "Claro",
    colors: "bg-gray-100 text-gray-800 border border-gray-300",
    preview: "bg-gray-100 border border-gray-300",
    description: "Tema claro limpio",
  },
  {
    value: "blue",
    label: "Azul",
    colors: "bg-blue-600 text-white",
    preview: "bg-blue-600",
    description: "Tema azul profesional",
  },
  {
    value: "purple",
    label: "Púrpura",
    colors: "bg-purple-600 text-white",
    preview: "bg-purple-600",
    description: "Tema púrpura creativo",
  },
  {
    value: "green",
    label: "Verde",
    colors: "bg-green-600 text-white",
    preview: "bg-green-600",
    description: "Tema verde natural",
  },
  {
    value: "custom",
    label: "Personalizado",
    colors: "bg-gradient-to-r from-gray-600 to-gray-700 text-white",
    preview: "bg-gradient-to-r from-gray-600 to-gray-700",
    description: "Colores personalizados",
  },
];

const sizes: {
  value: ToolbarSize;
  label: string;
  icon: any;
  description: string;
}[] = [
  {
    value: "sm",
    label: "Pequeño",
    icon: Smartphone,
    description: "Compacto para espacios reducidos",
  },
  {
    value: "md",
    label: "Mediano",
    icon: Tablet,
    description: "Tamaño equilibrado por defecto",
  },
  {
    value: "lg",
    label: "Grande",
    icon: Monitor,
    description: "Tamaño amplio para pantallas grandes",
  },
];

const modes: {
  value: ToolbarMode;
  label: string;
  description: string;
  icon: any;
  features: string[];
}[] = [
  {
    value: "normal",
    label: "Normal",
    description: "Barra superior completa con toda la información",
    icon: Layout,
    features: [
      "Información completa del workspace",
      "Todos los controles disponibles",
      "Estadísticas detalladas",
    ],
  },
  {
    value: "floating",
    label: "Flotante",
    description: "Barra flotante posicionable con controles esenciales",
    icon: Square,
    features: [
      "Posicionable en cualquier esquina",
      "Diseño minimalista",
      "No ocupa espacio fijo",
    ],
  },
  {
    value: "minimal",
    label: "Minimalista",
    description: "Solo iconos esenciales centrados",
    icon: Minimize2,
    features: [
      "Solo controles básicos",
      "Máximo espacio para el editor",
      "Diseño ultra limpio",
    ],
  },
  {
    value: "compact",
    label: "Compacto",
    description: "Iconos en círculos compactos flotantes",
    icon: Circle,
    features: [
      "Iconos circulares pequeños",
      "Posicionable",
      "Ideal para móviles",
    ],
  },
];

const positions: { value: ToolbarPosition; label: string; icon: string }[] = [
  { value: "top", label: "Superior", icon: "⬆️" },
  { value: "bottom", label: "Inferior", icon: "⬇️" },
  { value: "left", label: "Izquierda", icon: "⬅️" },
  { value: "right", label: "Derecha", icon: "➡️" },
];

// Componente para configuraciones de Auto Guardado
const AutoSaveSettings = () => {
  const { config, toggleAutoSave, updateAutoSaveInterval } = useConfig();

  return (
    <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Save size={16} className="text-green-400" />
          <div>
            <span className="text-sm text-gray-300 font-medium">
              Auto Guardado
            </span>
            <div className="text-xs text-gray-500">
              Guarda automáticamente los cambios
            </div>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.autoSave.enabled}
            onChange={toggleAutoSave}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {config.autoSave.enabled && (
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-2">
              Intervalo de guardado:{" "}
              {Math.round(config.autoSave.interval / 1000)}s
            </label>
            <input
              type="range"
              min="3000"
              max="30000"
              step="1000"
              value={config.autoSave.interval}
              onChange={(e) => updateAutoSaveInterval(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>3s</span>
              <span>30s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente para configuraciones de Auto Ejecución
const AutoExecutionSettings = () => {
  const {
    config,
    toggleAutoExecution,
    toggleSmartDebounce,
    updateDebounceTime,
  } = useConfig();

  return (
    <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Play size={16} className="text-blue-400" />
          <div>
            <span className="text-sm text-gray-300 font-medium">
              Auto Ejecución
            </span>
            <div className="text-xs text-gray-500">
              Ejecuta código automáticamente al escribir
            </div>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.autoExecution.enabled}
            onChange={toggleAutoExecution}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {config.autoExecution.enabled && (
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-2">
              Tiempo de debounce: {config.autoExecution.debounceTime}ms
            </label>
            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={config.autoExecution.debounceTime}
              onChange={(e) => updateDebounceTime(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>100ms</span>
              <span>2s</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
            <div>
              <div className="text-xs font-medium text-gray-300">
                Smart Debounce
              </div>
              <div className="text-xs text-gray-500">
                Ajusta automáticamente según el tipo de cambio
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.autoExecution.enableSmartDebounce}
                onChange={toggleSmartDebounce}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

function ToolbarSettings() {
  const { config, updateConfig, showSettings, toggleSettings } = useToolbar();
  const { config: configState } = useConfig();
  const [customColors, setCustomColors] = useState(
    config.customColors || {
      background: "#1f2937",
      text: "#ffffff",
      accent: "#3b82f6",
      hover: "#1e40af",
    }
  );
  const [activeTab, setActiveTab] = useState<
    "appearance" | "behavior" | "performance" | "advanced"
  >("appearance");

  if (!showSettings) return null;

  const handleCustomColorChange = (
    colorType: keyof typeof customColors,
    value: string
  ) => {
    const newColors = { ...customColors, [colorType]: value };
    setCustomColors(newColors);
    updateConfig({
      theme: "custom",
      customColors: newColors,
    });
  };

  const TabButton = ({
    label,
    isActive,
    onClick,
  }: {
    tab: string;
    label: string;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
        isActive
          ? "bg-blue-500 text-white shadow-md"
          : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      {/* Overlay mejorado */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={toggleSettings}
      />

      {/* Panel principal con animación mejorada */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 w-[480px] max-w-[90vw] max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header mejorado */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-850 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Palette size={16} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-200">
                  Configuración del Toolbar
                </h3>
                <p className="text-xs text-gray-500">
                  Personaliza la apariencia y comportamiento
                </p>
              </div>
            </div>
            <button
              onClick={toggleSettings}
              className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-200 transition-all duration-200 hover:scale-110"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tabs de navegación */}
          <div className="flex gap-1 mt-4 p-1 bg-gray-800 rounded-lg">
            <TabButton
              tab="appearance"
              label="Apariencia"
              isActive={activeTab === "appearance"}
              onClick={() => setActiveTab("appearance")}
            />
            <TabButton
              tab="behavior"
              label="Comportamiento"
              isActive={activeTab === "behavior"}
              onClick={() => setActiveTab("behavior")}
            />
            <TabButton
              tab="performance"
              label="Rendimiento"
              isActive={activeTab === "performance"}
              onClick={() => setActiveTab("performance")}
            />
            <TabButton
              tab="advanced"
              label="Avanzado"
              isActive={activeTab === "advanced"}
              onClick={() => setActiveTab("advanced")}
            />
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)] text-gray-300">
          {/* Tab: Apariencia */}
          {activeTab === "appearance" && (
            <div className="space-y-6">
              {/* Tema */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Tema de color
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {themes.map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => updateConfig({ theme: theme.value })}
                      className={`relative p-4 rounded-lg border transition-all duration-200 hover:scale-[1.02] ${
                        config.theme === theme.value
                          ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20"
                          : "border-gray-600 hover:border-gray-500 hover:bg-gray-800"
                      }`}
                    >
                      <div
                        className={`w-full h-8 rounded-md mb-3 ${theme.preview}`}
                      ></div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-gray-200">
                          {theme.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {theme.description}
                        </div>
                      </div>
                      {config.theme === theme.value && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Colores personalizados */}
                {config.theme === "custom" && (
                  <div className="mt-6 p-4 bg-gray-800 border border-gray-700 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                      <Palette size={14} />
                      Colores Personalizados
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(customColors).map(([key, value]) => (
                        <div key={key} className="space-y-2">
                          <label className="block text-xs text-gray-400 capitalize font-medium">
                            {key}
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <input
                                type="color"
                                value={value}
                                onChange={(e) =>
                                  handleCustomColorChange(
                                    key as keyof typeof customColors,
                                    e.target.value
                                  )
                                }
                                className="w-8 h-8 rounded-md border border-gray-600 cursor-pointer bg-transparent"
                              />
                            </div>
                            <input
                              type="text"
                              value={value}
                              onChange={(e) =>
                                handleCustomColorChange(
                                  key as keyof typeof customColors,
                                  e.target.value
                                )
                              }
                              className="flex-1 px-3 py-2 text-xs bg-gray-700 border border-gray-600 rounded-md text-gray-300 focus:border-blue-500 focus:outline-none transition-colors"
                              placeholder="#000000"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Tamaño */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Tamaño
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {sizes.map((size) => {
                    const Icon = size.icon;
                    return (
                      <button
                        key={size.value}
                        onClick={() => updateConfig({ size: size.value })}
                        className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-200 ${
                          config.size === size.value
                            ? "bg-blue-500/20 text-blue-300 border-blue-500 shadow-lg shadow-blue-500/20"
                            : "bg-gray-800 text-gray-400 border-gray-600 hover:border-gray-500 hover:text-gray-300 hover:bg-gray-750"
                        }`}
                      >
                        <Icon size={20} />
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium">
                            {size.label}
                          </div>
                          <div className="text-xs opacity-70">
                            {size.description}
                          </div>
                        </div>
                        {config.size === size.value && (
                          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Comportamiento */}
          {activeTab === "behavior" && (
            <div className="space-y-6">
              {/* Auto Funcionalidades */}
              <div>
                <label className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                  <Zap size={16} />
                  Auto Funcionalidades
                </label>
                <div className="space-y-4">
                  {/* Auto Guardado */}
                  <AutoSaveSettings />

                  {/* Auto Ejecución */}
                  <AutoExecutionSettings />
                </div>
              </div>

              {/* Modo */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Modo de visualización
                </label>
                <div className="space-y-3">
                  {modes.map((mode) => {
                    const Icon = mode.icon;
                    return (
                      <button
                        key={mode.value}
                        onClick={() => updateConfig({ mode: mode.value })}
                        className={`w-full p-4 rounded-lg border text-left transition-all duration-200 hover:scale-[1.01] ${
                          config.mode === mode.value
                            ? "bg-blue-500/20 text-blue-300 border-blue-500 shadow-lg shadow-blue-500/20"
                            : "bg-gray-800 text-gray-400 border-gray-600 hover:border-gray-500 hover:text-gray-300"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <Icon size={20} className="mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm font-medium">
                                {mode.label}
                              </div>
                              {config.mode === mode.value && (
                                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                </div>
                              )}
                            </div>
                            <div className="text-xs opacity-70 mb-2">
                              {mode.description}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {mode.features.map((feature, index) => (
                                <span
                                  key={index}
                                  className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-400"
                                >
                                  {feature}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Posición (solo para modos flotantes) */}
              {(config.mode === "floating" || config.mode === "compact") && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Posición en pantalla
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {positions.map((position) => (
                      <button
                        key={position.value}
                        onClick={() =>
                          updateConfig({ position: position.value })
                        }
                        className={`flex items-center gap-3 py-3 px-4 rounded-lg border transition-all duration-200 ${
                          config.position === position.value
                            ? "bg-blue-500/20 text-blue-300 border-blue-500 shadow-lg shadow-blue-500/20"
                            : "bg-gray-800 text-gray-400 border-gray-600 hover:border-gray-500 hover:text-gray-300"
                        }`}
                      >
                        <span className="text-lg">{position.icon}</span>
                        <span className="text-sm font-medium">
                          {position.label}
                        </span>
                        {config.position === position.value && (
                          <div className="ml-auto w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Rendimiento */}
          {activeTab === "performance" && (
            <div className="space-y-6">
              {/* Opciones de visibilidad */}
              <div>
                <label className=" text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                  <Eye size={16} />
                  Elementos visibles
                </label>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors group">
                    <div className="flex items-center gap-3">
                      <Hash
                        size={16}
                        className="text-gray-400 group-hover:text-gray-300"
                      />
                      <div>
                        <span className="text-sm text-gray-300 font-medium">
                          Contador de resultados
                        </span>
                        <div className="text-xs text-gray-500">
                          Muestra el número de resultados de ejecución
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.showResultCount}
                      onChange={(e) =>
                        updateConfig({ showResultCount: e.target.checked })
                      }
                      className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 transition-colors"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors group">
                    <div className="flex items-center gap-3">
                      <Layout
                        size={16}
                        className="text-gray-400 group-hover:text-gray-300"
                      />
                      <div>
                        <span className="text-sm text-gray-300 font-medium">
                          Título de la aplicación
                        </span>
                        <div className="text-xs text-gray-500">
                          Muestra el estado y título en el toolbar
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.showTitle}
                      onChange={(e) =>
                        updateConfig({ showTitle: e.target.checked })
                      }
                      className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 transition-colors"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors group">
                    <div className="flex items-center gap-3">
                      <EyeOff
                        size={16}
                        className="text-gray-400 group-hover:text-gray-300"
                      />
                      <div>
                        <span className="text-sm text-gray-300 font-medium">
                          Ocultar valores undefined
                        </span>
                        <div className="text-xs text-gray-500">
                          No muestra resultados undefined en la ejecución
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.hideUndefined}
                      onChange={(e) =>
                        updateConfig({ hideUndefined: e.target.checked })
                      }
                      className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 transition-colors"
                    />
                  </label>
                </div>
              </div>

              {/* Preview del toolbar */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Vista previa
                </label>
                <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
                  <div className="text-xs text-gray-500 mb-2">
                    Así se verá tu toolbar:
                  </div>
                  <div
                    className={`${
                      config.theme === "light"
                        ? "bg-white text-gray-800 border-gray-200"
                        : "bg-gray-800 text-white border-gray-700"
                    } p-2 rounded border text-xs flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-2">
                      {config.showTitle && <span>JSRunner</span>}
                      {config.showResultCount && (
                        <span className="bg-white/10 px-2 py-1 rounded">
                          42
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center">
                        ⚙️
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-gray-500">
                    <p>
                      Auto guardado:{" "}
                      {configState.autoSave.enabled
                        ? "Activado"
                        : "Desactivado"}
                    </p>
                    <p>
                      Auto ejecución:{" "}
                      {configState.autoExecution.enabled
                        ? "Activado"
                        : "Desactivado"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Avanzado */}
          {activeTab === "advanced" && (
            <div className="space-y-6">
              {/* Opciones de visibilidad */}
              <div>
                <label className=" text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                  <Eye size={16} />
                  Elementos visibles
                </label>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors group">
                    <div className="flex items-center gap-3">
                      <Hash
                        size={16}
                        className="text-gray-400 group-hover:text-gray-300"
                      />
                      <div>
                        <span className="text-sm text-gray-300 font-medium">
                          Contador de resultados
                        </span>
                        <div className="text-xs text-gray-500">
                          Muestra el número de resultados de ejecución
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.showResultCount}
                      onChange={(e) =>
                        updateConfig({ showResultCount: e.target.checked })
                      }
                      className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 transition-colors"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors group">
                    <div className="flex items-center gap-3">
                      <Layout
                        size={16}
                        className="text-gray-400 group-hover:text-gray-300"
                      />
                      <div>
                        <span className="text-sm text-gray-300 font-medium">
                          Título de la aplicación
                        </span>
                        <div className="text-xs text-gray-500">
                          Muestra el estado y título en el toolbar
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.showTitle}
                      onChange={(e) =>
                        updateConfig({ showTitle: e.target.checked })
                      }
                      className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 transition-colors"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors group">
                    <div className="flex items-center gap-3">
                      <EyeOff
                        size={16}
                        className="text-gray-400 group-hover:text-gray-300"
                      />
                      <div>
                        <span className="text-sm text-gray-300 font-medium">
                          Ocultar valores undefined
                        </span>
                        <div className="text-xs text-gray-500">
                          No muestra resultados undefined en la ejecución
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.hideUndefined}
                      onChange={(e) =>
                        updateConfig({ hideUndefined: e.target.checked })
                      }
                      className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 transition-colors"
                    />
                  </label>
                </div>
              </div>

              {/* Información de configuración */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Configuración Central
                </label>
                <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
                  <div className="text-xs text-gray-500 mb-2">
                    Estado actual de configuración:
                  </div>
                  <div className="space-y-2 text-xs text-gray-300">
                    <p>
                      • Auto guardado:{" "}
                      {configState.autoSave.enabled
                        ? "Activado"
                        : "Desactivado"}
                    </p>
                    <p>
                      • Auto ejecución:{" "}
                      {configState.autoExecution.enabled
                        ? "Activado"
                        : "Desactivado"}
                    </p>
                    <p>
                      • Smart debounce:{" "}
                      {configState.smartDebounce.enabled
                        ? "Activado"
                        : "Desactivado"}
                    </p>
                    <p>
                      • Cache de ejecución:{" "}
                      {configState.executionAdvanced.enableCache
                        ? "Activado"
                        : "Desactivado"}
                    </p>
                    <p>
                      • Métricas de ejecución:{" "}
                      {configState.executionAdvanced.enableMetrics
                        ? "Activadas"
                        : "Desactivadas"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Perfiles de Configuración */}
              <div>
                <label className=" text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <Settings size={16} />
                  Perfiles de Configuración
                </label>
                <ConfigProfiles />
              </div>
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="border-t border-gray-700 p-4 bg-gray-850">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                updateConfig({
                  theme: "dark",
                  size: "md",
                  mode: "floating",
                  position: "bottom",
                  showResultCount: true,
                  showTitle: true,
                  hideUndefined: true,
                  customColors: null,
                });
              }}
              className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
            >
              Restaurar por defecto
            </button>
            <button
              onClick={toggleSettings}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Aplicar cambios
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ToolbarSettings;
