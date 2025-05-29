// types.ts o un archivo de definición
export enum ResultType {
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
  LOG = "log",
}

export enum ConsoleMethod {
  LOG = "log",
  WARN = "warn",
  ERROR = "error",
  INFO = "info",
  DEBUG = "debug",
  TABLE = "table",
  DIR = "dir",
  DIRXML = "dirxml",
  TRACE = "trace",
  GROUP = "group",
  GROUP_COLLAPSED = "groupCollapsed",
  GROUP_END = "groupEnd",
  COUNT = "count",
  COUNT_RESET = "countReset",
  TIME = "time",
  TIME_END = "timeEnd",
  TIME_LOG = "timeLog",
  TIME_STAMP = "timeStamp",
  PROFILE = "profile",
  PROFILE_END = "profileEnd",
  ASSERT = "assert",
  CLEAR = "clear",
  CONTEXT = "context",
  CREATE_TASK = "createTask",
}

export interface ResultElement {
  type: ResultType;
  method?: ConsoleMethod;
  element: {
    content: any;
    color?: string;
  };
  lineNumber?: number;
}

// Colors.ts
export enum Colors {
  ERROR = "text-red-400",
  WARNING = "text-yellow-400",
  INFO = "text-blue-400",
  GRAY = "text-gray-400",
  BLUE = "text-blue-400",
  PURPLE = "text-purple-400",
  CYAN = "text-cyan-400",
  YELLOW = "text-yellow-400",
  MAGENTA = "text-fuchsia-400",
  GREEN = "text-green-400",
}
