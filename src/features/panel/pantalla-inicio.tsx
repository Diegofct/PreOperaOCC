/**
 * La portada del panel.
 *
 * Antes contaba filas: cuántas obras, cuántas personas, cuántos vehículos. La
 * gerencia entraba a saber cómo iba la operación y salía sabiendo cuántas obras
 * había registradas, que es un dato que ya sabía.
 *
 * ── Dos portadas, no una filtrada ──
 *
 * La gerencia entra a saber **cómo va la operación**; el residente, a saber
 * **qué le falta por hacer hoy**. Son dos preguntas distintas y por eso son dos
 * pantallas distintas: al residente, un tablero de rendimiento le esconde lo
 * único que tiene que mirar antes de que se acabe la jornada.
 *
 * ── Lo que no se mezcla ──
 *
 * Las horas de motor y los kilómetros van separados. Desde la spec 003 la
 * camioneta y la volqueta se miden en kilómetros y la maquinaria amarilla en
 * horas de motor; sumarlos daría un número que no significa nada.
 *
 * ── Lo que no se mide, y por qué ──
 *
 * Las horas improductivas no están. Estaban previstas hasta que la spec 004
 * cambió el modelo: en la bitácora por máquina las actividades colgaban de un
 * equipo, y en el parte de obra la maquinaria y las actividades son secciones
 * separadas. Sin un vínculo entre ellas, cualquier cifra de improductividad
 * sería inventada.
 */
import { Link } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { horasLegibles } from '@/shared/rules/horas';
import { alcanza } from '@/shared/rules/permisos';

import { api } from './cliente-api';
import {
  Acciones,
  Aviso,
  Boton,
  Celda,
  Cifra,
  Cifras,
  Medidor,
  Seccion,
  Tabla,
  type Columna,
} from './componentes';
import {
  ETIQUETA_PERIODO,
  type AsignacionFila,
  type PeriodoResumen,
  type ResumenFila,
} from './contratos';
import { MarcoPantalla, useListado } from './marco';
import { usePersona } from './sesion';

/** Una cifra del resumen, tal como se lee en la tabla equivalente. */
interface FilaResumen {
  id: string;
  concepto: string;
  valor: string;
}

export default function PantallaInicioPanel() {
  const persona = usePersona();
  const rol = persona?.rol ?? 'operador';
  const esGerencia = alcanza(rol, 'obras', 'escribir');

  const [periodo, setPeriodo] = useState<PeriodoResumen>('hoy');

  const resumen = useListado<ResumenFila>(
    useCallback(async () => [await api.resumen.de(periodo)], [periodo]),
  );

  // El residente necesita saber si alguien tomó una máquina sin asignación; la
  // gerencia lo ve en su módulo. Solo se pide donde se usa.
  const asignaciones = useListado<AsignacionFila>(
    useCallback(
      () => (esGerencia ? Promise.resolve([]) : api.asignaciones.listar()),
      [esGerencia],
    ),
  );

  const datos = resumen.datos[0];

  return (
    <MarcoPantalla
      modulo="inicio"
      titulo={esGerencia ? 'Cómo va la operación' : 'Su obra hoy'}
      descripcion={
        esGerencia
          ? 'Lo que están haciendo las obras: qué se inspeccionó, cuánto trabajaron las máquinas y la gente, y qué quedó sin cerrar.'
          : 'Lo que falta por hacer hoy en su obra. Lo de arriba es lo que no puede quedarse sin resolver antes de que termine la jornada.'
      }
      error={resumen.error ?? asignaciones.error}
      cargando={resumen.cargando}
    >
      {!datos ? null : esGerencia ? (
        <VistaGerencia datos={datos} periodo={periodo} onPeriodo={setPeriodo} />
      ) : (
        <VistaResidente
          datos={datos}
          sinConfirmar={
            asignaciones.datos.filter((a) => a.origen === 'autoasignada' && a.hasta === null)
              .length
          }
        />
      )}
    </MarcoPantalla>
  );
}

/* ------------------------------------------------------------------------ */
/* Gerencia                                                                  */
/* ------------------------------------------------------------------------ */

function VistaGerencia({
  datos,
  periodo,
  onPeriodo,
}: {
  datos: ResumenFila;
  periodo: PeriodoResumen;
  onPeriodo: (periodo: PeriodoResumen) => void;
}) {
  const vacio =
    datos.partes === 0 && datos.inspeccionadosHoy === 0 && datos.horasMaquina === 0;

  return (
    <>
      <Seccion titulo="Periodo">
        <Acciones>
          {(['hoy', 'semana', 'mes'] as const).map((p) => (
            <Boton
              key={p}
              titulo={ETIQUETA_PERIODO[p]}
              tono={p === periodo ? 'primario' : 'secundario'}
              onPress={() => onPeriodo(p)}
            />
          ))}
        </Acciones>
      </Seccion>

      {vacio ? (
        <Aviso tono="info">
          No hay nada registrado en este periodo. Puede ser que todavía no se haya trabajado, o
          que los partes y los preoperacionales del celular no hayan llegado: el teléfono sube
          cuando encuentra señal.
        </Aviso>
      ) : null}

      {datos.noAptos > 0 ? (
        <Aviso tono="error">
          {datos.noAptos === 1
            ? 'Hay 1 equipo que hoy quedó NO APTO. No debería estar trabajando.'
            : `Hay ${datos.noAptos} equipos que hoy quedaron NO APTOS. No deberían estar trabajando.`}
        </Aviso>
      ) : null}

      <Seccion titulo="Preoperacionales de hoy">
        <Cifras>
          <Medidor
            titulo="Cumplimiento"
            porcentaje={datos.cumplimiento}
            pie={
              datos.cumplimiento === null
                ? 'Todavía no hay equipos registrados.'
                : `${datos.inspeccionadosHoy} de ${datos.equipos} equipos inspeccionados`
            }
          />
          <Cifra
            titulo="Sin inspeccionar"
            valor={String(datos.sinInspeccionar)}
            pie={datos.sinInspeccionar === 0 ? 'Ninguno pendiente' : 'Si están trabajando, es sin revisar'}
            tono={datos.sinInspeccionar === 0 ? 'bueno' : 'malo'}
          />
          <Cifra
            titulo="Equipos NO APTOS"
            valor={String(datos.noAptos)}
            pie={datos.noAptos === 0 ? 'Ninguno' : 'Inmovilizados por el formato'}
            tono={datos.noAptos === 0 ? 'bueno' : 'malo'}
          />
        </Cifras>
      </Seccion>

      <Seccion titulo={`Trabajo registrado · ${ETIQUETA_PERIODO[periodo].toLowerCase()}`}>
        <Cifras>
          <Cifra
            titulo="Horas de máquina"
            valor={`${datos.horasMaquina} h`}
            pie="Maquinaria amarilla, por horómetro"
          />
          <Cifra
            titulo="Kilómetros"
            valor={`${datos.kilometros} km`}
            pie="Camionetas y volquetas, por odómetro"
          />
          <Cifra
            titulo="Horas de personal"
            valor={horasLegibles(datos.minutosPersonal)}
            pie={
              datos.minutosExtra === 0
                ? 'Sin horas extra'
                : `${horasLegibles(datos.minutosExtra)} extra`
            }
            tono={datos.minutosExtra === 0 ? 'neutro' : 'atencion'}
          />
          <Cifra
            titulo="Partes de obra"
            valor={`${datos.partesCerrados} de ${datos.partes}`}
            pie={
              datos.partes === datos.partesCerrados
                ? 'Todos cerrados'
                : 'Sin cerrar: reconstruirlos después es adivinar'
            }
            tono={datos.partes === datos.partesCerrados ? 'bueno' : 'atencion'}
          />
        </Cifras>
      </Seccion>

      <TablaEquivalente datos={datos} />
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* Residente                                                                 */
/* ------------------------------------------------------------------------ */

function VistaResidente({ datos, sinConfirmar }: { datos: ResumenFila; sinConfirmar: number }) {
  const todoEnOrden =
    datos.sinInspeccionar === 0 &&
    datos.noAptos === 0 &&
    sinConfirmar === 0 &&
    datos.partes === datos.partesCerrados;

  return (
    <>
      {todoEnOrden ? (
        <Aviso tono="exito">
          Hoy no queda nada pendiente en su obra: todos los equipos tienen su preoperacional y el
          parte del día está cerrado.
        </Aviso>
      ) : null}

      {datos.noAptos > 0 ? (
        <Aviso tono="error">
          {datos.noAptos === 1
            ? 'Un equipo quedó NO APTO hoy. No debe seguir trabajando hasta que se resuelva.'
            : `${datos.noAptos} equipos quedaron NO APTOS hoy. No deben seguir trabajando.`}
        </Aviso>
      ) : null}

      {datos.sinInspeccionar > 0 ? (
        <Aviso tono="error">
          {datos.sinInspeccionar === 1
            ? 'Queda 1 máquina sin preoperacional. Si está trabajando, se está usando sin inspeccionar.'
            : `Quedan ${datos.sinInspeccionar} máquinas sin preoperacional. Si están trabajando, se están usando sin inspeccionar.`}
        </Aviso>
      ) : null}

      {sinConfirmar > 0 ? (
        <Aviso tono="error">
          {sinConfirmar === 1
            ? 'Un operador tomó una máquina sin asignación previa. Confírmela en Asignaciones.'
            : `${sinConfirmar} operadores tomaron máquinas sin asignación previa. Confírmelas en Asignaciones.`}
        </Aviso>
      ) : null}

      <Seccion titulo="Lo de hoy">
        <Cifras>
          <Cifra
            titulo="Sin preoperacional"
            valor={String(datos.sinInspeccionar)}
            pie={datos.sinInspeccionar === 0 ? 'Ninguna pendiente' : 'Levántelos antes de que arranquen'}
            tono={datos.sinInspeccionar === 0 ? 'bueno' : 'malo'}
          />
          <Cifra
            titulo="Parte del día"
            valor={datos.partesCerrados > 0 ? 'Cerrado' : datos.partes > 0 ? 'Abierto' : 'Sin abrir'}
            pie={
              datos.partesCerrados > 0
                ? 'Nada más que hacer'
                : 'Ciérrelo antes de que termine la jornada'
            }
            tono={datos.partesCerrados > 0 ? 'bueno' : 'atencion'}
          />
          <Cifra
            titulo="Equipos de su obra"
            valor={String(datos.equipos)}
            pie={`${datos.inspeccionadosHoy} inspeccionados hoy`}
          />
        </Cifras>
      </Seccion>

      <Seccion titulo="Atajos">
        <Acciones>
          <Enlace ruta="/panel/bitacoras" titulo="Llenar el parte de hoy" />
          <Enlace ruta="/panel/preoperacionales" titulo="Ver los preoperacionales" />
          <Enlace ruta="/panel/asignaciones" titulo="Revisar asignaciones" />
        </Acciones>
      </Seccion>
    </>
  );
}

function Enlace({ ruta, titulo }: { ruta: '/panel/bitacoras' | '/panel/preoperacionales' | '/panel/asignaciones'; titulo: string }) {
  return (
    <Link href={ruta} asChild>
      <Pressable>
        <Boton titulo={titulo} tono="secundario" onPress={() => {}} />
      </Pressable>
    </Link>
  );
}

/* ------------------------------------------------------------------------ */
/* La misma información, en tabla                                            */
/* ------------------------------------------------------------------------ */

/**
 * Las mismas cifras escritas, además de dibujadas.
 *
 * No es redundancia: una barra se lee de un vistazo y una tabla se lee sin
 * depender de la vista ni del color, se copia y se compara con la del mes
 * pasado. Las dos formas del mismo dato tienen usos distintos.
 */
function TablaEquivalente({ datos }: { datos: ResumenFila }) {
  const filas: FilaResumen[] = [
    { id: 'obras', concepto: 'Obras que cubre este resumen', valor: String(datos.obras) },
    { id: 'equipos', concepto: 'Equipos activos', valor: String(datos.equipos) },
    {
      id: 'cumplimiento',
      concepto: 'Cumplimiento del preoperacional de hoy',
      valor: datos.cumplimiento === null ? 'No aplica' : `${datos.cumplimiento}%`,
    },
    { id: 'inspeccionados', concepto: 'Equipos inspeccionados hoy', valor: String(datos.inspeccionadosHoy) },
    { id: 'sin', concepto: 'Equipos sin preoperacional hoy', valor: String(datos.sinInspeccionar) },
    { id: 'noaptos', concepto: 'Equipos NO APTOS hoy', valor: String(datos.noAptos) },
    { id: 'horas', concepto: 'Horas de máquina del periodo', valor: `${datos.horasMaquina} h` },
    { id: 'km', concepto: 'Kilómetros del periodo', valor: `${datos.kilometros} km` },
    {
      id: 'personal',
      concepto: 'Horas de personal del periodo',
      valor: horasLegibles(datos.minutosPersonal),
    },
    {
      id: 'extra',
      concepto: 'De ellas, extra',
      valor: horasLegibles(datos.minutosExtra),
    },
    {
      id: 'partes',
      concepto: 'Partes de obra cerrados',
      valor: `${datos.partesCerrados} de ${datos.partes}`,
    },
  ];

  const columnas: Columna<FilaResumen>[] = [
    { clave: 'concepto', titulo: 'Concepto', ancho: 420, pintar: (f) => <Celda>{f.concepto}</Celda> },
    { clave: 'valor', titulo: 'Valor', ancho: 180, pintar: (f) => <Celda>{f.valor}</Celda> },
  ];

  return (
    <Seccion titulo="Las mismas cifras, en tabla">
      <View style={estilos.tabla}>
        <Tabla columnas={columnas} filas={filas} vacio="" />
      </View>
    </Seccion>
  );
}

const estilos = StyleSheet.create({
  tabla: { maxWidth: 700, gap: Spacing.two },
});
