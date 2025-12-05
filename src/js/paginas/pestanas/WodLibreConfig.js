// Pantalla de configuración y publicación para un WOD de tipo "Entrenamiento libre"
import React, { useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';

// Servicios para guardar el plan del WOD y publicarlo en la red social
import { adjuntarEjercicios, publicarWod } from '@api/wodService';
// Normalizador de URLs de imágenes / vídeos
import { normalizarURL } from 'src/shared/utils/normalizadores';
// Bus de eventos global para notificar a otras pantallas (Perfil, Principal, etc.)
import { bus } from '@util/eventBus';

export function WodLibreConfig({ route, navigation }) {
  // Recibimos desde la ruta el id del WOD y la lista de ejercicios seleccionados
  const { wodId, ejercicios = [] } = route.params ?? {};

  // Número de rondas totales del WOD (global para todos los ejercicios)
  const [rondas, setRondas] = useState('');

  // Estado para las repeticiones por ejercicio: array paralelo a "ejercicios"
  // Cada entrada tiene: { ejercicio_id, repeticiones }
  const [reps, setReps] = useState(
    ejercicios.map((e) => ({ ejercicio_id: e.ejercicio_id, repeticiones: '' }))
  );

  // step decide qué pantalla mostramos:
  // - 'config'  → configuración (rondas + reps)
  // - 'resumen' → resumen + tiempo + comentarios + publicar
  const [step, setStep] = useState('config');

  // Campos del formulario de publicación del WOD
  const [comentarios, setComentarios] = useState('');
  const [minutos, setMinutos] = useState('');
  const [segundos, setSegundos] = useState('');

  // Estado para mostrar el modal con la info / vídeo de un ejercicio
  const [videoVisible, setVideoVisible] = useState(false);
  const [ejercicioSeleccionado, setEjercicioSeleccionado] = useState(null);

  // Control de teclado / focus para gestionar mejor el scroll y KeyboardAvoidingView
  const [inputActivo, setInputActivo] = useState(null);
  const scrollRef = useRef(null);
  const comentarioRef = useRef(null);

  // Solo usamos KeyboardAvoidingView en iOS y cuando el input activo es "comentarios"
  const usarAvoid =
    Platform.OS === 'ios' && inputActivo === 'comentarios';

  // Mapa id_ejercicio → repeticiones
  // Se recalcula solo cuando cambia "reps"
  const mapReps = useMemo(() => {
    const m = new Map();
    reps.forEach((r) => m.set(r.ejercicio_id, r.repeticiones));
    return m;
  }, [reps]);

  // Actualiza las repeticiones de un ejercicio concreto
  // y limpia cualquier carácter no numérico
  const onChangeRep = (id, value) => {
    setReps((prev) =>
      prev.map((r) =>
        r.ejercicio_id === id
          ? { ...r, repeticiones: value.replace(/\D+/g, '') }
          : r
      )
    );
  };

  // Valida los datos y "crea" el entrenamiento en el backend
  // (realmente adjunta los ejercicios al WOD plan en la BBDD)
  const crearEntrenamiento = async () => {
    const r = Number(rondas);

    // Validación básica de rondas
    if (!r || r <= 0) {
      return Alert.alert('Rondas', 'Introduce las rondas (número > 0).');
    }

    // Validación de repeticiones de cada ejercicio
    for (const e of ejercicios) {
      const val = Number(mapReps.get(e.ejercicio_id));
      if (!val || val <= 0) {
        return Alert.alert(
          'Repeticiones',
          `Introduce repeticiones para ${e?.meta?.nombre || 'un ejercicio'}.`
        );
      }
    }

    try {
      // Payload con la estructura que espera el backend
      const payload = ejercicios.map((e, i) => ({
        ejercicio_id: e.ejercicio_id,               // id del ejercicio
        orden: i + 1,                               // orden dentro del WOD
        rondas: r,                                  // rondas globales
        repeticiones: Number(mapReps.get(e.ejercicio_id)), // reps por ejercicio
        tiempo_segundos: null,                      // en WOD libre no usamos tiempo por ejercicio
      }));

      // Llamada al servicio para adjuntar ejercicios
      await adjuntarEjercicios({ wodId, ejercicios: payload });

      // Pasamos al paso de resumen (tiempo + comentarios + publicar)
      setStep('resumen');
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo crear el entrenamiento.');
    }
  };

  // Publica el WOD realizado en la red social del usuario
  const publicar = async () => {
    // Normalizamos minutos y segundos a enteros
    const mm = parseInt(minutos || '0', 10);
    const ss = parseInt(segundos || '0', 10);

    // Validación de tiempo:
    // - al menos uno de los dos (mm o ss) debe ser > 0
    // - los segundos deben estar entre 0 y 59
    if ((mm <= 0 && ss <= 0) || ss > 59) {
      return Alert.alert(
        'Tiempo realizado',
        'Introduce un tiempo válido (segundos entre 0 y 59).'
      );
    }

    // Tiempo total en segundos para guardar en la BBDD
    const totalSegundos = mm * 60 + ss;

    // Llamada a la API de publicación de WOD
    const res = await publicarWod({
      wodPlan: { id: wodId },
      tiempo_realizado: totalSegundos,
      comentarios,
      // Primer ejercicio para usar sus datos como miniatura en el feed (si procede)
      primerEjercicio: ejercicios?.[0]?.meta || null,
    });

    if (res.ok) {
      Alert.alert('Publicado', 'Tu entrenamiento ha sido registrado.');

      // Emitimos evento global para refrescar perfil (y lo que escuches desde ahí)
      bus.emit('perfil.refresh');

      // Navegamos a la pestaña de Perfil y forzamos un reload con _ts
      navigation.getParent()?.navigate('Perfil', { _ts: Date.now() });
    } else {
      Alert.alert('Error', res.error || 'No se pudo publicar.');
    }
  };

  // =========================
  // Paso 2: Resumen + publicar
  // =========================
  if (step === 'resumen') {
    return (
      <SafeAreaView style={styles.wrapper}>
        {/* Ajusta el contenido cuando el teclado está visible (iOS) */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={usarAvoid ? 'padding' : undefined}
          keyboardVerticalOffset={usarAvoid ? 80 : 0}
        >
          {/* Cierra el teclado al pulsar fuera de los inputs */}
          <TouchableWithoutFeedback
            onPress={() => {
              Keyboard.dismiss();
              setInputActivo(null);
            }}
          >
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Cabecera del resumen del WOD */}
              <Text style={styles.title}>Entrenamiento libre</Text>
              <Text style={styles.meta}>WOD #{wodId} • Rondas: {rondas}</Text>

              {/* Modal con info del ejercicio + imagen + botón ver vídeo */}
              <Modal
                visible={videoVisible && !!ejercicioSeleccionado}
                transparent
                animationType="slide"
                onRequestClose={() => {
                  setVideoVisible(false);
                  setEjercicioSeleccionado(null);
                }}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>
                      {ejercicioSeleccionado?.meta?.nombre?.toUpperCase()}
                    </Text>

                    {/* Imagen del ejercicio en grande */}
                    <Image
                      source={{
                        uri: normalizarURL(
                          ejercicioSeleccionado?.meta?.imagen_url
                        ),
                      }}
                      style={styles.modalImage}
                    />

                    {/* Botón para abrir el vídeo del ejercicio en el navegador / YouTube */}
                    <TouchableOpacity
                      style={styles.modalButton}
                      onPress={() => {
                        const url = normalizarURL(
                          ejercicioSeleccionado?.meta?.video_url
                        );
                        if (url) {
                          Linking.openURL(url);
                        } else {
                          Alert.alert(
                            'Vídeo',
                            'Este ejercicio no tiene vídeo configurado.'
                          );
                        }
                      }}
                    >
                      <Text style={styles.modalButtonText}>Ver vídeo</Text>
                    </TouchableOpacity>

                    {/* Botón para cerrar el modal */}
                    <TouchableOpacity
                      style={[
                        styles.modalButton,
                        { backgroundColor: '#e5e7eb', marginTop: 8 },
                      ]}
                      onPress={() => {
                        setVideoVisible(false);
                        setEjercicioSeleccionado(null);
                      }}
                    >
                      <Text
                        style={[styles.modalButtonText, { color: '#111827' }]}
                      >
                        Cerrar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>

              {/* Listado de ejercicios con reps ya configuradas */}
              {ejercicios.map((e) => (
                <TouchableOpacity
                  key={e.ejercicio_id}
                  style={styles.card}
                  onPress={() => {
                    // Al pulsar sobre un ejercicio, abrimos el modal de vídeo
                    setEjercicioSeleccionado(e);
                    setVideoVisible(true);
                  }}
                >
                  {/* Miniatura del ejercicio */}
                  <Image
                    source={{ uri: normalizarURL(e?.meta?.imagen_url) }}
                    style={styles.thumb}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>
                      {e?.meta?.nombre?.toUpperCase() ||
                        `Ejercicio ${e.ejercicio_id}`}
                    </Text>
                    <Text style={styles.small}>
                      Reps: {mapReps.get(e.ejercicio_id)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Sección de tiempo realizado (minutos / segundos) */}
              <View style={styles.inputRowCol}>
                <Text style={styles.label}>Tiempo realizado</Text>

                <View style={styles.tiempoRow}>
                  {/* Minutos */}
                  <TextInput
                    style={styles.cajaTiempo}
                    keyboardType="numeric"
                    maxLength={2}
                    value={minutos}
                    onChangeText={(t) =>
                      setMinutos(t.replace(/\D+/g, ''))
                    }
                    placeholder="00"
                    placeholderTextColor="#9ca3af"
                    onFocus={() => setInputActivo('minutos')}
                  />

                  <Text style={styles.dosPuntos}>:</Text>

                  {/* Segundos */}
                  <TextInput
                    style={styles.cajaTiempo}
                    keyboardType="numeric"
                    maxLength={2}
                    value={segundos}
                    onChangeText={(t) =>
                      setSegundos(t.replace(/\D+/g, ''))
                    }
                    placeholder="00"
                    placeholderTextColor="#9ca3af"
                    onFocus={() => setInputActivo('segundos')}
                  />
                </View>
              </View>

              {/* Sección de comentarios finales sobre el WOD */}
              <View style={styles.inputRowCol}>
                <Text style={styles.label}>Comentarios</Text>
                <TextInput
                  ref={comentarioRef}
                  value={comentarios}
                  onChangeText={setComentarios}
                  style={[
                    styles.input,
                    { height: 90, textAlignVertical: 'top' },
                  ]}
                  multiline
                  placeholder="¿Cómo te fue el WOD?"
                  placeholderTextColor="#222"
                  onFocus={() => {
                    setInputActivo('comentarios');

                    // Truco para desplazar el scroll y que el input no quede tapado por el teclado
                    setTimeout(() => {
                      if (comentarioRef.current && scrollRef.current) {
                        comentarioRef.current.measureLayout(
                          scrollRef.current,
                          (x, y, width, height) => {
                            scrollRef.current.scrollTo({
                              y: y - 80, // margen de seguridad
                            });
                          },
                          () => {}
                        );
                      }
                    }, 200);
                  }}
                />
              </View>

              {/* Botón final para publicar el WOD realizado */}
              <TouchableOpacity style={styles.cta} onPress={publicar}>
                <Text style={styles.ctaText}>Publicar</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // =========================
  // Paso 1: Configuración WOD
  // =========================
  return (
    <SafeAreaView style={styles.wrapper}>
      {/* Cabecera de la pantalla de configuración */}
      <Text style={styles.title}>Configurar • Entrenamiento libre</Text>
      <Text style={styles.meta}>WOD #{wodId}</Text>

      {/* Input para rondas totales del WOD */}
      <View style={styles.inputRow}>
        <Text style={styles.label}>Rondas totales</Text>
        <TextInput
          value={rondas}
          onChangeText={(t) => setRondas(t.replace(/\D+/g, ''))}
          keyboardType="numeric"
          style={styles.input}
          placeholder="ej: 5"
          placeholderTextColor="#221"
        />
      </View>

      {/* Listado de ejercicios con inputs de repeticiones */}
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.label}>Repeticiones</Text>
        {ejercicios.map((e) => (
          <View key={e.ejercicio_id} style={styles.card}>
            {/* Miniatura del ejercicio */}
            <Image
              source={{ uri: normalizarURL(e?.meta?.imagen_url) }}
              style={styles.thumb}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {e?.meta?.nombre?.toUpperCase() ||
                  `Ejercicio ${e.ejercicio_id}`}
              </Text>
              <Text style={styles.small}>Introduce repeticiones</Text>

              {/* Input de reps por ejercicio */}
              <TextInput
                value={String(mapReps.get(e.ejercicio_id) || '')}
                onChangeText={(t) => onChangeRep(e.ejercicio_id, t)}
                keyboardType="numeric"
                style={[styles.input, { marginTop: 6 }]}
                placeholder="ej: 12"
                placeholderTextColor="#221"
              />
            </View>
          </View>
        ))}

        {/* Botón para guardar configuración y pasar al resumen */}
        <TouchableOpacity style={styles.cta} onPress={crearEntrenamiento}>
          <Text style={styles.ctaText}>Crear entrenamiento</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// =========================
// Estilos de la pantalla
// =========================
const styles = StyleSheet.create({
  // Contenedor principal de la pantalla
  wrapper: {
    flex: 1,
    backgroundColor: '#f6f7fb',
    padding: 16,
  },

  // Título principal (Configuración / Resumen)
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f1419',
  },

  // Texto meta bajo el título (id del WOD, rondas, etc.)
  meta: {
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 10,
  },

  // Tarjeta de ejercicio
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 10,
  },

  // Miniatura de la imagen del ejercicio
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#ddd',
  },

  // Nombre del ejercicio
  name: {
    fontWeight: '800',
    color: '#111',
  },

  // Texto auxiliar (descripciones breves)
  small: {
    color: '#6b7280',
    marginTop: 2,
  },

  // Contenedor de fila para un input (label + input)
  inputRow: {
    marginTop: 8,
    marginBottom: 6,
  },

  // Contenedor columna para inputs apilados
  inputRowCol: {
    marginTop: 8,
    marginBottom: 6,
  },

  // Label de campo
  label: {
    fontWeight: '700',
    color: '#111',
    marginBottom: 6,
  },

  // Input genérico (rondas, reps, comentarios, etc.)
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  // Botón principal (CTA) como "Crear entrenamiento" / "Publicar"
  cta: {
    marginTop: 8,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },

  // Texto del botón principal
  ctaText: {
    color: '#fff',
    fontWeight: '800',
  },

  // Fila para los inputs de tiempo (MM:SS)
  tiempoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },

  // Caja de tiempo para minutos / segundos
  cajaTiempo: {
    width: 70,
    height: 48,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
  },

  // Separador ":" entre minutos y segundos
  dosPuntos: {
    marginHorizontal: 8,
    fontSize: 24,
    fontWeight: '700',
  },

  // Fondo semi-transparente del modal de vídeo
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Contenedor del contenido del modal
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },

  // Título del modal (nombre del ejercicio)
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },

  // Imagen grande del ejercicio dentro del modal
  modalImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },

  // Botón dentro del modal (Ver vídeo / Cerrar)
  modalButton: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },

  // Texto de los botones del modal
  modalButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
