// Test para verificar la nueva funcionalidad de espera inteligente
// Este código debe ejecutarse y mostrar todos los resultados después de que las operaciones asíncronas terminen

console.log("🚀 Iniciando pruebas de espera inteligente");

// Test 1: setTimeout básico
setTimeout(() => {
  console.log("✅ Test 1: setTimeout de 500ms completado");
}, 500);

// Test 2: múltiples setTimeout
setTimeout(() => {
  console.log("✅ Test 2a: setTimeout de 1000ms completado");
}, 1000);

setTimeout(() => {
  console.log("✅ Test 2b: setTimeout de 1500ms completado");
}, 1500);

// Test 3: fetch request simulado (usando setTimeout para simular)
console.log("📡 Iniciando petición HTTP simulada...");
setTimeout(() => {
  console.log("✅ Test 3: Petición HTTP simulada completada (2 segundos)");
}, 2000);

// Test 4: Promise con delay
new Promise((resolve) => {
  setTimeout(() => {
    resolve("Test 4: Promise resuelta");
  }, 800);
}).then((result) => {
  console.log("✅", result);
});

// Test 5: async/await con delay
(async () => {
  await new Promise(resolve => setTimeout(resolve, 1200));
  console.log("✅ Test 5: Async/await completado (1200ms)");
})();

console.log("⏳ Todas las operaciones asíncronas han sido iniciadas");
console.log("💡 La espera inteligente debería mostrar todos los resultados después de ~2 segundos"); 