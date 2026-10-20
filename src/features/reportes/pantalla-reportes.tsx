/**
 * El módulo de Reportes (spec 030): lo que guardan las bitácoras, junto por día,
 * semana o mes, en pestañas por tema, y el mantenimiento de las máquinas.
 *
 * ── El encabezado ──
 *
 * La obra (solo la gerencia elige; el residente ve la suya, RF-2), el tipo de periodo
 * y las flechas para pasar al anterior o al siguiente (RF-4). Abre en la semana actual
 * y en Máquinas (RF-5). Todo queda en la dirección, para que un reporte se pueda
 * compartir o volver a abrir tal como estaba.
 */
import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { api, mensajeDe } from '@/features/panel/cliente-api';
import { Acciones, Aviso, Boton, CampoDeFecha, Selector } from '@/features/panel/componentes';
import type { ConsultaDeReporte, ObraFila, PestanaDeReporte } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { usePersona } from '@/features/panel/sesion';
import { useParametroDeDireccion } from '@/features/panel/usar-parametro-direccion';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { esTipoDePeriodo, periodoDe, periodoVecino, type TipoDePeriodo } from '@/shared/rules/periodos';

import { hojasDelReporte, paginaParaImprimir, textoDelPeriodo, TITULO_DE_PESTANA } from './exportar';
import { PestanaMantenimiento } from './pestana-mantenimiento';
import { PestanaMaquinas } from './pestana-maquinas';
import { PestanaPersonal } from './pestana-personal';
import { PestanaActividades, PestanaCalidad, PestanaCantera, PestanaClima } from './pestanas-de-obra';

const PESTANAS: readonly PestanaDeReporte[] = [
  'maquinas',
  'mantenimiento',
  'personal',
  'actividades',
  'cantera',
  'calidad',
  'clima',
];

const TIPOS: readonly { valor: TipoDePeriodo; titulo: string }[] = [
  { valor: 'dia', titulo: 'Día' },
  { valor: 'semana', titulo: 'Semana' },
  { valor: 'mes', titulo: 'Mes' },
];

const ANTERIOR: Record<TipoDePeriodo, string> = { dia: 'Día anterior', semana: 'Semana anterior', mes: 'Mes anterior' };
const SIGUIENTE: Record<TipoDePeriodo, string> = { dia: 'Día siguiente', semana: 'Semana siguiente', mes: 'Mes siguiente' };

export default function PantallaReportes() {
  const { rol } = usePersona();
  const esGerencia = rol === 'admin';

  // Solo la gerencia elige obra: el residente ve la suya, la elija o no (RF-2).
  const obras = useListado<ObraFila>(
    useCallback(() => (esGerencia ? api.obras.listar() : Promise.resolve([])), [esGerencia]),
  );
  const activas = obras.datos.filter((o) => o.activa);
  const [obraElegida, setObraElegida] = useParametroDeDireccion('obra', '');
  // Sin obra elegida, la primera activa: un reporte necesita una.
  const primeraActiva = activas[0]?.id;
  useEffect(() => {
    if (esGerencia && !obraElegida && primeraActiva) setObraElegida(primeraActiva);
  }, [esGerencia, obraElegida, primeraActiva, setObraElegida]);

  const hoy = fechaDeJornada();
  const [tipoLeido, setTipo] = useParametroDeDireccion('periodo', 'semana');
  const tipo: TipoDePeriodo = esTipoDePeriodo(tipoLeido) ? tipoLeido : 'semana';
  const [fechaLeida, setFecha] = useParametroDeDireccion('fecha', hoy);
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaLeida) ? fechaLeida : hoy;
  const [pestanaLeida, setPestana] = useParametroDeDireccion('pestana', 'maquinas');
  const pestana: PestanaDeReporte = (PESTANAS as readonly string[]).includes(pestanaLeida)
    ? (pestanaLeida as PestanaDeReporte)
    : 'maquinas';

  const periodo = periodoDe(tipo, fecha);
  const consulta: ConsultaDeReporte = { obraId: esGerencia ? obraElegida || null : null, tipo, fecha };
  const faltaObra = esGerencia && !obraElegida;
  const esElActual = periodo.desde <= hoy && hoy <= periodo.hasta;
  const [avisoDeSalida, setAvisoDeSalida] = useState<string | null>(null);

  /** Descarga el Excel de la pestaña y el periodo que se ven (RF-9). Lo guarda el navegador. */
  function descargarExcel() {
    if (Platform.OS !== 'web') return;
    window.location.assign(api.reportes.direccionDelExcel(pestana, consulta));
  }

  /**
   * Abre la versión para imprimir o guardar como PDF (RF-10). La ventana se abre en el
   * mismo clic —si se abriera después de esperar al servidor, el navegador la bloquea— y
   * se llena cuando llega el reporte, con las mismas tablas que el Excel.
   */
  async function imprimir() {
    if (Platform.OS !== 'web') return;
    const ventana = window.open('', '_blank');
    if (!ventana) {
      setAvisoDeSalida('El navegador bloqueó la ventana para imprimir. Permita las ventanas emergentes de este sitio.');
      return;
    }
    setAvisoDeSalida(null);
    ventana.document.write('<p style="font-family: system-ui">Preparando el reporte…</p>');
    try {
      const datos = await api.reportes.de(pestana, consulta);
      const generado = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' });
      const html = paginaParaImprimir({
        titulo: `${TITULO_DE_PESTANA[pestana]} · ${datos.obra?.nombre ?? 'Obra'}`,
        subtitulo: `${textoDelPeriodo(periodo)} · generado el ${generado}`,
        // Lo mismo que el Excel: las fechas que llegan como texto no se imprimen.
        hojas: hojasDelReporte(pestana, datos as never),
        esMes: tipo === 'mes',
      });
      ventana.document.open();
      ventana.document.write(html);
      ventana.document.close();
    } catch (fallo) {
      ventana.close();
      setAvisoDeSalida(mensajeDe(fallo));
    }
  }

  return (
    <MarcoPantalla
      modulo="reportes"
      exigeObra
      titulo="Reportes"
      descripcion="Lo que guardan las bitácoras, por día, semana o mes: máquinas, mantenimiento, personal, actividades, cantera, control de calidad y clima."
      error={obras.error}
      cargando={obras.cargando}
    >
      <View style={estilos.encabezado}>
        {esGerencia ? (
          <Selector
            etiqueta="Obra"
            valor={obraElegida || null}
            opciones={activas.map((o) => ({ valor: o.id, etiqueta: `${o.codigo} · ${o.nombre}` }))}
            onChange={(v) => setObraElegida(v ?? '')}
            vacio="Elija la obra"
            ancho={300}
          />
        ) : null}
        <Acciones>
          {TIPOS.map((t) => (
            <Boton
              key={t.valor}
              titulo={t.titulo}
              tono={tipo === t.valor ? 'primario' : 'secundario'}
              onPress={() => setTipo(t.valor)}
            />
          ))}
        </Acciones>
        <View style={estilos.periodo}>
          <Boton titulo={`‹ ${ANTERIOR[tipo]}`} tono="secundario" onPress={() => setFecha(periodoVecino(periodo, -1).desde)} />
          <Text style={estilos.textoDelPeriodo} accessibilityRole="header">
            {textoDelPeriodo(periodo)}
          </Text>
          <Boton titulo={`${SIGUIENTE[tipo]} ›`} tono="secundario" onPress={() => setFecha(periodoVecino(periodo, 1).desde)} />
          {esElActual ? null : <Boton titulo="Volver a hoy" tono="secundario" onPress={() => setFecha(hoy)} />}
          <CampoDeFecha etiqueta="Ir a la fecha" valor={fecha} onChange={(v) => v && setFecha(v)} max={hoy} />
        </View>
      </View>

      {faltaObra ? null : (
        <Acciones>
          <Boton titulo="Descargar Excel" tono="secundario" onPress={descargarExcel} />
          <Boton titulo="Imprimir" tono="secundario" onPress={imprimir} />
        </Acciones>
      )}
      {avisoDeSalida ? <Aviso tono="error">{avisoDeSalida}</Aviso> : null}

      <Acciones>
        {PESTANAS.map((p) => (
          <Boton
            key={p}
            titulo={TITULO_DE_PESTANA[p]}
            tono={pestana === p ? 'primario' : 'secundario'}
            onPress={() => setPestana(p)}
          />
        ))}
      </Acciones>

      {faltaObra ? (
        <Aviso tono="info">Elija arriba la obra del reporte.</Aviso>
      ) : pestana === 'maquinas' ? (
        <PestanaMaquinas consulta={consulta} alVerMantenimiento={() => setPestana('mantenimiento')} />
      ) : pestana === 'mantenimiento' ? (
        <PestanaMantenimiento consulta={consulta} esGerencia={esGerencia} />
      ) : pestana === 'personal' ? (
        <PestanaPersonal consulta={consulta} />
      ) : pestana === 'actividades' ? (
        <PestanaActividades consulta={consulta} />
      ) : pestana === 'cantera' ? (
        <PestanaCantera consulta={consulta} />
      ) : pestana === 'calidad' ? (
        <PestanaCalidad consulta={consulta} />
      ) : (
        <PestanaClima consulta={consulta} />
      )}
    </MarcoPantalla>
  );
}

const estilos = StyleSheet.create({
  encabezado: { gap: 12 },
  periodo: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 8 },
  textoDelPeriodo: {
    fontFamily: FuentePanel.texto,
    fontWeight: '700',
    fontSize: TextoPanel.cuerpo + 2,
    color: Panel.texto,
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
});
