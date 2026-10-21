/**
 * Lo que se hace con una versión del presupuesto (spec 031, RF-49 a RF-56, RF-73): aprobar
 * un borrador (solo la gerencia, RF-3), descartarlo con motivo, crear una nueva versión
 * del vigente y descargar cualquiera en Excel.
 *
 * Aprobar puede pedir una confirmación: si la versión quita ítems que ya tienen
 * cantidades en la bitácora, el servidor responde la lista (RF-54) y aquí se muestra con
 * lo reportado antes de aprobar igual.
 */
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { api, ErrorApi, mensajeDe } from '@/features/panel/cliente-api';
import { Acciones, AccionesFormulario, Aviso, Boton, Campo, Modal } from '@/features/panel/componentes';
import type { PresupuestoDetalle } from '@/features/panel/contratos';
import type { ItemQueDesaparece } from '@/shared/rules/presupuesto';

type Ventana = { tipo: 'aprobar'; desaparecen: ItemQueDesaparece[] } | { tipo: 'nueva' } | { tipo: 'descartar' } | null;

/** Pide un texto obligatorio —motivo o nota— y ejecuta la acción. */
function VentanaDeTexto({
  titulo,
  aviso,
  etiqueta,
  boton,
  tono,
  alCerrar,
  alAceptar,
}: {
  titulo: string;
  aviso: string;
  etiqueta: string;
  boton: string;
  tono: 'primario' | 'peligro';
  alCerrar: () => void;
  alAceptar: (texto: string) => Promise<void>;
}) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  return (
    <Modal titulo={titulo} onCerrar={alCerrar}>
      <Text style={estilos.nota}>{aviso}</Text>
      <Campo etiqueta={etiqueta} obligatorio valor={texto} onChange={setTexto} multilinea />
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <AccionesFormulario>
        <Boton titulo="Cancelar" tono="secundario" onPress={alCerrar} />
        <Boton
          titulo={enviando ? 'Un momento…' : boton}
          tono={tono}
          deshabilitado={!texto.trim() || enviando}
          onPress={async () => {
            setEnviando(true);
            setError(null);
            try {
              await alAceptar(texto.trim());
            } catch (fallo) {
              setError(mensajeDe(fallo));
            } finally {
              setEnviando(false);
            }
          }}
        />
      </AccionesFormulario>
    </Modal>
  );
}

export function AccionesDeVersion({
  presupuesto: p,
  esGerencia,
  alEditar,
  alHecho,
}: {
  presupuesto: PresupuestoDetalle;
  esGerencia: boolean;
  alEditar: () => void;
  /** Tras una acción que salió bien: el mensaje y, si nació otra versión, cuál mirar. */
  alHecho: (mensaje: string, mirar?: string) => void;
}) {
  const [ventana, setVentana] = useState<Ventana>(null);
  const [error, setError] = useState<{ texto: string; faltas?: string[] } | null>(null);
  const [aprobando, setAprobando] = useState(false);

  async function aprobar(confirmar: boolean) {
    setAprobando(true);
    setError(null);
    try {
      await api.presupuestos.aprobar(p.id, p.version, confirmar);
      setVentana(null);
      alHecho(`La versión ${p.numeroVersion} quedó vigente.`);
    } catch (fallo) {
      const cuerpo =
        fallo instanceof ErrorApi
          ? (fallo.cuerpo as { desaparecen?: ItemQueDesaparece[]; faltas?: string[] })
          : undefined;
      if (cuerpo?.desaparecen?.length) setVentana({ tipo: 'aprobar', desaparecen: cuerpo.desaparecen });
      else {
        setVentana(null);
        setError({ texto: mensajeDe(fallo), faltas: cuerpo?.faltas });
      }
    } finally {
      setAprobando(false);
    }
  }

  function descargarExcel() {
    if (Platform.OS === 'web') window.location.assign(api.presupuestos.direccionDelExcel(p.id));
  }

  return (
    <View style={estilos.columna}>
      <Acciones>
        {p.estado === 'borrador' ? <Boton titulo="Editar el borrador" onPress={alEditar} /> : null}
        {p.estado === 'borrador' && esGerencia ? (
          <Boton
            titulo={aprobando ? 'Aprobando…' : 'Aprobar presupuesto'}
            tono="secundario"
            onPress={() => aprobar(false)}
            deshabilitado={aprobando}
          />
        ) : null}
        {p.estado === 'vigente' ? (
          <Boton titulo="Nueva versión" tono="secundario" onPress={() => setVentana({ tipo: 'nueva' })} />
        ) : null}
        <Boton titulo="Descargar Excel" tono="secundario" onPress={descargarExcel} />
        {p.estado === 'borrador' ? (
          <Boton titulo="Descartar" tono="peligro" onPress={() => setVentana({ tipo: 'descartar' })} />
        ) : null}
      </Acciones>
      {p.estado === 'borrador' && !esGerencia ? (
        <Text style={estilos.nota}>Aprobar el presupuesto le corresponde a la gerencia.</Text>
      ) : null}
      {error ? (
        <Aviso tono="error">
          {error.faltas && error.faltas.length > 1
            ? `${error.texto}\n· ${error.faltas.slice(0, 10).join('\n· ')}`
            : error.texto}
        </Aviso>
      ) : null}

      {ventana?.tipo === 'aprobar' ? (
        <Modal titulo={`Aprobar la versión ${p.numeroVersion}`} onCerrar={() => setVentana(null)}>
          <Aviso tono="error">
            {`Esta versión quita ${ventana.desaparecen.length === 1 ? 'un ítem que ya tiene' : `${ventana.desaparecen.length} ítems que ya tienen`} cantidades en la bitácora. Lo reportado se conserva, pero ya no contará contra ningún ítem del presupuesto vigente.`}
          </Aviso>
          {ventana.desaparecen.map((d) => (
            <Text key={`${d.capituloId}|${d.item}`} style={estilos.nota}>
              {`· ${d.item} · ${d.capitulo}${d.grupo ? ` · ${d.grupo}` : ''}: ${d.reportado.toLocaleString('es-CO', { maximumFractionDigits: 3 })} reportado`}
            </Text>
          ))}
          <AccionesFormulario>
            <Boton titulo="Cancelar" tono="secundario" onPress={() => setVentana(null)} />
            <Boton
              titulo={aprobando ? 'Aprobando…' : 'Aprobar igual'}
              tono="peligro"
              onPress={() => aprobar(true)}
              deshabilitado={aprobando}
            />
          </AccionesFormulario>
        </Modal>
      ) : null}
      {ventana?.tipo === 'nueva' ? (
        <VentanaDeTexto
          titulo="Nueva versión"
          aviso={`Se crea un borrador que es copia exacta de la versión ${p.numeroVersion}. Esta sigue vigente hasta que se apruebe la nueva.`}
          etiqueta="Motivo (p. ej. «Otrosí 1»)"
          boton="Crear la nueva versión"
          tono="primario"
          alCerrar={() => setVentana(null)}
          alAceptar={async (nota) => {
            const nueva = await api.presupuestos.nuevaVersion(p.id, nota);
            setVentana(null);
            alHecho(`Se creó la versión ${nueva.numeroVersion} en borrador.`, nueva.id);
          }}
        />
      ) : null}
      {ventana?.tipo === 'descartar' ? (
        <VentanaDeTexto
          titulo={`Descartar la versión ${p.numeroVersion}`}
          aviso="El borrador queda en la lista como descartado, con el motivo. No se borra."
          etiqueta="Motivo"
          boton="Descartar"
          tono="peligro"
          alCerrar={() => setVentana(null)}
          alAceptar={async (motivo) => {
            await api.presupuestos.descartar(p.id, motivo);
            setVentana(null);
            alHecho(`La versión ${p.numeroVersion} quedó descartada.`);
          }}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 8 },
  nota: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.textoApoyo },
});
