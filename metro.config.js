const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Drizzle genera sus migraciones como archivos .sql que se importan en línea
// para poder ejecutarlas dentro del bundle nativo.
config.resolver.sourceExts.push('sql');

// `pg` declara varias dependencias opcionales que solo existen en otros
// runtimes (nativo de C, Cloudflare Workers). Metro intenta resolverlas y
// falla aunque el código nunca las use, así que las vaciamos.
const OPCIONALES_DE_PG = new Set(['pg-native', 'pg-cloudflare', 'cloudflare:sockets']);

const resolverOriginal = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (OPCIONALES_DE_PG.has(moduleName)) {
    return { type: 'empty' };
  }
  return (resolverOriginal ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
