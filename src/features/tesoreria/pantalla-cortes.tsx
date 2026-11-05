/**
 * Cortes, en Tesorería de Elemental (spec 037, RF-24 a RF-26, D7).
 *
 * Arriba el consolidado del grupo de la spec 033 (RF-41 a RF-43), que se había quedado sin
 * pantalla: una fila por Elemental, OCC, Geolab y cada obra con su último corte, «Desactualizado»
 * si pasa de 30 días, y el total. Debajo, la información financiera de quien se elija —en el
 * selector o con «Ver» en su fila—: el último corte, registrar uno y el historial, la misma de
 * la 033. Al registrar o anular un corte, el consolidado se vuelve a pedir.
 *
 * La Auxiliar Administrativa consulta todo esto y, desde la spec 040 (D3), registra y anula
 * solo los cortes de Elemental (`porQueNoPuedeTocarElCorte`).
 */
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { InformacionFinanciera } from '@/features/empresas/pantalla-finanzas';
import { api } from '@/features/panel/cliente-api';
import { Boton, Celda, Cifra, Cifras, Etiqueta, RenglonDeCampos, Seccion, Selector, Tabla, type Columna } from '@/features/panel/componentes';
import type { ConsolidadoDelGrupo } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { fechaDelCorte, SIN_INFORMACION_FINANCIERA } from '@/shared/rules/cortes';
import type { EmpresaId } from '@/shared/rules/empresas';
import { enPesos } from '@/shared/rules/pesos';

type Fila = ConsolidadoDelGrupo['filas'][number];

/** La clave del selector: `empresa:occ` u `obra:<id>`. */
const claveDe = (f: Pick<Fila, 'tipo' | 'id'>) => `${f.tipo}:${f.id}`;

export function PantallaCortes() {
  const cargado = useListado<ConsolidadoDelGrupo>(useCallback(() => api.cortes.consolidado().then((c) => [c]), []));
  const consolidado = cargado.datos[0];
  const filas = consolidado?.filas ?? [];
  const [elegida, setElegida] = useState('empresa:elemental');
  const fila = filas.find((f) => claveDe(f) === elegida);

  const columnas: Columna<Fila>[] = [
    { clave: 'lugar', titulo: 'Empresa u obra', ancho: 220, pintar: (f) => <Celda>{f.nombre}</Celda> },
    {
      clave: 'fecha',
      titulo: 'Último corte',
      ancho: 170,
      pintar: (f) =>
        f.corte ? (
          <View style={estilos.celdaDoble}>
            <Text style={estilos.texto}>{fechaDelCorte(f.corte.fechaCorte)}</Text>
            {f.desactualizado ? <Etiqueta tono="atencion">Desactualizado</Etiqueta> : null}
          </View>
        ) : (
          <Text style={estilos.apoyo}>{SIN_INFORMACION_FINANCIERA}</Text>
        ),
    },
    { clave: 'saldo', titulo: 'Saldo', ancho: 150, pintar: (f) => <Celda>{f.corte ? enPesos(f.corte.saldo) : '—'}</Celda> },
    { clave: 'pagar', titulo: 'Por pagar', ancho: 150, pintar: (f) => <Celda>{f.corte ? enPesos(f.corte.cuentasPorPagar) : '—'}</Celda> },
    { clave: 'cobrar', titulo: 'Por cobrar', ancho: 150, pintar: (f) => <Celda>{f.corte ? enPesos(f.corte.cuentasPorCobrar) : '—'}</Celda> },
    {
      clave: 'ver',
      titulo: '',
      ancho: 100,
      anchoMinimo: 100,
      pintar: (f) => (
        <Boton titulo="Ver" tono={claveDe(f) === elegida ? 'primario' : 'secundario'} onPress={() => setElegida(claveDe(f))} />
      ),
    },
  ];

  return (
    <MarcoPantalla
      titulo="Cortes"
      descripcion="La información financiera del grupo: el último corte de cada empresa y cada obra, y el detalle de una."
      error={cargado.error}
      cargando={cargado.cargando}
    >
      {consolidado ? (
        <>
          <Cifras>
            <Cifra titulo="Saldo del grupo" valor={enPesos(consolidado.total.saldo)} pie={`${consolidado.conCorte} de ${filas.length} con corte`} />
            <Cifra titulo="Cuentas por pagar" valor={enPesos(consolidado.total.cuentasPorPagar)} />
            <Cifra titulo="Cuentas por cobrar" valor={enPesos(consolidado.total.cuentasPorCobrar)} />
          </Cifras>
          <Seccion titulo="Consolidado del grupo">
            <Tabla columnas={columnas} filas={filas} vacio="No hay empresas ni obras." />
          </Seccion>
        </>
      ) : null}

      <Seccion titulo={fila ? `Información financiera: ${fila.nombre}` : 'Información financiera'}>
        <RenglonDeCampos>
          <Selector
            etiqueta="De"
            valor={elegida}
            opciones={filas.map((f) => ({ valor: claveDe(f), etiqueta: f.nombre, detalle: f.tipo === 'obra' ? 'Obra' : 'Empresa' }))}
            onChange={(v) => v && setElegida(v)}
            ancho={280}
          />
        </RenglonDeCampos>
      </Seccion>
      {fila ? (
        // La `key` vuelve a montar la información al cambiar de dueño: nada del anterior se queda.
        <InformacionFinanciera
          key={elegida}
          {...(fila.tipo === 'empresa' ? { empresa: fila.id as Exclude<EmpresaId, 'proyectos'> } : { obraId: fila.id })}
          alCambiar={cargado.recargar}
        />
      ) : null}
    </MarcoPantalla>
  );
}

const estilos = StyleSheet.create({
  celdaDoble: { gap: Spacing.half, alignItems: 'flex-start' },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
