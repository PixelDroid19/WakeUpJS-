import { describe, it, expect } from 'vitest';
import { parseError, cleanErrorMessage, getErrorPrefix, type ErrorInfo } from './errorHandler';

describe('errorHandler.ts', () => {
  describe('parseError', () => {
    it('should parse a standard Error object', () => {
      const error = new Error('Something went wrong');
      const errorInfo = parseError(error, 'execution');
      expect(errorInfo.type).toBe('Error');
      expect(errorInfo.message).toBe('Something went wrong.');
      expect(errorInfo.phase).toBe('execution');
      expect(errorInfo.line).toBeUndefined();
      expect(errorInfo.column).toBeUndefined();
    });

    it('should parse a SyntaxError', () => {
      const error = new SyntaxError('Invalid syntax');
      const errorInfo = parseError(error, 'validation');
      expect(errorInfo.type).toBe('SyntaxError');
      expect(errorInfo.message).toBe('Invalid syntax.');
      expect(errorInfo.phase).toBe('validation');
    });

    it('should parse a ReferenceError', () => {
      const error = new ReferenceError('variable is not defined');
      const errorInfo = parseError(error, 'execution');
      expect(errorInfo.type).toBe('ReferenceError');
      expect(errorInfo.message).toBe("variable is not defined (ensure 'variable' is declared or imported).");
      expect(errorInfo.phase).toBe('execution');
    });

    it('should parse a TypeError', () => {
      const error = new TypeError("Cannot read property 'foo' of undefined");
      const errorInfo = parseError(error, 'execution');
      expect(errorInfo.type).toBe('TypeError');
      expect(errorInfo.message).toBe("Cannot read property 'foo' of undefined (check if the object is initialized before accessing its properties).");
      expect(errorInfo.phase).toBe('execution');
    });

    it('should parse a RangeError for "Maximum call stack size exceeded"', () => {
      const error = new RangeError('Maximum call stack size exceeded');
      const errorInfo = parseError(error, 'execution');
      expect(errorInfo.type).toBe('RangeError');
      expect(errorInfo.message).toBe('Maximum call stack size exceeded (potential infinite recursion).');
      expect(errorInfo.phase).toBe('execution');
    });

    it('should parse a generic RangeError', () => {
      const error = new RangeError('Some other range error');
      const errorInfo = parseError(error, 'execution');
      expect(errorInfo.type).toBe('RangeError');
      expect(errorInfo.message).toBe('Some other range error.');
    });

    it('should parse an error with loc (line/column)', () => {
      const error = { message: 'Error at location', loc: { line: 10, column: 5 } };
      const errorInfo = parseError(error, 'transformation');
      expect(errorInfo.line).toBe(10);
      expect(errorInfo.column).toBe(5);
      expect(errorInfo.message).toBe('Error at location.');
    });

    it('should parse an error with lineNumber and columnNumber', () => {
      const error = { message: 'Error with line number', lineNumber: 7, columnNumber: 2 };
      const errorInfo = parseError(error, 'execution');
      expect(errorInfo.line).toBe(7);
      expect(errorInfo.column).toBe(2);
      expect(errorInfo.message).toBe('Error with line number.');
    });

    it('should extract line and column from Babel-like error messages', () => {
      const error = { message: 'Syntax error in /index.ts: Unexpected token (5:12)' };
      const errorInfo = parseError(error, 'validation');
      expect(errorInfo.line).toBe(5);
      expect(errorInfo.column).toBe(12);
      expect(errorInfo.message).toBe('Syntax error in Unexpected token.'); // `/index.ts:` and `(5:12)` removed
    });

    it('should handle "Execution timeout:" message and set type to TimeoutError', () => {
      const error = { message: 'Execution timeout: The code took too long to execute' };
      const errorInfo = parseError(error, 'execution');
      expect(errorInfo.type).toBe('TimeoutError');
      expect(errorInfo.message).toBe('The code took too long to execute.');
    });

    it('should handle "tardó demasiado" message and set type to TimeoutError', () => {
      const error = { message: 'El código tardó demasiado en ejecutarse.' };
      const errorInfo = parseError(error, 'execution');
      expect(errorInfo.type).toBe('TimeoutError');
      expect(errorInfo.message).toBe('The code took too long to execute.');
    });
  });

  describe('cleanErrorMessage', () => {
    it('should remove /index.ts: prefix', () => {
      expect(cleanErrorMessage('/index.ts: Real error message')).toBe('Real error message.');
    });

    it('should remove (line:col) info', () => {
      expect(cleanErrorMessage('Error message (5:12)')).toBe('Error message.');
    });

    it('should handle Maximum call stack size exceeded', () => {
      expect(cleanErrorMessage('Maximum call stack size exceeded')).toBe('Maximum call stack size exceeded (potential infinite recursion).');
    });

    it('should handle Execution timeout', () => {
      expect(cleanErrorMessage('Execution timeout: code took too long')).toBe('The code took too long to execute.');
      expect(cleanErrorMessage('El código tardó demasiado en ejecutarse')).toBe('The code took too long to execute.');
    });

    it('should add hint for "is not defined" errors', () => {
      expect(cleanErrorMessage('myVar is not defined')).toBe("myVar is not defined (ensure 'myVar' is declared or imported).");
    });

    it('should add hint for "is not defined" errors with existing period', () => {
      expect(cleanErrorMessage('myVar is not defined.')).toBe("myVar is not defined (ensure 'myVar' is declared or imported).");
    });

    it('should add hint for "Cannot read property of undefined"', () => {
      expect(cleanErrorMessage("Cannot read property 'x' of undefined")).toBe("Cannot read property 'x' of undefined (check if the object is initialized before accessing its properties).");
    });

    it('should add hint for "Cannot read properties of null"', () => {
      expect(cleanErrorMessage("Cannot read properties of null (reading 'y')")).toBe("Cannot read properties of null (reading 'y') (check if the object is initialized before accessing its properties).");
    });

    it('should ensure message ends with a period', () => {
      expect(cleanErrorMessage('Some message')).toBe('Some message.');
      expect(cleanErrorMessage('Some message.')).toBe('Some message.');
    });

    it('should not double period if hint adds one indirectly', () => {
      expect(cleanErrorMessage("myVar is not defined")).toBe("myVar is not defined (ensure 'myVar' is declared or imported).");
    });
  });

  describe('getErrorPrefix', () => {
    it('should return correct prefix for SyntaxError', () => {
      expect(getErrorPrefix('SyntaxError')).toBe('🚫 SyntaxError: ');
    });

    it('should return correct prefix for ReferenceError', () => {
      expect(getErrorPrefix('ReferenceError')).toBe('❓ ReferenceError: ');
    });

    it('should return correct prefix for TypeError', () => {
      expect(getErrorPrefix('TypeError')).toBe('🔢 TypeError: ');
    });

    it('should return correct prefix for RangeError', () => {
      expect(getErrorPrefix('RangeError')).toBe('📊 RangeError: ');
    });

    it('should return correct prefix for TimeoutError', () => {
      expect(getErrorPrefix('TimeoutError')).toBe('⏱️ TimeoutError: ');
    });

    it('should return default prefix for generic Error', () => {
      expect(getErrorPrefix('Error')).toBe('❌ Error: ');
    });

    it('should return default prefix for unknown error type', () => {
      expect(getErrorPrefix('UnknownError' as ErrorInfo['type'])).toBe('❌ Error: ');
    });

    it('should handle Loop Error message override', () => {
      expect(getErrorPrefix('Error', 'Bucle detenido por el sistema.')).toBe('🔄 Loop Error: ');
      expect(getErrorPrefix('RangeError', 'Posible bucle infinito detectado.')).toBe('🔄 Loop Error: ');
    });
  });
});
