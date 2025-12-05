// Convierte "YYYY-MM-DD HH:mm:ss.SSS" → Date seguro
export const parseFecha = (s) => {
  if (!s) return null;
  if (s.includes('T')) return new Date(s);     // ya viene ISO
  return new Date(s.replace(' ', 'T') + 'Z');  // normaliza a ISO
};

// Formatea a español largo (“25 de octubre de 2025, 20:31”)
export const formatearFechaES = (s) => {
  const d = parseFecha(s);
  if (!d || isNaN(d)) return '';
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// Opcional: formato relativo (“hace 2 horas”, “ayer”)
export const formatearFechaRelativa = (s) => {
  const d = parseFecha(s);
  if (!d || isNaN(d)) return '';
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'justo ahora';
  if (diffMins < 60) return `hace ${diffMins} min`;
  const diffH = Math.floor(diffMins / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'ayer';
  return `hace ${diffD} días`;
};

// Formatea "2025-10-26T16:42:33Z" -> { dia: "26 oct", hora: "18:42" }
export function formatearFechaUI(input) {
  if (!input) return { dia: '', hora: '' };
  const d = new Date(input);
  if (isNaN(d)) return { dia: '', hora: '' };

  // mes corto en español (quita el punto final si lo hubiera)
  let dia = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(d);
  dia = dia.replace('.', '').toLowerCase(); // "26 oct"

  const hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false }); // "18:42"
  return { dia, hora };
}

export function formatearFechaCompleta(fecha) {
  if (!fecha) return '';

  try {
    const d = new Date(fecha);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).replace('.', '');
  } catch {
    return fecha;
  }
}