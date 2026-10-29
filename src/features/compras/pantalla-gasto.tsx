/**
 * Lo comprado por lugar (spec 036, RF-27): el total de las compras —sin las anuladas— de
 * cada obra, de OCC y de Geolab entre dos fechas de compra, de mayor a menor. Solo la
 * gerencia (`veElGasto`); la auxiliar de RR. HH. consulta Compras, pero no esto.
 *
 * Abre con el mes en curso: es la pregunta de siempre («¿cuánto llevamos este mes?»). Las
 * fechas se revisan con la misma regla del servidor (`rangoDeFechas`) antes de pedir.
 */
import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { api } from '@/features/panel/cliente-api';
import { Aviso, CampoDeFecha, Celda, Cifra, Cifras, RenglonDeCampos, Seccion, Tabla, type Columna } from '@/features/panel/componentes';
import type { GastoDeCompras } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { fechaDelCorte } from '@/shared/rules/cortes';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { enPesos } from '@/shared/rules/pesos';
import { MENSAJES_DE_RANGO, rangoDeFechas } from '@/shared/rules/rango';

type LugarDelGasto = GastoDeCompras['lugares'][number] & { id: string };

export function PantallaGasto() {
  const hoy = fechaDeJornada();
  const [desde, setDesde] = useState(`${hoy.slice(0, 8)}01`);
  const [hasta, setHasta] = useState(hoy);
  const rango = rangoDeFechas(desde, hasta, hoy);
  const error = 'error' in rango ? MENSAJES_DE_RANGO[rango.error] : null;

  const cargado = useListado<GastoDeCompras>(
    useCallback(
      () => ('error' in rango ? Promise.resolve([]) : api.compras.gasto(rango.desde, rango.hasta).then((g) => [g])),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [desde, hasta],
    ),
  );
  const gasto = cargado.datos[0];
  const filas: LugarDelGasto[] = (gasto?.lugares ?? []).map((l) => ({ ...l, id: l.lugar.id }));
  const compras = filas.reduce((suma, l) => suma + l.compras, 0);

  const columnas: Columna<LugarDelGasto>[] = [
    { clave: 'lugar', titulo: 'Para', ancho: 260, pintar: (l) => <Celda>{l.lugar.nombre}</Celda> },
    { clave: 'compras', titulo: 'Compras', ancho: 110, pintar: (l) => <Celda>{String(l.compras)}</Celda> },
    { clave: 'total', titulo: 'Total comprado', ancho: 180, pintar: (l) => <Celda>{enPesos(l.total)}</Celda> },
    {
      clave: 'parte',
      titulo: 'Del total',
      ancho: 110,
      pintar: (l) => <Celda>{gasto?.total ? `${Math.round((l.total / gasto.total) * 100)} %` : '—'}</Celda>,
    },
  ];

  return (
    <MarcoPantalla
      titulo="Gasto en compras"
      descripcion="Lo comprado por obra y por empresa entre dos fechas de compra, sin las compras anuladas."
      error={cargado.error}
      cargando={cargado.cargando}
    >
      <RenglonDeCampos>
        <CampoDeFecha etiqueta="Compradas desde" valor={desde} onChange={setDesde} max={hoy} />
        <CampoDeFecha etiqueta="Hasta" valor={hasta} onChange={setHasta} min={desde || undefined} />
      </RenglonDeCampos>
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      {gasto ? (
        <>
          <Cifras>
            <Cifra
              titulo="Total comprado"
              valor={enPesos(gasto.total)}
              pie={`Del ${fechaDelCorte(gasto.desde)} al ${fechaDelCorte(gasto.hasta)}`}
            />
            <Cifra titulo="Compras" valor={String(compras)} pie={`En ${filas.length} ${filas.length === 1 ? 'lugar' : 'lugares'}`} />
          </Cifras>
          <Seccion titulo="Por lugar">
            <Tabla columnas={columnas} filas={filas} vacio="No hay compras registradas en esas fechas." />
          </Seccion>
        </>
      ) : !error ? (
        <Text style={estilos.apoyo}>Cargando…</Text>
      ) : null}
    </MarcoPantalla>
  );
}

const estilos = StyleSheet.create({
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
