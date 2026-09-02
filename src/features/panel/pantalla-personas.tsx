/**
 * Registro de personas: operadores y personal administrativo.
 *
 * Las dos superficies se reparten aquí, y la diferencia importa:
 *
 *  · El **operador** entra al celular con un PIN que elige él mismo en su propio
 *    equipo y que nunca sale de ahí. Desde esta pantalla no se le puede dar
 *    ninguna clave, y por eso no le sale el botón.
 *  · El **residente, el director y la gerencia** entran al panel con contraseña.
 *    Gerencia les genera una temporal desde aquí, se la entrega, y ellos la
 *    cambian al entrar. Así nadie acaba conociendo la contraseña definitiva de
 *    otro.
 *
 * El cargo real se mapea sobre tres roles y no se amplía: residente y director
 * de obra son `supervisor`, gerencia es `admin`.
 */
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { api } from './cliente-api';
import {
  Aviso,
  Boton,
  Campo,
  Celda,
  Etiqueta,
  Formulario,
  Seccion,
  Selector,
  Tabla,
  type Columna,
} from './componentes';
import {
  ETIQUETA_ROL,
  ROLES,
  type ClaveTemporalFila,
  type ObraFila,
  type PersonaFila,
  type Rol,
} from './contratos';
import { MarcoPantalla, mensajeDe, useListado } from './marco';
import { useSesionPanel } from './sesion';

export default function PantallaPersonas() {
  const { persona: yo } = useSesionPanel();
  const esGerencia = yo?.rol === 'admin';

  const personas = useListado<PersonaFila>(useCallback(() => api.personas.listar(), []));
  const obras = useListado<ObraFila>(useCallback(() => api.obras.listar(), []));

  /**
   * La contraseña recién generada. Vive **solo en memoria y solo un rato**: no
   * se guarda en claro en la base ni hay endpoint que la devuelva otra vez. Si
   * se cierra la página antes de anotarla, se genera otra.
   */
  const [temporal, setTemporal] = useState<ClaveTemporalFila | null>(null);

  async function generarClave(id: string) {
    try {
      setTemporal(await api.personas.generarClave(id));
      personas.setError(null);
    } catch (fallo) {
      setTemporal(null);
      personas.setError(mensajeDe(fallo));
    }
  }

  const [usuario, setUsuario] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [documento, setDocumento] = useState('');
  const [rol, setRol] = useState<Rol>('operador');
  const [obraId, setObraId] = useState<string | null>(null);

  async function crear() {
    const creada = await personas.ejecutar(() =>
      api.personas.crear({ usuario, nombreCompleto, documento, rol, obraId, activo: true }),
    );
    if (creada) {
      setUsuario('');
      setNombreCompleto('');
      setDocumento('');
      setObraId(null);
    }
  }

  const columnas: Columna<PersonaFila>[] = [
    { clave: 'usuario', titulo: 'Usuario', ancho: 160, pintar: (p) => <Celda>{p.usuario}</Celda> },
    {
      clave: 'nombre',
      titulo: 'Nombre completo',
      ancho: 260,
      pintar: (p) => <Celda>{p.nombreCompleto}</Celda>,
    },
    {
      clave: 'documento',
      titulo: 'Documento',
      ancho: 140,
      pintar: (p) => <Celda>{p.documento ?? '—'}</Celda>,
    },
    {
      clave: 'rol',
      titulo: 'Cargo',
      ancho: 200,
      pintar: (p) => (
        <Etiqueta tono={p.rol === 'operador' ? 'neutro' : 'bueno'}>{ETIQUETA_ROL[p.rol]}</Etiqueta>
      ),
    },
    {
      clave: 'obra',
      titulo: 'Obra',
      ancho: 220,
      pintar: (p) => <Celda>{p.obraNombre ?? '—'}</Celda>,
    },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 260,
      pintar: (p) => (
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          {/* Repartir accesos al panel es de gerencia, y un operador no entra a
              la web: su acceso es el celular con su PIN. */}
          {esGerencia && p.rol !== 'operador' ? (
            <Boton titulo="Dar acceso" tono="secundario" onPress={() => generarClave(p.id)} />
          ) : null}
          <Boton
            titulo="Dar de baja"
            tono="peligro"
            onPress={() => personas.ejecutar(() => api.personas.darDeBaja(p.id))}
          />
        </View>
      ),
    },
  ];

  return (
    <MarcoPantalla
      titulo="Personas"
      descripcion="Quién trabaja en OCC y con qué cargo. Al personal administrativo se le da acceso al panel desde aquí; el operador elige su PIN en el celular."
      error={personas.error ?? obras.error}
      cargando={personas.cargando || obras.cargando}
    >
      {temporal ? (
        <Aviso tono="exito">
          {`Contraseña temporal de ${temporal.nombreCompleto} (usuario "${temporal.usuario}"): `}
          {temporal.claveTemporal}
          {'. Anótela y entréguesela ahora: no se vuelve a mostrar y no se guarda en ninguna parte. '}
          {'Al entrar, esa persona tendrá que cambiarla por una suya.'}
        </Aviso>
      ) : null}

      <Seccion titulo="Registrar una persona">
        <Formulario>
          <Campo
            etiqueta="Usuario"
            valor={usuario}
            onChange={setUsuario}
            ayuda="Con esto ingresa. Sin espacios."
            ancho={180}
          />
          <Campo
            etiqueta="Nombre completo"
            valor={nombreCompleto}
            onChange={setNombreCompleto}
            ancho={260}
          />
          <Campo etiqueta="Documento" valor={documento} onChange={setDocumento} ancho={160} />
          <Selector
            etiqueta="Cargo"
            valor={rol}
            opciones={ROLES.map((r) => ({ valor: r, etiqueta: ETIQUETA_ROL[r] }))}
            onChange={(v) => setRol((v as Rol) ?? 'operador')}
            ancho={220}
          />
          <Selector
            etiqueta="Obra"
            valor={obraId}
            opciones={obras.datos.map((o) => ({ valor: o.id, etiqueta: o.nombre, detalle: o.codigo }))}
            onChange={setObraId}
            permiteVacio
            vacio="Sin obra (gerencia)"
            ancho={240}
          />
          <View style={{ paddingTop: Spacing.four }}>
            <Boton
              titulo="Registrar persona"
              onPress={crear}
              deshabilitado={!usuario || !nombreCompleto}
            />
          </View>
        </Formulario>
      </Seccion>

      <Seccion titulo={`Personas registradas (${personas.datos.length})`}>
        <Tabla
          columnas={columnas}
          filas={personas.datos}
          vacio="Todavía no hay ninguna persona registrada."
        />
      </Seccion>
    </MarcoPantalla>
  );
}
