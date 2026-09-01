/**
 * El inicio del jefe de operadores (residente de obra o supervisor).
 *
 * Su trabajo en la app es uno solo: cerrar las bitácoras del día. La pantalla
 * está construida alrededor de una sola pregunta — *¿cuáles me faltan?* — y por
 * eso lo primero que se ve es el contador, y las máquinas sin llenar van
 * primero y en ámbar.
 *
 * Esa lista es la defensa real, no el recordatorio: en los Xiaomi y Huawei que
 * abundan en obra la notificación puede no sonar nunca.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FilaUsuario, PildoraSincronizacion } from '@/components/ui/cabecera-inicio';
import { Colors, Estado, Marca, Radio, Spacing, Texto, Toque } from '@/constants/theme';
import { useSesion } from '@/features/auth/sesion';
import { contarPendientes } from '@/features/sync/outbox';

import { abrirBitacora, maquinasDelDia, obraDelUsuario, type MaquinaDelDia } from './repositorio';

export function InicioJefe() {
  const router = useRouter();
  const { usuario, bloquear } = useSesion();

  const [obra, setObra] = useState<{ id: string; nombre: string } | null>(null);
  const [maquinas, setMaquinas] = useState<MaquinaDelDia[]>([]);
  const [pendientes, setPendientes] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [abriendo, setAbriendo] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    const suObra = await obraDelUsuario(usuario.id);
    const [flota, cola] = await Promise.all([
      suObra ? maquinasDelDia(suObra.id) : Promise.resolve([]),
      contarPendientes(),
    ]);
    setObra(suObra);
    setMaquinas(flota);
    setPendientes(cola);
    setCargando(false);
  }, [usuario]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  async function abrir(maquina: MaquinaDelDia) {
    if (!usuario || abriendo) return;
    setAbriendo(maquina.vehiculoId);
    try {
      const id = await abrirBitacora({
        usuarioId: usuario.id,
        vehiculoId: maquina.vehiculoId,
        obraId: obra?.id ?? null,
        operadorId: maquina.operadorId,
      });
      router.push({
        pathname: '/bitacora',
        params: { bitacoraId: id, ...(maquina.operadorNombre ? { operadorNombre: maquina.operadorNombre } : {}) },
      });
    } finally {
      setAbriendo(null);
    }
  }

  const listas = maquinas.filter((m) => m.completa).length;
  const faltan = maquinas.filter((m) => !m.completa);
  const hechas = maquinas.filter((m) => m.completa);

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} />}
    >
      <PildoraSincronizacion pendientes={pendientes} />
      <FilaUsuario nombre={usuario?.nombreCompleto ?? ''} onSalir={bloquear} />

      {!obra ? (
        <View style={estilos.tarjetaVacia}>
          <Text style={estilos.detalle}>
            Su usuario no tiene obra asignada, así que no sabemos qué máquinas le corresponden.
            Comuníquese con el administrador.
          </Text>
        </View>
      ) : (
        <>
          <View style={[estilos.resumen, listas === maquinas.length && estilos.resumenCompleto]}>
            <Text style={estilos.resumenObra}>{obra.nombre}</Text>
            <Text
              style={[
                estilos.resumenCifra,
                listas === maquinas.length && estilos.resumenCifraCompleta,
              ]}
            >
              {listas} de {maquinas.length}
            </Text>
            <Text style={estilos.detalle}>
              {maquinas.length === 0
                ? 'Esta obra no tiene máquinas cargadas.'
                : listas === maquinas.length
                  ? 'Todas las bitácoras del día están listas.'
                  : 'bitácoras del día registradas'}
            </Text>
          </View>

          {faltan.length > 0 ? (
            <>
              <Text style={estilos.tituloSeccion}>Faltan por registrar</Text>
              {faltan.map((maquina) => (
                <FilaMaquina
                  key={maquina.vehiculoId}
                  maquina={maquina}
                  ocupada={abriendo === maquina.vehiculoId}
                  onPress={() => void abrir(maquina)}
                />
              ))}
            </>
          ) : null}

          {hechas.length > 0 ? (
            <>
              <Text style={estilos.tituloSeccion}>Listas</Text>
              {hechas.map((maquina) => (
                <FilaMaquina
                  key={maquina.vehiculoId}
                  maquina={maquina}
                  ocupada={abriendo === maquina.vehiculoId}
                  onPress={() => void abrir(maquina)}
                />
              ))}
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function FilaMaquina({
  maquina,
  ocupada,
  onPress,
}: {
  maquina: MaquinaDelDia;
  ocupada: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        estilos.fila,
        maquina.completa ? estilos.filaLista : estilos.filaFalta,
        pressed && estilos.presionado,
      ]}
    >
      <View style={estilos.filaTexto}>
        <Text style={estilos.codigo}>{maquina.codigoInterno}</Text>
        <Text style={estilos.detalle}>{maquina.tipoNombre}</Text>
        <Text style={maquina.operadorNombre ? estilos.detalle : estilos.detalleFalta}>
          {maquina.operadorNombre ?? 'Sin operador asignado hoy'}
        </Text>
      </View>
      {ocupada ? (
        <ActivityIndicator color={Marca.primario} />
      ) : (
        <View
          style={[
            estilos.insignia,
            { backgroundColor: maquina.completa ? Estado.conformeFondo : Estado.atencionFondo },
          ]}
        >
          <Text
            style={[
              estilos.insigniaTexto,
              { color: maquina.completa ? Estado.conforme : Estado.atencion },
            ]}
          >
            {maquina.completa ? 'LISTA' : 'FALTA'}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.light.background },
  contenido: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  tarjetaVacia: {
    padding: Spacing.four,
    borderRadius: Radio.lg,
    backgroundColor: Estado.atencionFondo,
  },
  resumen: {
    padding: Spacing.four,
    borderRadius: Radio.lg,
    gap: Spacing.half,
    backgroundColor: Estado.atencionFondo,
  },
  resumenCompleto: { backgroundColor: Estado.conformeFondo },
  resumenObra: {
    fontSize: Texto.pie,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: Colors.light.textSecondary,
  },
  resumenCifra: { fontSize: 40, fontWeight: '800', color: Estado.atencion },
  resumenCifraCompleta: { color: Estado.conforme },
  detalle: { fontSize: Texto.base, color: Colors.light.textSecondary },
  detalleFalta: { fontSize: Texto.base, fontWeight: '600', color: Estado.atencion },
  tituloSeccion: {
    fontSize: Texto.etiqueta,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: Spacing.two,
  },
  fila: {
    minHeight: Toque.primario,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radio.lg,
    borderWidth: 2,
  },
  filaFalta: { borderColor: Estado.atencion, backgroundColor: Colors.light.background },
  filaLista: { borderColor: Colors.light.backgroundSelected, backgroundColor: Colors.light.backgroundElement },
  filaTexto: { flex: 1, gap: 2 },
  codigo: { fontSize: Texto.titulo, fontWeight: '800', color: Colors.light.text },
  insignia: { paddingHorizontal: Spacing.two, paddingVertical: 4, borderRadius: Radio.pastilla },
  insigniaTexto: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  presionado: { opacity: 0.7 },
});
