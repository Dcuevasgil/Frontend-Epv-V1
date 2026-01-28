# EPV Trainer – Frontend  
## Ciclo: Desarrollo de Aplicaciones Web (DAW)  
### Autor: David Cuevas Gil  

---

## Índice

1. [Introducción](#introducción)
2. [Descripción del proyecto](#descripción-del-proyecto)
3. [Justificación y motivación](#justificación-y-motivación)
4. [Objetivos](#objetivos)
5. [Funcionalidades del frontend](#funcionalidades-del-frontend)
6. [Tecnologías utilizadas](#tecnologías-utilizadas)
7. [Arquitectura del frontend](#arquitectura-del-frontend)
8. [Estructura del proyecto](#estructura-del-proyecto)
9. [Guía de instalación](#guía-de-instalación)
10. [Guía de uso](#guía-de-uso)
11. [Enlace a la documentación](#enlace-a-la-documentación)
12. [Conclusión](#conclusión)
13. [Contribuciones, agradecimientos y referencias](#contribuciones-agradecimientos-y-referencias)
14. [Licencias](#licencias)
15. [Contacto](#contacto)

---

## Introducción

El **frontend de EPV Trainer** es la aplicación móvil con la que interactúan los usuarios finales de la plataforma.  
Está desarrollada con **React Native y Expo**, y ofrece una interfaz clara e intuitiva para la gestión de entrenamientos personales y la interacción social entre usuarios.

El frontend consume una API REST externa mediante peticiones HTTP autenticadas con JWT y se encarga de la navegación, gestión de estado y experiencia de usuario dentro de la aplicación.

---

## Descripción del proyecto

EPV Trainer es una aplicación móvil de entrenamiento personal que combina funcionalidades deportivas y sociales.

Desde el frontend, el usuario puede:

- Registrarse e iniciar sesión.
- Gestionar su perfil.
- Consultar ejercicios con imágenes y vídeos.
- Crear y realizar entrenamientos.
- Registrar resultados.
- Interactuar con otros usuarios mediante publicaciones, comentarios y likes.

---

## Justificación y motivación

El proyecto surge con el objetivo de unificar el seguimiento deportivo con la motivación social en una única aplicación.

El desarrollo del frontend permite aplicar conocimientos reales de desarrollo móvil, consumo de APIs, arquitectura por componentes y buenas prácticas de UX/UI en un proyecto funcional y escalable.

---

## Objetivos

- Desarrollar una aplicación móvil multiplataforma con React Native.
- Consumir una API REST protegida mediante JWT.
- Implementar un sistema de autenticación persistente.
- Gestionar la navegación entre pantallas.
- Mantener una estructura clara y modular del código.
- Ofrecer una experiencia de usuario fluida y coherente.

---

## Funcionalidades del frontend

- Registro e inicio de sesión de usuarios.
- Persistencia de sesión mediante JWT.
- Pantalla de inicio con navegación por pestañas.
- Gestión de perfil de usuario.
- Visualización de ejercicios y entrenamientos.
- Módulo social con publicaciones y comentarios.
- Reproducción de contenido multimedia.
- Manejo de errores y estados de carga.

---

## Tecnologías utilizadas

- **React Native**
- **Expo**
- **JavaScript**
- **React Navigation**
- **Context API**
- **Fetch API**
- **AsyncStorage**
- **Git y GitHub**

---

## Arquitectura del frontend

El proyecto sigue una arquitectura modular basada en responsabilidades:

- **Pantallas (`paginas`)**: vistas principales de la aplicación.
- **Componentes compartidos**: elementos reutilizables de interfaz.
- **Servicios API**: comunicación con el frontend.
- **Configuración**: constantes, variables de entorno y ajustes globales.
- **Utilidades**: funciones auxiliares.
- **Navegación**: definición de stacks y pestañas.

Esta arquitectura facilita la mantenibilidad y la escalabilidad del proyecto.

---

## Estructura del proyecto

Estructura real del proyecto EPV Trainer (frontend):

```bash
.
├── assets/
│
├── docs/
│
├── src/
│   ├── app_navigator/
│   │   └── navegacion/
│   │
│   ├── assets/
│   │   ├── sonido/
│   │   ├── fondo.jpg
│   │   └── perfil.png
│   │
│   ├── js/
│   │   └── paginas/
│   │       ├── pestanas/
│   │       ├── Inicio.js
│   │       ├── Login.js
│   │       ├── Registro.js
│   │       └── index.js
│   │
│   └── shared/
│       ├── api/
│       ├── componentes/
│       ├── config/
│       └── utils/
│
├── App.js
├── index.js
├── app.config.js
├── babel.config.js
├── jsconfig.json
├── package.json
├── package-lock.json
├── README.md
└── LICENSE
```

## Configuración y ejecución

### 1. Clonar el repositorio

```bash
git clone https://github.com/Dcuevasgil/Frontend-EPV
cd Frontend-EPV
```
### 2. Instalar dependencias
```bash
npm install
```
### 3. Configurar variables de entorno
Crear un archivo .env en la raíz del proyecto:
```.env
EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:8000/api/v1
```

### 4. Ejecutar la aplicación
```bash
npx expo start
```
## Consumo de la API
El frontend se comunica con el frontend mediante peticiones HTTP utilizando fetch.

Ejemplo de encabezado requerido para rutas protegidas:
```http
Authorization: Bearer <TOKEN_JWT>
```
El token JWT se almacena de forma local y se adjunta automáticamente en cada petición autenticada al frontend.

## Conclusión

El frontend de EPV Trainer ofrece una interfaz clara, modular y funcional que permite al usuario interactuar con todas las características del sistema.
El proyecto demuestra la aplicación práctica de React Native en una aplicación real, integrando autenticación, navegación, consumo de API y buenas prácticas de desarrollo móvil.

## Licencia

Este proyecto se distribuye bajo la licencia GNU General Public License v3.0 (GPL-3.0).
Consulta el archivo LICENSE para más información.

Contacto

**Autor**: David Cuevas Gil
**Correo**: dcuevasgil@gmail.com
**GitHub**: https://github.com/Dcuevasgil
