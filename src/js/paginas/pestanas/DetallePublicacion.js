// Pantalla de detalle de publicación: aquí pinto el contenido completo del post
// (incluyendo WOD si lo hay), gestiono likes y todo el flujo de comentarios.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  apiGetPublicacion,
  apiGetComentarios,
  apiToggleLike,
  apiCrearComentario
} from '@api/detallePublicacionService';
import { normalizarComentario } from 'src/shared/utils/normalizadores';
import { formatearFechaUI } from 'src/shared/utils/fechaUtils';
import { bus } from 'src/shared/utils/eventBus';

const API_HOST = process.env.EXPO_PUBLIC_API_URL;
const API_ORIGIN = API_HOST?.replace(/\/api\/v\d+.*$/, '') ?? API_HOST ?? '';

// ===== helpers para contenido (igual que en Principal) =====

// Formateo los segundos totales en un MM:SS para mostrar tiempos de WOD
function formatearSegundos(segundos = 0) {
  const mm = Math.floor(segundos / 60);
  const ss = segundos % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

// Saca la URL de media desde la relación nuevas medias[] o desde los campos antiguos
function getMediaUri(post = {}) {
  if (!post) return null;

  let mediaUri = null;

  // 1) Nueva relación medias[]
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

  // 2) Campos antiguos (media_url, media, media_path, url_media…)
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

  return mediaUri;
}

// A partir de la info del post decido si es un WOD o una publicación normal
// y devuelvo el bloque de JSX correspondiente
function renderContenidoPublicacion(post) {
  if (!post) return null;

  const tipo = post.tipo_publicacion || post.tipo || null;
  const wod  = post.wod || post.wod_meta || null;

  // 🔹 Publicación de WOD (con ejercicios y tiempos)
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

          // Normalizo la ruta de la imagen del ejercicio (tanto local como URL absoluta)
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

        {(post.tiempo_realizado_segundos != null ||
          post.tiempo_realizado != null) && (
          <Text style={styles.wodTiempo}>
            Tiempo realizado:{' '}
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

  // 🔹 Publicación normal (texto + imagen usando nueva relación medias[])
  const mediaUri = getMediaUri(post);

  return (
    <>
      {!!post?.nota_usuario && (
        <Text style={styles.texto}>{post.nota_usuario}</Text>
      )}
      {mediaUri && (
        <View style={styles.mediaWrap}>
          <Image
            source={{ uri: mediaUri }}
            resizeMode="cover"
            style={styles.media}
          />
        </View>
      )}
    </>
  );
}

// ==========================================================

export function DetallePublicacion({ route, navigation }) {
  const { postId, initialPost = null, initialComments = null } = route.params || {};

  // Estado principal de la pantalla: post, comentarios y estado de envío de comentario
  const [post, setPost] = useState(initialPost);
  const [comentarios, setComentarios] = useState(initialComments || []);
  const [commentsFetched, setCommentsFetched] = useState(!!initialComments);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [sending, setSending] = useState(false);

  // Refs para gestionar una cola de likes y no liarla con toques repetidos
  const likeQueueRef  = useRef(0);
  const likeFlightRef = useRef(false);

  // Traigo la publicación desde la API y mezclo con lo que ya tuviera en estado
  const fetchPost = useCallback(async () => {
    try {
      const p = await apiGetPublicacion(postId);
      setPost((prev) => ({ ...(prev || {}), ...p }));
    } catch {}
  }, [postId]);

  // Cargo comentarios, los normalizo y los dejo en el array de comentarios
  const fetchComments = useCallback(async () => {
    try {
      const comentarios = await apiGetComentarios(postId);

      const arr = Array.isArray(comentarios) ? comentarios : [];

      const normalizados = typeof normalizarComentario === 'function'
        ? arr.map((comentario) => normalizarComentario(comentario))
        : arr;

      setComentarios(normalizados);
    } catch (e) {
      console.error('[fetchComments] error:', e);
    } finally {
      setCommentsFetched(true);
    }
  }, [postId]);

  // Al montar la pantalla traigo la publicación y sus comentarios
  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [fetchPost, fetchComments]);

  // Pull-to-refresh para recargar post y comentarios a la vez
  const onRefresh = useCallback(async () => {
    await Promise.all([fetchPost(), fetchComments()]);
  }, [fetchPost, fetchComments]);

  // Gestión del like optimista + sincronización con el backend
  const onToggleLike = () => {
    if (!post && !postId) return;

    const idPub = post?.id_publicacion ?? postId;

    // Optimista: actualizo UI al instante
    setPost((prev) => {
      if (!prev) return prev;
      const likedBefore = !!prev.liked_by_me;
      const delta = likedBefore ? -1 : 1;

      return {
        ...prev,
        liked_by_me: !likedBefore,
        total_likes: Math.max(0, (prev.total_likes ?? 0) + delta),
      };
    });

    // Meto el like en una pequeña cola para no lanzar peticiones a saco
    likeQueueRef.current += 1;
    if (likeFlightRef.current) return;

    likeFlightRef.current = true;
    (async () => {
      try {
        while (likeQueueRef.current > 0) {
          likeQueueRef.current -= 1;

          const resp = await apiToggleLike(idPub);

          const finalLiked = !!resp?.liked;
          const finalTotal = Number(resp?.total_likes ?? 0);

          // Actualizo estado con la respuesta real del backend
          setPost((prev) =>
            prev
              ? {
                  ...prev,
                  liked_by_me: finalLiked,
                  total_likes: finalTotal,
                }
              : prev
          );

          // Aviso a otras pantallas (Inicio/Perfil) de que ha cambiado el like
          bus.emit?.('post.like.changed', {
            postId: String(idPub),
            liked: finalLiked,
            total_likes: finalTotal,
          });
        }
      } finally {
        likeFlightRef.current = false;
      }
    })();
  };

  // Envío de un nuevo comentario y actualización del contador
  const enviarComentario = async () => {
    const texto = (nuevoComentario || '').trim();
    const idPub = post?.id_publicacion ?? postId;

    if (!idPub) return;
    if (!texto || sending) return;

    try {
      setSending(true);
      const resp = await apiCrearComentario(idPub, texto);
      const nuevo = resp?.data ?? resp;
      const normalizado = normalizarComentario
        ? normalizarComentario(nuevo)
        : nuevo;

      setComentarios((prev) => [...prev, normalizado]);
      setNuevoComentario('');

      // Mantengo sincronizado el total de comentarios del post
      setPost((prev) => {
        if (!prev) return prev;
        const actual =
          prev.total_comentarios ??
          prev.comments_count ??
          comentarios.length;
        return { ...prev, total_comentarios: actual + 1 };
      });

      // Notificación global para que otras pantallas puedan refrescar si quieren
      bus.emit?.('post.comment.created', {
        postId: String(idPub),
        delta: 1,
      });
    } catch (e) {
      console.error('[detalle] error enviarComentario', e);
      Alert.alert('Comentario', String(e?.message || e));
    } finally {
      setSending(false);
    }
  };

  // Derivados útiles para mostrar cabecera del post
  const nick = post?.perfil?.nick ?? 'Usuario';
  const avatar = post?.perfil?.url_avatar ?? null;
  const fecha = formatearFechaUI(post?.fecha_creacion || post?.fecha);
  const likes = post?.total_likes ?? post?.likes ?? 0;
  const nComs =
    post?.total_comentarios ??
    post?.comments_count ??
    comentarios.length ??
    0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Cabecera del detalle: back, avatar, nick y fecha/hora */}
      <View style={styles.userRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </TouchableOpacity>

        <Image
          source={avatar ? { uri: avatar } : require('@asset/perfil.png')}
          style={styles.userAvatar}
        />

        <View style={styles.userInfo}>
          <Text style={styles.userNick}>{nick}</Text>
          <Text style={styles.userDate}>
            {fecha.dia} · {fecha.hora}
          </Text>
        </View>
      </View>

      {/* Contenido + campo para escribir comentario */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={{ flex: 1 }}>
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={false} onRefresh={onRefresh} />
            }
            contentContainerStyle={{ paddingBottom: 90 }}
            contentInsetAdjustmentBehavior="never"
          >
            {/* Contenido del post (WOD o publicación normal) */}
            {renderContenidoPublicacion(post)}

            {/* Acciones: likes y número de comentarios */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={onToggleLike}>
                <Ionicons
                  name={post?.liked_by_me ? 'heart' : 'heart-outline'}
                  size={22}
                  color={post?.liked_by_me ? '#e11d48' : '#111'}
                />
                <Text style={styles.actionTxt}>{likes}</Text>
              </TouchableOpacity>

              <View style={styles.actionBtn}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={22}
                  color="#111"
                />
                <Text style={styles.actionTxt}>{nComs}</Text>
              </View>
            </View>

            {/* Listado de comentarios del post */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <Text style={styles.section}>Comentarios</Text>

              {!commentsFetched ? null : comentarios.length === 0 ? (
                <Text style={{ color: '#666' }}>Aún no hay comentarios.</Text>
              ) : (
                comentarios.map((c) => (
                  <View
                    key={
                      c.id ??
                      `${c.publicacion_id}-${c.autor_perfil_id}-${c.fecha ?? Math.random()}`
                    }
                    style={styles.comRow}
                  >
                    <Image
                      source={
                        c?.autor?.url_avatar
                          ? { uri: c.autor.url_avatar }
                          : require('@asset/perfil.png')
                      }
                      style={styles.comAvatar}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.comNick}>
                        {c?.autor?.nick || 'usuario'}
                      </Text>
                      <Text style={styles.comTxt}>
                        {c?.texto ?? c?.contenido ?? ''}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>

          {/* Caja fija de abajo para escribir y enviar un nuevo comentario */}
          <View style={styles.commentBox}>
            <TextInput
              value={nuevoComentario}
              onChangeText={setNuevoComentario}
              placeholder="Escribe un comentario..."
              placeholderTextColor="#9CA3AF"
              style={styles.commentInput}
              multiline
              returnKeyType="send"
              onSubmitEditing={enviarComentario}
            />
            <TouchableOpacity
              onPress={enviarComentario}
              disabled={sending}
              style={styles.sendBtn}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Cabecera
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: {
    marginRight: 8,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee',
  },
  userInfo: {
    flexDirection: 'column',
  },
  userNick: { 
    fontWeight: '700', 
    color: '#111', 
    marginLeft: 8,
  },
  userDate: { 
    fontSize: 12, 
    color: '#666',
    marginLeft: 8,
  },

  // Imagen principal de la publicación
  mediaWrap: { 
    position: 'relative', 
    width: '100%' 
  },
  media: { 
    width: '100%', 
    aspectRatio: 1, 
    backgroundColor: '#eee' 
  },

  // Texto de la publicación
  texto: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    color: '#111',
    lineHeight: 20,
  },

  // Likes y comentarios
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6 
  },
  actionTxt: { 
    color: '#111', 
    fontWeight: '600' 
  },

  // Sección comentarios
  section: {
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
    marginTop: 8,
  },
  comRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 10,
  },
  comAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#eee',
  },
  comNick: { 
    fontWeight: '700', 
    color: '#111' 
  },
  comTxt: { 
    color: '#111' 
  },

  // Caja de entrada de comentario
  commentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendBtn: {
    marginLeft: 8,
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  // ===== estilos WOD (mismos que en Principal) =====
  wodBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    marginHorizontal: 16,
  },
  wodTitulo: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 2,
    color: '#111827',
  },
  wodMeta: {
    color: '#6B7280',
    marginBottom: 8,
  },
  wodEjRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    columnGap: 8,
  },
  wodEjImg: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#ddd',
  },
  wodEjNombre: {
    fontWeight: '600',
    color: '#111827',
  },
  wodEjReps: {
    color: '#374151',
  },
  wodTiempo: {
    marginTop: 8,
    fontWeight: '600',
    color: '#111827',
  },
  wodComentario: {
    marginTop: 4,
    color: '#111827',
  },
});
