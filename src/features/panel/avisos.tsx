/**
 * Los avisos de lo que acaba de pasar (spec 050, RF-55 a RF-60, RF-81, RF-82).
 *
 * Antes, cada pantalla tenía su renglón verde de «hecho» dentro de la página (`Confirmado`), y cada ventana
 * su renglón rojo arriba del formulario. Con la página desplazada no se veían, y uno se quedaba sin saber
 * si había guardado. Ahora salen abajo, encima de todo, siempre en el mismo sitio:
 *
 * - **el de éxito** dice qué pasó («Requisición aprobada») y se va solo a los `DuracionDeAviso` (RF-56);
 * - **el de error** se queda hasta que alguien lo cierra (RF-57, D8): un error que se va solo es un error
 *   que nadie leyó;
 * - **si salen varios**, se apilan con el más nuevo encima (RF-58);
 * - **llevan ícono y texto**, nunca solo el color (RF-60), y **no hay «Deshacer»** (RF-59): las anulaciones
 *   del sistema llevan su motivo escrito y no se deshacen con un toque.
 *
 * El proveedor va en `marco-sesion`, por encima del `Stack`, y por eso un aviso sobrevive al cambio de
 * pantalla: si guardar lleva a otra, el aviso se ve en la que llega (RF-81).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AnchoDeAviso, DuracionDeAviso, Estado, FuentePanel, Grosor, Radio, Sombra, Spacing, TextoPanel } from '@/constants/theme';

import { CapaDeAvisos } from './capa-de-avisos';

interface Avisos {
  /** Lo que salió bien, en pocas palabras: «Requisición aprobada». */
  exito: (texto: string) => void;
  /** Lo que falló y no es de un campo: sin conexión, otra persona ya lo cambió, el servidor. */
  error: (texto: string) => void;
}

interface UnAviso {
  id: number;
  tono: 'exito' | 'error';
  texto: string;
}

/** Fuera del proveedor —una prueba, una pantalla suelta— un aviso no hace nada, en vez de romperla. */
const ContextoDeAvisos = createContext<Avisos>({ exito: () => {}, error: () => {} });

export function useAvisos(): Avisos {
  return useContext(ContextoDeAvisos);
}

export function ProveedorDeAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<UnAviso[]>([]);
  const siguiente = useRef(1);

  const quitar = useCallback((id: number) => setAvisos((todos) => todos.filter((a) => a.id !== id)), []);
  const poner = useCallback((tono: UnAviso['tono'], texto: string) => {
    const id = siguiente.current++;
    // El más nuevo, primero: se pinta encima (RF-58).
    setAvisos((todos) => [{ id, tono, texto }, ...todos]);
  }, []);
  const valor = useMemo<Avisos>(
    () => ({ exito: (texto) => poner('exito', texto), error: (texto) => poner('error', texto) }),
    [poner],
  );

  // Para probar los avisos a mano en el servidor de desarrollo sin forzar una acción de verdad. No existe
  // en el panel publicado.
  useEffect(() => {
    if (!__DEV__) return;
    const global = globalThis as { avisosDelPanel?: Avisos };
    global.avisosDelPanel = valor;
    return () => {
      delete global.avisosDelPanel;
    };
  }, [valor]);

  return (
    <ContextoDeAvisos.Provider value={valor}>
      {children}
      {avisos.length > 0 ? (
        <CapaDeAvisos>
          <View style={estilos.pila} pointerEvents="box-none">
            {avisos.map((a) => (
              <Aviso key={a.id} aviso={a} alQuitar={quitar} />
            ))}
          </View>
        </CapaDeAvisos>
      ) : null}
    </ContextoDeAvisos.Provider>
  );
}

function Aviso({ aviso, alQuitar }: { aviso: UnAviso; alQuitar: (id: number) => void }) {
  // RF-56: el de éxito se va solo; el de error, no.
  useEffect(() => {
    if (aviso.tono !== 'exito') return;
    const reloj = setTimeout(() => alQuitar(aviso.id), DuracionDeAviso);
    return () => clearTimeout(reloj);
  }, [aviso, alQuitar]);

  const error = aviso.tono === 'error';
  return (
    <View
      style={[estilos.aviso, error ? estilos.avisoError : estilos.avisoExito]}
      // Un error interrumpe a quien lee con lector de pantalla; un éxito espera su turno.
      role={error ? 'alert' : 'status'}
      aria-live={error ? 'assertive' : 'polite'}
    >
      <Text style={[estilos.simbolo, error ? estilos.textoError : estilos.textoExito]}>{error ? '✕' : '✓'}</Text>
      <Text style={[estilos.texto, error ? estilos.textoError : estilos.textoExito]}>{aviso.texto}</Text>
      {error ? (
        <Pressable onPress={() => alQuitar(aviso.id)} accessibilityRole="button" accessibilityLabel="Cerrar el aviso" style={estilos.cerrar}>
          <Text style={[estilos.cerrarTexto, estilos.textoError]}>Cerrar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  // Abajo a la izquierda: los botones del pie de una ventana van a la derecha (RF-82).
  pila: {
    position: 'absolute',
    left: Spacing.four,
    bottom: Spacing.four,
    maxWidth: AnchoDeAviso,
    gap: Spacing.two,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radio.md,
    borderCurve: 'continuous',
    borderLeftWidth: Grosor.marca,
    boxShadow: Sombra.flotante,
    // La capa no recibe el puntero; el aviso sí, para su «Cerrar».
    pointerEvents: 'auto',
  },
  avisoExito: { backgroundColor: Estado.conformeFondo, borderLeftColor: Estado.conforme },
  avisoError: { backgroundColor: Estado.noConformeFondo, borderLeftColor: Estado.noConforme },
  simbolo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.seccion, fontWeight: '800' },
  texto: { flexShrink: 1, fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, fontWeight: '600' },
  textoExito: { color: Estado.conforme },
  textoError: { color: Estado.noConforme },
  cerrar: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.two, borderRadius: Radio.sm },
  cerrarTexto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, fontWeight: '700', textDecorationLine: 'underline' },
});
