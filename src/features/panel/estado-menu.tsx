/**
 * El estado del menú lateral, compartido por el menú y por el marco del panel.
 * Spec 022, RF-8, RF-11, RF-12 y RF-13.
 *
 * Son dos cosas distintas y por eso viven separadas:
 *
 * - **La preferencia** (abierto o plegado) es de quien usa el computador y se
 *   recuerda entre visitas (RF-11).
 * - **El «abierto encima»** de una ventana angosta es un gesto del momento: se
 *   abre para elegir un módulo y se cierra al elegirlo (RF-13, RF-14). No se
 *   guarda; si se guardara, la próxima ventana ancha arrancaría con el menú que
 *   alguien abrió un segundo en el portátil.
 *
 * La preferencia se lee con `useSyncExternalStore` y no en un efecto: el servidor
 * pinta la página sin `window`, así que su instantánea es «sin preferencia», y
 * React reconcilia con lo guardado al hidratar sin error de hidratación. Con la
 * preferencia «plegado» el menú se ve abierto un instante antes de plegarse; el
 * plan lo acepta.
 *
 * Si el navegador no deja guardar, la elección vive en memoria mientras dure la
 * visita: el botón sigue plegando y abriendo, solo que no se recuerda.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useWindowDimensions } from 'react-native';

import { AnchoMenuAbierto, AnchoMenuPlegado, AnchoMinimoMenuFijo } from '@/constants/theme';

import {
  regimenDelMenu,
  type PreferenciaDelMenu,
  type RegimenDelMenu,
} from '@/shared/rules/menu';

import { almacenDelNavegador, guardarPreferencia, leerPreferencia } from './preferencia-menu';

/* ── La preferencia, como almacén externo de una sola entrada ── */

/** `undefined` es «todavía no se leyó»: se lee una vez y luego manda la memoria. */
let enMemoria: PreferenciaDelMenu | undefined;
const oyentes = new Set<() => void>();

function instantanea(): PreferenciaDelMenu {
  if (enMemoria === undefined) enMemoria = leerPreferencia(almacenDelNavegador());
  return enMemoria;
}

/** Lo que pinta el servidor: nadie ha elegido nada (RF-8). */
function instantaneaDelServidor(): PreferenciaDelMenu {
  return null;
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

function fijarPreferencia(valor: Exclude<PreferenciaDelMenu, null>) {
  enMemoria = valor;
  guardarPreferencia(almacenDelNavegador(), valor);
  oyentes.forEach((oyente) => oyente());
}

/* ── El contexto ── */

export interface EstadoMenu {
  regimen: RegimenDelMenu;
  /** Si el menú se ve con sus nombres, sea en su columna o encima del contenido. */
  abierto: boolean;
  /** Si está abierto **encima** del contenido, en ventana angosta (RF-13). */
  encima: boolean;
  /** Lo que el menú le quita al contenido. Abierto encima no quita nada. */
  anchoReservado: number;
  /** El botón de plegar y abrir (RF-9). */
  alternar: () => void;
  /** Cierra el menú abierto encima, al elegir un módulo o tocar el telón (RF-14). */
  cerrarEncima: () => void;
}

const Contexto = createContext<EstadoMenu | null>(null);

export function ProveedorMenu({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const preferencia = useSyncExternalStore(suscribir, instantanea, instantaneaDelServidor);
  const [abiertoEncima, setAbiertoEncima] = useState(false);

  // Sin medida todavía (el primer pintado del servidor), se supone una ventana ancha:
  // es lo que tiene una oficina, y así el servidor no pinta un riel que el navegador
  // corrige en seguida.
  const ventana = width > 0 ? width : AnchoMinimoMenuFijo;
  const regimen = regimenDelMenu({ ventana, preferencia });
  // Fuera del riel el «encima» no significa nada; se ignora en vez de borrarlo con
  // un efecto, y `alternar` lo deja cerrado al volver.
  const encima = regimen === 'riel' && abiertoEncima;

  const alternar = useCallback(() => {
    if (regimen === 'riel') {
      setAbiertoEncima((antes) => !antes);
      return;
    }
    setAbiertoEncima(false);
    fijarPreferencia(regimen === 'fijoAbierto' ? 'plegado' : 'abierto');
  }, [regimen]);

  const cerrarEncima = useCallback(() => setAbiertoEncima(false), []);

  const valor = useMemo<EstadoMenu>(
    () => ({
      regimen,
      abierto: regimen === 'fijoAbierto' || encima,
      encima,
      anchoReservado: regimen === 'fijoAbierto' ? AnchoMenuAbierto : AnchoMenuPlegado,
      alternar,
      cerrarEncima,
    }),
    [regimen, encima, alternar, cerrarEncima],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useMenu(): EstadoMenu {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useMenu fuera de <ProveedorMenu>');
  return valor;
}
