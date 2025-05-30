import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import {
  Snippet,
  SnippetCategory,
  SnippetFilter,
  SnippetSortBy,
  SnippetSortOrder,
  SnippetStats,
  SnippetImportExport,
} from "../types/snippets";
import { nanoid } from "nanoid";

// Estados del contexto
interface SnippetsState {
  snippets: Snippet[];
  categories: SnippetCategory[];
  filter: SnippetFilter;
  sortBy: SnippetSortBy;
  sortOrder: SnippetSortOrder;
  isLoading: boolean;
  selectedSnippet: Snippet | null;
  searchQuery: string;
}

// Acciones del reducer
type SnippetsAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_SNIPPETS"; payload: Snippet[] }
  | { type: "ADD_SNIPPET"; payload: Snippet }
  | {
      type: "UPDATE_SNIPPET";
      payload: { id: string; snippet: Partial<Snippet> };
    }
  | { type: "DELETE_SNIPPET"; payload: string }
  | { type: "SET_CATEGORIES"; payload: SnippetCategory[] }
  | { type: "ADD_CATEGORY"; payload: SnippetCategory }
  | {
      type: "UPDATE_CATEGORY";
      payload: { id: string; category: Partial<SnippetCategory> };
    }
  | { type: "DELETE_CATEGORY"; payload: string }
  | { type: "SET_FILTER"; payload: SnippetFilter }
  | {
      type: "SET_SORT";
      payload: { sortBy: SnippetSortBy; sortOrder: SnippetSortOrder };
    }
  | { type: "SET_SELECTED_SNIPPET"; payload: Snippet | null }
  | { type: "SET_SEARCH_QUERY"; payload: string }
  | {
      type: "BULK_IMPORT";
      payload: { snippets: Snippet[]; categories: SnippetCategory[] };
    };

// Estado inicial
const initialState: SnippetsState = {
  snippets: [],
  categories: [
    {
      id: "javascript",
      name: "JavaScript",
      description: "Snippets de JavaScript",
      color: "#f7df1e",
    },
    {
      id: "typescript",
      name: "TypeScript",
      description: "Snippets de TypeScript",
      color: "#3178c6",
    },
    {
      id: "react",
      name: "React",
      description: "Snippets de React",
      color: "#61dafb",
    },
    {
      id: "utils",
      name: "Utilidades",
      description: "Snippets de utilidades generales",
      color: "#6b7280",
    },
  ],
  filter: {},
  sortBy: "name",
  sortOrder: "asc",
  isLoading: false,
  selectedSnippet: null,
  searchQuery: "",
};

// Reducer
function snippetsReducer(
  state: SnippetsState,
  action: SnippetsAction
): SnippetsState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_SNIPPETS":
      return { ...state, snippets: action.payload };

    case "ADD_SNIPPET":
      return { ...state, snippets: [...state.snippets, action.payload] };

    case "UPDATE_SNIPPET":
      return {
        ...state,
        snippets: state.snippets.map((snippet) =>
          snippet.id === action.payload.id
            ? { ...snippet, ...action.payload.snippet, updatedAt: Date.now() }
            : snippet
        ),
      };

    case "DELETE_SNIPPET":
      return {
        ...state,
        snippets: state.snippets.filter(
          (snippet) => snippet.id !== action.payload
        ),
        selectedSnippet:
          state.selectedSnippet?.id === action.payload
            ? null
            : state.selectedSnippet,
      };

    case "SET_CATEGORIES":
      return { ...state, categories: action.payload };

    case "ADD_CATEGORY":
      return { ...state, categories: [...state.categories, action.payload] };

    case "UPDATE_CATEGORY":
      return {
        ...state,
        categories: state.categories.map((category) =>
          category.id === action.payload.id
            ? { ...category, ...action.payload.category }
            : category
        ),
      };

    case "DELETE_CATEGORY":
      return {
        ...state,
        categories: state.categories.filter(
          (category) => category.id !== action.payload
        ),
      };

    case "SET_FILTER":
      return { ...state, filter: action.payload };

    case "SET_SORT":
      return {
        ...state,
        sortBy: action.payload.sortBy,
        sortOrder: action.payload.sortOrder,
      };

    case "SET_SELECTED_SNIPPET":
      return { ...state, selectedSnippet: action.payload };

    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.payload };

    case "BULK_IMPORT":
      return {
        ...state,
        snippets: [...state.snippets, ...action.payload.snippets],
        categories: [...state.categories, ...action.payload.categories],
      };

    default:
      return state;
  }
}

// Interface del contexto
interface SnippetsContextType {
  state: SnippetsState;
  actions: {
    // Snippets
    addSnippet: (
      snippet: Omit<Snippet, "id" | "createdAt" | "updatedAt">
    ) => void;
    updateSnippet: (id: string, snippet: Partial<Snippet>) => void;
    deleteSnippet: (id: string) => void;
    duplicateSnippet: (id: string) => void;
    setSelectedSnippet: (snippet: Snippet | null) => void;

    // Categorías
    addCategory: (category: Omit<SnippetCategory, "id">) => void;
    updateCategory: (id: string, category: Partial<SnippetCategory>) => void;
    deleteCategory: (id: string) => void;

    // Filtros y búsqueda
    setFilter: (filter: SnippetFilter) => void;
    setSort: (sortBy: SnippetSortBy, sortOrder: SnippetSortOrder) => void;
    setSearchQuery: (query: string) => void;
    clearFilters: () => void;

    // Importar/Exportar
    exportSnippets: () => SnippetImportExport;
    importSnippets: (data: SnippetImportExport) => void;

    // Utilidades
    getFilteredSnippets: () => Snippet[];
    getSnippetStats: () => SnippetStats;
    saveToStorage: () => void;
    loadFromStorage: () => void;
  };
}

// Crear contexto
const SnippetsContext = createContext<SnippetsContextType | undefined>(
  undefined
);

// Provider
interface SnippetsProviderProps {
  children: ReactNode;
}

export function SnippetsProvider({ children }: SnippetsProviderProps) {
  const [state, dispatch] = useReducer(snippetsReducer, initialState);

  // Funciones del contexto
  const addSnippet = useCallback(
    (snippet: Omit<Snippet, "id" | "createdAt" | "updatedAt">) => {
      const newSnippet: Snippet = {
        ...snippet,
        id: nanoid(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      dispatch({ type: "ADD_SNIPPET", payload: newSnippet });
    },
    []
  );

  const updateSnippet = useCallback((id: string, snippet: Partial<Snippet>) => {
    dispatch({ type: "UPDATE_SNIPPET", payload: { id, snippet } });
  }, []);

  const deleteSnippet = useCallback((id: string) => {
    dispatch({ type: "DELETE_SNIPPET", payload: id });
  }, []);

  const duplicateSnippet = useCallback(
    (id: string) => {
      const snippet = state.snippets.find((s) => s.id === id);
      if (snippet) {
        const duplicated = {
          ...snippet,
          name: `${snippet.name} (Copia)`,
          prefix: `${snippet.prefix}_copy`,
          isBuiltIn: false,
        };
        delete (duplicated as any).id;
        delete (duplicated as any).createdAt;
        delete (duplicated as any).updatedAt;
        addSnippet(duplicated);
      }
    },
    [state.snippets, addSnippet]
  );

  const setSelectedSnippet = useCallback((snippet: Snippet | null) => {
    dispatch({ type: "SET_SELECTED_SNIPPET", payload: snippet });
  }, []);

  const addCategory = useCallback((category: Omit<SnippetCategory, "id">) => {
    const newCategory: SnippetCategory = {
      ...category,
      id: nanoid(),
    };
    dispatch({ type: "ADD_CATEGORY", payload: newCategory });
  }, []);

  const updateCategory = useCallback(
    (id: string, category: Partial<SnippetCategory>) => {
      dispatch({ type: "UPDATE_CATEGORY", payload: { id, category } });
    },
    []
  );

  const deleteCategory = useCallback((id: string) => {
    dispatch({ type: "DELETE_CATEGORY", payload: id });
  }, []);

  const setFilter = useCallback((filter: SnippetFilter) => {
    dispatch({ type: "SET_FILTER", payload: filter });
  }, []);

  const setSort = useCallback(
    (sortBy: SnippetSortBy, sortOrder: SnippetSortOrder) => {
      dispatch({ type: "SET_SORT", payload: { sortBy, sortOrder } });
    },
    []
  );

  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: "SET_SEARCH_QUERY", payload: query });
  }, []);

  const clearFilters = useCallback(() => {
    dispatch({ type: "SET_FILTER", payload: {} });
    dispatch({ type: "SET_SEARCH_QUERY", payload: "" });
  }, []);

  const exportSnippets = useCallback((): SnippetImportExport => {
    return {
      version: "1.0.0",
      snippets: state.snippets.filter((s) => !s.isBuiltIn),
      categories: state.categories,
      exportedAt: Date.now(),
    };
  }, [state.snippets, state.categories]);

  const importSnippets = useCallback(
    (data: SnippetImportExport) => {
      const existingPrefixes = new Set(state.snippets.map((s) => s.prefix));
      const uniqueSnippets = data.snippets.filter(
        (s) => !existingPrefixes.has(s.prefix)
      );

      const existingCategoryIds = new Set(state.categories.map((c) => c.id));
      const uniqueCategories = data.categories.filter(
        (c) => !existingCategoryIds.has(c.id)
      );

      dispatch({
        type: "BULK_IMPORT",
        payload: { snippets: uniqueSnippets, categories: uniqueCategories },
      });
    },
    [state.snippets, state.categories]
  );

  const getFilteredSnippets = useCallback((): Snippet[] => {
    let filtered = [...state.snippets];

    // Aplicar filtros
    if (state.filter.language) {
      filtered = filtered.filter((s) => s.language === state.filter.language);
    }
    if (state.filter.category) {
      filtered = filtered.filter((s) => s.category === state.filter.category);
    }
    if (state.filter.isBuiltIn !== undefined) {
      filtered = filtered.filter((s) => s.isBuiltIn === state.filter.isBuiltIn);
    }

    // Aplicar búsqueda
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.prefix.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query) ||
          (Array.isArray(s.body)
            ? s.body.join("").toLowerCase()
            : s.body.toLowerCase()
          ).includes(query)
      );
    }

    // Aplicar ordenamiento
    filtered.sort((a, b) => {
      let valueA: any, valueB: any;

      switch (state.sortBy) {
        case "name":
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case "prefix":
          valueA = a.prefix.toLowerCase();
          valueB = b.prefix.toLowerCase();
          break;
        case "language":
          valueA = a.language.toLowerCase();
          valueB = b.language.toLowerCase();
          break;
        case "category":
          valueA = a.category?.toLowerCase() || "";
          valueB = b.category?.toLowerCase() || "";
          break;
        case "createdAt":
          valueA = a.createdAt;
          valueB = b.createdAt;
          break;
        case "updatedAt":
          valueA = a.updatedAt;
          valueB = b.updatedAt;
          break;
        default:
          return 0;
      }

      if (valueA < valueB) return state.sortOrder === "asc" ? -1 : 1;
      if (valueA > valueB) return state.sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [
    state.snippets,
    state.filter,
    state.searchQuery,
    state.sortBy,
    state.sortOrder,
  ]);

  const getSnippetStats = useCallback((): SnippetStats => {
    const byLanguage: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let customCount = 0;
    let builtInCount = 0;

    state.snippets.forEach((snippet) => {
      byLanguage[snippet.language] = (byLanguage[snippet.language] || 0) + 1;

      if (snippet.category) {
        byCategory[snippet.category] = (byCategory[snippet.category] || 0) + 1;
      }

      if (snippet.isBuiltIn) {
        builtInCount++;
      } else {
        customCount++;
      }
    });

    return {
      total: state.snippets.length,
      byLanguage,
      byCategory,
      customCount,
      builtInCount,
    };
  }, [state.snippets]);

  const saveToStorage = useCallback(() => {
    try {
      const data = {
        snippets: state.snippets.filter((s) => !s.isBuiltIn),
        categories: state.categories,
      };
      localStorage.setItem("jsrunner-snippets", JSON.stringify(data));
    } catch (error) {
      console.error("Error guardando snippets:", error);
    }
  }, [state.snippets, state.categories]);

  const loadFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem("jsrunner-snippets");
      if (stored) {
        const data = JSON.parse(stored);
        dispatch({
          type: "SET_SNIPPETS",
          payload: [...getBuiltInSnippets(), ...data.snippets],
        });
        if (data.categories) {
          dispatch({ type: "SET_CATEGORIES", payload: data.categories });
        }
      } else {
        // Cargar snippets por defecto
        dispatch({ type: "SET_SNIPPETS", payload: getBuiltInSnippets() });
      }
    } catch (error) {
      console.error("Error cargando snippets:", error);
      dispatch({ type: "SET_SNIPPETS", payload: getBuiltInSnippets() });
    }
  }, []);

  // Cargar snippets al montar
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Guardar automáticamente cuando cambien los snippets
  useEffect(() => {
    if (state.snippets.length > 0) {
      saveToStorage();
    }
  }, [state.snippets, state.categories, saveToStorage]);

  const contextValue: SnippetsContextType = {
    state,
    actions: {
      addSnippet,
      updateSnippet,
      deleteSnippet,
      duplicateSnippet,
      setSelectedSnippet,
      addCategory,
      updateCategory,
      deleteCategory,
      setFilter,
      setSort,
      setSearchQuery,
      clearFilters,
      exportSnippets,
      importSnippets,
      getFilteredSnippets,
      getSnippetStats,
      saveToStorage,
      loadFromStorage,
    },
  };

  return (
    <SnippetsContext.Provider value={contextValue}>
      {children}
    </SnippetsContext.Provider>
  );
}

// Hook personalizado
export function useSnippets() {
  const context = useContext(SnippetsContext);
  if (context === undefined) {
    throw new Error("useSnippets debe usarse dentro de un SnippetsProvider");
  }
  return context;
}

// Snippets integrados por defecto
function getBuiltInSnippets(): Snippet[] {
  return [
    {
      id: "console-log",
      name: "Console Log",
      prefix: "log",
      description: "Registrar en consola",
      body: "console.log(${1:mensaje});",
      language: "javascript",
      category: "javascript",
      isBuiltIn: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "for-loop",
      name: "For Loop",
      prefix: "for",
      description: "Bucle for tradicional",
      body: [
        "for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {",
        "  ${3:// código aquí}",
        "}",
      ],
      language: "javascript",
      category: "javascript",
      isBuiltIn: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "for-of-loop",
      name: "For-Of Loop",
      prefix: "forof",
      description: "Bucle for...of para iterar arrays",
      body: [
        "for (const ${1:item} of ${2:array}) {",
        "  ${3:// código aquí}",
        "}",
      ],
      language: "javascript",
      category: "javascript",
      isBuiltIn: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "for-in-loop",
      name: "For-In Loop",
      prefix: "forin",
      description: "Bucle for...in para iterar propiedades de objeto",
      body: [
        "for (const ${1:key} in ${2:object}) {",
        "  if (${2:object}.hasOwnProperty(${1:key})) {",
        "    ${3:// código aquí}",
        "  }",
        "}",
      ],
      language: "javascript",
      category: "javascript",
      isBuiltIn: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "for-await-of",
      name: "For-Await-Of Loop",
      prefix: "forawaitof",
      description: "Bucle for await...of para iterables asíncronos",
      body: [
        "for await (const ${1:item} of ${2:asyncIterable}) {",
        "  ${3:// código aquí}",
        "}",
      ],
      language: "javascript",
      category: "javascript",
      isBuiltIn: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "foreach-method",
      name: "For-Each Loop using =>",
      prefix: "foreach",
      description: "Método forEach con arrow function",
      body: "${1:array}.forEach((${2:item}, ${3:index}) => {\n  ${4:// código aquí}\n});",
      language: "javascript",
      category: "javascript",
      isBuiltIn: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "function-declaration",
      name: "Function Declaration",
      prefix: "func",
      description: "Declaración de función",
      body: [
        "function ${1:nombreFuncion}(${2:parametros}) {",
        "  ${3:// código aquí}",
        "  return ${4:undefined};",
        "}",
      ],
      language: "javascript",
      category: "javascript",
      isBuiltIn: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "arrow-function",
      name: "Arrow Function",
      prefix: "arrf",
      description: "Función flecha",
      body: "const ${1:nombreFuncion} = (${2:parametros}) => {${3:// código aquí}};",
      language: "javascript",
      category: "javascript",
      isBuiltIn: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "try-catch",
      name: "Try-Catch Block",
      prefix: "try",
      description: "Bloque try-catch para manejo de errores",
      body: [
        "try {",
        "  ${1:// código que puede fallar}",
        "} catch (${2:error}) {",
        "  ${3:// manejar error}",
        "  console.error(${2:error});",
        "}",
      ],
      language: "javascript",
      category: "javascript",
      isBuiltIn: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "async-function",
      name: "Async Function",
      prefix: "asyncfunc",
      description: "Función asíncrona",
      body: [
        "async function ${1:nombreFuncion}(${2:parametros}) {",
        "  try {",
        "    ${3:// código asíncrono}",
        "    return ${4:resultado};",
        "  } catch (error) {",
        "    console.error(error);",
        "    throw error;",
        "  }",
        "}",
      ],
      language: "javascript",
      category: "javascript",
      isBuiltIn: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "react-component",
      name: "React Component",
      prefix: "rfc",
      description: "Componente de React funcional",
      body: [
        "function ${1:NombreComponente}() {",
        "  return (",
        "    <div>",
        "      ${2:contenido}",
        "    </div>",
        "  );",
        "}",
        "",
        "export default ${1:NombreComponente};",
      ],
      language: "javascript",
      category: "react",
      isBuiltIn: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "usestate-hook",
      name: "useState Hook",
      prefix: "useState",
      description: "Hook useState de React",
      body: "const [${1:estado}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:valorInicial});",
      language: "javascript",
      category: "react",
      isBuiltIn: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "useeffect-hook",
      name: "useEffect Hook",
      prefix: "useEffect",
      description: "Hook useEffect de React",
      body: [
        "useEffect(() => {",
        "  ${1:// efecto aquí}",
        "  ",
        "  return () => {",
        "    ${2:// limpieza aquí}",
        "  };",
        "}, [${3:dependencias}]);",
      ],
      language: "javascript",
      category: "react",
      isBuiltIn: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
}
