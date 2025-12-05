import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';

import { apiFetch, BASE_URL } from '@api/baseApi';
import { normalizarURL, getYouTubeId } from 'src/shared/utils/normalizadores';

// Origen del backend (lo uso para montar correctamente las rutas de imágenes tipo /storage/...)
const API_HOST = process.env.EXPO_PUBLIC_API_URL || BASE_URL || '';
const API_ORIGIN = API_HOST.replace(/\/api\/v\d+.*$/, '');

// Normalizo las rutas de imagen que vienen de Laravel (con barras raras, /storage/public, etc.)
function normalizarRutaImagen(path) {
  if (!path) return null;

  let img = String(path)
    .replace(/\\/g, '/') // cambio barras invertidas por barras normales
    .replace(/^\/+/, '/') // quito barras duplicadas al inicio
    .replace(/^\/storage\/public\//, '/storage/'); // adapto la ruta pública de Laravel

  if (!img) return null;

  // Si ya viene una URL absoluta (Cloudinary, etc.), la devuelvo tal cual
  if (img.startsWith('http://') || img.startsWith('https://')) {
    return img;
  }
  // Si es una ruta relativa, la engancho al origen del backend
  return `${API_ORIGIN}${img}`;
}

export function ListadoEjercicios({ navigation }) {
  // Estado general de la pantalla: carga, error y lista de ejercicios
  const [estado, setEstado] = useState({
    loading: true,
    error: null,
    ejercicios: [],
  });

  // Estado del modal de vídeo
  const [videoState, setVideoState] = useState({
    visible: false,
    videoId: null,
    url: null,
    titulo: '',
  });

  const cerrarModalVideo = () =>
    setVideoState((v) => ({ ...v, visible: false }));

  // Llamada a la API para traer todos los ejercicios
  const cargarEjercicios = useCallback(async () => {
    try {
      // Pongo loading a true y limpio errores previos
      setEstado((s) => ({ ...s, loading: true, error: null }));

      const resp = await apiFetch('/ejercicios', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      // La API a veces devuelve { data: [...] } y otras veces un array plano, lo controlo aquí
      const lista = Array.isArray(resp?.data)
        ? resp.data
        : Array.isArray(resp)
        ? resp
        : [];

      // Guardo la lista en estado y apago el loading
      setEstado({ loading: false, error: null, ejercicios: lista });
    } catch (e) {
      // Si algo falla, lo dejo logueado y muestro mensaje de error en la UI
      console.error('[LISTADO EJERCICIOS] error', e);
      setEstado({
        loading: false,
        error: e?.message || 'Error al cargar los ejercicios',
        ejercicios: [],
      });
    }
  }, []);

  // Cargo los ejercicios una sola vez al entrar en la pantalla
  useEffect(() => {
    cargarEjercicios();
  }, [cargarEjercicios]);

  // Abrir vídeo (YouTube en modal o navegador externo)
  const abrirVideo = (video, nombre) => {
    if (!video) return;

    const urlNormalizada = normalizarURL(video);
    const videoId = getYouTubeId(urlNormalizada);

    if (videoId) {
      setVideoState({
        visible: true,
        videoId,
        url: urlNormalizada,
        titulo: nombre || 'Vídeo ejercicio',
      });
      return;
    }

    // Si no se puede obtener id de YouTube, abro la URL fuera
    Linking.openURL(urlNormalizada).catch(() => {
      Alert.alert('Error', 'No se pudo abrir el vídeo.');
    });
  };

  // Cómo pinto cada tarjeta de ejercicio en la lista
  const renderItem = useCallback(({ item }) => {
    const nombre = item.nombre || item.nombre_ejercicio || 'Ejercicio';
    const grupo = item.grupo_muscular || item.musculo || '';
    const video = item.video_url || item.url_video || null;
    const img = normalizarRutaImagen(item.imagen_url || item.imagen || null);

    return (
      <View style={styles.card}>
        {/* Cabecera de la tarjeta: icono + nombre + grupo muscular */}
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <Ionicons name="barbell-outline" size={18} color="#20B2AA" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{nombre}</Text>
            {!!grupo && <Text style={styles.cardSub}>{grupo}</Text>}
          </View>
        </View>

        {/* Imagen del ejercicio, si viene definida */}
        {img && (
          <Image
            source={{ uri: img }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        )}

        {/* Botón para ver el vídeo */}
        {!!video && (
          <TouchableOpacity
            style={styles.videoBtn}
            onPress={() => abrirVideo(video, nombre)}
          >
            <Ionicons name="play-circle-outline" size={18} color="#0F172A" />
            <Text style={styles.videoBtnText}>Ver vídeo</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, []);

  const { loading, error, ejercicios } = estado;

  return (
    <SafeAreaView style={styles.container}>
      {/* StatusBar acorde con el fondo oscuro de la cabecera */}
      <StatusBar
        barStyle={Platform.OS === 'ios' ? 'light-content' : 'light-content'}
        backgroundColor="#1C2A34"
      />

      {/* Cabecera superior con botón atrás y título */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Listado de ejercicios</Text>
        {/* Spacer para equilibrar el layout de la cabecera */}
        <View style={{ width: 32 }} />
      </View>

      {/* Contenido principal de la pantalla */}
      <View style={styles.content}>
        {/* Estado: cargando */}
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#20B2AA" />
            <Text style={styles.loadingText}>Cargando ejercicios…</Text>
          </View>
        )}

        {/* Estado: error al cargar */}
        {!loading && error && (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={cargarEjercicios}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Estado: sin ejercicios */}
        {!loading && !error && ejercicios.length === 0 && (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No hay ejercicios registrados.</Text>
          </View>
        )}

        {/* Estado: lista con ejercicios */}
        {!loading && !error && ejercicios.length > 0 && (
          <FlatList
            data={ejercicios}
            keyExtractor={(item, idx) =>
              String(item.id_ejercicio ?? item.id ?? idx)
            }
            renderItem={renderItem}
            // Ajustes de rendimiento de FlatList para listas largas
            initialNumToRender={8}
            maxToRenderPerBatch={10}
            windowSize={7}
            contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 16 }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Modal de vídeo */}
      <Modal
        visible={videoState.visible}
        animationType="fade"
        transparent
        onRequestClose={cerrarModalVideo}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {videoState.titulo || 'Vídeo ejercicio'}
              </Text>
              <TouchableOpacity onPress={cerrarModalVideo} hitSlop={8}>
                <Ionicons name="close" size={22} color="#F9FAFB" />
              </TouchableOpacity>
            </View>

            {!!videoState.videoId && (
              <YoutubePlayer
                height={220}
                play={true}
                videoId={videoState.videoId}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    height: 60,
    backgroundColor: '#1C2A34',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.6)',
  },
  headerTitle: {
    color: '#E5E7EB',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 10,
    color: '#9CA3AF',
  },
  errorText: {
    color: '#FCA5A5',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyText: {
    color: '#9CA3AF',
  },

  card: {
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    columnGap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#F9FAFB',
    fontSize: 15,
    fontWeight: '700',
  },
  cardSub: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  cardImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  videoBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    backgroundColor: '#20B2AA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  videoBtnText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 13,
  },
  retryBtn: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#20B2AA',
  },
  retryText: {
    color: '#E5E7EB',
    fontWeight: '600',
  },

  // Modal vídeo
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#020617',
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
});
