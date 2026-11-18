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
  FuentePanel,
  AnchoFormulario,
  AnchoListado,
  Panel,
  Spacing,
  TextoPanel,
} from '@/constants/theme';

import {
  avisoDeModuloAjeno,
  avisoDeModuloApagado,
  moduloApagado,
  sinObraAsignada,
  type Modulo,
} from '@/shared/rules/permisos';

import { useAvisos } from './avisos';
import { ErrorApi, mensajeDe } from './cliente-api';
import { Aviso, Titulo } from './componentes';
import { Migas } from './migas';
import { repartirFallo } from './repartir-fallo';
import { useObraEnUso } from './obra-en-uso';
import { usePersona } from './sesion';
import { useEsAngosto } from './usar-ancho';

/**
 * Un flujo que se lanza con un botón y sigue con avisos de progreso y ventanas —proponer con IA, subir un
 * Excel, crear desde el presupuesto— se entrega en dos piezas (spec 050, RF-30): los `botones`, que van al
 * encabezado de la pantalla (`MarcoPantalla.acciones`), y el `cuerpo`, que se queda en la página. Las dos salen
 * del mismo componente, que guarda el estado del flujo: así el botón y su progreso no se separan de verdad,
 * solo se pintan en dos sitios.
 */
export interface PartesDeLaAccion {
  botones: ReactNode;
  cuerpo: ReactNode;
}

export interface Listado<T> {
  datos: T[];
  cargando: boolean;
  error: string | null;
  /** Vuelve a pedir el listado. Se llama después de cada alta o baja. */
  recargar: () => void;
  /** Ejecuta una acción y recarga si sale bien; si falla, deja el mensaje puesto. */
  /**
   * Corre una acción y vuelve a pedir el listado si sale bien (spec 050, RF-55, RF-57, RF-79): con
   * `exito`, ese aviso; si falla por un campo, el motivo debajo del campo (`errorDe`); si falla por otra
   * cosa, el aviso de error. El error de la pantalla queda para lo que falla al cargar.
   */
  ejecutar: (accion: () => Promise<unknown>, opciones?: { exito?: string }) => Promise<boolean>;
  setError: (mensaje: string | null) => void;
  /**
   * El error del servidor para un campo del formulario, si lo hubo en el último
   * `ejecutar` (spec 007, RF-18). Se pasa tal cual al `error` del `Campo`.
   */
  errorDe: (campo: string) => string | undefined;
}

/**
 * @param conCampos  la pantalla pinta `errorDe` en los campos de su formulario. Sin eso, un motivo «de campo»
 *   que falle en `ejecutar` no se vería en ningún sitio, así que va al aviso de error (spec 050, RF-57, RF-79).
 */
export function useListado<T>(
  cargar: () => Promise<T[]>,
  { conCampos = false }: { conCampos?: boolean } = {},
): Listado<T> {
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

  const avisos = useAvisos();
  const ejecutar = useCallback(
    async (accion: () => Promise<unknown>, opciones?: { exito?: string }) => {
      try {
        await accion();
        setCamposConError({});
        setPulso((p) => p + 1);
        if (opciones?.exito) avisos.exito(opciones.exito);
        return true;
      } catch (fallo) {
        // Spec 050, RF-57, RF-79: el motivo debajo de su campo, o en el aviso de error; nunca en el
        // renglón de la pantalla, que se ve detrás de una ventana o lejos del botón que se pulsó.
        // Solo si la pantalla pinta `errorDe` en sus campos (`conCampos`): si no, el motivo no se vería.
        const señalados = fallo instanceof ErrorApi && conCampos ? (fallo.campos ?? {}) : {};
        const { campos, aviso } = repartirFallo(señalados, mensajeDe(fallo));
        setCamposConError(campos);
        if (aviso) avisos.error(aviso);
        return false;
      }
    },
    [avisos, conCampos],
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
  acciones,
  registro,
  ancho = 'listado',
  children,
}: {
  titulo: string;
  descripcion: string;
  /**
   * La acción principal de la pantalla —«Nueva requisición», «Subir documento»— (spec 050, RF-30 a
   * RF-32): a la derecha del título, y debajo y a lo ancho en el celular. Quien la pasa decide si el
   * cargo puede hacerla; si no puede, no pasa nada y no sale (RF-32).
   */
  acciones?: ReactNode;
  /**
   * El nombre del registro que se está viendo —una solicitud, una persona—, que es el tercer paso
   * de la ruta de arriba (RF-27). Sin él, la ruta termina en el módulo.
   */
  registro?: string;
  /**
   * Hasta dónde llega la pantalla en un monitor grande (spec 050, RF-42, RF-43, D1, D2): un listado
   * o un tablero, hasta 1600; un formulario o una ficha que se lee de arriba abajo, hasta 1100, para
   * no tener que mover la vista de un extremo al otro de la pantalla en cada renglón.
   */
  ancho?: 'listado' | 'formulario';
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
  // Spec 041: la obra de esta pestaña, no la que la sesión tenía al cargar. Para quien lleva
  // una sola obra es la misma; para el Director de Obra, la de la dirección.
  const enUso = useObraEnUso();
  const avisoAjeno = modulo && persona ? avisoDeModuloAjeno(persona.rol, modulo) : null;
  // «Sin obra» es no tener ninguna, no tener ninguna abierta: el Director de Obra con varias
  // que todavía no escogió no es alguien sin obra (041/RF-24).
  const sinObra = Boolean(exigeObra && persona && sinObraAsignada(persona.rol, persona.obras[0] ?? null));
  // Su cargo le abre el módulo, pero su obra no lo lleva (spec 017, RF-8). Va
  // después del aviso de cargo: si tampoco es de su cargo, eso es lo que hay que
  // decirle.
  const apagado = Boolean(modulo && enUso && moduloApagado(modulo, enUso.modulos));
  const angosto = useEsAngosto();

  return (
    <ScrollView
      ref={refDesplazamiento}
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenedor}
    >
      <View style={[estilos.columna, ancho === 'formulario' && estilos.columnaFormulario]}>
        {/* Spec 050, RF-26 a RF-32: la ruta, el título y su descripción, con la acción principal a
            la derecha; en el celular, debajo y a lo ancho. */}
        <View style={[estilos.encabezado, angosto && estilos.encabezadoAngosto]}>
          <View style={[estilos.textosDelEncabezado, angosto && estilos.textosAngostos]}>
            <Migas registro={registro} />
            <Titulo>{titulo}</Titulo>
            <Text style={estilos.descripcion}>{descripcion}</Text>
          </View>
          {acciones ? <View style={angosto ? estilos.accionesAngosto : estilos.acciones}>{acciones}</View> : null}
        </View>

        {avisoAjeno ? (
          // El texto sale de la tabla de permisos: al residente se le dice que es de
          // la gerencia, y a un almacenista, dónde está su trabajo (008/RF-7).
          <Aviso tono="info">{avisoAjeno}</Aviso>
        ) : apagado && modulo ? (
          <Aviso tono="info">{avisoDeModuloApagado(modulo)}</Aviso>
        ) : sinObra ? (
          <Aviso tono="info">
            Su cuenta no tiene obra asignada, así que aquí no hay nada que mostrarle. Pídale a la
            Gerencia o al Director de Proyectos que le asignen su obra.
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
  // El lienzo es crema, no blanco (spec 022): es lo que hace que las tarjetas y
  // las tablas se lean como objetos apoyados encima en vez de como bloques
  // flotando en un vacío del mismo color que ellos.
  pantalla: { flex: 1, backgroundColor: Panel.fondo },
  contenedor: { alignItems: 'center', padding: Spacing.four, paddingBottom: Spacing.six },
  // 20 y no 24 entre secciones (spec 039, RF-24).
  columna: { width: '100%', maxWidth: AnchoListado, gap: Spacing.three + Spacing.one },
  columnaFormulario: { maxWidth: AnchoFormulario },
  encabezado: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  encabezadoAngosto: { flexDirection: 'column', alignItems: 'stretch' },
  // El texto no pasa de una medida de lectura, aunque la pantalla mida 1600.
  textosDelEncabezado: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, maxWidth: 720, gap: Spacing.one },
  // En columna, `flexBasis: 0` le daba alto cero y el botón se montaba encima del título (RF-31).
  textosAngostos: { flexBasis: 'auto', flexGrow: 0 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  // RF-31: debajo del título y a lo ancho, un botón por renglón.
  accionesAngosto: { flexDirection: 'column', alignItems: 'stretch', gap: Spacing.two },
  descripcion: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.cuerpo,
    lineHeight: 21,
    color: Panel.textoApoyo,
  },
  cargando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
});
