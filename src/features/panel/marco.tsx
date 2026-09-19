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
import { useCallback, useEffect, useState, type ReactNode, type RefObject } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Colors,
  MaxContentWidthPanel,
  Panel,
  Spacing,
  TextoPanel,
} from '@/constants/theme';

import { avisoDeModuloAjeno, sinObraAsignada, type Modulo } from '@/shared/rules/permisos';

import { ErrorApi, mensajeDe } from './cliente-api';
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
  /**
   * El error del servidor para un campo del formulario, si lo hubo en el último
   * `ejecutar` (spec 007, RF-18). Se pasa tal cual al `error` del `Campo`.
   */
  errorDe: (campo: string) => string | undefined;
}

export function useListado<T>(cargar: () => Promise<T[]>): Listado<T> {
  const [datos, setDatos] = useState<T[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [camposConError, setCamposConError] = useState<Record<string, string>>({});
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
        setCamposConError({});
        setPulso((p) => p + 1);
        return true;
      } catch (fallo) {
        // Si el servidor dice qué campo falló, el motivo va debajo de ese campo
        // (spec 007, RF-18) y arriba queda solo el aviso de que hay algo que
        // corregir. El aviso no se quita del todo: si una pantalla no pinta ese
        // campo, al menos se sabe que algo falló.
        const campos = fallo instanceof ErrorApi ? (fallo.campos ?? {}) : {};
        setCamposConError(campos);
        setError(
          Object.keys(campos).length > 0 ? 'Revise los campos marcados.' : mensajeDe(fallo),
        );
        return false;
      }
    },
    [],
  );

  const errorDe = useCallback((campo: string) => camposConError[campo], [camposConError]);

  return { datos, cargando, error, recargar, ejecutar, setError, errorDe };
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
  refDesplazamiento,
  exigeObra,
  children,
}: {
  titulo: string;
  descripcion: string;
  error?: string | null;
  cargando?: boolean;
  modulo?: Modulo;
  /**
   * La referencia al desplazamiento de la pantalla, para quien necesite moverlo
   * —hoy solo el índice del parte diario, que salta a una sección—.
   *
   * **Opcional a propósito.** Las otras nueve pantallas no lo pasan y no se
   * enteran de que existe; exponerlo obligatoriamente habría sido cambiar diez
   * archivos para que uno pudiera desplazarse.
   */
  refDesplazamiento?: RefObject<ScrollView | null>;
  /**
   * El módulo solo tiene sentido dentro de una obra (spec 008, RF-6): una cuenta
   * que no es de gerencia y no tiene obra ve un aviso en lugar del contenido. Sin
   * él vería un listado vacío, indistinguible de «todavía no hay nada».
   */
  exigeObra?: boolean;
  children: ReactNode;
}) {
  const persona = usePersona();
  const avisoAjeno = modulo && persona ? avisoDeModuloAjeno(persona.rol, modulo) : null;
  const sinObra = Boolean(exigeObra && persona && sinObraAsignada(persona.rol, persona.obraId));

  return (
    <ScrollView
      ref={refDesplazamiento}
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenedor}
    >
      <View style={estilos.columna}>
        <View style={estilos.encabezado}>
          <Titulo>{titulo}</Titulo>
          <Text style={estilos.descripcion}>{descripcion}</Text>
        </View>

        {avisoAjeno ? (
          // El texto sale de la tabla de permisos: al residente se le dice que es de
          // la gerencia, y a un almacenista, dónde está su trabajo (008/RF-7).
          <Aviso tono="info">{avisoAjeno}</Aviso>
        ) : sinObra ? (
          <Aviso tono="info">
            Su cuenta no tiene obra asignada, así que aquí no hay nada que mostrarle. Pídale a la
            gerencia que le asigne su obra.
          </Aviso>
        ) : (
          <>
            {error ? <Aviso tono="error">{error}</Aviso> : null}

            {cargando ? (
              <View style={estilos.cargando}>
                <ActivityIndicator color={Panel.accion} />
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
