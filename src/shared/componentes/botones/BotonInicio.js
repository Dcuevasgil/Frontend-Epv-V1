import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet
} from 'react-native'

// Creo el componente boton para la pantalla de inicio

const BotonInicioSesion = ({ texto, onPress }) => {
    return (
        <TouchableOpacity 
            style={styles.botonInicioSesion} 
            onPress={onPress}
        >
            <Text style={styles.inicio}>{texto}</Text>
        </TouchableOpacity>
    );
}

// Estilos para el boton
const styles = StyleSheet.create({
    
    /* Estilo boton inicio de sesion */
    botonInicioSesion: {
        backgroundColor: '#ebb50d', 
        paddingVertical: 12,
        paddingHorizontal: 50,
        borderRadius: 5,
        marginBottom: 15,
        width: '60%',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff'
    },

    /* Estilo boton inicio sesion texto */
    inicio: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'Poppins',
    },
})

export default BotonInicioSesion;