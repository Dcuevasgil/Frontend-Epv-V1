import AsyncStorage from "@react-native-async-storage/async-storage";

const API_HOST = process.env.EXPO_PUBLIC_API_URL || '';

if (!API_HOST) {
  throw new Error('Falta EXPO_PUBLIC_API_URL en el .env');
}

const API_ORIGIN = API_HOST.replace(/\/api\/v\d+.*$/, '').replace(/\/+$/, '');
const API_BASE = `${API_ORIGIN}/api/v1`;

async function authFetchJson(path, options = {}) {
  const token = await AsyncStorage.getItem('AUTH_TOKEN');
  if (!token) throw new Error('No hay AUTH_TOKEN — inicia sesión.');

  // Si path empieza por http, se deja tal cual. Si no, lo concatenamos.
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  const r = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const txt = await r.text();
  if (!r.ok) {
    throw new Error(`HTTP ${r.status}: ${txt?.slice(0, 200)}`);
  }

  return txt ? JSON.parse(txt) : {};
}

// GET /social/publicaciones/{id}
export async function apiGetPublicacion(id) {
  const token = await AsyncStorage.getItem('AUTH_TOKEN');

  if (!token) {
    throw new Error('Sin token de autorizacion');
  }

  const url = `${API_BASE}/social/publicaciones/${id}`;

  const r = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await r.text();

  if (!r.ok) {
    console.error('[apiGetPublicacion] Error:', r.status, text?.slice(0, 400));
    throw new Error(`HTTP ${r.status} ${text?.slice(0, 400)}`);
  }

  const data = text ? JSON.parse(text) : null;

  return data?.data ?? data ?? {};
}

// GET /social/publicaciones/{id}/comentarios
export async function apiGetComentarios(id) {
  const perPage = 50;
  let page = 1;
  let all = [];

  for (let guard = 0; guard < 200; guard++) {
    const json = await authFetchJson(
      `/social/publicaciones/${id}/comentarios?per_page=${perPage}&page=${page}`,
      { method: 'GET' }
    );

    const items = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
    all = all.concat(items);

    const links = json?.links || {};
    const meta = json?.meta || {};

    if (links.next) {
      page += 1;
      continue;
    }

    const hasMoreByMeta =
      meta.current_page &&
      meta.last_page &&
      meta.current_page < meta.last_page;

    if (hasMoreByMeta) {
      page += 1;
      continue;
    }
    break;
  }

  return all;
}

// POST /social/likes/toggle
export async function apiToggleLike(publicacionId) {
  const token = await AsyncStorage.getItem('AUTH_TOKEN');

  if (!token) {
    throw new Error('Sin token de autenticación');
  }

  const url = `${API_BASE}/social/likes/toggle`;

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ publicacion_id: publicacionId }),
  });

  const text = await r.text();

  if (!r.ok) {
    console.error('[apiToggleLike] ERROR', r.status, text?.slice(0, 400));
    throw new Error(`HTTP ${r.status} ${text?.slice(0, 400)}`);
  }

  const data = text ? JSON.parse(text) : null;
  return data ?? {};
}

// POST /social/comentarios
export async function apiCrearComentario(publicacionId, texto) {
  const token = await AsyncStorage.getItem('AUTH_TOKEN');

  if (!token) {
    throw new Error('Sin token de autenticacion');
  }

  const url = `${API_BASE}/social/comentarios`;

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      publicacion_id: publicacionId,
      texto
    }),
  });

  const respText = await r.text();
  if (!r.ok) {
    console.error('[apiCrearComentario] ERROR:', r.status, respText?.slice(0, 400));
    throw new Error(`HTTP ${r.status} ${respText?.slice(0, 400)}`);
  }

  return respText ? JSON.parse(respText) : {};
}

