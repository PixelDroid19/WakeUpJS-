// Definiciones de tipos básicas para paquetes comunes
export interface PackageDefinition {
  name: string;
  version: string;
  exports: ExportDefinition[];
  description?: string;
  types?: string; // URL a definiciones de tipos
}

export interface ExportDefinition {
  name: string;
  type: 'function' | 'class' | 'const' | 'interface' | 'type' | 'default';
  signature?: string;
  description?: string;
  deprecated?: boolean;
}

// Definiciones predefinidas para paquetes comunes
export const PACKAGE_DEFINITIONS: Record<string, PackageDefinition> = {
  'react': {
    name: 'react',
    version: '18.2.0',
    description: 'A JavaScript library for building user interfaces',
    exports: [
      {
        name: 'useState',
        type: 'function',
        signature: '<T>(initialState: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>]',
        description: 'Hook that lets you add state to functional components'
      },
      {
        name: 'useEffect',
        type: 'function',
        signature: '(effect: React.EffectCallback, deps?: React.DependencyList): void',
        description: 'Hook that lets you perform side effects in functional components'
      },
      {
        name: 'useContext',
        type: 'function',
        signature: '<T>(context: React.Context<T>): T',
        description: 'Hook that lets you subscribe to React context'
      },
      {
        name: 'useReducer',
        type: 'function',
        signature: '<R extends React.Reducer<any, any>>(reducer: R, initialState: React.ReducerState<R>): [React.ReducerState<R>, React.Dispatch<React.ReducerAction<R>>]',
        description: 'Hook that lets you manage complex state logic'
      },
      {
        name: 'useMemo',
        type: 'function',
        signature: '<T>(factory: () => T, deps: React.DependencyList): T',
        description: 'Hook that lets you cache expensive calculations'
      },
      {
        name: 'useCallback',
        type: 'function',
        signature: '<T extends (...args: any[]) => any>(callback: T, deps: React.DependencyList): T',
        description: 'Hook that lets you cache a function definition'
      },
      {
        name: 'useRef',
        type: 'function',
        signature: '<T>(initialValue: T): React.MutableRefObject<T>',
        description: 'Hook that lets you reference a value that\'s not needed for rendering'
      },
      {
        name: 'createElement',
        type: 'function',
        signature: '(type: React.ElementType, props?: any, ...children: React.ReactNode[]): React.ReactElement',
        description: 'Creates a React element'
      },
      {
        name: 'Component',
        type: 'class',
        signature: 'class Component<P = {}, S = {}>',
        description: 'Base class for React components'
      },
      {
        name: 'Fragment',
        type: 'const',
        signature: 'React.Fragment',
        description: 'Lets you group elements without a wrapper node'
      }
    ]
  },
  'lodash': {
    name: 'lodash',
    version: '4.17.21',
    description: 'A modern JavaScript utility library',
    exports: [
      {
        name: 'map',
        type: 'function',
        signature: '<T, R>(collection: T[], iteratee: (value: T, index: number, collection: T[]) => R): R[]',
        description: 'Creates an array of values by running each element through iteratee'
      },
      {
        name: 'filter',
        type: 'function',
        signature: '<T>(collection: T[], predicate: (value: T, index: number, collection: T[]) => boolean): T[]',
        description: 'Creates an array with all elements that pass the predicate test'
      },
      {
        name: 'reduce',
        type: 'function',
        signature: '<T, R>(collection: T[], iteratee: (accumulator: R, value: T, index: number, collection: T[]) => R, accumulator: R): R',
        description: 'Reduces collection to a value by iterating through elements'
      },
      {
        name: 'cloneDeep',
        type: 'function',
        signature: '<T>(value: T): T',
        description: 'Creates a deep clone of value'
      },
      {
        name: 'isEqual',
        type: 'function',
        signature: '(value: any, other: any): boolean',
        description: 'Performs a deep comparison between two values'
      },
      {
        name: 'debounce',
        type: 'function',
        signature: '<T extends (...args: any[]) => any>(func: T, wait: number): T',
        description: 'Creates a debounced function that delays invoking func'
      },
      {
        name: 'throttle',
        type: 'function',
        signature: '<T extends (...args: any[]) => any>(func: T, wait: number): T',
        description: 'Creates a throttled function that only invokes func at most once per wait milliseconds'
      },
      {
        name: 'isEmpty',
        type: 'function',
        signature: '(value: any): boolean',
        description: 'Checks if value is an empty object, collection, map, or set'
      },
      {
        name: 'isArray',
        type: 'function',
        signature: '(value: any): value is any[]',
        description: 'Checks if value is classified as an Array object'
      },
      {
        name: 'pick',
        type: 'function',
        signature: '<T, K extends keyof T>(object: T, ...paths: K[]): Pick<T, K>',
        description: 'Creates an object composed of the picked object properties'
      }
    ]
  },
  'axios': {
    name: 'axios',
    version: '1.6.0',
    description: 'Promise based HTTP client for the browser and node.js',
    exports: [
      {
        name: 'get',
        type: 'function',
        signature: '<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>',
        description: 'Performs a GET request'
      },
      {
        name: 'post',
        type: 'function',
        signature: '<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>',
        description: 'Performs a POST request'
      },
      {
        name: 'put',
        type: 'function',
        signature: '<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>',
        description: 'Performs a PUT request'
      },
      {
        name: 'delete',
        type: 'function',
        signature: '<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>',
        description: 'Performs a DELETE request'
      },
      {
        name: 'create',
        type: 'function',
        signature: '(config?: AxiosRequestConfig): AxiosInstance',
        description: 'Creates a new axios instance'
      }
    ]
  },
  'moment': {
    name: 'moment',
    version: '2.29.4',
    description: 'Parse, validate, manipulate, and display dates in javascript',
    exports: [
      {
        name: 'default',
        type: 'function',
        signature: '(input?: any, format?: string): Moment',
        description: 'Creates a moment object'
      },
      {
        name: 'utc',
        type: 'function',
        signature: '(input?: any, format?: string): Moment',
        description: 'Creates a moment object in UTC mode'
      },
      {
        name: 'duration',
        type: 'function',
        signature: '(input?: any, unit?: string): Duration',
        description: 'Creates a duration object'
      }
    ]
  },
  'uuid': {
    name: 'uuid',
    version: '9.0.1',
    description: 'RFC4122 (v1, v4, and v5) UUIDs',
    exports: [
      {
        name: 'v4',
        type: 'function',
        signature: '(): string',
        description: 'Generate a random UUID'
      },
      {
        name: 'v1',
        type: 'function',
        signature: '(): string',
        description: 'Generate a timestamp UUID'
      },
      {
        name: 'validate',
        type: 'function',
        signature: '(uuid: string): boolean',
        description: 'Validate a UUID string'
      }
    ]
  },
  'date-fns': {
    name: 'date-fns',
    version: '2.30.0',
    description: 'Modern JavaScript date utility library',
    exports: [
      {
        name: 'format',
        type: 'function',
        signature: '(date: Date | number, formatStr: string): string',
        description: 'Format a date according to the given format string'
      },
      {
        name: 'addDays',
        type: 'function',
        signature: '(date: Date | number, amount: number): Date',
        description: 'Add days to the given date'
      },
      {
        name: 'subDays',
        type: 'function',
        signature: '(date: Date | number, amount: number): Date',
        description: 'Subtract days from the given date'
      },
      {
        name: 'isValid',
        type: 'function',
        signature: '(date: any): boolean',
        description: 'Check if the given date is valid'
      }
    ]
  }
};

// Obtener definición de un paquete
export function getPackageDefinition(packageName: string): PackageDefinition | null {
  return PACKAGE_DEFINITIONS[packageName] || null;
}

// Obtener todas las exportaciones de un paquete
export function getPackageExports(packageName: string): ExportDefinition[] {
  const definition = getPackageDefinition(packageName);
  return definition?.exports || [];
}

// Generar declaración de tipos para Monaco
export function generateTypeDeclaration(packageName: string): string {
  const definition = getPackageDefinition(packageName);
  if (!definition) return '';

  let declaration = `declare module '${packageName}' {\n`;
  
  definition.exports.forEach(exp => {
    switch (exp.type) {
      case 'function':
        declaration += `  export function ${exp.name}${exp.signature ? exp.signature.replace(/^[^(]*/, '') : '(...args: any[]): any'};\n`;
        break;
      case 'const':
        declaration += `  export const ${exp.name}: ${exp.signature || 'any'};\n`;
        break;
      case 'class':
        declaration += `  export ${exp.signature || `class ${exp.name}`} {}\n`;
        break;
      case 'interface':
        declaration += `  export interface ${exp.name} ${exp.signature || '{}'}\n`;
        break;
      case 'type':
        declaration += `  export type ${exp.name} = ${exp.signature || 'any'};\n`;
        break;
      case 'default':
        declaration += `  const ${exp.name}: ${exp.signature || 'any'};\n`;
        declaration += `  export default ${exp.name};\n`;
        break;
    }
  });
  
  declaration += '}\n';
  return declaration;
} 