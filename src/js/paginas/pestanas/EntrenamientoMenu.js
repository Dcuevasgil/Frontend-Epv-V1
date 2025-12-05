// Pantalla de menú principal para crear entrenamientos.
// Aquí elijo el modo de entrenamiento (libre o rondas por tiempo)
// y creo un WOD vacío antes de pasar a la pantalla donde se añaden ejercicios.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { crearWodLibre, crearWodRondasTiempo } from '@api/wodService';

export function EntrenamientoMenu({ navigation }) {
  // Estado local para guardar el tipo de WOD que quiero crear.
  // Por defecto arranco con entrenamiento libre.
  const [modo, setModo] = useState('libre'); // 'libre' | 'rondas_tiempo'

  // Función que llama al backend para crear un WOD vacío
  // dependiendo del modo seleccionado, y luego navega a la pantalla
  // donde configuro los ejercicios.
  const crearYContinuar = async () => {
    try {
      // Llamo al servicio correspondiente según el modo.
      const wod =
        modo === 'rondas_tiempo'
          ? await crearWodRondasTiempo({ nombre: 'Rondas por tiempo' })
          : await crearWodLibre({ nombre: 'Entrenamiento libre' });

      // Si el backend no devuelve id, no tiene sentido continuar.
      if (!wod?.id) throw new Error('No se recibió el id del WOD.');

      // Navego a la pantalla de creación del WOD, pasando el id.
      navigation.navigate('Añadir_Wod', { wodId: wod.id, modo }); // ⬅️ importante
    } catch (e) {
      // Si falla la creación del WOD, aviso al usuario.
      Alert.alert('Error', e.message || 'No se pudo crear el WOD.');
    }
  };

  return (
    <SafeAreaView style={styles.wrapper}>
      <Text style={styles.title}>Entrenamientos</Text>

      {/* Botón de Favoritos (de momento es solo un placeholder) */}
      <TouchableOpacity
        style={[styles.card, { borderStyle: 'dashed' }]}
        onPress={() => Alert.alert('Favoritos', 'Te lo preparo en el siguiente paso.')}
      >
        <Ionicons name="star" size={22} color="#111" />
        <Text style={styles.cardText}>Favoritos</Text>
      </TouchableOpacity>

      {/* Bloque para crear un entrenamiento personalizado */}
      <View style={{ marginTop: 10 }}>
        <Text style={styles.subtitle}>Crea tu WOD</Text>

        {/* Selector visual de modo (libre o rondas por tiempo) */}
        <View style={styles.selectorRow}>
          {/* Botón de Entrenamiento Libre */}
          <TouchableOpacity
            onPress={() => setModo('libre')}
            style={[styles.selectorBtn, modo === 'libre' && styles.selectorActive]}
          >
            <Text style={[styles.selectorText, modo === 'libre' && styles.selectorTextActive]}>
              Entrenamiento libre
            </Text>
          </TouchableOpacity>

          {/* Botón de Rondas por tiempo */}
          <TouchableOpacity
            onPress={() => setModo('rondas_tiempo')}
            style={[styles.selectorBtn, modo === 'rondas_tiempo' && styles.selectorActive]}
          >
            <Text
              style={[
                styles.selectorText,
                modo === 'rondas_tiempo' && styles.selectorTextActive,
              ]}
            >
              Rondas por tiempo
            </Text>
          </TouchableOpacity>
        </View>

        {/* CTA para crear el WOD en backend y continuar */}
        <TouchableOpacity style={styles.cta} onPress={crearYContinuar}>
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.ctaText}>Empezar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f6f7fb', padding: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f1419' },
  subtitle: { marginTop: 8, fontSize: 16, fontWeight: '700', color: '#111' },

  // Tarjeta de Favoritos
  card: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  cardText: { fontWeight: '700', color: '#111' },

  // Selector de modo
  selectorRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  selectorBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  selectorActive: { borderColor: '#20B2AA', backgroundColor: '#ECFDF5' },
  selectorText: { color: '#111', fontWeight: '600' },
  selectorTextActive: { color: '#065F46' },

  // Botón principal para crear el WOD
  cta: {
    marginTop: 16,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: { color: '#fff', fontWeight: '700' },
});
