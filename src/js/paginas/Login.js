import React, { useState } from "react";
import {
  Text, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import CampoEntrada from "@comp/inputs/CampoEntrada";
import BotonNavegacion from "@comp/botones/BotonNavegacion";

import AsyncStorage from '@react-native-async-storage/async-storage';

// URL base de la API que cargo desde las variables de entorno
const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export function Login() {
  const navigation = useNavigation();

  // Estados controlados del formulario: correo y contraseña
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');

  // Estado que indica si ya estoy realizando un login (para evitar login doble)
  const [cargando, setCargando] = useState(false);

  // Función principal que gestiona todo el flujo de login de la app
  async function handleLogin() {

    // Evito que el usuario pulse varias veces mientras ya estoy autenticando
    if (cargando) {
      return;
    }

    // Normalizo correo y contraseña antes de enviarlo a la API
    const email = (correo || '').trim().toLowerCase();
    const pass  = (contrasena || '').trim();

    // Validación básica de campos obligatorios
    if (!email || !pass) {
      Alert.alert('Faltan datos', 'Introduce correo y contraseña');
      return;
    }

    try {
      // Indico que empieza la petición para mostrar Loading en el botón
      setCargando(true);

      // Llamada al endpoint de login del backend
      const r = await fetch(`${BASE_URL}/autenticacion/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Accept': 'application/json' 
        },
        body: JSON.stringify({ correo: email, contrasena: pass }),
      });

      // Si el backend responde con error, muestro el texto tal cual para ver qué pasó
      if (!r.ok) {
        const txt = await r.text();
        return Alert.alert('Login', `Error ${r.status}\n${txt}`);
      }

      // Parseo del JSON recibido para obtener el token
      const data  = await r.json();
      const token = String(data?.access_token || data?.token || '');
      if (!token) {
        return Alert.alert('Login', 'No se recibió token');
      }

      // Guardo token y correo del login en AsyncStorage
      await AsyncStorage.multiSet([
        ['AUTH_TOKEN', token],
        ['EMAIL_LOGIN', email],
      ]);

      // Navego al stack principal de la app y limpio el historial para no volver al login
      navigation.reset({
        index: 0,
        routes: [{ 
          name: 'Navegacion', 
          params: { token, usuarioForChildren: null, emailLogin: email } 
        }],
      });

      // Hago la petición del perfil en segundo plano, para no retrasar la navegación
      setTimeout(async () => {
        try {
          const meRes = await fetch(`${BASE_URL}/usuarios/me`, {
            headers: { 
              Accept: 'application/json', 
              Authorization: `Bearer ${token}` 
            },
          });

          // Si la petición /me funciona, guardo el usuario en caché
          if (meRes.ok) {
            const me = await meRes.json();
            await AsyncStorage.setItem('AUTH_ME', JSON.stringify(me));

            // Normalizo el email que viene en el perfil
            const meEmail = String(me?.email || me?.correo || email).toLowerCase();
            await AsyncStorage.setItem('EMAIL_LOGIN', meEmail);
          }
        } catch {
          // Si falla la carga del perfil, no afecta a la navegación
        }
      }, 0);

    } catch (e) {
      // Error general de red o fallo de configuración
      Alert.alert('Error', 'Error de red o configuración');
    } finally {
      // Quitamos el estado de carga siempre al final
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Login</Text>

        {/* Campo de entrada para el correo */}
        <CampoEntrada 
          placeholder="Correo"
          placeholderTextColor="#edf0a6"
          value={correo}
          onChangeText={setCorreo}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
          autoComplete="off"
          importantForAutofill="no"
        />

        {/* Campo de entrada para la contraseña */}
        <CampoEntrada
          placeholder="Contraseña"
          placeholderTextColor="#edf0a6"
          value={contrasena}
          onChangeText={setContrasena}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="none"
          autoComplete="off"
          importantForAutofill="no"
        />

        {/* Botón que lanza el proceso de login */}
        <BotonNavegacion
          texto={cargando ? 'Logging in...' : 'Login'}
          onPress={handleLogin}
        />

        {/* Enlace para navegar a la pantalla de registro */}
        <TouchableOpacity onPress={() => navigation.navigate("Registro")}>
          <Text style={styles.linkText}>¿No tienes cuenta? Créala!</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Contenedor principal de la pantalla
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  // Contenedor interno que centra el contenido verticalmente
  inner: {
    padding: 24,
    marginTop: "50%",
    justifyContent: "center",
  },

  // Título grande "Login"
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFF",
    alignSelf: "center",
    marginBottom: 32,
  },

  // Estilo del enlace inferior para ir al registro
  linkText: {
    color: "#FFD700",
    textAlign: "center",
    marginTop: 20,
  },
});
