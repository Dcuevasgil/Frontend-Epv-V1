import 'react-native-gesture-handler';
import 'react-native-reanimated';

import React from 'react';

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Pantallas
import { Inicio } from '@pags/Inicio';
import { Registro } from '@pags/Registro';
import { Login } from '@pags/Login';
import { Perfil } from '@tabs/Perfil';
import { Ajustes } from '@tabs/Ajustes';
import { DetallePublicacion } from '@tabs/DetallePublicacion';
import { EntrenamientoMenu } from '@tabs/EntrenamientoMenu';
import { WodLibreConfig } from '@tabs/WodLibreConfig';
import { WodRondasConfig } from '@tabs/WodRondasConfig';
import { WodSeleccionEjercicios } from '@tabs/WodSeleccionEjercicios';
import { UtilidadesReloj } from '@tabs/UtilidadesReloj';
import { ListadoEjercicios } from '@tabs/ListadoEjercicios';

// Componentes
import DetalleDia from '@comp/detalle_calendario/DetalleDia';

// Navegacion
import { Navegacion } from 'src/app_navigator/navegacion/Navegacion';

// Crear navegadores
const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Inicio" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Inicio" component={Inicio} />
        <Stack.Screen name="Registro" component={Registro} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Navegacion" component={Navegacion} />
        <Stack.Screen name="DetallePublicacion" component={DetallePublicacion} />
        <Stack.Screen name="Perfil" component={Perfil} />
        
        <Stack.Screen name="EntrenamientoMenu" component={EntrenamientoMenu} />
        <Stack.Screen name="Añadir_Wod" component={WodSeleccionEjercicios} />
        <Stack.Screen name="WodLibreConfig" component={WodLibreConfig} />
        <Stack.Screen name="WodRondasConfig" component={WodRondasConfig} />
        
        <Stack.Screen name="Ajustes" component={Ajustes} />
        <Stack.Screen name="UtilidadesReloj" component={UtilidadesReloj} />
        <Stack.Screen name="ListadoEjercicios" component={ListadoEjercicios} />
        <Stack.Screen name="DetalleDiaCalendario" component={DetalleDia} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}