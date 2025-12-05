import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Componentes reutilizables de la app
import CampoEntrada from '@comp/inputs/CampoEntrada';
import BotonNavegacion from '@comp/botones/BotonNavegacion';

// Cliente de API centralizado
import { apiFetch } from '@api/baseApi';

/* ================= Helpers ================= */

// Aquí adapto la respuesta del backend a un objeto de perfil que mi app entiende.
// Me quedo solo con los campos que necesito en el frontend.
function buildPerfilUI(json) {
  // Cojo el objeto de usuario desde diferentes posibles claves
  const raw = json?.data ?? json?.user ?? json?.perfil ?? {};
  return {
    id_perfil: raw.id_perfil ?? raw.perfil_id ?? raw.id ?? null,
    nick: raw.nick ?? raw.username ?? raw.nombre_usuario ?? '',
    nombre: raw.nombre ?? '',
    apellido: raw.apellido ?? '',
    correo: raw.correo ?? raw.email ?? '',
    url_avatar: raw.url_avatar ?? null,
    url_cabecera: raw.url_cabecera ?? null,
    privado: !!raw.privado,
    descripcion_personal: raw.descripcion_personal ?? null,
    sexo: raw.sexo ?? null,
    rol: raw.rol ?? 'user',
    localidad_id: raw.localidad_id ?? null,
    fecha_creacion_cuenta: raw.fecha_creacion_cuenta ?? raw.created_at ?? null,
    actualizacion_cuenta: raw.actualizacion_cuenta ?? raw.updated_at ?? null,
  };
}

// A partir del error que devuelve apiFetch, construyo un mensaje legible para mostrar en un Alert.
// Si el backend manda "errors" de validación, los formateo en varias líneas.
function buildErrorMessage(e) {
  let msg = e?.bodyText;

  try {
    const j = JSON.parse(e?.bodyText || '{}');

    if (j?.errors && typeof j.errors === 'object') {
      msg = Object.entries(j.errors)
        .map(([k, v]) => `• ${k}: ${[].concat(v).join(', ')}`)
        .join('\n');
    } else if (j?.message) {
      msg = j.message;
    }
  } catch {
    // Si no puedo parsear el JSON, me quedo con el texto tal cual
  }

  return msg || e?.message || 'No se pudo conectar con el servidor';
}

/* =============== Pantalla Registro =============== */

export function Registro() {
  const navigation = useNavigation();

  // Estados controlados para cada campo del formulario de registro
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [nick, setNick] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [loading, setLoading] = useState(false);

  // Guardo qué input está activo por si lo necesito para lógica de scroll
  const [inputActivo, setInputActivo] = useState(null);

  // Referencia al ScrollView para poder desplazarlo de forma programática
  const scrollRef = useRef(null);
  // Referencia al campo de contraseña (por si quiero enfocarlo manualmente)
  const campoContrasenaRef = useRef(null);

  // Cuando el usuario entra en la contraseña, bajo el scroll para que quede visible
  const scrollToPassword = () => {
    setInputActivo('contrasena');

    setTimeout(() => {
      if (!scrollRef.current) return;
      scrollRef.current.scrollToEnd({ animated: true });
    }, 150);
  };

  // Función que gestiona todo el flujo de registro
  async function handleRegister() {
    // Evito disparar otra petición si ya estoy registrando
    if (loading) {
      return;
    }
    setLoading(true);

    try {
      // Payload que envío al backend
      const payload = { nombre, apellido, nick, correo, contrasena };

      // Validación básica de campos obligatorios
      if (!nombre || !nick || !correo || !contrasena) {
        Alert.alert('Registro', 'Rellena todos los campos.');
        return;
      }

      // Llamada al endpoint de registro usando apiFetch
      const json = await apiFetch('/autenticacion/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Token JWT que devuelve el backend tras registrarse
      const token = json?.token ?? json?.access_token ?? '';
      // Perfil normalizado para usar en la app
      const perfilUI = buildPerfilUI(json);

      // Si no tengo nick, algo raro ha pasado con la respuesta del servidor
      if (!perfilUI.nick) {
        console.warn('❌ No se pudo obtener nick. Payload:', json);
        Alert.alert('Registro', 'No se pudo obtener el nombre de usuario (nick).');
        return;
      }

      // Guardo token y perfil en AsyncStorage para tener la sesión iniciada
      await AsyncStorage.setItem('AUTH_TOKEN', token);
      await AsyncStorage.setItem('MI_PERFIL', JSON.stringify(perfilUI));

      // Después de registrarse, vuelvo a la pantalla Inicio
      navigation.navigate('Inicio');
    } catch (e) {
      console.error('Registro fallido en /autenticacion/registrar');
      console.error(e);

      // Construyo el mensaje de error amigable y lo muestro
      const msg = buildErrorMessage(e);

      Alert.alert(
        `Error ${e?.status || ''}`.trim(),
        msg
      );
    } finally {
      // Sea éxito o error, desactivo el loading
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Wrapper para poder cerrar el teclado al tocar fuera de los inputs */}
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss();
          setInputActivo(null);
        }}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          automaticallyAdjustKeyboardInsets
        >
          {/* Título principal de la pantalla */}
          <Text style={styles.title}>Registro</Text>

          {/* Campo Nombre */}
          <CampoEntrada
            placeholder="Nombre"
            placeholderTextColor="#edf0a6"
            value={nombre}
            onChangeText={setNombre}
            autoCapitalize="words"
            onFocus={() => setInputActivo('nombre')}
          />

          {/* Campo Apellido */}
          <CampoEntrada
            placeholder="Apellido"
            placeholderTextColor="#edf0a6"
            value={apellido}
            onChangeText={setApellido}
            autoCapitalize="words"
            onFocus={() => setInputActivo('apellido')}
          />

          {/* Campo Nick */}
          <CampoEntrada
            placeholder="Nick"
            placeholderTextColor="#edf0a6"
            value={nick}
            onChangeText={setNick}
            autoCapitalize="none"
            onFocus={() => setInputActivo('nick')}
          />

          {/* Campo Correo */}
          <CampoEntrada
            placeholder="Correo"
            placeholderTextColor="#edf0a6"
            value={correo}
            onChangeText={setCorreo}
            keyboardType="email-address"
            autoCapitalize="none"
            onFocus={() => setInputActivo('correo')}
          />

          {/* Campo Contraseña */}
          <CampoEntrada
            ref={campoContrasenaRef}
            placeholder="Contraseña"
            placeholderTextColor="#edf0a6"
            value={contrasena}
            onChangeText={setContrasena}
            secureTextEntry
            onFocus={scrollToPassword}
          />

          {/* Botón para enviar el formulario de registro */}
          <BotonNavegacion
            texto={loading ? 'Registrando...' : 'Registro'}
            onPress={handleRegister}
          />

          {/* Botón para volver a Login si ya tiene cuenta */}
          <BotonNavegacion
            texto="Login"
            onPress={() => navigation.goBack()}
          />
        </ScrollView>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  // Contenedor principal de la pantalla de registro
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Contenido interno del ScrollView
  inner: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 70,
    justifyContent: 'flex-start',
  },

  // Estilo del título "Registro"
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    alignSelf: 'center',
    marginBottom: 32,
  },
});
