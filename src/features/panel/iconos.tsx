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

export type NombreDeIcono =
  | Modulo
  | 'plegar'
  | 'abrir'
  | 'clave'
  | 'salir'
  // Los del asistente tipo chat (spec 028, cambio del 2026-10-22).
  | 'enviar'
  | 'detener'
  | 'adjuntar'
  | 'copiar'
  | 'listo'
  | 'pdf'
  | 'reintentar'
  | 'buscar'
  | 'nueva'
  // Los del grupo empresarial (spec 033) y de sus menús definitivos (cambio del 2026-10-27).
  | 'empresa'
  | 'finanzas'
  | 'compras'
  | 'documentos'
  | 'licitaciones';

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
  // Spec 028: un globo de conversación con un destello, la pregunta que se le hace.
  asistente: (
    <>
      <Path d="M4 5h11v8H9l-4 3v-3H4z" />
      <Path d="M18 9.5v.01M18 4l.9 2.1L21 7l-2.1.9L18 10l-.9-2.1L15 7l2.1-.9z" />
      <Path d="M8 9h4" />
    </>
  ),
  // Spec 031: una hoja con su firma al pie, como un contrato.
  contrato: (
    <>
      <Path d="M7 3h7l4 4v14H7z" />
      <Path d="M14 3v4h4M10 11h5M10 14h5" />
      <Path d="M9 18c1-1.5 2-1.5 2.5 0s1.5 1 3-0.5" />
    </>
  ),
  // Spec 030: unas barras sobre su eje, como en una gráfica de un reporte.
  reportes: (
    <>
      <Path d="M4 4v16h16" />
      <Path d="M8 16v-4M12 16V8M16 16v-6" />
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
  // Spec 028, cambio del 2026-10-22: los del campo para preguntar y las acciones de la respuesta.
  enviar: <Path d="M12 19V5M6 11l6-6 6 6" />,
  detener: <Rect x={7} y={7} width={10} height={10} rx={1.5} />,
  adjuntar: <Path d="M12 5v14M5 12h14" />,
  copiar: (
    <>
      <Rect x={8} y={8} width={12} height={12} rx={2} />
      <Path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  listo: <Path d="m5 12.5 4.5 4.5L19 7.5" />,
  pdf: (
    <>
      <Path d="M7 3h7l4 4v4" />
      <Path d="M14 3v4h4M7 3v8" />
      <Path d="M12 14v7M9 18l3 3 3-3" />
    </>
  ),
  reintentar: (
    <>
      <Path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <Path d="M20 4v5h-5" />
    </>
  ),
  buscar: (
    <>
      <Circle cx={11} cy={11} r={6} />
      <Path d="m20 20-4.5-4.5" />
    </>
  ),
  nueva: (
    <>
      <Path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
      <Path d="M17.5 3.5a2.1 2.1 0 0 1 3 3L13 14l-4 1 1-4z" />
    </>
  ),
  // Spec 033: un edificio, la empresa.
  empresa: (
    <>
      <Rect x={4} y={3} width={11} height={18} rx={1} />
      <Path d="M15 9h5v12h-5M8 7h3M8 11h3M8 15h3M10 21v-3" />
    </>
  ),
  // Un signo de pesos en un círculo: la información financiera.
  finanzas: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2.2 0 2.8 6 1.4 6 4.1 0 1.3-1.3 2.2-3 2.2-1.5 0-2.6-.6-3.1-1.6M12 6.5v11" />
    </>
  ),
  // Un carrito: lo que se pide comprar.
  compras: (
    <>
      <Path d="M3 4h2.5l2.2 11h10.6L20.5 7H7" />
      <Circle cx={9.5} cy={19} r={1.5} />
      <Circle cx={16.5} cy={19} r={1.5} />
    </>
  ),
  // Una carpeta: el repositorio de documentos.
  documentos: (
    <>
      <Path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />
    </>
  ),
  // Una caja con la flecha que sale: otra aplicación, en una pestaña nueva.
  licitaciones: (
    <>
      <Path d="M13 4h7v7M20 4l-9 9" />
      <Path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
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
