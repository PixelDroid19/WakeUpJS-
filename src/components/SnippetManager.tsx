import React, { useState, useCallback, useMemo } from "react";
import { useSnippets } from "../context/SnippetsContext";
import { Snippet, SnippetCategory } from "../types/snippets";
import { validateSnippet } from "../lib/monaco/snippetProvider";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Download,
  Upload,
  Filter,
  Code,
  Clock,
  X,
  Check,
  AlertCircle,
  Folder,
  Sparkles,
} from "lucide-react";

interface SnippetManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SnippetFormData {
  name: string;
  prefix: string;
  description: string;
  body: string;
  language: string;
  category: string;
}

const languageOptions = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "markdown", label: "Markdown" },
  { value: "plaintext", label: "Texto plano" },
  { value: "*", label: "Universal" },
];

export default function SnippetManager({
  isOpen,
  onClose,
}: SnippetManagerProps) {
  const { state, actions } = useSnippets();
  const [activeTab, setActiveTab] = useState<"list" | "create" | "edit">(
    "list"
  );
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [formData, setFormData] = useState<SnippetFormData>({
    name: "",
    prefix: "",
    description: "",
    body: "",
    language: "javascript",
    category: "",
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Obtener snippets filtrados
  const filteredSnippets = useMemo(() => {
    return actions.getFilteredSnippets();
  }, [actions]);

  // Obtener estadísticas
  const stats = useMemo(() => {
    return actions.getSnippetStats();
  }, [actions]);

  // Limpiar formulario
  const clearForm = useCallback(() => {
    setFormData({
      name: "",
      prefix: "",
      description: "",
      body: "",
      language: "javascript",
      category: "",
    });
    setFormErrors([]);
    setEditingSnippet(null);
  }, []);

  // Manejar cambios en el formulario
  const handleFormChange = useCallback(
    (field: keyof SnippetFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Limpiar errores cuando el usuario empiece a corregir
      if (formErrors.length > 0) {
        setFormErrors([]);
      }
    },
    [formErrors.length]
  );

  // Validar y guardar snippet
  const handleSaveSnippet = useCallback(() => {
    const errors = validateSnippet(formData);

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingSnippet) {
      // Actualizar snippet existente
      actions.updateSnippet(editingSnippet.id, formData);
    } else {
      // Crear nuevo snippet
      actions.addSnippet(formData);
    }

    clearForm();
    setActiveTab("list");
  }, [formData, editingSnippet, actions, clearForm]);

  // Editar snippet
  const handleEditSnippet = useCallback((snippet: Snippet) => {
    setEditingSnippet(snippet);
    setFormData({
      name: snippet.name,
      prefix: snippet.prefix,
      description: snippet.description || "",
      body: Array.isArray(snippet.body)
        ? snippet.body.join("\n")
        : snippet.body,
      language: snippet.language,
      category: snippet.category || "",
    });
    setActiveTab("edit");
  }, []);

  // Eliminar snippet
  const handleDeleteSnippet = useCallback(
    (id: string) => {
      if (confirm("¿Estás seguro de que quieres eliminar este snippet?")) {
        actions.deleteSnippet(id);
      }
    },
    [actions]
  );

  // Duplicar snippet
  const handleDuplicateSnippet = useCallback(
    (id: string) => {
      actions.duplicateSnippet(id);
    },
    [actions]
  );

  // Exportar snippets
  const handleExportSnippets = useCallback(() => {
    const data = actions.exportSnippets();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jsrunner-snippets-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [actions]);

  // Importar snippets
  const handleImportSnippets = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          actions.importSnippets(data);
          alert("Snippets importados correctamente");
        } catch (error) {
          alert("Error al importar snippets: archivo inválido");
        }
      };
      reader.readAsText(file);
    },
    [actions]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-6xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">
              Gestor de Snippets
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{stats.total} total</span>
              <span>•</span>
              <span>{stats.customCount} personalizados</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => {
              setActiveTab("list");
              clearForm();
            }}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "list"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Snippets ({filteredSnippets.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("create");
              clearForm();
            }}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "create"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Crear Snippet
          </button>
          {editingSnippet && (
            <button
              onClick={() => setActiveTab("edit")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "edit"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Edit2 className="w-4 h-4 inline mr-2" />
              Editar: {editingSnippet.name}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "list" && (
            <SnippetList
              snippets={filteredSnippets}
              stats={stats}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
              onEdit={handleEditSnippet}
              onDelete={handleDeleteSnippet}
              onDuplicate={handleDuplicateSnippet}
              onExport={handleExportSnippets}
              onImport={handleImportSnippets}
              searchQuery={state.searchQuery}
              onSearchChange={actions.setSearchQuery}
              filter={state.filter}
              onFilterChange={actions.setFilter}
              categories={state.categories}
              actions={actions}
            />
          )}

          {(activeTab === "create" || activeTab === "edit") && (
            <SnippetForm
              formData={formData}
              formErrors={formErrors}
              isEditing={activeTab === "edit"}
              onChange={handleFormChange}
              onSave={handleSaveSnippet}
              onCancel={() => {
                clearForm();
                setActiveTab("list");
              }}
              categories={state.categories}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Componente de lista de snippets
interface SnippetListProps {
  snippets: Snippet[];
  stats: any;
  showFilters: boolean;
  onToggleFilters: () => void;
  onEdit: (snippet: Snippet) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filter: any;
  onFilterChange: (filter: any) => void;
  categories: SnippetCategory[];
  actions: any;
}

function SnippetList({
  snippets,
  stats,
  showFilters,
  onToggleFilters,
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
  onImport,
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  categories,
  actions,
}: SnippetListProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar snippets..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
          </div>

          {/* Filtros */}
          <button
            onClick={onToggleFilters}
            className={`px-3 py-2 border rounded-lg transition-colors ${
              showFilters
                ? "bg-blue-600 border-blue-600 text-white"
                : "border-gray-600 text-gray-400 hover:text-white hover:border-gray-500"
            }`}
          >
            <Filter className="w-4 h-4 inline mr-2" />
            Filtros
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Exportar */}
          <button
            onClick={onExport}
            className="px-3 py-2 border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4 inline mr-2" />
            Exportar
          </button>

          {/* Importar */}
          <label className="px-3 py-2 border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500 rounded-lg transition-colors cursor-pointer">
            <Upload className="w-4 h-4 inline mr-2" />
            Importar
            <input
              type="file"
              accept=".json"
              onChange={onImport}
              className="hidden"
            />
          </label>

          {/* Botón para crear snippet de ejemplo */}
          <button
            onClick={() => {
              // Crear un snippet de ejemplo para probar la funcionalidad de eliminar
              const exampleSnippet = {
                name: `Snippet de Prueba ${Date.now()}`,
                prefix: `test${Date.now().toString().slice(-4)}`,
                description: 'Snippet de ejemplo que puedes eliminar',
                body: `// Snippet de prueba creado el ${new Date().toLocaleString()}\nconsole.log('Hola desde snippet de prueba');`,
                language: 'javascript',
                category: 'test',
              };
              actions.addSnippet(exampleSnippet);
            }}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            title="Crear snippet de prueba para testear eliminación"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Crear Ejemplo
          </button>
        </div>
      </div>

      {/* Filtros expandidos */}
      {showFilters && (
        <div className="p-4 bg-gray-800/50 border-b border-gray-700">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Lenguaje
              </label>
              <select
                value={filter.language || ""}
                onChange={(e) =>
                  onFilterChange({
                    ...filter,
                    language: e.target.value || undefined,
                  })
                }
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Todos los lenguajes</option>
                {languageOptions.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Categoría
              </label>
              <select
                value={filter.category || ""}
                onChange={(e) =>
                  onFilterChange({
                    ...filter,
                    category: e.target.value || undefined,
                  })
                }
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Todas las categorías</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Tipo</label>
              <select
                value={
                  filter.isBuiltIn !== undefined
                    ? filter.isBuiltIn
                      ? "builtin"
                      : "custom"
                    : ""
                }
                onChange={(e) => {
                  const value = e.target.value;
                  onFilterChange({
                    ...filter,
                    isBuiltIn: value === "" ? undefined : value === "builtin",
                  });
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Todos los tipos</option>
                <option value="custom">Personalizados</option>
                <option value="builtin">Integrados</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Lista de snippets */}
      <div className="flex-1 overflow-auto p-4">
        {snippets.length === 0 ? (
          <div className="text-center py-12">
            <Code className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">
              No se encontraron snippets
            </p>
            <p className="text-gray-500 text-sm">
              {searchQuery || Object.keys(filter).length > 0
                ? "Prueba ajustando los filtros o la búsqueda"
                : "Crea tu primer snippet personalizado"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {snippets.map((snippet) => (
              <SnippetCard
                key={snippet.id}
                snippet={snippet}
                onEdit={() => onEdit(snippet)}
                onDelete={() => onDelete(snippet.id)}
                onDuplicate={() => onDuplicate(snippet.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Componente de tarjeta de snippet
interface SnippetCardProps {
  snippet: Snippet;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function SnippetCard({
  snippet,
  onEdit,
  onDelete,
  onDuplicate,
}: SnippetCardProps) {
  const bodyPreview = Array.isArray(snippet.body)
    ? snippet.body.join("\n")
    : snippet.body;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium truncate">{snippet.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-xs bg-gray-700 text-blue-300 px-2 py-1 rounded">
              {snippet.prefix}
            </code>
            <span className="text-xs text-gray-400">{snippet.language}</span>
            {snippet.isBuiltIn && (
              <span className="text-xs bg-green-900/50 text-green-300 px-2 py-1 rounded">
                integrado
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={onEdit}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors group"
            title="Editar snippet"
          >
            <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-white" />
          </button>
          <button
            onClick={onDuplicate}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors group"
            title="Duplicar snippet"
          >
            <Copy className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
          </button>
          {!snippet.isBuiltIn ? (
            <button
              onClick={onDelete}
              className="p-1.5 hover:bg-red-500/20 rounded transition-colors group"
              title="Eliminar snippet personalizado"
            >
              <Trash2 className="w-4 h-4 text-red-400 group-hover:text-red-300" />
            </button>
          ) : (
            <div
              className="p-1.5 rounded opacity-50 cursor-not-allowed"
              title="Los snippets integrados no se pueden eliminar"
            >
              <Trash2 className="w-4 h-4 text-gray-600" />
            </div>
          )}
        </div>
      </div>

      {snippet.description && (
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">
          {snippet.description}
        </p>
      )}

      <div className="bg-gray-900 rounded p-3 mb-3">
        <pre className="text-xs text-gray-300 overflow-x-auto max-h-20">
          {bodyPreview.substring(0, 200)}
          {bodyPreview.length > 200 && "..."}
        </pre>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          {snippet.category && (
            <span className="flex items-center gap-1">
              <Folder className="w-3 h-3" />
              {snippet.category}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(snippet.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

// Componente de formulario de snippet
interface SnippetFormProps {
  formData: SnippetFormData;
  formErrors: string[];
  isEditing: boolean;
  onChange: (field: keyof SnippetFormData, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  categories: SnippetCategory[];
}

function SnippetForm({
  formData,
  formErrors,
  isEditing,
  onChange,
  onSave,
  onCancel,
  categories,
}: SnippetFormProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Errores */}
          {formErrors.length > 0 && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <h4 className="text-red-300 font-medium">
                  Errores en el formulario
                </h4>
              </div>
              <ul className="list-disc list-inside text-red-300 text-sm space-y-1">
                {formErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Información básica */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => onChange("name", e.target.value)}
                placeholder="Ej: Console Log"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Prefijo *
              </label>
              <input
                type="text"
                value={formData.prefix}
                onChange={(e) => onChange("prefix", e.target.value)}
                placeholder="Ej: log"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Texto que activa el snippet al escribir
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descripción
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => onChange("description", e.target.value)}
              placeholder="Descripción opcional del snippet"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Lenguaje *
              </label>
              <select
                value={formData.language}
                onChange={(e) => onChange("language", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {languageOptions.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Categoría
              </label>
              <select
                value={formData.category}
                onChange={(e) => onChange("category", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sin categoría</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cuerpo del snippet */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cuerpo del Snippet *
            </label>
            <textarea
              value={formData.body}
              onChange={(e) => onChange("body", e.target.value)}
              placeholder="console.log(${1:mensaje});"
              rows={12}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
            <div className="text-xs text-gray-500 mt-2 space-y-1">
              <p>
                <strong>Variables disponibles:</strong>
              </p>
              <p>
                • <code>${"${1:texto}"}</code> - Posición del cursor con texto
                por defecto
              </p>
              <p>
                • <code>${"${1}"}</code> - Posición del cursor simple
              </p>
              <p>
                • <code>${"${TM_FILENAME}"}</code> - Nombre del archivo actual
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          {isEditing ? "Actualizar" : "Crear"} Snippet
        </button>
      </div>
    </div>
  );
}
