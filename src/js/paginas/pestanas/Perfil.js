import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import {
  View, Text, Image, SafeAreaView,
  TouchableOpacity, Modal, TextInput, Alert,
  StyleSheet, ImageBackground, StatusBar, Platform,
  FlatList
} from 'react-native';

import { bus } from 'src/shared/utils/eventBus';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiFetch } from 'src/shared/api/baseApi';

import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

// Endpoints específicos para seguidores/seguidos
import {
  apiGetSeguidores,
  apiGetSeguidos,
} from '@api/usuariosApi';

// Host base de la API
const API_HOST = process.env.EXPO_PUBLIC_API_URL;
// ORIGIN del backend sin el /api/vX
const API_ORIGIN = API_HOST.replace(/\/api\/v\d+.*$/, '');

// Normalizadores comunes para adaptar el backend a la UI
import * as Norm from '@util/normalizadores';
const toPerfilUI = Norm.toPerfilUI || Norm.normalizarPerfil;
const { normalizarPost, optimizarImagenesCloudinary } = Norm;

// ========================= Helpers de posts/imagenes =========================

// Obtiene la imagen principal de una publicación (normal o de WOD)
function getImagenPrincipalPost(post) {
  if (!post) return null;

  // 0) Nueva relación medias[] en la publicación
  if (Array.isArray(post.medias) && post.medias.length > 0) {
    const m = post.medias[0];

    let rawImg =
      m?.url ||
      m?.url_media ||
      m?.media_url ||
      m?.path ||
      m?.ruta ||
      '';

    const uri = normalizarRutaImagen(rawImg);
    if (uri) return uri;
  }

  const tipo = post.tipo_publicacion || post.tipo || null;

  // Posibles nombres del objeto WOD dentro de la publicación
  const wod =
    post.wod ||
    post.wod_meta ||
    post.wod_resultado ||
    post.resultado_wod ||
    post.wod_plan ||
    null;

  const esWod =
    !!wod ||
    tipo === 'wod' ||
    tipo === 'resultado_wod' ||
    tipo === 'entrenamiento';

  // 1) Si es WOD → buscamos imagen en sus ejercicios
  if (esWod && wod) {
    let items = [];

    if (Array.isArray(wod.items)) items = wod.items;
    else if (Array.isArray(wod.ejercicios)) items = wod.ejercicios;
    else if (Array.isArray(wod.wod_ejercicios)) {
      // Caso típico Laravel: wod_ejercicios[] con relación ejercicio dentro
      items = wod.wod_ejercicios.map(we => ({
        ...we,
        ...(we.ejercicio || {}),
      }));
    }

    const primeroConImg = items.find(e =>
      e.imagen_url || e.imagen || e.ejercicio?.imagen_url || e.ejercicio?.imagen
    );

    if (primeroConImg) {
      const rawImg =
        primeroConImg.imagen_url ||
        primeroConImg.imagen ||
        primeroConImg.ejercicio?.imagen_url ||
        primeroConImg.ejercicio?.imagen;

      const uri = normalizarRutaImagen(rawImg);
      if (uri) return uri;
    }
  }

  // 2) Publicación normal → media/imagen del propio post
  const raw =
    post.media_url ||
    post.media ||
    post.media_path ||
    post.url_media ||
    post.imagen ||
    post.ejercicio?.imagen_url ||
    null;

  if (raw) {
    const uri = normalizarRutaImagen(raw);
    if (uri) return uri;
  }

  // 3) Sin imagen disponible
  return null;
}

// ========================= Helpers de localidad =========================

// Enriquecer el perfil con el nombre de la localidad usando una caché en AsyncStorage
async function enriquecerLocalidadConCache(perfil) {
  try {
    // Si ya viene el nombre de la localidad, no hacemos nada
    if (perfil.localidad_nombre) return perfil;

    const cache = await AsyncStorage.getItem('LOCALIDADES_CACHE');
    if (!cache) return perfil;

    const lista = JSON.parse(cache);

    // Intentamos obtener el id de la localidad desde distintas estructuras posibles
    const id = perfil.localidad_id ?? perfil?.localidad?.id_localidad ?? perfil?.localidad?.id;
    if (!id) return perfil;

    // Buscamos la localidad correspondiente en la lista cacheada
    const match = (lista || []).find(l => String(l.id_localidad ?? l.id) === String(id));
    if (!match) return perfil;

    // Devolvemos el perfil enriquecido con objeto localidad + string nombre para pintar
    return {
      ...perfil,
      localidad: { id_localidad: Number(match.id_localidad ?? match.id), nombre_localidad: match.nombre_localidad ?? match.nombre },
      localidad_nombre: match.nombre_localidad ?? match.nombre ?? '', // string listo para usar en UI
    };
  } catch {
    // En caso de error, devolvemos el perfil tal cual
    return perfil;
  }
}

// Devuelve SIEMPRE un string seguro para la localidad (vacío si no hay nada)
const getNombreLocalidad = (p = {}) =>
  (p?.localidad?.nombre_localidad) ||
  p?.localidad_nombre ||
  (typeof p?.localidad === 'string' ? p.localidad : '') ||
  '';

// ========================= Helpers de nick/usuario =========================

// Parte del email antes de @ y sin +alias
const userPartFromEmail = (email = '') => email.split('@')[0].split('+')[0].toLowerCase();

// Limpia el nick: quita acentos, caracteres raros y limita longitud
const sanitizeNick = (s = '') =>
  s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .slice(0, 20);

// Nick por defecto generado a partir del email
const nickFromEmail = (email = '') => {
  const base = sanitizeNick(userPartFromEmail(email));
  return base || 'usuario';
};

// Determina un nick seguro a partir del perfil y/o email de params
const getNickSeguro = (perfilArg, emailParams = '') => {
  const p = (perfilArg && typeof perfilArg === 'object') ? perfilArg : {};
  const email = (p.email || emailParams || '').toString().trim();

  // Vamos probando distintas propiedades hasta encontrar una con valor
  const candidato = [
    p.nick,
    p.nick_usuario,
    p.username,
    nickFromEmail(email),
  ].find(v => v && String(v).trim().length);

  return String(candidato || 'Usuario').trim();
};

// Avatar de un usuario desde distintas posibles claves
const getAvatarUsuario = (u = {}) =>
  u.avatar ||
  u.url_avatar ||
  u.perfil?.avatar ||
  u.perfil?.url_avatar ||
  null;

// Nick de un usuario desde distintas posibles claves
const getNickUsuario = (u = {}) =>
  u.nick ||
  u.username ||
  u.perfil?.nick ||
  'Usuario';

// ========================= Helpers seguidores/seguidos =========================

// Normaliza la respuesta para quedarnos con la lista de seguidores
function extraerListaSeguidores(resp) {
  if (!resp) return [];

  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp.data)) return resp.data;
  if (Array.isArray(resp.seguidores)) return resp.seguidores;
  if (resp.data && Array.isArray(resp.data.seguidores)) return resp.data.seguidores;

  return [];
}

// Normaliza la respuesta para quedarnos con la lista de seguidos
function extraerListaSeguidos(resp) {
  if (!resp) return [];

  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp.data)) return resp.data;
  if (Array.isArray(resp.seguidos)) return resp.seguidos;
  if (resp.data && Array.isArray(resp.data.seguidos)) return resp.data.seguidos;

  return [];
}

// ========================= Helpers contadores =========================

// Convierte a entero seguro
const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Nº de seguidores: primero usa el estado, si no hay, cae al perfil
const getFollowersCount = (p = {}, followersState = []) => {
  const len = Array.isArray(followersState) ? followersState.length : 0;
  if (len > 0) return len;
  return toInt(
    p.seguidores ??
    p.followers_count ??
    p.followers ??
    0
  );
};

// Nº de seguidos: igual que arriba pero para following
const getFollowingCount = (p = {}, followingState = []) => {
  const len = Array.isArray(followingState) ? followingState.length : 0;
  if (len > 0) return len;
  return toInt(
    p.seguidos ??
    p.following_count ??
    p.following ??
    0
  );
};

// Nº de publicaciones: estado > perfil
const getPostsCount = (p = {}, postsState = []) => {
  const len = Array.isArray(postsState) ? postsState.length : 0;
  if (len > 0) return len;
  return toInt(
    p.publicaciones ??
    p.posts_count ??
    0
  );
};

// Normaliza una ruta de imagen (relativa del backend o absoluta tipo Cloudinary)
function normalizarRutaImagen(path) {
  if (!path) return null;

  let img = String(path)
    .replace(/\\/g, '/')                 // Normaliza barras invertidas
    .replace(/^\/+/, '/')                // Quita dobles barras al inicio
    .replace(/^\/storage\/public\//, '/storage/');

  if (!img) return null;

  // Si ya es una URL absoluta, la devolvemos tal cual
  if (img.startsWith('http://') || img.startsWith('https://')) {
    return img;
  }

  // Si es relativa (Laravel storage local), la pegamos al origen del backend
  return `${API_ORIGIN}${img}`;
}

// ================== Componente principal: Perfil ==================
export function Perfil({ navigation, route }) {

  // Params de navegación, renombrados/alias para evitar colisiones
  const {
    email: emailFromParams = '',
    nick: nickFromParams = '',
    perfil: perfilInicial = null,
    userId = null,
    onSave = () => {},
    followers: followersParam = [],
    following: followingParam = [],
    posts: postsParam = [],
  } = route?.params || {};

  // Perfil base por si no hay datos completos (placeholder seguro para evitar undefined)
  const PLACEHOLDER = {
    id: (perfilInicial ?? {}).id ?? 0,
    nick: getNickSeguro(perfilInicial ?? {}, emailFromParams),
    bio: (perfilInicial ?? {}).bio ?? (perfilInicial ?? {}).descripcion_personal ?? '',
    avatar: (perfilInicial ?? {}).avatar ?? '',
    cabecera: (perfilInicial ?? {}).cabecera ?? '',
    localidad: '',
    seguidores: (perfilInicial ?? {}).seguidores ?? 0,
    seguidos: (perfilInicial ?? {}).seguidos ?? 0,
    publicaciones: (perfilInicial ?? {}).publicaciones ?? 0,
    email: (perfilInicial ?? {}).email ?? emailFromParams,
  };

  // Estado unificado de la pantalla de perfil
  const [valores, setValores] = useState({
    perfil: perfilInicial || PLACEHOLDER,            // Datos del perfil mostrado
    followers: followersParam,                       // Lista de seguidores
    following: followingParam,                       // Lista de seguidos
    posts: postsParam,                               // Publicaciones del usuario
    modals: { editOpen: false, followersOpen: false, followingOpen: false }, // Estado de los modales
    form: {                                          // Formulario de edición de perfil
      nick: getNickSeguro(perfilInicial ?? {}, emailFromParams),
      descripcion_personal: (perfilInicial ?? {}).bio ?? (perfilInicial ?? {}).descripcion_personal ?? '',
      url_avatar: (perfilInicial ?? {}).avatar ?? '',
      url_cabecera: (perfilInicial ?? {}).cabecera ?? '',
    },
  });

  const [loading, setLoading] = useState(false);      // Estado de carga genérico
  const [imagesReady, setImagesReady] = useState(false); // Control para saber si las imágenes por defecto están cacheadas

  // ================== Cargar perfil_cache + posts_cache al entrar ==================
  useEffect(() => {
    (async () => {
      try {
        // Leemos perfil y posts cacheados en paralelo
        const [cachePerfil, cachePosts] = await Promise.all([
          AsyncStorage.getItem('perfil_cache'),
          AsyncStorage.getItem('perfil_posts_cache'),
        ]);

        let enriquecido = null;
        if (cachePerfil) {
          const parsed = JSON.parse(cachePerfil);
          // Enriquecemos el perfil cacheado con el nombre de localidad (si procede)
          enriquecido = await enriquecerLocalidadConCache(parsed);
        }

        setValores(s => {
          let nuevo = { ...s };

          // Si hay perfil cacheado enriquecido, lo fusionamos con el estado actual
          if (enriquecido) {
            nuevo = {
              ...nuevo,
              perfil: { ...nuevo.perfil, ...enriquecido },
              form: {
                ...nuevo.form,
                nick: enriquecido.nick ?? nuevo.form.nick,
                descripcion_personal:
                  enriquecido.bio ??
                  enriquecido.descripcion_personal ??
                  nuevo.form.descripcion_personal,
                url_avatar: enriquecido.avatar ?? nuevo.form.url_avatar,
                url_cabecera: enriquecido.cabecera ?? nuevo.form.url_cabecera,
              },
            };
          }

          // Si hay posts cacheados correctos, los metemos en el estado
          if (cachePosts) {
            try {
              const postsParsed = JSON.parse(cachePosts);
              if (Array.isArray(postsParsed)) {
                nuevo.posts = postsParsed;
              }
            } catch (e) {
              console.error('[PERFIL] error parseando posts_cache', e);
            }
          }

          return nuevo;
        });
      } catch (e) {
        console.error('[PERFIL] error leyendo perfil/posts cache', e);
      }
    })();
  }, []);

  // Nick visual final que se muestra (fallbacks incluidos)
  const nickFinal =
    valores?.perfil?.nick ||
    valores?.perfil?.nick_usuario ||
    valores?.perfil?.username ||
    'Usuario';

  // Nombre de localidad normalizado/listo para la UI
  const nombreLocalidad = getNombreLocalidad(valores?.perfil);

  // isMine: perfil propio si NO viene userId por params
  const isMine = useMemo(() => !userId, [userId]);

  // Texto de descripción que se pinta debajo del nick
  const descripcionTexto = useMemo(() => {
    const raw =
      valores?.perfil?.bio ??
      valores?.perfil?.descripcion_personal ??
      '';
    const desc = String(raw).trim();

    if (desc.length > 0) return desc;
    if (loading) return '';
    return 'Aún no has escrito tu descripción.';
  }, [valores?.perfil?.bio, valores?.perfil?.descripcion_personal, loading]);

  // Setter corto para el formulario de edición
  const setForm = (patch) =>
    setValores((s) => ({ ...s, form: { ...s.form, ...patch } }));

  // Setter corto para el estado de los modales
  const setModals = (patch) =>
    setValores((s) => ({ ...s, modals: { ...s.modals, ...patch } }));

  // ================== Actualizar perfil si cambian los params de la ruta ==================
  useEffect(() => {
    const entrante = route?.params?.perfil;
    if (!entrante) return;

    (async () => {
      // Adaptamos el perfil como espera la UI
      const normal = toPerfilUI(entrante);
      const enriquecido = await enriquecerLocalidadConCache(normal);

      // Fusionamos nuevo perfil con lo que ya hubiera en estado
      setValores(s => ({
        ...s,
        perfil: { ...s.perfil, ...enriquecido },
        form: {
          ...s.form,
          nick: enriquecido.nick ?? s.form.nick,
          descripcion_personal: enriquecido.bio ?? enriquecido.descripcion_personal ?? s.form.descripcion_personal,
          url_avatar: enriquecido.avatar ?? s.form.url_avatar,
          url_cabecera: enriquecido.cabecera ?? s.form.url_cabecera,
        },
      }));

      setLoading(false);
    })();
  }, [route?.params?.perfil, route?.params?._ts]);

  // ================== Refresco en focus de la pantalla ==================
  useFocusEffect(
    useCallback(() => {
      // Cuando la pantalla gana foco, refrescamos datos en background
      (async () => {
        try {
          await refrescarPerfilYPosts(setValores);
        } catch (e) {
          console.error('[PERFIL] error al refrescar en focus', e);
        }
      })();

      // Si viene un mensaje por params, lo mostramos y limpiamos el param
      const msg = route.params?.mensajePerfil;
      if (msg) {
        Alert.alert('Perfil', msg);
        navigation.setParams({ mensajePerfil: undefined });
      }

      // Si nos piden forceRefresh por params, lo limpiamos tras usarlo
      if (route.params?.forceRefresh) {
        navigation.setParams({ forceRefresh: undefined });
      }
    }, [route.params?.mensajePerfil, route.params?.forceRefresh])
  );

  // ================== Suscripción al bus de eventos (likes de publicaciones) ==================
  useEffect(() => {
    // Cuando cambie el like de un post, actualizamos ese post en el estado local
    const handler = ({ postId, liked, total_likes }) => {
      setValores(s => ({
        ...s,
        posts: (s.posts || []).map(it => {
          const id = String(it.id_publicacion ?? it.id);
          if (id !== String(postId)) return it;
          return { ...it, liked_by_me: liked, likes: total_likes, total_likes };
        }),
      }));
    };

    bus.on('post.like.changed', handler);
    return () => bus.off('post.like.changed', handler);
  }, []);

  // ================== Prefetch de imágenes por defecto (avatar/cabecera locales) ==================
  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const avatarSrc = Image.resolveAssetSource(require('@asset/perfil.png'));
        const headerSrc = Image.resolveAssetSource(require('@asset/fondo.jpg'));

        await Promise.all([
          Image.prefetch(avatarSrc.uri),
          Image.prefetch(headerSrc.uri),
        ]);
      } catch (e) {
        console.error('[PERFIL] error prefetch imágenes por defecto', e);
      } finally {
        if (!cancelado) {
          setImagesReady(true);
        }
      }
    })();

    // Cancelación en cleanup para evitar setState en componente desmontado
    return () => { cancelado = true; };
  }, []);

  // ================== Prefetch de avatar/cabecera REMOTOS cuando cambian ==================
  useEffect(() => {
    const avatarUrl = valores?.perfil?.avatar;
    const headerUrl = valores?.perfil?.cabecera;

    // Si no hay URLs remotas, no hacemos nada
    if (!avatarUrl && !headerUrl) return;

    (async () => {
      try {
        const tareas = [];
        if (avatarUrl) tareas.push(Image.prefetch(avatarUrl));
        if (headerUrl) tareas.push(Image.prefetch(headerUrl));
        await Promise.all(tareas);
      } catch (e) {
        console.error('[PERFIL] error prefetch avatar/cabecera remotos', e);
      }
    })();
  }, [valores?.perfil?.avatar, valores?.perfil?.cabecera]);

  // ================== Selector de imagen (solo previsualiza localmente) ==================
  const pickImage = async (field) => {
    // Permisos a la galería
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos', 'Se necesita acceso a la galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    // Guardo la URI local en el form si el usuario selecciona una imagen
    if (!result.canceled && result.assets?.[0]?.uri) {
      setForm({ [field]: result.assets[0].uri });
    }
  };

  // ================== Guardar cambios de perfil ==================
  const guardarCambios = async () => {
    try {
      const token = await AsyncStorage.getItem('AUTH_TOKEN');
      if (!token) {
        Alert.alert('Error', 'No se encontró el token. Inicia sesión de nuevo.');
        return;
      }

      // Payload que espera el backend
      const payload = {
        nick: valores.form.nick,
        descripcion_personal: valores.form.descripcion_personal,
        url_cabecera: valores.form.url_cabecera,
        url_avatar: valores.form.url_avatar,
        localidad_id: valores.form.localidadId ?? null,
      };

      // UI optimista: actualizamos el perfil en memoria antes de la respuesta
      const perfilOptimista = {
        ...valores.perfil,
        nick: valores.form.nick,
        bio: valores.form.descripcion_personal,
        descripcion_personal: valores.form.descripcion_personal,
        avatar: valores.form.url_avatar,
        cabecera: valores.form.url_cabecera,
      };

      setValores(s => ({
        ...s,
        perfil: perfilOptimista,
      }));

      // Intentamos guardar el perfil optimista también en cache
      try {
        await AsyncStorage.setItem('perfil_cache', JSON.stringify(perfilOptimista));
      } catch (e) {
        console.error('[PERFIL] error guardando perfil optimista en cache', e);
      }

      // Llamada al endpoint de actualización de perfil
      const dataRaw = await apiFetch('/usuarios/actualizar-perfil', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const normal = toPerfilUI(dataRaw);
      const enriquecido = await enriquecerLocalidadConCache(normal);

      // Actualizamos estado y cache con el perfil definitivo
      setValores(s => ({
        ...s,
        perfil: { ...s.perfil, ...enriquecido },
      }));
      await AsyncStorage.setItem('perfil_cache', JSON.stringify(enriquecido));

      Alert.alert('Éxito', 'Perfil actualizado correctamente.');
      setModals({ editOpen: false });
    } catch (e) {
      console.error('[ERROR PUT PERFIL Ajustes/Perfil]', e);
      Alert.alert('Error', `Hubo un problema al actualizar el perfil${e.status ? ` (${e.status})` : ''}.`);
    }
  };

  // ================== Abrir/cerrar modal de Seguidores ==================
  const abrirFollowers = async () => {
    try {
      // Obtenemos id del perfil actual
      const perfilId =
        valores?.perfil?.id ??
        valores?.perfil?.id_perfil ??
        0;

      if (!perfilId) {
        return Alert.alert('Error', 'No se ha podido identificar el perfil.');
      }

      // Pedimos lista de seguidores al backend
      const resp = await apiGetSeguidores(perfilId);

      const lista = extraerListaSeguidores(resp);

      // Guardamos lista en estado y abrimos modal
      setValores(s => ({
        ...s,
        followers: lista,
        modals: { ...s.modals, followersOpen: true },
      }));
    } catch (e) {
      console.error('[PERFIL] error cargando seguidores', e);
      Alert.alert('Error', 'No se han podido cargar los seguidores.');
    }
  };

  const cerrarFollowers = () => setModals({ followersOpen: false });

  // ================== Abrir/cerrar modal de Seguidos ==================
  const abrirFollowing = async () => {
    try {
      const perfilId =
        valores?.perfil?.id ??
        valores?.perfil?.id_perfil ??
        0;

      if (!perfilId) {
        return Alert.alert('Error', 'No se ha podido identificar el perfil.');
      }

      const resp = await apiGetSeguidos(perfilId);

      const lista = extraerListaSeguidos(resp);

      setValores(s => ({
        ...s,
        following: lista,
        modals: { ...s.modals, followingOpen: true },
      }));
    } catch (e) {
      console.error('[PERFIL] error cargando seguidos', e);
      Alert.alert('Error', 'No se han podido cargar los seguidos.');
    }
  };
  
  const cerrarFollowing = () => setModals({ followingOpen: false });

  // ================== Publicaciones del usuario ==================
  async function fetchMisPublicaciones(perfilId, { limit = 20, offset = 0 } = {}) {
    // Montamos querystring de paginación
    const qs = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    }).toString();

    // Llamamos al endpoint de publicaciones del usuario
    const resp = await apiFetch(`/social/publicaciones/usuario/${perfilId}?${qs}`);

    const lista =
      Array.isArray(resp?.data)
        ? resp.data
        : Array.isArray(resp)
        ? resp
        : [];

    // Devolvemos lista tal cual, sin hidratar WOD aquí
    return lista;
  }

  // ================== Refrescar perfil + posts + followers/following ==================
  async function refrescarPerfilYPosts(setValores) {
    // 1) Token
    const token = await AsyncStorage.getItem('AUTH_TOKEN');
    if (!token) {
      console.error('[PERFIL] sin token, no refresco /usuarios/me');
      throw new Error('No autenticado');
    }

    const urlMe = `${API_HOST}/usuarios/me`;

    const meResp = await fetch(urlMe, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    const meTxt = await meResp.text();

    if (!meResp.ok) {
      console.log('[PERFIL] /usuarios/me ->', meResp.status, meTxt);
      throw new Error(`Error /usuarios/me (${meResp.status})`);
    }

    let meJson;
    try {
      meJson = JSON.parse(meTxt);
    } catch (e) {
      console.log('[PERFIL] respuesta no JSON en /usuarios/me:', meTxt);
      throw new Error('Respuesta no JSON en /usuarios/me');
    }

    // El DTO de tu backend ya devuelve el perfil plano
    const meNorm = toPerfilUI(meJson);
    const me = { ...meNorm, nick: getNickSeguro(meNorm, meNorm.email) };

    // 3) Cachear perfil
    await AsyncStorage.setItem('perfil_cache', JSON.stringify(me));

    // 4) Sacar id de perfil
    const perfilId = Number(
      me.id ??
      me.id_perfil ??
      me.perfil_id ??
      me?.perfil?.id_perfil ??
      0
    );

    let posts = [];
    let followers = [];
    let following = [];

    if (perfilId) {
      const [postsResp, seguidoresResp, seguidosResp] = await Promise.all([
        fetchMisPublicaciones(perfilId, { limit: 20, offset: 0 }),
        apiGetSeguidores(perfilId),
        apiGetSeguidos(perfilId),
      ]);

      posts = Array.isArray(postsResp) ? postsResp : (postsResp?.data ?? []);
      followers = extraerListaSeguidores(seguidoresResp);
      following = extraerListaSeguidos(seguidosResp);
    }

    try {
      await AsyncStorage.setItem('perfil_posts_cache', JSON.stringify(posts));
    } catch (e) {
      console.error('[PERFIL] error guardando posts en cache', e);
    }

    // 5) Actualizar estado
    setValores(s => ({
      ...s,
      perfil: { ...s.perfil, ...me, publicaciones: posts.length },
      posts,
      followers,
      following,
    }));
  }

  // Nick seguro calculado desde estado + params (usado en UI)
  const nickSeguro =
    valores?.perfil?.nick ||
    getNickSeguro(valores?.perfil ?? {}, emailFromParams);

  // Desestructuramos cosas útiles de valores para no repetir s.perfil, s.followers, etc.
  const {
    perfil, 
    followers: followersState = [],
    following: followingState = [],
    posts: postsState = [],
    modals,
    form
  } = valores;

  // Cálculo de contadores usando helpers (estado > perfil)
  const seguidoresCount = getFollowersCount(perfil, followersState);
  const seguidosCount = getFollowingCount(perfil, followingState);
  const postsCount = getPostsCount(perfil, postsState);

  // ================== Header del perfil que se pinta arriba de la FlatList ==================
  const HeaderPerfil = (
    <>
      {/* Fondo de cabecera (imagen de portada) */}
      <ImageBackground
        source={
          perfil.cabecera
            ? { uri: perfil.cabecera }
            : require('../../../assets/fondo.jpg') 
        }
        style={styles.header}
        imageStyle={{ opacity: 0.9 }}
      >
        {/* Botón de volver atrás */}
        <TouchableOpacity style={styles.back} onPress={() => navigation?.goBack?.()}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
      </ImageBackground>

      {/* Avatar centrado solapando cabecera */}
      <View style={styles.avatarWrapper}>
        {/* Avatar */}
        <Image
          source={
            perfil.avatar
              ? { uri: perfil.avatar }
              : require('@asset/perfil.png')
          }
          style={styles.avatar}
        />
      </View>

      {/* Info textual del perfil */}
      <View style={styles.info}>
        {/* Nick */}
        <Text style={styles.nick}>{nickSeguro}</Text>

        {/* Descripción / sobre mí debajo del nick */}
        <View style={styles.bioContainer}>
          <Text
            style={[
              styles.bio,
              (!valores?.perfil?.bio &&
                !valores?.perfil?.descripcion_personal &&
                !loading) && { color: '#888', fontStyle: 'italic' },
            ]}
          >
            {descripcionTexto}
          </Text>
        </View>

        {/* Localidad si hay */}
        {Boolean(nombreLocalidad) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.location}>{nombreLocalidad}</Text>
          </View>
        )}

        {/* Stats: Seguidores / Seguidos / Posts */}
        <View style={styles.statsRow}>
          <TouchableOpacity onPress={abrirFollowers} style={styles.statBox}>
            <Text style={styles.statNum}>{seguidoresCount}</Text>
            <Text style={styles.statLbl}>Seguidores</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={abrirFollowing} style={styles.statBox}>
            <Text style={styles.statNum}>{seguidosCount}</Text>
            <Text style={styles.statLbl}>Seguidos</Text>
          </TouchableOpacity>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{postsCount}</Text>
            <Text style={styles.statLbl}>Posts</Text>
          </View>
        </View>

        {/* Divisor visual debajo de la cabecera de perfil */}
        <View style={styles.linea} />
      </View>
    </>
  );

  // Handlers auxiliares (por ahora no usados pero los dejas preparados)
  const onRefresh = () => {};
  const onEndReached = () => {};

  // Al pulsar una publicación, navegamos a DetallePublicacion
  const onPressPost = (item) => {
    const postId =
      item?.id_publicacion ??
      item?.id ??
      item?.publicacion_id ??
      item?.post_id;

    // Intentamos pre-cachear la imagen principal de la publicación
    const img = getImagenPrincipalPost(item);
    if (img) Image.prefetch(img);

    navigation.navigate('DetallePublicacion', {
      postId: item.id_publicacion,
      initialPost: item,
      initialComments: null
    });
  };

  // ================== Render principal del componente ==================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'light-content' : 'light-content'} />

      <FlatList
        data={valores.posts}
        keyExtractor={(item, idx) =>
          `perfil-post-${item?.id_publicacion ?? item?.id ?? 'sinid'}-${idx}`
        }
        ListHeaderComponent={HeaderPerfil}

        // Rejilla 2 columnas para las publicaciones
        numColumns={2}
        columnWrapperStyle={{ gap: 2 }}

        // Estilos / UX
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}

        // Optimizaciones de rendimiento para listas largas
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={true}

        // Render de cada celda de publicación
renderItem={({ item }) => {
  const tipo = item.tipo_publicacion || item.tipo || null;

  // === 1) Detectar si esta publicación es de entrenamiento / WOD ===
  const wod =
    item.wod ||
    item.wod_meta ||
    item.wod_resultado ||
    item.resultado_wod ||
    item.wod_plan ||
    null;

  const isWod =
    !!wod ||
    tipo === 'wod' ||
    tipo === 'resultado_wod' ||
    tipo === 'entrenamiento';

  // === 2) Si es entrenamiento → tarjeta tipo "Entrenamiento libre" ===
  if (isWod && wod) {
    let ejercicios = [];

    if (Array.isArray(wod.items)) ejercicios = wod.items;
    else if (Array.isArray(wod.ejercicios)) ejercicios = wod.ejercicios;
    else if (Array.isArray(wod.wod_ejercicios)) {
      ejercicios = wod.wod_ejercicios.map(we => ({
        ...we,
        ...(we.ejercicio || {}),
      }));
    }

    // Comentario del usuario (nota_usuario / texto)
    const nota =
      (item.nota_usuario || item.texto || '').toString().trim();

    // Título según tipo
    const titulo =
      wod.tipo_wod === 'libre'
        ? 'Entrenamiento libre'
        : wod.tipo_wod === 'tiempo'
        ? 'Entrenamiento por tiempo'
        : 'Entrenamiento';

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={stylesGrid.wodCell}
        onPress={() => onPressPost(item)}
      >
        <View style={stylesGrid.wodInner}>
          <Text style={stylesGrid.wodTitle}>{titulo}</Text>

          {/* Ejercicios (máx. 3) */}
          {ejercicios.slice(0, 3).map((ej, idx) => {
            const rawImg =
              ej.imagen_url ||
              ej.imagen ||
              ej.ejercicio?.imagen_url ||
              ej.ejercicio?.imagen;

            const uri = normalizarRutaImagen(rawImg);

            return (
              <View
                key={`${ej.ejercicio_id ?? ej.id ?? 'ej'}-${idx}`}
                style={stylesGrid.wodRow}
              >
                {uri ? (
                  <Image
                    source={{ uri }}
                    style={stylesGrid.wodImg}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={stylesGrid.wodImgPlaceholder} />
                )}

                <View style={stylesGrid.wodTxts}>
                  <Text numberOfLines={1} style={stylesGrid.wodNombre}>
                    {(ej.nombre || ej.ejercicio?.nombre || 'Ejercicio').toUpperCase()}
                  </Text>

                  <Text style={stylesGrid.wodSub}>
                    {ej.repeticiones
                      ? `Reps: ${ej.repeticiones}`
                      : ej.tiempo_segundos
                      ? `${ej.tiempo_segundos}s`
                      : ''}
                  </Text>
                </View>
              </View>
            );
          })}

          {ejercicios.length > 3 && (
            <Text style={stylesGrid.wodMas}>
              +{ejercicios.length - 3} ejercicios
            </Text>
          )}

          {/* Nota del usuario debajo, como en la segunda imagen */}
          {nota.length > 0 && (
            <Text numberOfLines={2} style={stylesGrid.wodNota}>
              {nota}
            </Text>
          )}
        </View>

        {/* Badge de likes */}
        <View style={stylesGrid.badge}>
          <Ionicons
            name={item?.liked_by_me ? 'heart' : 'heart-outline'}
            size={12}
            color="#fff"
          />
          <Text style={stylesGrid.badgeTxt}>
            {item.likes ?? item.total_likes ?? 0}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // === 3) Resto de publicaciones → imagen o tarjeta de texto (como antes) ===
  const img = getImagenPrincipalPost(item);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={stylesGrid.cell}
      onPress={() => onPressPost(item)}
    >
      {img ? (
        <Image source={{ uri: img }} style={stylesGrid.img} resizeMode="cover" />
      ) : (
        <View style={stylesGrid.noImg}>
          <Text style={stylesGrid.noImgTxt}>
            {item.nota_usuario?.slice(0, 60) ||
              item.texto?.slice(0, 60) ||
              'Sin imagen'}
          </Text>
        </View>
      )}

      <View style={stylesGrid.badge}>
        <Ionicons
          name={item?.liked_by_me ? 'heart' : 'heart-outline'}
          size={12}
          color="#fff"
        />
        <Text style={stylesGrid.badgeTxt}>
          {item.likes ?? item.total_likes ?? 0}
        </Text>
      </View>
    </TouchableOpacity>
  );
}}


        // Cuando no hay publicaciones del usuario
        ListEmptyComponent={
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: '#666' }}>Aún no hay publicaciones.</Text>
          </View>
        }

        // Pull to refresh → dispara refrescarPerfilYPosts
        refreshing={valores.refreshing ?? false}
        onRefresh={async () => {
          setValores(s => ({ ...s, refreshing: true }));
          try { await refrescarPerfilYPosts(setValores); }
          finally { setValores(s => ({ ...s, refreshing: false })); }
        }}

        // Umbral para onEndReached (paginación futura)
        onEndReachedThreshold={0.4}
      />

      {/* ===== Modales ===== */}

      {/* Modal de edición de perfil */}
      <Modal
        visible={modals.editOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModals({ editOpen: false })}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar perfil</Text>

            {/* Campo Nick */}
            <Text style={styles.label}>Nick</Text>
            <TextInput
              style={styles.input}
              value={form.nick}
              onChangeText={(t) => setForm({ nick: t })}
              autoCapitalize="none"
              maxLength={32}
            />

            {/* Campo Bio */}
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, { height: 100 }]}
              value={form.descripcion_personal}
              onChangeText={(t) => setForm({ descripcion_personal: t })}
              multiline
              maxLength={1000}
            />

            {/* Campo URL Avatar + botón para abrir galería */}
            <Text style={styles.label}>URL Avatar</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={form.url_avatar}
                onChangeText={(t) => setForm({ url_avatar: t })}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => pickImage('url_avatar')} style={styles.iconBtn}>
                <Ionicons name="image-outline" size={20} />
              </TouchableOpacity>
            </View>

            {/* Campo URL Cabecera + botón para abrir galería */}
            <Text style={styles.label}>URL Cabecera</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={form.url_cabecera}
                onChangeText={(t) => setForm({ url_cabecera: t })}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => pickImage('url_cabecera')} style={styles.iconBtn}>
                <Ionicons name="image-outline" size={20} />
              </TouchableOpacity>
            </View>

            {/* Acciones del modal: cancelar / guardar */}
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => setModals({ editOpen: false })}
                style={[styles.btn, styles.btnGhost]}
              >
                <Text style={[styles.btnText, { color: '#333' }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={guardarCambios} style={styles.btn}>
                <Text style={styles.btnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Seguidores */}
      <Modal
        visible={modals.followersOpen}
        animationType="slide"
        transparent
        onRequestClose={cerrarFollowers}
      >
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { maxHeight: '70%' }]}>
            <Text style={styles.modalTitle}>Seguidores</Text>
            <SafeAreaView>
              {/* Caso sin seguidores */}
              {followersState.length === 0 && (
                <Text style={{ color: '#666' }}>Sin seguidores.</Text>
              )}
              {/* Listado de seguidores */}
              {followersState.map((u, idx) => (
                <View
                  key={`follower-${u.id ?? u.id_perfil ?? idx}`}
                  style={styles.userRow}
                >
                  <Image
                    source={
                      getAvatarUsuario(u)
                        ? { uri: getAvatarUsuario(u) }
                        : require('@asset/perfil.png')
                    }
                    style={styles.userAvatar}
                  />
                  <Text style={styles.userNick}>{getNickUsuario(u)}</Text>
                </View>
              ))}
            </SafeAreaView>
            <TouchableOpacity style={[styles.btn, { marginTop: 10 }]} onPress={cerrarFollowers}>
              <Text style={styles.btnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Seguidos */}
      <Modal
        visible={modals.followingOpen}
        animationType="slide"
        transparent
        onRequestClose={cerrarFollowing}
      >
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { maxHeight: '70%' }]}>
            <Text style={styles.modalTitle}>Seguidos</Text>
            <SafeAreaView>
              {/* Caso sin seguidos */}
              {followingState.length === 0 && (
                <Text style={{ color: '#666' }}>No sigues a nadie aún.</Text>
              )}
              {/* Listado de seguidos */}
              {followingState.map((u, idx) => (
                <View
                  key={`following-${u.id ?? u.id_perfil ?? idx}`}
                  style={styles.userRow}
                >
                  <Image
                    source={
                      getAvatarUsuario(u)
                        ? { uri: getAvatarUsuario(u) }
                        : require('@asset/perfil.png')
                    }
                    style={styles.userAvatar}
                  />
                  <Text style={styles.userNick}>{getNickUsuario(u)}</Text>
                </View>
              ))}
            </SafeAreaView>
            <TouchableOpacity style={[styles.btn, { marginTop: 10 }]} onPress={cerrarFollowing}>
              <Text style={styles.btnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ================== Estilos ==================
const AVATAR = 110;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },

  header: { height: 160, backgroundColor: '#111', justifyContent: 'flex-start' },
  back: {
    marginTop: 10,
    marginLeft: 10,
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 20,
  },

  avatarWrapper: { alignItems: 'center', marginTop: -AVATAR / 2 },
  avatar: {
    width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2,
    borderWidth: 3, borderColor: '#fff', backgroundColor: '#eaeaea'
  },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#20B2AA', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, marginTop: 10
  },
  editBtnText: { color: '#fff', fontWeight: '600' },

  info: { paddingHorizontal: 20, marginTop: 12 },
  nick: { fontSize: 20, fontWeight: '700', color: '#222', textAlign: 'center' },
  location: { color: '#666', marginTop: 2 },

  bioContainer: { marginTop: 8, marginBottom: 8 },
  section: { fontWeight: '700', color: '#333', marginBottom: 4, fontSize: 14, textAlign: 'center' },
  bio: { color: '#333', lineHeight: 20, fontSize: 13, textAlign: 'center', },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14 },
  statBox: { alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '700', color: '#222' },
  statLbl: { fontSize: 12, color: '#666' },

  linea: {
    height: 6,
    backgroundColor: '#222',
    borderRadius: 3,
    marginTop: 20,
  },

  modalBg: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    paddingHorizontal: 18 
  },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  label: { marginTop: 8, color: '#555', fontSize: 12 },
  input: { backgroundColor: '#f1f1f1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 4, color: '#222' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 10, backgroundColor: '#eee', borderRadius: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  btn: { backgroundColor: '#20B2AA', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  btnGhost: { backgroundColor: '#eaeaea' },
  btnText: { color: '#fff', fontWeight: '700' },

  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  userAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eaeaea' },
  userNick: { color: '#222', fontWeight: '600' },
});

// ======================
// 🎨 Estilos de la rejilla de publicaciones
// ======================
const stylesGrid = StyleSheet.create({
  cell: {
    flex: 1,
    aspectRatio: 1,
    margin: 1,
    backgroundColor: '#000',
    borderRadius: 4,
    overflow: 'hidden',
  },
  img: {
    width: '100%',
    height: '100%',
  },
  noImg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e1e1e',
  },
  noImgTxt: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 6,
  },

  // 🔹 Tarjeta de entrenamiento
  wodCell: {
    flex: 1,
    margin: 1,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  wodInner: {
    flex: 1,
  },
  wodTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111',
    marginBottom: 6,
  },
  wodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  wodImg: {
    width: 42,
    height: 42,
    borderRadius: 6,
    backgroundColor: '#ddd',
    marginRight: 6,
  },
  wodImgPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 6,
    backgroundColor: '#ddd',
    marginRight: 6,
  },
  wodTxts: {
    flex: 1,
  },
  wodNombre: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111',
  },
  wodSub: {
    fontSize: 10,
    color: '#555',
    marginTop: 2,
  },
  wodMas: {
    marginTop: 2,
    fontSize: 10,
    color: '#777',
  },
  wodNota: {
    marginTop: 6,
    fontSize: 11,
    color: '#444',
  },

  badge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
  },
  badgeTxt: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});