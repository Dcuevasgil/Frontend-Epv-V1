import { publicarWod } from '@api/wodService';

// Función que publica un entrenamiento realizado
const handlePublicar = async () => {

  // Validación: comprobar que existe un WOD plan válido
  if (!wodPlan || !wodPlan.id) {
    return Alert.alert(
      'Error',
      'El entrenamiento no está listo para publicarse.'
    );
  }

  // Validación: comprobar que se ha introducido tiempo
  if (tiempo_realizado == null || isNaN(tiempo_realizado)) {
    return Alert.alert('Error', 'Falta el tiempo realizado.');
  }

  try {
    // Indicador de carga para evitar múltiples envíos
    setLoading(true);

    // Petición al backend para publicar el WOD
    const res = await publicarWod({
      wodPlan, // ID del plan de entrenamiento
      tiempo_realizado: Number(tiempo_realizado), // Tiempo total en segundos
      comentarios: comentarios?.trim() ?? '', // Comentarios opcionales
      favorito: Boolean(favorito), // Marcar como favorito o no
      primerEjercicio: ejercicios?.[0] ?? null, // Miniatura en el feed
    });

    // Control de errores devueltos por el backend
    if (!res.ok) {
      return Alert.alert(
        'Error',
        res.error || 'No se pudo publicar el entrenamiento.'
      );
    }

    // Si todo salió bien, confirmamos al usuario
    Alert.alert(
      'Publicado',
      'Tu entrenamiento ha sido registrado correctamente.'
    );

    // Volvemos al perfil
    navigation.navigate('Perfil');

  } catch (error) {
    // Captura de errores inesperados
    console.error('[handlePublicar] ERROR', error);
    Alert.alert(
      'Error',
      error.message || 'Ha ocurrido un problema al publicar.'
    );

  } finally {
    // Se desactiva el loading en cualquier caso
    setLoading(false);
  }
};
