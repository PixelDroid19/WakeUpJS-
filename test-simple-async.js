console.log("🚀 Iniciando test simple");

// Test básico con setTimeout
setTimeout(() => {
  console.log("✅ Timeout de 1 segundo completado");
}, 1000);

// Test con Promise simple
new Promise(resolve => {
  setTimeout(() => {
    resolve("Promesa resuelta");
  }, 500);
}).then(result => {
  console.log("✅", result);
});

console.log("⏳ Esperando operaciones asíncronas..."); 