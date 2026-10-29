/**
 * Proyectos (spec 033, RF-16, RF-19, RF-20): la lista de obras para elegir una, y la
 * portada de la obra elegida.
 *
 * La lista es de la gerencia, que lleva todas las obras. Quien trabaja en una obra entra
 * directo a ella (RF-6); si llega aquí, ve la suya o, sin obra, «No tienes obras
 * asignadas; pide acceso a gerencia» (caso límite). Una dirección de antes sin obra trae
 * `?ir=<página>`: al elegir la obra se abre esa página, con los demás parámetros.
 */

import { Link, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { api } from '@/features/panel/cliente-api';
import { Aviso, Celda, Seccion, Tabla, type Columna } from '@/features/panel/componentes';
import type { ObraFila } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { Portada } from '@/features/panel/pantalla-inicio';
import { usePersona } from '@/features/panel/sesion';
import { alcanzaLaEmpresa, alcanzaLaObraDeLaRuta, rutaDeObra } from '@/shared/rules/empresas';

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
  return persona.rol === 'admin' ? <ListaDeObras /> : <SuObra />;
}

function ListaDeObras() {
  const obras = useListado<ObraFila>(useCallback(() => api.obras.listar(), []));
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

/** Quien no es gerencia: su obra, si tiene. */
function SuObra() {
  const persona = usePersona();
  return (
    <MarcoPantalla titulo="Proyectos" descripcion="Su obra.">
      {persona.obraId ? (
        <Seccion titulo="Su obra">
          <Link href={rutaAlElegir(persona.obraId) as Href} asChild>
            <Pressable accessibilityRole="link">
              <Text style={estilos.enlace}>{persona.obraNombre ?? 'Abrir su obra'}</Text>
            </Pressable>
          </Link>
        </Seccion>
      ) : (
        <Aviso tono="info">No tienes obras asignadas; pide acceso a gerencia.</Aviso>
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
