// src/api/authApi.js
import { API_BASE_URL } from '@/config/env';

const BASE = (API_BASE_URL || '').replace(/\/$/, '');

function jsonHeaders() {
  return { 'Content-Type': 'application/json', Accept: 'application/json' };
}

async function handle(res) {
  const ct = res.headers.get('content-type') || '';
  const isJson = ct.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

export async function login({ correo, contraseña }) {
  const url = `${BASE}/autenticacion/login`;
  const res = await fetch(url, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ correo, contraseña }),
  });
  return handle(res);
}

export async function registrar({ nombre, apellido, nick, correo, contraseña }) {
  const url = `${BASE}/autenticacion/registrar`;
  const res = await fetch(url, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ nombre, apellido, nick, correo, contraseña }),
  });
  return handle(res);
}

export async function refresh(token) {
  const res = await fetch(`${BASE}/autenticacion/refresh`, {
    method: 'POST',
    headers: { ...jsonHeaders(), Authorization: `Bearer ${token}` },
  });
  return handle(res);
}

export async function logout(token) {
  const res = await fetch(`${BASE}/autenticacion/logout`, {
    method: 'POST',
    headers: { ...jsonHeaders(), Authorization: `Bearer ${token}` },
  });
  return handle(res);
}
