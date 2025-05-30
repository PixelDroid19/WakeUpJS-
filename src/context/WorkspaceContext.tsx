import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from "react";
import { setEnvironmentVariables } from "../lib/code/run";

// Tipos para el workspace
interface WorkspaceFile {
  id: string;
  name: string;
  content: string;
  language: "javascript" | "typescript" | "html" | "css";
  isActive: boolean;
  lastModified: number;
  isUnsaved: boolean;
}

interface ExecutionHistory {
  id: string;
  timestamp: number;
  code: string;
  results: any[];
  errors: any[];
  executionTime: number;
}

interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  files: Omit<
    WorkspaceFile,
    "id" | "isActive" | "lastModified" | "isUnsaved"
  >[];
  category: "react" | "vanilla" | "algorithms" | "examples";
}

interface EnvironmentVariables {
  [key: string]: string;
}

interface WorkspaceState {
  files: WorkspaceFile[];
  activeFileId: string | null;
  history: ExecutionHistory[];
  templates: WorkspaceTemplate[];
  environmentVariables: EnvironmentVariables;
  closedTabs: WorkspaceFile[]; // Pestañas cerradas para poder reabrirlas
  settings: {
    autoSave: boolean;
    theme: string;
    fontSize: number;
    showMinimap: boolean;
    wordWrap: boolean;
  };
}

type WorkspaceAction =
  | {
      type: "CREATE_FILE";
      payload: { 
        name: string; 
        language?: WorkspaceFile["language"]; 
        content?: string; 
      };
    }
  | { type: "DELETE_FILE"; payload: { id: string } }
  | { type: "RENAME_FILE"; payload: { id: string; name: string } }
  | { type: "UPDATE_FILE_CONTENT"; payload: { id: string; content: string } }
  | { type: "UPDATE_FILE_LANGUAGE"; payload: { id: string; language: WorkspaceFile["language"] } }
  | { type: "SET_ACTIVE_FILE"; payload: { id: string } }
  | { type: "DUPLICATE_FILE"; payload: { id: string } }
  | { type: "SAVE_FILE"; payload: { id: string } }
  | { type: "SAVE_ALL_FILES" }
  | { type: "ADD_TO_HISTORY"; payload: ExecutionHistory }
  | { type: "CLEAR_HISTORY" }
  | { type: "LOAD_TEMPLATE"; payload: { templateId: string } }
  | { type: "EXPORT_WORKSPACE" }
  | { type: "IMPORT_WORKSPACE"; payload: { workspace: WorkspaceState } }
  | { type: "UPDATE_SETTINGS"; payload: Partial<WorkspaceState["settings"]> }
  | { type: "UPDATE_ENVIRONMENT_VARIABLES"; payload: EnvironmentVariables }
  | { type: "REOPEN_CLOSED_TAB" }
  | { type: "LOAD_FROM_STORAGE" };

// Templates predefinidos
const DEFAULT_TEMPLATES: WorkspaceTemplate[] = [
  {
    id: "react-basic",
    name: "React Básico",
    description: "Componente React básico con useState",
    category: "react",
    files: [
      {
        name: "App",
        content: `import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Contador: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Incrementar
      </button>
      <p>Variables de entorno:</p>
      <p>API URL: {process.env.REACT_APP_API_URL}</p>
      <p>Version: {process.env.REACT_APP_VERSION}</p>
    </div>
  );
}

export default App;`,
        language: "javascript",
      },
    ],
  },
  {
    id: "vanilla-dom",
    name: "Manipulación DOM",
    description: "Ejemplo de manipulación del DOM con JavaScript vanilla",
    category: "vanilla",
    files: [
      {
        name: "script",
        content: `// Crear elementos dinámicamente
const container = document.createElement('div');
container.innerHTML = '<h1>¡Hola Mundo!</h1>';

// Agregar eventos
const button = document.createElement('button');
button.textContent = 'Click me';
button.addEventListener('click', () => {
  console.log('Button clicked!');
  console.log('Environment:', process.env.NODE_ENV);
});

container.appendChild(button);
console.log('DOM element created:', container);`,
        language: "javascript",
      },
    ],
  },
  {
    id: "algorithms",
    name: "Algoritmos Básicos",
    description: "Implementaciones de algoritmos comunes",
    category: "algorithms",
    files: [
      {
        name: "sorting",
        content: `// Algoritmos de ordenamiento

// Bubble Sort
function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}

// Quick Sort
function quickSort(arr) {
  if (arr.length <= 1) return arr;
  
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  
  return [...quickSort(left), ...middle, ...quickSort(right)];
}

// Pruebas
const numbers = [64, 34, 25, 12, 22, 11, 90];
console.log('Original:', numbers);
console.log('Bubble Sort:', bubbleSort([...numbers]));
console.log('Quick Sort:', quickSort([...numbers]));`,
        language: "javascript",
      },
    ],
  },
  {
    id: "api-fetch",
    name: "API y Fetch",
    description: "Ejemplo de consumo de APIs con fetch",
    category: "examples",
    files: [
      {
        name: "api-example",
        content: `// Ejemplo de consumo de API
async function fetchUserData(userId) {
  try {
    const apiUrl = process.env.REACT_APP_API_URL || 'https://jsonplaceholder.typicode.com';
    const response = await fetch(\`\${apiUrl}/users/\${userId}\`);
    
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    
    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
}

// Función para mostrar datos
async function displayUser(userId) {
  console.log(\`Fetching user \${userId}...\`);
  const user = await fetchUserData(userId);
  
  if (user) {
    console.log('User data:', {
      name: user.name,
      email: user.email,
      company: user.company?.name || 'N/A'
    });
  } else {
    console.log('Failed to fetch user data');
  }
}

// Ejemplo de uso
displayUser(1);`,
        language: "javascript",
      },
    ],
  },
];

const initialState: WorkspaceState = {
  files: [
    {
      id: "default-file",
      name: "script",
      content: `// Bienvenido a JSRunner
// Escribe tu código JavaScript/TypeScript aquí

console.log('Hola mundo');

// Prueba las funciones de diálogo
// alert('¡Hola!');
// const respuesta = confirm('¿Estás de acuerdo?');
// const nombre = prompt('¿Cómo te llamas?', 'Usuario');
`,
      language: "javascript",
      isActive: true,
      lastModified: Date.now(),
      isUnsaved: false,
    },
  ],
  activeFileId: "default-file",
  history: [],
  templates: DEFAULT_TEMPLATES,
  closedTabs: [], // Inicializar el arreglo de pestañas cerradas
  environmentVariables: {
    NODE_ENV: "development",
    REACT_APP_API_URL: "http://localhost:3000",
    REACT_APP_VERSION: "1.0.0",
  },
  settings: {
    autoSave: true,
    theme: "dark",
    fontSize: 14,
    showMinimap: false,
    wordWrap: true,
  },
};

function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction
): WorkspaceState {
  switch (action.type) {
    case "CREATE_FILE": {
      // Crear archivo simplificado sin detección automática de extensión
      const newFile: WorkspaceFile = {
        id: Date.now().toString(),
        name: action.payload.name, // Usar nombre tal como se proporciona
        content: action.payload.content || "",
        language: action.payload.language || "javascript", // Default JavaScript si no se especifica
        isActive: false,
        lastModified: Date.now(),
        isUnsaved: true,
      };
      return {
        ...state,
        files: [...state.files, newFile],
      };
    }

    case "DELETE_FILE": {
      const fileIndex = state.files.findIndex(
        (f) => f.id === action.payload.id
      );
      if (fileIndex === -1) return state;

      // Guardar el archivo cerrado en closedTabs
      const fileToClose = state.files.find(f => f.id === action.payload.id);
      const updatedClosedTabs = fileToClose 
        ? [...state.closedTabs.slice(0, 9), fileToClose] // Mantener solo los 10 más recientes
        : state.closedTabs;

      const newFiles = state.files.filter((f) => f.id !== action.payload.id);
      let newActiveFileId = state.activeFileId;

      // Si no hay archivos después de eliminar, crear uno nuevo
      if (newFiles.length === 0) {
        const defaultFile: WorkspaceFile = {
          id: "new-default-" + Date.now().toString(),
          name: "script",
          content: "// Nuevo archivo\n\nconsole.log('Hola mundo');\n",
          language: "javascript",
          isActive: true,
          lastModified: Date.now(),
          isUnsaved: true,
        };
        
        return {
          ...state,
          files: [defaultFile],
          activeFileId: defaultFile.id,
          closedTabs: updatedClosedTabs,
        };
      }

      // Si el archivo eliminado era el activo, activar otro
      if (state.activeFileId === action.payload.id) {
        newActiveFileId = newFiles[Math.min(fileIndex, newFiles.length - 1)].id;
      }

      return {
        ...state,
        files: newFiles,
        activeFileId: newActiveFileId,
        closedTabs: updatedClosedTabs,
      };
    }

    case "REOPEN_CLOSED_TAB": {
      if (state.closedTabs.length === 0) return state;
      
      // Obtener la última pestaña cerrada
      const tabToReopen = state.closedTabs[state.closedTabs.length - 1];
      
      // Generar un nuevo ID para evitar conflictos
      const reopenedTab: WorkspaceFile = {
        ...tabToReopen,
        id: Date.now().toString(),
        isActive: false,
      };
      
      return {
        ...state,
        files: [...state.files, reopenedTab],
        closedTabs: state.closedTabs.slice(0, -1), // Eliminar la pestaña reabierta de closedTabs
      };
    }

    case "RENAME_FILE": {
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.payload.id
            ? { ...f, name: action.payload.name, isUnsaved: true }
            : f
        ),
      };
    }

    case "UPDATE_FILE_CONTENT": {
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.payload.id
            ? {
                ...f,
                content: action.payload.content,
                lastModified: Date.now(),
                isUnsaved: true,
              }
            : f
        ),
      };
    }

    case "UPDATE_FILE_LANGUAGE": {
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.payload.id
            ? {
                ...f,
                language: action.payload.language,
                lastModified: Date.now(),
                isUnsaved: true,
              }
            : f
        ),
      };
    }

    case "SET_ACTIVE_FILE": {
      return {
        ...state,
        files: state.files.map((f) => ({
          ...f,
          isActive: f.id === action.payload.id,
        })),
        activeFileId: action.payload.id,
      };
    }

    case "DUPLICATE_FILE": {
      const originalFile = state.files.find((f) => f.id === action.payload.id);
      if (!originalFile) return state;

      const newFile: WorkspaceFile = {
        ...originalFile,
        id: Date.now().toString(),
        name: `${originalFile.name} (copy)`, // Simplificado sin lógica de extensión
        isActive: false,
        lastModified: Date.now(),
        isUnsaved: true,
      };

      return {
        ...state,
        files: [...state.files, newFile],
      };
    }

    case "SAVE_FILE": {
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.payload.id ? { ...f, isUnsaved: false } : f
        ),
      };
    }

    case "SAVE_ALL_FILES": {
      return {
        ...state,
        files: state.files.map((f) => ({ ...f, isUnsaved: false })),
      };
    }

    case "ADD_TO_HISTORY": {
      const newHistory = [action.payload, ...state.history.slice(0, 49)]; // Mantener solo 50 entradas
      return {
        ...state,
        history: newHistory,
      };
    }

    case "CLEAR_HISTORY": {
      return {
        ...state,
        history: [],
      };
    }

    case "LOAD_TEMPLATE": {
      const template = state.templates.find(
        (t) => t.id === action.payload.templateId
      );
      if (!template) return state;

      const newFiles: WorkspaceFile[] = template.files.map((file, index) => ({
        id: Date.now().toString() + index,
        name: file.name, // Sin extensión automática en templates también
        content: file.content,
        language: file.language,
        isActive: index === 0,
        lastModified: Date.now(),
        isUnsaved: true,
      }));

      return {
        ...state,
        files: newFiles,
        activeFileId: newFiles[0]?.id || null,
      };
    }

    case "UPDATE_SETTINGS": {
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    }

    case "UPDATE_ENVIRONMENT_VARIABLES": {
      // Sincronizar con el sistema de ejecución
      setEnvironmentVariables(action.payload);

      return {
        ...state,
        environmentVariables: { ...action.payload },
      };
    }

    case "LOAD_FROM_STORAGE": {
      const stored = localStorage.getItem("jsrunner-workspace");
      if (stored) {
        try {
          const parsedState = JSON.parse(stored);
          // Asegurar que las variables de entorno se sincronicen
          if (parsedState.environmentVariables) {
            setEnvironmentVariables(parsedState.environmentVariables);
          }
          return { ...state, ...parsedState };
        } catch (error) {
          console.error("Error loading workspace from storage:", error);
        }
      }
      return state;
    }

    case "IMPORT_WORKSPACE": {
      // Asegurar que se mantenga el historial de pestañas cerradas
      return {
        ...state,
        ...action.payload.workspace,
        closedTabs: [...state.closedTabs], // Mantener el historial de pestañas cerradas
      };
    }

    default:
      return state;
  }
}

// Contexto
const WorkspaceContext = createContext<{
  state: WorkspaceState;
  actions: {
    createFile: (name: string, content?: string, language?: WorkspaceFile["language"]) => void;
    deleteFile: (id: string) => void;
    renameFile: (id: string, name: string) => void;
    updateFileContent: (id: string, content: string) => void;
    updateFileLanguage: (id: string, language: WorkspaceFile["language"]) => void;
    setActiveFile: (id: string) => void;
    duplicateFile: (id: string) => void;
    saveFile: (id: string) => void;
    saveAllFiles: () => void;
    addToHistory: (entry: ExecutionHistory) => void;
    clearHistory: () => void;
    loadTemplate: (templateId: string) => void;
    exportWorkspace: () => string;
    importWorkspace: (data: string) => void;
    updateSettings: (settings: Partial<WorkspaceState["settings"]>) => void;
    updateEnvironmentVariables: (envVars: EnvironmentVariables) => void;
    reopenClosedTab: () => void; // Nueva acción para reabrir pestañas
  };
  utils: {
    getActiveFile: () => WorkspaceFile | null;
    getUnsavedFiles: () => WorkspaceFile[];
    hasUnsavedChanges: () => boolean;
    hasClosedTabs: () => boolean; // Nueva utilidad para verificar si hay pestañas cerradas
  };
} | null>(null);

// Provider
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);

  // Log para debugging en desarrollo
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("WorkspaceProvider: Initialized");
    }
  }, []);

  // Cargar del localStorage al inicializar
  useEffect(() => {
    dispatch({ type: "LOAD_FROM_STORAGE" });
  }, []);

  // Guardar en localStorage cuando cambie el estado
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem("jsrunner-workspace", JSON.stringify(state));
    }, 1000); // Debounce de 1 segundo

    return () => clearTimeout(timeoutId);
  }, [state]);

  // Sincronizar variables de entorno al inicializar
  useEffect(() => {
    if (state.environmentVariables) {
      setEnvironmentVariables(state.environmentVariables);
    }
  }, [state.environmentVariables]);

  // Actions
  const actions = {
    createFile: useCallback(
      (name: string, content?: string, language?: WorkspaceFile["language"]) => {
        dispatch({ type: "CREATE_FILE", payload: { name, content, language } });
      },
      []
    ),

    deleteFile: useCallback((id: string) => {
      dispatch({ type: "DELETE_FILE", payload: { id } });
    }, []),

    renameFile: useCallback((id: string, name: string) => {
      dispatch({ type: "RENAME_FILE", payload: { id, name } });
    }, []),

    updateFileContent: useCallback((id: string, content: string) => {
      dispatch({ type: "UPDATE_FILE_CONTENT", payload: { id, content } });
    }, []),

    updateFileLanguage: useCallback((id: string, language: WorkspaceFile["language"]) => {
      dispatch({ type: "UPDATE_FILE_LANGUAGE", payload: { id, language } });
    }, []),

    setActiveFile: useCallback((id: string) => {
      dispatch({ type: "SET_ACTIVE_FILE", payload: { id } });
    }, []),

    duplicateFile: useCallback((id: string) => {
      dispatch({ type: "DUPLICATE_FILE", payload: { id } });
    }, []),

    saveFile: useCallback((id: string) => {
      dispatch({ type: "SAVE_FILE", payload: { id } });
    }, []),

    saveAllFiles: useCallback(() => {
      dispatch({ type: "SAVE_ALL_FILES" });
    }, []),

    addToHistory: useCallback((entry: ExecutionHistory) => {
      dispatch({ type: "ADD_TO_HISTORY", payload: entry });
    }, []),

    clearHistory: useCallback(() => {
      dispatch({ type: "CLEAR_HISTORY" });
    }, []),

    loadTemplate: useCallback((templateId: string) => {
      dispatch({ type: "LOAD_TEMPLATE", payload: { templateId } });
    }, []),

    exportWorkspace: useCallback(() => {
      return JSON.stringify(state, null, 2);
    }, [state]),

    importWorkspace: useCallback((data: string) => {
      try {
        const workspace = JSON.parse(data);
        dispatch({ type: "IMPORT_WORKSPACE", payload: { workspace } });
      } catch (error) {
        console.error("Error importing workspace:", error);
      }
    }, []),

    updateSettings: useCallback(
      (settings: Partial<WorkspaceState["settings"]>) => {
        dispatch({ type: "UPDATE_SETTINGS", payload: settings });
      },
      []
    ),

    updateEnvironmentVariables: useCallback((envVars: EnvironmentVariables) => {
      dispatch({ type: "UPDATE_ENVIRONMENT_VARIABLES", payload: envVars });
    }, []),

    reopenClosedTab: useCallback(() => {
      dispatch({ type: "REOPEN_CLOSED_TAB" });
    }, []),
  };

  // Utils
  const utils = {
    getActiveFile: useCallback(() => {
      return state.files.find((f) => f.id === state.activeFileId) || null;
    }, [state.files, state.activeFileId]),

    getUnsavedFiles: useCallback(() => {
      return state.files.filter((f) => f.isUnsaved);
    }, [state.files]),

    hasUnsavedChanges: useCallback(() => {
      return state.files.some((f) => f.isUnsaved);
    }, [state.files]),

    hasClosedTabs: useCallback(() => {
      return state.closedTabs.length > 0;
    }, [state.closedTabs]),
  };

  return (
    <WorkspaceContext.Provider value={{ state, actions, utils }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// Hook
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  
  if (!context) {
    // Durante hot reload, el contexto puede perderse temporalmente
    // Proporcionar un fallback más informativo y robusto
    const isDevelopment = import.meta.env.DEV;
    
    if (isDevelopment) {
      console.error("useWorkspace: Context not found - possible hot reload issue");
      console.trace("Stack trace for context error:");
    }
    
    throw new Error(
      isDevelopment 
        ? "useWorkspace must be used within a WorkspaceProvider (Hot reload detected)"
        : "useWorkspace must be used within a WorkspaceProvider"
    );
  }
  
  return context;
}

export type {
  WorkspaceFile,
  ExecutionHistory,
  WorkspaceTemplate,
  EnvironmentVariables,
};
