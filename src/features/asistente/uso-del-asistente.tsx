/**
 * El uso del asistente y sus límites, para la gerencia (spec 028, RF-56 a RF-59).
 *
 *  · Cuántas preguntas hizo cada persona en cada obra en un periodo y cuánto costaron,
 *    estimado (RF-56, RF-57). **Sin el contenido** de las conversaciones (RF-58): ni el
 *    servidor lo manda.
 *  · El límite del día: el de todos y el de cada persona, que manda sobre el de todos; sin
 *    ninguno, 30 (RF-50, RF-59).
 */
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { api, mensajeDe } from '@/features/panel/cliente-api';
import {
  Acciones,
  Aviso,
  Boton,
  Campo,
  CampoDeFecha,
  Celda,
  Cifra,
  Cifras,
  Seccion,
  Selector,
  Tabla,
  type Columna,
} from '@/features/panel/componentes';
import type { UsoDelAsistente } from '@/features/panel/contratos';
import { useListado } from '@/features/panel/marco';
import { LIMITE_DEL_DIA, ROLES_DEL_ASISTENTE } from '@/shared/rules/asistente';
import { fechaDeJornada } from '@/shared/rules/jornada';

/** Microdólares a dólares, como se lee en la factura de Anthropic. */
const enDolares = (micro: number) =>
  `US$ ${(micro / 1_000_000).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type FilaDeUso = UsoDelAsistente['filas'][number] & { id: string };

const COLUMNAS: Columna<FilaDeUso>[] = [
  { clave: 'persona', titulo: 'Persona', ancho: 220, pintar: (f) => <Celda>{f.persona}</Celda> },
  { clave: 'obra', titulo: 'Obra', ancho: 160, pintar: (f) => <Celda>{f.obra ?? 'Varias o ninguna'}</Celda> },
  { clave: 'preguntas', titulo: 'Preguntas', ancho: 110, pintar: (f) => <Celda>{String(f.preguntas)}</Celda> },
  { clave: 'costo', titulo: 'Costo estimado', ancho: 140, pintar: (f) => <Celda>{enDolares(f.costo)}</Celda> },
];

export function UsoDelAsistentePanel() {
  const hoy = fechaDeJornada();
  const [desde, setDesde] = useState(`${hoy.slice(0, 7)}-01`);
  const [hasta, setHasta] = useState(hoy);
  const [aviso, setAviso] = useState<{ tono: 'exito' | 'error'; texto: string } | null>(null);
  const [limiteDeTodos, setLimiteDeTodos] = useState('');
  const [personaElegida, setPersonaElegida] = useState<string | null>(null);
  const [limiteDePersona, setLimiteDePersona] = useState('');

  const uso = useListado(useCallback(async () => [await api.asistente.uso(desde, hasta)], [desde, hasta]));
  const personas = useListado(useCallback(() => api.personas.listar(), []));
  const datos = uso.datos[0];
  const filas: FilaDeUso[] = (datos?.filas ?? []).map((f) => ({ ...f, id: `${f.usuarioId}|${f.obraId ?? '-'}` }));
  const limites = datos?.limites;
  const opcionesDePersona = personas.datos
    .filter((p) => p.activo && ROLES_DEL_ASISTENTE.includes(p.rol))
    .map((p) => ({ valor: p.id, etiqueta: p.nombreCompleto, detalle: p.obraNombre ?? 'Sin obra' }));

  async function poner(usuarioId: string | null, texto: string | null) {
    const limite = texto === null ? null : Number(texto);
    if (texto !== null && (!/^\d+$/.test(texto.trim()) || limite! > 500)) {
      setAviso({ tono: 'error', texto: 'El límite es un número entero de 0 a 500.' });
      return;
    }
    try {
      await api.asistente.ponerLimite(usuarioId, limite);
      setAviso({ tono: 'exito', texto: limite === null ? 'Límite quitado.' : 'Límite guardado.' });
      setLimiteDeTodos('');
      setLimiteDePersona('');
      setPersonaElegida(null);
      uso.recargar();
    } catch (fallo) {
      setAviso({ tono: 'error', texto: mensajeDe(fallo) });
    }
  }

  const total = filas.reduce((t, f) => ({ preguntas: t.preguntas + f.preguntas, costo: t.costo + f.costo }), { preguntas: 0, costo: 0 });

  return (
    <View style={estilos.columna}>
      <Seccion titulo="Uso">
        <Text style={estilos.nota}>
          Cuántas preguntas hizo cada persona y cuánto costaron, estimado con el precio de la IA. No se ve lo que preguntaron.
        </Text>
        <View style={estilos.fila}>
          <CampoDeFecha etiqueta="Desde" valor={desde} onChange={setDesde} max={hasta} />
          <CampoDeFecha etiqueta="Hasta" valor={hasta} onChange={setHasta} min={desde} />
        </View>
        <Cifras>
          <Cifra titulo="Preguntas" valor={String(total.preguntas)} pie="respondidas en el periodo" />
          <Cifra titulo="Costo estimado" valor={enDolares(total.costo)} pie="de la IA" />
        </Cifras>
        {uso.error ? <Aviso tono="error">{uso.error}</Aviso> : null}
        <Tabla columnas={COLUMNAS} filas={filas} vacio={uso.cargando ? 'Cargando…' : 'Nadie usó el asistente en este periodo.'} />
      </Seccion>

      <Seccion titulo="Límite de preguntas por día">
        <Text style={estilos.nota}>
          {`El de todos: ${limites?.todos ?? `${LIMITE_DEL_DIA} (el de siempre)`}. El de una persona manda sobre el de todos. Se reinicia a medianoche, hora de Colombia.`}
        </Text>
        {aviso ? <Aviso tono={aviso.tono}>{aviso.texto}</Aviso> : null}
        <View style={estilos.fila}>
          <Campo etiqueta="Límite de todos" valor={limiteDeTodos} onChange={setLimiteDeTodos} soloNumeros ancho={180} />
        </View>
        <Acciones>
          <Boton titulo="Guardar el de todos" onPress={() => poner(null, limiteDeTodos)} deshabilitado={!limiteDeTodos.trim()} />
          {limites?.todos != null ? (
            <Boton titulo={`Volver a ${LIMITE_DEL_DIA}`} tono="secundario" onPress={() => poner(null, null)} />
          ) : null}
        </Acciones>

        <View style={estilos.fila}>
          <Selector etiqueta="Persona" valor={personaElegida} opciones={opcionesDePersona} onChange={setPersonaElegida} ancho={300} />
          <Campo etiqueta="Su límite" valor={limiteDePersona} onChange={setLimiteDePersona} soloNumeros ancho={140} />
        </View>
        <Acciones>
          <Boton
            titulo="Guardar el de la persona"
            onPress={() => poner(personaElegida, limiteDePersona)}
            deshabilitado={!personaElegida || !limiteDePersona.trim()}
          />
        </Acciones>

        {limites && limites.porPersona.length > 0 ? (
          <View style={estilos.lista}>
            {limites.porPersona.map((l) => (
              <View key={l.usuarioId} style={estilos.limite}>
                <Text style={estilos.texto}>{`${l.persona}: ${l.limite} por día`}</Text>
                <Boton titulo="Quitar" tono="secundario" onPress={() => poner(l.usuarioId, null)} />
              </View>
            ))}
          </View>
        ) : null}
      </Seccion>
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: Spacing.four },
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: Spacing.three },
  lista: { gap: Spacing.two },
  limite: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.three },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  nota: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.textoApoyo },
});
