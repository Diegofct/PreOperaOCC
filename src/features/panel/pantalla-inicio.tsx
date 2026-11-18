/**
 * `/panel`: la puerta del panel (spec 033, RF-1, RF-6 a RF-9).
 *
 * La gerencia ve las tarjetas de las empresas (050/RF-88). Los demás no pasan por tarjetas que no
 * les tocan (033/H7): van directo al Asistente de donde trabajan (050/RF-84, RF-89, RF-90, D9 y
 * D12), o a la lista de obras si llevan varias (041/RF-24). Lo decide `destinoAlEntrar`.
 *
 * La redirección vive aquí y no en el ingreso porque se llega a `/panel` por varias puertas: el
 * ingreso se pinta sobre esta dirección, alguien la escribe o recarga la página. Si estuviera en
 * el ingreso, las otras dos se la saltarían.
 *
 * Hasta la spec 050 este archivo también tenía la portada de cada obra, con sus cifras del día.
 * Se retiró (RF-86, D10): lo que mostraba está en cada módulo y se le puede preguntar al
 * Asistente, que es la portada ahora.
 */
import { Redirect, type Href } from 'expo-router';

import { PantallaEmpresas } from '@/features/empresas/pantalla-empresas';
import { PantallaSinAcceso } from '@/features/empresas/pantallas-de-aviso';
import { destinoAlEntrar } from '@/shared/rules/empresas';

import { usePersona } from './sesion';

export default function PantallaInicioPanel() {
  const persona = usePersona();
  if (persona.rol === 'admin') return <PantallaEmpresas />;
  // Spec 041: todas sus obras. Con varias, el Director de Obra va a la lista (RF-24); con una, a
  // esa (RF-25).
  const destino = destinoAlEntrar({ rol: persona.rol, obras: persona.obras });
  return destino ? <Redirect href={destino as Href} /> : <PantallaSinAcceso />;
}
