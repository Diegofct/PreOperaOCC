/**
 * Tesorería: lo autorizado por pagar de las requisiciones de pagos de OCC (spec 047, RF-43 a RF-47).
 *
 * Una fila por línea autorizada con algo por pagar, agrupadas por viernes de entrega —el más antiguo
 * arriba—, como llega del servidor. La Auxiliar paga aquí línea por línea, en uno o varios pagos
 * (D12), con la misma ventana del detalle de la requisición; el RUT y la cuenta se abren desde la fila.
 *
 * Columnas: 150 + 220 + 240 + 130 + 150 + 100 + 110 = 1 100, más 6 separaciones de 16 (96) y 16 a cada
 * lado (32): 1 228, dentro de `MaxContentWidthPanel`.
 */
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { useAvisos } from '@/features/panel/avisos';
import { api } from '@/features/panel/cliente-api';
import { Boton, Celda, Cifra, Cifras, Seccion, Tabla, type Columna } from '@/features/panel/componentes';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import type { LineaOccPorPagar } from '@/features/panel/requisiciones-occ';
import { usePersona } from '@/features/panel/sesion';
import { VentanaPagoOcc } from '@/features/requisiciones/occ/ventanas-occ';
import { fechaDelCorte } from '@/shared/rules/cortes';
import { alcanza } from '@/shared/rules/permisos';
import { enPesos } from '@/shared/rules/pesos';

type Fila = LineaOccPorPagar & { id: string };

const abrir = (mediaId: string) => window.open(`/api/panel/media/${mediaId}`, '_blank', 'noopener');

export function PantallaOccPorPagar() {
  const persona = usePersona();
  const paga = alcanza(persona.rol, 'tesoreria', 'escribir');
  const cargadas = useListado<Fila>(useCallback(() => api.requisiciones.occ.porPagar().then((l) => l.map((x) => ({ ...x, id: x.lineaId }))), []));
  const [pagando, setPagando] = useState<Fila | null>(null);
  // Spec 050, RF-55: lo que salió bien va al aviso de abajo, que se va solo.
  const avisos = useAvisos();
  const avisarHecho = (texto: string | null) => {
    if (texto) avisos.exito(texto);
  };
  const filas = cargadas.datos;
  const porPagar = filas.reduce((suma, l) => suma + l.porPagar, 0);
  const viernes = [...new Set(filas.map((l) => l.viernes))];

  const columnas: Columna<Fila>[] = [
    {
      clave: 'requisicion',
      titulo: 'Requisición',
      ancho: 150,
      pintar: (l) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.fuerte}>{l.codigo}</Text>
          <Text style={estilos.apoyo}>{`Viernes ${fechaDelCorte(l.viernes)}`}</Text>
        </View>
      ),
    },
    { clave: 'beneficiario', titulo: 'Línea', ancho: 220, pintar: (l) => <Celda>{`${l.numero}. ${l.beneficiario}`}</Celda> },
    {
      clave: 'concepto',
      titulo: 'Concepto',
      ancho: 240,
      pintar: (l) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.texto}>{l.concepto}</Text>
          {l.especificaciones ? <Text style={estilos.apoyo}>{l.especificaciones}</Text> : null}
        </View>
      ),
    },
    { clave: 'valor', titulo: 'Autorizado', ancho: 130, pintar: (l) => <Celda>{enPesos(l.valor)}</Celda> },
    {
      clave: 'falta',
      titulo: 'Falta por pagar',
      ancho: 150,
      pintar: (l) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.fuerte}>{enPesos(l.porPagar)}</Text>
          {l.pagado ? <Text style={estilos.apoyo}>{`Pagado ${enPesos(l.pagado)}`}</Text> : null}
        </View>
      ),
    },
    {
      clave: 'adjuntos',
      titulo: 'RUT y cuenta',
      ancho: 100,
      pintar: (l) => (
        <View style={estilos.celdaDoble}>
          {l.rutMediaId ? (
            <Text style={estilos.enlace} accessibilityRole="link" onPress={() => abrir(l.rutMediaId as string)}>
              RUT
            </Text>
          ) : (
            <Text style={estilos.apoyo}>Sin RUT</Text>
          )}
          {l.cuentaMediaId ? (
            <Text style={estilos.enlace} accessibilityRole="link" onPress={() => abrir(l.cuentaMediaId as string)}>
              Cuenta
            </Text>
          ) : (
            <Text style={estilos.apoyo}>Sin cuenta</Text>
          )}
        </View>
      ),
    },
    ...(paga
      ? [
          {
            clave: 'pagar', acciones: true,
            titulo: '',
            ancho: 110,
            anchoMinimo: 110,
            pintar: (l: Fila) => <Boton titulo="Pagar" tono="secundario" onPress={() => setPagando(l)} />,
          },
        ]
      : []),
  ];

  return (
    <MarcoPantalla
      titulo="OCC por viernes"
      descripcion="Lo autorizado de las requisiciones de pagos de OCC que falta por pagar, línea por línea, por viernes de entrega."
      error={cargadas.error}
      cargando={cargadas.cargando}
    >
      <Cifras>
        <Cifra titulo="Líneas por pagar" valor={String(filas.length)} tono={filas.length ? 'atencion' : 'neutro'} pie={viernes.length === 0 ? 'Nada pendiente' : `De ${viernes.length} ${viernes.length === 1 ? 'viernes' : 'viernes distintos'}`} />
        <Cifra titulo="Falta por pagar" valor={enPesos(porPagar)} />
      </Cifras>
      <Seccion titulo="Líneas autorizadas sin pagar del todo">
        <Tabla columnas={columnas} filas={filas} vacio="No hay líneas de OCC por pagar." />
      </Seccion>
      {pagando ? (
        <VentanaPagoOcc
          requisicionId={pagando.requisicionId}
          codigo={pagando.codigo}
          version={pagando.version}
          linea={{ id: pagando.lineaId, numero: pagando.numero, beneficiario: pagando.beneficiario, porPagar: pagando.porPagar }}
          alCerrar={() => setPagando(null)}
          alPagar={(mensaje) => {
            setPagando(null);
            avisarHecho(mensaje);
            cargadas.recargar();
          }}
        />
      ) : null}
    </MarcoPantalla>
  );
}

const estilos = StyleSheet.create({
  celdaDoble: { gap: Spacing.half, alignItems: 'flex-start' },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  fuerte: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, fontWeight: '600', color: Panel.texto },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  enlace: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.accion, textDecorationLine: 'underline' },
});
