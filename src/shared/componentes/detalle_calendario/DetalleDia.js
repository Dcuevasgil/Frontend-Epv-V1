// DetalleDia.jsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
} from 'react-native';

const API_HOST   = process.env.EXPO_PUBLIC_API_URL;
const API_ORIGIN = API_HOST ? API_HOST.replace(/\/api\/v\d+.*$/, '') : '';

function formatearSegundos(segundos = 0) {
  const mm = Math.floor(segundos / 60);
  const ss = segundos % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export default function DetalleDia({ visible, cerrar, diaSeleccionado, entrenos = [] }) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={cerrar}
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalContent}>
          <Text style={styles.titulo}>Detalles del día {diaSeleccionado}</Text>

          {entrenos.length === 0 ? (
            <Text style={{ marginTop: 10 }}>
              No hay entrenamientos guardados para este día.
            </Text>
          ) : (
            <FlatList
              data={entrenos}
              keyExtractor={(item, idx) =>
                `det-${item?.id_publicacion ?? item?.id ?? 'noid'}-${idx}`
              }
              style={{ marginTop: 12, maxHeight: 360 }}
              renderItem={({ item }) => {
                const wod = item.wod || item.wod_meta || null;
                const tipoWod = wod?.tipo_wod;

                const titulo =
                  tipoWod === 'libre'
                    ? 'Entrenamiento libre'
                    : tipoWod === 'tiempo'
                    ? 'Rondas por tiempo'
                    : 'WOD';

                const items = Array.isArray(wod?.items)
                  ? wod.items
                  : Array.isArray(wod?.ejercicios)
                  ? wod.ejercicios
                  : [];

                return (
                  <View style={styles.wodBox}>
                    <Text style={styles.wodTitulo}>{titulo}</Text>

                    {wod?.rondas_global != null && (
                      <Text style={styles.wodMeta}>Rondas: {wod.rondas_global}</Text>
                    )}

                    {items.map((e, idxEj) => {
                      const key = e.ejercicio_id ?? e.id ?? idxEj;
                      const nombre = (e.nombre || '').toUpperCase();
                      const reps =
                        e.repeticiones ?? e.reps ?? e.reps_totales ?? null;
                      const tiempo_realizado = e.tiempo_seg ?? null;

                      let img = e.imagen_url || e.imagen;
                      if (img) {
                        img = img
                          .replace(/\\/g, '/')
                          .replace(/^\/+/, '/')
                          .replace(/^\/storage\/public\//, '/storage/');
                      }
                      const imgUri = img
                        ? img.startsWith('http')
                          ? img
                          : `${API_ORIGIN}${img}`
                        : null;

                      return (
                        <View key={key} style={styles.wodEjRow}>
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

                          {tiempo_realizado != null && (
                            <Text style={styles.wodEjReps}>
                              Tiempo: {tiempo_realizado}
                            </Text>
                          )}
                        </View>
                      );
                    })}

                    {(item.tiempo_realizado_segundos != null ||
                      item.tiempo_realizado != null) && (
                      <Text style={styles.wodTiempo}>
                        Tiempo realizado:{' '}
                        {formatearSegundos(
                          Number(
                            item.tiempo_realizado_segundos ??
                              item.tiempo_realizado ??
                              0
                          )
                        )}
                      </Text>
                    )}

                    {!!item.nota_usuario && (
                      <Text style={styles.wodComentario}>{item.nota_usuario}</Text>
                    )}
                  </View>
                );
              }}
            />
          )}

          <TouchableOpacity onPress={cerrar} style={styles.botonCerrar}>
            <Text style={styles.textoCerrar}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '88%',
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  botonCerrar: {
    marginTop: 20,
    alignSelf: 'flex-end',
  },
  textoCerrar: {
    fontSize: 16,
    color: '#007AFF',
  },

  // ===== estilos del WOD (copiados del feed) =====
  wodBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
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
