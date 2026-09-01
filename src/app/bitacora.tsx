/**
 * La bitácora del día de una máquina.
 *
 * La llena el jefe de operadores al terminar el turno, de una sentada: equipo,
 * operador, horómetro inicial y final, actividad, descripción y observaciones —
 * los campos exactos del formato en papel de OCC.
 *
 * Todo se autoguarda. Si Android mata la app a mitad, al volver está lo escrito.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { uuidv7 } from 'uuidv7';

import { PanelMedidor } from '@/components/ui/capturar-medidor';
import { Colors, Estado, Marca, Radio, Spacing, Texto, Toque } from '@/constants/theme';
import { CLAVE_OTRA } from '@/features/bitacoras/actividades';
import {
  EditorActividad,
  type BorradorActividad,
} from '@/features/bitacoras/editor-actividad';
import {
  bitacoraPorId,
  cerrarBitacora,
  construirActividad,
  guardarBitacora,
  type Bitacora,
} from '@/features/bitacoras/repositorio';
import { mensajeDeHorometros, validarHorometros } from '@/shared/rules/jornada';

type MedidorEnCaptura = 'inicial' | 'final' | null;

function actividadVacia(): BorradorActividad {
  return { id: uuidv7(), clave: null, texto: '', descripcion: '', observaciones: '' };
}

export default function PantallaBitacora() {
  const router = useRouter();
  const { bitacoraId, operadorNombre } = useLocalSearchParams<{
    bitacoraId: string;
    operadorNombre?: string;
  }>();

  const [bitacora, setBitacora] = useState<Bitacora | null>(null);
  const [inicial, setInicial] = useState('');
  const [final, setFinal] = useState('');
  const [actividades, setActividades] = useState<BorradorActividad[]>([actividadVacia()]);
  const [medidor, setMedidor] = useState<MedidorEnCaptura>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardadoPendiente = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cerrada = useRef(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (!bitacoraId) return;
      const encontrada = await bitacoraPorId(bitacoraId);
      if (cancelado || !encontrada) return;

      setBitacora(encontrada);
      setInicial(encontrada.horometroInicial != null ? String(encontrada.horometroInicial) : '');
      setFinal(encontrada.horometroFinal != null ? String(encontrada.horometroFinal) : '');
      setActividades(
        encontrada.actividades.length > 0
          ? encontrada.actividades.map((a) => ({
              id: a.id,
              clave: a.clave,
              texto: a.clave === CLAVE_OTRA ? a.nombre : '',
              descripcion: a.descripcion,
              observaciones: a.observaciones,
            }))
          : [actividadVacia()],
      );
      cerrada.current = encontrada.cerradaEn != null;
      setCargando(false);
    })();
    return () => {
      cancelado = true;
    };
  }, [bitacoraId]);

  /** Autoguardado. Nunca escribe sobre una bitácora ya cerrada. */
  const programarGuardado = useCallback(() => {
    if (!bitacora || cerrada.current) return;
    if (guardadoPendiente.current) clearTimeout(guardadoPendiente.current);
    guardadoPendiente.current = setTimeout(() => {
      void guardarBitacora(bitacora.id, {
        horometroInicial: inicial ? Number(inicial) : null,
        horometroFinal: final ? Number(final) : null,
        actividades: actividades
          .filter((a) => a.clave != null)
          .map((a) =>
            construirActividad({
              clave: a.clave!,
              texto: a.texto,
              descripcion: a.descripcion,
              observaciones: a.observaciones,
            }),
          ),
      });
    }, 400);
  }, [bitacora, inicial, final, actividades]);

  useEffect(() => {
    programarGuardado();
  }, [programarGuardado]);

  useEffect(
    () => () => {
      if (guardadoPendiente.current) clearTimeout(guardadoPendiente.current);
    },
    [],
  );

  function cambiarActividad(id: string, cambios: Partial<BorradorActividad>) {
    setError(null);
    setActividades((previas) => previas.map((a) => (a.id === id ? { ...a, ...cambios } : a)));
  }

  async function terminar() {
    if (!bitacora || guardando) return;

    const numeroInicial = inicial ? Number(inicial) : null;
    const numeroFinal = final ? Number(final) : null;

    const problema = validarHorometros(numeroInicial, numeroFinal);
    if (problema) {
      setError(mensajeDeHorometros(problema, numeroInicial));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const conActividad = actividades.filter((a) => a.clave != null);
    if (conActividad.length === 0) {
      setError('Escoja al menos una actividad.');
      return;
    }
    const sinTexto = conActividad.find((a) => a.clave === CLAVE_OTRA && !a.texto.trim());
    if (sinTexto) {
      setError('Escriba cuál fue la actividad.');
      return;
    }

    setGuardando(true);
    if (guardadoPendiente.current) clearTimeout(guardadoPendiente.current);

    try {
      await guardarBitacora(bitacora.id, {
        horometroInicial: numeroInicial,
        horometroFinal: numeroFinal,
        actividades: conActividad.map((a) =>
          construirActividad({
            clave: a.clave!,
            texto: a.texto,
            descripcion: a.descripcion,
            observaciones: a.observaciones,
          }),
        ),
      });
      cerrada.current = true;
      await cerrarBitacora(bitacora.id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch (fallo) {
      console.error('[bitacora] no se pudo cerrar:', fallo);
      cerrada.current = false;
      Alert.alert('No se pudo guardar', 'Vuelva a intentar. Lo escrito sigue en este equipo.');
    } finally {
      setGuardando(false);
    }
  }

  if (cargando || !bitacora) {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator size="large" color={Marca.primario} />
      </View>
    );
  }

  const yaCerrada = bitacora.cerradaEn != null;
  const horasCalculadas =
    inicial && final && Number(final) >= Number(inicial) ? Number(final) - Number(inicial) : null;

  return (
    <View style={estilos.pantalla}>
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <View style={estilos.cabecera}>
          <Text style={estilos.vehiculo}>{bitacora.codigoInterno}</Text>
          <Text style={estilos.detalle}>
            {operadorNombre ? `Operador: ${operadorNombre}` : 'Sin operador asignado hoy'}
          </Text>
          <Text style={estilos.detalle}>{bitacora.fecha}</Text>
        </View>

        {yaCerrada ? (
          <View style={estilos.avisoCerrada}>
            <Text style={estilos.avisoCerradaTexto}>
              Esta bitácora ya está cerrada. Para corregirla, anúlela desde el dashboard.
            </Text>
          </View>
        ) : null}

        <View style={estilos.medidores}>
          <Medidor
            titulo="Horómetro inicial"
            valor={inicial}
            onPress={() => setMedidor('inicial')}
          />
          <Medidor titulo="Horómetro final" valor={final} onPress={() => setMedidor('final')} />
        </View>

        {horasCalculadas != null ? (
          <Text style={estilos.horas}>
            {horasCalculadas.toLocaleString('es-CO')}{' '}
            {horasCalculadas === 1 ? 'hora de máquina' : 'horas de máquina'}
          </Text>
        ) : null}

        {actividades.map((actividad, indice) => (
          <EditorActividad
            key={actividad.id}
            actividad={actividad}
            tipoVehiculo={bitacora.tipoVehiculoId}
            indice={indice}
            puedeQuitar={actividades.length > 1}
            onCambiar={(cambios) => cambiarActividad(actividad.id, cambios)}
            onQuitar={() =>
              setActividades((previas) => previas.filter((a) => a.id !== actividad.id))
            }
          />
        ))}

        <Pressable
          accessibilityRole="button"
          onPress={() => setActividades((previas) => [...previas, actividadVacia()])}
          style={({ pressed }) => [estilos.botonAgregar, pressed && estilos.presionado]}
        >
          <Text style={estilos.botonAgregarTexto}>Agregar otra actividad</Text>
        </Pressable>

        {error ? <Text style={estilos.error}>{error}</Text> : null}
      </ScrollView>

      {!yaCerrada ? (
        <View style={estilos.barra}>
          <Pressable
            accessibilityRole="button"
            onPress={terminar}
            disabled={guardando}
            style={({ pressed }) => [
              estilos.botonPrimario,
              pressed && estilos.presionado,
              guardando && estilos.deshabilitado,
            ]}
          >
            <Text style={estilos.botonPrimarioTexto}>
              {guardando ? 'Guardando…' : 'Guardar bitácora'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/*
        Se superpone dentro de la misma pantalla en vez de abrir un modal: así el
        formulario queda montado debajo y no se pierde lo escrito.
      */}
      {medidor ? (
        <View style={estilos.superpuesto}>
          <PanelMedidor
            titulo={medidor === 'inicial' ? 'Horómetro inicial' : 'Horómetro final'}
            unidad="h"
            anterior={
              medidor === 'final' && inicial ? Number(inicial) : bitacora.horometroInicial
            }
            valorInicial={medidor === 'inicial' ? inicial : final}
            onCancelar={() => setMedidor(null)}
            onConfirmar={(valor) => {
              if (medidor === 'inicial') setInicial(valor);
              else setFinal(valor);
              setError(null);
              setMedidor(null);
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

function Medidor({
  titulo,
  valor,
  onPress,
}: {
  titulo: string;
  valor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. Toque para escribir la lectura.`}
      onPress={onPress}
      style={({ pressed }) => [estilos.medidor, pressed && estilos.medidorPresionado]}
    >
      <Text style={estilos.medidorEtiqueta}>{titulo}</Text>
      <Text style={[estilos.medidorCifra, !valor && estilos.medidorVacio]}>
        {valor ? Number(valor).toLocaleString('es-CO') : 'Escribir'}
      </Text>
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
  cabecera: { gap: 2 },
  vehiculo: { fontSize: 34, fontWeight: '800', color: Colors.light.text },
  detalle: { fontSize: Texto.base, color: Colors.light.textSecondary },
  avisoCerrada: {
    padding: Spacing.three,
    borderRadius: Radio.md,
    backgroundColor: Estado.conformeFondo,
  },
  avisoCerradaTexto: { fontSize: Texto.base, fontWeight: '700', color: Estado.conforme },
  medidores: { flexDirection: 'row', gap: Spacing.three },
  medidor: {
    flex: 1,
    minHeight: Toque.primario,
    gap: 2,
    padding: Spacing.three,
    borderRadius: Radio.md,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.backgroundElement,
  },
  medidorPresionado: { backgroundColor: Colors.light.backgroundSelected },
  medidorEtiqueta: { fontSize: Texto.pie, fontWeight: '700', color: Colors.light.textSecondary },
  medidorCifra: { fontSize: Texto.medidor, fontWeight: '800', color: Colors.light.text },
  medidorVacio: { fontSize: Texto.base, fontWeight: '600', color: Colors.light.textSecondary },
  horas: { fontSize: Texto.etiqueta, fontWeight: '700', color: Marca.primarioTexto },
  botonAgregar: {
    minHeight: Toque.minimo,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radio.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.light.backgroundSelected,
  },
  botonAgregarTexto: { fontSize: Texto.base, fontWeight: '700', color: Marca.primarioTexto },
  error: { fontSize: Texto.base, fontWeight: '700', lineHeight: 24, color: Estado.noConforme },
  barra: {
    padding: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.background,
  },
  botonPrimario: {
    minHeight: Toque.primario,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radio.lg,
    backgroundColor: Marca.primario,
  },
  botonPrimarioTexto: { fontSize: Texto.etiqueta, fontWeight: '800', color: '#FFFFFF' },
  superpuesto: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.light.background,
  },
  presionado: { opacity: 0.7 },
  deshabilitado: { opacity: 0.4 },
});
