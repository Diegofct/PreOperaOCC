/**
 * Proyectos (spec 033, RF-16, RF-19, RF-20): la lista de obras para elegir una, y la
 * portada de la obra elegida.
 *
 * La lista es de quien lleva más de una obra: la gerencia y el Director de Proyectos, que
 * ven todas, y desde la spec 041 el Director de Obra con varias, que ve **las suyas** (RF-24).
 * Quien trabaja en una sola obra entra directo a ella (RF-6, RF-25); si llega aquí, ve la suya
 * o, sin obra, «No tienes obras asignadas; pide acceso a gerencia» (caso límite). Una
 * dirección sin obra trae `?ir=<página>`: al elegir la obra se abre esa página, con los demás
 * parámetros. Es también a donde lleva «Cambiar de obra» (041/RF-67).
 *
 * Las obras del Director de Obra salen de su sesión y no de `GET /obras`, que no puede
 * listar. A quien administra las obras se le señala la que no tiene Director de Obra (RF-44).
 */

import { Link, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { api } from '@/features/panel/cliente-api';
import { Aviso, Celda, Etiqueta, Seccion, Tabla, type Columna } from '@/features/panel/componentes';
import type { ObraFila } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { Portada } from '@/features/panel/pantalla-inicio';
import { usePersona } from '@/features/panel/sesion';
import { alcanzaLaEmpresa, alcanzaLaObraDeLaRuta, rutaDeObra } from '@/shared/rules/empresas';
import { alcanza, rolVeTodasLasObras } from '@/shared/rules/permisos';

import { PantallaSinAcceso } from './pantallas-de-aviso';

/** La página a la que se va al elegir la obra y los demás parámetros (RF-47). */
function destinoAlElegir(): { ir: string | null; resto: string } {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return { ir: null, resto: '' };
  const parametros = new URLSearchParams(window.location.search);
  const ir = parametros.get('ir');
  parametros.delete('ir');
  return { ir, resto: parametros.toString() };
}

function rutaAlElegir(obraId: string): string {
  const { ir, resto } = destinoAlElegir();
  const ruta = rutaDeObra(obraId, ir ?? undefined);
  return resto ? `${ruta}?${resto}` : ruta;
}

export function PantallaProyectos() {
  const persona = usePersona();
  // Quien no entra a Proyectos —el laboratorista, el Encargado de OCC (spec 034)— ve lo
  // mismo que en las demás empresas que no son suyas, no el aviso de «sin obra».
  if (!alcanzaLaEmpresa(persona.rol, 'proyectos')) return <PantallaSinAcceso />;
  if (rolVeTodasLasObras(persona.rol)) return <ListaDeObras />;
  return persona.obrasConNombre.length > 1 ? <SusObras /> : <SuObra />;
}

/** El aviso de una obra sin Director de Obra (RF-44): texto, no solo color. */
function SinDirector() {
  return <Etiqueta tono="atencion">Sin Director de Obra</Etiqueta>;
}

function ListaDeObras() {
  const persona = usePersona();
  const obras = useListado<ObraFila>(useCallback(() => api.obras.listar(), []));
  // RF-44: lo ven quienes asignan los directores, la gerencia y el Director de Proyectos.
  const avisaSinDirector = alcanza(persona.rol, 'obras', 'escribir');
  const columnas: Columna<ObraFila>[] = [
    {
      clave: 'nombre',
      titulo: 'Obra',
      ancho: 280,
      pintar: (o) => (
        <Link href={rutaAlElegir(o.id) as Href} asChild>
          <Pressable accessibilityRole="link">
            <Text style={estilos.enlace}>{o.nombre}</Text>
          </Pressable>
        </Link>
      ),
    },
    { clave: 'consorcio', titulo: 'Consorcio', ancho: 240, pintar: (o) => <Celda>{o.consorcio ?? '—'}</Celda> },
    { clave: 'municipio', titulo: 'Municipio', ancho: 180, pintar: (o) => <Celda>{o.municipio ?? '—'}</Celda> },
    { clave: 'estado', titulo: 'Estado', ancho: 120, pintar: (o) => <Celda>{o.activa ? 'Activa' : 'Inactiva'}</Celda> },
    ...(avisaSinDirector
      ? [
          {
            clave: 'directores',
            titulo: 'Director de Obra',
            ancho: 180,
            pintar: (o: ObraFila) =>
              o.directoresDeObra === 0 ? (
                <SinDirector />
              ) : (
                <Celda>{o.directoresDeObra === 1 ? '1 director' : `${o.directoresDeObra ?? 0} directores`}</Celda>
              ),
          } satisfies Columna<ObraFila>,
        ]
      : []),
  ];

  return (
    <MarcoPantalla
      titulo="Proyectos"
      descripcion="Las obras del grupo, cada una por consorcio. Elija una para ver su información y sus módulos."
      error={obras.error}
      cargando={obras.cargando}
    >
      <Seccion titulo="Obras">
        <Tabla columnas={columnas} filas={obras.datos} vacio="No hay obras registradas." />
      </Seccion>
    </MarcoPantalla>
  );
}

/** El Director de Obra con varias (041/RF-24): sus obras para escoger una. */
function SusObras() {
  const persona = usePersona();
  return (
    <MarcoPantalla titulo="Proyectos" descripcion="Sus obras. Elija una para trabajar en ella.">
      <Seccion titulo="Sus obras">
        {persona.obrasConNombre.map((o) => (
          <Link key={o.id} href={rutaAlElegir(o.id) as Href} asChild>
            <Pressable accessibilityRole="link">
              <Text style={estilos.enlace}>{o.nombre}</Text>
            </Pressable>
          </Link>
        ))}
      </Seccion>
    </MarcoPantalla>
  );
}

/** Quien lleva una sola obra: la suya, si tiene. */
function SuObra() {
  const persona = usePersona();
  const suya = persona.obrasConNombre[0] ?? null;
  return (
    <MarcoPantalla titulo="Proyectos" descripcion="Su obra.">
      {suya ? (
        <Seccion titulo="Su obra">
          <Link href={rutaAlElegir(suya.id) as Href} asChild>
            <Pressable accessibilityRole="link">
              <Text style={estilos.enlace}>{suya.nombre}</Text>
            </Pressable>
          </Link>
        </Seccion>
      ) : (
        <Aviso tono="info">No tienes obras asignadas; pide acceso a la Gerencia o al Director de Proyectos.</Aviso>
      )}
    </MarcoPantalla>
  );
}

/** `/panel/proyectos/<obra>`: el resumen del día de esa obra (el Inicio de antes). */
export function PortadaDeLaObra() {
  const persona = usePersona();
  const { obra } = useLocalSearchParams<{ obra: string }>();
  if (!alcanzaLaObraDeLaRuta(persona, obra)) return <PantallaSinAcceso />;
  return <Portada obraId={obra} />;
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
