// Pantalla: Publicar.js
// Permite crear una nueva publicación de texto + imagen/vídeo.

import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, SafeAreaView, Alert,
  Keyboard, Pressable
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bus } from '@util/eventBus';

// URL base de la API y origen base sin el /api/vX final
const API_HOST   = process.env.EXPO_PUBLIC_API_URL;

// ---------- Helpers ----------

// Extrae un posible "nick" desde distintas propiedades del objeto
const extractNick = (obj) => {
  if (!obj || typeof obj !== 'object') return '';

  // Prioriza varias claves típicas de nick en el mismo nivel
  const from = (o) => ([
    o?.nick, o?.nickname, o?.apodo, o?.alias,
    o?.username, o?.user_name, o?.userName,
    o?.nick_usuario, o?.nombreUsuario, o?.nombre_usuario,
    o?.displayName, o?.name, o?.nombre,
  ].filter(Boolean)[0] || '').toString().trim();

  // 1) Busca en el propio objeto
  let found = from(obj);
  if (found) return found;

  // 2) Busca en propiedades anidadas típicas
  const nestPaths = ['perfil', 'usuario', 'user', 'account', 'data', 'attributes', 'payload', 'result'];
  for (const key of nestPaths) {
    const o = obj[key];
    if (o && typeof o === 'object') {
      const v = from(o);
      if (v) return v;
    }
  }

  // 3) Caso extra: si data es objeto, vuelve a intentar de forma recursiva
  if (obj?.data && typeof obj.data === 'object') {
    const v = extractNick(obj.data);
    if (v) return v;
  }
  return '';
};

// Extrae un email desde varias posibles claves y anidaciones
const extractEmail = (obj) => {
  if (!obj || typeof obj !== 'object') return '';
  const direct = obj.email || obj.correo || obj.mail;

  const nests = [obj.perfil, obj.usuario, obj.user, obj.account, obj.data]
    .filter(Boolean)
    .map(o => o?.email || o?.correo || o?.mail)
    .filter(Boolean);

  return direct || nests[0] || '';
};

// Extrae una URL de avatar desde varias propiedades posibles
const extractAvatar = (obj) => {
  if (!obj || typeof obj !== 'object') return '';
  return (
    obj.url_avatar || obj.avatar || obj.foto_usuario || obj.foto ||
    obj.fotoPerfil || obj.perfil?.url_avatar || obj.perfil?.avatar || ''
  );
};

// Busca un token en varias keys habituales dentro de AsyncStorage
const getAnyToken = async () => {
  const keys = ['AUTH_TOKEN', 'access_token', 'token', 'jwt', 'api_token'];
  for (const k of keys) {
    try {
      const v = await AsyncStorage.getItem(k);
      if (v) return v;
    } catch {}
  }
  return null;
};

export function Publicar({ navigation, route }) {
  // Params recibidos al navegar a esta pantalla (con valores por defecto)
  const {
    email: emailFromParams = '',
    nick: nickFromParams = '',
    perfil: perfilInicial = null,
    followers: followersParam = [],
    following: followingParam = [],
    posts: postsParam = [],
    token: tokenParam = null,
  } = route?.params || {};

  // Perfil inicial de fallback si todavía no se ha cargado nada
  const PLACEHOLDER = {
    id: perfilInicial?.id ?? 0,
    nick: perfilInicial?.nick ?? nickFromParams ?? 'Usuario',
    bio: perfilInicial?.bio ?? '',
    avatar: perfilInicial?.avatar ?? (perfilInicial?.url_avatar ?? ''),
    cabecera: perfilInicial?.cabecera ?? (perfilInicial?.url_cabecera ?? ''),
    localidad: '',
    seguidores: perfilInicial?.seguidores ?? 0,
    seguidos: perfilInicial?.seguidos ?? 0,
    publicaciones: perfilInicial?.publicaciones ?? 0,
    email: perfilInicial?.email ?? emailFromParams,
    token: null,
  };

  // Estado unificado: datos de perfil + form de perfil + estado de UI para publicar
  const [valores, setValores] = useState({
    perfil: PLACEHOLDER,
    form: {
      nick: PLACEHOLDER.nick,
      descripcion_personal: PLACEHOLDER.bio,
      url_avatar: PLACEHOLDER.avatar,
      url_cabecera: PLACEHOLDER.cabecera,
    },
    ui: {
      texto: '',
      imagen: null,
      cargando: false,
      meLoading: false,
      lastStatus: null,
      lastTxt: '',
    },
  });

  // Normaliza un objeto de usuario/perfil a un formato consistente para la UI
  const normalizarPerfil = (raw, prev = {}) => {
    const nick =
      extractNick(raw) ||
      extractNick(raw?.usuario) ||
      extractNick(raw?.user) ||
      extractNick(raw?.perfil) ||
      prev.nick || 'Usuario';

    const avatarUrl =
      extractAvatar(raw) ||
      extractAvatar(raw?.usuario) ||
      extractAvatar(raw?.user) ||
      extractAvatar(raw?.perfil) ||
      prev.avatar || '';

    const email = extractEmail(raw) || prev.email || '';

    return {
      ...prev,
      id: raw?.id ?? raw?.userId ?? raw?.usuario?.id ?? raw?.user?.id ?? prev.id ?? 0,
      nick,
      avatar: avatarUrl,
      email,
      bio: raw?.bio || raw?.descripcion || raw?.perfil?.bio || prev.bio || '',
      cabecera: raw?.cabecera || raw?.url_cabecera || raw?.perfil?.cabecera || prev.cabecera || '',
      localidad: raw?.localidad || raw?.city || raw?.perfil?.localidad || prev.localidad || '',
    };
  };

  // Al enfocar la pantalla, intenta sincronizar perfil desde 'perfil_cache'
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const syncPerfilDesdeCache = async () => {
        try {
          const raw = await AsyncStorage.getItem('perfil_cache');
          if (!raw) return;

          const cached = JSON.parse(raw);

          // Normaliza avatar aunque venga en otras claves
          const avatar =
            cached?.avatar ||
            cached?.url_avatar ||
            cached?.perfil?.avatar ||
            cached?.perfil?.url_avatar ||
            '';

          if (!isActive) return;

          setValores(s => ({
            ...s,
            perfil: {
              ...(s.perfil || {}),
              ...cached,
              avatar,
            },
            form: {
              ...s.form,
              nick: cached?.nick ?? s.form.nick,
              descripcion_personal: cached?.bio ?? s.form.descripcion_personal,
              url_avatar: avatar ?? s.form.url_avatar,
              url_cabecera: cached?.cabecera ?? s.form.url_cabecera,
            },
          }));
        } catch (e) {
          console.error('[Publicar] Error leyendo perfil_cache', e);
        }
      };

      syncPerfilDesdeCache();

      // Evita updates de estado si el efecto se ha limpiado
      return () => { isActive = false; };
    }, [])
  );

  // Carga /usuarios/me al montar o cuando cambie tokenParam
  useEffect(() => {
    const cargarPerfil = async () => {
      try {
        setValores(s => ({ ...s, ui: { ...s.ui, meLoading: true }}));

        // Obtiene token de params o de AsyncStorage
        let token = tokenParam;
        if (!token) token = await getAnyToken();

        // Si no hay token, solo guarda el estado de "NO_TOKEN"
        if (!token) {
          setValores(s => ({
            ...s,
            ui: { ...s.ui, lastStatus: 'NO_TOKEN' }
          }));
          return;
        }

        // Petición al endpoint /usuarios/me
        const r = await fetch(`${API_HOST}/usuarios/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        const txt = await r.text();

        // Guarda status y body crudo para debug
        setValores(s => ({
          ...s,
          ui: { ...s.ui, lastStatus: r.status, lastTxt: txt }
        }));

        // Intenta parsear respuesta como JSON
        let raw;
        try { raw = JSON.parse(txt); } catch {
          console.error('Respuesta no JSON de /usuarios/me:', txt);
          return;
        }
        const me = raw?.data || raw;

        // Normaliza el perfil y lo guarda en estado y en cache
        setValores(s => {
          const perfilPrev = s.perfil || {};
          const perfilNorm = normalizarPerfil(me, perfilPrev);

          AsyncStorage.setItem('perfil_cache', JSON.stringify(perfilNorm)).catch(() => {});

          return {
            ...s,
            perfil: { ...perfilNorm, token },
            form: {
              ...s.form,
              nick: perfilNorm.nick,
              descripcion_personal: perfilNorm.bio,
              url_avatar: perfilNorm.avatar,
              url_cabecera: perfilNorm.cabecera,
            },
          };
        });
      } catch (e) {
        console.error('Error cargando /usuarios/me', e);
      } finally {
        setValores(s => ({ ...s, ui: { ...s.ui, meLoading: false }}));
      }
    };

    cargarPerfil();
  }, [tokenParam]);

  // Si entran nuevos datos de perfil por params, se re-normalizan
  useEffect(() => {
    const entrante = route?.params?.perfil;
    if (!entrante) return;

    setValores(s => {
      const enriquecido = normalizarPerfil(entrante, s.perfil);
      return {
        ...s,
        perfil: enriquecido,
        form: {
          ...s.form,
          nick: enriquecido.nick ?? s.form.nick,
          descripcion_personal: enriquecido.bio ?? s.form.descripcion_personal,
          url_avatar: enriquecido.avatar ?? s.form.url_avatar,
          url_cabecera: enriquecido.cabecera ?? s.form.url_cabecera,
        },
      };
    });
  }, [route?.params?.perfil, route?.params?._ts]);

  // Abre la galería y permite seleccionar una imagen (o vídeo según config)
  const seleccionarMedia = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) return Alert.alert('Permisos', 'Se necesita acceso a la galería');

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!res.canceled) {
      setValores(s => ({ ...s, ui: { ...s.ui, imagen: res.assets[0].uri }}));
    }
  };

  // Envía la publicación al backend en dos pasos:
  // 1) Crear publicación (texto) -> /social/publicaciones  (JSON)
  // 2) Si hay imagen, subirla      -> /social/publicaciones/{id}/medias (FormData)
  const publicar = async () => {
    // Comprueba que haya al menos texto o imagen
    if (!valores.ui.imagen && !valores.ui.texto?.trim()) {
      Alert.alert('Nada que publicar', 'Escribe algo o añade una imagen/vídeo.');
      return;
    }

    setValores(s => ({ ...s, ui: { ...s.ui, cargando: true }}));

    try {
      // Obtiene token desde perfil, params o AsyncStorage
      let token = valores.perfil?.token
        || tokenParam
        || await AsyncStorage.getItem('AUTH_TOKEN');

      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // ==========================
      // 1) Crear la publicación
      // ==========================
      const crearResp = await fetch(`${API_HOST}/social/publicaciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          nota_usuario: valores.ui.texto ?? '', // nombre del campo que ya usabas en el backend
        }),
      });

      const crearTxt = await crearResp.text();
      if (!crearResp.ok) {
        console.error('Error al crear la publicación:', crearResp.status, crearTxt);
        throw new Error('Error al crear la publicación');
      }

      let crearJson = null;
      try {
        crearJson = JSON.parse(crearTxt);
      } catch (e) {
        console.error('Respuesta no JSON al crear publicación:', crearTxt);
        throw new Error('Respuesta inesperada al crear la publicación');
      }

      const nuevaPub = crearJson?.data || crearJson;
      const publicacionId =
        nuevaPub?.id ||
        nuevaPub?.publicacion_id ||
        nuevaPub?.id_publicacion;

      if (!publicacionId) {
        console.error('No se pudo extraer el id de la publicación:', nuevaPub);
        throw new Error('No se pudo obtener el ID de la publicación');
      }

      // ==========================
      // 2) Subir media (si hay)
      // ==========================
      if (valores.ui.imagen) {
        const uri = valores.ui.imagen;

        // --- sacar extensión de la URI ---
        const ext = (() => {
          try {
            const p = (uri.split('?')[0] || '').toLowerCase();
            const last = p.split('/').pop() || '';
            const dot = last.lastIndexOf('.');
            return dot > -1 ? last.substring(dot + 1) : '';
          } catch {
            return '';
          }
        })();

        const toMime = (e) => {
          if (e === 'jpg' || e === 'jpeg') return 'image/jpeg';
          if (e === 'png')  return 'image/png';
          if (e === 'webp') return 'image/webp';
          if (e === 'mp4')  return 'video/mp4';
          if (e === 'mov')  return 'video/quicktime';
          return 'image/jpeg';
        };

        let pickedExt = (ext || 'jpg').toLowerCase();
        let mime = toMime(pickedExt);

        // ⚠️ iOS: HEIC/HEIF → lo forzamos a JPG porque Laravel normalmente solo acepta jpg/png/webp
        if (pickedExt === 'heic' || pickedExt === 'heif') {
          pickedExt = 'jpg';
          mime = 'image/jpeg';
        }

        const fileName = `publicacion.${pickedExt}`;

        const fd = new FormData();
        // 'media' => ['required','array'], 'media.*' => 'mimes:jpg,jpeg,png,webp,mp4,...'
        fd.append('media[0]', {
          uri,
          name: fileName,
          type: mime,
        });

        const mediaResp = await fetch(
          `${API_HOST}/social/publicaciones/${publicacionId}/medias`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            body: fd,
          }
        );

        const mediaTxt = await mediaResp.text();

        if (!mediaResp.ok) {
          console.log('[MEDIA ERR]', mediaResp.status, mediaTxt);
          let msg = `La publicación se ha creado, pero la imagen/vídeo no se pudo subir. (HTTP ${mediaResp.status})`;

          // Intentar sacar mensaje útil de Laravel
          try {
            const err = JSON.parse(mediaTxt);
            if (err?.message) msg += `\n\n${err.message}`;
            if (err?.errors?.media?.[0]) msg += `\n${err.errors.media[0]}`;
            if (err?.errors?.['media.0']?.[0]) msg += `\n${err.errors['media.0'][0]}`;
          } catch {}

          Alert.alert('Aviso', msg);
        }
      }

      // Avisar al resto de pantallas para que refresquen el feed
      bus?.emit?.('feed.refresh');

      Alert.alert('Listo', '✅ Publicación subida correctamente');

      // Limpiar formulario local
      setValores(s => ({
        ...s,
        ui: {
          ...s.ui,
          texto: '',
          imagen: null,
        },
      }));

      navigation.goBack();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', '❌ No se pudo subir la publicación');
    } finally {
      setValores(s => ({ ...s, ui: { ...s.ui, cargando: false }}));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Pressable para cerrar teclado al tocar fuera del TextInput */}
      <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
        <Text style={styles.titulo}>Nueva publicación</Text>

        {/* Cabecera con avatar y nick del usuario */}
        <View style={styles.userHeader}>
          <Image
            source={
              valores.perfil?.avatar
                ? { uri: valores.perfil.avatar }
                : require('../../../assets/perfil.png')
            }
            style={styles.avatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.nick}>{valores.perfil?.nick || 'Usuario'}</Text>
          </View>
        </View>

        {/* Texto de la publicación */}
        <TextInput
          placeholder="Escribe algo sobre tu publicación…"
          placeholderTextColor="#9AA3B2"
          style={styles.input}
          multiline
          value={valores.ui.texto}
          onChangeText={(t) =>
            setValores((s) => ({ ...s, ui: { ...s.ui, texto: t } }))
          }
        />

        {/* Previsualización de imagen o botón para elegir media */}
        {valores.ui.imagen ? (
          <Image source={{ uri: valores.ui.imagen }} style={styles.preview} />
        ) : (
          <TouchableOpacity style={styles.mediaBtn} onPress={seleccionarMedia}>
            <Ionicons name="image-outline" size={24} color="#fff" />
            <Text style={styles.btnTexto}>Seleccionar imagen o video</Text>
          </TouchableOpacity>
        )}

        {/* Botón de publicar con spinner cuando está cargando */}
        <TouchableOpacity
          style={[styles.publicarBtn, valores.ui.cargando && { opacity: 0.6 }]}
          onPress={publicar}
          disabled={valores.ui.cargando}
        >
          {valores.ui.cargando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnTexto}>Publicar</Text>
          )}
        </TouchableOpacity>
      </Pressable>
    </SafeAreaView>
  );
}


// --------- Estilos ----------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1115', paddingHorizontal: 18, paddingTop: 18 },
  titulo: { fontSize: 22, fontWeight: '800', color: '#E6EAF2', marginBottom: 16, letterSpacing: 0.3 },

  userHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  avatar: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#1B2030', borderWidth: 2, borderColor: '#20B2AA55',
  },
  nick: { color: '#E6EAF2', fontWeight: '700', fontSize: 18, flexShrink: 1 },

  input: {
    backgroundColor: '#151A24', color: '#E6EAF2', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, minHeight: 110,
    textAlignVertical: 'top', marginBottom: 14, borderWidth: 1, borderColor: '#232A3A',
  },

  mediaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent', paddingVertical: 14, borderRadius: 14, marginBottom: 16,
    borderWidth: 1.5, borderColor: '#2A3347', borderStyle: 'dashed',
  },
  btnTexto: { color: '#E6EAF2', marginLeft: 8, fontWeight: '600' },

  preview: { width: '100%', height: 260, borderRadius: 14, marginBottom: 16, backgroundColor: '#1B2030' },

  publicarBtn: { backgroundColor: '#20B2AA', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
});
