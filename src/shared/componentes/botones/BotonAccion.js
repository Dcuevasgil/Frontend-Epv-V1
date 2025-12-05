import React from 'react';
import {
    TouchableOpacity,
    View,
    Text,
    StyleSheet
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

const BotonAccion = ({ texto, nombreIcono, colorIcono, tamañoIcono, onPress }) => {
    return (
        <TouchableOpacity
            style={styles.botonAccion}
            activeOpacity={0.8}
            onPress={onPress}
        >
            <View style={styles.contenidoBoton}>
                <Ionicons
                    name={nombreIcono}
                    size={tamañoIcono}
                    color={colorIcono}
                    style={styles.iconoBoton}
                />
                <Text style={styles.textoBoton}>{texto}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    
    // Boton entrenamiento y Calendario
    botonAccion: {
        backgroundColor: '#20B2AA',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        marginLeft: 6,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '120%',
        height: 60,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },

    contenidoBoton: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    iconoBoton: {
        marginRight: 10,
    },

    textoBoton: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
})

export default BotonAccion;
