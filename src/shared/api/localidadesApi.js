import { API_URL, authHeaders } from './baseApi';

export async function getLocalidades(q = '') {
  const url = q
    ? `${API_URL}/localidades/buscar/${encodeURIComponent(q)}`
    : `${API_URL}/localidades`;

  const res = await fetch(url, { headers: await authHeaders() });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || 'No se pudo obtener localidades');
  }
  return res.json();
}
