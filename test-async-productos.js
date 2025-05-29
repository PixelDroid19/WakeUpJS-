// Módulo de Utilidades
const utils = (() => {
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const logTitulo = (titulo) => {
    console.log(`\n=== ${titulo.toUpperCase()} ===`);
  };
  
  return {
    delay,
    logTitulo,
  };
})();

// Clase Producto con métodos estáticos y propiedades privadas
class Producto {
  #precio;
  #stock;

  constructor(nombre, precio, stock) {
    this.nombre = nombre;
    this.#precio = precio;
    this.#stock = stock;
  }

  get info() {
    return `${this.nombre} - $${this.#precio} (Stock: ${this.#stock})`;
  }

  aplicarDescuento(porcentaje) {
    this.#precio -= this.#precio * (porcentaje / 100);
  }

  actualizarStock(cantidad) {
    this.#stock = Math.max(0, this.#stock - cantidad);
  }

  get precio() {
    return this.#precio;
  }

  get stock() {
    return this.#stock;
  }

  static crearAleatorio() {
    const nombres = ['Teclado', 'Mouse', 'Monitor', 'Auriculares', 'Micrófono'];
    const nombre = nombres[Math.floor(Math.random() * nombres.length)];
    const precio = Math.floor(Math.random() * 900) + 100;
    const stock = Math.floor(Math.random() * 50) + 1;
    return new Producto(nombre, precio, stock);
  }
}

// Generador infinito de productos aleatorios
function* generadorProductos() {
  while (true) {
    yield Producto.crearAleatorio();
  }
}


// Simular una carga remota de productos
async function cargarProductosRemotos(cantidad) {
  await utils.delay(500);
  const gen = generadorProductos();
  const productos = [];
  for (let i = 0; i < cantidad; i++) {
    productos.push(gen.next().value);
  }
  return productos;
}

// Procesar productos
function procesarProductos(productos) {
  // Filtrar productos caros
  const filtrados = productos.filter(p => p.precio > 300);

  // Aplicar descuento condicionalmente
  filtrados.forEach(p => p.aplicarDescuento(p.precio > 500 ? 15 : 5));

  // Crear un Map con nombres como clave y precio final como valor
  const preciosMap = new Map();
  filtrados.forEach(p => preciosMap.set(p.nombre, p.precio));

  // Calcular el total con reduce
  const total = filtrados.reduce((acc, p) => acc + p.precio, 0);

  return { filtrados, preciosMap, total };
}

// Simular un historial de compras usando Set y fechas
function historialCompras(productos) {
  const compras = new Set();
  productos.forEach(p => compras.add(`${p.nombre} - ${new Date().toLocaleString()}`));
  return compras;
}

// Función principal
async function main() {
  utils.logTitulo("Cargando productos");
  const productos = await cargarProductosRemotos(10);

  utils.logTitulo("Productos iniciales");
  productos.forEach(p => console.log(p.info));

  utils.logTitulo("Procesando productos");
  const { filtrados, preciosMap, total } = procesarProductos(productos);

  filtrados.forEach(p => console.log(`Final: ${p.info}`));

  utils.logTitulo("Mapa de precios finales");
  console.log(preciosMap);

  utils.logTitulo("Total final");
  console.log(`$${total}`);

  utils.logTitulo("Historial de compras");
  const historial = historialCompras(filtrados);
  historial.forEach(entry => console.log(entry));
}

// Ejecución protegida con manejo de errores
(async () => {
  try {
    await main();
    console.log("\n✅ Script completado correctamente.");
  } catch (err) {
    console.error("\n❌ Ocurrió un error:", err.message);
  }
})();

// Test simplificado para verificar async/await y ES2022+
console.log("🚀 Iniciando test de async/await moderno...");

// Función simple con async/await
async function testAsyncFunction() {
  console.log("1. Iniciando función async");
  
  // Simular delay con Promise
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log("2. Después del primer await (500ms)");
  
  // Otro delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  console.log("3. Después del segundo await (300ms)");
  
  return "✅ Función async completada";
}

// Clase con propiedades privadas (ES2022)
class TestClass {
  #privateValue = 42;
  
  constructor(name) {
    this.name = name;
  }
  
  getInfo() {
    return `${this.name}: ${this.#privateValue}`;
  }
}

// Destructuring moderno
const config = { timeout: 1000, retries: 3, debug: true };
const { timeout, retries, ...rest } = config;

console.log("4. Destructuring:", { timeout, retries, rest });

// Ejecución principal con top-level await
(async () => {
  try {
    const result = await testAsyncFunction();
    console.log("5. Resultado:", result);
    
    const testObj = new TestClass("MiTest");
    console.log("6. Clase con private:", testObj.getInfo());
    
    console.log("7. ✅ Test completado exitosamente");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
})(); 