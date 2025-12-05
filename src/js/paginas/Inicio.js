import React from 'react'
import { 
  View, 
  Text, 
  Image, 
  StyleSheet 
} from 'react-native'

import { SafeAreaView } from 'react-native-safe-area-context';

/* Navegación con React Navigation para poder moverme entre pantallas */
import { useNavigation } from '@react-navigation/native';

/* Carga de fuentes personalizadas */
import { useFonts } from 'expo-font';

// Componente reutilizable para los botones de inicio
import BotonInicioSesion from '@comp/botones/BotonInicio'

export function Inicio() {

  const navigation = useNavigation();

  /* Cargo las fuentes Montserrat que uso en esta pantalla */
  let [fuentesCargadas] = useFonts({
    'Montserrat': require('../../../assets/fonts/Montserrat/Montserrat-Regular.ttf'),
    'Montserrat-Bold': require('../../../assets/fonts/Montserrat/Montserrat-Bold.ttf')
  })

  /* Si las fuentes aún no están listas, no renderizo la pantalla */
  if (!fuentesCargadas) {
    return null;
  }

  return (
    <SafeAreaView style={styles.contenedorGuardado}>
      <View style={styles.contenedorInicio}>

        {/* Contenedor del logo principal de la app */}
        <View style={styles.contenedorLogo}>
          <Image
            source={require('../../../assets/logos/Logo-mancuernas-b.png')}
            style={styles.imagenLogo}
          />
        </View>
        
        {/* Título grande EPV TRAINER con dos estilos de texto */}
        <View style={styles.contenedorTitulo}>
          <Text style={[styles.titulo, { fontFamily: 'Montserrat-Bold' }]}>
            EPV
            <Text style={styles.subTitulo}> TRAINER</Text>
          </Text>
        </View>

        {/* Botones principales: login y registro */}
        <View style={styles.contenedorBotones}>

          {/* Botón que me lleva a la pantalla Login */}
          <BotonInicioSesion 
            texto="Login"
            onPress={() => navigation.navigate('Login')}  
          />

          {/* Botón que me lleva a la pantalla Registro */}
          <BotonInicioSesion 
            texto="Sign up"
            onPress={() => navigation.navigate('Registro')}  
          />
        </View>

        {/* Frase inferior de presentación de la app */}
        <View style={styles.contenedorPie}>
          <Text style={styles.pie}>Your virtual personal trainer</Text>
        </View>

      </View>
    </SafeAreaView>
  )
};

const styles = StyleSheet.create({

  /* Contenedor general con fondo oscuro */
  contenedorGuardado: {
    flex: 1,
    backgroundColor: '#1d1916',
  },

  /* Contenedor principal de toda la pantalla */
  contenedorInicio: {
    width: '100%',
  },

  /* Zona donde coloco el logo centrado */
  contenedorLogo: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80
  },

  /* Contenedor del título EPV TRAINER */
  contenedorTitulo: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 35,
  },

  /* Contenedor de los botones Login / Sign up */
  contenedorBotones: {
    width: '100%',
    alignItems: 'center',
    marginTop: 40,
  },

  /* Contenedor inferior para el eslogan */
  contenedorPie: {
    width: '100%',
    backgroundColor: '#1d1916',
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },

  /* Logo principal */
  imagenLogo: {
    width: 200,
    height: 200,
    resizeMode: 'cover',
  },

  /* Título EPV */
  titulo: {
    fontSize: 35,
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'Montserrat'
  },

  /* Texto TRAINER más pequeño */
  subTitulo: {
    fontSize: 22,
    color: '#fff',
    fontFamily: 'Montserrat-Bold'
  },

  /* Texto del pie */
  pie: {
    color: '#ebb50d',  
    fontSize: 18,
    fontFamily: 'Montserrat',
    textAlign: 'center',
    display: 'flex',
  },
});
