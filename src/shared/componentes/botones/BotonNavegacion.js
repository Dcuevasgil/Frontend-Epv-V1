import React from "react";

import {
    TouchableOpacity,
    Text,
    StyleSheet
} from 'react-native';

const BotonNavegacion = ({ texto, onPress }) => {
    return (
        <TouchableOpacity style={styles.button} onPress={onPress}>
            <Text style={styles.linkText}>{texto}</Text>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    
    // Boton navegacion entre pantallas
    button: {
        backgroundColor: '#FFD700',
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 10,
    },

    buttonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: '600',
    },

    linkText: {
        color: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        fontWeight: '600',
        fontSize: 18,
    },
})

export default BotonNavegacion;