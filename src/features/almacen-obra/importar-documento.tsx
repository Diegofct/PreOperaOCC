/**
 * Importar un documento al Almacén y ver las propuestas pendientes (spec 042, RF-1, RF-3, RF-8,
 * RF-48, RF-64, RF-65, RF-98).
 *
 * Solo lo ve quien puede importar (Almacenista, Director de Obra, Director de Proyectos, Gerencia);
 * al Residente no se le muestra nada (RF-2). La obra es la de la ruta, la de la persona o, para la
 * Gerencia fuera de una obra, la que eligió en el filtro; sin obra el botón se apaga y lo dice.
 *
 * ── Por detrás ──
 *
 * Subir responde enseguida y la IA lee por detrás (RF-64): la lista muestra «Leyendo… 0:12» con el
 * tiempo desde que se subió. Mientras haya alguna leyéndose se consulta **su detalle** cada pocos
 * segundos, que es una ruta liviana, y la lista entera se pide de nuevo solo cuando alguna cambia de
 * estado: la lista vive en la ruta de la subida, que carga la IA, y pedirla seguido hizo crecer la
 * memoria del servidor de desarrollo en la 044. Al volver a la página, las pendientes salen de nuevo
 * porque las guarda el servidor (RF-65), no este navegador.
 *
 * Una persona puede tener varias a la vez (D32). Una que falló dice por qué y se descarta desde aquí
 * (RF-48); una lista se abre con «Revisar», debajo de la lista (`revisar-importacion.tsx`).
 */
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { elegirArchivo } from '@/features/contratos/elegir-archivo';
import type { ImportacionConfirmada, ImportacionDetalle, ImportacionPendienteFila } from '@/features/panel/almacen-importacion';
import { api, mensajeDe } from '@/features/panel/cliente-api';
import { Acciones, Aviso, Boton, Etiqueta, Seccion } from '@/features/panel/componentes';
import { useListado } from '@/features/panel/marco';
import { usePersona } from '@/features/panel/sesion';
import { alcanza } from '@/shared/rules/permisos';

import { RevisarImportacion } from './revisar-importacion';

/** RF-3: lo que ofrece el selector. El servidor lo vuelve a mirar por el contenido (RF-5). */
const ACEPTA = [
  '.pdf',
  '.xlsx',
  '.docx',
  '.jpg',
  '.jpeg',
  '.png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
].join(',');
const CADA_CUANTO_MS = 3000;

function transcurrido(desde: string, ahora: number): string {
  const segundos = Math.max(0, Math.round((ahora - new Date(desde).getTime()) / 1000));
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
}

function hora(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function ImportarDocumento({
  obraId,
  alConfirmar,
}: {
  obraId: string | null;
  /** Entraron ingresos: quien muestra el stock lo vuelve a pedir. */
  alConfirmar?: () => void;
}) {
  const { rol } = usePersona();
  const puedeImportar = alcanza(rol, 'almacen', 'importar');
  const pendientes = useListado<ImportacionPendienteFila>(
    useCallback(() => (puedeImportar && obraId ? api.almacen.importaciones.listar(obraId) : Promise.resolve([])), [puedeImportar, obraId]),
  );
  const [subiendo, setSubiendo] = useState(false);
  /** La que se está revisando (T18). */
  const [abierta, setAbierta] = useState<string | null>(null);
  /** RF-38: lo que entró en la última confirmación. */
  const [confirmada, setConfirmada] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());

  const leyendo = pendientes.datos.filter((p) => p.estado === 'en_curso').map((p) => p.id);
  const claveDeLeyendo = leyendo.join(',');

  // RF-8, RF-64: mientras alguna se lee, el reloj corre y se pregunta por cada una.
  useEffect(() => {
    if (!claveDeLeyendo) return;
    const ids = claveDeLeyendo.split(',');
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    const sondeo = setInterval(() => {
      void Promise.all(ids.map((id) => api.almacen.importaciones.de(id).catch(() => null))).then((detalles) => {
        if (detalles.some((d) => d && d.estado !== 'en_curso')) pendientes.recargar();
      });
    }, CADA_CUANTO_MS);
    return () => {
      clearInterval(reloj);
      clearInterval(sondeo);
    };
    // `pendientes.recargar` es estable; lo que cambia la consulta es qué se está leyendo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveDeLeyendo]);

  if (!puedeImportar) return null;

  async function importar() {
    if (!obraId) return;
    const archivo = await elegirArchivo(ACEPTA);
    if (!archivo) return;
    setSubiendo(true);
    setError(null);
    try {
      await api.almacen.importaciones.subir(obraId, archivo);
      setAhora(Date.now());
      pendientes.recargar();
    } catch (fallo) {
      // RF-4 a RF-6, RF-59 a RF-61: el motivo lo redacta el servidor.
      setError(mensajeDe(fallo));
    } finally {
      setSubiendo(false);
    }
  }

  async function descartar(id: string) {
    setError(null);
    try {
      await api.almacen.importaciones.descartar(id);
      pendientes.recargar();
    } catch (fallo) {
      setError(mensajeDe(fallo));
    }
  }

  return (
    <Seccion titulo="Importar un documento">
      <View style={estilos.columna}>
        <Text style={estilos.texto}>
          Suba la factura, la remisión o la lista de lo que llegó (PDF, Excel, Word o foto). La IA propone los ingresos;
          usted los revisa y confirma, y entran todos o ninguno.
        </Text>
        <Acciones>
          <Boton
            titulo={subiendo ? 'Subiendo…' : 'Importar documento'}
            tono="primario"
            deshabilitado={!obraId || subiendo}
            onPress={() => void importar()}
          />
        </Acciones>
        {!obraId ? <Text style={estilos.pie}>Elija la obra en el filtro para importar a su Almacén.</Text> : null}
        {error ? <Aviso tono="error">{error}</Aviso> : null}
        {pendientes.error ? <Aviso tono="error">{pendientes.error}</Aviso> : null}

        {pendientes.datos.length > 0 ? (
          <View style={estilos.lista}>
            <Text style={estilos.subtitulo}>{`Sus documentos pendientes (${pendientes.datos.length})`}</Text>
            {pendientes.datos.map((p) => (
              <View key={p.id} style={estilos.fila}>
                <View style={estilos.datos}>
                  <Text style={estilos.texto}>{p.nombreArchivo}</Text>
                  {p.estado === 'en_curso' ? (
                    <Text style={estilos.pie}>
                      {`Leyendo… ${transcurrido(p.creadoEn, ahora)}. Puede cerrar esta página: sigue por detrás, y al volver la encuentra aquí.`}
                    </Text>
                  ) : null}
                  {p.estado === 'lista' ? (
                    <Text style={estilos.pie}>{`Subido el ${hora(p.creadoEn)}${p.vencePropuestaEn ? ` · se descarta sola el ${hora(p.vencePropuestaEn)} si no se confirma` : ''}`}</Text>
                  ) : null}
                  {p.estado === 'fallida' ? <Text style={estilos.pie}>{p.error ?? 'No se pudo leer.'}</Text> : null}
                </View>
                {p.estado === 'en_curso' ? <Etiqueta tono="neutro">Leyendo</Etiqueta> : null}
                {p.estado === 'lista' ? (
                  <>
                    <Etiqueta tono="bueno">Lista para revisar</Etiqueta>
                    {abierta === p.id ? (
                      <Etiqueta tono="neutro">Revisando</Etiqueta>
                    ) : (
                      <Boton titulo="Revisar" tono="secundario" onPress={() => setAbierta(p.id)} />
                    )}
                  </>
                ) : null}
                {p.estado === 'fallida' ? (
                  <>
                    <Etiqueta tono="malo">No se pudo leer</Etiqueta>
                    <Boton titulo="Descartar" tono="secundario" onPress={() => void descartar(p.id)} />
                  </>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {confirmada ? <Aviso tono="exito">{confirmada}</Aviso> : null}
        {abierta ? (
          <PropuestaAbierta
            id={abierta}
            alCerrar={() => setAbierta(null)}
            alConfirmar={(resultado) => {
              setAbierta(null);
              setConfirmada(
                `Entraron ${resultado.ingresos} ${resultado.ingresos === 1 ? 'ingreso' : 'ingresos'}${
                  resultado.materialesNuevos > 0 ? ` y ${resultado.materialesNuevos} ${resultado.materialesNuevos === 1 ? 'material nuevo' : 'materiales nuevos'}` : ''
                } al Almacén.`,
              );
              pendientes.recargar();
              alConfirmar?.();
            }}
            alDescartar={() => {
              setAbierta(null);
              pendientes.recargar();
            }}
            alRecargarLista={pendientes.recargar}
          />
        ) : null}
      </View>
    </Seccion>
  );
}

/** La propuesta elegida, pedida al servidor, para revisarla y confirmarla (RF-10 a RF-46). */
function PropuestaAbierta({
  id,
  alCerrar,
  alConfirmar,
  alDescartar,
  alRecargarLista,
}: {
  id: string;
  alCerrar: () => void;
  alConfirmar: (resultado: ImportacionConfirmada) => void;
  alDescartar: () => void;
  /** Tras un 409 la propuesta pudo cambiar de estado (otra pestaña la confirmó, venció): la lista también. */
  alRecargarLista: () => void;
}) {
  const detalle = useListado<ImportacionDetalle>(useCallback(() => api.almacen.importaciones.de(id).then((d) => [d]), [id]));
  const d = detalle.datos[0];
  // Cada «Volver a cargar» rehace la revisión desde cero, aunque la versión no haya cambiado (venció,
  // un material salió de la obra): si no, el error y lo corregido se quedarían pegados.
  const [vuelta, setVuelta] = useState(0);
  const recargar = () => {
    setVuelta((n) => n + 1);
    detalle.recargar();
    alRecargarLista();
  };
  return (
    <View style={estilos.abierta}>
      <View style={estilos.fila}>
        <Text style={[estilos.subtitulo, estilos.datos]}>{d ? `Revisando «${d.nombreArchivo}»` : 'Abriendo la propuesta…'}</Text>
        <Boton titulo="Cerrar" tono="secundario" onPress={alCerrar} />
      </View>
      {detalle.error ? <Aviso tono="error">{detalle.error}</Aviso> : null}
      {d && !d.propuesta ? <Aviso tono="info">Esta propuesta ya no está lista para revisar.</Aviso> : null}
      {d?.propuesta ? (
        <RevisarImportacion
          key={`${d.id}:${d.version}:${vuelta}`}
          detalle={d}
          alConfirmar={alConfirmar}
          alDescartar={alDescartar}
          alRecargar={recargar}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 12 },
  lista: { gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  datos: { flex: 1, minWidth: 240, gap: 2 },
  abierta: { gap: 12, paddingTop: 8 },
  subtitulo: { fontFamily: FuentePanel.texto, fontWeight: '600', fontSize: TextoPanel.cuerpo, color: Panel.texto },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  pie: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
