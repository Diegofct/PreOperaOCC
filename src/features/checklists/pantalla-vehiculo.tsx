/**
 * Selector de vehículo.
 *
 * Se llega aquí cuando el operador tiene varias máquinas asignadas, o ninguna.
 * El caso de "ninguna" es el importante: en vez de bloquearlo, se le deja
 * escoger y la asignación queda marcada `autoasignada` para que el supervisor
 * la confirme desde el dashboard. Un operador bloqueado no deja de trabajar —
 * arranca la máquina sin preoperacional, que es justo lo que este sistema
 * existe para evitar.
 */
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Estado, Marca, Radio, Spacing, Texto, Toque } from '@/constants/theme';
import { useUsuario } from '@/features/auth/sesion';
import {
  asignacionesVigentesDe,
  autoasignar,
  flotaDeObra,
  type VehiculoAsignado,
  type VehiculoDelOperador,
} from '@/features/checklists/repositorio';

export default function PantallaVehiculo() {
  const router = useRouter();
  const usuario = useUsuario();

  const [asignados, setAsignados] = useState<VehiculoDelOperador[]>([]);
  const [otros, setOtros] = useState<VehiculoAsignado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [escogiendo, setEscogiendo] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const vigentes = await asignacionesVigentesDe(usuario.id);
      // Sin asignación no se conoce la obra del operador; en ese caso se
      // muestra toda la flota que tenga el equipo. El pull de la Fase 2 ya trae
      // solo los vehículos de su obra, así que la lista nunca crece sin control.
      const flota = await flotaDeObra(vigentes[0]?.obraId ?? null);
      if (cancelado) return;

      const yaAsignados = new Set(vigentes.map((v) => v.id));
      setAsignados(vigentes);
      setOtros(flota.filter((v) => !yaAsignados.has(v.id)));
      setCargando(false);
    })();
    return () => {
      cancelado = true;
    };
  }, [usuario.id]);

  async function escoger(vehiculo: VehiculoAsignado, requiereAutoasignar: boolean) {
    if (escogiendo) return;
    setEscogiendo(vehiculo.id);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (requiereAutoasignar) await autoasignar(usuario.id, vehiculo.id);
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
          {asignados.map((vehiculo) => (
            <TarjetaVehiculo
              key={vehiculo.id}
              vehiculo={vehiculo}
              autoasignado={vehiculo.origen === 'autoasignada'}
              ocupado={escogiendo === vehiculo.id}
              onPress={() => void escoger(vehiculo, false)}
            />
          ))}
        </>
      ) : (
        <View style={estilos.avisoSinAsignacion}>
          <Text style={estilos.avisoTitulo}>No tiene vehículo asignado</Text>
          <Text style={estilos.avisoTexto}>
            Escoja la máquina que va a operar hoy. Quedará registrada a su nombre y su
            supervisor la verá para confirmarla.
          </Text>
        </View>
      )}

      {otros.length > 0 ? (
        <>
          <Text style={estilos.tituloSeccion}>
            {asignados.length > 0 ? 'Otros vehículos de la obra' : 'Vehículos de la obra'}
          </Text>
          {asignados.length > 0 ? (
            <Text style={estilos.notaSeccion}>
              Si escoge uno de estos, quedará registrado como autoasignado.
            </Text>
          ) : null}
          {otros.map((vehiculo) => (
            <TarjetaVehiculo
              key={vehiculo.id}
              vehiculo={vehiculo}
              ocupado={escogiendo === vehiculo.id}
              onPress={() => void escoger(vehiculo, true)}
            />
          ))}
        </>
      ) : null}

      {asignados.length === 0 && otros.length === 0 ? (
        <Text style={estilos.vacio}>
          Este equipo no tiene ningún vehículo cargado. Comuníquese con su supervisor.
        </Text>
      ) : null}
    </ScrollView>
  );
}

function TarjetaVehiculo({
  vehiculo,
  autoasignado = false,
  ocupado,
  onPress,
}: {
  vehiculo: VehiculoAsignado;
  autoasignado?: boolean;
  ocupado: boolean;
  onPress: () => void;
}) {
  const noApto = vehiculo.estado === 'no_apto';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [estilos.tarjeta, pressed && estilos.presionada]}
    >
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
      </View>
      {ocupado ? <ActivityIndicator color={Marca.primario} /> : <Text style={estilos.flecha}>›</Text>}
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
  notaSeccion: { fontSize: Texto.pie, color: Colors.light.textSecondary, marginTop: -Spacing.two },
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
  vacio: { fontSize: Texto.base, color: Colors.light.textSecondary },
});
