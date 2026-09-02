/**
 * La portada del panel.
 *
 * Su trabajo es responder de un vistazo "¿está esto listo para trabajar?". El
 * orden de las cuatro tarjetas es el de las dependencias reales —sin obra no se
 * puede colocar un vehículo, sin vehículo y sin operador no hay asignación— y
 * por eso la que está incompleta se señala: es el siguiente paso, no un adorno.
 */
import { Link } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Marca, Panel, Radio, Spacing, Texto } from '@/constants/theme';

import { api } from './cliente-api';
import { Aviso, Seccion } from './componentes';
import type { AsignacionFila, ObraFila, PersonaFila, VehiculoFila } from './contratos';
import { MarcoPantalla, useListado } from './marco';

export default function PantallaInicioPanel() {
  const obras = useListado<ObraFila>(useCallback(() => api.obras.listar(), []));
  const personas = useListado<PersonaFila>(useCallback(() => api.personas.listar(), []));
  const vehiculos = useListado<VehiculoFila>(useCallback(() => api.vehiculos.listar(), []));
  const asignaciones = useListado<AsignacionFila>(useCallback(() => api.asignaciones.listar(), []));

  const sinConfirmar = asignaciones.datos.filter(
    (a) => a.origen === 'autoasignada' && a.hasta === null,
  ).length;

  const tarjetas = [
    {
      ruta: '/panel/obras' as const,
      titulo: 'Obras',
      total: obras.datos.length,
      pie: 'Frentes de trabajo',
    },
    {
      ruta: '/panel/personas' as const,
      titulo: 'Personas',
      total: personas.datos.length,
      pie: `${personas.datos.filter((p) => p.rol === 'operador').length} operadores`,
    },
    {
      ruta: '/panel/vehiculos' as const,
      titulo: 'Vehículos',
      total: vehiculos.datos.length,
      pie: 'Maquinaria registrada',
    },
    {
      ruta: '/panel/asignaciones' as const,
      titulo: 'Asignaciones',
      total: asignaciones.datos.filter((a) => a.hasta === null).length,
      pie: 'Vigentes',
    },
  ];

  const siguientePaso =
    obras.datos.length === 0
      ? 'Empieza registrando una obra: todo lo demás cuelga de ella.'
      : vehiculos.datos.length === 0
        ? 'Ya hay obra. El siguiente paso es registrar la maquinaria.'
        : personas.datos.length === 0
          ? 'Falta registrar a los operadores.'
          : asignaciones.datos.filter((a) => a.hasta === null).length === 0
            ? 'Solo falta asignarle una máquina a cada operador.'
            : null;

  return (
    <MarcoPantalla
      titulo="Administración"
      descripcion="Desde aquí se registran las obras, las personas, la maquinaria y sus asignaciones. Lo que se registre acá es lo que verá el operador en su celular."
      error={obras.error ?? personas.error ?? vehiculos.error ?? asignaciones.error}
      cargando={obras.cargando || personas.cargando || vehiculos.cargando || asignaciones.cargando}
    >
      {siguientePaso ? <Aviso tono="info">{siguientePaso}</Aviso> : null}

      {sinConfirmar > 0 ? (
        <Aviso tono="error">
          {sinConfirmar === 1
            ? 'Un operador tomó una máquina en obra sin asignación previa. Revísala en Asignaciones.'
            : `${sinConfirmar} operadores tomaron máquinas en obra sin asignación previa. Revísalas en Asignaciones.`}
        </Aviso>
      ) : null}

      <Seccion titulo="Resumen">
        <View style={estilos.tarjetas}>
          {tarjetas.map((tarjeta) => (
            // `asChild` es obligatorio aquí: un `Link` sin él se comporta como
            // un texto, y los tres renglones de la tarjeta saldrían pegados en
            // una sola línea. Con `asChild` el enlace cede el render al
            // `Pressable`, que sí apila.
            <Link key={tarjeta.ruta} href={tarjeta.ruta} asChild>
              <Pressable style={estilos.tarjeta}>
                <Text style={estilos.tarjetaTitulo}>{tarjeta.titulo}</Text>
                <Text style={estilos.tarjetaTotal}>{tarjeta.total}</Text>
                <Text style={estilos.tarjetaPie}>{tarjeta.pie}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </Seccion>

      <Seccion titulo="Lo que todavía no hace este panel">
        <Text style={estilos.nota}>
          Lo que se registra aquí todavía no le llega al celular del operador: los equipos siguen
          trabajando con los datos de prueba que traen dentro. Y los preoperacionales que firman
          siguen guardados en sus teléfonos, así que aún no hay nada que ver de ellos por acá. Esas
          dos son las dos mitades de la sincronización, y son el trabajo siguiente.
        </Text>
      </Seccion>
    </MarcoPantalla>
  );
}

const estilos = StyleSheet.create({
  tarjetas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  tarjeta: {
    minWidth: 200,
    flexGrow: 1,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Panel.borde,
    borderRadius: Radio.md,
    backgroundColor: Panel.fondoCabecera,
  },
  tarjetaTitulo: { fontSize: Texto.pie, fontWeight: '700', color: Marca.primarioTexto },
  tarjetaTotal: { fontSize: Texto.medidor, fontWeight: '800', color: Colors.light.text },
  tarjetaPie: { fontSize: Texto.pie, color: Colors.light.textSecondary },
  nota: { fontSize: Texto.pie, lineHeight: 24, color: Colors.light.textSecondary },
});
