/**
 * Convierte un número de minutos (puede tener decimales)
 * en formato mm:ss (por ejemplo, 10.75 → "10:45")
 */
export function formatearTiempo(minutos) {
  if (minutos == null || isNaN(minutos)) return '00:00';
  const totalSegundos = Math.round(minutos * 60);
  const mm = Math.floor(totalSegundos / 60);
  const ss = totalSegundos % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/**
 * Convierte una cadena mm:ss en minutos con decimales
 * Ejemplo: "10:45" → 10.75
 */
export function tiempoTextoAMinutos(texto) {
  if (!texto || typeof texto !== 'string') return 0;
  const [mm = '0', ss = '0'] = texto.split(':');
  const minutos = parseInt(mm, 10) + parseInt(ss, 10) / 60;
  return +(minutos.toFixed(2));
}

/**
 * Convierte segundos → texto "mm:ss"
 * Ejemplo: 645 → "10:45"
 */
export function segundosATexto(segundos) {
  if (!segundos || isNaN(segundos)) return '00:00';
  const mm = Math.floor(segundos / 60);
  const ss = segundos % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/**
 * Convierte texto "mm:ss" → segundos (entero)
 * Ejemplo: "10:45" → 645
 */
export function textoASegundos(texto) {
  if (!texto || typeof texto !== 'string') return 0;
  const [mm = '0', ss = '0'] = texto.split(':');
  return parseInt(mm, 10) * 60 + parseInt(ss, 10);
}
