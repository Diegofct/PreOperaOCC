/**
 * El esqueleto que comparten las cuatro pantallas de registro.
 *
 * Las cuatro hacen lo mismo: cargar un listado, dejar dar de alta y dejar dar de
 * baja. Lo que cambia son los campos. Sin esto, cada una repetiría su propio
 * `useEffect` de carga, su propio estado de "cargando" y su propio sitio donde
 * pintar el error — y en la cuarta ya no se parecerían entre sí.
 *
 * `useListado` sirve la carga y la recarga; `MarcoPantalla` sirve el encabezado,
 * el aviso de error y el ancho de página.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Colors,
  Marca,
  MaxContentWidthPanel,
  Panel,
  Spacing,
  TextoPanel,
} from '@/constants/theme';

import { alcanza, type Modulo } from '@/shared/rules/permisos';

import { Aviso, Titulo } from './componentes';
import { usePersona } from './sesion';

export interface Listado<T> {
  datos: T[];
  cargando: boolean;
  error: string | null;
  /** Vuelve a pedir el listado. Se llama después de cada alta o baja. */
  recargar: () => void;
  /** Ejecuta una acción y recarga si sale bien; si falla, deja el mensaje puesto. */
  ejecutar: (accion: () => Promise<unknown>) => Promise<boolean>;
  setError: (mensaje: string | null) => void;
}

export function useListado<T>(cargar: () => Promise<T[]>): Listado<T> {
  const [datos, setDatos] = useState<T[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /**
   * Contador de recargas. Pedir de nuevo el listado es cambiar este número, no
   * llamar a la función de carga: así el efecto es el único sitio que dispara
   * una petición, y no hay forma de que una recarga se quede fuera de su
   * limpieza y pise con datos viejos a los de una petición posterior.
   */
  const [pulso, setPulso] = useState(0);

  useEffect(() => {
    let vigente = true;

    cargar()
      .then((filas) => {
        if (!vigente) return;
        setDatos(filas);
        setError(null);
      })
      .catch((fallo: unknown) => {
        if (vigente) setError(mensajeDe(fallo));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [cargar, pulso]);

  /**
   * Recargar no vuelve a poner "cargando".
   *
   * Solo el primer arranque muestra ese estado; después de dar de alta algo, la
   * tabla se actualiza en su sitio. Volver a la pantalla de carga cada vez que
   * se registra un vehículo haría parpadear la página entera y perdería la
   * posición del formulario, que es donde está trabajando quien lo usa.
   */
  const recargar = useCallback(() => setPulso((p) => p + 1), []);

  const ejecutar = useCallback(
    async (accion: () => Promise<unknown>) => {
      try {
        await accion();
        setError(null);
        setPulso((p) => p + 1);
        return true;
      } catch (fallo) {
        setError(mensajeDe(fallo));
        return false;
      }
    },
    [],
  );

  return { datos, cargando, error, recargar, ejecutar, setError };
}

/**
 * El texto que se le puede enseñar a una persona sobre cualquier fallo.
 *
 * `ErrorApi` ya trae el mensaje del servidor, que está redactado para leerse.
 * Un `Error` cualquiera —un fallo del propio navegador— también se muestra: es
 * más útil que un "algo falló" mientras esto corre en desarrollo.
 */
export function mensajeDe(fallo: unknown): string {
  if (fallo instanceof Error) return fallo.message;
  return 'Algo falló. Vuelve a intentarlo.';
}

/**
 * El marco de toda pantalla del panel, y de paso su portero.
 *
 * `modulo` es opcional a propósito: una pantalla que se olvide de declararlo se
 * comporta como antes, y el dato sigue protegido por la ruta del servidor, que
 * es la cerradura de verdad. Esto de aquí es para que el residente vea una
 * explicación en vez de una tabla vacía y un error.
 *
 * El corte va antes de pintar nada, así que la pantalla ni siquiera llega a
 * pedir los datos que no le tocan.
 */
export function MarcoPantalla({
  titulo,
  descripcion,
  error,
  cargando,
  modulo,
  children,
}: {
  titulo: string;
  descripcion: string;
  error?: string | null;
  cargando?: boolean;
  modulo?: Modulo;
  children: ReactNode;
}) {
  const persona = usePersona();
  const fueraDeAlcance = modulo && persona && !alcanza(persona.rol, modulo, 'ver');

  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.contenedor}>
      <View style={estilos.columna}>
        <View style={estilos.encabezado}>
          <Titulo>{titulo}</Titulo>
          <Text style={estilos.descripcion}>{descripcion}</Text>
        </View>

        {fueraDeAlcance ? (
          <Aviso tono="info">
            Este módulo es de la gerencia. Si necesita registrar o corregir algo aquí,
            pídaselo a quien lleve la administración.
          </Aviso>
        ) : (
          <>
            {error ? <Aviso tono="error">{error}</Aviso> : null}

            {cargando ? (
              <View style={estilos.cargando}>
                <ActivityIndicator color={Marca.primario} />
                <Text style={estilos.descripcion}>Cargando…</Text>
              </View>
            ) : (
              children
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  // El lienzo es gris, no blanco: es lo que hace que las tarjetas y las tablas
  // se lean como objetos apoyados encima en vez de como bloques flotando en un
  // vacío del mismo color que ellos.
  pantalla: { flex: 1, backgroundColor: Panel.fondo },
  contenedor: { alignItems: 'center', padding: Spacing.four, paddingBottom: Spacing.six },
  columna: { width: '100%', maxWidth: MaxContentWidthPanel, gap: Spacing.four },
  encabezado: { gap: Spacing.one, maxWidth: 720 },
  descripcion: {
    fontSize: TextoPanel.cuerpo,
    lineHeight: 21,
    color: Colors.light.textSecondary,
  },
  cargando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
});
