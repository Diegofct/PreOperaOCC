module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Las migraciones de Drizzle son archivos .sql que hay que incrustar en
      // el bundle: dentro del teléfono no hay sistema de archivos del proyecto.
      ['inline-import', { extensions: ['.sql'] }],
    ],
  };
};
