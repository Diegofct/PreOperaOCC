import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CapturarFoto } from '@/components/ui/capturar-foto';
import { CapturarMedidor } from '@/components/ui/capturar-medidor';
import { FilaItem } from '@/components/ui/fila-item';
import { PadFirma } from '@/components/ui/pad-firma';
import { Colors, Estado, Marca, Radio, Spacing, Texto, Toque } from '@/constants/theme';
import { useUsuario } from '@/features/auth/sesion';
import {
  abrirBorrador,
  cerrarPreoperacional,
  guardarBorrador,
  vehiculoPorId,
  type Borrador,
} from '@/features/checklists/repositorio';
import type { Conformidad, ItemChecklist, RespuestaItem } from '@/features/checklists/types';
import { guardarFirma, guardarFoto, mediaDe } from '@/features/media/repositorio';
import {
  evaluarPreoperacional,
  itemsMarcablesEnBloque,
  respuestasDeMedidores,
  validarMedidor,
} from '@/shared/rules/inspeccion';

interface EstadoRespuesta {
  valor: Conformidad | null;
  comentario: string;
  marcadoEnBloque: boolean;
}

/** Qué está capturando la cámara en este momento. */
type Captura =
  | { tipo: 'hallazgo'; item: ItemChecklist }
  | { tipo: 'horometro' }
  | null;

/** Qué medidor está capturando el teclado grande. */
type MedidorEnCaptura = 'horometro' | 'odometro' | null;

export default function PantallaPreoperacional() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const usuario = useUsuario();
  const { vehiculoId } = useLocalSearchParams<{ vehiculoId: string }>();

  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, EstadoRespuesta>>({});
  const [horometro, setHorometro] = useState('');
  const [odometro, setOdometro] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [cargando, setCargando] = useState(true);
  /**
   * El tipo de equipo todavía no tiene formato de preoperacional. Pasa con los
   * tipos que se registran antes de que OCC entregue su hoja: la vibro
   * compactadora y la recicladora entraron así en la spec 003. Sin este estado
   * la pantalla se quedaba girando para siempre, que es la peor forma de decir
   * que algo falta.
   */
  const [sinFormato, setSinFormato] = useState(false);
  const [enviando, setEnviando] = useState(false);

  /** ids de `media` por ítem del checklist. */
  const [fotosPorItem, setFotosPorItem] = useState<Record<string, string[]>>({});
  const [fotoHorometro, setFotoHorometro] = useState<string | null>(null);
  const [captura, setCaptura] = useState<Captura>(null);
  const [medidorEnCaptura, setMedidorEnCaptura] = useState<MedidorEnCaptura>(null);
  const [pidiendoFirma, setPidiendoFirma] = useState(false);

  const guardadoPendiente = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Una vez firmado, el registro es inmutable y el autoguardado se apaga. */
  const cerrado = useRef(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (!vehiculoId) return;
      const vehiculo = await vehiculoPorId(vehiculoId);
      if (!vehiculo) return;
      const abierto = await abrirBorrador(usuario.id, vehiculo);
      if (cancelado) return;
      if (!abierto) {
        setSinFormato(true);
        setCargando(false);
        return;
      }

      setBorrador(abierto);
      setRespuestas(
        Object.fromEntries(
          abierto.respuestas.map((r) => [
            r.itemKey,
            {
              valor: typeof r.valor === 'string' ? (r.valor as Conformidad) : null,
              comentario: r.comentario ?? '',
              marcadoEnBloque: r.marcadoEnBloque ?? false,
            },
          ]),
        ),
      );
      setHorometro(abierto.horometroH != null ? String(abierto.horometroH) : '');
      setOdometro(abierto.odometroKm != null ? String(abierto.odometroKm) : '');
      setObservaciones(abierto.observaciones);

      // Las evidencias ya capturadas en una sesión anterior del mismo borrador.
      const evidencias = await mediaDe('preoperacional', abierto.id);
      const porItem: Record<string, string[]> = {};
      for (const evidencia of evidencias) {
        if (evidencia.proposito === 'foto_horometro') setFotoHorometro(evidencia.id);
        if (evidencia.proposito === 'hallazgo' && evidencia.itemKey) {
          (porItem[evidencia.itemKey] ??= []).push(evidencia.id);
        }
      }
      setFotosPorItem(porItem);
      setCargando(false);
    })();
    return () => {
      cancelado = true;
    };
  }, [usuario.id, vehiculoId]);

  /**
   * Los ítems que toca revisar hoy, agrupados como los trae el formato.
   *
   * Solo los de conformidad: los de tipo `numero` —horómetro, odómetro— viven
   * arriba, en el teclado grande. Salen de la lista, **no de las respuestas**;
   * `respuestasDeMedidores` los devuelve al armarlas.
   */
  const secciones = useMemo(() => {
    if (!borrador) return [];
    const activas = new Set(borrador.periodicidades);
    return borrador.plantilla.secciones
      .map((seccion) => ({
        key: seccion.key,
        titulo: seccion.titulo,
        data: seccion.items.filter(
          (item) => activas.has(item.periodicidad) && item.tipo === 'conformidad',
        ),
      }))
      .filter((seccion) => seccion.data.length > 0);
  }, [borrador]);

  const todosLosItems = useMemo(() => secciones.flatMap((s) => s.data), [secciones]);
  const respondidos = todosLosItems.filter((i) => respuestas[i.key]?.valor).length;

  /** Convierte el estado de pantalla a las respuestas auto-descritas que se guardan. */
  const construirRespuestas = useCallback((): RespuestaItem[] => {
    if (!borrador) return [];

    const porSeccion = new Map<string, string>();
    for (const seccion of secciones) {
      for (const item of seccion.data) porSeccion.set(item.key, seccion.key);
    }

    const deLaLista = todosLosItems
      .filter((item) => respuestas[item.key]?.valor)
      .map((item) => {
        const estado = respuestas[item.key];
        return {
          itemKey: item.key,
          seccionKey: porSeccion.get(item.key) ?? '',
          label: item.label,
          sistema: item.sistema,
          tipo: item.tipo,
          inmoviliza: item.inmoviliza,
          valor: estado.valor,
          comentario: estado.comentario || undefined,
          mediaIds: fotosPorItem[item.key]?.length ? fotosPorItem[item.key] : undefined,
          marcadoEnBloque: estado.marcadoEnBloque || undefined,
          respondidoEn: Date.now(),
        } satisfies RespuestaItem;
      });

    // Las lecturas de los medidores son ítems del formato como cualquier otro,
    // solo que se capturan con otro teclado. Sin esta línea quedan como ítems
    // sin responder y no se puede firmar.
    return [
      ...deLaLista,
      ...respuestasDeMedidores(
        borrador.plantilla,
        borrador.periodicidades,
        { horometro: horometro ? Number(horometro) : null, odometro: odometro ? Number(odometro) : null },
        Date.now(),
      ),
    ];
  }, [borrador, fotosPorItem, horometro, odometro, respuestas, secciones, todosLosItems]);

  /** Autoguardado: nunca se pierde trabajo, aunque Android mate la app. */
  const programarGuardado = useCallback(() => {
    if (!borrador || cerrado.current) return;
    if (guardadoPendiente.current) clearTimeout(guardadoPendiente.current);
    guardadoPendiente.current = setTimeout(() => {
      void guardarBorrador(borrador.id, {
        respuestas: construirRespuestas(),
        horometroH: horometro ? Number(horometro) : null,
        odometroKm: odometro ? Number(odometro) : null,
        observaciones,
      });
    }, 400);
  }, [borrador, construirRespuestas, horometro, odometro, observaciones]);

  useEffect(() => {
    programarGuardado();
  }, [programarGuardado]);

  // Al salir de la pantalla se cancela el autoguardado en vuelo. Sin esto, un
  // temporizador disparado después de firmar reescribiría un registro que ya
  // es inmutable.
  useEffect(
    () => () => {
      if (guardadoPendiente.current) clearTimeout(guardadoPendiente.current);
    },
    [],
  );

  function responder(item: ItemChecklist, valor: Conformidad) {
    setRespuestas((previo) => ({
      ...previo,
      [item.key]: {
        valor,
        comentario: previo[item.key]?.comentario ?? '',
        marcadoEnBloque: false,
      },
    }));
  }

  function comentar(item: ItemChecklist, texto: string) {
    setRespuestas((previo) => ({
      ...previo,
      [item.key]: {
        valor: previo[item.key]?.valor ?? null,
        comentario: texto,
        marcadoEnBloque: previo[item.key]?.marcadoEnBloque ?? false,
      },
    }));
  }

  /**
   * "Marcar toda la sección". Los ítems que inmovilizan quedan fuera: son
   * justamente los que el operador tiene que mirar uno por uno.
   */
  function marcarSeccion(items: ItemChecklist[]) {
    const marcables = itemsMarcablesEnBloque(items);
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRespuestas((previo) => {
      const siguiente = { ...previo };
      for (const item of marcables) {
        if (siguiente[item.key]?.valor) continue;
        siguiente[item.key] = { valor: 'conforme', comentario: '', marcadoEnBloque: true };
      }
      return siguiente;
    });
  }

  async function recibirFoto(uri: string) {
    if (!borrador || !captura) return;
    const destino = captura;
    setCaptura(null);

    if (destino.tipo === 'horometro') {
      const id = await guardarFoto(uri, {
        duenoTipo: 'preoperacional',
        duenoId: borrador.id,
        proposito: 'foto_horometro',
      });
      setFotoHorometro(id);
      return;
    }

    const id = await guardarFoto(uri, {
      duenoTipo: 'preoperacional',
      duenoId: borrador.id,
      proposito: 'hallazgo',
      itemKey: destino.item.key,
    });
    setFotosPorItem((previo) => ({
      ...previo,
      [destino.item.key]: [...(previo[destino.item.key] ?? []), id],
    }));
  }

  /**
   * Valida todo antes de pedir la firma. El operador firma una sola vez y al
   * final: pedirle la firma y después decirle que faltaban ítems sería
   * hacerle repetir el paso más incómodo del formato.
   */
  function validarYEnviar() {
    if (!borrador || enviando) return;

    const medidores = borrador.plantilla.medidores;
    const horometroNum = horometro ? Number(horometro) : null;
    const odometroNum = odometro ? Number(odometro) : null;

    if (medidores.horometro === 'requerido' && horometroNum == null) {
      return Alert.alert('Falta el horómetro', 'Escriba la lectura del horómetro del equipo.');
    }
    if (medidores.odometro === 'requerido' && odometroNum == null) {
      return Alert.alert('Falta el odómetro', 'Escriba el kilometraje del vehículo.');
    }

    for (const [clase, valor, anterior] of [
      ['horometro', horometroNum, borrador.vehiculo.horometroH],
      ['odometro', odometroNum, borrador.vehiculo.odometroKm],
    ] as const) {
      if (valor == null) continue;
      const veredicto = validarMedidor(clase, valor, anterior);
      if (veredicto.estado === 'retrocede') {
        return Alert.alert('Revise la lectura', veredicto.mensaje);
      }
      if (veredicto.estado === 'salto_sospechoso') {
        return Alert.alert('Revise la lectura', veredicto.mensaje, [
          { text: 'Corregir', style: 'cancel' },
          { text: 'Es correcto', onPress: () => validarContenido() },
        ]);
      }
    }

    validarContenido();
  }

  function validarContenido() {
    if (!borrador) return;

    const evaluacion = evaluarPreoperacional(
      borrador.plantilla,
      borrador.periodicidades,
      construirRespuestas(),
    );

    if (!evaluacion.completo) {
      return Alert.alert(
        'Faltan revisiones',
        `Quedan ${evaluacion.faltantes.length} ítems sin responder. ` +
          `El primero es "${evaluacion.faltantes[0]?.label}".`,
      );
    }

    if (evaluacion.sinEvidencia.length > 0) {
      return Alert.alert(
        'Faltan fotos',
        `Hay ${evaluacion.sinEvidencia.length} ${
          evaluacion.sinEvidencia.length === 1 ? 'hallazgo' : 'hallazgos'
        } sin foto. El primero es "${evaluacion.sinEvidencia[0].label}". ` +
          'La foto es lo que sustenta el reporte ante mantenimiento.',
      );
    }

    if (!fotoHorometro) {
      return Alert.alert(
        'Falta la foto del tablero',
        'Tome la foto del horómetro para dejar constancia de la lectura.',
      );
    }

    setPidiendoFirma(true);
  }

  async function firmarYEnviar(uriFirma: string) {
    if (!borrador) return;
    setPidiendoFirma(false);
    setEnviando(true);
    cerrado.current = true;
    if (guardadoPendiente.current) clearTimeout(guardadoPendiente.current);

    try {
      const firmaId = await guardarFirma(uriFirma, {
        duenoTipo: 'preoperacional',
        duenoId: borrador.id,
        proposito: 'firma_operador',
      });

      const construidas = construirRespuestas();
      const evaluacion = evaluarPreoperacional(
        borrador.plantilla,
        borrador.periodicidades,
        construidas,
      );

      await cerrarPreoperacional(borrador.id, {
        resultado: evaluacion.resultado,
        cantidadInmovilizantes: evaluacion.inmovilizantes.length,
        respuestas: construidas,
        odometroKm: odometro ? Number(odometro) : null,
        horometroH: horometro ? Number(horometro) : null,
        observaciones,
        firmaOperadorMediaId: firmaId,
        fotoHorometroMediaId: fotoHorometro,
      });

      router.replace({
        pathname: '/resultado',
        params: {
          resultado: evaluacion.resultado,
          inmovilizantes: JSON.stringify(evaluacion.inmovilizantes.map((r) => r.label)),
          observaciones: String(evaluacion.observaciones.length),
          vehiculo: borrador.vehiculo.codigoInterno,
        },
      });
    } catch (error) {
      // Aquí sí falló el guardado. El borrador sigue en SQLite con todo lo
      // respondido, así que reintentar no le cuesta nada al operador.
      console.error('[preoperacional] falló el cierre:', error);
      cerrado.current = false;
      Alert.alert(
        'No se pudo guardar',
        'Vuelva a intentar. Lo que respondió sigue guardado en este equipo.',
      );
    } finally {
      setEnviando(false);
    }
  }

  if (sinFormato) {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.sinFormatoTitulo}>Este equipo aún no tiene formato</Text>
        <Text style={estilos.sinFormatoTexto}>
          El preoperacional de este tipo de máquina todavía no está cargado en la aplicación.
          Avísele a la administración: hasta que lo carguen, este equipo no se puede inspeccionar
          desde aquí.
        </Text>
      </View>
    );
  }

  if (cargando || !borrador) {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator size="large" color={Marca.primario} />
      </View>
    );
  }

  const { medidores } = borrador.plantilla;
  const extras = borrador.periodicidades.filter((p) => p !== 'diaria');

  return (
    <View style={estilos.pantalla}>
      <SectionList
        sections={secciones}
        keyExtractor={(item) => item.key}
        stickySectionHeadersEnabled
        contentContainerStyle={{ paddingBottom: Toque.primario + insets.bottom + Spacing.five }}
        ListHeaderComponent={
          <View style={estilos.encabezado}>
            <Text style={estilos.vehiculo}>{borrador.vehiculo.codigoInterno}</Text>
            <Text style={estilos.formato}>{borrador.plantilla.tituloFormato}</Text>

            {/* El formato cambió y el borrador anterior se descartó (spec 011,
                RF-27). Va antes que nada: si no, el operador ve el formulario en
                blanco y cree que la app le perdió lo que llevaba escrito. */}
            {borrador.formatoCambio ? (
              <View style={estilos.avisoFormato}>
                <Text style={estilos.avisoFormatoTexto}>
                  El formato de este equipo cambió. Este preoperacional hay que empezarlo de
                  nuevo.
                </Text>
              </View>
            ) : null}

            {extras.length > 0 ? (
              <View style={estilos.avisoExtra}>
                <Text style={estilos.avisoExtraTexto}>
                  Hoy también corresponde la revisión {extras.join(' y ')}. Se agregaron los ítems
                  adicionales del formato.
                </Text>
              </View>
            ) : null}

            {medidores.horometro !== 'oculto' ? (
              <CampoMedidor
                titulo="Horómetro"
                unidad="h"
                valor={horometro}
                anterior={borrador.vehiculo.horometroH}
                onPress={() => setMedidorEnCaptura('horometro')}
              />
            ) : null}
            {medidores.odometro !== 'oculto' ? (
              <CampoMedidor
                titulo="Odómetro"
                unidad="km"
                valor={odometro}
                anterior={borrador.vehiculo.odometroKm}
                onPress={() => setMedidorEnCaptura('odometro')}
              />
            ) : null}

            {/* La foto del tablero es lo que impide que una lectura se invente. */}
            <Pressable
              accessibilityRole="button"
              onPress={() => setCaptura({ tipo: 'horometro' })}
              style={({ pressed }) => [
                estilos.botonEvidencia,
                fotoHorometro ? estilos.botonEvidenciaListo : estilos.botonEvidenciaPendiente,
                pressed && estilos.presionado,
              ]}
            >
              <Text
                style={[
                  estilos.botonEvidenciaTexto,
                  { color: fotoHorometro ? Estado.conforme : Estado.atencion },
                ]}
              >
                {fotoHorometro ? '✓  Foto del tablero tomada' : 'Tomar foto del tablero'}
              </Text>
            </Pressable>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={estilos.tituloSeccion}>
            <Text style={estilos.tituloSeccionTexto}>{section.titulo}</Text>
            {itemsMarcablesEnBloque(section.data).length > 1 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => marcarSeccion(section.data)}
                style={({ pressed }) => [estilos.botonSeccion, pressed && estilos.presionado]}
              >
                <Text style={estilos.botonSeccionTexto}>Todo bien</Text>
              </Pressable>
            ) : null}
          </View>
        )}
        renderItem={({ item }) => (
          <FilaItem
            item={item}
            valor={respuestas[item.key]?.valor ?? null}
            comentario={respuestas[item.key]?.comentario ?? ''}
            cantidadFotos={fotosPorItem[item.key]?.length ?? 0}
            onCambiarValor={(valor) => responder(item, valor)}
            onCambiarComentario={(texto) => comentar(item, texto)}
            onTomarFoto={() => setCaptura({ tipo: 'hallazgo', item })}
          />
        )}
        ListFooterComponent={
          <View style={estilos.pie}>
            <Text style={estilos.etiquetaCampo}>Observaciones</Text>
            <TextInput
              value={observaciones}
              onChangeText={setObservaciones}
              placeholder="Comentarios generales de la revisión"
              placeholderTextColor={Colors.light.textSecondary}
              multiline
              style={estilos.observaciones}
            />
          </View>
        }
      />

      <View style={[estilos.barra, { paddingBottom: insets.bottom + Spacing.two }]}>
        <View style={estilos.progreso}>
          <Text style={estilos.progresoTexto}>
            {respondidos} de {todosLosItems.length}
          </Text>
          <Text style={estilos.progresoAyuda}>revisiones</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={validarYEnviar}
          disabled={enviando}
          style={({ pressed }) => [
            estilos.botonEnviar,
            pressed && estilos.presionado,
            enviando && estilos.deshabilitado,
          ]}
        >
          <Text style={estilos.botonEnviarTexto}>{enviando ? 'Guardando…' : 'Firmar y enviar'}</Text>
        </Pressable>
      </View>

      <CapturarFoto
        visible={captura !== null}
        titulo={captura?.tipo === 'horometro' ? 'Foto del tablero' : (captura?.item.label ?? '')}
        ayuda={
          captura?.tipo === 'horometro'
            ? 'Encuadre el horómetro de modo que se lea la cifra completa.'
            : 'Muestre el daño lo más claro posible.'
        }
        onCancelar={() => setCaptura(null)}
        onCapturar={recibirFoto}
      />

      <CapturarMedidor
        visible={medidorEnCaptura !== null}
        titulo={medidorEnCaptura === 'odometro' ? 'Odómetro' : 'Horómetro'}
        unidad={medidorEnCaptura === 'odometro' ? 'km' : 'h'}
        anterior={
          medidorEnCaptura === 'odometro'
            ? borrador.vehiculo.odometroKm
            : borrador.vehiculo.horometroH
        }
        valorInicial={medidorEnCaptura === 'odometro' ? odometro : horometro}
        onCancelar={() => setMedidorEnCaptura(null)}
        onConfirmar={(valor) => {
          if (medidorEnCaptura === 'odometro') setOdometro(valor);
          else setHorometro(valor);
          setMedidorEnCaptura(null);
        }}
      />

      <PadFirma
        visible={pidiendoFirma}
        nombreFirmante={borrador.vehiculo.codigoInterno}
        onCancelar={() => setPidiendoFirma(false)}
        onFirmar={firmarYEnviar}
      />
    </View>
  );
}

function CampoMedidor({
  titulo,
  unidad,
  valor,
  anterior,
  onPress,
}: {
  titulo: string;
  unidad: string;
  valor: string;
  anterior: number | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. Toque para escribir la lectura.`}
      onPress={onPress}
      style={({ pressed }) => [estilos.medidor, pressed && estilos.medidorPresionado]}
    >
      <View style={estilos.medidorTextos}>
        <Text style={estilos.etiquetaCampo}>{titulo}</Text>
        {anterior != null ? (
          <Text style={estilos.medidorAnterior}>
            Último registro: {anterior.toLocaleString('es-CO')} {unidad}
          </Text>
        ) : null}
      </View>
      <View style={estilos.medidorValor}>
        <Text style={[estilos.medidorCifra, !valor && estilos.medidorVacio]}>
          {valor ? Number(valor).toLocaleString('es-CO') : 'Escribir'}
        </Text>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.light.background },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  sinFormatoTitulo: {
    fontSize: Texto.titulo,
    fontWeight: '800',
    color: Colors.light.text,
    textAlign: 'center',
  },
  sinFormatoTexto: {
    fontSize: Texto.base,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  encabezado: { padding: Spacing.three, gap: Spacing.three },
  vehiculo: { fontSize: Texto.titular, fontWeight: '800', color: Colors.light.text },
  formato: { fontSize: Texto.pie, color: Colors.light.textSecondary },
  avisoExtra: {
    padding: Spacing.three,
    borderRadius: Radio.md,
    backgroundColor: Estado.infoFondo,
  },
  avisoFormato: {
    padding: Spacing.three,
    borderRadius: Radio.md,
    backgroundColor: Estado.atencionFondo,
  },
  avisoFormatoTexto: {
    fontSize: Texto.pie,
    fontWeight: '600',
    color: Estado.atencion,
    lineHeight: 21,
  },
  avisoExtraTexto: { fontSize: Texto.pie, fontWeight: '600', color: Estado.info, lineHeight: 21 },
  medidor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radio.md,
    backgroundColor: Colors.light.backgroundElement,
  },
  medidorPresionado: { backgroundColor: Colors.light.backgroundSelected },
  medidorTextos: { flex: 1, gap: Spacing.half },
  medidorAnterior: { fontSize: Texto.pie, color: Colors.light.textSecondary },
  medidorValor: {
    minWidth: 140,
    minHeight: Toque.primario,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radio.md,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.background,
  },
  medidorCifra: { fontSize: Texto.medidor, fontWeight: '700', color: Colors.light.text },
  medidorVacio: { fontSize: Texto.base, fontWeight: '600', color: Colors.light.textSecondary },
  etiquetaCampo: { fontSize: Texto.etiqueta, fontWeight: '700', color: Colors.light.text },
  botonEvidencia: {
    minHeight: Toque.minimo,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radio.md,
    borderWidth: 2,
  },
  botonEvidenciaPendiente: {
    borderStyle: 'dashed',
    borderColor: Estado.atencion,
    backgroundColor: Estado.atencionFondo,
  },
  botonEvidenciaListo: {
    borderColor: Estado.conforme,
    backgroundColor: Estado.conformeFondo,
  },
  botonEvidenciaTexto: { fontSize: Texto.base, fontWeight: '700' },
  tituloSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: Colors.light.backgroundSelected,
  },
  tituloSeccionTexto: {
    flex: 1,
    fontSize: Texto.pie,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: Colors.light.text,
  },
  botonSeccion: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radio.pastilla,
    backgroundColor: Estado.conformeFondo,
  },
  botonSeccionTexto: { fontSize: Texto.pie, fontWeight: '800', color: Estado.conforme },
  pie: { padding: Spacing.three, gap: Spacing.two },
  observaciones: {
    minHeight: 96,
    padding: Spacing.three,
    borderRadius: Radio.md,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    fontSize: Texto.base,
    color: Colors.light.text,
    textAlignVertical: 'top',
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.background,
  },
  progreso: { minWidth: 84 },
  progresoTexto: { fontSize: Texto.etiqueta, fontWeight: '800', color: Colors.light.text },
  progresoAyuda: { fontSize: Texto.pie, color: Colors.light.textSecondary },
  botonEnviar: {
    flex: 1,
    minHeight: Toque.primario,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radio.lg,
    backgroundColor: Marca.primario,
  },
  botonEnviarTexto: { fontSize: Texto.etiqueta, fontWeight: '800', color: Marca.sobreColor },
  presionado: { opacity: 0.7 },
  deshabilitado: { opacity: 0.5 },
});
