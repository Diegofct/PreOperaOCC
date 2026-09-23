/**
 * La ventana de lo que **solo se ve una vez** (spec 015, RF-28 a RF-32): la
 * contraseña temporal de alguien del panel y los dos códigos de un operador.
 *
 * ── Por qué una ventana y no un aviso en la página ──
 *
 * Antes el secreto se pedía desde una ventana y aparecía **detrás de ella**, en
 * el aviso de la página. Había que cerrar la ventana para leer lo que uno acaba
 * de pedir, y si en vez de cerrarla se pulsaba fuera, la página había cambiado
 * de sitio el aviso o ni se veía. Ahora sale donde se pidió.
 *
 * ── Dos fases, un solo `Modal` ──
 *
 * Confirmar y leer el secreto son dos pasos del mismo gesto, así que el marco no
 * se desmonta entre uno y otro: cambia su cuerpo (RF-32). Cerrar una ventana y
 * abrir otra haría pestañear la pantalla y, peor, el `Modal` de React Native Web
 * atrapa el foco mientras está montado y al desmontarse lo suelta en `<body>`.
 *
 * Quien no necesita confirmar —los códigos, que hoy se piden con un botón
 * directo— entra por la fase dos y genera al abrirse.
 *
 * ── Por qué no se cierra con Esc ni con el telón ──
 *
 * Porque el servidor no guarda esto en claro y no hay forma de volver a verlo:
 * un clic distraído fuera de la ventana cuesta generar otro secreto, y el
 * anterior ya dejó de servir (RF-31). Es la única ventana del panel con esa
 * excepción.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Panel, Radio, Spacing, TextoPanel } from '@/constants/theme';

import { Acciones, AccionesFormulario, Aviso, Boton, Modal } from './componentes';
import { useAccionDeVentana } from './usar-accion-de-ventana';

/**
 * Un dato del secreto, con su rótulo y su explicación.
 *
 * La explicación va **debajo de cada código y no al final**: el de activación y
 * el de respaldo se usan en momentos distintos y por personas distintas, y un
 * párrafo común obliga a averiguar cuál es cuál.
 */
export function DatoSecreto({
  rotulo,
  valor,
  explicacion,
}: {
  rotulo: string;
  valor: string;
  explicacion: string;
}) {
  return (
    <View style={estilos.dato}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      {/* `selectable` para poder copiarlo con el ratón: no hay botón de copiar
          (decisión de Diego del 2026-09-22, en «Fuera de alcance» de la spec). */}
      <Text style={estilos.valor} selectable>
        {valor}
      </Text>
      <Text style={estilos.explicacion}>{explicacion}</Text>
    </View>
  );
}

export function VentanaDeSecreto<T>({
  titulo,
  aviso,
  confirmar,
  generar,
  pintar,
  onCerrar,
}: {
  titulo: string;
  /**
   * El texto de la fase de confirmar. **Sin él no hay fase uno**: la ventana
   * genera al abrirse, que es como se piden hoy los códigos.
   */
  aviso?: string;
  /** El botón de la fase uno. Solo se usa si hay `aviso`. */
  confirmar?: string;
  generar: () => Promise<T>;
  pintar: (secreto: T) => ReactNode;
  onCerrar: () => void;
}) {
  const [secreto, setSecreto] = useState<T | null>(null);
  const accion = useAccionDeVentana();

  /**
   * El secreto se guarda desde dentro de la acción, no con una variable suelta
   * fuera del `await`. `ejecutar` devuelve si salió bien, no el valor, y así no
   * hace falta: si falla, `setSecreto` no llega a correr.
   */
  async function pedir() {
    await accion.ejecutar(async () => setSecreto(await generar()));
  }

  /**
   * Sin fase de confirmar, se genera al abrirse — **una sola vez**.
   *
   * El guardia no es adorno: un segundo `POST` generaría otro secreto y dejaría
   * inservible el que ya se está mostrando. Cualquier cosa que monte el
   * componente dos veces —React en modo estricto, un re-render del padre que
   * cambie su `key`— produciría justo eso.
   */
  const yaPedido = useRef(false);
  useEffect(() => {
    if (aviso || yaPedido.current) return;
    yaPedido.current = true;
    void pedir();
    // Solo al montar: `pedir` y `aviso` no cambian en la vida de esta ventana.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El secreto a la vista es lo que hace la ventana irrepetible (RF-31).
  const mostrandoSecreto = secreto !== null;

  return (
    <Modal titulo={titulo} onCerrar={onCerrar} soloBotonCierra={mostrandoSecreto}>
      {accion.error ? <Aviso tono="error">{accion.error}</Aviso> : null}

      {mostrandoSecreto ? (
        <>
          {pintar(secreto)}
          <Aviso tono="info">
            Anótelo antes de cerrar: no se guarda en ninguna parte y no se vuelve a mostrar. Si se
            pierde, hay que generar otro y el de ahora deja de servir.
          </Aviso>
          <AccionesFormulario>
            <Acciones>
              <Boton titulo="Ya lo anoté, cerrar" onPress={onCerrar} />
            </Acciones>
          </AccionesFormulario>
        </>
      ) : aviso ? (
        <>
          <Text style={estilos.aviso}>{aviso}</Text>
          <AccionesFormulario>
            <Acciones>
              <Boton
                titulo={accion.ejecutando ? 'Generando…' : (confirmar ?? 'Generar')}
                tono="peligro"
                onPress={() => void pedir()}
                deshabilitado={accion.ejecutando}
              />
              <Boton
                titulo="Cancelar"
                tono="secundario"
                onPress={onCerrar}
                deshabilitado={accion.ejecutando}
              />
            </Acciones>
          </AccionesFormulario>
        </>
      ) : (
        /* Generando sin confirmación previa. Si falló, el aviso de arriba lo
           explica y este botón es la salida. */
        <>
          <Text style={estilos.aviso}>
            {accion.ejecutando ? 'Generando…' : 'No se pudo generar.'}
          </Text>
          {accion.ejecutando ? null : (
            <AccionesFormulario>
              <Acciones>
                <Boton titulo="Volver a intentar" onPress={() => void pedir()} />
                <Boton titulo="Cancelar" tono="secundario" onPress={onCerrar} />
              </Acciones>
            </AccionesFormulario>
          )}
        </>
      )}
    </Modal>
  );
}

const estilos = StyleSheet.create({
  aviso: { fontSize: TextoPanel.cuerpo, lineHeight: 21, color: Colors.light.text },

  dato: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radio.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Panel.borde,
    backgroundColor: Panel.fondoCabecera,
  },
  rotulo: {
    fontSize: TextoPanel.micro,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: Colors.light.textSecondary,
  },
  /**
   * Grande y espaciado porque casi siempre se **dicta por teléfono**, letra por
   * letra, mientras alguien lo apunta en la obra.
   */
  valor: {
    fontSize: TextoPanel.cifra,
    fontWeight: '700',
    letterSpacing: 2,
    color: Colors.light.text,
  },
  explicacion: {
    fontSize: TextoPanel.apoyo,
    lineHeight: 19,
    color: Colors.light.textSecondary,
  },
});
