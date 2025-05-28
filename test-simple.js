// Prueba simple de console.log múltiple
console.log('Título:', 'Este es un test');
console.log('Resultado:', 42, 'es la respuesta');
console.log('Estado:', true, 'funcionando', { test: 'ok' });

// Función simple con generador
function* contador() {
  let i = 0;
  while (true) {
    yield i++;
    if (i > 3) break; // Evitar bucle infinito para la prueba
  }
}

const gen = contador();
console.log('Gen1:', gen.next().value);
console.log('Gen2:', gen.next().value);
console.log('Gen3:', gen.next().value);

console.log('Completado'); 