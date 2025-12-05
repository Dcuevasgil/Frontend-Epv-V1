// src/shared/api/wodService.js
// Servicio de WODs para React Native (Expo).
// ✔ Usa siempre tipo_wod (backend valida: libre | tiempo | amrap)
// ✔ Rutas con /api/v1
// ✔ Mapea id_wod → id para el frontend
// ✔ Manejo de token + timeouts + errores legibles

import AsyncStorage from '@react-native-async-storage/async-storage';

// =======================
// Config base de la API
// =======================
function buildApiBase() {
  const raw = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');

  if (!raw) {
    throw new Error('Falta EXPO_PUBLIC_API_URL en tu .env');
  }

  // Si ya incluye /api o /api/vX, lo respetamos
  if (/\/api(\/v\d+)?$/i.test(raw)) return raw;

  // Si no lo incluye, se lo añadimos
  return `${raw}/api/v1`;
}
const API = buildApiBase();

// =======================
// Utilidades internas
// =======================
async function getToken() {
  const t = await AsyncStorage.getItem('AUTH_TOKEN');
  if (!t) throw new Error('Falta token de sesión.');
  return t;
}

// Convierte cualquier "id-like" a número (objeto con id_wod, id, o el propio id)
function resolveId(obj) {
  const n = Number(obj?.id_wod ?? obj?.id ?? obj);
  return Number.isFinite(n) ? n : null;
}

// Convierte DTO del backend a objeto más cómodo en el front (añade id)
function mapWod(dto) {
  if (!dto) return null;
  return { id: dto.id_wod, ...dto };
}

// Fetch con timeout + formateo de errores
async function apiFetch(path, { method = 'GET', token, body, timeoutMs = 12000 } = {}) {
  const cleanPath = String(path || '').startsWith('/') ? path : `/${path}`;
  const url = `${API.replace(/\/+$/, '')}${cleanPath}`;

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort('timeout'), timeoutMs);

  if (__DEV__) {
    const previewBody = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : '—';
  }

  let res, text;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      signal: ctrl.signal,
    });
    text = await res.text();
  } catch (e) {
    clearTimeout(to);
    const reason = (e && (e.name || e.message)) || String(e);
    const err = new Error(`Fallo de red${reason === 'AbortError' ? ' (timeout)' : ''}: ${reason}`);
    err.isNetwork = true;
    err.cause = e;
    err.url = url;
    throw err;
  } finally {
    clearTimeout(to);
  }

  let json = null;
  if (text) { try { json = JSON.parse(text); } catch { /* texto plano */ } }

  if (!res.ok) {
    const msg = (json && (json.message || json.error)) || text || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.url = url;
    err.body = text;
    throw err;
  }

  return json ?? {};
}

// =======================
// API pública
// =======================

// Crear WOD tipo "libre"
export async function crearWodLibre({ nombre = 'Entrenamiento libre', ejercicios = [] } = {}) {
  const token = await getToken();
  const dto = await apiFetch('/wods', {
    method: 'POST',
    token,
    body: { tipo_wod: 'libre', comentarios: nombre }, // el backend valida tipo_wod
  });
  const wod = mapWod(dto);
  if (ejercicios.length) await adjuntarEjercicios({ wodId: wod.id, ejercicios });
  return wod;
}

// Crear WOD tipo "tiempo" (rondas por tiempo)
export async function crearWodRondasTiempo({ nombre = 'Rondas por tiempo', ejercicios = [] } = {}) {
  const token = await getToken();
  const dto = await apiFetch('/wods', {
    method: 'POST',
    token,
    body: { tipo_wod: 'tiempo', comentarios: nombre }, // **CORREGIDO**: tipo_wod
  });
  const wod = mapWod(dto);
  if (ejercicios.length) await adjuntarEjercicios({ wodId: wod.id, ejercicios });
  return wod;
}

// Adjuntar ejercicios a un WOD
// ejercicios: [{ ejercicio_id, orden, rondas|null, repeticiones|null, tiempo_segundos|null }, ...]
export async function adjuntarEjercicios({ wodId, ejercicios }) {
  const token = await getToken();
  const id = resolveId(wodId);
  if (!id) throw new Error('adjuntarEjercicios: falta id del WOD');

  const dto = await apiFetch(`/wods/${id}/ejercicios`, {
    method: 'POST',
    token,
    body: { items: ejercicios },
  });
  return mapWod(dto); // El backend devuelve el WOD con items actualizados
}

// Guardar resultado del WOD (tiempo, comentarios, favorito)
export async function guardarResultadoWod({
  wodId,
  tiempo_realizado = null,
  comentarios = '',
}) {
  const token = await getToken();
  const id = resolveId(wodId);
  if (!id) throw new Error('guardarResultadoWod: falta id del WOD');

  const body = {};

  // Enviamos tiempo_realizado solo si es un número válido
  const t = Number(tiempo_realizado);
  if (Number.isFinite(t) && t >= 0) {
    body.tiempo_realizado = t;
  }

  // Enviamos comentarios solo si hay texto
  const txt = (comentarios || '').trim();
  if (txt.length) {
    body.comentarios = txt;
  }

  return apiFetch(`/wods/${id}/resultado`, {
    method: 'POST',
    token,
    body,
  });
}

// (Opcional) Marcar en calendario — solo si tienes ese endpoint implementado
export async function marcarEnCalendario({ wod_id, fecha = new Date() } = {}) {
  const token = await getToken();
  // Si no existe en tus rutas, este call dará 404; usa try/catch en quien lo invoque
  return apiFetch('/calendario/entrenamientos', {
    method: 'POST',
    token,
    body: { wod_id, fecha },
  });
}

// Guardar favorito genérico para WOD
export async function guardarFavoritoWod({ wod_id }) {
  const token = await getToken();
  return apiFetch('/favoritos', {
    method: 'POST',
    token,
    body: { tipo: 'wod', referencia_id: wod_id },
  });
}

// Publicar WOD (resultado + publicación + opcional calendario + favorito)
export async function publicarWod({
  wodPlan,
  tiempo_realizado,
  comentarios,
  favorito,
  primerEjercicio, // { imagen_url?, nombre? } (opcional)
} = {}) {
  const id = resolveId(wodPlan);
  if (!id) return { ok: false, error: 'Falta id del WOD' };

  try {
    await guardarResultadoWod({ wodId: id, tiempo_realizado, comentarios, favorito });

    // Calendario (ignorable si no existe)
    try { await marcarEnCalendario({ wod_id: id, fecha: new Date() }); } catch {}

    // Favorito opcional
    if (favorito) { try { await guardarFavoritoWod({ wod_id: id }); } catch {} }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

// Obtener ejercicios (lista para selector)
export async function obtenerEjercicios() {
  return apiFetch('/ejercicios', { method: 'GET' });
}

// Obtener detalle de un WOD
export async function getWod(id) {
  const token = await getToken();
  const dto = await apiFetch(`/wods/${resolveId(id)}`, {
    method: 'GET',
    token,
  });
  return mapWod(dto);
}
