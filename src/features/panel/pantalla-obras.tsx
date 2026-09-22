/**
 * Registro de obras.
 *
 * Es la primera pantalla del panel y no por orden alfabético: la obra es la raíz
 * de todo lo demás. Las personas pertenecen a una, los vehículos están en una, y
 * el pull decide qué máquinas bajarle a un operador mirando la suya. Sin al
 * menos una obra registrada, las otras tres pantallas no tienen dónde colgar
 * nada.
 */
import { useCallback, useState } from 'react';

import { HORARIO_PROPUESTO, type HorarioDeObra } from '@/shared/rules/horas';

import { api } from './cliente-api';
import {
  Acciones,
  AccionesFormulario,
  Boton,
  Campo,
  Celda,
  Confirmacion,
  Confirmado,
  Etiqueta,
  Formulario,
  Seccion,
  Tabla,
  type Columna,
} from './componentes';
import { EditorDeHorario, horarioValido } from './editor-horario';
import { MarcoPantalla, useListado } from './marco';
import { ModulosDeLaObra } from './modulos-de-obra';
import { VentanaCorregirObra } from './ventana-obra';
import type { ObraFila } from './contratos';

export default function PantallaObras() {
  const listado = useListado<ObraFila>(useCallback(() => api.obras.listar(), []));

  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [municipio, setMunicipio] = useState('');
  // Arranca con el propuesto (spec 016, RF-3): la gerencia lo ajusta, no lo escribe
  // desde cero.
  const [horario, setHorario] = useState<HorarioDeObra>(HORARIO_PROPUESTO);
  // Los dos módulos, como las obras que ya existían (spec 017, RF-2, RF-3).
  const [almacenActivo, setAlmacenActivo] = useState(true);
  const [canteraActivo, setCanteraActivo] = useState(true);

  const [editando, setEditando] = useState<ObraFila | null>(null);
  const [porDarDeBaja, setPorDarDeBaja] = useState<ObraFila | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  async function crear() {
    const creada = await listado.ejecutar(() =>
      api.obras.crear({
        codigo,
        nombre,
        municipio,
        activa: true,
        horario,
        almacenActivo,
        canteraActivo,
      }),
    );
    if (creada) {
      setHecho(nombre + ' quedó registrada.');
      setCodigo('');
      setNombre('');
      setMunicipio('');
      setHorario(HORARIO_PROPUESTO);
      setAlmacenActivo(true);
      setCanteraActivo(true);
    }
  }

  const columnas: Columna<ObraFila>[] = [
    { clave: 'codigo', titulo: 'Código', ancho: 120, pintar: (o) => <Celda>{o.codigo}</Celda> },
    { clave: 'nombre', titulo: 'Nombre', ancho: 320, pintar: (o) => <Celda>{o.nombre}</Celda> },
    {
      clave: 'municipio',
      titulo: 'Municipio',
      ancho: 200,
      pintar: (o) => <Celda>{o.municipio ?? '—'}</Celda>,
    },
    {
      clave: 'activa',
      titulo: 'Estado',
      ancho: 120,
      pintar: (o) => (
        <Etiqueta tono={o.activa ? 'bueno' : 'neutro'}>{o.activa ? 'Activa' : 'Inactiva'}</Etiqueta>
      ),
    },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 230,
      pintar: (o) => (
        <Acciones>
          <Boton titulo="Corregir" tono="secundario" onPress={() => setEditando(o)} />
          <Boton
            titulo="Dar de baja"
            tono="peligro"
            onPress={() => {
              setHecho(null);
              setPorDarDeBaja(o);
            }}
          />
        </Acciones>
      ),
    },
  ];

  return (
    <MarcoPantalla
      modulo="obras"
      titulo="Obras"
      descripcion="Los frentes de trabajo de OCC. Cada persona y cada máquina pertenece a uno."
      error={listado.error}
      cargando={listado.cargando}
    >
      <Seccion titulo="Registrar una obra">
        <Formulario>
          <Campo
            etiqueta="Código"
            obligatorio
            valor={codigo}
            onChange={setCodigo}
            ayuda="Ej. OBR-001"
            error={listado.errorDe('codigo')}
            ancho={160}
          />
          <Campo
            etiqueta="Nombre"
            obligatorio
            valor={nombre}
            onChange={setNombre}
            error={listado.errorDe('nombre')}
            ancho={320}
          />
          <Campo etiqueta="Municipio" valor={municipio} onChange={setMunicipio} ancho={220} />
          <EditorDeHorario valor={horario} onChange={setHorario} />
          <ModulosDeLaObra
            almacen={almacenActivo}
            cantera={canteraActivo}
            onCambiar={(cuales) => {
              setAlmacenActivo(cuales.almacen);
              setCanteraActivo(cuales.cantera);
            }}
          />
          <AccionesFormulario>
            <Boton
              titulo="Registrar obra"
              onPress={crear}
              deshabilitado={!codigo || !nombre || !horarioValido(horario)}
            />
          </AccionesFormulario>
        </Formulario>
      </Seccion>

      <Confirmado mensaje={hecho} />

      {porDarDeBaja ? (
        <Confirmacion
          aviso={porDarDeBaja.nombre + ' deja de aparecer y de poder recibir registros nuevos. No se borra: los preoperacionales, las bitácoras y los partes de esa obra siguen colgando de ella.'}
          confirmar="Dar de baja"
          onConfirmar={async () => {
            const obra = porDarDeBaja;
            setPorDarDeBaja(null);
            const listo = await listado.ejecutar(() => api.obras.darDeBaja(obra.id));
            if (listo) setHecho(obra.nombre + ' quedó dada de baja.');
          }}
          onCancelar={() => setPorDarDeBaja(null)}
        />
      ) : null}

      {editando ? (
        <VentanaCorregirObra
          obra={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={(nombreObra) => {
            setEditando(null);
            setHecho(nombreObra + ' quedó corregida.');
            listado.recargar();
          }}
          onFallo={listado.setError}
        />
      ) : null}

      <Seccion titulo={`Obras registradas (${listado.datos.length})`}>
        <Tabla
          columnas={columnas}
          filas={listado.datos}
          vacio="Aquí van los frentes de trabajo de OCC. La obra es la raíz de todo lo demás: las personas pertenecen a una, los vehículos están en una, y sin al menos una registrada las otras pantallas no tienen dónde colgar nada. Registre la primera en el formulario de arriba."
        />
      </Seccion>
    </MarcoPantalla>
  );
}
