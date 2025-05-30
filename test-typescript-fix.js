// Test para verificar que la configuración de TypeScript funciona
// Este archivo utiliza las funciones del sistema para probar la transformación

import { transformCode } from './src/lib/code/code-transformer.js';
import { validateSyntax } from './src/lib/code/errorHandler.js';

const testCode = `// app.ts

interface TaskResult {
  id: number;
  success: boolean;
  data: string | null;
  error?: string;
}

class AsyncTask {
  constructor(public id: number) {}

  async run(): Promise<TaskResult> {
    const delay = (ms: number) => new Promise<void>(res => setTimeout(res, ms));
    const duration = Math.floor(Math.random() * 1000) + 500;
    await delay(duration);

    if (Math.random() > 0.75) {
      return {
        id: this.id,
        success: false,
        data: null,
        error: \`Task \${this.id} failed after \${duration}ms\`
      };
    } else {
      return {
        id: this.id,
        success: true,
        data: \`Task \${this.id} completed in \${duration}ms\`
      };
    }
  }
}

// Genérico para procesar resultados
function processResults<T extends TaskResult>(results: T[]): void {
  const successes = results.filter(r => r.success);
  const failures = results.filter(r => !r.success);

  console.log("\\n=== PROCESAMIENTO DE RESULTADOS ===");
  console.log("Tareas exitosas:");
  successes.forEach(r => console.log(r.data));

  console.log("\\nTareas fallidas:");
  failures.forEach(r => console.error(r.error));
}

async function main(): Promise<void> {
  const tasks: AsyncTask[] = Array.from({ length: 10 }, (_, i) => new AsyncTask(i + 1));

  const results: TaskResult[] = await Promise.all(tasks.map(task => task.run()));

  processResults(results);

  // Extra: análisis de caracteres en resultados exitosos
  const charCount = results
    .filter(r => r.success && r.data)
    .map(r => r.data!)
    .join('')
    .split('')
    .reduce<Record<string, number>>((acc, char) => {
      acc[char] = (acc[char] || 0) + 1;
      return acc;
    }, {});

  console.log("\\nConteo de caracteres en tareas exitosas:");
  console.log(charCount);
}

main().catch(err => console.error("Error en main:", err));`;

console.log('🧪 Probando validación de sintaxis TypeScript...');

try {
  const validation = validateSyntax(testCode);
  
  if (validation.isValid) {
    console.log('✅ Validación exitosa!');
    
    console.log('🔧 Probando transformación...');
    const transformedCode = transformCode(testCode, 'typescript');
    
    console.log('✅ Transformación exitosa!');
    console.log('📏 Código original:', testCode.length, 'caracteres');
    console.log('📏 Código transformado:', transformedCode.length, 'caracteres');
    console.log('🎉 El problema de sintaxis TypeScript ha sido solucionado!');
  } else {
    console.log('❌ Validación falló:', validation.error);
  }
} catch (error) {
  console.log('❌ Error durante la prueba:', error.message);
} 