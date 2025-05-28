import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export interface Package {
  name: string;
  version: string;
  description: string;
  isInstalled: boolean;
  isBuiltIn: boolean;
  size?: string;
  lastUpdated?: string;
  latestVersion?: string;
  hasUpdate?: boolean;
}

interface PackageManagerContextType {
  // Estado
  packages: Package[];
  installedPackages: Record<string, Package>;
  isLoading: boolean;

  // Acciones
  installPackage: (packageName: string, version?: string) => Promise<void>;
  uninstallPackage: (packageName: string) => void;
  searchPackages: (query: string) => Promise<Package[]>;
  refreshPackages: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  updatePackage: (packageName: string) => Promise<void>;

  // Estadísticas
  totalInstalled: number;
  totalSize: string;
  updatesAvailable: number;
}

const PackageManagerContext = createContext<
  PackageManagerContextType | undefined
>(undefined);

// Paquetes disponibles por defecto (simulados)
const DEFAULT_PACKAGES: Package[] = [
  {
    name: "react",
    version: "18.2.0",
    description: "A JavaScript library for building user interfaces",
    isInstalled: true,
    isBuiltIn: true,
    size: "2.5 MB",
  },
  {
    name: "lodash",
    version: "4.17.21",
    description:
      "A modern JavaScript utility library delivering modularity, performance & extras",
    isInstalled: true,
    isBuiltIn: true,
    size: "1.2 MB",
  },
  {
    name: "axios",
    version: "1.6.0",
    description: "Promise based HTTP client for the browser and node.js",
    isInstalled: false,
    isBuiltIn: false,
    size: "500 KB",
  },
  {
    name: "moment",
    version: "2.29.4",
    description: "Parse, validate, manipulate, and display dates in javascript",
    isInstalled: false,
    isBuiltIn: false,
    size: "300 KB",
  },
  {
    name: "uuid",
    version: "9.0.1",
    description: "RFC4122 (v1, v4, and v5) UUIDs",
    isInstalled: false,
    isBuiltIn: false,
    size: "100 KB",
  },
  {
    name: "date-fns",
    version: "2.30.0",
    description: "Modern JavaScript date utility library",
    isInstalled: false,
    isBuiltIn: false,
    size: "200 KB",
  },
];

interface PackageManagerProviderProps {
  children: ReactNode;
}

// Función para obtener información de un paquete desde el registro npm
async function fetchPackageInfo(packageName: string): Promise<any> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}`);
    if (!response.ok) {
      throw new Error(
        `Error al obtener información del paquete: ${response.statusText}`
      );
    }
    return await response.json();
  } catch (error) {
    console.error(
      `Error al consultar el registro npm para ${packageName}:`,
      error
    );
    throw error;
  }
}

// Función para obtener la última versión de un paquete
async function fetchLatestVersion(packageName: string): Promise<string> {
  try {
    const response = await fetch(
      `https://registry.npmjs.org/${packageName}/latest`
    );
    if (!response.ok) {
      throw new Error(
        `Error al obtener la última versión: ${response.statusText}`
      );
    }
    const data = await response.json();
    return data.version;
  } catch (error) {
    console.error(
      `Error al obtener la última versión de ${packageName}:`,
      error
    );
    throw error;
  }
}

// Función para comparar versiones semánticas
function compareVersions(version1: string, version2: string): number {
  const parts1 = version1.split(".").map(Number);
  const parts2 = version2.split(".").map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = i < parts1.length ? parts1[i] : 0;
    const part2 = i < parts2.length ? parts2[i] : 0;

    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
}

export function PackageManagerProvider({
  children,
}: PackageManagerProviderProps) {
  const [packages, setPackages] = useState<Package[]>(DEFAULT_PACKAGES);
  const [installedPackages, setInstalledPackages] = useState<
    Record<string, Package>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [updatesAvailable, setUpdatesAvailable] = useState<number>(0);

  // Cargar paquetes instalados desde localStorage al inicializar
  useEffect(() => {
    const savedPackages = localStorage.getItem("jsrunner-packages");
    const savedPackagesList = localStorage.getItem("jsrunner-packages-list");

    if (savedPackages && savedPackagesList) {
      try {
        const parsedInstalled = JSON.parse(savedPackages);
        const parsedList = JSON.parse(savedPackagesList);

        setInstalledPackages(parsedInstalled);
        setPackages(parsedList);

        // Verificar actualizaciones al cargar
        checkForUpdates(parsedInstalled);
      } catch (error) {
        console.error("Error cargando paquetes guardados:", error);
      }
    } else {
      // Inicializar con paquetes por defecto
      const defaultInstalled: Record<string, Package> = {};
      DEFAULT_PACKAGES.filter((pkg) => pkg.isBuiltIn).forEach((pkg) => {
        defaultInstalled[pkg.name] = pkg;
      });

      setInstalledPackages(defaultInstalled);
      savePackagesToStorage(defaultInstalled, DEFAULT_PACKAGES);

      // Verificar actualizaciones para los paquetes predeterminados
      checkForUpdates(defaultInstalled);
    }
  }, []);

  // Guardar en localStorage
  const savePackagesToStorage = (
    installed: Record<string, Package>,
    allPackages: Package[]
  ) => {
    localStorage.setItem("jsrunner-packages", JSON.stringify(installed));
    localStorage.setItem("jsrunner-packages-list", JSON.stringify(allPackages));
  };

  // Verificar actualizaciones para los paquetes instalados
  const checkForUpdates = async (packagesToCheck = installedPackages) => {
    setIsLoading(true);
    let updatesCount = 0;

    try {
      const packageNames = Object.keys(packagesToCheck);
      const updatedPackages = { ...packagesToCheck };
      const updatedPackagesList = [...packages];

      for (const pkgName of packageNames) {
        try {
          // Saltamos los paquetes built-in para este ejemplo
          if (packagesToCheck[pkgName].isBuiltIn) continue;

          const latestVersion = await fetchLatestVersion(pkgName);
          const currentVersion = packagesToCheck[pkgName].version;
          const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

          // Actualizar información de versión en el objeto de paquete
          updatedPackages[pkgName] = {
            ...updatedPackages[pkgName],
            latestVersion,
            hasUpdate,
          };

          // Actualizar también en la lista completa de paquetes
          const pkgIndex = updatedPackagesList.findIndex(
            (p) => p.name === pkgName
          );
          if (pkgIndex !== -1) {
            updatedPackagesList[pkgIndex] = {
              ...updatedPackagesList[pkgIndex],
              latestVersion,
              hasUpdate,
            };
          }

          if (hasUpdate) {
            updatesCount++;
            console.log(
              `📦 Actualización disponible para ${pkgName}: ${currentVersion} → ${latestVersion}`
            );
          }
        } catch (error) {
          console.error(
            `Error al verificar actualizaciones para ${pkgName}:`,
            error
          );
        }
      }

      setInstalledPackages(updatedPackages);
      setPackages(updatedPackagesList);
      setUpdatesAvailable(updatesCount);
      savePackagesToStorage(updatedPackages, updatedPackagesList);

      console.log(
        `✅ Verificación de actualizaciones completada. ${updatesCount} actualizaciones disponibles.`
      );
    } catch (error) {
      console.error("Error al verificar actualizaciones:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Instalar un paquete
  const installPackage = async (
    packageName: string,
    version?: string
  ): Promise<void> => {
    setIsLoading(true);

    try {
      // Obtener información del paquete desde npm
      const packageInfo = await fetchPackageInfo(packageName);
      const latestVersion =
        version || packageInfo["dist-tags"]?.latest || "latest";
      const packageDescription =
        packageInfo.description || `Paquete ${packageName}`;

      // Simular instalación desde CDN
      await simulatePackageInstallation(packageName, version);

      const existingPkg = packages.find((pkg) => pkg.name === packageName);
      let packageToInstall: Package;

      if (existingPkg) {
        packageToInstall = {
          ...existingPkg,
          isInstalled: true,
          version: version || existingPkg.version,
          description: packageDescription,
          latestVersion,
          hasUpdate: false, // Acabamos de instalar, así que no hay actualización
        };
      } else {
        // Crear nuevo paquete si no existe en la lista
        packageToInstall = {
          name: packageName,
          version: latestVersion,
          description: packageDescription,
          isInstalled: true,
          isBuiltIn: false,
          size: calculatePackageSize(packageInfo),
          lastUpdated: new Date().toISOString(),
          latestVersion,
          hasUpdate: false,
        };
      }

      const newInstalled = {
        ...installedPackages,
        [packageName]: packageToInstall,
      };
      const newPackages = packages.map((pkg) =>
        pkg.name === packageName ? { ...pkg, isInstalled: true } : pkg
      );

      // Si es un paquete nuevo, agregarlo a la lista
      if (!existingPkg) {
        newPackages.push(packageToInstall);
      }

      setInstalledPackages(newInstalled);
      setPackages(newPackages);
      savePackagesToStorage(newInstalled, newPackages);

      // Notificar al sistema de autocompletado
      notifyPackageChange();

      console.log(
        `📦 Paquete ${packageName}@${latestVersion} instalado exitosamente`
      );
    } catch (error) {
      console.error(`Error instalando paquete ${packageName}:`, error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Actualizar un paquete a la última versión
  const updatePackage = async (packageName: string): Promise<void> => {
    if (!installedPackages[packageName]) {
      throw new Error(`El paquete ${packageName} no está instalado`);
    }

    if (installedPackages[packageName].isBuiltIn) {
      console.warn(
        `No se puede actualizar el paquete built-in: ${packageName}`
      );
      return;
    }

    try {
      setIsLoading(true);

      const latestVersion = await fetchLatestVersion(packageName);

      // Simular actualización
      await simulatePackageInstallation(packageName, latestVersion);

      // Actualizar el paquete en el estado
      const updatedPackage = {
        ...installedPackages[packageName],
        version: latestVersion,
        latestVersion,
        hasUpdate: false,
        lastUpdated: new Date().toISOString(),
      };

      const newInstalled = {
        ...installedPackages,
        [packageName]: updatedPackage,
      };
      const newPackages = packages.map((pkg) =>
        pkg.name === packageName
          ? { ...updatedPackage, isInstalled: true }
          : pkg
      );

      setInstalledPackages(newInstalled);
      setPackages(newPackages);

      // Actualizar contador de actualizaciones disponibles
      setUpdatesAvailable((prev) => Math.max(0, prev - 1));

      savePackagesToStorage(newInstalled, newPackages);
      notifyPackageChange();

      console.log(
        `📦 Paquete ${packageName} actualizado a la versión ${latestVersion}`
      );
    } catch (error) {
      console.error(`Error actualizando paquete ${packageName}:`, error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Desinstalar un paquete
  const uninstallPackage = (packageName: string) => {
    if (installedPackages[packageName]?.isBuiltIn) {
      console.warn(
        `No se puede desinstalar el paquete built-in: ${packageName}`
      );
      return;
    }

    const newInstalled = { ...installedPackages };
    delete newInstalled[packageName];

    const newPackages = packages.map((pkg) =>
      pkg.name === packageName ? { ...pkg, isInstalled: false } : pkg
    );

    // Si el paquete tenía actualizaciones disponibles, actualizar el contador
    if (installedPackages[packageName]?.hasUpdate) {
      setUpdatesAvailable((prev) => Math.max(0, prev - 1));
    }

    setInstalledPackages(newInstalled);
    setPackages(newPackages);
    savePackagesToStorage(newInstalled, newPackages);

    // Notificar al sistema de autocompletado
    notifyPackageChange();

    console.log(`📦 Paquete ${packageName} desinstalado`);
  };

  // Buscar paquetes en el registro npm
  const searchPackages = async (query: string): Promise<Package[]> => {
    setIsLoading(true);

    try {
      if (!query || query.trim() === "") {
        return packages.filter((pkg) => !pkg.isInstalled).map((pkg) => ({
          ...pkg,
          isInstalled: !!installedPackages[pkg.name],
          hasUpdate: installedPackages[pkg.name]?.hasUpdate || false,
        }));
      }

      // Buscar en el registro npm
      const response = await fetch(
        `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(
          query
        )}&size=20`
      );
      if (!response.ok) {
        throw new Error(`Error en la búsqueda: ${response.statusText}`);
      }

      const data = await response.json();

      // Convertir los resultados al formato de Package
      const searchResults: Package[] = data.objects.map((obj: any) => {
        const pkgData = obj.package;
        const existingPkg = packages.find((p) => p.name === pkgData.name);
        const installedPkg = installedPackages[pkgData.name];

        return {
          name: pkgData.name,
          version: pkgData.version,
          description: pkgData.description || `Paquete ${pkgData.name}`,
          isInstalled: !!installedPkg,
          isBuiltIn: existingPkg?.isBuiltIn || installedPkg?.isBuiltIn || false,
          size: installedPkg?.size || existingPkg?.size || "Desconocido",
          lastUpdated: pkgData.date,
          latestVersion: pkgData.version,
          hasUpdate: installedPkg?.hasUpdate || false,
        };
      });

      return searchResults;
    } catch (error) {
      console.error("Error en la búsqueda de paquetes:", error);

      // Fallback a la búsqueda local
      const filtered = packages.filter(
        (pkg) =>
          pkg.name.toLowerCase().includes(query.toLowerCase()) ||
          pkg.description.toLowerCase().includes(query.toLowerCase())
      ).map((pkg) => ({
        ...pkg,
        isInstalled: !!installedPackages[pkg.name],
        hasUpdate: installedPackages[pkg.name]?.hasUpdate || false,
      }));

      return filtered;
    } finally {
      setIsLoading(false);
    }
  };

  // Refrescar lista de paquetes y verificar actualizaciones
  const refreshPackages = async () => {
    console.log(
      "🔄 Refrescando lista de paquetes y verificando actualizaciones..."
    );
    await checkForUpdates();
  };

  // Estadísticas
  const totalInstalled = Object.keys(installedPackages).length;
  const totalSize = calculateTotalSize(Object.values(installedPackages));

  const value: PackageManagerContextType = {
    packages,
    installedPackages,
    isLoading,
    installPackage,
    uninstallPackage,
    searchPackages,
    refreshPackages,
    checkForUpdates,
    updatePackage,
    totalInstalled,
    totalSize,
    updatesAvailable,
  };

  return (
    <PackageManagerContext.Provider value={value}>
      {children}
    </PackageManagerContext.Provider>
  );
}

// Hook para usar el contexto
export function usePackageManager() {
  const context = useContext(PackageManagerContext);
  if (context === undefined) {
    throw new Error(
      "usePackageManager must be used within a PackageManagerProvider"
    );
  }
  return context;
}

// Función auxiliar para simular instalación de paquetes
async function simulatePackageInstallation(
  packageName: string,
  version?: string
): Promise<void> {
  // Simular tiempo de instalación
  await new Promise((resolve) =>
    setTimeout(resolve, 1000 + Math.random() * 2000)
  );

  // Simular posibles errores
  if (Math.random() < 0.05) {
    // 5% de probabilidad de error
    throw new Error(`Failed to install ${packageName}: Network error`);
  }

  console.log(`Installing ${packageName}@${version || "latest"}...`);
}

// Estimar el tamaño del paquete basado en la información del registro
function calculatePackageSize(packageInfo: any): string {
  // Esta es una estimación muy simplificada
  const versions = Object.keys(packageInfo.versions || {}).length;
  const dependencies = Object.keys(
    packageInfo.versions?.[packageInfo["dist-tags"]?.latest]?.dependencies || {}
  ).length;

  // Algoritmo simple de estimación
  const sizeKB = Math.round(100 + dependencies * 50 + versions * 5);

  if (sizeKB < 1000) return `${sizeKB} KB`;
  return `${(sizeKB / 1024).toFixed(1)} MB`;
}

// Función auxiliar para calcular tamaño total
function calculateTotalSize(packages: Package[]): string {
  const totalKB = packages.reduce((acc, pkg) => {
    if (!pkg.size) return acc;

    const sizeMatch = pkg.size.match(/(\d+\.?\d*)\s*(KB|MB|GB)/);
    if (!sizeMatch) return acc;

    const [, size, unit] = sizeMatch;
    const sizeNum = parseFloat(size);

    switch (unit) {
      case "KB":
        return acc + sizeNum;
      case "MB":
        return acc + sizeNum * 1024;
      case "GB":
        return acc + sizeNum * 1024 * 1024;
      default:
        return acc;
    }
  }, 0);

  if (totalKB < 1024) return `${totalKB.toFixed(1)} KB`;
  if (totalKB < 1024 * 1024) return `${(totalKB / 1024).toFixed(1)} MB`;
  return `${(totalKB / (1024 * 1024)).toFixed(1)} GB`;
}

// Función para notificar cambios a los listeners del autocompletado
function notifyPackageChange(): void {
  // Disparar evento personalizado para notificar cambios en los paquetes
  window.dispatchEvent(
    new CustomEvent("jsrunner-packages-changed", {
      detail: {
        timestamp: Date.now(),
        source: "package-manager",
      },
    })
  );
}
