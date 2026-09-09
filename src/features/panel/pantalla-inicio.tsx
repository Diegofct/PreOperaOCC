/**
 * La portada del panel.
 *
 * Su trabajo es responder de un vistazo "¿está esto listo para trabajar?". El
 * orden de las tarjetas es el de las dependencias reales —sin obra no se puede
 * colocar un vehículo, sin vehículo y sin operador no hay asignación, y la
 * bitácora necesita las tres— y por eso la que está incompleta se señala: es el
 * siguiente paso, no un adorno.
 */
import { Link } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Colors,
  Movimiento,
  Panel,
  Radio,
  Sombra,
  Spacing,
  TextoPanel,
} from '@/constants/theme';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { alcanza } from '@/shared/rules/permisos';

import { api } from './cliente-api';
import { Aviso, Seccion } from './componentes';
import type {
  AsignacionFila,
  JornadaDePreoperacionales,
  JornadaFila,
  ObraFila,
  PersonaFila,
  VehiculoFila,
} from './contratos';
import { MarcoPantalla, useListado } from './marco';
import { usePersona } from './sesion';

/** «1 operador», no «1 operadores»: la portada se lee todos los días. */
function plural(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

export default function PantallaInicioPanel() {
  const persona = usePersona();
  const rol = persona?.rol ?? 'operador';

  // El residente no alcanza el listado de obras, así que ni se pide: pedirlo
  // devolvería un 403 y el inicio entero se pintaría con un error en rojo por
  // un dato que además no le sirve. Personas y vehículos sí los alcanza —los
  // necesitan Asignaciones y Bitácoras—, por eso esos dos sí se piden siempre.
  const veObras = alcanza(rol, 'obras', 'listar');
  const obras = useListado<ObraFila>(
    useCallback(() => (veObras ? api.obras.listar() : Promise.resolve([])), [veObras]),
  );
  const personas = useListado<PersonaFila>(useCallback(() => api.personas.listar(), []));
  const vehiculos = useListado<VehiculoFila>(useCallback(() => api.vehiculos.listar(), []));
  const asignaciones = useListado<AsignacionFila>(useCallback(() => api.asignaciones.listar(), []));
  const jornada = useListado<JornadaFila>(
    useCallback(async () => [await api.bitacoras.delDia(fechaDeJornada())], []),
  );
  const inspecciones = useListado<JornadaDePreoperacionales>(
    useCallback(async () => [await api.preoperacionales.delDia(fechaDeJornada())], []),
  );

  const sinConfirmar = asignaciones.datos.filter(
    (a) => a.origen === 'autoasignada' && a.hasta === null,
  ).length;

  const sinBitacora = jornada.datos[0]?.pendientes.length ?? 0;

  const delDia = inspecciones.datos[0];
  const noAptos =
    delDia?.preoperacionales.filter((p) => p.resultado === 'no_apto' && !p.anuladoEn).length ?? 0;
  const sinInspeccionar = delDia?.pendientes.length ?? 0;

  // Ninguna cifra ni ningún atajo de un módulo al que este rol no entra: un
  // enlace que lleva a un aviso de «esto no es suyo» es peor que no estar.
  const tarjetas = [
    {
      modulo: 'obras' as const,
      ruta: '/panel/obras' as const,
      titulo: 'Obras',
      total: obras.datos.length,
      pie: 'Frentes de trabajo',
    },
    {
      modulo: 'personas' as const,
      ruta: '/panel/personas' as const,
      titulo: 'Personas',
      total: personas.datos.length,
      pie: plural(personas.datos.filter((p) => p.rol === 'operador').length, 'operador', 'operadores'),
    },
    {
      modulo: 'vehiculos' as const,
      ruta: '/panel/vehiculos' as const,
      titulo: 'Vehículos',
      total: vehiculos.datos.length,
      pie: 'Maquinaria registrada',
    },
    {
      modulo: 'asignaciones' as const,
      ruta: '/panel/asignaciones' as const,
      titulo: 'Asignaciones',
      total: asignaciones.datos.filter((a) => a.hasta === null).length,
      pie: 'Vigentes',
    },
    {
      modulo: 'bitacoras' as const,
      ruta: '/panel/bitacoras' as const,
      titulo: 'Bitácoras de hoy',
      total: jornada.datos[0]?.bitacoras.length ?? 0,
      pie:
        sinBitacora === 0
          ? 'Ninguna máquina pendiente'
          : `${plural(sinBitacora, 'máquina', 'máquinas')} sin abrir`,
    },
    {
      modulo: 'preoperacionales' as const,
      ruta: '/panel/preoperacionales' as const,
      titulo: 'Preoperacionales de hoy',
      total: delDia?.preoperacionales.length ?? 0,
      pie: noAptos === 0 ? 'Ninguno NO APTO' : `${noAptos} NO APTO`,
    },
  ].filter((tarjeta) => alcanza(rol, tarjeta.modulo, 'ver'));

  // Habla de registrar obras, maquinaria y personas: es la lista de tareas de
  // la gerencia, no la del residente.
  const siguientePaso = !alcanza(rol, 'obras', 'escribir')
    ? null
    : obras.datos.length === 0
      ? 'Empieza registrando una obra: todo lo demás cuelga de ella.'
      : vehiculos.datos.length === 0
        ? 'Ya hay obra. El siguiente paso es registrar la maquinaria.'
        : personas.datos.length === 0
          ? 'Falta registrar a los operadores.'
          : asignaciones.datos.filter((a) => a.hasta === null).length === 0
            ? 'Solo falta asignarle una máquina a cada operador.'
            : null;

  return (
    <MarcoPantalla
      titulo="Administración"
      descripcion={
        alcanza(rol, 'obras', 'escribir')
          ? 'Desde aquí se registran las obras, las personas, la maquinaria y sus asignaciones. Lo que se registre acá es lo que verá el operador en su celular.'
          : 'Cómo va hoy su obra: qué máquinas están asignadas, qué bitácoras faltan por cerrar y qué preoperacionales llegaron del campo.'
      }
      error={
        obras.error ??
        personas.error ??
        vehiculos.error ??
        asignaciones.error ??
        jornada.error ??
        inspecciones.error
      }
      cargando={
        obras.cargando ||
        personas.cargando ||
        vehiculos.cargando ||
        asignaciones.cargando ||
        jornada.cargando ||
        inspecciones.cargando
      }
    >
      {siguientePaso ? <Aviso tono="info">{siguientePaso}</Aviso> : null}

      {sinInspeccionar > 0 ? (
        <Aviso tono="error">
          {sinInspeccionar === 1
            ? 'Hoy hay 1 máquina sin preoperacional. Si está trabajando, se está usando sin inspeccionar.'
            : `Hoy hay ${sinInspeccionar} máquinas sin preoperacional. Si están trabajando, se están usando sin inspeccionar.`}
        </Aviso>
      ) : null}

      {sinBitacora > 0 ? (
        <Aviso tono="error">
          {sinBitacora === 1
            ? 'Hoy queda 1 máquina sin bitácora. Ábrala antes de que termine la jornada: reconstruirla después es adivinar.'
            : `Hoy quedan ${sinBitacora} máquinas sin bitácora. Ábralas antes de que termine la jornada: reconstruirlas después es adivinar.`}
        </Aviso>
      ) : null}

      {sinConfirmar > 0 ? (
        <Aviso tono="error">
          {sinConfirmar === 1
            ? 'Un operador tomó una máquina en obra sin asignación previa. Revísala en Asignaciones.'
            : `${sinConfirmar} operadores tomaron máquinas en obra sin asignación previa. Revísalas en Asignaciones.`}
        </Aviso>
      ) : null}

      <Seccion titulo="Resumen">
        <View style={estilos.tarjetas}>
          {tarjetas.map((tarjeta) => (
            // `asChild` es obligatorio aquí: un `Link` sin él se comporta como
            // un texto, y los tres renglones de la tarjeta saldrían pegados en
            // una sola línea. Con `asChild` el enlace cede el render al
            // `Pressable`, que sí apila.
            <Link key={tarjeta.ruta} href={tarjeta.ruta} asChild>
              <Pressable style={estilos.enlaceTarjeta}>
                <TarjetaResumen>
                  <Text style={estilos.tarjetaTitulo}>{tarjeta.titulo}</Text>
                  <Text style={estilos.tarjetaTotal}>{tarjeta.total}</Text>
                  <Text style={estilos.tarjetaPie}>{tarjeta.pie}</Text>
                </TarjetaResumen>
              </Pressable>
            </Link>
          ))}
        </View>
      </Seccion>

      <Seccion titulo="Cómo llegan las firmas y las fotos">
        <Text style={estilos.nota}>
          El preoperacional llega completo, con la firma del operador, en cuanto su celular agarra
          señal. Las fotos de los hallazgos viajan aparte y se suman al entrar a una WiFi, para no
          gastarle el plan de datos al operador. El acta ya es válida desde que llega, y el detalle
          va marcando las fotos que vienen en camino.
        </Text>
      </Seccion>
    </MarcoPantalla>
  );
}

/**
 * La caja blanca de una tarjeta, con su elevación bajo el cursor.
 *
 * Va en un `View` interno y no en el `Pressable`: `Link` con `asChild` le impone
 * su propio `style` al hijo, y un estilo-función ahí se pierde — la tarjeta se
 * queda sin fondo ni relleno, que fue exactamente lo que pasó.
 */
function TarjetaResumen({ children }: { children: ReactNode }) {
  const [encima, setEncima] = useState(false);

  return (
    <View
      onPointerEnter={() => setEncima(true)}
      onPointerLeave={() => setEncima(false)}
      style={[estilos.tarjeta, encima && estilos.tarjetaHover]}
    >
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  // El enlace solo aporta el reparto del espacio; el aspecto lo pone la tarjeta.
  enlaceTarjeta: { flexGrow: 1, flexBasis: 190, minWidth: 190 },
  tarjetas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  tarjeta: {
    flex: 1,
    gap: Spacing.half,
    padding: Spacing.three,
    borderRadius: Radio.md,
    borderCurve: 'continuous',
    backgroundColor: Colors.light.background,
    boxShadow: Sombra.tarjeta,
    transitionDuration: `${Movimiento.rapido}ms`,
  },
  // La tarjeta se levanta bajo el cursor: es lo que dice que se puede pulsar,
  // sin necesidad de dibujarle un botón dentro.
  tarjetaHover: { boxShadow: Sombra.elevada, backgroundColor: Panel.fondoHover },
  tarjetaTitulo: {
    // Dos renglones fijos: «Preoperacionales de hoy» ocupa dos y los demás uno,
    // y sin esta altura su cifra quedaba un renglón más abajo que las otras
    // cinco. Seis números que no comparten línea no se comparan de un vistazo.
    minHeight: 30,
    lineHeight: 15,
    fontSize: TextoPanel.micro,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: Colors.light.textSecondary,
  },
  tarjetaTotal: {
    fontSize: TextoPanel.cifra,
    fontWeight: '800',
    lineHeight: 34,
    color: Colors.light.text,
  },
  tarjetaPie: { fontSize: TextoPanel.apoyo, color: Colors.light.textSecondary },
  nota: { fontSize: TextoPanel.cuerpo, lineHeight: 21, color: Colors.light.textSecondary },
});
