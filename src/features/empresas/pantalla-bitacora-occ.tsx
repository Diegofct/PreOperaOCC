/**
 * La Bitácora de OCC (spec 038, RF-22, RF-23): dos pestañas en la dirección (`?pestana=`),
 * como Tesorería y Recursos Humanos.
 *
 *  · «Bitácora de OCC»: la bitácora diaria propia, armada desde el grupo de WhatsApp de
 *    OCC. Una lista de días con su estado y cuántos equipos quedaron operativos e
 *    inoperativos; al abrir un día, sus secciones (T18).
 *  · «En las obras»: la sección Maquinaria de las bitácoras de todas las obras, como hasta
 *    hoy (033/RF-22), para comparar las dos fuentes sin juntarlas (H4, D3).
 *
 * Las pestañas salen de `pestanasDeBitacora`; quién entra lo decide el menú (RF-29).
 */
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { api } from '@/features/panel/cliente-api';
import {
  Acciones,
  Aviso,
  Boton,
  Celda,
  Etiqueta,
  Paginacion,
  Seccion,
  Tabla,
  type Columna,
} from '@/features/panel/componentes';
import type { DiaDeBitacoraDeEmpresaFila } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { POR_PAGINA } from '@/features/panel/paginas';
import { usePaginacion } from '@/features/panel/usar-listado-filtrado';
import { useParametroDeDireccion } from '@/features/panel/usar-parametro-direccion';
import { CamposDeFechas, useFiltroDeFechas } from '@/features/panel/whatsapp/filtro-de-fechas';
import type { EstadoDelDiaDeEmpresa } from '@/shared/rules/bitacora-occ';
import { fechaDelCorte } from '@/shared/rules/cortes';
import { pestanasDeBitacora } from '@/shared/rules/empresas';

import { DiaDeLaBitacoraDeOcc } from './bitacora-occ-dia';
import { PantallaBitacoraDeMaquinaria } from './pantalla-maquinaria';

/** Cómo se nombra y se marca cada estado del día en la lista (RF-23). */
const ESTADO_DEL_DIA: Record<EstadoDelDiaDeEmpresa, { texto: string; tono: 'neutro' | 'atencion' | 'malo' | 'bueno' }> = {
  en_espera: { texto: 'En espera', tono: 'neutro' },
  armada: { texto: 'Armada', tono: 'bueno' },
  incompleta: { texto: 'Incompleta', tono: 'atencion' },
  cerrada: { texto: 'Cerrada', tono: 'neutro' },
  anulada: { texto: 'Anulada', tono: 'malo' },
};

export function PantallaBitacoraDeOcc() {
  const pestanas = pestanasDeBitacora('occ');
  const [pestana, setPestana] = useParametroDeDireccion('pestana', 'propia');
  const elegida = pestanas.some((p) => p.clave === pestana) ? pestana : 'propia';
  // El día abierto también va en la dirección (`?dia=`): un enlace copiado abre lo mismo.
  const [dia, setDia] = useParametroDeDireccion('dia', '');
  if (elegida === 'propia' && dia) return <DiaDeLaBitacoraDeOcc fecha={dia} alVolver={() => setDia('')} />;
  return (
    <View style={estilos.pantalla}>
      <View style={estilos.pestanas}>
        <Acciones>
          {pestanas.map((p) => (
            <Boton
              key={p.clave}
              titulo={p.titulo}
              tono={elegida === p.clave ? 'primario' : 'secundario'}
              onPress={() => setPestana(p.clave)}
            />
          ))}
        </Acciones>
      </View>
      {elegida === 'obras' ? <PantallaBitacoraDeMaquinaria /> : <DiasDeLaBitacora alAbrir={setDia} />}
    </View>
  );
}

/** La lista de días de la bitácora propia de OCC (RF-23). */
function DiasDeLaBitacora({ alAbrir }: { alAbrir: (fecha: string) => void }) {
  const fechas = useFiltroDeFechas();
  const { desde, hasta } = fechas.consultado;
  const dias = useListado<DiaDeBitacoraDeEmpresaFila>(
    useCallback(() => api.bitacoraDeEmpresa.dias('occ', { desde, hasta }), [desde, hasta]),
  );
  const pagina = usePaginacion(dias.datos, `${desde}|${hasta}`);

  const columnas: Columna<DiaDeBitacoraDeEmpresaFila>[] = [
    {
      clave: 'fecha',
      titulo: 'Día',
      ancho: 120,
      // La vigente se abre (RF-23); la anulada queda en la lista, sin abrir.
      pintar: (d) =>
        d.estado === 'anulada' ? (
          <Celda>{fechaDelCorte(d.fecha)}</Celda>
        ) : (
          <Pressable accessibilityRole="link" onPress={() => alAbrir(d.fecha)}>
            <Text style={estilos.enlace}>{fechaDelCorte(d.fecha)}</Text>
          </Pressable>
        ),
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 130,
      pintar: (d) => <Etiqueta tono={ESTADO_DEL_DIA[d.estado].tono}>{ESTADO_DEL_DIA[d.estado].texto}</Etiqueta>,
    },
    { clave: 'operativos', titulo: 'Operativos', ancho: 110, pintar: (d) => <Celda>{String(d.operativos)}</Celda> },
    { clave: 'inoperativos', titulo: 'Inoperativos', ancho: 120, pintar: (d) => <Celda>{String(d.inoperativos)}</Celda> },
    { clave: 'trabajos', titulo: 'Trabajos', ancho: 100, pintar: (d) => <Celda>{String(d.trabajos)}</Celda> },
    { clave: 'actividades', titulo: 'Actividades', ancho: 110, pintar: (d) => <Celda>{String(d.actividades)}</Celda> },
    { clave: 'pendientes', titulo: 'Pendientes', ancho: 110, pintar: (d) => <Celda>{String(d.pendientes)}</Celda> },
    {
      clave: 'nota',
      titulo: 'Nota',
      ancho: 260,
      pintar: (d) =>
        d.estado === 'anulada' ? (
          <Celda lineas={2}>{`Anulada: ${d.motivoAnulacion ?? ''}`}</Celda>
        ) : d.fechaDudosa ? (
          // D12: la lista vigente dice un día dudoso; el Encargado la revisa.
          <Etiqueta tono="atencion">Fecha dudosa</Etiqueta>
        ) : (
          <Celda>—</Celda>
        ),
    },
  ];

  return (
    <MarcoPantalla
      titulo="Bitácora de OCC"
      descripcion="La bitácora diaria de mantenimiento de OCC, armada desde su grupo de WhatsApp: qué equipos quedaron operativos e inoperativos, los trabajos, las actividades del personal de mantenimiento y los pendientes."
      error={dias.error}
      cargando={dias.cargando}
    >
      <Seccion titulo="Días">
        <Acciones>
          <CamposDeFechas filtro={fechas} />
        </Acciones>
        {dias.datos.some((d) => d.fechaDudosa && d.estado !== 'anulada') ? (
          <Aviso tono="info">
            Hay días con «Fecha dudosa»: su lista de equipos decía un día que ya había pasado, o llegó de noche para el mismo
            día. Revíselos antes de cerrarlos.
          </Aviso>
        ) : null}
        <Tabla
          columnas={columnas}
          filas={pagina.pagina}
          vacio={`No hay bitácora de OCC entre el ${fechaDelCorte(desde)} y el ${fechaDelCorte(hasta)}. Se arma sola con lo que llega al grupo de WhatsApp de OCC.`}
        />
        <Paginacion pagina={pagina.paginaActual} porPagina={POR_PAGINA} total={pagina.total} onCambiar={pagina.irAPagina} />
      </Seccion>
    </MarcoPantalla>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Panel.fondo },
  // Con el mismo margen que el marco de la pantalla de debajo, como en Tesorería.
  pestanas: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four },
  enlace: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.cuerpo,
    fontWeight: '600',
    color: Panel.texto,
    textDecorationLine: 'underline',
  },
});
