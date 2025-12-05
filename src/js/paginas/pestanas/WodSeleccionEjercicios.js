// Pantalla: WodSeleccionEjercicios.js
// Aquí dejo toda la lógica para buscar, filtrar, ver y seleccionar ejercicios
// para montar un WOD (libre o rondas por tiempo) a partir de la lista de ejercicios
// que viene del backend.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Image,
  StyleSheet, SafeAreaView, ActivityIndicator, Modal, Alert, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';

import { normalizarURL, getYouTubeId } from 'src/shared/utils/normalizadores';

// ==========================
// Config API
// ==========================

// Cojo la URL base de la API desde las variables de entorno
const RAW_HOST = process.env.EXPO_PUBLIC_API_URL || '';
if (!RAW_HOST) {
  // Si esto peta es porque me he olvidado de meter EXPO_PUBLIC_API_URL en el .env
  throw new Error('Falta EXPO_PUBLIC_API_URL en el .env');
}

// A partir de la URL tipo http://ip:8000/api/v1
// saco el "origen" sin /api/vX ni barras finales, para reutilizarlo
const API_ORIGIN = RAW_HOST.replace(/\/api\/v\d+.*$/, '').replace(/\/+$/, '');
// Por si quiero usar /api/v1 directamente
const API_BASE = `${API_ORIGIN}/api/v1`;

// Tipos de ejercicio que voy a usar para el filtro rápido
const TIPOS = ['sin_filtro', 'fuerza', 'funcional', 'metabolico'];
// Lista A-Z para la barra de letras
const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// ==========================
// Componente principal
// ==========================

export function WodSeleccionEjercicios({ route, navigation }) {

  // Saco parámetros de la ruta (id del WOD, modo, etc.)
  const params = route?.params ?? {};
  const wodId = params.wodId ?? params.id ?? params.wod_id ?? null;
  const { modo } = route.params ?? {};

  // Texto descriptivo según el modo de wod
  const descripcionModo = useMemo(() => {
    if (modo === 'rondas_tiempo') {
      return 'Completa las rondas y los ejercicios seleccionados en el menor tiempo posible';
    }
    // Cualquier otra cosa lo trato como WOD libre
    return 'Entrenamiento libre diseñado por el usuario';
  }, [modo]);

  // Estado de carga y error cuando traigo los ejercicios del backend
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Lista completa de ejercicios que vienen del backend
  const [ejercicios, setEjercicios] = useState([]);

  // Estado del buscador y del filtro por tipo
  const [query, setQuery] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('sin_filtro');

  // Mapa con los ejercicios seleccionados -> uso Map para mantener orden y datos extra
  const [seleccion, setSeleccion] = useState(new Map());

  // Estado para el modal de vídeo
  const [modalVisible, setModalVisible] = useState(false);
  const [videoActual, setVideoActual] = useState(null); // id de YouTube

  // Ref para poder hacer scroll programático en la FlatList (para la barra A-Z)
  const flatRef = useRef(null);

  // ========================
  // Cargar ejercicios del backend
  // ========================
  useEffect(() => {
    let cancel = false;

    (async () => {
      // ENDPOINT que da la lista de ejercicios
      const url = `${API_BASE}/ejercicios`;

      try {
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        const raw = await res.text();

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // La API puede devolver array directamente o envuelto en data
        const data = JSON.parse(raw || '[]');
        const items = (Array.isArray(data) ? data : data?.data || [])
          .map(e => ({
            // Normalizo el id desde distintas posibles claves
            id: e.id ?? e.id_ejercicio ?? e.idEjercicio,
            nombre: e.nombre,
            tipo: e.tipo ?? e.categoria,
            video_url: e.video_url ?? e.url_video,
            imagen_url: e.imagen_url ?? e.imagen,
          }))
          // Me quito cosas raras que no tengan id o nombre
          .filter(x => x.id && x.nombre);

        if (!cancel) setEjercicios(items);
      } catch (e) {
        if (!cancel) setError(e.message || String(e));
      } finally {
        if (!cancel) setCargando(false);
      }
    })();

    // Si el efecto se limpia antes de terminar, marco cancel para no setState después de desmontar
    return () => { cancel = true; };

  }, []);

  // ========================
  // Filtrado + ordenación + índice A-Z
  // ========================

  // Aplico el filtro por tipo y el texto del buscador
  const listaFiltrada = useMemo(() => {
    const q = query.trim().toLowerCase();

    return ejercicios
      .filter(e =>
        (filtroTipo === 'sin_filtro' || e.tipo === filtroTipo) &&
        (!q || e.nombre.toLowerCase().includes(q))
      )
      // Los ordeno alfabéticamente por nombre
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [ejercicios, filtroTipo, query]);

  // Índice por letra para poder saltar rápido desde la barra A-Z
  const indexPorLetra = useMemo(() => {
    const mapa = {};
    AZ.forEach(l => (mapa[l] = -1));

    listaFiltrada.forEach((e, idx) => {
      const inicial = (e.nombre?.[0] || '').toUpperCase();
      if (AZ.includes(inicial) && mapa[inicial] === -1) {
        mapa[inicial] = idx;
      }
    });

    return mapa;
  }, [listaFiltrada]);

  // Salto a la primera posición de la letra pulsada
  const irALetra = (letra) => {
    const idx = indexPorLetra[letra];
    if (idx >= 0 && flatRef.current) {
      flatRef.current.scrollToIndex({ index: idx, animated: true });
    }
  };

  // ========================
  // Selección de ejercicios
  // ========================
  const toggleSeleccion = (item) => {
    setSeleccion(prev => {
      // Clono el Map anterior para no mutarlo directamente
      const nuevo = new Map(prev);

      // Si ya está seleccionado, lo quito
      if (nuevo.has(item.id)) {
        nuevo.delete(item.id);
      } else {
        // Si no está, lo añado con un objeto con info que reutilizo luego en la config del WOD
        nuevo.set(item.id, {
          ejercicio_id: item.id,
          orden: nuevo.size + 1, // orden según el momento en que se añade
          rondas: null,
          repeticiones: null,
          tiempo_segundos: null,
          meta: {
            nombre: item.nombre,
            imagen_url: item.imagen_url,
          },
        });
      }

      // Re-ordeno todos los elementos para que el orden sea consecutivo (1,2,3...)
      let i = 1;
      for (const k of nuevo.keys()) {
        nuevo.get(k).orden = i++;
      }

      return nuevo;
    });
  };

  // ========================
  // Modal info (vídeo YouTube)
  // ========================
  const abrirInfo = (item) => {
    // Extraigo el id de YouTube desde una URL (uso helper)
    const id = getYouTubeId(item?.video_url);

    if (id) {
      setVideoActual(id);
      setModalVisible(true);
    } else {
      Alert.alert('Sin vídeo', 'Este ejercicio no tiene un enlace de YouTube válido.');
    }
  };

  // ========================
  // Crear plan (botón abajo)
  // ========================
  const handleCrearPlan = () => {
    // Si no hay nada seleccionado, aviso y no hago nada
    if (seleccion.size === 0) {
      Alert.alert('Selecciona ejercicios', 'Debes seleccionar al menos un ejercicio.');
      return;
    }

    // Paso todos los ejercicios seleccionados a un array para mandarlos a la siguiente pantalla
    const ejerciciosSeleccionados = Array.from(seleccion.values());

    // Decido a qué pantalla navegar según el tipo de WOD
    const destino =
      modo === 'rondas_tiempo'
        ? 'Inicio_WodRondasConfig'
        : 'Inicio_WodLibreConfig';

    // Navego a la pantalla de configuración, llevando el modo, id del WOD y los ejercicios elegidos
    navigation.navigate(destino, {
      modo,
      wodId,
      ejercicios: ejerciciosSeleccionados,
    });
  };

  // ========================
  // Render de cada card de ejercicio
  // ========================
  const renderItem = ({ item }) => {
    const activo = seleccion.has(item.id);

    return (
      <View style={styles.cardWrap}>
        {/* Título con el nombre del ejercicio */}
        <Text style={styles.cardTitle}>{(item.nombre || '').toUpperCase()}</Text>

        {/* Card principal: imagen + selección */}
        <TouchableOpacity
          style={[styles.card, activo && styles.cardActivo]}
          onPress={() => toggleSeleccion(item)}
          activeOpacity={0.9}
        >
          {/* Imagen del ejercicio */}
          <Image
            source={{ uri: normalizarURL(item?.imagen_url) }}
            style={styles.cardImg}
            resizeMode="cover"
          />

          {/* Botón de info para ver el vídeo del ejercicio */}
          <TouchableOpacity
            style={styles.infoBtn}
            onPress={() => abrirInfo(item)}
          >
            <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
          </TouchableOpacity>

          {/* Check superpuesto cuando el ejercicio está seleccionado */}
          {activo && (
            <View style={styles.checkOverlay}>
              <Ionicons name="checkmark-circle" size={26} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // getItemLayout para optimizar scroll y poder usar scrollToIndex sin saltos raros
  const getItemLayout = (_, index) => {
    const rowIndex = Math.floor(index / NUM_COLS);
    const rowHeight = CARD_BLOCK_H + GRID_GAP;
    return {
      length: rowHeight,
      offset: rowHeight * rowIndex,
      index,
    };
  };

  // ========================
  // Estados de carga / error
  // ========================
  if (cargando) {
    // Mientras cargo los ejercicios, enseño el header y un spinner
    return (
      <SafeAreaView style={styles.container}>
        <CabeceraSeleccion
          wodId={wodId}
          seleccionCount={seleccion.size}
          description={descripcionModo}
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 8, color: '#555' }}>Cargando ejercicios…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    // Si algo falla al cargar la lista, muestro el mensaje de error
    return (
      <SafeAreaView style={styles.container}>
        <CabeceraSeleccion
          wodId={wodId}
          seleccionCount={seleccion.size}
          description={descripcionModo}
        />
        <View style={{ padding: 16 }}>
          <Text style={{ color: 'tomato', fontWeight: 'bold' }}>Error</Text>
          <Text style={{ color: '#333' }}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ========================
  // Render principal
  // ========================
  return (
    <SafeAreaView style={styles.container}>
      {/* Cabecera con resumen del WOD / fecha / seleccionados */}
      <CabeceraSeleccion
        wodId={wodId}
        seleccionCount={seleccion.size}
        description={descripcionModo}
      />

      {/* Fila con buscador y filtro por tipo */}
      <View style={styles.filtrosRow}>
        {/* Buscador de ejercicios por nombre */}
        <View style={styles.inputWrap}>
          <Ionicons
            name="search"
            size={18}
            color="#999"
            style={{ marginHorizontal: 8 }}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar ejercicios"
            placeholderTextColor="#9aa0a6"
            style={styles.input}
          />
        </View>

        {/* Botón de filtro cíclico por tipo de ejercicio */}
        <TouchableOpacity
          style={styles.selectBtn}
          onPress={() => {
            // Voy cambiando entre los valores del array TIPOS
            const i = TIPOS.indexOf(filtroTipo);
            const next = TIPOS[(i + 1) % TIPOS.length];
            setFiltroTipo(next);
          }}
        >
          <Text style={styles.selectText}>
            {filtroTipo === 'sin_filtro'
              ? 'Sin filtrar'
              : `Tipo: ${capitalize(filtroTipo)}`}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#111" />
        </TouchableOpacity>
      </View>

      {/* Barra A-Z para saltar rápidamente a ejercicios por inicial */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.azBar}
        contentContainerStyle={styles.azBarContent}
      >
        {AZ.map(l => (
          <TouchableOpacity
            key={l}
            onPress={() => irALetra(l)}
            style={styles.azItem}
          >
            <Text
              style={
                indexPorLetra[l] >= 0 ? styles.azText : styles.azTextMuted
              }
            >
              {l}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Grid principal de ejercicios */}
      <FlatList
        ref={flatRef}
        data={listaFiltrada}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        onScrollToIndexFailed={({ index }) => {
          // Si scrollToIndex falla, reintento con requestAnimationFrame
          requestAnimationFrame(() => {
            flatRef.current?.scrollToIndex({ index, animated: true });
          });
        }}
        numColumns={NUM_COLS}
        columnWrapperStyle={{ gap: GRID_GAP, paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 120, rowGap: GRID_GAP }}
        getItemLayout={getItemLayout}
        initialNumToRender={16}
      />

      {/* Barra inferior con resumen selección + botón Crear plan */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomCenter}>
          <Text style={styles.countNumber}>{seleccion.size}</Text>
          <Text style={styles.countLabel}>Seleccionados</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.bottomRight,
            seleccion.size === 0 && { opacity: 0.4 },
          ]}
          disabled={seleccion.size === 0}
          onPress={handleCrearPlan}
        >
          <Text style={styles.bottomGo}>Crear plan</Text>
          <Ionicons name="arrow-forward-circle" size={24} />
        </TouchableOpacity>
      </View>

      {/* Modal con el vídeo de YouTube del ejercicio */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <Text style={styles.modalTitle}>Vídeo del ejercicio</Text>

          {videoActual ? (
            <View style={styles.playerWrap}>
              <YoutubePlayer
                height={220}
                play={true}
                videoId={videoActual}
                webViewProps={{
                  allowsInlineMediaPlayback: true,
                  allowsFullscreenVideo: true,
                }}
                onError={(e) => {
                  console.warn('YT error', e);
                  Alert.alert(
                    'Vídeo no disponible',
                    'Este vídeo no permite reproducción embebida.'
                  );
                }}
              />
            </View>
          ) : (
            <Text style={{ color: '#333' }}>No hay vídeo disponible.</Text>
          )}

          <TouchableOpacity
            style={styles.cerrarBtn}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.cerrarText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ========================
// Cabecera con resumen
// ========================
function CabeceraSeleccion({ wodId, seleccionCount, description }) {
  // Fecha actual formateada en ES
  const hoy = new Date();
  const fecha = hoy.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <View style={styles.header}>
      <Text style={styles.headerTitulo}>Prepara tu entrenamiento</Text>

      {description ? (
        <Text style={styles.headerDescription}>{description}</Text>
      ) : null}

      <Text style={styles.headerSub}>
        {fecha} • WOD #{wodId ?? '—'} • Seleccionados: {seleccionCount}
      </Text>
    </View>
  );
}

// Helper sencillo para poner la primera letra en mayúscula
const capitalize = (s) => s?.charAt(0).toUpperCase() + s?.slice(1);

// ===== Constantes de layout para la rejilla =====
const NUM_COLS = 2;
const GRID_GAP = 18;
const CARD_IMG_H = 180;
const CARD_BLOCK_H = CARD_IMG_H + 42;

// ========================
// Estilos
// ========================
const styles = StyleSheet.create({
  // Contenedor general de la pantalla
  container: {
    flex: 1,
    backgroundColor: '#f5f6f7',
  },

  // Cabecera superior con título, descripción y meta info
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  headerTitulo: {
    fontWeight: '800',
    letterSpacing: 0.3,
    fontSize: 16,
    color: '#0f1419',
  },
  headerDescription: {
    color: '#5b7083',
    marginTop: 2,
  },
  headerSub: {
    color: '#5b7083',
    marginTop: 4,
  },

  // Fila buscador + filtro
  filtrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  // Contenedor del input de búsqueda
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  // Input de texto del buscador
  input: {
    flex: 1,
    paddingVertical: 8,
    paddingRight: 10,
    color: '#111',
  },

  // Botón de selección de tipo de ejercicio
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectText: {
    color: '#111',
  },

  // Barra A-Z superior
  azBar: {
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    height: 48,
  },
  azBarContent: {
    alignItems: 'center',
    paddingVertical: 6,
    gap: 14,
  },
  azItem: {
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  azText: {
    color: '#111',
    fontWeight: '700',
    letterSpacing: 1.2,
    fontSize: 18,
    lineHeight: 24,
  },
  azTextMuted: {
    color: '#cbd5e1',
    fontWeight: '700',
    letterSpacing: 1.2,
    fontSize: 18,
    lineHeight: 24,
  },

  // Wrapper de cada card en la rejilla
  cardWrap: {
    flex: 1 / NUM_COLS,
  },
  // Título encima de la imagen del ejercicio
  cardTitle: {
    marginTop: 16,
    marginBottom: 10,
    marginHorizontal: 2,
    fontSize: 16,
    fontWeight: '800',
    color: '#202124',
    letterSpacing: 0.8,
  },
  // Card con la imagen
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    height: CARD_IMG_H,
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  // Estado visual cuando la card está seleccionada
  cardActivo: {
    borderWidth: 2,
    borderColor: '#20B2AA',
  },
  // Imagen de la card
  cardImg: {
    width: '100%',
    height: '100%',
  },

  // Botón de info (abrir vídeo) arriba a la derecha
  infoBtn: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    padding: 6,
  },
  // Overlay con check cuando el ejercicio está seleccionado
  checkOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(32,178,170,0.9)',
    borderRadius: 20,
    padding: 2,
  },

  // Barra inferior fija con contador + botón
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  // Centro de la barra inferior (contador)
  bottomCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  countNumber: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 30,
  },
  countLabel: {
    marginTop: 2,
    color: '#6b7280',
  },

  // Zona derecha de la barra inferior (botón crear plan)
  bottomRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomGo: {
    fontWeight: '700',
  },

  // Fondo y contenido del modal de vídeo
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalTitle: {
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 10,
    color: '#111',
  },
  playerWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
  },
  cerrarBtn: {
    alignSelf: 'flex-end',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#111827',
    borderRadius: 8,
  },
  cerrarText: {
    color: '#fff',
    fontWeight: '700',
  },
});
