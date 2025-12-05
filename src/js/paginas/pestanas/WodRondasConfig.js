// WodRondasConfig.js
import React, { useMemo, useState } from 'react';
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
} from 'react-native';

// Servicios para adjuntar ejercicios y publicar
import { adjuntarEjercicios, publicarWod } from '@api/wodService';
import { normalizarURL } from 'src/shared/utils/normalizadores';

// Pantalla de configuración de WOD por rondas con tiempo global
export function WodRondasConfig({ route, navigation }) {

  // Recibo el ID del WOD y la lista de ejercicios seleccionados previamente
  const { wodId, ejercicios = [] } = route.params ?? {};

  // Tiempo total para TODAS las rondas (en segundos)
  const [tiempoGlobal, setTiempoGlobal] = useState('');

  // Repeticiones para cada ejercicio
  const [reps, setReps] = useState(
    ejercicios.map((e) => ({
      ejercicio_id: e.ejercicio_id,
      repeticiones: '',
    }))
  );

  // Paso de la pantalla: configuración inicial o resumen
  const [step, setStep] = useState('config'); // 'config' | 'resumen'

  // Campos de publicación
  const [comentarios, setComentarios] = useState('');
  const [minutos, setMinutos] = useState('');
  const [segundos, setSegundos] = useState('');

  // Creo un Map para acceder a reps en O(1)
  const mapReps = useMemo(() => {
    const m = new Map();
    reps.forEach((r) => m.set(r.ejercicio_id, r.repeticiones));
    return m;
  }, [reps]);

  // Cambio de reps con sanitización para permitir solo números
  const onChangeRep = (id, value) => {
    setReps((prev) =>
      prev.map((r) =>
        r.ejercicio_id === id
          ? { ...r, repeticiones: value.replace(/\D+/g, '') }
          : r
      )
    );
  };

  // Crear entrenamiento: valida datos y envía los ejercicios al backend
  const crearEntrenamiento = async () => {
    const t = Number(tiempoGlobal);

    // Validación del tiempo global
    if (!t || t <= 0) {
      return Alert.alert(
        'Tiempo',
        'Introduce el tiempo (segundos > 0).'
      );
    }

    // Validación de reps ejercicio por ejercicio
    for (const e of ejercicios) {
      const val = Number(mapReps.get(e.ejercicio_id));
      if (!val || val <= 0) {
        return Alert.alert(
          'Repeticiones',
          `Introduce repeticiones para ${
            e?.meta?.nombre || 'un ejercicio'
          }.`
        );
      }
    }

    try {
      // Estructura de payload para API
      const payload = ejercicios.map((e, i) => ({
        ejercicio_id: e.ejercicio_id,
        orden: i + 1,
        rondas: null,               // en este modo NO hay rondas
        repeticiones: Number(mapReps.get(e.ejercicio_id)),
        tiempo_segundos: t,         // tiempo global
      }));

      // Envío al backend
      await adjuntarEjercicios({ wodId, ejercicios: payload });

      // Paso a resumen
      setStep('resumen');

    } catch (e) {
      Alert.alert(
        'Error',
        e.message || 'No se pudo crear el entrenamiento.'
      );
    }
  };

  // Formateo mm:ss a partir de segundos totales
  const fmt = (s) => {
    const mm = Math.floor((Number(s) || 0) / 60);
    const ss = (Number(s) || 0) % 60;
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };

  // Publicación final, misma lógica que en WodLibreConfig
  const publicar = async () => {
    const mm = parseInt(minutos || '0', 10);
    const ss = parseInt(segundos || '0', 10);

    // Validación del tiempo realizado
    if ((mm <= 0 && ss <= 0) || ss > 59) {
      return Alert.alert(
        'Tiempo realizado',
        'Introduce un tiempo válido (segundos entre 0 y 59).'
      );
    }

    const totalSegundos = mm * 60 + ss;

    // Envío a API
    const res = await publicarWod({
      wodPlan: { id: wodId },
      tiempo_realizado: totalSegundos,
      comentarios,
      primerEjercicio: ejercicios?.[0]?.meta || null,
    });

    // Resultado
    if (res.ok) {
      Alert.alert('Publicado', 'Tu entrenamiento ha sido registrado.');
      navigation.getParent()?.navigate('Perfil');
    } else {
      Alert.alert('Error', res.error || 'No se pudo publicar.');
    }
  };

  // ================= RESUMEN =================
  if (step === 'resumen') {
    return (
      <SafeAreaView style={styles.wrapper}>
        {/* Título */}
        <Text style={styles.title}>Rondas por tiempo</Text>

        {/* Info del tiempo global */}
        <Text style={styles.meta}>
          WOD #{wodId} • Tiempo global: {fmt(tiempoGlobal || 0)} (
          {tiempoGlobal || 0}s)
        </Text>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Lista de ejercicios ya configurados */}
          {ejercicios.map((e) => (
            <View key={e.ejercicio_id} style={styles.card}>
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
                  Reps: {mapReps.get(e.ejercicio_id)} • Tiempo:{' '}
                  {fmt(tiempoGlobal || 0)}
                </Text>
              </View>
            </View>
          ))}

          {/* Tiempo realizado (igual al de WodLibreConfig) */}
          <View style={styles.inputRowCol}>
            <Text style={styles.label}>Tiempo realizado</Text>

            <View style={styles.tiempoRow}>
              {/* Minutos */}
              <TextInput
                style={styles.cajaTiempo}
                keyboardType="numeric"
                maxLength={2}
                value={minutos}
                onChangeText={(t) => setMinutos(t.replace(/\D+/g, ''))}
                placeholder="00"
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.dosPuntos}>:</Text>

              {/* Segundos */}
              <TextInput
                style={styles.cajaTiempo}
                keyboardType="numeric"
                maxLength={2}
                value={segundos}
                onChangeText={(t) => setSegundos(t.replace(/\D+/g, ''))}
                placeholder="00"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Comentarios */}
          <View style={styles.inputRowCol}>
            <Text style={styles.label}>Comentarios</Text>
            <TextInput
              value={comentarios}
              onChangeText={setComentarios}
              style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
              multiline
              placeholder="¿Cómo te fue el WOD?"
              placeholderTextColor="#222"
            />
          </View>

          {/* Publicar */}
          <TouchableOpacity style={styles.cta} onPress={publicar}>
            <Text style={styles.ctaText}>Publicar</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ================= CONFIGURACIÓN =================
  return (
    <SafeAreaView style={styles.wrapper}>
      <Text style={styles.title}>Configurar • Rondas por tiempo</Text>
      <Text style={styles.meta}>WOD #{wodId}</Text>

      {/* Tiempo global en segundos */}
      <View style={styles.inputRow}>
        <Text style={styles.label}>Tiempo (seg) — global</Text>
        <TextInput
          value={tiempoGlobal}
          onChangeText={(t) =>
            setTiempoGlobal(t.replace(/\D+/g, ''))
          }
          keyboardType="numeric"
          style={styles.input}
          placeholder="ej: 60"
        />
      </View>

      {/* Listado de ejercicios con reps */}
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {ejercicios.map((e) => (
          <View key={e.ejercicio_id} style={styles.card}>
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

              <TextInput
                value={String(mapReps.get(e.ejercicio_id) || '')}
                onChangeText={(t) => onChangeRep(e.ejercicio_id, t)}
                keyboardType="numeric"
                style={[styles.input, { marginTop: 6 }]}
                placeholder="ej: 10"
                placeholderTextColor="#aaa"
              />
            </View>
          </View>
        ))}

        {/* Botón de creación */}
        <TouchableOpacity style={styles.cta} onPress={crearEntrenamiento}>
          <Text style={styles.ctaText}>Crear entrenamiento</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ========= ESTILOS =========
const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f6f7fb', padding: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f1419' },
  meta: { color: '#6b7280', marginTop: 4, marginBottom: 10 },

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

  thumb: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#ddd' },
  name: { fontWeight: '800', color: '#111' },
  small: { color: '#6b7280', marginTop: 2 },

  inputRow: { marginTop: 8, marginBottom: 6 },
  inputRowCol: { marginTop: 8, marginBottom: 6 },
  label: { fontWeight: '700', color: '#111', marginBottom: 6 },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  cta: {
    marginTop: 8,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '800' },

  // Tiempo mm:ss igual que en WodLibreConfig
  tiempoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },

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

  dosPuntos: {
    marginHorizontal: 8,
    fontSize: 24,
    fontWeight: '700',
  },
});
