import { Colors, type ColoredElement } from "../elementParser";
import { type ErrorInfo } from "./errorHandler";

export interface UnparsedResult {
  lineNumber?: number;
  method?: string;
  content: ColoredElement;
}

export interface Result {
  lineNumber?: number;
  element: {
    content: string;
    color?: Colors | string;
  };
  type: "execution" | "error" | "warning" | "info";
  method?: string;
  errorInfo?: ErrorInfo;
}

export interface ModuleRef {
  type: "method" | "object";
  object: string;
  method?: string;
}

export interface MultipleArgs {
  _isMultipleArgs: true;
  args: any[];
}

export interface ConsoleObject {
  _isConsoleObject: true;
  methods: string[];
  memory: {
    totalJSHeapSize: number;
    usedJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

export interface ProcessedContent {
  _isReference?: boolean;
  _isMultipleArgs?: boolean;
  _isConsoleObject?: boolean;
  [key: string]: any;
}

export type ResultType = "execution" | "error" | "warning" | "info"; 