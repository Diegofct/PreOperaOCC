/**
 * Selector de vehículo.
 *
 * Se llega aquí cuando el operador tiene varias máquinas asignadas y hay que
 * elegir cuál se inspecciona ahora. Se puede volver entre un preoperacional y
 * el siguiente las veces que haga falta: un operador de OCC cambia de máquina
 * dentro del mismo día.
 *
 * ── Lo que esta pantalla ya no hace ──
 *
 * Hasta la spec 012 mostraba debajo el resto de la flota de la obra, y escoger
 * una de esas creaba una asignación marcada `autoasignada` para que el
 * supervisor la confirmara. El argumento era no bloquear al operador. Se
 * cambió a conciencia: la administración decide qué máquina lleva cada quien, y
 * una máquina que aparece operada por alguien a quien nadie se la asignó es
 * justo lo que había que dejar de permitir. El riesgo asumido está escrito en
 * `AGENTS.md`.
 *
 * Aquí solo se lee. Nada de esta pantalla escribe en la base.
 */
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Estado, Marca, Radio, Spacing, Texto, Toque } from '@/constants/theme';
import { useUsuario } from '@/features/auth/sesion';
import {
  asignacionesVigentesDe,
  estadoDelDiaDe,
  type VehiculoAsignado,
  type VehiculoDelOperador,
} from '@/features/checklists/repositorio';
import type { EstadoDelDia } from '@/shared/rules/inspeccion';

const HORA_DEL_DIA = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' });

export default function PantallaVehiculo() {
  const router = useRouter();
  const usuario = useUsuario();

  const [asignados, setAsignados] = useState<VehiculoDelOperador[]>([]);
  const [estadosDelDia, setEstadosDelDia] = useState<Map<string, EstadoDelDia>>(new Map());
  const [cargando, setCargando] = useState(true);
  const [escogiendo, setEscogiendo] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      // La única fuente: lo que la administración le asignó y sigue vigente.
      const vigentes = await asignacionesVigentesDe(usuario.id);
      if (cancelado) return;

      // Cuáles de esas ya se revisaron hoy (spec 013, RF-8 y RF-11): esas no
      // ofrecen nada que pulsar, y las demás siguen ofreciendo el suyo.
      const estados = await estadoDelDiaDe(
        usuario.id,
        vigentes.map((vehiculo) => vehiculo.id),
      );
      if (cancelado) return;

      setAsignados(vigentes);
      setEstadosDelDia(estados);
      setCargando(false);
    })();
    return () => {
      cancelado = true;
    };
  }, [usuario.id]);

  function escoger(vehiculo: VehiculoAsignado) {
    if (escogiendo) return;
    setEscogiendo(vehiculo.id);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace({ pathname: '/preoperacional', params: { vehiculoId: vehiculo.id } });
  }

  if (cargando) {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator size="large" color={Marca.primario} />
      </View>
    );
  }

  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.contenido}>
      {asignados.length > 0 ? (
        <>
          <Text style={estilos.tituloSeccion}>Sus vehículos asignados</Text>
          {asignados.map((vehiculo) => {
            const estado = estadosDelDia.get(vehiculo.id);
            return (
              <TarjetaVehiculo
                key={vehiculo.id}
                vehiculo={vehiculo}
                autoasignado={vehiculo.origen === 'autoasignada'}
                hechoEn={estado && !estado.toca ? estado.hechoEn : null}
                ocupado={escogiendo === vehiculo.id}
                onPress={() => escoger(vehiculo)}
              />
            );
          })}
        </>
      ) : (
        <View style={estilos.avisoSinAsignacion}>
          <Text style={estilos.avisoTitulo}>No tiene vehículo asignado</Text>
          <Text style={estilos.avisoTexto}>
            Pídale a su residente que le asigne la máquina que va a operar. En cuanto la
            registre y el equipo sincronice, aparecerá aquí.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

/**
 * Una máquina de la lista.
 *
 * Si ya tuvo su preoperacional hoy **deja de ser pulsable** (spec 013, RF-8):
 * no es un botón deshabilitado, es que no hay botón. Se pinta como una ficha
 * con su aviso, y las demás siguen ofreciendo el suyo (RF-11).
 *
 * No repite el resultado —solo la hora—: para saber si quedó apta o con
 * novedades está el historial del inicio, con sus insignias. Aquí la pregunta
 * es otra, «¿a cuál le falta?», y la lista se lee más rápido sin esa palabra.
 */
function TarjetaVehiculo({
  vehiculo,
  autoasignado = false,
  hechoEn,
  ocupado,
  onPress,
}: {
  vehiculo: VehiculoAsignado;
  autoasignado?: boolean;
  hechoEn: number | null;
  ocupado: boolean;
  onPress: () => void;
}) {
  const noApto = vehiculo.estado === 'no_apto';

  const contenido = (
    <>
      <View style={estilos.tarjetaTexto}>
        <View style={estilos.tarjetaEncabezado}>
          <Text style={estilos.codigo}>{vehiculo.codigoInterno}</Text>
          {autoasignado ? (
            <View style={estilos.insignia}>
              <Text style={estilos.insigniaTexto}>AUTOASIGNADO</Text>
            </View>
          ) : null}
        </View>
        <Text style={estilos.detalle}>
          {[vehiculo.tipoNombre, vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' · ')}
        </Text>
        {vehiculo.placa ? <Text style={estilos.detalle}>Placa {vehiculo.placa}</Text> : null}
        {noApto ? <Text style={estilos.noApto}>Marcado NO APTO por un hallazgo anterior</Text> : null}
        {hechoEn !== null ? (
          <Text style={estilos.hecha}>
            Ya revisada hoy, a las {HORA_DEL_DIA.format(new Date(hechoEn))}
          </Text>
        ) : null}
      </View>
      {ocupado ? <ActivityIndicator color={Marca.primario} /> : null}
      {hechoEn === null && !ocupado ? <Text style={estilos.flecha}>›</Text> : null}
    </>
  );

  if (hechoEn !== null) {
    return <View style={[estilos.tarjeta, estilos.tarjetaHecha]}>{contenido}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [estilos.tarjeta, pressed && estilos.presionada]}
    >
      {contenido}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.light.background },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
  },
  contenido: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  tituloSeccion: {
    fontSize: Texto.etiqueta,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: Spacing.two,
  },
  avisoSinAsignacion: {
    padding: Spacing.four,
    borderRadius: Radio.lg,
    gap: Spacing.two,
    backgroundColor: Estado.atencionFondo,
  },
  avisoTitulo: { fontSize: Texto.etiqueta, fontWeight: '800', color: Estado.atencion },
  avisoTexto: { fontSize: Texto.base, lineHeight: 26, color: Estado.atencion },
  tarjeta: {
    minHeight: Toque.primario,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radio.lg,
    backgroundColor: Colors.light.backgroundElement,
  },
  presionada: { backgroundColor: Colors.light.backgroundSelected },
  tarjetaHecha: { backgroundColor: Estado.conformeFondo },
  hecha: {
    fontSize: Texto.pie,
    fontWeight: '700',
    color: Estado.conforme,
    marginTop: Spacing.one,
  },
  tarjetaTexto: { flex: 1, gap: Spacing.half },
  tarjetaEncabezado: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  codigo: { fontSize: Texto.titulo, fontWeight: '800', color: Colors.light.text },
  detalle: { fontSize: Texto.base, color: Colors.light.textSecondary },
  noApto: { fontSize: Texto.pie, fontWeight: '700', color: Estado.noConforme, marginTop: Spacing.one },
  insignia: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radio.pastilla,
    backgroundColor: Estado.atencionFondo,
  },
  insigniaTexto: { fontSize: Texto.pie, fontWeight: '800', letterSpacing: 0.5, color: Estado.atencion },
  flecha: { fontSize: Texto.titular, color: Colors.light.textSecondary },
});
