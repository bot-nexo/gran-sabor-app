// ── Menú y Catálogo Demo - Gran Sabor Bistro & Café ────────────────────────

export const products = [
  {
    id: 1,
    nombre: "Cheesecake Artesanal de Frutos Rojos",
    category: "Repostería & Postres",
    descripcion: "Cremosa base de queso crema estilo New York con coulis casero de fresas, moras y arándanos silvestres.",
    precio: 14000,
    precioOriginal: 17500,
    imagen: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=80",
    video: "/videos/cheesecake.mp4",
    destacado: true,
    tags: ["⭐ Especial del Chef", "🍓 Fruta Fresca", "⏱️ 10 min"],
    descuento: "-20%",
  },
  {
    id: 2,
    nombre: "Croissant Francés de Almendras & Crema",
    category: "Repostería & Postres",
    descripcion: "Hojaldre artesanal 100% mantequilla relleno de crema de almendras tostadas y cubierto con almendras laminadas.",
    precio: 11500,
    imagen: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80",
    video: "/videos/croissant.mp4",
    destacado: true,
    tags: ["🥐 100% Mantequilla", "🌰 Almendras", "⏱️ 5 min"],
  },
  {
    id: 3,
    nombre: "Torta Húmeda Triple Chocolate Belga",
    category: "Repostería & Postres",
    descripcion: "Bizcocho húmedo de cacao al 70% bañado en ganache tibio de chocolate semiamargo y virutas crujientes.",
    precio: 13000,
    imagen: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80",
    video: "/videos/chocolate.mp4",
    destacado: true,
    tags: ["🍫 70% Cacao Belga", "🔥 Más Vendido", "⏱️ 8 min"],
  },
  {
    id: 4,
    nombre: "Cappuccino Italiano Vainilla & Canela",
    category: "Café & Especialidades",
    descripcion: "Espresso doble de origen con leche vaporizada sedosa, extracto natural de vainilla y toque de canela ceilán.",
    precio: 9500,
    imagen: "https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80",
    video: "/videos/cafe.mp4",
    tags: ["☕ Café de Origen", "🌿 Especias", "⏱️ 5 min"],
  },
  {
    id: 5,
    nombre: "Mocha Frappé con Crema Batida & Caramelo",
    category: "Bebidas Frías & Frappés",
    descripcion: "Bebida helada cremosa a base de café espresso, chocolate artesanal, hielo triturado y salsa de toffee.",
    precio: 12500,
    imagen: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80",
    destacado: true,
    tags: ["🧊 Bebida Fría", "🍦 Crema Batida", "⏱️ 6 min"],
  },
  {
    id: 6,
    nombre: "Sandwich Gourmet Roast Beef & Queso Brie",
    category: "Brunch & Salados",
    descripcion: "Pan ciabatta rústico, finas láminas de roast beef marinadas, queso brie fundido, rúcula y mostaza dijon.",
    precio: 22000,
    imagen: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80",
    destacado: true,
    tags: ["🥪 Pan Ciabatta", "🧀 Queso Brie", "⏱️ 12 min"],
  },
  {
    id: 7,
    nombre: "Bowl de Açaí con Frutas Tropicales & Granola",
    category: "Brunch & Salados",
    descripcion: "Puré orgánico de açaí con plátano, kiwi fresco, fresas, semillas de chía y miel de abejas pura.",
    precio: 16500,
    imagen: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&auto=format&fit=crop&q=80",
    tags: ["🌱 Superfood", "🥝 Sin Gluten", "⏱️ 8 min"],
  },
  {
    id: 8,
    nombre: "Torta Red Velvet Suprema con Frosting de Queso",
    category: "Tortas de Celebración",
    descripcion: "Espectacular torta aterciopelada roja de 12 porciones con capas generosas de frosting de queso crema y vainilla.",
    precio: 78000,
    imagen: "https://images.unsplash.com/photo-1586788680434-30d324b2d46f?w=600&auto=format&fit=crop&q=80",
    destacado: true,
    tags: ["🎂 12 Porciones", "✨ Para Compartir", "⏱️ 4h Reserva"],
    nota: "PEDIDO DISPONIBLE CON 4 HORAS DE ANTICIPACIÓN.",
    tiempo_preparacion_horas: 4,
  },
];

export const menuData = products;

export const localImagesByNombre = Object.fromEntries(
  products.map((p) => [p.nombre, p.imagen]),
);

export const localVideosByNombre = Object.fromEntries(
  products.filter((p) => p.video).map((p) => [p.nombre, p.video]),
);

export const localTagsByNombre = Object.fromEntries(
  products.filter((p) => p.tags).map((p) => [p.nombre, p.tags]),
);

export const categories = [
  { id: "Todo", label: "✨ Todo el Menú" },
  { id: "Repostería & Postres", label: "🍰 Repostería & Postres" },
  { id: "Café & Especialidades", label: "☕ Café & Especialidades" },
  { id: "Brunch & Salados", label: "🥪 Brunch & Salados" },
  { id: "Bebidas Frías & Frappés", label: "🥤 Bebidas Frías & Frappés" },
  { id: "Tortas de Celebración", label: "🎂 Tortas de Celebración" },
];

export const categoryIcons = {
  "Todo": "fa-utensils",
  "Repostería & Postres": "fa-cake-candles",
  "Café & Especialidades": "fa-mug-hot",
  "Brunch & Salados": "fa-bread-slice",
  "Bebidas Frías & Frappés": "fa-wine-glass",
  "Tortas de Celebración": "fa-gift",
};

export const heroImages = [
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80"
];

export const info = {
  name: "Gran Sabor Bistro & Café",
  razonSocial: "Gran Sabor Bistro & Café",
  slogan: "Experiencia gastronómica artesanal, repostería y café de especialidad",
  address: "Av. Principal # 45 - 80, Zona Gourmet",
  mapsGoogle: "https://maps.google.com",
  instagram: "@gransabor_demo",
  facebook: "@gransabor_demo",
  tiktok: "@gransabor_demo",
  phone: "3001234567",
  closed: "",
  day1: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
  hours1: "08:00 AM - 10:00 PM",
};

export const VALOR_DOMICILIO_DEFAULT = 4000;
export const MINIMO_ENVIO_GRATIS_DEFAULT = 45000;
