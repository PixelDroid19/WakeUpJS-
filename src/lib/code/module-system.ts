/**
 * Sistema de gestión de módulos para el entorno de ejecución
 */
export class ModuleSystem {
  private moduleRegistry = new Map<string, any>();

  constructor() {
    this.setupDefaultModules();
  }

  /**
   * Configura los módulos predeterminados del sistema
   */
  private setupDefaultModules() {
    // Paquetes adicionales comunes
    this.moduleRegistry.set("lodash", {
      map: (collection: any, iteratee: Function) => collection.map(iteratee),
      filter: (collection: any, predicate: Function) =>
        collection.filter(predicate),
      reduce: (collection: any, iteratee: Function, accumulator: any) =>
        collection.reduce(iteratee, accumulator),
      cloneDeep: (obj: any) => JSON.parse(JSON.stringify(obj)),
      isEqual: (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b),
      debounce: (func: Function, delay: number) => {
        let timeoutId: any;
        return (...args: any[]) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => func.apply(null, args), delay);
        };
      },
    });
  }

  /**
   * Registra React y su runtime en el sistema de módulos
   * @param React - Instancia de React
   * @param jsxRuntime - Runtime de JSX
   */
  registerReact(React: any, jsxRuntime: any) {
    this.moduleRegistry.set("react", React);
    this.moduleRegistry.set("react/jsx-runtime", jsxRuntime);
  }

  /**
   * Sistema de require/import personalizado
   * @param moduleName - Nombre del módulo a cargar
   * @returns Módulo solicitado
   */
  createRequire() {
    return (moduleName: string) => {
      console.log("📦 Cargando módulo:", moduleName);

      if (this.moduleRegistry.has(moduleName)) {
        return this.moduleRegistry.get(moduleName);
      }

      // Intentar cargar desde paquetes instalados
      const installedPackages = JSON.parse(
        localStorage.getItem("jsrunner-packages") || "{}"
      );
      if (installedPackages[moduleName]) {
        console.log("📦 Módulo encontrado en paquetes instalados:", moduleName);
        // En una implementación real, aquí cargaríamos desde CDN
        return installedPackages[moduleName];
      }

      throw new Error(
        `Cannot find module '${moduleName}'. Instálalo usando el gestor de paquetes.`
      );
    };
  }

  /**
   * Registra un nuevo módulo en el sistema
   * @param name - Nombre del módulo
   * @param module - Contenido del módulo
   */
  registerModule(name: string, module: any) {
    this.moduleRegistry.set(name, module);
    console.log("📦 Módulo registrado:", name);
  }

  /**
   * Obtiene la lista de módulos disponibles
   * @returns Array con los nombres de módulos disponibles
   */
  getAvailableModules(): string[] {
    return Array.from(this.moduleRegistry.keys());
  }
} 