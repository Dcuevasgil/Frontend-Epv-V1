module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            // --- Carpetas principales ---
            '@': './src/js',                         // raíz de tu código JS
            '@pags': './src/js/paginas',             // páginas
            '@tabs': './src/js/paginas/pestanas',    // pestañas / tabs

            // --- Estructura compartida ---
            '@comp': './src/shared/componentes',     // componentes reutilizables
            '@conf': './src/shared/config',          // configuración o constantes
            '@nav': './src/app_navigator/navegacion', // navegación
            '@asset': './src/assets',                // imágenes, íconos, etc.

            // --- Rutas nuevas y necesarias ---
            '@api': './src/shared/api',              // servicios o peticiones HTTP
            '@util': './src/shared/utils',            // utilidades y normalizadores
          },
          extensions: [
            '.js', '.jsx', '.ts', '.tsx', '.json',
            '.png', '.jpg', '.jpeg', '.svg',
          ],
        },
      ],
      // ⚠️ SIEMPRE al final:
      'react-native-reanimated/plugin',
    ],
  };
};
