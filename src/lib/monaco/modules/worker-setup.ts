/**
 * ========================
 * 🛠️ CONFIGURACIÓN DE WORKERS DE MONACO
 * ========================
 * 
 * Este módulo configura correctamente los workers de Monaco Editor
 * para evitar errores de "TypeScript not registered!" y similares
 * 
 * NOTA: Ahora usamos @monaco-editor/react que maneja los workers automáticamente
 * cuando se configura correctamente.
 */

/**
 * Configura el entorno de Monaco para workers
 * 
 * @monaco-editor/react maneja automáticamente la configuración de workers,
 * pero esta función permanece por compatibilidad con el código existente.
 */
export function setupMonacoWorkers(): void {
  console.log('🛠️ Configurando workers de Monaco con @monaco-editor/react...');
  
  // No necesitamos configurar manualmente MonacoEnvironment cuando usamos @monaco-editor/react
  // La biblioteca lo maneja automáticamente cuando está configurada correctamente
  
  // y maneja la configuración de workers internamente
  
  console.log('✅ Usando workers locales con @monaco-editor/react');
}

// Esta función ya no es necesaria cuando usamos @monaco-editor/react
// La mantenemos comentada como referencia

/**
 * Esta función ya no se usa con @monaco-editor/react
 * La biblioteca maneja automáticamente la carga de workers
 */
/*
function createWorkerUrl(workerFile: string): string {
  // Con @monaco-editor/react, no necesitamos crear URLs para workers manualmente
  console.warn('createWorkerUrl no debería ser llamada cuando se usa @monaco-editor/react');
  return '';
}
*/

/**
 * Verifica que los workers estén disponibles
 */
export async function validateWorkers(monaco: any): Promise<boolean> {
  if (!monaco?.languages?.typescript) {
    console.error('❌ Servicio TypeScript no disponible en Monaco');
    return false;
  }

  try {
    console.log('🔍 Validando workers de Monaco...');
    
    // Verificar worker de TypeScript
    const tsWorker = await monaco.languages.typescript.getTypeScriptWorker();
    if (!tsWorker) {
      throw new Error('Worker de TypeScript no disponible');
    }
    
    // Verificar worker de JavaScript  
    const jsWorker = await monaco.languages.typescript.getJavaScriptWorker();
    if (!jsWorker) {
      throw new Error('Worker de JavaScript no disponible');
    }

    console.log('✅ Workers validados correctamente');
    return true;
    
  } catch (error) {
    console.error('❌ Error validando workers:', error);
    return false;
  }
}

/**
 * Reinicia los workers de TypeScript (similar a "Restart TS Server" de VS Code)
 */
export async function restartTypeScriptWorkers(monaco: any): Promise<boolean> {
  console.log('🔄 Reiniciando workers de TypeScript...');
  
  try {
    if (!monaco?.languages?.typescript) {
      throw new Error('Servicio TypeScript no disponible');
    }

    const tsDefaults = monaco.languages.typescript.typescriptDefaults;
    const jsDefaults = monaco.languages.typescript.javascriptDefaults;

    // Deshabilitar eager sync temporalmente
    tsDefaults.setEagerModelSync(false);
    jsDefaults.setEagerModelSync(false);

    // Esperar un momento para que se desconecten
    await new Promise(resolve => setTimeout(resolve, 100));

    // Re-habilitar eager sync (esto fuerza la recreación)
    tsDefaults.setEagerModelSync(true);
    jsDefaults.setEagerModelSync(true);

    // Validar que los workers estén funcionando
    const workersValid = await validateWorkers(monaco);
    
    if (workersValid) {
      console.log('✅ Workers de TypeScript reiniciados exitosamente');
      return true;
    } else {
      throw new Error('Workers no funcionan después del reinicio');
    }
    
  } catch (error) {
    console.error('❌ Error reiniciando workers de TypeScript:', error);
    return false;
  }
}

/**
 * Configuración automática de recuperación de workers
 */
export function setupWorkerRecovery(monaco: any): void {
  let recoveryAttempts = 0;
  const maxRecoveryAttempts = 3;

  const handleWorkerError = async (error: any) => {
    console.warn(`⚠️ Error en worker detectado:`, error);
    
    if (recoveryAttempts < maxRecoveryAttempts) {
      recoveryAttempts++;
      console.log(`🔄 Intento de recuperación ${recoveryAttempts}/${maxRecoveryAttempts}...`);
      
      const recovered = await restartTypeScriptWorkers(monaco);
      
      if (recovered) {
        console.log('✅ Workers recuperados exitosamente');
        recoveryAttempts = 0; // Resetear contador
      } else {
        console.error(`❌ Fallo en recuperación ${recoveryAttempts}`);
        
        if (recoveryAttempts >= maxRecoveryAttempts) {
          console.error('❌ Máximo de intentos de recuperación alcanzado');
        }
      }
    }
  };

  // Configurar interceptor de errores para workers
  const originalConsoleError = console.error;
  console.error = function(...args: any[]) {
    const errorMessage = args.join(' ');
    
    // Detectar errores específicos de workers
    if (errorMessage.includes('TypeScript not registered') ||
        errorMessage.includes('Worker') ||
        errorMessage.includes('Language service')) {
      handleWorkerError(errorMessage);
    }
    
    originalConsoleError.apply(console, args);
  };

  console.log('🛡️ Sistema de recuperación de workers configurado');
} 