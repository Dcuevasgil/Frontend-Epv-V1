import { API_URL, authHeaders, apiFetch } from './baseApi';

// ----------------------------------
// PERFIL DEL USUARIO LOGUEADO
// ----------------------------------
export async function getMiPerfil() {
  // tu backend ya tiene /usuarios/me protegido
  return apiFetch('/usuarios/me');
}

// ----------------------------------
// ACTUALIZAR PERFIL (si la usas en algún sitio)
// ----------------------------------
export async function actualizarPerfil(id, payload) {
  // si en tu backend realmente es /usuarios/actualizar-perfil,
  // cambia la URL aquí
  return apiFetch(`/usuarios/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ----------------------------------
// LISTAR SEGUIDORES
// ----------------------------------
export async function apiGetSeguidores(perfilId) {
  return apiFetch(`/usuarios/${perfilId}/seguidores`);
}

// ----------------------------------
// LISTAR SEGUIDOS
// ----------------------------------
export async function apiGetSeguidos(perfilId) {
  return apiFetch(`/usuarios/${perfilId}/seguidos`);
}

// ----------------------------------
// SEGUIR USUARIO
// ----------------------------------
export async function apiSeguirUsuario(perfilId) {
  return apiFetch(`/usuarios/${perfilId}/seguir`, {
    method: 'POST',
  });
}

// ----------------------------------
// DEJAR DE SEGUIR USUARIO
// ----------------------------------
export async function apiDejarDeSeguir(perfilId) {
  return apiFetch(`/usuarios/${perfilId}/dejarDeSeguirUsuario`, {
    method: 'DELETE',
  });
}
