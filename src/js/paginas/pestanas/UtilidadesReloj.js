// src/screens/ajustes/UtilidadesReloj.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// 🔊 Audio
import { Audio } from 'expo-av';

export function UtilidadesReloj({ navigation }) {
  const [modoActivo, setModoActivo] = useState(null); // 'cronometro' | 'countdown' | 'intervalos'

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={Platform.OS === 'ios' ? 'light-content' : 'light-content'}
        backgroundColor="#1C2A34"
      />

      {/* Cabecera */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Utilidades del reloj</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Contenido */}
      <View style={styles.content}>
        {/* Cronómetro */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="timer-outline" size={22} color="#20B2AA" />
            <Text style={styles.cardTitle}>Cronómetro</Text>
          </View>
          <Text style={styles.cardDesc}>
            Mide el tiempo total de un entrenamiento o serie.
          </Text>

          <TouchableOpacity
            style={styles.cardBtn}
            onPress={() => setModoActivo('cronometro')}
          >
            <Text style={styles.cardBtnText}>Usar cronómetro</Text>
          </TouchableOpacity>
        </View>

        {/* Cuenta atrás */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="hourglass-outline" size={22} color="#20B2AA" />
            <Text style={styles.cardTitle}>Cuenta atrás</Text>
          </View>
          <Text style={styles.cardDesc}>
            Configura un tiempo objetivo y deja que la app te avise cuando termine (EMON).
          </Text>

          <TouchableOpacity
            style={styles.cardBtn}
            onPress={() => setModoActivo('countdown')}
          >
            <Text style={styles.cardBtnText}>Configurar cuenta atrás</Text>
          </TouchableOpacity>
        </View>

        {/* Intervalos / Tabata */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="repeat-outline" size={22} color="#20B2AA" />
            <Text style={styles.cardTitle}>Intervalos / Tabata</Text>
          </View>
          <Text style={styles.cardDesc}>
            Crea bloques de trabajo y descanso (Tabata).
          </Text>

          <TouchableOpacity
            style={styles.cardBtn}
            onPress={() => setModoActivo('intervalos')}
          >
            <Text style={styles.cardBtnText}>Configurar intervalos</Text>
          </TouchableOpacity>
        </View>

        {/* Herramienta activa */}
        <View style={styles.toolWrapper}>
          {modoActivo === 'cronometro' && <Cronometro />}
          {modoActivo === 'countdown' && <CuentaAtras />}
          {modoActivo === 'intervalos' && <IntervalosTabata />}
          {!modoActivo && (
            <Text style={styles.toolHint}>
              Elige una utilidad para mostrarla aquí abajo.
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ==== Helpers ==== */

const formatTime = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// 🔊 helper reutilizable para cargar/reproducir el beep
async function loadAndPlayBeep(soundRef) {
  try {
    if (!soundRef.current) {
      const { sound } = await Audio.Sound.createAsync(
        require('@asset/sonido/beep_3s.wav')
      );
      soundRef.current = sound;
    }
    await soundRef.current.replayAsync();
  } catch (err) {
    console.error('Error reproduciendo beep', err);
  }
}

/* ==== Subcomponentes de utilidades ==== */

function Cronometro() {
  const [segundos, setSegundos] = useState(0);
  const [activo, setActivo] = useState(false);

  useEffect(() => {
    let id;
    if (activo) {
      id = setInterval(() => {
        setSegundos((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (id) clearInterval(id);
    };
  }, [activo]);

  return (
    <View style={styles.toolCard}>
      <Text style={styles.toolTitle}>Cronómetro</Text>
      <Text style={styles.toolTime}>{formatTime(segundos)}</Text>

      <View style={styles.toolRow}>
        <TouchableOpacity
          style={[styles.toolBtn, activo ? styles.toolBtnStop : styles.toolBtnStart]}
          onPress={() => setActivo((a) => !a)}
        >
          <Text style={styles.toolBtnText}>{activo ? 'Pausar' : 'Iniciar'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolBtn, styles.toolBtnReset]}
          onPress={() => {
            setActivo(false);
            setSegundos(0);
          }}
        >
          <Text style={styles.toolBtnText}>Reiniciar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CuentaAtras() {
  const [duracion, setDuracion] = useState(60); // segundos configurados
  const [restante, setRestante] = useState(60);
  const [activo, setActivo] = useState(false);

  // 🔊 ref para el sonido
  const beepSoundRef = useRef(null);

  // limpiar sonido al desmontar
  useEffect(() => {
    return () => {
      if (beepSoundRef.current) {
        beepSoundRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    let id;
    if (activo && restante > 0) {
      id = setInterval(() => {
        setRestante((s) => s - 1);
      }, 1000);
    } else if (activo && restante === 0) {
      setActivo(false);
      Alert.alert('Tiempo cumplido', 'La cuenta atrás ha terminado.');
    }

    return () => {
      if (id) clearInterval(id);
    };
  }, [activo, restante]);

  // 🔊 cuando queden 3s → reproducimos el beep (2 pitidos + fuerte al final)
  useEffect(() => {
    if (!activo) return;
    if (restante === 3) {
      loadAndPlayBeep(beepSoundRef);
    }
  }, [restante, activo]);

  const syncDuracion = (nueva) => {
    const v = Math.max(5, Math.min(nueva, 60 * 60)); // entre 5s y 60min
    setDuracion(v);
    setRestante(v);
  };

  return (
    <View style={styles.toolCard}>
      <Text style={styles.toolTitle}>Cuenta atrás</Text>
      <Text style={styles.toolTime}>{formatTime(restante)}</Text>

      <View style={styles.toolRow}>
        <TouchableOpacity
          style={styles.toolSmallBtn}
          onPress={() => syncDuracion(duracion - 10)}
        >
          <Text style={styles.toolSmallBtnText}>-10s</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolSmallBtn}
          onPress={() => syncDuracion(duracion + 10)}
        >
          <Text style={styles.toolSmallBtnText}>+10s</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.toolRow}>
        <TouchableOpacity
          style={[styles.toolBtn, activo ? styles.toolBtnStop : styles.toolBtnStart]}
          onPress={() => {
            if (restante <= 0) setRestante(duracion);
            setActivo((a) => !a);
          }}
        >
          <Text style={styles.toolBtnText}>{activo ? 'Pausar' : 'Iniciar'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolBtn, styles.toolBtnReset]}
          onPress={() => {
            setActivo(false);
            setRestante(duracion);
          }}
        >
          <Text style={styles.toolBtnText}>Reiniciar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function IntervalosTabata() {
  const [fase, setFase] = useState('ready'); // 'ready' | 'work' | 'rest' | 'fin'
  const [rondaActual, setRondaActual] = useState(1);
  const rondasTotales = 4;
  const workSeg = 20;
  const restSeg = 10;
  const [restante, setRestante] = useState(workSeg);
  const [activo, setActivo] = useState(false);

  // 🔊 ref para el beep de Tabata
  const beepSoundRef = useRef(null);

  useEffect(() => {
    return () => {
      if (beepSoundRef.current) {
        beepSoundRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    let id;
    if (!activo) return;

    if (fase === 'ready') {
      setFase('work');
      setRestante(workSeg);
      return;
    }

    if (fase === 'fin') {
      setActivo(false);
      return;
    }

    id = setInterval(() => {
      setRestante((s) => s - 1);
    }, 1000);

    return () => {
      if (id) clearInterval(id);
    };
  }, [activo, fase]);

  useEffect(() => {
    if (!activo) return;
    if (restante > 0) return;

    if (fase === 'work') {
      // pasa a descanso
      setFase('rest');
      setRestante(restSeg);
    } else if (fase === 'rest') {
      if (rondaActual >= rondasTotales) {
        setFase('fin');
        setActivo(false);
        Alert.alert('Intervalos completados', 'Has terminado todas las rondas.');
      } else {
        setRondaActual((r) => r + 1);
        setFase('work');
        setRestante(workSeg);
      }
    }
  }, [restante, fase, activo, rondaActual]);

  // 🔊 Aviso 3s antes de cambiar de fase (tanto de work como de rest)
  useEffect(() => {
    if (!activo) return;
    if (restante === 3) {
      loadAndPlayBeep(beepSoundRef);
    }
  }, [restante, activo]);

  const descripcionFase =
    fase === 'ready'
      ? 'Pulsa iniciar para comenzar'
      : fase === 'work'
      ? 'TRABAJO'
      : fase === 'rest'
      ? 'DESCANSO'
      : 'Completado';

  return (
    <View style={styles.toolCard}>
      <Text style={styles.toolTitle}>Intervalos / Tabata</Text>
      <Text style={styles.toolSubtitle}>
        Ronda {rondaActual}/{rondasTotales}
      </Text>
      <Text style={styles.toolPhase}>{descripcionFase}</Text>
      {fase !== 'fin' && <Text style={styles.toolTime}>{formatTime(restante)}</Text>}

      <View style={styles.toolRow}>
        <TouchableOpacity
          style={[styles.toolBtn, activo ? styles.toolBtnStop : styles.toolBtnStart]}
          onPress={() => {
            if (fase === 'fin') {
              setFase('ready');
              setRondaActual(1);
              setRestante(workSeg);
            }
            setActivo((a) => !a);
          }}
        >
          <Text style={styles.toolBtnText}>{activo ? 'Pausar' : 'Iniciar'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolBtn, styles.toolBtnReset]}
          onPress={() => {
            setActivo(false);
            setFase('ready');
            setRondaActual(1);
            setRestante(workSeg);
          }}
        >
          <Text style={styles.toolBtnText}>Reiniciar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ==== Estilos ==== */

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
    padding: 16,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '700',
  },
  cardDesc: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 12,
  },
  cardBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#20B2AA',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  cardBtnText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 13,
  },

  toolWrapper: {
    marginTop: 8,
  },
  toolHint: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  toolCard: {
    marginTop: 10,
    backgroundColor: '#020617',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  toolTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  toolSubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  toolPhase: {
    color: '#FCD34D',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  toolTime: {
    color: '#F9FAFB',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginVertical: 8,
  },
  toolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  toolBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  toolBtnStart: {
    backgroundColor: '#22c55e',
  },
  toolBtnStop: {
    backgroundColor: '#f97316',
  },
  toolBtnReset: {
    backgroundColor: '#374151',
  },
  toolBtnText: {
    color: '#F9FAFB',
    fontWeight: '700',
    fontSize: 14,
  },
  toolSmallBtn: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
    alignItems: 'center',
  },
  toolSmallBtnText: {
    color: '#E5E7EB',
    fontWeight: '600',
    fontSize: 13,
  },
});
