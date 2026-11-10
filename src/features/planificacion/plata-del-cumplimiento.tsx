/**
 * La plata del informe de cumplimiento (spec 043, RF-75 a RF-85, RF-87, RF-131 a RF-135). Solo
 * se pinta si el informe la trae: la Gerencia, el Director de Proyectos y el Director de Obra.
 * Al Residente el servidor se la quita antes de mandarlo, así que esta parte ni se monta.
 *
 * Lo que se compara es ejecutado contra programado **a precio de costo**: el «Faltó» o «Sobró» no
 * es lo que realmente se gastó (Fuera de alcance de la spec), y se dice debajo. El resultado, los
 * indirectos y los rubros salen solo en el informe mensual (RF-131 a RF-133): el servidor los manda
 * en `null` o vacíos en la semana, y aquí se pinta lo que llega. Los rubros van aparte y sin
 * porcentaje, porque no se mide su ejecución (RF-134, RF-135).
 *
 * Ninguna cuenta aquí: todas vienen hechas (RF-96).
 */
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { Aviso, Celda, Cifra, Cifras, Seccion, Tabla, type Columna } from '@/features/panel/componentes';
import type { FilaDelInforme, InformeDeCumplimiento } from '@/shared/rules/cumplimiento-de-obra';
import { enPesos } from '@/shared/rules/pesos';

function pesos(n: number | null): string {
  return n === null ? '—' : enPesos(n);
}

export function PlataDelCumplimiento({ informe }: { informe: InformeDeCumplimiento }) {
  const { totales } = informe;
  const faltoSobro = totales.faltoSobro.tipo === 'falto' ? 'Faltó' : totales.faltoSobro.tipo === 'sobro' ? 'Sobró' : 'Faltó o sobró';

  const filas = informe.filas.filter((f) => f.valores.programado !== null || f.valores.ejecutado !== null).map((f) => ({ ...f, id: f.llave }));
  // Caben en `MaxContentWidthPanel`: 220 + 70 + 360 + 160 + 160 + 160 = 1 130, más 7 separaciones.
  const columnas: Columna<FilaDelInforme & { id: string }>[] = [
    { clave: 'capitulo', titulo: 'Capítulo', ancho: 220, pintar: (f) => <Celda>{f.capitulo}</Celda>, ordenar: (f) => f.capitulo },
    { clave: 'item', titulo: 'Ítem', ancho: 70, pintar: (f) => <Celda>{f.item}</Celda>, ordenar: (f) => f.item },
    { clave: 'descripcion', titulo: 'Descripción', ancho: 360, pintar: (f) => <Celda>{f.descripcion}</Celda> },
    { clave: 'programado', titulo: 'Valor programado', ancho: 160, pintar: (f) => <Celda>{pesos(f.valores.programado)}</Celda> },
    { clave: 'ejecutado', titulo: 'Valor ejecutado', ancho: 160, pintar: (f) => <Celda>{pesos(f.valores.ejecutado)}</Celda> },
    { clave: 'aCobrar', titulo: 'A cobrar', ancho: 160, pintar: (f) => <Celda>{pesos(f.valores.aCobrar)}</Celda> },
  ];

  const rubros = informe.rubros.map((r, i) => ({ ...r, id: String(i) }));
  const sinCosto = informe.sinPrecioDeCosto.map((s) => ({ ...s, id: s.llave }));

  return (
    <View style={estilos.columna}>
      <Seccion titulo="Valores del periodo">
        <View style={estilos.columna}>
          <Cifras>
            <Cifra titulo="Valor programado" valor={enPesos(totales.programado)} />
            <Cifra titulo="Valor ejecutado" valor={enPesos(totales.ejecutado)} />
            <Cifra titulo="A cobrar" valor={enPesos(totales.aCobrar)} pie="A precio contractual" />
            <Cifra
              titulo={faltoSobro}
              valor={enPesos(totales.faltoSobro.valor)}
              tono={totales.faltoSobro.tipo === 'falto' ? 'atencion' : totales.faltoSobro.tipo === 'sobro' ? 'bueno' : 'neutro'}
            />
            <Cifra titulo="Margen" valor={enPesos(totales.margen)} pie="Antes de indirectos" />
          </Cifras>
          {informe.indirectos !== null || totales.resultado !== null ? (
            <Cifras>
              {informe.indirectos !== null ? <Cifra titulo="Indirectos programados" valor={enPesos(informe.indirectos)} /> : null}
              {totales.resultado !== null ? (
                <Cifra titulo="Resultado del mes" valor={enPesos(totales.resultado)} tono={totales.resultado < 0 ? 'malo' : 'bueno'} pie="Margen menos indirectos" />
              ) : null}
            </Cifras>
          ) : (
            <Text style={estilos.nota}>El resultado después de indirectos sale en el informe mensual.</Text>
          )}
          <Text style={estilos.nota}>
            Los valores son a precio de costo de la planificación; «A cobrar», a precio contractual. «{faltoSobro}» compara lo
            ejecutado con lo programado: no mide lo que realmente se gastó.
          </Text>
          {informe.avisoSinCosto ? (
            <Aviso tono="info">Hay ítems ejecutados sin precio de costo: los totales de plata no los incluyen. Se listan abajo.</Aviso>
          ) : null}
        </View>
      </Seccion>

      <Seccion titulo="Valores por ítem">
        <Tabla filas={filas} columnas={columnas} vacio="Ningún ítem con precio de costo tiene valores en este periodo." />
      </Seccion>

      {rubros.length > 0 ? (
        <Seccion titulo="Rubros programados del mes">
          <Tabla
            filas={rubros}
            columnas={[
              { clave: 'nombre', titulo: 'Rubro', ancho: 600, pintar: (r) => <Celda>{r.nombre}</Celda> },
              { clave: 'valor', titulo: 'Valor programado', ancho: 200, pintar: (r) => <Celda>{enPesos(r.valor)}</Celda> },
            ]}
            vacio=""
          />
        </Seccion>
      ) : null}

      {sinCosto.length > 0 ? (
        <Seccion titulo="Ejecutado sin precio de costo">
          <Tabla
            filas={sinCosto}
            columnas={[
              { clave: 'item', titulo: 'Ítem', ancho: 200, pintar: (s) => <Celda>{s.item}</Celda> },
              { clave: 'cantidad', titulo: 'Cantidad ejecutada', ancho: 200, pintar: (s) => <Celda>{s.cantidad.toLocaleString('es-CO', { maximumFractionDigits: 3 })}</Celda> },
            ]}
            vacio=""
          />
        </Seccion>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 12 },
  nota: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
