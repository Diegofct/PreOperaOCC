/**
 * Aprobar un borrador o anular la vigente (spec 043, RF-34, RF-35, RF-47, RF-99, RF-121, RF-122).
 *
 * Solo para quien la tabla deja: la Gerencia y el Director de Proyectos. El servidor vuelve a
 * mirar todo; estos botones solo evitan ofrecer lo que no se puede hacer.
 *
 * Aprobar con hallazgos se confirma **una vez, por el conjunto** (RF-35), con el número a la
 * vista: la lista está en el detalle, justo encima. La primera planificación de la obra pregunta
 * además, mes por mes, cuáles de los meses anteriores ya cumplieron su meta (RF-121); dejarlos
 * todos sin marcar también es una respuesta, y se manda como tal.
 *
 * Se manda la `version` que se leyó. Si otra persona sustituyó o aprobó el borrador mientras tanto,
 * el servidor responde 409 sin aplicar nada (RF-99), y aquí se dice así y se ofrece recargar: nunca
 * se reintenta solo, porque lo que se iba a aprobar ya no es lo que se tiene delante.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { api, ErrorApi, mensajeDe } from '@/features/panel/cliente-api';
import { Acciones, Aviso, Boton, Campo, Casilla, Modal } from '@/features/panel/componentes';
import type { PlanificacionDetalle } from '@/features/panel/planificacion';
import { usePersona } from '@/features/panel/sesion';
import { alcanza } from '@/shared/rules/permisos';

/** «octubre de 2026». */
function nombreDelMes(mes: string): string {
  return new Date(`${mes}-15T12:00:00Z`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function AccionesPlanificacion({ p, alCambiar }: { p: PlanificacionDetalle; alCambiar: () => void }) {
  const { rol } = usePersona();
  const [ventana, setVentana] = useState<'aprobar' | 'anular' | null>(null);
  const [confirmo, setConfirmo] = useState(false);
  const [cumplidos, setCumplidos] = useState<string[]>([]);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cambio, setCambio] = useState(false);

  const puedeAprobar = p.estado === 'borrador' && alcanza(rol, 'planificacion', 'aprobar');
  const puedeAnular = p.estado === 'vigente' && alcanza(rol, 'planificacion', 'anular');
  if (!puedeAprobar && !puedeAnular) return null;

  function abrir(cual: 'aprobar' | 'anular') {
    setVentana(cual);
    setConfirmo(false);
    setCumplidos([]);
    setMotivo('');
    setError(null);
    setCambio(false);
  }

  async function ejecutar(accion: () => Promise<unknown>) {
    setEnviando(true);
    setError(null);
    try {
      await accion();
      setVentana(null);
      alCambiar();
    } catch (fallo) {
      // RF-99: el borrador cambió o ya no es lo que era. No se reintenta: se avisa y se recarga.
      setCambio(fallo instanceof ErrorApi && fallo.estado === 409 && !(fallo.cuerpo as { hallazgos?: unknown } | undefined)?.hallazgos);
      setError(mensajeDe(fallo));
    } finally {
      setEnviando(false);
    }
  }

  const hallazgos = p.hallazgos.length;
  const listoParaAprobar = hallazgos === 0 || confirmo;

  return (
    <View>
      <Acciones>
        {puedeAprobar ? <Boton titulo="Aprobar" tono="primario" onPress={() => abrir('aprobar')} /> : null}
        {puedeAnular ? <Boton titulo="Anular" tono="peligro" onPress={() => abrir('anular')} /> : null}
      </Acciones>

      {ventana === 'aprobar' ? (
        <Modal titulo={`Aprobar la versión ${p.numeroVersion}`} onCerrar={() => setVentana(null)}>
          <View style={estilos.columna}>
            <Text style={estilos.texto}>
              {`Al aprobarla, rige desde hoy y es la que mide el cumplimiento de la obra.${p.presupuestoDesactualizado ? ' Ojo: se cruzó contra una versión anterior del presupuesto.' : ''}`}
            </Text>
            {hallazgos > 0 ? (
              <Casilla
                etiqueta={`Revisé los ${hallazgos} hallazgos y la apruebo así.`}
                marcada={confirmo}
                onChange={setConfirmo}
              />
            ) : null}
            {p.mesesPorMarcar.length > 0 ? (
              <View style={estilos.columna}>
                <Text style={estilos.subtitulo}>Meses anteriores</Text>
                <Text style={estilos.nota}>
                  Es la primera planificación de la obra. Marque los meses que ya cumplieron su meta: se mostrarán como «Meta
                  cumplida». Los que deje sin marcar se medirán con lo que registran los partes.
                </Text>
                {p.mesesPorMarcar.map((mes) => (
                  <Casilla
                    key={mes}
                    etiqueta={`${nombreDelMes(mes)}: ya cumplió su meta`}
                    marcada={cumplidos.includes(mes)}
                    onChange={(marcada) => setCumplidos(marcada ? [...cumplidos, mes] : cumplidos.filter((m) => m !== mes))}
                  />
                ))}
              </View>
            ) : null}
            {error ? <Aviso tono="error">{error}</Aviso> : null}
            <Acciones>
              {cambio ? (
                <Boton
                  titulo="Volver a abrirla"
                  tono="primario"
                  onPress={() => {
                    setVentana(null);
                    alCambiar();
                  }}
                />
              ) : (
                <Boton
                  titulo={enviando ? 'Aprobando…' : 'Aprobar'}
                  tono="primario"
                  deshabilitado={!listoParaAprobar || enviando}
                  onPress={() =>
                    void ejecutar(() =>
                      api.planificaciones.aprobar(p.id, {
                        version: p.version,
                        confirmarHallazgos: hallazgos > 0 && confirmo,
                        ...(p.mesesPorMarcar.length > 0 ? { mesesCumplidos: cumplidos } : {}),
                      }),
                    )
                  }
                />
              )}
              <Boton titulo="Cancelar" tono="secundario" onPress={() => setVentana(null)} />
            </Acciones>
          </View>
        </Modal>
      ) : null}

      {ventana === 'anular' ? (
        <Modal titulo={`Anular la versión ${p.numeroVersion}`} onCerrar={() => setVentana(null)} angosta>
          <View style={estilos.columna}>
            <Text style={estilos.texto}>
              Deja de regir hoy: desde hoy la obra queda sin planificación aprobada hasta que se apruebe otra. No se borra:
              queda anulada con su motivo.
            </Text>
            <Campo etiqueta="Motivo" valor={motivo} onChange={setMotivo} multilinea obligatorio />
            {error ? <Aviso tono="error">{error}</Aviso> : null}
            <Acciones>
              <Boton
                titulo={enviando ? 'Anulando…' : 'Anular'}
                tono="peligro"
                deshabilitado={!motivo.trim() || enviando}
                onPress={() => void ejecutar(() => api.planificaciones.anular(p.id, motivo))}
              />
              <Boton titulo="Cancelar" tono="secundario" onPress={() => setVentana(null)} />
            </Acciones>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 12 },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  subtitulo: { fontFamily: FuentePanel.texto, fontWeight: '600', fontSize: TextoPanel.cuerpo, color: Panel.texto },
  nota: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
