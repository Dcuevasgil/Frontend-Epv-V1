import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Iconos
import { Ionicons } from '@expo/vector-icons';

// Tabs
import { Principal } from '@tabs/Principal';
import { Perfil } from '@tabs/Perfil';
import { Ajustes } from '@tabs/Ajustes';
import { Publicar } from '@tabs/Publicar';

// Pantallas del flujo WOD
import { WodSeleccionEjercicios } from '@tabs/WodSeleccionEjercicios';
import { WodLibreConfig } from '@tabs/WodLibreConfig';
import { WodRondasConfig } from '@tabs/WodRondasConfig';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack de la pestaña Inicio: aquí metemos todo el flujo del WOD
function InicioStack({ route }) {
  const { token, perfil: user } = route?.params || {};
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Inicio_Home" component={Principal} initialParams={{ token, perfil: user }} />
      <Stack.Screen name="Inicio_WodCrearPlan" component={WodSeleccionEjercicios} initialParams={{ token, perfil: user }} />
      <Stack.Screen name="Inicio_WodLibreConfig" component={WodLibreConfig} initialParams={{ token, perfil: user }} />
      <Stack.Screen name="Inicio_WodRondasConfig" component={WodRondasConfig} initialParams={{ token, perfil: user }} />
    </Stack.Navigator>
  );
}

export function Navegacion({ route }) {
  const perfil = route?.params?.perfil || null;
  const usuarioForChildren = route?.params?.usuarioForChildren || null;
  const user   = usuarioForChildren || perfil || null;
  const token  = route?.params?.token || null;

  const commonTabOptions = {
    headerShown: false,
    tabBarStyle: { backgroundColor: '#1d1916' },
    tabBarActiveTintColor: '#20B2AA',
    tabBarInactiveTintColor: '#aaa',
  };

  return (
    <Tab.Navigator
      screenOptions={commonTabOptions}
      key={user?.id || user?.id_perfil || 'anon'}
    >
      {/* Inicio con Stack interno (mantiene la tab bar en todo el flujo WOD) */}
      <Tab.Screen
        name="Inicio"
        component={InicioStack}
        initialParams={{ token, perfil: user }}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
        }}
      />

      {/* Publicación rápida */}
      <Tab.Screen
        name="Publicacion"
        component={Publicar}
        initialParams={{ token, perfil: user }}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" color={color} size={size} />
          ),
        }}
      />

      {/* Perfil */}
      <Tab.Screen
        name="Perfil"
        component={Perfil}
        initialParams={{ token, perfil: user }}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={size} />
          ),
        }}
      />

      {/* Ajustes */}
      <Tab.Screen
        name="Ajustes"
        component={Ajustes}
        initialParams={{ token, perfil: user }}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
