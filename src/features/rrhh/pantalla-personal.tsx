/**
 * El personal de Recursos Humanos (spec 035, RF-1 a RF-5, RF-27 a RF-31).
 *
 * La misma pantalla en Elemental, OCC, Geolab y cada obra: el lugar sale de la dirección
 * (`useLugarDelPanel`) y el servidor decide quién entra y a quién ve. En Elemental la
 * llevan la gerencia y la auxiliar; en las demás es de consulta (RF-3 a RF-5).
 *
 * Llega la lista entera con los avisos de hoy ya calculados en el servidor —con las mismas
 * reglas de la ficha— y aquí se filtra y se busca, para que buscar responda mientras se
 * escribe (RF-29, RF-30). Las retiradas no salen salvo que se pidan, como los documentos
 * anulados, y no cuentan en los avisos (RF-31).
 *
 * La ficha de cada persona se abre aquí mismo (`?persona=`, T13): así el filtro y la
 * búsqueda siguen donde estaban al volver.
 */
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { useLugarDelPanel } from '@/features/empresas/contexto-empresa';
import { api, type LugarDelPersonal } from '@/features/panel/cliente-api';
import {
  Acciones,
  BarraDeListado,
  Boton,
  Casilla,
  Celda,
  Cifra,
  Cifras,
  Etiqueta,
  Paginacion,
  Seccion,
  Selector,
  Tabla,
  type Columna,
} from '@/features/panel/componentes';
import type { PersonaDelPersonal, PersonalDelLugar } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { POR_PAGINA } from '@/features/panel/paginas';
import { useListadoFiltrado } from '@/features/panel/usar-listado-filtrado';
import { useParametroDeDireccion } from '@/features/panel/usar-parametro-direccion';
import { CARGOS, nombreDeCargo } from '@/shared/catalogos/cargos';
import { fechaDelCorte } from '@/shared/rules/cortes';
import { EMPRESAS, nombreDeEmpresa } from '@/shared/rules/empresas';
import { ESTADOS_LABORALES, nombreDeEstadoLaboral, nombreDeTipoDeContrato } from '@/shared/rules/ficha';
import { enPesos } from '@/shared/rules/pesos';

import { VistaDeLaFicha } from './vista-de-la-ficha';

const SIN_PERSONAL: PersonalDelLugar = {
  personas: [],
  resumen: {
    conDocumentosVencidos: 0,
    conDocumentosPorVencer: 0,
    contratosPorTerminar: 0,
    contratosTerminados: 0,
    fichasIncompletas: 0,
  },
};

/** `inactivo` no es un estado de la ficha: es la cuenta desactivada en Personas. */
const INACTIVO = 'inactivo';

/** Lo que se lee en la columna Estado: el de la ficha o, sin acceso, «Inactivo». */
function estadoVisible(p: PersonaDelPersonal): string {
  if (p.estado === 'retirado') return 'retirado';
  return p.activo ? p.estado : INACTIVO;
}

function EstadoDeLaPersona({ persona }: { persona: PersonaDelPersonal }) {
  const estado = estadoVisible(persona);
  if (estado === INACTIVO) return <Etiqueta tono="neutro">Inactivo</Etiqueta>;
  const tono = estado === 'activo' ? 'bueno' : estado === 'retirado' ? 'neutro' : 'atencion';
  return <Etiqueta tono={tono}>{nombreDeEstadoLaboral(estado) ?? estado}</Etiqueta>;
}

export default function PantallaPersonal() {
  const lugar = useLugarDelPanel();
  const pedido: LugarDelPersonal | null =
    lugar?.tipo === 'empresa'
      ? { empresa: lugar.empresa }
      : lugar?.tipo === 'obra'
        ? { obraId: lugar.obraId }
        : null;
  const clave = pedido ? ('empresa' in pedido ? pedido.empresa : pedido.obraId) : null;
  const enElemental = pedido !== null && 'empresa' in pedido && pedido.empresa === 'elemental';
  const enObra = pedido !== null && 'obraId' in pedido;

  // Un objeto y no una lista, como en Documentos. Se recarga cuando cambia el lugar.
  const cargados = useListado<PersonalDelLugar>(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useCallback(() => (pedido ? api.rrhh.personal(pedido).then((d) => [d]) : Promise.resolve([])), [clave]),
  );
  const { personas, resumen } = cargados.datos[0] ?? SIN_PERSONAL;
  const [abierta, setAbierta] = useParametroDeDireccion('persona', '');
  // El servidor manda el salario solo a quien lo ve (RF-13): si llegó, se muestra.
  const conSalario = personas.some((p) => 'salario' in p);

  const [empresa, setEmpresa] = useState<string | null>(null);
  const [obra, setObra] = useState<string | null>(null);
  const [cargo, setCargo] = useState<string | null>(null);
  const [estado, setEstado] = useState<string | null>(null);
  const [soloConAvisos, setSoloConAvisos] = useState(false);
  const [verRetiradas, setVerRetiradas] = useState(false);

  // Las obras que salen en el filtro son las del personal que llegó: no hace falta pedir
  // la lista de obras, que no todos los que consultan pueden ver.
  const obras = [
    ...new Map(personas.filter((p) => p.obraId).map((p) => [p.obraId as string, p.obraNombre ?? ''])).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const cargos = CARGOS.filter((c) => personas.some((p) => p.cargo === c.id));

  const pasaFiltros = useCallback(
    (p: PersonaDelPersonal) => {
      const suEstado = estadoVisible(p);
      // Pedir el estado «Retirado» las muestra aunque la casilla esté sin marcar.
      if (suEstado === 'retirado' && !verRetiradas && estado !== 'retirado') return false;
      return (
        (empresa === null || p.empresa === empresa) &&
        (obra === null || p.obraId === obra) &&
        (cargo === null || p.cargo === cargo) &&
        (estado === null || suEstado === estado) &&
        (!soloConAvisos || p.avisos.length > 0)
      );
    },
    [empresa, obra, cargo, estado, soloConAvisos, verRetiradas],
  );
  const listado = useListadoFiltrado(personas, (p) => [p.nombreCompleto, p.documento, p.usuario], pasaFiltros);
  const retiradas = personas.filter((p) => p.estado === 'retirado').length;

  const columnas: Columna<PersonaDelPersonal>[] = [
    {
      clave: 'nombre',
      titulo: 'Persona',
      ancho: 240,
      ordenar: (p) => p.nombreCompleto,
      pintar: (p) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.nombre}>{p.nombreCompleto}</Text>
          <Text style={estilos.apoyo}>{[p.documento, p.usuario].filter(Boolean).join(' · ')}</Text>
        </View>
      ),
    },
    { clave: 'cargo', titulo: 'Cargo', ancho: 160, ordenar: (p) => nombreDeCargo(p.cargo), pintar: (p) => <Celda>{p.cargo ? nombreDeCargo(p.cargo) : '—'}</Celda> },
    ...(enElemental
      ? [
          {
            clave: 'empresa',
            titulo: 'Empresa',
            ancho: 110,
            ordenar: (p: PersonaDelPersonal) => nombreDeEmpresa(p.empresa),
            pintar: (p: PersonaDelPersonal) => <Celda>{nombreDeEmpresa(p.empresa)}</Celda>,
          },
        ]
      : []),
    ...(enObra
      ? []
      : [
          {
            clave: 'obra',
            titulo: 'Obra',
            ancho: 170,
            ordenar: (p: PersonaDelPersonal) => p.obraNombre,
            pintar: (p: PersonaDelPersonal) => <Celda>{p.obraNombre ?? '—'}</Celda>,
          },
        ]),
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 130,
      ordenar: (p) => estadoVisible(p),
      pintar: (p) => <EstadoDeLaPersona persona={p} />,
    },
    {
      clave: 'contrato',
      titulo: 'Contrato',
      ancho: 170,
      ordenar: (p) => p.finContrato ?? p.tipoContrato,
      pintar: (p) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.texto}>{nombreDeTipoDeContrato(p.tipoContrato) ?? '—'}</Text>
          {p.fechaIngreso ? <Text style={estilos.apoyo}>{`Desde ${fechaDelCorte(p.fechaIngreso)}`}</Text> : null}
          {p.finContrato ? <Text style={estilos.apoyo}>{`Hasta ${fechaDelCorte(p.finContrato)}`}</Text> : null}
        </View>
      ),
    },
    ...(conSalario
      ? [
          {
            clave: 'salario',
            titulo: 'Salario',
            ancho: 130,
            // Texto con ceros a la izquierda: así ordena como número.
            ordenar: (p: PersonaDelPersonal) => (p.salario ? String(p.salario).padStart(15, '0') : null),
            pintar: (p: PersonaDelPersonal) => <Celda>{p.salario ? enPesos(p.salario) : '—'}</Celda>,
          },
        ]
      : []),
    {
      clave: 'avisos',
      titulo: 'Avisos',
      ancho: 260,
      // Primero las que más avisos tienen: es lo que hay que atender.
      ordenar: (p) => String(p.avisos.length).padStart(2, '0'),
      pintar: (p) =>
        p.avisos.length ? (
          <View style={estilos.celdaDoble}>
            <View style={estilos.marcas}>
              {p.avisos.map((a) => (
                <Etiqueta key={a.tipo} tono={a.tono}>
                  {a.texto}
                </Etiqueta>
              ))}
            </View>
            <Text style={estilos.apoyo}>{p.avisos.map((a) => a.detalle).join(' ')}</Text>
          </View>
        ) : (
          <Celda>—</Celda>
        ),
    },
    {
      clave: 'ficha',
      titulo: '',
      ancho: 110,
      anchoMinimo: 110,
      pintar: (p) => <Boton titulo="Ficha" tono="secundario" onPress={() => setAbierta(p.id)} />,
    },
  ];

  const nombreDelLugar =
    lugar?.tipo === 'empresa' ? nombreDeEmpresa(lugar.empresa) : lugar?.tipo === 'obra' ? 'la obra' : '';
  const descripcion = enElemental
    ? 'El personal de todo el grupo, con su ficha, sus documentos y lo que hay que atender: documentos vencidos o por vencer, contratos por terminar y fichas incompletas.'
    : `El personal de ${nombreDelLugar}, de consulta: su ficha, sus documentos y lo que está por vencer. Lo llevan la gerencia y Recursos Humanos de Elemental.`;

  if (abierta) {
    return (
      <VistaDeLaFicha
        id={abierta}
        alVolver={() => {
          setAbierta('');
          // Lo que se guardó en la ficha cambia sus avisos.
          cargados.recargar();
        }}
      />
    );
  }

  return (
    <MarcoPantalla titulo="Personal" descripcion={descripcion} error={cargados.error} cargando={cargados.cargando}>
      {/* RF-27: cuántas personas activas tienen cada aviso, arriba de todo. */}
      <Cifras>
        <Cifra
          titulo="Con documentos vencidos"
          valor={String(resumen.conDocumentosVencidos)}
          tono={resumen.conDocumentosVencidos > 0 ? 'malo' : 'neutro'}
        />
        <Cifra
          titulo="Con documentos por vencer"
          valor={String(resumen.conDocumentosPorVencer)}
          pie="En los próximos 30 días"
          tono={resumen.conDocumentosPorVencer > 0 ? 'atencion' : 'neutro'}
        />
        <Cifra
          titulo="Contratos por terminar"
          valor={String(resumen.contratosPorTerminar)}
          pie={
            resumen.contratosTerminados
              ? `En 30 días, y ${resumen.contratosTerminados} ya terminados`
              : 'En los próximos 30 días'
          }
          tono={resumen.contratosTerminados > 0 ? 'malo' : resumen.contratosPorTerminar > 0 ? 'atencion' : 'neutro'}
        />
        <Cifra
          titulo="Fichas incompletas"
          valor={String(resumen.fichasIncompletas)}
          pie="Sin ingreso, contrato, EPS o ARL"
          tono={resumen.fichasIncompletas > 0 ? 'atencion' : 'neutro'}
        />
      </Cifras>

      <Seccion titulo="Personas">
        <BarraDeListado
          busqueda={listado.busqueda}
          onBuscar={listado.buscar}
          // Las retiradas ocultas no cuentan: «1 de 2» sin haber buscado nada confunde.
          total={verRetiradas || estado === 'retirado' ? listado.total : listado.total - retiradas}
          mostradas={listado.coincidencias}
        >
          {enElemental ? (
            <Selector
              etiqueta="Empresa"
              valor={empresa}
              opciones={EMPRESAS.map((e) => ({ valor: e.id, etiqueta: e.nombre }))}
              onChange={setEmpresa}
              permiteVacio
              vacio="Todas las empresas"
              ancho={180}
            />
          ) : null}
          {enObra ? null : (
            <Selector
              etiqueta="Obra"
              valor={obra}
              opciones={obras.map(([id, nombre]) => ({ valor: id, etiqueta: nombre }))}
              onChange={setObra}
              permiteVacio
              vacio="Todas las obras"
              ancho={200}
            />
          )}
          <Selector
            etiqueta="Cargo"
            valor={cargo}
            opciones={cargos.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
            onChange={setCargo}
            permiteVacio
            vacio="Todos los cargos"
            ancho={200}
          />
          <Selector
            etiqueta="Estado"
            valor={estado}
            opciones={[
              ...ESTADOS_LABORALES.map((e) => ({ valor: e.id, etiqueta: e.nombre })),
              { valor: INACTIVO, etiqueta: 'Inactivo (sin acceso)' },
            ]}
            onChange={setEstado}
            permiteVacio
            vacio="Todos los estados"
            ancho={180}
          />
        </BarraDeListado>
        <Acciones>
          <Casilla etiqueta="Solo con avisos" marcada={soloConAvisos} onChange={setSoloConAvisos} />
          <Casilla etiqueta="Ver retiradas" marcada={verRetiradas} onChange={setVerRetiradas} />
        </Acciones>
        <Tabla
          columnas={columnas}
          filas={listado.pagina}
          vacio={
            personas.length === 0 ? 'Todavía no hay personas aquí.' : 'Ninguna persona coincide con la búsqueda o los filtros.'
          }
        />
        <Paginacion
          pagina={listado.paginaActual}
          porPagina={POR_PAGINA}
          total={listado.coincidencias}
          onCambiar={listado.irAPagina}
        />
      </Seccion>
    </MarcoPantalla>
  );
}

const estilos = StyleSheet.create({
  celdaDoble: { gap: Spacing.half, alignItems: 'flex-start' },
  marcas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.half },
  nombre: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, fontWeight: '600', color: Panel.texto },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
