// Pantalla de Ajustes: aquí gestiono la edición del perfil de usuario,
// el acceso al cronómetro de entrenamientos y el listado global de ejercicios.
import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import * as ImagePicker from 'expo-image-picker';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiFetch } from '@api/baseApi';

const API_HOST = process.env.EXPO_PUBLIC_API_URL;

/* ================= Helpers ================= */

// Normalizo cadenas para poder compararlas sin que molesten saltos de línea o espacios raros
const normalizeStr = (v) =>
  (typeof v === 'string' ? v.replace(/\r\n/g, '\n').trim() : v);

// A partir del formulario y del perfil original construyo el payload con solo los campos cambiados
const buildPayload = (form, original) => {
  const raw = {
    nick: form.nick,
    descripcion_personal: form.sobreMi,
    url_cabecera: form.cabeceraUri,
    url_avatar: form.avatarUri,
    localidad_id: form.localidadId,
  };

  // 1) Elimino undefined/null; dejo "" únicamente para descripcion_personal (para poder vaciarla)
  const filled = Object.fromEntries(
    Object.entries(raw).filter(([k, v]) => {
      if (v === undefined || v === null) return false;
      if (k === 'descripcion_personal') return true;
      return !(typeof v === 'string' && v.trim() === '');
    })
  );

  // 2) Me quedo solo con lo que realmente difiere del original
  const diff = Object.fromEntries(
    Object.entries(filled).filter(([k, v]) => {
      const current =
        original?.[k] ??
        (k === 'descripcion_personal' ? original?.bio : original?.[k]);
      const a = normalizeStr(v);
      const b = normalizeStr(current ?? '');
      return String(a) !== String(b);
    })
  );

  // 3) Si la bio viene como "", la mando como null para borrar en servidor
  if ('descripcion_personal' in filled && filled.descripcion_personal === '') {
    diff.descripcion_personal = null;
  }

  return diff;
};

// A partir del asset de ImagePicker saco nombre y mime para montar el FormData
const getFileInfo = (asset, fallbackName = 'cabecera.jpg') => {
  const name = asset.fileName || fallbackName;
  const mime = asset.mimeType || 'image/jpeg';
  return { name, mime };
};

// Normalizo strings (sin acentos, minúsculas) para hacer búsquedas de localidades
const normaliza = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

// Intento obtener un id de perfil fiable a partir de route, prop perfil o perfil_cache
async function obtenerPerfilIdSeguro(route, perfil) {
  const pRoute = route?.params?.perfil;
  if (pRoute?.id_perfil || pRoute?.id) {
    return pRoute.id_perfil ?? pRoute.id;
  }

  if (perfil?.id_perfil || perfil?.id) {
    return perfil.id_perfil ?? perfil.id;
  }

  try {
    const cache = await AsyncStorage.getItem('perfil_cache');
    if (cache) {
      const p = JSON.parse(cache);
      if (p?.id_perfil || p?.id) {
        return p.id_perfil ?? p.id;
      }
    }
  } catch (e) {
    console.error('[AJUSTES] error leyendo perfil_cache', e);
  }

  return null;
}

// Busca un token en varias keys habituales dentro de AsyncStorage
const getAnyToken = async () => {
  const keys = ['AUTH_TOKEN', 'access_token', 'token', 'jwt', 'api_token'];
  for (const k of keys) {
    try {
      const v = await AsyncStorage.getItem(k);
      if (v) return v;
    } catch {}
  }
  return null;
};

/* ================ Componente ================ */

export function Ajustes({ route, navigation }) {
  // Si no viene userId en params, entiendo que estoy viendo mis propios ajustes
  const userId = route?.params?.userId || null;
  const isMine = useMemo(() => !userId, [userId]);

  // Perfil que llega por navegación (por ejemplo desde Inicio/Perfil)
  const perfil = route?.params?.perfil ?? null;

  // Copia del perfil tal y como lo espera el backend, para poder comparar cambios
  const [perfilOriginal, setPerfilOriginal] = useState(null);

  // Estado de modales y del selector de localidades
  const [modals, setModals] = useState({ editOpen: false });
  const [q, setQ] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const cerrarModalEditar = () => setModals({ editOpen: false });

  // Localidades (cache + API)
  const [localidades, setLocalidades] = useState([]);

  // Estado del formulario de edición de perfil
  const [form, setForm] = useState({
    nick: '',
    sobreMi: '',
    cabeceraUri: null,
    avatarUri: null,
    localidadId: null,
    localidadNombre: '',
  });

  // Lista de localidades filtradas por el buscador
  const filtradas = useMemo(() => {
    if (!q) return localidades;
    const nq = normaliza(q);
    return localidades.filter((l) =>
      normaliza(l.nombre_localidad).includes(nq)
    );
  }, [q, localidades]);

  // Helper para sacar el nombre de la localidad a partir de su id
  const getLocNameById = (id, lista) =>
    lista.find((l) => String(l.id) === String(id))?.nombre || '';

  // Cuando entra/cambia `perfil`, hidrato estado original + form con esos datos
  useEffect(() => {
    if (!perfil) return;

    setPerfilOriginal({
      nick: perfil.nick ?? '',
      descripcion_personal: perfil.descripcion_personal ?? perfil.bio ?? '',
      url_cabecera: perfil.url_cabecera ?? perfil.cabecera ?? null,
      url_avatar: perfil.url_avatar ?? perfil.avatar ?? null,
      localidad_id: perfil.localidad_id ?? null,
    });

    setForm((prev) => {
      const id = perfil.localidad_id ?? prev.localidadId;
      const nombreRel =
        perfil.localidad?.nombre_localidad || perfil.localidad?.nombre || '';

      const nombre = nombreRel || getLocNameById(id, localidades);

      return {
        ...prev,
        nick: perfil.nick ?? '',
        sobreMi: perfil.descripcion_personal ?? perfil.bio ?? '',
        cabeceraUri: perfil.url_cabecera ?? null,
        avatarUri: perfil.url_avatar ?? null,
        localidadId: id ?? null,
        localidadNombre: nombre,
      };
    });
  }, [perfil, localidades]);

  // Carga de localidades: primero uso cache y luego refresco desde la API
  useEffect(() => {
    (async () => {
      try {
        const cache = await AsyncStorage.getItem('LOCALIDADES_CACHE');
        if (cache) setLocalidades(JSON.parse(cache));
      } catch {}

      try {
        const data = await apiFetch('/localidades', {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        const lista = Array.isArray(data) ? data : [];
        const ordenadas = [...lista].sort((a, b) =>
          String(a.nombre_localidad || a.nombre || '').localeCompare(
            String(b.nombre_localidad || b.nombre || ''),
            'es',
            { sensitivity: 'base' }
          )
        );

        setLocalidades(ordenadas);
        await AsyncStorage.setItem(
          'LOCALIDADES_CACHE',
          JSON.stringify(ordenadas)
        );
      } catch (e) {
        console.error(
          '[LOCALIDADES] fallo',
          e?.status ?? 'sin_status',
          (e?.message || '').slice(0, 120),
          (e?.bodyText || '').slice(0, 200)
        );
      }
    })();
  }, []);

  // Abro modal de edición y llevo dentro los valores actuales de perfil
  const abrirModalEditar = () => {
    if (perfil) {
      setForm((prev) => ({
        ...prev,
        nick: perfil.nick ?? '',
        sobreMi: perfil.descripcion_personal ?? perfil.bio ?? '',
        cabeceraUri: perfil.url_cabecera ?? null,
        avatarUri: perfil.url_avatar ?? null,
        localidadId: perfil.localidad_id ?? null,
        localidadNombre: perfil.localidad?.nombre_localidad ?? '',
      }));
    }
    setModals({ editOpen: true });
  };

  // Flujo de subida de cabecera (galería → preview → subida a /media/subir)
  const subirCabecera = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso requerido',
          'Necesito permiso para acceder a tu galería y seleccionar una imagen.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });
      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      // Preview local inmediata
      setForm((f) => ({ ...f, cabeceraUri: asset.uri }));

      const token = await getAnyToken();
      if (!token) {
        Alert.alert(
          'Error',
          'Falta el token de sesión. Inicia sesión nuevamente.'
        );
        return;
      }

      const perfilId = await obtenerPerfilIdSeguro(route, perfil);
      if (!perfilId) {
        Alert.alert('Error', 'No se ha encontrado el id de perfil.');
        return;
      }

      const { name, mime } = getFileInfo(asset, 'cabecera.jpg');
      const fd = new FormData();
      fd.append('tipo', 'cabecera');
      fd.append('perfil_id', String(perfilId));
      fd.append('file', {
        uri: asset.uri,
        name,
        type: mime,
      });

      const uploadUrl = `${API_HOST}/media/subir`; // usa la misma que en Perfil

      console.log('[UPLOAD CABECERA]', uploadUrl); // déjalo un momento para comprobar

      const resp = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      const txt = await resp.text();

      let data;
      try {
        data = JSON.parse(txt);
      } catch {
        data = { raw: txt };
      }

      if (!resp.ok) {
        if (resp.status === 413) {
          Alert.alert(
            'Imagen demasiado grande',
            'Prueba con otra imagen o con menos calidad.'
          );
        } else if (resp.status === 422) {
          Alert.alert(
            'Error',
            'La imagen no cumple las validaciones del servidor (422).'
          );
        } else {
          Alert.alert(
            'Error',
            'No se pudo subir la imagen de cabecera.'
          );
        }
        return;
      }

      if (!data?.secure_url) {
        Alert.alert(
          'Aviso',
          'Subida realizada, pero el servidor no devolvió secure_url.'
        );
        return;
      }

      // Guardo la URL de Cloudinary en el form, luego la mando en guardarCambios
      setForm((f) => ({ ...f, cabeceraUri: data.secure_url }));
      Alert.alert(
        'Cabecera',
        'Cabecera actualizada correctamente. No olvides pulsar Guardar.'
      );
    } catch (err) {
      console.error('[ERROR SUBIR CABECERA]', err);
      Alert.alert('Error', 'Error al subir la imagen.');
    }
  };

  // Flujo de subida de avatar (cuadrado) hacia /media/subir
  const subirAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso requerido',
          'Necesito permiso para acceder a tu galería y seleccionar una imagen.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      // Preview en formulario
      setForm((f) => ({ ...f, avatarUri: asset.uri }));

      const token = await getAnyToken();
      if (!token) {
        Alert.alert(
          'Error',
          'Falta el token de sesión. Inicia sesión nuevamente.'
        );
        return;
      }

      const perfilId = await obtenerPerfilIdSeguro(route, perfil);
      if (!perfilId) {
        Alert.alert('Error', 'No se ha encontrado el id de perfil.');
        return;
      }

      const { name, mime } = getFileInfo(asset, 'avatar.jpg');
      const fd = new FormData();
      fd.append('tipo', 'avatar');
      fd.append('perfil_id', String(perfilId));
      fd.append('file', {
        uri: asset.uri,
        name,
        type: mime,
      });

      const uploadUrl = `${API_HOST}/media/subir`;

      const resp = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      const txt = await resp.text();

      let data;
      try {
        data = JSON.parse(txt);
      } catch {
        data = { raw: txt };
      }

      if (!resp.ok) {
        if (resp.status === 413) {
          Alert.alert(
            'Imagen demasiado grande',
            'Prueba con otra imagen o con menos calidad.'
          );
        } else if (resp.status === 422) {
          Alert.alert(
            'Error',
            'La imagen no cumple las validaciones del servidor (422).'
          );
        } else {
          Alert.alert('Error', 'No se pudo subir el avatar.');
        }
        return;
      }

      if (!data?.secure_url) {
        Alert.alert(
          'Aviso',
          'Subida realizada, pero el servidor no devolvió secure_url.'
        );
        return;
      }

      // Me quedo con la URL final de Cloudinary para mandarla en el PUT
      setForm((f) => ({ ...f, avatarUri: data.secure_url }));
      Alert.alert(
        'Avatar',
        'Avatar actualizado correctamente. No olvides pulsar Guardar.'
      );
    } catch (err) {
      console.error('[ERROR SUBIR AVATAR]', err);
      Alert.alert('Error', 'Error al subir la imagen.');
    }
  };

  // PUT /usuarios/actualizar-perfil con solo los cambios necesarios
  const guardarCambios = async () => {
    try {
      const token = await getAnyToken();
      if (!token) {
        Alert.alert(
          'Error',
          'Falta el token de sesión. Inicia sesión nuevamente.'
        );
        return;
      }

      const payload = buildPayload(form, perfilOriginal || {});
      if (!Object.keys(payload).length) {
        Alert.alert('Sin cambios', 'No has modificado ningún campo.');
        return;
      }

      await apiFetch('/usuarios/actualizar-perfil', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const perfilActualizado = {
        ...(perfilOriginal || {}),
        ...payload,
      };

      setPerfilOriginal(perfilActualizado);

      // Sincronizo perfil_cache para que otras pantallas (Perfil) vean los cambios
      try {
        const cacheRaw = await AsyncStorage.getItem('perfil_cache');
        const cache = cacheRaw ? JSON.parse(cacheRaw) : {};

        const nuevoCache = {
          ...cache,
          nick: perfilActualizado.nick ?? cache.nick,
          descripcion_personal:
            perfilActualizado.descripcion_personal ?? cache.descripcion_personal,
          bio:
            perfilActualizado.descripcion_personal ?? cache.bio,
          url_cabecera:
            perfilActualizado.url_cabecera ?? cache.url_cabecera,
          url_avatar: perfilActualizado.url_avatar ?? cache.url_avatar,
          localidad_id:
            perfilActualizado.localidad_id ?? cache.localidad_id,
        };

        await AsyncStorage.setItem(
          'perfil_cache',
          JSON.stringify(nuevoCache)
        );
      } catch (e) {
        console.error(
          '[guardarCambios] no se pudo actualizar perfil_cache',
          e
        );
      }

      setModals({ editOpen: false });

      navigation.navigate('Perfil', {
        mensajePerfil: 'Cambios guardados correctamente',
        forceRefresh: true,
        perfil: {
          ...(route?.params?.perfil || {}),
          ...perfilActualizado,
        },
      });
    } catch (e) {
      console.error(
        '[ERROR PUT PERFIL Ajustes/Perfil]',
        e.status,
        e.bodyText || e.message
      );
      Alert.alert(
        'Error',
        `Hubo un problema al actualizar el perfil${
          e.status ? ` (${e.status})` : ''
        }.`
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
      />

      {/* Cabecera superior de la pantalla de Ajustes */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ajustes</Text>
      </View>

      {/* Secciones de ajustes (perfil / reloj / ejercicios) solo si estoy en mis propios ajustes */}
      <View style={styles.content}>
        {isMine && (
          <>
            {/* Bloque de edición de perfil */}
            <Text style={styles.labelSect}>Perfil</Text>
            <TouchableOpacity style={styles.editBtn} onPress={abrirModalEditar}>
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.editBtnText}>Editar perfil</Text>
            </TouchableOpacity>

            {/* Navegación a utilidades del reloj (cronómetro, timers, etc.) */}
            <View style={styles.section}>
              <Text style={styles.labelSect}>Reloj</Text>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => navigation.navigate('UtilidadesReloj')}
              >
                <Ionicons name="time-outline" size={18} color="#fff" />
                <Text style={styles.editBtnText}>Utilidades del reloj</Text>
              </TouchableOpacity>
            </View>

            {/* Navegación al listado global de ejercicios */}
            <View style={styles.section}>
              <Text style={styles.labelSect}>Ejercicios</Text>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => navigation.navigate('ListadoEjercicios')}
              >
                <Ionicons name="list-outline" size={18} color="#fff" />
                <Text style={styles.editBtnText}>Listado de ejercicios</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Modal de edición de perfil (nick, bio, media y localidad) */}
      <Modal
        visible={modals.editOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={cerrarModalEditar}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Editar perfil</Text>

            {/* Nick */}
            <TextInput
              style={styles.input}
              placeholder="Nick"
              placeholderTextColor="#ccc"
              value={form.nick || ''}
              onChangeText={(text) =>
                setForm((f) => ({ ...f, nick: text }))
              }
              autoCapitalize="none"
            />

            {/* Sobre mí */}
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Sobre mí"
              placeholderTextColor="#ccc"
              multiline
              value={form.sobreMi}
              onChangeText={(text) =>
                setForm((f) => ({ ...f, sobreMi: text }))
              }
            />

            {/* Botón para cambiar cabecera */}
            <View style={styles.box}>
              <TouchableOpacity style={styles.uploadBtn} onPress={subirCabecera}>
                <Ionicons name="image-outline" size={18} color="#fff" />
                <Text style={styles.uploadBtnText}>Cambiar cabecera</Text>
              </TouchableOpacity>
            </View>

            {/* Botón para cambiar avatar */}
            <View style={styles.box}>
              <TouchableOpacity style={styles.uploadBtn} onPress={subirAvatar}>
                <Ionicons name="person-circle-outline" size={18} color="#fff" />
                <Text style={styles.uploadBtnText}>Cambiar avatar</Text>
              </TouchableOpacity>
            </View>

            {/* Selector de localidad */}
            <Text style={styles.label}>Ubicación</Text>

            <TouchableOpacity
              style={styles.selector}
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  color: form.localidadNombre ? '#ccc' : '#888',
                }}
              >
                {form.localidadNombre || 'Selecciona tu localidad'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#666" />
            </TouchableOpacity>

            {/* Bottom-sheet de localidades con buscador */}
            <Modal
              visible={pickerVisible}
              animationType="slide"
              transparent
              onRequestClose={() => setPickerVisible(false)}
            >
              <KeyboardAvoidingView
                style={styles.locBackdrop}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
              >
                <View style={styles.locSheet}>
                  {/* Cabecera del selector */}
                  <View style={styles.locHeader}>
                    <Text style={styles.locTitle}>
                      Selecciona tu localidad
                    </Text>
                    <TouchableOpacity
                      onPress={() => setPickerVisible(false)}
                      style={styles.locClose}
                    >
                      <Ionicons name="close" size={20} color="#E6EAF2" />
                    </TouchableOpacity>
                  </View>

                  {/* Buscador de provincias/localidades */}
                  <TextInput
                    value={q}
                    onChangeText={setQ}
                    placeholder="Buscar provincia…"
                    placeholderTextColor="#7e8a9a"
                    style={styles.locSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  {/* Lista de resultados */}
                  <ScrollView
                    style={styles.locList}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 24 }}
                  >
                    {filtradas.length === 0 ? (
                      <Text style={styles.locEmpty}>No hay resultados</Text>
                    ) : (
                      filtradas.map((loc) => {
                        const id = String(loc.id_localidad ?? loc.id);
                        const name = String(
                          loc.nombre_localidad ?? loc.nombre ?? ''
                        );
                        const active = String(form.localidadId) === id;

                        return (
                          <TouchableOpacity
                            key={`loc-${id}`}
                            style={[
                              styles.locItem,
                              active && styles.locItemActive,
                            ]}
                            onPress={() => {
                              setForm((f) => ({
                                ...f,
                                localidadId: id,
                                localidadNombre: name,
                              }));
                              setPickerVisible(false);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.locItemText,
                                active && styles.locItemTextActive,
                              ]}
                            >
                              {name}
                            </Text>
                            {active && (
                              <Ionicons
                                name="checkmark"
                                size={18}
                                color="#0f1720"
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
              </KeyboardAvoidingView>
            </Modal>

            {/* Botones Guardar / Cancelar */}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.saveBtn} onPress={guardarCambios}>
                <Text style={styles.saveBtnText}>Guardar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={cerrarModalEditar}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ================ Estilos ================ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  header: {
    height: 60,
    backgroundColor: '#20B2AA',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },

  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#20B2AA',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editBtnText: {
    color: '#fff',
    fontWeight: '600',
  },

  // ==== Secciones ====
  content: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    marginTop: 40,
    marginLeft: 40,
  },

  section: {
    marginTop: 24,
  },

  labelSect: {
    fontSize: 18,
    color: '#0A0A0A',
    fontWeight: '700',
    marginBottom: 6,
  },

  // ===== Modal =====
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  modalContainer: {
    width: '90%',
    backgroundColor: '#1C2A34',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#2F3A45',
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#20B2AA',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.4,
  },

  input: {
    backgroundColor: '#10151D',
    borderWidth: 1,
    borderColor: '#232A3A',
    color: '#E6EAF2',
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
  },

  box: {
    alignSelf: 'flex-start',
    width: '86%',
    marginVertical: 8,
  },

  label: {
    marginTop: 10,
    marginBottom: 6,
    fontWeight: '600',
    color: '#c7d0dd',
    fontSize: 15,
    alignSelf: 'center',
    width: '86%',
  },

  selector: {
    borderWidth: 1,
    borderColor: '#232A3A',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#10151D',
  },

  uploadBtn: {
    backgroundColor: '#20B2AA',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uploadBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'center',
    width: '86%',
    marginTop: 16,
  },
  saveBtn: {
    backgroundColor: '#20B2AA',
    paddingVertical: 12,
    borderRadius: 10,
    paddingHorizontal: '10%',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#1C212A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: '10%',
    borderColor: '#2A3347',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  cancelBtnText: {
    color: '#e4e8ef',
    fontWeight: '700',
    fontSize: 15,
  },

  /* Selector de localidades */
  locBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },

  locSheet: {
    maxHeight: '80%',
    backgroundColor: '#1C2A34',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderColor: '#2F3A45',
  },

  locHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 14,
    paddingBottom: 8,
  },

  locTitle: {
    color: '#20B2AA',
    fontSize: 16,
    fontWeight: '700',
  },

  locClose: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 8,
  },

  locSearch: {
    marginTop: 10,
    marginHorizontal: 16,
    backgroundColor: '#10151D',
    borderWidth: 1,
    borderColor: '#232A3A',
    color: '#E6EAF2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  locList: {
    marginTop: 8,
  },

  locEmpty: {
    color: '#9aa6b2',
    textAlign: 'center',
    paddingVertical: 16,
  },

  locItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#232A3A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  locItemActive: {
    backgroundColor: '#20B2AA',
  },

  locItemText: {
    color: '#E6EAF2',
    fontSize: 14,
  },

  locItemTextActive: {
    color: '#0f1720',
    fontWeight: '700',
  },
});
