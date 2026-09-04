/**
 * La bitácora diaria, desde el computador.
 *
 * Es el camino principal de la bitácora —el residente la lleva desde la oficina—
 * y el móvil es el respaldo para cuando está en obra sin computador. Las dos
 * escriben la misma fila y usan las mismas reglas.
 *
 * La pantalla se organiza alrededor de **un día**, no de una lista de bitácoras.
 * Arriba, las máquinas que ese día todavía no tienen ninguna; debajo, las que
 * ya se abrieron. Ese orden no es estético: lo que se pierde en obra no son las
 * bitácoras mal llenadas, son las que nadie abrió, y una pantalla que solo
 * muestre lo hecho no las hace visibles jamás.
 */
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Estado, Marca, Panel, Radio, Spacing, TextoPanel } from '@/constants/theme';
import { actividadesDe, CLAVE_OTRA } from '@/features/bitacoras/actividades';
import {
  fechaDeJornada,
  horasDeMaquina,
  mensajeDeHorometros,
  validarHorometros,
} from '@/shared/rules/jornada';

import { api } from './cliente-api';
import { Acciones, Aviso, Boton, Campo, Etiqueta, Seccion, Selector } from './componentes';
import type { BitacoraFila, JornadaFila, MaquinaPendienteFila, PersonaFila } from './contratos';
import { MarcoPantalla, mensajeDe, useListado } from './marco';

function sumarDias(fecha: string, dias: number): string {
  const base = new Date(`${fecha}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

function aNumero(texto: string): number | null {
  const limpio = texto.trim();
  if (limpio === '') return null;
  const valor = Number(limpio);
  return Number.isFinite(valor) ? Math.trunc(valor) : null;
}

export default function PantallaBitacoras() {
  const [fecha, setFecha] = useState(fechaDeJornada());

  const jornada = useListado<JornadaFila>(
    useCallback(async () => [await api.bitacoras.delDia(fecha)], [fecha]),
  );
  const personas = useListado<PersonaFila>(useCallback(() => api.personas.listar(), []));

  const dia = jornada.datos[0];
  const operadores = personas.datos.filter((p) => p.rol === 'operador');

  return (
    <MarcoPantalla
      titulo="Bitácoras"
      descripcion="El trabajo de cada máquina, día a día: quién la operó, cuántas horas y en qué. Es lo que alimenta el mantenimiento preventivo y el rendimiento de la obra."
      error={jornada.error ?? personas.error}
      cargando={jornada.cargando || personas.cargando}
    >
      <View style={estilos.dias}>
        <Boton titulo="◀ Día anterior" tono="secundario" onPress={() => setFecha(sumarDias(fecha, -1))} />
        <View style={estilos.fecha}>
          <Text style={estilos.fechaTexto}>{fechaLarga(fecha)}</Text>
          {fecha !== fechaDeJornada() ? (
            <Text style={estilos.fechaAyuda} onPress={() => setFecha(fechaDeJornada())}>
              Volver a hoy
            </Text>
          ) : null}
        </View>
        <Boton
          titulo="Día siguiente ▶"
          tono="secundario"
          onPress={() => setFecha(sumarDias(fecha, 1))}
          deshabilitado={fecha >= fechaDeJornada()}
        />
      </View>

      {dia ? (
        <>
          <Pendientes
            maquinas={dia.pendientes}
            onAbrir={(vehiculoId) =>
              jornada.ejecutar(() => api.bitacoras.abrir({ vehiculoId, fecha }))
            }
          />

          <Seccion titulo={`Bitácoras del día (${dia.bitacoras.length})`}>
            {dia.bitacoras.length === 0 ? (
              <Text style={estilos.vacio}>
                Todavía no se abrió ninguna bitácora este día.
              </Text>
            ) : (
              dia.bitacoras.map((bitacora) => (
                <TarjetaBitacora
                  key={bitacora.id}
                  bitacora={bitacora}
                  operadores={operadores}
                  onCambio={() => jornada.recargar()}
                  onError={(mensaje) => jornada.setError(mensaje)}
                />
              ))
            )}
          </Seccion>
        </>
      ) : null}
    </MarcoPantalla>
  );
}

function Pendientes({
  maquinas,
  onAbrir,
}: {
  maquinas: MaquinaPendienteFila[];
  onAbrir: (vehiculoId: string) => void;
}) {
  if (maquinas.length === 0) {
    return <Aviso tono="exito">Todas las máquinas de la obra tienen bitácora este día.</Aviso>;
  }

  return (
    <Seccion titulo={`Sin bitácora todavía (${maquinas.length})`}>
      <View style={estilos.pendientes}>
        {maquinas.map((maquina) => (
          <View key={maquina.vehiculoId} style={estilos.pendiente}>
            <View style={estilos.pendienteDatos}>
              <Text style={estilos.pendienteCodigo}>{maquina.codigoInterno}</Text>
              <Text style={estilos.pendienteTipo}>{maquina.tipoNombre}</Text>
            </View>
            <Boton titulo="Abrir bitácora" onPress={() => onAbrir(maquina.vehiculoId)} />
          </View>
        ))}
      </View>
    </Seccion>
  );
}

function TarjetaBitacora({
  bitacora,
  operadores,
  onCambio,
  onError,
}: {
  bitacora: BitacoraFila;
  operadores: PersonaFila[];
  onCambio: () => void;
  onError: (mensaje: string | null) => void;
}) {
  const cerrada = bitacora.cerradaEn !== null;
  const anulada = bitacora.anuladoEn !== null;
  const soloLectura = cerrada || anulada;

  const [operadorId, setOperadorId] = useState(bitacora.operadorId);
  const [inicial, setInicial] = useState(bitacora.horometroInicial?.toString() ?? '');
  const [final, setFinal] = useState(bitacora.horometroFinal?.toString() ?? '');
  const [clave, setClave] = useState<string | null>(bitacora.actividades[0]?.clave ?? null);
  const [otraTexto, setOtraTexto] = useState('');
  const [descripcion, setDescripcion] = useState(bitacora.actividades[0]?.descripcion ?? '');
  const [motivo, setMotivo] = useState('');
  const [anulando, setAnulando] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const horas = horasDeMaquina(aNumero(inicial), aNumero(final));
  const falloMedidor =
    inicial !== '' && final !== '' ? validarHorometros(aNumero(inicial), aNumero(final)) : null;

  async function ejecutar(accion: () => Promise<unknown>) {
    setOcupado(true);
    try {
      await accion();
      onError(null);
      onCambio();
    } catch (fallo) {
      onError(mensajeDe(fallo));
    } finally {
      setOcupado(false);
    }
  }

  const guardar = () =>
    ejecutar(() =>
      api.bitacoras.guardar(bitacora.id, {
        operadorId,
        horometroInicial: aNumero(inicial),
        horometroFinal: aNumero(final),
        actividades: clave
          ? [
              {
                clave,
                texto: clave === CLAVE_OTRA ? otraTexto : undefined,
                descripcion,
                observaciones: '',
              },
            ]
          : [],
      }),
    );

  return (
    <View style={[estilos.tarjeta, anulada && estilos.tarjetaAnulada]}>
      <View style={estilos.cabecera}>
        <Text style={estilos.codigo}>{bitacora.vehiculoCodigo}</Text>
        <Text style={estilos.tipo}>{bitacora.tipoNombre}</Text>
        <View style={estilos.espaciador} />
        {anulada ? (
          <Etiqueta tono="malo">Anulada</Etiqueta>
        ) : cerrada ? (
          <Etiqueta tono="bueno">Cerrada</Etiqueta>
        ) : (
          <Etiqueta tono="atencion">Abierta</Etiqueta>
        )}
      </View>

      {anulada ? (
        <Text style={estilos.nota}>Motivo: {bitacora.motivoAnulacion}</Text>
      ) : null}

      {soloLectura ? (
        <View style={estilos.resumen}>
          <Dato titulo="Operador" valor={bitacora.operadorNombre ?? '—'} />
          <Dato
            titulo="Horómetro"
            valor={`${bitacora.horometroInicial ?? '—'} → ${bitacora.horometroFinal ?? '—'} h`}
          />
          <Dato
            titulo="Horas de máquina"
            valor={
              horasDeMaquina(bitacora.horometroInicial, bitacora.horometroFinal)?.toString() ?? '—'
            }
          />
          <Dato
            titulo="Actividad"
            valor={bitacora.actividades.map((a) => a.nombre).join(', ') || '—'}
          />
          <Dato titulo="La llevó" valor={bitacora.usuarioNombre ?? '—'} />
        </View>
      ) : (
        <>
          <View style={estilos.campos}>
            <Selector
              etiqueta="Quién la operó"
              valor={operadorId}
              opciones={operadores.map((p) => ({ valor: p.id, etiqueta: p.nombreCompleto }))}
              onChange={setOperadorId}
              vacio="Elija el operador"
              ancho={240}
            />
            <Campo
              etiqueta="Horómetro inicial"
              valor={inicial}
              onChange={setInicial}
              soloNumeros
              ancho={160}
            />
            <Campo
              etiqueta="Horómetro final"
              valor={final}
              onChange={setFinal}
              soloNumeros
              ancho={160}
              error={falloMedidor ? mensajeDeHorometros(falloMedidor, aNumero(inicial)) : undefined}
              ayuda={horas !== null ? `${horas} horas de máquina` : undefined}
            />
            <Selector
              etiqueta="Actividad"
              valor={clave}
              opciones={actividadesDe(bitacora.tipoVehiculoId).map((a) => ({
                valor: a.clave,
                etiqueta: a.nombre,
              }))}
              onChange={setClave}
              vacio="Elija la actividad"
              ancho={240}
            />
            {clave === CLAVE_OTRA ? (
              <Campo etiqueta="¿Cuál?" valor={otraTexto} onChange={setOtraTexto} ancho={200} />
            ) : null}
            <Campo
              etiqueta="Descripción"
              valor={descripcion}
              onChange={setDescripcion}
              ancho={280}
            />
          </View>

          <Acciones>
            <Boton titulo="Guardar" tono="secundario" onPress={guardar} deshabilitado={ocupado} />
            <Boton
              titulo="Cerrar jornada"
              onPress={() => ejecutar(async () => {
                await api.bitacoras.guardar(bitacora.id, {
                  operadorId,
                  horometroInicial: aNumero(inicial),
                  horometroFinal: aNumero(final),
                  actividades: clave
                    ? [
                        {
                          clave,
                          texto: clave === CLAVE_OTRA ? otraTexto : undefined,
                          descripcion,
                          observaciones: '',
                        },
                      ]
                    : [],
                });
                await api.bitacoras.cerrar(bitacora.id);
              })}
              deshabilitado={ocupado}
            />
          </Acciones>
        </>
      )}

      {cerrada && !anulada ? (
        anulando ? (
          <View style={estilos.campos}>
            <Campo
              etiqueta="Motivo de la anulación"
              valor={motivo}
              onChange={setMotivo}
              ayuda="Queda guardado con su nombre. La máquina volverá a aparecer como pendiente."
              ancho={360}
            />
            <Acciones>
              <Boton
                titulo="Confirmar anulación"
                tono="peligro"
                onPress={() => ejecutar(() => api.bitacoras.anular(bitacora.id, motivo))}
                deshabilitado={motivo.trim().length === 0 || ocupado}
              />
              <Boton titulo="Cancelar" tono="secundario" onPress={() => setAnulando(false)} />
            </Acciones>
          </View>
        ) : (
          <Acciones>
            <Boton titulo="Anular" tono="peligro" onPress={() => setAnulando(true)} />
          </Acciones>
        )
      ) : null}
    </View>
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

function fechaLarga(fecha: string): string {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

const estilos = StyleSheet.create({
  dias: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  fecha: { flex: 1, alignItems: 'center' },
  fechaTexto: { fontSize: TextoPanel.seccion, fontWeight: '700', color: Colors.light.text },
  fechaAyuda: { fontSize: TextoPanel.cuerpo, color: Marca.primarioTexto, fontWeight: '600' },

  pendientes: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  pendiente: {
    flexDirection: 'row',
    alignItems: 'center',
    // Más aire que el resto de la tarjeta: el código y el botón son dos cosas
    // distintas —lo que falta y lo que hay que hacer— y pegados se leen como una.
    gap: Spacing.four,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Estado.atencion,
    borderRadius: Radio.md,
    backgroundColor: Estado.atencionFondo,
  },
  pendienteDatos: { gap: Spacing.half },
  pendienteCodigo: { fontSize: TextoPanel.seccion, fontWeight: '800', color: Estado.atencion },
  pendienteTipo: { fontSize: TextoPanel.cuerpo, color: Estado.atencion },

  tarjeta: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Panel.borde,
    borderRadius: Radio.md,
    backgroundColor: Colors.light.background,
  },
  tarjetaAnulada: { opacity: 0.6 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  codigo: { fontSize: TextoPanel.seccion, fontWeight: '800', color: Colors.light.text },
  tipo: { fontSize: TextoPanel.cuerpo, color: Colors.light.textSecondary },
  espaciador: { flex: 1 },
  nota: { fontSize: TextoPanel.cuerpo, color: Colors.light.textSecondary },

  campos: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: Spacing.three },

  resumen: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four },
  dato: { gap: Spacing.half },
  datoTitulo: { fontSize: TextoPanel.cuerpo, color: Colors.light.textSecondary },
  datoValor: { fontSize: TextoPanel.cuerpo, fontWeight: '700', color: Colors.light.text },

  vacio: { fontSize: TextoPanel.cuerpo, color: Colors.light.textSecondary },
});
