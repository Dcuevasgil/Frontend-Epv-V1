# EPV Trainer – Frontend
## Ciclo: Desarrollo de Aplicaciones Web (DAW)
### Autor: David Cuevas Gil

---

## Índice

1. [Introducción](#introducción)  
2. [Descripción del proyecto](#descripción-del-proyecto)  
3. [Justificación y motivación](#justificación-y-motivación)  
4. [Objetivos](#objetivos)  
5. [Funcionalidades del backend](#funcionalidades-del-backend)  
6. [Tecnologías utilizadas](#tecnologías-utilizadas)  
7. [Arquitectura del backend](#arquitectura-del-backend)  
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

El backend del proyecto EPV Trainer proporciona la infraestructura lógica necesaria para soportar todas las funcionalidades de la aplicación móvil.  

A través de una API REST desarrollada con Laravel, el sistema permite gestionar usuarios, perfiles deportivos, ejercicios, entrenamientos, resultados y el módulo social (publicaciones, comentarios, likes y seguimiento entre usuarios).  

La API está diseñada para ser modular, fácilmente mantenible y escalable, separando la lógica de negocio en servicios y repositorios, y utilizando DTOs para el intercambio de datos.

---

## Descripción del proyecto

EPV Trainer es una plataforma de entrenamiento personal que combina:

- Gestión de perfiles deportivos.  
- Creación de ejercicios con imágenes y vídeos.  
- Entrenamientos estructurados (WODs) y resultados asociados.  
- Un módulo social en el que los usuarios pueden publicar contenido, comentar, dar likes y seguir a otros usuarios.

El backend se encarga de todos los procesos de negocio, validaciones, accesos a datos y seguridad, exponiendo endpoints consumidos por el frontend desarrollado en React Native.

---

## Justificación y motivación

Las aplicaciones de entrenamiento actuales suelen dividirse entre herramientas deportivas y redes sociales. EPV Trainer busca unir ambos mundos en una sola plataforma, ofreciendo:

- Un sistema de entrenamiento configurable.  
- Un entorno social para compartir progresos y motivar a otros usuarios.  

El backend es clave para garantizar la integridad de los datos, la seguridad de los usuarios y la posibilidad de escalar el proyecto en el futuro.

---

## Objetivos

- Diseñar y desarrollar una API REST robusta basada en Laravel.  
- Implementar un módulo social completo: publicaciones, comentarios, likes y seguimientos.  
- Gestionar ejercicios, entrenamientos y resultados de forma estructurada.  
- Integrar contenido multimedia (Cloudinary, enlaces de vídeo, etc.).  
- Asegurar el acceso mediante autenticación JWT y middleware de protección.  
- Separar correctamente las capas de controladores, servicios y repositorios para mejorar la mantenibilidad.

---

## Funcionalidades del backend

- Registro e inicio de sesión de usuarios con JWT.  
- Gestión de perfiles deportivos (datos personales, avatar, configuración básica).  
- CRUD de ejercicios con soporte de imágenes y vídeos.  
- Creación y consulta de entrenamientos (WODs) y sus resultados.  
- Módulo social:
  - Creación y listado de publicaciones.
  - Comentarios sobre publicaciones.
  - Sistema de likes.
  - Sistema de seguimiento entre usuarios.  
- Migraciones organizadas para la base de datos de entrenamientos y red social.  
- Servicios y repositorios que encapsulan la lógica de negocio y el acceso a datos.

---

## Tecnologías utilizadas

- Laravel 10  
- PHP 8+  
- MySQL  
- Cloudinary  
- JWT  
- Composer  
- Postman / Thunder Client  

---

## Arquitectura del backend

La API sigue una arquitectura por capas:

- **Controllers**: reciben la petición HTTP, validan los datos básicos y delegan en los servicios.  
- **DTOs**: encapsulan datos de entrada y salida para mantener estructuras claras y tipadas.  
- **Services**: implementan la lógica de negocio principal.  
- **Repositories**: abstraen el acceso a la base de datos mediante interfaces y clases Eloquent.  
- **Models**: representan las entidades (Perfil, Ejercicio, Wod, Publicacion, Comentario, etc.).  
- **Middleware**: se encarga de la autenticación, protección de rutas y filtros adicionales.  
- **Migrations**: definen la estructura de las tablas y sus modificaciones a lo largo del tiempo.

---

## Estructura del proyecto

A continuación se muestra la estructura completa del backend:

ENTRENADOR-PERSONAL/  
├── app/  
│   ├── Http/  
│   │   ├── Controllers/  
│   │   │   ├── ApiEpv/  
│   │   │   │   ├── Autenticacion/  
│   │   │   │   │   └── AuthController.php  
│   │   │   │   ├── Social/  
│   │   │   │   │   ├── ComentarioController.php  
│   │   │   │   │   ├── LikeController.php  
│   │   │   │   │   ├── PublicacionController.php  
│   │   │   │   │   ├── PublicacionMediaController.php  
│   │   │   │   │   └── SeguimientoController.php  
│   │   │   │   ├── EjercicioController.php  
│   │   │   │   ├── LocalidadController.php  
│   │   │   │   ├── MediaController.php  
│   │   │   │   ├── UsuarioController.php  
│   │   │   │   └── WodController.php  
│   │   │   └── Controller.php  
│   │   ├── Middleware/  
│   │   └── Requests/  
│   │  
│   ├── DTO/  
│   │   └── dtoEpv/  
│   │       ├── Core/  
│   │       │   ├── EjercicioDTO.php  
│   │       │   ├── LocalidadDTO.php  
│   │       │   ├── PerfilDTO.php  
│   │       │   ├── WodDTO.php  
│   │       │   └── WodEjercicioItemDTO.php  
│   │       └── Social/  
│   │           ├── ComentarioDTO.php  
│   │           ├── LikeDTO.php  
│   │           ├── PublicacionDTO.php  
│   │           ├── PublicacionMediaDTO.php  
│   │           └── SeguimientoDTO.php  
│   │  
│   ├── Models/  
│   │   ├── modelosEpv/  
│   │   │   ├── Core/  
│   │   │   │   ├── Ejercicio.php  
│   │   │   │   ├── Localidad.php  
│   │   │   │   ├── Perfil.php  
│   │   │   │   ├── Wod.php  
│   │   │   │   ├── WodEjercicio.php  
│   │   │   │   └── WodResultado.php  
│   │   │   └── Social/  
│   │   │       ├── Comentario.php  
│   │   │       ├── Like.php  
│   │   │       ├── Publicacion.php  
│   │   │       ├── PublicacionMedia.php  
│   │   │       └── Seguimiento.php  
│   │   └── User.php  
│   │  
│   ├── Providers/  
│   │   ├── AppServiceProvider.php  
│   │   ├── AuthServiceProvider.php  
│   │   ├── RepositoryServiceProvider.php  
│   │   └── RouteServiceProvider.php  
│   │  
│   ├── Repositories/  
│   │   ├── Contracts/  
│   │   │   ├── Core/  
│   │   │   │   ├── EjercicioRepositoryInterface.php  
│   │   │   │   ├── LocalidadRepositoryInterface.php  
│   │   │   │   ├── UsuarioRepositoryInterface.php  
│   │   │   │   ├── WodRepositoryInterface.php  
│   │   │   │   └── WodResultadoRepositoryInterface.php  
│   │   │   └── Social/  
│   │   │       ├── ComentarioRepositoryInterface.php  
│   │   │       ├── LikeRepositoryInterface.php  
│   │   │       ├── PublicacionRepositoryInterface.php  
│   │   │       └── SeguimientoRepositoryInterface.php  
│   │   └── Eloquent/  
│   │       ├── Core/  
│   │       │   ├── EjercicioRepository.php  
│   │       │   ├── LocalidadRepository.php  
│   │       │   ├── UsuarioRepository.php  
│   │       │   ├── WodRepository.php  
│   │       │   └── WodResultadoRepository.php  
│   │       └── Social/  
│   │           ├── ComentarioRepository.php  
│   │           ├── LikeRepository.php  
│   │           ├── PublicacionRepository.php  
│   │           └── SeguimientoRepository.php  
│   │  
│   ├── Services/  
│   │   └── serviciosEpv/  
│   │       ├── Contracts/  
│   │       │   ├── Core/  
│   │       │   │   ├── EjercicioService.php  
│   │       │   │   ├── LocalidadService.php  
│   │       │   │   ├── PerfilService.php  
│   │       │   │   ├── WodResultadoService.php  
│   │       │   │   └── WodService.php  
│   │       │   └── Social/  
│   │       │       ├── ComentarioService.php  
│   │       │       ├── LikeService.php  
│   │       │       ├── PublicacionMediaService.php  
│   │       │       ├── PublicacionService.php  
│   │       │       └── SeguimientoService.php  
│   │       └── Eloquent/  
│   │           ├── Core/  
│   │           │   ├── EjercicioServiceImpl.php  
│   │           │   ├── LocalidadServiceImpl.php  
│   │           │   ├── PerfilServiceImpl.php  
│   │           │   ├── WodResultadoServiceImpl.php  
│   │           │   └── WodServiceImpl.php  
│   │           └── Social/  
│   │               ├── ComentarioServiceImpl.php  
│   │               ├── LikeServiceImpl.php  
│   │               ├── PublicacionMediaServiceImpl.php  
│   │               ├── PublicacionServiceImpl.php  
│   │               └── SeguimientoServiceImpl.php  
│  
├── database/  
│   ├── factories/  
│   ├── migrations/  
│   │   ├── migraciones_de_columnas_de_tablas_existentes/  
│   │   └── tablasEpv/  
│   │       ├── entrenamientos/  
│   │       └── red_social/  
│   └── seeders/  
│  
├── routes/  
│   ├── api.php  
│   ├── console.php  
│   └── web.php  
│  
├── storage/  
├── tests/  
├── vendor/  
├── .env  
├── .env.example  
├── .gitattributes  
├── .gitignore  
├── artisan  
├── composer.json  
├── composer.lock  
├── phpunit.xml  
├── vite.config.js  
└── README.md  

---

## Guía de instalación

A continuación se detallan todos los pasos necesarios para instalar, configurar y ejecutar el backend del proyecto EPV Trainer en un entorno local.

### 1. Clonar el repositorio

Clona el repositorio del backend en tu máquina local y accede al directorio del proyecto.

Comandos recomendados:  

```bash
git clone https://github.com/Dcuevasgil/Backend-Epv-V1
cd ENTRENADOR-PERSONAL
```

### 2. Instalar dependencias con Composer

```bash
composer install
```

### 3. Crear el archivo de entorno .env

```bash
cp .env.example .env
```

#### Configura los valores principales
```env
APP_NAME=EPVTrainer
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000
```

#### Configuración MySQL (ajustar al nombre real de tu base de datos):
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=epvtrainer
DB_USERNAME=root
DB_PASSWORD=
```

#### Cloudinary (opcional)
```env
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

#### JWT
```env
JWT_SECRET=<CLAVE_GENERADA>
```

### 4. Generar la clave de la aplicación

#### Genera la clave interna de Laravel:
```bash
php artisan key:generate
```

### 5. Generar clave JWT
```bash
php artisan jwt:secret
```

### 6. Ejecutar migraciones

#### Crea las tablas de la base de datos:
```bash
php artisan migrate
```

Esto creará todas las tablas necesarias del sistema (usuarios, perfil, ejercicios, WODs, publicaciones, comentarios, likes, seguimientos, etc.).

### 7. Ejecutar seeders (opcional)

Si el proyecto incluye datos iniciales:

```bash
php artisan db:seed
```

### 8. Iniciar el servidor

Arranca el servidor de desarrollo de Laravel:

```bash
php artisan serve
```

El backend estará disponible en:
http://localhost:8000

La API en:
http://localhost:8000/api/v1

---

## Guía de uso

Esta guía explica cómo consumir la API del backend una vez que ya está instalada, configurada y ejecutándose correctamente.

### 1. Autenticación con JWT

La mayoría de los endpoints requieren autenticación basada en token JWT.

Flujo completo de autenticación:

El usuario se registra o inicia sesión desde la app (enviando correo y contraseña al backend).

El backend valida las credenciales:

Comprueba que el usuario exista.

Verifica la contraseña hasheada.

Si las credenciales son correctas, el backend genera un token JWT que incluye:

El identificador del usuario.

Información mínima necesaria para la autenticación.

Una fecha de expiración.

El backend devuelve al frontend:

El token JWT.

Los datos básicos del usuario (perfil) que la app necesita.

El frontend guarda ese token de forma local (por ejemplo, AsyncStorage en React Native).

En cada petición a un endpoint protegido, el frontend añade el encabezado:

Authorization: Bearer <TOKEN_JWT>

El middleware de autenticación del backend:

Lee el token del encabezado.

Verifica su firma y su validez (no caducado, no manipulado).

Asocia el usuario autenticado a la petición.

Si el token es válido, la petición llega al controlador y se ejecuta la lógica correspondiente.

Si el token es inválido, está ausente o ha caducado:

El backend responde con un código 401/403.

El frontend debe tratar ese caso (por ejemplo, forzar cierre de sesión y pedir login de nuevo).

En el cierre de sesión (logout), el frontend:

Elimina el token almacenado.

Puede llamar al endpoint de logout del backend para invalidar el token en el servidor si aplica.

Encabezado requerido en las peticiones privadas:
Authorization: Bearer <TOKEN_JWT>

### 2. Rutas de la API

Todas las rutas tienen el prefijo común:

/api/v1

#### 2.1 Rutas públicas (NO requieren JWT)

Estas rutas NO están protegidas por middleware y son accesibles siempre.

Autenticación
POST /api/v1/autenticacion/registrar
POST /api/v1/autenticacion/login

Localidades
GET /api/v1/localidades

Ejercicios
GET /api/v1/ejercicios
GET /api/v1/ejercicios/{id_ejercicio}

WODs (listado público)
GET /api/v1/wods

Publicaciones (social)
GET /api/v1/social/publicaciones/usuario/{perfilId}
GET /api/v1/social/publicaciones/{id}
GET /api/v1/social/publicaciones/{id}/comentarios

Likes públicos
GET /api/v1/social/likes/count/{publicacionId}
GET /api/v1/social/likes/exists

Medios públicos
GET /api/v1/social/publicaciones/{publicacionId}/medias

#### 2.2 Rutas protegidas (requieren JWT)

Todas estas rutas requieren enviar el encabezado:

Authorization: Bearer <TOKEN_JWT>

Autenticación protegida

POST /api/v1/autenticacion/refresh
POST /api/v1/autenticacion/logout

Perfil / Usuarios

GET /api/v1/usuarios/me
GET /api/v1/usuarios
GET /api/v1/usuarios/{id}
GET /api/v1/usuarios/{id}/seguidores
GET /api/v1/usuarios/{id}/seguidos

Actualización de perfil
PUT /api/v1/usuarios/actualizar-perfil
PATCH /api/v1/usuarios/actualizar-perfil

Seguir / dejar de seguir
POST /api/v1/usuarios/{id}/seguir
DELETE /api/v1/usuarios/{id}/dejarDeSeguirUsuario

Seguimientos sociales (toggle)
POST /api/v1/social/seguimientos/toggle

Ejercicios (CRUD protegido)

POST /api/v1/ejercicios
PUT /api/v1/ejercicios/{id_ejercicio}
DELETE /api/v1/ejercicios/{id_ejercicio}

WODs (entrenamientos)

POST /api/v1/wods
POST /api/v1/wods/{id}/ejercicios
GET /api/v1/wods/{id}
PUT /api/v1/wods/{id}
POST /api/v1/wods/{id}/resultado
POST /api/v1/wods/{id}/publicar

Social (publicaciones, comentarios, likes)

Feed protegido
GET /api/v1/social/publicaciones/feed

Publicaciones
POST /api/v1/social/publicaciones
DELETE /api/v1/social/publicaciones/{id}

Comentarios
POST /api/v1/social/comentarios
PATCH /api/v1/social/comentarios/{id}
DELETE /api/v1/social/comentarios/{id}
DELETE /api/v1/social/comentarios/usuario/{autorPerfilId}
DELETE /api/v1/social/comentarios/publicacion/{publicacionId}/usuario/{autorPerfilId}

Likes
POST /api/v1/social/likes/toggle

Seguimientos
POST /api/v1/social/seguimientos/toggle

Medios (archivos e imágenes)

POST /api/v1/social/publicaciones/{publicacionId}/medias
DELETE /api/v1/social/publicaciones/medias/{id}

Media general
POST /api/v1/media/subir
DELETE /api/v1/media/delete

### 3. Gestión de usuarios y perfil

Una vez autenticado, el usuario puede:

* Obtener su perfil.

* Actualizar datos personales (nombre, apellidos, nick, localidad, etc.).

* Cambiar avatar o imagen de cabecera (cuando se implemente).

* Consultar seguidores y seguidos.

El frontend utiliza estos endpoints para mostrar y actualizar la información del usuario en la app.

### 4. Módulo de ejercicios

Permite:

* Listar todos los ejercicios disponibles.

* Consultar el detalle de un ejercicio.

Cada ejercicio contiene:

* Nombre.

* Categoría o tipo.

* Descripción.

* Imagen asociada.

* Enlace a vídeo (por ejemplo, YouTube).

Estos datos los utiliza el frontend en las pantallas de listado y detalle de ejercicios.

### 5. Módulo de WODs (entrenamientos)

El sistema permite:

* Crear WODs personalizados.

* Asociar ejercicios a un WOD con repeticiones o tiempos.

* Consultar los WODs del usuario.

* Registrar y consultar resultados.

Ejemplo de flujo:

1. El usuario configura un WOD en la app.

2. El frontend envía los datos al endpoint correspondiente.

3. El backend guarda el WOD y devuelve su información.

4. Tras realizar el entrenamiento, el usuario guarda sus resultados.

### 6. Módulo social (publicaciones, comentarios, likes, seguimientos)

Funciones principales:

* Crear publicaciones con texto, imagen o vídeo.

* Listar publicaciones propias y de otros usuarios.

* Comentar publicaciones.

* Dar y quitar like.

* Seguir y dejar de seguir a otros perfiles.

Este módulo permite que la app funcione como una pequeña red social deportiva, vinculando el progreso de entrenamiento con interacción social.

### 7. Localidades

El módulo de localidades ofrece:

* Listado de localidades disponibles.

* Asignación de localidad al perfil de usuario.

El frontend usa estos endpoints para rellenar menús desplegables cuando el usuario edita su perfil.

### 8. Gestión de archivos multimedia

El backend gestiona:

* Imágenes subidas desde el dispositivo móvil.

* Rutas normalizadas para servir imágenes desde Laravel o Cloudinary.

Flujo típico:

1. La app envía una imagen mediante multipart/form-data.

2. El backend la sube a Cloudinary o la almacena según configuración.

3. Se guarda en la base de datos la URL final.

4. El endpoint devuelve la ruta que se muestra en la app.

### 9. Pruebas con Postman

Las pruebas de la API se han realizado principalmente con Postman, utilizando tablas organizadas por módulos (Usuarios, Ejercicios, WODs, Social) donde se detalla:

* Método (GET, POST, PUT, DELETE).

* Ruta del endpoint.

* Breve descripción.

* Si requiere autenticación o no.

* Ejemplo de body cuando aplica.

Se recomienda:

* Usar la URL base: http://localhost:8000/api/v1

* Probar primero las rutas públicas (registro, login, listados públicos).

* Probar después las rutas protegidas añadiendo el encabezado Authorization: Bearer <TOKEN_JWT>.

### 10. Integración con el frontend

En la app de React Native se utiliza una variable de entorno:

```env
EXPO_PUBLIC_API_URL="http://TU_IP_LOCAL:8000/api/v1"
```

Es importante usar la IP local de la máquina donde corre el backend (no localhost), para que el dispositivo físico o emulador pueda acceder.

El frontend:

* Obtiene el token JWT tras el login.

* Lo almacena (por ejemplo, en AsyncStorage).

* Lo añade en cada petición mediante el encabezado Authorization.

### 11. Problemas comunes y soluciones

* SQLSTATE[HY000]: base de datos inexistente

    * Crear la base de datos en MySQL con el nombre configurado en .env.

* Error 401 o 419 (no autorizado)

    * Comprobar que se está enviando correctamente el encabezado Authorization: Bearer <TOKEN_JWT>.

* Problemas con Cloudinary o imágenes

    * Revisar la variable CLOUDINARY_URL y las credenciales.

* Errores genéricos del servidor

    * Revisar el log de Laravel en: storage/logs/laravel.log.


### 12. Comandos útiles

Algunos comandos de Laravel útiles durante el desarrollo:

```bash
php artisan route:list
php artisan migrate:fresh
php artisan cache:clear
php artisan config:clear
php artisan optimize:clear
```
--- 

### Enlace a la documentación

La documentación detallada de la API (endpoints, ejemplos de peticiones y respuestas, códigos de estado, etc.) se encuentra en el siguiente enlace:

[Descargar documentación en PDF](docs/Documentacion_EPV_TFG_David_Cuevas_Gil_2_DAW.pdf)

---

### Conclusión

El backend de EPV Trainer implementa una arquitectura limpia, modular y escalable que permite cubrir tanto la parte deportiva (ejercicios, WODs, resultados) como la parte social (publicaciones, comentarios, likes y seguimientos).

Gracias a la separación en controladores, servicios, repositorios y DTOs, el proyecto resulta mantenible y extensible, facilitando la incorporación de nuevas funcionalidades en el futuro, como métricas avanzadas, más tipos de entrenamiento o integración con otros servicios externos.

---

### Contribuciones, agradecimientos y referencias

* Agradecimientos al profesorado del ciclo de Desarrollo de Aplicaciones Web por el apoyo y la guía durante el proyecto.

* A las personas cercanas que han colaborado aportando ideas, pruebas y feedback sobre la aplicación.

Referencias principales utilizadas:

* Documentación oficial de Laravel.

* Documentación oficial de PHP.

* Documentación de MySQL.

* Recursos de la comunidad.

---

### Licencias

Este proyecto se distribuye bajo la licencia GNU General Public License v3.0 (GPL-3.0), tal y como se especifica en el archivo LICENSE del repositorio.

Esto implica, entre otros puntos:

* Puedes usar, copiar y distribuir el código.

* Puedes modificarlo y crear trabajos derivados.

* Debes mantener los avisos de copyright y la licencia.

* Si distribuyes versiones modificadas, deben mantenerse bajo la misma licencia (copyleft fuerte).

* No se ofrece garantía alguna sobre el software (sin responsabilidad por daños).

Para más detalles, consulta el contenido completo de la licencia en el archivo LICENSE.

---

### Contacto

Autor: David Cuevas Gil
Correo: dcuevasgil@gmail.com
GitHub: https://github.com/Dcuevasgil

---
