/**
 * Las direcciones del panel de antes del cambio (`/panel/bitacoras`, `/panel/vehiculos`…)
 * llevan a su pantalla dentro de su empresa, con sus parámetros (spec 033, RF-47). Así
 * siguen sirviendo los enlaces de WhatsApp, de los PDF, del asistente y los marcadores.
 */

import { Redirect, usePathname, type Href } from 'expo-router';
import { Platform } from 'react-native';

import { usePersona } from '@/features/panel/sesion';
import { rutaNueva } from '@/shared/rules/empresas';

import { PantallaQueNoExiste } from './pantallas-de-aviso';

export default function RedirigirARutaNueva() {
  const persona = usePersona();
  const ruta = usePathname();
  // Los parámetros tal como llegaron: `usePathname` no los trae.
  const consulta = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.search : '';
  const nueva = rutaNueva(`${ruta}${consulta}`, persona);
  if (!nueva) return <PantallaQueNoExiste />;
  return <Redirect href={nueva as Href} />;
}
