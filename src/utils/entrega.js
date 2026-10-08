/** Describe cómo se entrega un pedido. "local" cubre pedidos de mesa y de colaboradores. */
export const esPedidoLocal = (pedido) => pedido?.tipo_entrega === "local";

export const etiquetaEntrega = (pedido) => {
  if (pedido?.tipo_entrega === "recogida") return "Recoger en tienda";
  if (esPedidoLocal(pedido)) {
    if (pedido.origen === "mesa" && pedido.mesa) return `En local · Mesa ${pedido.mesa}`;
    if (pedido.origen === "colaborador") {
      return `En local${pedido.colaborador_nombre ? ` · ${pedido.colaborador_nombre}` : ""}`;
    }
    return "En local";
  }
  return "Domicilio";
};
