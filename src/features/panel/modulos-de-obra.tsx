/**
 * Qué módulos lleva una obra: Almacén y Control Cantera (spec 017, RF-3, RF-4, RF-6).
 *
 * Lo usan el alta de la obra y su ventana de corrección, y por eso vive aparte y no
 * dentro de una de las dos: escrito dos veces, un día una avisaría de quién se queda
 * sin módulo y la otra no.
 *
 * ── Apagar no borra ──
 *
 * Es lo primero que hay que decir, porque es lo que cualquiera teme al ver una
 * casilla marcada que se desmarca: lo registrado se conserva y vuelve a verse al
 * encender (RF-14, RF-15). Apagado, el módulo no sale en el menú de esa obra, no se
 * puede dar ese acceso a nadie y la sección de Cantera no sale en sus partes.
 *
 * ── Avisar a quién deja sin su módulo (RF-6) ──
 *
 * Apagar se permite aunque la obra tenga un almacenista o un encargado de planta,
 * pero no en silencio: se dicen sus nombres antes de guardar. La lista sale de las
 * personas que la gerencia ya puede consultar; si esa consulta fallara, el aviso se
 * omite en vez de estorbar: lo que decide de verdad es el servidor.
 */
import { View } from 'react-native';

import { Aviso, Casilla } from './componentes';
import type { PersonaFila } from './contratos';

export interface ModulosElegidos {
  almacen: boolean;
  cantera: boolean;
}

/** Quiénes de esa obra se quedarían sin módulo con lo que está marcado. */
export function personasSinModulo(
  personas: readonly PersonaFila[],
  obraId: string | null,
  elegidos: ModulosElegidos,
): string[] {
  if (!obraId) return [];
  return personas
    .filter(
      (persona) =>
        persona.obraId === obraId &&
        ((persona.rol === 'almacenista' && !elegidos.almacen) ||
          (persona.rol === 'encargado_planta' && !elegidos.cantera)),
    )
    .map((persona) => persona.nombreCompleto);
}

export function ModulosDeLaObra({
  almacen,
  cantera,
  onCambiar,
  sinModulo = [],
}: {
  almacen: boolean;
  cantera: boolean;
  onCambiar: (elegidos: ModulosElegidos) => void;
  /** Los nombres de quienes se quedarían sin su módulo (RF-6). */
  sinModulo?: readonly string[];
}) {
  return (
    <View style={{ width: '100%' }}>
      <Casilla
        etiqueta="Lleva almacén"
        marcada={almacen}
        onChange={(marcada) => onCambiar({ almacen: marcada, cantera })}
      />
      <Casilla
        etiqueta="Lleva control de cantera"
        marcada={cantera}
        onChange={(marcada) => onCambiar({ almacen, cantera: marcada })}
      />
      {sinModulo.length > 0 ? (
        <Aviso tono="info">
          {`${sinModulo.join(', ')} ${sinModulo.length === 1 ? 'se queda' : 'se quedan'} sin su módulo en esta obra: ` +
            'al entrar verá que la obra no lo lleva. Lo registrado no se borra y vuelve al encenderlo.'}
        </Aviso>
      ) : null}
    </View>
  );
}
