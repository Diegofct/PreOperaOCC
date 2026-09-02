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
import { View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { api } from './cliente-api';
import { Boton, Campo, Celda, Etiqueta, Formulario, Seccion, Tabla, type Columna } from './componentes';
import { MarcoPantalla, useListado } from './marco';
import type { ObraFila } from './contratos';

export default function PantallaObras() {
  const listado = useListado<ObraFila>(useCallback(() => api.obras.listar(), []));

  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [municipio, setMunicipio] = useState('');

  async function crear() {
    const creada = await listado.ejecutar(() =>
      api.obras.crear({ codigo, nombre, municipio, activa: true }),
    );
    if (creada) {
      setCodigo('');
      setNombre('');
      setMunicipio('');
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
      ancho: 120,
      pintar: (o) => (
        <Boton
          titulo="Dar de baja"
          tono="peligro"
          onPress={() => listado.ejecutar(() => api.obras.darDeBaja(o.id))}
        />
      ),
    },
  ];

  return (
    <MarcoPantalla
      titulo="Obras"
      descripcion="Los frentes de trabajo de OCC. Cada persona y cada máquina pertenece a uno."
      error={listado.error}
      cargando={listado.cargando}
    >
      <Seccion titulo="Registrar una obra">
        <Formulario>
          <Campo etiqueta="Código" valor={codigo} onChange={setCodigo} ayuda="Ej. OBR-001" ancho={160} />
          <Campo etiqueta="Nombre" valor={nombre} onChange={setNombre} ancho={320} />
          <Campo etiqueta="Municipio" valor={municipio} onChange={setMunicipio} ancho={220} />
          <View style={{ paddingTop: Spacing.four }}>
            <Boton titulo="Registrar obra" onPress={crear} deshabilitado={!codigo || !nombre} />
          </View>
        </Formulario>
      </Seccion>

      <Seccion titulo={`Obras registradas (${listado.datos.length})`}>
        <Tabla
          columnas={columnas}
          filas={listado.datos}
          vacio="Todavía no hay ninguna obra. Registra la primera arriba."
        />
      </Seccion>
    </MarcoPantalla>
  );
}
