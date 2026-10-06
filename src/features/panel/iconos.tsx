/**
 * Los íconos del panel: uno por módulo para el menú lateral, y los de plegar el
 * menú, cambiar la contraseña y salir. Spec 022, RF-5 y RF-9.
 *
 * Dibujados aquí con `react-native-svg`, que ya estaba en el proyecto, en vez de
 * traer una librería de íconos: sería una dependencia nueva (constitución 8) para
 * quince dibujos. `expo-symbols` tampoco sirve: son los símbolos de Apple, y en
 * el navegador no garantizan el mismo trazo.
 *
 * Todos sobre la misma cuadrícula de 24 y con el mismo trazo, redondeado, para que
 * se lean como una familia. El color lo pone quien los usa: el mismo ícono va
 * grafito en el menú y grafito sobre amarillo en el activo.
 *
 * El `satisfies Record<…>` obliga a que cada módulo tenga su ícono: un módulo
 * nuevo sin dibujo no compila.
 */
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { Modulo } from '@/shared/rules/permisos';

export type NombreDeIcono = Modulo | 'plegar' | 'abrir' | 'clave' | 'salir';

const DIBUJOS = {
  inicio: (
    <>
      <Path d="M3 10.5 12 3l9 7.5" />
      <Path d="M5 9v11h14V9" />
      <Path d="M10 20v-6h4v6" />
    </>
  ),
  bitacoras: (
    <>
      <Rect x={5} y={3} width={14} height={18} rx={2} />
      <Path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  whatsapp: (
    <>
      <Path d="M4 5h16v11H10l-6 4z" />
      <Path d="M8 9h8M8 12h5" />
    </>
  ),
  preoperacionales: (
    <>
      <Rect x={5} y={4} width={14} height={17} rx={2} />
      <Path d="M9 3h6v3H9z" />
      <Path d="m9 13 2 2 4-4" />
    </>
  ),
  almacen: (
    <>
      <Path d="M3 9.5 12 4l9 5.5V20H3z" />
      <Path d="M7 20v-7h10v7M7 16.5h10" />
    </>
  ),
  cantera: (
    <>
      <Path d="M2 15V7h11v8" />
      <Path d="M13 10h4l3 3.5V17h-1.5" />
      <Path d="M8.5 17h5" />
      <Circle cx={6} cy={17} r={2} />
      <Circle cx={16} cy={17} r={2} />
    </>
  ),
  laboratorio: (
    <>
      <Path d="M9 3h6" />
      <Path d="M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3" />
      <Path d="M7.5 15h9" />
    </>
  ),
  // Un casco y no un cono: a 20 px el cono se confundía con el matraz de Laboratorio.
  obras: (
    <>
      <Path d="M3 18h18" />
      <Path d="M5 18v-2a7 7 0 0 1 14 0v2" />
      <Path d="M10 9.5V6h4v3.5" />
    </>
  ),
  personas: (
    <>
      <Circle cx={9} cy={8} r={3} />
      <Path d="M3 20a6 6 0 0 1 12 0" />
      <Circle cx={17} cy={9} r={2.5} />
      <Path d="M16.5 14.5A4.5 4.5 0 0 1 21 19" />
    </>
  ),
  vehiculos: (
    <>
      <Path d="M3 16v-4l2-5h9l3 5h4v4h-2" />
      <Path d="M9 16h6M3 16h2" />
      <Circle cx={7} cy={17} r={2} />
      <Circle cx={17} cy={17} r={2} />
    </>
  ),
  asignaciones: (
    <>
      <Path d="M4 8h14l-3-3" />
      <Path d="M20 16H6l3 3" />
    </>
  ),
  plegar: (
    <>
      <Rect x={3} y={4} width={18} height={16} rx={2} />
      <Path d="M9 4v16M15.5 10l-2 2 2 2" />
    </>
  ),
  abrir: (
    <>
      <Rect x={3} y={4} width={18} height={16} rx={2} />
      <Path d="M9 4v16M13.5 10l2 2-2 2" />
    </>
  ),
  clave: (
    <>
      <Circle cx={8} cy={15} r={4} />
      <Path d="m11 12 9-9M17 6l3 3M14.5 8.5l2 2" />
    </>
  ),
  salir: (
    <>
      <Path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <Path d="m10 16-4-4 4-4M6 12h10" />
    </>
  ),
} satisfies Record<NombreDeIcono, ReactNode>;

export function Icono({
  nombre,
  color,
  tamano = 20,
}: {
  nombre: NombreDeIcono;
  color: string;
  tamano?: number;
}) {
  return (
    // Decorativo: el nombre del módulo va siempre al lado o en la etiqueta
    // flotante, así que el lector de pantalla no tiene que leer el dibujo. Se
    // oculta con `aria-hidden` en un `View` y no con las props nativas en el `Svg`:
    // `react-native-svg` las pasa crudas al DOM y React se queja.
    <View aria-hidden>
      <Svg
        width={tamano}
        height={tamano}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {DIBUJOS[nombre]}
      </Svg>
    </View>
  );
}
