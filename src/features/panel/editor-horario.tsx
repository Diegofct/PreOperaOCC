/**
 * El horario de una obra: lunes a viernes y sábado, con uno o dos tramos cada uno
 * (spec 016).
 *
 * Lo usan el alta de la obra y su ventana de corrección, y por eso vive aparte y
 * no dentro de ninguna de las dos: escrito dos veces, un día una avisaría de las
 * 42 horas y la otra no.
 *
 * ── Por qué el segundo tramo se añade y se quita ──
 *
 * El caso común son dos tramos con el almuerzo en medio, y así se propone. Pero
 * hay obras que trabajan de corrido (6:00 a 14:00) y sábados de media jornada: un
 * segundo tramo fijo obligaría a inventar un descanso que no existe, y el
 * descanso descuenta horas trabajadas (RF-8).
 *
 * ── Avisar no es impedir ──
 *
 * Un horario que pasa de las 42 horas semanales se guarda igual (RF-37). El aviso
 * dice cuántas suma, con símbolo y texto (RF-38), y quien decide si se corrige es
 * la gerencia. Lo que sí impide guardar es un horario sin sentido —un tramo que
 * termina antes de empezar, dos que se pisan—, y eso lo dice la misma regla que
 * aplica el servidor (`validarHorarioDeObra`).
 */
import { useRef, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, TextoPanel } from '@/constants/theme';
import {
  HORARIO_PROPUESTO,
  horasLegibles,
  MAXIMO_MINUTOS_SEMANALES,
  mensajeDeHorarioDeObra,
  minutosSemanales,
  validarHorarioDeObra,
  type DiaDelHorario,
  type HorarioDeObra,
  type Tramo,
} from '@/shared/rules/horas';

import { Aviso, Boton, Casilla, SelectorDeHora } from './componentes';

/** El segundo tramo que se propone al añadirlo: la tarde del horario propuesto. */
const SEGUNDO_TRAMO: Tramo = HORARIO_PROPUESTO.semana[1];

/** ¿El horario se puede guardar? Para deshabilitar el botón de quien lo usa. */
export function horarioValido(horario: HorarioDeObra): boolean {
  return validarHorarioDeObra(horario) === null;
}

export function EditorDeHorario({
  valor,
  onChange,
}: {
  valor: HorarioDeObra;
  onChange: (horario: HorarioDeObra) => void;
}) {
  // Lo último que tuvo el sábado antes de marcar «no se trabaja»: desmarcarlo por
  // error no debería obligar a volver a elegir cuatro horas.
  const sabadoAnterior = useRef<Tramo[]>(
    valor.sabado.length > 0 ? valor.sabado : HORARIO_PROPUESTO.sabado,
  );

  const error = validarHorarioDeObra(valor);
  const semanales = minutosSemanales(valor);
  const sinSabado = valor.sabado.length === 0;

  function cambiarDia(dia: DiaDelHorario, tramos: Tramo[]) {
    onChange({ ...valor, [dia]: tramos });
  }

  function marcarSinSabado(marcada: boolean) {
    if (marcada) {
      sabadoAnterior.current = valor.sabado;
      cambiarDia('sabado', []);
    } else {
      cambiarDia('sabado', sabadoAnterior.current);
    }
  }

  return (
    <View style={estilos.editor}>
      <Text style={estilos.titulo}>Horario de la obra</Text>

      <Dia
        nombre="Lunes a viernes"
        tramos={valor.semana}
        onChange={(tramos) => cambiarDia('semana', tramos)}
      />

      <Dia
        nombre="Sábado"
        tramos={sinSabado ? null : valor.sabado}
        onChange={(tramos) => cambiarDia('sabado', tramos)}
        alFinal={
          <View style={estilos.accionTramo}>
            <Casilla
              etiqueta="Los sábados no se trabaja"
              marcada={sinSabado}
              onChange={marcarSinSabado}
            />
          </View>
        }
      />

      {error ? <Aviso tono="error">{mensajeDeHorarioDeObra(error)}</Aviso> : null}

      <Text style={estilos.total}>{horasLegibles(semanales)} a la semana.</Text>
      {semanales > MAXIMO_MINUTOS_SEMANALES ? (
        <Aviso tono="info">
          {`Este horario suma ${horasLegibles(semanales)} a la semana, más que el máximo legal de ` +
            `${MAXIMO_MINUTOS_SEMANALES / 60} horas. Se puede guardar igual; lo que pase de 42 h ` +
            'es trabajo suplementario ante la ley.'}
        </Aviso>
      ) : null}
    </View>
  );
}

/** Los tramos de un día: el primero siempre, el segundo se añade o se quita. */
function Dia({
  nombre,
  tramos,
  onChange,
  alFinal,
}: {
  nombre: string;
  /** `null`: ese día no se trabaja, y solo se pinta lo de `alFinal`. */
  tramos: Tramo[] | null;
  onChange: (tramos: Tramo[]) => void;
  alFinal?: ReactNode;
}) {
  if (tramos === null) {
    return (
      <View style={estilos.dia}>
        <Text style={estilos.nombreDia}>{nombre}</Text>
        {alFinal}
      </View>
    );
  }
  const lista = tramos.length > 0 ? tramos : [{ desde: '', hasta: '' }];

  function cambiar(indice: number, campo: keyof Tramo, hora: string) {
    onChange(lista.map((t, i) => (i === indice ? { ...t, [campo]: hora } : t)));
  }

  return (
    <View style={estilos.dia}>
      <Text style={estilos.nombreDia}>{nombre}</Text>
      {lista.map((tramo, indice) => (
        <View key={indice} style={estilos.tramo}>
          <SelectorDeHora
            etiqueta={indice === 0 ? 'Entra' : 'Vuelve'}
            valor={tramo.desde}
            onChange={(hora) => cambiar(indice, 'desde', hora)}
          />
          <SelectorDeHora
            etiqueta="Sale"
            valor={tramo.hasta}
            onChange={(hora) => cambiar(indice, 'hasta', hora)}
          />
        </View>
      ))}
      <View style={estilos.accionTramo}>
        {lista.length === 1 ? (
          <Boton
            titulo="Añadir descanso y segundo tramo"
            tono="secundario"
            onPress={() => onChange([...lista, SEGUNDO_TRAMO])}
          />
        ) : (
          <Boton
            titulo="Quitar segundo tramo"
            tono="secundario"
            onPress={() => onChange(lista.slice(0, 1))}
          />
        )}
      </View>
      {alFinal}
    </View>
  );
}

/** Ancho de la columna del nombre del día: «Lunes a viernes» en una línea. */
const ANCHO_NOMBRE_DIA = 130;

const estilos = StyleSheet.create({
  editor: { width: '100%', gap: Spacing.three },
  titulo: {
    fontSize: TextoPanel.cuerpo,
    fontWeight: '800',
    color: Colors.light.text,
  },
  dia: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  nombreDia: {
    width: ANCHO_NOMBRE_DIA,
    marginTop: Spacing.four + Spacing.one,
    fontSize: TextoPanel.cuerpo,
    fontWeight: '700',
    color: Colors.light.text,
  },
  tramo: { flexDirection: 'row', gap: Spacing.two },
  accionTramo: { marginTop: Spacing.four },
  total: { fontSize: TextoPanel.cuerpo, fontWeight: '600', color: Colors.light.textSecondary },
});
