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
import { contarPendientes } from '@/features/sync/outbox';

import { asignacionesVigentesDe, historialDe, type VehiculoDelOperador } from './repositorio';

type Historial = Awaited<ReturnType<typeof historialDe>>;

const FORMATO_FECHA = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function InicioOperador() {
  const router = useRouter();
  const { usuario, bloquear } = useSesion();

  const [asignados, setAsignados] = useState<VehiculoDelOperador[]>([]);
  const [historial, setHistorial] = useState<Historial>([]);
  const [pendientes, setPendientes] = useState(0);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    const [vigentes, registros, cola] = await Promise.all([
      asignacionesVigentesDe(usuario.id),
      historialDe(usuario.id, 15),
      contarPendientes(),
    ]);
    setAsignados(vigentes);
    setHistorial(registros);
    setPendientes(cola);
    setCargando(false);
  }, [usuario]);

  // Al volver del preoperacional el historial y la cola cambiaron: recargar al
  // enfocar y no solo al montar.
  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const principal = asignados[0] ?? null;
  const hayVarios = asignados.length > 1;

  function empezar() {
    if (!principal) {
      router.push('/vehiculo');
      return;
    }
    router.push({ pathname: '/preoperacional', params: { vehiculoId: principal.id } });
  }

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} />}
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

          {principal.origen === 'autoasignada' ? (
            <Text style={estilos.autoasignado}>
              Autoasignado por usted. Su supervisor debe confirmarlo.
            </Text>
          ) : null}

          {principal.estado === 'no_apto' ? (
            <View style={estilos.avisoNoApto}>
              <Text style={estilos.avisoNoAptoTexto}>
                Este vehículo está marcado NO APTO por un hallazgo anterior.
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={estilos.tarjetaVacia}>
          <Text style={estilos.detalleVehiculo}>
            No tiene ningún vehículo asignado. Escoja la máquina que va a operar hoy.
          </Text>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={empezar}
        style={({ pressed }) => [estilos.botonPrimario, pressed && estilos.botonPresionado]}
      >
        <Text style={estilos.botonPrimarioTexto}>
          {principal ? 'Hacer preoperacional' : 'Escoger vehículo'}
        </Text>
      </Pressable>

      {principal ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/vehiculo')}
          style={({ pressed }) => [estilos.botonSecundario, pressed && estilos.presionado]}
        >
          <Text style={estilos.botonSecundarioTexto}>Cambiar de vehículo</Text>
        </Pressable>
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
    backgroundColor: Colors.light.backgroundElement,
  },
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
