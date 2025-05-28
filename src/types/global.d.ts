declare module 'json-cycle' {
  interface JsonCycle {
    decycle(object: any): any;
    retrocycle(object: any): any;
  }
  const jc: JsonCycle;
  export default jc;
}

declare module 'stringify-object' {
  interface StringifyOptions {
    indent?: string;
    singleQuotes?: boolean;
    inlineCharacterLimit?: number;
  }
  
  function stringifyObject(object: any, options?: StringifyOptions): string;
  export default stringifyObject;
} 