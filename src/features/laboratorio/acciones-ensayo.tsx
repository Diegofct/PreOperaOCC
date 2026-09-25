/**
 * Los pasos del flujo de un ensayo y su historia (spec 018, RF-70 a RF-94).
 *
 * ── Qué botones salen ──
 *
 * Los que se pueden dar **desde el estado actual** (`transicionPermitida`) **y** que
 * el rol de quien mira puede dar (`alcanza`): al laboratorista, enviar y descartar; al
 * residente y a la gerencia, aprobar, devolver y anular. Ningún botón que el servidor
 * rechazaría. Quién puede lo dice la tabla de permisos; cuándo, la regla del ensayo.
 *
 * ── Cada paso en su ventana ──
 *
 * Devolver pide el comentario (RF-79) y anular el motivo (RF-87), obligatorios; aprobar
 * y descartar dicen qué pasa antes de hacerlo. El error se queda **dentro de la
 * ventana** (`useAccionDeVentana`, spec 015): detrás del telón no lo lee nadie.
 *
 * ── Cuando otro se adelantó (RF-93) ──
 *
 * Si el servidor responde 409 —otro residente lo aprobó, o lo devolvió, mientras esta
 * pantalla estaba abierta—, la ventana dice en qué quedó y la pantalla se vuelve a
 * pedir, para que lo que se ve sea el estado de verdad y no el de hace un rato.
 *
 * ── Enviar con cambios sin guardar ──
 *
 * Se impide: el servidor envía lo **guardado**, y enviar con cambios en pantalla
 * mandaría otra cosa distinta de la que se ve. Primero se guarda.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, TextoPanel } from '@/constants/theme';
import { transicionPermitida } from '@/shared/rules/granulometria';
import { alcanza, type Rol } from '@/shared/rules/permisos';

import { api, ErrorApi } from '@/features/panel/cliente-api';
import {
  Acciones,
  AccionesFormulario,
  Aviso,
  Boton,
  Campo,
  Celda,
  Formulario,
  Modal,
  Seccion,
} from '@/features/panel/componentes';
import type { EnsayoDetalle, FirmaDelEnsayo } from '@/features/panel/contratos';
import { useAccionDeVentana } from '@/features/panel/usar-accion-de-ventana';
import type { EventoDelEnsayo } from '@/features/laboratorio/tipos';

type Paso = 'enviar' | 'descartar' | 'aprobar' | 'devolver' | 'anular';

/** Día y hora en la obra: «24 sept 2026, 04:22 p. m.». */
export function momento(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** «Diego Pérez (Laboratorista), 24 sept 2026…»: una firma para leer. */
export function firmaLegible(firma: FirmaDelEnsayo): string {
  return `${firma.nombre}${firma.cargo ? ` (${firma.cargo})` : ''}, ${momento(firma.en)}`;
}

const VERBO: Record<EventoDelEnsayo['accion'], string> = {
  enviar: 'Envió a aprobación',
  devolver: 'Devolvió',
  aprobar: 'Aprobó',
  anular: 'Anuló',
  descartar: 'Descartó',
};

export function AccionesDelEnsayo({
  detalle,
  rol,
  sinGuardar,
  onCambiado,
  onRecargar,
}: {
  detalle: EnsayoDetalle;
  rol: Rol;
  /** Hay cambios en pantalla que no se han guardado. */
  sinGuardar: boolean;
  /** El ensayo tal como lo dejó el paso. */
  onCambiado: (nuevo: EnsayoDetalle) => void;
  /**
   * Volver a pedir el ensayo porque otro se adelantó (RF-93), con lo que dijo el
   * servidor: la pantalla se rearma al recargar y esta ventana se cierra, así que el
   * motivo lo tiene que mostrar quien recarga.
   */
  onRecargar: (motivo: string) => void;
}) {
  const [abierto, setAbierto] = useState<Paso | null>(null);

  const puede = (paso: Paso) =>
    transicionPermitida(detalle.estado, paso) &&
    alcanza(
      rol,
      'laboratorio',
      paso === 'enviar' || paso === 'descartar'
        ? 'escribir'
        : paso === 'anular'
          ? 'anular'
          : 'aprobar',
    );

  const pasos: Paso[] = (['enviar', 'aprobar', 'devolver', 'anular', 'descartar'] as const).filter(
    puede,
  );

  return (
    <>
      {/* RF-81: el comentario de quien lo devolvió, mientras está devuelto. */}
      {detalle.estado === 'devuelto' && detalle.comentarioDevolucion ? (
        <Aviso tono="error">{`Devuelto para corregir: ${detalle.comentarioDevolucion}`}</Aviso>
      ) : null}
      {/* RF-89: anulado, con quién, cuándo y por qué. Los datos se conservan debajo. */}
      {detalle.anulado ? (
        <Aviso tono="error">
          {`ANULADO por ${firmaLegible(detalle.anulado)} · Motivo: ${detalle.anulado.motivo}`}
        </Aviso>
      ) : null}

      {pasos.length > 0 ? (
        <View style={estilos.barra}>
          <Acciones>
            {pasos.includes('enviar') ? (
              <Boton
                titulo="Enviar a aprobación"
                onPress={() => setAbierto('enviar')}
                deshabilitado={sinGuardar}
              />
            ) : null}
            {pasos.includes('aprobar') ? (
              <Boton titulo="Aprobar" onPress={() => setAbierto('aprobar')} />
            ) : null}
            {pasos.includes('devolver') ? (
              <Boton titulo="Devolver" tono="secundario" onPress={() => setAbierto('devolver')} />
            ) : null}
            {pasos.includes('anular') ? (
              <Boton titulo="Anular" tono="peligro" onPress={() => setAbierto('anular')} />
            ) : null}
            {pasos.includes('descartar') ? (
              <Boton titulo="Descartar" tono="peligro" onPress={() => setAbierto('descartar')} />
            ) : null}
          </Acciones>
          {pasos.includes('enviar') && sinGuardar ? (
            <Celda>Guarde los cambios antes de enviar: se envía lo guardado.</Celda>
          ) : null}
        </View>
      ) : null}

      {abierto ? (
        <VentanaDePaso
          paso={abierto}
          detalle={detalle}
          onCerrar={() => setAbierto(null)}
          onHecho={(nuevo) => {
            setAbierto(null);
            if (abierto === 'descartar') {
              // Descartado deja de listarse (RF-91): no hay nada más que hacer aquí.
              router.replace('/panel/laboratorio');
              return;
            }
            onCambiado(nuevo);
          }}
          onAdelantado={onRecargar}
        />
      ) : null}
    </>
  );
}

const TEXTO_DE_PASO: Record<
  Paso,
  {
    titulo: string;
    aviso: (d: EnsayoDetalle) => string;
    confirmar: string;
    tono: 'primario' | 'peligro';
    campo?: string;
  }
> = {
  enviar: {
    titulo: 'Enviar a aprobación',
    aviso: () =>
      'Queda enviado al residente para que lo apruebe o lo devuelva. Desde ahora no se corrige, y usted figura como «Revisó».',
    confirmar: 'Enviar',
    tono: 'primario',
  },
  aprobar: {
    titulo: 'Aprobar el ensayo',
    aviso: (d) =>
      `Usted figura como «Aprobó» y hoy como fecha de emisión. ${d.veredicto === 'no_cumple' ? 'El ensayo dice NO CUMPLE: se aprueba el ensayo, no el material. ' : ''}Aprobado, no se corrige: si hay un error, se anula con motivo y se registra otro.`,
    confirmar: 'Aprobar',
    tono: 'primario',
  },
  devolver: {
    titulo: 'Devolver al laboratorio',
    aviso: () =>
      'Vuelve al laboratorista para que lo corrija y lo envíe de nuevo. Diga qué hay que corregir: el comentario le llega a él y queda en la historia.',
    confirmar: 'Devolver',
    tono: 'primario',
    campo: 'Qué hay que corregir',
  },
  anular: {
    titulo: 'Anular el ensayo',
    aviso: () =>
      'No se borra: el ensayo queda con la marca ANULADO, con su nombre y el motivo, y su número de informe queda libre para registrar otro.',
    confirmar: 'Anular',
    tono: 'peligro',
    campo: 'Motivo de la anulación',
  },
  descartar: {
    titulo: 'Descartar el borrador',
    aviso: () =>
      'Deja de verse en el listado y en el parte. No se borra de la base, y su número de informe queda libre.',
    confirmar: 'Descartar',
    tono: 'peligro',
  },
};

function VentanaDePaso({
  paso,
  detalle,
  onCerrar,
  onHecho,
  onAdelantado,
}: {
  paso: Paso;
  detalle: EnsayoDetalle;
  onCerrar: () => void;
  onHecho: (nuevo: EnsayoDetalle) => void;
  onAdelantado: (motivo: string) => void;
}) {
  const texto = TEXTO_DE_PASO[paso];
  const accion = useAccionDeVentana();
  const [escrito, setEscrito] = useState('');
  const [intentado, setIntentado] = useState(false);
  const falta = texto.campo !== undefined && escrito.trim().length === 0;

  async function dar() {
    setIntentado(true);
    if (falta) return;
    let nuevo: EnsayoDetalle | null = null;
    const salio = await accion.ejecutar(async () => {
      try {
        nuevo = await {
          enviar: () => api.laboratorio.enviar(detalle.id),
          aprobar: () => api.laboratorio.aprobar(detalle.id),
          devolver: () => api.laboratorio.devolver(detalle.id, escrito),
          anular: () => api.laboratorio.anular(detalle.id, escrito),
          descartar: () => api.laboratorio.descartar(detalle.id),
        }[paso]();
      } catch (fallo) {
        // RF-93: otro se adelantó. Se dice aquí y la pantalla se vuelve a pedir.
        if (fallo instanceof ErrorApi && fallo.estado === 409) onAdelantado(fallo.message);
        throw fallo;
      }
    });
    if (salio && nuevo) onHecho(nuevo);
  }

  return (
    <Modal titulo={texto.titulo} onCerrar={accion.ejecutando ? () => {} : onCerrar}>
      <Aviso tono="info">{texto.aviso(detalle)}</Aviso>
      {accion.error ? <Aviso tono="error">{accion.error}</Aviso> : null}
      <Formulario>
        {texto.campo ? (
          <Campo
            etiqueta={texto.campo}
            obligatorio
            valor={escrito}
            onChange={setEscrito}
            multilinea
            error={
              intentado && falta
                ? 'Escríbalo: es obligatorio.'
                : accion.campoConError(paso === 'devolver' ? 'comentario' : 'motivo')
            }
          />
        ) : null}
        <AccionesFormulario>
          <Acciones>
            <Boton
              titulo={accion.ejecutando ? 'Un momento…' : texto.confirmar}
              tono={texto.tono}
              onPress={dar}
              deshabilitado={accion.ejecutando}
            />
            <Boton
              titulo="Cancelar"
              tono="secundario"
              onPress={onCerrar}
              deshabilitado={accion.ejecutando}
            />
          </Acciones>
        </AccionesFormulario>
      </Formulario>
    </Modal>
  );
}

/** Las firmas y la historia completa del ensayo (RF-75, RF-83, RF-94). */
export function HistoriaDelEnsayo({ detalle }: { detalle: EnsayoDetalle }) {
  return (
    <Seccion titulo="Firmas e historia">
      <View style={estilos.firmas}>
        <Text style={estilos.linea}>
          <Text style={estilos.rotulo}>Registró: </Text>
          {momento(detalle.registradoEn)}
        </Text>
        <Text style={estilos.linea}>
          <Text style={estilos.rotulo}>Revisó: </Text>
          {detalle.revisado ? firmaLegible(detalle.revisado) : 'Todavía no se ha enviado.'}
        </Text>
        <Text style={estilos.linea}>
          <Text style={estilos.rotulo}>Aprobó: </Text>
          {detalle.aprobado ? firmaLegible(detalle.aprobado) : 'Todavía no se ha aprobado.'}
        </Text>
      </View>
      {detalle.historia.length > 0 ? (
        <View style={estilos.historia}>
          {detalle.historia.map((evento, indice) => (
            <Text key={`${evento.en}-${indice}`} style={estilos.linea}>
              <Text style={estilos.rotulo}>{`${momento(evento.en)} · `}</Text>
              {`${VERBO[evento.accion]}: ${evento.nombre}${evento.cargo ? ` (${evento.cargo})` : ''}`}
              {evento.texto ? ` — «${evento.texto}»` : ''}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={estilos.linea}>Sin pasos todavía: el ensayo sigue en borrador.</Text>
      )}
    </Seccion>
  );
}

const estilos = StyleSheet.create({
  barra: { gap: Spacing.two },
  firmas: { gap: Spacing.one },
  historia: { gap: Spacing.one, marginTop: Spacing.two },
  linea: { fontSize: TextoPanel.cuerpo, color: Colors.light.text },
  rotulo: { fontWeight: '700', color: Colors.light.textSecondary },
});
