/**
 * Corregir una obra sin darla de baja.
 *
 * **El código no se corrige aquí.** Es la llave con la que se reconoce la obra
 * en los partes y en los listados, y hay un índice único sobre él: cambiarlo con
 * preoperacionales y bitácoras ya colgando de esa obra es reescribir a qué se
 * refería lo que ya se firmó. Si el código está mal desde el principio, la
 * salida es dar de baja y registrar otra, que es lo que preserva el histórico.
 *
 * Se manda solo lo que cambió, igual que en las otras dos ventanas.
 *
 * **El horario también** (spec 016, RF-4). Mandarlo siempre haría que corregir
 * solo el nombre reescribiera el horario con la copia que la ventana leyó al
 * abrirse, y si otra pestaña lo cambió entretanto, lo pisaría sin avisar. Se
 * compara tramo por tramo y no con `JSON.stringify`: Postgres devuelve el `jsonb`
 * con las llaves en su propio orden, y dos horarios iguales parecerían distintos.
 */
import { useCallback, useState } from 'react';

import type { HorarioDeObra, Tramo } from '@/shared/rules/horas';

import { api, mensajeDe } from './cliente-api';
import {
  Acciones,
  AccionesFormulario,
  Aviso,
  Boton,
  Campo,
  Formulario,
  Modal,
  Selector,
} from './componentes';
import type { ObraFila, ObraNueva, PersonaFila } from './contratos';
import { EditorDeHorario, horarioValido } from './editor-horario';
import { useListado } from './marco';
import { ModulosDeLaObra, personasSinModulo } from './modulos-de-obra';

function mismosTramos(a: Tramo[], b: Tramo[]): boolean {
  return a.length === b.length && a.every((t, i) => t.desde === b[i].desde && t.hasta === b[i].hasta);
}

function mismoHorario(a: HorarioDeObra, b: HorarioDeObra): boolean {
  return mismosTramos(a.semana, b.semana) && mismosTramos(a.sabado, b.sabado);
}

export function VentanaCorregirObra({
  obra,
  onCerrar,
  onGuardado,
  onFallo,
}: {
  obra: ObraFila;
  onCerrar: () => void;
  onGuardado: (nombre: string) => void;
  onFallo: (mensaje: string) => void;
}) {
  const [nombre, setNombre] = useState(obra.nombre);
  const [municipio, setMunicipio] = useState(obra.municipio ?? '');
  const [activa, setActiva] = useState(obra.activa);
  const [horario, setHorario] = useState<HorarioDeObra>(obra.horario);
  const [modulos, setModulos] = useState({
    almacen: obra.almacenActivo,
    cantera: obra.canteraActivo,
  });
  const [guardando, setGuardando] = useState(false);

  // Para decir a quién deja sin módulo antes de guardar (spec 017, RF-6). Si el
  // listado fallara, el aviso se omite: lo que decide es el servidor.
  const personas = useListado<PersonaFila>(useCallback(() => api.personas.listar(), []));

  const faltaNombre = nombre.trim().length === 0;

  async function guardar() {
    if (faltaNombre || !horarioValido(horario)) return;
    setGuardando(true);
    try {
      const cambios: Partial<ObraNueva> = {};
      if (nombre !== obra.nombre) cambios.nombre = nombre;
      if (municipio !== (obra.municipio ?? '')) cambios.municipio = municipio;
      if (activa !== obra.activa) cambios.activa = activa;
      if (modulos.almacen !== obra.almacenActivo) cambios.almacenActivo = modulos.almacen;
      if (modulos.cantera !== obra.canteraActivo) cambios.canteraActivo = modulos.cantera;
      if (!mismoHorario(horario, obra.horario)) cambios.horario = horario;

      if (Object.keys(cambios).length === 0) {
        onCerrar();
        return;
      }

      await api.obras.editar(obra.id, cambios);
      onGuardado(nombre);
    } catch (fallo) {
      onFallo(mensajeDe(fallo));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={`Corregir ${obra.codigo}`} onCerrar={onCerrar}>
      <Aviso tono="info">
        El código de la obra no se corrige: es con lo que se la reconoce en los preoperacionales
        y las bitácoras que ya cuelgan de ella.
      </Aviso>
      <Formulario>
        <Campo
          etiqueta="Nombre"
          obligatorio
          valor={nombre}
          onChange={setNombre}
          error={faltaNombre ? 'El nombre no puede quedar vacío.' : undefined}
          ancho={300}
        />
        <Campo etiqueta="Municipio" valor={municipio} onChange={setMunicipio} ancho={220} />
        <Selector
          etiqueta="Estado"
          valor={activa ? 'activa' : 'inactiva'}
          opciones={[
            { valor: 'activa', etiqueta: 'Activa' },
            { valor: 'inactiva', etiqueta: 'Inactiva', detalle: 'Deja de recibir registros' },
          ]}
          onChange={(v) => setActiva(v !== 'inactiva')}
          ancho={220}
        />
        <EditorDeHorario valor={horario} onChange={setHorario} />
        <ModulosDeLaObra
          almacen={modulos.almacen}
          cantera={modulos.cantera}
          onCambiar={setModulos}
          sinModulo={personasSinModulo(personas.datos, obra.id, modulos)}
        />
        <AccionesFormulario>
          <Acciones>
            <Boton
              titulo={guardando ? 'Guardando…' : 'Guardar cambios'}
              onPress={guardar}
              deshabilitado={guardando || faltaNombre || !horarioValido(horario)}
            />
            <Boton titulo="Cancelar" tono="secundario" onPress={onCerrar} />
          </Acciones>
        </AccionesFormulario>
      </Formulario>
    </Modal>
  );
}
