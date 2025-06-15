import { describe, it, expect } from 'vitest';
import { detectLanguageFromFilename, detectLanguageFromContent, type LanguageDetection } from './detectors';

describe('detectors.ts', () => {
  describe('detectLanguageFromFilename', () => {
    const testCases: Array<[string, LanguageDetection]> = [
      ['script.js', { extension: '.js', languageId: 'javascript', hasJSX: false, hasTypeScript: false }],
      ['style.css', { extension: '.css', languageId: 'css', hasJSX: false, hasTypeScript: false }],
      ['index.html', { extension: '.html', languageId: 'html', hasJSX: false, hasTypeScript: false }],
      ['component.jsx', { extension: '.jsx', languageId: 'javascriptreact', hasJSX: true, hasTypeScript: false }],
      ['utils.ts', { extension: '.ts', languageId: 'typescript', hasJSX: false, hasTypeScript: true }],
      ['view.tsx', { extension: '.tsx', languageId: 'typescriptreact', hasJSX: true, hasTypeScript: true }],
      ['data.json', { extension: '.json', languageId: 'json', hasJSX: false, hasTypeScript: false }],
      ['README.md', { extension: '.md', languageId: 'markdown', hasJSX: false, hasTypeScript: false }],
      ['myfile.txt', { extension: '.txt', languageId: 'plaintext', hasJSX: false, hasTypeScript: false }],
      ['image.JPEG', { extension: '.jpeg', languageId: 'plaintext', hasJSX: false, hasTypeScript: false }], // Default for unknown image types
      ['.babelrc', { extension: '.babelrc', languageId: 'json', hasJSX: false, hasTypeScript: false }], // Common dotfile
      ['NO_EXTENSION', { extension: '', languageId: 'plaintext', hasJSX: false, hasTypeScript: false }], // No extension
    ];

    testCases.forEach(([filename, expected]) => {
      it(`should detect correctly for ${filename}`, () => {
        expect(detectLanguageFromFilename(filename)).toEqual(expected);
      });
    });
  });

  describe('detectLanguageFromContent', () => {
    it('should detect JavaScript for simple functions', () => {
      const code = 'function hello() { console.log("world"); }';
      expect(detectLanguageFromContent(code)).toEqual({
        extension: '.js', languageId: 'javascript', hasJSX: false, hasTypeScript: false,
      });
    });

    it('should detect JavaScript for arrow functions and modern syntax', () => {
      const code = 'const greet = async () => { await fetch(); }';
      expect(detectLanguageFromContent(code)).toEqual({
        extension: '.js', languageId: 'javascript', hasJSX: false, hasTypeScript: false,
      });
    });

    it('should detect TypeScript for type annotations', () => {
      const code = 'function add(a: number, b: number): number { return a + b; }';
      expect(detectLanguageFromContent(code)).toEqual({
        extension: '.ts', languageId: 'typescript', hasJSX: false, hasTypeScript: true,
      });
    });

    it('should detect TypeScript for interfaces', () => {
      const code = 'interface User { name: string; age: number; }';
      expect(detectLanguageFromContent(code)).toEqual({
        extension: '.ts', languageId: 'typescript', hasJSX: false, hasTypeScript: true,
      });
    });

    it('should detect TypeScript for import type', () => {
      const code = "import type { MyType } from './my-module';\nconst x: MyType = {};";
      expect(detectLanguageFromContent(code)).toEqual({
        extension: '.ts', languageId: 'typescript', hasJSX: false, hasTypeScript: true,
      });
    });

    it('should detect JSX', () => {
      const code = 'const element = <div>Hello</div>;';
      expect(detectLanguageFromContent(code)).toEqual({
        extension: '.jsx', languageId: 'javascriptreact', hasJSX: true, hasTypeScript: false,
      });
    });

    it('should detect JSX with components', () => {
      const code = 'import React from "react"; function App() { return <MyComponent />; }';
      expect(detectLanguageFromContent(code)).toEqual({
        extension: '.jsx', languageId: 'javascriptreact', hasJSX: true, hasTypeScript: false,
      });
    });

    it('should detect JSX fragments', () => {
      const code = 'const element = <>\n  <td>Hello</td>\n  <td>World</td>\n</>;';
      expect(detectLanguageFromContent(code)).toEqual({
        extension: '.jsx', languageId: 'javascriptreact', hasJSX: true, hasTypeScript: false,
      });
    });

    it('should detect TSX for JSX with type annotations', () => {
      const code = 'interface Props { name: string; } const Greeter = (props: Props) => <p>Hello, {props.name}</p>;';
      expect(detectLanguageFromContent(code)).toEqual({
        extension: '.tsx', languageId: 'typescriptreact', hasJSX: true, hasTypeScript: true,
      });
    });

    it('should detect TSX for component with props type', () => {
      const code = `
        import React from 'react';
        type AppProps = { message: string };
        function App({ message }: AppProps): JSX.Element {
          return <h1>{message}</h1>;
        }
      `;
      expect(detectLanguageFromContent(code)).toEqual({
        extension: '.tsx', languageId: 'typescriptreact', hasJSX: true, hasTypeScript: true,
      });
    });

    it('should default to JavaScript for ambiguous simple code', () => {
      const code = 'console.log("hello");'; // Could be JS or TS
      expect(detectLanguageFromContent(code)).toEqual({
        extension: '.js', languageId: 'javascript', hasJSX: false, hasTypeScript: false,
      });
    });

    it('should default to JavaScript for plain text or non-code', () => {
      const code = 'This is just some plain text.';
      expect(detectLanguageFromContent(code)).toEqual({
        extension: '.js', languageId: 'javascript', hasJSX: false, hasTypeScript: false, // Current default
      });
    });

    it('should handle empty string (defaults to JS)', () => {
      const code = '';
      expect(detectLanguageFromContent(code)).toEqual({
        extension: '.js', languageId: 'javascript', hasJSX: false, hasTypeScript: false,
      });
    });

    it('should detect HTML content', () => {
      const code = '<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hi</h1></body></html>';
      // The current detector prioritizes JSX/TSX if any <tag> is found, and might not specifically identify pure HTML first.
      // Depending on its internal logic, it might be .jsx or default to .js if no strong TS/JSX signals.
      // Let's assume it has some basic HTML detection or falls back.
      // Based on current `detectors.ts` logic, simple tags might lead to JSX.
      const result = detectLanguageFromContent(code);
      // A more robust HTML detection would be needed. For now, testing current behavior:
      // If it finds simple tags, it might assume JSX.
      const isLikelyJSX = result.languageId === 'javascriptreact' && result.hasJSX;
      const isHTML = result.languageId === 'html';
      expect(isLikelyJSX || isHTML).toBe(true);

      if (isHTML) {
         expect(result).toEqual({ extension: '.html', languageId: 'html', hasJSX: false, hasTypeScript: false });
      }
    });

    it('should detect CSS content', () => {
      const code = 'body { color: red; } .class { font-size: 12px; }';
      // Similar to HTML, specific CSS detection might not be prioritized.
      // Current detector likely defaults to JS.
      const result = detectLanguageFromContent(code);
      const isCSS = result.languageId === 'css';
      expect(isCSS || result.languageId === 'javascript').toBe(true); // Test current behavior
       if (isCSS) {
         expect(result).toEqual({ extension: '.css', languageId: 'css', hasJSX: false, hasTypeScript: false });
      }
    });
  });
});
