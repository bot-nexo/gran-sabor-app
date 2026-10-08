import { formatCOP } from "./price";
import { esPedidoLocal, etiquetaEntrega } from "./entrega";
import { info as fallbackInfo } from "../data/menu";

export const printTicket = (pedido, settings = null) => {
  const localName = localStorage.getItem("store_razon_social");
  const storeName = localName || settings?.razonSocial || settings?.razon_social || fallbackInfo?.razon_social || fallbackInfo?.name || "PAVÉS MEDELLÍN";

  const items = pedido.items || [];
  const fecha = new Date(pedido.created_at).toLocaleString("es-CO", {
    dateStyle: "long",
  });
  const hora = new Date(pedido.created_at).toLocaleTimeString("es-CO", {
    timeStyle: "short",
  });

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) return;

  const itemsHtml = items.map(item => {
    const opts = [...(item.opciones || []), ...(item.toppings || [])].filter(Boolean);
    const itemTotal = (item.precio_unitario || 0) * (item.cantidad || 1);
    return `
      <div class="item-row">
        <div class="item-header">
          <span class="item-qty">${item.cantidad}</span>
          <span class="item-name">${item.nombre}</span>
          <span class="item-price">${formatCOP(itemTotal)}</span>
        </div>
        ${opts.length > 0 ? `<div class="item-opts">- ${opts.join('<br>- ')}</div>` : ''}
        ${item.observaciones ? `<div class="item-obs">Nota: ${item.observaciones}</div>` : ''}
      </div>
    `;
  }).join('');

  const subtotalHtml = `<div class="totals-row"><span>Subtotal:</span><span>${formatCOP(pedido.subtotal)}</span></div>`;
  const deliveryHtml = pedido.tipo_entrega !== "recogida" && !esPedidoLocal(pedido)
    ? `<div class="totals-row"><span>Domicilio:</span><span>${pedido.delivery_fee === 0 ? "GRATIS" : formatCOP(pedido.delivery_fee)}</span></div>`
    : '';
  const totalHtml = `<div class="totals-row total-final"><span>TOTAL:</span><span>${formatCOP(pedido.total)}</span></div>`;

  const ticketHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Comanda #${pedido.numero}</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          body { 
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
            font-size: 13px; 
            width: 100%; 
            max-width: 80mm; 
            margin: 0 auto; 
            padding: 5mm; 
            color: #000; 
            line-height: 1.3; 
            box-sizing: border-box;
          }
          .center { text-align: center; }
          h1 { margin: 0 0 5px 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px; }
          h2 { margin: 0; font-size: 16px; border: 2px solid #000; display: inline-block; padding: 4px 10px; border-radius: 4px; }
          .order-number { font-size: 24px; font-weight: bold; margin: 10px 0; }
          .date-time { font-size: 12px; color: #333; margin-bottom: 10px; }
          
          .divider { border-bottom: 1px dashed #000; margin: 12px 0; }
          
          .info-block { margin-bottom: 10px; }
          .info-line { display: flex; align-items: flex-start; margin-bottom: 4px; }
          .info-label { font-weight: bold; width: 65px; flex-shrink: 0; }
          .info-value { flex: 1; }
          .payment-badge { display: inline-block; background: #000; color: #fff; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-size: 12px; }
          
          .item-row { margin-bottom: 12px; }
          .item-header { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; align-items: flex-start; }
          .item-qty { margin-right: 8px; border: 1px solid #000; padding: 1px 4px; border-radius: 3px; font-size: 12px; line-height: 1; height: fit-content; }
          .item-name { flex: 1; padding-right: 10px; }
          .item-price { text-align: right; white-space: nowrap; }
          .item-opts { padding-left: 28px; font-size: 12px; color: #333; }
          .item-obs { padding-left: 28px; font-size: 12px; font-style: italic; font-weight: bold; }
          
          .totals-block { margin-top: 15px; }
          .totals-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 14px; }
          .total-final { font-size: 18px; font-weight: bold; border-top: 2px solid #000; padding-top: 5px; margin-top: 5px; }
          
          .general-notes { border: 1px solid #000; padding: 8px; margin-top: 15px; border-radius: 4px; }
          .general-notes-title { font-weight: bold; text-transform: uppercase; font-size: 12px; margin-bottom: 4px; }
          
          .footer { text-align: center; margin-top: 20px; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="center">
          <h1>${storeName}</h1>
          <div class="date-time">${fecha} - ${hora}</div>
          
          <div class="order-number">PEDIDO #${pedido.numero}</div>
          <h2>${pedido.tipo_entrega === "recogida" ? "RECOGER EN TIENDA" : esPedidoLocal(pedido) ? etiquetaEntrega(pedido).toUpperCase() : "DOMICILIO"}</h2>
        </div>
        
        <div class="divider"></div>
        
        <div class="info-block">
          <div class="info-line">
            <span class="info-label">Cliente:</span>
            <span class="info-value"><strong>${pedido.nombre}</strong></span>
          </div>
          ${pedido.telefono ? `<div class="info-line">
            <span class="info-label">Tel:</span>
            <span class="info-value">${pedido.telefono}</span>
          </div>` : ""}
          ${pedido.tipo_entrega !== "recogida" && !esPedidoLocal(pedido) ? `
          <div class="info-line">
            <span class="info-label">Dir:</span>
            <span class="info-value"><strong>${pedido.direccion}</strong> ${pedido.unidad ? '<br/>' + pedido.unidad : ''} ${pedido.apto ? '<br/>' + pedido.apto : ''}</span>
          </div>` : ''}
          <div class="info-line" style="margin-top: 6px; align-items: center;">
            <span class="info-label">Pago:</span>
            <span class="info-value"><span class="payment-badge">${pedido.pago || "POR DEFINIR"}</span></span>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="items-block">
          ${itemsHtml}
        </div>
        
        <div class="divider"></div>
        
        <div class="totals-block">
          ${subtotalHtml}
          ${deliveryHtml}
          ${totalHtml}
        </div>
        
        ${pedido.observaciones ? `
        <div class="general-notes">
          <div class="general-notes-title">Nota del cliente:</div>
          <div>${pedido.observaciones}</div>
        </div>` : ''}
        
        <div class="footer">
          <p>¡Gracias por elegirnos!</p>
          <p>*** Fin de la comanda ***</p>
        </div>
        <br/><br/>
      </body>
    </html>
  `;

  printWindow.document.write(ticketHtml);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 400);
};
