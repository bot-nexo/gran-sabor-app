import { useEffect, useState, useCallback } from "react";
import {
  getCategories,
  getProducts,
  getSettings,
  getCatalogDesign,
  DEFAULT_CATALOG_DESIGN,
  subscribeToCatalog,
  invalidateCatalog,
  getBadges,
} from "../data/dataSource";
import {
  categories as localCategories,
  products as localProducts,
} from "../data/menu";


/**
 * Conecta la tienda con la capa de datos (dataSource).
 *
 * Estado inicial = datos locales (menú.js) → cero flash de carga y la tienda
 * se ve idéntica a hoy. Luego hace swap transparente a Supabase si está
 * configurado, y se re-suscribe a cambios en tiempo real (cuando el admin
 * edita algo, la tienda se actualiza sola).
 */
const useCatalog = () => {
  const [categories, setCategories] = useState(localCategories);
  const [products, setProducts] = useState(localProducts);
  const [settings, setSettings] = useState({
    offersDelivery: false,
    offersPickup: false,
    freeDeliveryThreshold: 0,
  });
  const [design, setDesign] = useState(DEFAULT_CATALOG_DESIGN);
  const [badges, setBadges] = useState([]);

  const load = useCallback(async () => {
    const [cats, prods, sett, dsg, bdgs] = await Promise.all([
      getCategories(),
      getProducts(),
      getSettings(),
      getCatalogDesign(),
      getBadges(),
    ]);
    setCategories(cats);
    setProducts(prods.filter((p) => p.disponible !== false));
    setSettings(sett);
    if (dsg) setDesign(dsg);
    if (bdgs) setBadges(bdgs);
  }, []);

  useEffect(() => {
    let mounted = true;

    load();

    // Realtime: si el admin cambia algo en la BD, refrescamos la tienda
    const unsubscribe = subscribeToCatalog(() => {
      if (mounted) load();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [load]);

  return { categories, products, settings, design, badges, reloadCatalog: load };
};

export default useCatalog;
