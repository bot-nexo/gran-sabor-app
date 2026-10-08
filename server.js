import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Instancia de SQLite (Intentamos better-sqlite3 primero, fallback a node:sqlite)
let db;
const dbPath = path.join(__dirname, "demo.db");

try {
  const Database = (await import("better-sqlite3")).default;
  db = new Database(dbPath);
  console.log("📦 SQLite conectado vía better-sqlite3:", dbPath);
} catch (e1) {
  try {
    const { DatabaseSync } = await import("node:sqlite");
    db = new DatabaseSync(dbPath);
    console.log("📦 SQLite conectado vía node:sqlite:", dbPath);
  } catch (e2) {
    console.error("❌ Error inicializando SQLite:", e2);
  }
}

// Wrapper para ejecutar queries con una interfaz unificada
const query = {
  run: (sql, params = []) => {
    if (db.prepare) {
      const stmt = db.prepare(sql);
      const res = stmt.run(...params);
      return {
        ...res,
        lastInsertRowid: res?.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : undefined,
        changes: res?.changes !== undefined ? Number(res.changes) : undefined
      };
    }
    return db.exec(sql);
  },
  all: (sql, params = []) => {
    if (db.prepare) {
      const stmt = db.prepare(sql);
      return stmt.all(...params);
    }
    return [];
  },
  get: (sql, params = []) => {
    if (db.prepare) {
      const stmt = db.prepare(sql);
      return stmt.get(...params);
    }
    return null;
  },
  exec: (sql) => {
    return db.exec(sql);
  }
};

// ── Inicialización y Esquema de Tablas ──────────────────────────────────────────
function initSchema() {
  query.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE,
      emoji TEXT DEFAULT '',
      label TEXT,
      orden INTEGER DEFAULT 0,
      visible INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      category TEXT,
      descripcion TEXT DEFAULT '',
      precio INTEGER NOT NULL DEFAULT 0,
      imagen TEXT DEFAULT '',
      video TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      destacado INTEGER DEFAULT 0,
      disponible INTEGER DEFAULT 1,
      badge_active INTEGER DEFAULT 0,
      badge_2x1_active INTEGER DEFAULT 0,
      badge_2x1_days TEXT DEFAULT '[]',
      badge_rule TEXT DEFAULT '',
      promo_price INTEGER DEFAULT 0,
      nota TEXT DEFAULT '',
      tiempo_preparacion_horas INTEGER DEFAULT 0,
      adiciones TEXT DEFAULT '[]',
      salsas TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS additions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio INTEGER DEFAULT 0,
      disponible INTEGER DEFAULT 1,
      max_cantidad INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS sauces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio INTEGER DEFAULT 0,
      disponible INTEGER DEFAULT 1,
      max_cantidad INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS mesas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero INTEGER UNIQUE NOT NULL,
      activa INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS colaboradores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      rol TEXT DEFAULT 'colaborador',
      activo INTEGER DEFAULT 1,
      password TEXT DEFAULT '12345678',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customer_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      required_orders INTEGER DEFAULT 0,
      description TEXT DEFAULT '',
      beneficio TEXT DEFAULT '',
      discount_percentage INTEGER DEFAULT 0,
      free_delivery INTEGER DEFAULT 0,
      has_2x1 INTEGER DEFAULT 0,
      apply_days TEXT DEFAULT '[]',
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero INTEGER,
      nombre TEXT,
      telefono TEXT,
      email TEXT DEFAULT '',
      direccion TEXT,
      unidad TEXT,
      apto TEXT,
      observaciones TEXT,
      tipo_entrega TEXT DEFAULT 'delivery',
      tipo_pedido TEXT DEFAULT 'inmediato',
      mesa INTEGER,
      pago TEXT,
      subtotal INTEGER DEFAULT 0,
      delivery_fee INTEGER DEFAULT 0,
      descuento INTEGER DEFAULT 0,
      total INTEGER DEFAULT 0,
      items TEXT DEFAULT '[]',
      estado TEXT DEFAULT 'nuevo',
      estado_pago TEXT DEFAULT 'pendiente',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      razon_social TEXT,
      slogan TEXT,
      phone TEXT,
      address TEXT,
      maps_url TEXT,
      instagram TEXT,
      facebook TEXT,
      tiktok TEXT,
      logo_url TEXT,
      delivery_fee INTEGER DEFAULT 0,
      free_delivery_threshold INTEGER DEFAULT 0,
      offers_delivery INTEGER DEFAULT 1,
      offers_pickup INTEGER DEFAULT 1,
      offers_local INTEGER DEFAULT 1,
      force_closed INTEGER DEFAULT 0,
      dynamic_delivery_enabled INTEGER DEFAULT 0,
      store_lat REAL,
      store_lng REAL,
      base_delivery_fee INTEGER DEFAULT 3000,
      price_per_km INTEGER DEFAULT 1500,
      max_delivery_radius_km REAL DEFAULT 15,
      use_customer_badges INTEGER DEFAULT 1,
      bank_accounts TEXT DEFAULT '[]',
      day1 TEXT DEFAULT '["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"]',
      hours1 TEXT DEFAULT '12:00 PM - 10:00 PM',
      plan_emails INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS catalog_design (
      id INTEGER PRIMARY KEY,
      data TEXT
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telefono TEXT UNIQUE,
      nombre TEXT,
      email TEXT DEFAULT '',
      ordenes_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE,
      nombre TEXT,
      descripcion TEXT,
      activo INTEGER DEFAULT 1,
      icono TEXT
    );

    CREATE TABLE IF NOT EXISTS store_ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telefono TEXT,
      rating INTEGER,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try { query.exec("ALTER TABLE products ADD COLUMN video TEXT DEFAULT ''"); } catch {}
  try { query.exec("ALTER TABLE products ADD COLUMN tags TEXT DEFAULT '[]'"); } catch {}
  try { query.exec("ALTER TABLE settings ADD COLUMN plan_emails INTEGER DEFAULT 1"); } catch {}
  try { query.exec("ALTER TABLE orders ADD COLUMN email TEXT DEFAULT ''"); } catch {}
  try { query.exec("ALTER TABLE clientes ADD COLUMN email TEXT DEFAULT ''"); } catch {}

  try {
    query.run("UPDATE products SET video = '/videos/cheesecake.mp4', tags = '[\"⭐ Especial del Chef\", \"🍓 Fruta Fresca\", \"⏱️ 10 min\"]' WHERE nombre LIKE '%Cheesecake%' AND (video IS NULL OR video = '')");
    query.run("UPDATE products SET video = '/videos/croissant.mp4', tags = '[\"🥐 100% Mantequilla\", \"🌰 Almendras\", \"⏱️ 5 min\"]' WHERE nombre LIKE '%Croissant%' AND (video IS NULL OR video = '')");
    query.run("UPDATE products SET video = '/videos/chocolate.mp4', tags = '[\"🍫 70% Cacao Belga\", \"🔥 Más Vendido\", \"⏱️ 8 min\"]' WHERE nombre LIKE '%Chocolate%' AND (video IS NULL OR video = '')");
    query.run("UPDATE products SET video = '/videos/cafe.mp4', tags = '[\"☕ Café de Origen\", \"🌿 Especias\", \"⏱️ 5 min\"]' WHERE nombre LIKE '%Cappuccino%' AND (video IS NULL OR video = '')");
  } catch {}
}

// ── Datos Semilla (Seed) ────────────────────────────────────────────────────────
function seedDatabase(force = false) {
  const count = query.get("SELECT COUNT(*) as c FROM products")?.c || 0;
  if (count > 0 && !force) {
    // Si ya hay productos, solo aseguramos que las tablas accesorias tengan datos si están vacías
    seedAccessoriesIfEmpty();
    return;
  }

  if (force) {
    query.exec(`
      DELETE FROM products;
      DELETE FROM categories;
      DELETE FROM additions;
      DELETE FROM sauces;
      DELETE FROM payment_methods;
      DELETE FROM settings;
      DELETE FROM catalog_design;
      DELETE FROM orders;
      DELETE FROM mesas;
      DELETE FROM colaboradores;
      DELETE FROM customer_badges;
    `);
  }

  // 1. Categorías iniciales
  const defaultCategories = [
    { nombre: "Repostería & Postres", emoji: "🍰", label: "🍰 Repostería & Postres", orden: 1 },
    { nombre: "Café & Especialidades", emoji: "☕", label: "☕ Café & Especialidades", orden: 2 },
    { nombre: "Brunch & Salados", emoji: "🥪", label: "🥪 Brunch & Salados", orden: 3 },
    { nombre: "Bebidas Frías & Frappés", emoji: "🥤", label: "🥤 Bebidas Frías & Frappés", orden: 4 },
    { nombre: "Tortas de Celebración", emoji: "🎂", label: "🎂 Tortas de Celebración", orden: 5 },
  ];

  for (const cat of defaultCategories) {
    query.run(
      "INSERT OR REPLACE INTO categories (nombre, emoji, label, orden, visible) VALUES (?, ?, ?, ?, 1)",
      [cat.nombre, cat.emoji, cat.label, cat.orden]
    );
  }

  // 2. Productos de prueba con videos locales y tags
  const defaultProducts = [
    {
      nombre: "Cheesecake Artesanal de Frutos Rojos",
      category: "Repostería & Postres",
      descripcion: "Cremosa base de queso crema estilo New York con coulis casero de fresas, moras y arándanos silvestres.",
      precio: 14000,
      imagen: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=80",
      video: "/videos/cheesecake.mp4",
      tags: JSON.stringify(["⭐ Especial del Chef", "🍓 Fruta Fresca", "⏱️ 10 min"]),
      destacado: 1,
      badge_active: 1,
      badge_rule: "⭐ Más Vendido"
    },
    {
      nombre: "Croissant Francés de Almendras & Crema",
      category: "Repostería & Postres",
      descripcion: "Hojaldre artesanal 100% mantequilla relleno de crema de almendras tostadas y cubierto con almendras laminadas.",
      precio: 11500,
      imagen: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80",
      video: "/videos/croissant.mp4",
      tags: JSON.stringify(["🥐 100% Mantequilla", "🌰 Almendras", "⏱️ 5 min"]),
      destacado: 1,
      badge_active: 1,
      badge_rule: "✨ Horneado Hoy"
    },
    {
      nombre: "Torta Húmeda Triple Chocolate Belga",
      category: "Repostería & Postres",
      descripcion: "Bizcocho húmedo de cacao al 70% bañado en ganache tibio de chocolate semiamargo y virutas crujientes.",
      precio: 13000,
      imagen: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80",
      video: "/videos/chocolate.mp4",
      tags: JSON.stringify(["🍫 70% Cacao Belga", "🔥 Más Vendido", "⏱️ 8 min"]),
      destacado: 1,
      badge_2x1_active: 1,
      badge_2x1_days: JSON.stringify(["Jueves", "Viernes"])
    },
    {
      nombre: "Cappuccino Italiano Vainilla & Canela",
      category: "Café & Especialidades",
      descripcion: "Espresso doble de origen con leche vaporizada sedosa, extracto natural de vainilla y toque de canela ceilán.",
      precio: 9500,
      imagen: "https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80",
      video: "/videos/cafe.mp4",
      tags: JSON.stringify(["☕ Café de Origen", "🌿 Especias", "⏱️ 5 min"]),
      destacado: 0
    },
    {
      nombre: "Mocha Frappé con Crema Batida & Caramelo",
      category: "Bebidas Frías & Frappés",
      descripcion: "Bebida helada cremosa a base de café espresso, chocolate artesanal, hielo triturado y salsa de toffee.",
      precio: 12500,
      imagen: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80",
      video: "",
      tags: JSON.stringify(["🥤 Frappé Helado", "🍯 Toffee"]),
      destacado: 1
    },
    {
      nombre: "Sandwich Gourmet Roast Beef & Queso Brie",
      category: "Brunch & Salados",
      descripcion: "Pan ciabatta rústico, finas láminas de roast beef marinadas, queso brie fundido, rúcula y mostaza dijon.",
      precio: 22000,
      imagen: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80",
      video: "",
      tags: JSON.stringify(["🥪 Brunch", "🧀 Queso Brie"]),
      destacado: 1
    },
    {
      nombre: "Bowl de Açaí con Frutas Tropicales & Granola",
      category: "Brunch & Salados",
      descripcion: "Puré orgánico de açaí con plátano, kiwi fresco, fresas, semillas de chía y miel de abejas pura.",
      precio: 16500,
      imagen: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&auto=format&fit=crop&q=80",
      video: "",
      tags: JSON.stringify(["🍓 Frutas Frescas", "🍯 Miel"]),
      destacado: 0
    },
    {
      nombre: "Torta Red Velvet Suprema con Frosting de Queso (Familiar)",
      category: "Tortas de Celebración",
      descripcion: "Espectacular torta aterciopelada roja de 12 porciones con capas generosas de frosting de queso crema y vainilla.",
      precio: 78000,
      imagen: "https://images.unsplash.com/photo-1586788680434-30d324b2d46f?w=600&auto=format&fit=crop&q=80",
      video: "",
      tags: JSON.stringify(["🎂 Familiar (12 porc.)", "🍰 Red Velvet"]),
      destacado: 1,
      nota: "PEDIDO DISPONIBLE CON 4 HORAS DE ANTICIPACIÓN.",
      tiempo_preparacion_horas: 4
    }
  ];

  for (const prod of defaultProducts) {
    query.run(
      `INSERT INTO products (nombre, category, descripcion, precio, imagen, video, tags, destacado, disponible, badge_active, badge_2x1_active, badge_2x1_days, badge_rule, nota, tiempo_preparacion_horas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
      [
        prod.nombre,
        prod.category,
        prod.descripcion,
        prod.precio,
        prod.imagen,
        prod.video || "",
        prod.tags || "[]",
        prod.destacado || 0,
        prod.badge_active || 0,
        prod.badge_2x1_active || 0,
        prod.badge_2x1_days || "[]",
        prod.badge_rule || "",
        prod.nota || "",
        prod.tiempo_preparacion_horas || 0
      ]
    );
  }

  // 3. Adiciones y Salsas
  const defaultAdditions = [
    { nombre: "Porción Extra de Queso Fundido", precio: 3000 },
    { nombre: "Shot Extra de Espresso", precio: 2500 },
    { nombre: "Fruta Fresca Picada", precio: 2800 },
    { nombre: "Almendras Tostadas", precio: 2500 },
  ];
  for (const add of defaultAdditions) {
    query.run("INSERT INTO additions (nombre, precio, disponible, max_cantidad) VALUES (?, ?, 1, 3)", [add.nombre, add.precio]);
  }

  const defaultSauces = [
    { nombre: "Sirope de Caramelo Salado", precio: 1500 },
    { nombre: "Ganache de Chocolate Belga", precio: 2000 },
    { nombre: "Mermelada Artesanal de Frutos Rojos", precio: 2000 },
    { nombre: "Miel Orgánica", precio: 1800 },
  ];
  for (const s of defaultSauces) {
    query.run("INSERT INTO sauces (nombre, precio, disponible, max_cantidad) VALUES (?, ?, 1, 2)", [s.nombre, s.precio]);
  }

  // 4. Métodos de Pago
  const defaultPaymentMethods = [
    { codigo: "efectivo", nombre: "Efectivo", descripcion: "Pagas al recibir o en caja", activo: 1, icono: "💵" },
    { codigo: "transferencia", nombre: "Transferencia Bancaria / QR", descripcion: "Bancolombia, Nequi, Daviplata o PSE", activo: 1, icono: "📱" },
    { codigo: "tarjeta", nombre: "Tarjeta Débito / Crédito", descripcion: "Datáfono inalámbrico contra entrega", activo: 1, icono: "💳" }
  ];
  for (const pm of defaultPaymentMethods) {
    query.run("INSERT INTO payment_methods (codigo, nombre, descripcion, activo, icono) VALUES (?, ?, ?, ?, ?)", [
      pm.codigo, pm.nombre, pm.descripcion, pm.activo, pm.icono
    ]);
  }

  // 5. Configuración del Negocio
  query.run(
    `INSERT OR REPLACE INTO settings (id, razon_social, slogan, phone, address, maps_url, instagram, delivery_fee, free_delivery_threshold, offers_delivery, offers_pickup, offers_local, force_closed, dynamic_delivery_enabled, logo_url)
     VALUES (1, 'Gran Sabor Bistro & Café', 'Experiencia gastronómica artesanal, repostería y café de especialidad', '3001234567', 'Av. Principal # 45 - 80, Zona Gourmet', 'https://maps.google.com', '@gransabor_demo', 4000, 45000, 1, 1, 1, 0, 0, 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80')`
  );

  // 6. Pedidos de muestra iniciales
  const sampleOrders = [
    {
      numero: 201,
      nombre: "Mariana Silva",
      telefono: "3125557890",
      direccion: "Carrera 70 # 32B - 14",
      unidad: "Torres del Parque",
      apto: "Apto 504",
      observaciones: "Por favor enviar servilletas extra y cubiertos.",
      tipo_entrega: "delivery",
      pago: "Transferencia Bancaria",
      subtotal: 28000,
      delivery_fee: 4000,
      total: 32000,
      estado: "preparacion",
      estado_pago: "pagado",
      items: JSON.stringify([
        { id: 1, nombre: "Cheesecake Artesanal de Frutos Rojos", cantidad: 2, precio: 14000, subtotal: 28000 }
      ])
    },
    {
      numero: 202,
      nombre: "Andrés Felipe Morales",
      telefono: "3004441122",
      direccion: "Mesa 3",
      observaciones: "Para servir en mesa.",
      tipo_entrega: "local",
      mesa: 3,
      pago: "Efectivo",
      subtotal: 21000,
      delivery_fee: 0,
      total: 21000,
      estado: "nuevo",
      estado_pago: "pendiente",
      items: JSON.stringify([
        { id: 2, nombre: "Croissant Francés de Almendras & Crema", cantidad: 1, precio: 11500, subtotal: 11500 },
        { id: 4, nombre: "Cappuccino Italiano Vainilla & Canela", cantidad: 1, precio: 9500, subtotal: 9500 }
      ])
    }
  ];

  for (const ord of sampleOrders) {
    query.run(
      `INSERT INTO orders (numero, nombre, telefono, direccion, unidad, apto, observaciones, tipo_entrega, mesa, pago, subtotal, delivery_fee, total, estado, estado_pago, items)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ord.numero, ord.nombre, ord.telefono, ord.direccion || "", ord.unidad || "", ord.apto || "",
        ord.observaciones || "", ord.tipo_entrega, ord.mesa || null, ord.pago, ord.subtotal, ord.delivery_fee, ord.total, ord.estado, ord.estado_pago, ord.items
      ]
    );
  }

  seedAccessoriesIfEmpty();
  console.log("✅ Base de datos SQLite inicializada con datos semilla con éxito.");
}

function seedAccessoriesIfEmpty() {
  // Mesas
  const mesaCount = query.get("SELECT COUNT(*) as c FROM mesas")?.c || 0;
  if (mesaCount === 0) {
    for (let i = 1; i <= 6; i++) {
      query.run("INSERT INTO mesas (numero, activa) VALUES (?, 1)", [i]);
    }
  }

  // Colaboradores
  const colabCount = query.get("SELECT COUNT(*) as c FROM colaboradores")?.c || 0;
  if (colabCount === 0) {
    query.run("INSERT INTO colaboradores (nombre, email, rol, activo, password) VALUES (?, ?, ?, 1, ?)", [
      "Administrador Demo", "admin@gransabor.com", "admin", "12345678"
    ]);
    query.run("INSERT INTO colaboradores (nombre, email, rol, activo, password) VALUES (?, ?, ?, 1, ?)", [
      "Carlos Mesero", "carlos@gransabor.com", "colaborador", "12345678"
    ]);
  }

  // Insignias de Fidelización
  const badgeCount = query.get("SELECT COUNT(*) as c FROM customer_badges")?.c || 0;
  if (badgeCount === 0) {
    const defaultBadges = [
      { name: "Nuevo", required_orders: 0, description: "Bienvenido a la familia", beneficio: "Acumula visitas", discount_percentage: 0, free_delivery: 0, has_2x1: 0, apply_days: "[]" },
      { name: "Bronce", required_orders: 3, description: "Cliente frecuente", beneficio: "5% dto. en postres", discount_percentage: 5, free_delivery: 0, has_2x1: 0, apply_days: "[]" },
      { name: "Plata", required_orders: 6, description: "Amante del sabor", beneficio: "10% dto. + Domicilio gratis", discount_percentage: 10, free_delivery: 1, has_2x1: 0, apply_days: "[]" },
      { name: "Oro", required_orders: 12, description: "Cliente VIP", beneficio: "15% dto. y 2x1 los viernes", discount_percentage: 15, free_delivery: 1, has_2x1: 1, apply_days: JSON.stringify(["Viernes"]) },
      { name: "Platino", required_orders: 20, description: "Leyenda Gourmet", beneficio: "20% dto. en toda la carta", discount_percentage: 20, free_delivery: 1, has_2x1: 1, apply_days: JSON.stringify(["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"]) },
    ];
    for (const b of defaultBadges) {
      query.run(
        "INSERT INTO customer_badges (name, required_orders, description, beneficio, discount_percentage, free_delivery, has_2x1, apply_days, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)",
        [b.name, b.required_orders, b.description, b.beneficio, b.discount_percentage, b.free_delivery, b.has_2x1, b.apply_days]
      );
    }
  }
}

// Inicializar DB
initSchema();
seedDatabase(false);

// ── Servidor Express ───────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── Rutas de API ───────────────────────────────────────────────────────────────

// 1. Catálogo Completo (para carga inicial ultrarrápida en cliente)
app.get("/api/catalog", (req, res) => {
  try {
    const categories = query.all("SELECT * FROM categories ORDER BY orden ASC");
    const products = query.all("SELECT * FROM products WHERE disponible = 1 ORDER BY id ASC");
    const settings = query.get("SELECT * FROM settings WHERE id = 1") || {};
    const paymentMethods = query.all("SELECT * FROM payment_methods WHERE activo = 1");
    const additions = query.all("SELECT * FROM additions WHERE disponible = 1");
    const sauces = query.all("SELECT * FROM sauces WHERE disponible = 1");

    const parsedProducts = products.map(p => ({
      ...p,
      video: p.video || "",
      tags: (() => {
        try {
          return typeof p.tags === 'string' && p.tags.startsWith('[')
            ? JSON.parse(p.tags)
            : (p.tags ? String(p.tags).split(',').map(t => t.trim()).filter(Boolean) : []);
        } catch {
          return [];
        }
      })(),
      destacado: Boolean(p.destacado),
      disponible: Boolean(p.disponible),
      badge_active: Boolean(p.badge_active),
      badge_2x1_active: Boolean(p.badge_2x1_active),
      badge_2x1_days: (() => { try { return JSON.parse(p.badge_2x1_days || '[]'); } catch { return []; } })(),
      adiciones: (() => { try { return JSON.parse(p.adiciones || '[]'); } catch { return []; } })(),
      salsas: (() => { try { return JSON.parse(p.salsas || '[]'); } catch { return []; } })()
    }));

    res.json({
      categories,
      products: parsedProducts,
      settings,
      paymentMethods,
      additions,
      sauces
    });
  } catch (err) {
    console.error("Error en /api/catalog:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Categorías (CRUD)
app.get("/api/categories", (req, res) => {
  try {
    const rows = query.all("SELECT * FROM categories ORDER BY orden ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/categories", (req, res) => {
  try {
    const { nombre, emoji, label, orden, visible } = req.body;
    const result = query.run(
      "INSERT INTO categories (nombre, emoji, label, orden, visible) VALUES (?, ?, ?, ?, ?)",
      [nombre, emoji || "", label || `${emoji || ""} ${nombre}`.trim(), orden ?? 0, visible === false ? 0 : 1]
    );
    const row = query.get("SELECT * FROM categories WHERE id = ?", [result.lastInsertRowid]);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/categories/:id", (req, res) => {
  try {
    const id = req.params.id;
    const { nombre, emoji, label, orden, visible } = req.body;
    const current = query.get("SELECT * FROM categories WHERE id = ? OR nombre = ?", [id, id]);
    if (!current) return res.status(404).json({ error: "Categoría no encontrada" });

    query.run(
      "UPDATE categories SET nombre = ?, emoji = ?, label = ?, orden = ?, visible = ? WHERE id = ?",
      [
        nombre !== undefined ? nombre : current.nombre,
        emoji !== undefined ? emoji : current.emoji,
        label !== undefined ? label : (emoji !== undefined || nombre !== undefined ? `${emoji !== undefined ? emoji : current.emoji || ""} ${nombre !== undefined ? nombre : current.nombre}`.trim() : current.label),
        orden !== undefined ? orden : current.orden,
        visible !== undefined ? (visible ? 1 : 0) : current.visible,
        current.id
      ]
    );
    const row = query.get("SELECT * FROM categories WHERE id = ?", [current.id]);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/categories/:id", (req, res) => {
  try {
    query.run("DELETE FROM categories WHERE id = ? OR nombre = ?", [req.params.id, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Productos (CRUD)
app.get("/api/products", (req, res) => {
  try {
    const rows = query.all("SELECT * FROM products ORDER BY id ASC");
    const parsed = rows.map(p => ({
      ...p,
      video: p.video || "",
      tags: (() => {
        try {
          return typeof p.tags === 'string' && p.tags.startsWith('[')
            ? JSON.parse(p.tags)
            : (p.tags ? String(p.tags).split(',').map(t => t.trim()).filter(Boolean) : []);
        } catch {
          return [];
        }
      })(),
      destacado: Boolean(p.destacado),
      disponible: Boolean(p.disponible),
      badge_active: Boolean(p.badge_active),
      badge_2x1_active: Boolean(p.badge_2x1_active),
      badge_2x1_days: (() => { try { return JSON.parse(p.badge_2x1_days || '[]'); } catch { return []; } })(),
      adiciones: (() => { try { return JSON.parse(p.adiciones || '[]'); } catch { return []; } })(),
      salsas: (() => { try { return JSON.parse(p.salsas || '[]'); } catch { return []; } })()
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/products", (req, res) => {
  try {
    const p = req.body;
    const result = query.run(
      `INSERT INTO products (nombre, category, descripcion, precio, imagen, video, tags, destacado, disponible, badge_active, badge_2x1_active, badge_2x1_days, badge_rule, promo_price, nota, tiempo_preparacion_horas, adiciones, salsas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.nombre,
        p.category || "",
        p.descripcion || "",
        p.precio || 0,
        p.imagen || "",
        p.video || "",
        JSON.stringify(Array.isArray(p.tags) ? p.tags : []),
        p.destacado ? 1 : 0,
        p.disponible !== false ? 1 : 0,
        p.badge_active ? 1 : 0,
        p.badge_2x1_active ? 1 : 0,
        JSON.stringify(p.badge_2x1_days || []),
        p.badge_rule || "",
        p.promo_price || 0,
        p.nota || "",
        p.tiempo_preparacion_horas || 0,
        JSON.stringify(p.adiciones || []),
        JSON.stringify(p.salsas || [])
      ]
    );
    const row = query.get("SELECT * FROM products WHERE id = ?", [result.lastInsertRowid]);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/products/:id", (req, res) => {
  try {
    const id = req.params.id;
    const p = req.body;

    const current = query.get("SELECT * FROM products WHERE id = ?", [id]);
    if (!current) return res.status(404).json({ error: "Producto no encontrado" });

    query.run(
      `UPDATE products SET 
        nombre = ?, category = ?, descripcion = ?, precio = ?, imagen = ?, video = ?, tags = ?, destacado = ?, disponible = ?,
        badge_active = ?, badge_2x1_active = ?, badge_2x1_days = ?, badge_rule = ?, promo_price = ?,
        nota = ?, tiempo_preparacion_horas = ?, adiciones = ?, salsas = ?
       WHERE id = ?`,
      [
        p.nombre !== undefined ? p.nombre : current.nombre,
        p.category !== undefined ? p.category : current.category,
        p.descripcion !== undefined ? p.descripcion : current.descripcion,
        p.precio !== undefined ? p.precio : current.precio,
        p.imagen !== undefined ? p.imagen : current.imagen,
        p.video !== undefined ? p.video : (current.video || ""),
        p.tags !== undefined ? (Array.isArray(p.tags) ? JSON.stringify(p.tags) : String(p.tags)) : (current.tags || "[]"),
        p.destacado !== undefined ? (p.destacado ? 1 : 0) : current.destacado,
        p.disponible !== undefined ? (p.disponible ? 1 : 0) : current.disponible,
        p.badge_active !== undefined ? (p.badge_active ? 1 : 0) : current.badge_active,
        p.badge_2x1_active !== undefined ? (p.badge_2x1_active ? 1 : 0) : current.badge_2x1_active,
        p.badge_2x1_days !== undefined ? JSON.stringify(p.badge_2x1_days) : current.badge_2x1_days,
        p.badge_rule !== undefined ? p.badge_rule : current.badge_rule,
        p.promo_price !== undefined ? p.promo_price : current.promo_price,
        p.nota !== undefined ? p.nota : current.nota,
        p.tiempo_preparacion_horas !== undefined ? p.tiempo_preparacion_horas : current.tiempo_preparacion_horas,
        p.adiciones !== undefined ? JSON.stringify(p.adiciones) : current.adiciones,
        p.salsas !== undefined ? JSON.stringify(p.salsas) : current.salsas,
        id
      ]
    );

    const updated = query.get("SELECT * FROM products WHERE id = ?", [id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/products/:id", (req, res) => {
  try {
    query.run("DELETE FROM products WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3.1 Adiciones (CRUD)
app.get("/api/additions", (req, res) => {
  try {
    const rows = query.all("SELECT * FROM additions ORDER BY id ASC");
    res.json(rows.map(r => ({ ...r, disponible: Boolean(r.disponible) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/additions", (req, res) => {
  try {
    const { nombre, precio, disponible, max_cantidad } = req.body;
    const result = query.run(
      "INSERT INTO additions (nombre, precio, disponible, max_cantidad) VALUES (?, ?, ?, ?)",
      [nombre, precio || 0, disponible !== false ? 1 : 0, max_cantidad || 1]
    );
    const row = query.get("SELECT * FROM additions WHERE id = ?", [result.lastInsertRowid]);
    res.json({ ...row, disponible: Boolean(row.disponible) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/additions/:id", (req, res) => {
  try {
    const id = req.params.id;
    const { nombre, precio, disponible, max_cantidad } = req.body;
    const current = query.get("SELECT * FROM additions WHERE id = ?", [id]);
    if (!current) return res.status(404).json({ error: "No encontrado" });

    query.run(
      "UPDATE additions SET nombre = ?, precio = ?, disponible = ?, max_cantidad = ? WHERE id = ?",
      [
        nombre !== undefined ? nombre : current.nombre,
        precio !== undefined ? precio : current.precio,
        disponible !== undefined ? (disponible ? 1 : 0) : current.disponible,
        max_cantidad !== undefined ? max_cantidad : current.max_cantidad,
        id
      ]
    );
    const updated = query.get("SELECT * FROM additions WHERE id = ?", [id]);
    res.json({ ...updated, disponible: Boolean(updated.disponible) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/additions/:id", (req, res) => {
  try {
    query.run("DELETE FROM additions WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3.2 Salsas (CRUD)
app.get("/api/sauces", (req, res) => {
  try {
    const rows = query.all("SELECT * FROM sauces ORDER BY id ASC");
    res.json(rows.map(r => ({ ...r, disponible: Boolean(r.disponible) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/sauces", (req, res) => {
  try {
    const { nombre, precio, disponible, max_cantidad } = req.body;
    const result = query.run(
      "INSERT INTO sauces (nombre, precio, disponible, max_cantidad) VALUES (?, ?, ?, ?)",
      [nombre, precio || 0, disponible !== false ? 1 : 0, max_cantidad || 1]
    );
    const row = query.get("SELECT * FROM sauces WHERE id = ?", [result.lastInsertRowid]);
    res.json({ ...row, disponible: Boolean(row.disponible) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/sauces/:id", (req, res) => {
  try {
    const id = req.params.id;
    const { nombre, precio, disponible, max_cantidad } = req.body;
    const current = query.get("SELECT * FROM sauces WHERE id = ?", [id]);
    if (!current) return res.status(404).json({ error: "No encontrado" });

    query.run(
      "UPDATE sauces SET nombre = ?, precio = ?, disponible = ?, max_cantidad = ? WHERE id = ?",
      [
        nombre !== undefined ? nombre : current.nombre,
        precio !== undefined ? precio : current.precio,
        disponible !== undefined ? (disponible ? 1 : 0) : current.disponible,
        max_cantidad !== undefined ? max_cantidad : current.max_cantidad,
        id
      ]
    );
    const updated = query.get("SELECT * FROM sauces WHERE id = ?", [id]);
    res.json({ ...updated, disponible: Boolean(updated.disponible) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/sauces/:id", (req, res) => {
  try {
    query.run("DELETE FROM sauces WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3.3 Mesas (CRUD)
app.get("/api/mesas", (req, res) => {
  try {
    const rows = query.all("SELECT * FROM mesas ORDER BY numero ASC");
    res.json(rows.map(m => ({ ...m, activa: Boolean(m.activa) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/mesas", (req, res) => {
  try {
    const { numero, cantidad = 1 } = req.body;
    if (numero) {
      query.run("INSERT OR REPLACE INTO mesas (numero, activa) VALUES (?, 1)", [numero]);
    } else {
      const maxNum = query.get("SELECT MAX(numero) as m FROM mesas")?.m || 0;
      for (let i = 1; i <= cantidad; i++) {
        query.run("INSERT OR REPLACE INTO mesas (numero, activa) VALUES (?, 1)", [maxNum + i]);
      }
    }
    const rows = query.all("SELECT * FROM mesas ORDER BY numero ASC");
    res.json(rows.map(m => ({ ...m, activa: Boolean(m.activa) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/mesas/:id", (req, res) => {
  try {
    const id = req.params.id;
    const { activa, numero } = req.body;
    const current = query.get("SELECT * FROM mesas WHERE id = ? OR numero = ?", [id, id]);
    if (!current) return res.status(404).json({ error: "No encontrada" });

    query.run(
      "UPDATE mesas SET activa = ?, numero = ? WHERE id = ?",
      [
        activa !== undefined ? (activa ? 1 : 0) : current.activa,
        numero !== undefined ? numero : current.numero,
        current.id
      ]
    );
    const updated = query.get("SELECT * FROM mesas WHERE id = ?", [current.id]);
    res.json(updated ? { ...updated, activa: Boolean(updated.activa) } : { success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/mesas/:id", (req, res) => {
  try {
    query.run("DELETE FROM mesas WHERE id = ? OR numero = ?", [req.params.id, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3.4 Colaboradores (CRUD)
app.get("/api/colaboradores", (req, res) => {
  try {
    const rows = query.all("SELECT id, nombre, email, rol, activo, created_at FROM colaboradores ORDER BY id ASC");
    res.json(rows.map(c => ({ ...c, activo: Boolean(c.activo) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/colaboradores", (req, res) => {
  try {
    const { nombre, email, rol, password } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();
    const result = query.run(
      "INSERT OR REPLACE INTO colaboradores (nombre, email, rol, activo, password) VALUES (?, ?, ?, 1, ?)",
      [nombre, cleanEmail, rol || "colaborador", password || "12345678"]
    );
    const rowId = Number(result.lastInsertRowid);
    const row = query.get("SELECT id, nombre, email, rol, activo, created_at FROM colaboradores WHERE id = ? OR email = ?", [rowId, cleanEmail]);
    res.json(row ? { ...row, activo: Boolean(row.activo) } : { id: rowId, nombre, email: cleanEmail, rol: rol || "colaborador", activo: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/colaboradores/:id", (req, res) => {
  try {
    const id = req.params.id;
    const { nombre, email, rol, activo, password } = req.body;
    const current = query.get("SELECT * FROM colaboradores WHERE id = ?", [id]);
    if (!current) return res.status(404).json({ error: "No encontrado" });

    query.run(
      "UPDATE colaboradores SET nombre = ?, email = ?, rol = ?, activo = ?, password = ? WHERE id = ?",
      [
        nombre !== undefined ? nombre : current.nombre,
        email !== undefined ? email : current.email,
        rol !== undefined ? rol : current.rol,
        activo !== undefined ? (activo ? 1 : 0) : current.activo,
        password !== undefined ? password : current.password,
        id
      ]
    );
    const updated = query.get("SELECT id, nombre, email, rol, activo, created_at FROM colaboradores WHERE id = ?", [id]);
    res.json(updated ? { ...updated, activo: Boolean(updated.activo) } : { success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/colaboradores/:id", (req, res) => {
  try {
    query.run("DELETE FROM colaboradores WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3.5 Insignias de Fidelización (Badges CRUD)
app.get("/api/badges", (req, res) => {
  try {
    const rows = query.all("SELECT * FROM customer_badges ORDER BY required_orders ASC");
    res.json(rows.map(b => ({
      ...b,
      free_delivery: Boolean(b.free_delivery),
      has_2x1: Boolean(b.has_2x1),
      is_active: Boolean(b.is_active),
      apply_days: (() => { try { return JSON.parse(b.apply_days || '[]'); } catch { return []; } })()
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/badges", (req, res) => {
  try {
    const b = req.body;
    query.run(
      `INSERT INTO customer_badges (name, required_orders, description, beneficio, discount_percentage, free_delivery, has_2x1, apply_days, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET
        required_orders = excluded.required_orders,
        description = excluded.description,
        beneficio = excluded.beneficio,
        discount_percentage = excluded.discount_percentage,
        free_delivery = excluded.free_delivery,
        has_2x1 = excluded.has_2x1,
        apply_days = excluded.apply_days,
        is_active = excluded.is_active`,
      [
        b.name,
        b.required_orders ?? 0,
        b.description || "",
        b.beneficio || "",
        b.discount_percentage ?? 0,
        b.free_delivery ? 1 : 0,
        b.has_2x1 ? 1 : 0,
        JSON.stringify(b.apply_days || []),
        b.is_active !== false ? 1 : 0
      ]
    );
    const updated = query.get("SELECT * FROM customer_badges WHERE name = ?", [b.name]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Pedidos (Orders CRUD)
app.get("/api/orders", (req, res) => {
  try {
    const rows = query.all("SELECT * FROM orders ORDER BY id DESC");
    const parsed = rows.map(o => ({
      ...o,
      items: (() => { try { return JSON.parse(o.items || '[]'); } catch { return []; } })()
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders", (req, res) => {
  try {
    const o = req.body;
    
    // Obtener el siguiente número de pedido
    const last = query.get("SELECT MAX(numero) as maxNum FROM orders");
    const nextNumero = (last?.maxNum || 100) + 1;

    const result = query.run(
      `INSERT INTO orders (numero, nombre, telefono, email, direccion, unidad, apto, observaciones, tipo_entrega, tipo_pedido, mesa, pago, subtotal, delivery_fee, descuento, total, items, estado, estado_pago)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'nuevo', 'pendiente')`,
      [
        nextNumero,
        o.nombre || "",
        o.telefono || "",
        o.email || "",
        o.direccion || "",
        o.unidad || "",
        o.apto || "",
        o.observaciones || "",
        o.tipo_entrega || "delivery",
        o.tipo_pedido || "inmediato",
        o.mesa || null,
        o.pago || "Efectivo",
        o.subtotal || 0,
        o.delivery_fee || 0,
        o.descuento || 0,
        o.total || 0,
        JSON.stringify(o.items || [])
      ]
    );

    // Incrementar conteo de cliente si tiene teléfono
    if (o.telefono) {
      const cleanPhone = String(o.telefono).replace(/\D/g, "");
      const cliente = query.get("SELECT * FROM clientes WHERE telefono = ?", [cleanPhone]);
      if (cliente) {
        query.run(
          "UPDATE clientes SET ordenes_count = ordenes_count + 1, nombre = COALESCE(NULLIF(?, ''), nombre), email = CASE WHEN ? != '' THEN ? ELSE email END WHERE telefono = ?",
          [o.nombre || "", o.email || "", o.email || "", cleanPhone]
        );
      } else {
        query.run(
          "INSERT INTO clientes (telefono, nombre, email, ordenes_count) VALUES (?, ?, ?, 1)",
          [cleanPhone, o.nombre || "Cliente", o.email || ""]
        );
      }
    }

    res.json({
      ok: true,
      persisted: true,
      id: result.lastInsertRowid,
      numero: nextNumero
    });
  } catch (err) {
    console.error("Error creando pedido:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.put("/api/orders/:id/status", (req, res) => {
  try {
    const { estado } = req.body;
    query.run("UPDATE orders SET estado = ? WHERE id = ? OR numero = ?", [estado, req.params.id, req.params.id]);
    res.json({ success: true, estado });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/orders/:id/payment", (req, res) => {
  try {
    const { estado_pago } = req.body;
    query.run("UPDATE orders SET estado_pago = ? WHERE id = ? OR numero = ?", [estado_pago, req.params.id, req.params.id]);
    res.json({ success: true, estado_pago });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/orders/:id", (req, res) => {
  try {
    query.run("DELETE FROM orders WHERE id = ? OR numero = ?", [req.params.id, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Configuración (Settings)
app.get("/api/settings", (req, res) => {
  try {
    const row = query.get("SELECT * FROM settings WHERE id = 1") || {};
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings", (req, res) => {
  try {
    const s = req.body;
    const current = query.get("SELECT * FROM settings WHERE id = 1") || {};

    query.run(
      `INSERT OR REPLACE INTO settings (
        id, razon_social, slogan, phone, address, maps_url, instagram, facebook, tiktok, logo_url,
        delivery_fee, free_delivery_threshold, offers_delivery, offers_pickup, offers_local, force_closed,
        dynamic_delivery_enabled, store_lat, store_lng, base_delivery_fee, price_per_km, max_delivery_radius_km,
        use_customer_badges, bank_accounts, day1, hours1, plan_emails
      )
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.razon_social ?? s.razonSocial ?? current.razon_social ?? "Gran Sabor Bistro & Café",
        s.slogan ?? current.slogan ?? "",
        s.phone ?? current.phone ?? "",
        s.address ?? current.address ?? "",
        s.maps_url ?? s.mapsGoogle ?? current.maps_url ?? "",
        s.instagram ?? current.instagram ?? "",
        s.facebook ?? current.facebook ?? "",
        s.tiktok ?? current.tiktok ?? "",
        s.logo_url ?? s.logoUrl ?? current.logo_url ?? "",
        s.delivery_fee ?? s.deliveryFee ?? current.delivery_fee ?? 0,
        s.free_delivery_threshold ?? s.freeDeliveryThreshold ?? current.free_delivery_threshold ?? 0,
        s.offers_delivery !== undefined ? (s.offers_delivery ? 1 : 0) : (s.offersDelivery !== undefined ? (s.offersDelivery ? 1 : 0) : (current.offers_delivery ?? 1)),
        s.offers_pickup !== undefined ? (s.offers_pickup ? 1 : 0) : (s.offersPickup !== undefined ? (s.offersPickup ? 1 : 0) : (current.offers_pickup ?? 1)),
        s.offers_local !== undefined ? (s.offers_local ? 1 : 0) : (s.offersLocal !== undefined ? (s.offersLocal ? 1 : 0) : (current.offers_local ?? 1)),
        s.force_closed !== undefined ? (s.force_closed ? 1 : 0) : (s.forceClosed !== undefined ? (s.forceClosed ? 1 : 0) : (current.force_closed ?? 0)),
        s.dynamic_delivery_enabled !== undefined ? (s.dynamic_delivery_enabled ? 1 : 0) : (s.dynamicDeliveryEnabled !== undefined ? (s.dynamicDeliveryEnabled ? 1 : 0) : (current.dynamic_delivery_enabled ?? 0)),
        s.store_lat ?? s.storeLat ?? current.store_lat ?? null,
        s.store_lng ?? s.storeLng ?? current.store_lng ?? null,
        s.base_delivery_fee ?? s.baseDeliveryFee ?? current.base_delivery_fee ?? 3000,
        s.price_per_km ?? s.pricePerKm ?? current.price_per_km ?? 1500,
        s.max_delivery_radius_km ?? s.maxDeliveryRadiusKm ?? current.max_delivery_radius_km ?? 15,
        s.use_customer_badges !== undefined ? (s.use_customer_badges ? 1 : 0) : (s.useCustomerBadges !== undefined ? (s.useCustomerBadges ? 1 : 0) : (current.use_customer_badges ?? 1)),
        typeof s.bank_accounts === 'string' ? s.bank_accounts : (s.bankAccounts ? JSON.stringify(s.bankAccounts) : (current.bank_accounts || '[]')),
        typeof s.day1 === 'string' ? s.day1 : (s.day1 ? JSON.stringify(s.day1) : (current.day1 || '["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"]')),
        s.hours1 ?? current.hours1 ?? '12:00 PM - 10:00 PM',
        s.plan_emails !== undefined ? (s.plan_emails ? 1 : 0) : (s.planEmails !== undefined ? (s.planEmails ? 1 : 0) : (current.plan_emails ?? 1))
      ]
    );
    const updated = query.get("SELECT * FROM settings WHERE id = 1");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5.1 Diseño del Catálogo (Design, Promos, Combos)
app.get("/api/design", (req, res) => {
  try {
    const row = query.get("SELECT data FROM catalog_design WHERE id = 1");
    if (row && row.data) {
      return res.json(JSON.parse(row.data));
    }
    res.json({});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/design", (req, res) => {
  try {
    const data = req.body;
    const current = query.get("SELECT data FROM catalog_design WHERE id = 1");
    let currentData = {};
    if (current && current.data) {
      try { currentData = JSON.parse(current.data); } catch {}
    }
    const merged = { ...currentData, ...data };
    query.run("INSERT OR REPLACE INTO catalog_design (id, data) VALUES (1, ?)", [JSON.stringify(merged)]);
    res.json(merged);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Clientes y Fidelización
app.get("/api/customers", (req, res) => {
  try {
    const rows = query.all("SELECT * FROM clientes ORDER BY ordenes_count DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/customers/:telefono", (req, res) => {
  try {
    const cleanPhone = String(req.params.telefono).replace(/\D/g, "");
    const row = query.get("SELECT * FROM clientes WHERE telefono = ?", [cleanPhone]);
    res.json(row || { telefono: cleanPhone, nombre: "Cliente", email: "", ordenes_count: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/customers", (req, res) => {
  try {
    const { telefono, nombre, email } = req.body;
    const cleanPhone = String(telefono).replace(/\D/g, "");
    const existing = query.get("SELECT * FROM clientes WHERE telefono = ?", [cleanPhone]);
    if (existing) {
      query.run(
        "UPDATE clientes SET nombre = COALESCE(NULLIF(?, ''), nombre), email = CASE WHEN ? != '' THEN ? ELSE email END WHERE telefono = ?",
        [nombre || "", email || "", email || "", cleanPhone]
      );
      return res.json(query.get("SELECT * FROM clientes WHERE telefono = ?", [cleanPhone]));
    }
    query.run("INSERT INTO clientes (telefono, nombre, email, ordenes_count) VALUES (?, ?, ?, 0)", [cleanPhone, nombre || "Cliente", email || ""]);
    res.json({ telefono: cleanPhone, nombre: nombre || "Cliente", email: email || "", ordenes_count: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Calificaciones
app.post("/api/ratings", (req, res) => {
  try {
    const { telefono, rating, comment } = req.body;
    query.run("INSERT INTO store_ratings (telefono, rating, comment) VALUES (?, ?, ?)", [telefono || "", rating, comment || ""]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Métodos de Pago
app.get("/api/payment-methods", (req, res) => {
  try {
    const rows = query.all("SELECT * FROM payment_methods WHERE activo = 1");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Reinicio de Datos Demo (Seed Reset)
app.post("/api/reset-demo", (req, res) => {
  try {
    seedDatabase(true);
    res.json({ success: true, message: "Datos de demostración reiniciados con éxito." });
  } catch (err) {
    console.error("Error reiniciando demo:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor API SQLite corriendo en http://localhost:${PORT}`);
});
