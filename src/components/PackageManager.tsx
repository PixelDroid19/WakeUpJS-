import { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Package, 
  Trash2, 
  CheckCircle, 
  ExternalLink, 
  X, 
  Plus,
  RefreshCw,
  HardDrive,
  Clock,
  ArrowUpCircle,
  Download
} from 'lucide-react';
import { usePackageManager, type Package as PackageType } from '../context/PackageManagerContext';

interface PackageManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PackageManager({ isOpen, onClose }: PackageManagerProps) {
  const {
    packages,
    installedPackages,
    isLoading,
    installPackage,
    uninstallPackage,
    searchPackages,
    refreshPackages,
    updatePackage,
    totalInstalled,
    totalSize,
    updatesAvailable
  } = usePackageManager();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PackageType[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [newPackageName, setNewPackageName] = useState('');
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'installed' | 'available' | 'search' | 'updates'>('installed');
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Manejar click fuera del modal
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Buscar paquetes
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchPackages(searchQuery);
      setSearchResults(results);
      setSelectedTab('search');
    } catch (error) {
      console.error('Error buscando paquetes:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Instalar paquete
  const handleInstallPackage = async (packageName: string, version?: string) => {
    try {
      await installPackage(packageName, version);
    } catch (error) {
      console.error('Error instalando paquete:', error);
      alert('Error instalando el paquete. Inténtalo de nuevo.');
    }
  };

  // Actualizar paquete
  const handleUpdatePackage = async (packageName: string) => {
    try {
      await updatePackage(packageName);
    } catch (error) {
      console.error('Error actualizando paquete:', error);
      alert('Error actualizando el paquete. Inténtalo de nuevo.');
    }
  };

  // Refrescar y verificar actualizaciones
  const handleRefreshPackages = async () => {
    try {
      await refreshPackages();
      if (updatesAvailable > 0) {
        setSelectedTab('updates');
      }
    } catch (error) {
      console.error('Error al refrescar paquetes:', error);
    }
  };

  // Agregar paquete personalizado
  const handleAddCustomPackage = async () => {
    if (!newPackageName.trim()) return;
    
    try {
      await installPackage(newPackageName);
      setNewPackageName('');
      setShowAddPackage(false);
    } catch (error) {
      console.error('Error agregando paquete:', error);
      alert('Error agregando el paquete. Verifica el nombre e inténtalo de nuevo.');
    }
  };

  if (!isOpen) return null;

  const installedPackagesList = Object.values(installedPackages);
  const availablePackages = packages.filter(pkg => !pkg.isInstalled);
  const updatablePackages = installedPackagesList.filter(pkg => pkg.hasUpdate);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Gestor de Paquetes
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {totalInstalled} paquetes instalados • {totalSize}
                {updatesAvailable > 0 && (
                  <span className="ml-2 text-orange-500 font-medium">
                    • {updatesAvailable} actualizaciones disponibles
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar paquetes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                          focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                        disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSearching ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Buscar
            </button>
            <button
              onClick={() => setShowAddPackage(!showAddPackage)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 
                        flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </div>

          {/* Add Custom Package */}
          {showAddPackage && (
            <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Nombre del paquete (ej: express)"
                  value={newPackageName}
                  onChange={(e) => setNewPackageName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomPackage()}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                            bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
                            focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button
                  onClick={handleAddCustomPackage}
                  disabled={!newPackageName.trim() || isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 
                            disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Instalar
                </button>
                <button
                  onClick={() => setShowAddPackage(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancelar
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Introduce el nombre de cualquier paquete de npm
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSelectedTab('installed')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              selectedTab === 'installed'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Instalados ({installedPackagesList.length})
          </button>
          {updatesAvailable > 0 && (
            <button
              onClick={() => setSelectedTab('updates')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                selectedTab === 'updates'
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Actualizaciones ({updatesAvailable})
            </button>
          )}
          <button
            onClick={() => setSelectedTab('available')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              selectedTab === 'available'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Disponibles ({availablePackages.length})
          </button>
          {searchResults.length > 0 && (
            <button
              onClick={() => setSelectedTab('search')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                selectedTab === 'search'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Búsqueda ({searchResults.length})
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {selectedTab === 'installed' && (
            <PackageList 
              packages={installedPackagesList}
              onUninstall={uninstallPackage}
              onUpdate={handleUpdatePackage}
              showInstallButton={false}
              isLoading={isLoading}
            />
          )}
          
          {selectedTab === 'updates' && (
            <PackageList 
              packages={updatablePackages}
              onUpdate={handleUpdatePackage}
              showInstallButton={false}
              isLoading={isLoading}
            />
          )}
          
          {selectedTab === 'available' && (
            <PackageList 
              packages={availablePackages}
              onInstall={handleInstallPackage}
              showInstallButton={true}
              isLoading={isLoading}
            />
          )}
          
          {selectedTab === 'search' && (
            <PackageList 
              packages={searchResults}
              onInstall={handleInstallPackage}
              onUninstall={uninstallPackage}
              onUpdate={handleUpdatePackage}
              showInstallButton={true}
              isLoading={isLoading}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <HardDrive className="w-4 h-4" />
                <span>Tamaño total: {totalSize}</span>
              </div>
              <div className="flex items-center gap-1">
                <Package className="w-4 h-4" />
                <span>{totalInstalled} paquetes</span>
              </div>
              {updatesAvailable > 0 && (
                <div className="flex items-center gap-1 text-orange-500">
                  <ArrowUpCircle className="w-4 h-4" />
                  <span>{updatesAvailable} actualizaciones</span>
                </div>
              )}
            </div>
            <button
              onClick={handleRefreshPackages}
              disabled={isLoading}
              className="flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Verificar actualizaciones
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente para lista de paquetes
interface PackageListProps {
  packages: PackageType[];
  onInstall?: (name: string, version?: string) => void;
  onUninstall?: (name: string) => void;
  onUpdate?: (name: string) => void;
  showInstallButton: boolean;
  isLoading: boolean;
}

function PackageList({ packages, onInstall, onUninstall, onUpdate, showInstallButton, isLoading }: PackageListProps) {
  if (packages.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">No hay paquetes para mostrar</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {packages.map((pkg) => (
        <div 
          key={pkg.name}
          className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 
                    rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                pkg.hasUpdate
                  ? 'bg-orange-100 dark:bg-orange-900/30' 
                  : pkg.isInstalled 
                    ? 'bg-green-100 dark:bg-green-900/30' 
                    : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                {pkg.hasUpdate ? (
                  <ArrowUpCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                ) : pkg.isInstalled ? (
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <Package className="w-4 h-4 text-gray-500" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {pkg.name}
                  </h3>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 
                                  px-2 py-1 rounded">
                    v{pkg.version}
                  </span>
                  {pkg.hasUpdate && pkg.latestVersion && (
                    <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 
                                    px-2 py-1 rounded">
                      {pkg.latestVersion} disponible
                    </span>
                  )}
                  {pkg.isBuiltIn && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 
                                    px-2 py-1 rounded">
                      Built-in
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {pkg.description}
                </p>
                
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  {pkg.size && (
                    <div className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      <span>{pkg.size}</span>
                    </div>
                  )}
                  {pkg.lastUpdated && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Actualizado {new Date(pkg.lastUpdated).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            {pkg.isInstalled ? (
              <>
                <a
                  href={`https://npmjs.com/package/${pkg.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                  title="Ver en npm"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                
                {pkg.hasUpdate && onUpdate && !pkg.isBuiltIn && (
                  <button
                    onClick={() => onUpdate(pkg.name)}
                    disabled={isLoading}
                    className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 
                              rounded-lg transition-colors disabled:opacity-50"
                    title="Actualizar"
                  >
                    <ArrowUpCircle className="w-4 h-4" />
                  </button>
                )}
                
                {!pkg.isBuiltIn && onUninstall && (
                  <button
                    onClick={() => onUninstall(pkg.name)}
                    disabled={isLoading}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 
                              rounded-lg transition-colors disabled:opacity-50"
                    title="Desinstalar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            ) : (
              showInstallButton && onInstall && (
                <button
                  onClick={() => onInstall(pkg.name, pkg.version)}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg 
                            hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Download className="w-4 h-4" />
                  Instalar
                </button>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
} 