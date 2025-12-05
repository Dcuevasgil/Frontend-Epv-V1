# EPV Trainer – Entrenador Personal Virtual  
### Ciclo Formativo: Desarrollo de Aplicaciones Web (DAW)  
### Autor: David Cuevas

---

## Índice
- [Introducción](#introducción)
- [Funcionalidades](#funcionalidades)
- [Tecnologías utilizadas](#tecnologías-utilizadas)
- [Guía de instalación](#guía-de-instalación)
- [Guía de uso](#guía-de-uso)
- [Documentación del proyecto](#documentación-del-proyecto)
- [Conclusión](#conclusión)
- [Contribuciones y agradecimientos](#contribuciones-y-agradecimientos)
- [Licencia](#licencia)
- [Contacto](#contacto)

---

## Introducción
EPV Trainer es una aplicación móvil diseñada para crear, guiar y monitorizar rutinas de entrenamiento personalizadas mediante vídeos, utilidades interactivas y una sección social donde los usuarios pueden publicar, comentar y reaccionar.  

Este frontend implementa todas las pantallas, flujos y experiencias visuales del proyecto, conectándose a un backend desarrollado en Laravel que gestiona usuarios, entrenamientos, publicaciones y más.

---

## Funcionalidades
- Registro e inicio de sesión mediante JWT.
- Perfil editable: nick, descripción, avatar, cabecera.
- Creación de publicaciones con texto, imágenes o vídeos.
- Likes y comentarios con refresco automático.
- Calendarización de entrenamientos con mes actual y días interactivos.
- Modos de entrenamiento: Tabata, EMOM, cronómetro y cuenta atrás.
- Reproductor de vídeos de YouTube integrado.
- Almacenamiento de sesión con AsyncStorage.
- Subida de imágenes a través de Cloudinary.
- Arquitectura modular y manejo de eventos con EventBus.

---

## Tecnologías utilizadas
- **React Native (Expo)**
- **JavaScript (ES2022)**
- **React Navigation**
- **AsyncStorage**
- **Expo ImagePicker**
- **Expo Notifications**
- **YouTube Iframe Player**
- **Cloudinary**
- **Fetch**
- **EventBus interno**

---

## Guía de instalación

```bash
# Clonar el repositorio
git clone https://github.com/Dcuevasgil/Frontend-Epv

cd EPVTrainer

# Instalar dependencias
npm install

# Crear archivo .env en la raíz del proyecto
EXPO_PUBLIC_API_URL="http://<BACKEND_HOST>/api/v1"

# Iniciar el proyecto
npx expo start
```

---

## Guía de uso

Abrir la aplicación con Expo Go o desde un emulador.

Crear una cuenta o iniciar sesión.

Configurar el perfil del usuario.

Crear publicaciones con texto, imagen o vídeo.

Interactuar con otros usuarios mediante likes y comentarios.

Consultar entrenamientos desde el calendario.

Usar las utilidades de reloj (Tabata, EMOM, etc.).

Navegar por los diferentes módulos según el menú principal.

---

## Documentación del proyecto

La documentación completa del TFG se encuentra en desarrollo.

Enlace a la documentación oficial (se añadirá cuando esté disponible).

---

## Conclusión

El frontend de EPV Trainer ofrece una experiencia sólida y moderna para cualquier usuario que desee registrar, visualizar o realizar entrenamientos guiados, a la vez que interactúa mediante un módulo social sencillo e intuitivo.

La estructura modular permite extender fácilmente el proyecto en futuras versiones, incorporando nuevas utilidades.

---

## Contribuciones y agradecimientos

Agradecimientos al profesorado del ciclo DAW.

A la comunidad open source de React Native, Expo y librerías utilizadas.

---

## Licencia

Este proyecto está licenciado bajo **GNU General Public License v3.0 (GPLv3)**.  
Puedes consultar el archivo `LICENSE` en el repositorio para más detalles.

---

## Contacto

**David Cuevas**  
Correo: **david.cuevas@a.vedrunasevillasj.es**  
GitHub: **https://github.com/Dcuevasgil**
