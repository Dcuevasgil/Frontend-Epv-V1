import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  SafeAreaView,
  StatusBar,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Pressable,
  TextInput,
  Alert,
  Keyboard,
  Dimensions
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DropDownPicker from 'react-native-dropdown-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import BotonAccion from '@comp/botones/BotonAccion';
import DetalleDia from '@comp/detalle_calendario/DetalleDia';
import { bus } from '@util/eventBus';
import { crearWodLibre, crearWodRondasTiempo } from '@api/wodService';
import { formatearFechaCompleta } from '@util/fechaUtils';

// Host base de la API (ej: http://ip:8000/api/v1)
const API_HOST = process.env.EXPO_PUBLIC_API_URL;
// Origen sin la parte /api/vX para poder montar URLs de ficheros
const API_ORIGIN = API_HOST.replace(/\/api\/v\d+.*$/, '');

// ========================= Helpers HTTP / formato =========================

// GET autenticado con Bearer, con timeout y parseo de JSON
async function fetchJsonAuthed(url, extraHeaders = {}) {
  const token = await AsyncStorage.getItem('AUTH_TOKEN');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);

  try {
    const r = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...extraHeaders,
      },
      signal: ctrl.signal,
    });
    const txt = await r.text();
    const json = txt ? JSON.parse(txt) : {};
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${txt?.slice(0, 200)}`);
    return json;
  } finally {
    clearTimeout(t);
  }
}

// Obtiene el token JWT de AsyncStorage o lanza error si no existe
async function getToken() {
  const t = await AsyncStorage.getItem('AUTH_TOKEN');
  if (!t) {
    throw new Error('No hay token en AsynStorage (AUTH_TOKEN). Inicia sesión');
  }
  return t;
}

// Convierte segundos a formato mm:ss (para mostrar tiempos de WOD)
function formatearSegundos(segundos = 0) {
  const mm = Math.floor(segundos / 60);
  const ss = segundos % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

// Renderiza el contenido de una publicación según sea WOD o publicación normal
function renderContenidoPublicacion(post) {
  const tipo = post.tipo_publicacion || post.tipo || null;
  const wod = post.wod || post.wod_meta || null;

  // ----- Caso: publicación de tipo WOD -----
  if (tipo === 'wod' && wod) {
    const tipoWod = wod.tipo_wod;

    const titulo =
      tipoWod === 'libre'
        ? 'Entrenamiento libre'
        : tipoWod === 'tiempo'
          ? 'Rondas por tiempo'
          : 'WOD';

    const items = Array.isArray(wod.items)
      ? wod.items
      : Array.isArray(wod.ejercicios)
        ? wod.ejercicios
        : [];

    return (
      <View style={styles.wodBox}>
        <Text style={styles.wodTitulo}>{titulo}</Text>

        {wod.rondas_global != null && (
          <Text style={styles.wodMeta}>Rondas: {wod.rondas_global}</Text>
        )}

        {items.map((e, idx) => {
          const key = e.ejercicio_id ?? e.id ?? idx;
          const nombre = (e.nombre || '').toUpperCase();
          const reps = e.repeticiones ?? e.reps ?? e.reps_totales ?? null;
          const tiempo_realizado = e.tiempo_seg ?? null;

          let img = e.imagen_url || e.imagen;
          if (img) {
            img = img
              .replace(/\\/g, '/')
              .replace(/^\/+/, '/')
              .replace(/^\/storage\/public\//, '/storage/');
          }
          const imgUri = img
            ? (img.startsWith('http') ? img : `${API_ORIGIN}${img}`)
            : null;

          return (
            <View
              key={`wod-${post.id_publicacion ?? post.id ?? 'noid'}-${key}-${idx}`}
              style={styles.wodEjRow}
            >
              {imgUri && (
                <Image source={{ uri: imgUri }} style={styles.wodEjImg} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.wodEjNombre}>
                  {nombre || `Ejercicio ${key}`}
                </Text>
                {reps != null && (
                  <Text style={styles.wodEjReps}>Reps: {reps}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                {tiempo_realizado != null && (
                  <Text style={styles.wodEjReps}>Tiempo: {tiempo_realizado}</Text>
                )}
              </View>
            </View>
          );
        })}

        {(post.tiempo_realizado_segundos != null || post.tiempo_realizado != null) && (
          <Text style={styles.wodTiempo}>
            Tiempo realizado{' '}
            {formatearSegundos(
              Number(
                post.tiempo_realizado_segundos ??
                post.tiempo_realizado ??
                0
              )
            )}
          </Text>
        )}

        {!!post.nota_usuario && (
          <Text style={styles.wodComentario}>{post.nota_usuario}</Text>
        )}
      </View>
    );
  }

  // ----- Caso: publicación normal (texto + imagen opcional) -----

  let mediaUri = null;

  if (Array.isArray(post.medias) && post.medias.length > 0) {
    const m = post.medias[0];
    let u =
      m?.url ||
      m?.url_media ||
      m?.media_url ||
      m?.path ||
      '';

    if (typeof u === 'string') {
      u = u
        .replace(/\\/g, '/')
        .replace(/^\/+/, '/')
        .replace(/^\/storage\/public\//, '/storage/');
    }

    if (u) {
      mediaUri = u.startsWith('http') ? u : `${API_ORIGIN}${u}`;
    }
  }

  // 2) Si no hay medias[], usar los campos antiguos
  if (!mediaUri) {
    let p =
      post?.media_url ??
      post?.media ??
      post?.media_path ??
      post?.url_media ??
      '';

    if (typeof p === 'string') {
      p = p
        .replace(/\\/g, '/')
        .replace(/^\/+/, '/')
        .replace(/^\/storage\/public\//, '/storage/');
    } else {
      p = '';
    }

    if (p) {
      mediaUri = p.startsWith('http') ? p : `${API_ORIGIN}${p}`;
    }
  }

  return (
    <>
      {!!post?.nota_usuario && (
        <Text style={styles.textoPublicacion}>{post.nota_usuario}</Text>
      )}

      {mediaUri && (
        <Image
          source={{ uri: mediaUri }}
          style={styles.imagenPublicacion}
        />
      )}
    </>
  );
}

export function Principal({ navigation }) {

  // Genera array de meses con etiqueta y número (0-11)
  const generarMeses = () => {
    const nombresMeses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return nombresMeses.map((nombre, indice) => ({ label: nombre, numeroMes: indice }));
  };

  // Devuelve array [1..N] con los días de un mes/año concretos
  const obtenerDiasDelMes = (mes, año) => {
    const totalDias = new Date(año, mes + 1, 0).getDate();
    return Array.from({ length: totalDias }, (_, i) => i + 1);
  };

  // ========================= Estado principal de la pantalla =========================

  const [valores, setValores] = useState({
    // Estado de menús / modales
    open: false,
    valorSeleccionado: null,
    mesModalVisible: false,
    añoActual: new Date().getFullYear(),
    mesSeleccionado: new Date().getMonth(),
    diasMes: [],
    meses: generarMeses(),
    diaSeleccionado: null,
    modalDetalleVisible: false,
    entrenosPorDia: {},
    entrenosDelDia: {},

    // Items del desplegable de modos de entrenamiento
    items: [
      {
        label: 'Entrenamiento libre',
        value: 'entrenamiento_libre',
      },
      {
        label: 'Entrenamiento de rondas por tiempo',
        value: 'entrenamiento_de_rondas_por_tiempo',
      },
    ],

    // Feed
    publicaciones: [],
    loading: false,
    creandoWod: false,

    // Datos de mi propio perfil
    miPerfilId: null,
    miUsuarioId: null,
    miNick: '',
  });

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PER_PAGE = 20;

  const [comentarios, setComentarios] = useState({
    open: false,
    loading: false,
    error: null,
    list: [],
    text: '',
    pubId: null,
    sending: false,
  });

  const listaRef = useRef(null);
  const insets = useSafeAreaInsets();

  const INPUT_BAR_H = 56;
  const [kbHeight, setKbHeight] = useState(0);

  // Escucha aparición / ocultación del teclado
  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const s1 = Keyboard.addListener(show, (e) => {
      const h = e?.endCoordinates?.height ?? 0;
      setKbHeight(h);
    });
    const s2 = Keyboard.addListener(hide, () => setKbHeight(0));

    return () => { s1.remove(); s2.remove(); };
  }, []);

  const abrirModal = () =>
    setValores(prev => ({ ...prev, mesModalVisible: true }));

  const cerrarModal = () =>
    setValores(prev => ({ ...prev, mesModalVisible: false }));

  // Inicializar días del mes actual
  useEffect(() => {
    const nuevosDias = obtenerDiasDelMes(valores.mesSeleccionado, valores.añoActual);
    setValores(prev => ({ ...prev, diasMes: nuevosDias }));
  }, []);

  // ========================= Creación de WOD =========================

  const onSeleccionarModo = async (modoSeleccionado) => {
    if (!modoSeleccionado || modoSeleccionado === 'favoritos') return;

    try {
      setValores(prev => ({ ...prev, creandoWod: true }));

      const wod =
        modoSeleccionado === 'entrenamiento_de_rondas_por_tiempo'
          ? await crearWodRondasTiempo({ nombre: 'Rondas por tiempo' })
          : await crearWodLibre({ nombre: 'Entrenamiento libre' });

      const wodId = wod?.id ?? wod?.id_wod ?? wod?.wod_id ?? null;
      if (!wodId) throw new Error('El servidor no devolvió id del WOD.');

      setValores(prev => ({
        ...prev,
        open: false,
        valorSeleccionado: modoSeleccionado,
        creandoWod: false,
      }));

      navigation.navigate('Inicio_WodCrearPlan', {
        wodId,
        modo:
          modoSeleccionado === 'entrenamiento_de_rondas_por_tiempo'
            ? 'rondas_tiempo'
            : 'libre',
      });
    } catch (e) {
      alert(e.message || 'No se pudo crear el WOD.');
      setValores(prev => ({ ...prev, creandoWod: false }));
    }
  };

  const onSelectTipoEntrenamiento = (item) => {
    if (!item?.value) return;
    setValores(prev => ({ ...prev, valorSeleccionado: item.value }));
    onSeleccionarModo(item.value);
  };

  // ========================= Identidad del usuario logueado =========================

  const cargarIdentidad = useCallback(async () => {
    try {
      const me = await fetchJsonAuthed(`${API_ORIGIN}/api/v1/usuarios/me`);

      const miPerfilId =
        me?.id_perfil ??
        me?.perfil_id ??
        me?.perfil?.id_perfil ??
        null;

      const miUsuarioId =
        me?.usuario_id ??
        me?.id_usuario ??
        me?.user_id ??
        me?.id ??
        null;

      const miNick =
        me?.nick ??
        me?.nick_usuario ??
        me?.username ??
        '';

      setValores(prev => ({
        ...prev,
        miPerfilId,
        miUsuarioId,
        miNick,
      }));
    } catch (e) {
      const msg = String(e?.name || e);
      if (msg.includes('AbortError') || msg.includes('aborted') || msg.includes('Aborted')) {
        console.warn('[cargarIdentidad] timeout al cargar identidad (AbortError), lo ignoro');
        return;
      }

      console.error('[cargarIdentidad] error REAL', e);
    }
  }, []);

  // ========================= Fetch feed =========================

  const fetchFeed = useCallback(async (pagina = 1, reset = false) => {
    try {
      if (reset || pagina === 1) {
        setValores(s => ({ ...s, loading: true }));
        setHasMore(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      const token = await AsyncStorage.getItem('AUTH_TOKEN');

      const url = `${API_ORIGIN}/api/v1/social/publicaciones/feed?per_page=${PER_PAGE}&page=${pagina}`;
      const r = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const txt = await r.text();

      if (!r.ok) {
        throw new Error(`HTTP ${r.status}: ${txt.slice(0, 200)}`);
      }

      let json = {};
      try {
        json = txt ? JSON.parse(txt) : {};
      } catch (e) {
        console.error('[FEED] no es JSON:', txt.slice(0, 400));
        throw e;
      }

      const listPage = Array.isArray(json?.data)
        ? json.data
        : (Array.isArray(json) ? json : []);

      const meta = json?.meta;

      if (meta?.page && meta?.per_page && meta?.count) {
        const current = Number(meta.page);
        const perPage = Number(meta.per_page);
        const total = Number(meta.count);

        const lastPage = Math.ceil(total / perPage);

        setHasMore(current < lastPage);
      } else {
        setHasMore(listPage.length >= PER_PAGE);
      }

      setValores(prev => {
        const publicacionesPrevias =
          reset || pagina === 1
            ? []
            : (prev.publicaciones || []);

        const nuevasPublicaciones = [
          ...publicacionesPrevias,
          ...listPage,
        ];

        const entrenosPorDia =
          reset || pagina === 1
            ? {}
            : { ...(prev.entrenosPorDia || {}) };

        for (const p of listPage) {
          const tipo = p.tipo_publicacion || p.tipo;
          const wod = p.wod || p.wod_meta;
          const isWodPost = !!wod || tipo === 'wod';
          if (!isWodPost) continue;

          const fechaRaw = p.fecha_creacion || p.created_at;
          if (!fechaRaw) continue;

          const d = new Date(fechaRaw);
          if (Number.isNaN(d.getTime())) continue;

          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const key = `${yyyy}-${mm}-${dd}`;

          if (!entrenosPorDia[key]) entrenosPorDia[key] = [];
          entrenosPorDia[key].push(p);
        }

        return {
          ...prev,
          publicaciones: nuevasPublicaciones,
          entrenosPorDia,
          loading: false,
        };
      });

      setPage(pagina);
      setLoadingMore(false);
    } catch (e) {
      setValores(s => ({ ...s, loading: false }));
      setLoadingMore(false);
      console.error('[feed] error', e);
    }
  }, []);

  const irADetallePublicacion = (pub) => {
    if (!pub) return;

    const id = pub.id_publicacion ?? pub.id;
    if (!id) return;

    navigation.navigate('DetallePublicacion', {
      postId: id,
      initialPost: pub,
      initialComments: null,
    });
  };

  useFocusEffect(
    useCallback(() => {
      fetchFeed(1, true);
      cargarIdentidad();
    }, [fetchFeed, cargarIdentidad])
  );

  useEffect(() => {
    const off = bus?.on?.('feed.refresh', () => fetchFeed(1, true));
    return () => off && off();
  }, [fetchFeed]);

  const _patchPublicacion = (list, id, patch) =>
    list.map(p =>
      (p.id_publicacion || p.id) === id
        ? { ...p, ...patch }
        : p
    );

  // ========================= Likes =========================

  const toggleLike = async (pub) => {
    const id = pub.id_publicacion || pub.id;
    if (!id) return;

    let respText = '';

    try {
      const token = await AsyncStorage.getItem('AUTH_TOKEN');
      if (!token) return;

      const baseHeaders = {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      };

      setValores(prev => ({
        ...prev,
        publicaciones: prev.publicaciones.map(p => {
          if ((p.id_publicacion || p.id) !== id) return p;

          const liked = !p.liked_by_me;
          const count = Math.max(0, (p.total_likes ?? 0) + (liked ? 1 : -1));

          return {
            ...p,
            liked_by_me: liked,
            total_likes: count,
          };
        }),
      }));

      const r = await fetch(`${API_HOST}/social/likes/toggle`, {
        method: 'POST',
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicacion_id: id }),
      });

      respText = await r.text();
      if (!r.ok) {
        throw new Error(`HTTP ${r.status} ${respText?.slice(0, 200)}`);
      }

      const r2 = await fetch(`${API_HOST}/social/publicaciones/${id}`, {
        method: 'GET',
        headers: baseHeaders,
      });

      const txt2 = await r2.text();
      if (!r2.ok) {
        throw new Error(`HTTP ${r2.status} ${txt2?.slice(0, 200)}`);
      }

      const data = txt2 ? JSON.parse(txt2) : null;
      const post = data?.data ?? data;

      if (post) {
        setValores(prev => ({
          ...prev,
          publicaciones: prev.publicaciones.map(p => {
            if ((p.id_publicacion || p.id) !== id) return p;

            const finalId = p.id_publicacion || post.id_publicacion || post.id || id;

            return {
              ...p,
              liked_by_me: post.liked_by_me ?? p.liked_by_me,
              total_likes: post.total_likes ?? p.total_likes,
              total_comentarios: post.total_comentarios ?? p.total_comentarios,
              id_publicacion: finalId,
              perfil: p.perfil,
            };
          }),
        }));
      }
    } catch (e) {
      console.error('[toggleLike Principal] error', e?.message, respText);

      setValores(prev => ({
        ...prev,
        publicaciones: prev.publicaciones.map(p => {
          if ((p.id_publicacion || p.id) !== id) return p;

          return {
            ...p,
            liked_by_me: pub.liked_by_me,
            total_likes: pub.total_likes,
          };
        }),
      }));
    }
  };

  // ========================= Comentarios =========================

  async function abrirComentarios(pub) {
    const pubId = pub.id_publicacion ?? pub.id;
    if (!pubId) return;

    setComentarios({
      open: true,
      loading: true,
      error: null,
      list: [],
      text: '',
      pubId,
      sending: false
    });

    const perPage = 50;
    let all = [];
    let page = 1;
    let nextUrl = `${API_ORIGIN}/api/v1/social/publicaciones/${pubId}/comentarios?per_page=${perPage}&page=${page}`;

    try {
      for (let guard = 0; guard < 200; guard++) {
        const json = await fetchJsonAuthed(nextUrl);
        const items = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
        all = all.concat(items);

        const links = json?.links || {};
        const meta = json?.meta || {};

        if (links?.next) {
          nextUrl = links.next;
          continue;
        }

        const hasMoreByMeta =
          meta.current_page &&
          meta.last_page &&
          (meta.current_page < meta.last_page);

        if (hasMoreByMeta) {
          page += 1;
          nextUrl = `${API_ORIGIN}/api/v1/social/publicaciones/${pubId}/comentarios?per_page=${perPage}&page=${page}`;
          continue;
        }
        break;
      }

      setComentarios(c => ({ ...c, loading: false, list: all }));
      setTimeout(() => listaRef.current?.scrollToEnd({ animated: false }), 0);
    } catch (e) {
      setComentarios(c => ({ ...c, loading: false, error: String(e), list: [] }));
    }
  }

  function cerrarComentarios() {
    setComentarios({
      open: false,
      loading: false,
      error: null,
      list: [],
      text: '',
      pubId: null,
      sending: false
    });
  }

  async function enviarComentario() {
    if (comentarios.sending) {
      return;
    }

    const pubId = comentarios.pubId;
    const texto = (comentarios.text || '').trim();

    if (!pubId) return;
    if (!texto) return;

    const body = { publicacion_id: pubId, texto };

    setComentarios(c => ({ ...c, sending: true }));

    let respText = '';
    try {
      const token = await getToken();
      const url = `${API_ORIGIN}/api/v1/social/comentarios`;

      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      respText = await r.text();
      if (!r.ok) {
        throw new Error(`HTTP ${r.status} ${r.statusText}\n${respText?.slice(0, 400)}`);
      }

      const { data: nuevo, meta } = respText ? JSON.parse(respText) : { data: null, meta: null };

      setComentarios(c => ({ ...c, list: [...(c.list || []), nuevo], text: '' }));

      setValores(v => ({
        ...v,
        publicaciones: (v.publicaciones || []).map(p =>
          (p.id_publicacion ?? p.id) === pubId
            ? {
              ...p,
              total_comentarios: meta?.total_comentarios ?? ((p.total_comentarios || 0) + 1)
            }
            : p
        )
      }));
    } catch (e) {
      console.error('ERR enviarComentario:', e?.message, respText);
      Alert.alert('Comentario', String(e?.message || e));
    } finally {
      setComentarios(c => ({ ...c, sending: false }));
    }
  }

  // ========================= Seguidores / siguiendo =========================

  const toggleFollow = async (pub) => {
    const seguidoId =
      pub.perfil_id ??
      pub.perfil?.id_perfil ??
      pub.perfil?.perfil_id ??
      pub.perfil?.id ??
      null;

    const autorUsuarioId =
      pub.usuario_id ??
      pub.user_id ??
      pub.autor_id ??
      pub.perfil?.usuario_id ??
      null;

    const rawAuth  = await AsyncStorage.getItem('AUTH_ME');
    const rawCache = await AsyncStorage.getItem('perfil_cache');

    const meJson = rawAuth ?? rawCache;
    const me = meJson ? JSON.parse(meJson) : null;

    const miPerfilId =
      me?.id_perfil ??
      me?.perfil_id ??
      me?.perfil?.id_perfil ??
      null;

    const miUsuarioId =
      me?.usuario_id ??
      me?.id_usuario ??
      me?.user_id ??
      me?.id ??
      null;

    const miNick =
      me?.nick ??
      me?.nick_usuario ??
      me?.username ??
      '';

    const autorNick =
      pub?.perfil?.nick ??
      pub?.perfil?.username ??
      null;

    const esMio =
      (seguidoId && miPerfilId && String(seguidoId) === String(miPerfilId)) ||
      (autorUsuarioId && miUsuarioId && String(autorUsuarioId) === String(miUsuarioId)) ||
      (autorNick && miNick && autorNick === miNick);

    if (!seguidoId || esMio) return;

    const publicacionId = pub.id_publicacion ?? pub.id;
    if (!publicacionId) return;

    try {
      const token = await AsyncStorage.getItem('AUTH_TOKEN');
      if (!token) return;

      setValores(prev => ({
        ...prev,
        publicaciones: _patchPublicacion(prev.publicaciones, publicacionId, {
          following_by_me: !pub.following_by_me,
          total_seguidores: Math.max(
            0,
            (pub.total_seguidores ?? 0) + (!pub.following_by_me ? 1 : -1)
          ),
        }),
      }));

      const r = await fetch(`${API_HOST}/social/seguimientos/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ seguido_id: seguidoId }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(`HTTP ${r.status} ${JSON.stringify(json)}`);

      setValores(prev => ({
        ...prev,
        publicaciones: _patchPublicacion(prev.publicaciones, publicacionId, {
          following_by_me: !!json.following,
          total_seguidores: typeof json.total_seguidores === 'number'
            ? json.total_seguidores
            : (pub.total_seguidores ?? 0),
        }),
      }));
    } catch (e) {
      console.error('[follow toggle] error', e);
      setValores(prev => ({
        ...prev,
        publicaciones: _patchPublicacion(
          prev.publicaciones,
          publicacionId,
          {
            following_by_me: pub.following_by_me,
            total_seguidores: pub.total_seguidores,
          }
        ),
      }));
    }
  };

  // Carga inicial de tu propio perfil
  useEffect(() => {
    (async () => {
      const rawAuth  = await AsyncStorage.getItem('AUTH_ME');
      const rawCache = await AsyncStorage.getItem('perfil_cache');

      const meJson = rawAuth ?? rawCache;
      const me = meJson ? JSON.parse(meJson) : null;

      const miPerfilId =
        me?.id_perfil ??
        me?.perfil_id ??
        me?.perfil?.id_perfil ??
        null;

      const miUsuarioId =
        me?.usuario_id ??
        me?.id_usuario ??
        me?.user_id ??
        me?.id ??
        null;

      const miNick =
        me?.nick ??
        me?.nick_usuario ??
        me?.username ??
        '';

      setValores(prev => ({
        ...prev,
        miPerfilId,
        miUsuarioId,
        miNick,
      }));
    })();
  }, []);

  // ========================= Render principal =========================

  return (
    <>
      <StatusBar backgroundColor="#1d1916" barStyle="light-content" translucent={false} />
      {Platform.OS === 'ios' && <View style={{ height: 50, backgroundColor: '#1d1916' }} />}

      <SafeAreaView style={styles.contenedorPrincipal}>
        <View style={styles.cabecera}>
          <Image
            source={require("../../../../assets/logos/Logo-mancuernas-b.png")}
            style={styles.logo}
          />
        </View>

        <View style={styles.filaBotones}>
          <BotonAccion
            texto="Entrenamiento"
            nombreIcono="barbell-outline"
            tamañoIcono={24}
            colorIcono="#ffff"
            onPress={() => setValores(prev => ({ ...prev, open: !prev.open }))}
          />
          <BotonAccion
            texto="Calendario"
            nombreIcono="calendar-outline"
            tamañoIcono={24}
            colorIcono="#ffff"
            onPress={abrirModal}
          />
        </View>

        {valores.open && (
          <View style={styles.contenedorDesplegable}>
            <DropDownPicker
              open={valores.open}
              value={valores.valorSeleccionado}
              items={valores.items}
              setOpen={(open) => setValores(prev => ({ ...prev, open }))}
              setValue={(setter) =>
                setValores(prev => ({ ...prev, valorSeleccionado: setter(prev.valorSeleccionado) }))
              }
              setItems={(items) => setValores(prev => ({ ...prev, items }))}
              onSelectItem={onSelectTipoEntrenamiento}
              disabled={valores.creandoWod}
              placeholder="Selecciona un entrenamiento"
              style={{ marginHorizontal: 20, borderColor: '#20B2AA', backgroundColor: '#FFF', width: '90%' }}
              dropDownContainerStyle={{ marginHorizontal: 20, borderColor: '#20B2AA', width: '90%' }}
              listItemLabelStyle={{ fontSize: 16, color: '#333' }}
              labelStyle={{ fontWeight: '600', color: '#333' }}
              zIndex={1000}
            />
          </View>
        )}

        {/* Modal de calendario mensual con los días del mes actual */}
        <Modal
          visible={valores.mesModalVisible}
          animationType="slide"
          transparent
          onRequestClose={cerrarModal}
        >
          <View style={styles.modalBackground}>
            <View style={styles.modalCalendario}>
              <Text style={styles.añoTexto}>{valores.añoActual}</Text>
              <Text style={styles.mesTexto}>{valores.meses[valores.mesSeleccionado]?.label}</Text>

              <View style={styles.diasGrid}>
                {valores.diasMes.map((dia) => {
                  const hoy = new Date();
                  const esHoy =
                    dia === hoy.getDate() &&
                    valores.mesSeleccionado === hoy.getMonth() &&
                    valores.añoActual === hoy.getFullYear();

                  const yyyy = valores.añoActual;
                  const mm = String(valores.mesSeleccionado + 1).padStart(2, '0');
                  const dd = String(dia).padStart(2, '0');
                  const key = `${yyyy}-${mm}-${dd}`;

                  const entrenosTodos = valores.entrenosPorDia[key] || [];

                  const { miPerfilId, miUsuarioId, miNick } = valores;
                  const identidadCargada = !!(miPerfilId || miUsuarioId || miNick);

                  const entrenosDelUsuario = identidadCargada
                    ? entrenosTodos.filter((p) => {
                        const autorPerfilId =
                          p.perfil_id ??
                          p.perfil?.id_perfil ??
                          p.perfil?.perfil_id ??
                          p.perfil?.id ??
                          null;

                        const autorUsuarioId =
                          p.usuario_id ??
                          p.user_id ??
                          p.autor_id ??
                          p.perfil?.usuario_id ??
                          null;

                        const autorNick =
                          p?.perfil?.nick ??
                          p?.perfil?.username ??
                          null;

                        const esMio =
                          (miPerfilId && autorPerfilId &&
                            String(autorPerfilId) === String(miPerfilId)) ||
                          (miUsuarioId && autorUsuarioId &&
                            String(autorUsuarioId) === String(miUsuarioId)) ||
                          (miNick && autorNick &&
                            miNick.toLowerCase() === autorNick.toLowerCase());

                        return esMio;
                      })
                    : entrenosTodos;

                  const tieneEntreno = entrenosDelUsuario.length > 0;

                  return (
                    <TouchableOpacity
                      key={dia}
                      onPress={() =>
                        setValores(prev => ({
                          ...prev,
                          diaSeleccionado: dia,
                          entrenosDelDia: entrenosDelUsuario,
                          mesModalVisible: false,
                          modalDetalleVisible: true,
                        }))
                      }
                      style={[
                        styles.diaCalendario,
                        esHoy && styles.diaHoy,
                        tieneEntreno && styles.diaConEntreno,
                      ]}
                    >
                      <Text style={styles.diaTexto}>{dia}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity onPress={cerrarModal} style={{ marginTop: 20 }}>
                <Text style={{ fontSize: 16, color: '#007AFF', fontWeight: '600' }}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {valores.modalDetalleVisible && (
          <DetalleDia
            visible={valores.modalDetalleVisible}
            cerrar={() => setValores(prev => ({ ...prev, modalDetalleVisible: false }))}
            diaSeleccionado={valores.diaSeleccionado}
            entrenos={valores.entrenosDelDia}
          />
        )}

        <View style={styles.redSocialContenedor}>
          {valores.loading ? (
            <ActivityIndicator size="large" color="#000" style={{ marginTop: 30 }} />
          ) : (
            <>
              <FlatList
                data={valores.publicaciones}
                keyExtractor={(item, index) =>
                  `post-${item?.id_publicacion ?? item?.id ?? 'noid'}-${index}`
                }
                renderItem={({ item }) => {
                  const autorPerfilId =
                    item.perfil_id ??
                    item.perfil?.id_perfil ??
                    item.perfil?.perfil_id ??
                    item.perfil?.id ??
                    null;

                  const autorUsuarioId =
                    item.usuario_id ??
                    item.user_id ??
                    item.autor_id ??
                    item.perfil?.usuario_id ??
                    null;

                  const autorNick =
                    item?.perfil?.nick ??
                    item?.perfil?.username ??
                    null;

                  const { miPerfilId, miUsuarioId, miNick } = valores;

                  const identidadCargada = !!(miPerfilId || miUsuarioId || miNick);

                  const esMio =
                    (miPerfilId && autorPerfilId &&
                      String(autorPerfilId) === String(miPerfilId)) ||
                    (miUsuarioId && autorUsuarioId &&
                      String(autorUsuarioId) === String(miUsuarioId)) ||
                    (miNick && autorNick &&
                      miNick.toLowerCase() === autorNick.toLowerCase());

                  return (
                    <View style={styles.cardPublicacion}>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => irADetallePublicacion(item)}
                      >
                        <View style={styles.headerCard}>
                          <Image
                            source={item?.perfil?.url_avatar ? { uri: item.perfil.url_avatar } : require('@asset/perfil.png')}
                            style={styles.avatar}
                            defaultSource={require('@asset/perfil.png')}
                          />
                          <View style={styles.infoCabecera}>
                            <View style={styles.rowCabecera}>
                              <Text style={styles.nickTexto}>
                                {item?.perfil?.nick || 'Usuario'}
                              </Text>

                              <Text style={styles.fecha}>
                                {formatearFechaCompleta(
                                  item?.fecha_creacion ||
                                  item?.created_at ||
                                  item?.fecha
                                )}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {renderContenidoPublicacion(item)}

                        <View style={styles.actionsRow}>
                          <Pressable onPress={() => toggleLike(item)} style={styles.likeBtn} hitSlop={8}>
                            <Ionicons
                              name={item?.liked_by_me ? 'heart' : 'heart-outline'}
                              size={22}
                              color={item?.liked_by_me ? '#ef4444' : '#6b7280'}
                              style={{ marginRight: 6 }}
                            />
                            <Text style={styles.likeCount}>{item?.total_likes ?? 0}</Text>
                          </Pressable>

                          <Pressable
                            onPress={() => irADetallePublicacion(item)}
                            style={styles.commentBtn}
                            hitSlop={8}
                          >
                            <Ionicons
                              name="chatbubble-ellipses-outline"
                              size={22}
                              color="#6b7280"
                              style={{ marginRight: 6 }}
                            />
                            <Text style={styles.commentCount}>{item?.total_comentarios ?? 0}</Text>
                          </Pressable>

                          {identidadCargada && !esMio && (
                            <Pressable
                              onPress={() => toggleFollow(item)}
                              style={[
                                styles.followBtn,
                                item.following_by_me ? styles.following : styles.follow,
                              ]}
                              hitSlop={8}
                            >
                              <Text
                                style={item.following_by_me ? styles.followingText : styles.followText}
                              >
                                {item.following_by_me ? 'Siguiendo' : 'Seguir'}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                }}
                onEndReached={() => {
                  if (
                    loadingMore ||
                    valores.loading ||
                    !hasMore ||
                    (valores.publicaciones || []).length < PER_PAGE
                  ) {
                    return;
                  }

                  fetchFeed(page + 1);
                }}
                onEndReachedThreshold={0.3}
                ListFooterComponent={
                  hasMore && loadingMore ? (
                    <ActivityIndicator style={{ marginVertical: 16 }} />
                  ) : null
                }
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', marginTop: 30 }}>
                    <Text style={{ color: '#333' }}>No hay publicaciones todavía.</Text>
                  </View>
                }
                showsVerticalScrollIndicator={false}
              />

              {/* Modal de comentarios tipo bottom sheet */}
              <Modal
                visible={!!comentarios.open}
                animationType="fade"
                transparent
                onRequestClose={cerrarComentarios}
              >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' }}>
                  <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={cerrarComentarios} />

                  <View
                    style={{
                      marginTop: 'auto',
                      backgroundColor: '#fff',
                      borderTopLeftRadius: 16,
                      borderTopRightRadius: 16,
                      overflow: 'hidden',
                      maxHeight: '60%',
                      minHeight: 200,
                    }}
                  >
                    <View style={{ alignItems: 'center', paddingTop: 10 }}>
                      <View style={{ width: 48, height: 6, borderRadius: 3, backgroundColor: '#E5E7EB' }} />
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        paddingBottom: 8,
                      }}
                    >
                      <Text style={{ fontSize: 18, fontWeight: '700' }}>Comentarios</Text>
                      <Pressable
                        onPress={cerrarComentarios}
                        hitSlop={8}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#F3F4F6',
                        }}
                      >
                        <Ionicons name="close" size={18} color="#111" />
                      </Pressable>
                    </View>

                    <FlatList
                      ref={listaRef}
                      data={comentarios.list}
                      keyExtractor={(it) => String(it.id_comentario ?? it.id)}
                      keyboardShouldPersistTaps="handled"
                      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                      renderItem={({ item }) => (
                        <View style={{ paddingHorizontal: 16 }}>
                          <Text style={{ fontWeight: '600', color: '#111' }}>
                            {item?.autor?.nick ?? `perfil ${item.perfil_id}`}
                          </Text>
                          <Text style={{ color: '#333' }}>{item.texto}</Text>
                          <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                            {new Date(item.fecha_creacion).toLocaleString()}
                          </Text>
                        </View>
                      )}
                      contentContainerStyle={{
                        paddingBottom: INPUT_BAR_H + insets.bottom + 12,
                        paddingTop: 4,
                      }}
                      showsVerticalScrollIndicator={false}
                    />

                    <View
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: '#E5E7EB',
                        paddingTop: 8,
                        paddingHorizontal: 12,
                        backgroundColor: '#fff',
                        marginBottom: kbHeight,
                        paddingBottom: insets.bottom,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TextInput
                          value={comentarios.text}
                          onChangeText={(t) => setComentarios((c) => ({ ...c, text: t }))}
                          placeholder="Únete a la conversación…"
                          placeholderTextColor="#9CA3AF"
                          style={{
                            flex: 1,
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            maxHeight: 120,
                          }}
                          multiline
                          returnKeyType="send"
                          onSubmitEditing={() => {
                            if (!comentarios.sending) enviarComentario();
                          }}
                          blurOnSubmit={false}
                        />
                        <Pressable
                          onPress={() => { if (!comentarios.sending) enviarComentario(); }}
                          disabled={comentarios.sending}
                          style={{
                            paddingVertical: 10,
                            paddingHorizontal: 14,
                            backgroundColor: comentarios.sending ? '#9CA3AF' : '#10B981',
                            borderRadius: 10,
                          }}
                        >
                          <Ionicons name="send" size={18} color="#fff" />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              </Modal>
            </>
          )}
        </View>

      </SafeAreaView>
    </>
  );
}

// ========================= Estilos =========================

const styles = StyleSheet.create({
  // Contenedor raíz de la pantalla Principal
  contenedorPrincipal: {
    flex: 1,
    backgroundColor: '#f1f1f1',
  },

  // Fila de botones "Entrenamiento" y "Calendario"
  filaBotones: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 30,
    paddingHorizontal: 16,
    width: '44%',
  },

  // Cabecera con fondo oscuro y logo centrado
  cabecera: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    height: 80,
    backgroundColor: '#1d1916',
    paddingHorizontal: 16,
    paddingTop: 2,
  },

  // Logo de la app en la cabecera
  logo: {
    height: 51,
    objectFit: 'contain',
    width: 51,
  },

  // Contenedor del DropDownPicker para controlar zIndex (por encima del feed)
  contenedorDesplegable: {
    zIndex: 1000,
  },

  // Fondo oscurecido del modal de calendario
  modalBackground: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'center',
  },

  // Caja blanca del calendario mensual
  modalCalendario: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: '70%',
    padding: 20,
    width: '85%',
  },

  // Año en el calendario
  añoTexto: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },

  // Nombre del mes en el calendario
  mesTexto: {
    fontSize: 16,
    marginBottom: 16,
  },

  // Grid flexible para los días del mes
  diasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  // Celda de día en el calendario
  diaCalendario: {
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    height: 40,
    justifyContent: 'center',
    margin: 6,
    width: 40,
  },

  // Número del día
  diaTexto: {
    color: '#333',
    fontSize: 14,
  },

  // Día actual (hoy) resaltado en amarillo
  diaHoy: {
    backgroundColor: '#FFD700',
  },

  // Días que tienen entreno marcado en verde agua
  diaConEntreno: {
    backgroundColor: '#20B2AA',
  },

  // Contenedor del feed de la red social
  redSocialContenedor: {
    alignSelf: 'center',
    backgroundColor: '#F6F7FB',
    height: '70%',
    marginTop: 20,
    width: '90%',
  },

  // Tarjeta de publicación individual
  cardPublicacion: {
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 8,
    padding: 12,
    width: '100%',
  },

  // Cabecera (avatar + datos) dentro de la card
  headerCard: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    marginBottom: 8,
  },

  // Contenedor para nick + fecha
  infoCabecera: {
    flex: 1,
    flexDirection: 'column',
  },

  // Fila horizontal para nick y fecha
  rowCabecera: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  // Avatar de la publicación
  avatar: {
    borderRadius: 20,
    height: 40,
    marginRight: 10,
    width: 40,
  },

  // Nick del usuario que publica
  nickTexto: {
    color: '#1d1d1d',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Fecha formateada de la publicación
  fecha: {
    color: '#9CA3AF',
    fontSize: 12,
  },

  // Texto de la publicación normal
  textoPublicacion: {
    color: '#333',
    fontSize: 15,
    marginBottom: 8,
  },

  // Imagen de la publicación normal
  imagenPublicacion: {
    width: '100%',
    height: 200,
  },

  // Fila de acciones (like, comentarios, seguir)
  actionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 10,
  },

  // Botón de like
  likeBtn: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  // Contador de likes
  likeCount: {
    color: '#4B5563',
    fontSize: 14,
  },

  // Botón para ir a detalle / comentarios
  commentBtn: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    marginLeft: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  // Contador de comentarios
  commentCount: {
    color: '#4B5563',
    fontSize: 14,
  },

  // Botón seguir / siguiendo
  followBtn: {
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  // Estado visual cuando aún no sigues (verde)
  follow: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },

  // Estado visual cuando ya sigues (gris)
  following: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },

  // Texto del botón "Seguir"
  followText: {
    color: '#065F46',
    fontWeight: '600',
  },

  // Texto del botón "Siguiendo"
  followingText: {
    color: '#374151',
    fontWeight: '600',
  },

  // Caja que envuelve la info del WOD dentro de la card
  wodBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  // Título del WOD (Entrenamiento libre, Rondas por tiempo, etc.)
  wodTitulo: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 2,
    color: '#111827',
  },
  // Texto meta (ej: nº de rondas)
  wodMeta: {
    color: '#6B7280',
    marginBottom: 8,
  },
  // Fila de cada ejercicio del WOD
  wodEjRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    columnGap: 8,
  },
  // Miniatura del ejercicio
  wodEjImg: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#ddd',
  },
  // Nombre del ejercicio del WOD
  wodEjNombre: {
    fontWeight: '600',
    color: '#111827',
  },
  // Texto de repeticiones / tiempo por ejercicio
  wodEjReps: {
    color: '#374151',
  },
  // Texto de tiempo total del WOD
  wodTiempo: {
    marginTop: 8,
    fontWeight: '600',
    color: '#111827',
  },
  // Comentario del usuario sobre el WOD
  wodComentario: {
    marginTop: 4,
    color: '#111827',
  },
});
