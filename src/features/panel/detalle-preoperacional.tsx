/**
 * Un preoperacional entero, tal como se firmó.
 *
 * Se arma **desde las respuestas guardadas**, no desde el formato de hoy. Cada
 * respuesta lleva dentro su propia etiqueta —se auto-describe a propósito desde
 * la Fase 1— así que un registro de hace tres años se sigue leyendo aunque el
 * formato de OCC haya cambiado entre medias. La plantilla solo se usa para los
 * títulos de las secciones, y si falta, se agrupa igual por su clave.
 *
 * Los hallazgos van **arriba y aparte**. Quien abre esto casi siempre viene
 * buscando por qué una máquina quedó NO APTA, y obligarle a recorrer 87 ítems
 * conformes para encontrar los dos que no lo están es hacerle perder el tiempo
 * justo cuando tiene prisa.
 */
import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Estado, Marca, MaxContentWidthPanel, Panel, Radio, Spacing, TextoPanel } from '@/constants/theme';
import { alcanza } from '@/shared/rules/permisos';

import { api } from './cliente-api';
import { Acciones, Aviso, Boton, Campo, Etiqueta, Seccion, Titulo } from './componentes';
import {
  ETIQUETA_RESULTADO,
  type ImagenDelRegistro,
  type PreoperacionalDetalle,
  type RespuestaFila,
} from './contratos';
import { mensajeDe, useListado } from './marco';
import { usePersona } from './sesion';

const MINUTO_MS = 60_000;

export function DetallePreoperacional({
  id,
  onVolver,
  onAnulado,
}: {
  id: string;
  onVolver: () => void;
  onAnulado: () => void;
}) {
  const detalle = useListado<PreoperacionalDetalle>(
    useCallback(async () => [await api.preoperacionales.detalle(id)], [id]),
  );

  const [motivo, setMotivo] = useState('');
  const [anulando, setAnulando] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const persona = usePersona();
  const puedeAnular = alcanza(persona?.rol ?? 'operador', 'preoperacionales', 'anular');

  const p = detalle.datos[0];

  async function anular() {
    setOcupado(true);
    try {
      await api.preoperacionales.anular(id, motivo);
      onAnulado();
    } catch (fallo) {
      detalle.setError(mensajeDe(fallo));
    } finally {
      setOcupado(false);
    }
  }

  if (detalle.cargando || !p) {
    return (
      <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.contenedor}>
        <View style={estilos.columna}>
          <Boton titulo="◀ Volver" tono="secundario" onPress={onVolver} />
          {detalle.error ? <Aviso tono="error">{detalle.error}</Aviso> : <Text>Cargando…</Text>}
        </View>
      </ScrollView>
    );
  }

  const hallazgos = p.respuestas.filter((r) => r.valor === 'no_conforme');
  const inmovilizantes = hallazgos.filter((r) => r.inmoviliza);

  const titulosDeSeccion = new Map(
    (p.plantilla?.secciones ?? []).map((s) => [s.key, s.titulo] as const),
  );

  const porSeccion = new Map<string, RespuestaFila[]>();
  for (const respuesta of p.respuestas) {
    const lista = porSeccion.get(respuesta.seccionKey) ?? [];
    lista.push(respuesta);
    porSeccion.set(respuesta.seccionKey, lista);
  }

  // Una foto de hallazgo se identifica por la `key` de su ítem, que no le dice
  // nada a nadie. La etiqueta sale de la propia respuesta, que se auto-describe.
  const etiquetasPorItem = new Map(p.respuestas.map((r) => [r.itemKey, r.label] as const));

  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.contenedor}>
      <View style={estilos.columna}>
        <Boton titulo="◀ Volver a la lista" tono="secundario" onPress={onVolver} />

        {detalle.error ? <Aviso tono="error">{detalle.error}</Aviso> : null}

        <View style={estilos.encabezado}>
          <Titulo>{`${p.vehiculoCodigo} · ${p.tipoNombre}`}</Titulo>
          <Text style={estilos.subtitulo}>
            {`${p.operadorNombre} · ${fechaHora(p.iniciadoEn)}${p.obraNombre ? ` · ${p.obraNombre}` : ''}`}
          </Text>
        </View>

        {p.anuladoEn ? (
          <Aviso tono="error">
            {`Anulado el ${fechaHora(p.anuladoEn)}${p.anuladoPorNombre ? ` por ${p.anuladoPorNombre}` : ''}. Motivo: ${p.motivoAnulacion ?? '—'}`}
          </Aviso>
        ) : null}

        <View style={estilos.veredicto}>
          <Etiqueta
            tono={
              p.resultado === 'no_apto' ? 'malo' : p.resultado === 'apto' ? 'bueno' : 'atencion'
            }
          >
            {p.resultado ? ETIQUETA_RESULTADO[p.resultado] : 'Sin resultado'}
          </Etiqueta>
          {inmovilizantes.length > 0 ? (
            <Text style={estilos.criticoTexto}>
              {`${inmovilizantes.length} ${inmovilizantes.length === 1 ? 'ítem que inmoviliza' : 'ítems que inmovilizan'} el vehículo`}
            </Text>
          ) : null}
        </View>

        <View style={estilos.datos}>
          <Dato titulo="Odómetro" valor={p.odometroKm !== null ? `${p.odometroKm} km` : '—'} />
          <Dato titulo="Horómetro" valor={p.horometroH !== null ? `${p.horometroH} h` : '—'} />
          <Dato titulo="Formato" valor={`${p.plantillaTipoVehiculo} v${p.plantillaVersion}`} />
          <Dato titulo="Periodicidades" valor={p.periodicidades.join(', ')} />
          <Dato titulo="Recibido" valor={fechaHora(p.recibidoEn)} />
        </View>

        {/* Solo se muestra si de verdad hay desfase: en el caso normal, decir
            "0 minutos" sería ruido en una pantalla que ya tiene mucho. */}
        {Math.abs(p.desfaseRelojMs) > MINUTO_MS ? (
          <Aviso tono="info">
            {`El reloj de ese equipo iba ${Math.round(Math.abs(p.desfaseRelojMs) / MINUTO_MS)} minutos ${p.desfaseRelojMs > 0 ? 'adelantado' : 'atrasado'} al firmar. La hora de arriba es la que vio el operador.`}
          </Aviso>
        ) : null}

        {hallazgos.length > 0 ? (
          <Seccion titulo={`Hallazgos (${hallazgos.length})`}>
            {hallazgos.map((r) => (
              <View
                key={r.itemKey}
                style={[estilos.hallazgo, r.inmoviliza && estilos.hallazgoCritico]}
              >
                <Text style={estilos.hallazgoLabel}>{r.label}</Text>
                {r.inmoviliza ? (
                  <Text style={estilos.hallazgoAviso}>Inmoviliza el vehículo</Text>
                ) : null}
                {r.observacion ? (
                  <Text style={estilos.hallazgoNota}>{r.observacion}</Text>
                ) : null}
              </View>
            ))}
          </Seccion>
        ) : (
          <Aviso tono="exito">Sin hallazgos: todos los ítems quedaron conformes.</Aviso>
        )}

        {p.observaciones ? (
          <Seccion titulo="Observaciones">
            <Text style={estilos.observaciones}>{p.observaciones}</Text>
          </Seccion>
        ) : null}

        <Seccion titulo={`El formato completo (${p.respuestas.length} ítems)`}>
          {[...porSeccion.entries()].map(([clave, respuestas]) => (
            <View key={clave} style={estilos.seccion}>
              <Text style={estilos.seccionTitulo}>{titulosDeSeccion.get(clave) ?? clave}</Text>
              {respuestas.map((r) => (
                <View key={r.itemKey} style={estilos.item}>
                  <Text style={estilos.itemLabel}>{r.label}</Text>
                  <Text style={[estilos.itemValor, colorDeValor(r.valor)]}>
                    {etiquetaDeValor(r.valor)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </Seccion>

        <Seccion titulo="Firma y fotos">
          {p.imagenes.length === 0 ? (
            <Text style={estilos.observaciones}>
              Este registro no trae firma ni fotos de evidencia.
            </Text>
          ) : (
            <View style={estilos.imagenes}>
              {[...p.imagenes].sort(porOrdenDeLectura).map((imagen) => (
                <View
                  key={imagen.id}
                  style={[
                    estilos.imagen,
                    imagen.proposito === 'firma_operador' && estilos.imagenFirma,
                  ]}
                >
                  <Text style={estilos.imagenTitulo}>
                    {tituloDeImagen(imagen, etiquetasPorItem)}
                  </Text>

                  {imagen.disponible ? (
                    <Image
                      source={{ uri: api.preoperacionales.urlDeImagen(imagen.id) }}
                      style={estilos.miniatura}
                      resizeMode="contain"
                      accessibilityLabel={tituloDeImagen(imagen, etiquetasPorItem)}
                    />
                  ) : (
                    // Nunca un hueco roto: que falte el archivo es información,
                    // y esconderlo haría parecer que el acta se firmó sin firma.
                    <View style={estilos.miniaturaPendiente}>
                      <Text style={estilos.pendienteTexto}>
                        En camino. Se suma en cuanto el equipo entre a una WiFi.
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </Seccion>

        {/* Corregir evidencia firmada por un operador es de la gerencia. El
            residente ve el acta entera —firma y fotos incluidas—, pero no la
            toca. La cerradura está en la ruta; esto solo evita ofrecer un botón
            que iba a responder que no. */}
        {!p.anuladoEn && puedeAnular ? (
          anulando ? (
            <Seccion titulo="Anular este preoperacional">
              <Campo
                etiqueta="Motivo"
                valor={motivo}
                onChange={setMotivo}
                ayuda="Queda guardado con su nombre. La máquina volverá a aparecer como pendiente del día, y habrá que levantar otro."
                ancho={420}
              />
              <Acciones>
                <Boton
                  titulo="Confirmar anulación"
                  tono="peligro"
                  onPress={anular}
                  deshabilitado={motivo.trim().length === 0 || ocupado}
                />
                <Boton titulo="Cancelar" tono="secundario" onPress={() => setAnulando(false)} />
              </Acciones>
            </Seccion>
          ) : (
            <Acciones>
              <Boton titulo="Anular" tono="peligro" onPress={() => setAnulando(true)} />
            </Acciones>
          )
        ) : null}
      </View>
    </ScrollView>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <View style={estilos.dato}>
      <Text style={estilos.datoTitulo}>{titulo}</Text>
      <Text style={estilos.datoValor}>{valor}</Text>
    </View>
  );
}

function etiquetaDeValor(valor: string): string {
  if (valor === 'conforme') return '✓ Conforme';
  if (valor === 'no_conforme') return '✕ No conforme';
  if (valor === 'na') return '– No aplica';
  return valor;
}

function colorDeValor(valor: string) {
  if (valor === 'no_conforme') return { color: Estado.noConforme };
  if (valor === 'na') return { color: Estado.na };
  return { color: Estado.conforme };
}

function fechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  });
}

/**
 * Cómo se llama cada imagen en pantalla.
 *
 * La de un hallazgo se nombra con la etiqueta de su ítem: quien revisa esto
 * quiere saber de qué es la foto, y `frenos_servicio` no se lo dice.
 */
function tituloDeImagen(imagen: ImagenDelRegistro, etiquetas: Map<string, string>): string {
  switch (imagen.proposito) {
    case 'firma_operador':
      return 'Firma del operador';
    case 'foto_horometro':
      return 'Foto del medidor';
    case 'hallazgo':
      return imagen.itemKey ? (etiquetas.get(imagen.itemKey) ?? 'Hallazgo') : 'Hallazgo';
    default:
      return 'Evidencia';
  }
}

const ORDEN_PROPOSITO: Record<string, number> = {
  firma_operador: 0,
  foto_horometro: 1,
  hallazgo: 2,
  evidencia: 3,
};

/** La firma primero: es lo que se busca al abrir un acta, no una foto de un tornillo. */
function porOrdenDeLectura(a: ImagenDelRegistro, b: ImagenDelRegistro): number {
  return (ORDEN_PROPOSITO[a.proposito] ?? 9) - (ORDEN_PROPOSITO[b.proposito] ?? 9);
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.light.background },
  contenedor: { alignItems: 'center', padding: Spacing.four },
  columna: { width: '100%', maxWidth: MaxContentWidthPanel, gap: Spacing.four },
  encabezado: { gap: Spacing.one },
  subtitulo: { fontSize: TextoPanel.cuerpo, color: Colors.light.textSecondary },

  veredicto: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  criticoTexto: { fontSize: TextoPanel.cuerpo, fontWeight: '700', color: Marca.critico },

  datos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four },
  dato: { gap: Spacing.half },
  datoTitulo: { fontSize: TextoPanel.cuerpo, color: Colors.light.textSecondary },
  datoValor: { fontSize: TextoPanel.cuerpo, fontWeight: '700', color: Colors.light.text },

  hallazgo: {
    gap: Spacing.half,
    padding: Spacing.three,
    borderRadius: Radio.md,
    borderWidth: 1,
    borderColor: Estado.atencion,
    backgroundColor: Estado.atencionFondo,
  },
  hallazgoCritico: { borderColor: Estado.noConforme, backgroundColor: Estado.noConformeFondo },
  hallazgoLabel: { fontSize: TextoPanel.cuerpo, fontWeight: '700', color: Colors.light.text },
  hallazgoAviso: { fontSize: TextoPanel.cuerpo, fontWeight: '700', color: Estado.noConforme },
  hallazgoNota: { fontSize: TextoPanel.cuerpo, color: Colors.light.textSecondary },

  observaciones: { fontSize: TextoPanel.cuerpo, lineHeight: 24, color: Colors.light.text },

  seccion: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Panel.borde,
    borderRadius: Radio.md,
  },
  seccionTitulo: {
    fontSize: TextoPanel.cuerpo,
    fontWeight: '800',
    color: Colors.light.textSecondary,
    marginBottom: Spacing.two,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
    borderBottomWidth: 1,
    borderBottomColor: Panel.bordeSuave,
  },
  itemLabel: { flex: 1, fontSize: TextoPanel.cuerpo, color: Colors.light.text },
  itemValor: { fontSize: TextoPanel.cuerpo, fontWeight: '700' },

  imagenes: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  imagen: { width: 240, gap: Spacing.one },
  /** La firma es un trazo ancho y bajo: en una tarjeta estrecha no se lee. */
  imagenFirma: { width: '100%' },
  imagenTitulo: { fontSize: TextoPanel.apoyo, fontWeight: '700', color: Colors.light.text },
  miniatura: {
    width: '100%',
    height: 180,
    borderRadius: Radio.sm,
    borderWidth: 1,
    borderColor: Panel.borde,
    backgroundColor: Panel.fondoCabecera,
  },
  miniaturaPendiente: {
    width: '100%',
    height: 180,
    padding: Spacing.three,
    justifyContent: 'center',
    borderRadius: Radio.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Panel.borde,
    backgroundColor: Panel.fondo,
  },
  pendienteTexto: {
    fontSize: TextoPanel.apoyo,
    lineHeight: 20,
    textAlign: 'center',
    color: Colors.light.textSecondary,
  },
});
