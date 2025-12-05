// src/utils/normalizadores.js

export const toPerfilUI = (p = {}) => {
  const seguidores =
    p.total_seguidores ??
    p.seguidores ??
    p.followers_count ??
    p.followers ??
    0;

  const seguidos =
    p.total_seguidos ??
    p.seguidos ??
    p.following_count ??
    p.following ??
    0; 

  const publicaciones =
    p.total_publicaciones ??
    p.publicaciones ??
    p.posts_count ??
    p.posts ??
    0;


  return {
    id: p.id ?? p.id_perfil ?? 0,
    nick: p.nick ?? '',
    bio: p.descripcion_personal ?? '',
    avatar: p.url_avatar ?? '',
    cabecera: p.url_cabecera ?? '',
    localidad_id: p.localidad_id ?? null,
    localidad_nombre:
      p?.localidad?.nombre_localidad ??
      p?.localidad_nombre ??
      '',
    // contadores
    seguidores: Number(seguidores) || 0,
    seguidos: Number(seguidos) || 0,
    publicaciones: Number(publicaciones) || 0,
  };
};

export function normalizarPost(p = {}) {
  // ——— ID unificado (acepta varios alias) ———
  const rawId =
    p.id_publicacion ??
    p.id ??
    p.publicacion_id ??
    p.post_id ??
    null;

  const id = Number.isFinite(Number(rawId)) ? Number(rawId) : null;

  // ——— NUEVO: tiempo realizado ———
  const rawTiempo =
    p.tiempo_realizado ??
    p.tiempo ??
    p.wod_tiempo_realizado ??
    null;

  const tiempoSegundos = Number.isFinite(Number(rawTiempo))
    ? Number(rawTiempo)
    : null;

  const baseNormalizado = {
    // ids siempre coherentes
    id,
    id_publicacion: id,

    // autor
    perfil_id: p.perfil_id ?? p.autor_perfil_id ?? null,

    // media (acepta varios nombres: media_url, media, imagen)
    media_url: p.media_url ?? p.media ?? p.imagen ?? null,

    // texto/nota
    texto: p.texto ?? p.nota_usuario ?? p.caption ?? '',

    // fecha (toma la mejor disponible)
    fecha_creacion: p.fecha_creacion ?? p.fecha ?? p.created_at ?? null,

    // likes/comentarios con alias típicos
    total_likes: Number(
      p.total_likes ?? p.likes_count ?? p.likes ?? 0
    ),
    liked_by_me: Boolean(p.liked_by_me ?? p.me_gusta ?? false),
    total_comentarios: Number(
      p.total_comentarios ?? p.comments_count ?? p.comentarios ?? 0
    ),

    // perfil embebido (o columnas flat como perfil_nick/perfil_url_avatar)
    perfil: p.perfil
      ? {
          nick: p.perfil.nick ?? 'Usuario',
          url_avatar: p.perfil.url_avatar ?? null,
        }
      : (p.perfil_nick || p.perfil_url_avatar)
      ? {
          nick: p.perfil_nick ?? 'Usuario',
          url_avatar: p.perfil_url_avatar ?? null,
        }
      : undefined,

    // tiempo
    tiempo_realizado: tiempoSegundos,
    tiempo_realizado_fmt: formatearTiempoSegundos(tiempoSegundos),
  };

  // 👇 Muy importante: preservamos TODO lo que venga del backend (tipo_publicacion, wod, nota_usuario, etc.)
  return {
    ...p,
    ...baseNormalizado,
  };
}

export function normalizarComentario(c) {
  if (!c) return null;

  return {
    id: c.id ?? c.id_comentario ?? null,
    publicacion_id: Number(c.publicacion_id ?? c.post_id ?? null),
    texto: c.texto ?? c.contenido ?? '',
    fecha: c.fecha ?? c.created_at ?? null,
    autor: {
      id_perfil: c.autor?.id_perfil ?? c.perfil?.id_perfil ?? null,
      nick: c.autor?.nick ?? c.perfil?.nick ?? 'Usuario',
      url_avatar: c.autor?.url_avatar ?? c.perfil?.url_avatar ?? null,
    },
  };
}

// La misma idea que tu thumbUrl, con nombre más semántico
export function optimizarImagenesCloudinary(url, size = 600) {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname.includes('res.cloudinary.com')) {
      u.pathname = u.pathname.replace(
        '/upload/',
        `/upload/c_fill,w_${size},h_${size},q_auto,f_auto/`
      );
      return u.toString();
    }
  } catch {}
  return url;
}

/**
 * Normaliza la URL de imagen del ejercicio.
 * - Acepta URLs absolutas (https://...) sin modificarlas.
 * - Convierte rutas relativas (storage/ o public/) a una ruta completa.
 */
export function normalizarURL(rawUrl) {
  if (!rawUrl) return null;

  // Convertimos a string y limpiamos posibles barras invertidas
  const clean = rawUrl.toString().trim().replace(/\\/g, '/');

  // Si ya es una URL absoluta (HTTP o HTTPS), la devolvemos tal cual
  if (/^https?:\/\//i.test(clean)) return clean;

  // Si empieza por /storage o public/, la ajustamos a la ruta de medios del backend
  const relativa = clean.replace(/^\/?storage\//, '').replace(/^\/?public\//, '');

  return `${API_ORIGIN}/media/${relativa}`;
}

// Convierte enlaces de YouTube a formato embebido (watch, youtu.be, shorts)
export const getYouTubeId = (url) => {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2] || null;
    return null;
  } catch { return null; }
};

function formatearTiempoSegundos(totalSegundos) {
  if (totalSegundos == null) return null;
  const mm = Math.floor(totalSegundos / 60);
  const ss = totalSegundos % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}