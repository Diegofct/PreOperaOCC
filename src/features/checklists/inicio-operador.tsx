/**
 * El inicio del operador de máquina.
 *
 * Su trabajo en la app es uno solo: el preoperacional. La bitácora la lleva el
 * jefe de operadores, así que aquí no aparece por ningún lado.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FilaUsuario, PildoraSincronizacion } from '@/components/ui/cabecera-inicio';
import { Colors, Estado, Marca, Radio, Spacing, Texto, Toque } from '@/constants/theme';
import { useSesion } from '@/features/auth/sesion';
import { sincronizacionCompleta } from '@/features/sync/motor';
import { contarPendientes, reencolarFallidas } from '@/features/sync/outbox';
import type { ResultadoPreoperacional } from '@/features/checklists/types';
import type { EstadoDelDia } from '@/shared/rules/inspeccion';

import {
  asignacionesVigentesDe,
  estadoDelDiaDe,
  historialDe,
  type VehiculoDelOperador,
} from './repositorio';

type Historial = Awaited<ReturnType<typeof historialDe>>;

const FORMATO_FECHA = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const HORA_DEL_DIA = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' });

/**
 * Cómo se nombra cada resultado en esta pantalla.
 *
 * Son las mismas palabras que ya usan las insignias del historial, aquí abajo:
 * el operador no tiene que aprender dos vocabularios para lo mismo. Y va en
 * palabras porque el color nunca es la única señal.
 */
const PALABRA_DEL_RESULTADO: Record<ResultadoPreoperacional, string> = {
  apto: 'Apto',
  apto_con_observaciones: 'Con novedades',
  no_apto: 'NO APTO',
};

export function InicioOperador() {
  const router = useRouter();
  const { usuario, bloquear } = useSesion();

  const [asignados, setAsignados] = useState<VehiculoDelOperador[]>([]);
  const [historial, setHistorial] = useState<Historial>([]);
  const [pendientes, setPendientes] = useState(0);
  const [cargando, setCargando] = useState(true);
  /** Qué máquinas ya tuvieron su preoperacional de hoy (spec 013). */
  const [estadosDelDia, setEstadosDelDia] = useState<Map<string, EstadoDelDia>>(new Map());

  const cargar = useCallback(async () => {
    if (!usuario) return;
    const [vigentes, registros, cola] = await Promise.all([
      asignacionesVigentesDe(usuario.id),
      historialDe(usuario.id, 15),
      contarPendientes(),
    ]);
    // Después de las asignaciones, porque necesita saber por qué máquinas
    // preguntar. Se recalcula en cada carga, y por eso el aviso se cae solo al
    // cambiar el día de trabajo (RF-12): nadie tiene que hacer nada.
    const estados = await estadoDelDiaDe(
      usuario.id,
      vigentes.map((vehiculo) => vehiculo.id),
    );
    setAsignados(vigentes);
    setHistorial(registros);
    setPendientes(cola);
    setEstadosDelDia(estados);
    setCargando(false);
  }, [usuario]);

  // Al volver del preoperacional el historial y la cola cambiaron: recargar al
  // enfocar y no solo al montar.
  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  /**
   * Deslizar para refrescar es el único reintento que pide una persona.
   *
   * Además de releer la pantalla, devuelve a la cola lo que un fallo definitivo
   * dio por perdido y vuelve a intentar la subida. Es la salida para el registro
   * que el servidor rechazó por un fallo que ya se corrigió: sin esto, un acta
   * firmada se queda varada en el teléfono sin manera de sacarla.
   *
   * **Desde la spec 012 también baja**, no solo sube. Antes, un operador sin
   * máquina se escogía una y seguía; ahora espera a que se la asignen, y si
   * deslizar solo subiera, la asignación que el residente acaba de registrar no
   * llegaría hasta que el operador cerrara y reabriera la app. Eso convertiría
   * esta pantalla en un callejón sin salida (RF-10).
   *
   * **No se espera**: se relee lo local de inmediato y se vuelve a leer si la
   * sincronización llega a completarse. Un `await` aquí sería un spinner
   * esperando al servidor, que es lo que esta app no hace en ninguna pantalla.
   */
  const refrescar = useCallback(async () => {
    await reencolarFallidas();
    void sincronizacionCompleta().then(() => void cargar());
    await cargar();
  }, [cargar]);

  const principal = asignados[0] ?? null;
  const hayVarios = asignados.length > 1;
  /**
   * Si la máquina principal ya tuvo su preoperacional hoy, no hay botón que
   * pulsar (spec 013, RF-8). Sin botón no hay forma de equivocarse; el aviso de
   * la tarjeta dice por qué.
   */
  const hechoHoy = principal ? estadosDelDia.get(principal.id) : undefined;
  const yaLoHizo = hechoHoy !== undefined && !hechoHoy.toca ? hechoHoy : null;

  // Sin vehículo vigente no hay preoperacional que empezar (RF-9). El botón ni
  // siquiera se pinta; la guarda está por si alguien lo vuelve a pintar.
  function empezar() {
    if (!principal) return;
    router.push({ pathname: '/preoperacional', params: { vehiculoId: principal.id } });
  }

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      refreshControl={<RefreshControl refreshing={cargando} onRefresh={refrescar} />}
    >
      <PildoraSincronizacion pendientes={pendientes} />
      <FilaUsuario nombre={usuario?.nombreCompleto ?? ''} onSalir={bloquear} />

      {principal ? (
        <View style={estilos.tarjetaVehiculo}>
          <Text style={estilos.etiqueta}>
            {hayVarios ? `Vehículo actual · ${asignados.length} asignados` : 'Vehículo asignado'}
          </Text>
          <Text style={estilos.codigo}>{principal.codigoInterno}</Text>
          <Text style={estilos.detalleVehiculo}>
            {[principal.tipoNombre, principal.marca, principal.modelo].filter(Boolean).join(' · ')}
          </Text>
          {principal.placa ? (
            <Text style={estilos.detalleVehiculo}>Placa {principal.placa}</Text>
          ) : null}
          {principal.obraNombre ? (
            <Text style={estilos.detalleVehiculo}>{principal.obraNombre}</Text>
          ) : null}

          {/* Hasta que el script de la spec 012 las cierre, un operador puede
              seguir viendo una máquina que se puso él mismo. Decía «su
              supervisor debe confirmarlo», y desde que el panel perdió esa
              acción eso dejó de ser verdad. */}
          {principal.origen === 'autoasignada' ? (
            <Text style={estilos.autoasignado}>
              Esta máquina la escogió usted, no se la asignaron. Avísele a su residente.
            </Text>
          ) : null}

          {principal.estado === 'no_apto' ? (
            <View style={estilos.avisoNoApto}>
              <Text style={estilos.avisoNoAptoTexto}>
                Este vehículo está marcado NO APTO por un hallazgo anterior.
              </Text>
            </View>
          ) : null}

          {/* El preoperacional se hace una vez por jornada (spec 013, RF-9 y
              RF-10). Lleva la hora y el resultado para que el operador
              reconozca que es el suyo y no tenga que abrir nada. */}
          {yaLoHizo ? (
            <View style={estilos.avisoHecho}>
              <Text style={estilos.avisoHechoTexto}>
                Ya le hizo el preoperacional hoy, a las{' '}
                {HORA_DEL_DIA.format(new Date(yaLoHizo.hechoEn))}. Quedó{' '}
                {PALABRA_DEL_RESULTADO[yaLoHizo.resultado]}.
              </Text>
              <Text style={estilos.avisoHechoPie}>Mañana vuelve a aparecer el botón.</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={estilos.tarjetaVacia}>
          <Text style={estilos.tituloVacia}>No tiene ningún vehículo asignado</Text>
          <Text style={estilos.textoVacia}>
            Pídale a su residente que le asigne la máquina que va a operar. Cuando la
            registre, deslice esta pantalla hacia abajo y aparecerá aquí.
          </Text>
        </View>
      )}

      {principal ? (
        <>
          {yaLoHizo ? null : (
            <Pressable
              accessibilityRole="button"
              onPress={empezar}
              style={({ pressed }) => [estilos.botonPrimario, pressed && estilos.botonPresionado]}
            >
              <Text style={estilos.botonPrimarioTexto}>Hacer preoperacional</Text>
            </Pressable>
          )}

          {/* Solo con más de una máquina asignada (012/RF-6). Con una sola, este
              botón llevaba a una pantalla con una única tarjeta —la misma que ya
              está aquí arriba— y volver a pulsarla abría otra vez su formulario.
              Antes de la spec 012 tenía sentido, porque esa pantalla ofrecía
              además el resto de la flota de la obra; al quitarla en T3 el botón
              se quedó sin nada que ofrecer. */}
          {hayVarios ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/vehiculo')}
              style={({ pressed }) => [estilos.botonSecundario, pressed && estilos.presionado]}
            >
              <Text style={estilos.botonSecundarioTexto}>Cambiar de vehículo</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}

      <Text style={estilos.tituloSeccion}>Últimos registros</Text>
      {historial.length === 0 ? (
        <Text style={estilos.vacio}>Todavía no ha registrado ningún preoperacional.</Text>
      ) : (
        historial.map((registro) => (
          <View key={registro.id} style={estilos.filaHistorial}>
            <View style={estilos.filaHistorialTexto}>
              <Text style={estilos.historialCodigo}>{registro.codigoInterno}</Text>
              <Text style={estilos.historialFecha}>
                {FORMATO_FECHA.format(new Date(registro.enviadoEn ?? registro.iniciadoEn))}
              </Text>
            </View>
            <EtiquetaResultado resultado={registro.resultado} estadoSync={registro.estadoSync} />
          </View>
        ))
      )}
    </ScrollView>
  );
}

function EtiquetaResultado({
  resultado,
  estadoSync,
}: {
  resultado: string | null;
  estadoSync: string;
}) {
  if (estadoSync === 'borrador') {
    return <Insignia texto="Sin terminar" color={Estado.na} fondo={Estado.naFondo} />;
  }
  // La spec 011 añadió `descartado` para el borrador que se quedó con un formato
  // viejo. Sin este caso caía hasta el final y se pintaba **«Apto»**: un registro
  // que nadie llenó diciendo que la máquina pasó la inspección.
  if (estadoSync === 'descartado') {
    return <Insignia texto="Descartado" color={Estado.na} fondo={Estado.naFondo} />;
  }
  if (resultado === 'no_apto') {
    return <Insignia texto="NO APTO" color={Estado.noConforme} fondo={Estado.noConformeFondo} />;
  }
  if (resultado === 'apto_con_observaciones') {
    return <Insignia texto="Con novedades" color={Estado.atencion} fondo={Estado.atencionFondo} />;
  }
  return <Insignia texto="Apto" color={Estado.conforme} fondo={Estado.conformeFondo} />;
}

function Insignia({ texto, color, fondo }: { texto: string; color: string; fondo: string }) {
  return (
    <View style={[estilos.insignia, { backgroundColor: fondo }]}>
      <Text style={[estilos.insigniaTexto, { color }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.light.background },
  contenido: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  tarjetaVehiculo: {
    padding: Spacing.four,
    borderRadius: Radio.lg,
    backgroundColor: Colors.light.backgroundElement,
    gap: Spacing.half,
  },
  tarjetaVacia: {
    padding: Spacing.four,
    borderRadius: Radio.lg,
    gap: Spacing.two,
    backgroundColor: Estado.atencionFondo,
  },
  tituloVacia: { fontSize: Texto.etiqueta, fontWeight: '800', color: Estado.atencion },
  textoVacia: { fontSize: Texto.base, lineHeight: 26, color: Estado.atencion },
  etiqueta: {
    fontSize: Texto.pie,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codigo: { fontSize: Texto.titular, fontWeight: '800', color: Colors.light.text },
  detalleVehiculo: { fontSize: Texto.base, color: Colors.light.textSecondary },
  autoasignado: {
    marginTop: Spacing.two,
    fontSize: Texto.pie,
    fontWeight: '700',
    color: Estado.atencion,
  },
  avisoNoApto: {
    marginTop: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radio.md,
    backgroundColor: Estado.noConformeFondo,
  },
  avisoHecho: {
    marginTop: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radio.md,
    gap: Spacing.one,
    backgroundColor: Estado.conformeFondo,
  },
  avisoHechoTexto: { fontSize: Texto.base, lineHeight: 26, fontWeight: '700', color: Estado.conforme },
  avisoHechoPie: { fontSize: Texto.pie, color: Estado.conforme },
  avisoNoAptoTexto: { fontSize: Texto.base, fontWeight: '700', color: Estado.noConforme },
  botonPrimario: {
    minHeight: Toque.primario,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radio.lg,
    backgroundColor: Marca.primario,
  },
  botonPresionado: { backgroundColor: Marca.primarioPresionado },
  botonPrimarioTexto: { fontSize: Texto.etiqueta, fontWeight: '800', color: Marca.sobreColor },
  botonSecundario: {
    minHeight: Toque.minimo,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radio.lg,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
  },
  botonSecundarioTexto: { fontSize: Texto.base, fontWeight: '700', color: Marca.primarioTexto },
  tituloSeccion: {
    fontSize: Texto.etiqueta,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: Spacing.two,
  },
  vacio: { fontSize: Texto.base, color: Colors.light.textSecondary },
  filaHistorial: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.backgroundSelected,
  },
  filaHistorialTexto: { gap: Spacing.half },
  historialCodigo: { fontSize: Texto.base, fontWeight: '700', color: Colors.light.text },
  historialFecha: { fontSize: Texto.pie, color: Colors.light.textSecondary },
  insignia: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radio.pastilla },
  insigniaTexto: { fontSize: Texto.pie, fontWeight: '800' },
  presionado: { opacity: 0.7 },
});
