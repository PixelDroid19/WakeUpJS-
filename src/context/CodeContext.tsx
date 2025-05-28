import { createContext } from 'react';
import { Colors } from '../lib/elementParser';

// Tipos específicos de errores
export interface ErrorInfo {
  type: 'SyntaxError' | 'ReferenceError' | 'TypeError' | 'RangeError' | 'Error';
  message: string;
  line?: number;
  column?: number;
  stack?: string;
  phase: 'transformation' | 'execution' | 'validation';
}

// Tipos para los resultados de ejecución
export interface ResultElement {
  lineNumber?: number;
  element: {
    content: string;
    color?: Colors | string;
  };
  type: "execution" | "error" | "warning" | "info";
  method?: string;
  errorInfo?: ErrorInfo; // Información adicional para errores
}

// Tipo para el contexto de código
export interface CodeContextType {
  code: string;
  setCode: (code: string) => void;
}

// Tipo para el contexto de resultados
export interface CodeResultContextType {
  result: ResultElement[] | string;
  setResult: (result: ResultElement[] | string) => void;
}

// Contextos con valores por defecto
export const CodeContext = createContext<CodeContextType>({
  code: "",
  setCode: () => {},
});

export const CodeResultContext = createContext<CodeResultContextType>({
  result: "",
  setResult: () => {},
});

