// src/components/inputs/TiempoInput.js
import React, { useEffect, useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';

export const TiempoDualInput = ({ valueSeconds = 0, onChangeSeconds }) => {
  // valor en minutos y segundos a partir de valueSeconds
  const minsInicial = Math.floor((Number(valueSeconds) || 0) / 60);
  const secsInicial = (Number(valueSeconds) || 0) % 60;

  const [minutos, setMinutos] = useState(
    valueSeconds == null ? '' : String(Math.floor(valueSeconds / 60))
  );

  const [segundos, setSegundos] = useState(
    valueSeconds == null ? '' : String(valueSeconds % 60).padStart(2, '0')
  );

  // Si desde fuera cambias valueSeconds, sincronizamos
  useEffect(() => {
    if (valueSeconds == null) {
      setMinutos('');
      setSegundos('');
      return;
    };

    const m = Math.floor(valueSeconds / 60);
    const s = valueSeconds % 60;

    setMinutos(String(m));
    setSegundos(String(s).padStart(2, '0'));
  }, [valueSeconds]);

  const actualizarTiempo = (nuevoMin, nuevoSeg) => {
    const m = Number(nuevoMin) || 0;
    let s = Number(nuevoSeg) || 0;

    // si segundos > 59, lo recortamos
    if (s > 59) s = 59;

    const total = m * 60 + s;
    onChangeSeconds?.(total);
  };

  const handleChangeMin = (txt) => {
    const limpio = txt.replace(/\D+/g, ''); // solo números
    setMinutos(limpio);
    actualizarTiempo(limpio, segundos);
  };

  const handleChangeSeg = (txt) => {
    const limpio = txt.replace(/\D+/g, '');
    // no dejamos más de 2 dígitos
    const capped = limpio.slice(0, 2);
    setSegundos(capped);
    actualizarTiempo(minutos, capped);
  };

  return (
    <View style={styles.row}>
      <TextInput
        value={minutos}
        onChangeText={handleChangeMin}
        keyboardType="numeric"
        style={styles.box}
        placeholder="00"
      />
      <Text style={styles.separator}>:</Text>
      <TextInput
        value={segundos}
        onChangeText={handleChangeSeg}
        keyboardType="numeric"
        style={styles.box}
        placeholder="00"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  box: {
    width: 60,
    paddingVertical: 8,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#fff',
    fontWeight: '600',
  },
  separator: {
    fontSize: 20,
    fontWeight: '700',
  },
});
