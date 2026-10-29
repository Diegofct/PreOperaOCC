/**
 * La Bitácora de maquinaria de OCC (spec 033, RF-22): la sección Maquinaria de las
 * bitácoras de todas las obras, una fila por máquina y día, con filtro de obra y de
 * fechas. Se lee de las bitácoras —se llena y se corrige allí—; cada fila lleva a la
 * bitácora de su obra y su día, a quien puede abrir esa obra: el Encargado de OCC no
 * entra a las obras (spec 034, RF-14), así que para él el día es solo texto.
 */

import { Link, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { api } from '@/features/panel/cliente-api';
import { Acciones, Celda, Paginacion, Seccion, Selector, Tabla, type Columna } from '@/features/panel/componentes';
import type { MaquinaDeLasObrasFila, ObraFila } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { POR_PAGINA } from '@/features/panel/paginas';
import { usePersona } from '@/features/panel/sesion';
import { usePaginacion } from '@/features/panel/usar-listado-filtrado';
import { CamposDeFechas, useFiltroDeFechas } from '@/features/panel/whatsapp/filtro-de-fechas';
import { fechaDelCorte } from '@/shared/rules/cortes';
import { alcanzaLaObraDeLaRuta, rutaDeObra } from '@/shared/rules/empresas';
import { UNIDAD_DE_MEDIDOR } from '@/shared/rules/jornada';

/** «3.6000000000002» → 3,6: la resta de dos lecturas con decimales deja colas de coma flotante. */
function unDecimal(valor: number): string {
  return (Math.round(valor * 10) / 10).toLocaleString('es-CO');
}

export function PantallaBitacoraDeMaquinaria() {
  const persona = usePersona();
  const [obraId, setObraId] = useState<string | null>(null);
  const fechas = useFiltroDeFechas();
  const { desde, hasta } = fechas.consultado;
  const obras = useListado<ObraFila>(useCallback(() => api.obras.listar(), []));
  const maquinas = useListado<MaquinaDeLasObrasFila>(
    useCallback(() => api.partes.maquinaria({ obraId, desde, hasta }), [obraId, desde, hasta]),
  );
  const pagina = usePaginacion(maquinas.datos, `${obraId}|${desde}|${hasta}`);

  const columnas: Columna<MaquinaDeLasObrasFila>[] = [
    {
      clave: 'fecha',
      titulo: 'Día',
      ancho: 110,
      // Abre la bitácora de ese día en su obra, si es de las que puede abrir.
      pintar: (m) =>
        alcanzaLaObraDeLaRuta(persona, m.obraId) ? (
          <Link href={`${rutaDeObra(m.obraId, 'bitacoras')}?fecha=${m.fecha}` as Href} asChild>
            <Pressable accessibilityRole="link">
              <Text style={estilos.enlace}>{fechaDelCorte(m.fecha)}</Text>
            </Pressable>
          </Link>
        ) : (
          <Celda>{fechaDelCorte(m.fecha)}</Celda>
        ),
    },
    { clave: 'obra', titulo: 'Obra', ancho: 200, pintar: (m) => <Celda>{m.obraNombre}</Celda> },
    { clave: 'equipo', titulo: 'Equipo', ancho: 200, pintar: (m) => <Celda>{m.equipo}</Celda> },
    { clave: 'operador', titulo: 'Operador', ancho: 170, pintar: (m) => <Celda>{m.operador ?? '—'}</Celda> },
    {
      clave: 'lecturas',
      titulo: 'Lecturas',
      ancho: 160,
      pintar: (m) => (
        <Celda>{`${m.medidorInicial ?? '—'} → ${m.medidorFinal ?? '—'} ${UNIDAD_DE_MEDIDOR[m.claseMedidor]}`}</Celda>
      ),
    },
    {
      clave: 'avance',
      titulo: 'Avance',
      ancho: 100,
      pintar: (m) => <Celda>{m.avance === null ? '—' : `${unDecimal(m.avance)} ${UNIDAD_DE_MEDIDOR[m.claseMedidor]}`}</Celda>,
    },
    { clave: 'observaciones', titulo: 'Observaciones', ancho: 220, pintar: (m) => <Celda>{m.observaciones || '—'}</Celda> },
    { clave: 'estado', titulo: 'Bitácora', ancho: 100, pintar: (m) => <Celda>{m.cerrada ? 'Cerrada' : 'Abierta'}</Celda> },
  ];

  return (
    <MarcoPantalla
      titulo="Bitácora de maquinaria"
      descripcion="Las máquinas de las bitácoras de todas las obras: lecturas, avance, operador y observaciones de cada día. Se llenan en la bitácora de cada obra."
      error={maquinas.error ?? obras.error}
      cargando={maquinas.cargando}
    >
      <Seccion titulo="Máquinas por día">
        <Acciones>
          <Selector
            etiqueta="Obra"
            valor={obraId}
            opciones={obras.datos.map((o) => ({ valor: o.id, etiqueta: o.nombre }))}
            onChange={setObraId}
            permiteVacio
            vacio="Todas las obras"
            ancho={260}
          />
          <CamposDeFechas filtro={fechas} />
        </Acciones>
        <Tabla
          columnas={columnas}
          filas={pagina.pagina}
          vacio={`No hay máquinas en las bitácoras entre el ${fechaDelCorte(desde)} y el ${fechaDelCorte(hasta)}.`}
        />
        <Paginacion pagina={pagina.paginaActual} porPagina={POR_PAGINA} total={pagina.total} onCambiar={pagina.irAPagina} />
      </Seccion>
    </MarcoPantalla>
  );
}

const estilos = StyleSheet.create({
  enlace: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.cuerpo,
    fontWeight: '600',
    color: Panel.texto,
    textDecorationLine: 'underline',
  },
});
