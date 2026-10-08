// Script de validación automatizada de todos los CRUDs contra SQLite
const BASE_URL = "http://localhost:3001";

async function runValidation() {
  console.log("🧪 Iniciando validación completa de CRUDs con SQLite...\n");
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. Categorías
  let testCatId = null;
  await test("CRUD Categorías: Crear", async () => {
    const res = await fetch(`${BASE_URL}/api/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Categoría Test SQLite", emoji: "🍩", label: "🍩 Test", orden: 99 })
    });
    const data = await res.json();
    if (!data.id) throw new Error("No devolvió ID");
    testCatId = data.id;
  });

  await test("CRUD Categorías: Actualizar", async () => {
    const res = await fetch(`${BASE_URL}/api/categories/${testCatId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Categoría Test SQLite Modificada", emoji: "🧁" })
    });
    const data = await res.json();
    if (data.emoji !== "🧁") throw new Error("No actualizó emoji");
  });

  await test("CRUD Categorías: Eliminar", async () => {
    const res = await fetch(`${BASE_URL}/api/categories/${testCatId}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) throw new Error("No confirmó eliminación");
  });

  // 2. Productos
  let testProdId = null;
  await test("CRUD Productos: Crear (con video y tags)", async () => {
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: "Producto Test SQLite",
        category: "Repostería & Postres",
        precio: 15000,
        descripcion: "Postre de prueba para test automatizado",
        video: "/videos/cheesecake.mp4",
        tags: ["⭐ Exclusivo", "🧪 Test"]
      })
    });
    const data = await res.json();
    if (!data.id) throw new Error("No devolvió ID");
    testProdId = data.id;
  });

  await test("CRUD Productos: Leer y parsear tags/video", async () => {
    const res = await fetch(`${BASE_URL}/api/products`);
    const list = await res.json();
    const prod = list.find(p => p.id === testProdId);
    if (!prod) throw new Error("Producto no encontrado en lista");
    if (prod.video !== "/videos/cheesecake.mp4") throw new Error("Video no coincide");
    if (!Array.isArray(prod.tags) || !prod.tags.includes("⭐ Exclusivo")) throw new Error("Tags no parseados correctamente");
  });

  await test("CRUD Productos: Actualizar", async () => {
    const res = await fetch(`${BASE_URL}/api/products/${testProdId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ precio: 18000, tags: ["⭐ Actualizado"] })
    });
    const data = await res.json();
    if (data.precio !== 18000) throw new Error("Precio no actualizado");
  });

  await test("CRUD Productos: Eliminar", async () => {
    const res = await fetch(`${BASE_URL}/api/products/${testProdId}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) throw new Error("No confirmó eliminación");
  });

  // 3. Adiciones
  let testAddId = null;
  await test("CRUD Adiciones: Crear, Leer, Actualizar, Eliminar", async () => {
    const resCreate = await fetch(`${BASE_URL}/api/additions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Adición Test", precio: 2500, disponible: true })
    });
    const created = await resCreate.json();
    testAddId = created.id;
    if (!testAddId) throw new Error("No creó adición");

    const resUpdate = await fetch(`${BASE_URL}/api/additions/${testAddId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ precio: 3000 })
    });
    const updated = await resUpdate.json();
    if (updated.precio !== 3000) throw new Error("No actualizó precio de adición");

    const resDel = await fetch(`${BASE_URL}/api/additions/${testAddId}`, { method: "DELETE" });
    const delData = await resDel.json();
    if (!delData.success) throw new Error("No eliminó adición");
  });

  // 4. Salsas
  let testSauceId = null;
  await test("CRUD Salsas: Crear, Leer, Actualizar, Eliminar", async () => {
    const resCreate = await fetch(`${BASE_URL}/api/sauces`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Salsa Test", precio: 1200, disponible: true })
    });
    const created = await resCreate.json();
    testSauceId = created.id;
    if (!testSauceId) throw new Error("No creó salsa");

    const resDel = await fetch(`${BASE_URL}/api/sauces/${testSauceId}`, { method: "DELETE" });
    const delData = await resDel.json();
    if (!delData.success) throw new Error("No eliminó salsa");
  });

  // 5. Mesas
  await test("CRUD Mesas: Crear, Leer, Actualizar, Eliminar", async () => {
    const resCreate = await fetch(`${BASE_URL}/api/mesas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero: 99 })
    });
    const list = await resCreate.json();
    const mesa99 = list.find(m => m.numero === 99);
    if (!mesa99) throw new Error("No encontró mesa 99 creada");

    const resUpdate = await fetch(`${BASE_URL}/api/mesas/${mesa99.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa: false })
    });
    const updated = await resUpdate.json();
    if (updated.activa !== false) throw new Error("No actualizó estado de mesa");

    const resDel = await fetch(`${BASE_URL}/api/mesas/${mesa99.id}`, { method: "DELETE" });
    const delData = await resDel.json();
    if (!delData.success) throw new Error("No eliminó mesa");
  });

  // 6. Colaboradores
  await test("CRUD Colaboradores: Crear, Leer, Actualizar, Eliminar", async () => {
    const resCreate = await fetch(`${BASE_URL}/api/colaboradores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Laura Test", email: "laura.test", rol: "colaborador", password: "password123" })
    });
    const created = await resCreate.json();
    if (!created.id) throw new Error("No creó colaborador");

    const resUpdate = await fetch(`${BASE_URL}/api/colaboradores/${created.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: false })
    });
    const updated = await resUpdate.json();
    if (updated.activo !== false) throw new Error("No actualizó estado de colaborador");

    const resDel = await fetch(`${BASE_URL}/api/colaboradores/${created.id}`, { method: "DELETE" });
    const delData = await resDel.json();
    if (!delData.success) throw new Error("No eliminó colaborador");
  });

  // 7. Insignias / Fidelización
  await test("CRUD Fidelización: Upsert y Leer Insignias", async () => {
    const resUpsert = await fetch(`${BASE_URL}/api/badges`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Oro",
        required_orders: 10,
        description: "Cliente VIP Test",
        beneficio: "15% de descuento",
        discount_percentage: 15,
        free_delivery: true,
        has_2x1: true,
        apply_days: ["Viernes"]
      })
    });
    const updated = await resUpsert.json();
    if (!updated.name) throw new Error("No guardó insignia");

    const resGet = await fetch(`${BASE_URL}/api/badges`);
    const badges = await resGet.json();
    const oro = badges.find(b => b.name === "Oro");
    if (!oro || oro.discount_percentage !== 15) throw new Error("Insignia no coincide al leer");
  });

  // 8. Pedidos
  let testOrderId = null;
  await test("CRUD Pedidos: Crear, Actualizar estado y pago", async () => {
    const resCreate = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: "Test Pedido SQLite",
        telefono: "3009998877",
        direccion: "Calle 10 # 20 - 30",
        pago: "Efectivo",
        tipo_entrega: "delivery",
        subtotal: 30000,
        total: 34000,
        items: [{ id: 1, nombre: "Cheesecake", cantidad: 2, subtotal: 28000 }]
      })
    });
    const created = await resCreate.json();
    if (!created.ok || !created.numero) throw new Error("No creó pedido");
    testOrderId = created.id;

    const resStatus = await fetch(`${BASE_URL}/api/orders/${testOrderId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "entregado" })
    });
    const statusData = await resStatus.json();
    if (statusData.estado !== "entregado") throw new Error("No actualizó estado");

    const resPay = await fetch(`${BASE_URL}/api/orders/${testOrderId}/payment`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado_pago: "pagado" })
    });
    const payData = await resPay.json();
    if (payData.estado_pago !== "pagado") throw new Error("No actualizó estado de pago");
  });

  // 9. Configuración y Diseño
  await test("CRUD Configuración y Diseño: Guardar y Leer", async () => {
    const resSet = await fetch(`${BASE_URL}/api/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ razon_social: "Gran Sabor SQLite Validated", phone: "3001234567" })
    });
    const setData = await resSet.json();
    if (setData.razon_social !== "Gran Sabor SQLite Validated") throw new Error("No actualizó settings");

    const resDes = await fetch(`${BASE_URL}/api/design`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardRadius: "24px" })
    });
    const desData = await resDes.json();
    if (desData.cardRadius !== "24px") throw new Error("No actualizó design");
  });

  console.log(`\n==============================`);
  console.log(`📊 RESULTADO: ${passed} pruebas superadas, ${failed} fallidas.`);
  console.log(`==============================\n`);
  if (failed > 0) process.exit(1);
}

runValidation().catch(console.error);
