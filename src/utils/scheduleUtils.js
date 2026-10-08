import { getSettings } from "../data/dataSource";

export const getCartMaxPrepTime = (cart) => {
  if (!cart || !Array.isArray(cart)) return 0;
  let maxTime = 0;
  cart.forEach((item) => {
    const hours = parseInt(item.tiempo_preparacion_horas) || 0;
    if (hours > maxTime) maxTime = hours;
  });
  return maxTime;
};

export const calculateMinDeliveryDate = (cart) => {
  const maxHours = getCartMaxPrepTime(cart);
  if (maxHours <= 0) return null; // No scheduling needed based on prep time
  
  const now = new Date();
  now.setHours(now.getHours() + maxHours);
  return now;
};

export const getAvailableTimeSlots = (selectedDate, minDate, hoursString) => {
  const defaultSlots = [
    { label: "10:00 AM - 12:00 PM", startHour: 10, endHour: 12 },
    { label: "12:00 PM - 02:00 PM", startHour: 12, endHour: 14 },
    { label: "02:00 PM - 04:00 PM", startHour: 14, endHour: 16 },
    { label: "04:00 PM - 06:00 PM", startHour: 16, endHour: 18 },
    { label: "06:00 PM - 08:00 PM", startHour: 18, endHour: 20 },
  ];

  let slots = defaultSlots;
  try {
    if (hoursString) {
      // Very basic parsing for "12:00 PM - 08:00 PM"
      const partes = hoursString.split(/\s*[-–]\s*/);
      if (partes.length === 2) {
        const parseHour = (txt) => {
          const m = txt.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|M)$/i);
          if (!m) return null;
          let h = parseInt(m[1], 10);
          const suf = m[3].toUpperCase();
          if ((suf === "PM" || suf === "M") && h < 12) h += 12;
          if (suf === "AM" && h === 12) h = 0;
          return h;
        };
        const start = parseHour(partes[0]);
        const end = parseHour(partes[1]);
        if (start !== null && end !== null && end > start) {
          slots = [];
          for (let h = start; h < end; h += 2) {
            const hEnd = Math.min(h + 2, end);
            const format12 = (hour24) => {
              const h12 = hour24 % 12 || 12;
              return `${h12}:00 ${hour24 < 12 ? "AM" : "PM"}`;
            };
            slots.push({
              label: `${format12(h)} - ${format12(hEnd)}`,
              startHour: h,
              endHour: hEnd
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn("Could not parse settings for slots", e);
  }

  if (!minDate) return slots;

  const isSameDay = 
    selectedDate.getFullYear() === minDate.getFullYear() &&
    selectedDate.getMonth() === minDate.getMonth() &&
    selectedDate.getDate() === minDate.getDate();

  if (isSameDay) {
    const minHour = minDate.getHours();
    return slots.filter(slot => slot.startHour >= minHour);
  }

  const normalizedSelected = new Date(selectedDate);
  normalizedSelected.setHours(0,0,0,0);
  const normalizedMin = new Date(minDate);
  normalizedMin.setHours(0,0,0,0);

  if (normalizedSelected < normalizedMin) {
    return [];
  }

  return slots;
};
