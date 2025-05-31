import { defineConfig } from "vite";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: "electron/main.ts",
      },
      {
        entry: "electron/preload.ts",
        onstart(options) {
          options.reload();
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      // Asegura que las importaciones de monaco-editor sean consistentes
      'monaco-editor': 'monaco-editor/esm/vs/editor/editor.api.js',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separa monaco en su propio chunk para mejor caching
          'monaco-editor': ['monaco-editor'],
        },
      },
    },
  },
  server: {
    fs: {
      // Permite servir archivos desde node_modules
      allow: ['..', 'node_modules'],
    },
  },
});
