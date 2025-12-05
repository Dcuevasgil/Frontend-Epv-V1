import { apiFetch } from './baseApi';

export const obtenerTodosEjercicios = (opts={}) => apiFetch('/ejercicios', opts);
export const mostrarEjercicioPorId = ({ id_ejercicio, ...opts }) =>
  apiFetch(`/ejercicios/${id_ejercicio}`, opts);
export const crearEjercicio = ({ body, ...opts }) =>
  apiFetch('/ejercicios', { method: 'POST', body, ...opts });
export const actualizarEjercicioExistente = ({ id_ejercicio, body, ...opts }) =>
  apiFetch(`/ejercicios/${id_ejercicio}`, { method: 'PUT', body, ...opts });
export const eliminarEjercicio = ({ id_ejercicio, ...opts }) =>
  apiFetch(`/ejercicios/${id_ejercicio}`, { method: 'DELETE', ...opts });
