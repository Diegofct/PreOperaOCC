/**
 * La superficie del operador.
 *
 * El archivo de ruta es deliberadamente una línea. Toda la lógica vive en
 * `@/features/operador/layout-operador`, que tiene variante `.web.tsx`: el
 * constructor del manifiesto de rutas de Expo Router **evalúa todos los módulos
 * de ruta**, así que una extensión de plataforma sobre este archivo no evitaría
 * que `src/db/local` entrara al bundle web. Sobre un import normal sí: Metro
 * resuelve la variante de la plataforma antes de evaluar nada.
 */
export { default } from '@/features/operador/layout-operador';
