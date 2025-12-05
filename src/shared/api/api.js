// shared/config/api.js
const raw = process.env.EXPO_PUBLIC_API_URL || '';
const cleaned = raw.replace(/\/+$/, '');

if (!cleaned) {
  throw new Error(
    '❌ Falta EXPO_PUBLIC_API_URL en tu .env — No se puede iniciar la API'
  );
}

export const API = cleaned;
export const BASE_URL = cleaned;

export const fetchJSON = (url, opts = {}) =>
  fetch(`${BASE_URL}${url}`, {
    headers: { Accept: 'application/json', ...(opts.headers || {}) },
    ...opts,
  });