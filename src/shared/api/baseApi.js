import AsyncStorage from '@react-native-async-storage/async-storage';

// ===============================
//   CONFIGURACIÓN GLOBAL API
// ===============================

// Leer del .env
const raw = process.env.EXPO_PUBLIC_API_URL || '';
const API_URL = raw.replace(/\/+$/, '');

if (!API_URL) {
  throw new Error('❌ Falta EXPO_PUBLIC_API_URL en el .env');
}

export { API_URL };


// ===============================
//   TOKEN + HEADERS
// ===============================
export async function getToken() {
  return await AsyncStorage.getItem('AUTH_TOKEN');
}

export async function authHeaders(extra = {}) {
  const token = await getToken();

  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}


// ===============================
//   CLIENTE PRINCIPAL: apiFetch
// ===============================
export async function apiFetch(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // Asegurar que path tenga /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  const url = `${API_URL}${cleanPath}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  return res.json();
}
